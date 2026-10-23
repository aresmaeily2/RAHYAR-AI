// تأیید مستقل: دانلود واقعی همهٔ مصنوعات تحویل‌شده از GoFile + هش SHA-256
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const OUT = '/home/z/my-project/artifacts/verify-downloads'
fs.mkdirSync(OUT, { recursive: true })

const LINKS = [
  ['FGsCCvdC', 'RahyAr-User.apk'],
  ['n9CSOn7U', 'RahyAr-Owner.apk'],
  ['ERTukfNV', 'RahyAr-Complete-Source.zip'],
  ['ASyLSl75', 'RahyAr-Logo-Kit.zip'],
  ['UB4CRoK4', 'RahyAr-Screenshots.zip'],
  ['RxucoE8m', 'RahyAr-Interaction-Video.mp4'],
  ['xwbXAZUc', 'RahyAr-Splash-Video.mp4'],
  ['OsozbfYQ', 'INSTALLATION-AND-LOGIN.md'],
  ['hWKAKem7', 'RahyAr-Capability-Audit.md'],
  ['gSuRwFF1', 'RahyAr-Final-Report.md'],
  ['8eCSLkf6', 'RahyAr-Final-Report.docx'],
  ['GGjfLALD', 'SHA256SUMS.txt'],
  ['BkTtbEU1', 'RahyAr-Final-Delivery.zip'],
  ['c4UZbOl2', 'GOFILE-LINKS.txt'],
]

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()
  const results = []
  for (const [code, name] of LINKS) {
    const dest = path.join(OUT, name)
    try {
      await page.goto('https://gofile.io/d/' + code, { waitUntil: 'domcontentloaded', timeout: 60000 })
      // صبر برای رندر صفحهٔ فایل (بعد از ریدایرکت داخلی GoFile)
      let seen = false
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1000)
        const body = await page.locator('body').innerText().catch(() => '')
        if (body.includes(name)) { seen = true; break }
      }
      if (!seen) { results.push([code, name, 'FAIL', 'name not rendered', '']); console.log('FAIL ' + code + ' ' + name); continue }
      // دانلود واقعی
      const dl = page.waitForEvent('download', { timeout: 90000 })
      const btn = page.locator('button:has-text("Download")').first()
      await btn.click({ timeout: 10000 })
      const d = await dl
      await d.saveAs(dest)
      const sz = fs.statSync(dest).size
      const h = sha256(dest)
      results.push([code, name, 'DOWNLOADED', String(sz), h])
      console.log('DOWNLOADED ' + code + ' ' + name + ' size=' + sz + ' sha256=' + h.slice(0, 16) + '…')
    } catch (e) {
      results.push([code, name, 'FAIL', e.message.slice(0, 80), ''])
      console.log('FAIL ' + code + ' ' + name + ' — ' + e.message.slice(0, 80))
    }
  }
  fs.writeFileSync(path.join(OUT, 'download-results.csv'), results.map(r => r.join(' | ')).join('\n'))
  const ok = results.filter(r => r[2] === 'DOWNLOADED').length
  console.log('RESULT: downloaded=' + ok + '/' + LINKS.length)
  await browser.close()
})().catch(e => { console.error('FATAL', e); process.exit(1) })
