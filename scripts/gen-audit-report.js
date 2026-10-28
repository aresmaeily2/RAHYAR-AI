// ─── گزارش ارتقای ممیزی ۳۶۰ درجه رهیار AI — DOCX فارسی RTL ───
// زیرساخت RTL بازاستفاده‌شده از gen-final-report-v22.js (postcheck 9/9)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, HeadingLevel, TableOfContents,
  SectionType, NumberFormat, Footer, Header, SimpleField, ShadingType,
  TableLayoutType, ImageRun, VerticalAlign,
} = require("docx");
const fs = require("fs");
const { imageSize: sizeOf } = require("image-size");

const P = {
  bg: "162235", titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078",
  accent: "37DCF2", primary: "1B6B7A", body: "182430", secondary: "50626E",
  ok: "1E7D46", warn: "A66A21",
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };
const r = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FA, size: o.size ?? 24, bold: o.bold, color: o.color ?? P.body, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: 312, before: o.before ?? 0, after: o.after ?? 140 }, children: Array.isArray(children) ? children : [r(children, o.run || {})], keepNext: o.keepNext });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, spacing: { before: 380, after: 170, line: 380, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 32, color: P.primary })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 260, after: 130, line: 360, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 28, color: P.primary })] });
const bullet = (t, o = {}) => para([r("•  ", { color: P.accent, bold: true }), r(t, o.run || {})], { align: AlignmentType.START, after: 80 });
const code = (t) => para([r(t, { size: 18, color: P.secondary })], { align: AlignmentType.START, after: 120 });

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { ...noBorders, insideHorizontal: NB, insideVertical: NB };

function tbl(headers, rows, widths) {
  const mk = (t, i, isHead, w) => new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: isHead ? P.table.headerBg : (i % 2 ? P.table.surface : "FFFFFF") },
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START, spacing: { line: 276 }, children: [r(String(t), { size: isHead ? 21 : 20, bold: isHead, color: isHead ? P.table.headerText : P.body })] })],
  });
  const trs = [new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((t, i) => mk(t, 0, true, widths[i])) })];
  rows.forEach((row, i) => trs.push(new TableRow({ cantSplit: true, children: row.map((t, j) => mk(String(t), i, false, widths[j])) })));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: { ...allNoBorders, bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
    rows: trs,
  });
}
const cap = (t) => para([r(t, { size: 20, bold: true, color: P.secondary })], { align: AlignmentType.START, keepNext: true, after: 60 });

const SHOTS = "/home/z/my-project/download/audit-v2";
function img(file, widthPx = 420) {
  const fp = SHOTS + "/" + file;
  const buf = fs.readFileSync(fp);
  const dim = sizeOf(buf);
  const h = Math.round((widthPx * dim.height) / dim.width);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 140, after: 40 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: h } })],
  });
}
const imgCap = (t) => para([r(t, { size: 18, color: P.secondary })], { align: AlignmentType.CENTER, after: 200 });

// ── R1 cover (recipe) ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const fit = (pt) => Math.max(1, Math.floor(maxWidthTwips / (pt * 20 * 1.05)));
  let pt = preferredPt;
  while (pt > minPt && fit(pt) < title.length) pt -= 2;
  if (title.length <= fit(pt)) return { titlePt: pt, titleLines: [title] };
  const mid = Math.ceil(title.length / 2);
  let cut = title.indexOf(" ", mid);
  if (cut < 0 || cut > mid + 12) cut = title.lastIndexOf(" ", mid);
  if (cut <= 0) cut = mid;
  return { titlePt: pt, titleLines: [title.slice(0, cut).trim(), title.slice(cut).trim()] };
}
function calcCoverSpacing(q) {
  const titleH = q.titleLineCount * Math.ceil(q.titlePt * 23) + (q.titleLineCount - 1) * 100 + 300;
  const subH = q.hasSubtitle ? 500 + 800 : 0;
  const engH = q.hasEnglishLabel ? 320 + 500 : 0;
  const metaH = (q.metaLineCount || 0) * 420;
  const footH = q.fixedHeight || 400;
  const used = titleH + subH + engH + metaH + footH;
  const free = Math.max(1200, 15638 - used);
  const top = Math.min(5000, Math.round(free * 0.42));
  const bottom = Math.min(5000, Math.round(free * 0.58));
  return { topSpacing: top, bottomSpacing: bottom };
}
function buildCoverR1(cfg) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(cfg.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({ titleLineCount: titleLines.length, titlePt, hasSubtitle: !!cfg.subtitle, hasEnglishLabel: !!cfg.englishLabel, metaLineCount: (cfg.metaLines || []).length, fixedHeight: 400 });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (cfg.englishLabel) children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [new TextRun({ text: cfg.englishLabel.split("").join("  "), size: 18, color: P.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
  }));
  for (let i = 0; i < titleLines.length; i++) children.push(new Paragraph({
    indent: { left: padL },
    spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
    children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
  }));
  if (cfg.subtitle) children.push(new Paragraph({
    indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: cfg.subtitle, size: 24, color: P.subtitleColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
  }));
  for (const line of (cfg.metaLines || [])) children.push(new Paragraph({
    indent: { left: padL + 200 }, spacing: { after: 80 },
    border: { left: accentLeft },
    children: [new TextRun({ text: line, size: 24, color: P.metaColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
  }));
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: cfg.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: cfg.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

// ═══════════ بدنهٔ گزارش ═══════════
const body = [];

body.push(h1("۱. خلاصهٔ اجرایی"));
body.push(para("این گزارش نتیجهٔ اعمال کامل هفت یافتهٔ ممیزی ۳۶۰ درجهٔ رهیار AI و راستی‌آزمایی زندهٔ آن‌ها است. هر هفت یافته (حفرهٔ SSRF در Caddy، Self-DoS در محدودساز نرخ، بهینه‌سازی SQLite، پایداری زمان‌بند، ذخیرهٔ متادیتای استریم، بهداشت بیلد و بهداشت گیت) اکنون در کد نهایی اعمال شده، با گیت کیفیت کامل (تایپ‌چک + لینت + ۲۱۶ آزمون واحد) تأیید شده و سرور پروداکشن با نسخهٔ اصلاح‌شده به‌صورت زنده اجرا و از تمام صفحات آن اسکرین‌شات گرفته شده است. علاوه بر هفت یافته، سه ارتقای تکمیلی نیز اعمال شد: الگوریتم اخراج سبد نرخ از FIFO به LRU ارتقا یافت، اسکریپت پاک‌سازی تاریخچهٔ گیت (یافتهٔ ۷-الف) به‌صورت اجراپذیر ساخته شد و فایل‌های مرده/ناقصی که سلامت بیلد را تهدید می‌کردند حذف شدند."));
body.push(para("بستهٔ اندروید نسخهٔ ۲.۱.۰ (ویراست user با نسخهٔ ۲۲ و ویراست owner با نسخهٔ ۲۳) با موفقیت بیلد و با کلید انتشار (RSA-4096) امضا شد. رابط کاربری محلی اپ — همان دارایی‌هایی که داخل APK اجرا می‌شوند — به‌صورت زنده اجرا و از تمام صفحات اسکرین‌شات تهیه شد. طبق اصل صداقت پروژه: اجرای APK روی دستگاه اندروید واقعی در این محیط (بدون KVM/امولاتور) انجام نشده و به‌درستی «آزمایش‌نشده» ثبت می‌شود؛ همهٔ مدارک موجود، اجرای واقعی کد است نه شبیه‌سازی نتایج.", { run: { color: P.body } }));

body.push(h1("۲. وضعیت اعمال یافته‌های هفت‌گانه"));
body.push(cap("جدول ۱ — یافته، اقدام اعمال‌شده، وضعیت و مدرک"));
body.push(tbl(
  ["یافته", "اقدام اعمال‌شده", "وضعیت", "مدرک"],
  [
    ["۱ — SSRF در Caddyfile", "حذف کامل پروکسی پویای ?XTransformPort=، سفیدلیست ثابت /ws/*، request_body max_size 1MB، فشرده‌سازی zstd/gzip با استثنای SSE، flush_interval -1", "✅ اعمال", "Caddyfile v1.3.0"],
    ["۲ — Self-DoS و Regex حذف", "clientKey با اثرانگشت هش‌شدهٔ کوکی نشست (sess:*)، سقف MAX_BUCKETS با اخراج LRU، حذف «رسمش کن» از فعل‌های حذف + مرز کلمه‌ای + پشتیبانی نیم‌فاصله", "✅ اعمال + ارتقا (LRU)", "security.ts + آزمون رگرسیون"],
    ["۳ — SQLite هم‌زمانی", "WAL + busy_timeout=5000 + synchronous=NORMAL + foreign_keys + temp_store=MEMORY + cache 32MB + استخر تک‌کانالهٔ پراگما-دار", "✅ اعمال", "لاگ زندهٔ سرور: journal_mode=wal"],
    ["۴ — تداخل تیک زمان‌بند", "گارد isRunning (موکس درون‌پروسه‌ای)، تراکنش اتمیک updateMany+createMany (ضد N+1)، respawn فقط برای کاربران دارای کار تکرارشونده (distinct روی Task)، تایمر unref و خاموشی نجیب", "✅ اعمال", "scheduler.ts v1.3.0"],
    ["۵ — گم‌شدن متادیتای استریم", "شرط hasMetadata در هر دو مسیر stream و chat — ذخیرهٔ followups/sources حتی با actions خالی", "✅ اعمال", "اسکرین‌شات زندهٔ چیپ‌های پیشنهاد"],
    ["۶ — بهداشت بیلد", "start بدون پایپ tee (خروجی صحیح برای systemd/Docker)، playwright/prisma در devDependencies، reactStrictMode: true، نسخهٔ ۱.۳.۰", "✅ اعمال", "package.json + next.config.ts"],
    ["۷ — بهداشت گیت و CI", "پایپ‌لاین GitHub Actions موجود (.github/workflows/ci.yml) + اسکریپت اجراپذیر scripts/git-history-purge.sh برای حذف بلاب‌های .env/*.db از کل تاریخچه با git-filter-repo", "✅ اعمال", "فایل‌ها در کامیت 3de876b"],
  ],
  [16, 44, 14, 26]
));
body.push(para("یادداشت شفافیت: عمدهٔ اصلاحات پیش‌تر در کامیت پایهٔ ۱۸۴e31d (نسخهٔ ۱.۳.۰) نشسته بود؛ در این مرحله نسخهٔ کاری بازگردانده‌شده به حالت ۱.۲.۰ با نسخهٔ نهایی همگام شد، ارتقای LRU و اسکریپت پاک‌سازی تاریخچه افزوده شد و کل مجموعه با گیت کیفیت بازرستی‌آزمایی و در کامیت 3de876b ثبت گردید."));

body.push(h1("۳. ریز تغییرات و اثر هر یافته"));
body.push(h2("۳.۱ — بستن حفرهٔ SSRF (Caddyfile)"));
body.push(para("بلوک reverse_proxy localhost:{query.XTransformPort} هر پورت دلخواه کلاینت را به localhost سرور می‌کشاند و ابزار پویش و نفوذ به سرویس‌های داخلی (دیتابیس، صف پیام، پنل مدیریتی) فراهم می‌کرد. در نسخهٔ جدید هیچ ورودی کلاینتی در مسیر پروکسی نیست؛ تنها یک سفیدلیست ثابت برای وب‌سوکت آینده روی پورت ۳۰۰۱ باقی است. مهار بدنه در لبه (۱MB) پیش از رسیدن به Node/Bun، فشرده‌سازی پاسخ برای کلاینت موبایل و flush فوری SSE پایداری استریم چت را تضمین می‌کند."));
body.push(h2("۳.۲ — مقاوم‌سازی محدودساز نرخ (security.ts)"));
body.push(para("با نبود TRUST_PROXY_HEADERS=1 قبلاً همهٔ بازدیدکنندگان اینترنت در سطل «local» ادغام می‌شدند و ده تلاش ناموفق مهاجم، ورود مالک را هم قفل می‌کرد. اکنون درخواست‌های دارای کوکی نشست با ۱۲ نویسهٔ اول SHA-256 کوکی در سطل مستقل sess:* قرار می‌گیرند. سقف ۱۰هزار سبدی هم از FIFO به LRU ارتقا یافت: با هر دسترسی، ترتیب Map بازآرایی می‌شود تا سبد کاربرِ فعال هرگز قربانی سیل کلیدهای جعلی نشود. در Regex فعل حذف، واژهٔ مبهم «رسمش کن» حذف، مرز کلمه‌ای دوطرفه اضافه و نیم‌فاصلهٔ یونیکد بین اجزای فعل پذیرفته شد؛ آزمون رگرسیون اختصاصی (۷ ادعا) این رفتار را قفل می‌کند."));
body.push(h2("۳.۳ — سخت‌سازی SQLite (db.ts)"));
body.push(para("چت استریمی و زمان‌بند ۶۰ ثانیه‌ای هم‌زمان روی یک فایل SQLite می‌نویسند. فعال‌سازی WAL خواندن هم‌زمان با نوشتن را ممکن می‌کند، busy_timeout=5000 به‌جای خطای فوری SQLITE_BUSY تا پنج ثانیه صف می‌ایستد و synchronous=NORMAL تعادل بهینهٔ سرعت/دقت دیسک را در حالت WAL می‌دهد. استخر پیش‌فرض تک‌کاناله تضمین می‌کند پراگماهای per-connection روی همهٔ کوئری‌ها اعمال شوند؛ با RAHYAR_DB_CONNECTION_LIMIT قابل بازنویسی است. این رفتار در سرور زنده به‌صورت «journal_mode=wal» لاگ شد."));
body.push(h2("۳.۴ — زمان‌بند بدون تداخل و بدون N+1"));
body.push(para("گارد isRunning مانع اجرای موازی دو تیک می‌شود؛ ثبت منقضی‌های یادآور و تغییر وضعیت آن‌ها در یک تراکنش اتمیک انجام می‌شود (قبلاً به‌ازای هر رکورد یک کوئری جدا زده می‌شد) و respawn تکرارشونده‌ها فقط روی کاربرانی که واقعاً کار daily/weekly دارند (distinct روی Task) می‌چرخد، نه اسکن کامل جدول User. تایمر unref شده و SIGTERM/SIGINT آن را پاک می‌کنند تا خاموشی سرویس تمیز بماند."));
body.push(h2("۳.۵ — متادیتای استریم دیگر گم نمی‌شود"));
body.push(para("شرط جدید hasMetadata = actions.length > 0 || followups.length > 0 || sources.length > 0 در مسیر استریم و مسیر غیراستریم اعمال شد؛ پیام‌های پاسخ‌محور که فقط پیشنهاد ادامه یا منبع وب دارند، پس از رفرش صفحه کامل بازسازی می‌شوند. اسکرین‌شات زندهٔ بخش ۵ این گزارش همین رفتار را نشان می‌دهد: چیپ‌های پیشنهاد پس از پاسخ قطعیِ بدون اکشن، ذخیره و نمایش داده شده‌اند."));
body.push(h2("۳.۶ — بیلد تمیز پروداکشن"));
body.push(para("اسکریپت start دیگر خروجی را به tee پایپ نمی‌کند؛ در صورت کرش سرور، کد خروج غیرصفر به systemd/Docker می‌رسد. playwright و prisma CLI در devDependencies هستند و حجم نصب پروداکشن را سنگین نمی‌کنند. reactStrictMode فعال است تا نشت حافظه در افکت‌های WebAudio/EventSource/تایمر در توسعه آشکار شود."));
body.push(h2("۳.۷ — بهداشت گیت و CI"));
body.push(para("پایپ‌لاین GitHub Actions (ci.yml) روی هر push و pull-request، گیت کیفیت (typecheck+lint+test) و بیلد استندالون پروداکشن را با Bun اجرا می‌کند. اسکریپت scripts/git-history-purge.sh (یافتهٔ ۷-الف) با بکاپ خودکار، حذف .env و *.db از کل تاریخچه با git-filter-repo (fallback به filter-branch)، expire/gc و اعتبارسنجی نهایی همراه است؛ این اسکریپت باید توسط مالک روی مخزن اصلی اجرا شود و پس از آن، چرخاندن هر توکن افشاشده و کلون مجدد همکاران الزامی است."));

body.push(h1("۴. راستی‌آزمایی زنده (شواهد اجرا)"));
body.push(tbl(
  ["سنجه", "نتیجه", "یادداشت"],
  [
    ["گیت کیفیت (typecheck + lint + test)", "۲۱۶ از ۲۱۶ پاس", "شامل آزمون رگرسیون «رسمش کن» و مرز کلمه‌ای"],
    ["بیلد استندالون پروداکشن", "موفق — Next.js 16.4.2 (Turbopack)", "همهٔ مسیرها کامپایل؛ Proxy (Middleware) فعال"],
    ["بوت سرور پروداکشن", "سلامت — /api/health ok", "پاسخ در ۲-۳ میلی‌ثانیه"],
    ["پراگماهای SQLite", "journal_mode=wal لاگ شد", "مدرک زندهٔ یافتهٔ ۳"],
    ["زمان‌بند پس‌زمینه", "شروع شد (تیک ۶۰ ثانیه)", "با گارد هم‌زمانی"],
    ["راه‌اندازی مالک + ورود", "HTTP 200 — کوکی نشست صادر شد", "scrypt نسخه‌بندی‌شده"],
    ["دادهٔ نمونه (کار/یادآور)", "HTTP 200/201", "از API واقعی با نشست معتبر"],
    ["پرسش مسیر قطعی در چت", "پاسخ فوری + چیپ‌های پیشنهاد", "مدرک زندهٔ یافتهٔ ۵"],
  ],
  [34, 30, 36]
));

body.push(h1("۵. اسکرین‌شات صفحات (نسخهٔ پروداکشن پس از ممیزی)"));
body.push(para("ویوپورت موبایل ۴۱۲×۹۱۵ (معادل WebView اندروید) با منطقهٔ زمانی تهران و زبان فارسی. تصویر چت، مدرک زندهٔ یافتهٔ ۵ است: پاسخ مسیر قطعی با چیپ‌های پیشنهاد ادامه که بدون اکشن، ذخیره و پس از رفرش بازیابی می‌شوند."));
body.push(img("screens-web/06b-chat-answer.png"));
body.push(imgCap("دستیار هوشمند — پاسخ مسیر قطعی با چیپ‌های پیشنهاد (مدرک یافتهٔ ۵)"));
body.push(img("screens-web/03-today.png"));
body.push(imgCap("نمای امروز — وظایف با اولویت، ساعت و برچسب"));
body.push(img("screens-android/01-home.png"));
body.push(imgCap("اپ اندروید — خانهٔ محلی با تاریخ جلالی، آمار و شفافیت نسخه"));
body.push(img("screens-android/02-tasks.png"));
body.push(imgCap("اپ اندروید — وظایف با اولویت و تاریخ جلالی (UI داخل APK)"));
body.push(para("مجموعهٔ کامل: ۱۱ اسکرین‌شات وب (ورود، ورود پرمشده، امروز، کارها، تقویم، دستیار، پاسخ دستیار، برنامه، مالی، تنظیمات، دسکتاپ) و ۶ اسکرین‌شات اپ اندروید (خانه، وظایف، یادآورها، تنظیمات، تنظیمات تاریک، خانهٔ تاریک) در بستهٔ rahyar-v2-screenshots.zip ارائه شده است."));

body.push(h1("۶. اپ اندروید نسخهٔ ۲.۱.۰ — بیلد، امضا و حدود آزمون"));
body.push(para("هر دو ویراست از یک سورس واحد بیلد شدند: ویراست user با شناسهٔ com.rahyarai.app (versionCode 22) و ویراست owner با com.rahyarai.app.owner (versionCode 23). امضای release با کلید RSA-4096 تولیدشدهٔ محلی انجام شد و امضای خروجی با apksigner راستی‌آزمایی شد (اثر انگشت SHA-256 گواهی: 6de79fc8…13ef79). حجم هر APK تنها حدود ۴۱۶ کیلوبایت است. مجوزها حداقلی‌اند: INTERNET برای حالت متصل اختیاری، POST_NOTIFICATIONS و SCHEDULE_EXACT_ALARM و RECEIVE_BOOT_COMPLETED و VIBRATE برای یادآورهای سیستم."));
body.push(para("معماری اپ «مستقل از هاست» است: صفحهٔ اصلی و منوها از دارایی‌های داخل APK روی مبدأ امن appassets.androidplatform.net اجرا می‌شوند، داده‌ها در فایل JSON خصوصی اپ ذخیره می‌شود و اتصال به سرور یک گزینهٔ اختیاری از تنظیمات است. آزمون‌های واحد اندروید (شامل قرارداد آفلاین که عدم وجود هر URL/مسیر شبکه در دارایی‌های UI را تضمین می‌کند) پاس شدند."));
body.push(bullet("اعمال‌شده و آزمون‌شده: بیلد موفق هر دو ویراست، امضای معتبر، آزمون‌های واحد JVM پاس، اجرای زندهٔ UI محلی (همان دارایی‌های APK) با شیم پل بومی و اسکرین‌شات تمام صفحات.", { run: { color: P.ok } }));
body.push(bullet("آزمایش‌نشده: نصب و اجرای APK روی دستگاه اندروید واقعی — این محیط فاقد KVM/امولاتور است؛ طبق اصل صداقت، این مورد ادعا نمی‌شود و اجرای اولیه روی گوشی بر عهدهٔ مالک است.", { run: { color: P.warn } }));

body.push(h1("۷. بسته‌های تحویل و لینک‌های دانلود"));
body.push(cap("جدول ۲ — فایل‌ها، حجم و اثر انگشت SHA-256 (۱۶ نویسهٔ اول)"));
body.push(tbl(
  ["فایل", "حجم", "SHA-256 (کوتاه)"],
  [
    ["rahyar-android-v2.1.0-user.apk", "۴۱۶KB", "5ae2ed2adfe448db"],
    ["rahyar-android-v2.1.0-owner.apk", "۴۱۶KB", "c20f3924c16bae0d"],
    ["rahyar-android-source-v2.1.0.zip", "۱۱۹KB", "c8f4a2767d46308a"],
    ["rahyar-v2-screenshots.zip", "۱۷.۲MB", "20eacc6f1add8017"],
  ],
  [46, 18, 36]
));
body.push(para("لینک‌های GoFile (پایدار): فایل user — gofile.io/d/CxGzmm4d | فایل owner — gofile.io/d/otdXODNg | سورس اندروید — gofile.io/d/MVsTDFbl | اسکرین‌شات‌ها — gofile.io/d/BupdZ381"));
body.push(para("لینک‌های مستقیم tmpfiles.org (موقت، حداکثر ۶۰ دقیقه): user — tmpfiles.org/dl/wHAlL8xNIj7h | owner — tmpfiles.org/dl/wUALLYxJIxy8 | سورس — tmpfiles.org/dl/wGAULdxMIHXK | اسکرین‌شات‌ها — tmpfiles.org/dl/wlABL1xPIxah"));
body.push(para("سورس اندروید عمداً بدون keystore.properties و فایل کلید بسته شده است (اصل «هیچ رمزی در بستهٔ عمومی»)؛ مسیر ساخت و امضا در README اندروید مستند است و کلید انتشار فعلی فقط روی این ماشین می‌ماند. در صورت تمایل به انتشار عمومی، مالک باید keystore خودش را تولید کند."));

body.push(h1("۸. گام‌های بعدی پیشنهادی"));
body.push(bullet("اجرای scripts/git-history-purge.sh روی مخزن اصلی (پس از بکاپ)، سپس force-push و کلون مجدد همکاران؛ در صورت افشای واقعی توکن قدیمی، چرخاندن توکن الزامی است و پاک‌سازی تاریخچه به‌تنهایی کافی نیست."));
body.push(bullet("نصب APK ویراست user روی گوشی اندروید ۷ به بالا و آزمون دستی جریان‌های محلی (وظیفه، یادآور، پشتیبان‌گیری) — سپس علامت‌گذاری «آزمایش‌شده روی دستگاه» در CHANGELOG."));
body.push(bullet("پوش دادن کامیت 3de876b به مخزن aresmaeily2 تا CI جدید روی GitHub اجرا شود و وضعیت سبز پایپ‌لاین در README نمایش داده شود."));
body.push(bullet("برای تحویل یادآور واقعاً سرور-محور در نسخه‌های بعد، افزودن Web Push (VAPID) مطابق docs/REMINDERS_PLATFORMS.md تا وابستگی به باز بودن تب حذف شود."));

// ═══════════ سند ═══════════
const footerArabic = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* arabic \\* MERGEFORMAT", "1")] })] });
const footerRoman = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* ROMAN \\* MERGEFORMAT", "i")] })] });
const bodyHeader = new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } }, children: [r("گزارش ارتقای ممیزی ۳۶۰ درجهٔ رهیار AI — نسخهٔ ۱.۳.۰", { size: 16, color: P.secondary })] })] });

const doc = new Document({
  creator: "RahyAr",
  title: "گزارش ارتقای ممیزی ۳۶۰ درجهٔ رهیار AI — اعمال هفت یافته، راستی‌آزمایی زنده و بستهٔ اندروید ۲.۱.۰",
  styles: {
    default: {
      document: { run: { font: FA, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } },
      heading1: { run: { font: FA, size: 32, bold: true, color: P.primary }, paragraph: { spacing: { before: 380, after: 170 } } },
      heading2: { run: { font: FA, size: 28, bold: true, color: P.primary }, paragraph: { spacing: { before: 260, after: 130 } } },
    },
  },
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: buildCoverR1({
        englishLabel: "RAHYAR  AI  —  360  AUDIT  UPGRADE  REPORT",
        title: "گزارش ارتقای ممیزی ۳۶۰ درجهٔ رهیار AI",
        subtitle: "اعمال هفت یافتهٔ بحرانی، ارتقای LRU، راستی‌آزمایی زنده و بستهٔ اندروید مستقل ۲.۱.۰",
        metaLines: [
          "نسخهٔ وب: 1.3.0 — کامیت 3de876b",
          "نسخهٔ اندروید: 2.1.0 — user vc22 / owner vc23 (امضاشده)",
          "گیت کیفیت: ۲۱۶/۲۱۶ آزمون — بیلد پروداکشن موفق",
          "تاریخ: ۷ آبان ۱۴۰۵ (۲۹ اکتبر ۲۰۲۶)",
        ],
        footerRight: "تهیه‌شده برای مالک محصول رهیار",
        footerLeft: "شامل مدارک اجرای زنده",
      }),
    },
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
      footers: { default: footerRoman },
      children: [
        new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 300, line: 500, lineRule: "atLeast" }, children: [r("فهرست مطالب", { bold: true, size: 36, color: P.primary })] }),
        new TableOfContents("فهرست", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ bidirectional: true, spacing: { before: 220 }, children: [r("برای تازه‌سازی شماره صفحات، روی فهرست راست‌کلیک کرده و گزینه Update Field را انتخاب کنید.", { italics: true, size: 18, color: "8A94A0" })] }),
      ],
    },
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: bodyHeader },
      footers: { default: footerArabic },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/home/z/my-project/download/audit-v2/pkg/گزارش_ارتقای_ممیزی_۳۶۰_رهیار_v1.3.0.docx";
  fs.writeFileSync(out, buf);
  console.log("OK:", out, buf.length, "bytes");
});
