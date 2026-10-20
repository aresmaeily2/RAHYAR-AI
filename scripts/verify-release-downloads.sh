#!/bin/bash
# تأیید دانلود واقعی assetهای Release v1.1.0 — دانلود کامل + مقایسهٔ SHA-256 با نسخهٔ تحویل
set -euo pipefail
cd /home/z/my-project
V=/tmp/verify-release; rm -rf "$V"; mkdir -p "$V"
python3 - << 'PYEOF'
import hashlib, json, os, urllib.request

token = ''.join(open('upload/HAMYAR TOKEN.txt', 'rb').read().decode().split())
API = 'https://api.github.com/repos/aresmaeily2/HAMYAR-AI'
H = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'verify'}

def get(url, accept='application/vnd.github+json'):
    r = urllib.request.Request(url, headers={**H, 'Accept': accept})
    with urllib.request.urlopen(r, timeout=600) as resp:
        return resp.read()

rels = json.loads(get(API + '/releases'))
rel = [x for x in rels if x['tag_name'] == 'v1.1.0'][0]
MAP = {
    'Rahyar-AI-Full-Source-v1.1.0.zip': 'release-delivery/web/Rahyar-AI-Full-Source-v1.1.0.zip',
    'Rahyar-AI-Reports-v1.1.0.zip': 'release-delivery/web/Rahyar-AI-Reports-v1.1.0.zip',
    'Rahyar-Android-v1.1.0-release.apk': 'release-delivery/android/Rahyar-Android-v1.1.0-release.apk',
    'Rahyar-Android-Source-v1.1.0.zip': 'release-delivery/android/Rahyar-Android-Source-v1.1.0.zip',
    'Rahyar-Android-v1.1.0-gradle-release-unsigned.aab': 'release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.aab',
}
all_ok = True
for a in rel['assets']:
    local = MAP.get(a['name'])
    if not local:
        continue
    data = get(a['url'], accept='application/octet-stream')
    dl = hashlib.sha256(data).hexdigest()
    dl_size = len(data)
    ref = open(local, 'rb').read()
    ref_hash = hashlib.sha256(ref).hexdigest()
    ok = (dl == ref_hash) and (dl_size == a['size'] == len(ref))
    all_ok &= ok
    print(f"{'PASS' if ok else 'FAIL'}  {a['name']}  size={dl_size}  sha256={dl}")
print('ALL_RELEASE_ASSETS_VERIFIED' if all_ok else 'SOME_FAILED')
PYEOF
