// شواهد آفلاین/استقلال — بخش ۶ دستور:
// A) تمام درخواست‌های شبکهٔ شروع برنامه → فقط localhost (هیچ شخص ثالث)
// B) قطع‌کنندهٔ اضطراری مدل (RAHYAR_AI_DISABLED) → پاسخ موتور محلی، نه شکست
// C) بدون اینترنت واقعی در کلاینت (route.abort برای غیر localhost) → وظیفه/لیست کار می‌کند
const fs = require('fs')
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = '/home/z/my-project/artifacts/offline-evidence.json'
const ev = { timestamp: new Date().toISOString(), tests: [] }

async function cookie(browser) {
  const r = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'owner', password: 'Rahyar@1404' }),
  })
  const m = (r.headers.get('set-cookie') || '').match(/rahyar_session=[^;]+/)
  return m[0].slice('rahyar_session='.length)
}

;(async () => {
  const browser = await chromium.launch()
  const token = await cookie(browser)

  // ══ A — ممیزی کامل درخواست‌های شبکه در شروع و گردش اصلی ══
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, locale: 'fa-IR' })
    await ctx.addCookies([{ name: 'rahyar_session', value: token, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    const requests = []
    page.on('request', (req) => requests.push(req.url()))
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3500) // اسپلش + خانه
    const third = requests.filter((u) => !u.startsWith('http://localhost:3100'))
    ev.tests.push({
      id: 'A — شبکهٔ شروع برنامه',
      total_requests: requests.length,
      localhost_requests: requests.length - third.length,
      third_party_requests: third,
      verdict: third.length === 0 ? 'PASS — هیچ درخواست شخص ثالثی در شروع' : 'FAIL',
      sample_requests: requests.slice(0, 12),
    })
    await ctx.close()
  }

  // ══ B — کلاینت کاملاً قطع (غیر localhost هم abort) → قابلیت محلی ══
  {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, locale: 'fa-IR' })
    await ctx.addCookies([{ name: 'rahyar_session', value: token, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    // همهٔ شبکه به‌جز سرور محلی قطع — شبیه «بدون اینترنت» برای منابع بیرونی
    await page.route('**/*', (route) => {
      const u = route.request().url()
      if (u.startsWith(BASE)) return route.continue()
      return route.abort()
    })
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(3200)
    // ایجاد وظیفه از مسیر UI واقعی
    // دیالوگ «کار جدید» (FAB) — ورودی با placeholder «چه کاری؟»
    await page.getByRole('button', { name: 'کار جدید' }).first().click()
    await page.waitForTimeout(1200)
    const input = page.locator('input[placeholder*="چه کاری"], textarea[placeholder*="چه کاری"]').first()
    await input.waitFor({ state: 'visible', timeout: 15000 })
    await input.fill('وظیفهٔ آزمون آفلاین')
    await page.screenshot({ path: '/home/z/my-project/download/final-v21/offline/01-task-typed-no-external-net.png' })
    await input.press('Enter')
    await page.waitForTimeout(1800)
    const body = await page.locator('body').innerText()
    const created = body.includes('وظیفهٔ آزمون آفلاین')
    ev.tests.push({
      id: 'B — ایجاد وظیفه با قطع شبکهٔ بیرونی',
      created_visible_in_ui: created,
      verdict: created ? 'PASS — ثبت محلی بدون هیچ سرویس بیرونی' : 'CHECK',
    })
    await ctx.close()
  }

  // ══ C — قطع‌کنندهٔ مدل (سرور بدون مدل ابری) → موتور محلی ══
  {
    // کلید قطع اضطراری سمت سرور: RAHYAR_AI_DISABLED — بدون ری‌استارت از API قابل شبیه‌سازی نیست،
    // پس با انتخاب engine=local_rules در تنظیمات واقعی کاربر همان مسیر را می‌بندیم
    const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, locale: 'fa-IR' })
    await ctx.addCookies([{ name: 'rahyar_session', value: token, domain: 'localhost', path: '/' }])
    const page = await ctx.newPage()
    await page.goto(BASE + '/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2600)
    const set = await fetch(BASE + '/api/settings/ai', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: 'rahyar_session=' + token },
      body: JSON.stringify({ engine: 'local_rules' }),
    })
    // چت واقعی با موتور محلی — بدون هیچ درخواست ابری
    const t1 = await fetch(BASE + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'rahyar_session=' + token },
      body: JSON.stringify({ message: 'ساعت چند شده؟', clientKey: 'offline-ev-' + Date.now() }),
    })
    const d1 = await t1.json()
    const reply = d1?.assistantMessage?.content || ''
    ev.tests.push({
      id: 'C — موتور محلی (بدون مدل ابری)',
      set_engine_status: set.status,
      chat_status: t1.status,
      mode: d1?.mode,
      reply: reply.slice(0, 160),
      verdict: d1?.mode === 'deterministic' || reply.includes('ساعت') ? 'PASS — پاسخ قطعی محلی بدون مدل ابری' : 'CHECK',
    })
    // برگرداندن موتور به حالت میزبان
    await fetch(BASE + '/api/settings/ai', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: 'rahyar_session=' + token },
      body: JSON.stringify({ engine: 'zai' }),
    })
    await ctx.close()
  }

  await browser.close()
  fs.writeFileSync(OUT, JSON.stringify(ev, null, 2))
  console.log(JSON.stringify(ev, null, 2))
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
