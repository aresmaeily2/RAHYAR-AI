// ─── سازنده‌های خروجی مالی — خالص و آزمون‌پذیر ─────────────────
// CSV (UTF-8 BOM برای اکسل فارسی) | Excel (SpreadsheetML 2003)
// | JSON | TXT — بدون وابستگی بیرونی، بدون کلید، بدون سرویس.

export interface ExportTx {
  type: string
  amount: number
  category: string
  note: string | null
  occurredAt: Date | string
  account?: { name?: string } | null
  toAccount?: { name?: string } | null
}

export interface ExportAccount {
  name: string
  kind: string
  openingAmount: number
  currency: string
  balance?: number
}

const HEADERS = ['تاریخ', 'ساعت', 'نوع', 'مبلغ (ریال)', 'دسته', 'حساب', 'حساب مقصد', 'یادداشت']

function typeLabelFa(t: string): string {
  return t === 'income' ? 'درآمد' : t === 'expense' ? 'هزینه' : 'انتقال'
}

function kindLabelFa(k: string): string {
  return k === 'cash' ? 'نقدی' : k === 'bank' ? 'بانکی' : 'کارت'
}

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function isoTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

function asDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

export function buildCsv(txs: ExportTx[]): string {
  const rows = [HEADERS.map(csvCell).join(',')]
  for (const t of txs) {
    const d = asDate(t.occurredAt)
    rows.push(
      [
        isoDate(d),
        isoTime(d),
        typeLabelFa(t.type),
        String(Math.round(t.amount)),
        t.category,
        t.account?.name ?? '',
        t.toAccount?.name ?? '',
        (t.note ?? '').replace(/\r?\n/g, ' '),
      ]
        .map(csvCell)
        .join(','),
    )
  }
  // BOM برای بازشدن درست UTF-8 در Excel
  return '\ufeff' + rows.join('\r\n')
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Excel 2003 SpreadsheetML — اکسل و LibreOffice مستقیم باز می‌کنند */
export function buildExcelXml(accounts: ExportAccount[], txs: ExportTx[]): string {
  const headerCells = HEADERS.map(
    (h) => `<Cell ss:StyleID="head"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`,
  ).join('')
  const bodyRows = txs
    .map((t) => {
      const d = asDate(t.occurredAt)
      const cells = [
        `<Cell><Data ss:Type="String">${xmlEscape(isoDate(d))}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(isoTime(d))}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(typeLabelFa(t.type))}</Data></Cell>`,
        `<Cell><Data ss:Type="Number">${Math.round(t.amount)}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(t.category)}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(t.account?.name ?? '')}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(t.toAccount?.name ?? '')}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${xmlEscape(t.note ?? '')}</Data></Cell>`,
      ].join('')
      return `<Row>${cells}</Row>`
    })
    .join('')
  const accRows = accounts
    .map(
      (a) =>
        `<Row><Cell><Data ss:Type="String">${xmlEscape(a.name)}</Data></Cell><Cell><Data ss:Type="String">${xmlEscape(kindLabelFa(a.kind))}</Data></Cell><Cell><Data ss:Type="Number">${Math.round(a.balance ?? a.openingAmount)}</Data></Cell></Row>`,
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="head"><Font ss:Bold="1"/><Interior ss:Color="#EFEFEF" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="تراکنش‌ها">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
 <Worksheet ss:Name="حساب‌ها">
  <Table>
   <Row>${headerCells}</Row>
   ${accRows}
  </Table>
 </Worksheet>
</Workbook>`
}

export interface ExportBudget {
  category: string
  monthlyLimit: number
}

export function buildJson(
  accounts: ExportAccount[],
  txs: ExportTx[],
  budgets: ExportBudget[] = [],
): string {
  return JSON.stringify(
    {
      app: 'Rahyar AI',
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((a) => ({ ...a, balance: a.balance ?? a.openingAmount })),
      transactions: txs.map((t) => ({
        type: t.type,
        amount: Math.round(t.amount),
        category: t.category,
        note: t.note ?? '',
        occurredAt: asDate(t.occurredAt).toISOString(),
        account: t.account?.name ?? '',
        toAccount: t.toAccount?.name ?? '',
      })),
      budgets: budgets.map((b) => ({ category: b.category, monthlyLimit: Math.round(b.monthlyLimit) })),
    },
    null,
    2,
  )
}

export function buildTxt(
  accounts: ExportAccount[],
  txs: ExportTx[],
  budgets: ExportBudget[] = [],
): string {
  const sep = '='.repeat(46)
  const lines: string[] = []
  lines.push('رهیار AI — خروجی مالی', sep)
  lines.push('حساب‌ها:')
  for (const a of accounts) {
    lines.push(`  - ${a.name} (${kindLabelFa(a.kind)}) — مانده: ${Math.round(a.balance ?? a.openingAmount).toLocaleString('en-US')} ریال`)
  }
  if (budgets.length > 0) {
    lines.push('', 'بودجه ماهانه دسته‌ها:')
    for (const b of budgets) {
      lines.push(`  - ${typeLabelFa('expense')} ${b.category}: سقف ${Math.round(b.monthlyLimit).toLocaleString('en-US')} ریال`)
    }
  }
  lines.push('', `تراکنش‌ها (${txs.length}):`)
  for (const t of txs) {
    const d = asDate(t.occurredAt)
    const to = t.toAccount?.name ? ` ← ${t.toAccount.name}` : ''
    lines.push(
      `  [${isoDate(d)} ${isoTime(d)}] ${typeLabelFa(t.type)} — ${Math.round(t.amount).toLocaleString('en-US')} ریال | ${t.account?.name ?? ''}${to} | ${t.category}${t.note ? ` | ${t.note}` : ''}`,
    )
  }
  return lines.join('\n')
}
