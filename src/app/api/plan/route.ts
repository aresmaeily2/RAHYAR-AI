import { NextRequest, NextResponse } from 'next/server'
import { generateDailyPlan } from '@/lib/server-ai'
import { getAllTasks } from '@/lib/server-tasks'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, globalAiLimit, aiBudgetExceeded } from '@/lib/security'
import { getUserLang } from '@/lib/server-settings'
import { pick } from '@/lib/server-lang'
import type { AppLang } from '@/lib/types'

export async function POST(req: NextRequest) {
  // ساخت برنامه هزینه‌بر است — سقف ۴ بار در دقیقه + سقف سراسری مدل
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 4, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  if (!globalAiLimit().ok) return aiBudgetExceeded()
  let lang: AppLang = 'fa'
  try {
    const user = await requireUser(req)
    lang = await getUserLang(user.id)
    const tasks = (await getAllTasks(user.id)).filter((t) => t.status === 'todo').slice(0, 30)
    if (tasks.length === 0) {
      return NextResponse.json({
        plan: {
          summary: pick(lang, 'فعلاً هیچ کار فعالی نداری. وقت خوبی برای استراحت یا شروع یک چیز تازه است.', "You have no active tasks right now. A good time to rest or start something new."),
          focus: '',
          blocks: [],
          tip: pick(lang, 'با دستیار چت کن و چند کار برای امروز ثبت کن.', 'Chat with the assistant and add a few tasks for today.'),
        },
      })
    }
    const plan = await generateDailyPlan(tasks, user.id, lang).catch(async (e) => {
      // حالت «قواعد محلی» یا خطای موتور مدل → برنامه قطعی محلی (بدون مدل)
      const { GatewayLocalOnlyError } = await import('@/lib/ai/gateway')
      if (e instanceof GatewayLocalOnlyError) {
        const { buildRuleBasedPlan } = await import('@/lib/assistant/rule-plan')
        return buildRuleBasedPlan(tasks, lang)
      }
      throw e
    })
    return NextResponse.json({ plan })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    // خطاهای Gateway: پیام شفاف به‌جای خطای مبهم (دوزبانه)
    const { GatewayDisabledError, GatewayQuotaError, GatewayConfigError, quotaMessage } = await import('@/lib/ai/gateway')
    if (e instanceof GatewayQuotaError) {
      return NextResponse.json({ error: quotaMessage(e.reason, e.resetHours, lang) }, { status: 429 })
    }
    if (e instanceof GatewayDisabledError) {
      return NextResponse.json({ error: pick(lang, 'هوش مصنوعی موقتاً غیرفعال است.', 'AI is temporarily disabled.') }, { status: 503 })
    }
    if (e instanceof GatewayConfigError) {
      return NextResponse.json(
        { error: pick(lang, `اتصال Endpoint ناموفق: ${e.message.slice(0, 160)}`, `Endpoint connection failed: ${e.message.slice(0, 160)}`) },
        { status: 502 },
      )
    }
    console.error('POST /api/plan', e)
    return NextResponse.json({ error: pick(lang, 'ساخت برنامه ناموفق بود، دوباره تلاش کن', 'Could not build the plan — please try again') }, { status: 502 })
  }
}
