// ─── زبان سمت سرور — منبع واحد برای پاسخ‌های دوزبانه ───────────
// هر متنی که سرور برای کاربر می‌سازد (پاسخ قطعی دستیار، پیام سهمیه،
// خطاهای API) بر اساس زبان انتخابی کاربر فارسی یا انگلیسی می‌شود.
// هیچ رشته‌ای دو بار نوشته نمی‌شود: pick(lang, fa, en) نقطه واحد است.

import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE } from '@/lib/auth'
import { getUserLang } from '@/lib/server-settings'
import type { AppLang } from '@/lib/types'

/** انتخاب دوزبانه — تنها نقطه تصمیم زبان برای رشته‌های سرور */
export function pick(lang: AppLang, fa: string, en: string): string {
  return lang === 'en' ? en : fa
}

/** زبان کاربر از کوکی نشست — برای Server Components (layout، not-found) */
export async function getServerLang(): Promise<AppLang> {
  try {
    const jar = await cookies()
    const token = jar.get(SESSION_COOKIE)?.value
    if (!token || token.length < 20 || token.length > 128) return 'fa'
    const { createHash } = await import('node:crypto')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const session = await db.session.findUnique({
      where: { tokenHash },
      select: { userId: true },
    })
    if (!session) return 'fa'
    return await getUserLang(session.userId)
  } catch {
    return 'fa'
  }
}
