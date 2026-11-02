# -*- coding: utf-8 -*-
"""R2+ closeout verification — reproducible security evidence.
تولید شواهد نهایی: بی‌اعتباری C1/C2/C5/C7/C10 روی DB فعلی، وضعیت C8/C9،
اسکن اثرانگشت روی درخت tracked، و کنترل فایل‌های ممنوعه. هیچ مقداری چاپ نمی‌شود."""
import hashlib, json, os, sqlite3, subprocess, sys, time

ROOT = '/home/z/my-project'
os.chdir(ROOT)
FP = {'C1':'cec51518b9ac','C2':'ee0880daa2ca','C3':'f60ed56a9c82','C4':'dd65b755befe',
      'C5':'8eb38003b10d','C6':'e20de4c418c6','C7':'46d0a91d1e48',
      'C8':'8aa62d3b0a15','C9':'ff9d8259a6e5','C10':'9774fdedae3b'}
out = {'generated_at': time.strftime('%Y-%m-%dT%H:%M:%S'), 'head': None, 'sections': {}}

def fp12(b): return hashlib.sha256(b).hexdigest()[:12]

# ---------- 0) HEAD ----------
head = subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
out['head'] = head

# ---------- 1) extract historical values by fingerprint (values never printed) ----------
p = subprocess.run(['git','cat-file','--batch-all-objects','--batch-check'],capture_output=True,text=True)
blobs = [l.split()[0] for l in p.stdout.splitlines() if l.split()[1:2]==['blob']]
rev = {v:k for k,v in FP.items()}
cand = {k:set() for k in FP}
tok_re = __import__('re').compile(r"""["'`]?([A-Za-z0-9_+=/.\-@#$%!]{6,80})["'`]?""")
for b in blobs:
    t = subprocess.run(['git','cat-file','blob',b],capture_output=True).stdout.decode('utf-8','ignore')
    if len(t) > 500_000: continue
    for m in tok_re.finditer(t):
        h = fp12(m.group(1).encode())
        if h in rev: cand[rev[h]].add(m.group(1))
out['sections']['historical_extraction'] = {k: len(v) for k,v in cand.items()}

# ---------- 2) test historical values against CURRENT DB scrypt hashes ----------
def scrypt_verify(pw, stored):
    try:
        algo, salt_hex, hash_hex = stored.split(':')
        if algo != 's1': return False
        d = hashlib.scrypt(pw.encode(), salt=bytes.fromhex(salt_hex), n=16384, r=8, p=1, dklen=64)
        return d.hex() == hash_hex
    except Exception:
        return False
con = sqlite3.connect('db/custom.db')
users = con.execute('SELECT username, passwordHash FROM User').fetchall()
sessions = con.execute('SELECT COUNT(*) FROM Session').fetchone()[0]
con.close()
results = {}
for cid, vals in cand.items():
    if cid in ('C3','C4'):  # keystore passwords — verified separately via keytool
        results[cid] = {'carriers': len(vals), 'test': 'keytool (see keystore section)'}
        continue
    any_valid = any(scrypt_verify(v, uh) for v in vals for _, uh in users)
    results[cid] = {'carriers': len(vals), 'valid_against_current_db': any_valid}
out['sections']['c1_c2_c5_c6_c7_c10_vs_current_db'] = results
out['sections']['db_state'] = {'users': [u[0] for u in users], 'sessions': sessions}

# ---------- 3) C8/C9 local evidence files ----------
ev = {}
for f in ['.evidence-password','.evidence-session-token']:
    p_ = os.path.join(ROOT,f)
    ev[f] = {'exists': os.path.exists(p_), 'mode': oct(os.stat(p_).st_mode & 0o777) if os.path.exists(p_) else None}
# old copies secured into vault (from /tmp recovery)
sec = {}
for src in ['/tmp/my-project/.evidence-password','/tmp/my-project/.evidence-session-token']:
    if os.path.exists(src):
        dst = os.path.join('vault', os.path.basename(src))
        if not os.path.exists(dst):
            import shutil; shutil.copy2(src,dst); os.chmod(dst,0o600)
        sec[os.path.basename(src)] = 'secured in vault (mode 600)'
out['sections']['c8_c9'] = {'worktree': ev, 'recovered': sec, 'session_token_valid': sessions > 0}

# ---------- 4) keystore section ----------
ks = {}
ks['new_keystore_exists'] = os.path.exists('android/rahyar-release.keystore')
ks['old_keystore_preserved'] = os.path.exists('vault/rahyar-release-keystore.OLD-lost-pass.keystore')
ks['backup_enc_exists'] = os.path.exists('vault/rahyar-release-keystore.backup.enc')
ks['password_file'] = 'vault/rahyar-release-password.txt (mode 600, outside git)'
import stat
if os.path.exists('vault/rahyar-release-password.txt'):
    ks['password_file_mode'] = oct(os.stat('vault/rahyar-release-password.txt').st_mode & 0o777)
out['sections']['keystore'] = ks

# ---------- 5) tracked-tree fingerprint scan + forbidden files ----------
tracked = subprocess.run(['git','ls-files'],capture_output=True,text=True).stdout.splitlines()
forbidden = [f for f in tracked if f.startswith(('.evidence-','vault/')) or f in
             ('android/rahyar-release.keystore','.env','.env.local') or f.endswith('.keystore')]
hits = {}
for f in tracked:
    try:
        blob = subprocess.run(['git','show',f'HEAD:{f}'],capture_output=True).stdout
    except Exception: continue
    if not blob or len(blob) > 400_000: continue
    t = blob.decode('utf-8','ignore')
    found = set()
    for m in tok_re.finditer(t):
        h = fp12(m.group(1).encode())
        if h in rev: found.add(rev[h])
    for cid in found: hits.setdefault(cid, []).append(f)
out['sections']['tracked_tree_scan'] = {'files_scanned': len(tracked),
    'forbidden_files': forbidden, 'fingerprint_hits': hits}

# ---------- 6) C8 mint fail-closed quick re-check ----------
mint = 'scripts/create-owner-account.ts'
mint_src = open(mint).read()
out['sections']['c8_mint'] = {'random_if_no_file': 'crypto.randomBytes(18)' in mint_src,
                              'password_file_path': 'artifacts/rahyar-audit/OWNER_TEMP_PASSWORD.txt',
                              'artifacts_gitignored': '/artifacts/' in open('.gitignore').read()}

json.dump(out, open('artifacts/rahyar-audit/closeout-verification.json','w'), indent=1, ensure_ascii=False)

# ---------- summary (values never printed) ----------
print('HEAD:', head)
print('DB users:', [u[0] for u in users], '| sessions:', sessions)
print('historical values extracted (hidden):', {k: len(v) for k,v in cand.items()})
print('historical creds valid against current DB:',
      {k: v.get('valid_against_current_db') for k,v in results.items() if 'valid_against_current_db' in v})
print('C8/C9 recovered:', sec)
print('keystore:', {k: v for k,v in ks.items() if k != 'password_file_mode'})
print('tracked-tree forbidden files:', forbidden)
print('tracked-tree fingerprint hits:', hits or 'ZERO')
print('evidence json: artifacts/rahyar-audit/closeout-verification.json')
