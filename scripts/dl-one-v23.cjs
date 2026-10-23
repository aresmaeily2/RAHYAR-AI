const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ acceptDownloads: true })
  const page = await ctx.newPage()
  let loaded = false
  for (let a = 0; a < 3 && !loaded; a++) {
    try { await page.goto('https://gofile.io/d/pNeFj9Xo', { waitUntil: 'domcontentloaded', timeout: 120000, timeout: 120000 }); loaded = true }
    catch (e) { console.log('goto retry', a + 1, e.message.slice(0, 40)) }
  }
  if (!loaded) process.exit(2)
  await page.waitForTimeout(10000)
  const dl = page.waitForEvent('download', { timeout: 90000 })
  await page.locator('button:has-text("Download")').first().click({ timeout: 20000 })
  const d = await dl
  await d.saveAs('/tmp/sha-v23-downloaded.txt')
  console.log('DOWNLOADED:', await d.suggestedFilename())
  await browser.close()
})().catch(e => { console.error('FAIL', e.message.slice(0, 100)); process.exit(1) })
