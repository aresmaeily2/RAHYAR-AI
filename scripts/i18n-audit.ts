// ─── ممیزی i18n — یافتن فارسیِ بدون ترجمه در رابط انگلیسی ──────
// 1) رشته فارسیِ داخل t('…') که در en.ts کلید ندارد
// 2) رشته فارسیِ hardcode (خارج از t) در کامپوننت‌ها
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'src'
const files: string[] = []
function walk(dir: string) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.(tsx?|ts)$/.test(f) && !p.includes('i18n/')) files.push(p)
  }
}
walk(SRC + '/components')
walk(SRC + '/app')

// کلیدهای موجود در en.ts
const en = readFileSync('src/i18n/en.ts', 'utf8')
const enKeys = new Set<string>()
for (const m of en.matchAll(/'((?:[^'\\]|\\.)*)'\s*:/g)) enKeys.add(m[1].replace(/\\'/g, "'"))

const faRange = /[\u0600-\u06FF]/
const hard: Record<string, string[]> = {}
const missing: Record<string, string[]> = {}

for (const f of files) {
  const src = readFileSync(f, 'utf8')
  // 1) t('…') با کلید فارسی غایب در en
  for (const m of src.matchAll(/\bt\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    const key = m[1].replace(/\\'/g, "'")
    if (faRange.test(key) && !enKeys.has(key)) {
      ;(missing[f] ??= []).push(key)
    }
  }
  // 2) فارسی hardcode: رشته‌های '…' یا "…" یا `…` یا JSX text با فارسی، بدون t(
  const noT = src.replace(/\bt\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g, '')
  const lines = noT.split('\n')
  lines.forEach((line, i) => {
    // حذف کامنت‌ها
    const l = line.replace(/\/\/.*$/, '')
    const hits = l.match(/'[^']*[\u0600-\u06FF][^']*'|"[^"]*[\u0600-\u06FF][^"]*"/g)
    if (hits) {
      for (const h of hits) {
        // رشته‌های دوزبانه مجاز: pick(lang, 'fa', 'en') — آن‌ها دو آرگومان دارند
        ;(hard[f] ??= []).push(`L${i + 1}: ${h.slice(0, 90)}`)
      }
    }
  })
}

console.log('══ t() بدون ترجمه en ══')
for (const [f, keys] of Object.entries(missing)) {
  console.log(`${f} (${keys.length})`)
  for (const k of [...new Set(keys)].slice(0, 12)) console.log(`   · ${k}`)
}
console.log('\n══ فارسی hardcode (خارج از t و pick) ══')
for (const [f, hits] of Object.entries(hard)) {
  console.log(`${f} (${hits.length})`)
  for (const h of [...new Set(hits)].slice(0, 14)) console.log(`   · ${h}`)
}
