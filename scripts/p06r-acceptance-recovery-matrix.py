# -*- coding: utf-8 -*-
"""P0-6R ACCEPTANCE — ماتریس بازیابی: ترکیب‌های KDF × تفسیر رمز؛ هیچ مقداری چاپ نمی‌شود."""
import hashlib
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
ENC = ROOT / "vault/rahyar-release-keystore.backup.enc"
PWF = ROOT / "vault/keystore-backup-password.txt"
KS = ROOT / "android/rahyar-release.keystore"
TMP = Path("/tmp/ks-matrix.bin")
KS_SHA = hashlib.sha256(KS.read_bytes()).hexdigest()

raw_bytes = PWF.read_bytes()
txt = raw_bytes.decode("utf-8")
lines = txt.splitlines()

PWS = [
    ("openssl-file-first-line", ["-pass", "file:" + str(PWF)], None),
    ("line1+nl-stdin", ["-pass", "stdin"], (lines[0] + "\n").encode()),
    ("joined-nl", ["-pass", "pass:" + "\n".join(lines)], None),
    ("readtext-trailing-nl", ["-pass", "pass:" + txt], None),
    ("concat-nosep", ["-pass", "pass:" + "".join(lines)], None),
    ("line1", ["-pass", "pass:" + lines[0]], None),
    ("line2", ["-pass", "pass:" + lines[1]], None),
    ("line3", ["-pass", "pass:" + lines[2]], None),
    ("line4", ["-pass", "pass:" + lines[3]], None),
    ("concat-plus-nl", ["-pass", "pass:" + "".join(lines) + "\n"], None),
    ("joined-crlf", ["-pass", "pass:" + "\r\n".join(lines)], None),
    ("concat-plus-crlf", ["-pass", "pass:" + "".join(lines) + "\r\n"], None),
]

KDFS = [
    ("pbkdf2-iter200000", ["-pbkdf2", "-iter", "200000"]),
    ("legacy-evp-nopbkdf2", []),
    ("pbkdf2-default-iter", ["-pbkdf2"]),
    ("pbkdf2-iter200000-sha512", ["-pbkdf2", "-iter", "200000", "-md", "sha512"]),
    ("pbkdf2-iter200000-sha1", ["-pbkdf2", "-iter", "200000", "-md", "sha1"]),
    ("legacy-sha256", ["-md", "sha256"]),
    ("pbkdf2-iter100000", ["-pbkdf2", "-iter", "100000"]),
]

tried = 0
hits = []
for klabel, kargs in KDFS:
    for plabel, pargs, pdata in PWS:
        tried += 1
        if TMP.exists():
            TMP.unlink()
        r = subprocess.run(
            ["openssl", "enc", "-d", "-aes-256-cbc", "-in", str(ENC), "-out", str(TMP)] + kargs + pargs,
            input=pdata, capture_output=True,
        )
        if r.returncode == 0 and TMP.exists() and TMP.stat().st_size > 0:
            s = hashlib.sha256(TMP.read_bytes()).hexdigest()
            hits.append((klabel, plabel, s == KS_SHA, s[:16]))
            print(f"OPENED: kdf={klabel} pw={plabel} sha_match={s == KS_SHA}")
            if s == KS_SHA:
                TMP.unlink()
                print(f"RESULT: PASS — kdf={klabel} pw-interpretation={plabel}")
                raise SystemExit(0)
TMP.unlink(missing_ok=True)
print(f"RESULT: FAIL — {tried} ترکیب هیچ‌کدام باز نکرد")
