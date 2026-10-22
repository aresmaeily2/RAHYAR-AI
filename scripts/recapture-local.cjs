// بازضبط رابط محلی آفلاین (اصلاح تم auto) — همان شرایط real offline
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const OUT = '/home/z/my-project/download/final-v21'

const bridge = `
  (function () {
    var MEM = {};
    try { MEM = JSON.parse(localStorage.getItem('rahyar-local-mock') || '{}'); } catch (e) { MEM = {}; }
    window.RahyarNative = {
      meta: function () { return JSON.stringify({ versionName: '2.0.0', mode: 'local' }); },
      getDoc: function (k) { return MEM[k] || ''; },
      putDoc: function (k, v) {
        MEM[k] = v;
        try { localStorage.setItem('rahyar-local-mock', JSON.stringify(MEM)); } catch (e) {}
        return JSON.stringify({ ok: true });
      }
    };
  })();`

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR', offline: true })
  const page = await ctx.newPage()
  await page.route('**/*', (route) => {
    const u = route.request().url()
    const www = '/home/z/my-project/android/src/www/'
    if (u.startsWith('https://appassets.androidplatform.net/assets/')) {
      const rel = u.replace('https://appassets.androidplatform.net/assets/', '')
      const fp = path.join(www, rel)
      if (fs.existsSync(fp)) {
        const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' }
        return route.fulfill({ body: fs.readFileSync(fp, 'utf-8'), contentType: types[path.extname(fp)] || 'application/octet-stream' })
      }
    }
    return route.abort()
  })
  await page.addInitScript(bridge)
  await page.goto('https://appassets.androidplatform.net/assets/index.html', { waitUntil: 'load' })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: OUT + '/local/01-local-home-offline.png' })
  await page.getByRole('link', { name: /وظایف|Tasks/ }).first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: OUT + '/local/02-local-tasks-offline.png' })
  await page.getByRole('link', { name: /تنظیمات|Settings/ }).first().click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: OUT + '/local/03-local-settings-offline.png' })
  await browser.close()
  console.log('LOCAL RECAPTURED')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
