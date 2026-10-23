// مدرک رفع V23-FIX: فرمان «پنجشنبه» از مسیر مدل → تبدیل قطعی → تاریخ صحیح
const BASE = process.env.BASE || 'http://localhost:3100'
const fs = require('fs')
async function j(method, path, body, cookie) {
  const h = { 'Content-Type': 'application/json' }
  if (cookie) h['Cookie'] = cookie
  const t0 = Date.now()
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  return { status: r.status, data: await r.json().catch(() => null), cookie: m ? m[0] : null, ms: Date.now() - t0 }
}
async function main() {
  const login = await j('POST', '/api/auth/login', { username: 'owner', password: 'Rahyar@1404' })
  const ck = login.cookie
  const ev = { timestamp: new Date().toISOString(), fix: 'V23-FIX weekday resolution', today_tehran: '2026-10-23 (جمعه)', tests: [] }
  const cases = [
    ['پنجشنبه', 'لطفاً یک وظیفه با عنوان «جلسهٔ فصلی تیم» برای پنجشنبه ساعت ۱۸ بساز', '2026-10-29'],
    ['شنبه', 'یک وظیفه با عنوان «خرید هفتگی» برای شنبه اضافه کن', '2026-10-24'],
  ]
  for (const [dayName, q, expectIso] of cases) {
    const t = await j('POST', '/api/chat', { message: q, clientKey: 'fix-verify-' + Date.now() }, ck)
    const acts = t.data?.actions || []
    const due = acts[0]?.task?.dueDate || null
    ev.tests.push({
      dayName, input: q, status: t.status, ms: t.ms, mode: t.data?.mode,
      action_types: acts.map(a => a.type), dueDate_recorded: due, expected: expectIso,
      pass: due === expectIso,
      reply: (t.data?.assistantMessage?.content || '').slice(0, 200),
    })
    console.log(dayName, '→', due, 'expected', expectIso, due === expectIso ? 'PASS' : 'FAIL', '(' + t.ms + 'ms, mode=' + t.data?.mode + ')')
    await new Promise(r => setTimeout(r, 6500))
  }
  fs.writeFileSync('/home/z/my-project/artifacts/verification/agent-weekday-fix-evidence.json', JSON.stringify(ev, null, 2))
  const allPass = ev.tests.every(x => x.pass)
  console.log('RESULT:', allPass ? 'ALL PASS' : 'HAS FAILURES')
  process.exit(allPass ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(1) })
