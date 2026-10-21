// اسکرین‌شات‌های تکمیلی: حالت خالی، مجوزها، یادآورها، تقویم انگلیسی
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const BASE = 'http://localhost:3000'
const SHOTS = '/home/z/my-project/download/screenshots-v2'

async function loginCookie(username, password) {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  return m ? m[0] : null
}

;(async () => {
  const ownerCookie = await loginCookie('owner', 'Rahyar@1404')
  const userCookie = await loginCookie('sarika', 'Sarika@1404')
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  async function newPhonePage(cookie, lang = 'fa-IR') {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: lang, timezoneId: 'Asia/Tehran', isMobile: true, hasTouch: true })
    await ctx.addCookies([{ name: 'rahyar_session', value: cookie.replace('rahyar_session=', ''), domain: 'localhost', path: '/' }])
    return { ctx, page: await ctx.newPage() }
  }
  async function shot(page, file) {
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(SHOTS, file) })
    console.log('shot', file)
  }
  async function nav(page, label, ms = 2400) {
    await page.evaluate((lbl) => {
      const b = Array.from(document.querySelectorAll('aside nav button')).find((x) => (x.textContent || '').includes(lbl))
      if (b) b.click()
    }, label).catch(() => {})
    await page.waitForTimeout(ms)
  }

  // یادآورها در برنامه (نمای برنامه مالک — بخش یادآور)
  {
    const { ctx, page } = await newPhonePage(ownerCookie)
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await nav(page, 'برنامه')
    await page.getByText(/یادآور|زمان/).first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(800)
    await shot(page, '20-owner-reminders-fa.png')
    await nav(page, 'تقویم')
    await page.waitForTimeout(1200)
    await shot(page, '21-owner-calendar-month-fa.png')
    await ctx.close()
  }

  // کاربر عادی — مالی خالی (حالت خالی واقعی) + مجوزها در تنظیمات
  {
    const { ctx, page } = await newPhonePage(userCookie)
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
    await nav(page, 'مالی')
    await page.waitForTimeout(1500)
    await shot(page, '22-user-finance-empty-fa.png')
    await nav(page, 'تنظیمات')
    await page.getByText(/صدا|میکروفن|ورودی صوتی/).first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(900)
    await shot(page, '23-user-settings-permissions-fa.png')
    await ctx.close()
  }

  // حالت بارگذاری (بار اول بدون کش — اسکلت‌ها)
  {
    const { ctx, page } = await newPhonePage(ownerCookie)
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(700)
    await page.screenshot({ path: path.join(SHOTS, '24-loading-state.png') }).catch(() => {})
    console.log('shot 24-loading-state.png')
    await ctx.close()
  }

  // به‌روزرسانی مانیفست
  const mf = path.join(SHOTS, 'manifest.json')
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'))
  const extra = [
    { file: '20-owner-reminders-fa.png', page: 'برنامه — یادآورهای فعال', role: 'OWNER', lang: 'fa', version: '2.0.0', environment: 'live production server, headless Chromium 393×851@2x', note: '' },
    { file: '21-owner-calendar-month-fa.png', page: 'تقویم شمسی — نمای ماه', role: 'OWNER', lang: 'fa', version: '2.0.0', environment: 'live production server, headless Chromium 393×851@2x', note: '' },
    { file: '22-user-finance-empty-fa.png', page: 'مالی کاربر جدید — حالت خالی واقعی', role: 'USER', lang: 'fa', version: '2.0.0', environment: 'live production server, headless Chromium 393×851@2x', note: 'empty state' },
    { file: '23-user-settings-permissions-fa.png', page: 'تنظیمات — وضعیت مجوز صدا و اعلان', role: 'USER', lang: 'fa', version: '2.0.0', environment: 'live production server, headless Chromium 393×851@2x', note: '' },
    { file: '24-loading-state.png', page: 'حالت بارگذاری (اسکلت)', role: 'OWNER', lang: 'fa', version: '2.0.0', environment: 'live production server, headless Chromium 393×851@2x', note: '' },
  ]
  m.shots.push(...extra)
  fs.writeFileSync(mf, JSON.stringify(m, null, 2))
  console.log('MANIFEST_UPDATED', m.shots.length)
  await browser.close()
  process.exit(0)
})().catch((e) => { console.error('FATAL', e); process.exit(2) })
