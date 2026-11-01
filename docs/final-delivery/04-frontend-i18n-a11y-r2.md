# 04 — فرانت‌اند، i18n/RTL و دسترس‌پذیری (Agents 4&5) — ممیزی + اصلاحات R2

## وضعیت یافت‌شده (ممیزی read-only)
- معماری i18n: کلیدها = رشته‌های فارسی (gettext-style)؛ en.ts با ۶۶۵ کلید؛ **صفر کلید استاتیک گمشده**؛ اما ~۲۱۰ رشتهٔ فارسی خارج از t() (aria/toast/heading) → کاربر EN آن‌ها را فارسی می‌دید/می‌شنید.
- تقویم جلالی: **ریاضیات صحیح** (۱۴۰۳ کبیسه؛ ۱۴۰۵-۰۱-۰۱ anchor تأیید درون-حافظه‌ای).
- RTL: dir سمت سرور، utilityهای منطقی، chevronهای سواپ‌شده — پایهٔ قوی؛ ۱۸ مورد physical باقی‌مانده.
- کنتراست: ۹ تم همهٔ جفت‌های متن/پس‌زمینه پاس؛ ۴ اکسنتِ دکمه در حالت روشن فیل (۳٫۱۹–۳٫۷۴)؛ ۳ توکن وضعیت روشن فیل.
- Ambient: CSS-only، بدون rAF، reduced-motion و hidden-tab pause **فعال و سالم**؛ صفر نشتی memory.

## اصلاحات اعمال‌شده (موج 4-a — ۲۳ مورد + گسترش همان‌کلاس)
| گروه | تغییر |
|---|---|
| i18n | wrap کامل aria-label/toast/heading برشمرده‌شده (chat-view، command-palette، theme-toggle، splash، app-shell، home-cards، task-detail، quick-add، profile-dialog، chat-action-chips، settings-view)؛ **۲۵ کلید جدید en** با ترجمهٔ کیفی؛ تاریخ/عدد lang-aware (chat-action-chips، plan-view heatmap، REPEAT_LABEL، timeAgo، streak/weekly) |
| کپی | empty-stateهای مالی (قبلاً متن کارها!)؛ حذف literalهای انگلیسی از UI فارسی (microphone/failed/network error)؛ version از `APP_VERSION` (1.3.0) + افزوده‌شدن «مدل میزبان» به About |
| RTL | text-right/mr-auto → text-start/ms-auto در ۸ فایل |
| A11y | focus trap + restore در palette و memory sheet (Esc هم)؛ role=dialog/aria-modal؛ aria-pressed به‌جای tablist ناقص؛ اهداف لمسی ≥۲۸px (users-admin، budget-delete با reveal در touch، quick-add-inline 36px) |
| ناوبری | میان‌برهای `6`/`7` وایر شد + پالت دستور مسیر مالی/تنظیمات را دارد |
| رفتار | Streak card کلیک‌پذیر → plan؛ Notification dir/lang از زبان واقعی؛ درج تگ خام (نه ترجمه‌شده)؛ hint «(میلادی)» کنار date input در حالت جلالی |
| پاک‌سازی | حذف `ambient-scene.tsx` (۳۶۸ خط مرده، صفر reference) |
| کنتراست (Agent 0) | `--primary→ax-700` روشن (همهٔ اکسنت‌ها ≥۵:۱)؛ توکن‌های وضعیت روشن تیره‌تر (warning 4.78، success 5.2، destructive 6.0) |
| U-1 (Agent 0) | hydrate i18n در صفحهٔ لاگین — EN دیگر فرم فارسی نمی‌بیند |

## اثر روی آزمون‌ها
typecheck 0 / lint 0 / **bun test ۲۲۲/۲۲۲** (بilingual-rc 11/11) — flaky قبلیِ UTC/Tehran هم در خودِ آزمون ریشه‌یابی و اصلاح شد.

## باقی‌ماندهٔ شناخته‌شده (P2، خارج از برش این انتشار)
- دستهٔ کوچک i18n باقی: «تجزیه هوشمند/ذخیره تغییرات» task-detail، ProfileChip fallback، چند text-right در appearance-picker/reminder-settings — فهرست دقیق در گزارش ایجنت 4-a، برای موج بعد.
- U-21 کامل (picker جلالی بومی) نیازمند کامپوننت اختصاصی — راه‌حل برچسب اعمال شد.
