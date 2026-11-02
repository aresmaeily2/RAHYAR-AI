# -*- coding: utf-8 -*-
"""Build git-filter-repo replace-text map from local history (values never printed).
Extracts every token whose SHA-256[:12] matches the C1..C10 registry, plus the
keystore blob path. Output: callbacks file + procedure script (no secret values)."""
import hashlib, json, os, re, subprocess

FP = {'C1':'cec51518b9ac','C2':'ee0880daa2ca','C3':'f60ed56a9c82','C4':'dd65b755befe',
      'C5':'8eb38003b10d','C6':'e20de4c418c6','C7':'46d0a91d1e48',
      'C8':'8aa62d3b0a15','C9':'ff9d8259a6e5','C10':'9774fdedae3b'}
rev = {v:k for k,v in FP.items()}
vals = {}
p = subprocess.run(['git','cat-file','--batch-all-objects','--batch-check'],capture_output=True,text=True)
blobs = [l.split()[0] for l in p.stdout.splitlines() if l.split()[1:2]==['blob']]
tok_re = re.compile(r"""["'`]?([A-Za-z0-9_+=/.\-@#$%!]{4,80})["'`]?""")
for b in blobs:
    t = subprocess.run(['git','cat-file','blob',b],capture_output=True).stdout.decode('utf-8','ignore')
    if len(t) > 500_000: continue
    for m in tok_re.finditer(t):
        h = hashlib.sha256(m.group(1).encode()).hexdigest()[:12]
        if h in rev: vals.setdefault(rev[h], set()).add(m.group(1))
# write replace-text file (mode 600) — literally: value==>***REMOVED***
lines = []
for cid in sorted(vals):
    for v in sorted(vals[cid]):
        lines.append(f'{v}==>{cid}-REMOVED')
open('replacements.txt','w').write('\n'.join(lines)+'\n')
os.chmod('replacements.txt', 0o600)
json.dump({k: len(v) for k,v in vals.items()}, open('replace-stats.json','w'))
print('unique values mapped (hidden):', {k: len(v) for k,v in vals.items()})
print('replacements.txt written (mode 600)')
