import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applyMissionGuard, buildChatSystemPrompt, executeChatActions, getMemories, guardUnbackedClaim, trimChatHistory, type RawAction } from '@/lib/server-ai'
import { getAllTasks, serializeTask } from '@/lib/server-tasks'
import { getUserName } from '@/lib/server-profile'
import { shouldSearch, performWebSearch } from '@/lib/server-search'
import { detectIntent } from '@/lib/assistant/router'
import { logAction } from '@/lib/assistant/action-log'
import { claimIdempotencyKey } from '@/lib/assistant/action-log'
import { getPendingAction, clearPendingAction, executePendingAction, CONFIRM_RE, CANCEL_RE } from '@/lib/assistant/pending-action'
import { getUserLang } from '@/lib/server-settings'
import {
  replyTaskAdded,
  replyDailyReport,
  replyFinanceSummary,
  replyTaskDone,
  replyTaskNotFound,
  replyFocusStarted,
  replyHelp,
  replyTaskList,
  replyLocalRulesDefault,
  replyModelFailure,
  replyEndpointError,
  replyFallback,
} from '@/lib/assistant/replies'
import { pick } from '@/lib/server-lang'
import {
  requireUser,
  unauthorizedResponse,
  AuthRequiredError,
} from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText, globalAiLimit, aiBudgetExceeded } from '@/lib/security'
import type { ChatAction, SourceT } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 120

/**
 * چت استریمی (SSE):
 *   meta    → شناسه پیام کاربر (+ منابع وب اگر جستجو انجام شد)
 *   delta   → تکه‌های متن خام مدل (که کلاینت از آن مقدار reply را استخراج می‌کند)
 *   done    → پاسخ نهایی تمیز + اکشن‌ها + شناسه + followups + منابع
 *   error   → خطا
 * استریم مدل هم فقط از AI Gateway مرکزی عبور می‌کند.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  // سقف سراسری نمونه برای مسیرهای مدل‌محور — مستقل از IP/کاربر (بخش ۳ دستور نهایی)
  if (!globalAiLimit().ok) return aiBudgetExceeded()

  let user: Awaited<ReturnType<typeof requireUser>> | null = null
  try {
    user = await requireUser(req)
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    throw e
  }
  const userId = user.id
  const lang = await getUserLang(userId)

  try {
    const body = await readJsonSafe(req)
    const message = cleanText((body as { message?: unknown })?.message, 2000)
    if (!message) {
      return Response.json({ error: 'پیام خالی است' }, { status: 400 })
    }
    const idempotencyKey = cleanText((body as { clientKey?: unknown })?.clientKey, 120) || null

    // F2-AG (سناریو ۹): ماشین-وضعیت تأیید — هم‌ارز روت POST (SSE)
    const pendingOp = await getPendingAction(userId)
    if (pendingOp && (CONFIRM_RE.test(message) || CANCEL_RE.test(message))) {
      const isCancel = CANCEL_RE.test(message)
      const userMsg = await db.chatMessage.create({ data: { userId, role: 'user', content: message } })
      let text: string
      if (isCancel) {
        await clearPendingAction(userId)
        await logAction({ userId, actionType: pendingOp.type, status: 'canceled', detail: 'canceled by user (pending-action state machine)' })
        text = pick(lang, 'انصراف داده شد — هیچ تغییری اعمال نشد.', 'Canceled — nothing was changed.')
      } else if (pendingOp.type === 'add_expense') {
        // F7: مالی چندحسابی — حساب از متن تأیید تطبیق داده می‌شود؛ وگرنه دوباره پرسیده می‌شود
        const { prepareExpenseExecution } = await import('@/lib/assistant/expense-flow')
        const prepared = await prepareExpenseExecution(userId, lang, pendingOp, message)
        if (prepared && 'ask' in prepared) {
          text = prepared.ask
          const assistantMsg = await db.chatMessage.create({ data: { userId, role: 'assistant', content: text, actions: null } })
          const encA = new TextEncoder()
          const streamA = new ReadableStream({
            start(controller) {
              const send = (event: string, data: unknown) => {
                controller.enqueue(encA.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
              }
              send('meta', { userMessageId: userMsg.id, searched: false })
              send('done', { reply: text, actions: [], followups: [], sources: [], assistantId: assistantMsg.id })
              controller.close()
            },
          })
          return new Response(streamA, {
            headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
          })
        }
        const r = await executePendingAction(userId, prepared!.op)
        await clearPendingAction(userId)
        await logAction({ userId, actionType: 'add_expense', status: r.ok ? 'success' : 'failed', detail: 'finance write after explicit user confirmation (F7 lane)' })
        text = pick(lang, r.fa, r.en)
      } else {
        const r = await executePendingAction(userId, pendingOp)
        await clearPendingAction(userId)
        await logAction({ userId, actionType: pendingOp.type, status: r.ok ? 'success' : 'failed', detail: 'executed after explicit user confirmation' })
        text = pick(lang, r.fa, r.en)
      }
      const assistantMsg = await db.chatMessage.create({ data: { userId, role: 'assistant', content: text, actions: null } })
      const encC = new TextEncoder()
      const streamC = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encC.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          }
          send('meta', { userMessageId: userMsg.id, searched: false })
          send('done', { reply: text, actions: [], followups: [], sources: [], assistantId: assistantMsg.id })
          controller.close()
        },
      })
      return new Response(streamC, {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
      })
    }

    // ۰) مسیر قطعی — بدون هیچ فراخوانی مدل (بخش ۶ دستور)
    const intent = detectIntent(message)
    if (intent.kind !== 'model') {
      // F2-AG: مسیر قطعی هم claim-first — retry همان درخواست دوباره‌کاری نمی‌سازد
      if (!(await claimIdempotencyKey(userId, idempotencyKey))) {
        const userMsg = await db.chatMessage.create({ data: { userId, role: 'user', content: message } })
        const dupNote = pick(lang, 'این درخواست قبلاً اجرا شده است (جلوگیری از اجرای دوباره).', 'This request was already executed (duplicate prevented).')
        const assistantMsg = await db.chatMessage.create({ data: { userId, role: 'assistant', content: dupNote, actions: null } })
        const encD = new TextEncoder()
        const streamD = new ReadableStream({
          start(controller) {
            const send = (event: string, data: unknown) => {
              controller.enqueue(encD.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
            }
            send('meta', { userMessageId: userMsg.id, searched: false })
            send('done', { reply: dupNote, actions: [], followups: [], sources: [], assistantId: assistantMsg.id })
            controller.close()
          },
        })
        return new Response(streamD, {
          headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
        })
      }
      const userMsg = await db.chatMessage.create({
        data: { userId, role: 'user', content: message },
      })
      let reply = ''
      let actions: ChatAction[] = []
      if (intent.kind === 'add_expense') {
        // F7: فرمان مالی گفتاری/نوشتاری — هرگز Task نمی‌سازد؛ پیشنهاد تأییددار می‌سازد
        const { proposeExpense } = await import('@/lib/assistant/expense-flow')
        const prop = await proposeExpense(userId, lang, intent.parsed)
        reply = prop.reply
        await logAction({
          userId,
          actionType: 'add_expense',
          status: prop.pending ? 'needs_confirmation' : 'failed',
          detail: pick(lang, 'مسیر قطعی مالی — در انتظار تأیید کاربر', 'Deterministic finance lane — awaiting user confirmation'),
        })
      } else if (intent.kind === 'add_task') {
        const p = intent.parsed
        const t = await db.task.create({
          data: {
            userId,
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
          userId,
          actionType: 'add_task',
          status: 'success',
          targetType: 'task',
          targetId: t.id,
          // F2-AG: زیرکلید مجزا از claim (هم‌عرض روت POST)
          idempotencyKey: idempotencyKey ? `${idempotencyKey}:add` : null,
          detail: pick(lang, 'مسیر قطعی (بدون مدل)', 'Deterministic path (no model)'),
        })
        actions = [{ type: 'add_task', ok: true, task: serializeTask(t) } as ChatAction]
        reply = replyTaskAdded(lang, p.title, Boolean(p.dueDate))
      } else if (intent.kind === 'daily_report') {
        const { dailyReport } = await import('@/lib/assistant/report')
        const rep = await dailyReport(userId)
        reply = replyDailyReport(lang, rep)
      } else if (intent.kind === 'finance_report') {
        // F-AG1: جمع مخارج/درآمد با اعداد واقعی DB — بدون مدل
        const { financeSummaryFor } = await import('@/lib/finance/summary')
        const { agg, currency } = await financeSummaryFor(userId, intent.range)
        reply = replyFinanceSummary(lang, { ...agg, range: intent.range, currency })
      } else if (intent.kind === 'complete_task') {
        // تکمیل کار با تطبیق فازی عنوان — قطعی و کم‌ریسک
        const { matchTask } = await import('@/lib/assistant/match')
        const rows = await db.task.findMany({
          where: { userId, status: 'todo' },
          orderBy: { priority: 'asc' },
          take: 100,
        })
        const target = matchTask(intent.rawTitle, rows)
        if (target) {
          const updated = await db.task.update({
            where: { id: target.id },
            data: { status: 'done', completedAt: new Date() },
            include: { subtasks: true },
          })
          await logAction({
            userId,
            actionType: 'complete_task',
            status: 'success',
            targetType: 'task',
            targetId: target.id,
            idempotencyKey: idempotencyKey ? `${idempotencyKey}:complete` : null,
            detail: pick(lang, 'مسیر قطعی (انجام شد)', 'Deterministic path (completed)'),
          })
          actions = [{ type: 'complete_task', ok: true, task: serializeTask(updated) } as ChatAction]
          reply = replyTaskDone(lang, target.title)
        } else {
          reply = replyTaskNotFound(lang)
        }
      } else if (intent.kind === 'start_focus') {
        // شروع تمرکز — اکشن سمت کلاینت (باز شدن تایمر پومودورو)
        actions = [{ type: 'start_focus', ok: true } as ChatAction]
        reply = replyFocusStarted(lang)
      } else if (intent.kind === 'help') {
        reply = replyHelp(lang)
      } else {
        const rows = await db.task.findMany({
          where: { userId, status: 'todo' },
          orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
          take: 7,
          include: { subtasks: true },
        })
        reply = replyTaskList(lang, rows.map((t) => t.title))
      }
      // ممیزی ۳۶۰ (یافتهٔ ۵): در مسیر قطعی followups/sources تولید نمی‌شوند (همیشه خالی)،
      // پس ذخیره فقط به وجود اکشن وابسته است — شرط معادل hasMetadata.
      const hasMetadata = actions.length > 0
      const assistantMsg = await db.chatMessage.create({
        data: { userId, role: 'assistant', content: reply, actions: hasMetadata ? JSON.stringify({ actions, followups: [], sources: [] }) : null },
      })

      const encoder0 = new TextEncoder()
      const stream0 = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(encoder0.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          }
          send('meta', { userMessageId: userMsg.id, searched: false })
          send('done', { reply, actions, followups: [], sources: [], assistantId: assistantMsg.id })
          controller.close()
        },
      })
      return new Response(stream0, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    // ۲٫۵) موتور محلی — پاسخ قطعی بدون هیچ فراخوانی مدل (معماری AIProvider)
    const { resolveEngine } = await import('@/lib/ai/providers/registry')
    const resolved = await resolveEngine(userId)
    if (resolved.engine === 'local_rules') {
      const userMsg = await db.chatMessage.create({ data: { userId, role: 'user', content: message } })
      let reply = replyLocalRulesDefault(lang)
      try {
        const local = await resolved.provider.chat(
          [{ role: 'user', content: message }],
          resolved.ctx,
        )
        reply = local.text
      } catch {
        /* پاسخ پیش‌فرض بالا */
      }
      const assistantMsg = await db.chatMessage.create({
        data: { userId, role: 'assistant', content: reply },
      })
      // B-4 (R2): شاخهٔ محلی هم ردیف مصرف بنویسد — قبلاً بدون فراداده می‌ماند
      try {
        const { recordStreamUsage: rsu } = await import('@/lib/ai/gateway')
        void rsu({
          route: '/api/chat/stream',
          task: 'chat',
          userId,
          inChars: message.length,
          outBytes: reply.length,
          latencyMs: 0,
          status: 'ok',
          provider: 'local_rules',
          model: 'local_rules',
        }).catch(() => {})
      } catch {
        /* فقط فراداده — هرگز مسیر اصلی را نمی‌شکند */
      }
      const encoderL = new TextEncoder()
      const streamL = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) =>
            controller.enqueue(encoderL.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          send('meta', { userMessageId: userMsg.id, searched: false })
          send('done', { reply, actions: [], followups: [], sources: [], assistantId: assistantMsg.id })
          controller.close()
        },
      })
      return new Response(streamL, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    // جستجوی زنده وب در صورت نیاز — الگوی Perplexity
    let searchContext = ''
    let sources: SourceT[] = []
    if (shouldSearch(message)) {
      try {
        const res = await performWebSearch(userId, message)
        searchContext = res.context
        sources = res.sources
      } catch {
        /* جستجو ناموفق — بدون زمینه وب ادامه می‌دهیم */
      }
    }

    // ۱) ذخیره پیام کاربر
    const userMsg = await db.chatMessage.create({ data: { userId, role: 'user', content: message } })
    void trimChatHistory(userId)

    // ۲) زمینه — فقط داده همین کاربر
    const tasks = (await getAllTasks(userId)).filter((t) => t.status === 'todo').slice(0, 40)
    const memories = await getMemories(userId)
    const userName = await getUserName(userId)
    const history = await db.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    })
    history.reverse()

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

    // ۳) استریم — فقط از Gateway مرکزی (کلید قطع، سهمیه، ثبت مصرف)
    const { gatewayRunStream, recordStreamUsage, GatewayDisabledError, GatewayQuotaError, quotaLimits } =
      await import('@/lib/ai/gateway')
    const outCap = quotaLimits().maxOutputChars

    let upstream: ReadableStream<Uint8Array>
    let providerId = 'local_rules'
    try {
      const r = await gatewayRunStream({
        route: '/api/chat/stream',
        task: 'chat',
        userId,
        messages,
      })
      upstream = r.stream
      providerId = r.providerId
    } catch (e) {
      const gw = await import('@/lib/ai/gateway')
      const reply =
        e instanceof gw.GatewayQuotaError
          ? gw.quotaMessage(e.reason, e.resetHours, lang)
          : e instanceof gw.GatewayDisabledError || e instanceof gw.GatewayLocalOnlyError
            ? pick(
                lang,
                'هوش مصنوعی موقتاً غیرفعال است. ثبت و پیگیری کارها همچنان کار می‌کند.',
                'AI is temporarily disabled. Adding and tracking tasks still works.',
              )
            : e instanceof gw.GatewayConfigError
              ? replyEndpointError(lang, e.message.slice(0, 160))
              : replyModelFailure(lang)
      // پیام کاربر بالاتر (خط «۱») ذخیره شده — دوباره ساخته نمی‌شود (رفع تکرار)
      const assistantMsg = await db.chatMessage.create({
        data: { userId, role: 'assistant', content: reply },
      })
      const encoderE = new TextEncoder()
      const streamE = new ReadableStream({
        start(controller) {
          const send = (event: string, data: unknown) =>
            controller.enqueue(encoderE.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          send('meta', { userMessageId: userMsg.id, searched: false })
          send('done', { reply, actions: [], followups: [], sources: [], assistantId: assistantMsg.id })
          controller.close()
        },
      })
      return new Response(streamE, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    }

    const startedAt = Date.now()
    let outBytes = 0
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        }

        send('meta', { userMessageId: userMsg.id, searched: sources.length > 0 })

        let raw = ''
        // GRAND-F5 (2-b#10): فرادادهٔ واقعی مصرف — مدل از payload و وضعیت خطا
        let modelLabel = ''
        let streamFailed = false
        let abortCleanup: (() => void) | null = null
        try {
          const reader = upstream.getReader()
          // B-14 (R2): قطع سمت کلاینت → قطع واقعی استریم بالادست (مهار هزینه مدل)
          const onAbort = () => {
            void reader.cancel().catch(() => {})
          }
          req.signal?.addEventListener('abort', onAbort)
          abortCleanup = () => req.signal?.removeEventListener('abort', onAbort)
          const decoder = new TextDecoder()
          let buf = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            outBytes += value.byteLength
            const text = typeof value === 'string' ? value : decoder.decode(value, { stream: true })
            buf += text
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith('data:')) continue
              const payload = trimmed.slice(5).trim()
              if (!payload || payload === '[DONE]') continue
              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>
                  model?: string
                }
                if (!modelLabel && typeof json?.model === 'string' && json.model) modelLabel = json.model
                const delta: string = json?.choices?.[0]?.delta?.content ?? ''
                if (delta) {
                  if (raw.length >= outCap) {
                    // سقف خروجی Gateway — استریم بالادست قطع و هزینه مهار می‌شود (بخش ۳)
                    await reader.cancel().catch(() => {})
                    break
                  }
                  raw += delta
                  send('delta', { text: delta })
                }
              } catch {
                /* خط ناقص — نادیده بگیر */
              }
            }
          }
        } catch {
          // اگر استریم وسط کار قطع شد، با همان raw ادامه می‌دهیم
          streamFailed = true
        }
        // B-14 (R2): پاک‌سازی شنوندهٔ قطع پس از پایان مصرف استریم
        if (abortCleanup) abortCleanup()

        // ثبت مصرف استریم — فقط فراداده، بدون محتوای خصوصی
        void recordStreamUsage({
          route: '/api/chat/stream',
          task: 'chat',
          userId,
          inChars: messages.reduce((n, m) => n + m.content.length, 0),
          outBytes,
          latencyMs: Date.now() - startedAt,
          status: streamFailed ? 'error' : 'ok',
          provider: providerId,
          model: modelLabel || providerId,
        }).catch(() => {})

        // ۴) استخراج reply + اجرای اکشن‌ها (مهار خروجی مدل — OWASP LLM05)
        let reply = ''
        let actions: ChatAction[] = []
        let followups: string[] = []
        let assistantId = ''
        try {
          const { extractJson } = await import('@/lib/ai')
          const parsed = extractJson<{ reply?: string; actions?: RawAction[]; followups?: string[] }>(raw)
          if (parsed && typeof parsed.reply === 'string' && parsed.reply.trim()) {
            reply = parsed.reply.trim().slice(0, 4000)
            actions = await executeChatActions(parsed.actions ?? [], message, userId, idempotencyKey, lang)
            followups = (Array.isArray(parsed.followups) ? parsed.followups : [])
              .filter((f) => typeof f === 'string' && f.trim().length > 1)
              .slice(0, 3)
              .map((f) => f.trim().slice(0, 60))
          } else {
            // مدل JSON برننگرداند — گارد پایین اثر واقعی را تضمین می‌کند
            reply = raw.trim().slice(0, 4000) || 'الان نتوانستم درست پاسخ بدهم، لطفاً دوباره تلاش کن.'
          }
          // F2-AG (سناریو ۷): پاسخ ناقص هرگز بی‌نشان ذخیره نمی‌شود —
          // اگر استریم وسط کار قطع شده باشد، کاربر باید بداند این پاسخ کامل نیست.
          if (streamFailed) {
            reply = `${reply}\n\n${pick(lang, '⚠️ توجه: این پاسخ ناقص است — جریان مدل قطع شد. برای پاسخ کامل دوباره تلاش کنید.', '⚠️ Note: this reply is incomplete — the model stream was cut. Please retry for the full answer.')}`
          }
          // F-AG3: گارد پس از اجرا — خارج از if/else تا شاخهٔ بدون-JSON هم پوشش داده شود
          {
            const guarded = await applyMissionGuard(message, reply, actions, userId, idempotencyKey, lang)
            actions = guarded.actions
            reply = guarded.reply
            // F2-HALL: ادعای بدون اثر مدل — یادداشت صادقانه
            reply = guardUnbackedClaim(reply, actions, lang)
          }
        } catch {
          reply = raw.trim().slice(0, 4000) || 'الان نتوانستم درست پاسخ بدهم، لطفاً دوباره تلاش کن.'
        }

        try {
          // ممیزی ۳۶۰ (یافتهٔ ۵): قبلاً اگر actions خالی بود، followups و sources هم
          // (با وجود تولید‌شدن) null ذخیره می‌شدند و پس از رفرش صفحه از بین می‌رفتند.
          const hasMetadata = actions.length > 0 || followups.length > 0 || sources.length > 0
          const assistantMsg = await db.chatMessage.create({
            data: {
              userId,
              role: 'assistant',
              content: reply,
              actions: hasMetadata ? JSON.stringify({ actions, followups, sources }) : null,
            },
          })
          assistantId = assistantMsg.id
        } catch {
          /* ذخیره ناموفق — پاسخ همچنان نمایش داده می‌شود */
        }

        send('done', { reply, actions, followups, sources, assistantId })
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/chat/stream', e)
    return Response.json({ error: 'خطا در پردازش پیام' }, { status: 500 })
  }
}
