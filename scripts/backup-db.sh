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
DEST_DIR="${1:-${ROOT}/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${DEST_DIR}/ara-${STAMP}.db"

# ── ممیزی ۳۶۰ (یافتهٔ دودآزمایی) ─────────────────────────────
# سرور standalone مسیر نسبی DATABASE_URL را نسبت به پوشهٔ خودش
# (.next/standalone/) حل می‌کند؛ پس پروداکشن واقعی روی
# .next/standalone/db/custom.db زندگی می‌کند و حالت dev روی db/custom.db.
# اسکریپت قبلی فقط db/custom.db را پشتیبان می‌گرفت — بکاپ پروداکشن خالی بود!
# اکنون: جدیدترین فایل موجود از بین کاندیداها انتخاب و شفاف اعلام می‌شود.
CANDIDATES=(
  "${ROOT}/.next/standalone/db/custom.db"
  "${ROOT}/db/custom.db"
)
DB_PATH=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c" ]; then
    if [ -z "$DB_PATH" ] || [ "$c" -nt "$DB_PATH" ]; then
      DB_PATH="$c"
    fi
  fi
done

if [ -z "$DB_PATH" ]; then
  echo "خطا: هیچ پایگاه‌داده‌ای یافت نشد (کاندیداها: ${CANDIDATES[*]})" >&2
  exit 1
fi
echo "منبع پشتیبان: ${DB_PATH}"

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

# ── ممیزی ۳۶۰: چک‌سام و سیاست نگهداری (Retention) ────────────
# ۱) چک‌سام SHA-256 — اطمینان از دست‌نخوردگی فایل پشتیبان
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$DEST" > "${DEST}.sha256"
  echo "چک‌سام: ${DEST}.sha256"
fi

# ۲) Retention — فقط ۳۰ نسخهٔ آخر (قابل تنظیم با BACKUP_RETENTION_COUNT)
#    جلوگیری از پر شدن دیسک سرور با cron روزانه
MAX_BACKUPS="${BACKUP_RETENTION_COUNT:-30}"
ls -1t "${DEST_DIR}"/ara-*.db 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read -r oldfile; do
  rm -f "$oldfile" "${oldfile}.sha256"
  echo "حذف نسخه قدیمی خارج از سقف نگهداری: ${oldfile}"
done

echo "پشتیبان ساخته شد: ${DEST}"
echo "بازیابی: سرویس را متوقف، فایل را به db/custom.db جایگزین، سرویس را اجرا کن"
