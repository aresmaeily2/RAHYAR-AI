'use client'

// ─── موتور ظاهر رهیار — تم جهان‌بینی + رنگ تأکید ────────────────
// دو محور مستقل که هر دو با صفت روی <html> اعمال می‌شوند:
//   data-theme  = ocean | forest | aurora | sunset | night | minimal
//   data-accent = teal | blue | violet | green | orange | pink | gold
// ماندگاری در localStorage؛ اسکریپت inline در layout پیش از اولین
// رندر مقدار را می‌خواند تا هیچ فلشی دیده نشود.

export const THEMES = ['ocean', 'forest', 'aurora', 'sunset', 'night', 'minimal', 'sakura', 'autumn', 'rain'] as const
export const ACCENTS = ['teal', 'blue', 'violet', 'green', 'orange', 'pink', 'gold'] as const

export type AraTheme = (typeof THEMES)[number]
export type AraAccent = (typeof ACCENTS)[number]

export const THEME_LABELS: Record<AraTheme, string> = {
  ocean: 'اقیانوس',
  forest: 'جنگل',
  aurora: 'شفق',
  sunset: 'غروب',
  night: 'شب',
  minimal: 'مینیمال',
  sakura: 'شکوفه',
  autumn: 'پاییز',
  rain: 'باران',
}

export const ACCENT_LABELS: Record<AraAccent, string> = {
  teal: 'فیروزه‌ای',
  blue: 'آبی',
  violet: 'بنفش',
  green: 'سبز',
  orange: 'نارنجی',
  pink: 'صورتی',
  gold: 'طلایی',
}

const THEME_KEY = 'rahyar-theme'
const ACCENT_KEY = 'rahyar-accent'

export function readStoredTheme(): AraTheme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v && (THEMES as readonly string[]).includes(v)) return v as AraTheme
  } catch { /* بدون localStorage — پیش‌فرض */ }
  return 'ocean'
}

export function readStoredAccent(): AraAccent {
  try {
    const v = localStorage.getItem(ACCENT_KEY)
    if (v && (ACCENTS as readonly string[]).includes(v)) return v as AraAccent
  } catch { /* بدون localStorage — پیش‌فرض */ }
  return 'teal'
}

export function applyTheme(t: AraTheme): void {
  document.documentElement.dataset.theme = t
}

export function applyAccent(a: AraAccent): void {
  document.documentElement.dataset.accent = a
}

/* ─── اندازه متن — WCAG 1.4.4 ─── */
export const TEXT_SCALES = ['sm', 'md', 'lg', 'xl'] as const
export type TextScale = (typeof TEXT_SCALES)[number]

export const TEXT_SCALE_LABELS: Record<TextScale, string> = {
  sm: 'کوچک',
  md: 'استاندارد',
  lg: 'بزرگ',
  xl: 'بزرگ‌تر',
}

const SCALE_KEY = 'rahyar-textscale'

export function readStoredTextScale(): TextScale {
  try {
    const v = localStorage.getItem(SCALE_KEY)
    if (v && (TEXT_SCALES as readonly string[]).includes(v)) return v as TextScale
  } catch { /* پیش‌فرض */ }
  return 'md'
}

export function applyTextScale(s: TextScale): void {
  document.documentElement.dataset.textscale = s
}
