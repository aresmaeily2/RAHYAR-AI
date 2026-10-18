// ─── ابزارهای تاریخ شمسی و زمان فارسی ───────────────────────

const TZ = 'Asia/Tehran'

/** اجزای تاریخ/ساعت به وقت تهران */
export function tehranParts(d: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map((p) => [p.type, p.value]),
  )
  const hour = parseInt(parts.hour === '24' ? '0' : parts.hour, 10)
  const minute = parseInt(parts.minute, 10)
  const weekdays: Record<string, number> = {
    Saturday: 0,
    Sunday: 1,
    Monday: 2,
    Tuesday: 3,
    Wednesday: 4,
    Thursday: 5,
    Friday: 6,
  }
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute,
    weekdayEn: parts.weekday as string,
    weekdayIndex: weekdays[parts.weekday] ?? 0, // ۰ = شنبه
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    timeStr: `${String(hour).padStart(2, '0')}:${parts.minute}`,
  }
}

/** تاریخ ISO (YYYY-MM-DD) به وقت تهران */
export function tehranIsoDate(d: Date = new Date()): string {
  return tehranParts(d).isoDate
}

/** روز تقویمی تهران (YYYY-MM-DD) برای یک لحظه UTC — منبع واحد مقایسه‌های روزانه */
export function tehranDayOf(isoUtc: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoUtc))
  } catch {
    return isoUtc.slice(0, 10)
  }
}

/** تاریخ میلادی ISO → شمسی خوانا با ارقام فارسی */
export function formatJalali(
  iso: string | Date,
  opts: { weekday?: boolean; short?: boolean } = {},
): string {
  const d = typeof iso === 'string' ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')) : iso
  const o: Intl.DateTimeFormatOptions = opts.short
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  if (opts.weekday) o.weekday = 'long'
  return new Intl.DateTimeFormat('fa-IR', o).format(d)
}

/** «امروز / فردا / دیروز» — دوزبانه؛ انگلیسی: میلادی کامل، صفر ارقام فارسی */
export function relativeDay(iso: string | null, lang: 'fa' | 'en' = 'fa'): string | null {
  if (!iso) return null
  const today = tehranIsoDate()
  const target = iso.slice(0, 10)
  const diff = Math.round(
    (new Date(target + 'T12:00:00').getTime() -
      new Date(today + 'T12:00:00').getTime()) /
      86400000,
  )
  if (lang === 'en') {
    const d = new Date(target + 'T12:00:00.000Z')
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff === 2) return 'Day after tomorrow'
    if (diff === -1) return 'Yesterday'
    if (diff < 0) return `${fmt.format(d)} (overdue)`
    if (diff < 7) return fmt.format(d)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
  }
  if (diff === 0) return 'امروز'
  if (diff === 1) return 'فردا'
  if (diff === 2) return 'پس‌فردا'
  if (diff === -1) return 'دیروز'
  if (diff < 0) return `${formatJalali(target, { short: true })} (عقب‌افتاده)`
  return formatJalali(target, { weekday: diff < 7, short: diff >= 7 })
}

/** سلام بر اساس ساعت تهران */
export function greeting(d: Date = new Date(), lang: 'fa' | 'en' = 'fa'): string {
  const h = tehranParts(d).hour
  if (lang === 'en') {
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    if (h >= 17 && h < 21) return 'Good evening'
    return 'Good night'
  }
  if (h >= 5 && h < 12) return 'صبح بخیر'
  if (h >= 12 && h < 17) return 'ظهر بخیر'
  if (h >= 17 && h < 21) return 'عصر بخیر'
  return 'شب بخیر'
}

/** تاریخ کامل امروز به زبان رابط — فارسی: شمسی؛ انگلیسی: میلادی کامل */
export function todayFull(lang: 'fa' | 'en' = 'fa'): string {
  if (lang === 'en') {
    try {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
    } catch {
      return new Date().toDateString()
    }
  }
  return todayJalaliFull()
}

/** تاریخ شمسی کامل امروز: چهارشنبه ۲۵ مهر ۱۴۰۴ */
export function todayJalaliFull(): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  } catch {
    return ''
  }
}

/** افزودن n روز به تاریخ ISO */
export function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** تبدیل ارقام فارسی/عربی به انگلیسی */
export function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
}

// ─── تقویم شمسی (Jalali) برای نمای تقویم ────────────────────

export interface JalaliParts {
  jy: number
  jm: number // ۱..۱۲
  jd: number // ۱..۳۱
}

/** تبدیل میلادی → شمسی (الگوریتم استاندارد) */
export function toJalali(date: Date): JalaliParts {
  const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
    timeZone: TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    jy: parseInt(parts.year, 10),
    jm: parseInt(parts.month, 10),
    jd: parseInt(parts.day, 10),
  }
}

/** تبدیل شمسی → میلادی (الگوریتم استاندارد jalaali) */
export function toGregorian(jy: number, jm: number, jd: number): Date {
  // الگوریتم jalaali-js (ساده‌شده)
  function div(a: number, b: number) {
    return ~~(a / b)
  }
  let gy = jy <= 979 ? 621 : 1600
  jy -= jy <= 979 ? 0 : 979
  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) * 1 +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * div(days, 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * div(--days, 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * div(days, 1461)
  days %= 1461
  if (days > 365) {
    gy += div(days - 1, 365)
    days = (days - 1) % 365
  }
  let gd = days + 1
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  let gm = 0
  for (gm = 1; gm <= 12 && gd > sal_a[gm]; gm++) gd -= sal_a[gm]
  return new Date(gy, gm - 1, gd, 12, 0, 0)
}

export const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

/** طول ماه شمسی — از خود تبدیل ICU-سازگار مشتق می‌شود (رفع باگ فرمول بیرشک: اسفند ۱۴۰۳ کبیسه بود ولی ۲۹ روز می‌داد) */
export function jalaliMonthLength(jy: number, jm: number): number {
  const start = toGregorian(jy, jm, 1)
  const nextJy = jm === 12 ? jy + 1 : jy
  const nextJm = jm === 12 ? 1 : jm + 1
  const next = toGregorian(nextJy, nextJm, 1)
  return Math.round((next.getTime() - start.getTime()) / 86400000)
}

/** ایندکس هفته (۰=شنبه) برای روز اول ماه شمسی */
export function jalaliMonthStartWeekday(jy: number, jm: number): number {
  const g = toGregorian(jy, jm, 1)
  return g.getDay() === 6 ? 0 : g.getDay() + 1 // یکشنبه=1 → ایندکس ۱
}

/** رشته ISO (YYYY-MM-DD میلادی به وقت تهران) از روز شمسی */
export function jalaliToIsoDate(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd)
  const y = g.getFullYear()
  const m = String(g.getMonth() + 1).padStart(2, '0')
  const d = String(g.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** تبدیل ISO میلادی به بخش‌های شمسی */
export function isoToJalali(iso: string): JalaliParts {
  return toJalali(new Date(iso.slice(0, 10) + 'T12:00:00'))
}

/** عدد فارسی بدون جداکننده — برای نمایش سریع */
export function faNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)])
}
