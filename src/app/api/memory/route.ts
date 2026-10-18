import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'
import type { MemoryT } from '@/lib/types'

function serialize(m: { id: string; fact: string; source: string; createdAt: Date }): MemoryT {
  return { id: m.id, fact: m.fact, source: m.source, createdAt: m.createdAt.toISOString() }
}

/** فهرست حافظه دستیار — فقط حافظه کاربر نشست */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const rows = await db.memory.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 })
    return NextResponse.json({ memories: rows.map(serialize) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/memory', e)
    return NextResponse.json({ error: 'خطا در دریافت حافظه' }, { status: 500 })
  }
}

/** افزودن حافظه دستی از طرف کاربر */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req)
    const fact = cleanText((body as { fact?: unknown })?.fact, 200)
    if (fact.length < 2) {
      return NextResponse.json({ error: 'متن حافظه خیلی کوتاه است' }, { status: 400 })
    }
    const count = await db.memory.count({ where: { userId: user.id } })
    if (count >= 100) {
      return NextResponse.json({ error: 'حافظه پر است؛ چند مورد را حذف کن' }, { status: 400 })
    }
    const dup = await db.memory.findFirst({ where: { fact, userId: user.id } })
    if (dup) return NextResponse.json({ memory: serialize(dup) })
    const m = await db.memory.create({ data: { userId: user.id, fact, source: 'manual' } })
    return NextResponse.json({ memory: serialize(m) }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/memory', e)
    return NextResponse.json({ error: 'خطا در ثبت حافظه' }, { status: 500 })
  }
}

/** حذف یک خاطره */
export async function DELETE(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const body = await readJsonSafe(req)
    const id = typeof (body as { id?: unknown })?.id === 'string' ? (body as { id: string }).id : ''
    if (!id) return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 })
    const user = await requireUser(req)
    await db.memory.deleteMany({ where: { id, userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('DELETE /api/memory', e)
    return NextResponse.json({ error: 'خطا در حذف حافظه' }, { status: 500 })
  }
}
