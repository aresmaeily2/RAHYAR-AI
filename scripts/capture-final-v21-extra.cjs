// ضبط تکمیلی: اسپلش واقعی (نشست مالک — شروع سرد) + نمای تنظیمات
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/download/final-v21'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifestPath = OUT + '/manifest.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
const M = (file, kind, note) => manifest.captures.push({ file, kind, note: note || '' })

async function cookie(browser, opts = {}) {
  const pw = fs.readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: pw }),
  })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran',
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ اسپلش — هر فریم = شروع سرد واقعی یک نشست تازهٔ مالک ══
  const times = [120, 450, 800, 1100, 1400, 1700, 2000, 2400]
  for (let i = 0; i < times.length; i++) {
    const ctx = await cookie(browser)
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'commit' })
    await page.waitForTimeout(times[i])
    const f = 'splash-' + String(i + 1).padStart(2, '0') + '-t' + times[i] + 'ms.png'
    await page.screenshot({ path: OUT + '/splash/' + f })
    M('splash/' + f, 'splash-frame', 'cold start with owner session, ' + times[i] + 'ms — real web product splash (same timeline as Android SplashView)')
    console.log(f)
    await ctx.close()
  }

  // ══ تنظیمات (از چیپ پروفایل) — موبایل ══
  {
    const ctx = await cookie(browser)
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2400)
    // چیپ پروفایل بالا-چپ (RTL) → منوی پروفایل → تنظیمات
    const chip = page.locator('header button').first()
    await chip.click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: OUT + '/web/07a-profile-menu.png' })
    M('web/07a-profile-menu.png', 'page', 'profile menu (settings entry)')
    const item = page.getByRole('button', { name: /تنظیمات|Settings/ }).last()
    await item.click()
    await page.waitForTimeout(2200)
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.screenshot({ path: OUT + '/web/07-settings.png' })
    M('web/07-settings.png', 'page', 'Settings view (mobile) — ambient + motion')
    console.log('settings done')
    await ctx.close()
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('EXTRA CAPTURES DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
