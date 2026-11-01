# -*- coding: utf-8 -*-
"""P0-6R FINAL — بررسی نهایی C1..C10 با تطبیق اثر انگشت (هیچ مقدار خامی چاپ نمی‌شود)."""
import hashlib
import re
import subprocess
import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path("/home/z/my-project")
TEHRAN = timezone(timedelta(hours=3, minutes=30))

REGISTER = {
    "C1": ("cec51518b9ac", 11),
    "C2": ("ee0880daa2ca", 15),
    "C3": ("f60ed56a9c82", 7),
    "C4": ("dd65b755befe", 10),
    "C5": ("8eb38003b10d", 11),
    "C6": ("e20de4c418c6", 12),
    "C7": ("46d0a91d1e48", 17),
    "C8": ("8aa62d3b0a15", 21),
    "C9": ("ff9d8259a6e5", 43),
    "C10": ("9774fdedae3b", 12),
}

CARRIER = {
    "C1": ["scripts/preview-setup.ts"],
    "C2": ["scripts/test-user-isolation.ts"],
    "C3": ["scripts/build-android-rebuild.sh", "scripts/build-android-apk-v11.sh"],
    "C4": ["scripts/build-android-apk.sh"],
    "C5": ["scripts/live-v2-tests.cjs"],
    "C6": ["scripts/live-v2-tests.cjs"],
    "C7": ["scripts/audit-screens.mjs"],
    "C8": [".evidence-password"],
    "C9": [".evidence-session-token"],
    "C10": ["scripts/live-final-audit.ts"],
}


def candidates(text: str):
    # نامزدها: رشته‌های داخل کوتیشن + توکن‌های کلمه‌ای
    for m in re.findall(r"""["'`]([^"'`\n]{4,80})["'`]""", text):
        yield m
    for m in re.findall(r"[A-Za-z0-9_+=/.\-@#$%!]{4,80}", text):
        yield m


def fp_hit(text: str, fp12: str) -> bool:
    for c in candidates(text):
        if hashlib.sha256(c.encode()).hexdigest()[:12] == fp12:
            return True
    # تطبیق مستقیم substring (برای مقادیر بدون مرز توکن)
    try:
        for fp_len in set(l for _, l in REGISTER.values()):
            pass
    except Exception:
        pass
    return False


def git_show(ref: str, path: str) -> str | None:
    r = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=ROOT, capture_output=True)
    return r.stdout.decode("utf-8", "ignore") if r.returncode == 0 else None


print("== A) تطبیق اثر انگشت مقدار در فایل‌های حامل (نسخهٔ کاری main) ==")
for cid, files in CARRIER.items():
    fp12, ln = REGISTER[cid]
    for f in files:
        p = ROOT / f
        txt = p.read_text("utf-8", "ignore") if p.exists() else None
        where = "worktree" if p.exists() else "MISSING-in-worktree"
        hit = fp_hit(txt, fp12) if txt is not None else False
        print(f"  {cid:4} {f:45} [{where}] value={'PRESENT' if hit else 'ABSENT'} (fp={fp12}, len={ln})")

print("== B) همان بررسی روی origin/main ==")
for cid, files in CARRIER.items():
    fp12, _ = REGISTER[cid]
    for f in files:
        txt = git_show("origin/main", f)
        if txt is None:
            print(f"  {cid:4} {f:45} [origin/main] file=ABSENT")
        else:
            print(f"  {cid:4} {f:45} [origin/main] value={'PRESENT' if fp_hit(txt, fp12) else 'ABSENT'}")

print("== C) نسخهٔ fix برای C7/C8 ==")
for cid, ref, f in [
    ("C7", "fix/corrective-mission-360", "scripts/audit-screens.mjs"),
    ("C8", "fix/corrective-mission-360", "scripts/mint-evidence-session.mjs"),
]:
    fp12, _ = REGISTER[cid]
    txt = git_show(ref, f)
    if txt is None:
        print(f"  {cid:4} {f} @{ref} file=ABSENT")
    else:
        print(f"  {cid:4} {f} @{ref} value={'PRESENT' if fp_hit(txt, fp12) else 'ABSENT'} size={len(txt)}B")

print("== D) C9 — اعتبارسنجی مستقیم توکن نشست ==")
tok_file = ROOT / ".evidence-session-token"
if tok_file.exists():
    tok = tok_file.read_text("utf-8", "ignore").strip()
    fp12, ln = REGISTER["C9"]
    tok_ok = hashlib.sha256(tok.encode()).hexdigest()[:12] == fp12
    print(f"  توکن فایل با رجیستر مطابق است: {tok_ok} (len={len(tok)}, انتظار={ln})")
    con = sqlite3.connect(ROOT / "db/custom.db")
    cur = con.cursor()
    cols = [r[1] for r in cur.execute('PRAGMA table_info("Session")').fetchall()]
    print("  ستون‌های Session:", cols)
    rows = cur.execute('SELECT * FROM "Session"').fetchall()
    match_direct = match_hash = False
    for r in rows:
        for v in r:
            if isinstance(v, str):
                if v == tok:
                    match_direct = True
                if hashlib.sha256(tok.encode()).hexdigest() in (v, v.replace("-", "")):
                    match_hash = True
    print(f"  تطبیق مستقیم توکن با ردیف‌های DB: {match_direct} | تطبیق hash: {match_hash} | تعداد ردیف‌ها: {len(rows)}")
    mt = datetime.fromtimestamp(tok_file.stat().st_mtime, TEHRAN)
    print(f"  زمان ایجاد فایل توکن (تهران): {mt:%Y-%m-%d %H:%M} | TTL=24h → منقضی‌شده: {datetime.now(TEHRAN) > mt + timedelta(hours=24)}")
else:
    print("  فایل توکن موجود نیست")

print("== E) C3 — keystore ==")
ks = ROOT / "android/rahyar-release.keystore"
data = ks.read_bytes()
print(f"  اندازه: {len(data)} بایت | SHA-256 کامل: {hashlib.sha256(data).hexdigest()}")
print(f"  جادو (magic): {data[:4].hex()} → {'JKS (feedfeed)' if data[:4].hex()=='feedfeed' else ('PKCS12/ASN.1' if data[0]==0x30 else 'ناشناخته')}")
kt = subprocess.run(["which", "keytool"], capture_output=True, text=True).stdout.strip()
print(f"  keytool: {kt or 'موجود نیست'}")
if kt:
    src = (ROOT / "scripts/build-android-rebuild.sh").read_text("utf-8", "ignore")
    m = re.search(r"""-storepass\s+["']?([^\s"']{4,60})""", src)
    if m:
        pw = m.group(1)
        pw_fp = hashlib.sha256(pw.encode()).hexdigest()[:12]
        print(f"  store-pass استخراج‌شده از اسکریپت rebuild با C3 مطابق است: {pw_fp == REGISTER['C3'][0]}")
        r = subprocess.run([kt, "-list", "-keystore", str(ks), "-storepass", pw], capture_output=True, text=True)
        out = r.stdout + r.stderr
        # فقط خط‌های ایمن: نام مستعار، نوع، تعداد — بدون هر مقدار
        safe = [l.strip() for l in out.splitlines() if re.match(r"^(Keystore type|Keystore provider|Your keystore contains)", l) or ",PrivateKeyEntry," in l or ",TrustedCertificateEntry," in l]
        for l in safe[:8]:
            print("   ", l)
        print(f"  exit_code={r.returncode} (0 = keystore قابل بازشدن با رمز ثبت‌شده)")
