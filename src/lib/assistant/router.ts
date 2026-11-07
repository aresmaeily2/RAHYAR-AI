// ─── مسیریاب نیت قطعی دستیار (بخش ۶ و ۷ دستور اجرایی) ───────
// اصل: اگر مدل لازم نیست، مدل فراخوانی نمی‌شود.
// نیت‌های ساده و کم‌ریسک با قواعد فارسی/انگلیسی قطعی اجرا می‌شوند:
//   add_task | complete_task | daily_report | list_today | start_focus | help
// هر چیز مبهم یا پرریسک (حذف، تغییر، برنامه‌ریزی) → مسیر مدل با گاردهای خودش.
// توابع خالص و آزمون‌پذیرند؛ اجرای اکشن در server-ai انجام می‌شود.

import { parseQuickTask, type ParsedQuickTask } from '@/lib/nlp'
import { parseExpensePhrase, type ParsedExpense } from '@/lib/assistant/expense'

export type { ParsedExpense }

/** محدودهٔ گزارش مالی — عین تعریف src/lib/finance/summary.ts (رویتر خالص می‌ماند) */
export type FinanceRange = 'today' | 'week' | 'month'

export type DeterministicIntent =
  | { kind: 'add_task'; parsed: ParsedQuickTask }
  // F7: فرمان مالی گفتاری — «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن»
  // هرگز نباید Task بسازد؛ مسیر تأییددار مالی می‌رود (پندینگ + تأیید صریح)
  | { kind: 'add_expense'; parsed: ParsedExpense }
  | { kind: 'complete_task'; rawTitle: string }
  | { kind: 'daily_report' }
  | { kind: 'finance_report'; range: FinanceRange }
  | { kind: 'list_today' }
  | { kind: 'start_focus' }
  | { kind: 'help' }
  | { kind: 'model' }

// ── الگوهای نیت (فارسی محاوره‌ای + رسمی + انگلیسی) ───────────
const ADD_VERBS =
  /(?:بذار|بزار|بساز|بسازم|بسازید|ایجاد\s*کن|اضافه\s*کن|اضافهش\s*کن|ثبت\s*کن|یادداشت\s*کن|بنویس|بگم\s*که|بگو\s*که|درج\s*کن|(?:وظیفه|کار)\s*جدید|\badd\b|\bcreate\b|\bnew task\b|\btask\s*:|\bremind me to add\b)/i
const REMINDER_VERBS = /(?:یادم\s*بنداز|یادآوری\s*کن|یادت\s*باشه|یادت\s*باشه\s*که)/
export { REMINDER_VERBS }
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
// F-AG1: گزارش مالی قطعی — «مخارج این هفته را جمع کن و گزارش بده»
const FINANCE_PATTERNS =
  /(?:مخارج|هزینه(?:‌?ها)?|خرج|درآمدها?|مصرف|پول).{0,24}(?:جمع|گزارش|خلاصه|چقدر|چند|بالانس)|جمع\s*(?:زن|بزن).{0,12}(?:مخارج|خرج|هزینه)|گزارش\s*مالی|خلاصه\s*مالی|\bhow much (?:did i spend|have i spent)\b|\bspending (?:report|summary)\b|\bexpense (?:report|summary)\b/i

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
  const asksFinance = FINANCE_PATTERNS.test(text)

  // کمک/راهنما — قطعی و بدون مدل
  if (asksHelp && !asksAdd) return { kind: 'help' }

  // F7: ثبت هزینه/درآمد — فقط وقتی اسم پولی + مبلغ هست و واژهٔ تجمیعی نیست؛
  // پیش از گزارش مالی و ثبت کار سنجیده می‌شود (نوشتن فقط بعد از تأیید صریح کاربر)
  const expense = parseExpensePhrase(text)
  if (expense) return { kind: 'add_expense', parsed: expense }

  // F-AG1: گزارش مالی — قطعی با اعداد واقعی (محدوده پیش‌فرض: هفته)
  if (asksFinance && !asksAdd) {
    return { kind: 'finance_report', range: extractFinanceRange(text) }
  }
  // گارد ابهام مالی+ثبت — مسیر مدل با تأیید کاربر
  if (asksFinance && asksAdd) return { kind: 'model' }

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
 * استخراج محدودهٔ گزارش مالی از جمله — خالص؛ پیش‌فرض هفتهٔ جاری تهران
 * «مخارج این هفته» ← week | «این ماه» ← month | «امروز» ← today
 */
export function extractFinanceRange(text: string): FinanceRange {
  const t = text ?? ''
  // نکته: \b با حروف فارسی کار نمی‌کند (فراسنج واژهٔ یونیکد نیست) — مرز دستی با نشانه‌گذاری پایان
  if (/(?:این\s*)?ماه(?=\s|$|[،.,!?؟؛:])|this month|monthly/i.test(t)) return 'month'
  if (/امروز(?=\s|$|[،.,!?؟؛:])|today\b/i.test(t)) return 'today'
  return 'week'
}

/**
 * F-AG3 — گارد مأموریت: الگوهای «اثر واقعی الزامی» که مدل گاهی فقط
 * در reply ادعا می‌کند ولی اکشن نمی‌فرستد (در آزمون زندهٔ ۵ سناریو رخ داد:
 * S3/S4/S5 بدون اکشن). تشخیص خالص — فالبک قطعی در server-ai اجرا می‌شود.
 */
export type MissionGuardKind = 'event_reminder' | 'draft' | 'plan'

export function detectMissionPattern(message: string): MissionGuardKind | null {
  const t = (message ?? '').trim()
  if (t.length < 4) return null
  const wantsEvent =
    /(قرار|جلسه|ملاقات|نوبت|مصاحبه|ویزیت)/.test(t) &&
    /(تقویم|یادآوری|یادم بنداز|یادت باشه|remind|calendar)/i.test(t) &&
    /(اضافه|ثبت|بگذار|بنداز|کن|add|create)/i.test(t)
  if (wantsEvent) return 'event_reminder'
  const wantsDraft =
    /(پیام|متن|ایمیل|اس‌ام‌اس|message|email)/i.test(t) &&
    /(آماده|بنویس|نوشته|تنظیم|draft|prepare|write)/i.test(t) &&
    /(نشان|قبل از ارسال|قبل از فرستادن|show|before sending)/i.test(t)
  if (wantsDraft) return 'draft'
  const wantsPlan =
    /(برنامه.?ریزی|برنامه‌ریزی|برنامه بچین|برنامه بریز|برنامه‌اش را بچین|plan (?:my|the) )/i.test(t) ||
    /(سه|3)\s*کار.{0,20}(برنامه|plan)/i.test(t)
  if (wantsPlan) return 'plan'
  return null
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
