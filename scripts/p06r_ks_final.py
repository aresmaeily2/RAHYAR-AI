#!/usr/bin/env python3
"""P0-6R Stage 2 — closing the sweep gaps: (a) micro-test of ALL short literals
(2..14 chars) from keystore-producing scripts; (b) global UNQUOTED-token sweep
(3..64 printable-ASCII) across all tracked files; (c) P0-1/keystore doc lines;
(d) commits of 2026-10-28 (names only). openssl-fast, masked output."""
import subprocess, hashlib, json, os, re, shutil, tempfile
from concurrent.futures import ThreadPoolExecutor

REPO = "/home/z/my-project"
KS = os.path.join(REPO, "android/rahyar-release.keystore")
EV = os.path.join(REPO, "download/P0_6R_evidence")
FP = {"C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82", "C4": "dd65b755befe",
      "C5": "8eb38003b10d", "C6": "e20de4c418c6", "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15",
      "C9": "ff9d8259a6e5", "C10": "9774fdedae3b"}
FP2ID = {v: k for k, v in FP.items()}

def fp_of(b):
    if isinstance(b, str):
        b = b.encode()
    return hashlib.sha256(b).hexdigest()[:12]

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True)

def gshow(p):
    r = git("show", f"main:{p}")
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

def mac_ok(val):
    tmpd = tempfile.mkdtemp(prefix="ksm_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    try:
        r = subprocess.run(["bash", "-c", 'openssl pkcs12 -in "$0" -passin env:KSPROBE_SP -noout </dev/null', tmpks],
                           capture_output=True, env=env, timeout=10, stdin=subprocess.DEVNULL)
        rc = r.returncode
    except subprocess.TimeoutExpired:
        rc = -1
    shutil.rmtree(tmpd, ignore_errors=True)
    return rc == 0

# (a) micro-test: every literal 2..14 chars from build/keystore scripts
micro = set()
for p in ("scripts/build-android-apk-v11.sh", "scripts/build-android-rebuild.sh",
          "scripts/build-android-apk.sh", "scripts/build-android-apk-v2-rebuild.sh",
          "scripts/gen-gradle-manifest.sh", "scripts/apply-gu2.sh", "android/app/build.gradle"):
    t = gshow(p)
    if not t:
        continue
    for m in re.finditer(r"['\"]([^'\"\n]{2,14})['\"]", t):
        micro.add(m.group(1))
    for m in re.finditer(r"(?m)^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*['\"]?([^'\"\n#]{2,14})['\"]?", t):
        micro.add(m.group(1).strip())
micro = {c for c in micro if c and "\n" not in c}
print("micro candidates:", len(micro))
micro_open = [c for c in sorted(micro) if mac_ok(c)]
print("micro OPENED:", [f"<masked:{fp_of(c)}:{len(c)}>" for c in micro_open] if micro_open else "NONE")

# (b) global unquoted-token sweep
tracked = [l for l in git("ls-files").stdout.decode().splitlines() if l.strip()]
SKIP_EXT = (".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".keystore", ".jks",
            ".p12", ".jar", ".zip", ".mp4", ".webm", ".svg", ".ico", ".gif")
PRINTABLE = re.compile(r"^[\x21-\x7e]{3,64}$")
pool = set()
for p in tracked:
    if p.lower().endswith(SKIP_EXT):
        continue
    fp = os.path.join(REPO, p)
    if not os.path.isfile(fp) or os.path.getsize(fp) > 2_500_000:
        continue
    try:
        text = open(fp, "rb").read().decode("utf-8", "replace")
    except Exception:
        continue
    for tok in re.split(r"[\s\"'`,;=(){}\[\]<>|&]+", text):
        if PRINTABLE.match(tok):
            pool.add(tok)
for p in (".evidence-password", ".evidence-session-token"):
    fp = os.path.join(REPO, p)
    if os.path.isfile(fp):
        raw = open(fp, "rb").read().strip()
        try:
            pool.add(raw.decode())
        except Exception:
            pass
pool = {c for c in pool if c and "\n" not in c}
byfp = {}
for c in pool:
    byfp.setdefault(fp_of(c), c)
print("token sweep pool:", len(pool), "literals ->", len(byfp), "unique fps", flush=True)

def try_one(item):
    h, val = item
    tmpd = tempfile.mkdtemp(prefix="kst_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    try:
        r = subprocess.run(["bash", "-c", 'openssl pkcs12 -in "$0" -passin env:KSPROBE_SP -noout </dev/null', tmpks],
                           capture_output=True, env=env, timeout=10, stdin=subprocess.DEVNULL)
        rc = r.returncode
    except subprocess.TimeoutExpired:
        shutil.rmtree(tmpd, ignore_errors=True)
        return ("timeout", h, None)
    shutil.rmtree(tmpd, ignore_errors=True)
    return ("open" if rc == 0 else "fail", h, None)

opened = []
n = 0
with ThreadPoolExecutor(max_workers=16) as ex:
    for status, h, _ in ex.map(try_one, sorted(byfp.items())):
        n += 1
        if n % 20000 == 0:
            print("  progress:", n, flush=True)
        if status == "open":
            opened.append(h)
print("token sweep OPENED:", [f"<masked:{h}:{len(byfp[h])}>" + (":" + FP2ID.get(h, "UNREG")) for h in opened] if opened else "NONE")

# (c) P0-1 / keystore documentation lines (safe only)
SUSP = re.compile(r"pass|secret|token|رمز", re.I)
doclines = {}
for p in ("scripts/gen-pre-p0-report.js", "android/README.md"):
    t = gshow(p)
    lines = []
    for i, ln in enumerate(t.splitlines(), 1):
        low = ln.lower()
        if "keystore" in low or "p0-1" in low or "پشتیبان" in ln or "signing" in low:
            if not SUSP.search(ln) and not any(fp_of(c) in FP.values() for c in re.findall(r"['\"]([^'\"\n]{4,120})['\"]", ln)):
                if len(ln.strip()) > 10 and len(ln.strip()) < 220:
                    lines.append(f"{i}: {ln.strip()[:190]}")
    doclines[p] = lines[:14]
    print("==", p)
    for l in lines[:14]:
        print("   ", l)

# (d) commits on 2026-10-28 (names only)
commits28 = git("log", "main", "--since", "2026-10-28 00:00", "--until", "2026-10-29 00:00",
                "--format=%h %ad %s", "--date=iso").stdout.decode().splitlines()
print("== commits 2026-10-28 ==", len(commits28))
for c in commits28[:10]:
    print("   ", c[:90])
files28 = git("diff", "--name-status", commits28[-1].split()[0] + "^", "main", "--",
              "android/") if commits28 else None

with open(os.path.join(EV, "p06r_stage2_ks_final.json"), "w") as f:
    json.dump({"micro_candidates": len(micro), "micro_opened_fps": [fp_of(c) for c in micro_open],
               "token_pool": len(pool), "token_fps_tried": len(byfp),
               "token_opened_fps": opened,
               "p0_1_doc_lines": doclines,
               "commits_2026_10_28": commits28[:10]}, f, ensure_ascii=False, indent=1)
print("json written")
