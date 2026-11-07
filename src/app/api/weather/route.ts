import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

// ─── آب‌وهوا — ماژول اختیاری بخش UI خانه (Redesign 2.0) ───────────
// منبع اصلی: Open-Meteo (بدون کلید، بدون حساب) — پاسخ ۳۰ دقیقه کش می‌شود.
// F5-مأموریت ۱۱: علت خطای 400/429 در چرخه‌های F4/F5 با آزمون واقعی مشخص شد:
//   geocoding-api.open-meteo.com سالم است (HTTP 200) ولی api.open-meteo.com
//   از IP خروجی مشترکِ محیط، «سهمیه روزانه» را پاسخ می‌دهد (HTTP 429).
// راه‌حل مجاز: Provider جایگزین — wttr.in (بدون کلید) به‌عنوان fallback؛
// اگر هر دو در دسترس نباشند، خطا صادقانه 502 برمی‌گردد و هرگز Weather
// VERIFIED اعلام نمی‌شود مگر با پاسخ واقعی.

interface Coords { lat: number; lon: number; name: string }

const geoCache = new Map<string, Coords>()
const weatherCache = new Map<string, { at: number; data: WeatherData }>()
const WEATHER_TTL = 30 * 60 * 1000
/** RT-5 (اصلاح Red Team): سقف کش‌ها — ورودی‌های یکتای بی‌کران (اسامی شهر جعلی)
 *  رشد حافظه آهسته می‌سازند؛ با FIFO محدود می‌شود */
const CACHE_MAX_ENTRIES = 200

function setBounded<T>(m: Map<string, T>, key: string, value: T): void {
  if (m.size >= CACHE_MAX_ENTRIES) {
    const oldest = m.keys().next().value
    if (oldest !== undefined) m.delete(oldest)
  }
  m.set(key, value)
}

interface WeatherData {
  city: string
  temp: number
  code: number
  isDay: boolean
}

const OPEN_METEO_TIMEOUT = 4000

async function geocode(city: string): Promise<Coords | null> {
  const key = city.trim().toLowerCase()
  const hit = geoCache.get(key)
  if (hit) return hit
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fa&format=json`,
      { signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT) },
    )
    if (!res.ok) return null
    const d = (await res.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> }
    const r = d.results?.[0]
    if (!r) return null
    const c: Coords = { lat: r.latitude, lon: r.longitude, name: r.name }
    setBounded(geoCache, key, c)
    return c
  } catch (e) {
    console.error('weather geocode failed:', e instanceof Error ? e.message : e)
    return null
  }
}

async function fetchWeather(c: Coords): Promise<WeatherData | null> {
  const wKey = `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`
  const hit = weatherCache.get(wKey)
  if (hit && Date.now() - hit.at < WEATHER_TTL) return hit.data
  // منبع اصلی: Open-Meteo
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,is_day`,
      { signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT) },
    )
    if (res.ok) {
      const d = (await res.json()) as { current?: { temperature_2m: number; weather_code: number; is_day: number } }
      if (d.current) {
        const data: WeatherData = {
          city: c.name,
          temp: Math.round(d.current.temperature_2m),
          code: d.current.weather_code,
          isDay: d.current.is_day === 1,
        }
        setBounded(weatherCache, wKey, { at: Date.now(), data })
        return data
      }
    }
  } catch {
    /* به fallback می‌رویم */
  }
  // F5: Provider جایگزین — wttr.in (بدون کلید). کد وضعیت wttr به WMO ترجمه می‌شود.
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(c.name)}?format=j1`, {
      signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT + 2000),
    })
    if (res.ok) {
      const d = (await res.json()) as {
        current_condition?: Array<{ temp_C?: string; weatherCode?: string; observation_time?: string }>
        weather?: Array<{ astronomy?: Array<{ sunrise?: string; sunset?: string }> }>
      }
      const cur = d.current_condition?.[0]
      if (cur && cur.temp_C !== undefined) {
        const data: WeatherData = {
          city: c.name,
          temp: Math.round(Number(cur.temp_C)),
          code: wttrCodeToWmo(Number(cur.weatherCode ?? '113')),
          isDay: wttrIsDay(cur.observation_time, d.weather?.[0]?.astronomy?.[0]),
        }
        setBounded(weatherCache, wKey, { at: Date.now(), data })
        return data
      }
    }
  } catch {
    /* هر دو منبع در دسترس نیست — خطا صادقانه 502 */
  }
  return null
}

/** ترجمهٔ کد وضعیت wttr.in به کدهای WMO (همان قرارداد Open-Meteo که UI می‌شناسد) */
function wttrCodeToWmo(c: number): number {
  if (c === 113) return 0 // صاف
  if (c === 116) return 2 // کمی ابری
  if (c === 119 || c === 122) return 3 // ابری
  if (c === 143 || c === 248 || c === 260) return 45 // مه
  if ([176, 263, 266, 293, 353].includes(c)) return 51 // نم‌نم/باران سبک
  if ([296, 302, 305, 308, 311, 314, 320, 350].includes(c)) return 61 // باران
  if ([200, 386, 389, 392, 395].includes(c)) return 95 // رعدوبرق
  if ([227, 230, 329, 332, 335, 338, 368, 371, 374, 377].includes(c)) return 71 // برف
  if ([356, 359, 362, 365].includes(c)) return 80 // رگبار
  return 3
}

/** تشخیص روز/شب از ساعت رصد و طلوع/غروب wttr (هر دو به‌وقت محلی شهر) */
function wttrIsDay(observation?: string, astro?: { sunrise?: string; sunset?: string }): boolean {
  if (!observation || !astro?.sunrise || !astro?.sunset) return true
  const mins = (s: string): number => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
    if (!m) return 720
    let h = Number(m[1])
    const mm = Number(m[2])
    const ap = (m[3] ?? '').toUpperCase()
    if (ap === 'PM' && h < 12) h += 12
    if (ap === 'AM' && h === 12) h = 0
    return h * 60 + mm
  }
  const o = mins(observation)
  return o >= mins(astro.sunrise) && o <= mins(astro.sunset)
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 10, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  if (!sameOriginOk(req)) return forbiddenOrigin()
  try {
    const user = await requireUser(req)
    const city = req.nextUrl.searchParams.get('city')?.slice(0, 60)
    if (!city || city.trim().length < 2) {
      return NextResponse.json({ error: 'نام شهر لازم است' }, { status: 400 })
    }
    const coords = await geocode(city)
    if (!coords) {
      return NextResponse.json({ error: 'شهر پیدا نشد' }, { status: 404 })
    }
    const weather = await fetchWeather(coords)
    if (!weather) {
      return NextResponse.json({ error: 'سرویس آب‌وهوا در دسترس نیست' }, { status: 502 })
    }
    return NextResponse.json({ weather })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/weather', e)
    return NextResponse.json({ error: 'خطای داخلی' }, { status: 500 })
  }
}
