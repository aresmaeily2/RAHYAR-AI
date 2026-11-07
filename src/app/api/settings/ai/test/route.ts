// POST /api/settings/ai/test — F5: دکمهٔ «تست اتصال» برای هر ده موتور
// تست واقعی سمت سرور: برای zai مدل میزبان؛ برای openai_compatible endpoint کاربر؛
// برای هفت Provider نام‌دار آداپتور خودشان (OpenAI/DeepSeek/OpenRouter/Ollama/LM
// Studio پروتکل OpenAI — Claude بومی — Gemini بومی).
// نتیجهٔ هر Provider چه موفق چه ناموفق، صادقانه برمی‌گردد؛ «Provider غیرقابل
// آزمایش هرگز VERIFIED نمی‌شود» — این مسیر همان مدرک آزمون است.
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import { testEndpoint } from '@/lib/ai/providers/openai-compatible'
import { testHostedModel } from '@/lib/ai/providers/zai'
import { testClaude } from '@/lib/ai/providers/claude'
import { testGemini } from '@/lib/ai/providers/gemini'
import { isAiEngineId, validateEndpointUrl, endpointHostAllowed, type ProviderCallContext } from '@/lib/ai/providers/types'
import { isPresetEngine, providerSettingKey } from '@/lib/ai/providers/presets'
import { getProvider, loadPresetCtx } from '@/lib/ai/providers/registry'
import { testOpenAiLike } from '@/lib/ai/providers/openai-like'
import { getUserSetting, SETTING_KEYS } from '@/lib/server-settings'
import { lookup } from 'node:dns/promises'

export type TestResult = { ok: boolean; model: string; latencyMs: number; sample: string; error?: string }

export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 5, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      engine?: unknown
      endpointUrl?: unknown
      endpointModel?: unknown
      endpointKey?: unknown
      key?: unknown
      model?: unknown
      url?: unknown
      useSavedKey?: unknown
    } | null

    // تست موتور میزبان (zai) — نیازمند Endpoint کاربر نیست
    if (body?.engine === 'zai') {
      const result = await testHostedModel()
      return NextResponse.json(result)
    }

    // F5: موتور قواعد محلی — بدون شبکه؛ همیشه آماده است (پاسخ فوری صادقانه)
    if (body?.engine === 'local_rules') {
      return NextResponse.json({ ok: true, model: 'local_rules', latencyMs: 0, sample: 'موتور قواعد محلی فعال است' })
    }

    // ── Providerهای نام‌دار (F5) ──
    if (isPresetEngine(body?.engine)) {
      const id = body.engine
      const presetCtx = await loadPresetCtx(user.id, id)
      // اولویت: مقدار فرم → مقدار ذخیره‌شده
      const formKey = typeof (body?.key ?? body?.endpointKey) === 'string' ? String(body.key ?? body.endpointKey).trim() : ''
      const formModel = typeof (body?.model ?? body?.endpointModel) === 'string' ? String(body.model ?? body.endpointModel).trim() : ''
      const formUrl = typeof (body?.url ?? body?.endpointUrl) === 'string' ? String(body.url ?? body.endpointUrl).trim() : ''
      const ctx: ProviderCallContext = {
        userId: user.id,
        endpointUrl: formUrl || presetCtx.endpointUrl,
        endpointKey: formKey || presetCtx.endpointKey,
        endpointModel: formModel || presetCtx.endpointModel,
      }
      // SEC-F1: کاربر عادی فقط Endpoint عمومی (URL override هم‌سیاست ذخیره)
      if (user.role !== 'OWNER' && formUrl) {
        try {
          const u = validateEndpointUrl(formUrl)
          if (!u) return NextResponse.json({ ok: false, error: 'آدرس Endpoint نامعتبر است' })
          const host = new URL(u).hostname.replace(/^\[|\]$/g, '')
          const ips = await lookup(host, { all: true }).then((r) => r.map((x) => x.address)).catch(() => [] as string[])
          if (!endpointHostAllowed(host, ips, false)) {
            return NextResponse.json({ ok: false, error: 'آدرس خصوصی/داخلی فقط برای مالک مجاز است' })
          }
        } catch {
          return NextResponse.json({ ok: false, error: 'آدرس Endpoint نامعتبر است' })
        }
      }
      const provider = getProvider(id)
      if (provider.id === 'claude') {
        return NextResponse.json(await testClaude(ctx))
      }
      if (provider.id === 'gemini') {
        return NextResponse.json(await testGemini(ctx))
      }
      return NextResponse.json(await testOpenAiLike(provider, ctx, id))
    }

    // ── openai_compatible (مسیر قبلی) ──
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
