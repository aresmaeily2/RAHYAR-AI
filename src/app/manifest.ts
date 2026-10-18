import type { MetadataRoute } from 'next'

// ─── PWA Manifest رهیار AI ───────────────────────────────────
// نصب به‌صورت اپ (Android/دسکتاپ). iOS: Add to Home Screen با محدودیت‌های
// مستند در docs/REMINDERS_PLATFORMS.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'رهیار AI — دستیار هوشمند شخصی',
    short_name: 'رهیار AI',
    description: 'دستیار هوشمند شخصی برای مدیریت و انجام کارها — از درخواست تا انجام',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FAF9F7',
    theme_color: '#0C0A09',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  }
}
