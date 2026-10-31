#!/usr/bin/env python3
"""P0-6R Stage 2 — local untracked keystore-material probe + build-script var map.
Checks owner-local (untracked, out-of-repo) config paths for keystore passwords,
tests them against the current keystore MAC (masked), and maps which build-script
variable carries which fingerprint and whether it feeds the debug or release call."""
import subprocess, hashlib, json, os, re, shutil, tempfile

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

def mac_ok(val):
    tmpd = tempfile.mkdtemp(prefix="ksloc_")
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

# ── A. local untracked material ──────────────────────────────────
loc = {"android/keystore.properties": os.path.join(REPO, "android/keystore.properties"),
       "android/keystore/": os.path.join(REPO, "android/keystore"),
       "backups/android-release-keystore/": os.path.join(REPO, "backups/android-release-keystore"),
       "backups/": os.path.join(REPO, "backups")}
out = {"local_paths": {}}
for name, path in loc.items():
    out["local_paths"][name] = {"exists": os.path.exists(path),
                                "is_dir": os.path.isdir(path) if os.path.exists(path) else None,
                                "entries": sorted(os.listdir(path))[:12] if os.path.isdir(path) else None}
print(json.dumps(out["local_paths"], indent=1))

# harvest candidate values from local untracked sources (masked)
cands = {}
def harvest(path, label):
    if os.path.isfile(path) and os.path.getsize(path) < 200_000:
        text = open(path, "rb").read().decode("utf-8", "replace")
        for m in re.finditer(r"(?m)^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*[:=]\s*(\S+)\s*$", text):
            cands.setdefault(fp_of(m.group(2)), {"label": label, "var": m.group(1), "len": len(m.group(2)), "val": m.group(2)})
        for m in re.finditer(r"['\"]([^'\"\n]{4,120})['\"]", text):
            cands.setdefault(fp_of(m.group(1)), {"label": label, "var": "(quoted)", "len": len(m.group(1)), "val": m.group(1)})
    elif os.path.isdir(path):
        for root, _, files in os.walk(path):
            for f in files:
                if f.lower().endswith((".keystore", ".jks", ".p12", ".zip", ".png", ".jpg")):
                    continue
                harvest(os.path.join(root, f), label + "/" + f)

for name, path in loc.items():
    if os.path.exists(path):
        harvest(path, name)

print("local candidate fps:", {h: {k: v[k] for k in ("label", "var", "len")} for h, v in cands.items()})
opened = []
for h, meta in cands.items():
    if mac_ok(meta["val"]):
        opened.append({"fp": h, "label": meta["label"], "var": meta["var"], "len": meta["len"],
                       "registered_as": FP2ID.get(h, "UNREGISTERED")})
print("OPENED from local untracked sources:", json.dumps(opened, ensure_ascii=False))

# keytool detail for opener
detail = []
for o in opened:
    val = cands[o["fp"]]["val"]
    tmpd = tempfile.mkdtemp(prefix="ksdet_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    r = subprocess.run(["bash", "-c", 'keytool -list -v -keystore "$0" -storepass "$KSPROBE_SP" </dev/null', tmpks],
                       capture_output=True, env=env, timeout=15, stdin=subprocess.DEVNULL)
    txt = (r.stdout if r.returncode == 0 else r.stderr).decode("utf-8", "replace")
    detail.append({"fp": o["fp"], "rc": r.returncode,
                   "keystore_type": (re.search(r"Keystore type:\s*(\S+)", txt).group(1) if re.search(r"Keystore type:\s*(\S+)", txt) else None),
                   "aliases": re.findall(r"Alias name:\s*(\S+)", txt),
                   "cert_sha256": re.findall(r"SHA256:\s*([A-F0-9:]{20,})", txt),
                   "validity": [v[:90] for v in re.findall(r"Valid from:[^\n]*", txt)],
                   "entry_count": (re.search(r"contains (\d+) entr", txt).group(1) if re.search(r"contains (\d+) entr", txt) else None)})
    shutil.rmtree(tmpd, ignore_errors=True)
for d in detail:
    print("detail:", json.dumps(d, ensure_ascii=False))

# ── B. build-script variable→fp map + usage sites ────────────────
def gshow(p):
    r = subprocess.run(["git", "-C", REPO, "show", f"main:{p}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

varmap = {}
for p in ("scripts/build-android-rebuild.sh", "scripts/build-android-apk-v11.sh", "scripts/build-android-apk.sh"):
    text = gshow(p)
    d = {"var_fps": [], "usage": []}
    for m in re.finditer(r"(?m)^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['\"]?([^'\"\n#]{4,120})['\"]?", text):
        name, val = m.group(1), m.group(2).strip()
        if "$" in val or "`" in val:
            continue  # derived values, not literals
        h = fp_of(val)
        if h in FP or 4 <= len(val) <= 60:
            d["var_fps"].append({"name": name, "fp": h, "len": len(val), "registered": FP2ID.get(h)})
    lines = text.splitlines()
    for i, ln in enumerate(lines, 1):
        if re.search(r"keytool|apksigner|jarsigner|-storepass|-keypass", ln):
            uses = [v["name"] for v in d["var_fps"] if re.search(r"\b" + re.escape(v["name"]) + r"\b", ln)]
            ctx = "release" if re.search(r"release|rahyar", ln + (lines[i] if i < len(lines) else "")) else "debug/other"
            d["usage"].append({"line": i, "vars": uses, "ctx_hint": ctx})
    varmap[p] = d
    print("==", p)
    for v in d["var_fps"][:12]:
        print("   var:", v["name"], "fp:", v["fp"], "len:", v["len"], "reg:", v["registered"])
    for u in d["usage"][:12]:
        print("   use:", u)

out["local_openers"] = opened
out["local_opener_detail"] = detail
out["build_script_varmap"] = {p: {"var_fps": d["var_fps"][:14]} for p, d in varmap.items()}
with open(os.path.join(EV, "p06r_stage2_local_probe.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("json written")
