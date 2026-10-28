// ─── رهیار — اسکرین‌شات UI محلی APK (همان دارایی‌های داخل بسته) ──
// شبیه‌سازی دقیق محیط WebView اندروید:
//   - مبدأ امن https://appassets.androidplatform.net (مطابق WebViewAssetLoader)
//   - شیم window.RahyarNative با همان امضای RahyarBridge/RahyarCore (meta/getDoc/putDoc)
//   - دادهٔ نمونهٔ فارسی (پروفایل + وظایف + یادآور) — معادل state پس از استفادهٔ واقعی
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const WWW = '/home/z/my-project/android/src/www'
const OUT = '/home/z/my-project/download/audit-v2/screens-android'
const ORIGIN = 'https://appassets.androidplatform.net'
fs.mkdirSync(OUT, { recursive: true })

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }

// دادهٔ نمونه — همان ساختاری که RahyarCore/LocalStore نگه می‌دارند
const now = Date.now()
const iso = (d) => new Date(d).toISOString()
const seed = {
  profile: { name: 'علیرضا', lang: 'fa', theme: 'light' },
  tasks: [
    { id: 't1', title: 'تماس با تیم پشتیبانی', status: 'open', priority: 'high', createdAt: iso(now - 3600e3) },
    { id: 't2', title: 'بازبینی گزارش ممیزی امنیتی', status: 'open', priority: 'med', createdAt: iso(now - 2400e3) },
    { id: 't3', title: 'خرید هدیه تولد سارا', status: 'open', priority: 'low', createdAt: iso(now - 1200e3) },
    { id: 't4', title: 'پاسخ به ایمیل‌ها', status: 'done', priority: 'med', doneAt: iso(now - 600e3), createdAt: iso(now - 7200e3) },
  ],
  reminders: [
    { id: 'r1', title: 'جلسهٔ آنلاین با تیم فنی', at: iso(now + 3 * 3600e3), created: iso(now - 900e3) },
  ],
}

const ctx = await chromium.launchPersistentContext('/tmp/rahyar-android-pw', {
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
  locale: 'fa-IR',
  timezoneId: 'Asia/Tehran',
  isMobile: true,
  hasTouch: true,
})
const page = ctx.pages()[0] || (await ctx.newPage())

// مسیریابی: سرو فایل‌های www روی مبدأ امن (معادل WebViewAssetLoader)
await page.route(`${ORIGIN}/**`, async (route) => {
  const url = new URL(route.request().url())
  const rel = url.pathname === '/' ? '/index.html' : url.pathname
  const file = path.join(WWW, path.normalize(rel).replace(/^([.][.][/\\])+/, ''))
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    await route.fulfill({ body: fs.readFileSync(file), contentType: MIME[path.extname(file)] || 'application/octet-stream' })
  } else {
    await route.fulfill({ status: 404, body: 'not found' })
  }
})

// شیم پل بومی — همان متدهای @JavascriptInterface که RahyarBridge ارائه می‌دهد
await page.addInitScript((dataJson) => {
  const data = JSON.parse(dataJson)
  const store = {}
  for (const k of Object.keys(data)) store[k] = JSON.stringify(data[k])
  const persist = () => { try { localStorage.setItem('__rahyar_store__', JSON.stringify(store)) } catch (e) {} }
  try {
    const saved = localStorage.getItem('__rahyar_store__')
    if (saved) Object.assign(store, JSON.parse(saved)); else persist()
  } catch (e) {}
  const core = {
    meta() {
      return JSON.stringify({ versionName: '2.1.0', versionCode: 22, mode: 'local', keys: ['profile', 'tasks', 'reminders'] })
    },
    getDoc(key) { return store[key] || '' },
    putDoc(key, json) {
      if (!['profile', 'tasks', 'reminders'].includes(key)) return JSON.stringify({ ok: false, error: 'bad_key' })
      try { JSON.parse(json); store[key] = json; persist(); return JSON.stringify({ ok: true, key }) }
      catch (e) { return JSON.stringify({ ok: false, error: 'bad_json' }) }
    },
    isAndroidApp() { return true },
    capabilities() { return JSON.stringify({ voice: true, tts: true, reminders: true, version: '2.1.0' }) },
    appVersion() { return '2.1.0 (22)' },
  }
  window.RahyarNative = core
}, JSON.stringify(seed))

const pages = [
  ['/index.html', '01-home'],
  ['/tasks.html', '02-tasks'],
  ['/reminders.html', '03-reminders'],
  ['/settings.html', '04-settings'],
]
for (const [file, name] of pages) {
  await page.goto(`${ORIGIN}${file}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name)
}

// حالت تاریک — از تنظیمات اپ (data-theme="dark" روی html)
await page.goto(`${ORIGIN}/settings.html`, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  document.documentElement.setAttribute('data-theme', 'dark')
  try { localStorage.setItem('rahyar-theme', 'dark') } catch (e) {}
})
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/05-settings-dark.png` })
console.log('shot: 05-settings-dark')
await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'))
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/06-home-dark.png` })
console.log('shot: 06-home-dark')

await ctx.close()
console.log('DONE android-ui screenshots')
