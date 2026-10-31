#!/usr/bin/env python3
"""P0-6R Stage 2 — masked audit of keystore-adjacent docs/configs.
Prints only structural facts, line numbers, fps and credential-free lines."""
import subprocess, hashlib, json, os, re

REPO = "/home/z/my-project"
EV = os.path.join(REPO, "download/P0_6R_evidence")
FP = {"C1": "cec51518b9ac", "C2": "ee0880daa2ca", "C3": "f60ed56a9c82", "C4": "dd65b755befe",
      "C5": "8eb38003b10d", "C6": "e20de4c418c6", "C7": "46d0a91d1e48", "C8": "8aa62d3b0a15",
      "C9": "ff9d8259a6e5", "C10": "9774fdedae3b"}

def fp_of(b):
    if isinstance(b, str):
        b = b.encode()
    return hashlib.sha256(b).hexdigest()[:12]

def gshow(p):
    r = subprocess.run(["git", "-C", REPO, "show", f"main:{p}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

def cands(text):
    for m in re.finditer(r"['\"]([^'\"\n]{4,160})['\"]", text):
        yield m.group(1)
    for tok in re.split(r"[\s\"'`,;:=(){}\[\]<>]+", text):
        if 4 <= len(tok) <= 160:
            yield tok

SUSP = re.compile(r"pass|secret|token|keystore|storefile|keyalias|رمز", re.I)
SAFE_LINE = re.compile(r"[A-Za-z0-9\u0600-\u06FF .,_/()\-:|«»؟?]")

FILES = ["android/app/build.gradle", "android/gradle.properties", "android/README.md",
         "docs/DELIVERY_V2/APK_BUILD_REPORT_V2.md", "scripts/gen-pre-p0-report.js",
         "scripts/verify-apk-vs-ed9ec2d.sh", "scripts/build-android-rebuild.sh",
         "scripts/build-android-apk-v11.sh", "docs/DEPLOYMENT.md", "RAHYAR_RELEASE.md"]
out = {}
for p in FILES:
    text = gshow(p)
    if not text:
        out[p] = None
        continue
    d = {"lines": text.count("\n") + 1,
         "getenv_refs": len(re.findall(r"System\.getenv|process\.env|\$[A-Z_]{3,}", text)),
         "suspicious_lines": [], "quoted_literal_fps": {},
         "safe_sig_lines": [], "safe_keystore_mentions": []}
    for m in re.finditer(r"['\"]([^'\"\n]{4,120})['\"]", text):
        h = fp_of(m.group(1))
        if h in FP:
            d["quoted_literal_fps"][m.group(1).count("") and FP[h]] = d["quoted_literal_fps"].get(FP[h], 0) + 1
    for i, ln in enumerate(text.splitlines(), 1):
        if SUSP.search(ln):
            d["suspicious_lines"].append(i)
        low = ln.lower()
        if ("keystore" in low or "signingconfig" in low or "storefile" in low) and SUSP.search(ln):
            # keep only lines with no credential-fp candidate and no '=' literal value
            ok = not any(fp_of(c) in FP.values() for c in cands(ln))
            if ok and len(ln.strip()) < 160 and SAFE_LINE.match(ln.strip()[:40]):
                d["safe_sig_lines"].append(f"{i}:{ln.strip()[:140]}")
        if "keystore" in low and not SUSP.search(ln) and len(d["safe_keystore_mentions"]) < 8:
            d["safe_keystore_mentions"].append(f"{i}:{ln.strip()[:140]}")
    out[p] = d

for p, d in out.items():
    print("=" * 8, p)
    if not d:
        print("  (missing)"); continue
    print("  lines:", d["lines"], "| getenv refs:", d["getenv_refs"],
          "| suspicious-line numbers:", d["suspicious_lines"][:14])
    print("  quoted-literal fp hits:", d["quoted_literal_fps"])
    for s in d["safe_sig_lines"][:10]:
        print("   sig|", s)
    for s in d["safe_keystore_mentions"][:8]:
        print("   ks |", s)

with open(os.path.join(EV, "p06r_stage2_ksadj_audit.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("json written")
