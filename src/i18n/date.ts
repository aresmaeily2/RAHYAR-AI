// ─── نمایش تاریخ — آگاه از زبان و حالت تقویم ──────────────────
// fa + jalali: «۷ مهر ۱۴۰۴»    |  en + gregorian: "October 9, 2025"
// dual: شمسی بزرگ + میلادی کوچک (در خود تقویم) یا «۷ مهر ۱۴۰۴ / Oct 9»

import { formatNum, type Lang } from './core'
import type { CalendarMode } from '@/lib/types'

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function jalaliMonthName(m: number, lang: Lang): string {
  const name = JALALI_MONTHS[(m - 1 + 12) % 12]
  return lang === 'en'
    ? ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'][(m - 1 + 12) % 12]
    : name
}

export function gregorianMonthName(m: number, lang: Lang): string {
  const name = GREGORIAN_MONTHS_EN[(m - 1 + 12) % 12]
  return lang === 'fa'
    ? ['ژانویه', 'فوریه', 'مارس', 'آپریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'][(m - 1 + 12) % 12]
    : name
}

/** عنوان ماه تقویم بر اساس زبان و حالت — انگلیسی همیشه میلادی (معیار مأموریت) */
export function monthTitle(
  mode: CalendarMode,
  lang: Lang,
  jy: number,
  jm: number,
  gy: number,
  gm: number,
): string {
  if (lang === 'en') mode = 'gregorian'
  if (mode === 'gregorian') {
    return lang === 'en' ? `${gregorianMonthName(gm, 'en')} ${gy}` : `${gregorianMonthName(gm, 'fa')} ${formatNum(gy, 'fa')}`
  }
  if (mode === 'dual') {
    const j = `${jalaliMonthName(jm, lang)} ${formatNum(jy, lang)}`
    // معیار مأموریت: بخش میلادی در حالت دوگانه همیشه انگلیسی است
    const g = `${gregorianMonthName(gm, 'en')} ${gy}`
    return `${j} / ${g}`
  }
  return `${jalaliMonthName(jm, lang)} ${formatNum(jy, lang)}`
}

/** تاریخ طولانی روز (سررسید‌ها و هدر) بر اساس زبان و حالت — انگلیسی همیشه میلادی */
export function longDate(
  iso: string,
  mode: CalendarMode,
  lang: Lang,
): string {
  if (lang === 'en') mode = 'gregorian'
  const d = new Date(iso + 'T12:00:00.000Z')
  if (Number.isNaN(d.getTime())) return iso
  // شمسی از طریق Intl با تقویم persian (در هر دو زبان درست کار می‌کند)
  const jy = Number(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(d).replace(/[^\d]/g, ''))
  const jm = new Intl.DateTimeFormat('en-u-ca-persian', { month: 'numeric' }).formatToParts(d).find((p) => p.type === 'month')?.value ?? '1'
  const jd = new Intl.DateTimeFormat('en-u-ca-persian', { day: 'numeric' }).formatToParts(d).find((p) => p.type === 'day')?.value ?? '1'
  const gy = d.getUTCFullYear()
  const gm = d.getUTCMonth() + 1
  const gd = d.getUTCDate()

  const jStr = lang === 'fa'
    ? `${formatNum(Number(jd), 'fa')} ${jalaliMonthName(Number(jm), 'fa')} ${formatNum(jy, 'fa')}`
    : `${jalaliMonthName(Number(jm), 'en')} ${jd}, ${jy}`
  const gStrEn = `${gregorianMonthName(gm, 'en')} ${gd}, ${gy}`
  const gStrFa = `${formatNum(gd, 'fa')} ${gregorianMonthName(gm, 'fa')} ${formatNum(gy, 'fa')}`

  if (mode === 'dual') return `${jStr} / ${gStrEn}` // بخش میلادی همیشه انگلیسی
  if (mode === 'gregorian') return lang === 'en' ? gStrEn : gStrFa
  return jStr
}
