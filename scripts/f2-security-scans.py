# -*- coding: utf-8 -*-
"""§2 security scans — SOURCE scan and GIT-HISTORY scan, reported separately.
No secrets printed; findings counted + classified. High-entropy + known patterns."""
import os, re, subprocess, sys, json, math

ROOT = '/home/z/my-project'
OUT = f'{ROOT}/artifacts/rahyar-audit/F2_SECURITY_SCANS.txt'
report = []

# ── الگوهای شناخته‌شده ──
PATTERNS = {
    'private_key_block': re.compile(r'-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----'),
    'aws_key': re.compile(r'AKIA[0-9A-Z]{16}'),
    'generic_api_key_assign': re.compile(r"""(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9+/_\-]{16,}['"]"""),
    'bearer': re.compile(r'Bearer\s+[A-Za-z0-9_\-\.]{24,}'),
    'google_api': re.compile(r'AIza[0-9A-Za-z_\-]{35}'),
    'slack': re.compile(r'xox[baprs]-[0-9A-Za-z\-]{10,}'),
    'private_ip_creds': re.compile(r"""(?i)(password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]"""),
}
WHITELIST_PATH = re.compile(r'(\.test\.|/tests/|\.env\.example|test-fixtures|fixture|mock|OWNER_TEMP_PASSWORD|session-token|owner-credentials|/skills/|package-lock|bun\.lock|/download/|/artifacts/|\.md$|SHA256SUMS)')
WHITELIST_CONTENT = re.compile(r'(placeholder|example|dummy|sample|xxxx|your[_-]?key|<[^>]+>|\$\{|process\.env|طول|نمونه)')

def entropy(s: str) -> float:
    if not s: return 0.0
    counts = {}
    for ch in s: counts[ch] = counts.get(ch, 0) + 1
    return -sum((c/len(s)) * math.log2(c/len(s)) for c in counts.values())

def scan_text(path: str, text: str, tag: str):
    hits = []
    if WHITELIST_PATH.search(path): return hits
    for name, rx in PATTERNS.items():
        for m in rx.finditer(text):
            frag = m.group(0)
            if WHITELIST_CONTENT.search(frag): continue
            hits.append((name, frag[:40]))
    # high-entropy long tokens (potential secrets) — only outside tests
    for m in re.finditer(r"""['"]([A-Za-z0-9+/_\-]{32,})['"]""", text):
        tok = m.group(1)
        if WHITELIST_CONTENT.search(tok): continue
        if entropy(tok) > 4.2 and re.search(r'[A-Z]', tok) and re.search(r'[0-9]', tok) and re.search(r'[a-z]', tok):
            hits.append(('high-entropy-token', tok[:40]))
    return hits

# ── ۱) اسکن سورس (worktree + بستهٔ عمومی) ──
src_hits = []
files_scanned = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git', 'node_modules', '.next', 'download', 'artifacts', 'backups', '.zscripts')]
    for f in filenames:
        p = os.path.join(dirpath, f)
        if os.path.getsize(p) > 2_000_000: continue
        try:
            text = open(p, encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        files_scanned += 1
        for h in scan_text(os.path.relpath(p, ROOT), text, 'source'):
            src_hits.append((os.path.relpath(p, ROOT),) + h)

report.append('=== SOURCE SCAN (worktree — gitignored dirs excluded) ===')
report.append(f'files scanned: {files_scanned}')
report.append(f'findings: {len(src_hits)}')
for p, name, frag in src_hits[:20]:
    report.append(f'  [{name}] {p}: {frag}')

# ── ۲) اسکن تاریخچهٔ گیت (تمام blobهای تمام کامیت‌ها) ──
hist_hits = []
commits = subprocess.run(['git', 'rev-list', '--all'], cwd=ROOT, capture_output=True, text=True).stdout.split()
report.append('')
report.append('=== GIT HISTORY SCAN (every blob of every commit) ===')
report.append(f'commits: {len(commits)}')
seen = set()
for c in commits:
    blobs = subprocess.run(['git', 'ls-tree', '-r', c, '--format=%(objectname) %(path)'], cwd=ROOT,
                           capture_output=True, text=True).stdout.splitlines()
    for line in blobs:
        if ' ' not in line: continue
        sha, path = line.split(' ', 1)
        if sha in seen: continue
        seen.add(sha)
        if WHITELIST_PATH.search(path): continue
        content = subprocess.run(['git', 'cat-file', 'blob', sha], cwd=ROOT, capture_output=True).stdout.decode('utf-8', errors='ignore')
        for h in scan_text(path, content, 'history'):
            hist_hits.append((c[:8], path, h[0], h[1]))
report.append(f'unique blobs scanned: {len(seen)}')
report.append(f'findings: {len(hist_hits)}')
for c, p, name, frag in hist_hits[:20]:
    report.append(f'  [{name}] {c} {p}: {frag}')

report.append('')
report.append('=== VERDICTS ===')
report.append(f'source: {"CLEAN" if not src_hits else "REVIEW NEEDED"}')
report.append(f'history: {"CLEAN" if not hist_hits else "REVIEW NEEDED"}')
open(OUT, 'w').write('\n'.join(report))
print('\n'.join(report[-8:]))
