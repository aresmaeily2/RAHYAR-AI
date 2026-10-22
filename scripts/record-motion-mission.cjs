// ─── ویدیوی کوتاه تعاملات واقعی — مأموریت موشن‌گرافیک ───────────
// اجرا: node scripts/record-motion-mission.cjs
// خروجی: download/motion-mission-screenshots/motion-tour.webm
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = 'http://localhost:3000'
const TOKEN = fs.readFileSync('/home/z/my-project/artifacts/preview/session-token.txt', 'utf-8').trim()
const OUT_DIR = '/home/z/my-project/download/motion-mission-screenshots'
fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.addInitScript(() => { localStorage.setItem('theme', 'light'); localStorage.setItem('rahyar-theme', 'ocean') })

  await page.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(3500) // ورود خانه + تنفس Orb

  // مالی — رشد نوارها
  await page.getByRole('button', { name: /مالی/ }).first().click()
  await page.waitForTimeout(2600)
  // باز شدن نرم پنل تراکنش جدید
  await page.getByRole('button', { name: /تراکنش جدید/ }).first().click()
  await page.waitForTimeout(1400)
  await page.getByRole('button', { name: /انصراف|بستن/ }).first().click().catch(() => {})
  await page.waitForTimeout(900)

  // تقویم — جابه‌جایی نرم
  await page.getByRole('button', { name: /تقویم/ }).first().click()
  await page.waitForTimeout(2200)

  // تغییر تم — reveal دایره‌ای
  await page.evaluate(() => { document.documentElement.dataset.theme = 'sunset' })
  await page.waitForTimeout(1800)
  await page.evaluate(() => { document.documentElement.dataset.theme = 'forest' })
  await page.waitForTimeout(1800)
  // تیره
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.waitForTimeout(1600)

  await ctx.close() // بستن کانتکست = پایان ضبط
  await browser.close()

  // تغییرنام ویدیو
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'))
  if (files.length) {
    const latest = files.map((f) => ({ f, t: fs.statSync(path.join(OUT_DIR, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f
    fs.renameSync(path.join(OUT_DIR, latest), path.join(OUT_DIR, 'motion-tour.webm'))
    console.log('VIDEO SAVED: motion-tour.webm (' + Math.round(fs.statSync(path.join(OUT_DIR, 'motion-tour.webm')).size / 1024) + ' KB)')
  } else {
    console.log('NO VIDEO PRODUCED')
  }
})().catch((e) => { console.error(e); process.exit(1) })
