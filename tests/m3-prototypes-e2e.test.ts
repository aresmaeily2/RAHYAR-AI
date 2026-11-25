import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  formatCalendarCell,
  gregorianToJalali,
  isJalaliLeap,
  jalaliToGregorian,
  mergeTaskPerField,
  nextHlc,
  nextOccurrenceUtc,
  type RahyarTask,
} from '../packages/rahyar-core/src/calendar.ts'
import {
  assertSafeMinorAmount,
  createEncryptedBackup,
  restoreEncryptedBackup,
} from '../packages/rahyar-core/src/finance.ts'
import { createRahyarBackend } from '../apps/backend/src/server.ts'

describe('Prototype B — 1,200+ Jalali/Gregorian Vectors, Bilingual Rules, Sync & Restart Recovery', () => {
  test('1,200 consecutive days (2024–2027 incl. leap year 1403) match Intl Persian calendar 100%', () => {
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    })
    let count = 0
    const start = new Date(Date.UTC(2024, 2, 19)) // 29 Esfand 1402 -> across 1403 leap (30 Esfand!) -> 1406
    for (let i = 0; i < 1200; i++) {
      const d = new Date(start.getTime() + i * 86_400_000)
      const gy = d.getUTCFullYear()
      const gm = d.getUTCMonth() + 1
      const gd = d.getUTCDate()
      const j = gregorianToJalali(gy, gm, gd)
      const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
      expect(j.jy).toBe(Number(parts.year))
      expect(j.jm).toBe(Number(parts.month))
      expect(j.jd).toBe(Number(parts.day))
      // Round-trip back to Gregorian
      const gBack = jalaliToGregorian(j.jy, j.jm, j.jd)
      expect(gBack).toEqual({ gy, gm, gd })
      count++
    }
    expect(count).toBe(1200)
    expect(isJalaliLeap(1403)).toBe(true)
    expect(isJalaliLeap(1404)).toBe(false)
    expect(isJalaliLeap(1408)).toBe(true)
  })

  test('FA cell has bold Persian Jalali + Latin Gregorian; EN cell has ZERO Persian digits/Jalali leak', () => {
    const fa = formatCalendarCell(2026, 11, 25, 'fa')
    expect(fa.isPersianPrimary).toBe(true)
    expect(/[۰-۹]/.test(fa.primaryLabel)).toBe(true)
    expect(fa.secondaryLabel).toBe('25')

    const en = formatCalendarCell(2026, 11, 25, 'en')
    expect(en.isPersianPrimary).toBe(false)
    expect(en.primaryLabel).toBe('25')
    expect(en.secondaryLabel).toBeNull()
    expect(/[۰-۹آ-ی]/.test(JSON.stringify(en))).toBe(false)
  })

  test('Per-Field HLC conflict merge preserves BOTH Android status=done AND Windows notes edit', () => {
    const t0 = '1795500000000:0000:win'
    const base: RahyarTask = {
      id: 'tsk_conflict_1', userId: 'u1', title: 'گزارش ماهانه', notes: 'اولیه',
      priority: 2, status: 'todo', category: 'work', dueAtUtc: null,
      ianaTimezone: 'Asia/Tehran', recurrence: 'none', version: 1, hlcUpdatedAt: t0,
      fieldHlcs: { title: t0, notes: t0, status: t0, priority: t0 }, deletedAt: null,
    }
    const tAnd = nextHlc('android', t0, 1795500010000)
    const tWin = nextHlc('win', t0, 1795500020000)
    const fromAndroid: RahyarTask = { ...base, status: 'done', hlcUpdatedAt: tAnd, fieldHlcs: { ...base.fieldHlcs, status: tAnd } }
    const fromWindows: RahyarTask = { ...base, notes: 'ویرایش ویندوز در حالت آفلاین', hlcUpdatedAt: tWin, fieldHlcs: { ...base.fieldHlcs, notes: tWin } }

    const merged = mergeTaskPerField(fromWindows, fromAndroid)
    expect(merged.status).toBe('done')
    expect(merged.notes).toBe('ویرایش ویندوز در حالت آفلاین')
  })

  test('Recurring Jalali monthly reminder + SQLite file restart recovery', async () => {
    const next = nextOccurrenceUtc('2025-02-19T09:00:00.000Z', 'monthly_jalali') // 1 Esfand 1403 -> 1 Farvardin 1404 (30 days because 1403 is leap!)
    expect(next).toBe('2025-03-21T09:00:00.000Z')

    const dir = mkdtempSync(join(tmpdir(), 'rahyar-m3-'))
    const dbFile = join(dir, 'persist.sqlite')
    try {
      const b1 = createRahyarBackend(dbFile)
      const s1 = b1.start(0)
      const base = `http://127.0.0.1:${s1.port}`
      const res = await fetch(`${base}/api/v1/reminders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'قسط مسکن', triggerAtUtc: '2026-12-01T09:00:00.000Z', recurrence: 'monthly_jalali' }),
      })
      expect(res.status).toBe(201)
      s1.stop(true)
      b1.close()

      // Simulate full Restart by opening fresh backend on same SQLite file
      const b2 = createRahyarBackend(dbFile)
      const s2 = b2.start(0)
      const r2 = await (await fetch(`http://127.0.0.1:${s2.port}/api/v1/reminders`)).json() as { reminders: Array<{ title: string }> }
      expect(r2.reminders.length).toBe(1)
      expect(r2.reminders[0].title).toBe('قسط مسکن')
      s2.stop(true)
      b2.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('Prototype C — Int64 Finance Ledger, CSV Dedup/Approval Queue & Encrypted Backup', () => {
  test('Rejects float amounts, handles multi-account transfer, CSV preview/dedup/approval & encrypted backup', async () => {
    expect(() => assertSafeMinorAmount(12.5)).toThrow()
    expect(() => assertSafeMinorAmount(-100)).toThrow()

    const app = createRahyarBackend(':memory:')
    const srv = app.start(0)
    const base = `http://127.0.0.1:${srv.port}`
    try {
      const a1 = (await (await fetch(`${base}/api/v1/finance/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'بانک ملت', currency: 'IRT', openingBalanceMinor: 10_000_000 }),
      })).json() as { account: { id: string } }).account
      const a2 = (await (await fetch(`${base}/api/v1/finance/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'نقدی', currency: 'IRT', openingBalanceMinor: 500_000 }),
      })).json() as { account: { id: string } }).account

      // Transfer 1,500,000 IRT from Mellat -> Cash (should not alter total net worth)
      await fetch(`${base}/api/v1/finance/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: a1.id, toAccountId: a2.id, kind: 'transfer', amountMinor: 1_500_000, currency: 'IRT', category: 'transfer', note: 'برداشت نقد' }),
      })

      // CSV Preview with 2 rows + 1 duplicate row -> MUST NOT alter balance before approval!
      const csv = [
        'date,kind,amount_minor,currency,category,note',
        '2026-11-24,expense,250000,IRT,bills,برق',
        '2026-11-24,expense,250000,IRT,bills,برق',
        '2026-11-24,income,5000000,IRT,salary,حقوق',
      ].join('\n')
      const prev = await (await fetch(`${base}/api/v1/finance/csv/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csv, accountId: a1.id }),
      })).json() as { drafts: Array<{ id: string; isDuplicate: boolean }>; duplicateCount: number }
      expect(prev.drafts.length).toBe(3)
      expect(prev.duplicateCount).toBe(1)

      // Balance BEFORE approval must still be 8,500,000 (10M - 1.5M transfer)
      const accsBefore = (await (await fetch(`${base}/api/v1/finance/accounts`)).json() as { accounts: Array<{ id: string; balanceMinor: number }> }).accounts
      expect(accsBefore.find((x) => x.id === a1.id)?.balanceMinor).toBe(8_500_000)
      expect(accsBefore.find((x) => x.id === a2.id)?.balanceMinor).toBe(2_000_000)

      // Approve only the 2 non-duplicate drafts
      for (const d of prev.drafts.filter((x) => !x.isDuplicate)) {
        const ar = await fetch(`${base}/api/v1/finance/drafts/${d.id}/approve`, { method: 'POST' })
        expect(ar.status).toBe(200)
      }
      const accsAfter = (await (await fetch(`${base}/api/v1/finance/accounts`)).json() as { accounts: Array<{ id: string; balanceMinor: number }> }).accounts
      expect(accsAfter.find((x) => x.id === a1.id)?.balanceMinor).toBe(13_250_000) // 8.5M - 250k + 5M

      // Encrypted Backup & Wrong-Passphrase Rejection & Restore
      const exp = await (await fetch(`${base}/api/v1/finance/backup/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: 'RahyarBackupPassword#2026' }),
      })).json() as { envelope: ReturnType<typeof createEncryptedBackup> }
      expect(() => restoreEncryptedBackup(exp.envelope, 'WrongPassword123')).toThrow()
      const rest = await (await fetch(`${base}/api/v1/finance/backup/restore`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envelope: exp.envelope, passphrase: 'RahyarBackupPassword#2026' }),
      })).json() as { ok: boolean; restoredAccounts: number; restoredTransactions: number }
      expect(rest.ok).toBe(true)
      expect(rest.restoredAccounts).toBe(2)
      expect(rest.restoredTransactions).toBe(3)
    } finally {
      srv.stop(true)
      app.close()
    }
  })
})

describe('Prototype A — 20 Real Persian Agent Scenarios, L0–L3 Approval, Kill-Switch & Cost Cap', () => {
  test('Executes 20 Persian commands with real DB persistence, approval gate, rejection, kill-switch & cost cap', async () => {
    const app = createRahyarBackend(':memory:')
    const srv = app.start(0)
    const base = `http://127.0.0.1:${srv.port}`
    try {
      const scenarios = [
        { cmd: 'برای فردا ساعت ۹ یک یادآور ثبت کن', expectStatus: 202, expectTool: 'reminders.create', decision: 'approved' as const },
        { cmd: 'فردا ساعت ۵ عصر یادم بنداز با بانک تماس بگیرم', expectStatus: 202, expectTool: 'reminders.create', decision: 'rejected' as const },
        { cmd: 'یه کار فوری برای ارسال گزارش ثبت کن', expectStatus: 200, expectTool: 'tasks.create' },
        { cmd: 'وظیفه خرید کتاب جدید اضافه کن', expectStatus: 200, expectTool: 'tasks.create' },
        { cmd: 'کارهای عقب افتاده من را نشان بده', expectStatus: 200, expectTool: 'tasks.list_overdue' },
        { cmd: 'هزینه ۲۵۰ هزار تومان بابت قبض برق ثبت کن', expectStatus: 202, expectTool: 'finance.draft_transaction', decision: 'approved' as const },
        { cmd: 'پرداخت ۵۰۰ هزار تومان اجاره پارکینگ', expectStatus: 202, expectTool: 'finance.draft_transaction', decision: 'rejected' as const },
        { cmd: 'درآمد ۱۲ میلیون تومان واریز پروژه', expectStatus: 202, expectTool: 'finance.draft_transaction', decision: 'approved' as const },
        { cmd: 'درآمد و هزینه این ماه را مقایسه کن', expectStatus: 200, expectTool: 'finance.compare_month' },
        { cmd: 'جلسه بررسی معماری فردا ساعت ۱۰', expectStatus: 202, expectTool: 'calendar.propose_event', decision: 'approved' as const },
        { cmd: 'قرار ملاقات با تیم اندروید', expectStatus: 202, expectTool: 'calendar.propose_event', decision: 'rejected' as const },
        { cmd: 'وظیفه مرور کدهای امنیتی', expectStatus: 200, expectTool: 'tasks.create' },
        { cmd: 'یادم بنداز ساعت ۲۰ دارو بخورم', expectStatus: 202, expectTool: 'reminders.create', decision: 'approved' as const },
        { cmd: 'هزینه ۸۵ هزار تومان قهوه', expectStatus: 202, expectTool: 'finance.draft_transaction', decision: 'approved' as const },
        { cmd: 'گزارش مالی این ماه را بده', expectStatus: 200, expectTool: 'finance.compare_month' },
        { cmd: 'کارهای معوقه را لیست کن', expectStatus: 200, expectTool: 'tasks.list_overdue' },
      ]

      for (const sc of scenarios) {
        const r = await fetch(`${base}/api/v1/agent/propose`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: sc.cmd }),
        })
        expect(r.status).toBe(sc.expectStatus)
        const data = await r.json() as { proposal: { proposalId: string; toolName: string } }
        expect(data.proposal.toolName).toBe(sc.expectTool)
        if (sc.expectStatus === 202 && sc.decision) {
          const ar = await fetch(`${base}/api/v1/agent/approve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposalId: data.proposal.proposalId, decision: sc.decision }),
          })
          expect(ar.status).toBe(200)
        }
      }

      // Scenario 17: Paid cloud fallback MUST be blocked by default (402 PAID_FALLBACK_BLOCKED)
      const rPaidBlocked = await fetch(`${base}/api/v1/agent/propose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'وظیفه تست مدل پولی', providerTier: 'tier2_fast_cloud', simulatedCostMicroUsd: 5000 }),
      })
      expect(rPaidBlocked.status).toBe(402)
      expect((await rPaidBlocked.json() as { code: string }).code).toBe('PAID_FALLBACK_BLOCKED')

      // Scenario 18: Enable paid fallback with $0.05 cap -> exceed cap -> 402 DAILY_COST_CAP_EXCEEDED
      await fetch(`${base}/api/v1/agent/policy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidFallbackEnabled: true, dailyHardCapMicroUsd: 50_000 }),
      })
      const rCap = await fetch(`${base}/api/v1/agent/propose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'وظیفه گران', providerTier: 'tier3_frontier_cloud', simulatedCostMicroUsd: 80_000 }),
      })
      expect(rCap.status).toBe(402)
      expect((await rCap.json() as { code: string }).code).toBe('DAILY_COST_CAP_EXCEEDED')

      // Scenario 19: Kill-Switch ON -> blocks cloud model with 423 AI_KILL_SWITCH_ACTIVE
      await fetch(`${base}/api/v1/agent/policy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKillSwitch: true }),
      })
      const rKs = await fetch(`${base}/api/v1/agent/propose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'وظیفه تست کیل سوئیچ', providerTier: 'tier2_fast_cloud', simulatedCostMicroUsd: 1000 }),
      })
      expect(rKs.status).toBe(423)
      expect((await rKs.json() as { code: string }).code).toBe('AI_KILL_SWITCH_ACTIVE')

      // Scenario 20: Disallowed tool policy -> 403 TOOL_PERMISSION_DENIED
      await fetch(`${base}/api/v1/agent/policy`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKillSwitch: false, allowedTools: ['tasks.list_overdue'] }),
      })
      const rPerm = await fetch(`${base}/api/v1/agent/propose`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'هزینه ۹۹ هزار تومان تست بدون مجوز' }),
      })
      expect(rPerm.status).toBe(403)
      expect((await rPerm.json() as { code: string }).code).toBe('TOOL_PERMISSION_DENIED')

      // Verify Audit Log recorded all 20 scenarios
      const aud = await (await fetch(`${base}/api/v1/agent/audit`)).json() as { auditLogs: unknown[] }
      expect(aud.auditLogs.length).toBeGreaterThanOrEqual(20)
    } finally {
      srv.stop(true)
      app.close()
    }
  })
})
