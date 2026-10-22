// مدرک Agent: فرمان واقعی → اجرای ابزار → تأیید دیتابیس (ورودی جدید)
const BASE = process.env.BASE || 'http://localhost:3100'
const fs = require('fs')
async function j(method, path, body, cookie) {
  const h = { 'Content-Type': 'application/json' }
  if (cookie) h['Cookie'] = cookie
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const sc = r.headers.get('set-cookie') || ''
  const m = sc.match(/rahyar_session=[^;]+/)
  return { status: r.status, data: await r.json().catch(() => null), cookie: m ? m[0] : null }
}
async function main() {
  const login = await j('POST', '/api/auth/login', { username: 'owner', password: 'Rahyar@1404' })
  const ck = login.cookie
  const uniq = 'گزارش فروش ' + (1000 + Math.floor(Math.random() * 9000))
  const q = `یک وظیفه با عنوان «${uniq}» برای فردا اضافه کن`
  const t = await j('POST', '/api/chat', { message: q, clientKey: 'agent-' + Date.now() }, ck)
  const acts = t.data?.actions || []
  const list = await j('GET', '/api/tasks', null, ck)
  const found = (list.data?.tasks || []).find((x) => (x.title || '') === uniq)
  const ev = {
    timestamp: new Date().toISOString(),
    input: q,
    mode: t.data?.mode,
    actions: acts,
    reply: (t.data?.assistantMessage?.content || '').slice(0, 300),
    db_verified: Boolean(found),
    task_record: found || null,
  }
  fs.writeFileSync('/home/z/my-project/artifacts/agent-real-evidence.json', JSON.stringify(ev, null, 2))
  console.log('mode=' + ev.mode, 'actions=' + acts.length, 'db_verified=' + ev.db_verified)
  console.log('reply:', ev.reply.slice(0, 200))
  if (found) console.log('task:', JSON.stringify({ id: found.id, title: found.title, dueDate: found.dueDate, priority: found.priority }))
}
main().catch((e) => { console.error(e); process.exit(1) })
