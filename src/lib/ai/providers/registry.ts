// ─── ثبت Providerهای AI و انتخاب موتور فعال هر کاربر ──────────
// تنها نقطه وصله‌ی Provider به Gateway. افزودن Provider آینده =
// ساخت یک فایل جدید با رابط AIProvider + یک خط در این ثبت‌کننده.
// هیچ API یا شرکت خاصی در Gateway Hardcode نمی‌شود.
//
// F5 (مأموریت ۳): ده موتور — local_rules + openai_compatible + zai
// + هفت Provider نام‌دار (OpenAI، Claude، Gemini، DeepSeek، OpenRouter،
// Ollama، LM Studio). پیکربندی هر Provider نام‌دار «به ازای هر کاربر» در
// Setting ذخیره می‌شود (ai_key:<id>، ai_model:<id>، ai_url:<id>) و کلید
// همیشه ماسک برمی‌گردد.

import {
  isAiEngineId,
  type AIProvider,
  type AiEngineId,
  type ProviderCallContext,
} from './types'
import { localRulesProvider } from './local-rules'
import { openAiCompatibleProvider } from './openai-compatible'
import { zaiProvider } from './zai'
import { claudeProvider } from './claude'
import { geminiProvider } from './gemini'
import { makeOpenAiLikeProvider } from './openai-like'
import {
  PROVIDER_PRESETS,
  PRESET_ENGINE_IDS,
  isPresetEngine,
  providerSettingKey,
  maskKey,
  type PresetEngineId,
} from './presets'
import { getUserSetting, SETTING_KEYS } from '@/lib/server-settings'

const REGISTRY: Record<AiEngineId, AIProvider> = {
  local_rules: localRulesProvider,
  openai_compatible: openAiCompatibleProvider,
  zai: zaiProvider,
  openai: makeOpenAiLikeProvider('openai', { fallbackModelLabel: 'openai' }),
  deepseek: makeOpenAiLikeProvider('deepseek', { fallbackModelLabel: 'deepseek' }),
  openrouter: makeOpenAiLikeProvider('openrouter', { fallbackModelLabel: 'openrouter' }),
  ollama: makeOpenAiLikeProvider('ollama', { fallbackModelLabel: 'ollama' }),
  lmstudio: makeOpenAiLikeProvider('lmstudio', { fallbackModelLabel: 'lmstudio' }),
  claude: claudeProvider,
  gemini: geminiProvider,
}

/** فهرست Providerها برای UI تنظیمات */
export function listProviders(): Array<{ id: AiEngineId; label: string; consumesQuota: boolean }> {
  return (Object.values(REGISTRY) as AIProvider[]).map((p) => ({
    id: p.id,
    label: p.label,
    consumesQuota: p.consumesQuota,
  }))
}

export function getProvider(id: AiEngineId): AIProvider {
  return REGISTRY[id]
}

export interface ResolvedEngine {
  engine: AiEngineId
  provider: AIProvider
  ctx: ProviderCallContext
}

/** خواندن پیکربندی «به ازای کاربر» برای یک Provider نام‌دار */
export async function loadPresetCtx(userId: string, id: PresetEngineId): Promise<ProviderCallContext> {
  const [key, model, urlOverride] = await Promise.all([
    getUserSetting(userId, providerSettingKey(id, 'key')),
    getUserSetting(userId, providerSettingKey(id, 'model')),
    getUserSetting(userId, providerSettingKey(id, 'url')),
  ])
  const preset = PROVIDER_PRESETS[id]
  return {
    userId,
    endpointUrl: (urlOverride ?? '').trim() || preset.baseUrl,
    endpointKey: key ?? '',
    endpointModel: (model ?? '').trim() || preset.defaultModel,
  }
}

async function localFallback(userId: string, fallbackReason: string): Promise<ResolvedEngine & { fallbackReason?: string }> {
  return {
    engine: 'local_rules',
    provider: REGISTRY.local_rules,
    ctx: { userId },
    fallbackReason,
  } as ResolvedEngine & { fallbackReason?: string }
}

/**
 * موتور فعال کاربر را از تنظیمات می‌خواند.
 * قاعدهٔ پیش‌فرض v2.0: «مدل میزبان» (zai) اگر سرورِ استقرار پیکربندی مدل داشته باشد؛
 * در غیر این صورت «قواعد محلی» (بدون هزینه، بدون اینترنت).
 * قاعدهٔ ایمنی (F5: برای هر ده موتور): اگر موتور انتخابی پیکربندی نشده باشد
 * → به‌جای شکست، به موتور محلی (رایگان) برمی‌گردیم و علت را صادقانه برمی‌گردانیم.
 */
export async function resolveEngine(userId: string): Promise<ResolvedEngine> {
  const saved = await getUserSetting(userId, SETTING_KEYS.aiEngine)
  const zaiConfigured = await zaiProvider.isConfigured({ userId })
  const engine: AiEngineId = isAiEngineId(saved)
    ? saved
    : zaiConfigured
      ? 'zai'
      : 'local_rules'

  if (engine === 'openai_compatible') {
    const endpointUrl = (await getUserSetting(userId, SETTING_KEYS.aiEndpointUrl)) ?? ''
    const endpointKey = (await getUserSetting(userId, SETTING_KEYS.aiEndpointKey)) ?? ''
    const endpointModel = (await getUserSetting(userId, SETTING_KEYS.aiEndpointModel)) ?? ''
    const ctx: ProviderCallContext = { userId, endpointUrl, endpointKey, endpointModel }
    if (openAiCompatibleProvider.isConfigured(ctx)) {
      return { engine, provider: openAiCompatibleProvider, ctx }
    }
    // پیکربندی ناقص — جایگزین شفاف با موتور محلی رایگان
    return localFallback(userId, 'endpoint_not_configured')
  }

  if (engine === 'zai') {
    if (zaiConfigured) {
      return { engine, provider: REGISTRY.zai, ctx: { userId } }
    }
    // سرور پیکربندی مدل میزبان ندارد — جایگزین شفاف با موتور محلی رایگان
    return localFallback(userId, 'hosted_model_not_configured')
  }

  if (isPresetEngine(engine)) {
    const ctx = await loadPresetCtx(userId, engine)
    const provider = REGISTRY[engine]
    if (await provider.isConfigured(ctx)) {
      return { engine, provider, ctx }
    }
    return localFallback(userId, 'provider_not_configured')
  }

  return { engine: 'local_rules', provider: REGISTRY.local_rules, ctx: { userId } }
}

export interface ProviderStatusInfo {
  id: AiEngineId
  label: string
  kind: 'builtin' | 'preset'
  preset?: {
    baseUrl: string
    defaultModel: string
    keyRequired: boolean
    desc: string
    /** مدل/URL مؤثر فعلی (با احتساب override کاربر) */
    effectiveUrl: string
    effectiveModel: string
  }
  configured: boolean
  hasKey: boolean
  keyMasked: string
}

/** خواندن پیکربندی برای UI تنظیمات — کلید همیشه ماسک می‌شود، هرگز کامل برگردانده نمی‌شود */
export async function getEngineStatus(userId: string): Promise<{
  engine: AiEngineId
  endpointUrl: string
  endpointModel: string
  hasKey: boolean
  keyMasked: string
  hostedAvailable: boolean
  providers: ProviderStatusInfo[]
}> {
  const saved = await getUserSetting(userId, SETTING_KEYS.aiEngine)
  const zaiConfigured = await zaiProvider.isConfigured({ userId })
  const engine: AiEngineId = isAiEngineId(saved) ? saved : zaiConfigured ? 'zai' : 'local_rules'
  const endpointUrl = (await getUserSetting(userId, SETTING_KEYS.aiEndpointUrl)) ?? ''
  const endpointModel = (await getUserSetting(userId, SETTING_KEYS.aiEndpointModel)) ?? ''
  const key = (await getUserSetting(userId, SETTING_KEYS.aiEndpointKey)) ?? ''

  const providers: ProviderStatusInfo[] = []
  for (const id of PRESET_ENGINE_IDS) {
    const preset = PROVIDER_PRESETS[id]
    const ctx = await loadPresetCtx(userId, id)
    const configured = await REGISTRY[id].isConfigured(ctx)
    providers.push({
      id,
      label: preset.label,
      kind: 'preset',
      preset: {
        baseUrl: preset.baseUrl,
        defaultModel: preset.defaultModel,
        keyRequired: preset.keyRequired,
        desc: preset.desc,
        effectiveUrl: ctx.endpointUrl ?? preset.baseUrl,
        effectiveModel: ctx.endpointModel ?? preset.defaultModel,
      },
      configured,
      hasKey: Boolean((ctx.endpointKey ?? '').trim()),
      keyMasked: maskKey(ctx.endpointKey ?? ''),
    })
  }

  return {
    engine,
    endpointUrl,
    endpointModel,
    hasKey: key.length > 0,
    keyMasked: key ? `••••${key.slice(-4)}` : '',
    hostedAvailable: zaiConfigured,
    providers,
  }
}
