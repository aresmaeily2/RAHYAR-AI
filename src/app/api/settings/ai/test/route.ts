// POST /api/settings/ai/test — GRAND-F5: دکمهٔ «تست اتصال» تنظیمات
// UI (settings-view.tsx) از ابتدا این مسیر را صدا می‌زد ولی مسیر وجود نداشت
// (یافتهٔ ممیزی GRAND-F5/2-b#1). پیاده‌سازی روی testEndpoint() موجود.
// گارد SSRF همان مسیر ذخیره: کاربر عادی فقط Endpoint عمومی (SEC-F1).
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { testEndpoint } from '@/lib/ai/providers/openai-compatible'
import { validateEndpointUrl, endpointHostAllowed } from '@/lib/ai/providers/types'
import { getUserSetting, SETTING_KEYS } from '@/lib/server-settings'
import { lookup } from 'node:dns/promises'

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 5, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      endpointUrl?: unknown
      endpointModel?: unknown
      endpointKey?: unknown
      useSavedKey?: unknown
    } | null

    // اولویت: مقدار فرم → مقدار ذخیره‌شده
    const formUrl = typeof body?.endpointUrl === 'string' ? body.endpointUrl.trim() : ''
    const savedUrl = (await getUserSetting(user.id, SETTING_KEYS.aiEndpointUrl)) ?? ''
    const rawUrl = formUrl || savedUrl
    const url = validateEndpointUrl(rawUrl)
    if (!url) {
      return NextResponse.json({ ok: false, error: 'اول آدرس Endpoint سازگار با OpenAI را وارد کن' })
    }

    // SEC-F1: کاربر عادی فقط Endpoint عمومی — همان سیاست ذخیره
    if (user.role !== 'OWNER') {
      const host = new URL(url).hostname.replace(/^\[|\]$/g, '')
      const ips = await lookup(host, { all: true })
        .then((r) => r.map((x) => x.address))
        .catch(() => [] as string[])
      if (!endpointHostAllowed(host, ips, false)) {
        return NextResponse.json({ ok: false, error: 'آدرس خصوصی/داخلی فقط برای مالک مجاز است' })
      }
    }

    const formModel = typeof body?.endpointModel === 'string' ? body.endpointModel.trim() : ''
    const savedModel = (await getUserSetting(user.id, SETTING_KEYS.aiEndpointModel)) ?? ''
    const formKey = typeof body?.endpointKey === 'string' ? body.endpointKey.trim() : ''
    const useSaved = body?.useSavedKey === true
    const savedKey = (await getUserSetting(user.id, SETTING_KEYS.aiEndpointKey)) ?? ''

    const result = await testEndpoint({
      userId: user.id,
      endpointUrl: url,
      endpointModel: formModel || savedModel,
      // کلید فرم اولویت دارد؛ «استفاده از کلید ذخیره‌شده» از DB
      endpointKey: formKey || (useSaved ? savedKey : ''),
    })
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('POST /api/settings/ai/test', e instanceof Error ? e.message : e)
    return NextResponse.json({ ok: false, error: 'تست اتصال انجام نشد' })
  }
}
