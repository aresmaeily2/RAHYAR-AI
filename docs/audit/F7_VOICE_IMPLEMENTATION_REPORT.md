# F7_VOICE_IMPLEMENTATION_REPORT — تکمیل و اثبات صوتی (Agent 2، مراحل B–F)

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایهٔ F7:** `5630814`
- **قانون صفر:** ابتدا واقعیت، سپس تغییر، سپس آزمون مجدد — همهٔ موارد با لاگ/اسکریپت بازتولیدپذیر.


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
