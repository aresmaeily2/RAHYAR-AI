// ─── هسته i18n رهیار — الگوی «کلید طبیعی» (سبک gettext) ───────
// کلید هر رشته، خودِ متن فارسی مبناست:
//   t('کار جدید')  →  فارسی: «کار جدید»   |  انگلیسی: "New task"
// مزایا: هیچ کلیدی گم نمی‌شود؛ متن فارسی هویت مبنا می‌ماند؛
// ترجمه غایب، محترمانه به فارسی برمی‌گردد (بدون متن خامِ کلید تکنیکی).

export type Lang = 'fa' | 'en'

export interface Translations {
  [naturalKey: string]: string
}

/** جایگزینی متغیرها در قالب: tf('{n} کار انجام شد', { n: '۳' }) */
export function tf(
  template: string,
  params: Record<string, string | number>,
  lang: Lang = 'fa',
): string {
  let out = template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  )
  if (lang === 'fa') out = out.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
  return out
}

/** جهت خط بر اساس زبان */
export function langDir(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'fa' ? 'rtl' : 'ltr'
}

/** کد BCP-47 برای Speech API و Intl */
export function langBcp47(lang: Lang): string {
  return lang === 'fa' ? 'fa-IR' : 'en-US'
}

/** اعداد — فارسی: ارقام فارسی؛ انگلیسی: ارقام لاتین */
export function formatNum(n: number | string, lang: Lang): string {
  const s = String(n)
  return lang === 'fa' ? s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) : s
}
