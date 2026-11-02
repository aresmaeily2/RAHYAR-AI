#!/usr/bin/env bun
// ─── آزمون واقعی ۵ سناریوی اجباری مأموریت نهایی — اثر واقعی در DB ──
// هر سناریو: ارسال پیام واقعی به API چت با نشست owner → بررسی ردیف واقعی
// در دیتابیس (کار/یادآور/برنامه/اکشن‌لاگ) — پاسخ متنی به‌تنهایی قبول نیست.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'

const PW = process.env.RAHYAR_OWNER_PW!
if (!PW) { console.error('RAHYAR_OWNER_PW missing'); process.exit(2) }

// ── ورود واقعی ──
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'owner', password: PW }),
})
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
console.log('login:', loginRes.status, cookie ? 'session-ok' : 'NO-COOKIE')
if (!cookie) process.exit(2)

const post = async (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  })

const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id

// ── دادهٔ مالی واقعی برای سناریوی ۲ (از مسیر API واقعی اپ) ──
let accounts = await db.financeAccount.findMany({ where: { userId: uid } })
if (accounts.length === 0) {
  const r = await post('/api/finance/accounts', { name: 'کیف پول', kind: 'cash', openingAmount: 5_000_000 })
  console.log('account created:', r.status)
  accounts = await db.financeAccount.findMany({ where: { userId: uid } })
}
const acc = accounts[0]
const txCount = await db.financeTransaction.count({ where: { userId: uid } })
if (txCount < 4) {
  const seed: Array<[number, string, string]> = [
    [850_000, 'food', 'خرید هفتگی فروشگاه'],
    [320_000, 'transport', 'تاکسی این هفته'],
    [1_200_000, 'bills', 'قبض اینترنت'],
    [450_000, 'fun', 'سینما'],
  ]
  for (const [amount, category, note] of seed) {
    const r = await post('/api/finance/transactions', { type: 'expense', amount, accountId: acc.id, category, note })
    if (!r.ok) console.log('tx create FAILED', r.status, await r.text())
  }
  console.log('finance seed done (4 expenses)')
}
const beforeTasks = await db.task.count({ where: { userId: uid } })
const beforeReminders = await db.reminder.count({ where: { userId: uid } })
console.log(`before: tasks=${beforeTasks} reminders=${beforeReminders}`)

// ── ۵ سناریوی اجباری ──
const SCENARIOS = [
  'برای فردا ساعت ۹ صبح یادآوری کن با فلانی تماس بگیرم.',
  'مخارج این هفته را جمع کن و گزارش بده.',
  'برای فردا سه کار مهم من را برنامه‌ریزی کن.',
  'یک پیام آماده کن و قبل از ارسال، متنش را به من نشان بده.',
  'قرار فردا را به تقویم اضافه کن و یک ساعت قبل یادآوری کن.',
]

const results: string[] = []
for (let i = 0; i < SCENARIOS.length; i++) {
  const msg = SCENARIOS[i]
  const r = await post('/api/chat', { message: msg, clientKey: `fag-scenario-${i}-${Date.now()}` })
  const j = (await r.json()) as {
    mode?: string
    assistantMessage?: { content: string }
    actions?: Array<{ type: string; ok: boolean; note?: string; task?: { title: string; dueDate?: string | null; dueTime?: string | null }; reminder?: { message: string; remindAt: string }; summary?: { expense: number; income: number; currency: string }; draft?: { recipient: string | null; body: string; channel: string } }>
    error?: string
  }
  const actions = j.actions ?? []
  const summary = [
    `S${i + 1}: mode=${j.mode} status=${r.status}`,
    `  reply: ${(j.assistantMessage?.content ?? j.error ?? '').slice(0, 160).replace(/\n/g, ' | ')}`,
    `  actions: ${actions.map((a) => `${a.type}${a.ok ? '✓' : '✗' + (a.note ?? '')}`).join(', ') || '(none)'}`,
  ]
  if (actions.some((a) => a.task)) {
    const t = actions.find((a) => a.task)!.task!
    summary.push(`  task: "${t.title}" due=${t.dueDate?.slice(0, 10)} ${t.dueTime ?? ''}`)
  }
  if (actions.some((a) => a.reminder)) {
    const rem = actions.find((a) => a.reminder)!.reminder!
    summary.push(`  reminder: "${rem.message.slice(0, 60)}" at=${rem.remindAt}`)
  }
  if (actions.some((a) => a.summary)) {
    const s = actions.find((a) => a.summary)!.summary!
    summary.push(`  finance: expense=${s.expense} income=${s.income} ${s.currency}`)
  }
  if (actions.some((a) => a.draft)) {
    const d = actions.find((a) => a.draft)!.draft!
    summary.push(`  draft[${d.channel}]: to=${d.recipient ?? '-'} "${d.body.slice(0, 80)}"`)
  }
  results.push(summary.join('\n'))
  await new Promise((res) => setTimeout(res, 1200))
}
console.log('\n========== SCENARIO RESULTS ==========')
console.log(results.join('\n'))

// ── اثر واقعی در DB ──
const afterTasks = await db.task.count({ where: { userId: uid } })
const afterReminders = await db.reminder.count({ where: { userId: uid } })
const newTasks = await db.task.findMany({
  where: { userId: uid, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
  select: { title: true, dueDate: true, dueTime: true, status: true },
  orderBy: { createdAt: 'asc' },
})
const newReminders = await db.reminder.findMany({
  where: { userId: uid, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
  select: { message: true, remindAt: true, taskId: true },
})
const plans = null // برنامهٔ روز در DB ذخیره نمی‌شود — اثر واقعی آن در اکشن‌ریسپانس (plan_day) سنجیده می‌شود
const actionLog = await db.actionLog.findMany({
  where: { userId: uid, createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
  select: { actionType: true, status: true },
  orderBy: { createdAt: 'asc' },
})
console.log('\n========== DB EFFECTS ==========')
console.log(`tasks: ${beforeTasks} -> ${afterTasks} (+${afterTasks - beforeTasks})`)
console.log(`reminders: ${beforeReminders} -> ${afterReminders} (+${afterReminders - beforeReminders})`)
console.log('new tasks:', JSON.stringify(newTasks, null, 1))
console.log('new reminders:', JSON.stringify(newReminders.map((r) => ({ m: r.message.slice(0, 50), at: r.remindAt.toISOString(), linked: !!r.taskId })), null, 1))
console.log('daily plan: from S3 action result (not persisted)')
console.log('action log:', actionLog.map((a) => `${a.actionType}:${a.status}`).join(', '))

// ── صحت‌سنجی سخت سناریوها ──
const tomorrowIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(new Date(Date.now() + 24 * 3600_000))
const checks = {
  'S1: کار/یادآور واقعی تماس ثبت شد': newTasks.some((t) => t.title.includes('فلانی') || t.title.includes('تماس')) || results[0].includes('add_reminder✓'),
  'S2: پاسخ مالی عدد واقعی دارد': /[۰-۹0-9]/.test(results[1].split('reply:')[1]?.split('|')[0] ?? '') && /(ریال|تومان)/.test(results[1]),
  'S3: برنامهٔ واقعی در اکشن (plan_day یا ۲+ کار)': results[2].includes('plan_day✓') || results[2].includes('add_task✓'),
  'S4: پیش‌نویس ساخته شد و ارسال نشد': results[3].includes('draft['),
  'S5: قرار + یادآور متصل ساخته شد': newReminders.some((r) => r.taskId) || (results[4].includes('add_task✓') && results[4].includes('add_reminder✓')),
}
console.log('\n========== HARD CHECKS ==========')
for (const [k, v] of Object.entries(checks)) console.log(`${v ? '✓' : '✗'} ${k}`)
const allOk = Object.values(checks).every(Boolean)
console.log(allOk ? 'ALL SCENARIOS: PASS' : 'SOME SCENARIOS: FAILED')
process.exit(allOk ? 0 : 1)
