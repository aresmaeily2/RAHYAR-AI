// ─── محاسبات سمت کلاینت مالی — خالص ───────────────────────────

export interface ClientTx {
  type: string
  amount: number
}

/** جمع درآمد/هزینه/خالص از تراکنش‌های لودشده (کل یا فیلترشده) */
export function monthlyTotals(txs: ClientTx[]): { income: number; expense: number; net: number } {
  let income = 0
  let expense = 0
  for (const x of txs) {
    if (x.type === 'income') income += x.amount
    else if (x.type === 'expense') expense += x.amount
  }
  return { income, expense, net: income - expense }
}
