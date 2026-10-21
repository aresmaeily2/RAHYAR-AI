#!/usr/bin/env bash
# APK-APK-EXT: publish v1.2.0 delivery files to a NEW PUBLIC release-only GitHub repo
# Security: token loaded from file, never printed. Private HAMYAR-AI repo untouched.
set -u
cd /home/z/my-project
TOKEN=$(cat "upload/HAMYAR TOKEN.txt" | tr -d '\r\n')
AUTH="Authorization: Bearer $TOKEN"
API="https://api.github.com"
OWNER="aresmaeily2"
REPO="rahyar-releases"
SRC=/home/z/my-project/release-delivery/v1.2.0

echo "== 1. create public repo (idempotent) =="
EXIST=$(curl -sS --max-time 30 -H "$AUTH" "$API/repos/$OWNER/$REPO" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$EXIST" ] && [ "$EXIST" != "None" ] && [ "$EXIST" != "" ]; then
  echo "repo exists: id=$EXIST"
else
  CODE=$(curl -sS --max-time 60 -o /tmp/repo-create.json -w '%{http_code}' -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
    "$API/user/repos" -d '{"name":"rahyar-releases","description":"RahyAr Android — public download mirror for test builds (no auth required)","private":false,"has_wiki":false,"has_projects":false,"has_issues":false,"auto_init":true}')
  echo "create http=$CODE"; head -c 300 /tmp/repo-create.json | grep -o '"id": *[0-9]*' | head -1
  grep -q '"message"' /tmp/repo-create.json && python3 -c "import json;print('msg:',json.load(open('/tmp/repo-create.json')).get('message'))"
fi

echo "== 2. create release v1.2.0 (idempotent) =="
RELID=$(curl -sS --max-time 30 -H "$AUTH" "$API/repos/$OWNER/$REPO/releases/tags/v1.2.0" | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
if [ -n "$RELID" ] && [ "$RELID" != "None" ] && [ "$RELID" != "" ]; then
  echo "release exists: id=$RELID"
else
  BODY=$(cat <<'JSON'
{"tag_name":"v1.2.0","target_commitish":"main","name":"RahyAr Android v1.2.0 — standalone test build (debug-signed)","prerelease":true,"body":"Public download mirror for the RahyAr Android v1.2.0 standalone test build.\n\n- `Rahyar-Android-v1.2.0-debug-test.apk` — installable test APK (debug-signed, v2 scheme)\n- `Rahyar-Android-Source-v1.2.0.zip` — Android source tree (matches commit ed9ec2d of the private repo)\n- `INSTALL_GUIDE_FA.md` — Persian installation guide\n- `SHA256SUMS.txt` — SHA-256 checksums\n\nAPK: com.rahyarai.app, versionCode 12 / versionName 1.2.0, 487,853 bytes, SHA-256 0626b358031955d765154bd74156d6e228612db95a20ce5039d24bd352022213.\nDevice testing has NOT been performed yet. Debug signature cannot update in place over the older v1.1.0 release-signed build (uninstall first; back up data)."}
JSON
)
  CODE=$(curl -sS --max-time 60 -o /tmp/rel-create.json -w '%{http_code}' -X POST -H "$AUTH" -H "Accept: application/vnd.github+json" \
    "$API/repos/$OWNER/$REPO/releases" -d "$BODY")
  echo "release http=$CODE"
  RELID=$(python3 -c "import json;print(json.load(open('/tmp/rel-create.json')).get('id',''))" 2>/dev/null)
  echo "release id=$RELID"
fi
[ -n "$RELID" ] && [ "$RELID" != "None" ] || { echo "FATAL: no release id"; exit 1; }

echo "== 3. upload assets =="
up() { # $1=file $2=name $3=content-type
  UP=$(curl -sS --max-time 600 -o /tmp/asset-up.json -w '%{http_code}' -X POST \
    -H "$AUTH" -H "Content-Type: $3" \
    --data-binary "@$SRC/$1" \
    "$API/uploads/repos/$OWNER/$REPO/releases/$RELID/assets?name=$2")
  echo "  $2 http=$UP"
}
up "Rahyar-Android-v1.2.0-debug-test.apk" "Rahyar-Android-v1.2.0-debug-test.apk" "application/vnd.android.package-archive"
up "Rahyar-Android-Source-v1.2.0.zip"     "Rahyar-Android-Source-v1.2.0.zip"     "application/zip"
up "INSTALL_GUIDE_FA.md"                  "INSTALL_GUIDE_FA.md"                  "text/markdown"
up "SHA256SUMS.txt"                       "SHA256SUMS.txt"                       "text/plain"

echo "== 4. release assets listing =="
curl -sS --max-time 30 -H "$AUTH" "$API/repos/$OWNER/$REPO/releases/$RELID/assets" | python3 -c "
import sys,json
for a in json.load(sys.stdin): print(f\"  {a['name']}  {a['size']}  state={a['state']}\")"
echo "DONE"
