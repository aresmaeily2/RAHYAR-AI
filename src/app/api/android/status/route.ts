import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { guardEmuApi } from '@/lib/emu-guard'

/**
 * F2-EMU: وضعیت شبیه‌ساز برای پنل مالک — فقط OWNER.
 * خروجی: آنلاین بودن دستگاه، بوت، مشخصات (API/نسخه/ABI/رزولوشن/DPI/RAM)،
 * وضعیت نصب اپ رهیار.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADB = '/home/z/my-project/artifacts/android-sdk/platform-tools/adb'
const SERIAL = process.env.RAHYAR_EMU_SERIAL || 'emulator-5554'
const PKG = 'com.rahyarai.app'

function run(args: string[], timeout = 6000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(ADB, ['-s', SERIAL, ...args], { timeout }, (err, stdout) =>
      err ? reject(err) : resolve(String(stdout)),
    )
  })
}

export async function GET(req: NextRequest) {
  const g = await guardEmuApi(req, { limit: 3, windowMs: 10_000 })
  if (!g.ok) return g.response

  const out = {
    deviceOnline: false, booted: false, apiLevel: '', androidVersion: '',
    abi: '', resolution: '', density: '', ramMb: '', appInstalled: false,
    updatedAt: new Date().toISOString(),
  }

  let devices = ''
  try {
    devices = await new Promise<string>((resolve, reject) => {
      execFile(ADB, ['devices'], { timeout: 5000 }, (err, stdout) =>
        err ? reject(err) : resolve(String(stdout)),
      )
    })
  } catch {
    return NextResponse.json(out)
  }
  if (!devices.includes(SERIAL)) return NextResponse.json(out)
  out.deviceOnline = true

  try {
    const boot = (await run(['shell', 'getprop', 'sys.boot_completed'])).trim()
    out.booted = boot === '1'
  } catch { /* غیرحیاتی */ }
  if (!out.booted) return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })

  const props = ['ro.build.version.sdk', 'ro.build.version.release', 'ro.product.cpu.abi']
  for (const p of props) {
    try {
      const v = (await run(['shell', 'getprop', p])).trim()
      if (p.endsWith('sdk')) out.apiLevel = v
      else if (p.endsWith('release')) out.androidVersion = v
      else out.abi = v
    } catch { /* غیرحیاتی */ }
  }
  try {
    const size = (await run(['shell', 'wm', 'size'])).match(/(\d+x\d+)/)
    if (size) out.resolution = size[1]
    const d = (await run(['shell', 'wm', 'density'])).match(/(\d+)/)
    if (d) out.density = d[1]
  } catch { /* غیرحیاتی */ }
  try {
    const mem = (await run(['shell', 'cat', '/proc/meminfo'], 5000)).match(/MemTotal:\s+(\d+)\s+kB/)
    if (mem) out.ramMb = String(Math.round(parseInt(mem[1], 10) / 1024))
  } catch { /* غیرحیاتی */ }
  try {
    const pkgs = (await run(['shell', 'pm', 'list', 'packages', PKG], 8000)).trim()
    out.appInstalled = pkgs.includes(`package:${PKG}`)
  } catch { /* غیرحیاتی */ }

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
