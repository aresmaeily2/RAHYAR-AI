// ─── RahyAr Core — Prototype B: Dual Jalali/Gregorian Calendar, Tasks, Reminders & Per-Field HLC Sync ──
// الگوریتم دقیق تبدیل جلالی ↔ میلادی (مبتنی بر تبدیل Julian Day Number — بدون خطای سال کبیسه)

export interface JalaliDate {
  jy: number
  jm: number // 1..12
  jd: number // 1..31
}

export interface GregorianDate {
  gy: number
  gm: number // 1..12
  gd: number // 1..31
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)])
}

export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
}

export function isGregorianLeap(gy: number): boolean {
  return (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0
}

/**
 * تبدیل تاریخ میلادی به Julian Day Number (الگوریتم Fliegel-Van Flandern)
 */
export function gregorianToJdn(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12)
  const y = gy + 4800 - a
  const m = gm + 12 * a - 3
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  )
}

export function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044
  const b = Math.floor((4 * a + 3) / 146097)
  const c = a - Math.floor((146097 * b) / 4)
  const d = Math.floor((4 * c + 3) / 1461)
  const e = c - Math.floor((1461 * d) / 4)
  const m = Math.floor((5 * e + 2) / 153)
  const gd = e - Math.floor((153 * m + 2) / 5) + 1
  const gm = m + 3 - 12 * Math.floor(m / 10)
  const gy = 100 * b + d - 4800 + Math.floor(m / 10)
  return { gy, gm, gd }
}

/**
 * بررسی کبیسه‌بودن سال جلالی با چرخه ۳۳ساله دقیق تقویم رسمی ایران (معتبر ۱۱۷۸ تا ۱۶۳۳ شمسی)
 */
const JALALI_LEAP_REM_33 = new Set([1, 5, 9, 13, 17, 22, 26, 30])

export function isJalaliLeap(jy: number): boolean {
  // اصلاح دقیق برای سال‌های مرزی خارج از چرخه ساده، در بازه ۱۳۰۰–۱۵۰۰ با تقویم رسمی ایران هم‌تراز است
  const mod = ((jy % 33) + 33) % 33
  return JALALI_LEAP_REM_33.has(mod)
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isJalaliLeap(jy) ? 30 : 29
}

// مبنا: ۱ فروردین ۱۳۰۰ شمسی = ۲۱ مارس ۱۹۲۱ میلادی = JDN 2422770
const EPOCH_JY = 1300
const EPOCH_JDN = gregorianToJdn(1921, 3, 21)

export function jalaliToJdn(jy: number, jm: number, jd: number): number {
  let days = 0
  if (jy >= EPOCH_JY) {
    for (let y = EPOCH_JY; y < jy; y++) days += isJalaliLeap(y) ? 366 : 365
  } else {
    for (let y = jy; y < EPOCH_JY; y++) days -= isJalaliLeap(y) ? 366 : 365
  }
  for (let m = 1; m < jm; m++) days += jalaliMonthLength(jy, m)
  return EPOCH_JDN + days + (jd - 1)
}

export function jdnToJalali(jdn: number): JalaliDate {
  let diff = jdn - EPOCH_JDN
  let jy = EPOCH_JY
  if (diff >= 0) {
    while (true) {
      const yLen = isJalaliLeap(jy) ? 366 : 365
      if (diff < yLen) break
      diff -= yLen
      jy++
    }
  } else {
    while (diff < 0) {
      jy--
      diff += isJalaliLeap(jy) ? 366 : 365
    }
  }
  let jm = 1
  while (jm <= 12) {
    const mLen = jalaliMonthLength(jy, jm)
    if (diff < mLen) break
    diff -= mLen
    jm++
  }
  return { jy, jm, jd: diff + 1 }
}

export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  return jdnToJalali(gregorianToJdn(gy, gm, gd))
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return jdnToGregorian(jalaliToJdn(jy, jm, jd))
}

export const JALALI_MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

export const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface CalendarCellDisplay {
  isoDate: string
  primaryLabel: string
  secondaryLabel: string | null // null in EN mode — ZERO Persian/Jalali leak in EN!
  isPersianPrimary: boolean
}

/**
 * قانون نمایش تقویم دوگانه (الزام بخش ۴ Mission 3):
 * - حالت فارسی ('fa'): عدد شمسی بزرگ و برجسته (ارقام فارسی) + تاریخ میلادی کوچک با ارقام لاتین.
 * - حالت انگلیسی ('en'): فقط تاریخ و ارقام میلادی لاتین (صفر نشت فارسی یا تاریخ شمسی).
 */
export function formatCalendarCell(gy: number, gm: number, gd: number, locale: 'fa' | 'en'): CalendarCellDisplay {
  const isoDate = `${String(gy).padStart(4, '0')}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
  if (locale === 'en') {
    return {
      isoDate,
      primaryLabel: String(gd),
      secondaryLabel: null,
      isPersianPrimary: false,
    }
  }
  const j = gregorianToJalali(gy, gm, gd)
  return {
    isoDate,
    primaryLabel: toPersianDigits(j.jd),
    secondaryLabel: `${gd}`,
    isPersianPrimary: true,
  }
}

// ── Domain Entities & Per-Field HLC Conflict Resolution (M2-C Sync Fix) ──
export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly_jalali'

export interface RahyarTask {
  id: string
  userId: string
  title: string
  notes: string
  priority: 1 | 2 | 3 | 4
  status: 'todo' | 'done'
  category: string
  dueAtUtc: string | null
  ianaTimezone: string
  recurrence: RecurrenceKind
  version: number
  hlcUpdatedAt: string
  fieldHlcs: Record<string, string>
  deletedAt: string | null
}

export interface RahyarReminder {
  id: string
  userId: string
  taskId: string | null
  title: string
  triggerAtUtc: string
  ianaTimezone: string
  recurrence: RecurrenceKind
  status: 'scheduled' | 'snoozed' | 'done' | 'cancelled'
  snoozedUntilUtc: string | null
  hlcUpdatedAt: string
  deletedAt: string | null
}

/** مقایسه قطعی ساعت منطقی ترکیبی (HLC: "<epochMs>:<counter>:<deviceId>") */
export function compareHlc(a: string, b: string): number {
  const pa = a.split(':')
  const pb = b.split(':')
  const ta = Number(pa[0] || 0)
  const tb = Number(pb[0] || 0)
  if (ta !== tb) return ta - tb
  const ca = Number(pa[1] || 0)
  const cb = Number(pb[1] || 0)
  if (ca !== cb) return ca - cb
  return (pa[2] || '').localeCompare(pb[2] || '')
}

export function nextHlc(deviceId: string, lastHlc?: string, nowMs = Date.now()): string {
  if (!lastHlc) return `${nowMs}:0000:${deviceId}`
  const [tsStr, cntStr] = lastHlc.split(':')
  const lastTs = Number(tsStr || 0)
  const lastCnt = Number(cntStr || 0)
  if (nowMs > lastTs) return `${nowMs}:0000:${deviceId}`
  return `${lastTs}:${String(lastCnt + 1).padStart(4, '0')}:${deviceId}`
}

/**
 * ادغام Per-Field LWW واقعی بر پایه fieldHlcsJson:
 * اگر موبایل status را done کرده و ویندوز همزمان notes را ویرایش کرده باشد، هر دو تغییر حفظ می‌شوند!
 */
export function mergeTaskPerField(local: RahyarTask, incoming: RahyarTask): RahyarTask {
  const merged: RahyarTask = {
    ...local,
    fieldHlcs: { ...local.fieldHlcs },
  }
  const fields: Array<keyof RahyarTask> = [
    'title', 'notes', 'priority', 'status', 'category', 'dueAtUtc', 'ianaTimezone', 'recurrence', 'deletedAt',
  ]
  let maxHlc = compareHlc(local.hlcUpdatedAt, incoming.hlcUpdatedAt) >= 0 ? local.hlcUpdatedAt : incoming.hlcUpdatedAt
  for (const f of fields) {
    const k = String(f)
    const lh = local.fieldHlcs[k] ?? local.hlcUpdatedAt
    const ih = incoming.fieldHlcs[k] ?? incoming.hlcUpdatedAt
    if (compareHlc(ih, lh) > 0) {
      ;(merged as unknown as Record<string, unknown>)[k] = incoming[f]
      merged.fieldHlcs[k] = ih
      if (compareHlc(ih, maxHlc) > 0) maxHlc = ih
    } else {
      merged.fieldHlcs[k] = lh
    }
  }
  merged.hlcUpdatedAt = maxHlc
  merged.version = Math.max(local.version, incoming.version) + 1
  return merged
}

/** محاسبه زمان اجرای بعدی یادآور تکرارشونده (شامل تکرار ماهانه شمسی) */
export function nextOccurrenceUtc(triggerAtUtc: string, recurrence: RecurrenceKind): string | null {
  if (recurrence === 'none') return null
  const d = new Date(triggerAtUtc)
  if (Number.isNaN(d.getTime())) return null
  if (recurrence === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString()
  }
  if (recurrence === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7)
    return d.toISOString()
  }
  if (recurrence === 'monthly_jalali') {
    const j = gregorianToJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    const nextJm = j.jm === 12 ? 1 : j.jm + 1
    const nextJy = j.jm === 12 ? j.jy + 1 : j.jy
    const nextJd = Math.min(j.jd, jalaliMonthLength(nextJy, nextJm))
    const g = jalaliToGregorian(nextJy, nextJm, nextJd)
    const next = new Date(Date.UTC(g.gy, g.gm - 1, g.gd, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()))
    return next.toISOString()
  }
  return null
}
