// ─── ضبط دموی لایه محیطی — همه تعامل‌ها واقعی ───────────────────
// ۱) تعویض تم از دیالوگ ظاهر (انتقال reveal + صحنه‌ها)
// ۲) چت واقعی با دستیار → Orb: thinking → streaming
// ۳) تایمر تمرکز → سکوت محیط → بازگشت
// خروجی: artifacts/ambient/ambient-demo.webm
const path = require('path')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const TOKEN = process.argv[2]
const OUT = '/home/z/my-project/artifacts/ambient/ambient-demo.webm'
const BASE = 'http://localhost:3100'

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.dirname(OUT), size: { width: 1440, height: 900 } },
    deviceScaleFactor: 1,
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()

  await page.goto(BASE + '/?demo=' + Date.now(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000) // لایه‌های محیطی نفس بکشند

  // دیالوگ ظاهر — تعویض تم زنده
  await page.getByRole('button', { name: /پروفایل و حساب/ }).first().click()
  await page.waitForTimeout(1200)
  for (const t of [/تم جنگل/, /تم شفق/, /تم شب/, /تم اقیانوس/]) {
    await page.getByRole('radio', { name: t }).click()
    await page.waitForTimeout(2000)
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1200)

  // دستیار — چت واقعی
  await page.getByRole('button', { name: /دستیار/ }).first().click()
  await page.waitForTimeout(1800)
  const box = page.getByPlaceholder(/با رهیار حرف بزن/)
  await box.fill('لیست کارهای امروز من')
  await box.press('Enter')
  await page.waitForTimeout(9000) // thinking → streaming → پاسخ

  // تمرکز — سکوت محیط (بازگشت به امروز، میانبر تمرکز)
  await page.getByRole('button', { name: /امروز/ }).first().click()
  await page.waitForTimeout(1800)
  await page.getByRole('button', { name: /تمرکز/ }).first().click()
  await page.waitForTimeout(1500)
  const play = page.getByRole('button', { name: /شروع|پخش/ }).first()
  await play.click()
  await page.waitForTimeout(5000)
  await page.getByRole('button', { name: /توقف|لغو/ }).first().click()
  await page.waitForTimeout(2500)

  await ctx.close() // ذخیره ویدئو
  await browser.close()
  console.log('DEMO_OK')
})().catch((e) => {
  console.error('DEMO_FAIL', e.message)
  process.exit(1)
})
