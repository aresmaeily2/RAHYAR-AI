// ─── لایه خالص مدیریت کاربران (قابل تست واحد، بدون I/O) ──────
// مأموریت چندکاربره: مالک ≥۲۰ کاربر می‌سازد/وارد می‌کند؛ رمز اولیه
// یک‌بارمصرف است و کاربر در اولین ورود مجبور به تغییر آن می‌شود.

export const USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,38}[a-zA-Z0-9])?$/
export const MAX_USERS = 200 // سقف ایمن حساب‌ها در این استقرار

export function validateUsername(u: unknown): boolean {
  if (typeof u !== 'string') return false
  const s = u.trim()
  if (s.length < 3 || s.length > 40) return false
  if (s.toLowerCase() === 'owner') return false // نام رزروشده مالک
  return USERNAME_RE.test(s)
}

/** رمز اولیه قابلDictation — از فضای ۳۲ نویسه‌ای بدون نویسه‌های گیج‌کننده */
export function generatePassword(bytes = 9): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const rnd = globalThis.crypto.getRandomValues(new Uint32Array(bytes))
  for (let i = 0; i < bytes; i++) out += alphabet[rnd[i] % alphabet.length]
  return 'Rh' + out + '7x' // پیشوند/پسوند ثابت → طول ≥۱۲ و شامل حرف بزرگ/کوچک/رقم
}

/** گارد تزریق فرمول CSV (=,+,-,@ شروع خط خطرناک است — الگوی exporters مالی) */
export function csvCell(v: string): string {
  const s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) return `'` + s
  return s
}

export function csvRow(cells: string[]): string {
  return cells.map((c) => `"${csvCell(c).replace(/"/g, '""')}"`).join(',') + '\r\n'
}

export interface ImportedUser {
  username: string
  displayName: string
  password: string // خالی → تولید می‌شود (توسط فراخوان)
  line: number
}

export interface ParseResult {
  rows: ImportedUser[]
  errors: { line: number; message: string }[]
}

/** پارس CSV ساده: هدر اختیاری، ستون‌ها username,displayName,password
 *  رمزها از خروجی/لاگ حذف می‌شوند؛ فقط در پاسخ زندهٔ مالک برمی‌گردند. */
export function parseUsersCsv(raw: string, maxRows = 50): ParseResult {
  const errors: { line: number; message: string }[] = []
  const rows: ImportedUser[] = []
  if (typeof raw !== 'string' || !raw.trim()) {
    return { rows, errors: [{ line: 0, message: 'فایل CSV خالی است' }] }
  }
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  let seen = 0
  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    if (!line.trim()) return
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    if (idx === 0 && /^user(name)?$/i.test(cols[0] ?? '')) return // هدر
    if (rows.length >= maxRows) {
      errors.push({ line: lineNo, message: `سقف ${maxRows} ردیف در هر فراخوان` })
      return
    }
    const [username, displayName = '', password = ''] = cols
    const rawUser = String(username ?? '')
    if (!validateUsername(rawUser)) {
      errors.push({ line: lineNo, message: `نام کاربری نامعتبر: ${rawUser.slice(0, 40) || 'خالی'}` })
      return
    }
    if (password && password.length < 8) {
      errors.push({ line: lineNo, message: 'رمز باید حداقل ۸ نویسه باشد (یا خالی تا تولید شود)' })
      return
    }
    seen++
    rows.push({
      username: username.toLowerCase(),
      displayName: (displayName || username).slice(0, 60),
      password: password || '', // خالی → تولید در مسیر API
      line: lineNo,
    })
  })
  if (!seen && !errors.length) errors.push({ line: 0, message: 'هیچ ردیف معتبری یافت نشد' })
  return { rows, errors }
}
