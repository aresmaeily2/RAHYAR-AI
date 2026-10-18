# مرجع API رهیار AI

پایه: `/api` — همه پاسخ‌ها JSON؛ پیام خطا فارسی. احراز هویت: کوکی `rahyar_session`.
قرارداد مشترک همه مسیرهای غیرعمومی:
`sameOriginOk` (متد تغییردهنده) → `rateLimit` → `requireUser` (۴۰۱) → `readJsonSafe` (سقف ۱۰۰KB → ۴۰۰).

| مسیر | متد | گارد | سقف نرخ/min | بدنه/خروجی |
|---|---|---|---|---|
| /api/auth/setup | POST | عمومی — فقط وقتی sentinel `SETUP_REQUIRED` | ۱۰ | `{username?,displayName?,password}` → ادعای اتمیک sentinel؛ نشست صادر می‌شود |
| /api/auth/login | POST | عمومی | ۱۰/IP | `{username,password}` → `{ok,user}` + کوکی؛ پیام خطای عمومی (بدون اوراکل) |
| /api/auth/logout | POST | عمومی (idempotent) | ۲۰ | پاک‌سازی نشست + کوکی |
| /api/auth/session | GET | عمومی | ۱۲۰ | `{authenticated,user?}` یا `{authenticated:false,setupPasswordPending}` |
| /api/auth/password | PUT | requireUser | ۵ | `{currentPassword,newPassword}` → `{ok,revokedSessions}` — همه نشست‌های دیگر ابطال می‌شوند |
| /api/tasks | GET | requireUser | ۱۲۰ | لیست کارهای کاربر (+bootstrap یک‌بارمصرف ۶۰s) |
| /api/tasks | POST | requireUser | ۶۰ | `{title,notes?,tag?,priority?,dueDate?,dueTime?,repeat?,clientKey?}` — اعتبارسنجی: عنوان ≤۲۰۰، اولویت∈{1,2,3}، `dueTime` HH:mm، تاریخ ۱۹۷۰–۲۲۰۰ |
| /api/tasks/[id] | PATCH/DELETE | requireUser | ۱۲۰/۶۰ | مالکیت با `findFirst({id,userId})`؛ بین‌کاربری ۴۰۴ |
| /api/tasks/[id]/breakdown | POST | requireUser | ۴ + سراسری AI | تجزیه مدل از دروازه؛ زیرکار ≤۳۰ |
| /api/tasks/bootstrap | POST | requireUser | ۱۰ | seed یک‌بارمصرف کارهای نمونه (mutex + throttle) |
| /api/subtasks | POST | requireUser | ۶۰ | `{taskId,title}` — مالکیت والد بررسی می‌شود؛ ≤۳۰ |
| /api/subtasks/[id] | PATCH/DELETE | requireUser | ۱۲۰/۶۰ | مالکیت غیرمستقیم از `task.userId` |
| /api/reminders | GET/POST/PATCH | requireUser | ۱۲۰/۳۰/۱۲۰ | یادآور فعال ≤۵۰؛ `remindAt` معتبر، ≥اکنون−۶۰s، ≤۳۶۶روز |
| /api/memory | GET/POST/DELETE | requireUser | ۲۰ | فکت ≤۲۰۰ نویسه؛ سقف ۱۰۰؛ حذف `deleteMany({id,userId})` |
| /api/chat | GET/POST/DELETE | requireUser | ۱۲۰/۱۰/۶۰ | POST `{message≤۲۰۰۰,clientKey}` + سراسری AI؛ مسیر قطعی بدون مدل |
| /api/chat/stream | POST | requireUser | ۱۰ + سراسری AI | SSE: meta/delta/done؛ استریم فقط از دروازه؛ سقف خروجی اعمال می‌شود |
| /api/plan | POST | requireUser | ۴ + سراسری AI | برنامه روزانه مدل از دروازه |
| /api/report/daily | GET | requireUser | ۶۰ | گزارش قطعی: انجام‌شده/باقی‌مانده/عقب‌افتاده + آخرین اقدامات |
| /api/memory (DELETE) | DELETE | requireUser | ۲۰ | `{id}` یا همه |
| /api/connections | GET | requireUser | — | کاتالوگ ایستا؛ هیچ توکن/داده‌ای؛ وضعیت‌ها `needs_owner_config` |
| /api/notification-settings | GET/PUT | requireUser | ۲۰ | نرمال‌سازی: soundId enum، volume 0–1، speechRate 0.5–1.5 |
| /api/profile | GET/PUT | requireUser | ۶۰/۱۰ | نام ≤۴۰؛ در پرامپت داخل `<user_data>` |
| /api/health | GET | عمومی | — | `{status,database,latencyMs}` — ۵۰۳ در خرابی DB |

## کدهای خطا

| کد | معنا |
|---|---|
| 400 | بدنه نامعتبر / JSON خراب / فیلد خارج از محدوده |
| 401 | بدون نشست معتبر |
| 403 | Origin نامجاز / رمز فعلی اشتباه / راه‌اندازی تکراری |
| 404 | منبع ناموجود یا متعلق به کاربر دیگر (بدون افشا) |
| 429 | سقف نرخ مسیر یا سقف سراسری (`Retry-After` ارسال می‌شود) |
| 503 | کلید قطع هوش مصنوعی فعال / سرویس مدل در دسترس نیست |

---

## افزوده‌های نسخه ۱٫۰

### تنظیمات و موتور AI
| مسیر | متد | توضیح |
|---|---|---|
| `/api/settings/app` | GET/PUT | زبان (`fa/en`)، حالت تقویم (`jalali/dual/gregorian`)، پاسخ گفتاری، رضایت SMS |
| `/api/settings/ai` | GET/PUT | موتور فعال (`local_rules/openai_compatible/builtin`) + Endpoint + کلید (فقط ماسک) + کلید قطع |
| `/api/settings/ai/test` | POST | تست اتصال Endpoint (ping کوچک، بدون ذخیره) |
| `/api/settings/ai/usage` | GET | آمار مصرف مدل (فراداده فقط) |

### مالی و SMS
| مسیر | متد | توضیح |
|---|---|---|
| `/api/finance/accounts` | GET/POST | حساب‌ها + مانده / ساخت |
| `/api/finance/accounts/[id]` | PATCH/DELETE | ویرایش/حذف |
| `/api/finance/transactions` | GET/POST | فیلتر `?month=YYYY-MM&type=` / ثبت |
| `/api/finance/transactions/[id]` | PATCH/DELETE | ویرایش/حذف |
| `/api/finance/export` | GET | `?format=csv|xls|json|txt&month=` |
| `/api/sms/import` | POST | `{text, confirm, accountId, selected[]}` — دو مرحله‌ای با رضایت `sms_consent` |

### داده‌ها (Import/Export/Backup)
| مسیر | متد | توضیح |
|---|---|---|
| `/api/data/export` | GET | خروجی JSON کامل کاربر (پشتیبان) |
| `/api/data/import` | POST | ورود JSON (ادغام — چیزی بازنویسی نمی‌شود) |
| `/api/data/delete-all` | POST | حق فراموشی — نیازمند `confirm:"پاک کن"` |

### اتصال‌ها و چت (به‌روزرسانی)
- `POST /api/chat/stream`: اکنون موتور فعال کاربر از registry خوانده می‌شود؛ نیت‌های قطعی تازه: `complete_task` (تطبیق فازی)، `start_focus` (باز شدن تایمر سمت کلاینت)، `help`؛ حالت `local_rules` پاسخ قطعی محلی می‌دهد (بدون مدل)
- `POST /api/auth/setup`: نصب کاملاً خالی (بدون هیچ کاربری) هم راه‌اندازی اولیه را ممکن می‌کند — ادعای اتمیک sentinel حفظ شده
