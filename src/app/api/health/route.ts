import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Health check برای پایش و استقرار:
 * وضعیت فرایند + پاسخ‌گویی پایگاه‌داده + نسخه اسکیما
 */
export async function GET() {
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
