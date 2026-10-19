// ─── آماده‌سازی پیش‌نمایش: حساب owner + داده نمایشی + توکن نشست ──
// اجرا: bun scripts/preview-setup.ts
// خروجی: artifacts/preview/session-token.txt (توکن نشست — محرمانه)
// نکته: idempotent است — با اجرای مجدد داده تکراری نمی‌سازد.
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
import { mkdirSync, writeFileSync } from 'fs'

const db = new PrismaClient()
const PREVIEW_DIR = '/home/z/my-project/artifacts/preview'
const USERNAME = 'owner'
const DISPLAY_NAME = 'کاربر رهیار'
const PASSWORD = 'Rahyar@1404'

mkdirSync(PREVIEW_DIR, { recursive: true })

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384 })
  return `s1:${salt.toString('hex')}:${hash.toString('hex')}`
}

// ── ۱) حساب مالک ─────────────────────────────────────────────
let owner = await db.user.findUnique({ where: { username: USERNAME } })
if (!owner) {
  owner = await db.user.create({
    data: { username: USERNAME, displayName: DISPLAY_NAME, passwordHash: hashPassword(PASSWORD) },
  })
  console.log('owner created')
} else {
  console.log('owner already exists — reusing')
}
const uid = owner.id

const today = new Date()
const at = (dayOffset: number, h: number, m = 0) => {
  const d = new Date(today)
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d
}
const ago = (days: number, h = 12, m = 0) => at(-days, h, m)

// ── ۲) کارها ─────────────────────────────────────────────────
const taskCount = await db.task.count({ where: { userId: uid } })
if (taskCount === 0) {
  const tasksData = [
    { title: 'بازبینی گزارش فروش هفته', notes: 'تمرکز روی اعداد سه‌ماهه سوم', priority: 1, status: 'todo', tag: 'کار', dueDate: at(0, 18), dueTime: '18:00', starred: true },
    { title: 'تماس با تیم پشتیبانی', notes: null, priority: 2, status: 'todo', tag: 'کار', dueDate: at(0, 21), dueTime: '21:00', starred: false },
    { title: 'خرید هفتگی', notes: 'میوه، نان، لبنیات', priority: 3, status: 'todo', tag: 'شخصی', dueDate: at(1, 11), dueTime: '11:00', starred: false },
    { title: 'تمرین ورزشی', notes: '۳۰ دقیقه دویدن', priority: 2, status: 'todo', tag: 'سلامت', dueDate: at(1, 7), dueTime: '07:00', starred: false, repeat: 'daily' },
    { title: 'پرداخت قبض اینترنت', notes: null, priority: 1, status: 'todo', tag: 'مالی', dueDate: at(2, 12), dueTime: '12:00', starred: false },
    { title: 'خواندن ۲۰ صفحه کتاب', notes: 'کتاب عادت‌های اتمی', priority: 3, status: 'done', tag: 'رشد', dueDate: at(-1, 22), dueTime: '22:00', starred: false, completedAt: at(-1, 21, 40) },
    { title: 'جلسه برنامه‌ریزی پروژه', notes: null, priority: 2, status: 'done', tag: 'کار', dueDate: at(-1, 10), dueTime: '10:00', starred: false, completedAt: at(-1, 10, 45) },
  ]
  for (const t of tasksData) await db.task.create({ data: { ...t, userId: uid } })
  console.log('tasks seeded:', tasksData.length)
}

// ── ۳) یادآورها ──────────────────────────────────────────────
const reminderCount = await db.reminder.count({ where: { userId: uid } })
if (reminderCount === 0) {
  const remindersData = [
    { message: 'وقت جلسه با تیم محصول', remindAt: at(0, 17, 30) },
    { message: 'داروی سرماخوردگی', remindAt: at(0, 22) },
    { message: 'تمدید اشتراک دامنه', remindAt: at(3, 9) },
  ]
  for (const r of remindersData) await db.reminder.create({ data: { ...r, userId: uid } })
  const firstTask = await db.task.findFirst({ where: { userId: uid, starred: true } })
  if (firstTask) {
    await db.reminder.create({ data: { userId: uid, taskId: firstTask.id, message: 'یادآور بازبینی گزارش', remindAt: at(0, 17) } })
  }
  console.log('reminders seeded')
}

// ── ۴) حافظه دستیار ──────────────────────────────────────────
const memoryCount = await db.memory.count({ where: { userId: uid } })
if (memoryCount === 0) {
  const memoriesData = [
    { fact: 'زبان ترجیحی من فارسی است', source: 'manual' },
    { fact: 'ساعت کاری من ۹ تا ۱۷ است', source: 'chat' },
    { fact: 'سرمایه‌گذاری بلندمدت را به نوسان‌گیری ترجیح می‌دهم', source: 'chat' },
  ]
  for (const m of memoriesData) await db.memory.create({ data: { ...m, userId: uid } })
  console.log('memories seeded')
}

// ── ۵) مالی — حساب‌ها، تراکنش‌ها، بودجه ─────────────────────
const accCount = await db.financeAccount.count({ where: { userId: uid } })
if (accCount === 0) {
  const bank = await db.financeAccount.create({ data: { userId: uid, name: 'بانک ملت', kind: 'bank', openingAmount: 320_000_000 } })
  const card = await db.financeAccount.create({ data: { userId: uid, name: 'کارت روزمره', kind: 'card', openingAmount: 45_000_000 } })
  const cash = await db.financeAccount.create({ data: { userId: uid, name: 'نقدی', kind: 'cash', openingAmount: 8_000_000 } })

  const txData: Array<{ type: string; amount: number; accountId: string; toAccountId?: string; category: string; note: string; occurredAt: Date }> = [
    { type: 'income', amount: 250_000_000, accountId: bank.id, category: 'salary', note: 'حقوق مهرماه', occurredAt: ago(25, 9) },
    { type: 'expense', amount: 90_000_000, accountId: bank.id, category: 'housing', note: 'اجاره خانه', occurredAt: ago(25, 11) },
    { type: 'income', amount: 60_000_000, accountId: bank.id, category: 'freelance', note: 'پروژه طراحی سایت', occurredAt: ago(12, 16) },
    { type: 'expense', amount: 15_500_000, accountId: card.id, category: 'food', note: 'خرید هفتگی فروشگاه', occurredAt: ago(3, 18) },
    { type: 'expense', amount: 2_400_000, accountId: card.id, category: 'food', note: 'ناهار رستوران', occurredAt: ago(1, 13, 30) },
    { type: 'expense', amount: 850_000, accountId: cash.id, category: 'transport', note: 'تاکسی', occurredAt: ago(1, 9, 15) },
    { type: 'expense', amount: 1_200_000, accountId: card.id, category: 'transport', note: 'بنزین', occurredAt: ago(4, 8) },
    { type: 'expense', amount: 8_700_000, accountId: bank.id, category: 'bills', note: 'قبض اینترنت', occurredAt: ago(6, 10) },
    { type: 'expense', amount: 4_300_000, accountId: bank.id, category: 'bills', note: 'قبض برق', occurredAt: ago(9, 10) },
    { type: 'expense', amount: 12_800_000, accountId: card.id, category: 'shopping', note: 'کفش ورزشی', occurredAt: ago(8, 17) },
    { type: 'expense', amount: 3_600_000, accountId: cash.id, category: 'health', note: 'داروخانه', occurredAt: ago(14, 12) },
    { type: 'expense', amount: 1_800_000, accountId: card.id, category: 'fun', note: 'سینما', occurredAt: ago(10, 21) },
    { type: 'expense', amount: 5_500_000, accountId: card.id, category: 'family', note: 'هدیه تولد مادر', occurredAt: ago(17, 15) },
    { type: 'expense', amount: 2_000_000, accountId: bank.id, category: 'charity', note: 'کمک خیریه', occurredAt: ago(20, 14) },
    { type: 'expense', amount: 1_450_000, accountId: card.id, category: 'education', note: 'کتاب', occurredAt: ago(22, 19) },
    { type: 'transfer', amount: 20_000_000, accountId: bank.id, toAccountId: cash.id, category: 'transfer', note: 'برداشت نقدی', occurredAt: ago(5, 12) },
  ]
  let i = 0
  for (const tx of txData) {
    i++
    await db.financeTransaction.create({
      data: { ...tx, userId: uid, source: 'manual', externalRef: `preview-seed-${i}` },
    })
  }
  await db.financeBudget.create({ data: { userId: uid, category: 'food', monthlyLimit: 40_000_000 } })
  await db.financeBudget.create({ data: { userId: uid, category: 'transport', monthlyLimit: 10_000_000 } })
  await db.financeBudget.create({ data: { userId: uid, category: 'fun', monthlyLimit: 5_000_000 } })
  console.log('finance seeded: 3 accounts,', txData.length, 'transactions, 3 budgets')
}

// ── ۶) گفتگوی نمونه با دستیار ────────────────────────────────
const chatCount = await db.chatMessage.count({ where: { userId: uid } })
if (chatCount === 0) {
  const convo: Array<{ role: 'user' | 'assistant'; content: string; at: Date }> = [
    { role: 'user', content: 'سلام رهیار! این هفته چه کارهای مهمی دارم؟', at: ago(2, 9, 12) },
    {
      role: 'assistant',
      content: 'سلام! بر اساس کارهای ثبت‌شده‌ات، این هفته سه کار مهم در پیش داری:\n\n- **بازبینی گزارش فروش هفته** — امروز ساعت ۱۸:۰۰\n- **پرداخت قبض اینترنت** — تا دو روز دیگر\n- **خرید هفتگی** — فردا صبح\n\nپیشنهاد می‌کنم گزارش فروش را در ساعت اوج تمرکزت یعنی صبح شروع کنی. اگر بخواهی همین حالا یک برنامه دقیق برایت می‌چینم.',
      at: new Date(ago(2, 9, 12).getTime() + 20000),
    },
    { role: 'user', content: 'یه یادآور برای جلسه فردا ساعت ۱۰ صبح بذار', at: ago(1, 20, 5) },
    {
      role: 'assistant',
      content: 'انجام شد. یادآور «جلسه فردا، ۱۰ صبح» ثبت شد و نیم‌ساعت قبل هم بهت اطلاع می‌دهم.\n\nکار دیگری هست که همین حالا انجام بدهم؟',
      at: new Date(ago(1, 20, 5).getTime() + 4000),
    },
    { role: 'user', content: 'مصرف این ماه چطوره؟', at: ago(0, 8, 40) },
    {
      role: 'assistant',
      content: 'تا امروز بیشترین هزینه‌ات برای **خوراک** بوده و بعد از آن **حمل‌ونقل**. نسبت به بودجه‌ای که تعیین کردی هنوز در محدوده امن هستی، ولی خرج خرید آخر هفته کمی تندتر از روال ماه‌های قبل است.\n\nجزئیات کامل را در بخش مالی می‌بینی؛ اگر بخواهی می‌توانم سقف بودجه خوراک را برای ماه بعد هم تنظیم کنم.',
      at: new Date(ago(0, 8, 40).getTime() + 5000),
    },
  ]
  for (const m of convo) {
    await db.chatMessage.create({ data: { userId: uid, role: m.role, content: m.content, createdAt: m.at } })
  }
  console.log('chat seeded: 6 messages')
}

// ── ۷) توکن نشست برای ضبط پیش‌نمایش ─────────────────────────
const token = crypto.randomBytes(32).toString('base64url')
await db.session.create({
  data: {
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    userId: uid,
    expiresAt: new Date(Date.now() + 6 * 3600_000),
  },
})
writeFileSync(`${PREVIEW_DIR}/session-token.txt`, token, { mode: 0o600 })
console.log('session minted → artifacts/preview/session-token.txt')
console.log('DONE')
await db.$disconnect()
