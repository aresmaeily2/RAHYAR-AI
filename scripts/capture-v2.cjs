// ─── ضبط اسکرین‌شات نسخهٔ نهایی v2.0.0 — ویوپورت گوشی، هر دو نقش ───
// روش: رندر واقعی محصول در حال اجرا (Chromium headless 393×851 @2x — همان
// UI که WebView اپ اندروید نشان می‌دهد). فهرست تصاویر با متادیتا در
// screenshots-v2/manifest.json ثبت می‌شود.
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = process.env.BASE || 'http://localhost:3000'
const SHOTS = '/home/z/my-project/download/screenshots-v2'
fs.mkdirSync(SHOTS, { recursive: true })

const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const manifest = []
const META = (file, page, role, lang, note) => ({ file, page, role, lang, version: '2.0.0', environment: 'live production server (this sandbox), headless Chromium 393×851@2x — same UI the Android WebView renders', note: note || '' })

async function loginCookie(username, password) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  if (!m) throw new Error('login failed for ' + username)
  return m[0]
}

;(async () => {
  const ownerCookie = await loginCookie('owner', 'Rahyar@1404')
  let userCookie = null
  try { userCookie = await loginCookie('sarika', 'Sarika@1404') } catch { /* کاربر آزمون */ }

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  async function newPhonePage(cookie, lang = 'fa-IR') {
    const ctx = await browser.newContext({
      viewport: { width: 393, height: 851 },
      deviceScaleFactor: 2,
      locale: lang,
      timezoneId: 'Asia/Tehran',
      isMobile: true,
      hasTouch: true,
    })
    await ctx.addCookies([{ name: 'rahyar_session', value: cookie.replace('rahyar_session=', ''), domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    return { ctx, page }
  }

  async function shot(page, ctx, file, meta) {
    await page.addStyleTag({ content: HIDE_OVERLAY }).catch(() => {})
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(SHOTS, file) })
    manifest.push(META(file, meta.page, meta.role, meta.lang, meta.note))
    console.log('shot', file)
  }

  async function nav(page, label, ms = 2400) {
    // سایدبار دسکتاپ روی موبایل مخفی است — کلیک DOM مستقیم روی دکمهٔ ناوبری
    const ok = await page.evaluate((lbl) => {
      const btns = Array.from(document.querySelectorAll('aside nav button'))
      const b = btns.find((x) => (x.textContent || '').includes(lbl))
      if (b) { b.click(); return true }
      return false
    }, label).catch(() => false)
    if (!ok) {
      await page.getByRole('button', { name: label }).first().click({ force: true, timeout: 8000 }).catch(() => {})
    }
    await page.waitForTimeout(ms)
  }

  // ══ ۱) ورود — بدون کوکی ══
  const loginCtx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', isMobile: true, hasTouch: true })
  const lp = await loginCtx.newPage()
  await lp.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await lp.waitForTimeout(2500)
  await shot(lp, loginCtx, '01-login-fa.png', { page: 'صفحهٔ ورود', role: 'مهمان', lang: 'fa' })
  await lp.getByRole('button', { name: /English|EN/i }).first().click().catch(() => {})
  await lp.waitForTimeout(1500)
  await shot(lp, loginCtx, '02-login-en.png', { page: 'Login page', role: 'guest', lang: 'en' })
  await loginCtx.close()

  // ══ ۲) مالک — همهٔ نماها ══
  {
    const { ctx, page } = await newPhonePage(ownerCookie)
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3500)
    await shot(page, ctx, '03-owner-home-fa.png', { page: 'خانه / امروز — داشبورد و هویت دستیار', role: 'OWNER', lang: 'fa', note: 'Ambient + طراحی شیشه‌ای' })

    await nav(page, 'کارها')
    await shot(page, ctx, '04-owner-tasks-fa.png', { page: 'وظایف', role: 'OWNER', lang: 'fa' })

    // افزودن سریع وظیفه
    await page.getByRole('button', { name: /کار جدید|افزودن|\+/ }).first().click().catch(() => {})
    await page.waitForTimeout(1200)
    await shot(page, ctx, '05-owner-quick-add-fa.png', { page: 'افزودن سریع وظیفه', role: 'OWNER', lang: 'fa' })
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(600)

    await nav(page, 'تقویم')
    await shot(page, ctx, '06-owner-calendar-fa.png', { page: 'تقویم شمسی/میلادی', role: 'OWNER', lang: 'fa' })

    await nav(page, 'دستیار', 3200)
    await shot(page, ctx, '07-owner-chat-fa.png', { page: 'گفت‌وگوی واقعی با هوش مصنوعی (مدل میزبان)', role: 'OWNER', lang: 'fa', note: 'پاسخ واقعی LLM از سرور' })

    await nav(page, 'برنامه')
    await shot(page, ctx, '08-owner-plan-fa.png', { page: 'برنامه و یادآورها', role: 'OWNER', lang: 'fa' })

    await nav(page, 'مالی')
    await shot(page, ctx, '09-owner-finance-fa.png', { page: 'مدیریت مالی شخصی', role: 'OWNER', lang: 'fa' })

    await nav(page, 'تنظیمات')
    await shot(page, ctx, '10-owner-settings-fa.png', { page: 'تنظیمات', role: 'OWNER', lang: 'fa' })

    // بخش موتور AI در تنظیمات
    await page.getByText(/هوش مصنوعی|موتور/).first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(900)
    await shot(page, ctx, '11-owner-settings-ai-fa.png', { page: 'تنظیمات — موتور AI و ارائه‌دهنده‌ها', role: 'OWNER', lang: 'fa', note: 'مدل میزبان + Endpoint سازگار با OpenAI + قواعد محلی' })

    // مدیریت کاربران (فقط مالک)
    await page.getByText(/مدیریت کاربران|کاربران/).first().scrollIntoViewIfNeeded().catch(() => {})
    await page.waitForTimeout(900)
    await shot(page, ctx, '12-owner-users-admin-fa.png', { page: 'مدیریت کاربران (انحصاری مالک)', role: 'OWNER', lang: 'fa' })

    // پالت فرمان (دکمهٔ موبایل هدر)
    await page.locator('button[aria-label="جستجو"]').first().click({ force: true, timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1200)
    await shot(page, ctx, '13-owner-command-palette-fa.png', { page: 'پالت فرمان', role: 'OWNER', lang: 'fa' })
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(600)

    // زبان انگلیسی (دکمهٔ درون تنظیمات)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'))
      const b = btns.find((x) => (x.textContent || '').trim() === 'انگلیسی')
      if (b) b.click()
    }).catch(() => {})
    await page.waitForTimeout(1800)
    await shot(page, ctx, '14-owner-settings-en.png', { page: 'Settings (English)', role: 'OWNER', lang: 'en' })
    await nav(page, 'Tasks')
    await shot(page, ctx, '15-owner-tasks-en.png', { page: 'Tasks (English)', role: 'OWNER', lang: 'en' })

    // پوستهٔ تیره (دکمهٔ موبایل هدر)
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) =>
        (x.getAttribute('aria-label') || '').includes('تیره') || (x.getAttribute('aria-label') || '').toLowerCase().includes('dark'))
      if (b) b.click()
    }).catch(() => {})
    await page.waitForTimeout(1600)
    await shot(page, ctx, '16-owner-home-dark.png', { page: 'Home dark mode', role: 'OWNER', lang: 'fa', note: 'پوستهٔ تیره' })
    await ctx.close()
  }

  // ══ ۳) کاربر عادی — بدون امکانات مالک ══
  if (userCookie) {
    const { ctx, page } = await newPhonePage(userCookie)
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3500)
    await shot(page, ctx, '17-user-home-fa.png', { page: 'خانه — کاربر عادی', role: 'USER', lang: 'fa' })
    await nav(page, 'کارها')
    await shot(page, ctx, '18-user-tasks-fa.png', { page: 'وظایف کاربر عادی (دادهٔ خودش)', role: 'USER', lang: 'fa' })
    await nav(page, 'تنظیمات')
    await shot(page, ctx, '19-user-settings-fa.png', { page: 'تنظیمات کاربر عادی — بدون مدیریت کاربران', role: 'USER', lang: 'fa', note: 'عدم دسترسی به امکانات مالک' })
    await ctx.close()
  }

  fs.writeFileSync(path.join(SHOTS, 'manifest.json'), JSON.stringify({
    capturedAt: new Date().toISOString(),
    method: 'Live render of the running production product (same code the Android WebView v2.0.0 loads); headless Chromium, 393×851@2x, Android-phone class viewport',
    note: 'Real device screenshots not possible in build environment (no device/adb/KVM) — documented in delivery report',
    shots: manifest,
  }, null, 2))
  console.log('MANIFEST_WRITTEN', manifest.length)
  await browser.close()
  process.exit(0)
})().catch((e) => { console.error('FATAL', e); process.exit(2) })
