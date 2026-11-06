import { chromium } from 'playwright'
const B = 'http://127.0.0.1:3001'
const br = await chromium.launch()
const ctx = await br.newContext()
await ctx.request.post(`${B}/api/auth/login`, { data: { username: 'admin', password: 'admin' } })
const pg = await ctx.newPage()
pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 120)) })
pg.on('pageerror', e => console.log('PAGE-ERR:', String(e).slice(0, 120)))
await pg.goto(`${B}/finance`, { waitUntil: 'domcontentloaded' }).catch(e => console.log('goto-err:', String(e).slice(0, 80)))
await pg.waitForTimeout(4000)
console.log('URL:', pg.url())
console.log('BODY:', (await pg.locator('body').innerText().catch(() => '(inner failed)')).slice(0, 300).replace(/\n+/g, ' | '))
await br.close()
