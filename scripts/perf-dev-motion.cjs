// ─── پروب FPS روی سرور توسعه (۳۰۰۰) — مأموریت موشن ──────────────
// همان روش ambient-perf.js: گرم شدن ۲ ثانیه، سپس ۱۰ ثانیه شمارش فریم.
// سناریوها: جلوه روشن (پیش‌فرض) و جلوه خاموش (ara-effects=0)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')

const TOKEN = fs.readFileSync('/home/z/my-project/artifacts/preview/session-token.txt', 'utf-8').trim()
const BASE = 'http://localhost:3000'
const OUT = '/home/z/my-project/artifacts/ambient/perf-dev.json'

async function measure(page, label) {
  const res = await page.evaluate(async (ms) => {
    const mem = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null)
    const heapStart = mem()
    await new Promise((r) => setTimeout(r, 2000))
    let frames = 0
    let worst = 100
    let last = performance.now()
    const start = last
    const tick = (now) => {
      frames++
      const dt = now - last
      last = now
      if (dt > 0) worst = Math.min(worst, 1000 / dt)
      if (now - start < ms) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    await new Promise((r) => setTimeout(r, ms))
    const heapEnd = mem()
    return {
      fps: Math.round((frames / ms) * 1000),
      worstFps: Math.round(worst),
      heapDeltaMb: heapStart && heapEnd ? heapEnd - heapStart : null,
    }
  }, 10000)
  return { scenario: label, ...res }
}

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } })
  await ctx.addCookies([{ name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }])
  const page = await ctx.newPage()
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  const runs = []
  runs.push(await measure(page, 'effects-on'))
  // خاموشی جلوه‌ها از سوییچ رسمی (Engine)
  await page.evaluate(() => window.localStorage.setItem('ara-effects', '0'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  runs.push(await measure(page, 'effects-off'))
  await page.evaluate(() => window.localStorage.setItem('ara-effects', '1'))

  await browser.close()
  fs.mkdirSync('/home/z/my-project/artifacts/ambient', { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), base: BASE, runs }, null, 2))
  for (const r of runs) console.log(`${r.scenario}: ${r.fps} FPS (worst frame ${r.worstFps}) heap Δ${r.heapDeltaMb}MB`)
})().catch((e) => { console.error(e); process.exit(1) })
