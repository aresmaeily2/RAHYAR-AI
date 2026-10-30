#!/usr/bin/env python3
"""P0-6 read-only DB census. Prints COUNTS ONLY (no credential values, no hashes)."""
import sqlite3, os, datetime

DB = "/home/z/my-project/db/custom.db"
if not os.path.exists(DB):
    print("db missing")
    raise SystemExit(0)
con = sqlite3.connect("file:%s?mode=ro" % DB, uri=True)
cur = con.cursor()

def q(sql):
    try:
        return cur.execute(sql).fetchall()
    except Exception as e:
        return [("ERR", str(e)[:80])]

tables = [r[0] for r in q("select name from sqlite_master where type='table'")]
print("tables:", tables)
for t in ("User", "Session"):
    if t in tables:
        print(t, "count =", q("select count(*) from %s" % t)[0][0])
        for row in q("select * from %s limit 0" % t):
            pass
        cols = [d[0] for d in cur.execute("select * from %s limit 1" % t).description]
        print(t, "columns:", cols)
if "User" in tables:
    print("owner rows =", q("select count(*) from User where role='owner'")[0][0])
    # username lengths + created dates only — never the hash
    for r in q("select username, length(passwordHash), role, createdAt from User"):
        print("user: username_len=%d hash_len=%d role=%s created=%s" % (len(str(r[0])), r[1], r[2], r[3]))
if "Session" in tables:
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print("now =", now)
    print("unexpired sessions =", q("select count(*) from Session where expiresAt > '%s'" % now)[0][0])
    for r in q("select createdAt, expiresAt from Session order by createdAt desc limit 5"):
        print("session window: created=%s expires=%s" % (r[0], r[1]))
con.close()
