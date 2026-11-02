// ─── آزمون زندهٔ ۵ سناریوی تکمیلی F2-AG (S6-S10) — اثر واقعی DB ──
// هر سناریو: پیام واقعی به API چت (نشست owner) → بررسی ردیف واقعی DB.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const BASE = 'http://127.0.0.1:3000'
const PW = process.env.RAHYAR_OWNER_PW ?? ''
if (!PW) { console.error('RAHYAR_OWNER_PW missing'); process.exit(2) }

const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'owner', password: PW }),
})
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
console.log('login:', loginRes.status, cookie ? 'session-ok' : 'NO-COOKIE')
if (!cookie) process.exit(2)

const post = async (path: string, body: unknown, key?: string) =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(key ? { ...(body as object), clientKey: key } : body),
  })
const put = async (path: string, body: unknown) =>
  fetch(`${BASE}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) })
const get = async (path: string) => fetch(`${BASE}${path}`, { headers: { Cookie: cookie } })

const uid = (await db.user.findUnique({ where: { username: 'owner' } }))!.id
const RUN_START = new Date()
const results: string[] = []
const t0 = Date.now()

async function chat(message: string, key?: string) {
  const r = await post('/api/chat', { message }, key)
  const j = await r.json().catch(() => ({})) as any
  return { status: r.status, j }
}
const TEHRAN = '+03:30'
const dbg = (label: string, acts: any[]) =>
  `${label} actions=[${(acts ?? []).map((a: any) => `${a.type}:${a.ok ? 'ok' : a.pending ? 'pending' : 'no'}`).join(',')}]`
const rcIsDeterministic = (r: any) => r?.j?.mode === 'deterministic'

// ── S6: فرمان چندمرحله‌ای تقویم + یادآور ──
{
  const { j } = await chat('قرار دکتر را فردا ساعت ۱۰ صبح به تقویم اضافه کن و ۳۰ دقیقه قبل یادم بنداز.', `f2-s6-${Date.now()}`)
  const acts = (j.actions ?? []) as any[]
  const taskOk = acts.some((a) => a.type === 'add_task' && a.ok)
  const remOk = acts.some((a) => a.type === 'add_reminder' && a.ok && a.reminder?.taskId)
  const newTask = await db.task.findFirst({ where: { userId: uid, title: { contains: 'دکتر' } }, orderBy: { createdAt: 'desc' } })
  const linked = newTask ? await db.reminder.findFirst({ where: { userId: uid, taskId: newTask.id } }) : null
  // انتظار: remindAt = سررسید تهران منهای ۳۰ دقیقه (مشتق از خود ردیف — نه عدد فرضی)
  let atOk = false
  let expectIso = '-'
  if (newTask && linked && newTask.dueDate && newTask.dueTime && /^\d{1,2}:\d{2}$/.test(newTask.dueTime)) {
    const iso = newTask.dueDate.toISOString().slice(0, 10)
    const due = new Date(`${iso}T${newTask.dueTime.padStart(5, '0')}:00${TEHRAN}`)
    const expect = new Date(due.getTime() - 30 * 60_000)
    expectIso = expect.toISOString()
    atOk = Math.abs(expect.getTime() - linked.remindAt.getTime()) < 120_000
  }
  // معیار اثر-محور: ردیف واقعی کار + یادآور متصل با ریاضی دقیق تهران.
  // مسیر اکشن (مدل-بومی یا گارد-کمک) گزارش می‌شود؛ ردِ اکشن شفاف ثبت می‌گردد.
  const dbEffect = !!newTask && !!linked && atOk
  const unknownNote = (acts ?? []).filter((a: any) => a.type === 'unknown').map((a: any) => a.note).join(' | ').slice(0, 140)
  const ok = dbEffect && (taskOk || remOk)
  results.push(`S6 (چندمرحله‌ای تقویم+یادآور): ${ok ? 'PASS' : 'FAIL'}`)
  results.push(`  dbEffect(task+linked+Tehran-math)=${dbEffect} | modelNativeTask=${taskOk} modelNativeReminder=${remOk}`)
  results.push(`  ${dbg('', acts)} | dueTime=${newTask?.dueTime ?? '-'} | remindAt=${linked?.remindAt.toISOString() ?? '-'} | expected=${expectIso}`)
  if (unknownNote) results.push(`  rejectedActionNote="${unknownNote}"`)
}

// ── S7: قطع سرویس AI — پاسخ خطای واقعی، بدون جعل موفقیت ──
{
  const before = await (await get('/api/settings/ai')).json()
  const put1 = await put('/api/settings/ai', { engine: 'openai_compatible', endpointUrl: 'http://127.0.0.1:9/v1', endpointModel: 'outage-probe', endpointKey: 'x' })
  let reply = ''
  let actionsS7: any[] = []
  if (put1.ok) {
    try {
      const { j } = await chat('سلام! حالت خطای قطع سرویس را تست کن و یک کار بساز.')
      reply = (j.assistantMessage?.content ?? '') as string
      actionsS7 = (j.actions ?? []) as any[]
    } catch { reply = '(network-level failure)' }
  } else {
    reply = `(PUT failed ${put1.status}: ${await put1.text()})`
  }
  const lastUsage = await db.aiUsage.findFirst({ where: { userId: uid }, orderBy: { createdAt: 'desc' } })
  const usageStatus = lastUsage?.status ?? '-'
  const prevEngine = (before as any).engine ?? 'zai'
  const put2 = await put('/api/settings/ai', { engine: prevEngine === 'openai_compatible' ? 'zai' : prevEngine, endpointUrl: '' })
  const noFakeTask = actionsS7.filter((a) => a.type === 'add_task' && a.ok).length === 0
  const failedText = /متأسفانه|نتوانستم|در دسترس|قطع|برقرار نشد|بعداً|امکان|خطا/.test(reply)
  const ok = noFakeTask && put1.ok && put2.ok && (usageStatus === 'error' || failedText)
  results.push(`S7 (قطع سرویس AI): ${ok ? 'PASS' : 'FAIL'}`)
  results.push(`  put1=${put1.status} put2(restore)=${put2.status} usageStatus=${usageStatus} noFakeTask=${noFakeTask} ${dbg('', actionsS7)}`)
  results.push(`  reply="${reply.slice(0, 120).replace(/\n/g, ' | ')}"`)
}

// ── S8: retry نباید دوباره‌کاری بسازد (clientKey یکسان در همین اجرا) ──
{
  const runKey = `f2-s8-${Date.now()}`
  const msg = 'کار آزمون ریترای را برای فردا ساعت ۸ صبح بذار.'
  const before = await db.task.count({ where: { userId: uid, title: { contains: 'آزمون ریترای' } } })
  const r1 = await chat(msg, runKey)
  const r2 = await chat(msg, runKey)
  const after = await db.task.count({ where: { userId: uid, title: { contains: 'آزمون ریترای' } } })
  const secondBlob = String(r2.j.assistantMessage?.content ?? '') + JSON.stringify(r2.j.actions ?? [])
  const dupNote = secondBlob.includes('قبلاً اجرا')
  const ok = after - before === 1 && dupNote
  results.push(`S8 (idempotency/retry): ${ok ? 'PASS' : 'FAIL'}`)
  results.push(`  delta=${after - before} (باید ۱ باشد) dupNoteInSecond=${dupNote} countBefore=${before}`)
  results.push(`  second="${String(r2.j.assistantMessage?.content ?? '').slice(0, 90)}"`)
}

// ── S9: تأیید پیش از عملیات حساس — ماشین تأیید از مسیر API واقعی ──
// پایه‌های A/B: pending واقعی روی کار واقعی (seed DB) → تصمیم کاربر با پیام واقعی
// از API چت → اجرا/ابطال واقعی + لاگ. پایهٔ C: جریان عامل-محور (مدل delete_task
// می‌فرستد → سیستم pending می‌سازد) — غیرقطعیت مدل دارد و فقط گزارش می‌شود.
{
  const runTag = Date.now().toString(36)
  const seedPending = async (taskId: string, title: string) => {
    const value = JSON.stringify({ type: 'delete_task', taskId, title, savedAt: new Date().toISOString() })
    await db.setting.upsert({ where: { userId_key: { userId: uid, key: 'pending_action' } }, create: { userId: uid, key: 'pending_action', value }, update: { value } })
  }

  // پایهٔ A — انصراف
  const titleA = `گزارش آزمون انصراف ${runTag}`
  await post('/api/tasks', { title: titleA, priority: 2 })
  const tA = await db.task.findFirst({ where: { userId: uid, title: titleA } })
  await seedPending(tA!.id, titleA)
  const rCancel = await chat('انصراف')
  const aliveA = await db.task.findUnique({ where: { id: tA!.id } })
  const clearedA = !(await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } }))
  const canceledLog = await db.actionLog.findFirst({ where: { userId: uid, actionType: 'delete_task', status: 'canceled', createdAt: { gte: RUN_START } }, orderBy: { createdAt: 'desc' } })
  const legA = !!aliveA && clearedA && !!canceledLog && rcIsDeterministic(rCancel)

  // پایهٔ B — تأیید
  const titleB = `گزارش آزمون حذف ${runTag}`
  await post('/api/tasks', { title: titleB, priority: 2 })
  const tB = await db.task.findFirst({ where: { userId: uid, title: titleB } })
  await seedPending(tB!.id, titleB)
  const rYes = await chat('بله')
  const goneB = !(await db.task.findUnique({ where: { id: tB!.id } }))
  const clearedB = !(await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } }))
  const confLog = await db.actionLog.findFirst({ where: { userId: uid, actionType: 'delete_task', status: 'success', createdAt: { gte: RUN_START } }, orderBy: { createdAt: 'desc' } })
  const legB = goneB && clearedB && !!confLog && rcIsDeterministic(rYes)

  // پایهٔ C — عامل-محور (گزارشی؛ غیرقطعیت مدل مستند می‌شود)
  const titleC = `گزارش آزمون عامل ${runTag}`
  await post('/api/tasks', { title: titleC, priority: 2 })
  let agentPending = false
  for (const msg of [`کار ${titleC} را حذف کن.`, `لطفاً کار با عنوان «${titleC}» را از لیست حذف کن — حذف کن.`]) {
    const r = await chat(msg)
    if ((r.j.actions ?? []).some((a: any) => a.type === 'delete_task')) { agentPending = true; break }
  }
  const agentCleared = !(await db.setting.findUnique({ where: { userId_key: { userId: uid, key: 'pending_action' } } }))
  await chat('انصراف').catch(() => {})

  const ok = legA && legB
  results.push(`S9 (تأیید عملیات حساس): ${ok ? 'PASS' : 'FAIL'}`)
  results.push(`  legA(انصراف): alive=${!!aliveA} cleared=${clearedA} canceledLog=${!!canceledLog} deterministic=${rcIsDeterministic(rCancel)}`)
  results.push(`  legB(تأیید): deleted=${goneB} cleared=${clearedB} confLog=${!!confLog} deterministic=${rcIsDeterministic(rYes)}`)
  results.push(`  legC(عامل-محور، گزارشی): agentPendingSet=${agentPending} (غیرقطعیت مدل — مستند) | pending-after=${agentCleared ? 'cleared' : 'open'}`)
  results.push(`  cancelReply="${String(rCancel.j.assistantMessage?.content ?? '').slice(0, 70)}" | yesReply="${String(rYes.j.assistantMessage?.content ?? '').slice(0, 70)}"`)
}

// ── S10: راستی‌آزمایی نتیجهٔ واقعی پس از اجرا (از ActionLog تا DB) — کلید یکتا ──
{
  const { j } = await chat('یک یادداشت آزمون راستی‌آزمایی برای امروز بذار.', `f2-s10-${Date.now()}`)
  const act = (j.actions ?? []).find((a: any) => a.type === 'add_task' && a.ok)
  const targetId = act?.task?.id
  const viaLog = targetId ? await db.actionLog.findFirst({ where: { userId: uid, actionType: 'add_task', status: 'success', targetId }, orderBy: { createdAt: 'desc' } }) : null
  const row = targetId ? await db.task.findUnique({ where: { id: targetId } }) : null
  const ok = !!targetId && !!viaLog && !!row && row.title.includes('راستی‌آزمایی')
  const recent = await db.actionLog.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 4, select: { actionType: true, status: true, targetId: true } })
  results.push(`S10 (راستی‌آزمایی پس از اجرا): ${ok ? 'PASS' : 'FAIL'}`)
  results.push(`  targetId=${targetId} inActionLog=${!!viaLog} rowInDB=${!!row} title="${row?.title ?? '-'}"`)
  results.push(`  recentLog=${JSON.stringify(recent)}`)
}

const tasks = await db.task.count({ where: { userId: uid } })
const rem = await db.reminder.count({ where: { userId: uid } })
console.log('========== F2 SCENARIO RESULTS ==========')
console.log(results.join('\n'))
console.log('========== DB EFFECTS ==========')
console.log(`tasks=${tasks} reminders=${rem} elapsed=${Math.round((Date.now() - t0) / 1000)}s`)
const HARD = results.filter((r) => r.startsWith('S'))
const allPass = HARD.every((r) => r.includes('PASS'))
console.log(allPass ? 'ALL F2 SCENARIOS: PASS' : 'F2 SOME SCENARIOS: FAILED')
process.exit(allPass ? 0 : 1)
