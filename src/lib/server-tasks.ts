// ─── هلپرهای سمت سرور برای کارها ────────────────────────────
import { db } from '@/lib/db'
import type { TaskT } from '@/lib/types'
import { addDaysIso, tehranIsoDate, tehranParts } from './persian-date'
import { detectWeekdayIsoFromMessage, nextWeekdayIso } from './nlp'

/** پیام خوش‌آمد گفتگو — دوزبانه بر اساس زبان کاربر (منبع واحد: رفع A13) */
export function chatWelcome(lang: 'fa' | 'en'): string {
  return lang === 'en'
    ? "Hi! I'm Rahyar, your personal assistant. Tell me anything on your mind and I'll add it, set its due date and priority, and remind you. Try “doctor call tomorrow at 9” or ask me to “plan my day”. I'm right here."
    : 'سلام! من «رهیار» هستم، دستیار شخصی تو. هر کاری که به ذهنت می‌رسد را بهم بگو تا ثبتش کنم، سررسید و اولویتش را مشخص کنم و یادت بندازم. می‌توانی بگویی «فردا ساعت ۹ تماس با دکتر» یا بخواهی «برنامه امروزم را بچینم». من همین‌جا هستم.'
}

/** سازگاری با نام قبلی — پیش‌فرض فارسی */
export const CHAT_WELCOME = chatWelcome('fa')

type TaskWithSubtasks = {
  id: string
  title: string
  notes: string | null
  priority: number
  status: string
  tag: string | null
  dueDate: Date | null
  dueTime: string | null
  starred: boolean
  repeat: string | null
  createdAt: Date
  completedAt: Date | null
  subtasks: Array<{
    id: string
    taskId: string
    title: string
    done: boolean
    order: number
  }>
}

export function serializeTask(t: TaskWithSubtasks): TaskT {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    status: t.status as TaskT['status'],
    tag: t.tag,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    dueTime: t.dueTime,
    starred: t.starred,
    repeat: (t.repeat === 'daily' || t.repeat === 'weekly' ? t.repeat : null) as TaskT['repeat'],
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    subtasks: [...t.subtasks].sort((a, b) => a.order - b.order),
  }
}

export async function getAllTasks(userId: string): Promise<TaskT[]> {
  const rows = await db.task.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    include: { subtasks: true },
  })
  return rows.map(serializeTask)
}

/**
 * سقف زیرکار هر کار (رفع A2) — تابع خالص و آزمون‌پذیر.
 * items آرایه‌ی کامل تولیدشده مدل است؛ خروجی فقط مواردی که واقعاً جا دارند.
 */
export const MAX_SUBTASKS_PER_TASK = 30
export function sliceForCap<T>(items: T[], existingCount: number, cap = MAX_SUBTASKS_PER_TASK): T[] {
  const room = Math.max(0, cap - existingCount)
  return items.slice(0, room)
}

/** رزولو تاریخ ورودی: امروز/فردا/پس‌فردا، نام روز هفته (پنجشنبه…، نزدیک‌ترین رخداد) یا YYYY-MM-DD (ظهر UTC برای پایداری) */
export function resolveDueDate(input?: string | null): Date | null {
  if (!input) return null
  const s = input.trim()
  const today = tehranIsoDate()
  let iso: string | null = null
  if (s === 'امروز') iso = today
  else if (s === 'فردا') iso = addDaysIso(today, 1)
  else if (s === 'پس‌فردا' || s === 'پس فردا') iso = addDaysIso(today, 2)
  else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) iso = s
  else {
    // V23-FIX: نام روز هفته (فارسی/انگلیسی) — تبدیل قطعی نزدیک‌ترین رخداد؛
    // مدل دیگر تاریخ محاسبه نمی‌کند (خطای محاسبهٔ روز هفته توسط مدل مشاهده و رفع شد)
    const wd = nextWeekdayIso(s, today)
    if (wd) iso = wd
    else {
      // شاید مدل «YYYY-MM-DDTHH:mm» فرستاده باشد
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) iso = m[1]
    }
  }
  if (!iso) return null
  // گارد تاریخ نامعتبر (مثل 9999-99-99 یا 2024-02-31 خارج از ماه) — دفاع در برابر ۵۰۰
  const d = new Date(iso + 'T12:00:00.000Z')
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return null
  // پنجره معتبر محصول (۱۹۷۰..۲۲۰۰): تاریخ شمسیِ سه‌رقمی مثل 1403-05-20 نباید
  // به‌عنوان میلادیِ سال ۱۴۰۳ تفسیر شود
  const year = parseInt(iso.slice(0, 4), 10)
  if (year < 1970 || year > 2200) return null
  return d
}

/**
 * V23-FIX (مرحلهٔ نهایی): رزولوی تاریخ در مسیر اکشن مدل با «گارد روز هفته».
 * اگر پیام کاربر نام روز هفته داشت، تاریخِ مدل (عددی) باید همان روز هفته را بدهد؛
 * وگرنه تاریخ قطعیِ استخراج‌شده از پیام کاربر جایگزین می‌شود — مدل هرگز در حل تاریخ برنده نیست.
 * اگر پیام روز هفته نداشت، خروجی رزولوی عادی (امروز/فردا/ISO) بدون تغییر برمی‌گردد.
 */
export function resolveActionDueDate(modelDueDate: string | null | undefined, userMessage: string): Date | null {
  const due = resolveDueDate(modelDueDate)
  const wantIso = detectWeekdayIsoFromMessage(userMessage || '')
  if (!wantIso) return due
  const wantDate = new Date(wantIso + 'T12:00:00.000Z')
  if (!due) return wantDate
  const dueIdx = tehranParts(due).weekdayIndex
  const wantIdx = tehranParts(wantDate).weekdayIndex
  return dueIdx === wantIdx ? due : wantDate
}

export async function findTaskById(id: string, userId: string) {
  return db.task.findUnique({ where: { id }, include: { subtasks: true } })
    .then((t) => (t && t.userId === userId ? t : null))
}

/** یافتن فازی کار بر اساس بخشی از عنوان (بین کارهای فعال) */
export async function findTaskByTitleFragment(fragment: string, userId: string) {
  const f = fragment.trim().toLowerCase()
  if (!f) return null
  const actives = await db.task.findMany({
    where: { status: 'todo', userId },
    include: { subtasks: true },
  })
  // تطابق دقیق‌تر اولویت دارد
  let best: TaskWithSubtasks | null = null
  for (const t of actives) {
    const title = t.title.toLowerCase()
    if (title === f) return t
    if (title.includes(f) || f.includes(title)) {
      if (!best || t.title.length < best.title.length) best = t
    }
  }
  return best
}

/**
 * بازتولید کارهای تکرارشونده: هر کار done با repeat، نسخه تازه‌ای برای
 * چرخه بعدی می‌سازد (اگر هنوز نسخه فعالش وجود نداشته باشد). مثل Todoist.
 */
export async function respawnRecurringTasks(userId: string): Promise<number> {
  const today = tehranIsoDate()
  const doneRecurring = await db.task.findMany({
    where: { status: 'done', repeat: { in: ['daily', 'weekly'] }, userId },
    include: { subtasks: true },
    orderBy: { completedAt: 'desc' },
  })
  let created = 0
  for (const t of doneRecurring) {
    // فقط آخرین نسخه انجام‌شده هر عنوان مهم است
    const laterSame = doneRecurring.some(
      (o) =>
        o.title === t.title &&
        o.completedAt &&
        t.completedAt &&
        o.completedAt > t.completedAt,
    )
    if (laterSame) continue

    const base = t.dueDate ? t.dueDate.toISOString().slice(0, 10) : today
    const nextIso = t.repeat === 'daily' ? addDaysIso(base, 1) : addDaysIso(base, 7)
    if (nextIso > today) {
      // چرخه بعدی هنوز نرسیده
      const exists = await db.task.findFirst({
        where: { title: t.title, status: 'todo', repeat: t.repeat, userId },
      })
      if (!exists) {
        await db.task.create({
          data: {
            userId,
            title: t.title,
            notes: t.notes,
            priority: t.priority,
            tag: t.tag,
            dueDate: new Date(nextIso + 'T12:00:00.000Z'),
            dueTime: t.dueTime,
            repeat: t.repeat,
            subtasks:
              t.subtasks.length > 0
                ? {
                    create: t.subtasks.map((s, i) => ({
                      title: s.title,
                      order: i,
                    })),
                  }
                : undefined,
          },
        })
        created++
      }
    }
  }
  return created
}

// ── Bootstrap مسابقه‌امن (رفع M7) ───────────────────────────
// قبلاً GET /api/tasks مستقیم seedIfEmpty + respawn را صدا می‌زد:
// دو درخواست همزمان می‌توانستند seed یا respawn مضاعف بسازند (TOCTOU).
// اکنون: (۱) اجراهای همزمان با یک Promise مشترک ادغام می‌شوند،
// (۲) هرس/respawn حداکثر هر ۶۰ ثانیه یک‌بار اجرا می‌شود تا GET سبک بماند.
export interface BootstrapResult {
  seeded: boolean
  respawned: number
  skipped: boolean
}

let bootInFlight: Promise<BootstrapResult> | null = null
let lastBootstrapAt = 0
const BOOTSTRAP_MIN_INTERVAL = 60_000

async function runBootstrap(userId: string): Promise<BootstrapResult> {
  const seeded = await seedIfEmptyInternal(userId)
  let respawned = 0
  try {
    respawned = await respawnRecurringTasks(userId)
  } catch (e) {
    // respawn نباید خواندن کارها را بشکند؛ ثبت و ادامه
    console.error('bootstrapTasks: respawn failed', e)
  }
  return { seeded, respawned, skipped: false }
}

async function seedIfEmptyInternal(userId: string): Promise<boolean> {
  const count = await db.task.count({ where: { userId } })
  if (count > 0) return false
  await seedIfEmpty(userId)
  return true
}

/** فراخوانی امن و هم‌رفته bootstrap — از GET و POST /api/tasks/bootstrap */
export function bootstrapTasks(userId: string): Promise<BootstrapResult> {
  const now = Date.now()
  if (now - lastBootstrapAt < BOOTSTRAP_MIN_INTERVAL) {
    return Promise.resolve({ seeded: false, respawned: 0, skipped: true })
  }
  if (!bootInFlight) {
    bootInFlight = runBootstrap(userId)
      .then((r) => {
        lastBootstrapAt = Date.now()
        return r
      })
      .finally(() => {
        bootInFlight = null
      })
  }
  return bootInFlight
}

/** شروع حساب خالی — نسخه Release: هیچ داده نمونه/Mock ساخته نمی‌شود
 *  (معیار پذیرش ۱٫۰). تنها پیام خوش‌آمد دستیار، دوزبانه بر اساس زبان کاربر. */
export async function seedIfEmpty(userId: string): Promise<void> {
  const count = await db.chatMessage.count({ where: { userId } })
  if (count > 0) return
  const { getUserLang } = await import('@/lib/server-settings')
  const lang = await getUserLang(userId)
  await db.chatMessage.create({
    data: {
      userId,
      role: 'assistant',
      content: chatWelcome(lang),
    },
  })
}
