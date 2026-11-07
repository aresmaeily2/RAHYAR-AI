// ─── F5-مأموریت ۳: پیش‌تنظیم Providerهای نام‌دار ───────────────
// هر Provider نام‌دار یک شناسهٔ مستقل دارد، از رابط AIProvider پیروی می‌کند و
// کلید/مدل/URL آن در تنظیمات «هر کاربر» ذخیره می‌شود (کلید هرگز به کلاینت
// برنمی‌گردد — فقط ماسک). هیچ کلیدی در کد Hardcode نشده است.
//
// آرشیتکتور بدون وابستگی سخت: OpenAI/DeepSeek/OpenRouter/Ollama/LM Studio
// همگی پروتکل سازگار با OpenAI دارند (openai-like.ts)؛ Claude و Gemini
// آداپتور بومی خودشان را دارند (claude.ts / gemini.ts).

export type PresetEngineId =
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'deepseek'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'

export type ProviderKind = 'openai-like' | 'claude' | 'gemini'

export interface ProviderPreset {
  id: PresetEngineId
  label: string
  kind: ProviderKind
  baseUrl: string
  defaultModel: string
  /** آیا بدون کلید اصلاً کار می‌کند؟ (Ollama/LM Studio معمولاً بدون کلید) */
  keyRequired: boolean
  /** توضیح کوتاه فارسی برای UI */
  desc: string
}

export const PROVIDER_PRESETS: Record<PresetEngineId, ProviderPreset> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-like',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyRequired: true,
    desc: 'سرویس ابری OpenAI — پروتکل سازگار با OpenAI',
  },
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    kind: 'claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-haiku-latest',
    keyRequired: true,
    desc: 'آداپتور بومی Anthropic Messages API',
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini (Google)',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    keyRequired: true,
    desc: 'آداپتور بومی Gemini REST API',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    kind: 'openai-like',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyRequired: true,
    desc: 'سرویس ابری DeepSeek — پروتکل سازگار با OpenAI',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai-like',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/auto',
    keyRequired: true,
    desc: 'مسیریاب چندمدلی — پروتکل سازگار با OpenAI',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama',
    kind: 'openai-like',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    keyRequired: false,
    desc: 'موتور محلی — میزبان خودت؛ بدون کلید ابری',
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'LM Studio',
    kind: 'openai-like',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    keyRequired: false,
    desc: 'سرور محلی LM Studio — پروتکل سازگار با OpenAI',
  },
}

export const PRESET_ENGINE_IDS: PresetEngineId[] = Object.keys(PROVIDER_PRESETS) as PresetEngineId[]

export function isPresetEngine(v: unknown): v is PresetEngineId {
  return typeof v === 'string' && v in PROVIDER_PRESETS
}

/** نام کلید تنظیمات «هر کاربر» برای هر فیلد هر Provider نام‌دار */
export function providerSettingKey(id: PresetEngineId, field: 'key' | 'model' | 'url'): string {
  return `ai_${field}:${id}`
}

/** ماسک کلید — فقط ۴ کاراکتر آخر؛ کلید کامل هرگز به UI برنمی‌گردد */
export function maskKey(key: string): string {
  if (!key) return ''
  const tail = key.length > 4 ? key.slice(-4) : ''
  return `••••${tail}`
}
