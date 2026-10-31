#!/usr/bin/env python3
"""P0-6R Stage 2 — masked dump v2 (value-substring masking, defense in depth).
Rebuilds the keytool/apksigner structure evidence WITHOUT any raw value:
(1) every literal value harvested from the file is replaced by <masked:fp:len>
    as a SUBSTRING replacement (catches pass:VALUE forms);
(2) any pass:XXXX / PASS=XXXX fragment is masked unconditionally."""
import subprocess, hashlib, re, os, json

REPO = "/home/z/my-project"
EV = os.path.join(REPO, "download/P0_6R_evidence")

def fp_of(b):
    if isinstance(b, str):
        b = b.encode()
    return hashlib.sha256(b).hexdigest()[:12]

def gshow(p):
    r = subprocess.run(["git", "-C", REPO, "show", f"main:{p}"], capture_output=True)
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else ""

TARGET_BLOCKS = {
    "scripts/build-android-apk-v11.sh": [(55, 99)],
    "scripts/build-android-rebuild.sh": [(50, 83)],
    "scripts/build-android-apk.sh": [(40, 70)],
}
out = {}
for p, ranges in TARGET_BLOCKS.items():
    text = gshow(p)
    lines = text.splitlines()
    # harvest EVERY literal value in the file (quoted + unquoted command tokens)
    values = set()
    for m in re.finditer(r"['\"]([^'\"\n]{3,120})['\"]", text):
        values.add(m.group(1))
    for m in re.finditer(r"(?m)^\s*[A-Za-z_][A-Za-z0-9_]*\s*=\s*['\"]?([^'\"\n#]{3,120})['\"]?", text):
        values.add(m.group(1).strip())
    for tok in re.split(r"[\s\"'`,;=(){}\[\]<>|&]+", text):
        if 3 <= len(tok) <= 120:
            values.add(tok)
    vmap = [(v, fp_of(v)) for v in values]  # value kept ONLY in memory
    keep = []
    for a, b in ranges:
        for i in range(a, min(b, len(lines)) + 1):
            ln = lines[i - 1]
            # (1) unconditional pass-fragment masking
            ln = re.sub(r"(pass\s*[:=]\s*)(\S+)", r"\1<masked>", ln, flags=re.I)
            ln = re.sub(r"(-{1,2}(?:ks-)?(?:store|key)-?pass\s+)(\S+)", r"\1<masked>", ln, flags=re.I)
            ln = re.sub(r"(-{1,2}(?:ks-)?(?:store|key)pass=)(\S+)", r"\1<masked>", ln, flags=re.I)
            # (2) substring replacement of every harvested value
            for v, h in sorted(vmap, key=lambda x: -len(x[0])):
                if v in ln:
                    ln = ln.replace(v, f"<masked:{h}:{len(v)}>")
            keep.append(f"{i}: {ln}")
    out[p] = keep
    print("=" * 10, p)
    for k in keep:
        print("  ", k)

with open(os.path.join(EV, "p06r_stage2_keytool_structure.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# verification: no harvested value survives in the JSON evidence
dumped = json.dumps(out, ensure_ascii=False)
leaks = [f"<LEAK:{h}>" for v, h in vmap if len(v) >= 6 and v in dumped]
print("leak check (values >=6 chars present in evidence json):", leaks if leaks else "NONE")
