import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, tooManyRequests } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * Health check برای پایش و استقرار:
 * وضعیت فرایند + پاسخ‌گویی پایگاه‌داده + نسخه اسکیما
 * RT-4 (اصلاح Red Team): هر درخواست یک ضربه DB است — سقف نرخ سبک
 * تا مسیر عمومی برای فرسایش SQLite بی‌کران نماند (پایش با ۶۰/دقیقه کافی است).
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  const started = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'ok',
      database: 'ok',
      latencyMs: Date.now() - started,
      time: new Date().toISOString(),
    })
  } catch (e) {
    console.error('GET /api/health', e)
    return NextResponse.json(
      { status: 'degraded', database: 'error', time: new Date().toISOString() },
      { status: 503 },
    )
  }
}
