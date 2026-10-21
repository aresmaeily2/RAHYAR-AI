// ─── Provider «مدل میزبان استقرار» (zai) ──────────────────────
// موتور مدلِ سرویس‌محورِ سرورِ استقرار — بدون کلید کاربر، بدون Endpoint کاربر.
// پیاده‌سازی با z-ai-web-dev-sdk (سمت سرور فقط — هرگز به کلاینت باندل نمی‌شود).
//
// قرارداد امنیتی:
//  - پیکربندی اتصال مدل فقط از فایل کانفیگ میزبان خوانده می‌شود
//    (مسیرهای رسمی SDK: cwd/.z-ai-config، ~/.z-ai-config، /etc/.z-ai-config).
//  - هیچ کلید یا آدرسی در کد یا در پاسخ‌های API برگردانده نمی‌شود.
//  - اگر سرورِ استقرار این پیکربندی را نداشته باشد، Provider «پیکربندی‌نشده»
//    است و resolveEngine به‌صورت شفاف به موتور محلی (local_rules) برمی‌گردد.
//  - SSE خروجی با فرمت OpenAI-compatible است (تأیید آزمایشی: data: {"choices":
//    [{"delta":{"content":…}}]} … data: [DONE]) — مستقیم از Gateway عبور می‌کند.
//  - سهمیه Gateway (AI_USER_DAILY_LIMIT و …) برای این Provider اعمال می‌شود
//    چون منبع مدلِ میزبان مشترک است (consumesQuota = true).

import type { LlmMessage } from '@/lib/ai'
import {
  AIProvider,
  ProviderCallContext,
  ProviderChatResult,
  ProviderConfigError,
} from './types'

const TIMEOUT_MS = 60_000
export const ZAI_MODEL_LABEL = 'hosted-model'

/** مسیرهای رسمی پیکربندی SDK — فقط برای «بررسی وجود»؛ محتوا هرگز خوانده/ثبت نمی‌شود */
function configCandidates(): string[] {
  const cwd = process.cwd()
  const home = process.env.HOME || '/root'
  const custom = process.env.ZAI_CONFIG_PATH
  const list = [`${cwd}/.z-ai-config`, `${home}/.z-ai-config`, '/etc/.z-ai-config']
  if (custom) list.unshift(custom)
  return list
}

async function hasHostedConfig(): Promise<boolean> {
  const fs = await import('node:fs/promises')
  for (const p of configCandidates()) {
    try {
      const st = await fs.stat(p)
      if (st.isFile() && st.size > 0) return true
    } catch {
      // نبود فایل — مسیر بعدی
    }
  }
  return false
}

/** نگاشت پیام‌ها به قرارداد SDK (نقش‌های system/user/assistant پشتیبانی می‌شود) */
function toSdkMessages(messages: LlmMessage[]): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return messages.map((m) => ({
    role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))
}

async function getClient(): Promise<{
  chat: { completions: { create: (body: Record<string, unknown>) => Promise<unknown> } }
}> {
  const mod = await import('z-ai-web-dev-sdk').catch(() => null)
  if (!mod) throw new ProviderConfigError('کتابخانهٔ مدل میزبان در دسترس نیست')
  const ZAI = (mod as { default?: unknown }).default ?? mod
  const create = (ZAI as { create?: () => Promise<unknown> }).create
  if (typeof create !== 'function') throw new ProviderConfigError('کتابخانهٔ مدل میزبان نامعتبر است')
  const client = (await (create as () => Promise<unknown>).call(ZAI)) as {
    chat: { completions: { create: (body: Record<string, unknown>) => Promise<unknown> } }
  }
  return client
}

export const zaiProvider: AIProvider = {
  id: 'zai',
  label: 'مدل میزبان رهیار',
  consumesQuota: true,
  defaultModelLabel: ZAI_MODEL_LABEL,

  async isConfigured(): Promise<boolean> {
    return hasHostedConfig()
  },

  async chat(messages: LlmMessage[], _ctx: ProviderCallContext): Promise<ProviderChatResult> {
    const client = await getClient()
    const res = (await Promise.race([
      client.chat.completions.create({
        messages: toSdkMessages(messages),
        thinking: { type: 'disabled' },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
    ])) as {
      choices?: Array<{ message?: { content?: string } }>
      model?: string
    }
    const text = res?.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) throw new ProviderConfigError('مدل میزبان پاسخ خالی برگرداند')
    return { text, model: res?.model ? String(res.model) : ZAI_MODEL_LABEL }
  },

  async stream(messages: LlmMessage[], _ctx: ProviderCallContext): Promise<ReadableStream<Uint8Array>> {
    const client = await getClient()
    const body = (await Promise.race([
      client.chat.completions.create({
        messages: toSdkMessages(messages),
        stream: true,
        thinking: { type: 'disabled' },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT_MS)),
    ])) as ReadableStream<Uint8Array> | unknown
    if (!(body instanceof ReadableStream)) {
      throw new ProviderConfigError('مدل میزبان استریم خالی برگرداند')
    }
    return body
  },
}

/** تست اتصال — یک درخواست کوچک؛ برای دکمهٔ «تست اتصال» تنظیمات */
export async function testHostedModel(): Promise<{
  ok: boolean
  model: string
  latencyMs: number
  sample: string
  error?: string
}> {
  const started = Date.now()
  try {
    const r = await zaiProvider.chat([{ role: 'user', content: 'ping' }], { userId: 'test' })
    return { ok: true, model: r.model, latencyMs: Date.now() - started, sample: r.text.trim().slice(0, 60) }
  } catch (e) {
    return {
      ok: false,
      model: ZAI_MODEL_LABEL,
      latencyMs: Date.now() - started,
      sample: '',
      error: e instanceof Error ? e.message.slice(0, 200) : 'خطای ناشناخته',
    }
  }
}
