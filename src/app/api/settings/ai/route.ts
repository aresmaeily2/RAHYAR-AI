import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { getEngineStatus } from '@/lib/ai/providers/registry'
import { validateEndpointUrl, isAiEngineId } from '@/lib/ai/providers/types'
import {
  getUserSetting,
  setUserSetting,
  deleteUserSetting,
  SETTING_KEYS,
} from '@/lib/server-settings'

/** وضعیت موتور AI کاربر — کلید هرگز برگردانده نمی‌شود (فقط ماسک) */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 60, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const status = await getEngineStatus(user.id)
    const killSwitch = (await getUserSetting(user.id, 'ai_kill_switch')) === '1'
    return NextResponse.json({ ...status, killSwitch })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/settings/ai', e)
    return NextResponse.json({ error: 'خطا در دریافت تنظیمات هوش مصنوعی' }, { status: 500 })
  }
}

/**
 * ذخیره موتور و Endpoint —
 *   engine: local_rules | openai_compatible
 *   endpointUrl / endpointModel: متن آزاد اعتبارسنجی‌شده
 *   endpointKey: مقدار جدید ذخیره؛ «-» یعنی حذف؛ خالی یعنی بدون تغییر
 */
export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 15, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      engine?: unknown
      endpointUrl?: unknown
      endpointKey?: unknown
      endpointModel?: unknown
      killSwitch?: unknown
    } | null

    if (body?.killSwitch !== undefined) {
      if (body.killSwitch === true) {
        await setUserSetting(user.id, 'ai_kill_switch', '1')
      } else {
        await deleteUserSetting(user.id, 'ai_kill_switch')
      }
    }

    if (body?.engine !== undefined) {
      if (!isAiEngineId(body.engine)) {
        return NextResponse.json({ error: 'موتور نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.aiEngine, body.engine)
    }

    if (body?.endpointUrl !== undefined) {
      if (body.endpointUrl === '') {
        await deleteUserSetting(user.id, SETTING_KEYS.aiEndpointUrl)
      } else {
        const url = validateEndpointUrl(body.endpointUrl)
        if (!url) return NextResponse.json({ error: 'آدرس Endpoint نامعتبر است (فقط http/https)' }, { status: 400 })
        await setUserSetting(user.id, SETTING_KEYS.aiEndpointUrl, url)
      }
    }

    if (body?.endpointModel !== undefined) {
      const m = typeof body.endpointModel === 'string' ? body.endpointModel.trim().slice(0, 80) : ''
      if (m) await setUserSetting(user.id, SETTING_KEYS.aiEndpointModel, m)
      else await deleteUserSetting(user.id, SETTING_KEYS.aiEndpointModel)
    }

    if (body?.endpointKey !== undefined) {
      if (body.endpointKey === '-') {
        await deleteUserSetting(user.id, SETTING_KEYS.aiEndpointKey)
      } else if (typeof body.endpointKey === 'string' && body.endpointKey.trim()) {
        await setUserSetting(user.id, SETTING_KEYS.aiEndpointKey, body.endpointKey.trim().slice(0, 200))
      }
    }

    const status = await getEngineStatus(user.id)
    const killSwitch = (await getUserSetting(user.id, 'ai_kill_switch')) === '1'
    return NextResponse.json({ ...status, killSwitch })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PUT /api/settings/ai', e)
    return NextResponse.json({ error: 'خطا در ذخیره تنظیمات هوش مصنوعی' }, { status: 500 })
  }
}
