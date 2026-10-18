// ─── Service Worker مینیمال رهیار AI ────────────────────────
// دامنه محدود و صادقانه (بخش ۹ دستور: کمترین تغییر پایدار):
//  - کش-اول فقط برای دارایی‌های بی‌خطر و تغییرناپذیر (فونت‌ها، آیکون)
//  - صفحه‌ها و API همیشه شبکه — هیچ داده کاربر در کش SW ذخیره نمی‌شود
//  - بدون ش静 صفحات آفلاین (هنوز ادعای آفلاین نمی‌کنیم)
//  - Web Push عمداً پیاده نشده — نیازمند کلیدهای VAPID و تصمیم مالک
//    (مستند: docs/REMINDERS_PLATFORMS.md)
const CACHE = 'rahyar-static-v1'
const PRECACHE = ['/icon.svg', '/fonts/vazir.woff2', '/fonts/vazir-bold.woff2']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  // فقط دارایی استاتیک بی‌خطر — هرگز مسیر API یا صفحه
  const isSafeAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/fonts/') || url.pathname === '/icon.svg')
  if (!isSafeAsset) return
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ??
        fetch(event.request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {})
          return res
        }),
    ),
  )
})
