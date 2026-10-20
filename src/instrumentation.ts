// ─── instrumentation — نقطه بوت سرور Next.js ────────────────
// زمان‌بند سمت سرور را در هر پروسه Node (dev/prod) یک‌بار راه می‌اندازد.
// روی Edge اجرا نمی‌شود (فقط nodejs).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // GRAND-F4 (SEC-F8): پیکربندی خطرناک نباید بی‌صدا بماند —
  // این فلگ الزام توکن خارج‌ازباند (GU2-SEC1) را در تولید برمی‌دارد
  if (process.env.NODE_ENV === 'production' && process.env.RAHYAR_ALLOW_OPEN_SETUP === '1') {
    console.warn(
      '[SECURITY-WARNING] RAHYAR_ALLOW_OPEN_SETUP=1 — first-run owner setup is OPEN ' +
        'without an out-of-band token. This weakens GU2-SEC1. Disable it after setup.',
    )
  }
  const { startScheduler } = await import('@/lib/reminders/scheduler')
  startScheduler()
}
