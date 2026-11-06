// F4-SHOTS3: تصاویر انگلیسی + کارها/دستیار — کوکی از هدر استخراج و به کانتکست تزریق می‌شود
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f4/shots'
mkdirSync(OUT, { recursive: true })
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
const sc = lr.headers()['set-cookie'] || ''
const m = sc.match(/rahyar_session=([^;]+)/)
console.log('login:', lr.status(), 'cookie-extracted:', Boolean(m))
if (m) {
  await ctx.addCookies([{ name: 'rahyar_session', value: m[1], url: B, httpOnly: true, sameSite: 'Lax' }])
}
const pg = await ctx.newPage()
async function setApp(body) {
  const r = await pg.evaluate(async (b) => {
    const res = await fetch('/api/settings/app', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
    return res.status
  }, body)
  console.log('setApp', JSON.stringify(body), '=>', r)
}
async function shot(name, ms = 2200) { await pg.waitForTimeout(ms); await pg.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot:', name) }
async function nav(label) {
  try { await pg.getByRole('button', { name: label }).first().click({ timeout: 4000 }); return true } catch {
    try { await pg.getByText(label, { exact: false }).first().click({ timeout: 3000 }); return true } catch { console.log('NAV-MISS:', label); return false }
  }
}

await pg.goto(`${B}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await setApp({ lang: 'fa', calendarMode: 'jalali' })
await pg.addInitScript(() => { try { localStorage.setItem('rahyar-theme', 'ocean'); localStorage.setItem('rahyar-accent', 'teal') } catch {} })
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2500)
if (await nav('کارها')) await shot('03-tasks-fa')
if (await nav('دستیار')) await shot('05-chat-fa')

await setApp({ lang: 'en' })
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2800)
await shot('15-home-en', 300)
for (const [name, labels] of [['10-finance-en', ['Finance', 'Money']], ['11-calendar-en', ['Calendar']], ['12-settings-en', ['Settings']], ['16-tasks-en', ['Tasks']], ['17-chat-en', ['Assistant', 'AI assistant']]]) {
  let ok = false
  for (const l of labels) { if (await nav(l)) { ok = true; break } }
  if (ok) await shot(name)
}
await setApp({ lang: 'fa' })
await br.close()
console.log('F4-SHOTS3 DONE')
