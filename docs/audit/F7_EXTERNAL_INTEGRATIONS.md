# F7_EXTERNAL_INTEGRATIONS — وضعیت واقعی اتصال‌های بیرونی

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`


| اتصال | وضعیت واقعی F7 | مدرک |
|---|---|---|
| Telegram | **NOT_IMPLEMENTED** — در کاتالوگ اتصال‌ها با وضعیت `needs_owner_config`؛ هیچ توکن/فراخوانی شبکه‌ای | `src/lib/connections/catalog.ts` (۶ افشای شفافیت: access/dataCollected/processing/sentToModel/storage/revocation) |
| Email (SMTP/ارسال) | **NOT_IMPLEMENTED** — هیچ مسیر smtp؛ «ایمیل» فقط در channel پیش‌نویس | `action-schema.ts` (draft_message هرگز ارسال نمی‌کند) |
| Calendar (گوگل) | **NOT_IMPLEMENTED** — «تقویم» محصول یعنی نمای شمسی/میلادی داخلی، نه سرویس بیرونی | `src/lib/calendar/*` + E2E تقویم |
| پیامک بانکی | از داخل کشور به‌صورت محلی/دستگاهی (receiver اندروید) — نه سرویس ابری | `F7_VOICE_IMPLEMENTATION_REPORT.md` §۵ |
| آب‌وهوا | **VERIFIED** — open-meteo + fallback wttr.in | `web-ai2.log`: شهر فارسی «تهران» → 200 + `updatedAt` + cache 12ms |
| هر سرویس دیگر | هیچ فراخوانی بیرونی دیگری در کد وجود ندارد (audit grep) | — |

**قواعد مأموریت رعایت است:** هیچ اتصالی بی‌پیکربندی مالک فعال نمی‌شود؛ هیچ کلیدی در لاگ/اکسپورت نمی‌رود (canary F7 صفر نشت)؛ قطع/لغو برای همهٔ اتصال‌های آینده در کاتالوگ الزامی تعریف شده است. پیام‌رسان‌ها فقط تا سطح «پیش‌نویس» می‌روند — ارسال واقعی فقط با خود کاربر است (انتخاب امنیتی مستند).
