import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { dailyReport } from '@/lib/assistant/report'
import { recentActions } from '@/lib/assistant/action-log'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

// GET /api/report/daily — گزارش روزانه قطعی (بدون مدل، بدون هزینه)
export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const [report, actions] = await Promise.all([
      dailyReport(user.id),
      recentActions(user.id, 10),
    ])
    return NextResponse.json({ report, actions })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/report/daily', e)
    return NextResponse.json({ error: 'خطا در ساخت گزارش' }, { status: 500 })
  }
}
