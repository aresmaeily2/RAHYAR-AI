#!/usr/bin/env bash
# ─── رهیار AI — پاک‌سازی قطعی تاریخچه گیت از بلاب‌های حساس (یافتهٔ ۷ ممیزی) ──
# هدف: هرگونه ردپای .env یا فایل‌های دیتابیس (.db) از تمام کامیت‌های تاریخچه
#      حذف شود تا توکن/رمز قدیمی با کلون مخزن قابل بازیابی نباشد.
#
# ⚠️  هشدارهای مهم:
#   - این اسکریپت تاریخچه را «بازنویسی» می‌کند → همهٔ هش‌های کامیت عوض می‌شوند.
#   - همهٔ همکاران باید پس از اجرا، کلون تازه بگیرند (clone مجدد اجباری).
#   - اگر مخزن عمومی است، FORCE PUSH لازم است و کش GitHub ممکن است بلاب‌ها را
#     مدتی نگه دارد → در صورت افشای واقعی توکن، «چرخاندن توکن» (rotate) الزامی
#     است؛ پاک‌سازی تاریخچه به‌تنهایی رمزِ لو‌رفته را باطل نمی‌کند.
#   - اجرای این اسکریپت فقط روی ماشین محلیِ مالک مخزن انجام شود، نه در CI.
set -euo pipefail

REPO_DIR="${1:-.}"
cd "$REPO_DIR"

echo "── ۱/۵ بکاپ کامل پیش از بازنویسی تاریخچه"
BACKUP="../RAHYAR-AI-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP"
echo "   بکاپ: $BACKUP"

echo "── ۲/۵ بررسی پیش‌نیاز: git-filter-repo (روش توصیه‌شدهٔ خود گیت)"
if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "   git-filter-repo نصب نیست — تلاش برای نصب با pip:"
  pip3 install --user git-filter-repo 2>/dev/null || true
fi

FILES_TO_PURGE=(
  '.env'
  '.env.local'
  '.env.production'
  'db/custom.db'
  'db/*.db'
  'prisma/*.db'
  '*.db'
  '*.db-journal'
  '*.db-wal'
  '*.db-shm'
)

if command -v git-filter-repo >/dev/null 2>&1; then
  echo "── ۳/۵ حذف مسیرها از کل تاریخچه با git-filter-repo"
  PATH_ARGS=()
  for f in "${FILES_TO_PURGE[@]}"; do
    PATH_ARGS+=(--path "$f")
  done
  # --invert-paths یعنی «همهٔ تاریخچه به‌جز این مسیرها» برای این فایل‌ها
  git filter-repo --force --invert-paths --sensitive-data-removal "${PATH_ARGS[@]}" || \
  git filter-repo --force --invert-paths "${PATH_ARGS[@]}"
else
  echo "── ۳/۵ git-filter-repo در دسترس نیست — fallback به filter-branch"
  PATTERN=$(printf '%s ' "${FILES_TO_PURGE[@]}")
  git filter-branch --force --index-filter \
    "git rm --cached --ignore-unmatch $PATTERN" \
    --prune-empty --tag-name-filter cat -- --all
fi

echo "── ۴/۵ فشرده‌سازی و پاک‌سازی رف‌های قدیمی"
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "── ۵/۵ افزودن گارد آینده (gitignore + trace-check)"
# گارد جلوگیری از بازگشت این فایل‌ها به مخزن
if [ -f .gitignore ]; then
  grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
  grep -qxF '*.db'  .gitignore || echo '*.db'  >> .gitignore
fi

echo "── بازنویسی تمام شد. اعتبارسنجی نهایی:"
echo "   (باید خروجی خالی باشد)"
git log --all --oneline -- .env '*.db' 'db/*.db' 'prisma/*.db' 2>/dev/null || true
echo ""
echo "مرحلهٔ دستیِ نهایی (فقط در صورت تأیید شما):"
echo "   git push --force --all origin && git push --force --tags origin"
echo "سپس به همهٔ همکاران بگویید مخزن را دوباره clone کنند."
