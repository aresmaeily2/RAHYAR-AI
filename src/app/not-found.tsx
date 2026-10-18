// ─── صفحه ۴۰۴ دوزبانه — جهت و زبان از تنظیم کاربر (سمت سرور) ───
// داخل layout ریشه رندر می‌شود — بدون html/body تکراری
import Link from 'next/link'
import { getServerLang, pick } from '@/lib/server-lang'
import { formatNum } from '@/i18n/core'

export default async function NotFound() {
  const lang = await getServerLang()
  const en = lang === 'en'
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
      aria-label={pick(lang, 'صفحه پیدا نشد', 'Page not found')}
    >
      <div>
        <p style={{ fontSize: '4rem', fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>
          {formatNum(404, lang)}
        </p>
        <h1 style={{ fontSize: '1.25rem', margin: '0.75rem 0 0.5rem' }}>
          {pick(lang, 'این صفحه پیدا نشد', 'This page was not found')}
        </h1>
        <p style={{ opacity: 0.7, margin: '0 0 1.5rem' }}>
          {pick(
            lang,
            'نشانی را اشتباه وارد کرده‌ای یا این مسیر جابه‌جا شده است.',
            'The address is wrong, or this path has moved.',
          )}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.4rem',
            borderRadius: '9999px',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {en ? 'Back to Today' : 'بازگشت به امروز'}
        </Link>
      </div>
    </main>
  )
}
