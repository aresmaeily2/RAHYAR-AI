import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin, readJsonSafe, cleanText } from '@/lib/security'
import { parseSmsText } from '@/lib/sms/parser'
import { createTransaction, FinanceValidationError } from '@/lib/finance/server'
import { createHash } from 'crypto'

/**
 * ورود پیامک بانکی — دو مرحله‌ای با رضایت کاربر:
 *   confirm=false → فقط پیش‌نمایش تحلیل (هیچ ثبت نمی‌شود)
 *   confirm=true  → تراکنش‌های انتخابی ثبت (ضدتکرار با هش پیامک)
 * رضایت (Setting: sms_consent=1) شرط ثبت است — بدون آن خطا برمی‌گردد.
 */
export async function POST(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 12, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const body = (await readJsonSafe(req)) as {
      text?: unknown
      confirm?: unknown
      selected?: unknown
      accountId?: unknown
    } | null

    const text = cleanText(body?.text as string, 20_000)
    if (!text) return NextResponse.json({ error: 'متن پیامک خالی است' }, { status: 400 })

    const { transactions, ignored } = parseSmsText(text)
    if (transactions.length === 0) {
      return NextResponse.json({
        preview: [],
        ignored,
        message: 'پیامک قابل تشخیصی پیدا نشد. فقط پیامک‌های بانکی (واریز/برداشت/خرید) تحلیل می‌شوند.',
      })
    }

    if (!body?.confirm) {
      return NextResponse.json({
        preview: transactions.map((t, i) => ({ index: i, ...t, occurredAt: t.occurredAt?.toISOString() ?? null })),
        ignored,
      })
    }

    // ثبت — نیازمند رضایت + حساب مقصد
    const { getUserSetting, SETTING_KEYS } = await import('@/lib/server-settings')
    const consent = (await getUserSetting(user.id, SETTING_KEYS.smsConsent)) === '1'
    if (!consent) {
      return NextResponse.json({ error: 'برای ثبت از پیامک، اول رضایت خود را در تنظیمات اعلام کن.' }, { status: 403 })
    }
    const accountId = String(body?.accountId ?? '')
    if (!accountId) {
      return NextResponse.json({ error: 'حساب مقصد را انتخاب کن' }, { status: 400 })
    }

    const selected = Array.isArray(body?.selected)
      ? (body.selected as unknown[]).map(Number).filter((n) => Number.isInteger(n))
      : transactions.map((_, i) => i)

    const results: Array<{ index: number; id: string; duplicate: boolean }> = []
    for (const index of selected) {
      const t = transactions[index]
      if (!t) continue
      const ref = createHash('sha256').update(t.raw).digest('hex').slice(0, 40)
      const tx = await createTransaction(user.id, {
        type: t.type,
        amount: t.amount,
        accountId,
        category: t.type === 'income' ? 'other' : 'other',
        note: `${t.bank}${t.cardLast4 ? ` •${t.cardLast4}` : ''}`,
        occurredAt: t.occurredAt ?? new Date(),
        source: 'sms',
        externalRef: ref,
      })
      results.push({ index, id: tx.id, duplicate: tx.duplicate })
    }

    return NextResponse.json({ saved: results.length, results, ignored })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    if (e instanceof FinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    console.error('POST /api/sms/import', e)
    return NextResponse.json({ error: 'خطا در تحلیل پیامک' }, { status: 500 })
  }
}
