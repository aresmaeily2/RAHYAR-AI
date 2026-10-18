#!/usr/bin/env bash
# ─── پشتیبان‌گیری پایگاه‌داده «آرا» ───────────────────────────
# استفاده:  bash scripts/backup-db.sh [مسیر مقصد]
# پیش‌فرض:  backups/ara-YYYYMMDD-HHMMSS.db
#
# ترتیب روش‌ها (اولی که موجود بود اجرا می‌شود):
#   ۱) sqlite3 CLI — Online Backup API
#   ۲) bun + SQLite «VACUUM INTO» — اسنپ‌شات تراکنشی سازگار؛ حتی اگر اپ در
#      حال نوشتن باشد نسخه یکپارچه می‌دهد (و فایل را یکپارچه‌سازی هم می‌کند)
#   ۳) کپی خام — فقط به‌عنوان آخرین راه؛ در نوشتن همزمان ممکن است ناسازگار شود
# بازیابی: سرویس را متوقف، فایل را به db/custom.db جایگزین، سرویس را اجرا کن
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${ROOT}/db/custom.db"
DEST_DIR="${1:-${ROOT}/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${DEST_DIR}/ara-${STAMP}.db"

if [ ! -f "$DB_PATH" ]; then
  echo "خطا: پایگاه‌داده یافت نشد: ${DB_PATH}" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '${DEST}'"
  echo "روش: sqlite3 Online Backup"
elif command -v bun >/dev/null 2>&1; then
  bun -e "
    const { Database } = require('bun:sqlite');
    const db = new Database(process.argv[1], { readonly: true });
    db.exec(\"VACUUM INTO ?\", [process.argv[2]]);
    db.close();
  " "$DB_PATH" "$DEST"
  echo "روش: bun SQLite VACUUM INTO (اسنپ‌شات تراکنشی)"
else
  # بدون sqlite3 و bun: کپی ساده — در توقف کوتاه سرویس امن است
  echo "هشدار: sqlite3 و bun یافت نشد؛ کپی ساده انجام می‌شود (سرویس را موقتاً متوقف کنید)" >&2
  cp "$DB_PATH" "$DEST"
  echo "روش: کپی خام"
fi

# صحت‌سنجی سریع نسخه پشتیبان (اگر ابزار موجود بود)
if command -v bun >/dev/null 2>&1; then
  bun -e "
    const { Database } = require('bun:sqlite');
    const db = new Database(process.argv[1], { readonly: true });
    const row = db.query('PRAGMA integrity_check').get();
    const tasks = db.query('SELECT COUNT(*) AS c FROM Task').get();
    db.close();
    if (row.integrity_check !== 'ok') { console.error('خطا: پشتیبان خراب است'); process.exit(1); }
    console.log('صحت پشتیبان: ok | تعداد کارها: ' + tasks.c);
  " "$DEST"
fi

echo "پشتیبان ساخته شد: ${DEST}"
echo "بازیابی: سرویس را متوقف، فایل را به db/custom.db جایگزین، سرویس را اجرا کن"
