'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useMounted } from '@/lib/client-hooks'
import { useI18n } from '@/i18n/store'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()
  const t = useI18n((st) => st.t)

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('تغییر پوسته')}>
        <Sun className="h-[18px] w-[18px]" />
      </Button>
    )
  }

  const isDark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('حالت روشن') : t('حالت تیره')}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  )
}
