// ─── F5-مأموریت ۶: خروجی PDF مالی — سمت سرور، بدون وابستگی ─────
// این سازنده یک PDF واقعی (نسخه ۱٫۴) با فونت‌های استاندارد Helvetica
// می‌سازد؛ چاپ مرورگر جایگزین آن نشده و از سرویس‌های بیرونی هم استفاده
// نمی‌کند. محدودیت مستندشده: فونت استاندارد PDF بدون embedding متن
// یونیکد فارسی را رندر نمی‌کند، بنابراین محتوای PDF لاتین/عددی است
// (تاریخ ISO، اعداد با جداکننده هزار، دسته‌ها و نام حساب‌ها لاتین‌سازی
// می‌شوند). کاربر فارسی‌زبان برای متن کامل فارسی از CSV/Excel/TXT/JSON
// استفاده می‌کند — این محدودیت در گزارش و راهنما مستند است.

import type { ExportTx, ExportAccount, ExportBudget } from './exporters'

// ── عرض تقریبی نویسه‌های Helvetica (واحد: ۱/۱۰۰۰ em) ──
function charWidth(c: string): number {
  if (c === ' ' || c === '.' || c === ',' || c === ':') return 278
  if (c >= '0' && c <= '9') return 556
  if (c === 'I' || c === 'j' || c === 'l' || c === 'i' || c === '!' || c === "'") return 222
  if (c === 'W' || c === 'M') return 889
  return 556
}

function textWidth(s: string, size: number): number {
  let w = 0
  for (const c of s) w += charWidth(c)
  return (w * size) / 1000
}

/** لاتین‌سازی صادقانه: نویسه‌های خارج از WinAnsi با «?» نشان داده می‌شوند */
function winAnsi(s: string): string {
  let out = ''
  for (const c of s) {
    const code = c.codePointAt(0) ?? 63
    out += code <= 0xff && !(code >= 0x7f && code <= 0x9f && c !== '•') ? c : '?'
  }
  return out
}

function pdfEscape(s: string): string {
  return winAnsi(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

export type PdfAccount = ExportAccount
export type PdfTx = ExportTx

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40
const ROW_H = 16
const FS = 9

function fmtAmount(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function asDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

function typeEn(t: string): string {
  return t === 'income' ? 'Income' : t === 'expense' ? 'Expense' : 'Transfer'
}

function kindEn(k: string): string {
  return k === 'cash' ? 'Cash' : k === 'bank' ? 'Bank' : 'Card'
}

interface Cell {
  text: string
  w: number
  align?: 'left' | 'right'
  bold?: boolean
}

interface Row {
  cells: Cell[]
  header?: boolean
  sep?: boolean
}

class ContentBuilder {
  parts: string[] = []
  y = PAGE_H - MARGIN

  text(x: number, size: number, s: string, bold = false): void {
    this.parts.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${this.y.toFixed(2)} Tm (${pdfEscape(s)}) Tj ET`)
  }

  line(x1: number, y1: number, x2: number, y2: number, gray = 0.75): void {
    this.parts.push(`${gray} G 0.5 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)
  }

  row(cells: Cell[], bold = false): void {
    let x = MARGIN
    for (const c of cells) {
      const tw = textWidth(c.text, FS)
      const cx = c.align === 'right' ? x + c.w - tw - 4 : x + 4
      this.text(cx, FS, c.text, bold || c.bold)
      x += c.w
    }
  }

  blank(h: number): void {
    this.y -= h
  }
}

/**
 * ساخت PDF مالی — چندصفحه‌ای؛ جدول تراکنش‌ها با سرستون تکرارشو.
 * خروجی: بایت‌های یک PDF معتبر (xref صحیح، %%EOF).
 */
export function buildFinancePdf(
  accounts: PdfAccount[],
  txs: PdfTx[],
  budgets: ExportBudget[] = [],
): Uint8Array {
  const contentBlobs: Record<number, string> = {}
  const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const colW = [72, 50, 68, 62, 80, 70, 0] // last = note (rest)
  colW[6] = PAGE_W - MARGIN * 2 - colW.slice(0, 6).reduce((a, b) => a + b, 0)

  function txRow(t: PdfTx): Cell[] {
    const d = asDate(t.occurredAt)
    const acc = t.account?.name ?? ''
    const to = t.toAccount?.name ? `${acc} -> ${t.toAccount.name}` : acc
    return [
      { text: isoDate(d), w: colW[0] },
      { text: typeEn(t.type), w: colW[1] },
      { text: fmtAmount(t.amount), w: colW[2], align: 'right' },
      { text: winAnsi(t.category), w: colW[3] },
      { text: winAnsi(to), w: colW[4] },
      { text: winAnsi(t.note ?? '').slice(0, 40), w: colW[5] },
      { text: winAnsi((t.note ?? '').slice(0, 38)), w: colW[6] },
    ]
  }

  const headerRow: Cell[] = [
    { text: 'Date', w: colW[0], bold: true },
    { text: 'Type', w: colW[1], bold: true },
    { text: 'Amount (IRR)', w: colW[2], bold: true, align: 'right' },
    { text: 'Category', w: colW[3], bold: true },
    { text: 'Account', w: colW[4], bold: true },
    { text: 'Note', w: colW[5], bold: true },
    { text: '', w: colW[6], bold: true },
  ]

  // ── صفحه‌بندی ──
  const rows: Row[] = []
  rows.push({ cells: headerRow, header: true })

  // accounts block (first page, before transactions)
  const accLines: string[] = accounts.map(
    (a) => `${winAnsi(a.name)} (${kindEn(a.kind)}): ${fmtAmount(a.balance ?? a.openingAmount)} IRR`,
  )
  const budgetLines: string[] = budgets.map((b) => `${winAnsi(b.category)}: limit ${fmtAmount(b.monthlyLimit)} IRR / month`)

  const TX_PER_PAGE = Math.floor((PAGE_H - MARGIN * 2 - 90) / ROW_H)
  const pages: Row[][] = [rows]
  let rowCount = 0
  for (const t of txs) {
    if (rowCount >= TX_PER_PAGE) {
      const np: Row[] = [{ cells: headerRow, header: true }]
      pages.push(np)
      rowCount = 0
    }
    ;(pages[pages.length - 1] as Row[]).push({ cells: txRow(t) })
    rowCount++
  }

  // ── ساخت اشیاء PDF ──
  const objects: string[] = [] // 1-indexed strings without the "N 0 obj" wrapper decision below
  const nPages = pages.length
  // object numbering: 1=Catalog, 2=Pages, 3..2+n=Page, then content streams, then fonts
  const firstPageObj = 3
  const firstContentObj = firstPageObj + nPages
  const font1Obj = firstContentObj + nPages
  const font2Obj = font1Obj + 1

  const kids = Array.from({ length: nPages }, (_, i) => `${firstPageObj + i} 0 R`).join(' ')
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>`
  for (let i = 0; i < nPages; i++) {
    const contentObj = firstContentObj + i
    objects[firstPageObj + i] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${font1Obj} 0 R /F2 ${font2Obj} 0 R >> >> /Contents ${contentObj} 0 R >>`
  }

  for (let i = 0; i < nPages; i++) {
    const cb = new ContentBuilder()
    cb.y = PAGE_H - MARGIN
    if (i === 0) {
      cb.text(MARGIN, 16, 'RahyAr AI - Finance Report', true)
      cb.blank(18)
      cb.text(MARGIN, 8.5, `Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`)
      cb.blank(12)
      cb.text(MARGIN, 11, 'Accounts & balances', true)
      cb.blank(13)
      for (const l of accLines) {
        cb.text(MARGIN + 8, 9, l)
        cb.blank(12)
      }
      cb.blank(4)
      cb.text(MARGIN, 11, 'Monthly budgets', true)
      cb.blank(13)
      if (budgetLines.length === 0) {
        cb.text(MARGIN + 8, 9, '(none)')
        cb.blank(12)
      }
      for (const l of budgetLines) {
        cb.text(MARGIN + 8, 9, l)
        cb.blank(12)
      }
      cb.blank(4)
      cb.text(MARGIN, 11, 'Summary', true)
      cb.blank(13)
      cb.text(MARGIN + 8, 9, `Transactions: ${txs.length}   |   Total income: ${fmtAmount(totalIncome)} IRR   |   Total expense: ${fmtAmount(totalExpense)} IRR`)
      cb.blank(12)
      cb.blank(6)
      cb.text(MARGIN, 10.5, 'Transactions', true)
      cb.blank(13)
    } else {
      cb.text(MARGIN, 9.5, `RahyAr AI - Finance Report (page ${i + 1}/${nPages})`, true)
      cb.blank(16)
    }
    for (const r of pages[i] as Row[]) {
      cb.row(r.cells, r.header)
      cb.blank(ROW_H)
      if (r.header) {
        cb.line(MARGIN, cb.y + 3, PAGE_W - MARGIN, cb.y + 3, 0.6)
      }
    }
    objects[firstContentObj + i] = `<< /Length ${0} >>\nstream\n<<CONTENT>>\nendstream`
    // جای‌گذاری محتوا با طول دقیق در مرحله نهایی
    contentBlobs[firstContentObj + i] = cb.parts.join('\n')
  }
  objects[font1Obj] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  objects[font2Obj] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`

  // ── سرهم‌بندی با xref صحیح ──
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  let offset = 0
  const offsets: number[] = []
  const push = (s: string): void => {
    const b = enc.encode(s)
    chunks.push(b)
    offset += b.length
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const maxObj = font2Obj
  for (let n = 1; n <= maxObj; n++) {
    offsets[n] = offset
    const raw = contentBlobs[n]
    if (raw !== undefined) {
      const body = enc.encode(raw)
      push(`${n} 0 obj\n<< /Length ${body.length} >>\nstream\n`)
      chunks.push(body)
      offset += body.length
      push('\nendstream\nendobj\n')
    } else {
      push(`${n} 0 obj\n${objects[n] ?? '<< >>'}\nendobj\n`)
    }
  }
  const xrefAt = offset
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= maxObj; n++) {
    xref += `${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  push(xref)

  // ادغام chunkها
  const total = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const c of chunks) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}
