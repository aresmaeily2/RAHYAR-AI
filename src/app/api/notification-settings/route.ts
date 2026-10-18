import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { normalizeReminderSettings } from '@/lib/notifications/settings'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'

const KEY = 'reminderSettings'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    const row = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: KEY } },
    })
    let parsed: unknown = null
    try {
      parsed = row ? JSON.parse(row.value) : null
    } catch {
      parsed = null
    }
    return NextResponse.json({ settings: normalizeReminderSettings(parsed) })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/notification-settings', e)
    return NextResponse.json({ error: 'خطا در دریافت تنظیمات اعلان' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = await readJsonSafe(req)
    const settings = normalizeReminderSettings(body)
    const value = JSON.stringify(settings)
    await db.setting.upsert({
      where: { userId_key: { userId: user.id, key: KEY } },
      update: { value },
      create: { userId: user.id, key: KEY, value },
    })
    return NextResponse.json({ settings })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PUT /api/notification-settings', e)
    return NextResponse.json({ error: 'خطا در ذخیره تنظیمات اعلان' }, { status: 500 })
  }
}
