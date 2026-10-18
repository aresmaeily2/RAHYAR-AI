import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildChatSystemPrompt, executeChatActions, getMemories, type RawAction } from '@/lib/server-ai'
import { chatWelcome, getAllTasks, serializeTask } from '@/lib/server-tasks'
import { getUserName } from '@/lib/server-profile'
import { shouldSearch, performWebSearch } from '@/lib/server-search'
import { detectIntent } from '@/lib/assistant/router'
import { logAction } from '@/lib/assistant/action-log'
import { getUserLang } from '@/lib/server-settings'
import { pick } from '@/lib/server-lang'
import {
  replyTaskAdded,
  replyDailyReport,
  replyTaskList,
  replyModelFailure,
  replyFallback,
} from '@/lib/assistant/replies'
import {
  requireUser,
  unauthorizedResponse,
  AuthRequiredError,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText, globalAiLimit, aiBudgetExceeded } from '@/lib/security'
import type { ChatAction, ChatMessageT, SourceT } from '@/lib/types'

function parseStoredActions(raw: string | null): { actions: ChatAction[]; followups: string[]; sources: SourceT[] } {
  if (!raw) return { actions: [], followups: [], sources: [] }
  try {
    const parsed = JSON.parse(raw) as
      | ChatAction[]
      | { actions?: ChatAction[]; followups?: string[]; sources?: SourceT[] }
    if (Array.isArray(parsed)) return { actions: parsed, followups: [], sources: [] }
    return {
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      followups: Array.isArray(parsed.followups) ? parsed.followups.slice(0, 3) : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources.slice(0, 5) : [],
    }
  } catch {
    return { actions: [], followups: [], sources: [] }
  }
}

function serializeMessage(m: {
  id: string
  role: string
  content: string
  actions: string | null
  createdAt: Date
}): ChatMessageT {
  const { actions, followups, sources } = parseStoredActions(m.actions)
  return {
    id: m.id,
    role: m.role as ChatMessageT['role'],
    content: m.content,
    actions,
    followups,
    sources,
    createdAt: m.createdAt.toISOString(),
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const count = await db.chatMessage.count({ where: { userId: user.id } })
    if (count === 0) {
      const welcome = await db.chatMessage.create({
        data: { userId: user.id, role: 'assistant', content: chatWelcome(await getUserLang(user.id)) },
      })
      return NextResponse.json({ messages: [serializeMessage(welcome)] })
    }
    const rows = await db.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 60,
    })
    return NextResponse.json({ messages: rows.map(serializeMessage) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/chat', e)
    return NextResponse.json({ error: 'خطا در دریافت گفتگو' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  // سقف سراسری نمونه برای مسیرهای مدل‌محور — مستقل از IP/کاربر
  if (!globalAiLimit().ok) return aiBudgetExceeded()

  try {
    const user = await requireUser(req)
    const lang = await getUserLang(user.id)
    const body = await readJsonSafe(req)
    const message = cleanText((body as { message?: unknown })?.message, 2000)
    if (!message) {
      return NextResponse.json({ error: 'پیام خالی است' }, { status: 400 })
    }
    const idempotencyKey = cleanText((body as { clientKey?: unknown })?.clientKey, 120) || null

    // ۰) مسیر قطعی — اگر مدل لازم نیست، مدل فراخوانی نمی‌شود (بخش ۶ دستور)
    const intent = detectIntent(message)
    if (intent.kind !== 'model') {
      const userMsg = await db.chatMessage.create({
        data: { userId: user.id, role: 'user', content: message },
      })
      let reply = ''
      let actions: ChatAction[] = []
      if (intent.kind === 'add_task') {
        const p = intent.parsed
        const t = await db.task.create({
          data: {
            userId: user.id,
            title: p.title.slice(0, 200),
            priority: p.priority ?? 2,
            tag: p.tag ?? null,
            dueDate: p.dueDate ? new Date(p.dueDate + 'T12:00:00.000Z') : null,
            dueTime: p.dueTime ?? null,
            repeat: p.repeat ?? null,
          },
          include: { subtasks: true },
        })
        await logAction({
          userId: user.id,
          actionType: 'add_task',
          status: 'success',
          targetType: 'task',
          targetId: t.id,
          idempotencyKey,
          detail: pick(lang, 'مسیر قطعی (بدون مدل)', 'Deterministic path (no model)'),
        })
        actions = [{ type: 'add_task', ok: true, task: serializeTask(t) } as ChatAction]
        reply = replyTaskAdded(lang, p.title, Boolean(p.dueDate))
      } else if (intent.kind === 'daily_report') {
        const { dailyReport } = await import('@/lib/assistant/report')
        const rep = await dailyReport(user.id)
        reply = replyDailyReport(lang, rep)
      } else {
        const rows = await db.task.findMany({
          where: { userId: user.id, status: 'todo' },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          take: 7,
          include: { subtasks: true },
        })
        reply = replyTaskList(lang, rows.map((t) => t.title))
      }
      const assistantMsg = await db.chatMessage.create({
        data: { userId: user.id, role: 'assistant', content: reply, actions: actions.length ? JSON.stringify({ actions, followups: [], sources: [] }) : null },
      })
      return NextResponse.json({
        userMessage: serializeMessage(userMsg),
        assistantMessage: serializeMessage(assistantMsg),
        actions,
        mode: 'deterministic',
      })
    }

    // جستجوی وب در صورت نیاز
    let searchContext = ''
    let sources: SourceT[] = []
    if (shouldSearch(message)) {
      try {
        const res = await performWebSearch(user.id, message)
        searchContext = res.context
        sources = res.sources
      } catch {
        /* بدون وب ادامه بده */
      }
    }

    // ۱) ذخیره پیام کاربر
    const userMsg = await db.chatMessage.create({ data: { userId: user.id, role: 'user', content: message } })

    // ۲) ساخت زمینه: کارهای فعال + حافظه + تاریخچه اخیر — فقط داده همین کاربر
    const tasks = (await getAllTasks(user.id)).filter((t) => t.status === 'todo').slice(0, 40)
    const memories = await getMemories(user.id)
    const userName = await getUserName(user.id)
    const history = await db.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })
    history.reverse()

    const { gatewayRun } = await import('@/lib/ai/gateway')
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildChatSystemPrompt(tasks, memories, userName, lang) },
      ...history
        .filter((h) => h.id !== userMsg.id)
        .slice(-10)
        .map((h) => ({
          role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: h.role === 'assistant' && h.actions ? `${h.content}\n(اکشن‌ها اجرا شد)` : h.content,
        })),
      { role: 'user', content: searchContext ? `${message}\n\n[نتایج جستجوی وب امروز]\n<user_data>\n${searchContext}\n</user_data>` : message },
    ]

    // ۳) فراخوانی مدل — فقط از Gateway مرکزی
    let reply = ''
    let actions: ChatAction[] = []
    let followups: string[] = []
    try {
      const raw = await gatewayRun({ route: '/api/chat', task: 'chat', userId: user.id, messages })
      const { extractJson } = await import('@/lib/ai')
      const parsed = extractJson<{ reply?: string; actions?: RawAction[]; followups?: string[] }>(raw.text)
      if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
        reply = parsed.reply.trim().slice(0, 4000)
        actions = await executeChatActions(parsed.actions ?? [], message, user.id, idempotencyKey, lang)
        followups = (Array.isArray(parsed.followups) ? parsed.followups : [])
          .filter((f) => typeof f === 'string' && f.trim().length > 1)
          .slice(0, 3)
          .map((f) => f.trim().slice(0, 60))
      } else {
        reply = raw.text.trim().slice(0, 4000) || replyFallback(lang)
      }
    } catch (e) {
      const { GatewayDisabledError, GatewayQuotaError, quotaMessage } = await import('@/lib/ai/gateway')
      if (e instanceof GatewayQuotaError) {
        reply = quotaMessage(e.reason, e.resetHours, lang)
      } else if (e instanceof GatewayDisabledError) {
        reply = e.message
      } else {
        console.error('LLM error', e)
        reply = replyModelFailure(lang)
      }
    }

    // ۴) ذخیره پاسخ
    const assistantMsg = await db.chatMessage.create({
      data: {
        userId: user.id,
        role: 'assistant',
        content: reply,
        actions: actions.length || followups.length || sources.length
          ? JSON.stringify({ actions, followups, sources })
          : null,
      },
    })

    return NextResponse.json({
      userMessage: serializeMessage(userMsg),
      assistantMessage: serializeMessage(assistantMsg),
      actions,
      mode: 'model',
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/chat', e)
    return NextResponse.json({ error: 'خطا در پردازش پیام' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 6, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    await db.chatMessage.deleteMany({ where: { userId: user.id } })
    const welcome = await db.chatMessage.create({
      data: { userId: user.id, role: 'assistant', content: chatWelcome(await getUserLang(user.id)) },
    })
    return NextResponse.json({ messages: [serializeMessage(welcome)] })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('DELETE /api/chat', e)
    return NextResponse.json({ error: 'خطا در پاک‌کردن گفتگو' }, { status: 500 })
  }
}
