// ─── آزمون زندهٔ کامل رهیار v2.0.0 — یک جلسهٔ واحد ─────────────
// شامل: راه‌اندازی مالک، ساخت کاربر آزمون، ایزولاسیون نقش، چت واقعی AI،
// استریم، وظایف/یادآورها/مالی، مدیریت کلید و ارائه‌دهنده
// اجرا: سرور باید روشن باشد (BASE از env)
const BASE = process.env.BASE || 'http://localhost:3000'
const fs = require('fs')

let pass = 0, fail = 0
const results = []
function check(name, ok, detail) {
  if (ok) { pass++; results.push(`PASS  ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; results.push(`FAIL  ${name}${detail ? ' — ' + detail : ''}`) }
}

async function j(method, path, body, cookie, headers = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (cookie) h['Cookie'] = cookie
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const setCookie = r.headers.get('set-cookie')
  let data = null
  const ct = r.headers.get('content-type') || ''
  if (ct.includes('json')) data = await r.json().catch(() => null)
  else data = await r.text().catch(() => '')
  return { status: r.status, data, setCookie }
}

function cookieOf(res) {
  const sc = res.setCookie || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  return m ? m[0] : null
}

async function main() {
  // ── ۰) سلامت ──
  const health = await j('GET', '/api/health')
  check('health endpoint', health.status === 200 && health.data?.status === 'ok', `db=${health.data?.database}`)

  // ── ۱) راه‌اندازی مالک (فقط اگر هنوز نشده) ──
  const setupToken = fs.existsSync('/tmp/setup-token.txt') ? fs.readFileSync('/tmp/setup-token.txt', 'utf8').split('=')[1].trim() : ''
  let ownerCookie = null
  const sess = await j('GET', '/api/auth/session')
  if (sess.data?.user) {
    ownerCookie = cookieOf(sess) // نشست موجود نیست بدون کوکی — ادامه با لاگین
  }
  const setup = await j('POST', '/api/auth/setup', {
    username: 'owner', password: 'Rahyar@1404', displayName: 'مالک رهیار', setupToken,
  })
  if (setup.status === 200 || setup.status === 403 /* قبلاً انجام شده */) {
    check('owner setup (one-time)', true, `status=${setup.status}`)
  } else {
    check('owner setup (one-time)', false, `status=${setup.status} body=${JSON.stringify(setup.data).slice(0, 120)}`)
  }

  // ورود مالک
  const ownerLogin = await j('POST', '/api/auth/login', { username: 'owner', password: 'Rahyar@1404' })
  ownerCookie = cookieOf(ownerLogin)
  check('owner login', ownerLogin.status === 200 && ownerCookie, `role=${ownerLogin.data?.user?.role}`)
  check('owner role is OWNER', ownerLogin.data?.user?.role === 'OWNER')

  // رمز اشتباه رد شود
  const badLogin = await j('POST', '/api/auth/login', { username: 'owner', password: 'wrong-pass-1' })
  check('wrong password rejected', badLogin.status === 401 || badLogin.status === 403 || badLogin.status === 429, `status=${badLogin.status}`)

  // ── ۲) ساخت کاربر عادی توسط مالک ──
  const mk = await j('POST', '/api/users', { username: 'sarika', displayName: 'سارکا آزمون', password: 'Sarika@1404' }, ownerCookie)
  const mkOk = (mk.status === 200 || mk.status === 201 || mk.status === 409 || /موجود|already|duplicate/i.test(JSON.stringify(mk.data)))
  check('owner creates user via admin API', mkOk, `status=${mk.status}`)
  check('created user has role USER', (mk.data?.user?.role ?? 'USER') === 'USER', JSON.stringify(mk.data?.user ?? {}).slice(0, 80))

  // ورود کاربر عادی
  const userLogin = await j('POST', '/api/auth/login', { username: 'sarika', password: 'Sarika@1404' })
  const userCookie = cookieOf(userLogin)
  check('user login', userLogin.status === 200 && userCookie, `role=${userLogin.data?.user?.role}`)

  // ── ۳) ایزولاسیون نقش‌ها ──
  const usersAsUser = await j('GET', '/api/users', null, userCookie)
  check('user CANNOT list users (OWNER-only API)', usersAsUser.status === 403, `status=${usersAsUser.status}`)
  const usersAsOwner = await j('GET', '/api/users', null, ownerCookie)
  check('owner CAN list users', usersAsOwner.status === 200, `count=${usersAsOwner.data?.users?.length}`)

  // بدون نشست → 401
  const anon = await j('GET', '/api/tasks')
  check('anonymous blocked (401)', anon.status === 401, `status=${anon.status}`)

  // ── ۴) وظایف + جداسازی داده ──
  const t1 = await j('POST', '/api/tasks', { title: 'کار آزمون مالک', priority: 'high' }, ownerCookie)
  check('owner creates task', t1.status === 200 || t1.status === 201, `status=${t1.status}`)
  const t2 = await j('POST', '/api/tasks', { title: 'کار آزمون کاربر', priority: 'normal' }, userCookie)
  check('user creates own task', t2.status === 200 || t2.status === 201, `status=${t2.status}`)
  const ownerTasks = await j('GET', '/api/tasks', null, ownerCookie)
  const ownerSeesUserTask = JSON.stringify(ownerTasks.data).includes('کار آزمون کاربر')
  check('owner does NOT see user task (isolation)', !ownerSeesUserTask)
  const userTasks = await j('GET', '/api/tasks', null, userCookie)
  const userSeesOwnerTask = JSON.stringify(userTasks.data).includes('کار آزمون مالک')
  check('user does NOT see owner task (isolation)', !userSeesOwnerTask)

  // ── ۵) یادآور ──
  const future = new Date(Date.now() + 3600_000).toISOString()
  const rem = await j('POST', '/api/reminders', { message: 'یادآور آزمون زنده', remindAt: future }, ownerCookie)
  check('reminder created (future time)', rem.status === 200 || rem.status === 201, `status=${rem.status}`)
  const rems = await j('GET', '/api/reminders', null, ownerCookie)
  const remJson = JSON.stringify(rems.data)
  check('reminder listed with id+message+remindAt', remJson.includes('یادآور آزمون زنده') && remJson.includes('id'))

  // ── ۶) مالی ──
  const acc = await j('POST', '/api/finance/accounts', { name: 'حساب اصلی', kind: 'cash', openingBalance: 0 }, ownerCookie)
  check('finance account created', acc.status === 200 || acc.status === 201, `status=${acc.status}`)
  const accId = acc.data?.account?.id ?? acc.data?.id
  const trx = await j('POST', '/api/finance/transactions', { type: 'expense', amount: 150000, accountId: accId, category: 'خوراک', note: 'ناهار آزمون' }, ownerCookie)
  check('finance transaction created', trx.status === 200 || trx.status === 201, `status=${trx.status}`)
  const trxs = await j('GET', '/api/finance/transactions', null, ownerCookie)
  check('finance list returns transaction', JSON.stringify(trxs.data).includes('ناهار آزمون'))

  // ── ۷) موتور AI: وضعیت + انتخاب مدل میزبان + چت واقعی ──
  const aiStatus = await j('GET', '/api/settings/ai', null, ownerCookie)
  check('ai settings endpoint', aiStatus.status === 200, JSON.stringify(aiStatus.data).slice(0, 120))
  const setZai = await j('PUT', '/api/settings/ai', { engine: 'zai' }, ownerCookie)
  check('engine zai accepted', setZai.status === 200, `status=${setZai.status} ${JSON.stringify(setZai.data).slice(0, 80)}`)

  // فاصله برای پنجرهٔ نرخ درخواست (۱۰/دقیقه در چت)
  await new Promise((r) => setTimeout(r, 62_000))

  const chat = await j('POST', '/api/chat', { message: 'سلام! خودت را در یک جمله معرفی کن.' }, ownerCookie)
  const chatText = typeof chat.data === 'string' ? chat.data : JSON.stringify(chat.data)
  check('REAL AI chat reply (zai hosted model)', chat.status === 200 && chatText.length > 20, `status=${chat.status} len=${chatText.length} sample=${chatText.slice(0, 60)}`)
  const chatCtx = await j('POST', '/api/chat', { message: 'اسم من رضاست. به خاطر بسپار.' }, ownerCookie)
  const ctx1 = typeof chatCtx.data === 'string' ? chatCtx.data : JSON.stringify(chatCtx.data)
  await new Promise((r) => setTimeout(r, 16_000))
  const chatCtx2 = await j('POST', '/api/chat', { message: 'اسم من چیست؟ فقط اسم را بگو.' }, ownerCookie)
  const ctx2 = typeof chatCtx2.data === 'string' ? chatCtx2.data : JSON.stringify(chatCtx2.data)
  check('AI multi-turn context (name remembered)', chatCtx2.status === 200 && ctx2.includes('رضا'), `len2=${ctx2.length} sample=${ctx2.slice(0, 60)}`)

  // استریم
  const streamRes = await fetch(BASE + '/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': ownerCookie || '' },
    body: JSON.stringify({ message: 'یک جمله کوتاه دربارهٔ بهار بگو.' }),
  })
  let streamLen = 0, streamOk = false
  if (streamRes.body) {
    const reader = streamRes.body.getReader()
    const dec = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      streamLen += value.length
      if (dec.decode(value, { stream: true }).includes('data:')) streamOk = true
    }
  }
  check('AI streaming SSE works', streamRes.status === 200 && streamLen > 50 && streamOk, `bytes=${streamLen} status=${streamRes.status}`)

  // ── ۸) اقدام Agent (چت → اجرای عملیات) ──
  await new Promise((r) => setTimeout(r, 16_000))
  const agent = await j('POST', '/api/chat', { message: 'یک وظیفه با عنوان «تماس با بانک» برای فردا اضافه کن' }, ownerCookie)
  const agentText = typeof agent.data === 'string' ? agent.data : JSON.stringify(agent.data)
  const agentOk = agent.status === 200
  const taskCreated = agentOk && (agentText.includes('تماس با بانک') || agentText.includes('افزود'))
  check('agent action: add task via chat', agentOk && taskCreated, `status=${agent.status} sample=${agentText.slice(0, 80)}`)
  const ownerTasks2 = await j('GET', '/api/tasks', null, ownerCookie)
  check('agent-created task really exists in DB', JSON.stringify(ownerTasks2.data).includes('تماس با بانک'))

  // ── ۹) مدیریت کلیدها (بدون نشت) ──
  const setKey = await j('PUT', '/api/settings/ai', { engine: 'openai_compatible', endpointUrl: 'https://api.openai.com/v1', endpointModel: 'gpt-4o-mini', endpointKey: 'sk-test-1234567890abcdef' }, ownerCookie)
  check('user key saved (server-side)', setKey.status === 200, `status=${setKey.status}`)
  const keyStatus = await j('GET', '/api/settings/ai', null, ownerCookie)
  const keyJson = JSON.stringify(keyStatus.data)
  check('saved key NEVER returned (masked only)', !keyJson.includes('sk-test-1234567890abcdef'), keyJson.slice(0, 140))
  // کلید کاربر به کاربر دیگر نشت نکند
  const keyAsUser = await j('GET', '/api/settings/ai', null, userCookie)
  check('owner key not visible to other user', !JSON.stringify(keyAsUser.data).includes('sk-test'), JSON.stringify(keyAsUser.data).slice(0, 100))
  // برگشت به مدل میزبان
  await j('PUT', '/api/settings/ai', { engine: 'zai' }, ownerCookie)

  // ── ۱۰) خروج و انقضا ──
  const logout = await j('POST', '/api/auth/logout', null, userCookie)
  check('logout works', logout.status === 200, `status=${logout.status}`)
  const afterLogout = await j('GET', '/api/tasks', null, userCookie)
  check('session invalidated after logout', afterLogout.status === 401, `status=${afterLogout.status}`)

  console.log(results.join('\n'))
  console.log(`\n== TOTAL: ${pass} PASS / ${fail} FAIL ==`)
  fs.writeFileSync('/tmp/live-test-results.txt', results.join('\n') + `\nTOTAL: ${pass} PASS / ${fail} FAIL\n`)
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => { console.error('FATAL', e); process.exit(2) })
