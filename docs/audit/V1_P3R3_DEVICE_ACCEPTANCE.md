# V1-P3-R3 — پذیرش صوتی دستگاه واقعی (بند ۸ مأموریت)

**وضعیت: BLOCKED — هیچ دستگاه Android واقعی در اختیار این محیط اجرا نیست. شبیه‌ساز و JVM طبق دستور مالک جایگزین آزمون گوشی واقعی نیستند و هیچ سناریویی به‌صورت دروغین PASS ثبت نمی‌شود.**

## ۱. دلیل BLOCKED (مطابق رکورد مأموریت‌های قبلی)

- بدون adb/دستگاه متصل (`V1_DEVICE_ACCESS_REQUEST.md` از فازهای قبلی همچنان بی‌پاسخ است)
- این محیط (sandbox لینوکسی بدون GPU/USB/دستگاه) ابزار آزمون دستگاهی ندارد
- APKهای debug آمادهٔ نصب از HEAD شاخهٔ r3 ساخته شده‌اند (SHA-256 در `evidence/r3_build_sha256.txt`)

## ۲. ملزومات پذیرش (وقتی دستگاه فراهم شود)

| نیاز | حداقل |
|---|---|
| گوشی ۱ | Android 8+ (پوشش رگرسیون عمومی) |
| گوشی ۲ | Android 14+ (پوشش محدودیت‌های FGS/mic) |
| APK | release امضاشده با گواهی مرجع (پس از رفع RELEASE BLOCKED) یا debug همین شاخه برای آزمون کارکردی |
| شبکه | اینترنت واقعی + یک سناریوی قطع کامل (Airplane mode) |

## ۳. سناریوهای اجباری ۲۲گانه — وضعیت فعلی

| # | سناریو | وضعیت | یادداشت |
|---|---|---|---|
| ۱ | نصب APK Release | BLOCKED | نیاز به keystore مرجع (RELEASE BLOCKED) / یا نصب debug |
| ۲ | اجرای اولیه | BLOCKED | — |
| ۳ | مجوز میکروفون (اجازه) | BLOCKED | مسیر کد: VoiceHelper.startListening → micState=need_request → دیالوگ سیستم؛ JVM: پوشش منطق |
| ۴ | رد مجوز | BLOCKED | کد: emitError(denied) + emitEnd؛ هیچ شنود پنهانی |
| ۵ | لغو مجوز از Settings | BLOCKED | کد جدید: VoiceWakeService.startListeningSafe → توقف فوری سرویس |
| ۶ | STT فارسی | BLOCKED | مسیر: fa-IR + ENGINE_LANGUAGE_SWITCH (API33+) |
| ۷ | STT انگلیسی | BLOCKED | en-US |
| ۸ | TTS فارسی | BLOCKED | حکم زبان صادقانهٔ جدید (missing_data → پیام صادقانه) |
| ۹ | TTS انگلیسی | BLOCKED | — |
| ۱۰ | فرمان یادآور | BLOCKED | پارسر: JVM تست‌شده (VoiceCommandParserTest) |
| ۱۱ | فرمان هزینه با تأیید | BLOCKED | — |
| ۱۲ | فرمان درآمد | BLOCKED | — |
| ۱۳ | لغو فرمان | BLOCKED | — |
| ۱۴ | فرمان نامفهوم | BLOCKED | vUnknown + هیچ ادعای موفقیت |
| ۱۵ | قطع اینترنت | BLOCKED | مسیر سیستمی/آنلاین → خطای صادقانه (کد جدید consent/no path) |
| ۱۶ | خطای موتور تشخیص | BLOCKED | نگاشت خطاها (no_match/busy/denied/unavailable) |
| ۱۷ | TTS بدون voice data | BLOCKED | کد جدید: rahyar-tts-error(missing_data) + پیام صادقانه |
| ۱۸ | شروع/توقف متوالی | BLOCKED | کد جدید: صف TtsBuffer + QUEUE_ADD |
| ۱۹ | خروج و بازگشت | BLOCKED | destroy ایمن جدید |
| ۲۰ | چند فرمان پشت سر هم | BLOCKED | — |
| ۲۱ | Wake Word | **N/A — غیرفعال (R3-P1)** | تصمیم مستند: V1_P3R3_WAKE_WORD_DECISION.md |
| ۲۲ | خاموش/روشن گوشی + Wake Word | **N/A — غیرفعال (R3-P1)** | پس از بوت فقط پیام وضعیت (no FGS از BOOT) |

## ۴. آنچه همین حالا «واقعاً» آزمون شده (بدون دستگاه، با برچسب صادقانه)

| لایه | نوع آزمون | نتیجه |
|---|---|---|
| پارسر فرمان (local) | JVM واقعی | VoiceCommandParserTest — سبز |
| منطق گیت سرویس/بوت | JVM واقعی | VoiceWakeGateTest (۱۲) — سبز |
| صف/حکم زبان TTS | JVM واقعی | VoiceTtsPolicyTest (۱۱) — سبز |
| سیاست مسیر STT/رضایت | JVM واقعی | VoiceSttPrivacyTest (۴) — سبز |
| رویدادهای بومی→وب | JVM واقعی (رشتهٔ JS) | VoiceEventsTest — سبز |
| Agent متصل → DB → پاسخ | HTTP واقعی روی سرور production-build | PASS=10 FAIL=0 WARN=2 (الگوی مستند) — `evidence/r3_fix_verify_verdicts.txt` |
| وب محصول کامل | مرورگر واقعی (Playwright+axe) | 11/11، صفر خطای کنسول — `evidence/r3_grand_e2e.txt` |
| **STT صوتی واقعی، TTS صوتی واقعی، زنجیرهٔ کامل روی گوشی** | **نیازمند دستگاه** | **BLOCKED** |

تزریق متنی debugFinalEvent فقط در بیلد Debug و فقط با intent صریح adb وجود دارد؛ در هیچ آزمونی از آن به‌عنوان «تأیید صوتی» استفاده نشده و در بیلد Release کلاً حذف است.

## ۵. پروتکل ثبت شواهد برای مالک (وقتی آزمون شد)

برای هر سناریو: مدل گوشی + نسخهٔ اندروید + SHA-256 APK + نوع موتور STT/TTS + نتیجه + زمان پاسخ + اسکرین‌شات/ویدئوی واقعی + شناسهٔ رکورد DB (برای فرمان‌های اقدامی). فایل نتیجه: `docs/audit/V1_P3R3_DEVICE_ACCEPTANCE.md` همین سند — بخش ۳ به PASS/FAIL/ عدد واقعی به‌روزرسانی می‌شود.

## ۶. درخواست از مالک

1. حداقل یک گوشی Android 14+ (و ترجیحاً یک گوشی Android 8-13) با امکان نصب مستقیم APK
2. یا فراهم‌سازی adb برای اجرای مستقیم تیم
3. رفع RELEASE BLOCKED (بازیابی keystore) تا APK ارتقایی با هویت صحیح آزمون شود
