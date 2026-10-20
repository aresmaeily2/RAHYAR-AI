// اسکرین‌شات‌های تکمیلی تثبیت نسخهٔ وب — ورود انگلیسی (LTR) + موبایل فارسی
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')
const BASE = 'http://localhost:3000'
const SHOTS = '/home/z/my-project/download/screenshots/grand'
fs.mkdirSync(SHOTS, { recursive: true })
const CRED = '/home/z/my-project/artifacts/gu2/owner-credentials.txt'
const PW = (fs.readFileSync(CRED, 'utf-8').match(/owner-password=(.*)/) || [])[1]?.trim()
const HIDE = 'nextjs-portal{display:none!important}'

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ۱) ورود انگلیسی — باید LTR و بدون نشت فارسی باشد
  const ctxEn = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } })
  const p1 = await ctxEn.newPage()
  await p1.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await p1.addStyleTag({ content: HIDE })
  await p1.waitForTimeout(800)
  const dir = await p1.evaluate(() => document.documentElement.getAttribute('dir'))
  console.log('login-en dir =', dir, dir === 'ltr' ? 'OK' : 'FAIL')
  await p1.screenshot({ path: SHOTS + '/08-login-en.png' })

  // ورود مالک در همان نشست انگلیسی → امروز موبایلی؟ نه — دسکتاپ امروز
  await p1.fill('input[autocomplete="username"]', 'owner')
  await p1.fill('input[type="password"]', PW)
  await p1.click('button[type="submit"]')
  await p1.waitForSelector('aside, nav', { timeout: 30000, state: 'attached' })
  await p1.waitForTimeout(2200)
  await p1.screenshot({ path: SHOTS + '/09-today-en.png' })

  // ۲) موبایل فارسی — امروز و مالی
  const ctxM = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    locale: 'fa-IR',
  })
  const p2 = await ctxM.newPage()
  await p2.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await p2.addStyleTag({ content: HIDE })
  await p2.fill('input[autocomplete="username"]', 'owner')
  await p2.fill('input[type="password"]', PW)
  await p2.click('button[type="submit"]')
  await p2.waitForSelector('aside, nav', { timeout: 30000, state: 'attached' })
  await p2.waitForTimeout(2200)
  await p2.screenshot({ path: SHOTS + '/10-mobile-today-fa.png' })
  // رفتن به مالی از طریق دکمهٔ ناوبری
  try {
    await p2.getByRole('button', { name: /مالی/ }).first().click()
    await p2.waitForTimeout(2200)
    await p2.screenshot({ path: SHOTS + '/11-mobile-finance-fa.png' })
  } catch (e) { console.log('finance nav skip:', e.message.split('\n')[0]) }

  await browser.close()
  console.log('EXTRA-SHOTS-DONE')
})().catch((e) => { console.error(e); process.exit(1) })
