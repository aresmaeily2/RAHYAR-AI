import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { rateLimit, tooManyRequests, sameOriginOk, forbiddenOrigin } from '@/lib/security'
import { exportRows } from '@/lib/finance/server'
import { buildCsv, buildExcelXml, buildJson, buildTxt } from '@/lib/finance/exporters'
import { buildFinancePdf } from '@/lib/finance/pdf'

/**
 * خروجی مالی — format=csv|xls|json|txt|pdf + month=YYYY-MM (اختیاری)
 * F5-مأموریت ۶: PDF «سمت سرور» واقعی تولید می‌شود (buildFinancePdf) —
 * جایگزینی با چاپ مرورگر نیست؛ محدودیت فونت لاتین در گزارش مستند است.
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
    let body: string | Uint8Array
    let mime: string
    let filename: string

    switch (format) {
      case 'pdf': {
        // F5: PDF سمت سرور — بازت خروجی واقعی PDF (نه چاپ مرورگر)
        body = buildFinancePdf(accounts, transactions, budgets)
        mime = 'application/pdf'
        filename = `rahyar-finance-${stamp}.pdf`
        break
      }
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

    return new NextResponse(body instanceof Uint8Array ? new Blob([body as unknown as BlobPart], { type: mime }) : body, {
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
