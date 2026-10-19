// ─── لایه دفاعی «رهیار» — محدودسازی نرخ، گارد Same-Origin، مهار بدنه ──
// مطابق OWASP Top 10 برای اپلیکیشن‌های LLM (۲۰۲۵):
//   LLM10 مصرف بی‌کران → Rate Limiter
//   پایه ASVS → Same-Origin گارد برای متدهای تغییردهنده
import { NextRequest } from 'next/server'

// ── محدودساز نرخ پنجره‌ای لغزان (درون‌حافظه‌ای، تک‌نمونه‌ای) ───────
type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()
// هرس دوره‌ای برای جلوگیری از رشد حافظه
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((t) => now - t < 120_000)
    if (bucket.hits.length === 0) buckets.delete(key)
  }
}

/**
 * اعتماد به سرآیندهای پروکسی فقط وقتی که استقرار پشت پروکسی مورد اعتماد است.
 * استقرار فعلی: Caddy (پورت ۸۱) → Next (پورت ۳۰۰۰) و Caddy سرآیندها را بازنویسی می‌کند.
 * در استقرار بدون پروکسی (دسترسی مستقیم)، TRUST_PROXY_HEADERS ست نشود
 * (یا 0 باشد) تا کلاینت نتواند با سرآیند جعلی سهمیه نرخ را دور بزند.
 */
// RT-1 (اصلاح Red Team): پیش‌فرض قبلی «اعتماد» بود و مهاجم با X-Forwarded-For
// جعلی کلید نرخ هر IP را آزادانه عوض می‌کرد (تست زنده: ۱۲/۱۲ دور زدن سقف ورود).
// اکنون fail-closed: فقط با TRUST_PROXY_HEADERS=1 صریح (پشت پروکسی مورد اعتماد
// مثل Caddy) سرآیندها خوانده می‌شوند؛ وگرنه همه کلاینت‌ها کلید «local» می‌گیرند.
const TRUST_PROXY = process.env.TRUST_PROXY_HEADERS === '1'

/** کلید کلاینت: IP از سرآیندهای پروکسی مورد اعتماد + مسیر هدف */
export function clientKey(req: NextRequest): string {
  const ip = TRUST_PROXY
    ? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'local'
    : 'local'
  return `${ip}::${new URL(req.url).pathname}`
}

/**
 * لیمیتر سراسری مشترک برای مسیرهای هزینه‌بر هوش مصنوعی.
 * حتی اگر کلاینت با تغییر سرآیند IP عوض کند، سقف کل مصرف مدل در کل نمونه برقرار می‌ماند.
 */
const AI_GLOBAL_LIMIT = 30
const AI_GLOBAL_WINDOW = 60_000

export function globalAiLimit(): RateResult {
  return rateLimitKeyed('ai::global', AI_GLOBAL_LIMIT, AI_GLOBAL_WINDOW)
}

/** لیمیتر سراسری جستجوی وب — فراخوانی SDK بیرونی (غیرمدل) هم مهار می‌شود تا
 *  هیچ مسیر هزینه‌بر/خروجی خارجی بدون سقف باقی نماند (بخش ۳ دستور نهایی) */
const SEARCH_GLOBAL_LIMIT = 20

export function globalSearchLimit(): RateResult {
  return rateLimitKeyed('search::global', SEARCH_GLOBAL_LIMIT, 60_000)
}

/** گارد ترکیبی مسیرهای AI: لیمیتر سراسری + خطای استاندارد ۴۲۹ */
export function aiBudgetExceeded(): Response {
  return Response.json(
    { error: 'ظرفیت هوش مصنوعی در این دقیقه پر شده است. کمی بعد تلاش کن.' },
    { status: 429, headers: { 'Retry-After': '30' } },
  )
}

export interface RateResult {
  ok: boolean
  remaining: number
  retryAfter: number
}

/**
 * بررسی سهمیه درخواست در بازه زمانی مشخص.
 * @param limit حداکثر تعداد درخواست در پنجره
 * @param windowMs طول پنجره به میلی‌ثانیه
 */
export function rateLimit(req: NextRequest, limit: number, windowMs: number): RateResult {
  return rateLimitKeyed(clientKey(req), limit, windowMs)
}

/** لیمیتر با کلید دلخواه — پایه مشترک rateLimit و globalAiLimit */
export function rateLimitKeyed(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now()
  sweep(now)
  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] ?? now
    buckets.set(key, bucket)
    return { ok: false, remaining: 0, retryAfter: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }
  bucket.hits.push(now)
  buckets.set(key, bucket)
  return { ok: true, remaining: limit - bucket.hits.length, retryAfter: 0 }
}

/** پاسخ استاندارد ۴۲۹ فارسی */
export function tooManyRequests(res: RateResult): Response {
  return Response.json(
    { error: `درخواست‌ها بیش از حد مجاز است. ${res.retryAfter} ثانیه دیگر تلاش کن.` },
    { status: 429, headers: { 'Retry-After': String(Math.max(res.retryAfter, 1)) } },
  )
}

// ── گارد Same-Origin (دفاع CSRF) ─────────────────────────────────
/**
 * برای متدهای تغییردهنده: اگر سرآیند Origin موجود باشد باید هم‌مبدأ باشد.
 * درخواست‌های بدون Origin (curl / ابزار سروری) پذیرفته می‌شوند —
 * مرورگرها همیشه Origin را روی POST/PATCH/DELETE هم‌مبدأ می‌فرستند.
 */
export function sameOriginOk(req: NextRequest): boolean {
  // سخت‌سازی L9: اگر مرورگر Sec-Fetch-Site فرستاده باشد و cross-site بود، رد کن
  // (دفاع دوم CSRF حتی وقتی Origin حذف/مبهم شده باشد؛ ابزارهای سروری این سرآیند را ندارند)
  const site = req.headers.get('sec-fetch-site')
  if (site === 'cross-site') return false
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    const host = req.headers.get('host')
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export const forbiddenOrigin = (): Response =>
  Response.json({ error: 'درخواست از مبدأ نامعتبر است' }, { status: 403 })

// ── مهار بدنه درخواست ────────────────────────────────────────────
const BODY_MAX_BYTES = 100 * 1024

/**
 * خواندن افزایشی بدنه با سقف بایتی واقعی (رفع M4).
 * قبلاً فقط content-length پیش از خواندن بررسی می‌شد؛ درخواست chunked بدون
 * content-length کامل بافر می‌شد و بعد رد — بردار memory-exhaustion.
 * اکنون استریم قطعه‌به‌قطعه خوانده و با عبور از سقف، بلافاصله قطع می‌شود.
 */
export async function readJsonSafe(req: NextRequest): Promise<unknown> {
  // اول خط دفاعی: content-length جعلیِ بزرگ بدون خواندن رد شود
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > BODY_MAX_BYTES) return null

  const body = req.body
  if (!body) return null
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > BODY_MAX_BYTES) {
        // قطع فوری — دیگر بایت‌ای نمی‌خوانیم
        void reader.cancel().catch(() => {})
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }

  let text: string
  try {
    const merged = new Uint8Array(total)
    let off = 0
    for (const c of chunks) {
      merged.set(c, off)
      off += c.byteLength
    }
    text = new TextDecoder('utf-8', { fatal: false }).decode(merged)
  } catch {
    return null
  }
  if (text.length > BODY_MAX_BYTES) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ── گاردهای عاملیت چت (OWASP LLM06) ─────────────────────────────
/** حذف کار فقط با فعل صریح در پیام کاربر — تزریق غیرمستقیم نمی‌تواند حذف کند */
export function hasExplicitDeleteVerb(userMessage: string): boolean {
  return /حذف\s*کن|پاک\s*کن|حذفش\s*کن|بنداز\s*دور|رسمش\s*کن|از\s*لیست\s*درش\s*بیار|delete/i.test(
    userMessage,
  )
}

/** فراموشی حافظه فقط با فعل صریح — محافظت از حافظه بلندمدت کاربر */
export function hasExplicitForgetVerb(userMessage: string): boolean {
  return /فراموش\s*کن|یادت\s*نباشه|از\s*حافظه\s*پاک|از\s*یاد\s*ببر|بنداز\s*از\s*یاد|forget/i.test(
    userMessage,
  )
}

// ── پاک‌سازی متن ورودی ───────────────────────────────────────────
/** حذف نویسه‌های کنترلی و بریدن به طول مجاز */
export function cleanText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return ''
  const stripped = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  return stripped.trim().slice(0, maxLen)
}

/** آدرس امن: فقط http/https/mailto (دفاع در برابر javascript: و data:) */
export function safeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:'
  } catch {
    return false
  }
}
