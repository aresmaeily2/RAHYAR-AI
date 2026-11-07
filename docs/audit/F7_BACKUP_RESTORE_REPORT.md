# F7_BACKUP_RESTORE_REPORT — پشتیبان و بازیابی واقعی

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`


(`artifacts/logs/f7/backup-restore.log` — روی DB زندهٔ F7 با دادهٔ واقعی همین چرخه)

1. **Backup تراکنشی** با `VACUUM INTO` — snapshot ۲۳۳KB، بدون توقف سرویس
2. **مقایسهٔ تعداد ردیف ۱۴/۱۴ جدول** — همه MATCH (User/Task/ChatMessage/Finance*/Session/…)
3. **یکپارچگی:** `PRAGMA integrity_check = ok`؛ نشانگر داده (آخرین پیام چت) عیناً موجود
4. **Restore در محیط جدا:** سرور :3102 روی کپی snapshot → login OWNER **200** (هش/نشست سالم) → ماندهٔ ۴ حساب عیناً بازگشت
5. **بازیابی ناامن ممنوع:** فایل عمداً خراب → `DatabaseError` صادقانه (سرویس با دادهٔ ناقص بالا نمی‌آید)
6. کنترل دسترسی: بکاپ/ری‌استور فقط مسیر عملیاتی مالک (scripts/backup-db.sh)؛ هیچ نشت به API عمومی

نتیجه: **Backup/Restore واقعی موفق** — Gate D بند مربوط عبور.
