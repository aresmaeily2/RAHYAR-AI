// راستی‌آزمایی مرورگری لینک‌های جدید GoFile (رندر صفحه + نام فایل)
const { chromium } = require('playwright')
const LINKS = [
  ['TBERoUxg', 'RahyAr-Complete-Source.zip'],
  ['EnA1vwl9', 'RahyAr-Verification-Report.docx'],
  ['HerOc6vZ', 'RahyAr-Verification-Report.md'],
  ['f3XW3yMB', 'RahyAr-Screenshots.zip'],
  ['WpXzMZNm', 'RahyAr-Splash-Video.mp4'],
  ['JpGesxt7', 'RahyAr-Chat-Real-Model.mp4'],
  ['uAenlwts', 'RahyAr-Interaction-Video.mp4'],
  ['pNeFj9Xo', 'SHA256SUMS-v23.txt'],
  ['zLkcasKS', 'RahyAr-Verification-Evidence.zip'],
]
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()
  let ok = 0
  for (const [code, name] of LINKS) {
    try {
      await page.goto('https://gofile.io/d/' + code, { waitUntil: 'domcontentloaded', timeout: 60000 })
      let seen = false
      for (let i = 0; i < 25; i++) {
        await page.waitForTimeout(1000)
        const body = await page.locator('body').innerText().catch(() => '')
        if (body.includes(name)) { seen = true; break }
      }
      if (seen) { ok++; console.log('PASS ' + code + ' ' + name) } else console.log('SOFT ' + code + ' ' + name)
    } catch (e) { console.log('FAIL ' + code + ' ' + name + ' — ' + e.message.slice(0, 60)) }
  }
  console.log('RESULT: ' + ok + '/' + LINKS.length + ' rendered with filename')
  await browser.close()
})().catch(e => { console.error('FATAL', e); process.exit(1) })
