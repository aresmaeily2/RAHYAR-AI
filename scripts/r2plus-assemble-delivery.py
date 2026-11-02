# -*- coding: utf-8 -*-
"""Assemble download/RahyAr_R2_OWNER_DELIVERY/ + SHA256SUMS.txt + verify everything."""
import hashlib, json, os, shutil, subprocess, sys, time

ROOT = '/home/z/my-project'
SRC = f'{ROOT}/artifacts/delivery-build'
SHOTS = f'{ROOT}/artifacts/media/screenshots'
VID = f'{ROOT}/artifacts/media/video'
OUT = f'{ROOT}/download/RahyAr_R2_OWNER_DELIVERY'

# fresh assembly
if os.path.exists(OUT): shutil.rmtree(OUT)
for d in ['01_APP','02_SOURCE','03_SCREENSHOTS','04_VIDEO','05_DOCUMENTATION','06_SECURITY','07_TEST_RESULTS']:
    os.makedirs(f'{OUT}/{d}', exist_ok=True)

def cp(src, dstdir, name=None):
    dst = f'{OUT}/{dstdir}/{name or os.path.basename(src)}'
    shutil.copy2(src, dst)
    return dst

# 01_APP — honest no-APK note + run guide
open(f'{OUT}/01_APP/APP-HOW-TO-RUN.md','w').write("""# اجرای برنامه (01_APP)

**پلتفرم واقعی RahyAr = وب (Next.js standalone).**

## وضعیت APK اندروید — صادقانه
در محیط ساختِ این نسخه، Android SDK نصب نیست، بنابراین **APK ساخته نشده و هیچ فایل ساختگی‌ای در این پوشه نیست**.
مسیر ساخت APK (وقتی SDK در دسترس باشد):
```bash
export RAHYAR_KS_STOREPASS=...   # رمز keystore جدید — در vault/rahyar-release-password.txt فضای کاری
export RAHYAR_KS_KEYPASS=...
bash scripts/build-android-apk-v11.sh   # از ریشهٔ سورس (02_SOURCE)
```
keystore جدید: `android/rahyar-release.keystore` داخل سورس؟ **خیر** — فایل keystore عمداً خارج از بسته است (امنیت)؛ در فضای کاری: `android/rahyar-release.keystore`.

## اجرای وب — دو دقیقه
```bash
unzip ../02_SOURCE/RahyAr_R2_Full_Source.zip -d rahyar && cd rahyar
bun install                    # یا npm install
cp .env.example .env           # DATABASE_URL=file:./db/custom.db
bun run db:push
bun run build && bun run start # → http://localhost:3000
```
اولین ورود: فرم «راه‌اندازی اولیه» → username/password مالک را خودتان بسازید.
همین برنامه هم‌اکنون در Workspace روی پورت 3000 (production standalone) در حال سرو است —
لینک رسمی Preview را از پنل Workspace بگیرید (استخراج URL از داخل sandbox ممکن نیست؛ محدودیت پلتفرم، مستند در 06).
""")

# 02_SOURCE
cp(f'{SRC}/RahyAr_R2_Full_Source.zip','02_SOURCE')
cp(f'{SRC}/RahyAr_R2_COMPLETE_SOURCE.txt','02_SOURCE')

# 03_SCREENSHOTS
n=0
for f in sorted(os.listdir(SHOTS)):
    if f.endswith('.png'):
        cp(f'{SHOTS}/{f}','03_SCREENSHOTS'); n+=1
cp(f'{SHOTS}/screenshots-manifest.json','03_SCREENSHOTS')

# 04_VIDEO
shutil.copy2(f'{VID}/rahyar-r2-walkthrough.mp4',f'{OUT}/04_VIDEO/rahyar-r2-walkthrough.mp4')
import glob
webm = glob.glob(f'{VID}/*.webm')[0]
shutil.copy2(webm,f'{OUT}/04_VIDEO/rahyar-r2-walkthrough.webm')

# 05_DOCUMENTATION
D=f'{ROOT}/docs'
cp(f'{D}/DELIVERY_V2/INSTALL_GUIDE_V2_FA.md','05_DOCUMENTATION')
cp(f'{D}/DELIVERY_V2/DEPLOYMENT_V2_FA.md','05_DOCUMENTATION')
cp(f'{D}/DELIVERY_V2/LIMITATIONS_V2_FA.md','05_DOCUMENTATION')
cp(f'{D}/DELIVERY_V2/FEATURES_MATRIX_V2.md','05_DOCUMENTATION')
cp(f'{D}/final-delivery/08-product-matrix-r2.md','05_DOCUMENTATION')

# 06_SECURITY
cp(f'{D}/final-delivery/c1_c10_status_r2.csv','06_SECURITY')
cp(f'{D}/final-delivery/02-forensics-c1-c10-r2.md','06_SECURITY')
cp(f'{D}/final-delivery/01-security-audit-r2.md','06_SECURITY')
cp(f'{D}/final-delivery/09-independent-audit-r2.md','06_SECURITY')
cp(f'{D}/final-delivery/06-devops-release-r2.md','06_SECURITY')
cp(f'{SRC}/R2PLUS-CLOSEOUT-SECURITY.md','06_SECURITY')
cp(f'{SRC}/history-clean-procedure.txt','06_SECURITY')

# 07_TEST_RESULTS
cp(f'{D}/final-delivery/05-qa-test-report-r2.md','07_TEST_RESULTS')
cp(f'{SRC}/TEST-RESULTS-R2PLUS.md','07_TEST_RESULTS')
cp(f'{ROOT}/artifacts/rahyar-audit/closeout-verification.json','07_TEST_RESULTS')

# README root
cp(f'{SRC}/README-OWNER-DELIVERY.md','.', 'README-OWNER-DELIVERY.md')

# ---------- SHA256SUMS ----------
lines = []
for root, _, files in os.walk(OUT):
    for f in sorted(files):
        if f == 'SHA256SUMS.txt': continue
        p = os.path.join(root, f)
        rel = os.path.relpath(p, OUT)
        h = hashlib.sha256(open(p,'rb').read()).hexdigest()
        lines.append(f'{h}  {rel}')
open(f'{OUT}/SHA256SUMS.txt','w').write('\n'.join(lines)+'\n')

# ---------- VERIFY ----------
print('=== package tree ===')
total = 0
for root, _, files in os.walk(OUT):
    total += len(files)
print('total files (incl SHA256SUMS):', total)

# re-verify all hashes
ok = 0; bad = 0
for line in open(f'{OUT}/SHA256SUMS.txt'):
    h, rel = line.strip().split('  ',1)
    actual = hashlib.sha256(open(f'{OUT}/{rel}','rb').read()).hexdigest()
    if actual == h: ok += 1
    else: bad += 1; print('MISMATCH:', rel)
print(f'SHA256SUMS verify: {ok} OK, {bad} BAD')

# unzip integrity
subprocess.run(['unzip','-q','-o',f'{OUT}/02_SOURCE/RahyAr_R2_Full_Source.zip','-d','/tmp/delivery-zip-check'],check=True)
zc = sum(len(fs) for _,_,fs in os.walk('/tmp/delivery-zip-check'))
print('source ZIP extracts:', zc, 'files')

# TXT head/tail sanity
t = open(f'{OUT}/02_SOURCE/RahyAr_R2_COMPLETE_SOURCE.txt').read()
print('TXT starts with banner:', t.startswith('=================================================='))
print('TXT has file index:', 'FILE INDEX' in t, '| coverage line:', 'MISSING text files (must be 0): 0' in t)

# video playability
r = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',f'{OUT}/04_VIDEO/rahyar-r2-walkthrough.mp4'],capture_output=True,text=True)
print('video duration:', r.stdout.strip(), 's')
# png sanity (not blank): sample 3
from PIL import Image
import random
for f in ['01-login-fa.png','04-ai-real-answer-fa.png','15-mobile-today.png']:
    im = Image.open(f'{OUT}/03_SCREENSHOTS/{f}').convert('L')
    px = list(im.getdata()); nonwhite = sum(1 for v in px[::37] if v < 245)/len(px[::37])
    print(f'{f}: non-white ratio {nonwhite:.2%}, size {os.path.getsize(f"{OUT}/03_SCREENSHOTS/{f}")//1024}KB')

# secret scan of the whole package (fingerprints must be 0)
reg = {'C1':'cec51518b9ac','C2':'ee0880daa2ca','C3':'f60ed56a9c82','C4':'dd65b755befe','C5':'8eb38003b10d',
       'C6':'e20de4c418c6','C7':'46d0a91d1e48','C8':'8aa62d3b0a15','C9':'ff9d8259a6e5','C10':'9774fdedae3b'}
hits = []
for root,_,files in os.walk(OUT):
    for f in files:
        p = os.path.join(root,f)
        if f.endswith(('.png','.mp4','.webm','.zip')): continue
        try: txt = open(p, errors='ignore').read()
        except Exception: continue
        import re
        for m in re.finditer(r"[A-Za-z0-9_+=/.\-@#$%!]{4,80}", txt):
            hh = hashlib.sha256(m.group(0).encode()).hexdigest()[:12]
            if hh in reg.values(): hits.append((os.path.relpath(p,OUT), hh))
print('package fingerprint scan:', len(hits), 'hits')
# also verify real secret values are NOT in package (the actual current passwords)
cur_pw = open(f'{ROOT}/artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt').read().strip()
ks_pw = open(f'{ROOT}/vault/rahyar-release-password.txt').read().split('storepass=')[1].splitlines()[0]
leaked = []
for root,_,files in os.walk(OUT):
    for f in files:
        p = os.path.join(root,f)
        if f.endswith(('.png','.mp4','.webm','.zip')): continue
        try: txt = open(p, errors='ignore').read()
        except Exception: continue
        if cur_pw in txt: leaked.append((rel_cur := os.path.relpath(p,OUT), 'owner-password'))
        if ks_pw in txt: leaked.append((os.path.relpath(p,OUT), 'keystore-password'))
print('live-secret leak scan:', len(leaked), 'leaks')
print('DONE')
