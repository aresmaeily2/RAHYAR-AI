#!/bin/bash
# ساخت GitHub Release v1.1.0 + پیوست ZIPها + تأیید نهایی (توکن هرگز چاپ نمی‌شود)
set -euo pipefail
cd /home/z/my-project
TOKEN=$(tr -d ' \r\n' < "upload/HAMYAR TOKEN.txt" | head -c 400)
API=https://api.github.com/repos/aresmaeily2/HAMYAR-AI
COMMIT=$(git rev-parse HEAD)

NOTES=$(cat << 'EOF'
# Rahyar AI v1.1.0 — Grand Upgrade & Production Release

نسخهٔ وب تثبیت‌شده با شواهد اجرای واقعی (STAGE-WEB، 2026-10-20).

## امنیت
- scrypt s2 (N=2^16) + سازگاری s1 · CSP با nonce · COOP/CORP · SSRF owner-only برای endpoint خصوصی AI · محدودیت نرخ ورود/حساب · کوکی Secure/HttpOnly/SameSite=Lax

## رفع‌های بحرانی (موج GRAND)
- GRAND-F1: مالک نصب تازه اکنون نقش OWNER می‌گیرد
- GRAND-F9: فرم ورود نام کاربری واقعی می‌گیرد (ورود 20 کاربر استاندارد از UI)
- GRAND-F10: بوت‌اسکریپت تم + assetهای ambient در تولید
- GRAND-F5/F6: تست اتصال AI + مصرف استریم + مرز ماه تهران

## چندکاربره
- 20+ حساب مستقل، تغییر اجباری رمز اولین ورود، ابطال نشست، جداسازی داده (تست واقعی)، CSV import/export بدون هش رمز، UserAudit

## شواهد کیفیت (همه با اجرای واقعی)
- unit 181/181 · E2E 11/11 (کنسول=0، axe serious=0) · سناریوی کاربران 14/14 · امنیت زنده 18/18 · بازیابی restart 7/7 · مالی 6/6 · import 3/3
- dependency audit: critical=0 (highها فقط در ابزار dev/build، خارج از باندل runtime)

## پیوست‌ها
- `Rahyar-AI-Full-Source-v1.1.0.zip` — سورس کامل (اسکن secret پاک)
- `Rahyar-AI-Reports-v1.1.0.zip` — گزارش‌ها + لاگ شواهد + اسکرین‌شات + docs

محدودیت‌ها و بدهی‌های باقی‌مانده: `docs/GRAND_UPGRADE_FINAL.md` §۲۱/§۲۳ و `WEB_RELEASE_REPORT.md` داخل بستهٔ گزارش‌ها.
EOF
)

# 1) ساخت Release (تگ v1.1.0 روی COMMIT)
python3 - "$NOTES" "$COMMIT" << 'PYEOF' > /tmp/release-resp.json
import json, sys, urllib.request
notes, commit = sys.argv[1], sys.argv[2]
token = open('/tmp/gh-token.txt').read().strip() if False else None
PYEOF
echo "$NOTES" > /tmp/rel-notes.md
python3 - << 'PYEOF' > /tmp/release-resp.json
import json, urllib.request, os
token = os.popen("tr -d ' \\r\\n' < 'upload/HAMYAR TOKEN.txt' | head -c 400").read().strip()
commit = os.popen("git rev-parse HEAD").read().strip()
notes = open('/tmp/rel-notes.md').read()
body = json.dumps({"tag_name": "v1.1.0", "target_commitish": commit, "name": "v1.1.0 — Web Stabilized",
                   "body": notes, "draft": False, "prerelease": False}).encode()
req = urllib.request.Request("https://api.github.com/repos/aresmaeily2/HAMYAR-AI/releases",
    data=body, headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
try:
    r = urllib.request.urlopen(req)
    print(r.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
PYEOF
REL_ID=$(python3 -c "import json;d=json.load(open('/tmp/release-resp.json'));print(d.get('id','ERR'))")
REL_URL=$(python3 -c "import json;d=json.load(open('/tmp/release-resp.json'));print(d.get('html_url',d.get('message','ERR')))")
echo "RELEASE_ID=$REL_ID"
echo "RELEASE_URL=$REL_URL"

# 2) پیوست ZIPها
for F in release-delivery/web/Rahyar-AI-Full-Source-v1.1.0.zip release-delivery/web/Rahyar-AI-Reports-v1.1.0.zip; do
  N=$(basename "$F")
  CODE=$(curl -s -o /tmp/upload-asset.json -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/zip" \
    --data-binary @"$F" \
    "https://uploads.github.com/repos/aresmaeily2/HAMYAR-AI/releases/$REL_ID/assets?name=$N")
  echo "ASSET $N → HTTP $CODE"
done

# 3) تأیید نهایی release + assets
curl -s -H "Authorization: Bearer $TOKEN" "$API/releases/tags/v1.1.0" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('TAG:', d.get('tag_name'), '| URL:', d.get('html_url'))
print('ASSETS:', [(a['name'], a['size']) for a in d.get('assets',[])])"
