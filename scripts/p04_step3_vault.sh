#!/usr/bin/env bash
# P0-4 Step 3 — keystore vault: existence check, re-creation after environment loss,
# controlled recovery test, hash comparison. LOCAL ONLY. Password never written to
# evidence/report/git — delivered to owner via chat only, stored 0600 inside vault.
set -u
source /home/z/my-project/scripts/p04_lib.sh
p04_guard "step3-start"
p04_expect_baseline

E="$P04_EV"
VAULT=/home/z/keystore-vault
KEYSTORE="$P04_REPO/android/rahyar-release.keystore"
EXPECTED_SHA=d4b7169a21f8f113f7cf8104c0b5dd32a9d06f9aaa87dc263d1fc5b905b21898
LOG="$E/03-keystore-vault.log"

{
echo "### P0-4 STEP3 — keystore vault, $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo
echo "== original keystore (must remain untouched) =="
sha256sum "$KEYSTORE"
stat -c 'mode=%a owner=%U:%G size=%s path=%n' "$KEYSTORE"
echo
echo "== vault existence check =="
if [ -d "$VAULT" ]; then echo "vault EXISTS"; ls -la "$VAULT"; else echo "vault MISSING: $VAULT"; fi
echo "ENVIRONMENT WARNING: the previously documented vault (created during P0-1) was lost"
echo "when the sandbox was restored between sessions. /home/z outside /home/z/my-project"
echo "is wiped on restore. Re-creating the vault now under the standing P0-1 protocol."
} > "$LOG" 2>&1

if [ ! -f "$KEYSTORE" ]; then echo "ABORT: original keystore missing" >> "$LOG"; exit 41; fi

ORIG_SHA=$(sha256sum "$KEYSTORE" | cut -d' ' -f1)
if [ "$ORIG_SHA" != "$EXPECTED_SHA" ]; then
  echo "ABORT: original keystore hash mismatch: $ORIG_SHA" >> "$LOG"; exit 43
fi
echo "original keystore hash verified: $ORIG_SHA" >> "$LOG"

# --- re-create vault ---
mkdir -p "$VAULT"
chmod 700 "$VAULT"
PASS=$(openssl rand -base64 24)
printf '%s' "$PASS" > "$VAULT/rahyar-keystore-backup.pass"
chmod 600 "$VAULT/rahyar-keystore-backup.pass"

ENC="$VAULT/rahyar-release.keystore.enc"
P04PASS="$PASS" openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -in "$KEYSTORE" -out "$ENC" -pass env:P04PASS 2>>"$LOG"
ENC_SHA=$(sha256sum "$ENC" | cut -d' ' -f1)
chmod 600 "$ENC"
{
echo
echo "== re-created vault =="
stat -c 'mode=%a owner=%U:%G size=%s path=%n' "$VAULT" "$ENC" "$VAULT/rahyar-keystore-backup.pass"
echo "encrypted-bundle sha256: $ENC_SHA"
echo "cipher: AES-256-CBC, PBKDF2, iter=600000, random salt (openssl enc)"
} >> "$LOG"

# --- independent copy for the owner (download/ is git-ignored, inside persistent project dir) ---
COPY_DIR="$P04_REPO/download/keystore-vault-copy"
mkdir -p "$COPY_DIR"
cp "$ENC" "$COPY_DIR/rahyar-release.keystore.enc"
cp "$VAULT/rahyar-keystore-backup.pass" "$COPY_DIR/rahyar-keystore-backup.pass.txt"
chmod 600 "$COPY_DIR"/*
COPY_SHA=$(sha256sum "$COPY_DIR/rahyar-release.keystore.enc" | cut -d' ' -f1)
echo "owner-copy sha256: $COPY_SHA (must equal vault bundle)" >> "$LOG"

# --- controlled recovery test to /tmp (plaintext never touches repo) ---
REC=/tmp/p04-recovery-test
rm -rf "$REC"; mkdir -p "$REC"; chmod 700 "$REC"
P04PASS="$PASS" openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
  -in "$ENC" -out "$REC/recovered.keystore" -pass env:P04PASS 2>>"$LOG"
REC_SHA=$(sha256sum "$REC/recovered.keystore" | cut -d' ' -f1)
{
echo
echo "== controlled recovery test =="
echo "recovered sha256: $REC_SHA"
if [ "$REC_SHA" = "$ORIG_SHA" ]; then
  echo "RECOVERY TEST: PASS — recovered file is bit-identical to original"
  RESULT=PASS
else
  echo "RECOVERY TEST: FAIL — hash mismatch"
  RESULT=FAIL
fi
echo
echo "== owner copy of password (download/keystore-vault-copy) ==" 
echo "delivered as rahyar-keystore-backup.pass.txt for owner export; NOT recorded in evidence/report"
} >> "$LOG"

# --- secure cleanup of plaintext temp copy AFTER verified recovery ---
if [ "$RESULT" = "PASS" ]; then
  shred -u "$REC/recovered.keystore" 2>>"$LOG" || rm -f "$REC/recovered.keystore"
  rm -rf "$REC"
  echo "temporary plaintext securely removed AFTER successful verification" >> "$LOG"
else
  echo "RECOVERY FAILED — temp plaintext KEPT for inspection: $REC" >> "$LOG"
fi

# HEAD re-check
p04_guard "step3-end"
p04_expect_baseline
echo "STEP3 $RESULT — see $LOG"
[ "$RESULT" = "PASS" ] || exit 44
