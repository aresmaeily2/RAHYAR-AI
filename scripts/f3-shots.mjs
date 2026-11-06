// F3-SHOTS: تصاویر واقعی صفحات وب (بند ۷.۹) — fa/en، با نشست واقعی مالک
import { chromium } from 'playwright'
import fs from 'node:fs'

const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f3/shots'
fs.mkdirSync(OUT, { recursive: true })

const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const pg = await ctx.newPage()
const shot = async (name) => { await pg.waitForTimeout(700); await pg.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); console.log('shot:', name, pg.url()) }

// 1) login page (fa)
await pg.goto(`${B}/login`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await shot('01-login-fa')

// 2) real owner login via API (session cookie into context)
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
console.log('login api:', lr.status())
await pg.goto(`${B}/`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(1200)
await shot('02-dashboard-after-login')

// 3) finance page
await pg.goto(`${B}/finance`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await shot('03-finance-fa')

// 4) AI chat page
await pg.goto(`${B}/chat`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await shot('04-chat-fa')

// 5) switch lang to en (real API) then reload
await ctx.request.put(`${B}/api/settings/app`, { data: { lang: 'en' } }).catch(() => {})
await pg.goto(`${B}/tasks`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
await shot('05-tasks-en')
await ctx.request.put(`${B}/api/settings/app`, { data: { lang: 'fa' } }).catch(() => {})

await br.close()
console.log('DONE shots')
