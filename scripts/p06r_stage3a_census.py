#!/usr/bin/env python3
# ─── P0-6R Stage 3A — سرشماری فقط-خواندنی دیتابیس توسعه (روی کپی /tmp) ──
# هیچ نام‌کاربری یا مقداری چاپ نمی‌شود؛ فقط شمارش‌های تجمیعی.
import shutil, sqlite3, tempfile, os

src = "db/custom.db"
tmp = tempfile.mktemp(suffix=".db")
shutil.copy2(src, tmp)
try:
    con = sqlite3.connect(tmp)
    cur = con.cursor()
    users = cur.execute("SELECT COUNT(*) FROM User").fetchone()[0]
    sessions = cur.execute("SELECT COUNT(*) FROM Session").fetchone()[0]
    live_sessions = cur.execute(
        "SELECT COUNT(*) FROM Session WHERE expiresAt > ?", ("2026-11-01T00:00:00.000Z",)
    ).fetchone()[0]
    short_names = cur.execute(
        "SELECT COUNT(*) FROM User WHERE LENGTH(username) < 20"
    ).fetchone()[0]
    owner_named = cur.execute(
        "SELECT COUNT(*) FROM User WHERE username = 'owner'"
    ).fetchone()[0]
    sarika = cur.execute(
        "SELECT COUNT(*) FROM User WHERE username = 'sarika'"
    ).fetchone()[0]
    tasks = cur.execute("SELECT COUNT(*) FROM Task").fetchone()[0] if (
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Task'").fetchone()
    ) else -1
    print(f"users_total={users}")
    print(f"sessions_total={sessions}")
    print(f"sessions_not_expired_as_of_2026-11-01={live_sessions}")
    print(f"users_with_username_len_lt_20={short_names}")
    print(f"users_named_owner={owner_named}")
    print(f"users_named_sarika={sarika}")
    print(f"tasks_total={tasks}")
finally:
    con.close() if 'con' in dir() else None
    os.remove(tmp)
