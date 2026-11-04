import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { guardEmuApi } from '@/lib/emu-guard'

/**
 * F2-EMU: تعامل لمسی با شبیه‌ساز — فقط مالک (نشست + نقش + Same-Origin + نرخ).
 * ورودی JSON: { action: 'tap'|'swipe'|'back'|'home'|'rotate', x?, y?, x2?, y2? }
 * فقط روی شبیه‌ساز محلی اجرا می‌شود (بدون دسترسی به دستگاه واقعی).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADB = '/home/z/my-project/artifacts/android-sdk/platform-tools/adb'
const SERIAL = process.env.RAHYAR_EMU_SERIAL || 'emulator-5554'

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(ADB, ['-s', SERIAL, ...args], { timeout: 8000 }, (err, stdout, stderr) =>
      err ? reject(new Error(String(stderr || err))) : resolve(String(stdout)),
    )
  })
}

const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 30000

export async function POST(req: NextRequest) {
  const g = await guardEmuApi(req, { write: true })
  if (!g.ok) return g.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 })
  }
  const action = String(body.action || 'tap')
  try {
    if (action === 'tap' && num(body.x) && num(body.y)) {
      await run(['shell', 'input', 'tap', String(Math.round(body.x as number)), String(Math.round(body.y as number))])
    } else if (action === 'swipe' && num(body.x) && num(body.y) && num(body.x2) && num(body.y2)) {
      await run([
        'shell', 'input', 'swipe',
        String(Math.round(body.x as number)), String(Math.round(body.y as number)),
        String(Math.round(body.x2 as number)), String(Math.round(body.y2 as number)),
        '180',
      ])
    } else if (action === 'back') {
      await run(['shell', 'input', 'keyevent', '4'])
    } else if (action === 'home') {
      await run(['shell', 'input', 'keyevent', '3'])
    } else if (action === 'rotate') {
      // چرخش ۹۰ درجه — کنسول شبیه‌ساز: rotate
      await run(['emu', 'rotate'])
    } else {
      return NextResponse.json({ error: 'unsupported action or bad coords' }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'adb failed', detail: String(e).slice(0, 200) }, { status: 503 })
  }
}
