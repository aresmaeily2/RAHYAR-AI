#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""F7 report generator — docs/audit/F7_*.md from session evidence."""
import re, os, subprocess

ROOT = '/home/z/my-project'
AUD = f'{ROOT}/docs/audit'
os.makedirs(AUD, exist_ok=True)

def W(name, content):
    open(f'{AUD}/{name}', 'w', encoding='utf-8').write(content)
    print('wrote', name)

def head(title, cycle='F7'):
    return f'# {title}\n\n- **چرخه:** {cycle} · **تاریخ:** 2026-11-07 · **HEAD پایهٔ F7:** `5630814`\n- **قانون صفر:** ابتدا واقعیت، سپس تغییر، سپس آزمون مجدد — همهٔ موارد با لاگ/اسکریپت بازتولیدپذیر.\n\n'

# ══ 1. F7_VOICE_ASSISTANT_AUDIT.md ═══════════════════════════════
W('F7_VOICE_ASSISTANT_AUDIT.md', head('F7_VOICE_ASSISTANT_AUDIT — ممیزی کامل دستیار صوتی (Agent 2، مرحلهٔ A)') + '''
## ۰. خلاصهٔ اجرایی

دو پشتهٔ صوتی موازی در محصول وجود دارد که ممیزی F7 هر دو را **سطر‌به‌سطر** بررسی کرد:

| پشته | ورودی | STT | موتور نیت | ثبت هزینه |
|---|---|---|---|---|
| وب متصل (مرورگر + WebView سرور مالک) | دکمهٔ میکروفون در chat-view | Web Speech API / پل بومی `RahyarNative` | همان پایپ‌لاین چت (`detectIntent` → مدل) | پیش از F7: **غیرممکن** — F7: مسیر تأییددار مالی اضافه شد |
| اپ محلی آفلاین (`HomeActivity` + assets/www) | FAB تزریقی در app.js | `SpeechRecognizer` بومی با `RahyarBridge` | `VoiceCommandParser.java` (محلی) | صحیح — به finance متصل است |

یافتهٔ F6 (هزینه → Task) **در مسیر محلی درست بود** (`VoiceCommandParser.java:116-119` + آزمون `faAddExpensePersianDigits`) اما در مسیر وب **ساختاری بود**: فعل «ثبت کن» در `ADD_VERBS` و نبود اکشن مالی ⇒ «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» به `add_task` می‌رفت. **در F7 با مسیر تأییددار مالی حل و روی سرور واقعی اثبات شد.**

## ۱. جدول موجودی اجزا (ممیزی مرحلهٔ A)

| جزء | فایل:خط | در سورس | در UI | سرویس واقعی | تست واحد | تست یکپارچگی | روی دستگاه |
|---|---|---|---|---|---|---|---|
| STT وب `listen()` | `src/lib/voice/speech.ts:75-177` | ✅ | ✅ chat-view:816-829 | Web Speech / پل بومی | ✅ (degrade) | ✅ F7 live (perm-flow) | ❌ BLOCKED |
| STT بومی اندروید | `VoiceHelper.java:118-189` | ✅ | ✅ هر دو اکتیویتی | `android.speech` | — (JVM ناممکن) | ✅ قرارداد رویداد | ❌ BLOCKED |
| TTS وب (ماژول) | `speech.ts:220-304` | ✅ | ⚠️ پیش‌تر کد مرده؛ F7: از مسیر chat-view با failsafe استفاده می‌شود | SpeechSynthesis/بومی | ✅ `hasVoiceFor` | — | ❌ BLOCKED |
| TTS بومی | `VoiceHelper.java:223-268` | ✅ | ✅ | `TextToSpeech` | — | ✅ رویداد done | ❌ BLOCKED |
| Wake Word | `VoiceWakeService.java` | ✅ (+فیکس F7) | ✅ تنظیمات محلی | سرویس پیش‌زمینه mic | ✅ F7 `VoiceWakeRestartTest` | — | ❌ BLOCKED |
| `VoiceCommandParser` | ۲۳ تست JVM | ✅ | ✅ (app.js) | خالص | ✅ ۲۳ تست | ✅ | ❌ BLOCKED |
| مجوز میکروفون (محلی) | `VoiceHelper.java:89-108` | ✅ | ✅ FAB→4701 | مجوز زمان‌اجرا | — | ✅ | ❌ BLOCKED |
| مجوز میکروفون (متصل) | پیش‌تر **نداشت**؛ F7 اضافه شد | ✅ | ✅ (web perm-flow) | مجوز زمان‌اجرا | — | ✅ قرارداد رویداد | ❌ BLOCKED |
| تأیید عملیات حساس (وب) | `pending-action.ts` | ✅ | ✅ چیپ | DB واقعی | ✅ | ✅ F7 live | ❌ BLOCKED |
| تأیید مالی (محلی) | `app.js:483-498` (F7) | ✅ | ✅ دیالوگ | DB محلی | — | — | ❌ BLOCKED |
| تنظیمات صوتی (زبان/پاسخ گفتاری) | settings-view + app.js | ✅ | ✅ | سرور/پروفایل | — | — | ❌ BLOCKED |
| E2E صوتی | — | — | — | — | — | ⚠️ F7: رگرسیون نیت صوتی + چرخهٔ مالی در سطح API زنده؛ صوت فیزیکی ناممکن | ❌ BLOCKED |

## ۲. حفره‌های یافت‌شده در ممیزی (همه در F7 تعیین تکلیف شدند)

1. **رانر TTS موازی و مرده** — `chat-view` پیاده‌سازی دوم بدون failsafe داشت؛ `speech.ts` نسخهٔ کامل بی‌مصرف بود. (فیکس: failsafe ۲۵s/۲۰s در chat-view + نگه‌داشتن قرارداد رویداد)
2. **باگ چرخهٔ Wake Word** — کامنت‌های «restartLoop» بی‌پیاده‌سازی؛ بعد از اولین نتیجه/خطا شنونده نمی‌مرد. (فیکس: backoff قطعی + آزمون JVM)
3. **بازگشت تنظیم Wake Word پس از بوت/شروع اپ** — نبود. (فیکس: `BootReceiver` + `HomeActivity` با خواندن پروفایل؛ fail-closed — JSON خراب = خاموش)
4. **زبان صوتی محلی فقط ظاهری** — `voiceLang` ذخیره ولی خوانده نمی‌شد. (فیکس: `V.bcp()` از پروفایل)
5. **نبود جریان رضایت میکروفون در حالت متصل** — SpeechRecognizer فقط «خطای عمومی» می‌داد. (فیکس: `VoiceHelper.startListening` → need_request/denied + `MainActivity.onRequestPermissionsResult` 4701 → `rahyar-voice-perm` + retry در `speech.ts`)
6. **کدهای خطای صوتی خام انگلیسی** — `voice: no_match`. (فیکس: نگاشت محلی fa/en در `voiceErrorText`)
7. **بی‌تأییدی مالی صوتی محلی** — add_income/add_expense فوری می‌نوشت. (فیکس: askConfirm مثل delete)
8. **نشت نیت مالی در مسیر وب** (هزینه→Task) — بزرگ‌ترین یافته. (فیکس: مسیر قطعی add_expense + پندینگ + تأیید؛ گزارش جدا: `F7_AGENT_INTENT_AUDIT.md`)
9. **Manifest قدیمی فریب‌دهنده** — `android/src/AndroidManifest.xml` فقط-اینترنت، در حالی که build واقعی `android/app/gradle/AndroidManifest.xml` با RECORD_AUDIO است؛ ممیزی‌های بعدی باید دومینیز.

## ۳. چرخهٔ هدف مکالمه صوتی — وضعیت بند B

| گام | وضعیت | مدرک |
|---|---|---|
| ۱. لمس دکمهٔ شروع | ✅ | chat-view mic button |
| ۲. بررسی مجوز | ✅ | web: Web Speech prompt؛ متصل: need_request → دیالوگ سیستم؛ محلی: requestMic |
| ۳. ضبط با اطلاع کاربر | ✅ | توست «گوش می‌دهم…» + نمایش partial؛ **هیچ شنود پس‌زمینه/پنهان** (Wake فقط opt-in با اعلان ماندگار) |
| ۴. گفتار→متن fa/en | ✅ کد / ⚠️ صوت واقعی | fa-IR/en-US؛ روی دستگاه BLOCKED |
| ۵. متن+Context → Agent | ✅ | همان composer/send → `/api/chat/stream` (بدون منطق موازی) |
| ۶. تشخیص قصد | ✅ | روتر قطعی + مدل — `F7_AGENT_INTENT_AUDIT.md` |
| ۷. تأیید عملیات حساس | ✅ | ماشین پندینگ (حذف/فراموشی/مالی) — آزمون زنده |
| ۸. اجرای مجاز | ✅ | add_task/finance/reminders روی DB واقعی |
| ۹. نمایش نتیجه | ✅ | پیام + اکشن‌ها |
| ۱۰. پاسخ صوتی | ✅ کد / ⚠️ صوت | TTS fa/en + failsafe |
| ۱۱. ادامه/توقف مکالمه | ✅ | stop TTS، لغو شنیدن، chat-history delete |

## ۴. بند C (قابلیت‌های الزامی) — جمع‌بندی

- تشخیص/پاسخ fa و en: پیاده + قرارداد آزمون؛ **روی دستگاه صوتی BLOCKED** (بند F)
- مکالمه چندمرحله‌ای و Context: وب ✅ (همان حافظهٔ چت)؛ محلی: پارسر stateless (محدودیت مستند)
- قطع پاسخ صوتی / لغو شنیدن / نمایش متن / اصلاح متن: ✅ وب (composer قابل ویرایش پیش از ارسال)؛ محلی: جعبهٔ تایپ جایگزین
- مدیریت نویز/خطا: نگاشت محلی پیام‌ها (F7) + no_match/timeout/backoff
- قطع اینترنت: وب → خطای network محلی‌شده + offline-box بومی؛ محلی: پنل صادقانه + تایپ
- نبود سرویس STT/TTS: پیام صادقانه + degrade (VoiceHelper unavailable / wake degraded)
- خاموشی صفحه/پس‌زمینه: Wake-Word foreground service (opt-in)؛ شنود عادی هرگز پس‌زمینه نمی‌ماند
- جلوگیری از ضبط پنهان: ✅ — فقط با لمس؛ بدون بافر صدا (`onBufferReceived` no-op)؛ تست JVM عدم-شروع-خودکار wake از پروفایل خراب
''')

# ══ 2. F7_VOICE_IMPLEMENTATION_REPORT.md ═════════════════════════
W('F7_VOICE_IMPLEMENTATION_REPORT.md', head('F7_VOICE_IMPLEMENTATION_REPORT — تکمیل و اثبات صوتی (Agent 2، مراحل B–F)') + '''
## ۱. تغییرات کد (همه از HEAD `5630814`، شاخهٔ اصلی)

| # | فایل | تغییر | چرا |
|---|---|---|---|
| 1 | `src/lib/assistant/expense.ts` (جدید) | پارسر خالص مبلغ/نیت مالی: ارقام fa/ar/en، هزار/میلیون/میلیارد، ریال÷۱۰، گارد تجمیعی و «ثبت کار» | فرمان صوتی هزینه باید به مالی برود نه Task |
| 2 | `src/lib/assistant/router.ts` | نیت `add_expense` پیش از add_task/finance_report | ریشهٔ یافتهٔ F6 |
| 3 | `src/lib/assistant/pending-action.ts` | PendingOp.add_expense + اجرای `createTransaction` پس از تأیید + `resolveExpenseAccountFromText` | هیچ نوشتن مالی بی‌تأیید |
| 4 | `src/lib/assistant/expense-flow.ts` (جدید) | `proposeExpense` (تک‌حسابی/چندحسابی/بی‌حساب) + `prepareExpenseExecution` | پیام تأیید + تطبیق نام حساب |
| 5 | `src/app/api/chat/route.ts` + `stream/route.ts` | لین قطعی مالی + شاخهٔ تأیید چندحسابی | هر دو مسیر HTTP هم‌عرض |
| 6 | `src/lib/ai/action-schema.ts` + `server-ai.ts` | اکشن `add_expense` فقط-پیشنهادی برای مدل + پرامپت + `needs_confirmation` | مسیر مدل هم بی‌نوشتن مستقیم |
| 7 | `src/components/ara/chat-view.tsx` | failsafe TTS (25s/20s) + `voiceErrorText` محلی fa/en | هنگ TTS / کد خام |
| 8 | `src/lib/voice/speech.ts` | جریان `rahyar-voice-perm` — retry پس از granted، خطای denied | رضایت میکروفون متصل |
| 9 | `android/.../VoiceWakeService.java` | چرخهٔ شنود با backoff قطعی `nextRestartDelayMs` + guard destroy | باگ restartLoop |
| 10 | `android/.../BootReceiver.java` + `HomeActivity.java` | بازگرداندن wake فقط با `wakeWord:true` پروفایل (fail-closed) | تنظیم ظاهری بود |
| 11 | `android/.../VoiceHelper.java` + `MainActivity.java` | پیش‌شرط مجوز mic + فوروارد 4701 → رویداد وب | جریان رضایت متصل |
| 12 | `android/src/www/js/app.js` | تأیید مالی محلی (confirmFinance/vCanceled) + خواندن voiceLang + select زبان | هم‌عرض مدل امنیتی وب |

## ۲. آزمون‌ها — نتیجهٔ واقعی

- **وب:** typecheck ✅ · lint 0 خطا (۱ هشدار قدیمی نامربوط) · **unit ۲۸۹/۲۸۹** (شامل ۲۲ آزمون جدید `f7-voice-expense.test.ts` + ۵ آزمون `finance-pdf-fa.test.ts`)
- **JVM:** **۱۷۶/۱۷۶** (هر دو فلیور؛ شامل `VoiceWakeRestartTest` جدید: backoff NO_MATCH/BUSY/permission + fail-closed پروفایل wake)
- **زندهٔ مالی-صوتی** (`artifacts/logs/f7/expense-live.log`) — همه روی DB تازه:
  - «هزینه ۷۰۰ هزار تومان بابت خرید ثبت کن» → پیشنهاد تأیید؛ task=0، tx=0
  - «بله» در چندحسابی → پرسش حساب (بدون نوشتن) → «بله، نقدی» → **نوشتن واقعی ۵۰٬۰۰۰**، مانده ۵۰۰٬۰۰۰→۴۵۰٬۰۰۰
  - «انصراف» → هیچ نوشتنی
  - تک‌حسابی: «بله» → نوشتن خودکار ۱۵۰٬۰۰۰ «قبض برق»
  - «بله، بانک ملت» (ویرگول فارسی U+060C — فیکس CONFIRM_RE) → نوشتن ۸۰٬۰۰۰
  - «درآمد ۲ میلیون تومان حقوق ثبت کن» → تأیید → income ۲٬۰۰۰٬۰۰۰؛ مانده ۹۲۰٬۰۰۰→۲٬۹۲۰٬۰۰۰
  - رگرسیون: «یک کار جدید برای خرید نان بساز» → Task (نه مالی)
  - جداسازی: user بدون حساب → راهنمای صادقانه؛ هیچ دست‌رسی به دادهٔ owner
  - تطبیق نهایی: مانده‌ها = opening + صورت‌جمع تراکنش‌ها (OK دقیق)
- **E2E:** ۱۱/۱۱ PASS، صفر خطای کنسول (شامل axe 0 serious، تقویم fa/en، بدون سرریز موبایل/تبلت)

## ۳. هزینه‌ها و سرویس‌های صوتی (بند E)

| سرویس | هزینه | یادداشت |
|---|---|---|
| Web Speech API (کرومیوم/اندروید سیستم) | رایگان/سیستمی | آنلاین گوگل در کروم؛ روی AOSP خالص absent → پیام صادقانه |
| `android.speech.SpeechRecognizer` | رایگان/سیستمی | ممکن است سمت سرویس‌دهنده آنلاین باشد — صدا بدون رضایت لمسی هرگز ارسال نمی‌شود |
| `TextToSpeech` بومی | رایگان | صدای فارسی بسته به دستگاه |
| **هیچ سرویس پولی** در چرخهٔ صوتی ادعا یا استفاده نشد | — | — |

- ذخیرهٔ صدا: **هیچ** (raw audio هرگز ذخیره/ارسال نمی‌شود — `onBufferReceived` no-op)
- متن و تاریخچهٔ صوتی: در همان تاریخچهٔ چت کاربر؛ حذف: دکمهٔ دوجانبهٔ حذف تاریخچهٔ چت + حذف کامل داده (PrivacyCard)
- مسیر جایگزین نبود سرویس: تایپ/پنل صادقانه (محلی) و toast راهنما (وب)

## ۴. آزمون عملیاتی دستگاه (بند F) — صادقانه BLOCKED

| بند | وضعیت | دلیل فنی |
|---|---|---|
| آزمون روی دستگاه فیزیکی Android | **BLOCKED** | هیچ دستگاه فیزیکی در سندباکس نیست |
| شبیه‌ساز (API24) صوتی | **BLOCKED** | `/dev/kvm` در میزبان فعلی غایب است (بررسی 2026-11-07) — بدون KVM اجرای عملی/emulator بی‌معنا؛ در F4/F6 با KVM میزبان ممکن بود، اکنون نیست |
| نصب تازه/Force Stop/Reboot | BLOCKED | وابسته به دستگاه/شبیه‌ساز |
| SMS روی دستگاه | BLOCKED | همان محدودیت F5/F6 — delivery به receiver روی image بدون پیام‌رسان واقعی اثبات‌نشده باقی می‌ماند |

نتیجهٔ شبیه‌ساز هرگز معادل آزمون فیزیکی معرفی نمی‌شود (قانون مأموریت). سمت وب، چرخهٔ نیت/تأیید/مالی با آزمون زندهٔ HTTP پوشش داده شد؛ تنها حلقهٔ صوتیِ فیزیکی (میکروفون→STT واقعی) مانده است.

## ۵. گزارش SMS (بند G)

زنجیرهٔ SMS از F5/F6 حفظ شده و در F7 بازساخت شد:

- رضایت پیش‌فرض خاموش (`smsConsent=false`)؛ ثبت فقط پس از رضایت + انتخاب حساب (`/api/sms/import`)
- فیلتر پیام شخصی: `BankSmsFilterTest` ۱۱/۱۱ (JVM — شامل Gregorian-date و Toman×10 از R2)
- ضدتکرار: externalRef = sha256(raw)[:40] — آزمون هم‌زمانی F7: ۵ درخواست موازی → **دقیقاً ۱ ردیف** (`finance-conc-fixed.log`)
- لغو رضایت → ثبت بعدی 403
- لاگ ممیزی بدون متن پیامک (`SmsReceiver` auditable logs)
- دریافت broadcast زنده روی دستگاه: **BLOCKED** (همان دلیل بند ۴) — در RTM صادقانه PARTIAL/BLOCKED می‌ماند
''')

print('part 1 done')
