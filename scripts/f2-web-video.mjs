// ─── ویدیوی اجرای واقعی وب — مکالمه دوزبانه + پنج فرمان عملیاتی ──
// همهٔ کنش‌ها از مسیر واقعی API/دیتابیس می‌گذرند؛ هیچ مسیر نمایشی وجود ندارد.
// خروجی: download/RahyAr-Android/videos/web-live-fa-en.mp4
import { chromium } from 'playwright'
import fs from 'node:fs'

const B = 'http://127.0.0.1:3000'
const OUT = '/home/z/my-project/download/RahyAr-Android/videos'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
})
const page = await ctx.newPage()
const log = []

// ورود مالک از API واقعی
const lr = await ctx.request.post(B + '/api/auth/login', {
  data: { username: 'admin', password: 'admin' },
  headers: { Origin: B },
})
log.push('login: ' + lr.status())

// ── ۱) خانه (فارسی) ──
await page.goto(B + '/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
await page.screenshot({ path: '/tmp/v-fa-home.png' })

// ناوبری به دستیار (چت)
await page.locator('nav a:has-text("دستیار"), nav button:has-text("دستیار")').first().click()
await page.waitForTimeout(2500)

// ── ۲) گفتگو: فرمان ۱ — ساخت وظیفه (عاملی واقعی) ──
const chatInput = page.locator('textarea').last()
await chatInput.fill('وظیفه‌ای بساز به نام تماس با تیم طراحی')
await chatInput.press('Enter')
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/v-fa-chat-task.png' })
log.push('cmd1 fa task: sent')

// ── ۳) فرمان ۲ — یادآور ──
await chatInput.fill('یادآور بذار برای جلسه فردا ساعت ۹')
await chatInput.press('Enter')
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/v-fa-chat-reminder.png' })
log.push('cmd2 fa reminder: sent')

// ── ۴) فرمان ۳ — درآمد مالی ──
await chatInput.fill('پانصد هزار تومان درآمد برای فروش ماه')
await chatInput.press('Enter')
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/v-fa-chat-income.png' })
log.push('cmd3 fa income: sent')

// ── ۵) بررسی واقعی: وظایف ساخته‌شده؟ ──
const tasks = await ctx.request.get(B + '/api/tasks')
const tasksJson = await tasks.json()
const created = JSON.stringify(tasksJson).includes('تماس با تیم طراحی')
log.push('verify task in DB: ' + created)

// ── ۶) صفحات: تقویم / مالی / گزارش ──
await page.goto(B + '/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.locator('nav a:has-text("تقویم"), nav button:has-text("تقویم")').first().click()
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/v-fa-calendar.png' })

// ── ۷) تعویض زبان به EN از تنظیمات ──
await page.locator('nav a:has-text("تنظیمات"), nav button:has-text("تنظیمات")').first().click()
await page.waitForTimeout(2000)
await page.screenshot({ path: '/tmp/v-fa-settings.png' })
// انتخاب انگلیسی در select زبان اگر بود
const langSel = page.locator('select').first()
if (await langSel.count()) {
  const opts = await langSel.locator('option').allTextContents()
  const enIdx = opts.findIndex(o => /english|en/i.test(o) || /انگلیسی/.test(o))
  if (enIdx >= 0) { await langSel.selectOption({ index: enIdx }).catch(() => {}) }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/v-en-settings.png' })
  log.push('lang switch options: ' + opts.join('|'))
}

// ── ۸) فرمان انگلیسی در چت (فقط اگر رابط انگلیسی شد) ──
await page.goto(B + '/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
await page.locator('nav a:has-text("دستیار"), nav button:has-text("دستیار")').first().click()
await page.waitForTimeout(2000)
const chat2 = page.locator('textarea').last()
await chat2.fill('add task review quarterly report')
await chat2.press('Enter')
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/v-en-chat-task.png' })
log.push('cmd4 en task: sent')

// ── ۹) فرمان ۵ — گزارش مالی ──
await chat2.fill('show finance report')
await chat2.press('Enter')
await page.waitForTimeout(6000)
await page.screenshot({ path: '/tmp/v-en-chat-report.png' })
log.push('cmd5 en report: sent')

// بررسی نهایی دیتابیس
const fin = await ctx.request.get(B + '/api/finance/transactions')
log.push('finance transactions status: ' + fin.status())

await ctx.close()
await browser.close()
fs.writeFileSync('/tmp/web-video-log.txt', log.join('\n'))
console.log(log.join('\n'))
console.log('DONE web video')
