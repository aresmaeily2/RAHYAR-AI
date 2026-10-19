/**
 * اسکلت بارگذاری سطح اپ — ارتقای نهایی (GU-UX2):
 * ناوبری اولیه و لود‌های سنگین به‌جای لحظهٔ بی‌محتوا، اسکلت برند‌دار دارند.
 * چرخش با motion-safe محدود شده تا با prefers-reduced-motion تعارض نداشته باشد.
 */
export default function AppLoading() {
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
        <p className="text-sm text-muted-foreground">در حال آماده‌سازی رهیار…</p>
      </div>
    </div>
  )
}
