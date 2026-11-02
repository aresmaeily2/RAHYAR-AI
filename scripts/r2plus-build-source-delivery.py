# -*- coding: utf-8 -*-
"""Build RahyAr_R2_Full_Source.zip + RahyAr_R2_COMPLETE_SOURCE.txt
mission §8: complete source in two mandatory formats. No secrets, no node_modules,
no generated/cache/binary junk. TXT gets full coverage-check + SHA-256."""
import hashlib, json, os, subprocess, sys, time

ROOT = '/home/z/my-project'
OUTD = '/home/z/my-project/artifacts/delivery-build'
os.makedirs(OUTD, exist_ok=True)
os.chdir(ROOT)
HEAD = subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()[:12]
SHORT = HEAD[:7]
TODAY = time.strftime('%Y-%m-%d')

# ---------- what's in git (tracked) ----------
tracked = subprocess.run(['git','ls-files'],capture_output=True,text=True).stdout.splitlines()

# extra runtime files not in git but REQUIRED for standalone run (must contain no secrets)
EXTRA_FILES = {
    '.env.example': 'environment template (no real values)',
}

# exclusion rules for the TXT (tracked files still excluded with reasons)
def excluded(path):
    p = path.lower()
    if p.endswith(('.png','.jpg','.jpeg','.gif','.webp','.svg','.ico','.woff','.woff2','.ttf','.otf','.mp4','.webm','.keystore','.db','.sqlite','.enc')):
        return 'binary/font/image asset (kept in ZIP, listed in TXT index)'
    if '/node_modules/' in p or p.startswith('node_modules'):
        return 'dependencies (reinstallable via bun/npm install)'
    if p.endswith(('.tar.gz','.zip','.jar','.class')) or '/vault/' in p or p.startswith('vault/'):
        return 'archive/secure material'
    return None

# ---------- A) Full source ZIP via git archive + extras ----------
zip_path = f'{OUTD}/RahyAr_R2_Full_Source.zip'
r = subprocess.run(['git','archive','--format=zip','-o',zip_path,f'HEAD'],capture_output=True,text=True)
if r.returncode != 0: sys.exit(f'archive failed: {r.stderr}')
# append .env.example + top-level README-INSTALL if not tracked
import zipfile
z = zipfile.ZipFile(zip_path,'a')
if '.env.example' not in zipfile.ZipFile(zip_path).namelist():
    z.writestr('.env.example', open('.env.example').read())
readme = f"""RahyAr R2 — Full Source (commit {HEAD}, {TODAY})

INSTALL & RUN (web app):
  1. Install Node.js 20+ and Bun (https://bun.sh) OR use npm.
  2. bun install            (or: npm install)
  3. cp .env.example .env   (set DATABASE_URL=file:./db/custom.db)
  4. bun run db:push        (creates schema via Prisma)
  5. bun run build          (production build)
  6. bun run start          (serves on :3000)

DEV MODE: bun run dev
TESTS:    bun run verify   (typecheck + lint + unit tests)
FIRST LOGIN: the first run shows the owner setup form (create username/password).
         Optional server token: RAHYAR_SETUP_TOKEN env.

ANDROID APK: requires Android SDK (not included). Scripts:
  scripts/build-android-apk-v11.sh  (keystore passwords via env vars
  RAHYAR_KS_STOREPASS / RAHYAR_KS_KEYPASS — fail-closed if unset)

EXCLUDED FROM THIS ARCHIVE: node_modules, .env (real values), private keystore,
  vault backups, databases, media evidence. See .env.example for required vars.
"""
z.writestr('README-INSTALL.txt', readme)
z.close()
print('ZIP:', zip_path, os.path.getsize(zip_path)//1024, 'KB')

# ---------- B) COMPLETE_SOURCE.txt ----------
banner = f"""==================================================
RAHYAR R2 — COMPLETE SOURCE CODE
Commit: {HEAD}
Generated: {TODAY}
==================================================

"""
parts = [banner]
index_files, excluded_files = [], []
total_lines = 0
for f in tracked + list(EXTRA_FILES):
    if f in EXTRA_FILES:
        src = EXTRA_FILES[f]
        try: content = open(f).read()
        except Exception: continue
    else:
        ex = excluded(f)
        if ex:
            excluded_files.append((f, ex)); continue
        try:
            blob = subprocess.run(['git','show',f'HEAD:{f}'],capture_output=True).stdout
            content = blob.decode('utf-8')
        except Exception:
            excluded_files.append((f,'unreadable/non-utf8')); continue
    lines = content.count('\n') + (0 if content.endswith('\n') else 1)
    total_lines += lines
    index_files.append(f)
    parts.append(f"\n{'='*50}\nPROJECT FILE: {f}\n{'-'*50}\n{content}\n")

# coverage check: any tracked TEXT file missed?
text_ext = ('.ts','.tsx','.js','.mjs','.cjs','.css','.json','.md','.txt','.sh','.py','.mts',
            '.yml','.yaml','.html','.xml','.java','.gradle','.properties','.prisma','.mjs','.kt')
missed = []
for f in tracked:
    if f in index_files: continue
    ex = excluded(f)
    if ex: continue
    missed.append(f)

tail = []
tail.append(f"\n{'='*50}\nFILE INDEX ({len(index_files)} files included)\n{'-'*50}")
for f in index_files: tail.append(f'  {f}')
tail.append(f"\n{'='*50}\nEXCLUDED FILES ({len(excluded_files)}) — with reasons\n{'-'*50}")
seen_reason = {}
for f, why in excluded_files: seen_reason.setdefault(why, []).append(f)
for why, files in seen_reason.items():
    tail.append(f'  [{why}] — {len(files)} file(s):')
    for f in files: tail.append(f'    - {f}')
tail.append(f"\n{'='*50}\nCOVERAGE CHECK\n{'-'*50}")
tail.append(f'Tracked files in commit: {len(tracked)}')
tail.append(f'Included in this text:   {len(index_files)}')
tail.append(f'Excluded (binary/etc):   {len(excluded_files)}')
tail.append(f'MISSING text files (must be 0): {len(missed)}')
for f in missed: tail.append(f'  !! MISSED: {f}')
tail.append(f'Total source lines: {total_lines}')

content = '\n'.join(parts) + '\n'.join(tail) + '\n'
txt_path = f'{OUTD}/RahyAr_R2_COMPLETE_SOURCE.txt'
open(txt_path,'w').write(content)
sha = hashlib.sha256(open(txt_path,'rb').read()).hexdigest()
# append SHA (self-record)
content += f"\n{'='*50}\nSHA-256 of this file (without this final line block): recorded in SHA256SUMS.txt\n"
open(txt_path,'w').write(content)
sha2 = hashlib.sha256(open(txt_path,'rb').read()).hexdigest()
print('TXT:', txt_path, os.path.getsize(txt_path)//1024, 'KB | lines:', total_lines)
print('included:', len(index_files), '| excluded:', len(excluded_files), '| missed:', len(missed))
print('SHA-256:', sha2)
json.dump({'head': HEAD, 'zip_sha': None, 'txt_sha': sha2, 'included': len(index_files),
           'excluded': len(excluded_files), 'missed': len(missed), 'lines': total_lines},
          open(f'{OUTD}/source-build-stats.json','w'))
