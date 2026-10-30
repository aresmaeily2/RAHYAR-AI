// ─── RAHYAR_P0_6_CREDENTIAL_ROTATION_AND_REMOTE_RISK_REPORT — DOCX فارسی RTL ───
// مأموریت P0-6: چرخش Credentialهای افشاشده و ارزیابی ریسک Remote — فقط-خواندنی
// هیچ مقدار واقعی Secret/Password/Token در این سند چاپ یا ذخیره نمی‌شود.
const {
  Document, Packer, Paragraph, TextRun, TableOfContents, SectionType,
  NumberFormat, AlignmentType, BorderStyle, Header, Footer, SimpleField,
  r, para, h1, h2, tbl, cap, P, FA, buildCoverR1,
} = require("./corrective-report-lib.js");
const fs = require("fs");

const OUT_DIR = "/home/z/my-project/download/P0_6";
const OUT = OUT_DIR + "/RAHYAR_P0_6_CREDENTIAL_ROTATION_AND_REMOTE_RISK_REPORT.docx";

// ── خروجی JSON ثبت اعتبارنامه‌ها (بدون هیچ مقدار) ──
const REGISTER = {
  mission: "P0-6", generated_at_tehran: "2026-10-30 ~19:45 (+03:30)",
  masking: "fp=sha256(value)[:12]; هیچ مقدار خامی ذخیره نشده است",
  credentials: [
    { id: "C1", fp: "cec51518b9ac", len: 11, nature: "owner login password (evidence era v2.0/v2.1)", files: "preview-setup.ts + 13 evidence capture scripts (14 public blobs)", reach: "PUBLIC (origin/main + origin/feature)", first_public: "2026-10-19 (d17a2b2e87) / 2026-10-22 (e06e2bd46b)" },
    { id: "C2", fp: "ee0880daa2ca", len: 15, nature: "owner login password (era v1.0.0-rc1)", files: "test-user-isolation.ts", reach: "PUBLIC (origin/main + origin/feature + tag v1.0.0-rc1)", first_public: "2026-10-18/19" },
    { id: "C3", fp: "f60ed56a9c82", len: 7, nature: "keystore store-pass (current keystore) + conventional key-pass literal", files: "build-android-rebuild.sh, build-android-apk-v11.sh", reach: "PUBLIC (origin/main + origin/feature + tag v1.2.0)", first_public: "2026-10-20 (c3efa8fc97, 02debb2373)" },
    { id: "C4", fp: "dd65b755befe", len: 10, nature: "old keystore store-pass + year-suffixed key-pass literal", files: "build-android-apk.sh", reach: "PUBLIC (origin/main + origin/feature + tags)", first_public: "2026-10-19 (5f8fb03f42)" },
    { id: "C5", fp: "8eb38003b10d", len: 11, nature: "test-user (sarika) password", files: "live-v2-tests.cjs", reach: "PUBLIC", first_public: "2026-10-21 (54021d832c)" },
    { id: "C6", fp: "e20de4c418c6", len: 12, nature: "negative-test literal (badLogin) — NOT a usable credential", files: "live-v2-tests.cjs", reach: "PUBLIC", first_public: "2026-10-21 (54021d832c)" },
    { id: "C10", fp: "9774fdedae3b", len: 12, nature: "password of a 16-char underscore username pair", files: "live-final-audit.ts", reach: "PUBLIC", first_public: "public commit history" },
    { id: "C7", fp: "46d0a91d1e48", len: 17, nature: "owner login password (360-audit era)", files: "audit-screens.mjs", reach: "LOCAL ONLY (main + fix) — never public", first_public: "—" },
    { id: "C8", fp: "8aa62d3b0a15", len: 21, nature: "evidence-bootstrap owner password (P0-5 blocker)", files: "mint-evidence-session.mjs (fix-only) + .evidence-password (main-only)", reach: "LOCAL ONLY — split across two branches", first_public: "—" },
    { id: "C9", fp: "ff9d8259a6e5", len: 43, nature: "session token (32B base64url, 24h TTL, DB-backed)", files: ".evidence-session-token (main-only)", reach: "LOCAL ONLY (main)", first_public: "—" },
  ],
  sensitive_files: [
    { path: "android/rahyar-release.keystore", blob: "a807354b1a9c17fa4e22df5ebc265f8006cf6f89", size: 4360, sha256: "d4b7169a21f8f113f7cf8104c0b5dd32a9d06f9aaa87dc263d1fc5b905b21898", tracked_on: "local main (d3dd564)", on_fix: false, on_origin: false },
    { path: ".evidence-password", blob: "16f4706e73f48494d5e3a0fdeab9e75259ab1e6d", size: 21, fp: "8aa62d3b0a15 (=C8)", tracked_on: "local main (87834e5)", on_fix: false, on_origin: false },
    { path: ".evidence-session-token", blob: "3b6bc8689e132af4e844931e401cab71dc9fd0ca", size: 43, fp: "ff9d8259a6e5 (=C9)", tracked_on: "local main (87834e5)", on_fix: false, on_origin: false },
  ],
  scans: {
    public: { refs: ["origin/main", "origin/feature/ambient-motion-polish", "v1.0.0-rc1", "v1.1.0", "v1.2.0"], blobs: 725, flagged: 98, dup_fps: 47, msg_findings: 0 },
    fixxfer: { refs: ["fix/corrective-mission-360"], blob_subtracted_public: true, blobs: 78, flagged: 12, dup_fps: 5, msg_findings: 0 },
    mainonly: { refs: ["main"], excluded: ["public", "fix"], blobs: 3, flagged: 0, msg_findings: 0 },
  },
  db_census: { db: "db/custom.db", mode: "read-only URI", users: 0, sessions: 0, unexpired_sessions: 0, at: "2026-10-30 16:39" },
  decision: "NO-GO",
};
fs.mkdirSync(OUT_DIR + "/../P0_6_evidence", { recursive: true });
fs.writeFileSync("/home/z/my-project/download/P0_6_evidence/p06_register.json", JSON.stringify(REGISTER, null, 1));

const pageHeader = () => new Header({
  children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    children: [r("رهیار AI — گزارش P0-6: چرخش اعتبارنامه‌ها و ارزیابی ریسک Remote (فقط-خواندنی، بدون افشای مقدار)", { size: 18, color: "808080" })],
  })],
});
const pageFooter = () => new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE")] })],
});

const body = [];

// ── ۱. چکیده ──
body.push(h1("۱. چکیدهٔ اجرایی"));
body.push(para("مأموریت P0-6 تکلیف تمام اعتبارنامه‌های توسعه‌ای شناسایی‌شده در تاریخچهٔ عمومی origin را مشخص می‌کند و تصمیم مستند دربارهٔ آمادگی انتشار شاخهٔ fix می‌گیرد. برای این کار سه اسکن کامل Blob-محور روی کل مخزن اجرا شد: تاریخچهٔ عمومی (۷۲۵ blob)، مجموعهٔ قابل‌انتقال fix (۷۸ blob) و اختصاصی‌های محلی main (۳ blob). نتیجهٔ خالص‌سازی دستی همهٔ ۱۱۳ نشانهٔ خام، ثبت ۱۰ مورد واقعی است: ۶ مقدار در تاریخچهٔ عمومی origin (C1 تا C6 و C10 — از این شش، C6 یک مقدار آزمون منفی و «اعتبارنامه» نیست)، ۳ مورد فقط محلی (C7، C8، C9) و هیچ فایل حساس باینری‌ای (کی‌استور یا فایل‌های .evidence-*) هرگز عمومی نشده است."));
body.push(para("دو یافتهٔ تعیین‌کننده: نخست — رمز ورود owner (C1) و رمز کی‌استور امضا (C3) هر دو در تاریخچهٔ عمومی GitHub هستند؛ خودِ فایل کی‌استور عمومی نیست، یعنی «رمز بدون کلید» در دسترس عموم است. دوم — مأموریت P0-5 (اصلاح Credential سخت‌کد‌شده در scripts/mint-evidence-session.mjs) هرگز اجرا نشده و گزارشی از آن در محیط موجود نیست؛ اسکن امروز نشان می‌دهد رمز ۲۱-کاراکتری (C8) هنوز داخل همان اسکریپت روی شاخهٔ fix است و نسخهٔ مقدار آن (.evidence-password) به‌صورت tracked روی main محلی قرار دارد. دیتابیس توسعهٔ فعلی (سرشماری فقط-خواندنی ساعت ۱۶:۳۹ امروز) صفر کاربر و صفر نشست دارد؛ اما طبق اصل مأموریت، «خالی بودن DB» دلیل بی‌اعتباری نیست — اسکریپت mint با اجرای دوباره، همان C8 را بازتسلیح می‌کند."));
body.push(para("تصمیم مستقل این گزارش برای درخواست مجوز Push: NO-GO. دو معیار چهارگانهٔ مأموریت هنوز برقرار نیست (تکلیف واقعی اعتبارنامه‌های عمومی چرخش نشده و تاریخچهٔ اختصاصی fix پاک نیست). هیچ عملیات ریموت، بازنویسی تاریخچه، حذف فایل یا تغییر main/fix در کل این مأموریت انجام نشده است؛ همهٔ عملیات فقط-خواندنی بود و تنها خروجی، ابزار اسکن (untracked) و همین گزارش است."));

// ── ۲. تثبیت وضعیت ──
body.push(h1("۲. تثبیت وضعیت مخزن (ابتدا و انتهای مأموریت)"));
body.push(para("وضعیت در لحظهٔ شروع و پایان یکسان بود و در طول مأموریت هیچ تغییر تغییردهنده‌ای روی مخزن اعمال نشد. مرجع‌های ریموت هم‌زمان با گزارش به‌صورت زنده (ls-remote فقط-خواندنی) استعلام شد و با مراجع محلی remote-tracking مو‌چون‌نبود (بدون رانش)."));
body.push(cap("جدول ۱ — وضعیت مراجع و شاخه‌ها (Full SHA)"));
body.push(tbl(["مورد", "مقدار", "منبع"], [
  ["مسیر مخزن", "/home/z/my-project — remote: github.com/aresmaeily2/HAMYAR-AI.git", "git remote -v"],
  ["HEAD هنگام کار", "main @ 4de08f7a0a4682c1a624d86ce73305365d3253a1", "git rev-parse HEAD"],
  ["fix/corrective-mission-360", "fc71e84fca87ca9dd07601d44961d2369154ac32", "git rev-parse"],
  ["origin/main (زنده)", "28b64bb0bc21e162703a59a01f6d828f8c2065d4", "git ls-remote — 2026-10-30"],
  ["origin/feature/ambient-motion-polish (زنده)", "f2cf171a782a04e19284bf026ca29bc9d007711d", "git ls-remote — 2026-10-30"],
  ["تگ‌های عمومی v1.0.0-rc1 / v1.1.0 / v1.2.0", "631dc471… / 4621c060… / ed9ec2d2… — هر سه در تاریخچهٔ origin/main", "ls-remote + merge-base"],
  ["فاصلهٔ main از origin/main", "۱۳ جلو / ۰ عقب", "rev-list --left-right --count"],
  ["فاصلهٔ fix از origin/main", "۱۷ جلو / ۰ عقب — مبنای مشترک همان 28b64bb", "rev-list + merge-base"],
  ["Working Tree", "پاک؛ تنها افزودنی‌ها ۶ اسکریپت ابزاری p06_* (untracked) و خروجی‌های download/ (gitignored — خط ۷۰)", "git status"],
  ["پشتیبان بازنویسی قدیمی", "refs/original/refs/heads/main @ d776ca8 (۲ کامیت) — فقط محلی", "git for-each-ref"],
], [26, 46, 28]));
body.push(para("نکتهٔ شفاف‌سازی دربارهٔ شواهد P0-4/P0-5: فایل‌های گزارش آن دو مأموریت در محیط حاضر موجود نیستند (پوشهٔ download در بازیافت محیط بازسازی شده است). بنابراین تمام شواهد لازم مستقیماً از خود مخزن بازتولید شد — اسکن‌های تازه، مقایسهٔ patch-id، سرشماری دیتابیس و استعلام زندهٔ ریموت. reflog نشان می‌دهد سه cherry-pick (46f8802، 70dd91c، fc71e84 روی fix) پیش از این مأموریت انجام شده بود؛ این مأموریت صحت محتوایی آن‌ها را در بخش ۹ مستقلاً راستی‌آزمایی کرد."));

// ── ۳. فهرست ماسک‌شده ──
body.push(h1("۳. فهرست ماسک‌شدهٔ اعتبارنامه‌ها"));
body.push(para("هر مقدار فقط با اثرانگشت SHA-256 (۱۲ نویسهٔ نخست) و طولش شناسایی می‌شود؛ هیچ مقدار خامی در این سند، در لاگ‌ها یا در فایل‌های شواهد نوشته نشده است. موارد تکراری با fp یکسان ادغام شدند — مهم‌ترین تکرار: مقدار رمز داخل اسکریپت mint روی fix (C8) دقیقاً همان محتوای فایل .evidence-password روی main است (تطبیق بایت‌به‌بایت اثرانگشت)."));
body.push(cap("جدول ۲ — ثبت اعتبارنامه‌های واقعی (۱۰ مورد)"));
body.push(tbl(["شناسه", "fp", "طول", "ماهیت", "فایل‌ها (نسخه‌ها)", "دامنهٔ انتشار"], [
  ["C1", "cec51518b9ac", "۱۱", "رمز ورود owner — دورهٔ شواهد v2.0/v2.1", "preview-setup.ts + ۱۳ اسکریپت capture (۱۴ blob)", "عمومی — origin/main و origin/feature"],
  ["C2", "ee0880daa2ca", "۱۵", "رمز ورود owner — نسل اول", "test-user-isolation.ts", "عمومی — شامل تگ v1.0.0-rc1"],
  ["C3", "f60ed56a9c82", "۷", "رمز store کی‌استور فعلی + رمز کلید با مقدار متعارف ابزار اندروید", "build-android-rebuild.sh، build-android-apk-v11.sh", "عمومی — شامل تگ v1.2.0"],
  ["C4", "dd65b755befe", "۱۰", "رمز store کی‌استور قدیمی + رمز کلید با الگوی نام+سال", "build-android-apk.sh", "عمومی"],
  ["C5", "8eb38003b10d", "۱۱", "رمز کاربر آزمونی («sarika»)", "live-v2-tests.cjs", "عمومی"],
  ["C6", "e20de4c418c6", "۱۲", "مقدار آزمون منفی (تست badLogin) — اعتبارنامهٔ قابل‌استفاده نیست", "live-v2-tests.cjs", "عمومی"],
  ["C10", "9774fdedae3b", "۱۲", "رمز یک جفت‌حساب با نام‌کاربری ۱۶کاراکتری", "live-final-audit.ts", "عمومی"],
  ["C7", "46d0a91d1e48", "۱۷", "رمز ورود owner — دورهٔ ممیزی ۳۶۰", "audit-screens.mjs", "فقط محلی (main + fix)"],
  ["C8", "8aa62d3b0a15", "۲۱", "رمز bootstrap شواهد — مسدودکنندهٔ P0-5", "mint-evidence-session.mjs (فقط fix) + .evidence-password (فقط main)", "فقط محلی — دو تکه در دو شاخه"],
  ["C9", "ff9d8259a6e5", "۴۳", "توکن نشست (۳۲بایت base64url، انقضای ۲۴ساعته، مقید به DB)", ".evidence-session-token (فقط main)", "فقط محلی (main)"],
], [8, 20, 7, 22, 23, 20]));
body.push(cap("جدول ۳ — فایل‌های حساس مسیر-محور (هرگز عمومی نشده‌اند)"));
body.push(tbl(["فایل", "blob", "اندازه", "وضعیت انتشار"], [
  ["android/rahyar-release.keystore", "a807354b", "۴۳۶۰B — SHA-256 فایل d4b7169a…b21898 (امروز مجدداً تأیید شد)", "tracked روی main محلی (d3dd564)؛ غایب از fix و از همهٔ مراجع origin"],
  [".evidence-password", "16f4706e", "۲۱B", "tracked روی main محلی (87834e5)؛ محتوای آن = C8"],
  [".evidence-session-token", "3b6bc868", "۴۳B", "tracked روی main محلی (87834e5)؛ محتوای آن = C9"],
], [24, 14, 32, 30]));
body.push(para("فایل‌های نام‌مشکوک دیگر در تاریخچهٔ عمومی (.env.example، src/app/api/auth/password/route.ts، src/styles/tokens.css) پس از بازبینی ماسک‌شده بی‌خطر تشخیص داده شدند: .env.example فقط الگوی تنظیمات با مقادیر پیش‌فرض بی‌اعتبارنامه است و فایل‌های دیگر کد محصول‌اند. فایل توکن آپلود (upload/HAMYAR TOKEN.txt) که اسکریپت‌های انتشار آن را در زمان اجرا می‌خواندند، هرگز commit نشده (پوشهٔ upload از ابتدا gitignored است و هیچ blob با آن نام در کل تاریخچه وجود ندارد)."));

// ── ۴. وضعیت اعتبار ──
body.push(h1("۴. بررسی اعتبار هر مورد (بدون چاپ مقدار و بدون آزمون مخرب)"));
body.push(para("سرشماری فقط-خواندنی دیتابیس توسعه (db/custom.db — حالت URI فقط-خواندنی) در ۲۰۲۶-۱۰-۳۰ ساعت ۱۶:۳۹: صفر کاربر، صفر نشست، صفر نشست منقضی‌نشده. یعنی در همین محیط هیچ حسابی وجود ندارد که هیچ‌کدام از رمزهای ثبت‌شده برایش معتبر باشد. طبق مأموریت، این به‌تنهایی دلالت بر بی‌اعتباری ندارد و برای هیچ موردی آزمون ورود یا درخواست شبکه‌ای انجام نشد؛ در نتیجه موارد مربوط به احتمال استقرار بیرونی با برچسب UNKNOWN ثبت می‌شوند."));
body.push(cap("جدول ۴ — وضعیت، سرویس و مصرف‌کنندهٔ هر اعتبارنامه"));
body.push(tbl(["شناسه", "سرویس / محیط", "مصرف‌کننده", "وضعیت"], [
  ["C1", "احراز هویت خود اپ (/api/auth/login — scrypt در src/lib/auth.ts)", "۱۴ اسکریپت شواهد با username: 'owner'", "UNKNOWN — مقابل DB فعلی بی‌اثر (۰ کاربر)؛ برای هر استقرار بیرونیِ ناشناختهٔ دورهٔ v2.0/v2.1 نامعلوم؛ محتمل‌ترین رمز فعال دورهٔ اخیر"],
  ["C2", "همان سرویس — نسل اول", "test-user-isolation.ts", "UNKNOWN-کهنه — به‌احتمال قوی جای خود را به نسل‌های بعد داده؛ چون عمومی است، بدون‌توجه به وضعیت باید مُرده فرض و پاک‌سازی شود"],
  ["C3", "امضای APK — android/rahyar-release.keystore (فایل فقط محلی)", "اسکریپت‌های build اندروید", "ACTIVE-LOCAL — فایل کلید موجود و سالم (هش امروز تأیید شد)؛ رمز آن عمومی است؛ چرخش store/key-pass نیازمند مجوز مالک است"],
  ["C4", "کی‌استور قدیمی — بنا بر android/README.md همراه با reset محیط از بین رفته", "اسکریپت build قدیمی", "MOOT — مادهٔ کلید دیگر وجود ندارد؛ جفت‌رمز بی‌اثر است؛ فقط پاک‌سازی تاریخی معنا دارد"],
  ["C5", "اپ توسعه — حساب آزمونی", "live-v2-tests.cjs", "UNKNOWN-LOW — حساب در DB فعلی وجود ندارد؛ اثر عملی ناچیز"],
  ["C6", "اپ توسعه — آزمون منفی", "live-v2-tests.cjs", "NON-CREDENTIAL — عمداً نادرست؛ فقط یک رشتهٔ آزمون است"],
  ["C10", "اپ (/api/auth/login) با BASE قابل‌تنظیم — دورهٔ راستی‌آزمایی زندهٔ v2", "live-final-audit.ts", "UNKNOWN — احتمال اشاره به استقرار زندهٔ آن دوره؛ بدون آزمون شبکه‌ای نامعلوم"],
  ["C7", "احراز هویت خود اپ", "audit-screens.mjs (عکس‌برداری ممیزی ۳۶۰)", "UNKNOWN — جدیدتر از C2 و قدیمی‌تر از C8؛ فقط محلی"],
  ["C8", "bootstrap شواهد — ساخت owner در DB خالی با hashPassword خود اپ", "mint-evidence-session.mjs", "RE-ARMABLE — الان بی‌اثر (۰ کاربر) اما اجرای دوبارهٔ اسکریپت همان رمز را بازمی‌سازد؛ مسدودکنندهٔ P0-5"],
  ["C9", "نشست اپ — مقید به رکورد Session و TTL ۲۴ساعته", "فایل ۰۶۰۰ کنار شواهد", "DEAD — هم منقضی (ضبط ۱۰-۲۹) و هم رکوردش در DB فعلی وجود ندارد؛ به‌علاوه resolveUser فعلی طول زیر ۲۰ کاراکتر را رد می‌کند و طرح نشست جدید ۳۲بایتی است"],
], [9, 23, 22, 46]));
body.push(para("جمع‌بندی وضعیت: هیچ موردی قابل‌ثبات «باطل‌شده» نیست (چون هیچ چرخشی هنوز انجام نشده)، هیچ موردی هم «فعالِ اثبات‌شده» نیست به‌جز C3 که فعال‌بودن خودِ فایل کلید برایش قطعی است. بقیه UNKNOWN‌اند و طبق معیار مأموریت، UNKNOWN بدون برنامهٔ کاهش ریسک، مانع GO است — برنامه‌ها در بخش ۸ و ۱۰ آمده‌اند."));

// ── ۵. اقدامات و شواهد ──
body.push(h1("۵. اقدامات انجام‌شده و شواهد آن‌ها"));
body.push(para("اقدام اول — سه اسکن Blob-محور (ابزار: scripts/p06_scan.py): نکتهٔ مهندسی مهم این است کهgit rev-list --not فقط کامیت‌ها را هرس می‌کند و blobهای هم‌محتوا را که از مسیر کامیت‌های دیگر می‌آیند حذف نمی‌کند؛ برای همین تفریق به‌صورت «سطح-blob» بازنویسی شد (مجموعهٔ blob هر مرجع محاسبه و سپس کم شد). اسکن عمومی: ۷۲۵ blob از ۵ مرجع عمومی، ۹۸ blob پرچم‌شده، ۴۷ fp تکراری، صفر یافته در پیام‌های کامیت. اسکن fix: ۷۸ blob (پس از تفریق عمومی)، ۱۲ پرچم، ۵ fp تکراری. اسکن main-اختصاصی: دقیقاً ۳ blob — همان سه فایل حساس جدول ۳؛ هیچ محتوای اضافه‌تر."));
body.push(para("اقدام دوم — پروب ماسک‌شده (scripts/p06_probe.py): برای هر نشانه، شکل مقدار (ترکیب کلاس کاراکترها، آنتروپی، توالی کلاس‌ها) و اسکلت نقطه‌گذاری خط محاسبه شد؛ این روش بدون افشای مقدار، مثبت‌های کاذب را قطعی می‌کند. نمونه‌های حکم: رشتهٔ ۲۸-کاراکتری LoginActivity.java در واقع عبارت passEt.getText().toString(); است (توالی کلاس‌ها و اسکلت خط آن را قطعی کرد) — یعنی اپ اندروید رمز پیش‌فرض ندارد؛ رشتهٔ ۳۸-کاراکتری auth.ts عبارت req.headers.get(…)?.value است؛ توکن ۱۵-کاراکتری اسکریپت‌های ambient در واقع process.argv[2] است (توکن از آرگومان خط فرمان می‌آید، نه تعبیه‌شده)؛ رشتهٔ ۱۰-کاراکتری داخل URL پوش RAHYAR_RELEASE.md الگوی ?A4?A3? دارد — یعنی جانگهدار <YOUR-PAT> است نه توکن واقعی."));
body.push(cap("جدول ۵ — رده‌های مثبت کاذب با دلیل بازتولیدپذیر (۴۷ fp تکراری + موارد منفرد)"));
body.push(tbl(["رده", "نمونه‌ها", "دلیل فنی حکم"], [
  ["هش‌های SHA-256 مستندات", "جدول‌های هش APK در docs/DELIVERY_V2/*، gen-apk-delivery-report.js، report-body-v22/v23.js، هش‌های integrity در bun.lock، هش Gradle/JDK در android/README.md", "مقادیر در متن صراحتاً «SHA-256» نام‌گذاری شده‌اند؛ الگوی hex نزدیک کلیدواژهٔ متنی است — هش عمومی است و راز نیست"],
  ["امضای تایپ و متغیر", "password: string، pass: boolean، token: string;، password || ''، password: PASS", "اسکلت خط نشان می‌دهد مقدار پس از = یا : یک شناسه/نوع است نه رشتهٔ literal"],
  ["فراخوان‌های کد", "crypto.randomBytes(32).toString(، req.headers.get(…)?.value، process.argv[2]، passEt.getText().toString();", "توالی کلاس‌ها + اسکلت نقطه‌گذاری، ساختار فراخوان را نشان می‌دهد"],
  ["شمارنده‌های شل", "PASS=$((PASS+1)) در verify-public-links.sh و stage-web-*.sh", "متغیر حسابداری خروجی تست است، نه رمز"],
  ["خواندن توکن از فایل", "TOKEN=$(tr -d … < upload/HAMYAR TOKEN.txt) در stage-gh-release.sh و publish-*.py", "توکن از فایل untracked خوانده می‌شود؛ خود فایل هرگز commit نشده"],
  ["جانگهدارها", "<YOUR-PAT> در RAHYAR_RELEASE.md، مقادیر ENV_REF مانند process.env.X", "الگوی کلاس-کاراکتر و ساختار جانگهدار"],
], [20, 40, 40]));
body.push(para("اقدام سوم — پیوند مقادیر (scripts/p06_fplinks.py): محتوای .evidence-password (blob 16f4706e) اثرانگشت C8 را داد — پیوند دوشاخه‌ای اصلی؛ محتوای .evidence-session-token (blob 3b6bc868) اثرانگشت جدید ff9d8259a6e5 = C9 و با توکن‌های دیگر برابر نیست. اقدام چهارم — سرشماری DB (فقط-خواندنی، جدول ۴). اقدام پنجم — استعلام زندهٔ ls-remote و راستی‌آزمایی هش کی‌استور. هیچ درخواست آزمایشی به هیچ سرویس بیرونی ارسال نشد و هیچ ورود غیرمجازی انجام نشده است."));

// ── ۶. وضعیت واقعی تاریخچهٔ عمومی ──
body.push(h1("۶. وضعیت واقعی تاریخچهٔ عمومی origin"));
body.push(para("تاریخچهٔ عمومی = origin/main (۷۹ کامیت) + origin/feature/ambient-motion-polish (۶۶ کامیت) + سه تگ انتشار که هر سه در تاریخچهٔ origin/main قرار دارند. اسکن ۷۲۵ blob این مجموعه پس از خالص‌سازی، شش مقدار واقعی (C1، C2، C3، C4، C5، C10) به‌علاوهٔ C6 (غیر-اعتبارنامه) را نشان می‌دهد. مقایسه با مأموریت P0-5: سه blob حساس (کی‌استور و دو فایل .evidence-*) و اسکریپت mint هرگز به origin نرسیده‌اند و امروز هم reachable نیستند — این حکم با تفریق سطح-blob روی هر ده مرجع مخزن (شامل refs/original و تگ‌ها) دوباره اثبات شد."));
body.push(cap("جدول ۶ — آنچه عمومی است و آنچه نیست"));
body.push(tbl(["چیز", "عمومی؟", "توضیح"], [
  ["رمز owner (C1، C2) و جفت‌حساب (C10) و رمز کاربر آزمونی (C5)", "بله — از ۲۰۲۶-۱۰-۱۸/۲۳", "داخل اسکریپت‌های شواهد و تست در تاریخچهٔ origin/main و origin/feature"],
  ["رمزهای کی‌استور (C3 فعلی + C4 قدیمی) به‌همراه مقدار متعارف رمز کلید", "بله — از ۲۰۲۶-۱۰-۱۹/۲۰", "داخل اسکریپت‌های build اندروید"],
  ["فایل باینری کی‌استور", "خیر", "blob a807354b فقط روی main محلی؛ از هیچ مرجع ریموت قابل دستیابی نیست"],
  ["C7 (رمز ممیزی ۳۶۰) و C8 (رمز mint) و C9 (توکن نشست)", "خیر", "فقط محلی؛ C8 دو تکه: اسکریپت روی fix و فایل مقدار روی main"],
  ["مستندات حساس (KEYSTORE_SECURITY.md) و .evidence-*", "خیر", "همه فقط محلی"],
  ["جانگهدار <YOUR-PAT> در RAHYAR_RELEASE.md", "بله — بی‌خطر", "مقدار واقعی توکن هرگز در تاریخچه نبوده"],
], [34, 14, 52]));

// ── ۷. ریسک‌های باقی‌مانده ──
body.push(h1("۷. ریسک‌های باقی‌مانده"));
body.push(cap("جدول ۷ — ریزریسک‌های فعال پس از این ارزیابی"));
body.push(tbl(["ریسک", "شرط فعال‌شدن", "شدت", "کاهش"], [
  ["R1 — رمزهای owner عمومی (C1/C2/C10)", "وجود هر استقرار زنده با همان حساب‌ها؛ یا بازتسلیح محلی با اسکریپت‌های قدیمی", "بالا", "چرخش رمز در هر استقرار زنده + پاک‌سازی تاریخی پیش از هر عمومی‌سازی جدید"],
  ["R2 — رمز کی‌استور عمومی (C3) + فایل کلید تک‌نسخه‌ای", "هرگونه افشای آیندهٔ فایل کلید (سابقه: فایل یک بار از .gitignore قدیمی فرار کرده بود) → جعل به‌روزرسانی امضاشده", "بحرانی-مشروط", "چرخش store/key-pass با keytool پس از پشتیبان‌گیری؛ سپس پاک‌سازی اسکریپت‌ها؛ نگهداری کلید خارج از مخزن"],
  ["R3 — fix آمادهٔ انتشار شامل C7 و C8 است", "هر push از fix → افشای فوری دو رمز دیگر در عموم", "بالا", "اجرای P0-5 و پاک‌سازی تاریخچهٔ fix پیش از هر push"],
  ["R4 — اسکریپت mint بازتسلیح‌پذیر", "اجرای دوباره → ساخت owner با همان C8 و نوشتن دوبارهٔ .evidence-*", "متوسط", "اصلاح env-محور P0-5 + افزودن الگوها به .gitignore (روی fix انجام شده، روی main نه)"],
  ["R5 — تک‌نسخه‌بودن کی‌استور", "بازیافت محیط (پیش‌تر یک بار رخ داد: گاوصندوق /home/z/keystore-vault از بین رفت)", "بحرانی", "پشتیبان رمزشدهٔ خارج از مخزن — مقدم بر هر چرخش؛ طبق pre-P0 هنوز بلاتکلیف"],
  ["R6 — ماندگاری مقادیر در اکوسیستم گیت‌هاب", "فورک/کلون دیگران یا کش گیت‌هاب حتی پس از بازنویسی هم مقادیر را نگه می‌دارد", "متوسط", "هماهنگی با مصرف‌کنندگان + چرخش (تنها راه قطعی، بی‌اعتبار ساختن مقدار است)"],
], [30, 34, 12, 24]));

// ── ۸. سه سناریو ──
body.push(h1("۸. تحلیل سه سناریوی پاک‌سازی Remote (بدون اجرا)"));
body.push(cap("جدول ۸ — مقایسهٔ سناریوها"));
body.push(tbl(["سناریو", "مزایا", "ریسک‌ها و هزینه‌ها", "پیش‌نیازها"], [
  ["۱ — فقط بی‌اعتبارسازی؛ حفظ تاریخچهٔ عمومی", "بدون force-push و بدون به‌هم‌ریختن SHAها؛ سریع‌ترین کاهش ریسک واقعی؛ سازگار با مصرف‌کنندگان فعلی", "مقادیر قدیمی در تاریخچه می‌مانند (اما مرده)؛ تاریخچه همچنان ساختار رمزها را نشان می‌دهد", "مجوز مالک برای چرخش: رمز حساب‌های زندهٔ هر استقرار، store/key-pass کی‌استور با keytool، حذف حساب آزمونی؛ سپس P0-5 برای fix"],
  ["۲ — بازنویسی تاریخچهٔ Remote با برنامهٔ مهاجرت", "حذف فیزیکی مقادیر از تاریخچهٔ عمومی و تگ‌ها؛ تمیزترین وضعیت برای عمومی‌سازی کامل", "نیاز به force-push همهٔ شاخه‌ها و تگ‌ها؛ هماهنگی با هر کلون/فورک (تضمین کامل نمی‌دهد — کش و فورک می‌مانند)؛ شکستن ارجاع SHAها در اسناد و گزارش‌های قبلی؛ اجرای آن از عهدهٔ این محیط خارج است", "تصمیم مالک + فرصت هماهنگی مصرف‌کنندگان + runbook مستند (اسکریپت git-history-purge.sh موجود است) + پشتیبان کامل"],
  ["۳ — نگهداری تاریخچه با محدودسازی دسترسی مخزن", "سریع‌ترین مهار؛ تاریخچه و تگ‌ها دست‌نخورده", "اگر هدف نهایی مخزن عمومی است، مشکل فقط به تعویق می‌افتد؛ تصمیم دسترسی خارج از اختیار این محیط است", "تصمیم مالک دربارهٔ عمومی/خصوصی ماندن HAMYAR-AI"],
], [20, 26, 32, 22]));
body.push(para("توصیهٔ این گزارش: اجرای فوری سناریو ۱ (چرخش‌ها + P0-5) به‌عنوان مسیر اصلی؛ سناریو ۲ فقط اگر مالک قصد عمومی‌سازی کامل مخزن را دارد و پیش از آن انجام شود؛ سناریو ۳ به‌عنوان سپر موقت در فاصلهٔ تصمیم. هیچ‌کدام از سه سناریو در این مأموریت اجرا نشده است."));

// ── ۹. وضعیت نهایی main و fix ──
body.push(h1("۹. کنترل شاخهٔ fix و وضعیت نهایی دو شاخه"));
body.push(para("شاخهٔ fix با ۱۷ کامیت جلوتر از origin/main و بدون عقب‌ماندگی، مستقیماً از سر origin/main منشعب شده است. صحت محتوای سه cherry-pick بازبینی شد: فایل‌های هر سه کامیت در سطح blob با نسخه‌های main یکسان‌اند (اثرانگشت‌های 9d479194… و 91caaa19…). در مقایسهٔ patch-id دو جفت دقیقاً یکسان و جفتِ 6148d86 و 46f8802 متفاوت است؛ علت مستند شد: کتابخانهٔ گزارش از قبل در کامیت 37714bf روی fix وجود داشته و زمینهٔ diff را عوض کرده است. برابری محتوا در سطح blob حکم نهایی است."));
body.push(para("دو کامیت حساس (d3dd564 برای کی‌استور و 87834e5 برای فایل‌های شواهد) همچنان در تاریخچهٔ قابل‌انتقال fix غایب‌اند و شیءهای آن‌ها از fix قابل دستیابی نیست."));
body.push(cap("جدول ۹ — تفاوت درختی main و fix (۱۵ مسیر) و حکم هر گروه"));
body.push(tbl(["گروه", "مسیرها", "حکم"], [
  ["فقط main — حساس", ".evidence-password، .evidence-session-token، android/rahyar-release.keystore", "عمداً در fix نیستند — درست؛ تکلیف نهایی: خروج از index با مجوز مالک"],
  ["فقط fix — ابزار و مستند شواهد", "docs/KEYSTORE_SECURITY.md، scripts/capture-corrective-360.cjs، scripts/gen-corrective-report.js، scripts/mint-evidence-session.mjs، .gitignore (+۱۱ خط الگوی *.keystore/*.jks/*.p12)", "ارزشمند برای انتشار؛ اما mint هنوز C8 را دارد — مسدودکننده"],
  ["فقط fix — کد کارِ واقعی", "src/app/login/page.tsx، ambient-scene.tsx، app-shell.tsx، theme-toggle.tsx، src/lib/persian-date.ts، src/styles/motion.css، tests/unit/persian-date.test.ts", "اصلاحات بصری/تایم‌زون/آزمون fix — پاک از نظر اسکن"],
  ["فقط main — گزارش‌سازها", "corrective-report-lib.js، gen-merger-report.js، gen-unified-plan.js، fix_toc_cache.py، gen-pre-p0-report.js", "روی fix با cherry-pick معادل blob-یکسان دارند — بدون تفاوت محتوا"],
], [18, 56, 26]));
body.push(para("حکم اعتبار P0-5: نامعتبر/اجرا‌نشده. اسکن امروز نشان می‌دهد scripts/mint-evidence-session.mjs روی fix همچنان const PASSWORD با مقدار ۲۱-کاراکتری C8 دارد؛ اصلاح env-محور، تست‌های پنج‌گانه و گزارش P0-5 در محیط موجود نیست. بنابراین «بازنویسی P0-5» که مأموریت P0-6 به آن ارجاع می‌دهد وجود خارجی ندارد و تاریخچهٔ اختصاصی fix (مجموعهٔ قابل‌انتقال ۷۸ blob) دو اعتبارنامهٔ واقعی (C7 در audit-screens.mjs و C8 در mint) را در خود حمل می‌کند. نکتهٔ مثبت: پیام کامیت 703c0f8 صادقانه این وضعیت را پیش‌بینی کرده بود («credential فقط توسعه‌ای شواهد، بدون secret تولیدی») و .gitignore سخت‌شدهٔ fix جلوی بازگشت فایل‌های کلید را می‌گیرد — اما هیچ‌کدام جای حذف مقدار از اسکریپت را نمی‌گیرد."));

// ── ۱۰. تصمیم ──
body.push(h1("۱۰. تصمیم مستقل دربارهٔ آمادگی Push"));
body.push(cap("جدول ۱۰ — سنجش معیارهای GO مأموریت P0-6"));
body.push(tbl(["معیار", "حکم", "مبنا"], [
  ["تمام اعتبارنامه‌های افشاشده تکلیف‌شده باشند", "رد", "هیچ چرخش/ابطالی اجرا نشده (خارج از اختیار این محیط و نیازمند مجوز مالک)؛ C1/C2/C3/C5/C10 عمومی و بدون تکلیف اجرایی‌اند؛ C4 بی‌اثر و C6 غیر-اعتبارنامه"],
  ["هیچ فعال/نامشخصی بدون برنامهٔ کاهش ریسک نمانده باشد", "نیمه", "برنامهٔ کاهش برای همه در بخش ۸ و جدول ۴ ثبت شد؛ اما اجرای آن‌ها پیش‌شرط است"],
  ["تاریخچهٔ اختصاصی fix پاک باشد", "رد", "C7 و C8 در مجموعهٔ قابل‌انتقال fix زنده‌اند؛ P0-5 اجرا نشده"],
  ["ریسک ماندن مقادیر قدیمی در Remote صریحاً ارزیابی شده باشد", "قبول", "سه سناریو با مزایا/ریسک‌ها/پیش‌نیازها در بخش ۸ تحلیل شد"],
], [34, 10, 56]));
body.push(para("تصمیم: NO-GO برای طرح درخواست مجوز Push در وضعیت فعلی. این تصمیم فقط دربارهٔ انتشار است؛ دربارهٔ خود مخزن هیچ اقدامی لازم‌الفوری نیست زیرا وضعیت امروز هیچ بدترشدنی نسبت به دیروز نداشته و هیچ عملیات ریموتی انجام نشده است. مسیر شرطی به GO به‌ترتیب: (۱) مجوز و اجرای چرخش‌های بخش ۸ توسط مالک — رمز حساب‌های زندهٔ هر استقرار، store/key-pass کی‌استور پس از تهیهٔ پشتیبان تازه، و حذف حساب آزمونی؛ (۲) مجوز و اجرای P0-5 — اصلاح env-محور mint، حذف مقدار از تاریخچهٔ fix (سخت‌گیری یا بازنویسی محلی طبق runbook) و تکلیف سه فایل حساس main؛ (۳) اسکن مجدد سطح-blob با صفر یافتهٔ واقعی روی مجموعهٔ قابل‌انتقال fix؛ (۴) آن‌گاه درخواست مجوز Push فقط برای شاخهٔ fix (بدون تغییر main). تا آن زمان هرگونه push یعنی افشای عمومی فوری دو رمز دیگر و این گزارش صریحاً علیه آن توصیه می‌کند."));

// ── پیوست ──
body.push(h1("پیوست الف — دستورهای بازتولید شواهد"));
body.push(para("وضعیت: git rev-parse HEAD و git for-each-ref و git rev-list --left-right --count main...fix/corrective-mission-360 و git ls-remote origin. اسکن سه‌گانه: python3 scripts/p06_scan.py --name public|fixxfer|mainonly با تعریف مراجع و تفریق سطح-blob (خروجی: download/P0_6_evidence/scan_*.json). خالص‌سازی و شکل‌سنجی: scripts/p06_digest.py و scripts/p06_probe.py (--fps/--view/--line) — همهٔ خروجی‌ها ماسک‌شده با fp=SHA-256[:12]. پیوند مقادیر: scripts/p06_fplinks.py. سرشماری DB: scripts/p06_db_census.py (حالت URI فقط-خواندنی). برابری cherry-pickها: مقایسهٔ git rev-parse <commit>:<path> برای blobها و git show | git patch-id --stable. هش کی‌استور: sha256sum android/rahyar-release.keystore. غیاب فایل توکن آپلود در تاریخچه: git rev-list --all --objects جستجوی نام. هیچ مقدار خامی در هیچ خروجی چاپ نشده است."));
body.push(h1("پیوست ب — شواهد همراه و SHA256SUMS"));
body.push(para("همراه این سند، فایل‌های شواهد ماسک‌شده در download/P0_6_evidence (سه JSON اسکن + p06_register.json) و فایل SHA256SUMS برای کل بستهٔ گزارش و شواهد تولید شده است. تصمیم نهایی این گزارش NO-GO است و تا مجوز صریح مالک، هیچ عملیات ریموت، push، بازنویسی یا حذفی انجام نخواهد شد."));

// ── سند ──
const MS = process.env.P06_MAX_SECTION; // bisection helper: keep only first N body blocks
const finalBody = MS ? body.slice(0, parseInt(MS, 10)) : body;
if (MS) console.log("BISECT: keeping first", finalBody.length, "of", body.length, "blocks");

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
        title: "چرخش اعتبارنامه‌ها و ریسک Remote",
        subtitle: "تکلیف کامل اعتبارنامه‌های افشاشده و تصمیم انتشار شاخهٔ fix",
        englishLabel: "RAHYAR P0-6 REPORT",
        metaLines: [
          "RAHYAR_P0_6_CREDENTIAL_ROTATION_AND_REMOTE_RISK_REPORT",
          "main @ 4de08f7 · fix @ fc71e84 · origin/main @ 28b64bb",
          "۶ مقدار واقعی در تاریخچهٔ عمومی origin — فایل کی‌استور هرگز عمومی نشد",
          "P0-5 اجرا نشده — fix هنوز دو رمز محلی (C7 و C8) حمل می‌کند",
          "تصمیم مستقل: NO-GO برای درخواست مجوز Push",
        ],
        footerRight: "رهیار AI",
        footerLeft: "گزارش P0-6 — محرمانه",
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
      children: finalBody,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("DOCX written:", OUT, (buf.length / 1024).toFixed(0) + "KB");
});
