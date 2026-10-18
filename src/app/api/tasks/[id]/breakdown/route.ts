import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateSubtasksFor } from '@/lib/server-ai'
import { findTaskById, serializeTask, sliceForCap } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, globalAiLimit, aiBudgetExceeded } from '@/lib/security'
import { getUserLang } from '@/lib/server-settings'
import { pick } from '@/lib/server-lang'
import type { AppLang } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  // تجزیه با هوش مصنوعی هزینه‌بر است — سقف ۴ بار در دقیقه + سقف سراسری مدل
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 4, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  if (!globalAiLimit().ok) return aiBudgetExceeded()
  let lang: AppLang = 'fa'
  try {
    const user = await requireUser(req)
    lang = await getUserLang(user.id)
    const { id } = await ctx.params
    const task = await findTaskById(id, user.id)
    if (!task) {
      return NextResponse.json({ error: pick(lang, 'کار یافت نشد', 'Task not found') }, { status: 404 })
    }
    // سقف ۳۰ زیرکار — هم‌راستا با مسیر چت (رفع A2: شکاف دفاع LLM10 در مسیر REST)
    if (task.subtasks.length >= 30) {
      return NextResponse.json({ error: pick(lang, 'زیرکارها به سقف مجاز رسیده‌اند', 'Subtasks reached the allowed cap') }, { status: 400 })
    }
    const items = await generateSubtasksFor(task, user.id, lang)
    if (items.length === 0) {
      return NextResponse.json({ error: pick(lang, 'تجزیه کار ناموفق بود، دوباره تلاش کن', 'Breakdown failed — please try again') }, { status: 502 })
    }
    const base = task.subtasks.length
    // H2: فقط مواردی که واقعاً جا دارند درج می‌شوند؛ added = تعداد واقعی درج
    const toInsert = sliceForCap(items, base)
    if (toInsert.length === 0) {
      return NextResponse.json({ error: pick(lang, 'زیرکارها به سقف مجاز رسیده‌اند', 'Subtasks reached the allowed cap') }, { status: 400 })
    }
    const inserted = await db.subtask.createMany({
      data: toInsert.map((title, i) => ({ taskId: task.id, title, order: base + i })),
    })
    const updated = await findTaskById(task.id, user.id)
    return NextResponse.json({ task: updated ? serializeTask(updated) : null, added: inserted.count })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    const { GatewayDisabledError, GatewayQuotaError, quotaMessage } = await import('@/lib/ai/gateway')
    if (e instanceof GatewayQuotaError) {
      return NextResponse.json({ error: quotaMessage(e.reason, e.resetHours, lang) }, { status: 429 })
    }
    if (e instanceof GatewayDisabledError) {
      return NextResponse.json({ error: pick(lang, 'هوش مصنوعی موقتاً غیرفعال است.', 'AI is temporarily disabled.') }, { status: 503 })
    }
    console.error('POST /api/tasks/[id]/breakdown', e)
    return NextResponse.json({ error: pick(lang, 'خطا در تجزیه کار', 'Task breakdown error') }, { status: 500 })
  }
}
