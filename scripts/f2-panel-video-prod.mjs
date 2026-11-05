// ─── ویدیوی پنل شبیه‌ساز — وضعیت‌های واقعی (پخش زنده/در انتظار/خاموش) ──
// ۹۰ ثانیه رکورد از /emulator با نشست مالک: وضعیت صادقانه از API واقعی می‌آید.
import { chromium } from 'playwright'
import fs from 'node:fs'

const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/download/RahyAr-Android/videos'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 900 } },
})
const page = await ctx.newPage()
await ctx.request.post(B + '/api/auth/login', { data: { username: 'admin', password: 'admin' }, headers: { Origin: B } })

await page.goto(B + '/emulator', { waitUntil: 'domcontentloaded', timeout: 30000 })
// ۹۰ ثانیه — وضعیت زنده یا صادقانهٔ خاموش/بوت ثبت می‌شود
await page.waitForTimeout(45000)
await page.screenshot({ path: '/tmp/panel-video-end2.png' })
await ctx.close()
await browser.close()
console.log('DONE panel video')
