// ─── فایل MD یکپارچهٔ «تمام کدهای پروژه» برای تحویل/ممیزی ───────
// خروجی: download/RahyAr-All-Source-Code.md
// شامل: src/ android/ prisma/ tests/ docs/ brand(متنی) examples/ scripts/ public(متنی) + پیکربندی ریشه
// مستثنی: باینری‌ها، node_modules/.next/.git، db، .env واقعی، upload/download، skills، لاگ‌ها
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs'
import { join, relative, extname } from 'path'

const ROOT = '/home/z/my-project'
const OUT = join(ROOT, 'download/RahyAr-All-Source-Code.md')

const INCLUDE_DIRS = ['src', 'android', 'prisma', 'tests', 'docs', 'examples', 'scripts', 'mini-services']
const BRAND_TEXT = ['brand/README.md', 'brand/preview.html', 'brand/svg/rahyar-wordmark.svg', 'brand/svg/rahyar-mark-mono.svg', 'brand/svg/rahyar-badge-ring.svg', 'brand/svg/rahyar-mark-solid.svg', 'brand/svg/rahyar-mark-mono-inverse.svg']
const PUBLIC_TEXT = ['public/appearance-boot.js', 'public/sw.js', 'public/robots.txt', 'public/logo.svg', 'public/manifest.json']
const ROOT_FILES = [
  'package.json', 'tsconfig.json', 'next.config.ts', 'eslint.config.mjs', 'postcss.config.mjs',
  'tailwind.config.ts', 'components.json', '.env.example', '.gitignore', 'README.md',
  'CHANGELOG.md', 'RAHYAR_RELEASE.md', 'Caddyfile',
]
const EXCLUDE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.db', '.log', '.tsbuildinfo', '.jar', '.mp4', '.webm', '.zip', '.pdf', '.docx']
const EXCLUDE_NAMES = ['.env', 'dev.log', 'server.log', 'upload-results.txt', 'tsconfig.tsbuildinfo']
const EXCLUDE_DIR_NAMES = new Set(['node_modules', '.next', '.git', '__pycache__', '.gradle', 'build', 'download', 'upload', 'skills', '.zscripts', 'artifacts', 'backups', 'release-delivery'])

const LANG: Record<string, string> = {
  '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.cjs': 'js', '.mjs': 'js', '.jsx': 'jsx',
  '.java': 'java', '.xml': 'xml', '.gradle': 'groovy', '.properties': 'properties',
  '.py': 'python', '.sh': 'bash', '.bash': 'bash', '.css': 'css', '.html': 'html',
  '.json': 'json', '.svg': 'xml', '.prisma': 'prisma', '.md': 'markdown', '.mjs': 'js',
  '.txt': 'text', '.example': 'bash', '.gitignore': 'text', '.gitattributes': 'text',
  '.webmanifest': 'json', '.cfg': 'ini', '.toml': 'toml', '.yml': 'yaml', '.yaml': 'yaml',
}

function walk(dir: string): string[] {
  const out: string[] = []
  let names: string[] = []
  try { names = readdirSync(dir) } catch { return out }
  for (const name of names) {
    if (EXCLUDE_NAMES.includes(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (EXCLUDE_DIR_NAMES.has(name)) continue
      out.push(...walk(p))
    } else {
      if (EXCLUDE_EXT.some((e) => name.endsWith(e))) continue
      if (st.size > 400 * 1024) continue // فایل متنی عظیم خارج از قالب
      out.push(p)
    }
  }
  return out
}

const files: string[] = []
for (const d of INCLUDE_DIRS) files.push(...walk(join(ROOT, d)))
for (const f of [...ROOT_FILES, ...BRAND_TEXT, ...PUBLIC_TEXT]) {
  try { if (statSync(join(ROOT, f)).isFile()) files.push(join(ROOT, f)) } catch {}
}
const existing = [...new Set(files)].filter((f) => {
  try { return statSync(f).isFile() } catch { return false }
}).sort()

// ── سرصفحه ──
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
let gitHead = 'n/a'
try { gitHead = readFileSync('/dev/null', 'utf-8'); } catch {}
const { execSync } = await import('child_process')
try { gitHead = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim() } catch {}

let out = ''
out += '# رهیار AI (RahyAr) — فایل یکپارچهٔ تمام کدهای پروژه\n\n'
out += `> **هشدار صادقانه**: این فایل «کد» است، نه «اثبات کارکرد». اجرا و رفتار واقعی باید جداگانه آزمایش شود.\n\n`
out += '| فیلد | مقدار |\n|---|---|\n'
out += `| تاریخ تولید (UTC) | ${new Date().toISOString()} |\n`
out += `| نسخهٔ وب (package.json) | ${pkg.version} |\n`
out += `| نسخهٔ پوستهٔ اندروید (AppVersion.java) | 2.1.0 (code 21) |\n`
out += `| Git HEAD محلی | \`${gitHead}\` |\n`
out += `| تعداد فایل‌های متنی | ${existing.length} |\n\n`
out += '**مستثنی عمداً (سیاست امنیتی/حجم/تولیدی):** `.env` واقعی (راز)، `db/*.db` (داده)، `node_modules/`، `.next/`، `.git/`، باینری‌ها (تصویر/فونت/jar)، `download/`، `upload/`، `skills/`، لاگ‌ها، زیپ‌ها و PDF/DOCX.\n\n'
out += '---\n\n## فهرست فایل‌ها\n\n'
for (const f of existing) out += `- \`${relative(ROOT, f)}\`\n`
out += '\n---\n\n'

for (const f of existing) {
  const rel = relative(ROOT, f)
  let content = ''
  try { content = readFileSync(f, 'utf-8') } catch { content = '<<خوانده نشد>>' }
  // گارد نهایی: هرگز الگوی کلید واقعی را درج نکن
  if (/(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)/.test(content)) {
    content = '<<حذف شد: الگوی احتمالی راز>>'
  }
  const lang = LANG[extname(f)] || 'text'
  out += `### \`${rel}\`\n\n\`\`\`${lang}\n${content.replace(/\r\n/g, '\n')}${content.endsWith('\n') ? '' : '\n'}\`\`\`\n\n`
}

mkdirSync(join(ROOT, 'download'), { recursive: true })
writeFileSync(OUT, out, 'utf-8')
const kb = Math.round(statSync(OUT).size / 1024)
console.log(`بستهٔ MD ساخته شد: ${OUT} (${existing.length} فایل، ${kb}KB)`)
