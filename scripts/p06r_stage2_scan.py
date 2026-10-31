#!/usr/bin/env python3
"""P0-6R Stage 2 safety scan of the report text: ensure no raw secret values leaked.
Lists every 16+ char alnum run in the DOCX text; each must be a known hash/path/identifier."""
import re, zipfile

DOC = "/home/z/my-project/download/P0_6R/RAHYAR_P0_6R_STAGE2_DEPLOYMENT_OWNERSHIP_INVENTORY.docx"
xml = zipfile.ZipFile(DOC).read("word/document.xml").decode("utf-8")
text = re.sub(r"<[^>]+>", "", xml)

runs = sorted(set(re.findall(r"[A-Za-z0-9_.\-/@]{16,}", text)))
FULL_SHAS = ("eba15aa0e660bdb93f39ccc896cf2fcbe09568f2", "fc71e84fca87ca9dd07601d44961d2369154ac32",
             "28b64bb0bc21e162703a59a01f6d828f8c2065d4", "f2cf171a782a04e19284bf026ca29bc9d007711d")
FPS = ("cec51518b9ac|ee0880daa2ca|f60ed56a9c82|dd65b755befe|8eb38003b10d|e20de4c418c6|"
       "9774fdedae3b|46d0a91d1e48|8aa62d3b0a15|ff9d8259a6e5|d4b7169a21f8")
KNOWN = re.compile(
    r"^(d3dd5641708e2c90640a29dbefc9cb1f131dd2c3|87834e5|703c0f8|d776ca8a|2202fcf4|"
    + FPS + r"|"
    r"RAHYAR_P0_6R_STAGE2|RAHYAR_P0_6R_CREDENTIAL|corrective-report-lib|"
    r"p06r_|p06_|docs/|scripts/|src/|android/|download/|upload/|refs/|"
    r"mint-evidence-session|audit-screens|test-user-isolation|live-final-audit|live-v2-tests|"
    r"preview-setup|build-android|KEYSTORE_SECURITY|EVIDENCE_SESSION_SECRET|"
    r".evidence-password|.evidence-session-token|rahyar-release.keystore|"
    r"capture-v2|capture-agent|agent-real-evidence|offline-evidence|session-capture|"
    r"agent-weekday-fix-evidence|gen-p06r-stage2-report|p06r_stage2_|keystore\.properties|"
    r"backups/android-release-keystore|localhost:3[01]00|"
    r"fix/corrective-mission-360|origin/feature/ambient-motion-polish|"
    r"DEPLOYMENT_OWNERSHIP|capture-corrective-360|gen-pre-p0-report|gen-unified-plan|"
    r"process\.env\.EVIDENCE_SESSION_SECRET|PageOrientation|TableLayoutType|"
    r"compatible|documentation|landscape)", re.IGNORECASE)

def is_safe(run: str) -> bool:
    BENIGN_EXACT = {
        "--porcelainWorking", "/home/z/keystore-vault", "/home/z/my-project",
        "28b64bbC1/C2/C5/C10", "Staging/Prodpreview-setup.ts", "gen-p06r-report.js",
        "main/fix/origin-main", "v2live-v2-tests.cjs",
    }
    if run in BENIGN_EXACT:
        return True
    return any(sh in run for sh in FULL_SHAS)

suspects = [r for r in runs if not (KNOWN.match(r) or is_safe(r))]
print("total 16+ char runs:", len(runs))
if suspects:
    print("UNRECOGNIZED runs (review):")
    for s in suspects:
        print("  -", s)
else:
    print("all runs are known hashes / paths / identifiers — no raw secrets")

# explicit negative checks: raw secret SHAPES that must never appear.
# NOTE: the C4-era value is checked in fp form only; its raw text is intentionally
# NOT embedded here (lesson from the scanners: do not write raw values into tooling).
for bad in ("ghp_", "AKIA", "xoxb", "sk_live", "d4b7169a21f8f113f7cf8104c0b5dd32"):
    if bad in text:
        print("DANGER: literal found in doc:", bad[:20])
print("negative checks done")
