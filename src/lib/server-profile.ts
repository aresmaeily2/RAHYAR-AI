// ─── پروفایل کاربر — تنظیمات ذخیره‌شده در پایگاه‌داده ────────
// پس از ایمن‌سازی، هر رکورد Setting متعلق به یک کاربر است
// (@@unique([userId, key])) — جداسازی داده در سطح کوئری تضمین می‌شود.
// نام پیش‌فرض «علیرضا» مقدار پیش‌فرض تأییدشده محصول است و قابل تغییر.

import { db } from '@/lib/db'
import { cleanText } from '@/lib/security'

export const DEFAULT_USER_NAME = 'علیرضا'
const NAME_KEY = 'userName'

export interface UserProfile {
  name: string
}

/** خواندن پروفایل کاربر نشست — فقط رکوردهای همان کاربر */
export async function getProfile(userId: string): Promise<UserProfile> {
  try {
    const row = await db.setting.findUnique({
      where: { userId_key: { userId, key: NAME_KEY } },
    })
    return { name: row?.value?.trim() || DEFAULT_USER_NAME }
  } catch {
    return { name: DEFAULT_USER_NAME }
  }
}

/** نام کاربر برای تزریق به پرامپت */
export async function getUserName(userId: string): Promise<string> {
  return (await getProfile(userId)).name
}

/**
 * ثبت نام جدید برای کاربر نشست. خالی بودن ورودی → بازگشت به پیش‌فرض.
 * خروجی: نام نهایی پس از پاک‌سازی و محدودسازی طول (حداکثر ۴۰ نویسه).
 */
export async function setProfileName(userId: string, raw: unknown): Promise<string> {
  const name = cleanText(raw, 40)
  const final = name || DEFAULT_USER_NAME
  await db.setting.upsert({
    where: { userId_key: { userId, key: NAME_KEY } },
    update: { value: final },
    create: { userId, key: NAME_KEY, value: final },
  })
  return final
}
