#!/usr/bin/env python3
"""P0-6R Stage 2 — keystore recovery diagnosis v2 (masked, fast).
Small candidate pool: quoted literals + assignment values only, deduped by fp,
per-candidate timeout + DEVNULL stdin (no prompts). Prints fps/classes only."""
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

def gshow(p):
    r = subprocess.run(["git", "-C", REPO, "show", f"main:{p}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

SOURCES = ["scripts/build-android-rebuild.sh", "scripts/build-android-apk-v11.sh",
           "scripts/build-android-apk.sh", "android/app/build.gradle",
           "android/gradle.properties", "android/README.md", ".env.example",
           "scripts/verify-apk-vs-ed9ec2d.sh", "scripts/package-android-delivery.sh"]
cands = set()
for p in SOURCES:
    text = gshow(p)
    if not text:
        continue
    cands |= set(re.findall(r"['\"]([^'\"\n]{4,120})['\"]", text))
    cands |= set(re.findall(r"(?m)^\s*[A-Za-z_][A-Za-z0-9_.]*\s*[:=]\s*([^\s'\"#][^\s#]*)\s*$", text))
cands |= {""}
cands = {c.strip() for c in cands if "\n" not in c and len(c) <= 120}
byfp = {}
for c in cands:
    byfp.setdefault(fp_of(c), c)  # dedupe by fingerprint
print("unique fp candidates:", len(byfp))

def try_storepass(val):
    tmpd = tempfile.mkdtemp(prefix="ksdiag_")
    tmpks = os.path.join(tmpd, "probe.ks")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    r = subprocess.run(["bash", "-c", 'keytool -list -keystore "$0" -storepass "$KSPROBE_SP" </dev/null', tmpks],
                       capture_output=True, env=env, timeout=8, stdin=subprocess.DEVNULL)
    txt = (r.stdout + r.stderr).decode("utf-8", "replace")
    for c in set(cands):
        if c:
            txt = txt.replace(c, "<masked>")
    shutil.rmtree(tmpd, ignore_errors=True)
    return r.returncode, txt

opened, classes = [], {}
for h, val in sorted(byfp.items()):
    try:
        rc, txt = try_storepass(val)
    except subprocess.TimeoutExpired:
        classes.setdefault("TIMEOUT", []).append(h)
        continue
    if rc == 0:
        entries = re.findall(r"Alias name:\s*(\S+)", txt)
        certs = re.findall(r"SHA256:\s*([A-F0-9:]{20,})", txt)
        valid = [v[:90] for v in re.findall(r"Valid from:[^\n]*", txt)]
        m = re.search(r"Keystore type:\s*(\S+)", txt)
        cnt = re.search(r"contains (\d+) entr", txt)
        opened.append({"candidate_fp": h or "(empty)", "registered_as": FP2ID.get(h, "UNREGISTERED"),
                       "keystore_type": m.group(1) if m else None, "entry_count": cnt.group(1) if cnt else None,
                       "aliases": entries, "cert_sha256": certs, "validity": valid})
    else:
        line = txt.strip().splitlines()[-1][:130] if txt.strip() else "no-output"
        cls = re.sub(r"[A-Za-z0-9+/=]{16,}", "<hex>", line)
        classes.setdefault(cls, []).append(h)

print("== OPENED ==")
for o in opened:
    print(" ", json.dumps(o, ensure_ascii=False))
print("== failure classes ==")
for cls, fps in classes.items():
    print(f"  [{len(fps)}] {cls}  e.g. {fps[:4]}")
print("C3 opened:", any(o["candidate_fp"] == FP["C3"] for o in opened))

# keypass probe for any opener
for o in opened:
    h = o["candidate_fp"]
    val = "" if h == "(empty)" else byfp.get(h, "")
    tmpd = tempfile.mkdtemp(prefix="ksdiag_")
    tmpks = os.path.join(tmpd, "probe.ks"); dest = os.path.join(tmpd, "dest.p12")
    shutil.copy2(KS, tmpks)
    env = dict(os.environ, KSPROBE_SP=val)
    try:
        r2 = subprocess.run(["bash", "-c",
            'keytool -importkeystore -noprompt -srckeystore "$0" -srcstorepass "$KSPROBE_SP" '
            '-destkeystore "$1" -deststorepass "$KSPROBE_SP" -destkeypass "$KSPROBE_SP" -deststoretype PKCS12 </dev/null',
            tmpks, dest], capture_output=True, env=env, timeout=15, stdin=subprocess.DEVNULL)
        o["keypass_ok_same_value"] = r2.returncode == 0
        if r2.returncode != 0:
            t2 = (r2.stdout + r2.stderr).decode("utf-8", "replace")
            for c in set(cands):
                if c:
                    t2 = t2.replace(c, "<masked>")
            o["keypass_errclass"] = t2.strip().splitlines()[-1][:130] if t2.strip() else "no-output"
    except subprocess.TimeoutExpired:
        o["keypass_ok_same_value"] = None
        o["keypass_errclass"] = "TIMEOUT"
    for f in (tmpks, dest):
        if os.path.exists(f):
            sz = os.path.getsize(f)
            with open(f, "wb") as fh:
                fh.write(os.urandom(sz))
            os.unlink(f)
    shutil.rmtree(tmpd, ignore_errors=True)
print("== keypass probe ==")
for o in opened:
    print("  ", o["candidate_fp"], o["registered_as"], "keypass_ok_same_value:", o.get("keypass_ok_same_value"), o.get("keypass_errclass", ""))

with open(os.path.join(EV, "p06r_stage2_ksdiag.json"), "w") as f:
    json.dump({"opened": opened, "failure_classes": {k: len(v) for k, v in classes.items()},
               "c3_candidate_opened": any(o["candidate_fp"] == FP["C3"] for o in opened)}, f, ensure_ascii=False, indent=1)
print("json written")
