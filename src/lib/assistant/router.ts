// ─── مسیریاب نیت قطعی دستیار (بخش ۶ و ۷ دستور اجرایی) ───────
// اصل: اگر مدل لازم نیست، مدل فراخوانی نمی‌شود.
// نیت‌های ساده و کم‌ریسک با قواعد فارسی/انگلیسی قطعی اجرا می‌شوند:
//   add_task | complete_task | daily_report | list_today | start_focus | help
// هر چیز مبهم یا پرریسک (حذف، تغییر، برنامه‌ریزی) → مسیر مدل با گاردهای خودش.
// توابع خالص و آزمون‌پذیرند؛ اجرای اکشن در server-ai انجام می‌شود.

import { parseQuickTask, type ParsedQuickTask } from '@/lib/nlp'

export type DeterministicIntent =
  | { kind: 'add_task'; parsed: ParsedQuickTask }
  | { kind: 'complete_task'; rawTitle: string }
  | { kind: 'daily_report' }
  | { kind: 'list_today' }
  | { kind: 'start_focus' }
  | { kind: 'help' }
  | { kind: 'model' }

// ── الگوهای نیت (فارسی محاوره‌ای + رسمی + انگلیسی) ───────────
const ADD_VERBS =
  /(?:بذار|بزار|اضافه\s*کن|اضافهش\s*کن|ثبت\s*کن|یادداشت\s*کن|بنویس|بگم\s*که|بگو\s*که|درج\s*کن|\badd\b|\bcreate\b|\bnew task\b|\bremind me to add\b)/i
const REMINDER_VERBS = /(?:یادم\s*بنداز|یادآوری\s*کن|یادت\s*باشه|یادت\s*باشه\s*که)/
const REPORT_PATTERNS =
  /(?:گزارش\s*(?:امروز|روز|روزانه)|امروز\s*چی\s*(?:شد|کار\s*شد)|وضعیت\s*امروز|چه\s*کارهایی\s*(?:انجام|تمام)\s*شد|\bdaily report\b|what did i do today|today'?s report)/i
const LIST_TODAY_PATTERNS =
  /(?:کارهای\s*(?:امروز|این\s*امروز)|لیست\s*(?:امروز|کارها)|چه\s*کارهایی\s*دارم|کارام\s*چیه|کارهایم\s*چیه|\bmy tasks\b|\blist tasks\b|what are my tasks|what do i have to do)/i
const COMPLETE_PATTERNS =
  /(?:انجام\s*شد|انجامش\s*دادم|تموم\s*شد|تمام\s*شد|کامل\s*کن|بزن\s*پس|\bmark\b.*\b(?:done|complete)\b|\bi\s+(?:finished|completed|did)\b)/i
const FOCUS_PATTERNS =
  /(?:شروع\s*تمرکز|تمرکز\s*(?:کن|شروع)|پومودورو|زمان\s*تمرکز|تایمر\s*تمرکز|\bstart\s+(?:a\s+)?focus\b|\bpomodoro\b|\bfocus\s+(?:mode|timer)\b)/i
const HELP_PATTERNS =
  /(?:چیکار[\s‌]*می[\s‌]*تونی|چه\s*کارهایی\s*می[\s‌]*تونی|کمک|راهنما|بلدی\s*چیکار|\bwhat\s+can\s+you\s+do\b|\bhelp\b)/i

/**
 * تشخیص نیت قطعی — خالص و بدون اثر جانبی.
 * قاعده ایمنی: اگر پیام هم فعل یادآوری دارد، نیت «ثبت کار» نیست؛
 * یادآوری مسیر مدل خودش را دارد (زمان‌بندی دقیق‌تر با مدل).
 */
export function detectIntent(message: string): DeterministicIntent {
  const text = (message ?? '').trim()
  if (text.length < 2) return { kind: 'model' }

  const asksReport = REPORT_PATTERNS.test(text)
  const asksList = LIST_TODAY_PATTERNS.test(text)
  const asksAdd = ADD_VERBS.test(text)
  const asksComplete = COMPLETE_PATTERNS.test(text)
  const asksFocus = FOCUS_PATTERNS.test(text)
  const asksHelp = HELP_PATTERNS.test(text)

  // کمک/راهنما — قطعی و بدون مدل
  if (asksHelp && !asksAdd) return { kind: 'help' }

  // تمرکز — قطعی
  if (asksFocus && !asksAdd && !asksReport) return { kind: 'start_focus' }

  // گزارش روز / لیست — فقط وقتی درخواست اطلاعات است، نه ثبت
  if (asksReport && !asksAdd) return { kind: 'daily_report' }
  if (asksList && !asksAdd) return { kind: 'list_today' }

  // گارد ابهام: گزارش/لیست + ثبت هم‌زمان → مبهم؛ مسیر مدل با تأیید کاربر
  if ((asksReport || asksList) && asksAdd) return { kind: 'model' }

  // تکمیل کار: «انجام شد ...» + عنوان برای تطبیق فازی
  if (asksComplete && !asksAdd) {
    const rawTitle = extractCompleteTarget(text)
    return { kind: 'complete_task', rawTitle }
  }

  // ثبت کار: فعل ثبت + پارس موفق عنوان (یادآوری مسیر مدل خودش را دارد)
  if (asksAdd && !REMINDER_VERBS.test(text)) {
    const parsed = parseQuickTask(text)
    // عنوان باید واقعی باشد (نه فقط فعل یا توکن‌های زمان)
    if (parsed.title.length >= 2) return { kind: 'add_task', parsed }
  }

  return { kind: 'model' }
}

/**
 * استخراج هدف تکمیل از جمله:
 * «جلسه با تیم انجام شد» → «جلسه با تیم»
 * «تموم شد خرید» → «خرید»
 * انگلیسی: "I finished the report" → "the report"
 */
function extractCompleteTarget(text: string): string {
  let t = text
    .replace(/\bانجام\s*شد\b|\bانجامش\s*دادم\b|\bتموم\s*شد\b|\bتمام\s*شد\b|\bکامل\s*کن\b|\bبزن\s*پس\b/gi, '')
    .replace(/\bi (?:finished|completed|did)\b|\bmark\b|\bas\b|\bdone\b|\bcomplete[ds]?\b|\btick(ed)? off\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  // حذف علائم ابتدا/انتها
  t = t.replace(/^[،,.:؛!؟\s-]+|[،,.:؛!؟\s-]+$/g, '')
  return t
}
