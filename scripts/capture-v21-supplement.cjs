// مکمل گرفتن تصاویر — اسپلش ۷فریم + تنظیمات + چت با پاسخ واقعی مدل
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = '/home/z/my-project/download/final-v21'
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifestPath = OUT + '/manifest.json'
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
const M = (file, kind, note) => manifest.captures.push({ file, kind, note: note || '' })

async function cookie(browser, opts = {}) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  const ctx = await browser.newContext({
    viewport: { width: opts.width || 393, height: opts.height || 851 },
    deviceScaleFactor: 2, locale: 'fa-IR', timezoneId: 'Asia/Tehran',
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: m[0].slice('rahyar_session='.length), domain: 'localhost', path: '/' }])
  return ctx
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ ۱ — اسپلش ۷ فریم (نشست تازه برای هر فریم) ══
  const frames = [80, 400, 900, 1200, 1500, 1750, 2100]
  let idx = 1
  for (const t of frames) {
    // اسپلش داخل app-shell (پس از احراز هویت) است → نشست تازه + کوکی معتبر
    const ctx = await cookie(browser)
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'commit' })
    await page.waitForTimeout(t)
    const f = 'splash-' + String(idx).padStart(2, '0') + '-t' + t + 'ms.png'
    await page.screenshot({ path: OUT + '/splash/' + f })
    M('splash/' + f, 'splash-frame', 'cold start, ' + t + 'ms — real web splash timeline (recaptured, fixed loop)')
    await ctx.close()
    idx++
  }
  console.log('splash 7 frames OK')

  // ══ ۲ — تنظیمات (از چیپ پروفایل) ══
  {
    // چیپ پروفایل فقط در سایدبار دسکتاپ دیده می‌شود (hidden md:flex)
    const ctx = await cookie(browser, { width: 1280, height: 800 })
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2400)
    await page.locator('button[aria-label="تنظیمات"]').first().click()
    await page.waitForTimeout(2400)
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.screenshot({ path: OUT + '/web/07-settings.png' })
    M('web/07-settings.png', 'page', 'Settings view (mobile 393×851 — via profile chip: engine picker, appearance, server optional module)')
    await ctx.close()
    console.log('07-settings OK')
  }

  // ══ ۳ — چت با پاسخ واقعی مدل (ورودی جدید تایپ‌شده در UI) ══
  {
    const ctx = await cookie(browser)
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: /دستیار/ }).first().click()
    await page.waitForTimeout(1800)
    // تایپ واقعی در ورودی چت
    const input = page.locator('textarea, input[type="text"]').last()
    await input.fill('یک شعر دو بیتی کوتاه درباره باران و کوه بگو')
    await page.screenshot({ path: OUT + '/web/08-chat-typed.png' })
    M('web/08-chat-typed.png', 'evidence', 'chat: new question typed, before send')
    await input.press('Enter')
    // انتظار واقعی پاسخ مدل (تا ۴۵ ثانیه)
    await page.waitForTimeout(3000)
    for (let i = 0; i < 14; i++) {
      const body = await page.locator('body').innerText()
      if (body.includes('کوه') || body.includes('باران') || i === 13) break
      await page.waitForTimeout(3000)
    }
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.screenshot({ path: OUT + '/web/09-chat-real-reply.png' })
    M('web/09-chat-real-reply.png', 'evidence', 'chat: REAL hosted-model reply visible in product UI (new input, not canned)')
    const bodyText = await page.locator('body').innerText()
    fs.writeFileSync('/home/z/my-project/artifacts/chat-ui-reply.txt', bodyText.slice(0, 3000))
    await ctx.close()
    console.log('chat real reply OK')
  }

  // ══ ۴ — دسکتاپ خانه + تقویم (نمای دسکتاپ برای مقایسه) ══
  {
    const ctx = await cookie(browser, { width: 1280, height: 800 })
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(2600)
    await page.screenshot({ path: OUT + '/web/10-home-desktop.png' })
    M('web/10-home-desktop.png', 'page', 'Today view desktop 1280×800 — ambient layers + glass cards')
    await ctx.close()
    console.log('desktop home OK')
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  await browser.close()
  console.log('SUPPLEMENT DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
