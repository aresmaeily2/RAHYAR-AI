#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F7 report generator part 2 — provider/intent/security/finance/backup/android."""
import os

AUD = '/home/z/my-project/docs/audit'

def W(name, content):
    open(f'{AUD}/{name}', 'w', encoding='utf-8').write(content)
    print('wrote', name)

def head(title):
    return f'# {title}\n\n- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`\n\n'

# ══ 3. F7_PROVIDER_MATRIX.md ═════════════════════════════════════
W('F7_PROVIDER_MATRIX.md', head('F7_PROVIDER_MATRIX — ماتریس واقعی ۱۰ Provider + تفکیک خطا') + '''
تاریخ آزمون: 2026-11-07 · سرور: :3001 با DB تازه · لاگ: `artifacts/logs/f7/web-ai.log` و `web-ai2.log`
مسیر آزمون: POST `/api/settings/ai/test` با نشست OWNER — همان مسیر UI.

| Provider | نتیجهٔ واقعی F7 | مدل | تأخیر | وضعیت RTM | تفکیک خطا |
|---|---|---|---|---|---|
| local_rules | ✅ پاسخ واقعی: «موتور قواعد محلی فعال است» | local_rules | 0ms | VERIFIED | — |
| ZAI | ✅ **پاسخ واقعی مدل** به «ping» | glm-4-plus | 13511ms | VERIFIED | — |
| OpenAI | «کلید API ثبت نشده است» | gpt-4o-mini | — | BLOCKED | نبود کلید (401 پیش از شبکه) |
| Claude | «کلید API ثبت نشده است» | claude-3-5-haiku | — | BLOCKED | نبود کلید |
| Gemini | «کلید API ثبت نشده است» | gemini-1.5-flash | — | BLOCKED | نبود کلید |
| DeepSeek | «کلید API ثبت نشده است» (بازآزمون پس از پنجرهٔ نرخ) | deepseek-chat | — | BLOCKED | نبود کلید |
| OpenRouter | «کلید API ثبت نشده است» | openrouter/auto | — | BLOCKED | نبود کلید |
| Ollama | «اتصال به سرویس ناموفق بود» | llama3.1 | 4ms | BLOCKED | موتور محلی نصب نیست (سندباکس) |
| LM Studio | «اتصال به سرویس ناموفق بود» | local-model | 2ms | BLOCKED | موتور محلی نصب نیست |
| OpenAI-compatible | «اول آدرس Endpoint سازگار را وارد کن» | — | — | BLOCKED | اعتبارسنجی ورودی |

**قواعد رعایت‌شده:** هیچ ۴۰۱/۴۰۳/۴۲۹/۴۰۰ موفقیت شمرده نشد؛ هر BLOCKED دلیل فنی صریح دارد؛ کلید در چت/گزارش درخواست نمی‌شود (مسیر امن PUT `/api/settings/ai`).

## خطای زمان‌بندی (rate-limit) — اثبات مستقل

- storm `/api/settings/ai/test`: 5×200 سپس 429 (`finance.log` §1)؛ بازآزمون‌های فاصله‌دار پاسخ پاک دادند
- storm ورود اشتباه پس از ری‌استارت: 9×401 سپس 429 (`sec-deep.log` §2) — محدودیت پس از ری‌استارت زنده است

## امنیت کلید — canary مستقل (فیکس F5 بازآزمون شد)

کلید canary `sk-F7-CANARY-7710` از مسیر امن PUT ذخیره شد؛ سپس ۴ مسیر جست‌وجو شد:

| مسیر | نتیجه |
|---|---|
| GET `/api/settings/ai` (masking) | `hasKey=true, mask=••••7710`، **بدون مقدار کامل** |
| GET `/api/data/export` | ۰ مورد canary (فیلتر `ai_key:*`) |
| پیام خطای test-route | ۰ مورد canary |
| لاگ سرور | ۰ مورد canary |

نتیجه: **نشت `ai_key:*` در هیچ‌یک از ۴ مسیر مشاهده نشد** — نسخهٔ فیکس‌شده روی HEAD F7 تأیید مستقل گرفت.

## هزینهٔ هر سرویس (بند مأموریت)

| سرویس | مدل قیمت‌گذاری | وضعیت استفاده در F7 |
|---|---|---|
| ZAI (glm-4-plus) | پولی (توکن‌محور) — در محیط سندباکس از مسیر SDK میزبان | ۲ فراخوانی آزمون؛ **هیچ هزینه‌ای به مالک تحمیل نشد** |
| OpenAI/Claude/Gemini/DeepSeek/OpenRouter | پولی | استفاده‌نشده (بی‌کلید) |
| Ollama/LM Studio | رایگان/خودمیزبان | نصب نبود |
| local_rules | رایگان | آزمون شد |
''')

# ══ 4. F7_AGENT_INTENT_AUDIT.md ══════════════════════════════════
W('F7_AGENT_INTENT_AUDIT.md', head('F7_AGENT_INTENT_AUDIT — روتر نیت، Agent و سناریوهای الزامی') + '''
## ۱. ریشه‌یابی یافتهٔ F6 (هزینه → Task)

`src/lib/assistant/router.ts`: فعل «ثبت کن» در `ADD_VERBS` بود؛ الگوی مالی (`FINANCE_PATTERNS`) فقط واژهٔ تجمیعی می‌خواست؛ پس «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» → `parseQuickTask` → `add_task`. هیچ آزمونی این خانوادهٔ جمله را پوشش نمی‌داد.

## ۲. فیکس (کد) + گاردهای ضدقاپیختن

1. نیت قطعی `add_expense` پیش از add_task: فقط با **اسم پولی + مبلغِ صریح** (هزار/میلیون/تومان/ریال مجاور عدد)
2. گاردها: واژهٔ تجمیعی → گزارش مالی؛ «کار جدید/new task» → ثبت کار؛ عدد بی‌واحد (ساعت ۹) → مبلغ نیست
3. مدل هم می‌تواند `add_expense` پیشنهاد کند ولی اکشن فقط پندینگ می‌سازد (`needs_confirmation`) و `guardUnbackedClaim` ادعای بی‌اثر را می‌گیرد — در آزمون زنده همین گارد ادعای نادرست مدل را شفاف کرد

## ۳. سناریوهای الزامی — وضعیت آزمون زندهٔ F7 (سرور واقعی :3001)

| سناریو | مسیر | نتیجه |
|---|---|---|
| پرسش عمومی | مدل (ZAI/local) | ✅ ZAI پاسخ واقعی glm-4-plus |
| برنامه‌ریزی / plan_day | مدل + گارد مأموریت | ✅ (رگرسیون E2E/واحد از F4-F6 حفظ) |
| Task («یک کار جدید برای خرید نان بساز») | قطعی | ✅ add_task — رگرسیون ضدقاپیختن |
| Reminder («برای فردا ساعت ۹ یادآوری بگذار») | REMINDER_VERBS → مدل | ✅ (آزمون واحد مرز یادآور) |
| ثبت درآمد صوتی | قطعی + تأیید | ✅ income ۲٬۰۰۰٬۰۰۰ واقعی |
| ثبت هزینه صوتی | قطعی + تأیید | ✅ expense ۵۰٬۰۰۰/۸۰٬۰۰۰/۱۵۰٬۰۰۰/۷۰۰٬۰۰۰ پیشنهادها؛ نوشتن فقط با «بله[, حساب]» |
| گزارش مالی | قطعی finance_summary | ✅ (آزمون واحد + زندهٔ F6 حفظ؛ F7 مجدد در E2E) |
| خواندن حساب | finance read-only | ✅ |
| حذف/فراموشی | پندینگ + تأیید صریح | ✅ (V8/V9 ماشین-وضعیت؛ انصراف = هیچ) |
| مکالمه چندمرحله‌ای | همان حافظهٔ چت | ✅ (E2E) |
| فرمان‌های صوتی | همان پایپ‌لاین | ✅ نیت/تأیید/مالی؛ صوت فیزیکی BLOCKED (دستگاه) |
| انگلیسی: "record an expense of 5000 toman" | قطعی | ✅ آزمون واحد |

## ۴. فیکس تلمبرِی (confir) فارسی — یافتهٔ آزمون زنده

«بله، نقدی» به‌دلیل نبود «،» (U+060C) در مرز `CONFIRM_RE` به مسیر مدل می‌افتاد و مدل ادعای موفقیت می‌کرد؛ گارد صادقانه آن را می‌گرفت. **فیکس:** افزودن «،» به مرز تأیید/انصراف + آزمون زندهٔ رگرسیون (پس از فیکس: نوشتن واقعی به حساب درست).

## ۵. پاسخ پرسش مأموریت: «فرمان ثبت هزینه به عملیات مالی متصل شد؟»

بله — با اثبات عددی (ماندهٔ حساب‌ها قبل/بعد در `expense-live.log`) و با حفظ قاعدهٔ امنیتی «مالی از چت فقط با تأیید صریح می‌نویسد».
''')

# ══ 5. F7_EXTERNAL_INTEGRATIONS.md ═══════════════════════════════
W('F7_EXTERNAL_INTEGRATIONS.md', head('F7_EXTERNAL_INTEGRATIONS — وضعیت واقعی اتصال‌های بیرونی') + '''
| اتصال | وضعیت واقعی F7 | مدرک |
|---|---|---|
| Telegram | **NOT_IMPLEMENTED** — در کاتالوگ اتصال‌ها با وضعیت `needs_owner_config`؛ هیچ توکن/فراخوانی شبکه‌ای | `src/lib/connections/catalog.ts` (۶ افشای شفافیت: access/dataCollected/processing/sentToModel/storage/revocation) |
| Email (SMTP/ارسال) | **NOT_IMPLEMENTED** — هیچ مسیر smtp؛ «ایمیل» فقط در channel پیش‌نویس | `action-schema.ts` (draft_message هرگز ارسال نمی‌کند) |
| Calendar (گوگل) | **NOT_IMPLEMENTED** — «تقویم» محصول یعنی نمای شمسی/میلادی داخلی، نه سرویس بیرونی | `src/lib/calendar/*` + E2E تقویم |
| پیامک بانکی | از داخل کشور به‌صورت محلی/دستگاهی (receiver اندروید) — نه سرویس ابری | `F7_VOICE_IMPLEMENTATION_REPORT.md` §۵ |
| آب‌وهوا | **VERIFIED** — open-meteo + fallback wttr.in | `web-ai2.log`: شهر فارسی «تهران» → 200 + `updatedAt` + cache 12ms |
| هر سرویس دیگر | هیچ فراخوانی بیرونی دیگری در کد وجود ندارد (audit grep) | — |

**قواعد مأموریت رعایت است:** هیچ اتصالی بی‌پیکربندی مالک فعال نمی‌شود؛ هیچ کلیدی در لاگ/اکسپورت نمی‌رود (canary F7 صفر نشت)؛ قطع/لغو برای همهٔ اتصال‌های آینده در کاتالوگ الزامی تعریف شده است. پیام‌رسان‌ها فقط تا سطح «پیش‌نویس» می‌روند — ارسال واقعی فقط با خود کاربر است (انتخاب امنیتی مستند).
''')

# ══ 6. F7_SECURITY_AUDIT.md ══════════════════════════════════════
W('F7_SECURITY_AUDIT.md', head('F7_SECURITY_AUDIT — امنیت (Agent 4) + امنیت تاریخچهٔ Git (Agent 1)') + '''
## ۱. ماتریس امنیت زنده — ۱۱/۱۱ (`artifacts/logs/f7/sec-matrix.log`)

T1/T2 بدون نشست → 401 · T3 /emulator بدون نشست → 307 · T6 غیرمالک → 403 · T8 CSRF cross-origin → 403 · T9 honesty (503 هنگام down) · T10 نرخ: 3×200 سپس 429 · T11 مالک 200.

## ۲. باتری راه‌اندازی OWNER روی DB تازه — S1–S11 (`sec-deep.log`)

S1 بدون توکن 403 · S2 توکن غلط 403 · S3 admin/admin123 → 401 (بدون رمز پیش‌فرض) · S4 ستاپ معتبر 200 · S5 کوکی Secure/HttpOnly/SameSite=lax · S6 استفادۀ دوم توکن 403 (یک‌بارمصرف) · S7 overwrite مالک 403 · S8 ورود با رمز جدید 200 · S9 هش امن (s2:… ۱۶۴ نویسه) · S10 رمز در لاگ = ۰ · S11 plaintext در DB = ۰.

## ۳. نرخ-لیمیت پس از ری‌استارت / ایزوله‌سازی

ورود اشتباه ۱۲ پشت‌سرهم پس از ری‌استارت → 9×401 سپس 429 · دادهٔ user جدا از owner (مالی: ۰ حساب؛ T6/T7 ماتریس) · `resolveExpenseAccountFromText` فقط در محدودهٔ userId.

## ۴. نشت کلید — canary صفر در ۴ مسیر (جزئیات در F7_PROVIDER_MATRIX.md)

## ۵. امنیت تاریخچهٔ Git (Agent 1)

- سه blob حساس (`android/rahyar-release.keystore`, `.evidence-password`, `.evidence-session-token`) فقط در ۹۵ کامیتِ منتشرنشده؛ **۰ کامیت در هر ref ریموت**
- keystore تاریخی بدون رمزِ داخل مخزن باز نمی‌شود (آزمون بازیابی ۸۵ نامزد — کامیت‌شده)
- پاک‌سازی: `git-filter-repo` روی کلون؛ درخت HEAD بیت‌به‌بیت حفظ؛ هر سه مسیر/blob از تاریخچهٔ قابل انتقال حذف؛ bundle/patch پاک + نگاشت کامل commit-map
- ابهام نام remote تعیین تکلیف شد: HAMYAR-AI و RAHYAR-AI **یک مخزن‌اند** (ls-remote هر دو = 28b64bb — ریدایرکت تغییر نام)
- جزئیات: `F7_GIT_SECURITY_AUDIT.md`، `F7_HISTORY_CLEANUP_PLAN.md`، `F7_GIT_TRANSFER_GUIDE.md`

## ۶. یافته‌های این چرخه (با شدت)

| ID | شدت | یافته | وضعیت |
|---|---|---|---|
| GIT-SEC-1 | High (اگر push می‌شد) | سه blob حساس در ۹۵ کامیتِ محلی | **FIXED** — تاریخچهٔ انتقال پاک؛ اثبات V1/V2 |
| FIN-1 | Minor | درج هم‌زمان duplicate → HTTP 500 | **FIXED** — پاسخ duplicate؛ ۵ موازی → ۱ ردیف |
| SEC-CF-1 | Minor | «بله، …» (U+060C) تأیید شمرده نمی‌شد → مسیر مدل + ادعای بی‌اثر (گارد می‌گرفت) | **FIXED** — رگرسیون زنده |
| VOICE-1 | Minor | هنگ TTS بومی بدون failsafe | **FIXED** (25s/20s) |
| VOICE-2 | Major (عملکردی) | چرخهٔ Wake Word پس از اولین خطا می‌مُرد | **FIXED** (backoff + آزمون JVM) |
| AUTH-1 | Minor | جریان رضایت میکروفون در حالت متصل نبود | **FIXED** (need_request/denied + retry) |
| **بحرانی/بااهمیت باز** | — | **هیچ** | — |

## ۷. HTTPS/Production

پیکربندی تولید: `TRUST_PROXY` + same-origin + `__Host-` cookie opt-in (از R2)؛ در سندباکس آزمون روی HTTP محلی انجام می‌شود — TLS پایان-به-انتقال مسئولیت میزبان مالک است (مستند در DEPLOYMENT).
''')

# ══ 7. F7_FINANCE_AUDIT.md ═══════════════════════════════════════
W('F7_FINANCE_AUDIT.md', head('F7_FINANCE_AUDIT — مالی (Agent 4) + مسیر صوتی/چتِ مالی (Agent 2/3)') + '''
## ۱. سناریوهای زنده (`finance.log` + `expense-live.log` + `finance-recheck.log`)

درآمد/هزینه/انتقال/بودجه/گزارش روز · ضدتکرار externalRef (دوم → duplicate:true) · هم‌زمانی ۵ موازی با ref تازه → **ok=1, dup=4, err=0 و دقیقاً ۱ ردیف DB** (پس از فیکس FIN-1) · ایزوله‌سازی user → ۰ حساب · ثبت تراکنش از Agent/صوت با تأیید (۲۱ درخواست زندهٔ مستند).

## ۲. تطبیق مستقل مانده‌ها (محاسبهٔ خام از SQLite، نه API)

| حساب | db-math | API | نتیجه |
|---|---|---|---|
| بانک ملت | 2,913,000 | 2,913,000 | OK |
| نقدی | 450,000 | 450,000 | OK |
| F6-Cash (سناریوی اسکریپت) | 681,889 | 681,889 | OK |
| F6-Bank (سناریوی اسکریپت) | 2,400,000 | 2,400,000 | OK |

`RECONCILIATION-ALL-OK = True` — شامل انتقال دوجانبه (fromAccount −amount / toAccount +amount).

## ۳. خروجی‌ها — ۵ قالب

CSV (UTF-8 BOM + سرستون فارسی) · XLS (XML) · JSON (پارس موفق، ۷ تراکنش) · TXT (فارسی) · **PDF فارسی راست‌چین جدید F7** — رندر Chromium با شکل‌دهی کامل: تصویر رندرشده ذخیره شد (`download/RahyAr-F7/evidence/pdf-fa-*.png`)، pdftotext پنج عبارت فارسی را برگرداند و هیچ «????» در متن نیست. **مشکل «?» مأموریت F6 برطرف شد**؛ سازندهٔ لاتین قبلی به‌عنوان fallback fail-degraded حفظ شد.

## ۴. بودجه/دسته‌بندی/هم‌زمانی

بودجه PUT/GET با monthlyLimit 250٬000 (food) · دسته‌بندی other پیش‌فرض مالی عامل · هم‌زمانی exactly-once اثبات شد (§۱).

## ۵. رگرسیون‌های حفظ‌شده

تقویم اعداد فارسی/انگلیسی (E2E)، ماندهٔ واحد نمایش (ریال)، فیلتر اسرار اکسپورت (canary)، Toman×10 پیامک (JVM).
''')

# ══ 8. F7_BACKUP_RESTORE_REPORT.md ═══════════════════════════════
W('F7_BACKUP_RESTORE_REPORT.md', head('F7_BACKUP_RESTORE_REPORT — پشتیبان و بازیابی واقعی') + '''
(`artifacts/logs/f7/backup-restore.log` — روی DB زندهٔ F7 با دادهٔ واقعی همین چرخه)

1. **Backup تراکنشی** با `VACUUM INTO` — snapshot ۲۳۳KB، بدون توقف سرویس
2. **مقایسهٔ تعداد ردیف ۱۴/۱۴ جدول** — همه MATCH (User/Task/ChatMessage/Finance*/Session/…)
3. **یکپارچگی:** `PRAGMA integrity_check = ok`؛ نشانگر داده (آخرین پیام چت) عیناً موجود
4. **Restore در محیط جدا:** سرور :3102 روی کپی snapshot → login OWNER **200** (هش/نشست سالم) → ماندهٔ ۴ حساب عیناً بازگشت
5. **بازیابی ناامن ممنوع:** فایل عمداً خراب → `DatabaseError` صادقانه (سرویس با دادهٔ ناقص بالا نمی‌آید)
6. کنترل دسترسی: بکاپ/ری‌استور فقط مسیر عملیاتی مالک (scripts/backup-db.sh)؛ هیچ نشت به API عمومی

نتیجه: **Backup/Restore واقعی موفق** — Gate D بند مربوط عبور.
''')

# ══ 9. F7_ANDROID_SMS_RELEASE.md ═════════════════════════════════
W('F7_ANDROID_RELEASE.md', head('F7_ANDROID_RELEASE — ساخت، امضا و اثبات بازتولید (Agent 2)') + '''
## ۱. چهار APK از HEAD F7 (v2.3.0 — vc26/27)

| APK | package | versionCode | امضا |
|---|---|---|---|
| Rahyar-user-v2.3.0-release.apk | com.rahyarai.app | 26 | CN=RahyAr RSA-4096 — SHA256 `79496581…5dc088ce` |
| Rahyar-owner-v2.3.0-release.apk | com.rahyarai.app.owner | 27 | همان گواهی |
| Rahyar-user-v2.3.0-debug.apk | com.rahyarai.app | 26 | Android Debug |
| Rahyar-owner-v2.3.0-debug.apk | com.rahyarai.app.owner | 27 | Android Debug |

- minSdk 24 / targetSdk 34 / compileSdk 34 (aapt2 badging ثبت شد)
- **fail-closed حفظ شد:** بدون `android/keystore.properties` (خارج Git، gitignored) ساخت Release خطا می‌دهد
- گواهی جدید F7 (تغییر گواهی نسبت به APKهای v2.2.0 گمشدهٔ میزکار — مسیر ارتقا از v2.2.0 نیازمند حذف/نصب تازه است؛ **صادقانه مستند**، مثل F5)

## ۲. بازتولیدپذیری

`assembleUserRelease` دوبار → **SHA-256 یکسان** (`662a26dd…`) — بستهٔ بایت‌به‌بایت تکرارپذیر.

## ۳. JVM tests

**۱۷۶/۱۷۶** در هر دو فلیور (shامل ۲۳ تست VoiceCommandParser، قرارداد رویدادهای صوتی، OfflineContract (نسخهٔ 2.3.0 به‌روز شد)، BankSmsFilter ۱۱/۱۱، LocalStore، و `VoiceWakeRestartTest` جدید).

## ۴. نصب/اجرای دستگاه — صادقانه BLOCKED

`/dev/kvm` غایب (2026-11-07) و دستگاه فیزیکی موجود نیست ⇒ نصب/اجرای زندهٔ این چرخه انجام نشد و **هیچ ادعای «تست روی دستگاه» ثبت نمی‌شود**. شواهد F4/F6 (crash-free 3/3 روی API24 با KVM میزبان) تاریخی‌اند و برای F7 ارتقا نیافته‌اند.
''')

print('part 2 done')
