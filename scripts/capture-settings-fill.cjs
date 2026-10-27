// تکمیل شات «تنظیمات» — در دسکتاپ از سایدبار؛ در موبایل از چیپ پروفایل
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3000'
const TOKEN = process.env.AUDIT_TOKEN || ''
const OUT = '/home/z/my-project/download/screenshots-latest'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const manifest = JSON.parse(fs.readFileSync(OUT + '/manifest.json', 'utf-8'))

  // دسکتاپ — سایدبار
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran' })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.waitForTimeout(2200)
  let ok = false
  try {
    await page.getByRole('button', { name: /تنظیمات|Settings/ }).first().click()
    ok = true
  } catch (e) { console.log('DESKTOP-NAV-FAIL', e.message.slice(0, 60)) }
  if (!ok) {
    // موبایل — چیپ پروفایل
    await ctx.close()
    const m = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran' })
    await m.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
    const p2 = await m.newPage()
    await p2.goto(BASE + '/', { waitUntil: 'networkidle' })
    await p2.addStyleTag({ content: HIDE_OVERLAY })
    await p2.waitForTimeout(2200)
    await p2.locator('[data-testid="profile-chip"], header button').last().click()
    await p2.waitForTimeout(1500)
    await p2.getByRole('button', { name: /تنظیمات|Settings/ }).first().click()
    await p2.waitForTimeout(1800)
    await p2.addStyleTag({ content: HIDE_OVERLAY })
    await p2.screenshot({ path: OUT + '/web/07-settings.png' })
    manifest.captures.push({ file: 'web/07-settings.png', kind: 'page', note: 'Settings view — mobile, opened via profile chip (per app-shell dock design)' })
    await m.close()
  } else {
    await page.waitForTimeout(1800)
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.screenshot({ path: OUT + '/web/07-settings.png' })
    manifest.captures.push({ file: 'web/07-settings.png', kind: 'page', note: 'Settings view — desktop sidebar navigation, 1280×800' })
    await ctx.close()
  }
  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('SETTINGS CAPTURED')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
