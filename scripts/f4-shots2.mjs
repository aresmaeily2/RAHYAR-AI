// F4-SHOTS2: تکمیل تصاویر جاافتاده — کارها/دستیار فارسی + صفحات انگلیسی (با Origin درست)
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f4/shots'
mkdirSync(OUT, { recursive: true })
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
console.log('login:', lr.status())
const pg = await ctx.newPage()
async function setApp(body) {
  const r = await ctx.request.put(`${B}/api/settings/app`, { data: body, headers: { Origin: B, 'Content-Type': 'application/json' } })
  console.log('setApp', JSON.stringify(body), '=>', r.status())
}
async function shot(name, ms = 2200) {
  await pg.waitForTimeout(ms)
  await pg.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name)
}
async function nav(label) {
  const el = pg.getByRole('button', { name: label }).first()
  try { await el.click({ timeout: 5000 }); return true } catch {
    const el2 = pg.getByText(label, { exact: false }).first()
    try { await el2.click({ timeout: 4000 }); return true } catch { console.log('NAV-MISS:', label); return false }
  }
}

// --- فارسی: کارها + دستیار (تم اقیانوس) ---
await setApp({ lang: 'fa', calendarMode: 'jalali' })
await pg.addInitScript(() => { try { localStorage.setItem('rahyar-theme', 'ocean'); localStorage.setItem('rahyar-accent', 'teal') } catch {} })
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2500)
if (await nav('کارها')) await shot('03-tasks-fa')
if (await nav('دستیار')) await shot('05-chat-fa')

// --- انگلیسی: بارگذاری مجدد کامل پس از PUT ---
await setApp({ lang: 'en' })
await pg.goto(`${B}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2600)
await shot('15-home-en-check', 400)
for (const [name, labels] of [['10-finance-en', ['Finance', 'Money']], ['11-calendar-en', ['Calendar']], ['12-settings-en', ['Settings']], ['16-tasks-en', ['Tasks', 'To-dos', 'Work']], ['17-chat-en', ['Assistant', 'AI']]]) {
  let ok = false
  for (const l of labels) { if (await nav(l)) { ok = true; break } }
  if (ok) await shot(name)
}
await br.close()
console.log('F4-SHOTS2 DONE')
