// ─── برنامه‌ساز قاعده‌محلی — جایگزین قطعی مدل برای DailyPlan ────
// وقتی موتور «قواعد محلی» فعال است، برنامه روزانه به‌طور قطعی از
// خود کارها ساخته می‌شود (اولویت + سررسید + ساعت) — بدون مدل،
// بدون هزینه، و کاملاً قابل توضیح. کیفیت صادقانه: برنامه ساده
// و منظم؛ ادعای «هوش» زده نمی‌شود. خروجی دوزبانه (fa/en).

import { pick } from '@/lib/server-lang'
import type { AppLang, DailyPlan, PlanBlock, TaskT } from '@/lib/types'

const faDigits = (n: number | string): string => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

/** ساعت «HH:MM» — فارسی: ارقام فارسی؛ انگلیسی: ارقام لاتین */
function clock(lang: AppLang, h: number, m: number): string {
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return lang === 'fa'
    ? faDigits(hh) + ':' + faDigits(mm)
    : `${hh}:${mm}`
}

function hourOf(t: TaskT): number | null {
  if (!t.dueTime) return null
  const [h, m] = t.dueTime.split(':')
  const hh = Number(h)
  const mm = Number(m ?? 0)
  if (!Number.isFinite(hh) || hh < 0 || hh > 23) return null
  return hh * 60 + (Number.isFinite(mm) ? mm : 0)
}

/** ترتیب: امروز سررسیددار ← فوری ← ستاره‌دار ← بقیه؛ در هر گروه ساعت صعودی */
function rankTasks(tasks: TaskT[]): TaskT[] {
  const today = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const todayIso = iso(today)
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate?.slice(0, 10) === todayIso ? 0 : 1
    const bDue = b.dueDate?.slice(0, 10) === todayIso ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    if (a.priority !== b.priority) return a.priority - b.priority
    if (a.starred !== b.starred) return a.starred ? -1 : 1
    const ha = hourOf(a) ?? 24 * 60
    const hb = hourOf(b) ?? 24 * 60
    return ha - hb
  })
}

/** بلوک‌های زمانی پیش‌فرض روز — برای کارهای بدون ساعت مشخص */
const DEFAULT_SLOTS: Array<[number, number]> = [
  [8, 30], [10, 30], [13, 0], [15, 30], [17, 30], [20, 0],
]
const FALLBACK_SLOT: [number, number] = [21, 0]

export function buildRuleBasedPlan(tasks: TaskT[], lang: AppLang = 'fa'): DailyPlan {
  const ranked = rankTasks(tasks).slice(0, 6)
  const blocks: PlanBlock[] = []
  let slot = 0
  for (const t of ranked) {
    const h = hourOf(t)
    const [fh, fm] = h !== null ? [Math.floor(h / 60), h % 60] : (DEFAULT_SLOTS[slot] ?? FALLBACK_SLOT)
    if (h === null) slot++
    blocks.push({
      time: clock(lang, fh, fm),
      title: t.title,
      taskId: t.id,
      why: pick(
        lang,
        t.priority === 1
          ? 'کار فوری — اول صبح'
          : t.dueTime
            ? 'سررسید ساعت‌دار'
            : 'بعد از کارهای فوری‌تر',
        t.priority === 1
          ? 'Urgent — first thing'
          : t.dueTime
            ? 'Has a timed due'
            : 'After the urgent ones',
      ),
    })
  }

  const focus = ranked.find((t) => t.priority === 1)?.title ?? ranked[0]?.title ?? ''
  const summary = pick(
    lang,
    ranked.length
      ? `برنامه امروز از ${faDigits(ranked.length)} کار فعال تو چیده شد — فوری‌ها اول.`
      : 'فعلاً کار فعالی نداری؛ وقت خوبی برای شروع یک چیز تازه است.',
    ranked.length
      ? `Today's plan is built from ${ranked.length} active tasks — urgent ones first.`
      : 'You have no active tasks; a good time to start something new.',
  )
  const tip = pick(
    lang,
    ranked.some((t) => t.priority === 1)
      ? 'اول کار فوری را ببند، بعد بقیه راحت‌تر می‌شوند.'
      : 'کارها را به بلوک‌های ۲۵ دقیقه‌ای بشکن؛ تایمر تمرکز کمکت می‌کند.',
    ranked.some((t) => t.priority === 1)
      ? 'Close the urgent task first; the rest get easier.'
      : 'Break work into 25-minute blocks; the focus timer helps.',
  )

  return { summary, focus, blocks, tip }
}
