// F4-SHOTS: تصاویر واقعی وب — همهٔ صفحات اصلی، fa/en، تم روشن/تاریک (بخش ۱۰ مأموریت)
import { chromium } from 'playwright'
const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f4/shots'
import { mkdirSync } from 'fs'
mkdirSync(OUT, { recursive: true })
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
console.log('login:', lr.status())
const pg = await ctx.newPage()

async function setApp(body) {
  await ctx.request.put(`${B}/api/settings/app`, { data: body })
}
async function shot(name, ms = 2200) {
  await pg.waitForTimeout(ms)
  await pg.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name)
}

// --- فارسی / تم اقیانوس (روشن) ---
await setApp({ lang: 'fa', calendarMode: 'jalali' })
await pg.addInitScript(() => { try { localStorage.setItem('rahyar-theme', 'ocean'); localStorage.setItem('rahyar-accent', 'teal') } catch {} })
await pg.goto(`${B}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await shot('01-login-fa', 1800)
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await shot('02-home-today-fa-ocean')
for (const [name, label] of [['03-tasks-fa', 'وظایف'], ['04-finance-fa', 'مالی'], ['05-chat-fa', 'گفت'], ['06-calendar-fa', 'تقویم'], ['07-plan-fa', 'برنامه'], ['08-settings-fa', 'تنظیمات']]) {
  const el = pg.getByText(label, { exact: false }).first()
  try { await el.click({ timeout: 4000 }); await shot(name) } catch { console.log('skip:', name) }
}

// --- انگلیسی / تم جنگل (روشن) — بدون نشت فارسی ---
await setApp({ lang: 'en' })
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.addInitScript(() => { try { localStorage.setItem('rahyar-theme', 'forest') } catch {} })
await shot('09-home-today-en-forest', 2600)
for (const [name, label] of [['10-finance-en', 'Finance'], ['11-calendar-en', 'Calendar'], ['12-settings-en', 'Settings']]) {
  const el = pg.getByText(label, { exact: false }).first()
  try { await el.click({ timeout: 4000 }); await shot(name) } catch { console.log('skip:', name) }
}

// --- تم شب (تاریک) +Reduced Motion در فارسی ---
await setApp({ lang: 'fa' })
await pg.addInitScript(() => { try { localStorage.setItem('rahyar-theme', 'night') } catch {} })
await pg.emulateMedia({ reducedMotion: 'reduce' })
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await shot('13-home-fa-night-reduced', 2600)
await pg.emulateMedia({ reducedMotion: 'no-preference' })

// --- پنل مالک /emulator ---
await pg.goto(`${B}/emulator`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await shot('14-emulator-panel-owner', 2500)

await br.close()
console.log('F4-SHOTS DONE')
