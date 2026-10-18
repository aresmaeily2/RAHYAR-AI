import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'
import { exportRows } from '@/lib/finance/server'
import { buildCsv, buildExcelXml, buildJson, buildTxt } from '@/lib/finance/exporters'

/**
 * خروجی مالی — format=csv|xls|json|txt + month=YYYY-MM (اختیاری)
 * PDF: از نمای گزارش مالی با چاپ مرورگر ساخته می‌شود (پشتیبانی کامل فارسی).
 */
export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  const rl = rateLimit(req, 20, 60_000)
  if (!rl.ok) return tooManyRequests(rl)
  try {
    const user = await requireUser(req)
    const format = (req.nextUrl.searchParams.get('format') ?? 'csv').toLowerCase()
    const month = req.nextUrl.searchParams.get('month') ?? undefined
    const { accounts, transactions, budgets } = await exportRows(user.id, month || undefined)

    const stamp = new Date().toISOString().slice(0, 10)
    let body: string
    let mime: string
    let filename: string

    switch (format) {
      case 'json':
        body = buildJson(accounts, transactions, budgets)
        mime = 'application/json; charset=utf-8'
        filename = `rahyar-finance-${stamp}.json`
        break
      case 'xls':
      case 'excel':
        body = buildExcelXml(accounts, transactions)
        mime = 'application/vnd.ms-excel; charset=utf-8'
        filename = `rahyar-finance-${stamp}.xls`
        break
      case 'txt':
        body = buildTxt(accounts, transactions, budgets)
        mime = 'text/plain; charset=utf-8'
        filename = `rahyar-finance-${stamp}.txt`
        break
      case 'csv':
      default:
        body = buildCsv(transactions)
        mime = 'text/csv; charset=utf-8'
        filename = `rahyar-finance-${stamp}.csv`
        break
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/finance/export', e)
    return NextResponse.json({ error: 'خطا در ساخت خروجی' }, { status: 500 })
  }
}
