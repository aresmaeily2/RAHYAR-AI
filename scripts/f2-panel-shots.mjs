// ─── پنل شبیه‌ساز — اسکرین‌شات واقعی با نشست مالک + ریدایرکت بدون نشست ──
import { chromium } from 'playwright'
import fs from 'node:fs'

const B = 'http://127.0.0.1:3000'
const OUT = '/home/z/my-project/artifacts/panel-shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ args: ['--no-sandbox'] })

// 1) بدون نشست — ریدایرکت به /login
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const resp = await page.goto(B + '/emulator', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.screenshot({ path: OUT + '/emulator-unauth-redirect.png' })
  console.log('unauth:', resp.status(), '→', page.url())
  await ctx.close()
}

// 2) نشست مالک — پنل کامل (رندر واقعی صفحه؛ وضعیت شبیه‌ساز صادقانه از API می‌آید)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1600 } })
  // نشست مالک از طریق API واقعی — کوکی نشست به زمینه تزریق می‌شود
  const page = await ctx.newPage()
  const lr = await ctx.request.post(B + '/api/auth/login', {
    data: { username: 'admin', password: 'admin' },
    headers: { Origin: B },
  })
  console.log('login API:', lr.status())
  const resp = await page.goto(B + '/emulator', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: OUT + '/emulator-panel-owner.png', fullPage: false })
  console.log('owner:', resp.status(), '→', page.url())
  await ctx.close()
}

await browser.close()
console.log('DONE panel screenshots')
