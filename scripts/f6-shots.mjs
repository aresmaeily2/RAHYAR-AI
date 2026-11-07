// F6 fresh web screenshots v2 — correct in-shell navigation (per grand-e2e.mjs)
import { chromium } from 'playwright'
import fs from 'fs'
const B = 'http://127.0.0.1:3001'
const OUT = 'artifacts/reports/f6/shots'
fs.mkdirSync(OUT, { recursive: true })
const read = (p) => fs.readFileSync(p, 'utf8')
const OP = read('artifacts/credentials/f5-owner-credentials.txt').match(/owner_password=(.+)/)?.[1]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
// login
await page.goto(B + '/login', { waitUntil: 'networkidle' })
await page.fill('input[name=username], #username, input[type=text]', 'owner').catch(() => {})
await page.fill('input[type=password]', OP)
await page.keyboard.press('Enter')
await page.waitForTimeout(3500)
// enable weather chip (best-effort, same settings route as E2E F8)
await page.evaluate(() =>
  fetch('/api/settings/app', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weather: { enabled: true, city: 'تهران' } }) })
).catch(() => {})
await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(3500)
await page.screenshot({ path: `${OUT}/02-home-fa.png` })
// dark
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${OUT}/03-home-dark.png` })
await page.emulateMedia({ colorScheme: 'light' })
// settings fa (in-shell view)
await page.click('button:has-text("تنظیمات")')
await page.waitForTimeout(2200)
await page.screenshot({ path: `${OUT}/04-settings-fa.png` })
// en dashboard + en settings
await page.evaluate(() => fetch('/api/settings/app', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: 'en' }) }))
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${OUT}/05-dashboard-en.png` })
await page.click('button:has-text("Calendar"), button:has-text("Settings")').catch(() => {})
await page.click('button:has-text("Settings")').catch(() => {})
await page.waitForTimeout(2200)
await page.screenshot({ path: `${OUT}/06-settings-en.png` })
// restore fa for owner
await page.evaluate(() => fetch('/api/settings/app', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: 'fa' }) }))
console.log('v2 shots done:', fs.readdirSync(OUT).join(', '))
await browser.close()
