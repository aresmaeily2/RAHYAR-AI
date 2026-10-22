// بررسی خطاهای Console/Network روی صفحات اصلی محصول (production build)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')
const BASE = 'http://localhost:3000'

;(async () => {
  const pw = fs.readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: pw }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, locale: 'fa-IR' })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  const errors = [], pageErrors = [], failedReq = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 160)) })
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)))
  page.on('requestfailed', (req) => failedReq.push(req.url().slice(0, 100)))
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  for (const label of ['کارها', 'تقویم', 'دستیار', 'مالی']) {
    try { await page.getByRole('button', { name: label }).first().click(); await page.waitForTimeout(1500) } catch (e) { /* nav */ }
  }
  await page.locator('button[aria-label="تنظیمات"]').first().click().catch(() => {})
  await page.waitForTimeout(2000)
  console.log('console errors:', errors.length)
  errors.slice(0, 8).forEach((e) => console.log('  [console.error]', e))
  console.log('page errors:', pageErrors.length)
  pageErrors.slice(0, 8).forEach((e) => console.log('  [pageerror]', e))
  console.log('failed requests:', failedReq.length)
  failedReq.slice(0, 8).forEach((u) => console.log('  [reqfailed]', u))
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
