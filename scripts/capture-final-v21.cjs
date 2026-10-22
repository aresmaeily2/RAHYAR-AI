// ─── ضبط نهایی مأموریت v2.1 — استقلال از سرور + هویت بصری ─────────
// همهٔ تصاویر/ویدیوها از اجرای واقعی محصول (سرور production همین پروژه) است.
// خروجی: /home/z/my-project/download/final-v21/
//   web/       — محصول وب (همان UI که WebView اندروید نشان می‌دهد)
//   splash/    — فریم‌های اسپلش واقعی شروع سرد
//   themes/    — تم‌ها روشن/تاریک
//   local/     — رابط محلی آفلاین اندروید (www داخل APK) در Chromium آفلاین
//   video/     — ویدیوی تعامل واقعی
// روش‌شناسی صادقانه: محیط هر مجموعه در manifest.json ثبت می‌شود.
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = process.env.BASE || 'http://localhost:3000'
const OUT = '/home/z/my-project/download/final-v21'
fs.mkdirSync(OUT + '/web', { recursive: true })
fs.mkdirSync(OUT + '/splash', { recursive: true })
fs.mkdirSync(OUT + '/themes', { recursive: true })
fs.mkdirSync(OUT + '/local', { recursive: true })
fs.mkdirSync(OUT + '/video', { recursive: true })

const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifest = { environment: 'production build of this repo running at ' + BASE + ' (Next.js standalone), headless Chromium', captures: [] }
const M = (file, kind, note) => { manifest.captures.push({ file, kind, note: note || '' }) }

async function ownerCtx(browser, opts = {}) {
  // ورود واقعی از مسیر API (همان مسیر اپ اندروید) — رمز از فایل خصوصی artifacts
  const pw = fs.readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: pw }),
  })
  if (!r.ok) throw new Error('owner login failed: ' + r.status)
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  const ctx = await browser.newContext({
    viewport: { width: opts.width || 393, height: opts.height || 851 },
    deviceScaleFactor: 2,
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    recordVideo: opts.video ? { dir: OUT + '/video', size: { width: 393, height: 851 } } : undefined,
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ ۱ — اسپلش واقعی شروع سرد (وب) ══
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const page = await ctx.newPage()
    // شروع سرد = بدون sessionStorage — اسپلش نمایش داده می‌شود
    const frames = [80, 400, 900, 1200, 1500, 1750, 2100]
    let idx = 1
    for (const t of frames) {
      await page.goto(BASE + '/', { waitUntil: 'commit' })
      await page.waitForTimeout(t)
      const f = 'splash-' + String(idx).padStart(2, '0') + '-t' + t + 'ms.png'
      await page.screenshot({ path: OUT + '/splash/' + f })
      M('splash/' + f, 'splash-frame', 'cold start, ' + t + 'ms after commit — real web product splash')
      idx++
      if (idx > frames.length) break
      // اسپلش فقط یک‌بار در نشست — برای فریم بعدی نشست تازه
      if (idx <= frames.length) { await ctx.close(); break }
    }
    await ctx.close()
    console.log('splash frames done')
  }

  // ══ ۲ — صفحهٔ ورود + ورود واقعی (مسیر اختیاری سرور در اندروید هم همین است) ══
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const page = await ctx.newPage()
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(900)
    await page.screenshot({ path: OUT + '/web/01-login.png' })
    M('web/01-login.png', 'page', 'login/optional-server page (mobile viewport)')
    await ctx.close()
    console.log('01-login')
  }

  // ══ ۳ — نمای‌های اصلی محصول (موبایل، روشن) — همان UI WebView ══
  {
    const ctx = await ownerCtx(browser, { video: true })
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
    // ویدیوی تعامل واقعی — همین نشست ضبط می‌شود
    const v = await page.video()
    if (v) { await page.waitForTimeout(600); const vp = await v.path(); if (vp) fs.renameSync(vp, OUT + '/video/interaction-owner-mobile.webm'); M('video/interaction-owner-mobile.webm', 'video', 'real interaction: nav through views, mobile') }
    await ctx.close()
    console.log('main views + video')
  }

  // ══ ۴ — تم‌ها (دسکتاپ، روشن/تاریک) ══
  const THEMES = ['ocean', 'forest', 'aurora', 'sunset', 'night', 'minimal', 'sakura', 'autumn', 'rain']
  for (const th of THEMES) {
    for (const dark of [false, true]) {
      const ctx = await ownerCtx(browser, { width: 1280, height: 800 })
      const page = await ctx.newPage()
      await page.addInitScript(([t, d]) => {
        try { localStorage.setItem('rahyar-theme', t); localStorage.setItem('theme', d ? 'dark' : 'light') } catch (e) {}
      }, [th, dark])
      await page.goto(BASE + '/', { waitUntil: 'networkidle' })
      await page.addStyleTag({ content: HIDE_OVERLAY })
      await page.waitForTimeout(2400)
      const f = 'theme-' + th + (dark ? '-dark' : '-light') + '.png'
      await page.screenshot({ path: OUT + '/themes/' + f })
      M('themes/' + f, 'theme', 'theme=' + th + ' ' + (dark ? 'dark' : 'light') + ' desktop 1280×800')
      await ctx.close()
    }
    console.log('theme', th)
  }

  // ══ ۵ — رابط محلی آفلاین اندروید (www داخل APK) — Chromium آفلاین ══
  {
    // mock پل RahyarNative همان‌گونه که LocalStore اندروید رفتار می‌کند
    // (داده فقط در همین صفحه می‌ماند — بازسازی رفتار LocalStore با localStorage)
    const bridge = `
      (function () {
        var MEM = {};
        try { MEM = JSON.parse(localStorage.getItem('rahyar-local-mock') || '{}'); } catch (e) { MEM = {}; }
        window.RahyarNative = {
          meta: function () { return JSON.stringify({ versionName: '2.0.0', mode: 'local' }); },
          getDoc: function (k) { return MEM[k] || ''; },
          putDoc: function (k, v) {
            MEM[k] = v;
            try { localStorage.setItem('rahyar-local-mock', JSON.stringify(MEM)); } catch (e) {}
            return JSON.stringify({ ok: true });
          }
        };
      })();`
    const ctx = await browser.newContext({
      viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', offline: true,
    })
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
    M('local/01-local-home-offline.png', 'local-ui', 'Android local UI (www assets inside APK) — browser context fully OFFLINE, network aborted; RahyarNative bridge mocked in-page')
    // افزودن یک وظیفهٔ واقعی در رابط محلی و ثبت پس از آن
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
    console.log('local offline UI')
  }

  fs.writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('ALL CAPTURES DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
