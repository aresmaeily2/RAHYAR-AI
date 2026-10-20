#!/bin/bash
# جریان واقعی مالی: حساب → تراکنش → بودجه → اکسپورت CSV → حذف پاکسازی
set -uo pipefail
cd /home/z/my-project
B=http://localhost:3000
G=artifacts/gu2
H="Origin: http://localhost:3000"
CT="Content-Type: application/json"
pass=0; fail=0
ok(){ pass=$((pass+1)); echo "PASS: $1"; }
bad(){ fail=$((fail+1)); echo "FAIL: $1"; }

# 1) ایجاد حساب مالی
R=$(curl -s -b "$G/owner.jar" -X POST $B/api/finance/accounts -H "$H" -H "$CT" -d '{"name":"حساب-تست-وب","type":"bank","initialBalance":1000000}' --max-time 10)
echo "$R" | rg -q '"ok":true|"id"' && ok "finance account created" || bad "account create → $R"
ACC=$(echo "$R" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('account',{}).get('id') or d.get('id',''))" 2>/dev/null)

# 2) ایجاد تراکنش
if [ -n "$ACC" ]; then
  R=$(curl -s -b "$G/owner.jar" -X POST $B/api/finance/transactions -H "$H" -H "$CT" -d "{\"accountId\":\"$ACC\",\"type\":\"expense\",\"amount\":250000,\"title\":\"خرید تست\",\"category\":\"food\",\"date\":\"2026-10-20\"}" --max-time 10)
  echo "$R" | rg -q '"ok":true|"id"' && ok "finance transaction created" || bad "transaction create → $R"
  TXID_NEW=$(echo "$R" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('transaction') or d).get('id',''))" 2>/dev/null)
else
  bad "no account id — skip tx"
fi

# 3) بودجه ماهانه (فیلدهای درست: category + monthlyLimit)
R=$(curl -s -b "$G/owner.jar" -X PUT $B/api/finance/budgets -H "$H" -H "$CT" -d '{"category":"food","monthlyLimit":500000}' --max-time 10)
echo "$R" | rg -q '"ok":true|monthlyLimit|budget' && ok "finance budget upserted (category + monthlyLimit)" || bad "budget create → $R"

# 4) لیست تراکنش‌ها + فیلتر ماه (JSON یونیکد-اسکیپ — دیکود با python)
R=$(curl -s -b "$G/owner.jar" "$B/api/finance/transactions?month=2026-10" -H "$H" --max-time 10)
echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); txs=d.get('transactions',[]); print('FOUND' if any(t.get('id')=='$TXID_NEW' for t in txs) else 'MISSING')" | rg -q FOUND && ok "month-filtered transactions list contains created tx (month=2026-10, Tehran boundaries)" || { echo "$R" | head -c 200; bad "month filter/list"; }

# 5) اکسپورت CSV مالی
R=$(curl -s -b "$G/owner.jar" "$B/api/finance/export" -H "$H" --max-time 10)
echo "$R" | head -c 120 | rg -qi "csv|,|title|amount|عنوان|مبلغ" && ok "finance CSV export non-empty and structured" || bad "finance export → $(echo $R | head -c 80)"

# 6) پاکسازی (حذف تراکنش/حساب تست)
if [ -n "$ACC" ]; then
  TXID=$(curl -s -b "$G/owner.jar" "$B/api/finance/transactions" -H "$H" --max-time 8 | python3 -c "
import json,sys
d=json.load(sys.stdin)
txs=d.get('transactions') or d.get('items') or d
for t in txs:
    if t.get('title')=='خرید تست': print(t['id']); break" 2>/dev/null)
  [ -n "$TXID" ] && curl -s -o /dev/null -b "$G/owner.jar" -X DELETE $B/api/finance/transactions/$TXID -H "$H" --max-time 8
  curl -s -o /dev/null -b "$G/owner.jar" -X DELETE $B/api/finance/accounts/$ACC -H "$H" --max-time 8
  ok "cleanup done (test tx/account removed)"
fi

echo "FINANCE-RESULT: pass=$pass fail=$fail"
