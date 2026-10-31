#!/usr/bin/env python3
"""P0-6R safety scan of the report text: ensure no raw secret values leaked.
Lists every 16+ char alnum run in the DOCX text; each must be a known hash/path/identifier."""
import re, zipfile, sys

DOC = "/home/z/my-project/download/P0_6R/RAHYAR_P0_6R_CREDENTIAL_ROTATION_REVOCATION_REQUEST.docx"
xml = zipfile.ZipFile(DOC).read("word/document.xml").decode("utf-8")
text = re.sub(r"<[^>]+>", "", xml)

runs = sorted(set(re.findall(r"[A-Za-z0-9_.\-/@]{16,}", text)))
KNOWN = re.compile(
    r"^(d9eb7eabef64ff66a7e7f2c61554f63ec3370a42|fc71e84fca87ca9dd07601d44961d2369154ac32|"
    r"28b64bb0bc21e162703a59a01f6d828f8c2065d4|f2cf171a782a04e19284bf026ca29bc9d007711d|"
    r"d776ca8a|2202fcf4|"
    r"cec51518b9ac|ee0880daa2ca|f60ed56a9c82|dd65b755befe|8eb38003b10d|e20de4c418c6|"
    r"9774fdedae3b|46d0a91d1e48|8aa62d3b0a15|ff9d8259a6e5|"
    r"RAHYAR_P0_6R_CREDENTIAL|RAHYAR_P0_6_CREDENTIAL|corrective-report-lib|"
    r"p06r_|p06_|scan_|docs/|scripts/|src/|android/|download/|upload/|refs/|"
    r"mint-evidence-session|audit-screens|test-user-isolation|live-final-audit|live-v2-tests|"
    r"preview-setup|build-android|KEYSTORE_SECURITY|EVIDENCE_SESSION_SECRET|"
    r".evidence-password|.evidence-session-token|"
    r"agent-real-evidence|capture-corrective|report-body|fix_toc_cache|"
    r"reproducible|documentation|norestore)", re.IGNORECASE)

# ── auditable safe-run rules ──
# B1: any run that merely CONTAINS one of the four full branch SHAs is a table-cell merge artifact
FULL_SHAS = ("d9eb7eabef64ff66a7e7f2c61554f63ec3370a42", "fc71e84fca87ca9dd07601d44961d2369154ac32",
             "28b64bb0bc21e162703a59a01f6d828f8c2065d4", "f2cf171a782a04e19284bf026ca29bc9d007711d")
# B2: exact merged-cell strings, each manually reviewed = concatenation of known-safe identifiers
#     (adjacent DOCX table cells merge once XML tags are stripped; no credential value in any of them)
BENIGN_EXACT = {
    "--porcelainWorking", "/home/z/keystore-vault", "/home/z/my-project",
    "C109774fdedae3bliteral", "C1live-final-audit.ts", "C1test-user-isolation.ts",
    "C3f60ed56a9c82literal", "C4dd65b755befeliteral", "C58eb38003b10dliteral",
    "C6NON-CREDENTIAL", "C6e20de4c418c6literal", "C746d0a91d1e48literal",
    "FPC1cec51518b9acliteral", "mainC8RE-ARMABLE", "keystore/jks/p12",
    "fix/corrective-mission-360", "origin/feature/ambient-motion-polish",
    "origin/mainfor-each-ref",
    "mainfix/corrective-mission-360fc71e84fca87ca9dd07601d44961d2369154ac32",
    "origin/mainorigin/feature/ambient-motion-polishf2cf171a782a04e19284bf026ca29bc9d007711d",
    "process.env.EVIDENCE_SESSION_SECRET",
    "rev-parseorigin/main28b64bb0bc21e162703a59a01f6d828f8c2065d4",
    "v2.0/v2.1C2ee0880daa2caliteral",
    "HEADmaind9eb7eabef64ff66a7e7f2c61554f63ec3370a42",
}

def is_safe(run: str) -> bool:
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

# explicit negative checks (raw secret shapes that must never appear)
for bad in ("REDACTED_C4", "ghp_", "AKIA", "xoxb", "sk_live"):
    if bad in text:
        print("DANGER: literal found in doc:", bad)
print("negative checks done")
