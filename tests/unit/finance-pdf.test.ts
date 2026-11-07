// ─── آزمون‌های PDF مالی سمت سرور (F5-مأموریت ۶) — bun:test ──────
import { describe, expect, test } from 'bun:test'
import { buildFinancePdf } from '../../src/lib/finance/pdf'
import type { ExportTx, ExportAccount } from '../../src/lib/finance/exporters'

function toLatin(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return s
}

const accounts: ExportAccount[] = [
  { name: 'حساب-الف', kind: 'bank', openingAmount: 1_000_000, currency: 'IRR', balance: 1_350_000 },
  { name: 'حساب-ب', kind: 'cash', openingAmount: 500_000, currency: 'IRR', balance: 250_000 },
]
const txs: ExportTx[] = [
  { type: 'income', amount: 2_000_000, category: 'salary', note: 'حقوق', occurredAt: new Date('2026-11-01T10:00:00Z'), account: { name: 'حساب-الف' } },
  { type: 'expense', amount: 500_000, category: 'food', note: 'خرید هفتگی', occurredAt: new Date('2026-11-02T12:30:00Z'), account: { name: 'حساب-الف' } },
  { type: 'transfer', amount: 300_000, category: 'transfer', note: null, occurredAt: new Date('2026-11-03T09:00:00Z'), account: { name: 'حساب-الف' }, toAccount: { name: 'حساب-ب' } },
]

describe('buildFinancePdf (server-side PDF)', () => {
  test('valid PDF structure: header, catalog, pages, xref, EOF', () => {
    const bytes = buildFinancePdf(accounts, txs, [{ category: 'food', monthlyLimit: 100_000 }])
    const s = toLatin(bytes)
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(s).toContain('/Type /Catalog')
    expect(s).toContain('/Type /Page')
    expect(s).toContain('/BaseFont /Helvetica')
    expect(s).toContain('startxref')
    // طول استریم محتوا باید با /Length سازگار باشد
    const re = /<< \/Length (\d+) >>\nstream\n/g
    let m: RegExpExecArray | null
    let checked = 0
    while ((m = re.exec(s)) !== null) {
      const declared = Number(m[1])
      const after = s.slice(m.index + m[0].length)
      expect(after.slice(0, declared).includes('endstream')).toBe(false)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  test('xref offsets point to real objects', () => {
    const s = toLatin(buildFinancePdf(accounts, txs))
    const xrefAt = Number((s.match(/startxref\n(\d+)\n%%EOF/) as RegExpMatchArray)[1])
    expect(s.slice(xrefAt, xrefAt + 4)).toBe('xref')
    const firstOff = Number(s.slice(xrefAt).split('\n')[3].slice(0, 10))
    expect(s.slice(firstOff, firstOff + 7)).toBe('1 0 obj')
  })

  test('contains title, amounts, totals and balances', () => {
    const s = toLatin(buildFinancePdf(accounts, txs))
    expect(s).toContain('RahyAr AI - Finance Report')
    expect(s).toContain('Income')
    expect(s).toContain('2,000,000')
    expect(s).toContain('1,350,000')
    expect(s).toContain('Total income')
  })

  test('multi-page with many transactions + repeated header', () => {
    const many: ExportTx[] = Array.from({ length: 120 }, (_, i) => ({
      type: i % 2 === 0 ? 'expense' : 'income',
      amount: 1000 + i,
      category: 'test',
      note: null,
      occurredAt: new Date(2026, 10, 1, 12, 0, i),
      account: { name: 'acc' },
    }))
    const s = toLatin(buildFinancePdf(accounts, many))
    const pageObjCount = (s.match(/\/Type \/Page[^s]/g) ?? []).length
    expect(pageObjCount).toBeGreaterThan(1)
    expect(s).toContain('(page 2/')
  })

  test('honest Latin-only rendering: Persian becomes ?, never raw Persian bytes', () => {
    const fa: ExportTx[] = [{ type: 'expense', amount: 50000, category: 'خوراک', note: 'خرید', occurredAt: new Date(), account: { name: 'نقدی' } }]
    const s = toLatin(buildFinancePdf([{ name: 'نقدی', kind: 'cash', openingAmount: 0, currency: 'IRR' }], fa))
    expect(s).toContain('???')
    expect(s).not.toContain('\u062e')
  })

  test('totals computed independently: income 2,000,000 / expense 500,000', () => {
    const s = toLatin(buildFinancePdf(accounts, txs))
    expect(s).toContain('Total income: 2,000,000 IRR')
    expect(s).toContain('Total expense: 500,000 IRR')
    expect(s).toContain('Transactions: 3')
  })
})
