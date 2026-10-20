/**
 * اسکلت بارگذاری سطح اپ — ارتقای نهایی (GU-UX2):
 * ناوبری اولیه و لود‌های سنگین به‌جای لحظهٔ بی‌محتوا، اسکلت برند‌دار دارند.
 * چرخش با motion-safe محدود شده تا با prefers-reduced-motion تعارض نداشته باشد.
 * GRAND-F2: دوزبانه از مسیر سرور (هم‌الگو با not-found.tsx) — بدون نشت فارسی در حالت انگلیسی.
 */
import { getServerLang, pick } from '@/lib/server-lang'

export default async function AppLoading() {
  const lang = await getServerLang()
  return (
    <div
      className="min-h-dvh flex items-center justify-center bg-background"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-border border-t-primary motion-safe:animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          {pick(lang, 'در حال آماده‌سازی رهیار…', 'Getting Rahyar ready…')}
        </p>
      </div>
    </div>
  )
}
