// چه چیزی صفحه را reload می‌کند؟ ردیابی کامل ناوبری دوم
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const TOKEN = process.argv[2]

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  page.on('load', () => console.log('LOAD', new Date().toISOString().slice(11, 19), page.url()))
  page.on('crash', () => console.log('CRASH!'))
  page.on('request', (r) => {
    if (r.resourceType() === 'document') console.log('DOC_REQ', r.url().slice(0, 80))
  })
  await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    sessionStorage.setItem('nav-debug', String(Date.now()))
    window.addEventListener('beforeunload', () => {
      // در صورت reload، نشانه‌ای در sessionStorage بگذار
      sessionStorage.setItem('was-unload', String(Date.now()))
    })
  })
  console.log('armed, watching 30s...')
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(5000)
    const state = await page.evaluate(() => ({
      url: location.href,
      navs: performance.getEntriesByType('navigation').length,
      unload: sessionStorage.getItem('was-unload'),
      ready: document.readyState,
    })).catch((e) => ({ err: e.message.slice(0, 60) }))
    console.log(`t+${(i + 1) * 5}s`, JSON.stringify(state))
  }
  await browser.close()
})()
