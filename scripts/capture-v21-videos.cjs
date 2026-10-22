// ویدیوی واقعی اسپلش وب + تعامل چت — ضبط با Playwright video و تبدیل به mp4
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = '/home/z/my-project/download/final-v21'

async function cookie(browser) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  return m[0].slice('rahyar_session='.length)
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const token = await cookie(browser)

  // ══ ۱ — ویدیوی اسپلش: شروع سرد با کوکی، ۲.۶ ثانیه ══
  {
    const ctx = await browser.newContext({
      viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR',
      recordVideo: { dir: OUT + '/video-tmp', size: { width: 786, height: 1702 } },
    })
    await ctx.addCookies([{ name: 'rahyar_session', value: token, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'commit' })
    await page.waitForTimeout(2800)
    await ctx.close()
    const files = fs.readdirSync(OUT + '/video-tmp')
    const src = OUT + '/video-tmp/' + files[files.length - 1]
    fs.renameSync(src, OUT + '/video/splash-web-real.webm')
    console.log('splash video OK')
  }

  // ══ ۲ — ویدیوی تعامل چت: تایپ واقعی + پاسخ واقعی مدل ══
  {
    const ctx = await browser.newContext({
      viewport: { width: 393, height: 851 }, deviceScaleFactor: 2, locale: 'fa-IR',
      recordVideo: { dir: OUT + '/video-tmp', size: { width: 786, height: 1702 } },
    })
    await ctx.addCookies([{ name: 'rahyar_session', value: token, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'commit' })
    await page.waitForTimeout(2600) // اسپلش کامل
    await page.getByRole('button', { name: /دستیار/ }).first().click()
    await page.waitForTimeout(1500)
    const input = page.locator('textarea, input[type="text"]').last()
    await input.fill('یک جمله کوتاه درباره اهمیت برنامه‌ریزی روزانه بنویس')
    await input.press('Enter')
    await page.waitForTimeout(22000) // پاسخ واقعی مدل + TTS چرخه
    await ctx.close()
    const files = fs.readdirSync(OUT + '/video-tmp')
    const src = OUT + '/video-tmp/' + files[files.length - 1]
    fs.renameSync(src, OUT + '/video/chat-real-model-interaction.webm')
    console.log('chat video OK')
  }

  await browser.close()
  fs.rmSync(OUT + '/video-tmp', { recursive: true, force: true })
  console.log('VIDEOS DONE')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
