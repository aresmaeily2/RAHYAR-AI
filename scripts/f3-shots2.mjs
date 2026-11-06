import { chromium } from 'playwright'
const B = 'http://127.0.0.1:3001'
const OUT = '/home/z/my-project/artifacts/reports/f3/shots'
const br = await chromium.launch()
const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } })
const lr = await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
console.log('login:', lr.status())
const pg = await ctx.newPage()
for (const [name, path] of [['03-finance-fa', '/finance'], ['04-chat-fa', '/chat'], ['05-tasks-en', '/tasks']]) {
  await pg.goto(B + path, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  await pg.waitForTimeout(3500)
  await pg.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot:', name, pg.url())
}
// en switch for a second en shot of dashboard
await ctx.request.put(`${B}/api/settings/app`, { data: { lang: 'en' } })
await pg.goto(B + '/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
await pg.waitForTimeout(2500)
await pg.screenshot({ path: `${OUT}/06-dashboard-en.png` })
await ctx.request.put(`${B}/api/settings/app`, { data: { lang: 'fa' } })
await br.close()
console.log('DONE2')
