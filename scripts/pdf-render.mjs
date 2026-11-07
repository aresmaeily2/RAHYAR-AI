// ─── F7 — رندر PDF با Chromium (Playwright سراسری میزبان) ──────
// usage: node scripts/pdf-render.mjs <in.html> <out.pdf>
// هیچ شبکه‌ای ندارد؛ فقط فایل محلی می‌خواند و PDF می‌نویسد.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const [htmlPath, outPath] = process.argv.slice(2)
if (!htmlPath || !outPath) {
  console.error('usage: pdf-render.mjs <in.html> <out.pdf>')
  process.exit(2)
}

let chromium = null
const CANDIDATES = [
  '/home/z/.npm-global/lib/node_modules/playwright',
  'playwright',
  'playwright-core',
]
for (const c of CANDIDATES) {
  try {
    chromium = require(c).chromium
    if (chromium) break
  } catch {
    /* نامزد بعدی */
  }
}
if (!chromium) {
  console.error('playwright-chromium-unavailable')
  process.exit(3)
}

try {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 20_000 })
  await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } })
  await browser.close()
  process.exit(0)
} catch (e) {
  console.error('render-failed:', String(e).slice(0, 200))
  process.exit(1)
}
