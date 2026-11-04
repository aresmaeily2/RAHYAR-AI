import { NextResponse } from 'next/server'
import { execFile } from 'child_process'

/**
 * F2-EMU: پخش زندهٔ صفحهٔ شبیه‌ساز اندروید برای پنل سمت راست مالک.
 * خروجی: PNG خام از «screencap» از طریق adb (فقط خواندن، بدون ذخیره).
 * مسیر عمومی (PUBLIC_PREFIXES در src/proxy.ts) — شبیه‌ساز فقط اپ دموی محلی را اجرا می‌کند.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADB = '/home/z/my-project/artifacts/android-sdk/platform-tools/adb'
const SERIAL = process.env.RAHYAR_EMU_SERIAL || 'emulator-5554'

export async function GET() {
  try {
    const png = await new Promise<Buffer>((resolve, reject) => {
      execFile(
        ADB,
        ['-s', SERIAL, 'exec-out', 'screencap', '-p'],
        { timeout: 8000, maxBuffer: 20 * 1024 * 1024, encoding: 'buffer' },
        (err, stdout) => (err ? reject(err) : resolve(stdout as Buffer)),
      )
    })
    if (png.length < 1000 || png[0] !== 0x89 || png[1] !== 0x50) {
      return NextResponse.json({ error: 'emulator screen unavailable' }, { status: 503 })
    }
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch {
    return NextResponse.json({ error: 'emulator not running' }, { status: 503 })
  }
}
