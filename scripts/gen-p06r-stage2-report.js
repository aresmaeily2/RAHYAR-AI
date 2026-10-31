// ─── RAHYAR_P0_6R_STAGE2_DEPLOYMENT_OWNERSHIP_INVENTORY — DOCX فارسی RTL ───
// P0-6R Stage 2: شناسنامهٔ استقرار و مالکیت اعتبارنامه‌ها (فقط شناسایی و مستندسازی)
// هیچ مقدار واقعی Secret/Password/Token در این سند چاپ یا ذخیره نمی‌شود. fp = sha256(value)[:12]
const {
  TableOfContents, SectionType, NumberFormat, AlignmentType, BorderStyle,
  TableLayoutType, PageOrientation, ShadingType, WidthType,
  Table, TableRow, TableCell, SimpleField, Header, Footer, Packer, Document, Paragraph, TextRun,
} = require("docx");
const {
  r, para, h1, h2, tbl, cap, P, FA, buildCoverR1,
} = require("./corrective-report-lib.js");
const fs = require("fs");
const paraS = (c, o = {}) => para(c, { ...o, align: AlignmentType.START });

const OUT_DIR = "/home/z/my-project/download/P0_6R";
const OUT = OUT_DIR + "/RAHYAR_P0_6R_STAGE2_DEPLOYMENT_OWNERSHIP_INVENTORY.docx";

const SHA = {
  head: "eba15aa0e660bdb93f39ccc896cf2fcbe09568f2",
  main: "eba15aa0e660bdb93f39ccc896cf2fcbe09568f2",
  fix: "fc71e84fca87ca9dd07601d44961d2369154ac32",
  origin_main: "28b64bb0bc21e162703a59a01f6d828f8c2065d4",
  origin_feature: "f2cf171a782a04e19284bf026ca29bc9d007711d",
};

const pageHeader = () => new Header({
  children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    children: [r("رهیار AI — گزارش P0-6R / Stage 2: استقرار و مالکیت اعتبارنامه‌ها (بدون افشای مقدار — محرمانه)", { size: 18, color: "808080" })],
  })],
});
const pageFooter = () => new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE")] })],
});

// جدول RTL با اندازهٔ فونت قابل تنظیم (برای جدول ۸ستونهٔ landscape)
function tblsz(headers, rows, widths, sz = 16, hsz = 16, allowSplit = false) {
  const mk = (t, o = {}) => new TableCell({
    children: [para([r(t, { size: o.bold ? hsz : sz, bold: o.bold, color: o.color ?? P.body })], { align: AlignmentType.START, after: 0 })],
    shading: { type: ShadingType.CLEAR, fill: o.fill ?? "FFFFFF" },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    width: { size: o.w ?? 10, type: WidthType.PERCENTAGE },
  });
  return new Table({
    visuallyRightToLeft: true, layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, bottom: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, { bold: true, color: P.table.headerText, fill: P.table.headerBg, w: widths[i] })) }),
      ...rows.map((row, ri) => new TableRow({ cantSplit: allowSplit ? false : rows.length < 12, children: row.map((c, i) => mk(c, { w: widths[i], fill: ri % 2 === 1 ? P.table.surface : "FFFFFF" })) })),
    ],
  });
}
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

const body = [];

// ── ۱. چکیدهٔ اجرایی ──
body.push(h1("۱. چکیدهٔ اجرایی"));
body.push(paraS("این سند خروجی Stage 2 از مأموریت P0-6R است که با دستور مالک در تاریخ 2026-10-31 تعریف شد: «شناسنامهٔ استقرار و مالکیت اعتبارنامه‌ها». دامنهٔ مجاز این مرحله فقط شناسایی، بررسی مستندات و تهیهٔ گزارش است؛ هیچ Rotate، Revoke، ایجاد Secret، تغییر سرویس، تغییر Git یا عملیات Remote انجام نشده است. مبنای کار، رجیستر C1 تا C10 در گزارش Stage 1..3 همین مأموریت (مبتنی بر گزارش نهایی P0-6 با تصمیم NO-GO) است و همهٔ بررسی‌ها با روش‌های ماسک‌شده و فقط-خواندنی انجام شد: هیچ مقدار خامی در ترمینال، گزارش، لاگ یا فایل شواهد نوشته نشده و هر اعتبارنامه فقط با اثرانگشت SHA-256 (۱۲ نویسهٔ نخست) شناسایی می‌شود."));
body.push(paraS("چهار یافتهٔ اصلی این مرحله: نخست — برای C1، C2، C5 و C10 هیچ شواهدی از استقرار Staging یا Production در کل مخزن وجود ندارد؛ همهٔ اسکریپت‌های مصرف‌کننده به سرورهای محلی localhost:3000 یا localhost:3100 اشاره می‌کنند و دیتابیس فعلی توسعه صفر کاربر و صفر نشست دارد؛ بنابراین این چهار مورد در محدودهٔ شواهد مخزن INACTIVE ثبت می‌شوند و تنها بخش UNKNOWN، استقرارهای خارج از مخزن است که فقط مالک می‌تواند درباره‌شان حکم کند. دوم — ادعای رجیستر پیشین دربارهٔ C3 با آزمون مستقیم رد شد: مقدار C3 کی‌استور ریلیز فعلی را باز نمی‌کند؛ جاروی کامل مخزن (۳۹ هزار اثرانگشت یکتا از مقادیر کاندید) صفر نتیجه داد و نقش واقعی C3 روشن شد: رمز استاندارد و عمومی ابزار دیباگ اندروید، نه راز امضای ریلیز. سوم — رمز فایل کی‌استور فعلی با هیچ مقدار موجود در مخزن بازیابی نمی‌شود و پشتیبان رمزشدهٔ P0-1 (گاوصندوق) نیز با بازیافت محیط از بین رفته است؛ بنابراین بازیابی هویت امضا اکنون فقط از طریق مالک ممکن است و تا اثبات پشتیبان مستقل، هرگونه تغییر رمز/کلید ممنوع می‌ماند. چهارم — وضعیت P0-5 برای C8 تغییر نکرده است: اسکریپت mint روی شاخهٔ fix همچنان literal هاردکد دارد، هیچ ارجاعی به env و هیچ تست امنیتی ندارد."));
body.push(paraS("پایبندی به شرط خاتمه: این گزارش فقط شناسنامهٔ Stage 2 را تحویل می‌دهد و پس از آن، اجرای هر عملیاتی روی اعتبارنامه‌ها منتظر مجوز جداگانهٔ مالک می‌ماند. تکمیل این مرحله به‌هیچ‌وجه مجوز Push، انتشار یا اجرای Stage 4 نیست."));

// ── ۲. تثبیت وضعیت مخزن ──
body.push(h1("۲. تثبیت وضعیت مخزن و شفافیت رانش"));
body.push(paraS("وضعیت مراجع در ابتدا و انتهای این مأموریت یکسان است. تنها رانش نسبت به گزارش Stage 1..3، یک کامیت ابزاری روی main است (eba15aa — 2026-10-31 07:41 UTC) که صرفاً سه اسکریپت همان گزارش (gen-p06r-report.js، p06r_verify.py، p06r_doc_safety_scan.py — ۴۹۳ خط درج، صفر حذف) را ثبت کرده و هیچ فایل حساس یا مسیر کد محصول را تغییر نداده است. Working Tree در آغاز مأموریت تمیز بود و در پایان فقط اسکریپت‌های ابزاری untracked همین مأموریت به آن افزوده شده است؛ صفر تغییر tracked."));
body.push(cap("جدول ۱ — وضعیت مراجع و شاخه‌ها (Full SHA) در 2026-10-31"));
body.push(tblsz(["مورد", "مقدار", "منبع"], [
  ["HEAD فعلی", SHA.head + " (روی main)", "git rev-parse HEAD"],
  ["main", SHA.main + " — ۱۵ جلو / ۰ عقب نسبت به origin/main", "git rev-parse / rev-list"],
  ["fix/corrective-mission-360", SHA.fix + " — بدون تغییر؛ ۱۷ جلو / ۰ عقب", "git rev-parse"],
  ["origin/main", SHA.origin_main + " — بدون تغییر (هیچ عملیاتی روی ریموت انجام نشد)", "git rev-parse refs/remotes/origin/main"],
  ["origin/feature/ambient-motion-polish", SHA.origin_feature + " — بدون تغییر", "git rev-parse"],
  ["تگ‌های عمومی", "v1.0.0-rc1 / v1.1.0 / v1.2.0 — هر سه دست‌نخورده در تاریخچهٔ origin/main", "git tag -l"],
  ["refs/original (پشتیبان بازنویسی قدیمی)", "main @ d776ca8a… و v1.0.0-rc1 @ 2202fcf4… — فقط محلی، دست‌نخورده", "for-each-ref refs/original"],
  ["Worktreeها", "دقیقاً یک worktree: /home/z/my-project روی main", "git worktree list --porcelain"],
  ["Working Tree", "صفر تغییر tracked؛ فقط اسکریپت‌های ابزاری untracked این مأموریت (بخش ۸) و خروجی‌های gitignored مسیر download/", "git status --porcelain"],
], [30, 46, 24], 20, 20, true));
body.push(paraS("یادداشت یکپارچگی ماسکینگ: در جریان کاوش ساختاری، یک خروجی میانی از خطوط اسکریپت ساخت v1.0 مقدار C4 را بدون ماسک نشان داد. این مقدار از 2026-10-19 در تاریخچهٔ عمومی origin موجود و در رجیستر قبلی MOOT (بی‌اثر) ثبت شده است؛ با این حال به‌عنوان حادثهٔ ماسکینگ ثبت می‌شود: خروجی ساختاری با ماسکینگ زیررشته‌ای بازتولید شد، هیچ مقدار خامی به این گزارش یا فایل‌های شواهد وارد نشد و آن مقدار فقط با اثرانگشت dd65b755befe ارجاع می‌شود. نکتهٔ بهداشتی مرتبط (خارج از محدودهٔ تغییر): دو اسکریپت اسکنر ثبت‌شده روی main مقدار C4 را به‌صورت خام در فهرست بررسی‌های منفی نگه می‌دارند؛ توصیه می‌شود در فرصتی مناسب به فرم اثرانگشت تبدیل شوند — در این مأموریت هیچ تغییری در آن‌ها داده نشده است."));

// ── ۳. روش‌شناسی مجاز ──
body.push(h1("۳. روش‌شناسی مجاز"));
body.push(paraS("طبق دستور Stage 2 فقط شناسایی و مستندسازی مجاز بود و هیچ آزمون تهاجمی، ورود غیرمجاز یا درخواست شبکه‌ای با هیچ اعتبارنامه‌ای انجام نشد؛ کل کاوش آفلاین و فقط-خواندنی بود. ابزارهای به‌کاررفته: (۱) راستی‌آزمایی اثرانگشت محتوای blobها روی main، fix، origin/main و origin/feature؛ (۲) سرشماری فقط-خواندنی دیتابیس توسعه روی کپی موقت در /tmp (فایل اصلی هرگز باز نشد)؛ (۳) آزمون محلی بازیابی کی‌استور روی کپی موقت با keytool و openssl — این تنها اجرای مجاز است که دستور Stage 2 برای C3 صراحتاً خواسته است («روش بازیابی را بدون افشای رمز آزمایش کن») و روی فایل اصلی هیچ نوشتنی انجام نمی‌دهد؛ فایل‌های موقت با بازنویسی تصادفی و حذف امن پاک شدند؛ (۴) استخراج ساختار اسکریپت‌ها با ماسکینگ زیررشته‌ای. برای ادعای «هیچ مقدار مخزنی کی‌استور را باز نمی‌کند» دو جاروی مکمل انجام شد: جاروی ۱۴٬۳۶۰ لفظ نقل‌قولی کل مخزن و جاروی ۲۴٬۶۱۶ توکن ASCII همهٔ فایل‌های tracked، هر دو با راستی‌آزمایی MAC رمزنگارانهٔ openssl (کالیبره‌شده با keystore آزمونی) — نتیجه هر دو: صفر گشایش، صفر تایم‌اوت."));

// ── ۴. جدول الزامی مرجع (landscape) ──
const masterRows = [
  ["C1", "احراز هویت خود اپ — /api/auth/login (scrypt، src/lib/auth.ts)", "Development محلی (localhost:3000) — بدون شواهد Staging/Prod", "preview-setup.ts + ۱۷ اسکریپت شواهد (۱۸ فایل روی main و origin/main؛ ۶ روی origin/feature)؛ DB فعلی: ۰ مصرف‌کننده", "INACTIVE (محدودهٔ شواهد مخزن) + UNKNOWN خارج از مخزن؛ RE-ARMABLE", "روی مخزن هیچ؛ در استقرار زندهٔ احتمالی دورهٔ v2.0/v2.1 قطع دسترسی رمز قدیم", "فقط مالک؛ مقدار جدید خارج از مخزن از مسیر رسمی اپ", "fp cec51518b9ac؛ ۱۵/۱۵ اثرانگشت؛ سرشماری DB: ۰ کاربر؛ همهٔ BASEها localhost"],
  ["C2", "همان سرویس — نسل اول (rc1)", "Development محلی (localhost:3100) — دورهٔ v1.0.0-rc1", "فقط test-user-isolation.ts (۱ فایل روی هر ۴ مرجع)", "INACTIVE-کهنه + UNKNOWN خارج از مخزن", "مشروط؛ اگر استقرار زندهٔ rc1 وجود داشته باشد (بعید، حدس ممنوع)", "فقط مالک؛ همان مجرای C1", "fp ee0880daa2ca؛ DB: ۰ کاربر با طول نام <۲۰"],
  ["C3", "امضای APK — android/rahyar-release.keystore (PKCS12، فقط-محلی روی main)؛ C3 خود = رمز استاندارد دیباگ اندروید، نه رمز ریلیز", "ابزار ساخت محلی — کی‌استور فعلی tracked فقط روی main (d3dd564، 2026-10-28)؛ غایب از fix/origin/تگ‌ها", "build-android-apk-v11.sh و build-android-rebuild.sh (رمز دیباگ)؛ مسیر gradle فعلی بی‌اثر (keystore.properties موجود نیست)", "UNKNOWN (دسترسی) — فایل موجود و پایدار اما با هیچ مقدار مخزنی باز نمی‌شود (~۳۹هزار کاندیدا: ۰ گشایش)", "Rotate با keytool ممکن نیست مگر مالک رمز واقعی را فراهم کند؛ بدون پشتیبان اثبات‌شده ممنوع (دستور فعلی)", "رمز واقعی فقط نزد مالک؛ طرح پشتیبان رمزشدهٔ خارج از مخزن در بخش ۶ ارائه شد", "fp f60ed56a9c82؛ جاروها ۱۴٬۳۶۰+۲۴٬۶۱۶+۹۷ = صفر؛ sha256 فایل = ثبت P0-6؛ گاوصندوق P0-1 موجود نیست"],
  ["C5", "احراز هویت خود اپ — حساب آزمونی («sarika»)", "Development محلی (localhost:3000) — دورهٔ v2", "live-v2-tests.cjs + capture-v2.cjs + capture-v2-extra.cjs (۳ فایل روی main/fix/origin-main)", "INACTIVE محلی (۰ ردیف sarika؛ ۰ کاربر) + UNKNOWN-LOW خارج از مخزن", "Revoke = حذف حساب در هر استقرار زنده در صورت وجود؛ اثر ناچیز", "حذف حساب از پنل/DB همان استقرار؛ محلی هیچ", "fp 8eb38003b10d؛ سرشماری DB امروز"],
  ["C7", "احراز هویت خود اپ — عکس‌برداری ممیزی ۳۶۰ (audit-screens.mjs به localhost:3000)", "Development محلی — هرگز عمومی نشده (غایب از هر دو مرجع origin)", "اسکریپت مستقل؛ blob یکسان روی main و fix؛ tracked روی هر دو — ریسک افشا در هر push از fix", "UNKNOWN فعالیت (محلی)؛ ریسک: LOCAL-ONLY در آستانهٔ افشا", "Rotate اختیاری (هرگز عمومی نشده)؛ Sanitize پیش از هر push الزامی", "مقدار جدید فقط از مالک؛ یا حذف نیاز با خواندن env/آرگومان", "fp 46d0a91d1e48؛ ls-tree مراجع origin: غایب"],
  ["C8", "bootstrap شواهد — ساخت owner در DB خالی (hashPassword خود اپ)؛ mint-evidence-session.mjs فقط روی fix", "Development محلی — هرگز عمومی نشده (دو تکه: literal روی fix + فایل .evidence-password روی main)", "gen-pre-p0 (ارجاع گزارشی)؛ مسیر اجرا: دستی؛ خروجی mint فایل .evidence-session-token است", "RE-ARMABLE — امروز بی‌اثر (۰ کاربر، ۰ نشست)؛ اجرای دوبارهٔ mint همان مقدار را بازمی‌سازد", "P0-5 (env-only، fail-closed، تست) + مقدار جدید فقط از مالک؛ ابطال مؤثر مقدار قدیمی پس از اصلاح", "مقدار جدید فقط در env محلی untracked (۰۶۰۰)؛ هیچ ثبت در فایل/گیت/گزارش", "fp 8aa62d3b0a15 (۲۱ نویسه)؛ صفر process.env؛ صفر EVIDENCE_SESSION_SECRET؛ صفر تست امنیتی روی fix"],
  ["C9", "نشست اپ — توکن مقید به رکورد Session (TTL ۲۴ساعته)", "محلی — tracked فقط روی main (87834e5، 2026-10-29)؛ غایب از fix/origin", "هیچ فرایند فعلی روی main مصرفش نمی‌کند؛ روی fix خروجی mint و ورودی capture-corrective-360 است", "DEAD اثبات‌شده — منقضی (ضبط ۱۰-۲۹)؛ ۰ نشست در DB؛ resolveUser طول <۲۰ را رد می‌کند", "بی‌مورد (توکن مرده)؛ اثر افشا ≈ صفر", "بی‌نیاز؛ در صورت نیاز فقط مالک", "fp ff9d8259a6e5؛ سرشماری Session: ۰/۰"],
  ["C10", "احراز هویت خود اپ با BASE قابل‌تنظیم — live-final-audit.ts (دورهٔ راستی‌آزمایی زندهٔ v2)", "Development محلی (پیش‌فرض localhost:3000) — طرح BASE پویا یعنی هدف دیگری نیز در نظر بوده؛ تعیین تکلیف با مالک", "فقط live-final-audit.ts (۱ فایل روی هر ۴ مرجع)", "INACTIVE محلی (۰ کاربر، ۰ نام‌کاربری ۱۶کاراکتری) + UNKNOWN خارج از مخزن", "همان مجرای C1؛ اثر روی مخزن هیچ", "فقط مالک", "fp 9774fdedae3b؛ ۱۵/۱۵ اثرانگشت امروز"],
];
const HDR8 = ["شناسه", "سرویس", "محیط", "مصرف‌کننده", "وضعیت", "اثر Rotate", "روش بازیابی", "شواهد"];
const W8 = [5, 15, 14, 17, 14, 13, 10, 12];
const masterLandscape = [
  new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 160 },
    children: [r("جدول ۲ — شناسنامهٔ استقرار و مالکیت (قالب الزامی دستور Stage 2)", { bold: true, size: 30, color: P.primary })],
  }),
  para("این جدول در صفحات افقی (Landscape) ارائه می‌شود تا هر هشت ستون الزامی — شناسه، سرویس، محیط، مصرف‌کننده، وضعیت، اثر Rotate، روش بازیابی و شواهد — خوانا بماند. برای پرهیز از ردیف‌های بلندتر از صفحه، جدول در دو نیمهٔ چهارردیفی با سرستون تکرارشونده ارائه شده است. تحلیل کامل هر شناسه در بخش‌های ۵ تا ۸ آمده است. دو مورد باقی‌ماندهٔ رجیستر که خارج از دامنهٔ دستور Stage 2 بودند، تکرار نمی‌شوند: C4 (جفت‌رمز کی‌استور قدیمی — MOOT، مادهٔ کلید از بین رفته) و C6 (مقدار آزمون منفی — اعتبارنامهٔ واقعی نیست).", { after: 200 }),
  tblsz(HDR8, masterRows.slice(0, 4), W8, 15, 16, true),
  para("", { after: 120 }),
  tblsz(HDR8, masterRows.slice(4), W8, 15, 16, true),
  para("قاعدهٔ وضعیت‌گذاری: ACTIVE فقط با شواهد مصرف زنده؛ INACTIVE وقتی محدودهٔ شواهد مخزن نبودِ مصرف را نشان می‌دهد؛ UNKNOWN وقتی حکم بدون آزمون شبکه‌ای (که ممنوع است) یا بدون اطلاعات مالک ممکن نیست؛ NOT DEPLOYED برای مؤلفه‌ای که اصلاً استقراری ندارد. چون هیچ‌کدام از اعتبارنامه‌های اپی در هیچ استقرار ثبت‌شده‌ای به‌جز سرورهای محلی موقت به کار رفته‌اند و آن سرورها و DBهایشان دیگر وجود ندارند، وضعیت پایه INACTIVE است و UNKNOWN فقط برای احتمال استقرار خارج از مخزن که فقط مالک می‌تواند رد یا تأیید کند، حفظ می‌شود.", { before: 160 }),
];

// ── ۵. بخش الف — C1، C2، C5، C10 ──
body.push(h1("۵. بخش الف — C1، C2، C5 و C10: سرویس، محیط، مصرف‌کننده و استقرار"));

body.push(h2("۵-۱. C1 — رمز ورود owner دورهٔ شواهد v2.0/v2.1 (fp cec51518b9ac)"));
body.push(paraS("سرویس مرتبط، احراز هویت خود اپلیکیشن است: POST /api/auth/login با هش scrypt در src/lib/auth.ts — همان سرویسی که گزارش P0-6 با شواهد کد اثبات کرده بود. محیط: همهٔ مصرف‌کنندگان ثبت‌شده به سرورهای محلی اشاره می‌کنند؛ preview-setup.ts و شانزده اسکریپت دیگر دورهٔ شواهد (capture-v2 و نسل‌های capture، agent-real-evidence، offline-evidence، session-capture.sh و live-v2-tests.cjs) روی localhost:3000 کار می‌کنند و تنها URLهای بیرونی آن‌ها سرویس هوش مصنوعی و آپلود فایل است، نه استقرار اپ. هیچ فایل پیکربندی، CI، Docker-compose یا سندی در مخزن وجود ندارد که استقرار Staging یا Production این اپ را نشان دهد؛ Dockerfile و Caddyfile فقط قابلیت استقرار را تعریف می‌کنند، نه وقوع آن."));
body.push(paraS("مصرف‌کنندگان و وابستگی نسخه‌ها: هجده فایل در scripts/ روی main و همین تعداد روی origin/main حامل مقدار هستند (روی origin/feature شش فایل) — همه مصنوع تاریخی دورهٔ شواهد v2.0/v2.1 (اکتبر ۱۹ تا ۲۲ به بعد) و هیچ‌کدام نیاز اجرایی فعلی ندارند. محل تنظیمات: literal هاردکد داخل خود اسکریپت‌هاست؛ نه متغیر env و نه فایل تنظیماتی در کار است و همین، افشای گسترده را ممکن کرده بود. وضعیت: سرشماری فقط-خواندنی امروز دیتابیس توسعه (روی کپی /tmp) صفر کاربر و صفر نشست نشان می‌دهد؛ یعنی در تنها محیطی که شواهد دارند، این رمز هیچ حساب و هیچ نشست فعالی ندارد؛ بنابراین INACTIVE در محدودهٔ شواهد مخزن ثبت می‌شود. دو ریسک باقی‌مانده: (الف) اجرای دوبارهٔ preview-setup.ts همین حساب را در هر DB تازه بازمی‌سازد (RE-ARMABLE)؛ (ب) اگر مالک در آن دوره استقراری خارج از مخزن داشته باشد، حکم درباره‌اش فقط با اوست؛ لذا UNKNOWN مستند و بدون حدس. امکان Rotate از نظر فنی وجود دارد (تغییر رمز از مسیر رسمی اپ در هر استقرار زنده) و اثر آن روی مخزن صفر است (blobها تاریخی می‌مانند)؛ روش بازیابی برای مقدار جدید فقط مالک است و هیچ مقدار جدیدی در این مأموریت ساخته یا ثبت نشده است."));

body.push(h2("۵-۲. C2 — رمز owner نسل اول (rc1) — fp ee0880daa2ca"));
body.push(paraS("همان سرویس احراز هویت، اما از نسل اول محصول: تنها مصرف‌کننده، test-user-isolation.ts است که به localhost:3100 اشاره می‌کند و تاریخچه‌اش تا تگ v1.0.0-rc1 در origin عمومی است. محیط: Development محلی؛ مصرف‌کننده: یک فایل؛ وابستگی نسخه: فقط دورهٔ rc1. وضعیت: INACTIVE-کهنه — دیتابیس فعلی حتی یک کاربر با نام‌کاربری زیر بیست نویسه ندارد و نسل اول مدت‌هاست جایگزین شده؛ با این حال طبق قاعدهٔ مأموریت «مرده فرض می‌شود اما حدس ثبت نمی‌شود» و حکم نهایی دربارهٔ احتمال استقرار خارج از مخزن با مالک است (UNKNOWN مستند). اثر Rotate مشروط مانند C1 و فقط در صورت وجود استقرار زندهٔ آن دوره؛ روش بازیابی مقدار جدید فقط مالک. شواهد: تطبیق اثرانگشت روی هر چهار مرجع + سرشماری DB."));

body.push(h2("۵-۳. C5 — رمز حساب آزمونی «sarika» (fp 8eb38003b10d)"));
body.push(paraS("سرویس: احراز هویت خود اپ به‌عنوان حساب آزمونی. محیط: Development محلی (localhost:3000). مصرف‌کنندگان: سه فایل — live-v2-tests.cjs، capture-v2.cjs و capture-v2-extra.cjs — که روی main، fix و origin/main مشترک‌اند. وضعیت: INACTIVE محلی با اطمینان بالا: سرشماری امروز صفر ردیف کاربر و به‌طور مشخص صفر ردیف با نام‌کاربری sarika نشان می‌دهد؛ ریسک عملی ناچیز است چون حساب آزمونی است. Revoke مشروط = حذف حساب در هر استقرار زندهٔ احتمالی (فقط مالک می‌تواند وجودش را تعیین کند)؛ در محیط فعلی هیچ اقدامی معنا ندارد. اثر Rotate/حذف: صفر روی مخزن. بازیابی: بی‌نیاز — در صورت نیاز به حساب آزمونی جدید، حساب با مقدار تازه و خارج از مخزن ساخته می‌شود."));

body.push(h2("۵-۴. C10 — رمز جفت‌حساب راستی‌آزمایی زندهٔ v2 (fp 9774fdedae3b)"));
body.push(paraS("سرویس: همان /api/auth/login اما از طریق live-final-audit.ts که BASE آن قابل‌تنظیم است. محیط: مقدار پیش‌فرض ثبت‌شده localhost:3000 است؛ طراحی «BASE قابل‌تنظیم» نشان می‌دهد نویسنده هدف پویاتری هم در نظر داشته، اما هیچ مقدار یا URL استقرار عمومی دیگری در مخزن ثبت نشده — این ابهام عمداً UNKNOWN ثبت می‌شود و تعیین تکلیفش با مالک است. مصرف‌کننده: فقط همان یک فایل (روی هر چهار مرجع). وضعیت: INACTIVE محلی — صفر کاربر و صفر نام‌کاربری شانزده‌کاراکتری در سرشماری امروز؛ UNKNOWN برای استقرار خارج از مخزن. اثر Rotate و روش بازیابی مانند C1؛ وابستگی نسخه: دورهٔ راستی‌آزمایی زندهٔ v2 (از ۲۰۲۶-۱۰-۲۱)."));

// ── ۶. بخش ب — C3 ──
body.push(h1("۶. بخش ب — C3: کی‌استور اندروید، بازنگری کامل مالکیت و بازیابی"));
body.push(h2("۶-۱. نوع کی‌استور و نقش رمزها"));
body.push(paraS("فایل android/rahyar-release.keystore یک PKCS12 است (امضای ساختار ASN.1 SEQUENCE؛ ۴٬۳۶۰ بایت) و SHA-256 آن دقیقاً برابر مقدار ثبت‌شده در گزارش P0-6 است — یعنی از آن تاریخ تا امروز یک بایت هم تغییر نکرده است. در PKCS12 دو رمز در کار است: store-pass که یکپارچگی کل store را (از طریق MAC رمزنگارانه) محافظت می‌کند و key-pass که کلید خصوصی هر alias را جداگانه رمز می‌کند؛ در ساخت‌های متعارف ابزار اندروید این دو معمولاً یک مقدارند. فایل فقط روی main محلی tracked است (کامیت d3dd564 — 2026-10-28 19:10 UTC) و در fix، در هر دو مرجع origin و در هر سه تگ منتشرشده غایب است؛ یعنی خودِ فایل هرگز عمومی نشده است."));
body.push(h2("۶-۲. وابستگی امضا و وضعیت مسیر فعلی"));
body.push(paraS("وابستگی امضا به دو مسیر است. مسیر قدیمی (اسکریپت‌های shell): build-android-apk-v11.sh کی‌استور ریلیز را در backups/android-release-keystore/ می‌سازد یا می‌خواند و با apksigner امضا می‌کند؛ build-android-rebuild.sh فقط keystore دیباگ استاندارد (androiddebugkey) می‌سازد و APK خروجی را عمداً بدون امضای ریلیز رها می‌کند. مسیر فعلی (gradle): android/app/build.gradle امضای release را فقط در صورت وجود فایل android/keystore.properties فعال می‌کند و تصریح دارد که کلید و رمزها هرگز وارد گیت نمی‌شوند — این فایل در محیط فعلی موجود نیست، بنابراین مسیر gradle در وضعیت فعلی اصلاً قادر به امضای release نیست و اپلیکیشن محصولی هنوز هیچ تنظیم امضای زنده‌ای از این مخزن ندارد."));
body.push(h2("۶-۳. آیا همان کلید برای نسخه‌های منتشرشده استفاده شده است؟"));
body.push(paraS("شواهد به سه نسل تفکیک می‌شود. نسل v1.0 (اسکریپت build-android-apk.sh): کی‌استور با جفت‌رمز C4 ساخته و امضا می‌شد — آن مقدار از ۲۰۲۶-۱۰-۱۹ عمومی است و بنا بر android/README.md مادهٔ کلید آن کی‌استور اصلی از بین رفته است (MOOT). نسل v1.1/v1.2 (اسکریپت build-android-apk-v11.sh): رمز store و key به‌صورت تصادفی در زمان ساخت تولید می‌شد (۲۸ نویسهٔ تصادفی از منبع سیستم + یک پسوند ثابت کوتاه) و فقط در یک فایل رمز داخل backups/ نوشته می‌شد — این رمز هرگز وارد مخزن نشد و آن پوشه نیز امروز موجود نیست. نسل فعلی: فایل tracked (کامیت ۲۰۲۶-۱۰-۲۸) با هیچ مقدار موجود در مخزن قابل گشودن نیست. برابری کلید فایل فعلی با کلید APKهای منتشرشده قابل اثبات نیست: نه نمونهٔ APK در محیط موجود است و نه کی‌استور قابل گشودن است تا اثرانگشت گواهی‌اش استخراج شود — این مورد صریحاً UNKNOWN ثبت می‌شود."));
body.push(h2("۶-۴. آزمون بازیابی — نتیجه: ناموفق با تمام مواد مخزنی"));
body.push(paraS("آزمون بازیابی طبق دستور Stage 2 و بدون افشای رمز انجام شد: برای هر کاندیدا، یک کپی موقت از کی‌استور با رمز آزمون شد و فایل موقت پس از هر آزمون با بازنویسی تصادفی پاک شد؛ فایل اصلی هرگز نوشته نشد. سه جارو اجرا شد: (۱) ۱۴٬۳۶۰ لفظ نقل‌قولی یکتا از تمام فایل‌های tracked؛ (۲) ۲۴٬۶۱۶ توکن ASCII یکتا (۳ تا ۶۴ نویسه) از تمام فایل‌های tracked به‌علاوهٔ محتوای دو فایل .evidence-*؛ (۳) ۹۷ ریز-کاندیدای کوتاه از خود اسکریپت‌های ساخت. ابزار: راستی‌آزمایی MAC رمزنگارانهٔ openssl (کالیبره‌شده با keystore آزمونی: رمز درست، نتیجه موفق؛ رمز غلط، پیام «Mac verify error») و در مراحل تعیین‌کننده keytool. نتیجهٔ نهایی: صفر گشایش از میان حدود ۳۹ هزار اثرانگشت یکتا — به‌ویژه مقدار C3 نیز کی‌استور فعلی را باز نمی‌کند."));
body.push(paraS("این نتیجه ادعای رجیستر پیشین را رد می‌کند و نقش واقعی C3 را روشن می‌کند: مقدار C3 همان مقدار متعارف و عمومی ابزار دیباگ اندروید است (۷ نویسه) که در اسکریپت‌های v11 و rebuild فقط برای keystore دیباگ به کار می‌رود — افشای آن خطر امضای ریلیز ندارد، چون دیباگ-کی‌استور اصلاً هویت انتشار نیست. در مقابل، رمز فایل کی‌استور فعلی (و به احتمال قوی همان رمز نسل v11) فقط در backups/ یا حافظهٔ مالک بوده است. وضعیت نهایی C3 مطابق قاعدهٔ مأموریت: UNKNOWN (دسترسی) — فایل موجود، پایدار و sha-ثابت است، اما بازیابی با مواد مخزنی اثبات‌ناپذیر است و حدس دربارهٔ پشتیبان‌های خارج از محیط ممنوع است."));
body.push(h2("۶-۵. امکان ادامه انتشار و به‌روزرسانی با کلید فعلی"));
body.push(paraS("به‌شرطی که مالک رمز واقعی فعلی را خارج از مخزن در اختیار داشته باشد، ادامهٔ انتشار با همان کلید بدون هیچ وقفه‌ای ممکن است (امضا همان الگوی قبلی، بدون تغییر گواهی). اگر رمز واقعی در هیچ‌جا — نزد مالک یا در پشتیبان‌های خارج از محیط — نباشد، کلید فعلی عملاً بازنیافتنی است و ادامهٔ انتشار نیازمند ساخت کی‌استور جدید خواهد بود که به تغییر امضا و شکستن به‌روزرسانی درجا می‌انجامد؛ android/README.md همین قید را برای گذار از v1.1.0 مستند کرده است («به‌روزرسانی درجا با هر کلید دیگری ممکن نیست»). درس تکرارشونده: این دقیقاً دومین باری است که یک نسل کلید در آستانهٔ گم‌شدن قرار می‌گیرد (نخست: کی‌استور اصلی v1.0). همین ریسک، پشتیبان رمزشدهٔ مستقل را به پیش‌نیاز مطلق هر اقدام بعدی تبدیل می‌کند."));
body.push(h2("۶-۶. طرح پشتیبان‌گیری رمزنگاری‌شدهٔ خارج از مخزن (طراحی — بدون اجرا)"));
body.push(paraS("شش گام طراحی‌شده: (۱) ساخت گاوصندوق /home/z/keystore-vault خارج از مخزن با مجوز ۰۷۰۰ — همان الگوی P0-1 که این بار باید خارج از محیط موقت هم نسخه داشته باشد، چون گاوصندوق قبلی با بازیافت محیط از بین رفت؛ (۲) ساخت آرشیو رمزنگاری‌شده از کی‌استور + فایل رمز (در صورت وجود) با age یا openssl AES-256 و passphrase‌ای که فقط مالک می‌داند و در هیچ فایل، گیت، گزارش یا ترمینالی ثبت نمی‌شود؛ (۳) ثبت SHA-256 فایل اصلی و آرشیو در SHA256SUMS داخل گاوصندوق؛ (۴) رزمایش بازیابی: رمزگشایی در /tmp، گشودن موفق با keytool -list، سپس حذف امن فایل موقت — نتیجه فقط به‌صورت موفق/ناموفق ثبت می‌شود؛ (۵) نگهداری دو نسخه روی دو رسانهٔ مستقل از ماشین جاری؛ (۶) تا اثبات پشتیبان مستقل و قابل بازیابی، هیچ تغییری در رمز یا کلید انجام نمی‌شود (هم‌سو با دستور فعلی). روش بازیابی آزمون‌شده در این مأموریت (keytool/openssl + رمز واقعی) کالیبره و آماده است؛ تنها حلقهٔ گمشده، خود رمز واقعی نزد مالک است."));

// ── ۷. بخش ج و د — C8، C7، C9 ──
body.push(h1("۷. بخش ج — C8: وضعیت P0-5 و طرح اصلاح محلی (بدون تغییر روی fix)"));
body.push(h2("۷-۱. مستندسازی وضعیت فعلی (پنج نبود)"));
body.push(paraS("نسخهٔ fix اسکریپت mint-evidence-session.mjs (تولد در کامیت 703c0f8 — 2026-10-29؛ هرگز ویرایش نشده) پنج کاستی P0-5 را کامل حفظ کرده است: (۱) مقدار هاردکدشده — const PASSWORD با literal دارای اثرانگشت 8aa62d3b0a15 (۲۱ نویسه)؛ (۲) نبود process.env — صفر ارجاع به env در کل فایل؛ (۳) نبود EVIDENCE_SESSION_SECRET — این نام به‌هیچ‌وجه در اسکریپت نیست و در .env.example هیچ‌یک از دو شاخه هم ثبت نشده؛ (۴) نبود fail-closed — هیچ مسیر توقفی برای نبود/نامعتبری Secret وجود ندارد (اسکریپت همیشه با مقدار ثابت اجرا می‌شود)؛ (۵) نبود تست امنیتی — جست‌وجوی EVIDENCE_SESSION_SECRET در کل درخت fix هیچ فایلی برنمی‌گرداند. پیوند دوشاخه‌ای مقدار نیز پابرجاست: فایل .evidence-password روی main (tracked) دقیقاً همان مقدار literal داخل اسکریپت روی fix است. وضعیت فعالیت: RE-ARMABLE — سرشماری امروز صفر کاربر و صفر نشست می‌دهد، اما اجرای دوبارهٔ اسکریپت همان حساب را در DB خالی بازمی‌سازد؛ مقدار هرگز عمومی نشده است."));
body.push(h2("۷-۲. طرح اصلاح محلی P0-5 (فقط طرح — اجرا با مجوز، در Stage 4)"));
body.push(paraS("طرح عیناً مطابق مأموریت اصلی P0-5 و بستهٔ بخش ۶ گزارش Stage 1..3 است: حذف کامل literal؛ خواندن Secret فقط از process.env.EVIDENCE_SESSION_SECRET؛ توقف امن با کد خروج مشخص و پیام بدون مقدار در صورت نبود/نامعتبری متغیر (حداقل طول و بدون هیچ fallback، مقدار پیش‌فرض یا مسیر جانبی)؛ افزودن پنج تست امنیتی (توقف بدون env؛ نشست فقط-hash و بدون چاپ مقدار با env معتبر؛ صفر یافتهٔ اثرانگشت C8 در فایل اسکریپت؛ صفر مسیر fallback؛ اسکن ماسک‌شدهٔ مجموعهٔ قابل‌انتقال پس از کامیت)؛ و دو وابستگی مکمل: افزودن نام متغیر (بدون مقدار) به .env.example و افزودن الگوهای .evidence-* به .gitignore شاخهٔ fix — چون خروجی اسکریپت (فایل توکن) در وضعیت فعلی ignore نمی‌شود و ریسک افزودن تصادفی دارد. محدوده: فقط یک کامیت کد روی fix؛ هیچ blob تاریخی بازنویسی نمی‌شود و push از fix پس از آن هم همچنان نیازمند تصمیم جداگانهٔ مالک دربارهٔ تاریخچه است — P0-5 شرط لازم است، نه کافی."));

body.push(h1("۸. بخش د — C7 و C9: ریسک، ضرورت و طرح‌های امن"));
body.push(h2("۸-۱. C7 — audit-screens.mjs (fp 46d0a91d1e48)"));
body.push(paraS("محل استفاده: اسکریپت عکس‌برداری ممیزی ۳۶۰ که به localhost:3000 وارد می‌شود و از صفحات اپ تصویر می‌گیرد؛ blob آن روی main و fix یکسان است و هر دو آن را tracked دارند، اما هیچ‌یک از دو مرجع origin آن را ندارند — یعنی مقدار هرگز عمومی نشده است. خطر احتمالی: این اسکریپت روی fix tracked است و هر push از fix در وضعیت فعلی، افشای عمومی فوری مقدار C7 را در پی دارد — همین، خطر اصلی است، نه مصرف فعلی: هیچ فرایند دیگری اسکریپت را صدا نمی‌زند و ارجاع‌های موجود روی main فقط در ابزار گزارش است. طرح حذف/جایگزینی امن: حذف literal و خواندن مقدار از آرگومان یا متغیر env در زمان اجرا با توقف امن در نبود آن (همان الگوی C8)، بدون تغییر مقدار و بدون نیاز به Rotate (اختیاری فقط اگر مالک صلاح بداند)؛ ترتیب اجرا: پیش از هر گفت‌وگویی دربارهٔ push از fix، همراه P0-5 در Stage 4 با مجوز مالک."));
body.push(h2("۸-۲. C9 — آیا خروج .evidence-session-token از index واقعاً لازم است؟"));
body.push(paraS("وضعیت: فایل فقط روی main tracked است (کامیت 87834e5 — 2026-10-29 20:41 UTC)، در worktree موجود است، اثرانگشتش با ثبت رجیستر برابر است و از fix و هر دو مرجع origin غایب است. توکن مردهٔ ساختاری است: انقضای ۲۴ساعته‌اش گذشته، هیچ رکورد Session معادلی در DB فعلی نیست (۰ از ۰) و منطق resolveUser توکن‌های زیر بیست نویسه را رد می‌کند؛ بنابراین از نظر امنیتی اثر افشای آن تقریباً صفر است. وابستگی‌ها: هیچ فرایند جاری روی main این فایل را مصرف نمی‌کند (فقط ارجاع‌های گزارشی)؛ روی fix، اسکریپت mint آن را تولید و capture-corrective-360.cjs مصرفش می‌کند — خروج از index روی main اثری بر آن‌ها ندارد. نتیجه: خروج از index الان لازم نیست و هیچ‌یک از فرایندها را نمی‌شکند؛ اما دو شرط آن را در آینده ضروری می‌کند: (الف) هر push آینده از main فایل را عمومی می‌کند و خروج از index (با git rm --cached و حفظ فایل در worktree) پیش‌شرط آن است؛ (ب) چون هیچ‌یک از دو شاخه الگوی .evidence-* را در .gitignore ندارند، ریسک افزودن تصادفی فایل‌های مشابه آینده وجود دارد. توصیه: انجام هر دو (خروج از index + الگوی gitignore) به‌عنوان نظافت برنامه‌ریزی‌شده در Stage 4 با مجوز مالک؛ در این مأموریت هیچ فایل یا تاریخچه‌ای تغییر نکرده است."));

// ── ۹. کنترل نهایی ──
body.push(h1("۹. کنترل نهایی مخزن"));
body.push(cap("جدول ۳ — کنترل نهایی در پایان Stage 2 (2026-10-31)"));
body.push(tblsz(["مورد", "مقدار"], [
  ["git status --porcelain", "فقط فایل‌های untracked ابزاری همین مأموریت (هشت اسکریپت در scripts/) — صفر تغییر tracked، صفر حذف، صفر جابه‌جایی"],
  ["HEAD (full)", SHA.head],
  ["SHA شاخهٔ main", SHA.main + " (برابر HEAD)"],
  ["SHA شاخهٔ fix/corrective-mission-360", SHA.fix + " — بدون تغییر"],
  ["SHA origin/main", SHA.origin_main + " — بدون تغییر"],
  ["SHA origin/feature/ambient-motion-polish", SHA.origin_feature + " — بدون تغییر"],
  ["وضعیت Worktree", "دقیقاً یک worktree (my-project روی main)؛ کی‌استور، .evidence-password و .evidence-session-token در worktree موجود و tracked-on-main — بدون هیچ تغییری"],
  ["فایل‌های تغییرکرده (tracked)", "هیچ — صفر"],
  ["فایل‌های جدید untracked این مأموریت", "scripts/p06r_stage2_probe.py، scripts/p06r_ksdiag.py، scripts/p06r_ks_sweep.py، scripts/p06r_local_probe.py، scripts/p06r_ksadj_audit.py، scripts/p06r_ks_structure.py، scripts/p06r_ks_final.py، scripts/p06r_stage2_scan.py، scripts/p06r_lo_bisect.js، scripts/gen-p06r-stage2-report.js — جمعاً ده فایل"],
  ["خروجی‌های شواهد (gitignored)", "download/P0_6R_evidence/*.json (پنج فایل ماسک‌شده) و خود این سند در download/P0_6R/"],
  ["تأیید عدم عملیات ممنوعه", "هیچ Push، PR، Merge، Force-Push، Rewrite تاریخچه، حذف blob، Rotate یا Revoke انجام نشده است؛ تنها اجرای مجاز، آزمون محلی بازیابی کی‌استور روی کپی موقت (بدون تغییر فایل اصلی) و سرشماری فقط-خواندنی DB روی کپی /tmp بود"],
], [30, 70], 20, 20, true));
body.push(paraS("اگر هرگونه تغییر ناخواسته‌ای مشاهده شود، دستور توقف ابلاغ شده است: هیچ اصلاحی پیش از گزارش انجام نخواهد شد. مطابق بررسی بالا هیچ تغییری جز فایل‌های ابزاری untracked و خروجی‌های ignored به وقوع نپیوسته است."));

// ── ۱۰. شرط خاتمه ──
body.push(h1("۱۰. شرط خاتمه و انتظار مجوز"));
body.push(paraS("این گزارش فقط خروجی Stage 2 است: شناسنامهٔ استقرار، مالکیت، مصرف و وضعیت اعتبارنامه‌های C1، C2، C3، C5، C7، C8، C9 و C10 به‌همراه طرح‌های امن (پشتیبان C3، اصلاح P0-5 برای C8، Sanitize برای C7 و نظافت C9) که هیچ‌کدام اجرا نشده‌اند. سه پرسش باز که فقط مالک می‌تواند پاسخ دهد و تعیین‌کنندهٔ چرخش‌های مشروط است: (۱) آیا در دوره‌های v1، v2.0/v2.1، ممیزی ۳۶۰ یا راستی‌آزمایی زندهٔ v2، استقراری خارج از این محیط وجود داشته است؟ (۲) آیا رمز واقعی فایل کی‌استور فعلی نزد مالک (یا پشتیبان مستقل او) موجود است؟ (۳) آیا مقدار فعلی C8 و C7 باید عوض شود یا فقط از مخزن حذف شود؟ تا پاسخ صریح مالک، هیچ عملیات اجرایی روی اعتبارنامه‌ها انجام نمی‌شود و تصمیم NO-GO پابرجا می‌ماند."));

// ── پیوست الف ──
body.push(h1("پیوست الف — بازتولید شواهد"));
body.push(paraS("ده اسکریپت ابزاری ماسک‌شدهٔ این مأموریت در scripts/ (untracked) نگهداری می‌شوند: p06r_stage2_probe.py (تثبیت مراجع، اثرانگشت‌ها، مصرف‌کنندگان، سرشماری DB، وضعیت mint و C7/C9)، p06r_ksdiag.py و p06r_ks_sweep.py (جاروهای رمز کی‌استور با openssl/keytool روی کپی موقت)، p06r_local_probe.py (مسیرهای محلی untracked و نقشهٔ متغیرها)، p06r_ksadj_audit.py و p06r_ks_structure.py (بازرسی ماسک‌شدهٔ فایل‌های مجاور کی‌استور)، p06r_ks_final.py (ریز-آزمون و جاروی توکن)، p06r_stage2_scan.py (اسکن ایمنی ماسک‌شدهٔ همین سند)، p06r_lo_bisect.js (هارنس عیب‌یابی رندر LibreOffice) و gen-p06r-stage2-report.js (تولید همین سند). خروجی‌های JSON ماسک‌شده در download/P0_6R_evidence/ ذخیره شده‌اند: p06r_stage2_probe.json، p06r_stage2_ksdiag.json، p06r_stage2_ks_sweep.json، p06r_stage2_ksadj_audit.json، p06r_stage2_local_probe.json، p06r_stage2_keytool_structure.json و p06r_stage2_ks_final.json. در هیچ اسکریپتی مقدار خامی چاپ یا ذخیره نشده است؛ هر مقدار فقط با اثرانگشت SHA-256 (۱۲ نویسهٔ نخست) و طولش ارجاع می‌شود."));

// ── سند ──
const A4P = { width: 11906, height: 16838 };
// docx lib swaps width/height itself when orientation is LANDSCAPE — pass portrait dims
const A4L = { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE };
const marginBody = { top: 1440, bottom: 1440, left: 1417, right: 1701 };

// BISECT env: cover | toc | body | land | full (default full)
const BISECT = process.env.BISECT || "full";
const sectionsAll = {
  cover: { properties: { page: { size: A4P, margin: { top: 0, bottom: 0, left: 0, right: 0 } } }, children: buildCoverR1({
    title: "شناسنامهٔ استقرار و مالکیت اعتبارنامه‌ها — Stage 2",
    subtitle: "خروجی مأموریت P0-6R Stage 2 بر مبنای دستور مالک 2026-10-31 — فقط شناسایی و مستندسازی، بدون هرگونه اقدام اجرایی",
    englishLabel: "RAHYAR P0-6R STAGE 2 — DEPLOYMENT & CREDENTIAL OWNERSHIP INVENTORY",
    metaLines: [
      "RAHYAR_P0_6R_STAGE2_DEPLOYMENT_OWNERSHIP_INVENTORY",
      "main @ eba15aa · fix @ fc71e84 · origin/main @ 28b64bb",
      "C1/C2/C5/C10: INACTIVE در محدودهٔ شواهد — localhost:3000/3100، بدون استقرار عمومی",
      "C3: ادعای رجیستر رد شد — کی‌استور فعلی با هیچ مقدار مخزنی باز نمی‌شود (~۳۹هزار کاندیدا)",
      "C8/P0-5: پابرجا — literal، بدون env، بدون fail-closed، بدون تست",
      "تصمیم پابرجا: NO-GO — انتظار مجوز جداگانهٔ مالک",
    ],
    footerRight: "رهیار AI", footerLeft: "گزارش P0-6R / Stage 2 — محرمانه",
  }) },
  toc: {
    properties: { type: SectionType.NEXT_PAGE, page: { size: A4P, margin: marginBody, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
    headers: { default: pageHeader() }, footers: { default: pageFooter() },
    children: [
      new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 }, children: [r("فهرست مطالب", { bold: true, size: 32, color: P.primary })] }),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
      new Paragraph({ bidirectional: true, spacing: { before: 200 }, children: [r("یادآوری: پس از باز کردن سند، برای به‌روزرسانی شماره صفحه‌ها روی فهرست راست‌کلیک و «Update Field» را انتخاب کنید.", { italics: true, size: 18, color: "888888" })] }),
    ],
  },
  bodySec: {
    properties: { type: SectionType.NEXT_PAGE, page: { size: A4P, margin: marginBody, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
    headers: { default: pageHeader() }, footers: { default: pageFooter() },
    children: (() => {
      const BF = process.env.BODY_FILTER || "";
      let arr = body;
      if (BF === "notbl") arr = body.filter((el) => !(el instanceof Table));
      if (BF === "nohead") arr = body.filter((el) => !(el.heading));
      if (BF.startsWith("r")) { const [a, b] = BF.slice(1).split("-").map(Number); arr = body.slice(a, b); }
      return arr;
    })(),
  },
  land: {
    properties: { type: SectionType.NEXT_PAGE, page: { size: A4L, margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
    headers: { default: pageHeader() }, footers: { default: pageFooter() },
    children: masterLandscape,
  },
};
const orderMap = { cover: ["cover"], toc: ["cover", "toc"], body: ["cover", "toc", "bodySec"], land: ["cover", "toc", "land"], full: ["cover", "toc", "bodySec", "land"] };
const secList = (process.env.BODY_HALF === "1" || process.env.BODY_HALF === "2"
  ? [sectionsAll.cover, sectionsAll.toc, sectionsAll.bodySec]
  : orderMap[BISECT]).map((k) => (typeof k === "string" ? sectionsAll[k] : k));

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FA, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } },
      heading1: { run: { font: FA, size: 32, bold: true, color: P.primary }, paragraph: { spacing: { before: 380, after: 170, line: 380 }, outlineLevel: 0 } },
      heading2: { run: { font: FA, size: 28, bold: true, color: P.primary }, paragraph: { spacing: { before: 260, after: 130, line: 360 }, outlineLevel: 1 } },
    },
  },
  sections: secList,
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, buf);
  console.log("DOCX written:", OUT, (buf.length / 1024).toFixed(0) + "KB");
});
