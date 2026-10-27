// عیب‌یابی: چه چیزی صفحه را هر چند ثانیه ناوبری می‌کند؟
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const TOKEN = process.argv[2]

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) console.log('NAV', f._type ?? '', '→', page.url())
  })
  page.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 140)))
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 140)))
  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' })
  console.log('loaded, watching 25s...')
  await page.waitForTimeout(25000)
  console.log('FINAL_URL', page.url())
  await browser.close()
})()
