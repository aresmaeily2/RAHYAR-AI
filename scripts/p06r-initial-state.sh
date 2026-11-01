#!/usr/bin/env bash
# P0-6R FINAL — تثبیت وضعیت اولیه (فقط-خواندنی) → شواهد before
set -u
cd /home/z/my-project
OUT=/home/z/my-project/download/P0_6R_FINAL
mkdir -p "$OUT"
F="$OUT/90_git_initial_state.md"
{
echo "# وضعیت اولیه Git — قبل از اصلاحات"
echo "زمان تهران: $(TZ=Asia/Tehran date '+%Y-%m-%d %H:%M:%S %z')"
echo
echo "## هویت مخزن"
echo "- مسیر: /home/z/my-project"
echo "- نام مخزن: $(basename "$(git rev-parse --show-toplevel)") (remote: aresmaeily2/HAMYAR-AI)"
echo "- شاخه: $(git branch --show-current)"
echo "- HEAD کامل: $(git rev-parse HEAD)"
echo "- upstream: $(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || echo 'None (main بدون upstream تنظیم‌شده)')"
echo "- origin/main: $(git rev-parse origin/main 2>/dev/null || echo none)"
echo "- رابطه با 61451ab: $(git rev-parse HEAD) == 61451ab9695eb3a443500c18e2202837cb6eff0b → $([ "$(git rev-parse HEAD)" = "61451ab9695eb3a443500c18e2202837cb6eff0b" ] && echo 'همان کامیت' || echo 'متفاوت')"
echo "- رابطه با f103f09: $(git merge-base --is-ancestor f103f09 HEAD 2>/dev/null && echo 'f103f09 جد HEAD است (HEAD = f103f09 + Stage 3A)' || echo 'رابطه مستقیم ندارد')"
echo "- جلو/عقب نسبت به origin/main: $(git rev-list --left-right --count origin/main...HEAD) (عقب/جلو)"
echo
echo "## وضعیت فایل‌ها"
echo "- tracked تغییرکرده: $(git diff --stat HEAD | tail -1)"
echo "- untracked: $(git status --porcelain | grep -c '^??' || true) مورد"
git status --porcelain | grep '^??' | sed 's/^/- /' || true
echo "- ignored (سطح اول):"
git status --porcelain --ignored -- . ':!node_modules' ':!.next' | grep '^!!' | head -15 | sed 's/^/- /' || true
echo
echo "## بررسی فایل خارجی (پروژهٔ بورس/سایر)"
echo "- دایرکتوری‌های سطح اول مخزن:"
ls -d */ .git/ 2>/dev/null | sed 's/^/  - /'
echo "- رد نام‌های مرتبط با پروژه‌های دیگر (بورس/saham/stock/trade) در فایل‌های tracked:"
git ls-files | grep -iE 'bourse|saham|stock|tsetmc' | head -5 || echo "  - هیچ موردی"
echo "- نشانه‌های متنی بورس در ۳ مسیر حساس (شمارش فقط):"
for p in src prisma docs; do printf "  - %s: " "$p"; git ls-files "$p" | xargs -r grep -liE 'tsetmc|saham' 2>/dev/null | wc -l; done
echo
echo "## کامیت‌های اخیر"
git log --oneline -4
} > "$F"
echo "saved: $F"
