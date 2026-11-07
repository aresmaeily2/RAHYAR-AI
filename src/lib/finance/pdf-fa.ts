// ─── F7 — PDF مالی فارسی راست‌چین (Gate D: رفع مشکل «?» مأموریت F6) ──────
// چاپ HTML راست‌چین با موتور Chromium (Playwright) = شکل‌دهی و Bidi کامل فارسی
// با فونت سیستم. اگر Chromium/Playwright در میزبان نبود → null و روت به
// سازندهٔ لاتین قبلی (buildFinancePdf) برمی‌گردد — fail-degraded صادقانه.
import type { ExportTx, ExportAccount, ExportBudget } from './exporters'

const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const fmt = (n: number): string =>
  Number(n ?? 0).toLocaleString('en-US').replace(/,/g, '٬')

const KIND_FA: Record<string, string> = {
  income: 'درآمد',
  expense: 'هزینه',
  transfer: 'انتقال',
}

const KIND_COLOR: Record<string, string> = {
  income: '#047857',
  expense: '#b91c1c',
  transfer: '#1d4ed8',
}

/** HTML راست‌چین گزارش مالی — خالص و آزمون‌پذیر (ورودی همان قرارداد exporters) */
export function buildFinancePdfFaHtml(
  accounts: ExportAccount[],
  txs: ExportTx[],
  budgets: ExportBudget[] = [],
  generatedAt: Date = new Date(),
): string {
  const accRows = accounts
    .map(
      (a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.kind)}</td><td class="num">${fmt(a.balance ?? a.openingAmount)}</td></tr>`,
    )
    .join('\n')
  const txRows = txs
    .slice(0, 400)
    .map((t) => {
      const d = new Date(t.occurredAt)
      const date = isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10)
      const acc = t.account?.name ? esc(t.account.name) : '—'
      const dst = t.toAccount?.name ? ` → ${esc(t.toAccount.name)}` : ''
      return `<tr><td>${date}</td><td style="color:${KIND_COLOR[t.type] ?? '#111'}">${esc(KIND_FA[t.type] ?? t.type)}</td><td class="num">${fmt(t.amount)}</td><td>${acc}${dst}</td><td>${esc(t.note ?? '')}</td></tr>`
    })
    .join('\n')
  const budRows = budgets
    .map((b) => `<tr><td>${esc(b.category)}</td><td class="num">${fmt(b.monthlyLimit)}</td></tr>`)
    .join('\n')
  const sumIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const sumExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return `<!doctype html>
<html dir="rtl" lang="fa"><head><meta charset="utf-8">
<style>
  * { font-family: 'DejaVu Sans', 'Vazirmatn', 'Noto Naskh Arabic', sans-serif; }
  body { margin: 28px 34px; color: #111827; font-size: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; margin: 18px 0 6px; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  .meta { color: #6b7280; font-size: 10px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d1d5db; padding: 4px 7px; text-align: right; }
  th { background: #f3f4f6; font-weight: 700; }
  td.num, th.num { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
  .kpis { display: flex; gap: 10px; margin: 10px 0; }
  .kpi { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; }
  .kpi b { display: block; font-size: 14px; margin-top: 2px; }
  footer { margin-top: 22px; color: #9ca3af; font-size: 9px; text-align: center; }
</style></head><body>
<h1>رهیار AI — گزارش مالی</h1>
<div class="meta">تولیدشده: ${generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC · واحد مبالغ: ریال</div>
<div class="kpis">
  <div class="kpi">جمع درآمد<b style="color:#047857">${fmt(sumIncome)}</b></div>
  <div class="kpi">جمع هزینه<b style="color:#b91c1c">${fmt(sumExpense)}</b></div>
  <div class="kpi">خالص<b>${fmt(sumIncome - sumExpense)}</b></div>
</div>
<h2>حساب‌ها و مانده‌ها</h2>
<table><thead><tr><th>نام حساب</th><th>نوع</th><th class="num">مانده (ریال)</th></tr></thead><tbody>
${accRows || '<tr><td colspan="3">حسابی ثبت نشده است</td></tr>'}
</tbody></table>
<h2>بودجه‌های ماهانه</h2>
<table><thead><tr><th>دسته</th><th class="num">سقف ماهانه (ریال)</th></tr></thead><tbody>
${budRows || '<tr><td colspan="2">بودجه‌ای ثبت نشده است</td></tr>'}
</tbody></table>
<h2>تراکنش‌ها (${txs.length} مورد)</h2>
<table><thead><tr><th>تاریخ</th><th>نوع</th><th class="num">مبلغ (ریال)</th><th>حساب</th><th>یادداشت</th></tr></thead><tbody>
${txRows || '<tr><td colspan="5">تراکنشی ثبت نشده است</td></tr>'}
</tbody></table>
<footer>رهیار AI — این گزارش به‌صورت سمت سرور با شکل‌دهی کامل فارسی تولید شده است.</footer>
</body></html>`
}

/** رندر PDF با Chromium — خروجی null یعنی محیط رندر در دسترس نیست (fallback لاتین) */
export async function renderFinancePdfFa(
  accounts: ExportAccount[],
  txs: ExportTx[],
  budgets: ExportBudget[] = [],
): Promise<Buffer | null> {
  const { spawn } = await import('node:child_process')
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const path = await import('node:path')
  const dir = await mkdtemp(path.join(tmpdir(), 'rahyar-pdf-'))
  try {
    const htmlPath = path.join(dir, 'report.html')
    const outPath = path.join(dir, 'report.pdf')
    await writeFile(htmlPath, buildFinancePdfFaHtml(accounts, txs, budgets), 'utf8')
    // مسیر اسکریپت به‌صورت غیر-استاتیک ساخته می‌شود تا باندلر آن را ردیابی نکند
    const script = [process.cwd(), 'scripts', 'pdf-render.mjs'].join('/')
    const r = await new Promise<{ code: number; err: string }>((resolve) => {
      const p = spawn('node', [String(script), htmlPath, outPath], { timeout: 45_000 })
      let err = ''
      p.stderr.on('data', (c) => (err += c))
      p.on('close', (code) => resolve({ code: code ?? 1, err }))
      p.on('error', () => resolve({ code: 1, err: 'spawn-failed' }))
    })
    if (r.code !== 0) return null
    return await readFile(outPath)
  } catch {
    return null
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
