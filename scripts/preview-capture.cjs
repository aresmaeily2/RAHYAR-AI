// ─── ضبط پیش‌نمایش رهیار: اسکرین‌شات + ویدیو تور (نسخه ۲) ────
// اجرا: node scripts/preview-capture.cjs            (همه بخش‌ها)
//       MODE=fix  node scripts/preview-capture.cjs  (فقط شات‌های ناقص)
//       MODE=video node scripts/preview-capture.cjs (فقط ویدیو)
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const MODE = process.env.MODE || 'all'
const BASE = 'http://localhost:3000'
const TOKEN = fs.readFileSync('/home/z/my-project/artifacts/preview/session-token.txt', 'utf-8').trim()
const SHOTS = '/home/z/my-project/download/screenshots'
const VID_DIR = '/home/z/my-project/artifacts/preview/video'
fs.mkdirSync(SHOTS, { recursive: true })
fs.mkdirSync(VID_DIR, { recursive: true })

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name) })
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const cookie = { name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }

async function nav(page, label, ms = 2200) {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(ms)
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ بخش ۱ — اسکرین‌شات‌های دسکتاپ (فقط در MODE=all) ═════════
  if (MODE === 'all') {
    const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fa-IR' })
    const lp = await loginCtx.newPage()
    await lp.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await lp.addStyleTag({ content: HIDE_OVERLAY })
    await lp.waitForTimeout(3000)
    await shot(lp, '01-login.png')
    await loginCtx.close()
    console.log('shot 01-login')

    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
    })
    await ctx.addCookies([cookie])
    const page = await ctx.newPage()

    await page.goto(BASE + '/?v=' + Date.now(), { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(3500)
    await shot(page, '02-today.png')
    console.log('shot 02-today')

    await nav(page, /کارها/, 3000)
    await shot(page, '03-tasks.png')
    console.log('shot 03-tasks')

    await nav(page, /تقویم/, 3000)
    await shot(page, '05-calendar.png')
    console.log('shot 05-calendar')

    await nav(page, /دستیار/, 2800)
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(900)
    await page.mouse.wheel(0, -600)
    await page.waitForTimeout(600)
    await shot(page, '06-chat.png')
    console.log('shot 06-chat')

    await nav(page, /برنامه/, 2800)
    await shot(page, '07-plan.png')
    console.log('shot 07-plan')

    await nav(page, /مالی/, 3000)
    await shot(page, '08-finance.png')
    await page.mouse.wheel(0, 700)
    await page.waitForTimeout(900)
    await shot(page, '09-finance-budget.png')
    await page.mouse.wheel(0, -700)
    console.log('shot 08-09-finance')

    await nav(page, /تنظیمات/, 2800)
    await shot(page, '10-settings.png')
    console.log('shot 10-settings')

    await page.keyboard.press('/')
    await page.waitForTimeout(1100)
    await shot(page, '12-command-palette.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    console.log('shot 12-palette')

    await nav(page, /امروز/, 2200)
    await page.keyboard.press('d')
    await page.waitForTimeout(2200)
    await shot(page, '13-today-dark.png')
    await page.keyboard.press('d')
    await page.waitForTimeout(1200)
    console.log('shot 13-today-dark')

    await ctx.close()
  }

  // ══ بخش ۲ — شات‌های تکمیلی: افزودن سریع + ظاهر + موبایل ════
  if (MODE === 'all' || MODE === 'fix') {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
    })
    await ctx.addCookies([cookie])
    const page = await ctx.newPage()
    await page.goto(BASE + '/?f=' + Date.now(), { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: HIDE_OVERLAY })
    await page.waitForTimeout(3000)

    // افزودن سریع در نمای تقویم — ابتدا انتخاب روز
    await nav(page, /تقویم/, 2600)
    try {
      await page.getByRole('button', { name: /^روز/ }).first().click()
      await page.waitForTimeout(1300)
      const qa = page.getByPlaceholder(/کار جدید برای این روز/).first()
      await qa.click()
      await qa.fill('تماس با بانک فردا ساعت ۱۰')
      await page.waitForTimeout(700)
      await shot(page, '04-quick-add.png')
      await qa.press('Enter')
      await page.waitForTimeout(1500)
      console.log('shot 04-quick-add (+task created)')
    } catch (e) { console.log('quick-add skipped:', e.message.split('\n')[0]) }

    // جزئیات کار — انتخاب روز امروز (۲۷ مهر) سپس کلیک روی عنوان کار
    try {
      const todayCell = page.getByRole('button', { name: /^روز ۲۷/ })
      if (await todayCell.count()) {
        await todayCell.first().click()
        await page.waitForTimeout(1300)
      }
      await page.getByRole('button', { name: /بازبینی گزارش فروش هفته/ }).first().click()
      await page.waitForTimeout(1500)
      await shot(page, '17-task-detail.png')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(700)
      console.log('shot 17-task-detail')
    } catch (e) { console.log('task-detail skipped:', e.message.split('\n')[0]) }

    // بخش ظاهر در تنظیمات — اسکرول به پایین
    await nav(page, /تنظیمات/, 2600)
    try {
      await page.getByText(/ظاهر|تم و ظاهر|پوسته/).first().scrollIntoViewIfNeeded()
      await page.waitForTimeout(800)
      await shot(page, '11-settings-appearance.png')
      console.log('shot 11-appearance')
    } catch (e) {
      await page.mouse.wheel(0, 800)
      await page.waitForTimeout(900)
      await shot(page, '11-settings-appearance.png')
      console.log('shot 11-appearance (fallback scroll)')
    }
    await ctx.close()

    // موبایل
    const mctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
      isMobile: true,
      hasTouch: true,
    })
    await mctx.addCookies([cookie])
    const mp = await mctx.newPage()
    await mp.goto(BASE + '/?m=' + Date.now(), { waitUntil: 'networkidle' })
    await mp.addStyleTag({ content: HIDE_OVERLAY })
    await mp.waitForTimeout(3200)
    await shot(mp, '14-mobile-today.png')
    await mp.getByRole('button', { name: /دستیار/ }).first().click({ force: true })
    await mp.waitForTimeout(2400)
    await shot(mp, '15-mobile-chat.png')
    await mp.getByRole('button', { name: /مالی/ }).first().click({ force: true })
    await mp.waitForTimeout(2600)
    await shot(mp, '16-mobile-finance.png')
    await mctx.close()
    console.log('shots 14-16 mobile')
  }

  // ══ بخش ۳ — ویدیو تور (ورود واقعی + گشت‌وگذار) ═════════════
  if (MODE === 'all' || MODE === 'video') {
    const vctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      locale: 'fa-IR',
      timezoneId: 'Asia/Tehran',
      recordVideo: { dir: VID_DIR, size: { width: 1440, height: 900 } },
    })
    const vp = await vctx.newPage()

    await vp.goto(BASE + '/login?t=' + Date.now(), { waitUntil: 'networkidle' })
    await vp.addStyleTag({ content: HIDE_OVERLAY })
    await vp.waitForTimeout(2600)
    await vp.fill('#password', 'Rahyar@1404')
    await vp.waitForTimeout(500)
    await vp.getByRole('button', { name: /ورود/ }).first().click()
    await vp.waitForTimeout(6000)
    try { await vp.addStyleTag({ content: HIDE_OVERLAY }) } catch {}
    await vp.waitForTimeout(1500)

    // امروز — اسکرول آرام
    await vp.mouse.wheel(0, 420)
    await vp.waitForTimeout(1600)
    await vp.mouse.wheel(0, -420)
    await vp.waitForTimeout(1400)

    await nav(vp, /کارها/, 2400)
    await nav(vp, /تقویم/, 2400)

    // افزودن کار با ورودی زبان طبیعی
    try {
      const qa = vp.getByPlaceholder(/کار جدید برای این روز/).first()
      await qa.click()
      await qa.type('تماس با بانک فردا ساعت ۱۰', { delay: 55 })
      await vp.waitForTimeout(600)
      await qa.press('Enter')
      await vp.waitForTimeout(2000)
    } catch { console.log('video quick-add skipped') }

    await nav(vp, /برنامه/, 2600)

    // دستیار — پیام زنده با پاسخ استریم
    await nav(vp, /دستیار/, 2200)
    try {
      const ci = vp.getByPlaceholder(/با رهیار حرف بزن/).first()
      await ci.click()
      await ci.type('سلام رهیار! یه توصیه کوتاه برای بهره‌وری امروز بده', { delay: 40 })
      await vp.waitForTimeout(500)
      await ci.press('Enter')
      await vp.waitForTimeout(22000)
    } catch { console.log('video chat skipped') }

    await nav(vp, /مالی/, 2600)
    await vp.mouse.wheel(0, 520)
    await vp.waitForTimeout(1800)
    await vp.mouse.wheel(0, -520)
    await vp.waitForTimeout(1200)

    await nav(vp, /تنظیمات/, 2400)

    await vp.keyboard.press('/')
    await vp.waitForTimeout(1600)
    await vp.keyboard.press('Escape')
    await vp.waitForTimeout(1000)

    await vp.keyboard.press('d')
    await vp.waitForTimeout(2400)
    await vp.keyboard.press('d')
    await vp.waitForTimeout(2200)

    // تغییر تم زنده از بخش ظاهر
    try {
      await vp.getByRole('radio', { name: /تم شفق/ }).first().click()
      await vp.waitForTimeout(2000)
      const back = vp.getByRole('radio', { name: /تم مه|تم روشن|تم پیش‌فرض/ })
      if (await back.count()) { await back.first().click(); await vp.waitForTimeout(1500) }
    } catch { console.log('video appearance skipped') }

    await nav(vp, /امروز/, 2600)
    await vp.waitForTimeout(1500)

    await vctx.close()
    console.log('VIDEO_DONE')
  }

  await browser.close()
  console.log('CAPTURE_DONE')
})().catch((e) => {
  console.error('CAPTURE_FAIL', e)
  process.exit(1)
})
