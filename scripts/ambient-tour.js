// ─── تور تصویری لایه محیطی — ۹ تم × ۲ مود + حالت‌های Orb ────────
// اجرا: node scripts/ambient-tour.js <TOKEN>
// خروجی: artifacts/ambient/shots/*.png (رندر واقعی production:3100)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const TOKEN = process.argv[2]
const BASE = 'http://localhost:3100'
const OUT = '/home/z/my-project/artifacts/ambient/shots'
const THEMES = ['ocean', 'forest', 'aurora', 'sunset', 'night', 'minimal', 'sakura', 'autumn', 'rain']

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()

  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)

  for (const theme of THEMES) {
    for (const mode of ['light', 'dark']) {
      await page.evaluate(([t, m]) => {
        localStorage.setItem('rahyar-theme', t)
        localStorage.setItem('theme', m === 'dark' ? 'dark' : 'light')
      }, [theme, mode])
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(1400)
      await page.screenshot({ path: `${OUT}/theme-${theme}-${mode}.png` })
      console.log('shot', theme, mode)
    }
  }

  // حالت‌های Orb — رندر واقعی کامپوننت با کلاس‌های حالت (کاتالوگ بصری)
  await page.evaluate(() => {
    localStorage.setItem('rahyar-theme', 'ocean')
    localStorage.setItem('theme', 'light')
  })
  await page.reload({ waitUntil: 'networkidle' })
  // رفتن به دستیار
  await page.getByRole('button', { name: /دستیار/ }).first().click()
  await page.waitForTimeout(1600)
  // اورب هدر و حالت خالی بزرگ هر دو .ara-orb دارند
  const STATES = ['idle', 'listening', 'thinking', 'streaming', 'speaking']
  for (const st of STATES) {
    await page.evaluate((state) => {
      document.querySelectorAll('.ara-orb').forEach((el) => {
        el.classList.remove('ara-orb--idle', 'ara-orb--listening', 'ara-orb--thinking', 'ara-orb--streaming', 'ara-orb--speaking')
        el.classList.add(`ara-orb--${state}`)
        el.setAttribute('data-state', state)
      })
    }, st)
    await page.waitForTimeout(650)
    await page.screenshot({ path: `${OUT}/orb-${st}.png`, clip: { x: 830, y: 0, width: 610, height: 360 } })
    console.log('orb', st)
  }

  // خاموشی جلوه‌ها — مقایسه
  await page.evaluate(() => localStorage.setItem('ara-effects', '0'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/effects-off.png` })
  await page.evaluate(() => localStorage.setItem('ara-effects', '1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/effects-on.png` })
  console.log('effects shots done')

  await browser.close()
  console.log('TOUR_OK')
})().catch((e) => {
  console.error('TOUR_FAIL', e.message)
  process.exit(1)
})
