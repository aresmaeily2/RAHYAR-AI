// ─── پارس هوشمند زبان طبیعی فارسی برای افزودن سریع کار ──────
// استراتژی قطعی (deterministic) طبق طراحی «رهیار»: تشخیص تاریخ،
// ساعت، اولویت و برچسب بدون نیاز به مدل زبانی — سریع و آفلاین.

import { addDaysIso, tehranIsoDate, tehranParts, toEnDigits } from './persian-date'
import type { RepeatMode } from './types'

export interface ParsedQuickTask {
  title: string
  dueDate?: string // YYYY-MM-DD
  dueTime?: string // HH:mm
  priority?: 1 | 2 | 3
  tag?: string
  repeat?: RepeatMode
  tokens: string[] // بخش‌هایی که از عنوان حذف شدند
}

const WEEKDAYS: Array<{ names: string[]; index: number }> = [
  { names: ['شنبه', 'saturday', 'sat'], index: 0 },
  { names: ['یکشنبه', 'يكشنبه', 'sunday', 'sun'], index: 1 },
  { names: ['دوشنبه', 'monday', 'mon'], index: 2 },
  { names: ['سه‌شنبه', 'سه شنبه', 'سشنبه', 'tuesday', 'tue', 'tues'], index: 3 },
  { names: ['چهارشنبه', 'چارشنبه', 'wednesday', 'wed'], index: 4 },
  { names: ['پنجشنبه', 'پنج شنبه', 'پنجشنبه', 'thursday', 'thu', 'thurs'], index: 5 },
  { names: ['جمعه', 'friday', 'fri'], index: 6 },
]

function matchRelativeDay(text: string, tokens: string[]): string | undefined {
  let m = text.match(/پس\s?فردا|day after tomorrow/)
  if (m) {
    tokens.push(m[0])
    return addDaysIso(tehranIsoDate(), 2)
  }
  m = text.match(/فردا|tomorrow/)
  if (m) {
    tokens.push(m[0])
    return addDaysIso(tehranIsoDate(), 1)
  }
  m = text.match(/(?:^|\s)(?:امروز|today)(?=$|\s)/)
  if (m) {
    tokens.push(m[0].trim())
    return tehranIsoDate()
  }
  return undefined
}

function matchWeekday(text: string, tokens: string[]): string | undefined {
  for (const wd of WEEKDAYS) {
    for (const name of wd.names) {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`(?:^|\\s)${esc}(?=$|\\s)`, 'i')
      if (re.test(text)) {
        tokens.push(name)
        const today = tehranParts().weekdayIndex
        const delta = (wd.index - today + 7) % 7
        return addDaysIso(tehranIsoDate(), delta)
      }
    }
  }
  return undefined
}

function matchTime(text: string, tokens: string[]): string | undefined {
  // ساعت ۹ / ساعت ۹:۳۰ / ساعت ۲۱ و ۳۰
  const re = /ساعت\s*(\d{1,2})\s*(?::|：|\.|و)\s*(\d{1,2})?|ساعت\s*(\d{1,2})/
  let m = text.match(re)
  if (!m) {
    // انگلیسی — فقط با قید صریح زمان: at 8 / at 8:30 / 8am / 9:15pm / at 9 o'clock
    // بدون «at» یا am/pm عددِ معمولی متن به ساعت تفسیر نمی‌شود (بدون مثبت کاذب)
    const en = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b|\b(\d{1,2})(?::(\d{2}))?\s*(?:a\.?m\.?|p\.?m\.?)\b|\bat\s+(\d{1,2})\s+o'?clock/i)
    if (!en) return undefined
    const hourS = en[1] ?? en[4] ?? en[6]
    const minS = en[2] ?? en[5]
    const ap = (en[3] ?? en[0].match(/(?:a\.?m\.?|p\.?m\.?)/i)?.[0] ?? '')?.toLowerCase()
    if (!hourS) return undefined
    let hour = parseInt(hourS, 10)
    const minute = minS ? parseInt(minS, 10) : 0
    if (Number.isNaN(hour) || hour > 23 || minute > 59) return undefined
    if (/p\.?m/.test(ap) && hour < 12) hour += 12
    if (/a\.?m/.test(ap) && hour === 12) hour = 0
    tokens.push(en[0].replace(/^\s*/, ''))
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const hourStr = m[1] ?? m[3]
  const minStr = m[2]
  let hour = parseInt(hourStr, 10)
  const minute = minStr ? parseInt(minStr, 10) : 0
  if (Number.isNaN(hour) || hour > 23 || minute > 59) return undefined

  // صبح / ظهر / عصر / شب
  const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 8)
  const before = text.slice(Math.max(0, (m.index ?? 0) - 8), m.index ?? 0)
  const ctx = after + ' ' + before
  if (/شب|عصر/.test(ctx) && hour < 12) hour += 12
  if (/صبح/.test(ctx) && hour === 12) hour = 0

  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  tokens.push(m[0].trim())
  return timeStr
}

function matchPriority(text: string, tokens: string[]): 1 | 2 | 3 | undefined {
  const high = text.match(/فوری|مهم|بحرانی|حیاتی|مهم‌ترین|ضروری|\b(?:urgent|important|critical|asap)\b/i)
  if (high) {
    tokens.push(high[0])
    return 1
  }
  const low = text.match(/کم\s?اهمیت|اختیاری|بی\s?عجله|\b(?:low priority|optional|whenever)\b/i)
  if (low) {
    tokens.push(low[0])
    return 3
  }
  return undefined
}

/** تشخیص تکرار: هر روز، روزانه، هر هفته، هفتگی — + انگلیسی */
function matchRepeat(text: string, tokens: string[]): RepeatMode {
  const daily = text.match(/هر\s?روز|روزانه|هر\s?روزه|\b(?:every day|everyday|daily)\b/i)
  if (daily) {
    tokens.push(daily[0])
    return 'daily'
  }
  const weekly = text.match(/هر\s?هفته|هفتگی|هر\s?هفته‌ای|\b(?:every week|weekly)\b/i)
  if (weekly) {
    tokens.push(weekly[0])
    return 'weekly'
  }
  return null
}

function matchTag(text: string, tokens: string[]): string | undefined {
  const m = text.match(/#([\w\u0600-\u06FF\u200c]+)/)
  if (!m) return undefined
  tokens.push(m[0])
  return m[1]
}

/** پارسر سریع کار از متن آزاد فارسی */
export function parseQuickTask(raw: string): ParsedQuickTask {
  let text = toEnDigits(raw).replace(/‌/g, '‌')
  const tokens: string[] = []

  const repeat = matchRepeat(text, tokens)
  const dueDate = matchRelativeDay(text, tokens) ?? matchWeekday(text, tokens)
  const dueTime = matchTime(text, tokens)
  const priority = matchPriority(text, tokens)
  const tag = matchTag(text, tokens)

  // حذف توکن‌های شناسایی‌شده از عنوان
  let title = toEnDigits(raw)
  for (const t of tokens) {
    title = title.replace(t, ' ')
  }
  title = title
    .replace(/[#]/g, ' ')
    // برش فعل پیشین ثبت — فعلِ فرمان نباید داخل عنوان کار بماند
    .replace(/^(بذار|بزار|اضافه\s*کن|اضافهش\s*کن|ثبت\s*کن|یادداشت\s*کن|بنویس|بگم\s*که|بگو\s*که|درج\s*کن|please\s+|add|create|new\s+task)[\s:،,-]*/i, ' ')
    // فعلِ فرمان در «انتهای» جمله هم رایج است: «... برای فردا اضافه کن»
    .replace(/[\s:،,-]*(اضافه\s*کن|اضافهش\s*کن|ثبت\s*کن|درج\s*کن|ایجاد\s*کن|بساز|remember|add(?:\s+it)?|create)[.،,!]*\s*$/i, ' ')
    // حذف قید «لطفاً/لطفا» در هر موقعیت
    .replace(/(?:^|\s)لطفا[ً]?(?=\s|$)/g, ' ')
    // حذف قالب‌های گفتاری رایج: «یک وظیفه با عنوان ...»، «یه کار ...»
    .replace(/(?:^|\s)(یک|یه)\s+(وظیفه|کار|یادآور|reminders?|tasks?)(\s+(جدید|new))?(\s+(با\s+عنوان|به\s+نام|برای))?/g, ' ')
    // حذف «با عنوان/به نام» مستقل و رابط «برای/که» سرگردان در انتها
    .replace(/(?:^|\s)(با\s+عنوان|به\s+نام|به\s+عنوان)(?=\s|$)/g, ' ')
    .replace(/[\s:،,-]*(برای|که|روی|رو)(?=[\s:،,-]*$)/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—،,]+|[\s\-–—،,]+$/g, '')
    .trim()

  // ── عنوان نقل‌قولی — بالاترین اعتماد ────────────────────────
  // اگر نویسنده عنوان را داخل گیومه/کوتیشن گذاشته («...» یا "...")،
  // همانِ داخل نقل‌قول، عنوان واقعی کار است — نه جملهٔ کامل.
  const nText = toEnDigits(raw)
  const qFa = raw.match(/«([^»\n]{2,120})»/)
  const qEn = nText.match(/"([^"\n]{2,120})"/)
  const quoted = qFa?.[1] ?? qEn?.[1]
  if (quoted) {
    const qt = quoted.replace(/[#]/g, ' ').replace(/\s+/g, ' ').trim()
    if (qt.length >= 2) title = qt
  } else {
    // الگوی «با عنوان X» بدون گیومه — X تا «برای/ساعت/...» یا پایان
    // توجه: \b در JS مرز ASCII است و با حروف فارسی کار نمی‌کند → مرز دستی
    const byTitle = nText.match(/(?:با\s+عنوان|به\s+نام)\s+([^،,؛;\n]+?)(?=\s+(?:برای|روی|رو|در|ساعت|فردا|پس\s?فردا|امروز)(?=[\s،,؛;!?.]|$)|[،,؛;]|$)/i)
    if (byTitle?.[1]) {
      const bt = byTitle[1].replace(/[#]/g, ' ').replace(/\s+/g, ' ').trim()
      if (bt.length >= 2) title = bt
    }
  }

  if (!title) title = raw.trim()

  return { title, dueDate, dueTime, priority, tag, repeat, tokens }
}

/** برچسب‌های پیشنهادی استاندارد */
export const STANDARD_TAGS = ['کار', 'شخصی', 'خرید', 'سلامت', 'مطالعه', 'خانه', 'مالی']
