// F3-SHOTS3: تصاویر واقعی بخش‌های اصلی SPA + صفحهٔ /emulator
import { chromium } from 'playwright'
const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f3/shots'
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
console.log('login:', lr.status())
const pg = await ctx.newPage()
await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2500)

const tabs = [['07-finance-view', 'مالی'], ['08-chat-view', 'گفتگو'], ['08b-chat-view2', 'گفت‌وگو'], ['09-calendar-view', 'تقویم'], ['10-settings-view', 'تنظیمات']]
for (const [name, label] of tabs) {
  const el = pg.getByText(label, { exact: false }).first()
  try {
    await el.click({ timeout: 4000 })
    await pg.waitForTimeout(2200)
    await pg.screenshot({ path: `${OUT}/${name}.png` })
    console.log('shot:', name, 'OK')
  } catch { console.log('skip:', name, `(label not found: ${label})`) }
}

// صفحهٔ /emulator (پنل اندروید — با نشست مالک)
await pg.goto(`${B}/emulator`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2500)
await pg.screenshot({ path: `${OUT}/11-emulator-panel.png` })
console.log('shot: 11-emulator-panel', pg.url())
await br.close()
console.log('DONE3')
