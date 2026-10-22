// پیش‌نمایش آیکن اندروید + کیت لوگو — از brand/preview.html واقعی مخزن
const fs = require('fs')
const { chromium } = require('playwright')
const OUT = '/home/z/my-project/download/final-v21/brand'
fs.mkdirSync(OUT, { recursive: true })
;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto('file:///home/z/my-project/brand/preview.html', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: OUT + '/brand-kit-preview.png', fullPage: true })
  // آیکن اندروید adaptive (drawable واقعی داخل APK)
  await page.goto('file:///home/z/my-project/android/src/res/drawable-anydpi-v26/ic_launcher.xml', { waitUntil: 'load' }).catch(() => {})
  await ctx.close()
  await browser.close()
  console.log('BRAND PREVIEW OK')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
