import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { getEngineStatus } from '@/lib/ai/providers/registry'
import { validateEndpointUrl, isAiEngineId, endpointHostAllowed } from '@/lib/ai/providers/types'
import { isPresetEngine, providerSettingKey, type PresetEngineId } from '@/lib/ai/providers/presets'
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
 * ذخیره موتور و پیکربندی — F5:
 *   engine: هر یک از ده موتور (isAiEngineId)
 *   Providerهای نام‌دار (openai/claude/gemini/deepseek/openrouter/ollama/lmstudio):
 *     key / model / url → در ai_key:<id> / ai_model:<id> / ai_url:<id> ذخیره می‌شود
 *     «-» یعنی حذف مقدار؛ خالی یعنی بدون تغییر
 *   openai_compatible: همان endpointUrl/endpointModel/endpointKey قبلی
 * کلید ذخیره‌شده هرگز در پاسخ برنمی‌گردد (فقط ماسک از getEngineStatus).
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
      key?: unknown
      model?: unknown
      url?: unknown
      killSwitch?: unknown
    } | null

    if (body?.killSwitch !== undefined) {
      if (body.killSwitch === true) {
        await setUserSetting(user.id, 'ai_kill_switch', '1')
      } else {
        await deleteUserSetting(user.id, 'ai_kill_switch')
      }
    }

    let targetPreset: string | null = null
    if (body?.engine !== undefined) {
      if (!isAiEngineId(body.engine)) {
        return NextResponse.json({ error: 'موتور نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.aiEngine, body.engine)
      if (isPresetEngine(body.engine)) targetPreset = body.engine
    }

    // ── اعتبارسنجی URL (مشترک برای هر دو مسیر) ──
    async function checkUrl(raw: unknown): Promise<string | null> {
      if (raw === '' || raw === undefined || raw === null) return ''
      const url = validateEndpointUrl(raw)
      if (!url) return null
      if (user.role !== 'OWNER') {
        const { lookup } = await import('node:dns/promises')
        const host = new URL(url).hostname.replace(/^\[|\]$/g, '')
        const ips = await lookup(host, { all: true })
          .then((r) => r.map((x) => x.address))
          .catch(() => [] as string[])
        if (!endpointHostAllowed(host, ips, false)) return null
      }
      return url
    }

    if (targetPreset && isPresetEngine(targetPreset)) {
      const presetId = targetPreset as PresetEngineId
      const k = providerSettingKey(presetId, 'key')
      const m = providerSettingKey(presetId, 'model')
      const u = providerSettingKey(presetId, 'url')
      // کلید: برای این Provider نام‌دار
      const keyVal = body?.key !== undefined ? body.key : body?.endpointKey !== undefined ? body.endpointKey : undefined
      if (keyVal === '-') {
        await deleteUserSetting(user.id, k)
      } else if (typeof keyVal === 'string' && keyVal.trim()) {
        await setUserSetting(user.id, k, keyVal.trim().slice(0, 200))
      }
      // مدل
      const modelVal = body?.model !== undefined ? body.model : body?.endpointModel !== undefined ? body.endpointModel : undefined
      if (modelVal !== undefined) {
        const mm = typeof modelVal === 'string' ? modelVal.trim().slice(0, 120) : ''
        if (mm) await setUserSetting(user.id, m, mm)
        else await deleteUserSetting(user.id, m)
      }
      // URL override (اختیاری — پیش‌فرض از پیش‌تنظیم)
      if (body?.url !== undefined) {
        if (body.url === '' || body.url === '-') {
          await deleteUserSetting(user.id, u)
        } else {
          const checked = await checkUrl(body.url)
          if (checked === null) {
            return NextResponse.json({ error: 'آدرس Endpoint نامعتبر است (فقط http/https)' }, { status: 400 })
          }
          if (checked) await setUserSetting(user.id, u, checked)
        }
      }
    } else {
      // ── مسیر قدیمی openai_compatible ──
      if (body?.endpointUrl !== undefined) {
        if (body.endpointUrl === '') {
          await deleteUserSetting(user.id, SETTING_KEYS.aiEndpointUrl)
        } else {
          const checked = await checkUrl(body.endpointUrl)
          if (checked === null) {
            return NextResponse.json({ error: 'آدرس Endpoint نامعتبر است (فقط http/https)' }, { status: 400 })
          }
          if (checked) await setUserSetting(user.id, SETTING_KEYS.aiEndpointUrl, checked)
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
