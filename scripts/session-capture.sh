#!/bin/bash
# جلسهٔ واحد: سرور + بذر دادهٔ نمایشی + اسکرین‌شات‌های v2
set -e
cd /home/z/my-project
export $(rg -v "^#" .env | rg "DATABASE_URL" | xargs) 2>/dev/null || true

# ۱) سرور
if ! curl -s -m 3 http://localhost:3000/api/health > /dev/null 2>&1; then
  bun run start > server.log 2>&1 &
fi
for i in $(seq 1 25); do curl -s -m 2 http://localhost:3000/api/health > /dev/null 2>&1 && break; sleep 1; done
echo "SERVER: $(curl -s -m 3 http://localhost:3000/api/health)"

# ۲) بذر دادهٔ نمایشی (وظایف/مالی/یادآور) — فقط اگر خالی‌اند
node - << 'EOF'
const BASE = 'http://localhost:3000'
async function j(method, path, body, cookie) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie || '' }, body: body ? JSON.stringify(body) : undefined })
  const sc = r.headers.get('set-cookie') || ''
  return { status: r.status, data: await r.json().catch(() => null), cookie: (sc.match(/rahyar_session=[^;]+/) || [null])[0] }
}
async function main() {
  const login = await j('POST', '/api/auth/login', { username: 'owner', password: 'Rahyar@1404' })
  const c = login.cookie
  const tasks = await j('GET', '/api/tasks', null, c)
  const count = (tasks.data?.tasks ?? tasks.data ?? []).length
  if (count < 3) {
    await j('POST', '/api/tasks', { title: 'خرید هفتگی', priority: 'normal', notes: 'میوه و لبنیات' }, c)
    await j('POST', '/api/tasks', { title: 'پرداخت قبض برق', priority: 'high' }, c)
    await j('POST', '/api/tasks', { title: 'تمرین روزانه زبان انگلیسی', priority: 'low' }, c)
    console.log('seeded tasks')
  }
  const accs = await j('GET', '/api/finance/accounts', null, c)
  const accCount = (accs.data?.accounts ?? []).length
  let accId = accs.data?.accounts?.[0]?.id
  if (!accId) {
    const a = await j('POST', '/api/finance/accounts', { name: 'نقدی', kind: 'cash', openingBalance: 2500000 }, c)
    accId = a.data?.account?.id ?? a.data?.id
  }
  const trxs = await j('GET', '/api/finance/transactions', null, c)
  if ((trxs.data?.transactions ?? []).length < 3) {
    await j('POST', '/api/finance/transactions', { type: 'income', amount: 15000000, accountId: accId, category: 'حقوق', note: 'حقوق ماهانه' }, c)
    await j('POST', '/api/finance/transactions', { type: 'expense', amount: 450000, accountId: accId, category: 'خوراک', note: 'خرید سوپرمارکت' }, c)
    await j('POST', '/api/finance/transactions', { type: 'expense', amount: 220000, accountId: accId, category: 'حمل‌ونقل', note: 'بنزین' }, c)
    console.log('seeded finance')
  }
  const rems = await j('GET', '/api/reminders', null, c)
  if ((rems.data?.reminders ?? []).length < 1) {
    await j('POST', '/api/reminders', { message: 'تماس با بانک دربارهٔ صورت‌حساب', remindAt: new Date(Date.now() + 3 * 3600_000).toISOString() }, c)
    console.log('seeded reminder')
  }
  // یک تبادل واقعی چت با مدل میزبان (برای تصویر گفتگو)
  const hist = await j('GET', '/api/chat', null, c)
  const msgs = hist.data?.messages ?? []
  if (msgs.length < 2) {
    const chat = await j('POST', '/api/chat', { message: 'سلام! در دو جمله خودت را معرفی کن و بگو چه کمکی می‌توانی بکنی.' }, c)
    console.log('seeded chat:', chat.status)
  }
  await j('PUT', '/api/settings/ai', { engine: 'zai' }, c)
  console.log('seed done')
}
main().catch(e => { console.error('seed error', e.message) })
EOF

# ۳) اسکرین‌شات‌ها
node scripts/capture-v2.cjs 2>&1 | tail -25
ls download/screenshots-v2/ | head -25