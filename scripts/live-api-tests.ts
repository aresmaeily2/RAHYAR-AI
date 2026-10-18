// ─── تست‌های زنده API/امنیت «آرا» — با پاک‌سازی کامل ──────────
// اجرا: bun /home/z/my-project/scripts/live-api-tests.ts
// پیش‌نیاز: سرور dev روی پورت ۳۰۰۰
const BASE = 'http://localhost:3000'
let pass = 0
let fail = 0
const createdTaskIds: string[] = []

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    pass++
    console.log(`PASS | ${name}${detail ? ' | ' + detail : ''}`)
  } else {
    fail++
    console.log(`FAIL | ${name}${detail ? ' | ' + detail : ''}`)
  }
}

async function j(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(text)
  } catch {}
  return { status: res.status, data, headers: res.headers }
}

async function getTaskCount(): Promise<number> {
  const r = await j('GET', '/api/tasks')
  return Array.isArray((r.data as { tasks?: unknown[] })?.tasks)
    ? (r.data as { tasks: unknown[] }).tasks.length
    : -1
}

// ─── ۱) گارد Same-Origin: مبدأ خارجی → ۴۰۳ ─────────────────
{
  const r = await j('POST', '/api/tasks', { title: 'تست تزریق' }, { Origin: 'https://evil.example.com' })
  check('cross-origin POST → 403', r.status === 403, `status=${r.status}`)
}
{
  const r = await j(
    'POST',
    '/api/tasks',
    { title: 'تست' },
    { 'Sec-Fetch-Site': 'cross-site' },
  )
  check('sec-fetch-site cross-site → 403 (رفع L9)', r.status === 403, `status=${r.status}`)
}

// ─── ۲) بدنه chunked بزرگ بدون content-length → رد (رفع M4) ──
{
  const big = '{"title":"' + 'الف'.repeat(60_000) + '"}'
  const res = await fetch(BASE + '/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
    body: big, // ~۲۴۰KB — باید در خواندن افزایشی در سقف ۱۰۰KB قطع شود
  })
  check('chunked ~۲۴۰KB بدون content-length → رد (۴۰۰)', res.status === 400, `status=${res.status}`)
}

// ─── ۳) شمارش صحیح added در breakdown (رفع H2) ────────────────
{
  const t = await j('POST', '/api/tasks', { title: 'آزمون added کار موقت' })
  const task = (t.data as { task?: { id: string } })?.task
  check('ایجاد کار آزمون → 201', t.status === 201 && !!task?.id)
  if (task?.id) {
    createdTaskIds.push(task.id)
    const b = await j('POST', `/api/tasks/${task.id}/breakdown`)
    const d = b.data as { added?: number; task?: { subtasks: unknown[] } }
    check(
      'breakdown: added == تعداد واقعی زیرکار',
      b.status === 200 && typeof d.added === 'number' && d.added === d.task?.subtasks.length,
      `added=${d.added} actual=${d.task?.subtasks.length}`,
    )
  }
}

// ─── ۴) idempotency بوت‌استرپ + همزمانی GET (رفع M7) ─────────
{
  const before = await getTaskCount()
  const b1 = await j('POST', '/api/tasks/bootstrap')
  const b2 = await j('POST', '/api/tasks/bootstrap')
  const after = await getTaskCount()
  const d1 = b1.data as { ok?: boolean; skipped?: boolean }
  const d2 = b2.data as { ok?: boolean; skipped?: boolean }
  check('bootstrap دو بار → count ثابت', before === after && before > 0, `before=${before} after=${after}`)
  check('bootstrap پاسخ معتبر', b1.status === 200 && b2.status === 200 && d1.ok && d2.ok)

  const results = await Promise.all(Array.from({ length: 6 }, () => j('GET', '/api/tasks')))
  const counts = results.map((r) => ((r.data as { tasks?: unknown[] }).tasks ?? []).length)
  const allEqual = counts.every((c) => c === counts[0])
  const allOk = results.every((r) => r.status === 200)
  check('۶ GET همزمان → همه ۲۰۰ و count یکسان (بدون seed/respawn مضاعف)', allOk && allEqual, counts.join(','))
}

// ─── ۵) حذف آبشاری: کار → زیرکار + یادآوری (فاز ۳ مأموریت) ──
{
  const t = await j('POST', '/api/tasks', { title: 'آزمون آبشاری کار موقت', dueTime: '10:00' })
  const task = (t.data as { task?: { id: string } })?.task
  if (task?.id) {
    createdTaskIds.push(task.id)
    const s = await j('POST', '/api/subtasks', { taskId: task.id, title: 'زیرکار آزمون آبشاری' })
    check('ایجاد زیرکار → 201', s.status === 201)
    const r = await j('POST', '/api/reminders', {
      message: 'یادآوری آزمون آبشاری',
      remindAt: new Date(Date.now() + 3600_000).toISOString(),
      taskId: task.id,
    })
    const remId = (r.data as { reminder?: { id: string } })?.reminder?.id
    check('ایجاد یادآوری متصل → 201', r.status === 201 && !!remId)
    const del = await j('DELETE', `/api/tasks/${task.id}`)
    check('حذف کار → 200', del.status === 200)
    createdTaskIds.pop() // خودش حذف شد
    const rems = await j('GET', '/api/reminders')
    const stillThere = ((rems.data as { reminders?: Array<{ id: string }> }).reminders ?? []).some(
      (x) => x.id === remId,
    )
    check('یادآوری متصل با حذف کار پاک شد (cascade)', !stillThere)
  }
}

// ─── ۶) یادآوری گذشته از مسیر REST رد شود ────────────────────
{
  const r = await j('POST', '/api/reminders', {
    message: 'گذشته',
    remindAt: new Date(Date.now() - 7200_000).toISOString(),
  })
  check('یادآوری در گذشته → 400', r.status === 400, `status=${r.status}`)
}

// ─── ۷) سقف نرخ: پروفایل PUT بعد از ۱۰ بار → ۴۲۹ ────────────
{
  let got429 = false
  for (let i = 0; i < 12; i++) {
    const r = await j('PUT', '/api/profile', { name: 'علیرضا' })
    if (r.status === 429) {
      got429 = true
      break
    }
  }
  check('rate limit پروفایل → 429', got429)
}

// ─── پاک‌سازی: حذف کارهای آزمون ───────────────────────────────
let cleaned = 0
for (const id of createdTaskIds) {
  const r = await j('DELETE', `/api/tasks/${id}`)
  if (r.status === 200) cleaned++
}
console.log(`\nپاک‌سازی: ${cleaned}/${createdTaskIds.length} کار آزمون حذف شد`)
console.log(`\nنتیجه: ${pass} PASS | ${fail} FAIL`)
process.exit(fail > 0 ? 1 : 0)
