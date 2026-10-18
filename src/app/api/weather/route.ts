import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'

// ─── آب‌وهوا — ماژول اختیاری بخش UI خانه (Redesign 2.0) ───────────
// منبع: Open-Meteo (بدون کلید، بدون حساب) — فقط در صورت فعال‌سازی
// صریح کاربر فراخوانی می‌شود؛ پاسخ ۳۰ دقیقه در حافظه کش می‌گردد.
// تغییر مستند: یک مسیر GET جدید + بدون تغییر مدل داده.

interface Coords { lat: number; lon: number; name: string }

const geoCache = new Map<string, Coords>()
const weatherCache = new Map<string, { at: number; data: WeatherData }>()
const WEATHER_TTL = 30 * 60 * 1000

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
    geoCache.set(key, c)
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
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,is_day`,
      { signal: AbortSignal.timeout(OPEN_METEO_TIMEOUT) },
    )
    if (!res.ok) return null
    const d = (await res.json()) as { current?: { temperature_2m: number; weather_code: number; is_day: number } }
    if (!d.current) return null
    const data: WeatherData = {
      city: c.name,
      temp: Math.round(d.current.temperature_2m),
      code: d.current.weather_code,
      isDay: d.current.is_day === 1,
    }
    weatherCache.set(wKey, { at: Date.now(), data })
    return data
  } catch {
    return null
  }
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
