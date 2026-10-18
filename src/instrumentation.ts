// ─── instrumentation — نقطه بوت سرور Next.js ────────────────
// زمان‌بند سمت سرور را در هر پروسه Node (dev/prod) یک‌بار راه می‌اندازد.
// روی Edge اجرا نمی‌شود (فقط nodejs).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startScheduler } = await import('@/lib/reminders/scheduler')
  startScheduler()
}
