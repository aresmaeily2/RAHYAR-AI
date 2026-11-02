// S6 mini probe — full response dump
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'
const PW = process.env.RAHYAR_OWNER_PW ?? ''
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'owner', password: PW }),
})
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
const r = await fetch(`${BASE}/api/chat`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ message: 'قرار دکتر را فردا ساعت ۱۰ صبح به تقویم اضافه کن و ۳۰ دقیقه قبل یادم بنداز.', clientKey: `s6p-${Date.now()}` }),
})
const j = await r.json().catch(() => ({})) as any
console.log('status:', r.status, '| mode:', j.mode)
console.log('actions:', JSON.stringify(j.actions))
console.log('reply:', String(j.assistantMessage?.content ?? '').slice(0, 200).replace(/\n/g, ' | '))
const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id
const t = await db.task.findFirst({ where: { userId: uid, title: { contains: 'دکتر' } }, orderBy: { createdAt: 'desc' } })
const rem = t ? await db.reminder.findFirst({ where: { userId: uid, taskId: t.id } }) : null
console.log('dbTask:', t?.title, t?.dueTime, '| linkedRemindAt:', rem?.remindAt.toISOString())
const logs = await db.actionLog.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 5, select: { actionType: true, status: true, detail: true } })
console.log('recentLog:', JSON.stringify(logs))
await db.$disconnect()
