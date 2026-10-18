// ─── ثبت Providerهای AI و انتخاب موتور فعال هر کاربر ──────────
// تنها نقطه وصله‌ی Provider به Gateway. افزودن Provider آینده =
// ساخت یک فایل جدید با رابط AIProvider + یک خط در این ثبت‌کننده.
// هیچ API یا شرکت خاصی در Gateway Hardcode نمی‌شود.

import {
  isAiEngineId,
  type AIProvider,
  type AiEngineId,
  type ProviderCallContext,
} from './types'
import { localRulesProvider } from './local-rules'
import { openAiCompatibleProvider } from './openai-compatible'
import { getUserSetting, SETTING_KEYS } from '@/lib/server-settings'

const REGISTRY: Record<AiEngineId, AIProvider> = {
  local_rules: localRulesProvider,
  openai_compatible: openAiCompatibleProvider,
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

/**
 * موتور فعال کاربر را از تنظیمات می‌خواند.
 * قاعده ایمنی: اگر openai_compatible انتخاب شده ولی URL ندارد →
 * به‌جای شکست، به موتور محلی (رایگان) برمی‌گردیم و علت را برمی‌گردانیم.
 * پیش‌فرض نسخه ۱٫۰ همیشه «local_rules» است (بدون هزینه، بدون کلید).
 */
export async function resolveEngine(userId: string): Promise<ResolvedEngine> {
  const saved = await getUserSetting(userId, SETTING_KEYS.aiEngine)
  const engine: AiEngineId = isAiEngineId(saved) ? saved : 'local_rules'

  if (engine === 'openai_compatible') {
    const endpointUrl = (await getUserSetting(userId, SETTING_KEYS.aiEndpointUrl)) ?? ''
    const endpointKey = (await getUserSetting(userId, SETTING_KEYS.aiEndpointKey)) ?? ''
    const endpointModel = (await getUserSetting(userId, SETTING_KEYS.aiEndpointModel)) ?? ''
    const ctx: ProviderCallContext = { userId, endpointUrl, endpointKey, endpointModel }
    if (openAiCompatibleProvider.isConfigured(ctx)) {
      return { engine, provider: openAiCompatibleProvider, ctx }
    }
    // پیکربندی ناقص — جایگزین شفاف با موتور محلی رایگان
    return {
      engine: 'local_rules',
      provider: REGISTRY.local_rules,
      ctx: { userId },
      // پرچم برای پیام شفاف در UI
      ...{ fallbackReason: 'endpoint_not_configured' },
    } as ResolvedEngine & { fallbackReason?: string }
  }

  return { engine: 'local_rules', provider: REGISTRY.local_rules, ctx: { userId } }
}

/** خواندن پیکربندی Endpoint برای UI تنظیمات — کلید همیشه ماسک می‌شود */
export async function getEngineStatus(userId: string): Promise<{
  engine: AiEngineId
  endpointUrl: string
  endpointModel: string
  hasKey: boolean
  keyMasked: string
}> {
  const saved = await getUserSetting(userId, SETTING_KEYS.aiEngine)
  const engine: AiEngineId = isAiEngineId(saved) ? saved : 'local_rules'
  const endpointUrl = (await getUserSetting(userId, SETTING_KEYS.aiEndpointUrl)) ?? ''
  const endpointModel = (await getUserSetting(userId, SETTING_KEYS.aiEndpointModel)) ?? ''
  const key = (await getUserSetting(userId, SETTING_KEYS.aiEndpointKey)) ?? ''
  const tail = key.length > 4 ? key.slice(-4) : ''
  return {
    engine,
    endpointUrl,
    endpointModel,
    hasKey: key.length > 0,
    keyMasked: key ? `••••${tail}` : '',
  }
}
