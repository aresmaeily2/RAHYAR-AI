// V1 — شواهد رابط صوتی وب: وضعیت‌های واقعی اورب + تنظیمات صوتی جدید + ویدئوی اجرا
// توجه صادقانه: STT مرورگر بدون میکروفون واقعی اجرا نمی‌شود؛ این شواهد «UI متصل به
// رخدادهای واقعی» است (idle/thinking/streaming) + تنظیمات صوتی جدید. حالت listening/
// speaking روی دستگاه واقعی آزمون می‌شود (BLOCKED صادقانه در سندباکس).
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')
const BASE = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/logs/f8/shots'
const CRED = '/home/z/my-project/artifacts/gu2/owner-credentials.txt'
fs.mkdirSync(OUT, { recursive: true })
const PW = (fs.readFileSync(CRED, 'utf-8').match(/owner-password=(.*)/) || [])[1]?.trim()
if (!PW) { console.error('no credentials'); process.exit(1) }

const browser = await chromium.launch({ args: ['--lang=fa-IR'] })
const ctx = await browser.newContext({
  viewport: { width: 430, height: 900 }, locale: 'fa-IR',
  recordVideo: { dir: '/tmp/v1-video', size: { width: 430, height: 900 } },
})
const page = await ctx.newPage()
const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot:', name) }

// login
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await shot('01-login-fa')
await page.fill('input[autocomplete="username"]', 'owner')
await page.fill('input[type="password"]', PW)
await page.click('button[type="submit"]')
await page.waitForSelector('aside, nav', { timeout: 30000, state: 'attached' })
await page.waitForTimeout(2000)

// chat — idle + orb (نمای چت با کلید ۴)
await page.goto(BASE + '/', { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(1500)
await page.keyboard.press('4').catch(() => {})
await page.waitForTimeout(2000)
await shot('02-chat-idle-orb-fa')

// دکمهٔ میکروفون در UI
const mic = await page.$('button[aria-label*="ورودی صوتی"], button[title*="ورودی صوتی"]')
console.log('mic-button-aria:', mic ? await mic.getAttribute('aria-label') : 'NOT FOUND')
console.log('mic-button-found:', !!mic)

// فرمان واقعی چت (معادل متن STT) — وضعیت thinking/streaming واقعی
await page.fill('textarea', 'برای فردا ساعت ۱۰ یادآوری کن جلسه با تیم داشته باشم').catch(() => {})
const sendBtn = await page.$('button[type="submit"], button:has(svg.lucide-send), form button:last-of-type')
if (sendBtn) { await sendBtn.click().catch(() => {}) }
await page.waitForTimeout(1500)
await shot('03-chat-thinking-streaming-fa')
await page.waitForTimeout(9000)
await shot('04-chat-reply-fa')

// تنظیمات — بخش صوتی جدید (زبان + سرعت + پاسخ گفتاری) — از ناوبری/کلید 7
await page.keyboard.press('7').catch(() => {})
await page.waitForTimeout(1800)
await shot('05-settings-top-fa')
const voiceSel = await page.$('select[aria-label*="زبان ورودی صوتی"]')
if (voiceSel) { await voiceSel.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(600) }
await shot('05-settings-voice-section-fa')

// زبان صوتی: انتخاب انگلیسی + تغییر سرعت (تغییر واقعی ذخیره‌شده)
try {
  await page.selectOption('select[aria-label*="زبان ورودی صوتی"]', 'en', { timeout: 4000 })
  await page.waitForTimeout(600)
  await shot('06-settings-voice-lang-en-fa')
  const rate = await page.$('input[type="range"][aria-label*="سرعت خواندن"]')
  if (rate) {
    await rate.evaluate((el) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(el, '1.5'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.waitForTimeout(800)
    await shot('07-settings-voice-rate-15-fa')
  }
} catch (e) { console.log('voice-controls:', String(e).slice(0, 120)) }

// انگلیسی — تغییر زبان از تنظیمات (select زبان رابط) و رفتن به چت
const langSel = await page.$('select')
const selects = await page.$$('select')
for (const sel of selects) {
  const opts = await sel.$$eval('option', (os) => os.map((o) => o.value))
  if (opts.includes('fa') && opts.includes('en')) { await sel.selectOption('en').catch(() => {}); break }
}
await page.waitForTimeout(1800)
await shot('08-settings-en')
await page.keyboard.press('4').catch(() => {}) // چت
await page.waitForTimeout(2000)
await shot('09-chat-idle-en')

await ctx.close()
await browser.close()

// ذخیرهٔ ویدئو
const vids = fs.readdirSync('/tmp/v1-video').filter(f => f.endsWith('.webm'))
if (vids.length) {
  fs.copyFileSync(`/tmp/v1-video/${vids[0]}`, '/home/z/my-project/artifacts/logs/f8/v1-web-run.webm')
  console.log('video saved:', vids[0], fs.statSync(`/tmp/v1-video/${vids[0]}`).size, 'bytes')
}
console.log('DONE')
