// ─── ماشین-وضعیت تأیید عملیات حساس (F2-AG — مأموریت تکمیلی §۳ سناریو ۹) ──
// عملیات مخرب با ارجاع متنی (fuzzy) هرگز بی‌درنگ اجرا نمی‌شوند: ابتدا در
// Setting کاربر «پندینگ» می‌شوند، چیپ تأیید در UI دیده می‌شود و فقط با
// «بله/تأیید» اجرا یا با «انصراف/لغو» باطل می‌گردند. TTL ۱۵ دقیقه.
import { db } from '@/lib/db'

export interface PendingOp {
  type: 'delete_task' | 'forget' | 'add_expense'
  taskId?: string
  title?: string
  factContains?: string
  // F7 — ثبت مالی تأییددار:
  dir?: 'expense' | 'income'
  amount?: number
  note?: string
  accountId?: string | null // null = هنوز انتخاب نشده (چند حسابی → با نام حساب در متن تأیید)
  savedAt: string
}

const KEY = 'pending_action'
const TTL_MS = 15 * 60_000

/** رزرو عملیات در انتظار تأیید — فقط آخرین عملیات نگه داشته می‌شود */
export async function setPendingAction(userId: string, op: Omit<PendingOp, 'savedAt'>): Promise<void> {
  const value = JSON.stringify({ ...op, savedAt: new Date().toISOString() } satisfies PendingOp)
  await db.setting.upsert({
    where: { userId_key: { userId, key: KEY } },
    create: { userId, key: KEY, value },
    update: { value },
  })
}

/** خواندن عملیات در انتظار — منقضی (۱۵ دقیقه) پاک و null برمی‌گردد */
export async function getPendingAction(userId: string): Promise<PendingOp | null> {
  const row = await db.setting.findUnique({ where: { userId_key: { userId, key: KEY } } })
  if (!row) return null
  try {
    const op = JSON.parse(row.value) as PendingOp
    if (!op?.type || !op?.savedAt) throw new Error('bad shape')
    if (Date.now() - new Date(op.savedAt).getTime() > TTL_MS) {
      await clearPendingAction(userId)
      return null
    }
    return op
  } catch {
    await clearPendingAction(userId)
    return null
  }
}

export async function clearPendingAction(userId: string): Promise<void> {
  await db.setting.deleteMany({ where: { userId, key: KEY } })
}

// نکته: \b در یونیکد فارسی کار نمی‌کند — مرز با lookahead بسته می‌شود (درس F-AG2)
export const CONFIRM_RE =
  /^\s*(بله|بلی|بله\s*حذفش\s*کن|تأیید|تایید|تایید\s*می\s*کنم|تأیید\s*می\s*کنم|حتماً|حتما|yes|confirm|do\s*it)(?=\s|$|[!.,،؟?:؛])/i
export const CANCEL_RE =
  /^\s*(انصراف|لغو|نه\s*لزومی|نه|نظریم\s*عوض\s*شد|بی\s*خیال|cancel|nevermind|never\s*mind)(?=\s|$|[!.,،؟?:؛])/i

/** اجرای عملیات تأییدشده — فقط روی ردیف واقعی DB، با لاگ */
export async function executePendingAction(
  userId: string,
  op: PendingOp,
): Promise<{ ok: boolean; fa: string; en: string }> {
  if (op.type === 'add_expense') {
    // F7: نوشتن مالی فقط اینجا و فقط بعد از تأیید صریح — همان سرویس UI/SMS
    const { createTransaction, FinanceValidationError } = await import('@/lib/finance/server')
    let accountId = op.accountId ?? null
    if (!accountId) {
      const acc = await firstAccount(userId)
      accountId = acc?.id ?? null
    }
    if (!accountId) {
      return {
        ok: false,
        fa: 'حساب مالی پیدا نشد — اول در صفحهٔ مالی یک حساب بساز، بعد دوباره امتحان کن.',
        en: 'No finance account found — create one on the finance page first.',
      }
    }
    const amount = Math.round(Number(op.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, fa: 'مبلغ ثبت‌شده معتبر نبود.', en: 'The pending amount was invalid.' }
    }
    try {
      const tx = await createTransaction(userId, {
        type: op.dir === 'income' ? 'income' : 'expense',
        amount,
        accountId,
        category: 'other',
        note: op.note ?? null,
        source: 'agent',
        externalRef: null,
      })
      const fa = op.dir === 'income' ? 'درآمد' : 'هزینه'
      const en = op.dir === 'income' ? 'income' : 'expense'
      const amt = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return {
        ok: true,
        fa: `انجام شد — ${amt} تومان ${fa} ثبت شد${op.note ? ` (${op.note.slice(0, 60)})` : ''}.`,
        en: `Done — ${amt} toman ${en} was recorded${op.note ? ` (${op.note.slice(0, 60)})` : ''}.`,
      }
    } catch (e) {
      if (e instanceof FinanceValidationError) {
        return { ok: false, fa: `ثبت ناموفق: ${e.message}`, en: `Failed: ${e.message}` }
      }
      throw e
    }
  }
  if (op.type === 'delete_task' && op.taskId) {
    const task = await db.task.findFirst({ where: { id: op.taskId, userId } })
    if (!task) return { ok: false, fa: 'کاری که قرار بود حذف شود پیدا نشد (شاید قبلاً حذف شده بود).', en: 'The task to delete was not found (it may already be gone).' }
    await db.task.delete({ where: { id: task.id } })
    return { ok: true, fa: `انجام شد — کار «${task.title.slice(0, 80)}» حذف شد.`, en: `Done — task “${task.title.slice(0, 80)}” was deleted.` }
  }
  if (op.type === 'forget' && op.factContains) {
    const del = await db.memory.deleteMany({ where: { fact: { contains: op.factContains.slice(0, 100) }, userId } })
    return del.count > 0
      ? { ok: true, fa: `انجام شد — ${del.count} یادداشت حافظه فراموش شد.`, en: `Done — ${del.count} memory entr(ies) were forgotten.` }
      : { ok: false, fa: 'حافظه‌ای با آن متن پیدا نشد.', en: 'No memory matched that text.' }
  }
  return { ok: false, fa: 'عملیات در انتظار نامعتبر بود.', en: 'Pending operation was invalid.' }
}

/** اولین حساب مالی کاربر — برای ثبت تأییددار وقتی کاربر حساب مشخص نکرده */
async function firstAccount(userId: string): Promise<{ id: string; name: string } | null> {
  const acc = await db.financeAccount.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  return acc ?? null
}

/**
 * F7 — تطبیق نام حساب از متن تأیید (چند حسابی):
 * «بله، بانک ملت» → حسابی که نامش در متن باشد؛ تطبیق یکتا لازم است.
 * خروجی: شناسهٔ حساب یا null (تطبیق یکتا نبود).
 */
export async function resolveExpenseAccountFromText(
  userId: string,
  message: string,
): Promise<string | null> {
  const accounts = await db.financeAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  if (accounts.length === 1) return accounts[0].id
  const t = (message ?? '').toLowerCase()
  const hits = accounts.filter((a) => a.name && t.includes(a.name.toLowerCase()))
  return hits.length === 1 ? hits[0].id : null
}
