// ─── سنجش پرفورمنس لایه محیطی — FPS و حافظه، جلوه روشن/خاموش ────
// اجرا: node scripts/ambient-perf.js <TOKEN>
// خروجی: artifacts/ambient/perf.json
// روش: پروب requestAnimationFrame داخل صفحه واقعی (production:3100)؛
// ۲ ثانیه اول گرم شدن، سپس ۱۰ ثانیه اندازه‌گیری. حافظه از
// performance.memory (کرومیوم). هر سناریو ۳ بار تکرار می‌شود.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')
const fs = require('fs')

const TOKEN = process.argv[2]
const BASE = 'http://localhost:3100'
const OUT = '/home/z/my-project/artifacts/ambient/perf.json'

async function measure(page, label) {
  const res = await page.evaluate(async (ms) => {
    const mem = () => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
    const heapStart = mem()
    await new Promise((r) => setTimeout(r, 2000)) // گرم شدن
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
      frames,
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
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) console.log('NAV →', page.url())
  })
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE_ERR', m.text().slice(0, 120))
  })

  const runs = { on: [], off: [] }
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  for (const mode of ['on', 'off']) {
    for (let i = 0; i < 3; i++) {
      await page.evaluate((m) => {
        localStorage.setItem('rahyar-theme', 'ocean')
        localStorage.setItem('theme', 'light')
        localStorage.setItem('ara-effects', m === 'on' ? '1' : '0')
      }, mode)
      let r = null
      for (let attempt = 1; attempt <= 3 && !r; attempt++) {
        await page.goto(BASE + '/', { waitUntil: 'networkidle' })
        await page.waitForTimeout(2500)
        if (!page.url().startsWith(BASE + '/')) continue // redirect خورده — دوباره
        try {
          r = await measure(page, `effects-${mode}-run${i + 1}`)
        } catch {
          r = null // ناوبری وسط پروب — تلاش دوباره
        }
      }
      if (!r) throw new Error(`measure failed for ${mode} run ${i + 1}`)
      runs[mode].push(r)
      console.log(JSON.stringify(r))
    }
  }

  const avg = (arr, k) => Math.round((arr.reduce((s, r) => s + r[k], 0) / arr.length) * 10) / 10
  const summary = {
    timestamp: new Date().toISOString(),
    env: 'production:3100, chromium 1440x900, theme=ocean, light',
    effectsOn: {
      fpsAvg: avg(runs.on, 'fpsAvg'),
      fpsWorst: avg(runs.on, 'fpsWorst'),
      heapMB: avg(runs.on, 'heapMB_end'),
    },
    effectsOff: {
      fpsAvg: avg(runs.off, 'fpsAvg'),
      fpsWorst: avg(runs.off, 'fpsWorst'),
      heapMB: avg(runs.off, 'heapMB_end'),
    },
    runs,
  }
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2))
  console.log('SUMMARY', JSON.stringify({ on: summary.effectsOn, off: summary.effectsOff }))
  await browser.close()
})().catch((e) => {
  console.error('PERF_FAIL', e.message)
  process.exit(1)
})
