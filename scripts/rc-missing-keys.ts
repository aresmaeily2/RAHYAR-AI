// استخراج همه کلیدهای t() از کامپوننت‌ها + همه رشته‌های خطای API
// و مقایسه با en.ts برای یافتن ترجمه‌های جاافتاده
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/home/z/my-project/src'
const keys = new Set<string>()

function walk(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walk(p); continue }
    if (!/\.(tsx|ts)$/.test(name)) continue
    if (p.includes('/i18n/')) continue
    const src = readFileSync(p, 'utf8')
    // t('...') / t("...") — چندخطی هم بگیر
    const re = /\bt\(\s*'((?:[^'\\]|\\.)*)'\s*[),]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) keys.add(m[1].replace(/\\'/g, "'"))
  }
}

walk(join(ROOT, 'components'))
walk(join(ROOT, 'app'))
walk(join(ROOT, 'lib'))

// رشته‌های خطای API
const apiErrors = new Set<string>()
const apiDir = join(ROOT, 'app/api')
function walkApi(dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) { walkApi(p); continue }
    if (!/route\.ts$/.test(name)) continue
    const src = readFileSync(p, 'utf8')
    const re = /error: '([^']+)'/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) apiErrors.add(m[1])
  }
}
walkApi(apiDir)

const enSrc = readFileSync(join(ROOT, 'i18n/en.ts'), 'utf8')

const missing = [...keys].filter((k) => !enSrc.includes(`'${k}'`))
const missingErr = [...apiErrors].filter((k) => !enSrc.includes(`'${k}'`))

console.log(`=== کلیدهای t() جاافتاده در en.ts: ${missing.length}`)
for (const k of missing) console.log(JSON.stringify(k))
console.log(`\n=== خطاهای API جاافتاده در en.ts: ${missingErr.length}`)
for (const k of missingErr) console.log(JSON.stringify(k))
