// ─── RahyAr Core — Prototype C: Personal Finance (Strict Int64 Minor Units, CSV Dedup, Approval Queue & Encrypted Backup) ──
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'

export type CurrencyCode = 'IRR' | 'IRT' | 'USD' | 'EUR'
export type TxKind = 'income' | 'expense' | 'transfer'
export type ImportSource = 'manual' | 'csv' | 'share' | 'bank_file' | 'agent_draft'

export interface FinanceAccount {
  id: string
  userId: string
  name: string
  currency: CurrencyCode
  openingBalanceMinor: number // عدد صحیح در کوچک‌ترین واحد (صفر خطای float!)
  createdAtUtc: string
}

export interface FinanceTransaction {
  id: string
  userId: string
  accountId: string
  toAccountId: string | null
  kind: TxKind
  amountMinor: number // همیشه مثبت و عدد صحیح دقیق
  currency: CurrencyCode
  category: string
  note: string
  occurredAtUtc: string
  source: ImportSource
  dedupHash: string
  confirmedByUser: boolean
  createdAtUtc: string
}

export interface PendingFinanceDraft {
  id: string
  userId: string
  accountId: string
  kind: TxKind
  amountMinor: number
  currency: CurrencyCode
  category: string
  note: string
  occurredAtUtc: string
  source: ImportSource
  dedupHash: string
  isDuplicate: boolean
  reviewStatus: 'needs_review' | 'approved' | 'rejected'
}

export function assertSafeMinorAmount(amountMinor: number): void {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(`Invalid minor amount (must be positive safe integer, no floats): ${amountMinor}`)
  }
}

export function computeTxDedupHash(parts: {
  accountId: string
  kind: TxKind
  amountMinor: number
  currency: CurrencyCode
  occurredAtUtc: string
  note: string
}): string {
  const norm = [
    parts.accountId.trim().toLowerCase(),
    parts.kind,
    String(parts.amountMinor),
    parts.currency,
    parts.occurredAtUtc.slice(0, 10),
    parts.note.trim().toLowerCase().replace(/\s+/g, ' '),
  ].join('|')
  return createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 32)
}

/** محاسبه دقیق مانده هر حساب صرفاً با جمع اعداد صحیح (صفر خطای ممیز شناور) */
export function computeAccountBalanceMinor(
  account: FinanceAccount,
  confirmedTxs: FinanceTransaction[],
): number {
  let bal = account.openingBalanceMinor
  for (const tx of confirmedTxs) {
    if (!tx.confirmedByUser) continue
    if (tx.kind === 'income' && tx.accountId === account.id) bal += tx.amountMinor
    else if (tx.kind === 'expense' && tx.accountId === account.id) bal -= tx.amountMinor
    else if (tx.kind === 'transfer') {
      if (tx.accountId === account.id) bal -= tx.amountMinor
      if (tx.toAccountId === account.id) bal += tx.amountMinor
    }
  }
  return bal
}

export interface PeriodReport {
  fromUtc: string
  toUtc: string
  currency: CurrencyCode
  totalIncomeMinor: number
  totalExpenseMinor: number
  netMinor: number
  byCategory: Record<string, number>
  txCount: number
}

export function buildPeriodReport(
  confirmedTxs: FinanceTransaction[],
  fromUtc: string,
  toUtc: string,
  currency: CurrencyCode,
): PeriodReport {
  let totalIncomeMinor = 0
  let totalExpenseMinor = 0
  const byCategory: Record<string, number> = {}
  let txCount = 0
  for (const tx of confirmedTxs) {
    if (!tx.confirmedByUser || tx.currency !== currency) continue
    if (tx.occurredAtUtc < fromUtc || tx.occurredAtUtc > toUtc) continue
    if (tx.kind === 'income') {
      totalIncomeMinor += tx.amountMinor
      txCount++
    } else if (tx.kind === 'expense') {
      totalExpenseMinor += tx.amountMinor
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amountMinor
      txCount++
    }
  }
  return {
    fromUtc,
    toUtc,
    currency,
    totalIncomeMinor,
    totalExpenseMinor,
    netMinor: totalIncomeMinor - totalExpenseMinor,
    byCategory,
    txCount,
  }
}

/**
 * پارسر CSV بانکی (ستون‌ها: date,kind,amount_minor,currency,category,note)
 * هیچ تراکنشی مستقیم ثبت قطعی نمی‌شود؛ خروجی صرفاً پیش‌نمایش و صف needs_review با تشخیص تکراری است!
 */
export function parseFinanceCsvPreview(
  csvText: string,
  userId: string,
  defaultAccountId: string,
  existingHashes: Set<string>,
): { drafts: PendingFinanceDraft[]; errors: string[]; duplicateCount: number } {
  const lines = csvText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const drafts: PendingFinanceDraft[] = []
  const errors: string[] = []
  const seenInBatch = new Set<string>()
  let duplicateCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (i === 0 && /^date\s*,/i.test(line)) continue
    const cols = line.split(',').map((c) => c.trim())
    if (cols.length < 4) {
      errors.push(`Line ${i + 1}: expected at least 4 columns (date,kind,amount_minor,currency[,category,note])`)
      continue
    }
    const [dateStr, rawKind, rawAmount, rawCur, rawCat = 'other', ...noteParts] = cols
    const kind = rawKind.toLowerCase() as TxKind
    if (!['income', 'expense', 'transfer'].includes(kind)) {
      errors.push(`Line ${i + 1}: invalid kind "${rawKind}"`)
      continue
    }
    const amountMinor = Number(rawAmount.replace(/[,\s_]/g, ''))
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      errors.push(`Line ${i + 1}: invalid integer amount "${rawAmount}"`)
      continue
    }
    const currency = rawCur.toUpperCase() as CurrencyCode
    if (!['IRR', 'IRT', 'USD', 'EUR'].includes(currency)) {
      errors.push(`Line ${i + 1}: unsupported currency "${rawCur}"`)
      continue
    }
    const occurredAtUtc = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00.000Z`
    const note = noteParts.join(', ')
    const dedupHash = computeTxDedupHash({
      accountId: defaultAccountId,
      kind,
      amountMinor,
      currency,
      occurredAtUtc,
      note,
    })
    const isDuplicate = existingHashes.has(dedupHash) || seenInBatch.has(dedupHash)
    if (isDuplicate) duplicateCount++
    seenInBatch.add(dedupHash)

    drafts.push({
      id: `draft_${i}_${dedupHash.slice(0, 8)}`,
      userId,
      accountId: defaultAccountId,
      kind,
      amountMinor,
      currency,
      category: rawCat || 'other',
      note,
      occurredAtUtc,
      source: 'csv',
      dedupHash,
      isDuplicate,
      reviewStatus: 'needs_review',
    })
  }
  return { drafts, errors, duplicateCount }
}

/** خروجی استاندارد CSV */
export function exportTransactionsToCsv(txs: FinanceTransaction[]): string {
  const header = 'date,kind,amount_minor,currency,category,note,source'
  const rows = txs
    .filter((t) => t.confirmedByUser)
    .map((t) => [
      t.occurredAtUtc,
      t.kind,
      String(t.amountMinor),
      t.currency,
      t.category.replace(/,/g, ' '),
      t.note.replace(/,/g, ' '),
      t.source,
    ].join(','))
  return [header, ...rows].join('\n')
}

// ── Portable Encrypted Backup Archive v1 (.rahyar-backup.enc) ──
export interface BackupEnvelopeV1 {
  formatVersion: 1
  kdf: 'scrypt'
  saltB64: string
  cipher: 'aes-256-gcm'
  ivB64: string
  tagB64: string
  sha256Payload: string
  ciphertextB64: string
  createdAtUtc: string
}

export function createEncryptedBackup(payload: unknown, passphrase: string): BackupEnvelopeV1 {
  if (!passphrase || passphrase.length < 8) {
    throw new Error('Backup passphrase must be at least 8 characters')
  }
  const jsonBytes = Buffer.from(JSON.stringify(payload), 'utf8')
  const sha256Payload = createHash('sha256').update(jsonBytes).digest('hex')
  const salt = randomBytes(16)
  const key = scryptSync(passphrase, salt, 32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(jsonBytes), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    formatVersion: 1,
    kdf: 'scrypt',
    saltB64: salt.toString('base64'),
    cipher: 'aes-256-gcm',
    ivB64: iv.toString('base64'),
    tagB64: tag.toString('base64'),
    sha256Payload,
    ciphertextB64: ct.toString('base64'),
    createdAtUtc: new Date().toISOString(),
  }
}

export function restoreEncryptedBackup<T>(envelope: BackupEnvelopeV1, passphrase: string): T {
  if (envelope.formatVersion !== 1 || envelope.cipher !== 'aes-256-gcm') {
    throw new Error('Unsupported backup format')
  }
  const salt = Buffer.from(envelope.saltB64, 'base64')
  const key = scryptSync(passphrase, salt, 32)
  const iv = Buffer.from(envelope.ivB64, 'base64')
  const tag = Buffer.from(envelope.tagB64, 'base64')
  const ct = Buffer.from(envelope.ciphertextB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  const actualHash = createHash('sha256').update(plain).digest('hex')
  if (actualHash !== envelope.sha256Payload) {
    throw new Error('BACKUP_CORRUPTED_CHECKSUM')
  }
  return JSON.parse(plain.toString('utf8')) as T
}
