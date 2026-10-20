// شات‌های تکمیلی تحویل: مدیریت کاربران + ورود انگلیسی
const path = require('path')
const fs = require('fs')
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const BASE = 'http://localhost:3000'
const SHOTS = '/home/z/my-project/download/screenshots'
const TOKEN = fs.readFileSync('/home/z/my-project/artifacts/preview/session-token.txt', 'utf-8').trim()
const HIDE = 'nextjs-portal{display:none!important}'
const cookie = { name: 'rahyar_session', value: TOKEN, domain: 'localhost', path: '/' }

;(async () => {
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] })

  // 17/18 — تنظیمات با کارت مدیریت کاربران (فارسی) — SPA: نماها داخل /
  const fa = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fa-IR' })
  const p1 = await fa.newPage()
  await fa.addCookies([cookie])
  await p1.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p1.addStyleTag({ content: HIDE })
  await p1.waitForTimeout(2000)
  await p1.getByRole('button', { name: /تنظیمات/ }).first().click()
  await p1.waitForTimeout(2500)
  await p1.screenshot({ path: path.join(SHOTS, '17-users-admin-full.png'), fullPage: false })
  // اسکرول به جدول کاربران اگر موجود بود
  const tbl = p1.locator('table').first()
  if (await tbl.count()) {
    await tbl.scrollIntoViewIfNeeded().catch(() => {})
    await p1.waitForTimeout(600)
    await p1.screenshot({ path: path.join(SHOTS, '18-users-table.png'), fullPage: false })
    console.log('users table found')
  } else { console.log('no table el — 18 skipped') }
  console.log('shots 17-18 settings/users ok')
  await fa.close()

  // 19 — صفحه ورود انگلیسی (LTR)
  const en = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US' })
  const p2 = await en.newPage()
  await p2.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await p2.addStyleTag({ content: HIDE })
  await p2.waitForTimeout(2500)
  await p2.screenshot({ path: path.join(SHOTS, '19-login-english.png') })
  console.log('shot 19 login-en ok')
  await en.close()

  // 20 — داشبورد امروز موبایل (Android viewport) — SPA root
  const mob = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, locale: 'fa-IR', isMobile: true, hasTouch: true })
  const p3 = await mob.newPage()
  await mob.addCookies([cookie])
  await p3.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p3.addStyleTag({ content: HIDE })
  await p3.waitForTimeout(2200)
  await p3.screenshot({ path: path.join(SHOTS, '20-mobile-today.png') })
  console.log('shot 20 mobile ok')
  await mob.close()

  await browser.close()
  console.log('EXTRA_DONE')
})().catch(e => { console.error('EXTRA_FAIL', e.message); process.exit(1) })
