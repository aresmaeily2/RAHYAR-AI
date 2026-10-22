// ضبط تنظیمات — چیپ پروفایل مستقیماً نمای تنظیمات را باز می‌کند (aria-label=تنظیمات)
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/download/final-v21'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifestPath = OUT + '/manifest.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

async function cookie(browser) {
  const pw = fs.readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: pw }),
  })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran' })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await cookie(browser)
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.waitForTimeout(2400)
  await page.locator('button[aria-label="تنظیمات"]').first().click()
  await page.waitForTimeout(2400)
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.screenshot({ path: OUT + '/web/07-settings.png' })
  manifest.captures.push({ file: 'web/07-settings.png', kind: 'page', note: 'Settings view (desktop 1280×800 — via profile chip, ambient + sections' })
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log('settings captured')
  await ctx.close()
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
