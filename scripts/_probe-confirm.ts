// ایزوله‌سازی مسیر تأیید: set مستقیم → خواندن مستقیم → فراخوانی API
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'
const PW = process.env.RAHYAR_OWNER_PW ?? ''

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'owner', password: PW }),
})
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id

// ۱) pending را مستقیم در DB بنویس (همان کاری که executor می‌کند)
const value = JSON.stringify({ type: 'delete_task', taskId: 'probe-task-id', title: 'پروب تأیید', savedAt: new Date().toISOString() })
await db.setting.upsert({ where: { userId_key: { userId: uid, key: 'pending_action' } }, create: { userId: uid, key: 'pending_action', value }, update: { value } })
console.log('pending written')

// ۲) بخوان (همان تابع route — import از سورس)
const { getPendingAction } = await import('../src/lib/assistant/pending-action')
const op = await getPendingAction(uid)
console.log('getPendingAction:', JSON.stringify(op))

// ۳) CANCEL_RE را مستقیم بسنج
const { CANCEL_RE, CONFIRM_RE } = await import('../src/lib/assistant/pending-action')
console.log('CANCEL_RE(انصراف):', CANCEL_RE.test('انصراف'), '| CONFIRM_RE(انصراف):', CONFIRM_RE.test('انصراف'))

// ۴) API را صدا بزن
const r = await fetch(`${BASE}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ message: 'انصراف' }),
})
const j = await r.json().catch(() => ({}))
console.log('API status:', r.status, '| reply:', JSON.stringify(j.assistantMessage?.content ?? j.error ?? j).slice(0, 150))

// ۵) وضعیت pending بعد از API
const after = await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } })
console.log('pending after API:', after ? after.value.slice(0, 80) : 'CLEARED')
await db.$disconnect()
