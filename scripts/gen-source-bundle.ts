// ─── بسته یکپارچه TXT کدهای جاری برای ممیزی (بخش ۱۳ دستور) ──
// خروجی: artifacts/rahyar-audit/RAHYAR_SOURCE_BUNDLE.txt
// شامل: همه سورس متنی src/ + tests/ + prisma/ + پیکربندی‌ها + docs/
// مستثنی (الزام دستور): node_modules، build output، دیتابیس، بکاپ‌ها،
// فایل‌های تولیدی، اسرار (.env)، تصاویر/باینری‌ها، داده شخصی، upload/،
// tool-results/، artifacts/ (تصاویر)، scripts/ (اسکریپت‌های نشست‌های قبلی
// و آزمون‌های زنده — فقط فایل‌های عملیاتی فعلی آورده می‌شوند)
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs'
import { join, relative } from 'path'

const ROOT = '/home/z/my-project'
const OUT_DIR = join(ROOT, 'artifacts/rahyar-audit')
const OUT = join(OUT_DIR, 'RAHYAR_SOURCE_BUNDLE.txt')

const INCLUDE_DIRS = ['src', 'tests', 'docs', 'prisma']
const ROOT_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'eslint.config.mjs',
  'postcss.config.mjs',
  'tailwind.config.ts',
  '.env.example',
  'README.md',
  'worklog.md',
  '.gitignore',
]
const INCLUDE_SCRIPTS = ['scripts/backup-db.sh', 'scripts/test-user-isolation.ts']
const EXCLUDE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.db', '.log', '.tsbuildinfo']
const EXCLUDE_NAMES = ['.env', 'bun.lock', 'dev.log', 'server.log']

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (EXCLUDE_NAMES.includes(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next' || name === '__pycache__') continue
      out.push(...walk(p))
    } else {
      if (EXCLUDE_EXT.some((e) => name.endsWith(e))) continue
      out.push(p)
    }
  }
  return out
}

const files: string[] = []
for (const d of INCLUDE_DIRS) files.push(...walk(join(ROOT, d)))
for (const f of ROOT_FILES) files.push(join(ROOT, f))
for (const f of INCLUDE_SCRIPTS) files.push(join(ROOT, f))

const existing = files.filter((f) => {
  try {
    return statSync(f).isFile()
  } catch {
    return false
  }
})

const excludedNote = [
  'فایل‌های مستثنی از بسته (به‌دلیل سیاست امنیتی/حجم/تولیدی‌بودن):',
  '  - .env (راز), bun.lock, dev.log/server.log, tsconfig.tsbuildinfo',
  '  - db/*.db و backups/ (دیتابیس زنده و پشتیبان‌ها — داده شخصی)',
  '  - node_modules/, .next/ (تولیدی)',
  '  - artifacts/**/تصاویر (PNG — باینری؛ گزارش MD و این فایل آورده شده‌اند)',
  '  - tool-results/, upload/, download/, scripts/*.png, اسکریپت‌های گزارش‌ساز نشست‌های قبلی',
  '  - public/fonts/* (باینری فونت), public/logo.svg, sw.js آورده می‌شود اگر متنی باشد',
].join('\n')

let out = ''
out += '═' .repeat(78) + '\n'
out += 'بسته یکپارچه کدهای متنی جاری — رهیار AI (نام فنی مخزن: ara)\n'
out += `تاریخ تولید: ${new Date().toISOString()}\n`
out += `تعداد فایل: ${existing.length}\n`
out += '─'.repeat(78) + '\n'
out += excludedNote + '\n'
out += '═'.repeat(78) + '\n\n'

for (const f of existing.sort()) {
  const rel = relative(ROOT, f)
  let content = ''
  try {
    content = readFileSync(f, 'utf-8')
  } catch {
    content = '<<خوانده نشد>>'
  }
  // گارد نهایی: هرگز محتوای حاوی الگوی کلید واقعی را وارد نکن
  if (/^(sk-|ghp_|AKIA[A-Z0-9]{16})/.test(content)) {
    content = '<<حذف شد: الگوی احتمالی راز>>'
  }
  out += `┌── ${rel} ${'─'.repeat(Math.max(0, 60 - rel.length))}\n`
  out += content.replace(/\r\n/g, '\n')
  if (!content.endsWith('\n')) out += '\n'
  out += `└── پایان ${rel}\n\n`
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT, out, 'utf-8')
const kb = Math.round(statSync(OUT).size / 1024)
console.log(`بسته ساخته شد: ${OUT} (${existing.length} فایل، ${kb}KB)`)
