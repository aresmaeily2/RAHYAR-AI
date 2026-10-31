#!/usr/bin/env python3
"""P0-6R Stage 2 — full-repo keystore store-pass sweep v2 (openssl-fast, masked).
Every quoted literal (4..120) from every tracked text file + the two .evidence
value files, deduped by fp, tested against the PKCS12 MAC via openssl pkcs12.
Prints fps/classes only. Original keystore never written; temp copies shredded."""
import subprocess, hashlib, json, os, re, shutil, tempfile
from concurrent.futures import ThreadPoolExecutor

REPO = "/home/z/my-project"
KS = os.path.join(REPO, "android/rahyar-release.keystore")
EV = os.path.join(REPO, "download/P0_6R_evidence")
FP = {"C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82", "C4": "dd65b755befe",
      "C5": "8eb38003b10d", "C6": "e20de4c418c6", "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15",
      "C9": "ff9d8259a6e5", "C10": "9774fdedae3b"}
FP2ID = {v: k for k, v in FP.items()}
SKIP_EXT = (".png", ".jpg", ".jpeg", ".webp", ".woff", ".woff2", ".keystore", ".jks",
            ".p12", ".jar", ".zip", ".mp4", ".webm", ".svg", ".ico", ".gif")

def fp_of(b):
    if isinstance(b, str):
        b = b.encode()
    return hashlib.sha256(b).hexdigest()[:12]

def git(*a):
    return subprocess.run(["git", "-C", REPO] + list(a), capture_output=True)

tracked = [l for l in git("ls-files").stdout.decode().splitlines() if l.strip()]
pool, files_scanned = set(), 0
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
    files_scanned += 1
    for m in re.finditer(r"['\"]([^'\"\n]{4,120})['\"]", text):
        pool.add(m.group(1))
for p in (".evidence-password", ".evidence-session-token"):
    fp = os.path.join(REPO, p)
    if os.path.isfile(fp):
        raw = open(fp, "rb").read()
        for cand in (raw, raw.rstrip(b"\r\n"), raw.strip()):
            try:
                pool.add(cand.decode())
            except Exception:
                pass
pool = {c for c in pool if "\n" not in c and len(c) <= 120}
byfp = {}
for c in pool:
    byfp.setdefault(fp_of(c), c)
print(f"scanned {files_scanned} files -> {len(pool)} literals -> {len(byfp)} unique fps", flush=True)

def try_one(item):
    h, val = item
    tmpd = tempfile.mkdtemp(prefix="kssweep_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    try:
        r = subprocess.run(["bash", "-c", 'openssl pkcs12 -in "$0" -passin env:KSPROBE_SP -noout </dev/null', tmpks],
                           capture_output=True, env=env, timeout=10, stdin=subprocess.DEVNULL)
        rc, txt = r.returncode, (r.stdout + r.stderr).decode("utf-8", "replace")
    except subprocess.TimeoutExpired:
        shutil.rmtree(tmpd, ignore_errors=True)
        return ("timeout", h, None)
    shutil.rmtree(tmpd, ignore_errors=True)
    if rc == 0:
        return ("open", h, None)
    cls = txt.strip().splitlines()[0][:90] if txt.strip() else "no-output"
    return ("fail", h, cls)

results = {"open": [], "fail": {}, "timeout": []}
with ThreadPoolExecutor(max_workers=16) as ex:
    for status, h, info in ex.map(try_one, sorted(byfp.items())):
        if status == "open":
            results["open"].append(h)
        elif status == "fail":
            results["fail"].setdefault(info, []).append(h)
        else:
            results["timeout"].append(h)

print("== OPENED fps ==", results["open"])
print("opened count:", len(results["open"]),
      "| registered ids:", sorted({FP2ID.get(h, "UNREGISTERED:" + h) for h in results["open"]}))
print("== failure classes ==")
for cls, fps in sorted(results["fail"].items(), key=lambda kv: -len(kv[1])):
    print(f"  [{len(fps)}] {cls}")
print("timeouts:", len(results["timeout"]))

# keytool detail pass for any opener (masked)
detail = []
for h in results["open"]:
    val = byfp[h]
    tmpd = tempfile.mkdtemp(prefix="ksdet_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    try:
        r = subprocess.run(["bash", "-c", 'keytool -list -v -keystore "$0" -storepass "$KSPROBE_SP" </dev/null', tmpks],
                           capture_output=True, env=env, timeout=15, stdin=subprocess.DEVNULL)
        txt = (r.stdout if r.returncode == 0 else r.stderr).decode("utf-8", "replace")
        detail.append({"candidate_fp": h, "registered_as": FP2ID.get(h, "UNREGISTERED"),
                       "rc": r.returncode,
                       "keystore_type": (re.search(r"Keystore type:\s*(\S+)", txt) or [None]) and (re.search(r"Keystore type:\s*(\S+)", txt).group(1) if re.search(r"Keystore type:\s*(\S+)", txt) else None),
                       "entry_count": (re.search(r"contains (\d+) entr", txt) or [None]) and (re.search(r"contains (\d+) entr", txt).group(1) if re.search(r"contains (\d+) entr", txt) else None),
                       "aliases": re.findall(r"Alias name:\s*(\S+)", txt),
                       "cert_sha256": re.findall(r"SHA256:\s*([A-F0-9:]{20,})", txt),
                       "validity": [v[:90] for v in re.findall(r"Valid from:[^\n]*", txt)]})
    except subprocess.TimeoutExpired:
        detail.append({"candidate_fp": h, "rc": "timeout"})
    shutil.rmtree(tmpd, ignore_errors=True)
for d in detail:
    print("detail:", json.dumps(d, ensure_ascii=False))

with open(os.path.join(EV, "p06r_stage2_ks_sweep.json"), "w") as f:
    json.dump({"tool": "openssl pkcs12 MAC verification (calibrated 2026-10-31)",
               "files_scanned": files_scanned, "unique_fps_tried": len(byfp),
               "opened_fps": results["open"],
               "opened_detail": detail,
               "failure_classes": {k: len(v) for k, v in results["fail"].items()},
               "timeouts": len(results["timeout"]),
               "c3_opened": FP["C3"] in results["open"],
               "c4_opened": FP["C4"] in results["open"]}, f, ensure_ascii=False, indent=1)
print("json written")
