'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * مرز خطای سراسری اپ (App Router error boundary) — ارتقای نهایی (GU-UX1):
 * پیش از این هر خطای رندر به صفحهٔ سفید ختم می‌شد؛ اکنون پیام آرام‌بخش،
 * دکمهٔ تلاش مجدد و مسیر بازگشت به خانه ارائه می‌شود.
 * محتوای خطا هرگز به کاربر نشان داده نمی‌شود (فراداده در کنسول می‌ماند).
 * GRAND-F2: دوزبانه — زبان از <html lang> خوانده می‌شود (بدون وابستگی به
 * استورها؛ مرز خطا باید حتی اگر خودِ اپ/storeها خراب شده باشند کار کند).
 */

const STR = {
  fa: {
    title: 'مشکلی پیش آمد',
    body: 'پردازش این بخش ناتمام ماند. معمولاً با یک تلاش مجدد درست می‌شود و داده‌های تو سالم‌اند.',
    retry: 'تلاش مجدد',
    home: 'صفحهٔ اصلی',
  },
  en: {
    title: 'Something went wrong',
    body: 'This part did not finish. A retry usually fixes it — your data is safe.',
    retry: 'Try again',
    home: 'Home',
  },
} as const

function readLang(): 'fa' | 'en' {
  try {
    return document.documentElement.lang === 'en' ? 'en' : 'fa'
  } catch {
    return 'fa'
  }
}

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('app error boundary:', error.message, error.digest ?? '')
  }, [error])

  // خواندن یک‌باره در رندر — مرز خطا پس از تغییر زبان هم بر اساس lang فعلی رندر می‌شود
  const s = STR[readLang()]

  return (
    <div
      role="alert"
      className="min-h-dvh flex items-center justify-center bg-background px-6 py-12"
    >
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">{s.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground mb-6">{s.body}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button onClick={reset} className="gap-2 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {s.retry}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // مرز خطا عمداً ناوبری سخت می‌کند — router ممکن است خودش خراب باشد
              window.location.href = '/'
            }}
            className="gap-2 w-full sm:w-auto"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            {s.home}
          </Button>
        </div>
      </div>
    </div>
  )
}
