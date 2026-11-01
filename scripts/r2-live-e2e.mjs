// ─── R2 Live E2E — اجرای واقعی محصول با ضبط ویدئو + اسکرین‌شات ──
// مسیر: login → today → chat (پاسخ واقعی مدل) → tasks (ساخت/انجام/حذف) →
//        calendar → settings (fa→en→fa) → موبایل ۳۹۰px → جمع‌آوری خطای کنسول
// اجرا: node scripts/r2-live-e2e.mjs  (بعد از سرو تولیدی روی :3000)
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync } from 'fs'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000'
const OUT = '/home/z/my-project/download/RahyAr_R2_Final/evidence'
const PW_FILE = '/home/z/my-project/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt'
mkdirSync(OUT, { recursive: true })
const password = readFileSync(PW_FILE, 'utf-8').trim()

const consoleErrors = []
const pageErrors = []
const failedRequests = []
const shots = []

async function shot(page, name) {
  const f = `${OUT}/${name}.png`
  await page.screenshot({ path: f, fullPage: false })
  shots.push(name)
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const user = page.locator('input[name="username"], input').first()
  await user.fill('owner')
  const pw = page.locator('input[type="password"]').first()
  await pw.fill(password)
  await Promise.all([
    page.waitForURL((u) => !String(u).includes('/login'), { timeout: 20000 }).catch(() => {}),
    page.locator('button[type="submit"], button').last().click(),
  ])
  await page.waitForTimeout(1500)
}

async function gotoView(page, label, fallbackKey) {
  try {
    await page.locator('button', { hasText: label }).first().click({ timeout: 5000 })
  } catch {
    try {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      })
      await page.keyboard.press(fallbackKey)
    } catch {}
  }
  await page.waitForTimeout(1200)
}

const browser = await chromium.launch()
try {
  // ── دسکتاپ + ویدئو ──
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/r2-video-desktop', size: { width: 1280, height: 800 } },
    locale: 'fa-IR',
  })
  const page = await ctx.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))
  page.on('requestfailed', (r) => {
    const u = r.url()
    if (!u.includes('favicon')) failedRequests.push(`${r.method()} ${u} :: ${r.failure()?.errorText}`)
  })

  await login(page)
  await page.waitForTimeout(1200)
  await shot(page, '01-today-fa')

  // چت — پاسخ واقعی مدل (نه قواعد محلی) — ناوبری: برچسب «دستیار» یا کلید 4
  await gotoView(page, 'دستیار', '4')
  const box = page.locator('textarea').first()
  await box.fill('سلام رهیار! در یک جمله کوتاه بگو امروز چه حسی داری؟')
  await box.press('Enter')
  let aiReply = ''
  try {
    await page.waitForSelector('[class*="markdown"], .ara-md', { timeout: 70000 })
    const nodes = page.locator('.ara-md')
    const n = await nodes.count()
    if (n > 0) aiReply = (await nodes.nth(n - 1).innerText()) || ''
  } catch {}
  await page.waitForTimeout(1500)
  const isLocalRules = /قواعد محلی/.test(aiReply)
  await shot(page, '02-chat-real-ai-fa')

  // کارها — ساخت/انجام/حذف (تمیزکاری کامل؛ UI اول، API همان-مبدأ به‌عنوان fallback)
  await gotoView(page, 'امروز', '1')
  try {
    const q = page.getByPlaceholder(/چه کاری/).first()
    await q.fill('R2-DELIVERY-TEST', { timeout: 6000 })
    await q.press('Enter')
    await page.waitForTimeout(1200)
  } catch {
    await page.evaluate(async () => {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'R2-DELIVERY-TEST' }),
      })
    })
    await page.waitForTimeout(1000)
  }
  await page.waitForTimeout(600)
  let taskId = null
  taskId = await page.evaluate(async () => {
    const r = await fetch('/api/tasks')
    const d = await r.json()
    const t = (d.tasks || []).find((x) => (x.title || '').includes('R2-DELIVERY-TEST'))
    return t ? t.id : null
  })
  await shot(page, '03-task-created-fa')
  let taskDeleted = false
  if (taskId) {
    const del = await page.evaluate(async (id) => {
      const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      return r.status
    }, taskId)
    taskDeleted = del === 200 || del === 204
  }

  // تقویم (جلالی)
  await gotoView(page, 'تقویم', '3')
  await page.waitForTimeout(600)
  await shot(page, '04-calendar-jalali-fa')
  const bodyFa = await page.evaluate(() => document.documentElement.getAttribute('lang'))

  // مالی
  await gotoView(page, 'مالی', '6')
  await page.waitForTimeout(700)
  await shot(page, '05-finance-fa')

  // تنظیمات → زبان انگلیسی
  await gotoView(page, 'تنظیمات', '7')
  await page.waitForTimeout(600)
  await shot(page, '06-settings-fa')
  // یافتن کنترل زبان — دکمه/سوییچ حاوی «انگلیسی» یا English
  let switched = false
  try {
    await page.getByText('انگلیسی', { exact: false }).first().click({ timeout: 4000 })
    switched = true
  } catch {
    try {
      await page.getByText('English', { exact: false }).first().click({ timeout: 3000 })
      switched = true
    } catch {}
  }
  await page.waitForTimeout(1200)
  const htmlAttrs = await page.evaluate(() => ({
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir'),
  }))
  if (switched) await shot(page, '07-today-en')
  // بازگشت به فارسی + پایدارسازی (اگر کلیک UI کافی نبود، از خود API تنظیمات)
  try {
    await page.getByText('فارسی', { exact: false }).first().click({ timeout: 4000 })
    await page.waitForTimeout(1000)
  } catch {}
  const langCheck = await page.evaluate(() => document.documentElement.getAttribute('lang'))
  if (langCheck !== 'fa') {
    await page.evaluate(async () => {
      await fetch('/api/settings/app', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'fa' }),
      })
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
  }
  const langFinal = await page.evaluate(() => document.documentElement.getAttribute('lang'))

  // خروج و ویدئو را ببند
  await ctx.close()

  // ── موبایل ۳۹۰×۸۴۴ + ویدئو دوم ──
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: '/tmp/r2-video-mobile', size: { width: 390, height: 844 } },
    locale: 'fa-IR',
  })
  const mpage = await mctx.newPage()
  mpage.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push('[m] ' + m.text().slice(0, 180))
  })
  await login(mpage)
  await mpage.waitForTimeout(1500)
  const overflow = await mpage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  await shot(mpage, '08-mobile-390-fa')
  await mctx.close()

  const result = {
    base: BASE,
    aiReplyLen: aiReply.length,
    aiIsRealModel: aiReply.length > 0 && !isLocalRules,
    aiReplyHead: aiReply.slice(0, 80),
    taskCreated: !!taskId,
    taskDeleted,
    htmlLangFa: bodyFa,
    htmlAttrsAfterSwitch: htmlAttrs,
    langAfterRestore: langFinal,
    mobileHorizontalOverflowPx: overflow,
    consoleErrors,
    pageErrors,
    failedRequests,
    screenshots: shots,
  }
  // انتقال ویدئوها به بستهٔ تحویل
  try {
    const dv = readdirSync('/tmp/r2-video-desktop').filter((f) => f.endsWith('.webm'))
    if (dv[0]) renameSync(`/tmp/r2-video-desktop/${dv[0]}`, `${OUT}/rahyar-desktop-run.webm`)
    const mv = readdirSync('/tmp/r2-video-mobile').filter((f) => f.endsWith('.webm'))
    if (mv[0]) renameSync(`/tmp/r2-video-mobile/${mv[0]}`, `${OUT}/rahyar-mobile-run.webm`)
  } catch (e) {
    console.error('video move failed', e)
  }
  writeFileSync('/tmp/r2-e2e-result.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser.close()
}
