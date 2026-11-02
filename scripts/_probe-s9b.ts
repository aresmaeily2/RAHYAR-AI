// S9 full-dance probe: delete1 → بله → create t2 → delete2 → پندینگ؟ → انصراف
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
const mk = async (title: string) => {
  await fetch(`${BASE}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ title, priority: 2 }) })
}
const pend = async () => {
  const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id
  const row = await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } })
  return row ? row.value.slice(0, 90) : 'NULL'
}
const tag = Date.now().toString(36)

await mk(`پروب۲ حذف ${tag}`)
const d1 = await chat(`کار پروب۲ حذف ${tag} را حذف کن.`)
console.log('1) delete1:', JSON.stringify(d1.j.actions?.map((a: any) => `${a.type}:${a.ok ? 'ok' : 'pending'}`)), '| pending:', await pend())

const ry = await chat('بله')
console.log('2) yes:', ry.status, 'mode=', ry.j.mode, '| reply:', String(ry.j.assistantMessage?.content ?? '').slice(0, 60), '| pending:', await pend())

await mk(`پروب۲ انصراف ${tag}`)
const d3 = await chat(`کار پروب۲ انصراف ${tag} را حذف کن.`)
console.log('3) delete2:', JSON.stringify(d3.j.actions?.map((a: any) => `${a.type}:${a.ok ? 'ok' : 'pending'}`)), '| pending:', await pend())

const rc = await chat('انصراف')
console.log('4) cancel:', rc.status, 'mode=', rc.j.mode, '| reply:', String(rc.j.assistantMessage?.content ?? '').slice(0, 60), '| pending:', await pend())
const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id
const cl = await db.actionLog.findFirst({ where: { userId: uid, actionType: 'delete_task', status: 'canceled' }, orderBy: { createdAt: 'desc' } })
console.log('5) canceled log:', cl ? cl.createdAt.toISOString() : 'NONE')
await db.$disconnect()
