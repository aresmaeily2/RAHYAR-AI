// ─── ضبط اسکرین‌شات مأموریت موشن‌گرافیک و پس‌زمینه طبیعت ─────────
// اجرا: node scripts/capture-motion-mission.cjs
// خروجی: /home/z/my-project/download/motion-mission-screenshots/
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = 'http://localhost:3000'
const TOKEN = fs.readFileSync('/home/z/my-project/artifacts/preview/session-token.txt', 'utf-8').trim()
const SHOTS = '/home/z/my-project/download/motion-mission-screenshots'
fs.mkdirSync(SHOTS, { recursive: true })

const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name) })
const HIDE_OVERLAY = 'nextjs-portal{display:none!important}'
const cookie = { name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }

const THEMES = ['ocean', 'forest', 'aurora', 'sunset', 'night', 'minimal', 'sakura', 'autumn', 'rain']

async function newPage(browser, { width = 1440, height = 900, dark = false, theme = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
  })
  await ctx.addCookies([cookie])
  const page = await ctx.newPage()
  await page.addInitScript(([isDark, themeV]) => {
    try {
      window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
      if (themeV) window.localStorage.setItem('rahyar-theme', themeV)
    } catch (e) {}
  }, [dark === true, theme])
  await page.goto(BASE + '/?t=' + Date.now(), { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE_OVERLAY })
  await page.waitForTimeout(3200)
  return { ctx, page }
}

async function nav(page, label, ms = 2800) {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(ms)
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // ══ ۱ — ورود ══
  {
    const { ctx, page } = await newPage(browser)
    await shot(page, '01-login.png')
    await ctx.close()
    console.log('01-login')
  }

  // ══ ۲ — نمای‌های اصلی (روشن) ══
  {
    const { ctx, page } = await newPage(browser)
    await shot(page, '02-today.png'); console.log('02-today')
    await nav(page, /کارها/); await shot(page, '03-tasks.png'); console.log('03-tasks')
    await nav(page, /تقویم/); await shot(page, '04-calendar.png'); console.log('04-calendar')
    await nav(page, /دستیار/); await shot(page, '05-chat.png'); console.log('05-chat')
    await nav(page, /برنامه/); await shot(page, '06-plan.png'); console.log('06-plan')

    await nav(page, /مالی/, 3200)
    await shot(page, '07-finance.png'); console.log('07-finance')
    // پنل تراکنش جدید — انیمیشن Collapse جدید
    await page.getByRole('button', { name: /تراکنش جدید/ }).first().click()
    await page.waitForTimeout(900)
    await shot(page, '08-finance-addtx-open.png'); console.log('08-finance-addtx')
    await page.getByRole('button', { name: /انصراف|بستن/ }).first().click().catch(() => {})

    await nav(page, /تنظیمات/, 3200)
    await shot(page, '09-settings.png'); console.log('09-settings')
    await page.mouse.wheel(0, 900); await page.waitForTimeout(1100)
    await shot(page, '10-settings-scrolled.png'); console.log('10-settings-scrolled')
    await page.mouse.wheel(0, -900)
    await ctx.close()
  }

  // ══ ۳ — تیره ══
  {
    const { ctx, page } = await newPage(browser, { dark: true })
    await shot(page, '20-today-dark.png'); console.log('20-today-dark')
    await nav(page, /مالی/, 3200); await shot(page, '21-finance-dark.png'); console.log('21-finance-dark')
    await nav(page, /دستیار/); await shot(page, '22-chat-dark.png'); console.log('22-chat-dark')
    await nav(page, /تنظیمات/, 3200); await shot(page, '23-settings-dark.png'); console.log('23-settings-dark')
    await ctx.close()
  }

  // ══ ۴ — تور تم‌ها: ۹ تم × روشن/تیره (نمای امروز) ══
  for (const theme of THEMES) {
    const a = await newPage(browser, { theme })
    await shot(a.page, `theme-${theme}-light.png`)
    await a.ctx.close()
    const b = await newPage(browser, { theme, dark: true })
    await shot(b.page, `theme-${theme}-dark.png`)
    await b.ctx.close()
    console.log(`theme-${theme}: light+dark`)
  }

  // ══ ۵ — موبایل ══
  {
    const { ctx, page } = await newPage(browser, { width: 390, height: 844 })
    await shot(page, '30-today-mobile.png'); console.log('30-today-mobile')
    await nav(page, /مالی/, 3200); await shot(page, '31-finance-mobile.png'); console.log('31-finance-mobile')
    await ctx.close()
  }

  await browser.close()
  const files = fs.readdirSync(SHOTS)
  console.log(`DONE — ${files.length} screenshots in ${SHOTS}`)
})().catch((e) => { console.error(e); process.exit(1) })
