// ─── RAHYAR_P0_PRE_PUSH_INDEPENDENT_VERIFICATION_REPORT — سند فارسی RTL ───
// P0-4: ممیزی مستقل محلی پیش از Push — بدون هیچ عملیات ریموت
const {
  Document, Packer, Paragraph, TextRun, TableOfContents, SectionType,
  NumberFormat, AlignmentType, BorderStyle, Header, Footer, SimpleField,
  r, para, h1, h2, tbl, cap, P, FA, buildCoverR1,
} = require("./corrective-report-lib.js");
const fs = require("fs");
const crypto = require("crypto");

const OUT = "/home/z/my-project/download/RAHYAR_P0_PRE_PUSH_INDEPENDENT_VERIFICATION_REPORT.docx";
const EV = "/home/z/my-project/download/RAHYAR_P0_PRE_PUSH_EVIDENCE";

// ── داده‌های پویا: هش شواهد و آمار گارد ──
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const guardLines = fs.readFileSync(EV + "/00-head-guard.log", "utf-8").trim().split("\n");
const guardCount = guardLines.length;
const guardHeads = [...new Set(guardLines.map((l) => (l.match(/head=([0-9a-f]{40})/) || [])[1]))];
if (guardHeads.length !== 1) throw new Error("HEAD changed during run — abort report: " + guardHeads);
const EV_FILES = [
  "00-head-guard.log", "BASELINE_HEAD.txt", "01-git-state.txt",
  "02-security-scan-fix.json", "02-security-scan-fix-summary.txt",
  "02b-security-classification.json", "02b-security-classification.txt",
  "03-keystore-vault.log", "04-fix-vs-main-audit.txt",
  "05-typecheck.txt", "06-lint.txt", "07-test-suite.txt",
  "08-timezone-matrix.txt", "09-security-db.txt", "09b-runtime-build-test.txt", "10-build.txt",
];
const evHashes = EV_FILES.map((f) => [f, sha256(EV + "/" + f)]);
const encHash = "e7f0be729541ec0da5d755b52f130ca03a66c064e5285eaa178c43f0c2eb4b61";

const pageHeader = () => new Header({
  children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    children: [r("رهیار AI — گزارش راستی‌آزمایی مستقل پیش از Push (P0-4) — فقط شواهد محلی، بدون هیچ عملیات ریموت", { size: 18, color: "808080" })],
  })],
});
const pageFooter = () => new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE")] })],
});

const body = [];

// ═══ ۱. خلاصه اجرایی ═══
body.push(h1("۱. خلاصهٔ اجرایی"));
body.push(para("این گزارش نتیجهٔ ممیزی مستقل و کاملاً محلیِ آمادگی شاخهٔ fix/corrective-mission-360 برای Push است که در تاریخ ۹ آبان ۱۴۰۵ (۳۰ اکتبر ۲۰۲۶) اجرا شد. مجوز صادرشده فقط «راستی‌آزمایی محلی» بود و در کل این اجرا هیچ push، Pull Request، merge، force push، تغییر origin/main، بازنویسی تاریخچه، حذف فایل کی‌استور یا تغییر محتوای main انجام نشده است — برتری مبنا (origin/main @ 28b64bb) در پایان کار دقیقاً همان مقدار ابتدای کار است و هیچ مرجع ریموت جدیدی برای fix ساخته نشده است. برای مقابله با سابقهٔ بازگردانی خودکار HEAD بین فراخوانی‌ها، همهٔ " + guardCount + " عملیاتِ این ممیزی با گارد HEAD محاصره شد و لاگ شواهد نشان می‌دهد HEAD در تمام طول اجرا بدون تغییر مانده است."));
body.push(para("نتیجه در یک نگاه: ساختار شاخه‌ها سالم است (main با ۱۳ کامیت و fix با ۱۷ کامیت جلوتر از مبنا؛ مبنای مشترک 28b64bb)؛ دوازده جفت کامیت متناظر main و fix مقایسه شد که یازده جفت patch-id کاملاً یکسان دارند و جفت دوازدهم نیز تفاوت patch-id آن کاملاً توضیح‌داده‌شده است (بخش ۷) و محتوای نهایی فایل‌ها بایت‌به‌بایت یکسان است. هر سه blob حساس شناخته‌شده (کی‌استور release و دو فایل .evidence-*) از هیچ نقطه‌ای از تاریخچهٔ fix قابل‌دسترس نیستند. کنترل کیفیت روی fix در یک worktree ایزوله همه‌سبز بود: ۲۱۸ آزمون واحد پاس، ماتریس چهار تایم‌زون پاس، ۴۱ آزمون امنیتی صریح پاس، typecheck و lint بدون خطا و build تولیدی موفق. گاوصندوق کی‌استور که در بازیافت محیط برای بار دوم از بین رفته بود، طبق پروتکل تأییدشدهٔ P0-1 بازسازی شد و آزمون بازیابی با تطابق بیت‌به‌بیت PASS شد."));
body.push(para("اما یک مورد، شرط توقف مأموریت را فعال می‌کند: اسکن کامل تاریخچهٔ fix نشان داد اسکریپت scripts/mint-evidence-session.mjs (آمده از کامیت اصلاحی 703c0f8) مقدار اعتبارنامهٔ جلسهٔ شواهد را به‌صورت هاردکد در خود دارد — همان مقداری که در main به‌صورت فایل .evidence-password شناخته می‌شود و blob آن هرگز به origin نرسیده است. این مقدار امروز از کار افتاده است (پایگاه‌دادهٔ توسعه: صفر کاربر، صفر نشست — بازآزمایی امروز) و در هیچ کد محصولی یا فایل env استفاده نمی‌شود؛ با این حال چون «هرگونه secret در fix» طبق دستور مالک، مسدودکنندهٔ بی‌قید‌وشرط است و این blob از قبل روی origin عمومی نیست، تصمیم نهایی NO-GO مشروط است: با یک اصلاح تک‌کامیتی (خواندن از env به‌جای مقدار ثابت) و اجرای مجدد همین اسکن، انتظار می‌رود موانع برداشته شود و GO محلی صادر گردد. Push و ایجاد PR در هر صورت مستلزم مجوز جداگانهٔ مالک است."));

// ═══ ۲. وضعیت شاخه‌ها ═══
body.push(h1("۲. وضعیت واقعی شاخه‌ها (ثبت مستقل، بدون اتکا به وضعیت قبلی)"));
body.push(para("همهٔ داده‌های این بخش با اجرای تازه و فقط-خواندنیِ دستورهای گیت در همین ممیزی به‌دست آمده است. به‌دلیل سابقهٔ بازگردانی خودکار HEAD، پیش و پس از هر عملیات مهم، شاخه و SHA دوباره خوانده شد؛ " + guardCount + " رکورد گارد در فایل شواهد ثبت شده و همه با یک HEAD یکسان‌اند (مقایسهٔ خودکار در اسکریپت‌ها انجام می‌شد و در صورت مغایرت، اجرا متوقف می‌شد — هیچ توقفی رخ نداد)."));
body.push(cap("جدول ۱ — وضعیت ثبت‌شدهٔ مخزن در لحظهٔ ممیزی"));
body.push(tbl(["بند", "مقدار ثبت‌شده"], [
  ["مسیر واقعی مخزن", "/home/z/my-project (git dir: /home/z/my-project/.git)"],
  ["شاخهٔ فعال / HEAD", "main @ 4de08f7a0a4682c1a624d86ce73305365d3253a1"],
  ["SHA کامل main", "4de08f7a0a4682c1a624d86ce73305365d3253a1"],
  ["SHA کامل fix", "fc71e84fca87ca9dd07601d44961d2369154ac32 (fix/corrective-mission-360)"],
  ["origin/main (مرجع ردیابی، بدون fetch)", "28b64bb0bc21e162703a59a01f6d828f8c2065d4"],
  ["upstream", "main: بدون upstream؛ fix: origin/main [ahead 17] — فقط ردیابی، هیچ پوشی رخ نداده"],
  ["جلو/عقب نسبت به مبنا", "main: ۱۳ جلو / ۰ عقب؛ fix: ۱۷ جلو / ۰ عقب؛ merge-base مشترک: 28b64bb"],
  ["درخت کاری", "تمیز — تنها شش اسکریپت untrackedِ خودِ این ممیزی در scripts/"],
  ["stash / worktree اضافی", "stash: خالی؛ worktree آزمون /home/z/p04-fix-wt در پایان ممیزی به‌طور کامل حذف شد"],
  ["ریموت", "origin = https://github.com/aresmaeily2/HAMYAR-AI.git (بدون اعتبارنامه در URL)"],
  ["گارد HEAD", "۱۵ رکورد در ابتدای گزارش‌گیری + رکوردهای محاصره‌ای؛ همه با HEAD=4de08f7 — هیچ تغییر ناخواسته‌ای رخ نداد"],
], [26, 74]));
body.push(cap("هشدارهای محیطی ثبت‌شده"));
body.push(tbl(["هشدار", "شرح و اثر"], [
  ["بازیافت سندباکس", "بین جلسات، محیط بازگردانی شده است: هر آنچه خارج از /home/z/my-project بود پاک شد و پوشهٔ download/ (شامل گزارش‌های قبلی) نیز حذف شد. اثر بر مخزن: هیچ — وضعیت گیت سالم است."],
  ["گم‌شدن مجدد گاوصندوق", "گاوصندوق P0-1 (/home/z/keystore-vault) برای بار دوم در بازیافت محیط از بین رفت؛ در همین ممیزی بازسازی و راستی‌آزمایی شد (بخش ۵). درس: تنها نسخهٔ پایدار، نسخه‌ای است که مالک بیرون از این محیط نگه می‌دارد."],
  ["عدم انجام عملیات ریموت", "هیچ fetch/push/pull انجام نشد؛ origin/main همان 28b64bb است؛ روی origin هیچ شاخه‌ای برای fix وجود ندارد — این ادعا در گزارش‌های این ممیزی نیز به‌عنوان «آماده برای Push» (نه «پوش‌شده») ثبت شده است."],
], [22, 78]));

// ═══ ۳. تاریخچه کامیت‌ها ═══
body.push(h1("۳. تاریخچهٔ کامیت‌ها و تطبیق دو شاخه"));
body.push(para("main نسبت به مبنا ۱۳ کامیت دارد: هشت کامیت کاریِ بازسازی‌شده، دو کامیت حساس (عمداً خارج از مسیر انتشار) و سه کامیت ابزار گزارش‌سازی. fix نسبت به مبنا ۱۷ کامیت دارد: همان هشت کامیت کاری با پچ یکسان، شش کامیت اصلاحی ویژهٔ fix و سه کامیت ابزار گزارش‌سازی که به‌تازگی روی fix چری‌پیک شده‌اند. جدول زیر تطبیق دوازده جفت متناظر را با نتیجهٔ مقایسهٔ patch-id و هش blob فایل‌های تغییرکرده نشان می‌دهد."));
body.push(cap("جدول ۲ — تطبیق دوازده جفت کامیت متناظر main ↔ fix"));
body.push(tbl(["main", "fix", "موضوع", "patch-id", "نتیجه"], [
  ["1260eac", "b9ecdf6", "لایهٔ بصری Ambient + کیت UI", "430fa4e3… یکسان", "پچ یکسان ✓"],
  ["a5d59f6", "d5d862a", "اسکریپت‌های ضبط و بسته‌بندی", "405cdacf… یکسان", "پچ یکسان ✓"],
  ["9710f1b", "a4129a0", "اسکریپت آپلود و راستی‌آزمایی", "a9e80045… یکسان", "پچ یکسان ✓"],
  ["184e31d", "ec291e6", "ارتقاهای امنیتی/کارایی ممیزی ۳۶۰", "d9f1150c… یکسان", "پچ یکسان ✓"],
  ["3ef3b3e", "e3c609b", "سخت‌سازی security + زمان‌بند", "1401cb5a… یکسان", "پچ یکسان ✓"],
  ["3de876b", "6963d2f", "بازاعمال ۷ ارتقا + LRU", "aa54c226… یکسان", "پچ یکسان ✓"],
  ["9491c8a", "2d45496", "ابزار شواهد ممیزی", "817cd658… یکسان", "پچ یکسان ✓"],
  ["f8e0bdb", "82dfb3d", "bun.lock + ابزار گزارش", "4c1aaa81… یکسان", "پچ یکسان ✓"],
  ["6148d86", "46f8802", "کتابخانهٔ گزارش RTL + مولد تلفیقی", "main: 7bbd7379… / fix: 56d256fa… — متفاوت", "توضیح‌داده‌شده — بخش ۷"],
  ["a5b73cd", "70dd91c", "مولد سند معماری یکپارچه", "56b82e1f… یکسان", "پچ یکسان ✓"],
  ["4de08f7", "fc71e84", "اسکریپت‌های گزارش پیش از P0", "3f974292… یکسان", "پچ یکسان ✓"],
  ["—", "—", "دو کامیت حساس d3dd564 و 87834e5 روی fix", "—", "عمداً منتقل نشده ✓"],
], [9, 9, 30, 30, 22]));
body.push(para("تأیید مستقل گیت: دستور log --left-right --cherry-pick روی main...fix دقیقاً همین را نشان می‌دهد — از هر دو طرف، همهٔ جفت‌های بالا حذف می‌شوند (یعنی patch-id معادل دارند) به‌جز جفت 6148d86/46f8802، شش کامیت اصلاحیِ ویژهٔ fix و دو کامیت حساسِ main. هرگز هیچ commit جدیدی در این ممیزی ساخته نشده است؛ شش اصلاح قبلی fix (3db0914 امنیت کی‌استور، fa14241 و 2b66c4f بصری، b5c71e7 تایم‌زون، 703c0f8 خط لولهٔ شواهد، 37714bf سند RTL) دست‌نخورده و سرِ جای خودند و سه چری‌پیک اخیر (46f8802، 70dd91c، fc71e84) فقط فایل‌های ابزار گزارش را اضافه کرده‌اند."));

// ═══ ۴. نتایج ممیزی امنیتی ═══
body.push(h1("۴. نتایج ممیزی امنیتی تاریخچهٔ کامل fix"));
body.push(para("روش: صرفاً فایل‌های فعلی کافی نیست — کل تاریخچهٔ قابل‌دسترس fix به‌صورت شیءبه‌شیء اسکن شد: ۸۰۳ blob از git rev-list --objects استخراج و محتوای همهٔ آن‌ها با مجموعه‌ای از الگوهای secret (کلید خصوصی، توکن AWS/Google/GitHub/Slack، انتساب password/api-key/secret/token، رشتهٔ اتصال DB با رمز، جادوی باینری JKS) بررسی شد؛ هم‌زمان همهٔ مسیرهای تاریخچه با الگوهای نام فایل حساس تطبیق داده شد. هیچ مقدار واقعی secret در هیچ فایل شواهد یا گزارش ثبت نشده است — فقط مسیر، هش blob، نوع ریسک و حکم."));
body.push(cap("جدول ۳ — سه blob حساس شناخته‌شده: آزمون دستیابی‌پذیری از fix"));
body.push(tbl(["blob", "شرح", "دسترسی از fix", "دسترسی از main"], [
  ["a807354b…", "android/rahyar-release.keystore (کلید امضای release، ۴۳۶۰ بایت)", "غیرقابل‌دسترس ✓", "موجود (کامیت d3dd564)"],
  ["16f4706e…", ".evidence-password (اعتبارنامهٔ جلسهٔ شواهد)", "غیرقابل‌دسترس ✓", "موجود (کامیت 87834e5)"],
  ["3b6bc868…", ".evidence-session-token (توکن نشست — از کار افتاده)", "غیرقابل‌دسترس ✓", "موجود (کامیت 87834e5)"],
], [14, 46, 20, 20]));
body.push(cap("جدول ۴ — طبقه‌بندی ۲۲ یافتهٔ اسکن (مقادیر ماسک‌شده؛ بدون افشا)"));
body.push(tbl(["نوع یافته", "مسیر / شمار", "کلاس مقدار", "روی origin/main؟", "حکم"], [
  ["نام فایل: env", ".env.example", "فقط placeholder — کلیدها خالی/نمونه", "blob جدید", "پاک — الگوی env"],
  ["نام فایل: keystore", "docs/KEYSTORE_SECURITY.md", "سند سیاست — بدون محتوای حساس", "blob جدید", "پاک"],
  ["نام فایل: password", "src/app/api/auth/password/route.ts", "کد احراز هویت — بدون literal", "blob جدید", "پاک"],
  ["نام فایل: credential", "src/styles/tokens.css", "مثبت کاذب — توکن‌های طراحی CSS", "از قبل عمومی", "پاک"],
  ["محتوا: password-literal", "۱۶ اسکریپت capture/audit", "رمز dev یکسان «Ra***len11» — فیکسچر ضبط محلی", "از قبل عمومی (۱۷ یافته)", "بهداشتی — غیرمسدودکننده"],
  ["محتوا: password-literal", "scripts/mint-evidence-session.mjs", "«Ra***len21» — برابر .evidence-password", "blob جدید — هنوز عمومی نشده", "⛔ مسدودکنندهٔ شرطی"],
  ["محتوا: password-literal", "scripts/test-user-isolation.ts و live-v2-tests.cjs و live-final-audit.ts", "فیکسچرهای آزمون «Te***»، «Sa***»، «Wr***» — شامل آزمون عمدی رمز-اشتباه", "از قبل عمومی", "پاک — فیکسچر آزمون"],
], [16, 24, 30, 15, 15]));
body.push(para("راستی‌آزمایی تجربی «مرده بودن» اعتبارنامهٔ مورد ششم: پایگاه‌دادهٔ توسعهٔ فعلی (db/custom.db) امروز صفر کاربر و صفر نشست دارد (بازآزمایی مستقیم SQLite)؛ مقدار مذکور نه در .env اجرایی ظاهر می‌شود و نه در هیچ فایلی از src/؛ یعنی هیچ سامانهٔ زنده‌ای با این مقدار باز نمی‌شود. با این حال، چون این مقدار عیناً همان رشته‌ای است که در main به‌عنوان فایل اعتبارنامه طبقه‌بندی شده و blob آن با این push برای نخستین‌بار به origin می‌رفت، طبق بند صریح شرط توقف مأموریت («اگر هرگونه secret در fix پیدا شد») به‌عنوان مسدودکننده ثبت می‌شود — سنجش نهایی با مالک است. در کل تاریخچهٔ fix هیچ کلید خصوصی، توکن ابری، رشتهٔ اتصال با رمز، فایل محیطی واقعی یا دادهٔ شخصی یافت نشد؛ فایل‌های دیتابیس و .npmrc/service-account نیز در هیچ نقطه‌ای از تاریخچه وجود ندارند."));

// ═══ ۵. وضعیت Keystore ═══
body.push(h1("۵. وضعیت گاوصندوق کی‌استور و آزمون بازیابی"));
body.push(cap("جدول ۵ — وضعیت کامل کی‌استور و گاوصندوق"));
body.push(tbl(["بند", "واقعیت راستی‌آزمایی‌شده"], [
  ["فایل اصلی", "android/rahyar-release.keystore — دست‌نخورده؛ SHA-256: d4b7169a21f8…b21898؛ ۴۳۶۰ بایت؛ طبق مأموریت، حذف نشد (هنوز tracked در main محلی؛ blob هرگز به origin نرسیده)"],
  ["گاوصندوق در شروع ممیزی", "⛔ موجود نبود — دومین گم‌شدن به‌دلیل بازیافت محیط؛ در همین ممیزی طبق پروتکل P0-1 بازسازی شد"],
  ["گاوصندوق بازسازی‌شده", "/home/z/keystore-vault با مجوز ۷۰۰؛ فایل rahyar-release.keystore.enc با مجوز ۶۰۰ (۴۳۸۴ بایت)؛ رمز در فایل ۶۰۰ جداگانه داخل گاوصندوق"],
  ["رمزنگاری", "AES-256-CBC + PBKDF2 با ۶۰۰٬۰۰۰ تکرار و salt تصادفی (openssl enc)؛ SHA-256 بستهٔ رمز: " + encHash],
  ["آزمون بازیابی", "PASS — رمزگشایی کنترل‌شده به /tmp و مقایسهٔ هش: تطابق بیت‌به‌بیت با فایل اصلی (d4b7169a…b21898)؛ نسخهٔ plaintext موقت پس از تأیید، با shred securely حذف شد"],
  ["نسخهٔ مستقل برای مالک", "کپی بستهٔ رمزشده در download/keystore-vault-copy/ با هش یکسان آماده دریافت است — رمز فقط از طریق همین گفت‌وگو به مالک اعلام می‌شود و در گیت/گزارش/شواهد ثبت نیست"],
  ["توصیهٔ نسخهٔ مستقل خارج از محیط", "مالک فایل .enc را روی ماشین شخصی/فضای ابری خود و رمز را در مدیر رمزها نگه دارد؛ تکرار آزمون بازیابی در محیط مالک توصیه می‌شود. تا تشکیل این نسخهٔ بیرونی، گاوصندوق در برابر بازیافت سندباکس آسیب‌پذیر است"],
  ["نکتهٔ بهداشتی", "mode فایل اصلی ۷۵۵ است (tracked)؛ با اجرای گام خروج از index روی مسیر انتشار (قبلاً روی fix انجام شده) مسئله منتفی می‌شود؛ روی main فقط با مأموریت و تأیید مالک"],
], [22, 78]));

// ═══ ۶. نتایج آزمون‌ها ═══
body.push(h1("۶. کنترل کیفیت روی fix (worktree ایزوله)"));
body.push(para("تمام آزمون‌ها روی درخت دقیق fc71e84 در یک worktree موقت اجرا شد تا HEAD مخزن اصلی هرگز جابه‌جا نشود؛ وابستگی‌ها با bun install --frozen-lockfile (۶۰۳ بسته) نصب و کلاینت Prisma تولید شد. هیچ آزمونی رد (skip) نشد و هیچ نتیجهٔ نامشخصی موفق اعلام نشده است."));
body.push(cap("جدول ۶ — ماتریس نتایج آزمون"));
body.push(tbl(["آزمون", "دامنه", "نتیجه"], [
  ["Typecheck — tsc --noEmit", "کل پروژه", "پاس — بدون خطا"],
  ["Lint — eslint src", "کل src", "پاس — بدون خطا"],
  ["مجموعهٔ کامل واحد — bun test tests/unit", "۱۴ فایل، ۷۳۵ expect", "پاس — ۲۱۸ از ۲۱۸؛ صفر شکست"],
  ["ماتریس تایم‌زون (ناورستانی تقویم)", "persian-date.test.ts در TZ=UTC، Asia/Tehran، America/New_York، Pacific/Kiritimati", "پاس — در هر چهار منطقه ۲۳ از ۲۳"],
  ["امنیت صریح", "security.test.ts + gu2-hardening.test.ts + auth.test.ts", "پاس — ۴۱ از ۴۱"],
  ["پایگاه‌داده / migration", "پوشهٔ migrations وجود ندارد (مدیریت طرح با db push)؛ prisma db push → «already in sync»؛ آزمون گارد runtime: tests/database-runtime-build.sh", "پاس — طرح و DB هم‌گام"],
  ["Build تولیدی — next build (standalone)", "کل اپ + کپی static/public به standalone", "پاس — همهٔ روت‌ها ساخته شد"],
], [26, 42, 32]));
body.push(para("دو یادداشت شفاف: نخست — دستور db push به‌دلیل مسیر مطلق داخل .env به پایگاه‌دادهٔ اصلی مخزن اشاره کرد؛ نتیجه «از قبل هم‌گام» بود و هیچ تغییری اعمال نشد؛ پس از آن نیز شمارش کاربر/نشست (۰ و ۰)، integrity_check=ok و زمان تغییر فایل تأیید شد که داده دست‌نخورده است. دوم — پروژه آزمون واحد اختصاصی migration ندارد (معماری SQLite با db push مدیریت می‌شود)؛ این موضوع به‌عنوان وضعیت موجود مستند شد و هم‌گامی طرح/DB با خود دستور prisma و آزمون runtime-build راستی‌آزمایی شد."));

// ═══ ۷. اختلاف‌های main و fix ═══
body.push(h1("۷. اختلاف‌های main و fix — همهٔ ۱۵ مسیر با توضیح"));
body.push(para("اختلاف درختی واقعی دو شاخه (git diff main..fix) دقیقاً پانزده مسیر است و برای هر مسیر، کامیتِ علت‌ساز روی fix یا عمدِ انتقال‌ندادن ثبت شده است. هیچ اختلاف سومِ پنهانی وجود ندارد."));
body.push(cap("جدول ۷ — تفکیک کامل تفاوت درخت main ↔ fix"));
body.push(tbl(["مسیر", "وضعیت", "علت (کامیت fix / عمد)"], [
  [".evidence-password", "فقط در main", "حذف عمدی — کامیت حساس 87834e5 هرگز به fix منتقل نشد"],
  [".evidence-session-token", "فقط در main", "حذف عمدی — همان کامیت حساس"],
  ["android/rahyar-release.keystore", "فقط در main", "حذف عمدی — کامیت حساس d3dd564؛ روی fix، خروج کی‌استور از مخزن با 3db0914 تثبیت شده"],
  [".gitignore", "تغییر", "3db0914 — الگوهای سخت‌شدهٔ *.keystore/*.jks/keystore.properties (۱۲ خط تازه)"],
  ["docs/KEYSTORE_SECURITY.md", "فقط در fix", "3db0914 — سند سیاست نگهداری/چرخش کلید"],
  ["scripts/capture-corrective-360.cjs", "فقط در fix", "703c0f8 — خط لولهٔ شواهد مأموریت اصلاحی"],
  ["scripts/mint-evidence-session.mjs", "فقط در fix", "703c0f8 — مینت نشست شواهد؛ همان مسدودکنندهٔ شرطی (بخش ۴ و ۹)"],
  ["scripts/gen-corrective-report.js", "فقط در fix", "37714bf — مولد گزارش RTL مأموریت اصلاحی"],
  ["src/app/login/page.tsx", "تغییر", "fa14241 — سوارسازی AmbientScene/ThemeToggle در درخت UI"],
  ["src/components/ara/ambient-scene.tsx", "تغییر", "fa14241 — همان سوارسازی"],
  ["src/components/ara/theme-toggle.tsx", "تغییر", "fa14241 — همان سوارسازی"],
  ["src/components/ara/app-shell.tsx", "تغییر", "2b66c4f — جایگزینی آخرین ThemeButton سایدبار (کشف‌شده در build تولیدی)"],
  ["src/lib/persian-date.ts", "تغییر", "b5c71e7 — ریاضی تقویمی با رشتهٔ محض UTC"],
  ["src/styles/motion.css", "تغییر", "fa14241 — استایل صحنهٔ محیطی"],
  ["tests/unit/persian-date.test.ts", "تغییر", "b5c71e7 — آزمون‌های ناورستانی تایم‌زون"],
], [30, 16, 54]));
body.push(h2("۷-۱. توضیح کامل تفاوت patch-id در جفت 6148d86 ↔ 46f8802"));
body.push(para("روی main، کامیت 6148d86 دو فایل را «از هیچ» اضافه می‌کند: corrective-report-lib.js و gen-merger-report.js. روی fix، کتابخانهٔ corrective-report-lib.js از قبل در کامیت 37714bf وجود داشت و blob آن (9d479194…) عیناً با نسخهٔ نهایی یکسان است؛ بنابراین چری‌پیکِ 46f8802 فقط gen-merger-report.js را اضافه کرده و برای کتابخانه کاری برای انجام دادن نداشته است. نتیجه: پچِ دو طرف شکل متفاوتی دارد (یک فایل در برابر دو فایل) و patch-id متفاوت می‌شود، در حالی که محتوای نهایی هر دو فایل در دو شاخه بایت‌به‌بیت یکسان است — این را هم rev-parse چهار نقطه (37714bf، 46f8802، 6148d86، main) تأیید می‌کند و هم مقایسهٔ هش blob فایل‌های تغییرکرده. این تفاوت بی‌اثر و کاملاً توضیح‌داده‌شده است."));

// ═══ ۸. موارد باقیمانده ═══
body.push(h1("۸. موارد باقیمانده"));
body.push(cap("جدول ۸ — اقلام باز پس از این ممیزی"));
body.push(tbl(["#", "مورد", "شدت", "اقدام لازم"], [
  ["۱", "مقدار هاردکد اعتبارنامهٔ dev در scripts/mint-evidence-session.mjs — تنها مسدودکنندهٔ GO", "مسدودکنندهٔ شرطی", "یک commit روی fix: جایگزینی با خواندن از env (یا تولید تصادفی) + اجرای مجدد اسکن بخش ۴؛ سپس انتظار GO"],
  ["۲", "۱۶ فیکسچر رمز dev در اسکریپت‌های capture — از قبل روی origin عمومی و مرده", "کم", "پارامتری‌سازی در یک مأموریت بهداشت آینده؛ مانع Push نیست چون چیزی تازه به origin اضافه نمی‌شود"],
  ["۳", "سه فایل حساس هنوز tracked در main محلی", "متوسط — کنترل‌شده", "طبق مأموریت دست نخورد؛ خروج از index روی main فقط با runbook و تأیید مالک"],
  ["۴", "mode ۷۵۵ روی فایل کی‌استور", "کم", "با گام ۳ منتفی می‌شود"],
  ["۵", "گاوصندوق در برابر بازیافت سندباکس آسیب‌پذیر", "متوسط", "تشکیل نسخهٔ بیرونی توسط مالک (فایل .enc + رمز در مدیر رمزها) — توصیهٔ بخش ۵"],
  ["۶", "وضعیت Flutter", "بدون تغییر", "سورس همچنان ناقص و در انتظار آرشیو کامل با SHA-256 از برنامه‌نویس دوم — طبق مستندات قبلی، هیچ ادعای تکمیلی ثبت نمی‌شود"],
  ["۷", "فایل‌های گزارش‌های قبلی در بازیافت محیط از دست رفتند", "اطلاعی", "این گزارش خودکفا نوشته شده؛ هش شواهد در بخش ۱۰ مرجع پایدار است"],
], [5, 37, 14, 44]));

// ═══ ۹. تصمیم نهایی ═══
body.push(h1("۹. تصمیم نهایی: NO-GO مشروط برای Push"));
body.push(para("طبق شرط توقف مأموریت، چون در تاریخچهٔ fix یک مقدار اعتبارنامه (حتی مرده و کم‌اثر) یافت شد که با این push برای نخستین‌بار به origin می‌رفت، تصمیم این ممیزی NO-GO مشروط است. تأکید می‌شود که همهٔ معیارهای دیگر سبز است و مسیر رسیدن به GO کوتاه و مشخص است: مالک در مأموریت بعدی اجازهٔ یک commit اصلاحی روی fix را بدهد (جایگزینی مقدار ثابت mint با خواندن از env)، سپس همین اسکن امنیتی بخش ۴ دوباره اجرا شود؛ در صورت پاک بودن اسکن، GO محلی صادر خواهد شد. پس از آن نیز Push و ایجاد PR مستلزم مجوز جداگانهٔ صریح مالک است و این گزارش فقط «آمادگی محلی» را می‌سنجد."));
body.push(cap("جدول ۹ — ماتریس معیارهای تصمیم"));
body.push(tbl(["معیار", "نتیجه", "دستگاه داوری"], [
  ["وضعیت شاخه‌ها و HEAD در طول اجرا", "پاک — بدون هیچ تغییر ناخواسته", "گارد " + guardCount + " رکوردی + مقایسهٔ خودکار"],
  ["نبود blobهای حساس شناخته‌شده در fix", "برقرار — هر سه غیرقابل‌دسترس", "اسکن شیءبه‌شیء ۸۰۳ blob"],
  ["تطبیق کامیت‌ها (patch-id و blob)", "برقرار — ۱۱ جفت یکسان + ۱ جفت توضیح‌داده‌شده", "جدول ۲ و بخش ۷"],
  ["اختلاف‌های main ↔ fix", "همه ۱۵ مسیر توضیح‌داده‌شده", "جدول ۷"],
  ["آزمون‌ها، typecheck، lint، build", "همه‌سبز — صفر شکست", "جدول ۶"],
  ["گاوصندوق و بازیابی کی‌استور", "برقرار — بازسازی و PASS بیت‌به‌بیت", "بخش ۵"],
  ["وجود هرگونه secret در fix", "نقض — یک مورد (mint هاردکد)", "بخش ۴ → تعیین‌کنندهٔ NO-GO مشروط"],
], [30, 30, 40]));

// ═══ ۱۰. شواهد ═══
body.push(h1("۱۰. شواهد قابل بازتولید و SHA-256"));
body.push(para("همهٔ خروجی‌های خام این ممیزی در پوشهٔ download/RAHYAR_P0_PRE_PUSH_EVIDENCE نگه‌داری شده و هش هر فایل در جدول زیر ثبت است (محاسبه‌شده در لحظهٔ تولید این سند). فهرست دستورهای بازتولید در پیوست آمده است. نکتهٔ فنی: هیچ فایلی نمی‌تواند هش خودش را درون خود داشته باشد؛ بنابراین SHA-256 دو فایل همین گزارش (DOCX و PDF) در فایل جداگانهٔ RAHYAR_P0_PRE_PUSH_VERIFICATION_SHA256SUMS.txt در کنار گزارش ثبت شده است."));
body.push(cap("جدول ۱۰ — فایل‌های شواهد و SHA-256"));
body.push(tbl(["فایل شواهد", "SHA-256"], evHashes.map(([f, h]) => [f, h.slice(0, 16) + "…" + h.slice(-8)]).concat([["(هش کامل در فایل SHA256SUMS)", "—"]]) , [34, 66]));

// ═══ پیوست ═══
body.push(h1("پیوست — دستورهای بازتولید شواهد"));
body.push(para("وضعیت: git rev-parse --show-toplevel؛ git branch --show-current؛ git rev-parse HEAD main fix/corrective-mission-360 origin/main؛ git for-each-ref refs/heads refs/remotes؛ git rev-list --left-right --count main...origin/main؛ git status --porcelain=v1؛ git worktree list؛ git stash list. تطبیق پچ‌ها: git log --left-right --cherry-pick main...fix و برای هر جفت: git show <sha> | git patch-id --stable و مقایسهٔ git rev-parse <sha>:<path>. اثبات انتقال‌ندادن حساس‌ها: git merge-base --is-ancestor d3dd564 fix و 87834e5 (هر دو: نه). امنیت: git rev-list --objects fix/corrective-mission-360 و اسکن محتوای ۸۰۳ blob با الگوهای secret (اسکریپت scripts/p04_scan_fix_security.py) و git log --find-object=<blob> برای یافتن کامیت معرف؛ هیچ مقداری ثبت نمی‌شود. گاوصندوق: stat و sha256sum روی گاوصندوق و فایل اصلی؛ رمزگشایی کنترل‌شده به /tmp و مقایسهٔ هش و سپس shred. آزمون‌ها: در worktree ایزولهٔ fix — bun run db:generate؛ bun run typecheck؛ bun run lint؛ bun test tests/unit؛ TZ=… bun test tests/unit/persian-date.test.ts برای چهار منطقه؛ bunx prisma db push --skip-generate؛ bash tests/database-runtime-build.sh؛ bun run build. گارد: اسکریپت scripts/p04_lib.sh در ابتدا و انتهای هر مرحله branch و HEAD و تعداد موارد dirty را ثبت و با مبنا مقایسه می‌کند."));
body.push(para("تذکر پایانی: این سند صرفاً راستی‌آزمایی محلی است. هیچ push، PR، merge یا هر عمل ریموتی دیگری انجام نشده و انجام آن‌ها در آینده مستلزم مجوز جداگانهٔ مالک است. وضعیت Flutter نیز بدون تغییر، «سورس ناقص و در انتظار آرشیو» باقی می‌ماند."));

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
        title: "گزارش راستی‌آزمایی مستقل پیش از Push — P0-4",
        subtitle: "ممیزی محلی شاخهٔ fix/corrective-mission-360: امنیت تاریخچه، تطبیق کامیت‌ها، گاوصندوق کی‌استور و کنترل کیفیت کامل",
        englishLabel: "RAHYAR P0-4 PRE-PUSH INDEPENDENT VERIFICATION",
        metaLines: [
          "مخزن: main @ 4de08f7 — fix @ fc71e84 — origin/main @ 28b64bb (بدون هیچ عملیات ریموت)",
          "نتایج: ۲۱۸ آزمون پاس، build موفق، گاوصندوق بازسازی و بازیابی بیت‌به‌بیت تأیید شد",
          "تصمیم: NO-GO مشروط — یک مسدودکننده: اعتبارنامهٔ dev هاردکد در mint-evidence-session.mjs",
          "Push و ایجاد PR فقط با مجوز جداگانهٔ مالک",
        ],
        footerRight: "رهیار AI — پروژهٔ HAMYAR-AI",
        footerLeft: "۹ آبان ۱۴۰۵ / ۳۰ اکتبر ۲۰۲۶ — محرمانه",
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
  fs.writeFileSync(OUT, buf);
  console.log("DOCX written:", OUT, (buf.length / 1024).toFixed(0) + "KB");
  console.log("guard records:", guardCount, "distinct HEADs:", guardHeads.length);
});
