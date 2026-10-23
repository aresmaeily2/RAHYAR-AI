// ─── تأیید مستقل v2.1.0 — مدرک زمان‌بندی‌شدهٔ مدل + Agent + Provider + حالت بدون مدل ───
// خروجی: artifacts/verification/ai-timed-evidence.json (بدون هیچ کلید یا اطلاعات حساس)
const BASE = process.env.BASE || 'http://localhost:3100'
const fs = require('fs')
const OUTDIR = '/home/z/my-project/artifacts/verification'
fs.mkdirSync(OUTDIR, { recursive: true })

async function j(method, path, body, cookie) {
  const h = { 'Content-Type': 'application/json' }
  if (cookie) h['Cookie'] = cookie
  const t0 = Date.now()
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  const data = await r.json().catch(() => null)
  return { status: r.status, data, cookie: m ? m[0] : null, ms: Date.now() - t0 }
}

async function main() {
  const ev = { timestamp: new Date().toISOString(), base: BASE, commit_under_test: 'bea977971c2dca3083efd85e684dfa50f7e8434f', steps: [] }
  const log = (s) => { ev.steps.push(s); console.log(JSON.stringify(s).slice(0, 400)) }

  const login = await j('POST', '/api/auth/login', { username: 'owner', password: 'Rahyar@1404' })
  const ck = login.cookie
  log({ step: 'login', status: login.status, ms: login.ms, role: login.data?.user?.role })

  // ۱) انتخاب Provider واقعی — مسیر resolveEngine
  const st = await j('GET', '/api/settings/ai', null, ck)
  log({
    step: 'provider-selection (GET /api/settings/ai → getEngineStatus)',
    status: st.status, ms: st.ms,
    engine: st.data?.engine, hostedAvailable: st.data?.hostedAvailable,
    hasKey: st.data?.hasKey, keyMasked: st.data?.keyMasked, killSwitch: st.data?.killSwitch,
  })

  // ۲) درخواست تازهٔ مدل با زمان‌بندی — ورودی ناآشنا (تولیدی)
  const q1 = 'به فارسی فقط در یک جمله بگو اورست قلهٔ چه کوهی است و ارتفاعش چقدر است؟'
  const t1 = await j('POST', '/api/chat', { message: q1, clientKey: 'verify-' + Date.now() }, ck)
  const reply1 = t1.data?.assistantMessage?.content || ''
  log({
    step: 'A fresh model request (POST /api/chat)',
    input: q1, status: t1.status, ms: t1.ms,
    mode: t1.data?.mode, engine_expected: 'zai (hosted-model)',
    reply_chars: reply1.length, reply: reply1.slice(0, 300),
  })

  // ۳) درخواست تازهٔ Agent — ساخت وظیفه با زمان‌بندی (حداکثر ۳ تلاش — رفتار مدل متغیر است)
  const uniq = 'بازبینی قرارداد تأمین‌کننده ' + (100 + Math.floor(Math.random() * 900))
  const q2 = `لطفاً یک وظیفه با عنوان «${uniq}» برای جمعه ساعت ۱۰ با اولویت بالا بساز`
  let t2 = null, acts = [], bAttempts = []
  for (let i = 0; i < 3; i++) {
    t2 = await j('POST', '/api/chat', { message: i === 0 ? q2 : q2 + ' (پاسخ را در قالب JSON با فیلد actions برگردان)', clientKey: 'verify-' + Date.now() }, ck)
    acts = t2.data?.actions || []
    bAttempts.push({ attempt: i + 1, ms: t2.ms, mode: t2.data?.mode, actions: acts.map(a => a.type), reply: (t2.data?.assistantMessage?.content || '').slice(0, 250) })
    if (acts.length) break
  }
  log({
    step: 'B fresh agent request (tool execution, up to 3 attempts)',
    input: q2, status: t2.status,
    attempts: bAttempts,
    action_types: acts.map(a => a.type), action_ok: acts.map(a => a.ok),
    task_id: acts[0]?.task?.id || null,
    task: acts[0]?.task ? { id: acts[0].task.id, title: acts[0].task.title, dueDate: acts[0].task.dueDate, dueTime: acts[0].task.dueTime, priority: acts[0].task.priority } : null,
  })

  // ۴) رکورد متناظر دیتابیس با شناسهٔ غیرحساس
  const list = await j('GET', '/api/tasks', null, ck)
  const found = (list.data?.tasks || []).find(t => t.title === uniq)
  log({ step: 'C db record verification (GET /api/tasks)', status: list.status, ms: list.ms, db_record_found: Boolean(found), record: found || null })

  // ۵) حالت «بدون مدل ابری» — تغییر موتور به local_rules و درخواست تازه
  const setLocal = await j('PUT', '/api/settings/ai', { engine: 'local_rules' }, ck)
  const t3 = await j('POST', '/api/chat', { message: 'ساعت چنده؟', clientKey: 'verify-' + Date.now() }, ck)
  const reply3 = t3.data?.assistantMessage?.content || ''
  log({
    step: 'D cloud-disabled behavior (engine=local_rules)',
    setStatus: setLocal.status, setEngine: setLocal.data?.engine, chatStatus: t3.status, ms: t3.ms,
    mode: t3.data?.mode, reply: reply3.slice(0, 200),
  })

  // ۶) بازگرداندن موتور به zai برای ادامهٔ استفادهٔ عادی
  const restore = await j('PUT', '/api/settings/ai', { engine: 'zai' }, ck)
  log({ step: 'restore engine=zai', status: restore.status })
  const st2 = await j('GET', '/api/settings/ai', null, ck)
  log({ step: 'final engine state', engine: st2.data?.engine, hostedAvailable: st2.data?.hostedAvailable })

  fs.writeFileSync(OUTDIR + '/ai-timed-evidence.json', JSON.stringify(ev, null, 2))
  console.log('\nSAVED: artifacts/verification/ai-timed-evidence.json')
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
