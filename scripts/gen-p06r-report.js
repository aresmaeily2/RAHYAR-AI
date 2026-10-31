// ─── RAHYAR_P0_6R_CREDENTIAL_ROTATION_REVOCATION_REQUEST — DOCX فارسی RTL ───
// مأموریت P0-6R: چرخش و ابطال اعتبارنامه‌ها — Stage 1..3 (رجیستر اقدام + مالکیت + درخواست مجوز)
// هیچ مقدار واقعی Secret/Password/Token در این سند چاپ یا ذخیره نمی‌شود. fp = sha256(value)[:12]
const {
  Document, Packer, Paragraph, TextRun, TableOfContents, SectionType,
  NumberFormat, AlignmentType, BorderStyle, Header, Footer, SimpleField,
  r, para, h1, h2, tbl, cap, P, FA, buildCoverR1,
} = require("./corrective-report-lib.js");
const fs = require("fs");

const OUT_DIR = "/home/z/my-project/download/P0_6R";
const OUT = OUT_DIR + "/RAHYAR_P0_6R_CREDENTIAL_ROTATION_REVOCATION_REQUEST.docx";

// ── رجیستر Stage 1..3 (فقط داده ماسک‌شده — هیچ مقدار خامی) ──
const REGISTER = {
  mission: "P0-6R", basis: "گزارش نهایی P0-6 مورخ 2026-10-31 — تصمیم NO-GO",
  generated_at_tehran: "2026-10-31",
  masking: "fp=sha256(value)[:12]; هیچ مقدار خامی ذخیره نشده است",
  stages_completed: ["Stage 1 — رجیستر اقدام", "Stage 2 — مالکیت و فعالیت", "Stage 3 — بستهٔ درخواست مجوز"],
  stages_pending_owner_approval: ["Stage 4 — اجرای چرخش/ابطال (شامل P0-5 برای C8)", "Stage 5 — گزارش نهایی پس از اجرا"],
  credentials: [
    { id: "C1", fp: "cec51518b9ac", disclosure: "literal در preview-setup.ts + 13 اسکریپت capture (14 blob)", reach: "PUBLIC — origin/main + origin/feature", nature: "رمز ورود owner — دورهٔ شواهد v2.0/v2.1", service: "احراز هویت خود اپ (/api/auth/login — scrypt)", action: "Rotate در هر استقرار زندهٔ دورهٔ v2.0/v2.1 + Investigate", owner_perm: "بله" },
    { id: "C2", fp: "ee0880daa2ca", disclosure: "literal در test-user-isolation.ts", reach: "PUBLIC — شامل تگ v1.0.0-rc1", nature: "رمز ورود owner — نسل اول (rc1)", service: "همان سرویس C1 — نسل اول", action: "Rotate مشروط (اگر استقرار زندهٔ دورهٔ rc1 وجود داشته) وگرنه No action مستندشده", owner_perm: "بله" },
    { id: "C3", fp: "f60ed56a9c82", disclosure: "literal در build-android-rebuild.sh و build-android-apk-v11.sh", reach: "PUBLIC — شامل تگ v1.2.0", nature: "رمز store کی‌استور فعلی + مقدار متعارف رمز کلید ابزار اندروید", service: "امضای APK — android/rahyar-release.keystore (فایل فقط محلی)", action: "Rotate store-pass و key-pass با keytool پس از پشتیبان رمزشدهٔ خارج از مخزن", owner_perm: "بله" },
    { id: "C4", fp: "dd65b755befe", disclosure: "literal در build-android-apk.sh", reach: "PUBLIC — از 2026-10-19", nature: "رمز store کی‌استور قدیمی + رمز کلید با الگوی نام+سال", service: "کی‌استور قدیمی — مادهٔ کلید از بین رفته (android/README.md)", action: "No action — جفت‌رمز بی‌اثر (MOOT)", owner_perm: "خیر" },
    { id: "C5", fp: "8eb38003b10d", disclosure: "literal در live-v2-tests.cjs", reach: "PUBLIC — از 2026-10-21", nature: "رمز کاربر آزمونی («sarika»)", service: "اپ توسعه — حساب آزمونی", action: "Revoke مشروط (حذف حساب در هر استقرار زنده)؛ محلی No action — DB خالی", owner_perm: "بله (در صورت وجود استقرار)" },
    { id: "C6", fp: "e20de4c418c6", disclosure: "literal در live-v2-tests.cjs", reach: "PUBLIC — از 2026-10-21", nature: "FP عمدی — مقدار آزمون منفی (badLogin)، اعتبارنامهٔ قابل‌استفاده نیست", service: "اپ توسعه — آزمون منفی", action: "No action", owner_perm: "خیر" },
    { id: "C10", fp: "9774fdedae3b", disclosure: "literal در live-final-audit.ts", reach: "PUBLIC — تاریخچهٔ عمومی", nature: "رمز جفت‌حساب با نام‌کاربری 16کاراکتری", service: "اپ (/api/auth/login با BASE قابل‌تنظیم) — دورهٔ راستی‌آزمایی زندهٔ v2", action: "Rotate مشروط + Investigate استقرار زندهٔ آن دوره", owner_perm: "بله" },
    { id: "C7", fp: "46d0a91d1e48", disclosure: "literal در audit-screens.mjs", reach: "LOCAL ONLY — main + fix (هرگز عمومی نشده)", nature: "رمز ورود owner — دورهٔ ممیزی 360", service: "احراز هویت خود اپ — عکس‌برداری ممیزی 360", action: "Investigate + Sanitize (حذف literal) پیش از هر push؛ Rotate اختیاری", owner_perm: "بله (تغییر روی fix)" },
    { id: "C8", fp: "8aa62d3b0a15", disclosure: "دو تکه: literal در mint-evidence-session.mjs (فقط fix) + فایل .evidence-password (فقط main)", reach: "LOCAL ONLY — دو تکه در دو شاخه", nature: "رمز bootstrap شواهد — مسدودکنندهٔ P0-5؛ RE-ARMABLE", service: "bootstrap شواهد — ساخت owner در DB خالی با hashPassword خود اپ", action: "P0-5 (env-محور، بدون fallback، تست) + Rotate مقدار فقط توسط مالک + ابطال مؤثر مقدار قدیمی", owner_perm: "بله" },
    { id: "C9", fp: "ff9d8259a6e5", disclosure: "فایل .evidence-session-token (فقط main)", reach: "LOCAL ONLY — main", nature: "توکن نشست (32B base64url، TTL 24ساعته، مقید به DB) — DEAD ساختاری", service: "نشست اپ — مقید به رکورد Session", action: "No action؛ خروج اختیاری از index با مجوز مالک", owner_perm: "خیر (به‌جز خروج اختیاری)" },
  ],
  decision: "NO-GO (پابرجا) — Stage 4 منوط به تأیید صریح مالک",
};
fs.mkdirSync("/home/z/my-project/download/P0_6R_evidence", { recursive: true });
fs.writeFileSync("/home/z/my-project/download/P0_6R_evidence/p06r_register.json", JSON.stringify(REGISTER, null, 1));

const pageHeader = () => new Header({
  children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    children: [r("رهیار AI — گزارش P0-6R: چرخش و ابطال اعتبارنامه‌ها (بدون افشای مقدار — محرمانه)", { size: 18, color: "808080" })],
  })],
});
const pageFooter = () => new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE")] })],
});

const body = [];

// ── ۱. چکیده ──
body.push(h1("۱. چکیدهٔ اجرایی"));
body.push(para("مأموریت P0-6R بر مبنای گزارش نهایی P0-6 (مورخ 2026-10-31، تصمیم NO-GO) تعریف شده است و هدف آن آماده‌سازی چرخش و ابطال امن اعتبارنامه‌های شناسایی‌شده است. این سند خروجی سه مرحلهٔ نخست مأموریت است: Stage 1 — استخراج رجیستر اقدام C1 تا C10 از گزارش P0-6؛ Stage 2 — تفکیک مالکیت، سرویس، وضعیت فعالیت و وابستگی‌های هر اعتبارنامه فقط با روش‌های مجاز؛ Stage 3 — بستهٔ درخواست مجوز مالک برای اجرای Stage 4. تا لحظهٔ تنظیم این گزارش هیچ چرخش، ابطال، تغییر ریموت، بازنویسی تاریخچه یا حذف blobای انجام نشده است."));
body.push(para("راستی‌آزمایی تازهٔ امروز (2026-10-31) با ابزار ماسک‌شدهٔ p06r_verify.py، هر چهار یافتهٔ قطعی مبنای مأموریت را مستقلاً تأیید کرد: (۱) مقدار C8 میان .evidence-password روی main و literal داخل scripts/mint-evidence-session.mjs روی fix یکی است (تطبیق اثرانگشت SHA-256)؛ (۲) C8 همچنان در تاریخچهٔ اختصاصی fix زنده است؛ (۳) اصلاح P0-5 روی fix اعمال نشده — اسکریپت mint همچنان const PASSWORD با مقدار literal دارد، صفر ارجاع به process.env دارد و نام EVIDENCE_SESSION_SECRET در آن نیست؛ (۴) شش مقدار واقعی (C1، C2، C3، C4، C5، C10) در تاریخچهٔ عمومی origin هستند. مجموع ۱۲ کنترل اثرانگشت روی مراجع عمومی و محلی: ۱۲ از ۱۲ مطابق."));
body.push(para("تصمیم فعلی طبق مأموریت: NO-GO — پابرجا. تا وقتی اعتبارنامه‌های لو رفته چرخش یا ابطال نشده‌اند یا بی‌اعتباری‌شان با شواهد معتبر اثبات نشده، وضعیت باید B (NO-GO) یا C (UNKNOWN) بماند. این گزارش با شرط خاتمهٔ مأموریت هم‌خوان است: تکمیل P0-6R به‌خودی‌خود مجوز Push یا انتشار نیست؛ پس از ارائهٔ این بسته، اجرای هر اقدامی منوط به تأیید صریح مالک است و هر عملیات ریموتی نیازمند مجوز جداگانه خواهد بود."));

// ── ۲. تثبیت وضعیت ──
body.push(h1("۲. تثبیت وضعیت مخزن"));
body.push(para("وضعیت مراجع در ابتدا و انتهای این مأموریت یکسان بود و هیچ عملیات تغییردهنده‌ای روی مخزن اعمال نشده است. تنها تغییر Working Tree نسبت به آغاز مأموریت، دو اسکریپت ابزاری untracked این مأموریت (scripts/p06r_verify.py و scripts/gen-p06r-report.js) و خروجی‌های مسیر download/ است که gitignored است (خط ۷۰ .gitignore)."));
body.push(cap("جدول ۱ — وضعیت مراجع و شاخه‌ها (Full SHA) در 2026-10-31"));
body.push(tbl(["مورد", "مقدار", "منبع"], [
  ["HEAD فعلی", "d9eb7eabef64ff66a7e7f2c61554f63ec3370a42", "git rev-parse HEAD"],
  ["main", "d9eb7eabef64ff66a7e7f2c61554f63ec3370a42 (برابر HEAD)", "git rev-parse main"],
  ["fix/corrective-mission-360", "fc71e84fca87ca9dd07601d44961d2369154ac32 — بدون تغییر نسبت به گزارش P0-6", "git rev-parse"],
  ["origin/main", "28b64bb0bc21e162703a59a01f6d828f8c2065d4 — بدون تغییر", "git rev-parse origin/main"],
  ["origin/feature/ambient-motion-polish", "f2cf171a782a04e19284bf026ca29bc9d007711d — بدون تغییر", "git rev-parse"],
  ["فاصلهٔ main از origin/main", "۱۴ جلو / ۰ عقب؛ مبنای مشترک 28b64bb", "rev-list --left-right --count"],
  ["فاصلهٔ fix از origin/main", "۱۷ جلو / ۰ عقب؛ مبنای مشترک همان 28b64bb", "rev-list --left-right --count"],
  ["تگ‌های عمومی v1.0.0-rc1 / v1.1.0 / v1.2.0", "631dc471… / 4621c060… / ed9ec2d2… — هر سه در تاریخچهٔ origin/main", "for-each-ref refs/tags"],
  ["پشتیبان بازنویسی قدیمی", "refs/original/refs/heads/main @ d776ca8a… و refs/original/refs/tags/v1.0.0-rc1 @ 2202fcf4… — فقط محلی، دست‌نخورده", "for-each-ref refs/original"],
  ["Worktreeها", "دقیقاً یک worktree: /home/z/my-project روی main — هیچ worktree فرعی فعال نیست", "git worktree list --porcelain"],
  ["Working Tree", "فقط دو اسکریپت ابزاری untracked این مأموریت؛ بدون هیچ تغییر tracked", "git status --porcelain"],
], [26, 48, 26]));
body.push(para("شفاف‌سازی دربارهٔ رانش main از زمان گزارش P0-6: در گزارش P0-6 مقدار HEAD برابر 4de08f7a… ثبت شده بود. اکنون main با یک کامیت (d9eb7eab — تاریخ 2026-10-30 17:23 UTC) جلو رفته است. بازرسی محتوای همان کامیت نشان می‌دهد فقط ۷ اسکریپت ابزاری p06_* (۹۳۱ خط درج، صفر حذف) اضافه شده و هیچ فایل حساس، هیچ مسیر کد محصول و هیچ اعتبارنامه‌ای تغییر نکرده است. هم‌زمان، ۱۲/۱۲ کنترل اثرانگشت امروز نشان می‌دهد وضعیت محتوایی همهٔ اعتبارنامه‌ها نسبت به گزارش P0-6 هیچ تغییری نکرده است — یعنی رانش، صرفاً ابزاری و بی‌خطر است. fix و هر دو مرجع origin دقیقاً روی مقادیر ثبت‌شدهٔ گزارش P0-6 باقی‌اند."));

// ── ۳. Stage 1 ──
body.push(h1("۳. Stage 1 — رجیستر اقدام C1 تا C10"));
body.push(para("رجیستر زیر مستقیماً از گزارش P0-6 استخراج و با شواهد تازهٔ امروز انطباق داده شده است. هر مقدار فقط با اثرانگشت SHA-256 (۱۲ نویسهٔ نخست) و طولش شناسایی می‌شود؛ هیچ مقدار خامی در این سند، در لاگ‌ها یا فایل‌های شواهد نوشته نشده است. موارد تکراری با fp یکسان ادغام شده‌اند — مهم‌ترین همانی: مقدار C8 در اسکریپت mint روی fix دقیقاً برابر محتوای .evidence-password روی main است. دو مورد از ده مورد اعتبارنامهٔ واقعی نیستند: C6 (مقدار آزمون منفی — مثبت کاذب عمدی) و C4 (جفت‌رمز کی‌استور قدیمی که مادهٔ کلیدش از بین رفته و بی‌اثر است)."));
body.push(cap("جدول ۲ — Stage 1 (الف): شناسایی و نوع افشا"));
body.push(tbl(["شناسه", "fp", "محل و نوع افشا", "دامنهٔ تاریخچه", "نوع اعتبارنامه / علت FP"], [
  ["C1", "cec51518b9ac", "literal داخل preview-setup.ts + ۱۳ اسکریپت capture شواهد (۱۴ blob)", "عمومی — origin/main و origin/feature (از ۲۰۲۶-۱۰-۱۹/۲۲)", "رمز ورود owner — دورهٔ شواهد v2.0/v2.1"],
  ["C2", "ee0880daa2ca", "literal داخل test-user-isolation.ts", "عمومی — شامل تگ v1.0.0-rc1", "رمز ورود owner — نسل اول (rc1)"],
  ["C3", "f60ed56a9c82", "literal داخل build-android-rebuild.sh و build-android-apk-v11.sh", "عمومی — شامل تگ v1.2.0", "رمز store کی‌استور فعلی + مقدار متعارف رمز کلید ابزار اندروید"],
  ["C4", "dd65b755befe", "literal داخل build-android-apk.sh", "عمومی — از ۲۰۲۶-۱۰-۱۹", "رمز store کی‌استور قدیمی + رمز کلید با الگوی نام+سال — بی‌اثر (کلید حذف شده)"],
  ["C5", "8eb38003b10d", "literal داخل live-v2-tests.cjs", "عمومی — از ۲۰۲۶-۱۰-۲۱", "رمز کاربر آزمونی («sarika»)"],
  ["C6", "e20de4c418c6", "literal داخل live-v2-tests.cjs", "عمومی — از ۲۰۲۶-۱۰-۲۱", "FP عمدی — مقدار آزمون منفی (badLogin)؛ اعتبارنامهٔ قابل‌استفاده نیست"],
  ["C10", "9774fdedae3b", "literal داخل live-final-audit.ts", "عمومی — تاریخچهٔ عمومی", "رمز یک جفت‌حساب با نام‌کاربری ۱۶کاراکتری"],
  ["C7", "46d0a91d1e48", "literal داخل audit-screens.mjs", "فقط محلی — main + fix؛ هرگز عمومی نشده", "رمز ورود owner — دورهٔ ممیزی ۳۶۰"],
  ["C8", "8aa62d3b0a15", "دو تکه: literal در mint-evidence-session.mjs (فقط fix) + فایل .evidence-password (فقط main)", "فقط محلی — دو تکه در دو شاخه", "رمز bootstrap شواهد — مسدودکنندهٔ P0-5؛ بازتسلیح‌پذیر"],
  ["C9", "ff9d8259a6e5", "فایل .evidence-session-token (فقط main)", "فقط محلی — main", "توکن نشست — ۳۲بایت base64url، انقضای ۲۴ساعته، مقید به DB"],
], [9, 21, 24, 19, 27]));
body.push(cap("جدول ۳ — Stage 1 (ب): سرویس اثبات‌شده، اقدام پیشنهادی و نیاز به مجوز"));
body.push(tbl(["شناسه", "سرویس یا سامانهٔ مرتبط (فقط در صورت اثبات)", "اقدام پیشنهادی", "مجوز مالک"], [
  ["C1", "احراز هویت خود اپ — /api/auth/login با scrypt در src/lib/auth.ts", "Rotate در هر استقرار زندهٔ دورهٔ v2.0/v2.1 + Investigate دربارهٔ وجود چنین استقراری", "بله"],
  ["C2", "همان سرویس — نسل اول", "Rotate مشروط (فقط اگر استقرار زندهٔ دورهٔ rc1 وجود داشته باشد)؛ در غیر این صورت No action مستندشده", "بله"],
  ["C3", "امضای APK — android/rahyar-release.keystore (فایل فقط محلی؛ هش امروز تأیید شد)", "Rotate رمز store و key با keytool، فقط پس از پشتیبان رمزشدهٔ خارج از مخزن", "بله"],
  ["C4", "کی‌استور قدیمی — بنا بر android/README.md همراه با reset محیط از بین رفته", "No action — جفت‌رمز بی‌اثر است؛ فقط در سناریوی بازنویسی تاریخی معنا دارد", "خیر"],
  ["C5", "اپ توسعه — حساب آزمونی", "Revoke مشروط (حذف حساب اگر در استقراری وجود دارد)؛ در محیط فعلی No action — DB خالی", "بله (مشروط)"],
  ["C6", "اپ توسعه — آزمون منفی", "No action — مثبت کاذب عمدی", "خیر"],
  ["C10", "اپ (/api/auth/login با BASE قابل‌تنظیم) — دورهٔ راستی‌آزمایی زندهٔ v2", "Rotate مشروط + Investigate استقرار زندهٔ آن دوره", "بله"],
  ["C7", "احراز هویت خود اپ — اسکریپت عکس‌برداری ممیزی ۳۶۰", "Investigate + Sanitize (حذف literal از اسکریپت) پیش از هر push؛ Rotate اختیاری چون هرگز عمومی نشده", "بله (تغییر روی fix)"],
  ["C8", "bootstrap شواهد — ساخت owner در DB خالی با hashPassword خود اپ", "P0-5 (حذف literal، خواندن فقط از env، توقف امن، تست) + Rotate مقدار (تولید و نگهداری فقط توسط مالک) + ابطال مؤثر مقدار قدیمی", "بله"],
  ["C9", "نشست اپ — مقید به رکورد Session با TTL ۲۴ساعته", "No action — مردهٔ ساختاری؛ خروج اختیاری فایل از index فقط با مجوز مالک", "خیر (به‌جز اختیاری)"],
], [9, 33, 42, 16]));

// ── ۴. Stage 2 ──
body.push(h1("۴. Stage 2 — مالکیت، وضعیت فعالیت و وابستگی‌ها"));
body.push(para("مبنای روش: هیچ آزمون تهاجمی، هیچ ورود غیرمجاز و هیچ درخواست شبکه‌ای با هیچ اعتبارنامه‌ای انجام نشده است. وضعیت «فعال یا نه» فقط با روش‌های مجاز و بدون افشای مقدار بررسی شد: سرشماری فقط-خواندنی دیتابیس توسعه (db/custom.db — حالت URI فقط-خواندنی)، مقایسهٔ اثرانگشت blobها روی مراجع، بررسی هش فایل کی‌استور و بازبینی منطق کد. هر جا فعال‌بودن یا فعال‌نبودن در استقرار بیرونی بدون آزمون شبکه‌ای قابل اثبات نبود، صریحاً UNKNOWN ثبت شده است — حدس زده نشده است."));
body.push(cap("جدول ۴ — وضعیت فعالیت، مجرای Rotate/Revoke و وابستگی‌ها"));
body.push(tbl(["شناسه", "وضعیت فعالیت (فقط روش مجاز)", "مجرای Rotate / Revoke", "وابستگی‌های نیازمند به‌روزرسانی"], [
  ["C1", "UNKNOWN — در DB فعلی اثری ندارد (۰ کاربر، سرشماری امروز)؛ فعال‌بودن در استقرار بیرونی دورهٔ v2.0/v2.1 بدون آزمون شبکه‌ای قابل اثبات نیست", "تغییر رمز از مسیر رسمی خود اپ؛ مقدار جدید فقط توسط مالک وارد می‌شود", "۱۴ اسکریپت شواهد با مقدار قدیمی → مصنوع تاریخی؛ نیاز اجرایی ندارند"],
  ["C2", "UNKNOWN-کهنه — نسل اول؛ به‌احتمال قوی جایگزین شده؛ طبق قاعدهٔ مأموریت باید مرده فرض شود", "همان مجرای C1", "test-user-isolation.ts (تاریخی)"],
  ["C3", "ACTIVE-LOCAL اثبات‌شده — فایل کی‌استور موجود و هش SHA-256 آن برابر مقدار ثبت‌شدهٔ P0-6 است؛ رمزش عمومی است", "keytool برای store-pass و key-pass؛ اجرا توسط مالک یا با env تا مقدار در ترمینال/لاگ نماند", "build-android-rebuild.sh و build-android-apk-v11.sh (مقدار هاردکد)، docs/KEYSTORE_SECURITY.md، جریان انتشار APK"],
  ["C4", "MOOT اثبات‌شده — مادهٔ کلید کی‌استور قدیمی وجود ندارد؛ جفت‌رمز بی‌اثر", "بی‌مورد", "اسکریپت build قدیمی (تاریخی)"],
  ["C5", "UNKNOWN-LOW — حساب در DB فعلی وجود ندارد؛ اثر عملی ناچیز", "حذف حساب آزمونی در هر استقرار زنده؛ محلی هیچ", "live-v2-tests.cjs (تاریخی)"],
  ["C6", "NON-CREDENTIAL — رشتهٔ عمداً نادرست برای آزمون badLogin", "بی‌مورد", "—"],
  ["C10", "UNKNOWN — احتمال اشاره به استقرار زندهٔ دورهٔ v2؛ بدون آزمون شبکه‌ای نامعلوم", "همان مجرای C1", "live-final-audit.ts (تاریخی)"],
  ["C7", "UNKNOWN — فقط محلی؛ جدیدتر از C2 و قدیمی‌تر از C8؛ هرگز عمومی نشده و امروز هم روی هیچ مرجع origin نیست", "Sanitize اسکریپت (خواندن مقدار از env/آرگومان در زمان اجرا)؛ تغییر رمز اختیاری", "audit-screens.mjs روی fix و main"],
  ["C8", "RE-ARMABLE — امروز بی‌اثر است (۰ کاربر، ۰ نشست) اما اجرای دوبارهٔ اسکریپت mint همان مقدار را در DB بازمی‌سازد؛ هرگز عمومی نشده", "اصلاح P0-5 + مقدار جدید فقط در env محلی untracked (دسترسی ۰۶۰۰)؛ پس از اصلاح، مقدار قدیمی دیگر هیچ مسیر احرازی ندارد", "mint-evidence-session.mjs، .env.example (نام کلید هنوز در آن ثبت نشده)، جریان شواهد آینده"],
  ["C9", "DEAD اثبات‌شده — منقضی (ضبط ۱۰-۲۹)، رکوردش در DB فعلی نیست، resolveUser طول زیر ۲۰ کاراکتر را رد می‌کند و طرح نشست جدید ۳۲بایتی است", "بی‌مورد؛ فقط خروج اختیاری فایل از index", "—"],
], [9, 33, 29, 29]));
body.push(cap("جدول ۵ — شواهد تازهٔ راستی‌آزمایی ماسک‌شدهٔ امروز (2026-10-31)"));
body.push(tbl(["کنترل", "نتیجه", "مبنا"], [
  ["۱۲ بررسی اثرانگشت روی مراجع عمومی و محلی (C1 در دو مرجع جداگانه)", "۱۲ از ۱۲ مطابق — هیچ جابه‌جایی محتوایی", "scripts/p06r_verify.py — fp=SHA-256[:12]؛ بدون چاپ مقدار"],
  ["موضع اسکریپت mint روی fix", "const PASSWORD با literal موجود؛ بدون EVIDENCE_SESSION_SECRET؛ صفر ارجاع process.env", "P0-5 قطعاً اجرا نشده است"],
  ["پیوند دوشاخه‌ای C8", "fp فایل .evidence-password روی main = fp literal داخل اسکریپت روی fix", "همانی بایت‌به‌بایت دو تکه حفظ شده"],
  ["فایل کی‌استور", "SHA-256 فایل برابر مقدار ثبت‌شدهٔ P0-6؛ فقط روی main محلی tracked؛ غایب از fix و هر دو مرجع origin", "سلامت و تک‌نسخه‌بودن فایل کلید"],
  ["سرشماری DB (فقط-خواندنی)", "۰ کاربر، ۰ نشست، ۰ نشست منقضی‌نشده — ۱۴ جدول شمارش شد", "db/custom.db با حالت URI فقط-خواندنی"],
  ["کتابخانهٔ گزارش (corrective-report-lib.js)", "blob برابر میان main و fix؛ SHA-256 نسخهٔ کاری امروز ثبت شد", "بدون تغییر ناخواسته در ابزار گزارش"],
  ["گاوصندوق کی‌استور (/home/z/keystore-vault)", "موجود نیست — بازیافت محیط آن را از بین برده", "پیش‌نیاز بحرانی: پشتیبان رمزشده پیش از هر اقدام روی C3"],
  ["نادیده‌گیری مسیرها", "download/ در .gitignore (خط ۷۰)؛ fix شامل ۱۰ الگوی keystore/jks/p12 است", "مسیر untracked بستهٔ تحویل تأیید شد"],
], [30, 36, 34]));
body.push(para("یادداشت شفافیت — مورد خارج از رجیستر: فایل upload/HAMYAR TOKEN.txt در پوشهٔ gitignored وجود دارد؛ طبق اثبات گزارش P0-6 هرگز commit نشده (هیچ blobای با آن نام در کل تاریخچه نیست) و در رجیستر C1 تا C10 هم نیست. برای پرهیز از خارج‌شدن از محدودهٔ مأموریت فقط همین یادداشت دربارهٔ آن ثبت می‌شود: تصمیم دربارهٔ چرخش یا نگهداری آن کاملاً بر عهدهٔ مالک است و این گزارش هیچ حکمی درباره‌اش نمی‌دهد."));

// ── ۵. Stage 3 ──
body.push(h1("۵. Stage 3 — بستهٔ درخواست مجوز مالک"));
body.push(para("پیش از هر تغییری، فهرست دقیق اقدام‌ها برای تأیید مالک ارائه می‌شود. تا دریافت تأیید صریح، فقط بررسی و مستندسازی مجاز است و هیچ مرحله‌ای از جدول زیر اجرا نمی‌شود. دو قاعدهٔ سراسری بر اجرا حاکم است: نخست — تولید، انتقال و نگهداری هر مقدار جدید فقط توسط مالک انجام می‌شود و هیچ مقدار جدیدی در فایل، Git، گزارش یا خروجی ترمینال ثبت نمی‌شود؛ دوم — اجرای مرحله‌ای با توقف در نخستین شکست: اگر هر مرحله شکست بخورد، ادامهٔ مراحل وابسته متوقف می‌شود و نتیجهٔ هر مرحله فقط با زمان، شناسهٔ عملیات و وضعیت ثبت می‌شود، نه با مقدار."));
body.push(cap("جدول ۶ — برنامهٔ اقدام به ترتیب پیشنهادی (برای تأیید مالک)"));
body.push(tbl(["ترتیب", "اقدام", "شناسه", "اثر احتمالی بر برنامه", "بازگشت امن در صورت شکست"], [
  ["۱", "تهیهٔ پشتیبان رمزشدهٔ خارج از مخزن از کی‌استور + ثبت هش — پیش‌نیاز مرحلهٔ ۴؛ بدون آن مرحلهٔ ۴ اجرا نشود", "C3 (پیش‌نیاز)", "هیچ", "بازیابی از همان پشتیبان"],
  ["۲", "تعیین تکلیف استقرارهای زنده توسط مالک: کدام دوره‌ها (v1، v2.0/v2.1، ممیزی ۳۶۰، راستی‌آزمایی زندهٔ v2) استقرار بیرونی داشته‌اند؟", "C1، C2، C10، C5", "هیچ — فقط تصمیم", "— (بدون تغییر)"],
  ["۳", "چرخش رمزهای اپ در هر استقرار زندهٔ تأییدشده، به‌ترتیب از جدیدترین؛ حذف حساب آزمونی در صورت وجود", "C1، C10، C2، C5", "ورود با رمز جدید؛ نشست‌های باز طبق سیاست نشست اپ", "بازگردانی رمز قبلی در همان مسیر رسمی تا پایان پنجرهٔ بازگشت"],
  ["۴", "چرخش store-pass و key-pass کی‌استور با keytool — اجرا توسط مالک با مقدارها از env (نه آرگومان ترمینال)", "C3", "امضای APK بدون وقفه؛ گواهی و امضای فعلی تغییر نمی‌کند", "بازگردانی فایل کی‌استور از پشتیبان مرحلهٔ ۱ و ادامه با رمز قبلی"],
  ["۵", "اجرای P0-5 روی fix مطابق بخش ۶ — حذف literal، خواندن فقط از env، توقف امن، تست‌های امنیتی", "C8", "اسکریپت mint بدون env امن متوقف می‌شود (رفتار درست)؛ جریان شواهد نیازمند تنظیم env", "بازگردانی نسخهٔ قبلی اسکریپت از git فقط با مجوز مالک — این بازگشت، C8 را برمی‌گرداند"],
  ["۶", "Sanitize مقدار C7 در audit-screens.mjs (خواندن از env/آرگومان در زمان اجرا)", "C7", "اسکریپت ممیزی در اجرا مقدار می‌گیرد", "بازگردانی از git با مجوز مالک"],
  ["۷", "خروج اختیاری .evidence-session-token از index روی main (نظافت)", "C9", "هیچ — فایل مردهٔ ساختاری است", "بازگردانی فایل از تاریخچه"],
  ["۸", "پس از مراحل ۱ تا ۶ و اسکن مجدد ماسک‌شده: تصمیم جداگانهٔ مالک دربارهٔ تاریخچهٔ اختصاصی fix و سپس درخواست مجوز Push", "—", "—", "—"],
], [7, 34, 12, 25, 22]));
body.push(para("ترتیب پیشنهادی از سه اصل می‌آید: پیش از هر اقدام مخرب، پشتیبان؛ پیش از چرخش هر رمز، روشن‌شدن مالکیت و استقرار هدفش (تا UNKNOWN به تصمیم مالک تبدیل شود، نه به حدس)؛ و اجرای C8/C7 روی fix پیش از هر گفت‌وگویی دربارهٔ push — چون هر push از fix در وضعیت فعلی یعنی افشای عمومی فوری دو رمز محلی دیگر. هیچ‌یک از هشت مرحلهٔ جدول ۶ در این مأموریت اجرا نشده است."));

// ── ۶. طرح P0-5 برای C8 ──
body.push(h1("۶. طرح اجرایی P0-5 برای C8 — پس از تأیید مالک، در محیط محلی"));
body.push(para("مأموریت P0-6R اجرای P0-5 را به‌عنوان بخشی از Stage 4 و منوط به تأیید مالک تعریف کرده است. مشخصات فنی اصلاح، عیناً مطابق مأموریت است: حذف کامل مقدار هاردکدشده از scripts/mint-evidence-session.mjs؛ دریافت Secret فقط از process.env.EVIDENCE_SESSION_SECRET؛ توقف امن (خروج با کد مشخص و پیام بدون هیچ مقداری) در صورت نبود یا نامعتبر بودن متغیر؛ حذف هرگونه fallback به مقدار ثابت یا پیش‌فرض؛ افزودن تست‌های امنیتی؛ و اسکن تاریخچه و اشیای قابل‌انتقال به‌صورت ماسک‌شده و بدون چاپ مقدارها."));
body.push(para("تست‌های امنیتی پیشنهادی (پنج‌گانه): (۱) با نبود متغیر env، اسکریپت باید بدون ساخت هیچ نشست یا حسابی متوقف شود؛ (۲) با env معتبر، نشست ساخته شود اما فقط hash در DB بنشیند و هیچ مقداری در خروجی ننویسد؛ (۳) اسکن fp روی فایل اسکریپت هیچ literalای با اثرانگشت C8 باقی نگذارد؛ (۴) هیچ مسیر fallback (مقدار پیش‌فرض، فایل جانبی، مقدار قدیمی) در کد نباشد؛ (۵) پس از کامیت، اسکن ماسک‌شدهٔ مجموعهٔ قابل‌انتقال fix هیچ یافتهٔ واقعی تازه‌ای نشان ندهد — تنها یافتهٔ باقی‌مانده باید blob تاریخی C8 در کامیت‌های قدیمی fix باشد."));
body.push(para("دو وابستگی مکمل: امروز نام EVIDENCE_SESSION_SECRET نه در اسکریپت است و نه در .env.example — در همین اصلاح، نام متغیر (بدون هیچ مقداری) باید به .env.example اضافه شود تا استقرار آینده بداند چه چیزی را تنظیم کند. الگوهای .gitignore سخت‌شدهٔ fix (۱۰ الگوی keystore/jks/p12) از قبل از بازگشت فایل‌های کلید جلوگیری می‌کنند و نیازی به تغییر ندارند."));
body.push(para("محدودهٔ صریح نسبت به تاریخچه: این اصلاح فقط یک کامیت کد روی fix است. طبق محدودیت غیرقابل‌مذاکرهٔ شمارهٔ ۲ مأموریت، هیچ blob یا کامیت قدیمی بازنویسی یا حذف نمی‌شود؛ بنابراین blob تاریخی C8 در کامیت‌های قدیمی fix قابل‌دستیزی باقی می‌ماند و مجموعهٔ قابل‌انتقال fix پس از P0-5 هم همچنان آن را حمل خواهد کرد. به همین دلیل، حتی پس از اجرای موفق P0-5، push از fix همچنان نیازمند تصمیم جداگانه و مستند مالک دربارهٔ تاریخچه (سناریوی ۲ گزارش P0-6 — بازنویسی با برنامهٔ مهاجرت) است. P0-5 شرط لازم است، نه کافی."));

// ── ۷. وضعیت نهایی و تصمیم ──
body.push(h1("۷. وضعیت نهایی C1 تا C10 و تصمیم"));
body.push(cap("جدول ۷ — وضعیت هر مورد پس از P0-6R (پیش از اجرای Stage 4)"));
body.push(tbl(["شناسه", "وضعیت", "مانع یا شرط باقی‌مانده"], [
  ["C1", "بدون تغییر — UNKNOWN استقرار", "مجوز و اجرای چرخش پس از تعیین تکلیف استقرارها (مراحل ۲ و ۳)"],
  ["C2", "بدون تغییر — UNKNOWN-کهنه", "تصمیم مالک دربارهٔ دورهٔ rc1 (مرحلهٔ ۲)"],
  ["C3", "بدون تغییر — ACTIVE-LOCAL با رمز عمومی", "پشتیبان رمزشده (مرحلهٔ ۱) و سپس مجوز چرخش keytool (مرحلهٔ ۴)"],
  ["C4", "تکلیف‌شده — MOOT", "هیچ — فقط در سناریوی بازنویسی تاریخی معنا دارد"],
  ["C5", "بدون تغییر — UNKNOWN-LOW", "مشروط به یافتهٔ مرحلهٔ ۲ دربارهٔ استقرارها"],
  ["C6", "تکلیف‌شده — NON-CREDENTIAL", "هیچ"],
  ["C10", "بدون تغییر — UNKNOWN استقرار", "مشروط به یافتهٔ مرحلهٔ ۲"],
  ["C7", "بدون تغییر — فقط محلی", "Sanitize پیش از هر push (مرحلهٔ ۶)"],
  ["C8", "بدون تغییر — RE-ARMABLE", "اجرای P0-5 پس از مجوز (بخش ۶) + مقدار جدید فقط از مالک"],
  ["C9", "تکلیف‌شده — DEAD ساختاری", "هیچ — خروج اختیاری از index با مجوز مالک (مرحلهٔ ۷)"],
], [11, 33, 56]));
body.push(para("تصمیم: NO-GO — پابرجا. سه مورد (C4، C6، C9) بی‌نیاز از اقدام‌اند و با استدلال مستند بسته شده‌اند؛ هفت مورد باقی‌مانده به تأیید و اجرای بستهٔ بخش ۵ وابسته‌اند. آمادگی برای مرحلهٔ بعد: این گزارش همهٔ داده‌های لازم برای تصمیم مالک را فراهم کرده است؛ با تأیید صریح مالک، Stage 4 (چرخش/ابطال + P0-5) طبق جدول ۶ و بخش ۶ اجرا می‌شود و پس از آن گزارش نهایی Stage 5 با فهرست چرخش‌های اجراشده، شواهد غیرحساس موفقیت و وضعیت به‌روزشدهٔ C1 تا C10 ارائه خواهد شد. یادآوری شرط خاتمهٔ مأموریت: تکمیل P0-6R و حتی اجرای کامل Stage 4 به‌معنای مجوز Push یا انتشار نیست؛ هر عملیات ریموت نیازمند مجوز جداگانه و صریح است."));

// ── پیوست ──
body.push(h1("پیوست الف — دستورهای بازتولید شواهد"));
body.push(para("وضعیت مراجع: git rev-parse برای HEAD، main، fix/corrective-mission-360، origin/main و origin/feature/ambient-motion-polish؛ git rev-list --left-right --count برای فاصله‌ها؛ git worktree list --porcelain؛ git for-each-ref برای تگ‌ها و refs/original. راستی‌آزمایی ماسک‌شده: python3 scripts/p06r_verify.py — برای هر هدف، blob با git show خوانده می‌شود، لفظ‌های رشته‌ای استخراج و تنها اثرانگشت SHA-256 (۱۲ نویسهٔ نخست) مقایسه می‌شود؛ خروجی JSON ماسک‌شده: download/P0_6R_evidence/p06r_verify.json. موضع mint: شمارش الگوی const PASSWORD، ارجاع‌های process.env و رشتهٔ EVIDENCE_SESSION_SECRET روی نسخهٔ fix. سرشماری DB: اتصال فقط-خواندنی (حالت URI) به db/custom.db و شمارش رکوردها. هش کی‌استور: sha256sum android/rahyar-release.keystore. برابری کتابخانهٔ گزارش: git rev-parse HEAD:scripts/corrective-report-lib.js در برابر نسخهٔ fix. رجیستر ماسک‌شدهٔ این گزارش: download/P0_6R_evidence/p06r_register.json. در هیچ دستوری مقدار خامی چاپ یا ذخیره نشده است."));
body.push(h1("پیوست ب — بستهٔ تحویل و SHA256SUMS"));
body.push(para("این سند به‌همراه نسخهٔ PDF و دو فایل شواهد ماسک‌شده (p06r_register.json و p06r_verify.json) در مسیر untracked download/P0_6R و download/P0_6R_evidence نگهداری می‌شود؛ فایل SHA256SUMS روی کل بسته تولید و بازخوانی (verify) شده است. پایبندی مأموریت به محدودیت‌ها: هیچ Push، PR، Merge، Force Push یا تغییر ریموت؛ هیچ بازنویسی یا حذف تاریخچه و blob؛ هیچ مقدار خام در ترمینال، گزارش، لاگ یا مکالمه؛ هیچ Rotate/Revoke بدون مجوز صریح مالک؛ هیچ رمز جدیدی در هیچ جایی ثبت نشده؛ و هیچ تغییری خارج از محدودهٔ مأموریت (دو اسکریپت ابزاری untracked و خروجی‌های ignored) انجام نشده است."));

// ── سند ──
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FA, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } },
      heading1: { run: { font: FA, size: 32, bold: true, color: P.primary }, paragraph: { spacing: { before: 380, after: 170, line: 380 }, outlineLevel: 0 } },
      heading2: { run: { font: FA, size: 28, bold: true, color: P.primary }, paragraph: { spacing: { before: 260, after: 130, line: 360 }, outlineLevel: 1 } },
    },
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "چرخش و ابطال اعتبارنامه‌ها — رجیستر اقدام و درخواست مجوز",
        subtitle: "خروجی Stage 1 تا 3 مأموریت P0-6R بر مبنای گزارش P0-6 — در انتظار تأیید مالک برای اجرا",
        englishLabel: "RAHYAR P0-6R — CREDENTIAL ROTATION & REVOCATION",
        metaLines: [
          "RAHYAR_P0_6R_CREDENTIAL_ROTATION_REVOCATION_REQUEST",
          "main @ d9eb7eab · fix @ fc71e84 · origin/main @ 28b64bb",
          "رجیستر C1 تا C10 — ۱۲/۱۲ کنترل اثرانگشت امروز مطابق",
          "P0-5 همچنان اجرا نشده — C8 بازتسلیح‌پذیر روی fix",
          "تصمیم پابرجا: NO-GO — اجرای Stage 4 منوط به مجوز مالک",
        ],
        footerRight: "رهیار AI",
        footerLeft: "گزارش P0-6R — محرمانه",
      }),
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1417, right: 1701 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [r("فهرست مطالب", { bold: true, size: 32, color: P.primary })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          bidirectional: true, spacing: { before: 200 },
          children: [r("یادآوری: پس از باز کردن سند، برای به‌روزرسانی شماره صفحه‌ها روی فهرست راست‌کلیک و «Update Field» را انتخاب کنید.", { italics: true, size: 18, color: "888888" })],
        }),
      ],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1417, right: 1701 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("DOCX written:", OUT, (buf.length / 1024).toFixed(0) + "KB");
});
