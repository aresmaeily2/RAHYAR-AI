// آزمون متمرکز: آیا یک Enter = دقیقاً یک پیام؟
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
const password = readFileSync('/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt', 'utf-8').trim()
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'networkidle' })
await page.locator('input').first().fill('owner')
await page.locator('input[type="password"]').first().fill(password)
await page.locator('button[type="submit"]').first().click()
await page.waitForTimeout(3000)
console.log('url-after-login:', page.url())
const errText = await page.locator('[role="alert"]').first().innerText().catch(() => '')
console.log('login-alert:', errText.slice(0, 80))
await page.waitForTimeout(1500)
const dockBtn = page.locator('button', { hasText: 'Assistant' }).first()
console.log('dock-count:', await dockBtn.count())
await dockBtn.click()
await page.waitForTimeout(1500)
const box = page.locator('textarea').first()
await box.fill('تست-تک-ارسال-R2')
await box.press('Enter')
await page.waitForTimeout(6000)
const rows = await page.evaluate(async () => {
  const r = await fetch('/api/chat')
  const d = await r.json()
  return (d.messages || []).filter((m) => (m.content || '').includes('تست-تک-ارسال-R2')).length
})
console.log(JSON.stringify({ userRowsForSingleEnter: rows }))
// تمیزکاری
await page.evaluate(async () => {
  const r = await fetch('/api/chat')
  const d = await r.json()
  for (const m of d.messages || []) {
    if ((m.content || '').includes('تست-تک-ارسال-R2')) {
      await fetch(`/api/chat?messageId=${m.id}`, { method: 'DELETE' }).catch(() => {})
    }
  }
})
await browser.close()
