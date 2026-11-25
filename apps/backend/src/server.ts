// ─── RahyAr Mission 3 — Shared Runnable Backend (SQLite WAL + REST API for Prototypes B, C, A) ──
import { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'
import {
  formatCalendarCell,
  gregorianToJalali,
  mergeTaskPerField,
  nextHlc,
  nextOccurrenceUtc,
  type RahyarTask,
  type RahyarReminder,
} from '../../../packages/rahyar-core/src/calendar'
import {
  assertSafeMinorAmount,
  buildPeriodReport,
  computeAccountBalanceMinor,
  computeTxDedupHash,
  createEncryptedBackup,
  exportTransactionsToCsv,
  parseFinanceCsvPreview,
  restoreEncryptedBackup,
  type BackupEnvelopeV1,
  type CurrencyCode,
  type FinanceAccount,
  type FinanceTransaction,
  type PendingFinanceDraft,
  type TxKind,
} from '../../../packages/rahyar-core/src/finance'
import {
  evaluateAgentPolicy,
  parsePersianCommandToProposal,
  type AgentPolicyState,
  type AuditEntry,
  type ToolProposal,
} from '../../../packages/rahyar-core/src/agent'

export function createRahyarBackend(dbPath = ':memory:') {
  const db = new Database(dbPath)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')

  // Migration 001: Shared Foundation + Prototype B + Prototype C + Prototype A tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'todo',
      category TEXT NOT NULL DEFAULT 'personal',
      due_at_utc TEXT,
      iana_timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      recurrence TEXT NOT NULL DEFAULT 'none',
      version INTEGER NOT NULL DEFAULT 1,
      hlc_updated_at TEXT NOT NULL,
      field_hlcs_json TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT,
      title TEXT NOT NULL,
      trigger_at_utc TEXT NOT NULL,
      iana_timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      recurrence TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'scheduled',
      snoozed_until_utc TEXT,
      hlc_updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      opening_balance_minor INTEGER NOT NULL,
      created_at_utc TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      kind TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      occurred_at_utc TEXT NOT NULL,
      source TEXT NOT NULL,
      dedup_hash TEXT NOT NULL,
      confirmed_by_user INTEGER NOT NULL DEFAULT 1,
      created_at_utc TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS finance_drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL,
      occurred_at_utc TEXT NOT NULL,
      source TEXT NOT NULL,
      dedup_hash TEXT NOT NULL,
      is_duplicate INTEGER NOT NULL DEFAULT 0,
      review_status TEXT NOT NULL DEFAULT 'needs_review'
    );
    CREATE TABLE IF NOT EXISTS agent_proposals (
      proposal_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at_utc TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_policies (
      user_id TEXT PRIMARY KEY,
      user_kill_switch INTEGER NOT NULL DEFAULT 0,
      global_kill_switch INTEGER NOT NULL DEFAULT 0,
      paid_fallback_enabled INTEGER NOT NULL DEFAULT 0,
      daily_hard_cap_micro_usd INTEGER NOT NULL DEFAULT 200000,
      daily_spent_micro_usd INTEGER NOT NULL DEFAULT 0,
      allowed_tools_json TEXT NOT NULL DEFAULT '"*"'
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id TEXT PRIMARY KEY,
      timestamp_utc TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      risk_tier TEXT NOT NULL,
      decision TEXT NOT NULL,
      provider_tier TEXT NOT NULL,
      cost_micro_usd INTEGER NOT NULL,
      detail TEXT NOT NULL
    );
  `)

  function rowToTask(r: Record<string, unknown>): RahyarTask {
    return {
      id: String(r.id),
      userId: String(r.user_id),
      title: String(r.title),
      notes: String(r.notes),
      priority: Number(r.priority) as 1 | 2 | 3 | 4,
      status: String(r.status) as 'todo' | 'done',
      category: String(r.category),
      dueAtUtc: r.due_at_utc ? String(r.due_at_utc) : null,
      ianaTimezone: String(r.iana_timezone),
      recurrence: String(r.recurrence) as RahyarTask['recurrence'],
      version: Number(r.version),
      hlcUpdatedAt: String(r.hlc_updated_at),
      fieldHlcs: JSON.parse(String(r.field_hlcs_json || '{}')),
      deletedAt: r.deleted_at ? String(r.deleted_at) : null,
    }
  }

  function upsertTask(t: RahyarTask): RahyarTask {
    const existingRow = db.query('SELECT * FROM tasks WHERE id = ?').get(t.id) as Record<string, unknown> | null
    const finalTask = existingRow ? mergeTaskPerField(rowToTask(existingRow), t) : t
    db.query(`
      INSERT OR REPLACE INTO tasks
      (id, user_id, title, notes, priority, status, category, due_at_utc, iana_timezone, recurrence, version, hlc_updated_at, field_hlcs_json, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      finalTask.id, finalTask.userId, finalTask.title, finalTask.notes, finalTask.priority,
      finalTask.status, finalTask.category, finalTask.dueAtUtc, finalTask.ianaTimezone,
      finalTask.recurrence, finalTask.version, finalTask.hlcUpdatedAt,
      JSON.stringify(finalTask.fieldHlcs), finalTask.deletedAt,
    )
    return finalTask
  }

  function getPolicy(userId: string): AgentPolicyState {
    const row = db.query('SELECT * FROM agent_policies WHERE user_id = ?').get(userId) as Record<string, unknown> | null
    if (!row) {
      return {
        userId,
        userKillSwitch: false,
        globalKillSwitch: false,
        paidFallbackEnabled: false,
        dailyHardCapMicroUsd: 200_000,
        dailySpentMicroUsd: 0,
        allowedTools: '*',
      }
    }
    return {
      userId,
      userKillSwitch: Boolean(row.user_kill_switch),
      globalKillSwitch: Boolean(row.global_kill_switch),
      paidFallbackEnabled: Boolean(row.paid_fallback_enabled),
      dailyHardCapMicroUsd: Number(row.daily_hard_cap_micro_usd),
      dailySpentMicroUsd: Number(row.daily_spent_micro_usd),
      allowedTools: JSON.parse(String(row.allowed_tools_json)),
    }
  }

  function savePolicy(p: AgentPolicyState): void {
    db.query(`
      INSERT OR REPLACE INTO agent_policies
      (user_id, user_kill_switch, global_kill_switch, paid_fallback_enabled, daily_hard_cap_micro_usd, daily_spent_micro_usd, allowed_tools_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      p.userId, p.userKillSwitch ? 1 : 0, p.globalKillSwitch ? 1 : 0,
      p.paidFallbackEnabled ? 1 : 0, p.dailyHardCapMicroUsd, p.dailySpentMicroUsd,
      JSON.stringify(p.allowedTools),
    )
  }

  function writeAudit(entry: Omit<AuditEntry, 'auditId' | 'timestampUtc'>): AuditEntry {
    const full: AuditEntry = {
      auditId: `aud_${randomUUID().slice(0, 12)}`,
      timestampUtc: new Date().toISOString(),
      ...entry,
    }
    db.query(`
      INSERT INTO audit_logs
      (audit_id, timestamp_utc, user_id, action, tool_name, risk_tier, decision, provider_tier, cost_micro_usd, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.auditId, full.timestampUtc, full.userId, full.action, full.toolName,
      full.riskTier, full.decision, full.providerTier, full.costMicroUsd, full.detail,
    )
    return full
  }

  function listAccounts(userId: string): FinanceAccount[] {
    const rows = db.query('SELECT * FROM finance_accounts WHERE user_id = ?').all(userId) as Record<string, unknown>[]
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      name: String(r.name),
      currency: String(r.currency) as CurrencyCode,
      openingBalanceMinor: Number(r.opening_balance_minor),
      createdAtUtc: String(r.created_at_utc),
    }))
  }

  function listTransactions(userId: string): FinanceTransaction[] {
    const rows = db.query('SELECT * FROM finance_transactions WHERE user_id = ? ORDER BY occurred_at_utc DESC').all(userId) as Record<string, unknown>[]
    return rows.map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      accountId: String(r.account_id),
      toAccountId: r.to_account_id ? String(r.to_account_id) : null,
      kind: String(r.kind) as TxKind,
      amountMinor: Number(r.amount_minor),
      currency: String(r.currency) as CurrencyCode,
      category: String(r.category),
      note: String(r.note),
      occurredAtUtc: String(r.occurred_at_utc),
      source: String(r.source) as FinanceTransaction['source'],
      dedupHash: String(r.dedup_hash),
      confirmedByUser: Boolean(r.confirmed_by_user),
      createdAtUtc: String(r.created_at_utc),
    }))
  }

  function insertConfirmedTx(tx: FinanceTransaction): FinanceTransaction {
    assertSafeMinorAmount(tx.amountMinor)
    db.query(`
      INSERT INTO finance_transactions
      (id, user_id, account_id, to_account_id, kind, amount_minor, currency, category, note, occurred_at_utc, source, dedup_hash, confirmed_by_user, created_at_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      tx.id, tx.userId, tx.accountId, tx.toAccountId, tx.kind, tx.amountMinor,
      tx.currency, tx.category, tx.note, tx.occurredAtUtc, tx.source, tx.dedupHash, tx.createdAtUtc,
    )
    return tx
  }

  function executeTool(userId: string, proposal: ToolProposal): Record<string, unknown> {
    if (proposal.toolName === 'tasks.create') {
      const hlc = nextHlc('backend')
      const t = upsertTask({
        id: `tsk_${randomUUID().slice(0, 8)}`,
        userId,
        title: String(proposal.args.title ?? 'وظیفه جدید'),
        notes: String(proposal.args.notes ?? ''),
        priority: (Number(proposal.args.priority ?? 2) as 1 | 2 | 3 | 4),
        status: 'todo',
        category: String(proposal.args.category ?? 'personal'),
        dueAtUtc: proposal.args.dueAtUtc ? String(proposal.args.dueAtUtc) : null,
        ianaTimezone: 'Asia/Tehran',
        recurrence: 'none',
        version: 1,
        hlcUpdatedAt: hlc,
        fieldHlcs: { title: hlc, status: hlc, notes: hlc, priority: hlc },
        deletedAt: null,
      })
      return { createdTask: t }
    }
    if (proposal.toolName === 'tasks.list_overdue') {
      const now = new Date().toISOString()
      const rows = db.query("SELECT * FROM tasks WHERE user_id = ? AND status = 'todo' AND deleted_at IS NULL AND due_at_utc IS NOT NULL AND due_at_utc < ?").all(userId, now) as Record<string, unknown>[]
      return { overdueTasks: rows.map(rowToTask) }
    }
    if (proposal.toolName === 'reminders.create') {
      const id = `rem_${randomUUID().slice(0, 8)}`
      const hlc = nextHlc('backend')
      const rem: RahyarReminder = {
        id,
        userId,
        taskId: null,
        title: String(proposal.args.title ?? 'یادآور'),
        triggerAtUtc: String(proposal.args.triggerAtUtc ?? new Date(Date.now() + 3600_000).toISOString()),
        ianaTimezone: 'Asia/Tehran',
        recurrence: (String(proposal.args.recurrence ?? 'none') as RahyarReminder['recurrence']),
        status: 'scheduled',
        snoozedUntilUtc: null,
        hlcUpdatedAt: hlc,
        deletedAt: null,
      }
      db.query(`
        INSERT INTO reminders (id, user_id, task_id, title, trigger_at_utc, iana_timezone, recurrence, status, snoozed_until_utc, hlc_updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(rem.id, rem.userId, rem.taskId, rem.title, rem.triggerAtUtc, rem.ianaTimezone, rem.recurrence, rem.status, rem.snoozedUntilUtc, rem.hlcUpdatedAt, rem.deletedAt)
      return { createdReminder: rem }
    }
    if (proposal.toolName === 'calendar.propose_event') {
      return { calendarEventRecorded: { id: `evt_${randomUUID().slice(0, 8)}`, ...proposal.args } }
    }
    if (proposal.toolName === 'finance.draft_transaction') {
      const accounts = listAccounts(userId)
      const accId = String(proposal.args.accountId ?? accounts[0]?.id ?? 'acc_default')
      const amountMinor = Number(proposal.args.amountMinor ?? 1)
      const currency = String(proposal.args.currency ?? 'IRT') as CurrencyCode
      const kind = String(proposal.args.kind ?? 'expense') as TxKind
      const note = String(proposal.args.note ?? '')
      const occurredAtUtc = new Date().toISOString()
      const dedupHash = computeTxDedupHash({ accountId: accId, kind, amountMinor, currency, occurredAtUtc, note })
      const draft: PendingFinanceDraft = {
        id: `drf_${randomUUID().slice(0, 8)}`,
        userId,
        accountId: accId,
        kind,
        amountMinor,
        currency,
        category: String(proposal.args.category ?? 'general'),
        note,
        occurredAtUtc,
        source: 'agent_draft',
        dedupHash,
        isDuplicate: false,
        reviewStatus: 'needs_review',
      }
      db.query(`
        INSERT INTO finance_drafts (id, user_id, account_id, kind, amount_minor, currency, category, note, occurred_at_utc, source, dedup_hash, is_duplicate, review_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'needs_review')
      `).run(draft.id, draft.userId, draft.accountId, draft.kind, draft.amountMinor, draft.currency, draft.category, draft.note, draft.occurredAtUtc, draft.source, draft.dedupHash)
      return { createdFinanceDraft: draft }
    }
    if (proposal.toolName === 'finance.compare_month') {
      const txs = listTransactions(userId)
      const now = new Date()
      const fromUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const toUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()
      return { report: buildPeriodReport(txs, fromUtc, toUtc, 'IRT') }
    }
    return {}
  }

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-User-Id,X-Device-Id',
  }
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } })

  async function handleRequest(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    const url = new URL(req.url)
    const userId = req.headers.get('X-User-Id') || 'owner-demo'
    const deviceId = req.headers.get('X-Device-Id') || 'win-client'
    const p = url.pathname

    try {
      if (p === '/healthz') return json({ ok: true, service: 'rahyar-m3-backend', timestampUtc: new Date().toISOString() })

      // ── Prototype B: Calendar, Tasks, Reminders & Sync ──
      if (p === '/api/v1/calendar/month' && req.method === 'GET') {
        const gy = Number(url.searchParams.get('gy') || new Date().getUTCFullYear())
        const gm = Number(url.searchParams.get('gm') || new Date().getUTCMonth() + 1)
        const locale = (url.searchParams.get('locale') === 'en' ? 'en' : 'fa') as 'fa' | 'en'
        const daysInMonth = new Date(Date.UTC(gy, gm, 0)).getUTCDate()
        const cells = Array.from({ length: daysInMonth }, (_, i) => formatCalendarCell(gy, gm, i + 1, locale))
        return json({ gy, gm, locale, jalaliFirstDay: gregorianToJalali(gy, gm, 1), cells })
      }

      if (p === '/api/v1/tasks' && req.method === 'GET') {
        const rows = db.query('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL').all(userId) as Record<string, unknown>[]
        return json({ tasks: rows.map(rowToTask) })
      }

      if (p === '/api/v1/tasks' && req.method === 'POST') {
        const body = (await req.json()) as Partial<RahyarTask>
        const hlc = body.hlcUpdatedAt || nextHlc(deviceId)
        const task = upsertTask({
          id: body.id || `tsk_${randomUUID().slice(0, 8)}`,
          userId,
          title: String(body.title || '').trim(),
          notes: String(body.notes || ''),
          priority: (Number(body.priority || 2) as 1 | 2 | 3 | 4),
          status: (body.status === 'done' ? 'done' : 'todo'),
          category: String(body.category || 'personal'),
          dueAtUtc: body.dueAtUtc ?? null,
          ianaTimezone: String(body.ianaTimezone || 'Asia/Tehran'),
          recurrence: (body.recurrence || 'none') as RahyarTask['recurrence'],
          version: Number(body.version || 1),
          hlcUpdatedAt: hlc,
          fieldHlcs: body.fieldHlcs || { title: hlc, notes: hlc, status: hlc, priority: hlc, category: hlc, dueAtUtc: hlc },
          deletedAt: body.deletedAt ?? null,
        })
        return json({ task }, 201)
      }

      if (p === '/api/v1/sync/push' && req.method === 'POST') {
        const body = (await req.json()) as { tasks?: RahyarTask[] }
        const merged = (body.tasks || []).map((t) => upsertTask({ ...t, userId }))
        return json({ ok: true, mergedCount: merged.length, tasks: merged })
      }

      if (p === '/api/v1/reminders' && req.method === 'GET') {
        const rows = db.query('SELECT * FROM reminders WHERE user_id = ? AND deleted_at IS NULL').all(userId) as Record<string, unknown>[]
        return json({ reminders: rows })
      }

      if (p === '/api/v1/reminders' && req.method === 'POST') {
        const body = (await req.json()) as Partial<RahyarReminder>
        const id = body.id || `rem_${randomUUID().slice(0, 8)}`
        const hlc = nextHlc(deviceId)
        db.query(`
          INSERT OR REPLACE INTO reminders (id, user_id, task_id, title, trigger_at_utc, iana_timezone, recurrence, status, snoozed_until_utc, hlc_updated_at, deleted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', NULL, ?, NULL)
        `).run(id, userId, body.taskId ?? null, String(body.title || 'یادآور'), String(body.triggerAtUtc), String(body.ianaTimezone || 'Asia/Tehran'), String(body.recurrence || 'none'), hlc)
        return json({ id, status: 'scheduled', nextRecurrenceUtc: nextOccurrenceUtc(String(body.triggerAtUtc), (body.recurrence || 'none') as RahyarReminder['recurrence']) }, 201)
      }

      // ── Prototype C: Personal Finance ──
      if (p === '/api/v1/finance/accounts' && req.method === 'GET') {
        const accounts = listAccounts(userId)
        const txs = listTransactions(userId)
        return json({
          accounts: accounts.map((a) => ({ ...a, balanceMinor: computeAccountBalanceMinor(a, txs) })),
        })
      }

      if (p === '/api/v1/finance/accounts' && req.method === 'POST') {
        const body = (await req.json()) as { name: string; currency?: CurrencyCode; openingBalanceMinor?: number }
        const id = `acc_${randomUUID().slice(0, 8)}`
        const opening = Number(body.openingBalanceMinor ?? 0)
        if (!Number.isSafeInteger(opening)) return json({ error: 'openingBalanceMinor must be integer' }, 400)
        const acc: FinanceAccount = {
          id,
          userId,
          name: String(body.name || 'حساب جدید'),
          currency: (body.currency || 'IRT') as CurrencyCode,
          openingBalanceMinor: opening,
          createdAtUtc: new Date().toISOString(),
        }
        db.query('INSERT INTO finance_accounts VALUES (?, ?, ?, ?, ?, ?)').run(acc.id, acc.userId, acc.name, acc.currency, acc.openingBalanceMinor, acc.createdAtUtc)
        return json({ account: acc }, 201)
      }

      if (p === '/api/v1/finance/transactions' && req.method === 'POST') {
        const body = (await req.json()) as Partial<FinanceTransaction>
        const amountMinor = Number(body.amountMinor)
        assertSafeMinorAmount(amountMinor)
        const occurredAtUtc = String(body.occurredAtUtc || new Date().toISOString())
        const kind = String(body.kind || 'expense') as TxKind
        const currency = String(body.currency || 'IRT') as CurrencyCode
        const accountId = String(body.accountId)
        const note = String(body.note || '')
        const tx = insertConfirmedTx({
          id: `tx_${randomUUID().slice(0, 8)}`,
          userId,
          accountId,
          toAccountId: body.toAccountId ? String(body.toAccountId) : null,
          kind,
          amountMinor,
          currency,
          category: String(body.category || 'general'),
          note,
          occurredAtUtc,
          source: 'manual',
          dedupHash: computeTxDedupHash({ accountId, kind, amountMinor, currency, occurredAtUtc, note }),
          confirmedByUser: true,
          createdAtUtc: new Date().toISOString(),
        })
        writeAudit({ userId, action: 'finance.tx_created', toolName: 'finance.manual', riskTier: 'L2_STATE_MUTATION', decision: 'approved', providerTier: 'tier0_deterministic', costMicroUsd: 0, detail: `${tx.kind}:${tx.amountMinor}${tx.currency}` })
        return json({ transaction: tx }, 201)
      }

      if (p === '/api/v1/finance/csv/preview' && req.method === 'POST') {
        const body = (await req.json()) as { csvText: string; accountId: string }
        const existingHashes = new Set(listTransactions(userId).map((t) => t.dedupHash))
        const parsed = parseFinanceCsvPreview(String(body.csvText || ''), userId, String(body.accountId), existingHashes)
        for (const d of parsed.drafts) {
          db.query(`
            INSERT OR REPLACE INTO finance_drafts (id, user_id, account_id, kind, amount_minor, currency, category, note, occurred_at_utc, source, dedup_hash, is_duplicate, review_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review')
          `).run(d.id, d.userId, d.accountId, d.kind, d.amountMinor, d.currency, d.category, d.note, d.occurredAtUtc, d.source, d.dedupHash, d.isDuplicate ? 1 : 0)
        }
        return json(parsed)
      }

      if (p.startsWith('/api/v1/finance/drafts/') && p.endsWith('/approve') && req.method === 'POST') {
        const draftId = p.split('/')[5]
        const row = db.query("SELECT * FROM finance_drafts WHERE id = ? AND user_id = ? AND review_status = 'needs_review'").get(draftId, userId) as Record<string, unknown> | null
        if (!row) return json({ error: 'Draft not found or already reviewed' }, 404)
        const tx = insertConfirmedTx({
          id: `tx_${randomUUID().slice(0, 8)}`,
          userId,
          accountId: String(row.account_id),
          toAccountId: null,
          kind: String(row.kind) as TxKind,
          amountMinor: Number(row.amount_minor),
          currency: String(row.currency) as CurrencyCode,
          category: String(row.category),
          note: String(row.note),
          occurredAtUtc: String(row.occurred_at_utc),
          source: String(row.source) as FinanceTransaction['source'],
          dedupHash: String(row.dedup_hash),
          confirmedByUser: true,
          createdAtUtc: new Date().toISOString(),
        })
        db.query("UPDATE finance_drafts SET review_status = 'approved' WHERE id = ?").run(draftId)
        writeAudit({ userId, action: 'finance.draft_approved', toolName: 'finance.draft_approve', riskTier: 'L2_STATE_MUTATION', decision: 'approved', providerTier: 'tier0_deterministic', costMicroUsd: 0, detail: `draft=${draftId}->tx=${tx.id}` })
        return json({ approved: true, transaction: tx })
      }

      if (p === '/api/v1/finance/report' && req.method === 'GET') {
        const currency = (url.searchParams.get('currency') || 'IRT') as CurrencyCode
        const fromUtc = url.searchParams.get('fromUtc') || '2000-01-01T00:00:00.000Z'
        const toUtc = url.searchParams.get('toUtc') || '2099-12-31T23:59:59.999Z'
        const txs = listTransactions(userId)
        return json({ report: buildPeriodReport(txs, fromUtc, toUtc, currency), csvExport: exportTransactionsToCsv(txs) })
      }

      if (p === '/api/v1/finance/backup/export' && req.method === 'POST') {
        const body = (await req.json()) as { passphrase: string }
        const envelope = createEncryptedBackup({ accounts: listAccounts(userId), transactions: listTransactions(userId) }, String(body.passphrase || ''))
        return json({ envelope })
      }

      if (p === '/api/v1/finance/backup/restore' && req.method === 'POST') {
        const body = (await req.json()) as { envelope: BackupEnvelopeV1; passphrase: string }
        const restored = restoreEncryptedBackup<{ accounts: FinanceAccount[]; transactions: FinanceTransaction[] }>(body.envelope, String(body.passphrase || ''))
        return json({ ok: true, restoredAccounts: restored.accounts.length, restoredTransactions: restored.transactions.length })
      }

      // ── Prototype A: Persian AI Agent, Permission L0-L3, Kill-Switch & Audit ──
      if (p === '/api/v1/agent/policy' && req.method === 'POST') {
        const body = (await req.json()) as Partial<AgentPolicyState>
        const cur = getPolicy(userId)
        const updated = { ...cur, ...body, userId }
        savePolicy(updated)
        return json({ policy: updated })
      }

      if (p === '/api/v1/agent/propose' && req.method === 'POST') {
        const body = (await req.json()) as { command: string; providerTier?: ToolProposal['providerTierUsed']; simulatedCostMicroUsd?: number }
        const policy = getPolicy(userId)
        const proposal = parsePersianCommandToProposal(String(body.command || ''), userId)
        if (!proposal) return json({ error: 'Command not recognized as executable tool', code: 'NO_INTENT_MATCH' }, 422)
        if (body.providerTier) proposal.providerTierUsed = body.providerTier
        if (typeof body.simulatedCostMicroUsd === 'number') proposal.estimatedCostMicroUsd = body.simulatedCostMicroUsd

        const check = evaluateAgentPolicy(policy, proposal.toolName, proposal.providerTierUsed, proposal.estimatedCostMicroUsd)
        if (!check.allowed) {
          const decision = check.code === 'AI_KILL_SWITCH_ACTIVE' ? 'blocked_kill_switch' : check.code === 'TOOL_PERMISSION_DENIED' ? 'blocked_permission' : 'blocked_budget'
          writeAudit({ userId, action: 'agent.propose_blocked', toolName: proposal.toolName, riskTier: proposal.riskTier, decision, providerTier: proposal.providerTierUsed, costMicroUsd: 0, detail: check.code })
          return json({ ok: false, code: check.code, error: check.reason }, check.code === 'AI_KILL_SWITCH_ACTIVE' ? 423 : check.code === 'TOOL_PERMISSION_DENIED' ? 403 : 402)
        }

        // L0 / L1 auto-execute with AuditLog; L2 / L3 ALWAYS pause for explicit User Approval!
        if (!check.requiresApproval) {
          const result = executeTool(userId, proposal)
          writeAudit({ userId, action: 'agent.auto_executed', toolName: proposal.toolName, riskTier: check.riskTier, decision: 'auto_allowed', providerTier: proposal.providerTierUsed, costMicroUsd: proposal.estimatedCostMicroUsd, detail: proposal.proposalId })
          return json({ status: 'executed', proposal, result })
        }

        db.query('INSERT INTO agent_proposals VALUES (?, ?, ?, ?, ?)').run(proposal.proposalId, userId, JSON.stringify(proposal), 'pending', new Date().toISOString())
        return json({ status: 'awaiting_approval', proposal }, 202)
      }

      if (p === '/api/v1/agent/approve' && req.method === 'POST') {
        const body = (await req.json()) as { proposalId: string; decision: 'approved' | 'rejected' }
        const row = db.query("SELECT * FROM agent_proposals WHERE proposal_id = ? AND user_id = ? AND status = 'pending'").get(body.proposalId, userId) as Record<string, unknown> | null
        if (!row) return json({ error: 'Pending proposal not found' }, 404)
        const proposal = JSON.parse(String(row.payload_json)) as ToolProposal
        if (body.decision === 'rejected') {
          db.query("UPDATE agent_proposals SET status = 'rejected' WHERE proposal_id = ?").run(body.proposalId)
          writeAudit({ userId, action: 'agent.rejected', toolName: proposal.toolName, riskTier: proposal.riskTier, decision: 'rejected', providerTier: proposal.providerTierUsed, costMicroUsd: 0, detail: proposal.proposalId })
          return json({ status: 'rejected', proposalId: body.proposalId })
        }
        const policy = getPolicy(userId)
        const check = evaluateAgentPolicy(policy, proposal.toolName, proposal.providerTierUsed, proposal.estimatedCostMicroUsd)
        if (!check.allowed) return json({ ok: false, code: check.code, error: check.reason }, 423)
        const result = executeTool(userId, proposal)
        db.query("UPDATE agent_proposals SET status = 'approved' WHERE proposal_id = ?").run(body.proposalId)
        if (proposal.estimatedCostMicroUsd > 0) {
          savePolicy({ ...policy, dailySpentMicroUsd: policy.dailySpentMicroUsd + proposal.estimatedCostMicroUsd })
        }
        writeAudit({ userId, action: 'agent.approved_executed', toolName: proposal.toolName, riskTier: proposal.riskTier, decision: 'approved', providerTier: proposal.providerTierUsed, costMicroUsd: proposal.estimatedCostMicroUsd, detail: proposal.proposalId })
        return json({ status: 'executed', proposal, result })
      }

      if (p === '/api/v1/agent/audit' && req.method === 'GET') {
        const rows = db.query('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp_utc DESC LIMIT 100').all(userId)
        return json({ auditLogs: rows })
      }

      return json({ error: 'Not found', path: p }, 404)
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500)
    }
  }

  return {
    db,
    handleRequest,
    start(port = 0) {
      return Bun.serve({ port, fetch: handleRequest })
    },
    close() {
      db.close()
    },
  }
}

if (import.meta.main) {
  const port = Number(process.env.RAHYAR_PORT || 4310)
  const app = createRahyarBackend(process.env.RAHYAR_DB_PATH || './rahyar-m3-dev.sqlite')
  const server = app.start(port)
  console.log(`RahyAr Mission 3 Backend listening on http://127.0.0.1:${server.port}`)
}
