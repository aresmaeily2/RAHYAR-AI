#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F2-VERIFY-LINKS: راستی‌آزمایی مستقل لینک‌ها — دانلود در نشست جداگانه
(بدون کوکی، با UserAgent متفاوت) و تطبیق بایت‌به‌بایت SHA-256 با فایل محلی."""
import hashlib, os, re, subprocess, sys, time

ROOT = '/home/z/my-project'
OUT = f'{ROOT}/artifacts/delivery-build'
LINKS = f'{ROOT}/artifacts/reports/upload-links-final.txt'
VERIFY = f'{ROOT}/artifacts/reports/verify-links-final.txt'

def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

results = []
with open(LINKS) as f:
    for line in f:
        line = line.strip()
        if '|' not in line:
            continue
        svc, name, url = line.split('|', 2)
        if not url.startswith('http'):
            continue
        local = os.path.join(OUT, name)
        if not os.path.isfile(local):
            results.append((svc, name, 'NO-LOCAL-FILE', '-'))
            continue
        # tmpfiles: دو مرحله‌ای — صفحهٔ میانی لینک واقعی dl/<id>/<token>/name را می‌دهد
        dl = url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
        tmp = f'/tmp/verify_{re.sub(r"[^A-Za-z0-9._-]", "_", name)}'
        try:
            if 'tmpfiles.org' in dl:
                page = subprocess.run(['curl', '-sL', '-m', '120', '-A', 'Mozilla/5.0 (X11; Linux x86_64) VerifyBot/1.0',
                                       dl], capture_output=True, text=True, timeout=130).stdout
                m = re.search(r'href="(https://tmpfiles\.org/dl/[^"]+)"', page)
                if not m:
                    results.append((svc, name, 'NO-DIRECT-LINK-IN-PAGE', '-'))
                    continue
                dl = m.group(1)
            elif 'gofile.io' in dl:
                # گوفایل: صفحهٔ دانلود SPA است؛ لینک مستقیم به توکه (محدودیت شبکه ثبت‌شده)
                page = subprocess.run(['curl', '-sL', '-m', '120', '-A', 'Mozilla/5.0 (X11; Linux x86_64) VerifyBot/1.0',
                                       dl], capture_output=True, text=True, timeout=130).stdout
                m = re.search(r'"link":"(https://[^"]+)"', page) or re.search(r'href="(https://[^"]*store[^"]+)"', page)
                if not m:
                    results.append((svc, name, 'GOFILE-PAGE-UNRESOLVABLE-FROM-THIS-NETWORK (upload ok; page is a JS app)', '-'))
                    continue
                dl = m.group(1)
            subprocess.run(['curl', '-sL', '-m', '600', '-A', 'Mozilla/5.0 (X11; Linux x86_64) VerifyBot/1.0',
                            '-o', tmp, dl], check=True, timeout=620)
            dsz = os.path.getsize(tmp)
            lsz = os.path.getsize(local)
            if dsz != lsz:
                results.append((svc, name, f'SIZE-MISMATCH local={lsz} dl={dsz}', '-'))
            else:
                dsha = sha256_file(tmp)
                lsha = sha256_file(local)
                ok = 'MATCH' if dsha == lsha else 'SHA-MISMATCH'
                results.append((svc, name, ok, dsha[:16]))
            os.remove(tmp)
        except Exception as e:
            results.append((svc, name, f'DOWNLOAD-FAIL {str(e)[:60]}', '-'))

with open(VERIFY, 'w') as f:
    f.write(f'F2 independent link verification — {time.strftime("%Y-%m-%d %H:%M:%S UTC")}\n')
    f.write('session: fresh curl (no cookies, distinct UA) — byte-to-byte SHA-256 vs local deliverable\n\n')
    match = sum(1 for r in results if r[2] == 'MATCH')
    for svc, name, status, sh in results:
        f.write(f'{svc:9s} {name:42s} {status:22s} {sh}\n')
    f.write(f'\nTOTAL: {match}/{len(results)} MATCH (byte-to-byte SHA-256)\n')

for r in results:
    print(r[0], r[1], r[2])
print(f'TOTAL {sum(1 for r in results if r[2] == "MATCH")}/{len(results)} MATCH')
