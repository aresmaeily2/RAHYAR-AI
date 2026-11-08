#!/usr/bin/env python3
# F7 — تطبیق مستقل مالی: هم‌زمانی با ref تازه + محاسبهٔ مانده از DB خام و مقایسه با API
import concurrent.futures, json, sqlite3, urllib.request, http.cookiejar, re, sys

B = 'http://127.0.0.1:3001'
OP = re.search(r'owner_password=(.*)', open('/home/z/my-project/artifacts/credentials/f8-credentials.txt').read()).group(1).strip()

cj = http.cookiejar.CookieJar()
# نشست cookie از سرور Secure ست می‌شود ولی روی http://127.0.0.1 است؛
# cookiejar پایتون کوکی Secure را روی http نمی‌فرستد — هدر را دستی می‌بریم
SESSION = {}
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
def api(path, data=None, method=None):
    req = urllib.request.Request(B + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers={'Content-Type': 'application/json', 'Origin': B,
                                          **({'Cookie': SESSION['v']} if SESSION.get('v') else {})}, method=method)
    try:
        resp = op.open(req, timeout=30)
        sc = resp.headers.get_all('Set-Cookie') or []
        for c in sc:
            if c.startswith('rahyar_session='):
                SESSION['v'] = c.split(';')[0]
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {'_http_error': e.code, 'body': e.read().decode()[:200]}

r = api('/api/auth/login', {'username': 'owner', 'password': OP})
print('login ok:', r.get('ok'))
assert SESSION.get('v'), 'no session cookie captured'

# ── [1] هم‌زمانی: ۵ درخواست موازی با ref تازه ─────────────────
accs = api('/api/finance/accounts')
acc = accs['accounts'][0]['id'] if 'accounts' in accs else accs[0]['id']
REF = 'f8-conc-' + __import__('uuid').uuid4().hex[:12]
def post(i):
    req = urllib.request.Request(B + '/api/finance/transactions',
        data=json.dumps({'type': 'expense', 'amount': 7000 + i, 'accountId': acc,
                         'category': 'other', 'source': 'manual', 'externalRef': REF}).encode(),
        headers={'Content-Type': 'application/json', 'Origin': B,
                 'Cookie': SESSION.get('v', '')})
    try:
        d = json.loads(urllib.request.urlopen(req, timeout=30).read())
        t = d.get('transaction', {})
        return ('ok' if not t.get('duplicate') else 'dup')
    except Exception as e:
        return 'err:' + str(e)[:40]
with concurrent.futures.ThreadPoolExecutor(5) as ex:
    res = list(ex.map(post, range(5)))
print('concurrent5(fresh-ref):', res, 'ok=', res.count('ok'), 'dup=', res.count('dup'))

# ── [2] شمارش DB خام برای همان ref ────────────────────────────
db = sqlite3.connect('/tmp/f8-main.db')
n = db.execute("SELECT count(*) FROM FinanceTransaction WHERE externalRef=?", (REF,)).fetchone()[0]
print('db-rows-for-ref =', n, '(expect 1)')

# ── [3] تطبیق ماندهٔ همهٔ حساب‌ها: opening + income - expense + transfer دوجانبه ──
rows = db.execute("""
  SELECT a.id, a.name, a.openingAmount,
    COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount
                      WHEN t.type='transfer' THEN -t.amount END),0) AS outSum,
    COALESCE((SELECT SUM(t2.amount) FROM FinanceTransaction t2
              WHERE t2.toAccountId=a.id AND t2.type='transfer'),0) AS inSum
  FROM FinanceAccount a LEFT JOIN FinanceTransaction t ON t.accountId=a.id
  WHERE a.userId=(SELECT id FROM User WHERE username='owner')
  GROUP BY a.id""").fetchall()
api_acc = api('/api/finance/accounts')
api_list = api_acc['accounts'] if 'accounts' in api_acc else api_acc
assert isinstance(api_list, list), f'accounts API failed: {api_acc}'
api_by_id = {a['id']: a for a in api_list}
allok = True
for aid, name, opening, outS, inS in rows:
    expected = (opening or 0) + outS + inS
    actual = api_by_id.get(aid, {}).get('balance')
    okk = (expected == actual)
    allok = allok and okk
    print(f'account {name}: db-math={expected} api={actual} {"OK" if okk else "MISMATCH"}')
print('RECONCILIATION-ALL-OK =', allok)
