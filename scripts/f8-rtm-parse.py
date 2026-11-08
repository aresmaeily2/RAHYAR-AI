#!/usr/bin/env python3
# F8 Mission 1 (Agent 1) — parse F7 RTM (173 rows) into structured JSON for audit.
# Columns of F7 RTM: ID | الزام | معیار پذیرش | لایه | وضعیت | مدرک | راستی‌آزمایی F7
import re, json, sys

RTM = "docs/audit/F7_REQUIREMENTS_TRACEABILITY.md"
ALLOWED = {"VERIFIED", "PARTIAL", "IMPLEMENTED_NOT_TESTED", "NOT_IMPLEMENTED", "BLOCKED", "FAILED"}

rows = []
bad = []
with open(RTM, encoding="utf-8") as f:
    for ln, line in enumerate(f, 1):
        s = line.rstrip("\n")
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 6:
            continue
        rid = cells[0]
        if re.fullmatch(r"[-: ]*", rid) or rid in ("ID",):
            continue
        if not re.match(r"^[A-Z]", rid):  # data rows start with uppercase ID
            continue
        row = {
            "line": ln,
            "id": rid,
            "req": cells[1] if len(cells) > 1 else "",
            "accept": cells[2] if len(cells) > 2 else "",
            "layer": cells[3] if len(cells) > 3 else "",
            "status_f7": cells[4] if len(cells) > 4 else "",
            "evidence": cells[5] if len(cells) > 5 else "",
            "verify_f7": cells[6] if len(cells) > 6 else "",
        }
        if row["status_f7"] not in ALLOWED:
            bad.append((ln, rid, row["status_f7"][:40]))
        rows.append(row)

stat = {}
for r in rows:
    stat[r["status_f7"]] = stat.get(r["status_f7"], 0) + 1

# cycle attribution: F5/F6 ids vs F7 ids
cycles = {}
for r in rows:
    c = "F7" if r["id"].startswith("F7-") else "F5/F6"
    cycles[c] = cycles.get(c, 0) + 1

out = {"total": len(rows), "by_status": stat, "by_cycle": cycles, "bad_status_rows": bad, "rows": rows}
json.dump(out, open("artifacts/logs/f8/rtm_parsed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"total={len(rows)}  statuses={stat}  cycles={cycles}")
for b in bad[:10]:
    print("BAD:", b)
