#!/usr/bin/env python3
# AUDIT-1: وضعیت Git از طریق API + فهرست واقعی assetهای Release v1.1.0 + دانلود کامل و تأیید SHA-256
# هیچ نتیجه‌ای حدس زده نمی‌شود؛ فقط خروجی واقعی API و دانلود واقعی ثبت می‌شود.
import hashlib, json, os, subprocess, urllib.request

token = ''.join(open('/home/z/my-project/upload/HAMYAR TOKEN.txt', 'rb').read().decode().split())
API = 'https://api.github.com/repos/aresmaeily2/HAMYAR-AI'
H = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'delivery-audit'}
OUT = '/home/z/my-project/artifacts/audit'
os.makedirs(OUT, exist_ok=True)

def get(url, accept='application/vnd.github+json'):
    req = urllib.request.Request(url, headers={**H, 'Accept': accept})
    with urllib.request.urlopen(req, timeout=600) as resp:
        return resp.read()

# ---- 1) Remote main via API (real, not cached ref) ----
br = json.loads(get(API + '/branches/main'))
remote_sha = br['commit']['sha']
local_head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd='/home/z/my-project',
                            capture_output=True, text=True).stdout.strip()
print(f"REMOTE_MAIN_VIA_API={remote_sha}")
print(f"LOCAL_HEAD={local_head}")
print(f"SYNC={'IN-SYNC' if remote_sha == local_head else 'OUT-OF-SYNC'}")

# ---- 2) Release v1.1.0 real asset list ----
rel = json.loads(get(API + '/releases/tags/v1.1.0'))
print(f"\nRELEASE_TAG={rel['tag_name']}  id={rel['id']}  draft={rel['draft']}  prerelease={rel['prerelease']}")
print(f"RELEASE_URL={rel['html_url']}")
assets = rel['assets']
print(f"ASSET_COUNT={len(assets)}\n")

has_index = False
for i, a in enumerate(assets, 1):
    if a['name'] == 'DELIVERY_INDEX.md':
        has_index = True
    print(f"ASSET[{i}] name={a['name']}")
    print(f"  size={a['size']}  downloads={a['download_count']}  updated={a['updated_at']}")
    print(f"  url={a['browser_download_url']}")

print(f"\nDELIVERY_INDEX_IN_RELEASE={'YES' if has_index else 'NO'}")

# ---- 3) Download EVERY asset fully, verify SHA-256 against local counterparts ----
MAP = {
    'Rahyar-AI-Full-Source-v1.1.0.zip': 'release-delivery/web/Rahyar-AI-Full-Source-v1.1.0.zip',
    'Rahyar-AI-Reports-v1.1.0.zip': 'release-delivery/web/Rahyar-AI-Reports-v1.1.0.zip',
    'Rahyar-Web-Screenshots-v1.1.0.zip': 'release-delivery/web/Rahyar-Web-Screenshots-v1.1.0.zip',
    'Rahyar-Android-v1.1.0-release.apk': 'release-delivery/android/Rahyar-Android-v1.1.0-release.apk',
    'Rahyar-Android-Source-v1.1.0.zip': 'release-delivery/android/Rahyar-Android-Source-v1.1.0.zip',
    'Rahyar-Android-v1.1.0-gradle-release-unsigned.apk': 'release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.apk',
    'Rahyar-Android-v1.1.0-gradle-release-unsigned.aab': 'release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.aab',
    'Rahyar-Android-v1.1.0-rebuild-unsigned.apk': 'release-delivery/android/Rahyar-Android-v1.1.0-rebuild-unsigned.apk',
    'Rahyar-Android-v1.1.0-rebuild-debug.apk': 'release-delivery/android/Rahyar-Android-v1.1.0-rebuild-debug.apk',
    'DELIVERY_INDEX.md': 'release-delivery/reports/DELIVERY_INDEX.md',
    'ANDROID_APK_REPORT.md': 'release-delivery/reports/ANDROID_APK_REPORT.md',
    'SHA256SUMS.txt': 'release-delivery/checksums/SHA256SUMS.txt',
    'LINKS.txt': 'release-delivery/LINKS.txt',
}
print("\n--- DOWNLOAD + SHA-256 VERIFICATION (this session, fresh download) ---")
results = []
for a in assets:
    data = get(a['url'], accept='application/octet-stream')
    dl_hash = hashlib.sha256(data).hexdigest()
    dl_size = len(data)
    size_match = (dl_size == a['size'])
    local = MAP.get(a['name'])
    local_path = f"/home/z/my-project/{local}" if local else None
    if local_path and os.path.exists(local_path):
        ref = open(local_path, 'rb').read()
        ref_hash = hashlib.sha256(ref).hexdigest()
        byte_match = (dl_hash == ref_hash) and (dl_size == len(ref))
        verdict = 'PASS' if (byte_match and size_match) else 'FAIL'
        detail = f"local_sha={ref_hash} byte_match={byte_match}"
    else:
        byte_match = None
        verdict = 'NO-LOCAL-COUNTERPART' if not local_path else 'LOCAL-MISSING'
        detail = f"local_path={local}"
    results.append({'name': a['name'], 'sha256': dl_hash, 'size': dl_size,
                    'size_match': size_match, 'verdict': verdict})
    print(f"{verdict:22s} {a['name']}  dl_size={dl_size}  sha256={dl_hash}  [{detail}]")

json.dump({'remote_main': remote_sha, 'local_head': local_head,
           'assets': [{'name': a['name'], 'size': a['size'], 'url': a['browser_download_url'],
                       'updated': a['updated_at'], 'downloads': a['download_count']} for a in assets],
           'delivery_index_in_release': has_index,
           'verification': results},
          open(f'{OUT}/audit-release.json', 'w'), indent=2, ensure_ascii=False)
print(f"\nSAVED={OUT}/audit-release.json")
