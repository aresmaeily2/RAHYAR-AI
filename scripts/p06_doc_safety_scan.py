#!/usr/bin/env python3
"""P0-6 final safety scan of the report text: ensure no raw secret values leaked.
Lists every 16+ char alnum run in the DOCX text; each must be a known hash/path/identifier."""
import re, zipfile, sys

DOC = "/home/z/my-project/download/P0_6/RAHYAR_P0_6_CREDENTIAL_ROTATION_AND_REMOTE_RISK_REPORT.docx"
xml = zipfile.ZipFile(DOC).read("word/document.xml").decode("utf-8")
text = re.sub(r"<[^>]+>", "", xml)

runs = sorted(set(re.findall(r"[A-Za-z0-9_.\-/@]{16,}", text)))
KNOWN = re.compile(
    r"^(4de08f7a|fc71e84f|28b64bb0|f2cf171a|631dc471|4621c060|ed9ec2d2|d776ca8a|2202fcf4|"
    r"a807354b|16f4706e|3b6bc868|9d479194|91caaa19|e649520c|d3dd564|87834e5|"
    r"cec51518b9ac|ee0880daa2ca|f60ed56a9c82|dd65b755befe|8eb38003b10d|e20de4c418c6|"
    r"9774fdedae3b|46d0a91d1e48|8aa62d3b0a15|ff9d8259a6e5|"
    r"d4b7169a21f8f113f7cf8104c0b5dd32a9d06f9aaa87dc263d1fc5b905b21898|"
    r"RAHYAR_P0_6_CREDENTIAL|RAHYAR_PRE_P0|corrective-report-lib|"
    r"p06_|scan_|docs/|scripts/|src/|android/|download/|upload/|"
    r"agent-real-evidence|agent-weekday-fix|ai-timed-evidence|capture-agent|"
    r"capture-settings|capture-v21|test-user-isolation|live-final-audit|live-v2-tests|"
    r"preview-setup|session-capture|mint-evidence-session|audit-screens|build-android|"
    r"KEYSTORE_SECURITY|DELIVERY_V2|report-body|gen-apk-delivery-report|"
    r"fix_toc_cache|gen-pre-p0-report|gen-merger-report|gen-unified-plan|capture-corrective|gen-corrective-report|"
    r"reproducible|documentation|norestore)", re.IGNORECASE)

suspects = [r for r in runs if not KNOWN.match(r)]
print("total 16+ char runs:", len(runs))
if suspects:
    print("UNRECOGNIZED runs (review):")
    for s in suspects:
        print("  -", s)
else:
    print("all runs are known hashes / paths / identifiers — no raw secrets")

# explicit negative checks
for bad in ("REDACTED_C4", "ghp_", "AKIA", "xoxb", "sk_live"):
    if bad in text:
        print("DANGER: literal found in doc:", bad)
print("negative checks done")
