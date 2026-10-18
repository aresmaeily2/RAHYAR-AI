// ─── آزمون زنده جداسازی کاربران (بخش ۱۲ دستور) ──────────────
// سناریو: مالک + کاربر آزمایشی دوم؛ تلاش هر طرف برای دسترسی به داده دیگری.
// در پایان: کاربر آزمایشی حذف (cascade) — داده مالک دست‌نخورده.
// اجرا: bun scripts/test-user-isolation.ts <baseURL>
const BASE = process.argv[2] ?? 'http://localhost:3100'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient()

function hash(password: string): string {
  const salt = crypto.randomBytes(16)
  const h = crypto.scryptSync(password, salt, 64, { N: 16384 })
  return `s1:${salt.toString('hex')}:${h.toString('hex')}`
}

interface Result {
  name: string
  pass: boolean
  detail: string
}
const results: Result[] = []
function record(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`)
}

async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ username, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const m = setCookie.match(/rahyar_session=([^;]+)/)
  if (!m) throw new Error(`login failed for ${username}: ${res.status}`)
  return m[1]
}

async function main() {
  // ۰) راه‌اندازی اولیه مالک (اگر هنوز sentinel است)
  const sessionRes = await fetch(`${BASE}/api/auth/session`)
  const sess = (await sessionRes.json()) as { setupPasswordPending?: boolean }
  if (sess.setupPasswordPending) {
    const res = await fetch(`${BASE}/api/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE },
      body: JSON.stringify({ username: 'owner', displayName: 'علیرضا', password: 'Test-Pass-1395!' }),
    })
    record('راه‌اندازی اولیه مالک', res.ok, `status=${res.status}`)
  }

  const ownerCookie = await login('owner', 'Test-Pass-1395!')
  record('ورود مالک', true, 'نشست صادر شد')

  // ۱) کاربر آزمایشی دوم + یک کار متعلق به او
  const iso = await db.user.upsert({
    where: { username: 'test-iso' },
    update: { passwordHash: hash('Iso-Pass-1395!') },
    create: {
      username: 'test-iso',
      displayName: 'کاربر آزمون جداسازی',
      passwordHash: hash('Iso-Pass-1395!'),
    },
  })
  const isoTask = await db.task.create({
    data: { userId: iso.id, title: 'کار خصوصی کاربر آزمون جداسازی', priority: 1 },
  })
  record('کاربر دوم + کار خصوصی', true, `userId=${iso.id.slice(0, 8)}… task=${isoTask.id.slice(0, 8)}…`)

  // ۲) مالک کارِ کاربر دوم را نمی‌بیند
  let r = await fetch(`${BASE}/api/tasks`, { headers: { Cookie: `rahyar_session=${ownerCookie}` } })
  const ownerTasks = (await r.json()) as { tasks: Array<{ id: string; title: string }> }
  const leaked = ownerTasks.tasks.some((t) => t.id === isoTask.id)
  record('جداسازی خواندن: مالک کارِ دیگری را نمی‌بیند', !leaked && r.ok, `status=${r.status} count=${ownerTasks.tasks.length}`)

  // ۳) مالک کارِ کاربر دوم را نمی‌تواند تغییر دهد
  r = await fetch(`${BASE}/api/tasks/${isoTask.id}`, {
    method: 'PATCH',
    headers: { Cookie: `rahyar_session=${ownerCookie}`, 'Content-Type': 'application/json', Origin: BASE },
    body: JSON.stringify({ title: 'هک شد' }),
  })
  record('جداسازی نوشتن: PATCH کار دیگری → 404', r.status === 404, `status=${r.status}`)

  // ۴) کاربر دوم کارِ مالک را نمی‌تواند حذف کند
  const isoCookie = await login('test-iso', 'Iso-Pass-1395!')
  const ownerTask = await db.task.findFirst({ where: { username: undefined, user: { username: 'owner' } } })
  if (ownerTask) {
    r = await fetch(`${BASE}/api/tasks/${ownerTask.id}`, {
      method: 'DELETE',
      headers: { Cookie: `rahyar_session=${isoCookie}`, Origin: BASE },
    })
    record('جداسازی حذف: DELETE کار مالک توسط دیگر → 404', r.status === 404, `status=${r.status}`)
  }

  // ۵) چت کاربر دوم حافظه مالک را نمی‌بیند
  r = await fetch(`${BASE}/api/memory`, { headers: { Cookie: `rahyar_session=${isoCookie}` } })
  const mem = (await r.json()) as { memories: unknown[] }
  const ownerMem = await db.memory.findFirst({ where: { user: { username: 'owner' } } })
  const memLeak = ownerMem && mem.memories?.some((m: { id: string }) => m.id === ownerMem.id)
  record('جداسازی حافظه: کاربر دوم حافظه مالک را نمی‌بیند', !memLeak, `status=${r.status}`)

  // ۶) idempotency: دو POST با یک clientKey → دومی duplicate
  const key = 'test-idem-' + Date.now()
  const body = JSON.stringify({ title: 'آزمون idempotency', clientKey: key })
  const p1 = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { Cookie: `rahyar_session=${ownerCookie}`, 'Content-Type': 'application/json', Origin: BASE },
    body,
  })
  const p2 = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { Cookie: `rahyar_session=${ownerCookie}`, 'Content-Type': 'application/json', Origin: BASE },
    body,
  })
  const d2 = (await p2.json()) as { duplicate?: boolean }
  record(
    'idempotency: POST تکراری با clientKey → duplicate=true',
    p1.status === 201 && p2.ok && d2.duplicate === true,
    `p1=${p1.status} p2=${p2.status}`,
  )

  // ۷) بدون Origin جعلی cross-site → 403 (CSRF)
  r = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: {
      Cookie: `rahyar_session=${ownerCookie}`,
      'Content-Type': 'application/json',
      Origin: 'https://evil.example.com',
      'Sec-Fetch-Site': 'cross-site',
    },
    body: JSON.stringify({ title: 'csrf' }),
  })
  record('CSRF: Origin cross-site → 403', r.status === 403, `status=${r.status}`)

  // ۸) پاک‌سازی کامل: کاربر آزمون جداسازی + کارهای آزمایشی مالک
  await db.user.delete({ where: { id: iso.id } }) // cascade کارش
  await db.task.deleteMany({ where: { user: { username: 'owner' }, title: { in: ['آزمون idempotency'] } } })
  await db.actionLog.deleteMany({ where: { user: { username: 'owner' }, detail: 'مسیر قطعی (بدون مدل)' } })
  const isoGone = (await db.user.findUnique({ where: { username: 'test-iso' } })) === null
  record('پاک‌سازی کاربر/داده آزمایشی', isoGone, 'cascade حذف شد')

  const failed = results.filter((x) => !x.pass)
  console.log(`\nنتیجه: ${results.length - failed.length}/${results.length} PASS`)
  await db.$disconnect()
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
