// ─── اسکرین‌شات واقعی آخرین نسخهٔ موجود در Workspace ─────────────
// وب: v1.1.0 (package.json) | پوستهٔ اندروید: v2.1.0 (AppVersion.java)
// روش‌شناسی صادقانه:
//  - همهٔ تصاویر از اجرای واقعی برنامه (سرور توسعه همین پروژه، localhost:3000)
//  - ورود بدون هیچ رمزی: نشست ۲ساعتهٔ آزمایشی mint-audit-session.ts (مالک در
//    حالت SETUP_REQUIRED — رمز واقعی هیچ‌وقت تعیین/لمس نشده)
//  - رابط آفلاین اندروید (www داخل APK) در Chromium کاملاً آفلاین با پل شبیه‌سازی‌شده
//  - هر تصویر در manifest.json با محیط ثبت می‌شود
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:3000'
const TOKEN = process.env.AUDIT_TOKEN || ''
const OUT = '/home/z/my-project/download/screenshots-latest'
fs.mkdirSync(OUT + '/web', { recursive: true })
fs.mkdirSync(OUT + '/splash', { recursive: true })
fs.mkdirSync(OUT + '/themes', { recursive: true })
fs.mkdirSync(OUT + '/local', { recursive: true })

const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifest = {
  generated_utc: new Date().toISOString(),
  environment:
    'live dev server of this exact workspace (Next.js 16.4.2, localhost:3000), headless Chromium via Playwright 1.57',
  versions: { web_app_package_json: '1.1.0', android_shell_AppVersion_java: '2.1.0 (code 21)' },
  auth: 'session cookie minted by scripts/mint-audit-session.ts (owner in SETUP_REQUIRED state; no password touched)',
  captures: [],
}
const M = (file, kind, note) => manifest.captures.push({ file, kind, note: note || '' })

async function sessionCtx(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width || 393, height: opts.height || 851 },
    deviceScaleFactor: 2,
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    ...(opts.dark ? { colorScheme: 'dark' } : {}),
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  if (!TOKEN) throw new Error('AUDIT_TOKEN missing — run scripts/mint-audit-session.ts first')
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ ۱ — اسپلش واقعی شروع سرد (وب) ══
  {
    const frames = [80, 400, 900, 1200, 1500, 1750, 2100]
    let idx = 1
    for (const t of frames) {
      const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR' })
      const page = await ctx.newPage()
      await page.goto(BASE + '/', { waitUntil: 'commit' })
      await page.waitForTimeout(t)
      const f = 'splash-' + String(idx).padStart(2, '0') + '-t' + t + 'ms.png'
      await page.screenshot({ path: OUT + '/splash/' + f })
      M('splash/' + f, 'splash-frame', 'cold start (fresh session), ' + t + 'ms after commit — real web product splash')
      await ctx.close()
      idx++
    }
    console.log('splash frames done')
  }

  // ══ ۲ — صفحهٔ ورود ══
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const page = await ctx.newPage()
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(900)
    await page.screenshot({ path: OUT + '/web/01-login.png' })
    M('web/01-login.png', 'page', 'login page (mobile viewport)')
    await ctx.close()
    console.log('01-login')
  }

  // ══ ۳ — نمای‌های اصلی (موبایل، روشن) ══
  {
    const ctx = await sessionCtx(browser)
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2600)
    await page.screenshot({ path: OUT + '/web/02-today.png' })
    M('web/02-today.png', 'page', 'Today view — home cards, ambient background')
    const navs = [
      [/کارها/, '03-tasks.png', 'Tasks view'],
      [/تقویم/, '04-calendar.png', 'Calendar view'],
      [/دستیار/, '05-chat.png', 'Assistant (orb) view'],
      [/مالی/, '06-finance.png', 'Finance view'],
      [/تنظیمات/, '07-settings.png', 'Settings view'],
    ]
    for (const [label, file, note] of navs) {
      try {
        await page.getByRole('button', { name: label }).first().click()
        await page.waitForTimeout(2200)
        await page.addStyleTag({ content: HIDE_OVERLAY })
        await page.screenshot({ path: OUT + '/web/' + file })
        M('web/' + file, 'page', note)
        console.log(file)
      } catch (e) { console.log('NAV-FAIL', file, e.message.slice(0, 80)) }
    }
    await ctx.close()
    console.log('main views done')
  }

  // ══ ۴ — تم تاریک + دسکتاپ ══
  {
    const ctx = await sessionCtx(browser)
    const page = await ctx.newPage()
    await page.addInitScript(() => { try { localStorage.setItem('theme', 'dark') } catch (e) {} })
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2400)
    await page.screenshot({ path: OUT + '/themes/today-dark-mobile.png' })
    M('themes/today-dark-mobile.png', 'theme', 'Today view — dark theme, mobile')
    await ctx.close()
    const ctx2 = await sessionCtx(browser, { width: 1280, height: 800 })
    const page2 = await ctx2.newPage()
    await page2.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page2.addStyleTag({ content: HIDE_OVERLAY })
    await page2.waitForTimeout(2400)
    await page2.screenshot({ path: OUT + '/themes/today-light-desktop-1280x800.png' })
    M('themes/today-light-desktop-1280x800.png', 'theme', 'Today view — light, desktop 1280×800')
    await ctx2.close()
    console.log('theme shots done')
  }

  // ══ ۵ — رابط محلی آفلاین اندروید (www داخل APK) — Chromium آفلاین ══
  {
    const bridge = `
      (function () {
        var MEM = {};
        try { MEM = JSON.parse(localStorage.getItem('rahyar-local-mock') || '{}'); } catch (e) { MEM = {}; }
        window.RahyarNative = {
          meta: function () { return JSON.stringify({ versionName: '2.1.0', mode: 'local' }); },
          getDoc: function (k) { return MEM[k] || ''; },
          putDoc: function (k, v) {
            MEM[k] = v;
            try { localStorage.setItem('rahyar-local-mock', JSON.stringify(MEM)); } catch (e) {}
            return JSON.stringify({ ok: true });
          }
        };
      })();`
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', offline: true })
    const page = await ctx.newPage()
    await page.route('**/*', (route) => {
      const u = route.request().url()
      const www = '/home/z/my-project/android/src/www/'
      if (u.startsWith('https://appassets.androidplatform.net/assets/')) {
        const rel = u.replace('https://appassets.androidplatform.net/assets/', '')
        const fp = path.join(www, rel)
        if (fs.existsSync(fp)) {
          const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }
          return route.fulfill({ body: fs.readFileSync(fp, 'utf-8'), contentType: types[path.extname(fp)] || 'application/octet-stream' })
        }
      }
      return route.abort()
    })
    await page.addInitScript(bridge)
    await page.goto('https://appassets.androidplatform.net/assets/index.html', { waitUntil: 'load' })
    await page.waitForTimeout(1400)
    await page.screenshot({ path: OUT + '/local/01-local-home-offline.png' })
    M('local/01-local-home-offline.png', 'local-ui', 'Android local UI (www assets inside APK) — fully OFFLINE context; RahyarNative bridge mocked in-page (v2.1.0 local-first shell)')
    try {
      await page.getByRole('link', { name: /وظایف|Tasks/ }).first().click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: OUT + '/local/02-local-tasks-offline.png' })
      M('local/02-local-tasks-offline.png', 'local-ui', 'Local tasks page offline')
      await page.getByRole('link', { name: /تنظیمات|Settings/ }).first().click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: OUT + '/local/03-local-settings-offline.png' })
      M('local/03-local-settings-offline.png', 'local-ui', 'Local settings page offline — optional server entry')
    } catch (e) { console.log('LOCAL-NAV-FAIL', e.message.slice(0, 80)) }
    await ctx.close()
    console.log('local offline UI done')
  }

  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('ALL CAPTURES DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
