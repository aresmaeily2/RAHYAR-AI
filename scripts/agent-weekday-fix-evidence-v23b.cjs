// مدرک نهایی V23-FIX: با تاریخچهٔ تمیز + گزارش رفتار مدل
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
  const ev = { timestamp: new Date().toISOString(), note: 'V23-FIX — تاریخچهٔ چت تمیز شده قبل از آزمون', today_tehran: '2026-10-23 (جمعه)', tests: [] }
  // پاک‌سازی تاریخچه (DELETE /api/chat → فقط پیام خوش‌آمد)
  const clr = await j('DELETE', '/api/chat', null, ck)
  console.log('clear history:', clr.status)
  await new Promise(r => setTimeout(r, 1500))
  const cases = [
    ['پنجشنبه', 'لطفاً یک وظیفه با عنوان «جلسهٔ فصلی تیم» برای پنجشنبه ساعت ۱۸ بساز', '2026-10-29'],
    ['جمعه', 'وظیفهٔ «پاسخ به ایمیل‌ها» را برای جمعه ساعت ۱۰ ثبت کن', '2026-10-23'],
  ]
  for (const [dayName, q, expectIso] of cases) {
    const t = await j('POST', '/api/chat', { message: q, clientKey: 'fix-verify2-' + Date.now() }, ck)
    const acts = t.data?.actions || []
    const due = acts[0]?.task?.dueDate || null
    ev.tests.push({
      dayName, input: q, status: t.status, ms: t.ms, mode: t.data?.mode,
      action_types: acts.map(a => a.type), dueDate_recorded: due, expected: expectIso, pass: due === expectIso,
      reply: (t.data?.assistantMessage?.content || '').slice(0, 200),
    })
    console.log(dayName, '→', due, 'expected', expectIso, due === expectIso ? 'PASS' : 'FAIL', '(' + t.ms + 'ms, mode=' + t.data?.mode + ', actions=' + acts.map(a => a.type).join(',') + ')')
    await new Promise(r => setTimeout(r, 8000))
  }
  fs.writeFileSync('/home/z/my-project/artifacts/verification/agent-weekday-fix-evidence.json', JSON.stringify(ev, null, 2))
  console.log('RESULT:', ev.tests.every(x => x.pass) ? 'ALL PASS' : 'HAS FAILURES')
  process.exit(ev.tests.every(x => x.pass) ? 0 : 1)
}
main().catch(e => { console.error(e); process.exit(1) })
