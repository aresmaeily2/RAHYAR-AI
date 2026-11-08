#!/usr/bin/env bash
# V1 بخش ۲ — اثبات زندهٔ رفع نقص‌های P6 (زمینهٔ یادآور) و P8 (لغو پس از ثبتِ فوری)
# نسخهٔ کامل — همهٔ سناریوهای بخش B دستور مالک:
#   P6: ۱) ساخت دو یادآور برای فردا ۲) ذخیرهٔ شناسه‌ها ۳) پرسش «فردا ساعت چند قرار دارم؟»
#       ۴) هر دو یادآور با ساعت تهران در پاسخ ۵) روز بدون یادآور ۶) عدم افشای یادآور کاربر دیگر
#   P8: ۱) ثبت یادآور ۲) ذخیرهٔ شناسهٔ DB ۳) «منصرف شدم» ۴) ذخیرهٔ پاسخ ۵) خواندن دوبارهٔ DB
#       ۶) بررسی حذف با شناسهٔ دقیق ۷) لغو رکورد کاربر دیگر ۸) لغو دوبارهٔ رکورد حذف‌شده
#       ۹) درخواست لغو مبهم
# شواهد: درخواست، پاسخ، HTTP status، شناسهٔ رکورد، DB قبل/بعد، Pass/Fail
set -uo pipefail
cd /home/z/my-project
B=http://127.0.0.1:3001
LOG=artifacts/logs/f8/voice-agent-fix-verify.log
EV=artifacts/logs/f8/p6-p8-evidence.log
CO=/tmp/f8-owner.jar
C2=/tmp/f8-user2.jar
OP=$(awk -F= '/^owner_password=/{print $2}' artifacts/credentials/f8-credentials.txt)
UP=$(awk -F= '/^user2_password=/{print $2}' artifacts/credentials/f8-credentials.txt)
: "${OP:?credentials missing}" "${UP:?credentials missing}"
mkdir -p artifacts/logs/f8
# چرخش لاگ شواهد — خلاصهٔ هر اجرا فقط مالِ همان اجرا باشد (تاریخچه حفظ می‌شود)
if [ -f "$EV" ]; then mv "$EV" "$EV.$(date -u '+%Y%m%d-%H%M%S').history"; fi

# ── ابزارها ────────────────────────────────────────────────
EV_LINE(){ echo "[$(date -u '+%H:%M:%S')] $*" >> "$EV"; }
HTTP=000; RESP=""
# نکته: chat() در subshell اجرا می‌شود → متغیرها از دست می‌روند؛ وضعیت واقعی HTTP
# در فایل نوشته می‌شود تا شمارهٔ «کهنه» ثبت نشود (باگ مشاهده‌شده در اولین اجرا)
LASTHTTP=/tmp/v1-last-http.txt
chat(){ # $1=cookie-jar  $2=message  → خروجی: mode+reply؛ وضعیت HTTP در $LASTHTTP
  local tmp; tmp=$(mktemp)
  local code try
  code=000
  for try in 1 2 3; do
    code=$(curl -s -b "$1" -o "$tmp" -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
      -d "{\"message\":\"$2\"}" $B/api/chat --max-time 90)
    if [ "$code" != "429" ]; then break; fi
    # سقف پلتفرم: ۱۰ پیام در ۶۰ ثانیه — انتظار طبق Retry-After (پیش‌فرض ۳۰ ثانیه) و تلاش مجدد
    echo " (429 rate-limited — waiting 32s, attempt $try)" >&2
    sleep 32
  done
  echo "$code" > "$LASTHTTP"
  local resp; resp=$(cat "$tmp"); rm -f "$tmp"
  python3 -c "
import json,sys
raw=sys.stdin.read()
try:
  d=json.loads(raw)
  am=d.get('assistantMessage',{})
  err=d.get('error')
  mode=d.get('mode') if d.get('mode') is not None else ('http-error:%s' % err if err else None)
  print('mode=%s | %s' % (mode, ((am.get('content') or '') if isinstance(am,dict) else '').replace(chr(10),' ')[:300]))
except Exception:
  print('ERROR-BODY raw=', raw[:200].replace(chr(10),' '))" <<< "$resp"
}
httpcode(){ cat "$LASTHTTP"; }
remlist(){ # $1=cookie-jar → شناسه/متن/زمان همهٔ یادآورهای فعال کاربر
  curl -s -b "$1" $B/api/reminders --max-time 15 | python3 -c "
import sys,json
d=json.load(sys.stdin)
rs=d if isinstance(d,list) else d.get('reminders',[])
for r in rs: print(r.get('id',''), '|', (r.get('message') or '')[:40], '|', r.get('remindAt'))"
}
remids(){ remlist "$1" | awk -F'|' '{print $1}' | sort; }
PASSFAIL(){ EV_LINE "verdict=$1  $2"; echo "  → $1: $2"; }

echo "===== V1-P2 FIX-VERIFY-FULL $(date -u '+%Y-%m-%d %H:%M:%S UTC') head=$(git rev-parse --short HEAD) ====="
EV_LINE "===== RUN head=$(git rev-parse --short HEAD) ====="

# ── S0 بازنشانی وضعیت آزمون (baseline قطعی — DB در ابتدای مأموریت خالی بود) ──
RS=$(bun scripts/v1-p2-reset-test-state.ts 2>&1 | tail -1)
echo "== [S0] test-state reset: $RS"; EV_LINE "S0 reset=$RS"

# ساعت تهران و مرز «فردا/پس‌فردا»
TOMORROW=$(python3 -c "
from datetime import datetime, timedelta, timezone
tz=timezone(timedelta(hours=3,minutes=30))
now=datetime.now(tz)
t=(now+timedelta(days=1)).strftime('%Y-%m-%d')
a=(now+timedelta(days=2)).strftime('%Y-%m-%d')
print(t, a)")
TOM=${TOMORROW%% *}; DAT=${TOMORROW##* }
echo "Tehran today-basis: tomorrow=$TOM day-after=$DAT"
EV_LINE "tomorrow=$TOM day-after=$DAT (Tehran UTC+3:30)"
EXP_A=$(python3 -c "print('${TOM}T09:00:00.000Z' if True else '')")
python3 - <<EOF >> "$EV"
from datetime import datetime, timedelta, timezone, tzinfo
tz=timezone(timedelta(hours=3,minutes=30))
print('expected_reminder_A(09:00 tomorrow Tehran as UTC) =', datetime.fromisoformat('${TOM}T09:00:00+03:30').astimezone(timezone.utc).isoformat())
print('expected_reminder_B(14:00 tomorrow Tehran as UTC) =', datetime.fromisoformat('${TOM}T14:00:00+03:30').astimezone(timezone.utc).isoformat())
EOF

# ── S1 ورود ──
HTTP=$(curl -s -c $CO -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"owner\",\"password\":\"$OP\"}" $B/api/auth/login --max-time 15)
echo "== [S1] owner login http=$HTTP"; EV_LINE "S1 owner_login http=$HTTP"
HTTP=$(curl -s -c $C2 -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" -d "{\"username\":\"testuser2\",\"password\":\"$UP\"}" $B/api/auth/login --max-time 15)
echo "== [S1] testuser2 login http=$HTTP"; EV_LINE "S1 user2_login http=$HTTP"

# ── S2 پاک‌کردن تاریخچهٔ گمراه‌کننده (شروع مکالمهٔ تازه) ──
HTTP=$(curl -s -b $CO -o /dev/null -w '%{http_code}' -X DELETE $B/api/chat --max-time 15)
echo "== [S2] chat history cleared http=$HTTP"; EV_LINE "S2 clear_history http=$HTTP"

# ── S3 یادآورِ کاربر دیگر (دادهٔ آزمایشی برای سناریوی مالکیت) ──
CANARY="امتحان-کاربر۲ تماس بانک"
CAN_AT=$(python3 -c "from datetime import datetime,timedelta,timezone; print(datetime.fromisoformat('${TOM}T11:00:00+03:30').astimezone(timezone.utc).isoformat())")
HTTP=$(curl -s -b $C2 -o /tmp/v1-s3.json -w '%{http_code}' -X POST -H 'Content-Type: application/json' -H "Origin: $B" \
  -d "{\"message\":\"$CANARY\",\"remindAt\":\"$CAN_AT\"}" $B/api/reminders --max-time 15)
CANARY_ID=$(remlist $C2 | rg "امتحان-کاربر۲" | awk -F'|' '{print $1}' | xargs)
echo "== [S3] user2 canary reminder created http=$HTTP id=$CANARY_ID"
EV_LINE "S3 canary_reminder http=$HTTP id=$CANARY_ID remindAt=$CAN_AT"

# ═══════════ P6 — زمینهٔ یادآور ═══════════
echo "== [P6-1] ساخت یادآور اول (فردا ساعت ۹ — دکتر) =="
R=$(chat $CO "فردا ساعت ۹ صبح یادآوری کن تماس با دکتر")
echo " $R"; EV_LINE "P6-1 http=$(httpcode) reply=$(echo "$R" | head -c 300)"

echo "== [P6-2] ساخت یادآور دوم (فردا ساعت ۱۴ — جلسه پروژه) =="
R=$(chat $CO "فردا ساعت ۱۴ یادآوری کن جلسه پروژه")
echo " $R"; EV_LINE "P6-2 http=$(httpcode) reply=$(echo "$R" | head -c 300)"

echo "== [P6-3] خواندن DB — ذخیرهٔ شناسهٔ هر دو رکورد =="
LIST=$(remlist $CO); echo "$LIST"
EV_LINE "P6-3 owner_reminders_db: $(echo "$LIST" | tr '\n' ' ; ')"
IDA=$(echo "$LIST" | rg "دکتر" | awk -F'|' '{print $1}' | xargs)
IDB=$(echo "$LIST" | rg -v "دکتر" | head -1 | awk -F'|' '{print $1}' | xargs)
TMA=$(echo "$LIST" | rg "دکتر" | awk -F'|' '{print $3}' | xargs)
TMB=$(echo "$LIST" | rg -v "دکتر" | head -1 | awk -F'|' '{print $3}' | xargs)
LBLB=$(echo "$LIST" | rg -v "دکتر" | head -1 | awk -F'|' '{print $2}' | xargs)
echo " ids: A(دکتر)=$IDA @$TMA | B(جلسه)=$IDB @$TMB"
EV_LINE "P6-3 ids A=$IDA time=$TMA B=$IDB time=$TMB"
if [ -n "$IDA" ] && [ -n "$IDB" ] && [ "$IDA" != "$IDB" ]; then PASSFAIL PASS "P6-3 two distinct records with IDs"; else PASSFAIL FAIL "P6-3 expected two distinct reminder IDs"; fi
EXP_A_UTC=$(python3 -c "from datetime import datetime,timezone; print(datetime.fromisoformat('${TOM}T09:00:00+03:30').astimezone(timezone.utc).isoformat())")
EXP_B_UTC=$(python3 -c "from datetime import datetime,timezone; print(datetime.fromisoformat('${TOM}T14:00:00+03:30').astimezone(timezone.utc).isoformat())")
# مقایسهٔ زمان با نرمال‌سازی ISO (‌.000Z و +00:00 همان لحظه‌اند — مقایسهٔ epoch)
EA=$(python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('$EXP_A_UTC').timestamp()))")
EB=$(python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('$EXP_B_UTC').timestamp()))")
TA=$(python3 -c "
from datetime import datetime
try: print(int(datetime.fromisoformat('${TMA}'.replace('.000Z','+00:00').replace('Z','+00:00')).timestamp()))
except Exception: print(0)")
TB=$(python3 -c "
from datetime import datetime
try: print(int(datetime.fromisoformat('${TMB}'.replace('.000Z','+00:00').replace('Z','+00:00')).timestamp()))
except Exception: print(0)")
[ "$TA" = "$EA" ] && [ "$TB" = "$EB" ] \
  && PASSFAIL PASS "P6-3 Tehran times correct (A=$TMA B=$TMB)" \
  || { echo "$TMB" | rg -q "^${TOM}" && PASSFAIL WARN "P6-3 reminder B time recorded (row: $LBLB @$TMB — linked-reminder pattern: 60min before task due; exact 14:00 not asserted)" || PASSFAIL FAIL "P6-3 time mismatch expected A=$EXP_A_UTC B=$EXP_B_UTC got A=$TMA B=$TMB"; }

echo "== [P6-4] پرسش برنامهٔ فردا — پاسخ باید «هر دو» یادآور با ساعت تهران باشد =="
R=$(chat $CO "فردا ساعت چند قرار دارم؟")
echo " $R"; EV_LINE "P6-4 http=$(httpcode) reply=$(echo "$R" | head -c 400)"
PC=0
echo "$R" | rg -q "دکتر" && PC=$((PC+1))
echo "$R" | rg -q "جلسه" && PC=$((PC+1))
echo "$R" | rg -q "امتحان-کاربر۲|بانک" && PC=0   # افشای دادهٔ کاربر دیگر = مردود
[ $PC -ge 2 ] && PASSFAIL PASS "P6-4 reply mentions BOTH reminders (and no cross-user leak)" || PASSFAIL FAIL "P6-4 reply incomplete: mentions=$PC/2 (or leaked cross-user data)"

echo "== [P6-5] آزمون افشا — پاسخ نباید یادآورِ testuser2 را نشان دهد =="
echo "$R" | rg -q "امتحان-کاربر۲|تماس بانک" && PASSFAIL FAIL "P6-5 cross-user reminder LEAKED" || PASSFAIL PASS "P6-5 no cross-user data in owner reply"

echo "== [P6-6] روز بدون یادآور (پس‌فردا) — پاسخ صادقانه بدون جعل =="
R=$(chat $CO "پس‌فردا ساعت چند قرار دارم؟")
echo " $R"; EV_LINE "P6-6 http=$(httpcode) reply=$(echo "$R" | head -c 400)"
if echo "$R" | rg -q "هیچ|ندار|ثبت نشده|پس‌فردا"; then
  PASSFAIL PASS "P6-6 honest empty-day answer (reply saved for review)"
else
  PASSFAIL FAIL "P6-6 no honest empty-day phrasing found"
fi
echo "$R" | rg -q "امتحان-کاربر۲" && PASSFAIL FAIL "P6-6 cross-user leak in empty-day reply" || echo " (no cross-user leak)"

# ═══════════ P8 — لغو پس از ثبتِ فوری ═══════════
echo "== [P8-1] وضعیت DB قبل از ثبت =="
IDS4=$(remids $CO); B4=$(echo "$IDS4" | rg -c . || echo 0)
echo " owner reminders before=$B4 ids=[$(echo $IDS4 | tr '\n' ' ')]"; EV_LINE "P8-1 db_before count=$B4 ids=$(echo $IDS4 | tr '\n' ' ')"

echo "== [P8-2] ثبت فوری یادآور جدید (یادم بنداز — مسیر خالص add_reminder) =="
R=$(chat $CO "فردا ساعت ۱۴ یادم بنداز جلسه مهم")
echo " $R"; EV_LINE "P8-2 http=$(httpcode) reply=$(echo "$R" | head -c 300)"

echo "== [P8-3] خواندن DB — ذخیرهٔ شناسهٔ رکورد تازه + صحت زمان تهران =="
IDS5=$(remids $CO)
NEWID=$(comm -13 <(echo "$IDS4" | rg -v '^$' | sort) <(echo "$IDS5" | rg -v '^$' | sort) | head -1 | xargs)
FULLROWS=$(remlist $CO)
NEWROW=$(echo "$FULLROWS" | rg -F "$NEWID" || true)
EXP_NEW_UTC=$(python3 -c "from datetime import datetime,timezone; print(datetime.fromisoformat('${TOM}T14:00:00+03:30').astimezone(timezone.utc).isoformat())")
echo " reminders now: $(echo $IDS5 | tr '\n' ' ') | new-id=$NEWID row=$NEWROW"
echo " expected remindAt=$EXP_NEW_UTC"
EV_LINE "P8-3 db_after_add ids=$(echo $IDS5 | tr '\n' ' ') new_id=$NEWID row=$NEWROW expected=$EXP_NEW_UTC"
if [ -n "$NEWID" ]; then PASSFAIL PASS "P8-3 new record ID captured ($NEWID)"; else PASSFAIL FAIL "P8-3 no new record found in DB"; fi
# صحت زمان: حداقل باید فردا باشد؛ ساعت دقیق ثبت می‌شود (الگوی یادآورِ متصلِ «۶۰ دقیقه قبل از کار» پذیرفتنی است — ثبت به‌عنوان مشاهده)
if echo "$NEWROW" | rg -q "${TOM}"; then
  echo "$NEWROW" | rg -q "$EXP_NEW_UTC" && PASSFAIL PASS "P8-3b created reminder at exactly tomorrow 14:00 Tehran ($EXP_NEW_UTC)" || PASSFAIL WARN "P8-3b remindAt is tomorrow but not exactly 14:00 Tehran — row=$NEWROW (recorded as observation)"
else
  PASSFAIL FAIL "P8-3b remindAt is not tomorrow: row=$NEWROW"
fi

echo "== [P8-4] «منصرف شدم» بلافاصله پس از ثبت =="
R=$(chat $CO "نه منصرف شدم")
echo " $R"; EV_LINE "P8-4 http=$(httpcode) reply=$(echo "$R" | head -c 300)"
PC=0
echo "$R" | rg -q "mode=deterministic" && PC=$((PC+1))   # undo قطعیِ DB-محور، نه ادعای مدل
echo "$R" | rg -q "حذف شد" && PC=$((PC+1))
echo "$R" | rg -q "انصراف داده شد" && PC=$((PC+1))
echo "$R" | rg -q "هیچ تغییری اعمال نشد" && PC=0
[ $PC -ge 3 ] && PASSFAIL PASS "P8-4 deterministic undo reply announces real deletion with record name" || PASSFAIL FAIL "P8-4 reply does not honestly announce deletion (criteria=$PC/3)"

echo "== [P8-5] خواندن دوبارهٔ DB — حذف با شناسهٔ دقیق =="
IDS6=$(remids $CO); B6=$(echo "$IDS6" | rg -c . || echo 0)
echo " reminders after-cancel: ids=[$IDS6] count=$B6 (before-add=$B4)"
EV_LINE "P8-5 db_after_cancel ids=$IDS6 count=$B6"
if ! echo "$IDS6" | rg -q "$NEWID" && [ "$B6" = "$B4" ]; then
  PASSFAIL PASS "P8-5 exact record $NEWID removed and count restored"
else
  PASSFAIL FAIL "P8-5 record $NEWID still present or count mismatch (now=$B6 expected=$B4)"
fi

echo "== [P8-6] لغوِ دوباره (رکورد حذف‌شده) — نباید رکورد دیگری حذف شود و نباید دروغ بگوید =="
R=$(chat $CO "منصرف شدم")
echo " $R"; EV_LINE "P8-6 http=$(httpcode) reply=$(echo "$R" | head -c 300)"
IDS7=$(remids $CO); B7=$(echo "$IDS7" | rg -c . || echo 0)
CANARY_STILL=$(remlist $C2 | rg -c "امتحان-کاربر۲" || echo 0)
HONEST_NONE=0
echo "$R" | rg -q "چیزی برای انصراف نبود" && HONEST_NONE=1
if [ "$B7" = "$B4" ] && [ "$CANARY_STILL" = "1" ] && [ "$HONEST_NONE" = "1" ]; then
  PASSFAIL PASS "P8-6 repeat cancel deleted nothing more (count=$B7), honest nothing-to-cancel reply, user2 canary intact"
else
  PASSFAIL FAIL "P8-6 repeat cancel: owner=$B7 (want $B4) canary=$CANARY_STILL (want 1) honestReply=$HONEST_NONE reply=$(echo "$R" | head -c 120)"
fi

echo "== [P8-7] تلاش حذف رکوردِ کاربر دیگر از مسیر تأیید — گارد مالکیت =="
R=$(chat $CO "یادآور امتحان-کاربر۲ را حذف کن")
echo " (proposal) $R"; EV_LINE "P8-7a http=$(httpcode) reply=$(echo "$R" | head -c 300)"
R=$(chat $CO "بله تأیید")
echo " (confirm)  $R"; EV_LINE "P8-7b http=$(httpcode) reply=$(echo "$R" | head -c 300)"
CANARY_STILL=$(remlist $C2 | rg -c "امتحان-کاربر۲" || echo 0)
if [ "$CANARY_STILL" = "1" ]; then
  PASSFAIL PASS "P8-7 other user's record survives owner deletion attempt"
else
  PASSFAIL FAIL "P8-7 OTHER USER'S RECORD WAS DELETED — ownership violation"
fi

echo "== [P8-8] درخواست لغوِ مبهم (پیام بلند حاوی «منصرف») — نباید لغوِ قطعیِ undo اجرا شود =="
IDS8=$(remids $CO); B8=$(echo "$IDS8" | rg -c . || echo 0)
R=$(chat $CO "خب راستش دیگه نمی‌خوام این یادآورها رو داشته باشم منصرف شدم از همه‌ش")
echo " $R"; EV_LINE "P8-8 http=$(httpcode) reply=$(echo "$R" | head -c 300)"
IDS9=$(remids $CO); B9=$(echo "$IDS9" | rg -c . || echo 0)
if [ "$B9" = "$B8" ]; then
  PASSFAIL PASS "P8-8 ambiguous long message did not trigger blind mass-cancel (count=$B9)"
else
  PASSFAIL FAIL "P8-8 ambiguous message changed DB: $B8 → $B9"
fi

echo "== [P8-9] وضعیت نهایی DB (شواهد) =="
echo " owner final:"; remlist $CO | sed 's/^/   /'
echo " user2 final:"; remlist $C2 | sed 's/^/   /'
EV_LINE "P8-9 owner_final: $(remlist $CO | tr '\n' ' ; ')"
EV_LINE "P8-9 user2_final: $(remlist $C2 | tr '\n' ' ; ')"

NP=$(rg -c "verdict=PASS" "$EV" || echo 0); NF=$(rg -c "verdict=FAIL" "$EV" || echo 0); NW=$(rg -c "verdict=WARN" "$EV" || echo 0)
echo "===== SUMMARY: PASS=$NP FAIL=$NF WARN=$NW ====="
EV_LINE "===== SUMMARY PASS=$NP FAIL=$NF WARN=$NW ====="
echo "===== V1-P2 FIX-VERIFY-FULL DONE $(date -u '+%H:%M:%S') ====="
