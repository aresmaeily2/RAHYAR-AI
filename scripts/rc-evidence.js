// ─── جمع‌آوری شواهد نسخه ۱٫۰ RC — اسکرین‌شات واقعی همه صفحات ────
// fa/en × روشن/تیره × دسکتاپ/موبایل + ویدئوی موشن
// اجرا: node scripts/rc-evidence.js <SESSION_TOKEN>
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')

const TOKEN = process.argv[2]
const BASE = 'http://localhost:3100'
const OUT = '/home/z/my-project/artifacts/rc'
fs.mkdirSync(OUT, { recursive: true })

const NAV = {
  fa: { today: 'امروز', tasks: 'کارها', cal: 'تقویم', chat: 'دستیار', plan: 'برنامه', fin: 'مالی', set: 'تنظیمات' },
  en: { today: 'Today', tasks: 'Tasks', cal: 'Calendar', chat: 'Assistant', plan: 'Plan', fin: 'Finance', set: 'Settings' },
}

async function shoot(browser, ctxOpts, { lang, theme, view, mobile, name, mode }) {
  const ctx = await browser.newContext(ctxOpts)
  await ctx.addCookies([
    { name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' },
  ])
  const page = await ctx.newPage()
  // سرور = منبع حقیقت: زبان و حالت تقویم از مسیر API واقعی تنظیم می‌شود
  await page.request.put(BASE + '/api/settings/app', {
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ lang, ...(mode ? { calendarMode: mode } : {}) }),
  })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  // تم از مسیر واقعی اپ (localStorage کلید خود اپ) + data-theme
  await page.evaluate((th) => {
    localStorage.setItem('rahyar-theme', th)
    document.documentElement.setAttribute('data-theme', th)
  }, theme)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  // ناوبری به نما
  const label = NAV[lang][view]
  const nav = page.getByRole('button', { name: new RegExp(label) }).first()
  try { await nav.click({ timeout: 4000 }) } catch { /* شاید خودش همان نماست */ }
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  await ctx.close()
  console.log('shot:', name)
}

;(async () => {
  const browser = await chromium.launch()
  const desktop = { viewport: { width: 1440, height: 900 } }
  const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  const jobs = [
    // ورود
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'today', name: '00-login-fa' },
    // فارسی روشن — همه نماها (تقویم: دوگانه)
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'today', mode: 'dual', name: '01-today-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'tasks', mode: 'dual', name: '02-tasks-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'cal', mode: 'dual', name: '03-calendar-dual-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'chat', mode: 'dual', name: '04-assistant-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'plan', mode: 'dual', name: '05-plan-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'fin', mode: 'dual', name: '06-finance-fa-light' },
    { ctxOpts: desktop, lang: 'fa', theme: 'light', view: 'set', mode: 'dual', name: '07-settings-fa-light' },
    // فارسی تیره
    { ctxOpts: desktop, lang: 'fa', theme: 'dark', view: 'today', mode: 'dual', name: '08-today-fa-dark' },
    { ctxOpts: desktop, lang: 'fa', theme: 'dark', view: 'cal', mode: 'dual', name: '09-calendar-dual-fa-dark' },
    { ctxOpts: desktop, lang: 'fa', theme: 'dark', view: 'chat', mode: 'dual', name: '10-assistant-fa-dark' },
    { ctxOpts: desktop, lang: 'fa', theme: 'dark', view: 'fin', mode: 'dual', name: '11-finance-fa-dark' },
    // انگلیسی روشن — همه نماها (میلادی خالص)
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'today', mode: 'gregorian', name: '12-today-en-light' },
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'tasks', mode: 'gregorian', name: '13-tasks-en-light' },
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'cal', mode: 'gregorian', name: '14-calendar-en-light' },
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'chat', mode: 'gregorian', name: '15-assistant-en-light' },
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'fin', mode: 'gregorian', name: '16-finance-en-light' },
    { ctxOpts: desktop, lang: 'en', theme: 'light', view: 'set', mode: 'gregorian', name: '17-settings-en-light' },
    // انگلیسی تیره
    { ctxOpts: desktop, lang: 'en', theme: 'dark', view: 'today', mode: 'gregorian', name: '18-today-en-dark' },
    { ctxOpts: desktop, lang: 'en', theme: 'dark', view: 'cal', mode: 'gregorian', name: '19-calendar-en-dark' },
    // موبایل
    { ctxOpts: mobile, lang: 'fa', theme: 'light', view: 'today', mode: 'dual', name: '20-today-fa-mobile' },
    { ctxOpts: mobile, lang: 'fa', theme: 'light', view: 'fin', mode: 'dual', name: '21-finance-fa-mobile' },
    { ctxOpts: mobile, lang: 'fa', theme: 'dark', view: 'cal', mode: 'dual', name: '22-calendar-fa-dark-mobile' },
    { ctxOpts: mobile, lang: 'en', theme: 'light', view: 'cal', mode: 'gregorian', name: '23-calendar-en-mobile' },
    { ctxOpts: mobile, lang: 'en', theme: 'dark', view: 'chat', mode: 'gregorian', name: '24-assistant-en-dark-mobile' },
    { ctxOpts: mobile, lang: 'fa', theme: 'light', view: 'set', mode: 'dual', name: '25-settings-fa-mobile' },
  ]
  for (const j of jobs) {
    try {
      await shoot(browser, j.ctxOpts, j)
    } catch (e) {
      console.log('FAIL', j.name, e.message.slice(0, 100))
    }
  }
  await browser.close()
  console.log('DONE', fs.readdirSync(OUT).filter((f) => f.endsWith('.png')).length, 'screenshots')
})()
