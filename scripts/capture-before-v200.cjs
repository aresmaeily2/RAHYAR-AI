// مقایسهٔ قبل/بعد — v2.0.0 (قبل) در پرت ۳۲۰۰ با همان اندازه و شرایط v2.1.0 (بعد)
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = 'http://localhost:3200'
const OUT = '/home/z/my-project/download/final-v21/before-v200'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
fs.mkdirSync(OUT, { recursive: true })

async function cookie(browser) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran' })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ورود (بدون نشست قبلی) — صفحهٔ ورود قدیم
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const page = await ctx.newPage()
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: OUT + '/01-login.png' })
    await ctx.close()
    console.log('before login OK')
  }

  // نمای‌های اصلی — همان ترتیب و اندازهٔ بعد
  const ctx = await cookie(browser)
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.waitForTimeout(2400)
  await page.screenshot({ path: OUT + '/02-today.png' })
  console.log('before today OK')
  const navs = [
    [/کارها/, '03-tasks.png'],
    [/تقویم/, '04-calendar.png'],
    [/دستیار/, '05-chat.png'],
    [/مالی/, '06-finance.png'],
  ]
  for (const [label, file] of navs) {
    try {
      await page.getByRole('button', { name: label }).first().click()
      await page.waitForTimeout(2000)
      await page.addStyleTag({ content: HIDE_OVERLAY })
      await page.screenshot({ path: OUT + '/' + file })
      console.log('before', file, 'OK')
    } catch (e) { console.log('before NAV-FAIL', file, e.message.slice(0, 60)) }
  }
  // تنظیمات از دسکتاپ (چیپ پروفایل)
  try {
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }) })
    const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
    await ctx2.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
    const p2 = await ctx2.newPage()
    await p2.goto(BASE + '/', { waitUntil: 'networkidle' })
    await p2.addStyleTag({ content: HIDE_OVERLAY })
    await p2.waitForTimeout(2200)
    await p2.locator('button[aria-label="تنظیمات"]').first().click()
    await p2.waitForTimeout(2000)
    await p2.screenshot({ path: OUT + '/07-settings.png' })
    await ctx2.close()
    console.log('before settings OK')
  } catch (e) { console.log('before settings FAIL', e.message.slice(0, 60)) }

  await ctx.close()
  await browser.close()
  console.log('BEFORE CAPTURES DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
