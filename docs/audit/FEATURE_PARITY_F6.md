# FEATURE_PARITY_F6 — تطبیق Web / Android / Backend (بازتولید چرخه F6)
**HEAD مبنا:** `57aefdb` · این جدول از F5 حفظ و برای چرخه F6 راستی‌آزمایی شد: E2E ۱۱/۱۱ روی 57aefdb،
Unit ۲۶۷/۲۶۷، JVM ۸۳+۸۳، APKها بایت‌به‌بایت از HEAD، باتری امنیت/مالی/backup تازه.
**تفاوت‌های ثبت‌شده F6:** Weather اکنون در هر دو لایه با updatedAt (فیکس 57aefdb)؛ ثبت تراکنش از چت
در هیچ لایه‌ای سیم نشده (NOT_IMPLEMENTED صادقانه)؛ بوت شبیه‌ساز این چرخه BLOCKED — اسکرین‌های Android همان باینری F5 است.

**قاعده:** وب و APK دو لایه‌ی متفاوت‌اند. APK نسخه‌ی «محلی-اول» است: هسته‌ی آفلاین کامل + ماژول اختیاری اتصال به سرور (WebView محصول وب). هیچ صفحه‌ی Mock محلی به‌عنوان قابلیت سرورمحور معرفی نشده است.
**HEAD مبنا:** `57aefdb` (ورثه از F5) · وضعیت‌ها همان شش حالت قانون صفر.

| قابلیت | Web | Android (APK v2.2.0) | Backend | وضعیت کلی | همگامی داده | آفلاین | ماندگاری پس از ورود مجدد | آزمون واقعی |
|---|---|---|---|---|---|---|---|---|
| AI Chat | کامل (چت + استریم + Action Chips) | از طریق WebView سرور؛ در حالت محلی پنل صوت/متن با پارسر محلی | /api/chat + /api/chat/stream، gateway، quota، kill-switch | VERIFIED (وب) / PARTIAL (اندروید محلی: پارسر واقعی، بدون مدل) | وب: DB سرور · محلی: LocalStore JSON؛ **همگام نیستند** (طراحی محلی-اول) | محلی بله | وب: بله (DB) · محلی: بله (فایل خصوصی) | E2E 11/11 + capabilities F1 |
| Agent (Intent/حافظه/برنامه‌ریزی/تأیید حساس) | کامل | فقط مسیر فرمان صوتی/متنی محلی (افعال/وظیفه/یادآور/مالی ساده) | action-log، pending-action، memory | VERIFIED (وب) / PARTIAL (اندروید) | جدول | وب: مدل محلی fallback | بله | F1-local + F4 A1-A7 + R4 |
| Voice | دکمه‌های صوتی وب (Web Speech) | VoiceHelper بومی (STT/TTS سیستمی) + Wake اختیاری | — | NOT VERIFIED (هر دو؛ آزمون شنیداری دستگاهی BLOCKED) | — | بله | — | ۲۳ تست پارسر؛ آزمون شنیداری موکول به دستگاه |
| Provider (۱۰ موتور) | کامل (کارت‌ها + تست اتصال + ماسک) | پیکربندی از طریق WebView سرور (تنظیمات وب) | registry + آداپتورهای بومی Claude/Gemini + openai-like | VERIFIED (وب/بک‌اند) | تنظیمات per-user در DB سرور | وب: local_rules آفلاین | بله | F0-F12 + providers2 |
| Calendar | کامل (شمسی/میلادی/دوگانه) | صفحه تقویم محلی (پایه) | /api/tasks، محاسبه جلالی سرور | VERIFIED (وب) / PARTIAL (اندروید) | جدول (طراحی) | محلی بله | بله | E2E + C1-C5 |
| Tasks | کامل (CRUD/اولویت/زیرکار/فیلتر) | صفحه وظایف محلی کامل (LocalStore) | /api/tasks + /subtasks + breakdown | VERIFIED (هر دو لایه، ذخیره‌گاه جدا) | **همگام نیست** | بله هر دو | بله هر دو | E2E + OfflineContractTest/JVM |
| Reminders | کامل (اعلان مرورگر + تنظیمات) | ReminderReceiver + AlarmManager دقیق + BootReceiver | /api/reminders + scheduler سرور | VERIFIED (وب) / IMPLEMENTED_NOT_TESTED (اندروید reboot) | جدول | بله | بله | R1 یادآور + JVM ReminderAlarms |
| Finance | کامل (حساب‌ها/بودجه/گزارش/نمودار/۵ خروجی) | صفحه مالی محلی (درآمد/هزینه/گزارش ساده) | /api/finance/* + PDF سرور | VERIFIED (وب) / PARTIAL (اندروید محلی) | جدول | بله | بله | D1-D6 + ۶ تست PDF |
| SMS بانکی | زنجیره سرور کامل (رضایت→پیش‌نمایش→ثبت→ضدتکرار→لغو) | SmsReceiver + رضایت + صف پیش‌نمایش + اعلان | /api/sms/import (هش ضدتکرار) | VERIFIED (وب) / PARTIAL (اندروید: تحویل broadcast به گیرنده روی ایمیج API24 اثبات نشد) | صفحه → سرور (با رضایت دوگانه) | گیرنده آفلاین؛ ثبت سروری | بله | E1-E5 + ۱۱ تست JVM + sms-verdict |
| Connections | کاتالوگ + UI وضعیت | از طریق WebView سرور | /api/connections (کاتالوگ) | NOT_IMPLEMENTED/BLOCKED (OAuth بیرونی در دسترس نیست) | — | — | — | مستند CN-1..7 |
| Ambient/تم‌ها | کامل (۹ تم، Reduced Motion، Focus) | تم محلی سبک (brand.css) + اسپلش بومی | — | VERIFIED (وب) / PARTIAL (اندروید) | — | بله | بله | E2E + ۱۸ شات F4 + شات‌های شبیه‌ساز F5 |
| Settings | کامل (AI/اعلان‌ها/زبان/تقویم/پیامک) | تنظیمات محلی (زبان/Wake/پیامک/پشتیبان) | /api/settings/* | VERIFIED | جدول | بله | بله | E2E + capabilities C |
| Backup | خروجی/ورودی JSON + حذف کامل با تأیید | پشتیبان محلی + Share Sheet + import | /api/data/* | VERIFIED | فایل جداگانه | بله | بله | G1/G2 + LocalStoreTest |
| Auth | login/setup/password/session کامل | LoginActivity (ماژول اختیاری) + SecureStore AES-GCM | scrypt N=2^16، Session DB، CSRF، Rate Limit | VERIFIED | کوکی نشست؛ محلی بدون حساب | نشست تا انقضا | بله | ماتریس امنیتی ۱۱/۱۱ + setup fail-closed |

## جمع‌بندی صادقانه
1. **داده‌ی محلی Android و DB سرور دو ذخیره‌گاه جدا هستند** — این طراحی «محلی-اول» مستند است، همگامی ادعا نشده و هیچ صفحه‌ی محلی به‌عنوان قابلیت سرورمحور معرفی نشده است.
2. قابلیت‌های سرورمحور (Chat کامل/Agent/Provider/مالی سروری/SMS سروری) از داخل APK از طریق ماژول اختیاری WebView روی همان سرور در دسترس‌اند و همان آزمون‌های وب رویشان صادق است.
3. لایه‌های آفلاین Android (وظایف/یادآور/مالی پایه/پشتیبان) JVM-تست‌شده‌اند (۸۳/۸۳) و آزمون UI دستگاهی آن‌ها روی شبیه‌ساز تا اجرای ۳گانه و اسکرین‌شات پیش رفته؛ پیمایش صفحه‌به‌صفحه به دستگاه واقعی موکول شد (R-5 PARTIAL).
