'use client'

// ─── کارت‌های جانبی خانه: نقل‌قول روزانه + آب‌وهوا (اختیاری) ────
// • نقل‌قول: قطعی و محلی — چرخش روزانه بدون هزینه
// • آب‌وهوا: فقط با فعال‌سازی صریح کاربر (localStorage)؛ در نبود
//   سرویس یا فعال‌سازی، کاملاً نامرئی است (بدون جای خالی)

import { useEffect, useSyncExternalStore } from 'react'
import { useClientValue } from '@/lib/client-hooks'
import { quoteOfDay, type Quote } from '@/lib/quotes'
import { useI18n } from '@/i18n/store'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from 'lucide-react'

export const WEATHER_KEY = 'rahyar-weather'

export interface WeatherSetting {
  enabled: boolean
  city: string
  loaded?: boolean
}

/* کش ماژول‌سطح — getSnapshot باید مرجع پایدار برگرداند وگرنه
   useSyncExternalStore در حلقه بی‌نهایت می‌افتد */
const DEFAULT_SETTING: WeatherSetting = { enabled: false, city: '' }
export { DEFAULT_SETTING }
let cachedSetting: WeatherSetting = DEFAULT_SETTING

export function readWeatherSetting(): WeatherSetting {
  ensureSettingLoaded()
  return cachedSetting
}

export function saveWeatherSetting(s: WeatherSetting): void {
  cachedSetting = { ...s }
  try {
    localStorage.setItem(WEATHER_KEY, JSON.stringify(s))
  } catch { /* بدون ماندگاری */ }
}

/** بارگذاری اولیه از localStorage — در اولین خواندن کلاینت */
function ensureSettingLoaded(): void {
  if (cachedSetting.loaded) return
  try {
    const raw = localStorage.getItem(WEATHER_KEY)
    if (raw) {
      const d = JSON.parse(raw) as WeatherSetting & { loaded?: boolean }
      if (typeof d.enabled === 'boolean' && typeof d.city === 'string') {
        cachedSetting = { enabled: d.enabled, city: d.city }
      }
    }
  } catch { /* پیش‌فرض */ }
  cachedSetting.loaded = true
}

/** نوار نقل‌قول — شیشه‌ای باریک، زیر آمار خانه */
export function QuoteStrip() {
  const { t, lang } = useI18n()
  const q: Quote = useClientValue(() => quoteOfDay(lang), { text: '…', author: '' })
  return (
    <figure
      className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3"
      aria-label={t('نقل‌قول روز')}
    >
      <span
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: 'linear-gradient(180deg, var(--primary), var(--ax-300))' }}
        aria-hidden
      />
      <blockquote className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium leading-6">«{q.text}»</p>
        <figcaption className="mt-0.5 text-[10px] text-muted-foreground">— {q.author}</figcaption>
      </blockquote>
    </figure>
  )
}

interface WeatherDataT {
  temp: number
  code: number
  city: string
  isDay: boolean
}

/** کش کلاینت — ۱۰ دقیقه؛ از واکشی مجدد در هر سوییچ نما جلوگیری می‌کند */
const CLIENT_TTL = 10 * 60 * 1000
let clientWeather: { at: number; data: WeatherDataT } | null = null

/* External store کوچک — الگوی امن برای واکشی در mount بدون
   setState داخل effect (سازگار با قواعد React Compiler) */
const weatherListeners = new Set<() => void>()
let weatherSnapshot: WeatherDataT | null = null
let weatherLoading = false

function subscribeWeather(l: () => void): () => void {
  weatherListeners.add(l)
  return () => {
    weatherListeners.delete(l)
  }
}

function getWeatherSnapshot(): WeatherDataT | null {
  return weatherSnapshot
}

function ensureWeatherFetch(city: string): void {
  if (weatherLoading) return
  if (clientWeather && Date.now() - clientWeather.at < CLIENT_TTL) {
    if (weatherSnapshot !== clientWeather.data) {
      weatherSnapshot = clientWeather.data
      weatherListeners.forEach((l) => l())
    }
    return
  }
  weatherLoading = true
  fetch(`/api/weather?city=${encodeURIComponent(city)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      weatherLoading = false
      if (d?.weather) {
        clientWeather = { at: Date.now(), data: d.weather as WeatherDataT }
        weatherSnapshot = clientWeather.data
        weatherListeners.forEach((l) => l())
      }
    })
    .catch(() => {
      weatherLoading = false
    })
}

/** آیکون وضعیت هوا بر پایه کد Open-Meteo */
function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const cls = 'h-4 w-4'
  if (code === 0 || code === 1) return <Sun className={cls} />
  if (code === 2 || code === 3) return <Cloud className={cls} />
  if ([45, 48].includes(code)) return <CloudFog className={cls} />
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return <CloudRain className={cls} />
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className={cls} />
  if ([95, 96, 99].includes(code)) return <CloudLightning className={cls} />
  return isDay ? <Sun className={cls} /> : <Cloud className={cls} />
}

/** چیپ آب‌وهوا — در هیرو خانه؛ فقط اگر کاربر فعال کرده باشد */
export function WeatherChip() {
  const setting = useClientValue(readWeatherSetting, { enabled: false, city: '' })
  const w = useSyncExternalStore(subscribeWeather, getWeatherSnapshot, () => null)

  useEffect(() => {
    if (setting.enabled && setting.city) ensureWeatherFetch(setting.city)
  }, [setting.enabled, setting.city])

  if (!w) return null
  return (
    <span
      className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium"
      role="status"
      aria-label={`هوای ${w.city}: ${w.temp} درجه`}
    >
      <WeatherIcon code={w.code} isDay={w.isDay} />
      <span className="tnum" data-num>{w.temp}°</span>
      <span className="text-muted-foreground">{w.city}</span>
    </span>
  )
}
