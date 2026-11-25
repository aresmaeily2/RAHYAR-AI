// ─── RahyAr Core — Prototype A: Persian AI Agent, L0–L3 Permission Governance, Cost Caps & Audit Log ──
import { toLatinDigits } from './calendar'

export type RiskTier = 'L0_READ' | 'L1_SAFE_LOCAL' | 'L2_STATE_MUTATION' | 'L3_EXTERNAL_DESTRUCTIVE'
export type ProviderTier = 'tier0_deterministic' | 'tier1_local_ollama' | 'tier2_fast_cloud' | 'tier3_frontier_cloud'

export interface ToolProposal {
  proposalId: string
  toolName:
    | 'tasks.create'
    | 'tasks.list_overdue'
    | 'reminders.create'
    | 'calendar.propose_event'
    | 'finance.draft_transaction'
    | 'finance.compare_month'
  riskTier: RiskTier
  requiresApproval: boolean
  humanSummaryFa: string
  humanSummaryEn: string
  args: Record<string, unknown>
  idempotencyKey: string
  providerTierUsed: ProviderTier
  estimatedCostMicroUsd: number
}

export interface AgentPolicyState {
  userId: string
  userKillSwitch: boolean
  globalKillSwitch: boolean
  paidFallbackEnabled: boolean // پیش‌فرض همیشه false!
  dailyHardCapMicroUsd: number // مثلاً 200_000 = $0.20
  dailySpentMicroUsd: number
  allowedTools: string[] | '*'
}

export interface AuditEntry {
  auditId: string
  timestampUtc: string
  userId: string
  action: string
  toolName: string
  riskTier: RiskTier
  decision: 'auto_allowed' | 'approved' | 'rejected' | 'blocked_kill_switch' | 'blocked_budget' | 'blocked_permission'
  providerTier: ProviderTier
  costMicroUsd: number
  detail: string
}

const TOOL_RISK_MAP: Record<ToolProposal['toolName'], RiskTier> = {
  'tasks.list_overdue': 'L0_READ',
  'finance.compare_month': 'L0_READ',
  'tasks.create': 'L1_SAFE_LOCAL',
  'reminders.create': 'L2_STATE_MUTATION',
  'calendar.propose_event': 'L2_STATE_MUTATION',
  'finance.draft_transaction': 'L2_STATE_MUTATION',
}

/**
 * بررسی سیاست مجوز، Kill-Switch و سقف هزینه پیش از هر اجرا (سرورمحور — غیرقابل دورزدن با Prompt!)
 */
export function evaluateAgentPolicy(
  policy: AgentPolicyState,
  toolName: ToolProposal['toolName'],
  providerTier: ProviderTier,
  estimatedCostMicroUsd: number,
): { allowed: true; riskTier: RiskTier; requiresApproval: boolean } | { allowed: false; code: string; reason: string } {
  if (policy.globalKillSwitch || policy.userKillSwitch) {
    if (providerTier !== 'tier0_deterministic') {
      return { allowed: false, code: 'AI_KILL_SWITCH_ACTIVE', reason: 'AI kill-switch is active' }
    }
  }
  if (policy.allowedTools !== '*' && !policy.allowedTools.includes(toolName)) {
    return { allowed: false, code: 'TOOL_PERMISSION_DENIED', reason: `Tool ${toolName} is disabled by user policy` }
  }
  const isPaid = providerTier === 'tier2_fast_cloud' || providerTier === 'tier3_frontier_cloud'
  if (isPaid && estimatedCostMicroUsd > 0) {
    if (!policy.paidFallbackEnabled) {
      return { allowed: false, code: 'PAID_FALLBACK_BLOCKED', reason: 'Paid AI fallback is disabled by default' }
    }
    if (policy.dailySpentMicroUsd + estimatedCostMicroUsd > policy.dailyHardCapMicroUsd) {
      return { allowed: false, code: 'DAILY_COST_CAP_EXCEEDED', reason: 'Daily AI cost cap exceeded' }
    }
  }
  const riskTier = TOOL_RISK_MAP[toolName]
  // هیچ اقدام L2/L3 هرگز بدون تأیید کاربر اجرا نمی‌شود
  const requiresApproval = riskTier === 'L2_STATE_MUTATION' || riskTier === 'L3_EXTERNAL_DESTRUCTIVE'
  return { allowed: true, riskTier, requiresApproval }
}

/**
 * تحلیل قطعی فرمان فارسی/انگلیسی (Tier 0 = $0، آفلاین، <5ms)
 * خروجی همیشه ToolProposal ساختاریافته است — هرگز مستقیم بدون Permission Gate اجرا نمی‌شود.
 */
export function parsePersianCommandToProposal(
  rawInput: string,
  userId: string,
  nowUtc = new Date(),
): ToolProposal | null {
  const clean = toLatinDigits(rawInput).trim()
  if (!clean) return null
  const lower = clean.toLowerCase()
  const idBase = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  // ۱) یادآور فارسی («برای فردا ساعت ۹ یک یادآور ثبت کن»)
  if (/یادآور|یادم بنداز|remind/i.test(clean)) {
    const hourMatch = clean.match(/ساعت\s*(\d{1,2})(?::(\d{2}))?|at\s*(\d{1,2})(?::(\d{2}))?/i)
    const h = Number(hourMatch?.[1] ?? hourMatch?.[3] ?? 9)
    const m = Number(hourMatch?.[2] ?? hourMatch?.[4] ?? 0)
    const target = new Date(nowUtc)
    if (/فردا|tomorrow/i.test(clean)) target.setUTCDate(target.getUTCDate() + 1)
    target.setUTCHours(h, m, 0, 0)
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'reminders.create',
      riskTier: 'L2_STATE_MUTATION',
      requiresApproval: true,
      humanSummaryFa: `ثبت یادآور «${clean}» برای ${target.toISOString()}`,
      humanSummaryEn: `Create reminder "${clean}" for ${target.toISOString()}`,
      args: { title: clean, triggerAtUtc: target.toISOString(), recurrence: 'none' },
      idempotencyKey: `idem_rem_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  // ۲) پیش‌نویس تراکنش مالی («هزینه ۲۵۰ هزار تومان ...»)
  if (/هزینه|خرج|پرداخت|واریز|درآمد|تومان|ریال|expense|income/i.test(clean) && !/مقایسه|گزارش|compare/i.test(clean)) {
    const numMatch = clean.match(/(\d[\d,\s]*)\s*(هزار|میلیون)?/)
    let amount = numMatch ? Number(numMatch[1].replace(/[,\s]/g, '')) : 0
    if (numMatch?.[2] === 'هزار') amount *= 1_000
    if (numMatch?.[2] === 'میلیون') amount *= 1_000_000
    const isIncome = /درآمد|واریز|income/i.test(clean)
    const currency = /ریال|irr/i.test(clean) ? 'IRR' : 'IRT'
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'finance.draft_transaction',
      riskTier: 'L2_STATE_MUTATION',
      requiresApproval: true,
      humanSummaryFa: `ایجاد پیش‌نویس ${isIncome ? 'درآمد' : 'هزینه'} به مبلغ ${amount.toLocaleString('en-US')} ${currency} (نیازمند تأیید قطعی)`,
      humanSummaryEn: `Draft ${isIncome ? 'income' : 'expense'} of ${amount} ${currency} (requires explicit approval)`,
      args: { kind: isIncome ? 'income' : 'expense', amountMinor: Math.max(1, amount), currency, note: clean, category: 'general' },
      idempotencyKey: `idem_fin_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  // ۳) مقایسه درآمد و هزینه ماه
  if (/مقایسه|گزارش مالی|درآمد و هزینه|compare/i.test(clean)) {
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'finance.compare_month',
      riskTier: 'L0_READ',
      requiresApproval: false,
      humanSummaryFa: 'گزارش مقایسه درآمد و هزینه ماه جاری',
      humanSummaryEn: 'Compare current month income and expenses',
      args: { userId },
      idempotencyKey: `idem_rep_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  // ۴) نمایش کارهای عقب‌افتاده
  if (/عقب|overdue|معوق/i.test(clean)) {
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'tasks.list_overdue',
      riskTier: 'L0_READ',
      requiresApproval: false,
      humanSummaryFa: 'نمایش فهرست وظایف عقب‌افتاده',
      humanSummaryEn: 'List overdue tasks',
      args: { userId },
      idempotencyKey: `idem_ovd_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  // ۵) پیشنهاد رویداد تقویمی («جلسه ...»)
  if (/جلسه|رویداد|قرار|meeting|event/i.test(clean)) {
    const start = new Date(nowUtc)
    if (/فردا|tomorrow/i.test(clean)) start.setUTCDate(start.getUTCDate() + 1)
    start.setUTCHours(10, 0, 0, 0)
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'calendar.propose_event',
      riskTier: 'L2_STATE_MUTATION',
      requiresApproval: true,
      humanSummaryFa: `پیشنهاد ثبت رویداد «${clean}» در تقویم`,
      humanSummaryEn: `Propose calendar event "${clean}"`,
      args: { title: clean, startUtc: start.toISOString(), durationMin: 60 },
      idempotencyKey: `idem_evt_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  // ۶) ایجاد وظیفه
  if (/وظیفه|کار|تسک|انجام|ثبت|task|todo/i.test(lower)) {
    return {
      proposalId: `prop_${idBase}`,
      toolName: 'tasks.create',
      riskTier: 'L1_SAFE_LOCAL',
      requiresApproval: false,
      humanSummaryFa: `ایجاد وظیفه «${clean}»`,
      humanSummaryEn: `Create task "${clean}"`,
      args: { title: clean, priority: /فوری|مهم|urgent/i.test(clean) ? 1 : 2, category: 'personal' },
      idempotencyKey: `idem_tsk_${idBase}`,
      providerTierUsed: 'tier0_deterministic',
      estimatedCostMicroUsd: 0,
    }
  }

  return null
}
