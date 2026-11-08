import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe } from '@/lib/security'
import {
  getUserLang,
  getCalendarMode,
  getVoiceReplies,
  getVoiceRate,
  getVoiceLang,
  getFinanceCurrency,
  getUserSetting,
  setUserSetting,
  SETTING_KEYS,
} from '@/lib/server-settings'

/** تنظیمات کلی اپ — زبان / تقویم / پاسخ گفتاری (سرور = منبع حقیقت) */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 120, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const lang = await getUserLang(user.id)
    return NextResponse.json({
      lang,
      calendarMode: await getCalendarMode(user.id, lang),
      voiceReplies: await getVoiceReplies(user.id),
      voiceRate: await getVoiceRate(user.id),
      voiceLang: await getVoiceLang(user.id),
      smsConsent: (await getUserSetting(user.id, SETTING_KEYS.smsConsent)) === '1',
      financeCurrency: await getFinanceCurrency(user.id),
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/settings/app', e)
    return NextResponse.json({ error: 'خطا در دریافت تنظیمات' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 40, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      lang?: unknown
      calendarMode?: unknown
      voiceReplies?: unknown
      voiceRate?: unknown
      voiceLang?: unknown
      smsConsent?: unknown
      financeCurrency?: unknown
    } | null

    if (body?.lang !== undefined) {
      if (body.lang !== 'fa' && body.lang !== 'en') {
        return NextResponse.json({ error: 'زبان نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.appLang, body.lang)
    }
    if (body?.calendarMode !== undefined) {
      if (body.calendarMode !== 'jalali' && body.calendarMode !== 'dual' && body.calendarMode !== 'gregorian') {
        return NextResponse.json({ error: 'حالت تقویم نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.calendarMode, body.calendarMode)
    }
    if (body?.voiceReplies !== undefined) {
      await setUserSetting(user.id, SETTING_KEYS.voiceReplies, body.voiceReplies ? '1' : '0')
    }
    if (body?.voiceRate !== undefined) {
      const n = Number(body.voiceRate)
      if (!Number.isFinite(n) || n < 0.5 || n > 2.5) {
        return NextResponse.json({ error: 'سرعت خواندن نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.voiceRate, String(n))
    }
    if (body?.voiceLang !== undefined) {
      if (body.voiceLang !== '' && body.voiceLang !== 'fa' && body.voiceLang !== 'en') {
        return NextResponse.json({ error: 'زبان صوتی نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.voiceLang, String(body.voiceLang))
    }
    if (body?.smsConsent !== undefined) {
      await setUserSetting(user.id, SETTING_KEYS.smsConsent, body.smsConsent ? '1' : '0')
    }
    if (body?.financeCurrency !== undefined) {
      if (body.financeCurrency !== 'irr' && body.financeCurrency !== 'toman') {
        return NextResponse.json({ error: 'واحد پول نامعتبر است' }, { status: 400 })
      }
      await setUserSetting(user.id, SETTING_KEYS.financeCurrency, body.financeCurrency)
    }

    const lang = await getUserLang(user.id)
    return NextResponse.json({
      lang,
      calendarMode: await getCalendarMode(user.id, lang),
      voiceReplies: await getVoiceReplies(user.id),
      voiceRate: await getVoiceRate(user.id),
      voiceLang: await getVoiceLang(user.id),
      smsConsent: (await getUserSetting(user.id, SETTING_KEYS.smsConsent)) === '1',
      financeCurrency: await getFinanceCurrency(user.id),
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('PUT /api/settings/app', e)
    return NextResponse.json({ error: 'خطا در ذخیره تنظیمات' }, { status: 500 })
  }
}
