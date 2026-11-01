#!/usr/bin/env bash
# ─── P0-6R FINAL — مجموعهٔ آزمون T1..T7 (mint fail-closed) + گاردهای C3/C4/C7 ───
# خروجی آزمون هیچ secretی نمایش نمی‌دهد. توقف کامل در اولین شکست.
set -u
cd /home/z/my-project

TMP=$(mktemp -d /tmp/p06r-test-XXXX)
trap 'rm -rf "$TMP"' EXIT
export DATABASE_URL="file:$TMP/test.db"
export RAHYAR_TOKEN_FILE="$TMP/token.txt"
TPW=$(openssl rand -base64 24 | tr '+/' 'Aa')   # رمز آزمون — فقط در حافظه
FAIL=0
say() { printf '%s\n' "$*"; }

# آماده‌سازی DB آزمون
bunx prisma db push --skip-generate >/dev/null 2>&1 || { say "T0 SETUP FAIL (prisma push)"; exit 1; }

count_rows() { python3 - "$TMP/test.db" "$1" <<'PY'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
print(con.execute(f"SELECT COUNT(*) FROM \"{sys.argv[2]}\"").fetchone()[0])
PY
}

hygiene() { # $1=output-file $2=secret → 0 اگر secret در خروجی نبود
  if [ -f "$1" ] && grep -qF -- "$2" "$1"; then return 1; fi
  return 0
}

## T1 — مسیر موفق: رمز معتبر env → خروجی صفر، owner+session ساخته می‌شود
set +e
RAHYAR_EVIDENCE_PASSWORD="$TPW" bun scripts/mint-evidence-session.mjs >"$TMP/t1.out" 2>&1
T1C=$?
set -e
OWNERS=$(count_rows User); SESS=$(count_rows Session)
TOKF_OK=$([ -f "$RAHYAR_TOKEN_FILE" ] && [ "$(stat -c %a "$RAHYAR_TOKEN_FILE")" = "600" ] && echo yes || echo no)
EXP_OK=$(python3 - "$TMP/test.db" <<'PY'
import sqlite3, sys, datetime
con = sqlite3.connect(sys.argv[1])
r = con.execute("SELECT MAX(expiresAt) FROM \"Session\"").fetchone()[0]
if isinstance(r, (int, float)):
    d = datetime.datetime.fromtimestamp(r / 1000, datetime.timezone.utc)
else:
    d = datetime.datetime.fromisoformat(str(r).replace('Z', '+00:00'))
print("yes" if d > datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=23) else "no")
PY
)
if [ "$T1C" -eq 0 ] && [ "$OWNERS" = "1" ] && [ "$SESS" = "1" ] && [ "$TOKF_OK" = "yes" ] && [ "$EXP_OK" = "yes" ] && hygiene "$TMP/t1.out" "$TPW"; then
  say "T1 PASS (success path, owner=1, session=1, token 0600, expiry>23h, hygiene OK)"
else
  say "T1 FAIL (exit=$T1C owners=$OWNERS sessions=$SESS tokenfile=$TOKF_OK expiry=$EXP_OK)"; FAIL=1
fi

## T2 — نبود env → توقف کامل، بدون ساخت session/توکن
rm -f "$RAHYAR_TOKEN_FILE"
set +e
env -u RAHYAR_EVIDENCE_PASSWORD bun scripts/mint-evidence-session.mjs >"$TMP/t2.out" 2>&1
T2C=$?
set -e
SESS2=$(count_rows Session)
if [ "$T2C" -ne 0 ] && [ "$SESS2" = "1" ] && [ ! -f "$RAHYAR_TOKEN_FILE" ] && hygiene "$TMP/t2.out" "$TPW"; then
  say "T2 PASS (missing env → abort, no session, no token file)"
else
  say "T2 FAIL (exit=$T2C sessions=$SESS2)"; FAIL=1
fi

## T3 — رمز کوتاه (policy طول ≥۱۲) → توقف
set +e
RAHYAR_EVIDENCE_PASSWORD="short12X" bun scripts/mint-evidence-session.mjs >"$TMP/t3.out" 2>&1
T3C=$?
set -e
SESS3=$(count_rows Session)
if [ "$T3C" -ne 0 ] && [ "$SESS3" = "1" ]; then
  say "T3 PASS (short password → abort)"
else
  say "T3 FAIL (exit=$T3C sessions=$SESS3)"; FAIL=1
fi

## T4 — بهداشت خروجی: هیچ‌کدام از خروجی‌ها رمز آزمون را ندارند
if hygiene "$TMP/t1.out" "$TPW" && hygiene "$TMP/t2.out" "$TPW" && hygiene "$TMP/t3.out" "$TPW"; then
  say "T4 PASS (no secret in any test output)"
else
  say "T4 FAIL"; FAIL=1
fi

## T5 — اجرای مجدد با همان رمز → owner تکراری نمی‌سازد
set +e
RAHYAR_EVIDENCE_PASSWORD="$TPW" bun scripts/mint-evidence-session.mjs >"$TMP/t5.out" 2>&1
T5C=$?
set -e
OWNERS5=$(count_rows User)
if [ "$T5C" -eq 0 ] && [ "$OWNERS5" = "1" ]; then
  say "T5 PASS (idempotent owner, no duplicate)"
else
  say "T5 FAIL (exit=$T5C owners=$OWNERS5)"; FAIL=1
fi

## T6 — بهداشت فایل توکن: بدون رمز، دسترسی 600
if hygiene "$RAHYAR_TOKEN_FILE" "$TPW" && [ "$(stat -c %a "$RAHYAR_TOKEN_FILE")" = "600" ]; then
  say "T6 PASS (token file has no password, mode 600)"
else
  say "T6 FAIL"; FAIL=1
fi

## T7 — DATABASE_URL نامعتبر → شکست تمیز، بدون چاپ رمز
set +e
DATABASE_URL="file:/nonexistent-dir-xyz/broken.db" RAHYAR_EVIDENCE_PASSWORD="$TPW" bun scripts/mint-evidence-session.mjs >"$TMP/t7.out" 2>&1
T7C=$?
set -e
if [ "$T7C" -ne 0 ] && hygiene "$TMP/t7.out" "$TPW"; then
  say "T7 PASS (bad DB → clean failure, hygiene OK)"
else
  say "T7 FAIL (exit=$T7C)"; FAIL=1
fi

## گارد C7 — audit-screens.mjs: بدون مقدار C7 + fail-closed بدون env
python3 scripts/tests/fp-scan.py scripts/audit-screens.mjs 46d0a91d1e48 >"$TMP/g7.out" 2>&1
if grep -q "CLEAN" "$TMP/g7.out"; then
  say "G-C7 PASS (no C7 value in audit-screens.mjs)"
else
  say "G-C7 FAIL"; FAIL=1
fi
set +e
env -u RAHYAR_EVIDENCE_PASSWORD timeout 60 bun scripts/audit-screens.mjs >"$TMP/g7b.out" 2>&1
G7C=$?
set -e
if [ "$G7C" -ne 0 ] && grep -q "RAHYAR_EVIDENCE_PASSWORD" "$TMP/g7b.out"; then
  say "G-C7b PASS (audit-screens fails closed without env)"
else
  say "G-C7b FAIL (exit=$G7C)"; FAIL=1
fi

## گارد C3/C4 — اسکریپت‌های build بدون مقدار + syntax سالم
for f in scripts/build-android-apk.sh scripts/build-android-rebuild.sh scripts/build-android-apk-v11.sh; do
  python3 scripts/tests/fp-scan.py "$f" f60ed56a9c82 dd65b755befe >"$TMP/g34.out" 2>&1
  if grep -q "CLEAN" "$TMP/g34.out" && bash -n "$f" 2>/dev/null; then
    say "G-C34 PASS ($f clean + syntax OK)"
  else
    say "G-C34 FAIL ($f)"; FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then say "ALL-PASS"; else say "SOME-FAILED"; fi
exit $FAIL
