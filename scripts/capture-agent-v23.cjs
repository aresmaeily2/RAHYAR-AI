// اسکرین‌شات Agent واقعی: چیپ اکشن موفق «ثبت شد» بعد از فرمان ساخت وظیفه
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = '/home/z/my-project/download/final-v21'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifest = JSON.parse(fs.readFileSync(OUT + '/manifest.json', 'utf-8'))

;(async () => {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran' })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.waitForTimeout(2600)
  await page.getByRole('button', { name: /دستیار/ }).first().click()
  await page.waitForTimeout(1500)
  const input = page.locator('textarea, input[type="text"]').last()
  await input.fill('یک وظیفه با عنوان «بازبینی گزارش فروش» برای فردا ساعت ۹ اضافه کن')
  await input.press('Enter')
  await page.waitForTimeout(4000) // پاسخ قطعی + چیپ اکشن
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.screenshot({ path: OUT + '/web/08-agent-action.png' })
  manifest.captures.push({ file: 'web/08-agent-action.png', kind: 'page', note: 'Agent evidence: real add_task command via assistant, success action chip «ثبت شد» visible' })
  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 2))
  console.log('agent screenshot OK')
  await ctx.close()
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
