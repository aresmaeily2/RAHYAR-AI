// V1-P3 — ابزار کمکی هارنس: ایجاد/شمارش حافظهٔ آزمون owner با شناسهٔ دقیق
// استفاده: bun scripts/v1-p3-memory-setup.ts add "<fact>" | count | del <contains>
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const op = process.argv[2] ?? 'count'
const arg = process.argv[3] ?? ''
const owner = await db.user.findFirst({ where: { username: 'owner' }, select: { id: true } })
if (!owner) {
  console.error('owner not found')
  process.exit(1)
}
if (op === 'add') {
  const m = await db.memory.create({ data: { userId: owner.id, fact: arg.slice(0, 200), source: 'chat' } })
  console.log(JSON.stringify({ ok: true, id: m.id, fact: m.fact }))
} else if (op === 'count') {
  const n = await db.memory.count({ where: { userId: owner.id } })
  console.log(JSON.stringify({ ok: true, count: n }))
} else if (op === 'del') {
  const d = await db.memory.deleteMany({ where: { userId: owner.id, fact: { contains: arg.slice(0, 100) } } })
  console.log(JSON.stringify({ ok: true, deleted: d.count }))
} else if (op === 'list') {
  const rows = await db.memory.findMany({ where: { userId: owner.id }, select: { id: true, fact: true }, orderBy: { createdAt: 'asc' } })
  console.log(JSON.stringify({ ok: true, rows }))
} else {
  console.error('unknown op')
  process.exit(1)
}
await db.$disconnect()
