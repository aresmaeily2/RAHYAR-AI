// ─── رهیار AI — اسکرین‌شات تمام صفحات نسخهٔ پروداکشن پس از ممیزی ۳۶۰ ──
// خروجی: download/audit-v2/screens-web/*.png (ویوپورت موبایل ۴۱۲×۹۱۵ — معادل WebView اندروید)
import { chromium, devices } from 'playwright'
import fs from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/download/audit-v2/screens-web'
fs.mkdirSync(OUT, { recursive: true })

const USER = 'owner'
const PASS = 'REDACTED_C7'

async function api(path, body, cookie) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })
  const setCookie = res.headers.get('set-cookie')
  return { status: res.status, json: await res.json().catch(() => ({})), setCookie }
}

// ۱) راه‌اندازی مالک (توکن نصب = مقدار env سرور)
const setup = await api('/api/auth/setup', {
  setupToken: 'local-dev-setup-token-0123456789abcdef',
  username: USER,
  displayName: 'علیرضا',
  password: PASS,
})
console.log('setup:', setup.status, JSON.stringify(setup.json).slice(0, 120))

// ۲) ورود API برای گرفتن کوکی نشست — سپس دادهٔ نمونه با همان نشست
const login = await api('/api/auth/login', { username: USER, password: PASS })
const cookie = (login.setCookie || '').split(';')[0]
console.log('login:', login.status, 'cookie:', cookie ? 'OK' : 'MISSING')

// ۳) دادهٔ نمونه برای صفحات پر — از طریق API واقعی با نشست معتبر
const seedTasks = [
  { title: 'تماس با تیم پشتیبانی', priority: 1, dueTime: '10:30', tag: 'کار' },
  { title: 'بازبینی گزارش ممیزی امنیتی', priority: 2, dueTime: '14:00', tag: 'کار' },
  { title: 'خرید هدیه تولد سارا', priority: 3, dueTime: '18:30', tag: 'شخصی' },
]
for (const t of seedTasks) {
  const r = await api('/api/tasks', { ...t, clientKey: 'audit-seed' }, cookie)
  console.log('task:', r.status)
}
const future = new Date(Date.now() + 3 * 3600 * 1000).toISOString()
const r1 = await api('/api/reminders', { message: 'جلسهٔ آنلاین با تیم فنی', remindAt: future }, cookie)
console.log('reminder:', r1.status)

const ctx = await chromium.launchPersistentContext('/tmp/rahyar-pw-profile', {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  locale: 'fa-IR',
  timezoneId: 'Asia/Tehran',
  ...(devices['Pixel 7'] || {}),
})
const page = ctx.pages()[0] || (await ctx.newPage())

// ۴) صفحهٔ ورود
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/01-login.png` })
console.log('shot: 01-login')

// ۵) ورود واقعی از طریق فرم
await page.fill('#username', USER)
await page.fill('#password', PASS)
await page.screenshot({ path: `${OUT}/02-login-filled.png` })
await page.click('button[type="submit"]')
await page.waitForURL(BASE + '/', { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(2500)

// ۵) ناوبری به هر نما با کلیک روی دکمهٔ ناوبری (برچسب‌های فارسی)
async function gotoView(label, name) {
  const btn = page.getByRole('button', { name: label }).first()
  await btn.click({ timeout: 8000 }).catch(async () => {
    // fallback: کلیک از طریق DOM — ناوبری اصلی aria-label دارد
    await page.evaluate((k) => {
      const el = document.querySelector('[aria-label]')
      const nav = el && el.getAttribute('aria-label') === 'ناوبری اصلی' ? el : document.querySelector('nav')
      const btns = nav ? Array.from(nav.querySelectorAll('button')) : []
      const target = btns.find((b) => (b.textContent || '').includes(k))
      if (target) target.click()
    }, label)
  })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name)
}

await gotoView('امروز', '03-today')
await gotoView('کارها', '04-tasks')

// ۶) گفتگو: پرسش مسیر قطعی (بدون مدل) تا پاسخ واقعی و فوری ثبت شود
await gotoView('دستیار', '06-chat')
const chatInput = page.locator('textarea, input[type="text"]').last()
if (await chatInput.count()) {
  await chatInput.fill('چه کارهایی برای امروز دارم؟')
  await chatInput.press('Enter')
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${OUT}/06b-chat-answer.png` })
  console.log('shot: 06b-chat-answer')
}

await gotoView('تقویم', '05-calendar')
await gotoView('برنامه', '07-plan')
await gotoView('مالی', '08-finance')
await gotoView('تنظیمات', '09-settings')

// ۷) نمای دسکتاپ برای مستندسازی ریسپانسیو
const dp = await ctx.newPage()
await dp.setViewportSize({ width: 1440, height: 900 })
await dp.goto(BASE + '/', { waitUntil: 'networkidle' })
await dp.waitForTimeout(2000)
await dp.screenshot({ path: `${OUT}/10-desktop.png` })
console.log('shot: 10-desktop')

await ctx.close()
console.log('DONE web screenshots')
