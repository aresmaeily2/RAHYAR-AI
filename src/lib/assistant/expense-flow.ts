// ─── جریان تأییددار ثبت هزینه/درآمد از چت/صدا (F7 — ایجنت ۲/۳) ──────
// اصل امنیتی: چت/صدا هرگز بی‌درنگ مالی نمی‌نویسد؛ پیشنهاد می‌سازد (پندینگ)
// و فقط بعد از «بله/تأیید» روی DB واقعی می‌نویسد (همان سرویس UI/SMS).
import { db } from '@/lib/db'
import type { ParsedExpense } from '@/lib/assistant/expense'
import { formatAmount } from '@/lib/assistant/expense'
import { setPendingAction, resolveExpenseAccountFromText, type PendingOp } from '@/lib/assistant/pending-action'

type Lang = 'fa' | 'en'
const pick = (lang: Lang, fa: string, en: string) => (lang === 'fa' ? fa : en)

export interface ExpenseProposal {
  reply: string
  /** true = پندینگ ساخته شد و منتظر تأیید است؛ false = پاسخ اطلاع‌رسانی بدون پندینگ */
  pending: boolean
}

/**
 * پیشنهاد ثبت هزینه/درآمد — همیشه با تأیید.
 * یک حساب → مستقیم همان حساب؛ چند حساب → نام حساب در متن تأیید لازم است؛
 * بدون حساب → راهنمایی ساخت حساب (بدون پندینگ).
 */
export async function proposeExpense(
  userId: string,
  lang: Lang,
  parsed: ParsedExpense,
): Promise<ExpenseProposal> {
  const accounts = await db.financeAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })
  const amt = formatAmount(parsed.amount)
  const whatFa = parsed.dir === 'income' ? 'درآمد' : 'هزینه'
  const whatEn = parsed.dir === 'income' ? 'income' : 'expense'

  if (accounts.length === 0) {
    return {
      pending: false,
      reply: pick(
        lang,
        `برای ثبت ${whatFa} ${amt} تومانی اول باید یک حساب مالی بسازی — در صفحهٔ مالی «حساب جدید» را بزن، بعد دوباره بگو.`,
        `To record this ${whatEn} of ${amt} toman, first create a finance account on the finance page, then ask again.`,
      ),
    }
  }

  await setPendingAction(userId, {
    type: 'add_expense',
    dir: parsed.dir,
    amount: parsed.amount,
    note: parsed.note,
    accountId: accounts.length === 1 ? accounts[0].id : null,
  })

  const summaryFa = `${amt} تومان ${whatFa}${parsed.note && parsed.note !== whatFa ? ` بابت «${parsed.note.slice(0, 80)}»` : ''}`
  const summaryEn = `${amt} toman ${whatEn}${parsed.note && parsed.note !== whatEn ? ` for “${parsed.note.slice(0, 80)}”` : ''}`

  if (accounts.length === 1) {
    return {
      pending: true,
      reply: pick(
        lang,
        `قرار است ${summaryFa} در حساب «${accounts[0].name}» ثبت شود. تأیید می‌کنی؟ (بله / انصراف)`,
        `About to record ${summaryEn} in account “${accounts[0].name}”. Confirm? (yes / cancel)`,
      ),
    }
  }
  const names = accounts.map((a) => a.name).join('، ')
  return {
    pending: true,
    reply: pick(
      lang,
      `قرار است ${summaryFa} ثبت شود. به کدام حساب؟ برای تأیید بنویس: «بله، <نام حساب>» (${names})`,
      `About to record ${summaryEn}. Which account? Reply “yes, <account name>” (${names})`,
    ),
  }
}

/**
 * مرحلهٔ تأیید — اگر پندینگِ مالی بدون حساب است، حساب را از متن تأیید تطبیق بده.
 * خروجی: op آمادهٔ اجرا، یا پیام راهنما (تطبیق حساب نشد)، یا null (ربطی به مالی ندارد).
 */
export async function prepareExpenseExecution(
  userId: string,
  lang: Lang,
  op: PendingOp,
  confirmMessage: string,
): Promise<{ op: PendingOp } | { ask: string } | null> {
  if (op.type !== 'add_expense') return null
  if (op.accountId) return { op }
  const accId = await resolveExpenseAccountFromText(userId, confirmMessage)
  if (!accId) {
    const names = (
      await db.financeAccount.findMany({ where: { userId }, select: { name: true } })
    )
      .map((a) => a.name)
      .join('، ')
    return {
      ask: pick(
        lang,
        `کدام حساب؟ برای تأیید بنویس: «بله، <نام حساب>» (${names})`,
        `Which account? Reply “yes, <account name>” (${names})`,
      ),
    }
  }
  return { op: { ...op, accountId: accId } }
}
