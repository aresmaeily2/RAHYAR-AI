// ─── GRAND-F8: E2E دود + دسترس‌پذیری (axe-core) — اجرا روی build پروداکشن ──
// اجرا: node tests/e2e/grand-e2e.mjs
// خروجی: artifacts/reports/grand-e2e.json + اسکرین‌شات‌ها در download/screenshots/grand/
// شرط قبول: صفر خطای کنسول، صفر violation جدی axe (critical/serious)،
// تقویم شمسی در فارسی، فقط میلادی در انگلیسی، بدون سرریز افقی در ۳ نمای
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')
const path = require('path')
const AXE = require('axe-core')

const BASE = 'http://localhost:3000'
const SHOTS = '/home/z/my-project/download/screenshots/grand'
const CRED = '/home/z/my-project/artifacts/gu2/owner-credentials.txt'
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync('/home/z/my-project/artifacts/reports', { recursive: true })

const PW = (fs.readFileSync(CRED, 'utf-8').match(/owner-password=(.*)/) || [])[1]?.trim()
if (!PW) { console.error('no credentials'); process.exit(1) }

const results = { startedAt: new Date().toISOString(), checks: [], consoleErrors: [], axe: {}, shots: [] }
const check = (name, ok, detail = '') => {
  results.checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`)
  return ok
}

const FA_DIGITS = /[۰-۹]/ // ارقام فارسی — نباید در حالت انگلیسی تقویم دیده شوند

async function login(page, username = 'owner', password = PW) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[autocomplete="username"]', username)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForSelector('aside, nav', { timeout: 30000, state: 'attached' })
  await page.waitForTimeout(2500)
}

async function axeScan(page, label) {
  await page.addScriptTag({ content: AXE.source })
  const r = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }))
  const serious = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  results.axe[label] = {
    violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
    seriousCount: serious.length,
  }
  return serious
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const shot = async (p, name) => {
    await p.screenshot({ path: path.join(SHOTS, name) })
    results.shots.push(name)
  }

  // ═══ ۱) دسکتاپ فارسی ═══
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fa-IR' })
    const p = await ctx.newPage()
    p.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push({ page: p.url(), text: m.text().slice(0, 200) }) })
    p.on('pageerror', (e) => results.consoleErrors.push({ page: p.url(), text: 'PAGEERROR ' + String(e).slice(0, 200) }))

    await p.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await p.waitForTimeout(1800)
    const langAttr = await p.getAttribute('html', 'lang')
    const dir = await p.getAttribute('html', 'dir')
    check('login fa: html[lang=fa] + rtl', langAttr === 'fa' && dir === 'rtl', `${langAttr}/${dir}`)
    await shot(p, '01-login-fa.png')
    const serious = await axeScan(p, 'login-fa')
    check('axe login-fa: no serious violations', serious.length === 0, `${serious.length} serious`)

    await login(p)
    check('login flow: dashboard reached', p.url().replace(BASE, '') === '/' || p.url() === BASE + '/')
    await p.waitForTimeout(1500)
    await shot(p, '02-dashboard-fa.png')

    // ساخت کار از quick-add (UI واقعی)
    const qa = p.locator('input[aria-label="افزودن کار جدید"]')
    if (await qa.count()) {
      await qa.fill('GRAND-E2E-وظیفه-آزمایشی')
      await p.click('button[aria-label="ثبت کار"]')
      await p.waitForTimeout(1500)
      const seen = await p.locator('text=GRAND-E2E-وظیفه-آزمایشی').count()
      check('task created via UI appears in list', seen > 0)
    } else {
      check('task created via UI appears in list', false, 'quick-add input not found')
    }

    // تقویم فارسی → شمسی
    await p.click('button:has-text("تقویم")')
    await p.waitForTimeout(2200)
    const calText = await p.locator('main').innerText()
    const hasJalaliMonth = /مهر|آبان|آذر|دی/.test(calText)
    check('calendar fa: Jalali month visible', hasJalaliMonth)
    await shot(p, '03-calendar-fa.png')

    // تنظیمات → مدیریت کاربران
    await p.click('button:has-text("تنظیمات")')
    await p.waitForTimeout(2000)
    const usersVisible = await p.locator('text=مدیریت کاربران').count()
    check('owner sees users admin', usersVisible > 0)
    await shot(p, '04-settings-users-fa.png')

    const serious2 = await axeScan(p, 'settings-fa')
    check('axe settings-fa: no serious violations', serious2.length === 0, `${serious2.length} serious`)
    await ctx.close()
  }

  // ═══ ۲) دسکتاپ انگلیسی — فقط میلادی ═══
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
    await ctx.addInitScript(() => localStorage.setItem('ara-lang', 'en'))
    const p = await ctx.newPage()
    p.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push({ page: p.url(), text: m.text().slice(0, 200) }) })
    p.on('pageerror', (e) => results.consoleErrors.push({ page: p.url(), text: 'PAGEERROR ' + String(e).slice(0, 200) }))

    await login(p)
    await p.waitForTimeout(1500)
    // GRAND-F8: زبان سمت سرور منبع حقیقت است — همان مسیر واقعی کاربر (تنظیمات)
    await p.evaluate(() =>
      fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'en' }),
      }),
    )
    await p.reload({ waitUntil: 'networkidle' })
    await p.waitForTimeout(2500)
    const dl = await p.evaluate(() => document.documentElement.dataset.lang)
    check('en mode: html data-lang=en', dl === 'en', String(dl))
    await shot(p, '05-dashboard-en.png')

    await p.click('button:has-text("Calendar")')
    await p.waitForTimeout(2200)
    const calText = await p.locator('main').innerText()
    const gregorianOk = /October|November/.test(calText)
    const noPersian = !FA_DIGITS.test(calText) && !/مهر|آبان|آذر|دی/.test(calText)
    check('calendar en: Gregorian only, Latin digits, no Jalali leak', gregorianOk && noPersian,
      `gregorian=${gregorianOk} noPersian=${noPersian}`)
    await shot(p, '06-calendar-en.png')
    // بازگرداندن زبان مالک به فارسی (پاک‌سازی آزمون)
    await p.evaluate(() =>
      fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'fa' }),
      }),
    )
    await ctx.close()
  }

  // ═══ ۳) تبلت و موبایل — بدون سرریز افقی ═══
  for (const [name, vp, mobile] of [
    ['tablet', { width: 768, height: 1024 }, false],
    ['mobile', { width: 390, height: 844 }, true],
  ]) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'fa-IR', isMobile: mobile, hasTouch: mobile })
    const p = await ctx.newPage()
    p.on('pageerror', (e) => results.consoleErrors.push({ page: p.url(), text: 'PAGEERROR ' + String(e).slice(0, 200) }))
    await login(p)
    await p.waitForTimeout(1200)
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`${name}: no horizontal overflow`, overflow <= 1, `overflow=${overflow}px`)
    await shot(p, `07-${name}-dashboard.png`)
    await ctx.close()
  }

  // ═══ جمع‌بندی ═══
  const failed = results.checks.filter((c) => !c.ok)
  results.consoleErrorCount = results.consoleErrors.length
  results.finishedAt = new Date().toISOString()
  results.verdict = failed.length === 0 && results.consoleErrors.length === 0 ? 'PASS' : 'FAIL'
  fs.writeFileSync('/home/z/my-project/artifacts/reports/grand-e2e.json', JSON.stringify(results, null, 2))
  console.log('==============================')
  console.log(`E2E RESULT: ${results.verdict} — ${results.checks.length - failed.length}/${results.checks.length} checks, consoleErrors=${results.consoleErrors.length}`)
  if (results.consoleErrors.length) console.log(JSON.stringify(results.consoleErrors.slice(0, 10), null, 1))
  await browser.close()
  process.exit(results.verdict === 'PASS' ? 0 : 1)
})().catch((e) => { console.error('E2E crashed:', e); process.exit(2) })
