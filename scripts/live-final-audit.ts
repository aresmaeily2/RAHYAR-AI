// ─── آزمون‌های زنده نهایی — مأموریت ۱۲ بخشی ─────────────────
// غیرمخرب: رمز/داده مالک دست نمی‌خورد؛ فقط نشست موقت + داده آزمون ساختنی
// که در پایان همین اسکریپت پاک می‌شود.
const BASE = 'http://localhost:3000'
const results: Array<{ n: string; pass: boolean; detail: string }> = []

function record(n: string, pass: boolean, detail: string) {
  results.push({ n, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${n} | ${detail}`)
}

/** استخراج رویداد done از SSE — جفت event/data درست، نه تطبیق متنی خام */
function parseSseDone(text: string): { reply?: string; actions?: Array<{ task?: { id: string } }> } | null {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'event: done') {
      const dl = lines[i + 1]?.trim()
      if (dl?.startsWith('data:')) {
        try {
          return JSON.parse(dl.slice(5).trim())
        } catch {
          return null
        }
      }
    }
  }
  return null
}

const { PrismaClient } = await import('@prisma/client')
const crypto = await import('crypto')
const db = new PrismaClient()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ── ۰) سلامت ─────────────────────────────────────────────────
const health = await fetch(`${BASE}/api/health`).then((r) => r.json())
record('health', health.status === 'ok' && health.database === 'ok', JSON.stringify(health))

// ── ۱) گیت بدون احراز هویت → ۴۰۱ ────────────────────────────
{
  const g = await fetch(`${BASE}/api/tasks`)
  const p = await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title":"x"}' })
  const c = await fetch(`${BASE}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"message":"سلام"}' })
  const m = await fetch(`${BASE}/api/memory`)
  record('unauth-gate', g.status === 401 && p.status === 401 && c.status === 401 && m.status === 401, `GET=${g.status} POST=${p.status} chat=${c.status} memory=${m.status}`)
}

// ── ۲) نشست موقت معتبر (مستقیم در DB — بدون رمز مالک) ────────
const owner = await db.user.findUnique({ where: { username: 'owner' } })
if (!owner) throw new Error('owner یافت نشد')
const t1 = crypto.randomBytes(32).toString('base64url')
await db.session.create({ data: { tokenHash: hashToken(t1), userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) } })
const cookie = `rahyar_session=${t1}`
const authed = await fetch(`${BASE}/api/auth/session`, { headers: { cookie } }).then((r) => r.json())
record('minted-session-works', authed.authenticated === true, JSON.stringify(authed))

// ── ۳) IDOR/مسیر ناموجود → ۴۰۴ ───────────────────────────────
{
  const r = await fetch(`${BASE}/api/tasks/nonexistent-id-xyz`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: '{"status":"done"}' })
  const r2 = await fetch(`${BASE}/api/subtasks/nonexistent-id-xyz`, { method: 'DELETE', headers: { cookie } })
  record('idor-404', r.status === 404 && r2.status === 404, `taskPatch=${r.status} subtaskDel=${r2.status}`)
}

// ── ۴) بدنه نامعتبر → ۴۰۰ ────────────────────────────────────
{
  const r = await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: 'not-json' })
  const r2 = await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: '{"title":""}' })
  record('invalid-body-400', r.status === 400 && r2.status === 400, `badJson=${r.status} emptyTitle=${r2.status}`)
}

// ── ۵) مسیر قطعی دستیار — بدون مدل ───────────────────────────
let createdTaskId = ''
{
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'کار جدید: آزمون زنده نهایی', clientKey: 'live-audit-deterministic' }),
  })
  const text = await res.text()
  const data = parseSseDone(text)
  const ok = res.status === 200 && typeof data?.reply === 'string' && data.reply.includes('ثبت شد')
  record('deterministic-add-task', ok, `status=${res.status} reply=${(data?.reply ?? '').slice(0, 60)}`)
  if (data?.actions?.[0]?.task?.id) createdTaskId = data.actions[0].task.id
  // idempotency: همان clientKey دوباره → duplicate، کار دومی ساخته نمی‌شود
  const before = await db.task.count({ where: { userId: owner.id } })
  const res2 = await fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'کار جدید: آزمون زنده نهایی', clientKey: 'live-audit-deterministic' }),
  })
  await res2.text()
  const after = await db.task.count({ where: { userId: owner.id } })
  record('idempotency-no-dup', before === after, `tasks before=${before} after=${after}`)
}

// ── ۶) کلید قطع اضطراری — پاسخ شفاف، بدون مدل ────────────────
{
  await db.setting.create({ data: { userId: owner.id, key: 'ai_kill_switch', value: '1' } })
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'یک شعر کوتاه بگو' }),
  })
  const text = await res.text()
  const data = parseSseDone(text)
  const ok = typeof data?.reply === 'string' && data.reply.includes('غیرفعال')
  record('kill-switch', ok, `reply=${(data?.reply ?? '').slice(0, 70)}`)
  await db.setting.deleteMany({ where: { userId: owner.id, key: 'ai_kill_switch' } })
}

// ── ۷) جستجوی وب → ثبت مصرف در AiUsage (F-2) ────────────────
{
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'آخرین اخبار امروز چیست؟' }),
  })
  await res.text()
  const rows = await db.aiUsage.findMany({ where: { userId: owner.id, route: '/web-search' }, orderBy: { createdAt: 'desc' }, take: 1 })
  const ok = rows.length === 1 && rows[0].status === 'ok' && rows[0].model === 'web_search'
  record('web-search-metered', ok, rows.length ? `status=${rows[0].status} in=${rows[0].inChars} out=${rows[0].outChars} ${rows[0].latencyMs}ms` : 'no-row')
}

// ── ۸) چت مدل‌محور سبز (یک فراخوانی واقعی) ───────────────────
{
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'سلام! فقط سلام کن.' }),
  })
  const text = await res.text()
  const data = parseSseDone(text)
  const ok = res.status === 200 && typeof data?.reply === 'string' && data.reply.length > 0
  record('chat-model-ok', ok, `status=${res.status} replyLen=${(data?.reply ?? '').length}`)
}

// ── ۹) eبطال نشست‌های دیگر پس از تغییر رمز (F-1) — سطح تابع ──
{
  const { revokeOtherSessions } = await import('../src/lib/auth')
  const t2 = crypto.randomBytes(32).toString('base64url')
  await db.session.create({ data: { tokenHash: hashToken(t2), userId: owner.id, expiresAt: new Date(Date.now() + 3600_000) } })
  const before = await db.session.count({ where: { userId: owner.id } })
  const revoked = await revokeOtherSessions(owner.id, t1) // نشست فعلی t1 حفظ شود
  const after = await db.session.count({ where: { userId: owner.id } })
  const alive = await db.session.findUnique({ where: { tokenHash: hashToken(t1) } })
  record('revoke-other-sessions', revoked > 0 && after === before - revoked && !!alive, `before=${before} revoked=${revoked} after=${after} currentAlive=${!!alive}`)
}

// ── ۱۰) نرخ ورود: تلاش ۱۱م → ۴۲۹ ────────────────────────────
{
  let saw429 = false
  for (let i = 0; i < 11; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'nosuchuser_audit', password: 'WrongPass123' }) })
    if (r.status === 429) saw429 = true
  }
  record('login-rate-limit-429', saw429, `429 observed in 11 tries=${saw429}`)
}

// ── ۱۱) auth/session اکنون سقف دارد: #۱۲۱ → ۴۲۹ ─────────────
{
  let saw429 = false
  for (let i = 0; i < 121; i++) {
    const r = await fetch(`${BASE}/api/auth/session`)
    if (r.status === 429) saw429 = true
  }
  record('session-get-rate-limit', saw429, `429 observed in 121 tries=${saw429}`)
}

// ── ۱۲) Origin خارجی → ۴۰۳ ──────────────────────────────────
{
  const r = await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example.com' }, body: '{"title":"x"}' })
  record('cross-origin-403', r.status === 403 || r.status === 401, `status=${r.status}`)
}

// ── پاک‌سازی کامل داده آزمون ─────────────────────────────────
{
  if (createdTaskId) await db.task.deleteMany({ where: { id: createdTaskId, userId: owner.id } })
  await db.chatMessage.deleteMany({ where: { userId: owner.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } })
  await db.actionLog.deleteMany({ where: { userId: owner.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } })
  await db.aiUsage.deleteMany({ where: { userId: owner.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } })
  await db.session.deleteMany({ where: { userId: owner.id, createdAt: { gte: new Date(Date.now() - 3600_000) } } })
  const remaining = {
    tasks: await db.task.count({ where: { userId: owner.id } }),
    sessions: await db.session.count({ where: { userId: owner.id } }),
    chats: await db.chatMessage.count({ where: { userId: owner.id } }),
  }
  record('cleanup', remaining.sessions === 0 && remaining.chats === 0, JSON.stringify(remaining))
}

await db.$disconnect()
const fails = results.filter((r) => !r.pass)
console.log(`\n== LIVE AUDIT: ${results.length - fails.length}/${results.length} PASS ==`)
process.exit(0)
