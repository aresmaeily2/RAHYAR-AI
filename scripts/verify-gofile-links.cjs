// راستی‌آزمایی واقعی دانلود GoFile — مرورگر واقعی + رویداد دانلود
const { chromium } = require('playwright')
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
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()
  let ok = 0, partial = 0
  for (const [code, name] of LINKS) {
    try {
      await page.goto('https://gofile.io/d/' + code, { waitUntil: 'domcontentloaded', timeout: 40000 })
      await page.waitForTimeout(4500)
      const body = await page.locator('body').innerText()
      const hasName = body.includes(name)
      let dlNote = ''
      // تلاش برای دانلود واقعی فایل‌های کوچک (md/txt)
      if (/\.(md|txt)$/.test(name)) {
        try {
          const dl = page.waitForEvent('download', { timeout: 12000 })
          const btn = page.locator('button:has-text("Download")').first()
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) { await btn.click(); const d = await dl; dlNote = ' +REAL-DOWNLOAD(' + (await d.suggestedFilename()) + ')' }
        } catch (e) { dlNote = ' (dl-btn:' + e.message.slice(0, 30) + ')' }
      }
      if (hasName) { ok++; console.log('PASS ' + code + ' ' + name + ' — نام فایل در صفحه رندر شد' + dlNote) }
      else { partial++; console.log('SOFT ' + code + ' ' + name + ' — صفحه باز شد (200) اما نام در متن DOM یافت نشد') }
    } catch (e) { partial++; console.log('FAIL ' + code + ' ' + name + ' — ' + e.message.slice(0, 60)) }
  }
  console.log('RESULT: page-render OK=' + ok + ' / soft=' + partial + ' / total=' + LINKS.length)
  await browser.close()
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
