#!/bin/bash
# دانلود assetهای Release v1.1.0 (repo خصوصی → نیازمند توکن) + هش + استخراج آزمایشی
set -euo pipefail
cd /home/z/my-project
OUT=artifacts/recovered
mkdir -p "$OUT"
python3 - << 'PYEOF'
import json, os, urllib.request

token = ''.join(open('upload/HAMYAR TOKEN.txt', 'rb').read().decode().split())
API = 'https://api.github.com/repos/aresmaeily2/HAMYAR-AI'
r = urllib.request.Request(API + '/releases', headers={
    'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'dl'})
rels = json.loads(urllib.request.urlopen(r, timeout=30).read())
rel = [x for x in rels if x['tag_name'] == 'v1.1.0'][0]
for a in rel['assets']:
    dest = os.path.join('artifacts/recovered', a['name'])
    req = urllib.request.Request(a['url'], headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/octet-stream', 'User-Agent': 'dl'})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, 'wb') as f:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    print('downloaded:', a['name'], os.path.getsize(dest))
PYEOF
echo '=== SHA-256 ==='
cd "$OUT" && sha256sum *
echo '=== ZIP extract test ==='
for z in *.zip; do echo "--- $z"; unzip -q -t "$z" | tail -1; unzip -l "$z" | tail -2; done
echo '=== APK structure ==='
unzip -l Rahyar-Android-v1.1.0-release.apk
