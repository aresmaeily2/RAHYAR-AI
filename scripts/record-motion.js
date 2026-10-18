// ضبط ویدئوی موشن رهیار با Playwright خام (جایگزین agent-browser record)
// خروجی: motion-demo.webm → سپس با ffmpeg به mp4/gif تبدیل می‌شود
const path = require('path')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const TOKEN = process.argv[2]
const OUT = '/home/z/my-project/artifacts/rahyar-redesign/motion-demo.webm'
const BASE = 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: path.dirname(OUT), size: { width: 1440, height: 900 } },
    deviceScaleFactor: 1,
  })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()

  await page.goto(BASE + '/?rec=' + Date.now(), { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  const nav = async (name) => {
    await page.getByRole('button', { name }).first().click()
    await page.waitForTimeout(1400)
  }

  await nav(/کارها/)
  await nav(/تقویم/)
  await nav(/برنامه/)
  await nav(/دستیار/)
  await page.waitForTimeout(800)

  // کامند پالت — باز و بسته
  await page.keyboard.press('/')
  await page.waitForTimeout(900)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(700)

  // انتقال تم — reveal دایره‌ای
  await page.keyboard.press('d')
  await page.waitForTimeout(1600)
  await page.keyboard.press('d')
  await page.waitForTimeout(1600)

  // پنجره ظاهر — تغییر تم زنده
  await page.getByRole('button', { name: /پروفایل و حساب/ }).first().click()
  await page.waitForTimeout(900)
  await page.getByRole('radio', { name: /تم شفق/ }).click()
  await page.waitForTimeout(1100)
  await page.getByRole('radio', { name: /رنگ طلایی/ }).click()
  await page.waitForTimeout(1100)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)

  await ctx.close() // ذخیره ویدئو
  await browser.close()
  console.log('VIDEO_OK')
})().catch((e) => {
  console.error('VIDEO_FAIL', e.message)
  process.exit(1)
})
