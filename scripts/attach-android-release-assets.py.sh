#!/bin/bash
# افزودن assetهای اندروید به Release v1.1.0 (افزودنی — بدون بازنویسی assetهای موجود)
set -euo pipefail
cd /home/z/my-project
python3 - << 'PYEOF'
import json, os, urllib.request

token = ''.join(open('upload/HAMYAR TOKEN.txt', 'rb').read().decode().split())
API = 'https://api.github.com/repos/aresmaeily2/HAMYAR-AI'
H = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json', 'User-Agent': 'release-assets'}

def req(path, data=None, headers=None, raw=False):
    r = urllib.request.Request(API + path, data=data, headers=headers or H)
    with urllib.request.urlopen(r, timeout=600) as resp:
        b = resp.read()
        return b if raw else json.loads(b)

rels = req('/releases')
rel = [x for x in rels if x['tag_name'] == 'v1.1.0'][0]
existing = {a['name'] for a in rel['assets']}
print('existing assets:', sorted(existing))

uploads = [
    ('release-delivery/android/Rahyar-Android-Source-v1.1.0.zip', 'application/zip'),
    ('release-delivery/android/Rahyar-Android-v1.1.0-gradle-release-unsigned.aab', 'application/octet-stream'),
]
for path, ctype in uploads:
    name = os.path.basename(path)
    if name in existing:
        print('skip (exists):', name); continue
    body = open(path, 'rb').read()
    up_url = rel['upload_url'].split('{')[0] + f'?name={name}'
    r = urllib.request.Request(up_url, data=body,
             headers={'Authorization': f'Bearer {token}', 'Content-Type': ctype,
                      'Content-Length': str(len(body)), 'User-Agent': 'release-assets'})
    with urllib.request.urlopen(r, timeout=600) as resp:
        up = json.loads(resp.read())
    print('uploaded:', up['name'], up['size'], up['state'])

# پیوست شفاف به توضیحات Release (بدون حذف متن قبلی)
body = rel['body'] or ''
addendum = '''
## پیوست اندروید (DELIVERY-5، 2026-10-20)
- `Rahyar-Android-Source-v1.1.0.zip` — سورس کامل کلاینت اندروید + خط لولهٔ v11 + خط لولهٔ Gradle (AGP 8.7.3/Gradle 8.10.2) + تست واحد JVM
- `Rahyar-Android-v1.1.0-gradle-release-unsigned.aab` — **AAB بدون امضا** (کلید release در reset محیط گم شد؛ کلید جدید بدون تأیید مالک ساخته نمی‌شود. `bundletool validate` = OK)
- APK بازتولیدشده از سورس: badging مطابق APK منتشرشده (com.rahyarai.app / 11 / 1.1.0) — بدون امضا؛ جزئیات: `ANDROID_APK_REPORT.md` در بستهٔ گزارش‌ها
- وضعیت امضای APK منتشرشده: v2+v3 معتبر با کلید گم‌شده (اثر انگشت در گزارش) — به‌روزرسانی درجا روی نصب‌های قبلی نیازمند تصمیم مالک دربارهٔ کلید است.
'''
if 'پیوست اندروید' not in body:
    newbody = body + addendum
    req(f'/releases/{rel["id"]}', data=json.dumps({'body': newbody}).encode(),
        headers={**H, 'Content-Type': 'application/json'})
    print('release body: addendum appended')

rels2 = req('/releases')
rel2 = [x for x in rels2 if x['tag_name'] == 'v1.1.0'][0]
print('--- final assets:')
for a in rel2['assets']:
    print(f"  {a['name']}  {a['size']}  state={a['state']}")
PYEOF
