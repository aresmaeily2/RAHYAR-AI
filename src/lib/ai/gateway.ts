// ─── AI Gateway مرکزی رهیار AI ──────────────────────────────
// تنها مسیر مجاز فراخوانی مدل زبانی (بخش ۶ دستور اجرایی):
//  رابط کاربر → API امن → همین Gateway → رجیستری Provider → مدل
//  - هیچ صفحه یا API دیگری مستقیماً به ارائه‌دهنده وصل نمی‌شود
//  - معماری AIProvider (نسخه ۱٫۰): موتور فعال هر کاربر از تنظیمات
//    خوانده می‌شود (local_rules | openai_compatible) —
//    هیچ شرکت یا API خاصی اینجا Hardcode نشده است
//  - سقف مصرف فقط برای Providerهای مدل (سهمیه‌دار) اعمال می‌شود؛
//    «قواعد محلی» و Endpoint خود کاربر سهمیه پلتفرم نمی‌سوزانند
//  - کلید قطع اضطراری: Setting «ai_kill_switch=1» یا env RAHYAR_AI_DISABLED=1
//    (فقط فراخوانی مدل را قطع می‌کند — قواعد محلی همیشه زنده است)
//  - سقف ورودی/خروجی + حداکثر ۱ تلاش مجدد فقط برای خطای گذرا
//  - ثبت مصرف فقط با فراداده (هیچ متن خصوصی لاگ یا ذخیره نمی‌شود)
//  - اگر سهمیه تمام شود: پیام شفاف فارسی — هرگز مسیر پولی مخفی وجود ندارد
import { db } from '@/lib/db'
import { extractJson, type LlmMessage } from '@/lib/ai'
import { resolveEngine } from './providers/registry'
import { ProviderCapabilityError, ProviderConfigError } from './providers/types'

// ── پیکربندی سقف‌ها (env با پیش‌فرض محافظه‌کار) ──────────────
export interface QuotaLimits {
  userDaily: number
  userMonthly: number
  systemDaily: number
  maxInputChars: number
  maxOutputChars: number
}

export function quotaLimits(): QuotaLimits {
  const env = (k: string, d: number) => {
    const v = Number(process.env[k])
    return Number.isFinite(v) && v >= 0 ? v : d
  }
  return {
    userDaily: env('AI_USER_DAILY_LIMIT', 60),
    userMonthly: env('AI_USER_MONTHLY_LIMIT', 900),
    systemDaily: env('AI_SYSTEM_DAILY_LIMIT', 300),
    maxInputChars: env('AI_MAX_INPUT_CHARS', 24000),
    maxOutputChars: env('AI_MAX_OUTPUT_CHARS', 4000),
  }
}

// ── منطق خالص سهمیه (آزمون‌پذیر بدون DB) ─────────────────────
export type QuotaUsage = { userToday: number; userMonth: number; systemToday: number }

export type QuotaDenyReason = 'user_daily' | 'user_monthly' | 'system_daily'

export type QuotaDecision =
  | { allow: true }
  | { allow: false; reason: QuotaDenyReason; resetHours: number }

/** ۰ یعنی بی‌سقف؛ خروجی قابل‌پیش‌بینی و آزمون‌شده */
export function quotaDecision(u: QuotaUsage, l: QuotaLimits, now = new Date()): QuotaDecision {
  if (l.userDaily > 0 && u.userToday >= l.userDaily) {
    return { allow: false, reason: 'user_daily', resetHours: hoursUntilTomorrow(now) }
  }
  if (l.userMonthly > 0 && u.userMonth >= l.userMonthly) {
    return { allow: false, reason: 'user_monthly', resetHours: hoursUntilNextMonth(now) }
  }
  if (l.systemDaily > 0 && u.systemToday >= l.systemDaily) {
    return { allow: false, reason: 'system_daily', resetHours: hoursUntilTomorrow(now) }
  }
  return { allow: true }
}

function hoursUntilTomorrow(now: Date): number {
  const t = new Date(now)
  t.setHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((t.getTime() - now.getTime()) / 3600_000))
}

function hoursUntilNextMonth(now: Date): number {
  const t = new Date(now)
  t.setMonth(t.getMonth() + 1, 1)
  t.setHours(0, 0, 0, 0)
  return Math.max(1, Math.ceil((t.getTime() - now.getTime()) / 3600_000))
}

/** آیا خطا گذراست و تلاش مجدد (حداکثر یک‌بار) منطقی است؟ */
export function isTransientError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '')
  return /timeout|econn|enotfound|econnreset|socket|fetch failed|network|5\d\d/i.test(msg)
}

// ── کلید قطع اضطراری ─────────────────────────────────────────
export async function aiKillSwitchOn(): Promise<boolean> {
  if (process.env.RAHYAR_AI_DISABLED === '1') return true
  try {
    const row = await db.setting.findFirst({ where: { key: 'ai_kill_switch' } })
    return row?.value === '1'
  } catch {
    return false
  }
}

// ── خطاهای شفاف ──────────────────────────────────────────────
export class GatewayDisabledError extends Error {
  constructor() {
    super('هوش مصنوعی موقتاً غیرفعال است (کلید قطع اضطراری).')
  }
}

export class GatewayQuotaError extends Error {
  constructor(
    public reason: QuotaDenyReason,
    public resetHours: number,
  ) {
    super('سهمیه هوش مصنوعی تمام شده است')
  }
}

export class GatewayProviderError extends Error {
  constructor() {
    super('سرویس مدل در دسترس نیست. کمی بعد دوباره تلاش کن.')
  }
}

/** موتور محلی انتخاب شده ولی این مسیر به مدل نیاز دارد */
export class GatewayLocalOnlyError extends Error {
  constructor() {
    super('این قابلیت به مدل زبانی نیاز دارد. در تنظیمات ← هوش مصنوعی یک موتور مدل انتخاب کن.')
  }
}

/** خطای پیکربندی Endpoint کاربر — پیام مشخص، بدون افشای کلید */
export class GatewayConfigError extends Error {
  constructor(message: string) {
    super(message)
  }
}

// ── فراخوانی Gateway ─────────────────────────────────────────
export interface GatewayRequest {
  /** مسیر API فراخوان — فقط برای ثبت مصرف */
  route: string
  /** برچسب کار: chat | breakdown | plan | assistant */
  task: string
  /** همه فراخوانی‌های مدل نیازمند نشست‌اند — شناسه کاربر برای سهمیه و ثبت مصرف */
  userId: string
  messages: LlmMessage[]
  maxOutputChars?: number
}

export interface GatewayResult {
  text: string
  inChars: number
  outChars: number
  latencyMs: number
}

async function countUsage(userId: string): Promise<QuotaUsage> {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const [userToday, userMonth, systemToday] = await Promise.all([
    db.aiUsage.count({ where: { userId, status: 'ok', createdAt: { gte: dayStart } } }),
    db.aiUsage.count({ where: { userId, status: 'ok', createdAt: { gte: monthStart } } }),
    db.aiUsage.count({ where: { status: 'ok', createdAt: { gte: dayStart } } }),
  ])
  return { userToday, userMonth, systemToday }
}

async function recordUsage(args: {
  route: string
  task: string
  userId: string
  inChars: number
  outChars: number
  latencyMs: number
  status: string
  provider: string
  model: string
}): Promise<void> {
  try {
    await db.aiUsage.create({
      data: {
        userId: args.userId,
        route: args.route.slice(0, 60),
        task: args.task.slice(0, 40),
        provider: args.provider,
        model: args.model,
        inChars: args.inChars,
        outChars: args.outChars,
        latencyMs: args.latencyMs,
        status: args.status,
        costEst: 0, // ارائه‌دهنده فعلی سهمیه پلتفرمی دارد؛ هیچ مسیر پولی خودکاری نیست
      },
    })
  } catch (e) {
    // ثبت مصرف هرگز مسیر اصلی را نمی‌شکند؛ فقط هشدار متادیتا
    console.error('gateway: usage record failed', e instanceof Error ? e.message : e)
  }
}

/** ارقام فارسی برای پیام‌های کاربر */
export function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

/** پیام شفاف سهمیه — دوزبانه بر اساس زبان کاربر؛ بدون پنهان‌کاری */
export function quotaMessage(reason: QuotaDenyReason, resetHours: number, lang: 'fa' | 'en' = 'fa'): string {
  if (lang === 'en') {
    const h = String(resetHours)
    if (reason === 'user_daily')
      return `Your daily AI quota is used up (resets in about ${h} hours). Until then, adding and tracking tasks still works without the model.`
    if (reason === 'user_monthly')
      return `Your monthly AI quota is used up (resets in about ${h} hours). Model-free features remain active.`
    return `The system-wide daily quota is used up (resets in about ${h} hours). Model-free features remain active.`
  }
  const h = faNum(resetHours)
  if (reason === 'user_daily')
    return `سهمیه هوش مصنوعی امروزت پر شده است (حدود ${h} ساعت دیگر بازنشانی می‌شود). تا آن موقع ثبت و پیگیری کارها بدون مدل به همان شکل کار می‌کند.`
  if (reason === 'user_monthly')
    return `سهمیه ماهانه هوش مصنوعی پر شده است (حدود ${h} ساعت دیگر بازنشانی می‌شود). امکانات بدون مدل فعال‌اند.`
  return `سهمیه کل سامانه امروز پر شده است (حدود ${h} ساعت دیگر بازنشانی می‌شود). امکانات بدون مدل فعال‌اند.`
}

/**
 * gatewayRun — تنها نقطه فراخوانی مدل در کل سامانه.
 * ترتیب گاردها: کلید قطع → سقف ورودی → سهمیه → اجرا (با ۱ تلاش مجدد گذرا) → ثبت مصرف.
 */
export async function gatewayRun(req: GatewayRequest): Promise<GatewayResult> {
  const { provider, ctx } = await resolveEngine(req.userId)

  // کلید قطع فقط فراخوانی «مدل» را می‌بندد؛ قواعد محلی بدون مدل زنده می‌ماند
  if (provider.consumesQuota && (await aiKillSwitchOn())) {
    await recordUsage({
      route: req.route, task: req.task, userId: req.userId,
      inChars: 0, outChars: 0, latencyMs: 0,
      status: 'disabled', provider: provider.id, model: provider.id,
    })
    throw new GatewayDisabledError()
  }

  const limits = quotaLimits()
  const inChars = req.messages.reduce((n, m) => n + m.content.length, 0)
  if (inChars > limits.maxInputChars) {
    // ورودی نامتناسب — خطای ارائه‌دهنده‌نما برای کاربر، بدون جزئیات محرمانه
    throw new GatewayProviderError()
  }

  // سهمیه فقط برای Providerهای سهمیه‌دار (مدل میزبان) شمرده می‌شود
  if (provider.consumesQuota) {
    const usage = await countUsage(req.userId)
    const decision = quotaDecision(usage, limits)
    if (!decision.allow) {
      await recordUsage({
        route: req.route, task: req.task, userId: req.userId,
        inChars, outChars: 0, latencyMs: 0,
        status: 'quota_exceeded', provider: provider.id, model: provider.id,
      })
      throw new GatewayQuotaError(decision.reason, decision.resetHours)
    }
  }

  const started = Date.now()
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await provider.chat(req.messages, ctx)
      const out = r.text.slice(0, req.maxOutputChars ?? limits.maxOutputChars)
      const latencyMs = Date.now() - started
      await recordUsage({
        route: req.route, task: req.task, userId: req.userId,
        inChars, outChars: out.length, latencyMs,
        status: 'ok', provider: provider.id, model: r.model,
      })
      return { text: out, inChars, outChars: out.length, latencyMs }
    } catch (e) {
      lastErr = e
      if (e instanceof ProviderCapabilityError || e instanceof ProviderConfigError) {
        // قابلیت/پیکربندی — بدون تلاش مجدد؛ ثبت و تبدیل به خطای شفاف
        const latencyMs = Date.now() - started
        await recordUsage({
          route: req.route, task: req.task, userId: req.userId,
          inChars, outChars: 0, latencyMs,
          status: 'error', provider: provider.id, model: provider.id,
        })
        throw e instanceof ProviderCapabilityError ? new GatewayLocalOnlyError() : new GatewayConfigError(e.message)
      }
      if (attempt === 0 && isTransientError(e)) continue // حداکثر یک تلاش مجدد
      break
    }
  }
  const latencyMs = Date.now() - started
  await recordUsage({
    route: req.route, task: req.task, userId: req.userId,
    inChars, outChars: 0, latencyMs,
    status: 'error', provider: provider.id, model: provider.id,
  })
  console.error('gateway: provider error', lastErr instanceof Error ? lastErr.message : lastErr)
  throw new GatewayProviderError()
}

/** خروجی ساختاریافته با همان گاردهای Gateway */
export async function gatewayRunJson<T>(req: GatewayRequest): Promise<T> {
  const r = await gatewayRun(req)
  const parsed = extractJson<T>(r.text)
  if (parsed === null) throw new GatewayProviderError()
  return parsed
}

// ── استریم — همچنان فقط از Gateway (هیچ API مستقیم به ارائه‌دهنده) ──
/**
 * gatewayRunStream: تمام گاردهای gatewayRun (کلید قطع، سقف ورودی، سهمیه)
 * را قبل از شروع استریم اعمال می‌کند. متن تکه‌ها از Gateway عبور می‌کند ولی
 * نگهداری نمی‌شود؛ ثبت مصرف پس از پایان استریم با recordStreamUsage انجام
 * می‌شود (فقط فراداده — شمار بایت تخمینی و زمان).
 */
export async function gatewayRunStream(
  req: GatewayRequest,
): Promise<{ stream: ReadableStream<Uint8Array>; providerId: string }> {
  const { provider, ctx } = await resolveEngine(req.userId)

  if (provider.consumesQuota && (await aiKillSwitchOn())) {
    await recordUsage({
      route: req.route, task: req.task, userId: req.userId,
      inChars: 0, outChars: 0, latencyMs: 0,
      status: 'disabled', provider: provider.id, model: provider.id,
    })
    throw new GatewayDisabledError()
  }
  if (!provider.stream) throw new GatewayLocalOnlyError()

  const limits = quotaLimits()
  const inChars = req.messages.reduce((n, m) => n + m.content.length, 0)
  if (inChars > limits.maxInputChars) throw new GatewayProviderError()

  if (provider.consumesQuota) {
    const usage = await countUsage(req.userId)
    const decision = quotaDecision(usage, limits)
    if (!decision.allow) {
      await recordUsage({
        route: req.route, task: req.task, userId: req.userId,
        inChars, outChars: 0, latencyMs: 0,
        status: 'quota_exceeded', provider: provider.id, model: provider.id,
      })
      throw new GatewayQuotaError(decision.reason, decision.resetHours)
    }
  }

  try {
    const stream = await provider.stream(req.messages, ctx)
    return { stream, providerId: provider.id }
  } catch (e) {
    if (e instanceof ProviderConfigError) throw new GatewayConfigError(e.message)
    if (e instanceof ProviderCapabilityError) throw new GatewayLocalOnlyError()
    throw e
  }
}

/** ثبت مصرف استریم پس از پایان — از مسیر فراخوان صدا زده می‌شود */
export async function recordStreamUsage(args: {
  route: string
  task: string
  userId: string
  inChars: number
  outBytes: number
  latencyMs: number
  status: string
  provider?: string
  model?: string
}): Promise<void> {
  await recordUsage({
    route: args.route,
    task: args.task,
    userId: args.userId,
    inChars: args.inChars,
    outChars: Math.round(args.outBytes / 4), // تخمین نویسه از بایت (UTF-8 فارسی)
    latencyMs: args.latencyMs,
    status: args.status,
    provider: args.provider ?? 'unknown',
    model: args.model ?? 'unknown',
  })
}

export { extractJson }
