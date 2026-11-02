// S9 exact-flow probe: chat-driven delete → pending → انصراف، با چاپ کامل
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'
const PW = process.env.RAHYAR_OWNER_PW ?? ''
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'owner', password: PW }),
})
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
const chat = async (message: string) => {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ message }),
  })
  return { status: r.status, j: await r.json().catch(() => ({})) as any }
}
const tag = Date.now().toString(36)
await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ title: `پروب حذف ${tag}`, priority: 2 }) })
const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id
const t = await db.task.findFirst({ where: { userId: uid, title: `پروب حذف ${tag}` } })

const d = await chat(`کار پروب حذف ${tag} را حذف کن.`)
console.log('d1 status:', d.status, '| actions:', JSON.stringify(d.j.actions?.map((a: any) => ({ t: a.type, ok: a.ok, pending: a.pending }))))
const p1 = await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } })
console.log('pending after delete-req:', p1 ? p1.value.slice(0, 100) : 'NULL')

const rc = await chat('انصراف')
console.log('cancel status:', rc.status)
console.log('cancel reply:', JSON.stringify(rc.j.assistantMessage?.content ?? rc.j).slice(0, 200))
console.log('cancel mode:', rc.j.mode ?? '(n/a)')
const p2 = await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } })
console.log('pending after cancel:', p2 ? p2.value.slice(0, 100) : 'CLEARED')
const canceled = await db.actionLog.findFirst({ where: { userId: uid, actionType: 'delete_task', status: 'canceled' }, orderBy: { createdAt: 'desc' } })
console.log('canceled log row:', canceled ? canceled.createdAt.toISOString() : 'NONE')
await db.$disconnect()
