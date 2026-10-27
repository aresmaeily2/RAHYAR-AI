// ─── Provider «سهمیه داخلی میزبان» — پیش‌فرض رایگان رهیار ─────
// پشت صحنه از SDK میزبان استفاده می‌کند (بدون کلید، بدون هزینه برای
// کاربر) و دقیقاً همان رفتار قبل از معرفی معماری Provider را دارد.
// هیچ کلیدی در کد Hardcode نشده؛ این Provider کاملاً اختیاری است و
// کاربر می‌تواند آن را در تنظیمات به «قواعد محلی» یا Endpoint خودش تغییر دهد.

import { llm, llmStream, type LlmMessage } from '@/lib/ai'
import type {
  AIProvider,
  ProviderCallContext,
  ProviderChatResult,
} from './types'

export const BUILTIN_MODEL_LABEL = 'z-ai-glm'

export const builtinProvider: AIProvider = {
  id: 'builtin',
  label: 'سهمیه داخلی میزبان (رایگان)',
  consumesQuota: true,

  isConfigured(): boolean {
    return true
  },

  async chat(messages: LlmMessage[]): Promise<ProviderChatResult> {
    const text = await llm(messages)
    return { text, model: BUILTIN_MODEL_LABEL }
  },

  async stream(messages: LlmMessage[]): Promise<ReadableStream<Uint8Array>> {
    return llmStream(messages)
  },
}
