import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { requireUser, AuthRequiredError } from '@/lib/auth'

/**
 * F2-EMU-SEC: گیت نقش مالک روی خود صفحهٔ /emulator (نه فقط APIها).
 * مأموریت مالک مرحلهٔ ۴: پنل شبیه‌ساز زیرساخت خصوصی مالک است — کاربر
 * عادیِ وارد‌شده هم نباید شِل صفحه را ببیند (۴۰۳ صادقانه، بدون نشت داده).
 */
export default async function EmulatorLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const req = new NextRequest('http://local/emulator', { headers: h })
  let role: string | undefined
  try {
    const user = await requireUser(req)
    role = user.role
  } catch {
    // بدون نشست: proxy خودش به /login هدایت می‌کند؛ اینجا به‌عنوان دفاع دوم
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <h1>۴۰۱ — برای مشاهدهٔ شبیه‌ساز وارد حساب مالک شوید</h1>
      </main>
    )
  }
  if (role !== 'OWNER') {
    return (
      <main style={{ padding: 24, textAlign: 'center' }} dir="rtl">
        <h1>۴۰۳ — پنل شبیه‌ساز فقط برای مالک است</h1>
        <p>این زیرساخت خصوصی مالک است؛ حساب شما دسترسی ندارد.</p>
      </main>
    )
  }
  return <>{children}</>
}
