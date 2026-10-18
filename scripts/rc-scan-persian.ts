// ─── اسکن رشته‌های فارسی سخت‌کدشده در JSX (خارج از t()) ──────
// برای حالت انگلیسی: هیچ متن فارسی نباید باقی بماند.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/home/z/my-project/src'
const results: string[] = []

function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    if (!/\.(tsx|ts)$/.test(name)) continue
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.forEach((line, i) => {
      // حذف کامنت‌ها
      const code = line.replace(/\/\/.*$/, '')
      if (!/[\u0600-\u06FF]/.test(code)) return
      // حذف موارد مجاز: t('...') tStatic('...') tf('...')، کلیدهای دیکشنری i18n، فایل‌های i18n و persian-date و voice و assistant
      let stripped = code.replace(/\b(t|tStatic|tf)\s*\(\s*['"`][^'"`]*['"`]/g, (m) => ' '.repeat(m.length))
      stripped = stripped.replace(/\b(makeT|formatNum|langBcp47|langDir)\s*\([^)]*\)/g, (m) => ' '.repeat(m.length))
      // کامنت‌های جاواسکریپتی چندزبانه از قبل حذف شدند (//.*)
      if (!/[\u0600-\u06FF]/.test(stripped)) return
      // فایل‌های مجاز (منابع فارسی مبنا / موتورهای زبان)
      const allowed = ['/i18n/fa.ts', '/i18n/en.ts', '/persian-date.ts', '/voice/speech.ts', '/assistant/', '/nlp.ts', '/lib/ai/', '/sms/parser.ts', '/finance/core.ts', '/finance/exporters.ts', '/quotes.ts', '/reminders/']
      if (allowed.some((a) => p.includes(a))) return
      results.push(`${p.replace(ROOT + '/', '')}:${i + 1}: ${line.trim().slice(0, 160)}`)
    })
  }
}

walk(ROOT)
console.log(results.length === 0 ? 'CLEAN — هیچ نشت فارسی خارج از t()' : `${results.length} مورد:`)
for (const r of results) console.log(r)
