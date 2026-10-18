// ─── ضبط ویدئوی موشن نسخه ۱٫۰ — تعویض زبان + تقویم دوگانه + مالی + Orb ──
// خروجی: artifacts/rahyar-v1/motion-v1.webm → mp4/gif
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const TOKEN = fs.readFileSync('/tmp/rahyar-test-token.txt', 'utf8').trim()
const OUT_DIR = '/home/z/my-project/artifacts/rahyar-v1'
const OUT = path.join(OUT_DIR, 'motion-v1.webm')
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT_DIR, { recursive: true })

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUT_DIR, size: { width: 1440, height: 900 } },
    deviceScaleFactor: 1,
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000) // خوش‌آمد breathing Orb

  const nav = async (name) => {
    await page.getByRole('button', { name }).first().click()
    await page.waitForTimeout(1500)
  }

  // ۱) خوش‌آمد + مالی: نمودار دسته‌ها و تراکنش‌ها
  await nav(/مالی/)
  await page.waitForTimeout(800)

  // ۲) تقویم دوگانه — ناوبری ماه (شمسی بزرگ تأکیدی + میلادی خاکستری)
  await nav(/تقویم/)
  await page.getByRole('button', { name: /ماه بعد/ }).click()
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: /ماه قبل/ }).click()
  await page.waitForTimeout(900)

  // ۳) دستیار — نیت قطعی + اورب
  await nav(/دستیار/)
  await page.getByRole('textbox', { name: /پیام به دستیار/ }).fill('شروع تمرکز')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(2500) // تایمر تمرکز باز می‌شود
  const closeTimer = page.getByRole('button', { name: /بستن تایمر/ })
  if (await closeTimer.count()) { await closeTimer.click(); await page.waitForTimeout(600) }

  // ۴) تعویض زبان زنده — فارسی → انگلیسی → فارسی (RTL↔LTR)
  await nav(/تنظیمات/)
  const persianBtn = page.getByRole('button', { name: /^English/ }).first()
  if (await persianBtn.count()) {
    await persianBtn.click()
    await page.waitForTimeout(1800)
    const faBtn = page.getByRole('button', { name: /^Persian/ }).first()
    await faBtn.click()
    await page.waitForTimeout(1800)
  }

  // ۵) انتقال تم با reveal دایره‌ای
  await page.keyboard.press('d')
  await page.waitForTimeout(1700)
  await page.keyboard.press('d')
  await page.waitForTimeout(1400)

  // ۶) گل و پالس اورب — تکمیل کار از نمای امروز
  await nav(/امروز/)
  const check = page.locator('button[aria-label*="علامت"], button[title*="انجام شد"]').first()
  if (await check.count()) { await check.click(); await page.waitForTimeout(2600) }

  await ctx.close() // ذخیره ویدئو
  await browser.close()
  fs.renameSync(
    path.join(OUT_DIR, fs.readdirSync(OUT_DIR).find((f) => f.endsWith('.webm'))),
    OUT,
  )
  console.log('VIDEO_OK', OUT)
})().catch((e) => {
  console.error('VIDEO_FAIL', e.message)
  process.exit(1)
})
