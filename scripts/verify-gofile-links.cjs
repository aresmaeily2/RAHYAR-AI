// راستی‌آزمایی لینک‌های GoFile از مسیر دریافت (مرورگر واقعی — بارگذاری صفحه + خواندن نام/حجم فایل)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')

const LINKS = [
  ['SklMvUFe', 'RahyAr-User.apk', '417'],
  ['Q5A2RMVx', 'RahyAr-Owner.apk', '417'],
  ['qbey258c', 'RahyAr-Source.zip', '1.7'],
  ['cgt8guIb', 'RahyAr-Logo-Kit.zip', '240'],
  ['R5sZbMcQ', 'RahyAr-Screenshots.zip', '46'],
  ['GqGPgAxg', 'RahyAr-Interaction-Video.mp4', '487'],
  ['CwPpo2Os', 'RahyAr-Splash-Video.mp4', '90'],
  ['R7YcqWr8', 'INSTALLATION-AND-LOGIN.md', '12'],
]

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ locale: 'en-US' })
  const page = await ctx.newPage()
  const results = []
  for (const [code, name, sizeHint] of LINKS) {
    try {
      await page.goto('https://gofile.io/d/' + code, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.waitForTimeout(7000)
      const txt = await page.evaluate(() => document.body.innerText)
      const hasName = txt.includes(name)
      const hasDl = /download/i.test(txt)
      const sizeOk = txt.includes(sizeHint)
      results.push({ code, link: 'https://gofile.io/d/' + code, file: name, nameVisible: hasName, downloadButton: hasDl, sizeMatches: sizeOk, verified: hasName && hasDl })
      console.log(code, name, hasName && hasDl ? 'VERIFIED ✓' : 'CHECK: name=' + hasName + ' dl=' + hasDl + ' size=' + sizeOk)
    } catch (e) {
      results.push({ code, file: name, error: e.message.slice(0, 100) })
      console.log(code, 'ERROR', e.message.slice(0, 80))
    }
  }
  fs.writeFileSync('/home/z/my-project/artifacts/gofile-verify-v21.json', JSON.stringify(results, null, 2))
  await b.close()
  console.log('DONE', results.filter(r => r.verified).length + '/' + results.length, 'verified')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
