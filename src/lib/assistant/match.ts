// ─── تطبیق فازی عنوان کار — برای نیت «انجام شد» دستیار ─────────
// خالص و آزمون‌پذیر. امتیازدهی: هم‌پوشانی توکن‌ها + تطبیق زیررشته.
// آستانه سخت‌گیرانه: اگر تطبیق مطمئن نباشد، null (پرسش از کاربر).

export interface MatchableTask {
  id: string
  title: string
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'for', 'and', 'in', 'on', 'with', 'my',
  'و', 'به', 'از', 'در', 'با', 'برای', 'که', 'را', 'رو', 'یک', 'ی',
])

export function normalizeForMatch(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/[\u064b-\u0652\u0670]/g, '') // اعراب
    .replace(/[یي]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s: string): string[] {
  return normalizeForMatch(s)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

/** امتیاز تطبیق ۰..۱ — توکن مشترک وزن‌دار + زیررشته */
export function similarity(query: string, title: string): number {
  const q = tokens(query)
  const t = tokens(title)
  if (q.length === 0 || t.length === 0) return 0
  const tSet = new Set(t)
  let hits = 0
  for (const w of q) {
    if (tSet.has(w)) hits++
    else {
      // تطبیق جزئی توکن (ریشه مشترک)
      for (const tw of t) {
        if (tw.length >= 3 && (tw.startsWith(w) || w.startsWith(tw))) {
          hits += 0.6
          break
        }
      }
    }
  }
  let score = hits / Math.max(q.length, 1)
  const nq = normalizeForMatch(query)
  const nt = normalizeForMatch(title)
  if (nq && (nt.includes(nq) || nq.includes(nt))) score = Math.max(score, 0.9)
  return Math.min(score, 1)
}

/** بهترین تطبیق با آستانه ۰٫۵ — بدون تطبیق مطمئن، null */
export function matchTask<T extends MatchableTask>(query: string, tasks: T[]): T | null {
  let best: T | null = null
  let bestScore = 0
  for (const t of tasks) {
    const s = similarity(query, t.title)
    if (s > bestScore) {
      bestScore = s
      best = t
    }
  }
  return bestScore >= 0.5 ? best : null
}
