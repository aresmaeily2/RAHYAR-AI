'use client'

// ─── نمای مالی شخصی — نسخه ۱٫۰ رهیار ─────────────────────────
// حساب‌های چندگانه + درآمد/هزینه/انتقال + دسته‌بندی + نمودار +
// خروجی (CSV/Excel/JSON/TXT/PDF چاپی) + ورود پیامک بانکی با رضایت.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  CreditCard,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/store'
import { formatNum } from '@/i18n/core'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, categoriesForType, type FinanceType } from '@/lib/finance/core'
import { monthlyTotals } from '@/lib/finance/client'
import type { BudgetStatus } from '@/lib/finance/budget'

interface AccountT {
  id: string
  name: string
  kind: string
  openingAmount: number
  currency: string
  balance: number
}

interface TxT {
  id: string
  type: string
  amount: number
  accountId: string
  toAccountId: string | null
  category: string
  note: string | null
  occurredAt: string
  source: string
  account?: { name?: string } | null
  toAccount?: { name?: string } | null
}

interface SmsPreviewItem {
  index: number
  bank: string
  type: 'income' | 'expense'
  amount: number
  raw: string
}

interface BudgetTotalsT {
  totalLimit: number
  totalSpent: number
  overCount: number
}

function money(n: number, lang: 'fa' | 'en', currency: 'irr' | 'toman' = 'irr'): string {
  const v = currency === 'toman' ? n / 10 : n
  const s = Math.round(v).toLocaleString('en-US')
  if (lang === 'fa') return s.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]) + (currency === 'toman' ? ' تومان' : ' ریال')
  return s + (currency === 'toman' ? ' Toman' : ' IRR')
}

function kindIcon(kind: string) {
  if (kind === 'bank') return Banknote
  if (kind === 'card') return CreditCard
  return Wallet
}

export function FinanceView() {
  const { t, lang } = useI18n()
  const [accounts, setAccounts] = useState<AccountT[]>([])
  const [txs, setTxs] = useState<TxT[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showAddAcc, setShowAddAcc] = useState(false)
  const [showSms, setShowSms] = useState(false)
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [budgetTotals, setBudgetTotals] = useState<BudgetTotalsT | null>(null)
  const [currency, setCurrency] = useState<'irr' | 'toman'>('irr')

  const reload = useCallback(async () => {
    try {
      const [accRes, txRes, bRes, sRes] = await Promise.all([
        fetch('/api/finance/accounts'),
        fetch('/api/finance/transactions'),
        fetch('/api/finance/budgets'),
        fetch('/api/settings/app'),
      ])
      const accData = await accRes.json()
      const txData = await txRes.json()
      const bData = await bRes.json().catch(() => null)
      const sData = await sRes.json().catch(() => null)
      if (sData?.financeCurrency) setCurrency(sData.financeCurrency)
      if (accData.accounts) setAccounts(accData.accounts)
      if (txData.transactions) setTxs(txData.transactions)
      if (bData?.statuses) {
        setBudgetStatuses(bData.statuses)
        setBudgetTotals(bData.totals ?? null)
      }
    } catch {
      toast.error(t('ارتباط برقرار نشد؛ اتصال را بررسی کن'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void reload()
  }, [reload])

  const totals = useMemo(() => monthlyTotals(txs), [txs])
  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts])
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const x of txs) {
      if (x.type !== 'expense') continue
      map.set(x.category, (map.get(x.category) ?? 0) + x.amount)
    }
    const arr = [...map.entries()].map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
    const max = arr[0]?.total ?? 1
    return arr.slice(0, 6).map((x) => ({ ...x, pct: Math.round((x.total / max) * 100) }))
  }, [txs])

  if (loading) {
    return (
      <div className="space-y-3 pb-4" aria-busy="true">
        <div className="ara-skeleton h-24 rounded-2xl" />
        <div className="ara-skeleton h-40 rounded-2xl" />
        <div className="ara-skeleton h-56 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-4">
      {/* خلاصه بالا */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground">{t('موجودی کل')}</p>
          <p className="mt-1 font-heading text-base font-extrabold text-primary-text">{money(totalBalance, lang, currency)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowDownLeft className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {t('درآمد')} ({t('همین حالا') ? '' : ''})
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{money(totals.income, lang, currency)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowUpRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />
            {t('هزینه')}
          </p>
          <p className="mt-1 text-sm font-bold text-rose-700 dark:text-rose-300">{money(totals.expense, lang, currency)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-[10px] text-muted-foreground">{t('خلاصه وضعیت')}</p>
          <p className={cn('mt-1 text-sm font-bold', totals.net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300')}>
            {money(totals.net, lang, currency)}
          </p>
        </div>
      </div>

      {/* حساب‌ها */}
      <section className="glass-card rounded-3xl p-4" aria-label={t('حساب‌ها')}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-sm font-bold">{t('حساب‌ها')}</h2>
          <button
            onClick={() => setShowAddAcc((v) => !v)}
            className="glass-chip ara-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            {t('حساب جدید')}
          </button>
        </div>
        {showAddAcc && <AddAccount onDone={() => { setShowAddAcc(false); void reload() }} />}
        <div className="flex flex-wrap gap-2">
          {accounts.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">{t('حساب جدید')} — {t('افزودن اولین کار')}</p>
          )}
          {accounts.map((a) => {
            const Icon = kindIcon(a.kind)
            return (
              <div key={a.id} className="glass-chip flex items-center gap-2 rounded-xl px-3 py-2">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <div>
                  <p className="text-[11px] font-bold leading-4">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{money(a.balance, lang, currency)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* بودجه ماهانه — سقف هر دسته هزینه با نوار پیشرفت */}
      <BudgetSection statuses={budgetStatuses} totals={budgetTotals} currency={currency} onChanged={() => void reload()} />

      {/* تراکنش‌ها */}
      <section className="glass-card rounded-3xl p-4" aria-label={t('تراکنش‌ها')}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-bold">{t('تراکنش‌ها')}</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSms((v) => !v)}
              className="glass-chip ara-press rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              SMS
            </button>
            <ExportMenu />
            <button
              onClick={() => setShowAddTx((v) => !v)}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-3 w-3" />
              {t('تراکنش جدید')}
            </button>
          </div>
        </div>

        {showSms && <SmsImport accounts={accounts} onDone={() => { setShowSms(false); void reload() }} />}
        {showAddTx && (
          <AddTransaction
            accounts={accounts}
            onClose={() => setShowAddTx(false)}
            onDone={() => { setShowAddTx(false); void reload() }}
          />
        )}

        {/* نمودار دسته‌ها */}
        {byCategory.length > 0 && (
          <div className="mb-4 space-y-1.5" aria-label={t('نمودار')}>
            {byCategory.map((c) => (
              <div key={c.category} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{t(CATEGORY_LABELS[c.category] ?? 'متفرقه')}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" style={{ direction: 'ltr' }}>
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="w-24 shrink-0 text-end text-[10px] tabular-nums text-muted-foreground">{money(c.total, lang, currency)}</span>
              </div>
            ))}
          </div>
        )}

        <ul className="divide-y divide-border/40">
          {txs.length === 0 && (
            <li className="py-6 text-center text-xs text-muted-foreground">{t('هنوز کاری ثبت نکردی')}</li>
          )}
          {txs.slice(0, 30).map((x) => (
            <li key={x.id} className="flex items-center gap-2.5 py-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  x.type === 'income' ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : x.type === 'expense' ? 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
                      : 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
                )}
              >
                {x.type === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : x.type === 'expense' ? <ArrowUpRight className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {t(CATEGORY_LABELS[x.category] ?? 'متفرقه')}
                  {x.type === 'transfer' && (
                    <span className="text-muted-foreground"> — {x.account?.name} ← {x.toAccount?.name}</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'fa-IR-u-ca-persian', { day: 'numeric', month: 'short' }).format(new Date(x.occurredAt))}
                  {' · '}
                  {x.account?.name}
                  {x.note ? ` · ${x.note}` : ''}
                  {x.source === 'sms' ? ' · SMS' : ''}
                </p>
              </div>
              <span className={cn(
                'shrink-0 text-xs font-bold tabular-nums',
                x.type === 'income' ? 'text-emerald-700 dark:text-emerald-300' : x.type === 'expense' ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground',
              )}>
                {x.type === 'expense' ? '−' : x.type === 'income' ? '+' : ''}
                {formatNum(Math.round(x.amount).toLocaleString('en-US'), lang)}
              </span>
              <button
                onClick={async () => {
                  const res = await fetch(`/api/finance/transactions/${x.id}`, { method: 'DELETE' })
                  if (res.ok) { toast.success(t('حذف شد')); void reload() } else toast.error(t('حذف ناموفق بود'))
                }}
                aria-label={t('حذف')}
                className="ara-press rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-rose-500/10 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* PDF چاپی */}
      <p className="px-2 text-center text-[10px] leading-5 text-muted-foreground">
        {t('خروجی گرفتن')} PDF: {t('نمای گزارش')} → Ctrl/Cmd+P
      </p>
    </div>
  )
}

// ── بودجه ماهانه — سقف دسته‌ها با نوار مصرف ──
function BudgetSection({
  statuses,
  totals,
  currency,
  onChanged,
}: {
  statuses: BudgetStatus[]
  totals: BudgetTotalsT | null
  currency: 'irr' | 'toman'
  onChanged: () => void
}) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [limit, setLimit] = useState('')
  const [busy, setBusy] = useState(false)

  const unbudgeted: string[] = EXPENSE_CATEGORIES.filter(
    (c) => !statuses.some((s) => s.category === c),
  )

  async function save() {
    const n = Number(limit.replace(/[^\d]/g, ''))
    if (!Number.isFinite(n) || n <= 0) {
      toast.error(t('مقدار نامعتبر است'))
      return
    }
    const effCategory = unbudgeted.includes(category) ? category : unbudgeted[0]
    if (!effCategory) return
    setBusy(true)
    try {
      const res = await fetch('/api/finance/budgets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: effCategory, monthlyLimit: n }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'error')
      toast.success(t('ذخیره شد'))
      setLimit('')
      setOpen(false)
      onChanged()
    } catch {
      toast.error(t('ذخیره ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(cat: string) {
    try {
      const res = await fetch(`/api/finance/budgets?category=${encodeURIComponent(cat)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(t('حذف شد'))
      onChanged()
    } catch {
      toast.error(t('حذف ناموفق بود'))
    }
  }

  return (
    <section className="glass-card rounded-3xl p-4" aria-label={t('بودجه')}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold">{t('بودجه ماهانه')}</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={unbudgeted.length === 0 && !open}
          className="glass-chip ara-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <Target className="h-3 w-3" />
          {t('سقف جدید')}
        </button>
      </div>

      {open && (
        <div className="mb-3 space-y-2 rounded-xl bg-secondary/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={unbudgeted.includes(category) ? category : (unbudgeted[0] ?? category)}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t('دسته هزینه')}
              className="rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {unbudgeted.map((c) => (
                <option key={c} value={c}>{t(CATEGORY_LABELS[c] ?? c)}</option>
              ))}
            </select>
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              inputMode="numeric"
              placeholder={t('سقف ماهانه (ریال)')}
              aria-label={t('سقف ماهانه (ریال)')}
              className="rounded-lg border bg-background/60 px-2 py-2 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <button
            onClick={() => void save()}
            disabled={busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : t('ذخیره‌سازی')}
          </button>
        </div>
      )}

      {statuses.length === 0 ? (
        <p className="px-1 text-xs leading-6 text-muted-foreground">
          {t('برای دسته‌های هزینه سقف ماهانه تعیین کن تا مصرفت را زیر نظر بگیری.')}
        </p>
      ) : (
        <div className="space-y-2.5">
          {totals && (
            <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-[10px]">
              <span className="text-muted-foreground">
                {t('جمع سقف')}: <span className="font-bold text-foreground">{money(totals.totalLimit, lang, currency)}</span>
              </span>
              <span className={cn('font-bold', totals.overCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300')}>
                {money(totals.totalSpent, lang, currency)}
                {totals.overCount > 0 ? ` · ${formatNum(totals.overCount, lang)} ${t('سقف عبور کرده')}` : ''}
              </span>
            </div>
          )}
          {statuses.map((s) => {
            const pct = Math.min(100, Math.round(s.ratio * 100))
            return (
              <div key={s.category} className="group flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{t(CATEGORY_LABELS[s.category] ?? s.category)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary" style={{ direction: 'ltr' }}>
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      s.over ? 'bg-rose-500/80' : s.warn ? 'bg-amber-500/80' : 'bg-emerald-500/70',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={cn(
                  'w-28 shrink-0 text-end text-[10px] tabular-nums',
                  s.over ? 'font-bold text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                )}>
                  {money(s.spent, lang, currency)} / {money(s.limit, lang, currency)}
                </span>
                <button
                  onClick={() => void remove(s.category)}
                  aria-label={`${t('حذف')} ${t(CATEGORY_LABELS[s.category] ?? s.category)}`}
                  className="ara-press rounded-lg p-1 text-muted-foreground/50 opacity-0 transition-all hover:text-rose-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ── فرم حساب جدید ──
function AddAccount({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [kind, setKind] = useState('cash')
  const [opening, setOpening] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl bg-secondary/40 p-3 sm:grid-cols-4">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('نام حساب')}
        maxLength={60}
        className="rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        aria-label={t('دسته‌بندی')}
        className="rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none"
      >
        <option value="cash">{t('نقدی')}</option>
        <option value="bank">{t('بانکی')}</option>
        <option value="card">{t('کارت')}</option>
      </select>
      <input
        value={opening}
        onChange={(e) => setOpening(e.target.value)}
        inputMode="numeric"
        dir="ltr"
        placeholder={t('مبلغ') + ' (0)'}
        className="rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      <button
        disabled={busy || name.trim().length < 2}
        onClick={async () => {
          setBusy(true)
          try {
            const res = await fetch('/api/finance/accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, kind, openingAmount: Number(opening) || 0 }),
            })
            if (!res.ok) throw new Error()
            toast.success(t('ذخیره شد'))
            onDone()
          } catch {
            toast.error(t('ثبت ناموفق بود'))
          } finally {
            setBusy(false)
          }
        }}
        className="flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {t('ثبت')}
      </button>
    </div>
  )
}

// ── فرم تراکنش جدید ──
function AddTransaction({ accounts, onClose, onDone }: { accounts: AccountT[]; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const [type, setType] = useState<FinanceType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [category, setCategory] = useState('food')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!accountId && accounts[0]) setAccountId(accounts[0].id)
    if (!toAccountId && accounts[1]) setToAccountId(accounts[1].id)
  }, [accounts, accountId, toAccountId])

  const cats = categoriesForType(type)

  return (
    <div className="mb-4 space-y-2 rounded-xl bg-secondary/40 p-3">
      <div className="flex gap-1.5">
        {(['expense', 'income', 'transfer'] as FinanceType[]).map((tp) => (
          <button
            key={tp}
            onClick={() => { setType(tp); setCategory(categoriesForType(tp)[0]) }}
            className={cn(
              'ara-press flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
              type === tp ? 'bg-primary text-primary-foreground' : 'bg-background/60 text-muted-foreground',
            )}
          >
            {t(tp === 'expense' ? 'هزینه' : tp === 'income' ? 'درآمد' : 'انتقال')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          dir="ltr"
          placeholder={t('مبلغ')}
          className="rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label={t('از')} className="rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {type === 'transfer' && (
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} aria-label={t('به')} className="rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none">
            {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {type !== 'transfer' && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('دسته‌بندی')} className="rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none">
            {cats.map((c) => <option key={c} value={c}>{t(CATEGORY_LABELS[c] ?? 'متفرقه')}</option>)}
          </select>
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('یادداشت')}
          maxLength={200}
          className="col-span-2 rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:col-span-1"
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy || !amount || !accountId}
          onClick={async () => {
            setBusy(true)
            try {
              const res = await fetch('/api/finance/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type, amount: Number(amount.replace(/[^\d]/g, '')),
                  accountId, toAccountId: type === 'transfer' ? toAccountId : null,
                  category, note, occurredAt: new Date().toISOString(),
                }),
              })
              if (!res.ok) throw new Error()
              toast.success(t('ثبت شد'))
              onDone()
            } catch {
              toast.error(t('ثبت ناموفق بود'))
            } finally {
              setBusy(false)
            }
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t('ثبت')}
        </button>
        <button onClick={onClose} className="rounded-lg border px-3 py-2 text-[11px] text-muted-foreground">
          {t('بستن')}
        </button>
      </div>
    </div>
  )
}

// ── ورود پیامک بانکی ──
function SmsImport({ accounts, onDone }: { accounts: AccountT[]; onDone: () => void }) {
  const { t, lang } = useI18n()
  const [text, setText] = useState('')
  const [consent, setConsent] = useState<boolean | null>(null)
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [preview, setPreview] = useState<SmsPreviewItem[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/settings/app')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setConsent(d?.smsConsent === true))
      .catch(() => setConsent(false))
  }, [])

  async function analyze(confirm: boolean) {
    setBusy(true)
    try {
      const res = await fetch('/api/sms/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, confirm, accountId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'خطا')
      if (!confirm) {
        setPreview(d.preview ?? [])
        toast.success(`${formatNum((d.preview ?? []).length, lang)} ${t('تراکنش‌ها')}`)
      } else {
        toast.success(t('ثبت شد'))
        onDone()
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'خطا' ? t(e.message) : t('عملیات ناموفق بود'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-4 space-y-2 rounded-xl bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold">{t('ورود پیامک بانکی')}</p>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-muted-foreground">
          <input
            type="checkbox"
            checked={consent ?? false}
            onChange={(e) => {
              const v = e.target.checked
              setConsent(v)
              fetch('/api/settings/app', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ smsConsent: v }),
              }).catch(() => {})
            }}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          {t('رضایت تحلیل پیامک')}
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t('متن پیامک بانک را اینجا بچسبان...')}
        className="w-full rounded-lg border bg-background/60 px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      {preview && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-background/40 p-2">
          {preview.map((p) => (
            <li key={p.index} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="font-bold">{p.bank}</span>
              <span className="flex-1 truncate text-muted-foreground">{p.raw.slice(0, 60)}</span>
              <span className={p.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                {p.type === 'income' ? '+' : '−'}{formatNum(p.amount.toLocaleString('en-US'), lang)}
              </span>
            </li>
          ))}
          {preview.length === 0 && <li className="py-2 text-center text-[10px] text-muted-foreground">{t('یافت نشد')}</li>}
        </ul>
      )}
      <div className="flex gap-2">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label={t('حساب‌ها')} className="flex-1 rounded-lg border bg-background/60 px-2 py-2 text-xs outline-none">
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button
          disabled={busy || text.trim().length < 10}
          onClick={() => analyze(false)}
          className="rounded-lg border px-3 py-2 text-[11px] font-medium disabled:opacity-50"
        >
          {busy ? '…' : t('تحلیل')}
        </button>
        <button
          disabled={busy || !consent || !preview || preview.length === 0 || !accountId}
          onClick={() => analyze(true)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
        >
          <Download className="h-3 w-3" />
          {t('ثبت')}
        </button>
      </div>
    </div>
  )
}

// ── منوی خروجی ──
function ExportMenu() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('خروجی گرفتن')}
        aria-expanded={open}
        className="glass-chip ara-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Download className="h-3 w-3" />
        {t('خروجی گرفتن')}
      </button>
      {open && (
        <div className="glass-overlay absolute end-0 top-8 z-20 w-36 space-y-0.5 rounded-xl p-1.5 shadow-lg" style={{ direction: 'ltr' }}>
          {(['csv', 'xls', 'json', 'txt'] as const).map((f) => (
            <a
              key={f}
              href={`/api/finance/export?format=${f}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2.5 py-1.5 text-[11px] font-medium uppercase transition-colors hover:bg-secondary"
            >
              {f}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
