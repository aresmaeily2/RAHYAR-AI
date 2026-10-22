// ویدیوی کوتاه اسپلش واقعی — شروع سرد با نشست مالک
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/download/final-v21/video'
;(async () => {
  const pw = fs.readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: pw }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR',
    recordVideo: { dir: OUT, size: { width: 393, height: 851 } },
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'commit' })
  await page.waitForTimeout(3400) // اسپلش کامل + ورود به اپ
  const v = await page.video()
  const vp = await v.path()
  await ctx.close()
  fs.renameSync(vp, OUT + '/splash-cold-start.webm')
  await browser.close()
  console.log('SPLASH VIDEO DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
