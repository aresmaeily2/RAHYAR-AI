// ─── سنجش پرفورمنس نسخه ۱٫۰ — FPS/حافظه در نماهای تازه ──────────
// اجرا: node scripts/v1-perf.js <TOKEN>
// سناریوها: امروز (ambient on/off) + مالی + تقویم دوگانه + تنظیمات
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')

const TOKEN = fs.readFileSync('/tmp/rahyar-test-token.txt', 'utf8').trim()
const BASE = 'http://localhost:3100'
const OUT = '/home/z/my-project/artifacts/rahyar-v1/perf.json'
fs.mkdirSync('/home/z/my-project/artifacts/rahyar-v1', { recursive: true })

async function measure(page, label) {
  const res = await page.evaluate(async (ms) => {
    const mem = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)
    const heapStart = mem()
    await new Promise((r) => setTimeout(r, 2000))
    let frames = 0
    let worst = 100
    let t0 = performance.now()
    const start = performance.now()
    await new Promise((resolve) => {
      const loop = (t) => {
        frames++
        const dt = t - t0
        if (dt > 0) worst = Math.min(worst, Math.min(100, 1000 / dt))
        t0 = t
        if (t - start < ms) requestAnimationFrame(loop)
        else resolve()
      }
      requestAnimationFrame(loop)
    })
    const total = performance.now() - start
    const heapEnd = mem()
    return {
      fpsAvg: Math.round((frames / total) * 1000 * 10) / 10,
      fpsWorst: Math.round(worst * 10) / 10,
      durationMs: Math.round(total),
      heapMB_start: heapStart,
      heapMB_end: heapEnd,
    }
  }, 10000)
  return { scenario: label, ...res }
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const results = []
  results.push(await measure(page, 'today-ambient-on'))

  // خاموشی جلوه‌ها از Engine
  await page.evaluate(() => localStorage.setItem('ara-effects', '0'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  results.push(await measure(page, 'today-ambient-off'))

  // نماهای تازه نسخه ۱٫۰ (جلوه روشن)
  await page.evaluate(() => localStorage.setItem('ara-effects', '1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)

  for (const label of ['مالی', 'تقویم', 'تنظیمات']) {
    await page.getByRole('button', { name: new RegExp(label) }).first().click()
    await page.waitForTimeout(1800)
    results.push(await measure(page, 'view-' + label))
  }

  fs.writeFileSync(OUT, JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2))
  console.log('PERF_OK →', OUT)
  for (const r of results) console.log(`${r.scenario}: ${r.fpsAvg} FPS (worst ${r.fpsWorst}) heap ${r.heapMB_start}→${r.heapMB_end}MB`)
  await browser.close()
})().catch((e) => {
  console.error('PERF_FAIL', e.message)
  process.exit(1)
})
