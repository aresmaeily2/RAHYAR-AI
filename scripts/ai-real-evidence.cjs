// ─── مدرک اجباری سؤال ۱: هوش مصنوعی واقعی با ورودی کاملاً جدید ───
// ورودی‌های ناآشنا + درخواست عمل (Agent) → ذخیرهٔ پاسخ واقعی مدل
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
  console.log('login:', login.status, login.data?.user?.role)

  const evidence = { timestamp: new Date().toISOString(), base: BASE, model_engine: 'zai (hosted glm)', tests: [] }

  // آزمون ۱ — سؤال ناآشنا (محتوای تولیدی مدل، نه پاسخ ثابت)
  const q1 = 'به فارسی در دو جمله بگو فضاچه (نقاشی با نور و تاریکی) چیست و چرا در قرن هفدهم معنایش عوض شد؟'
  const t1 = await j('POST', '/api/chat', { message: q1, clientKey: 'evidence-' + Date.now() }, ck)
  const reply1 = t1.data?.assistantMessage?.content || ''
  evidence.tests.push({
    id: 'A — تولید متن آزاد (سؤال ناآشنا)',
    input: q1,
    mode: t1.data?.mode,
    reply_chars: reply1.length,
    reply_sample: reply1.slice(0, 400),
    repeatable: true,
  })
  console.log('\n[A] mode=' + t1.data?.mode + ' chars=' + reply1.length)
  console.log(reply1.slice(0, 300))

  // آزمون ۲ — عمل واقعی Agent: افزودن وظیفه با تاریخ مشخص از دل جمله
  const q2 = 'لطفاً برای پنجشنبه ساعت ۱۸ یک وظیفه با عنوان «بازبینی گزارش مالی ربع» با اولویت بالا بساز'
  const t2 = await j('POST', '/api/chat', { message: q2, clientKey: 'evidence-' + Date.now() }, ck)
  const acts = t2.data?.actions || []
  evidence.tests.push({
    id: 'B — اجرای ابزار واقعی (Agent → add_task)',
    input: q2,
    mode: t2.data?.mode,
    actions: acts,
    reply: (t2.data?.assistantMessage?.content || '').slice(0, 250),
  })
  console.log('\n[B] mode=' + t2.data?.mode + ' actions=' + JSON.stringify(acts).slice(0, 300))

  // آزمون ۳ — تأیید وجود وظیفه در دیتابیس
  const list = await j('GET', '/api/tasks', null, ck)
  const found = (list.data?.tasks || []).find((t) => (t.title || '').includes('بازبینی گزارش مالی ربع'))
  evidence.tests.push({
    id: 'C — تأیید نتیجه در پایگاه داده',
    found: Boolean(found),
    task: found || null,
  })
  console.log('\n[C] task found in DB:', Boolean(found), found ? ('due=' + found.dueDate + ' time=' + found.dueTime) : '')

  // آزمون ۴ — استریم واقعی SSE با ورودی جدید
  const q3 = 'در یک جمله بگو آسمان چرا آبی است؟'
  const r3 = await fetch(BASE + '/api/chat/stream', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck },
    body: JSON.stringify({ message: q3 }),
  })
  const raw = await r3.text()
  const sseBytes = raw.length
  const sseSample = raw.slice(0, 300)
  evidence.tests.push({ id: 'D — استریم SSE واقعی', input: q3, status: r3.status, bytes: sseBytes, sample: sseSample })
  console.log('\n[D] stream status=' + r3.status + ' bytes=' + sseBytes)

  fs.writeFileSync('/home/z/my-project/artifacts/ai-real-evidence.json', JSON.stringify(evidence, null, 2))
  console.log('\nSAVED: artifacts/ai-real-evidence.json')
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
