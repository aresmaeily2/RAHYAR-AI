// ─── گزارش نهایی مأموریت یکپارچه رهیار v2.1.0 — DOCX فارسی RTL ───
// الگو: recipes تأییدشده مهارت docx (جلد R1-RTL، فهرست رومی، بدنه Arabic، postcheck)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, WidthType, BorderStyle,
  ShadingType, TableOfContents, SectionType, NumberFormat,
  SimpleField, ImageRun, TableLayoutType,
} = require("docx");
const fs = require("fs");
const { imageSize: sizeOf } = require("image-size");

// ── پالت — هویت جدید رهیار (بنفش/صورتی/فیروزه‌ای روی عمیق) ──
const P = {
  bg: "0B1020", accent: "7C5CFF", primary: "14122B", body: "1D1B33", secondary: "5B5A72",
  cover: { titleColor: "FFFFFF", subtitleColor: "B7B3D4", metaColor: "9A96BE", footerColor: "6E6A8E" },
  table: { headerBg: "7C5CFF", headerText: "FFFFFF", innerLine: "CFCBE8", surface: "F2F0FB" },
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };

const r = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FA, size: o.size ?? 24, bold: o.bold, color: o.color ?? P.body, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: 312, before: o.before ?? 0, after: o.after ?? 140 }, children: Array.isArray(children) ? children : [r(children, o.run || {})], keepNext: o.keepNext });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, spacing: { before: 380, after: 170, line: 380, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 32, color: P.primary })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 260, after: 130, line: 360, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 28, color: P.primary })] });

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { ...noBorders, insideHorizontal: NB, insideVertical: NB };

function tbl(headers, rows, widths) {
  const mk = (t, o = {}) => new TableCell({
    children: [para([r(t, { size: 20, bold: o.bold, color: o.color ?? P.body })], { align: AlignmentType.START, after: 0 })],
    shading: { type: ShadingType.CLEAR, fill: o.fill ?? "FFFFFF" },
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    width: { size: o.w ?? 20, type: WidthType.PERCENTAGE },
  });
  return new Table({
    visuallyRightToLeft: true, layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, bottom: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine }, insideVertical: NB },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, { bold: true, color: P.table.headerText, fill: P.table.headerBg, w: widths[i] })) }),
      ...rows.map((row, ri) => new TableRow({ cantSplit: true, children: row.map((c, i) => mk(c, { w: widths[i], fill: ri % 2 === 1 ? P.table.surface : "FFFFFF" })) })),
    ],
  });
}
const cap = (t) => para([r(t, { size: 20, bold: true, color: P.secondary })], { align: AlignmentType.START, keepNext: true, after: 60 });

const SHOTS = "/home/z/my-project/download/final-v21";
function img(file, widthPx = 520) {
  const p = SHOTS + "/" + file;
  const buf = fs.readFileSync(p);
  const dim = sizeOf(new Uint8Array(buf));
  const h = Math.round((dim.height / dim.width) * widthPx);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: h } })],
  });
}
const imgCap = (t) => para([r(t, { size: 18, color: P.secondary })], { align: AlignmentType.CENTER, after: 200 });

// ── جلد R1 (اقتباس RTL — همان توابع تأییدشدهٔ مأموریت قبل) ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charW = (pt) => pt * 11;
  let pt = preferredPt, lines;
  const split = (t, cpl) => { const out = []; let rem = t; while (rem.length > cpl) { let br = -1; for (let i = cpl; i >= Math.floor(cpl * 0.6); i--) if (" \u060C؛-—".includes(rem[i - 1])) { br = i; break; } if (br === -1) br = cpl; out.push(rem.slice(0, br).trim()); rem = rem.slice(br).trim(); } if (rem) out.push(rem); return out; };
  while (pt >= minPt) { const cpl = Math.floor(maxWidthTwips / charW(pt)); lines = split(title, cpl); if (lines.length <= 3) break; pt -= 2; }
  return { titlePt: pt, titleLines: lines };
}
function calcCoverSpacing(q) {
  const SAFETY = 1200;
  const usable = 16838 - SAFETY;
  const content = q.titleLineCount * (q.titlePt * 23 + 200) + (q.hasSubtitle ? 876 : 0) + (q.hasEnglishLabel ? 807 : 0) + q.metaLineCount * 330 + q.fixedHeight + 900;
  const rem = Math.max(usable - content, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(rem * 0.45), rawBottom = Math.floor(rem * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}
function buildCoverR1(cfg) {
  const padR = 1200, padL = 800;
  const avail = 11906 - padR - padL - 300;
  const { titlePt, titleLines } = calcTitleLayout(cfg.title, avail, 40, 24);
  const sp = calcCoverSpacing({ titleLineCount: titleLines.length, titlePt, hasSubtitle: !!cfg.subtitle, hasEnglishLabel: !!cfg.englishLabel, metaLineCount: cfg.metaLines.length, fixedHeight: 400 });
  const ch = [];
  ch.push(new Paragraph({ spacing: { before: sp.topSpacing } }));
  ch.push(new Paragraph({ bidirectional: true, indent: { right: padR, left: padL }, spacing: { after: 500 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } }, children: [r(cfg.englishLabel.split("").join(" "), { size: 18, color: P.accent })] }));
  titleLines.forEach((ln, i) => ch.push(new Paragraph({ bidirectional: true, indent: { right: padR }, spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" }, children: [r(ln, { size: titlePt * 2, bold: true, color: P.cover.titleColor })] })));
  ch.push(new Paragraph({ bidirectional: true, indent: { right: padR }, spacing: { after: 800 }, children: [r(cfg.subtitle, { size: 24, color: P.cover.subtitleColor })] }));
  cfg.metaLines.forEach((ln) => ch.push(new Paragraph({ bidirectional: true, indent: { right: padR + 200 }, spacing: { after: 80 }, border: { right: { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 } }, children: [r(ln, { size: 24, color: P.cover.metaColor })] })));
  ch.push(new Paragraph({ spacing: { before: sp.bottomSpacing } }));
  ch.push(new Paragraph({ bidirectional: true, indent: { right: padR, left: padL }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } }, spacing: { before: 200 }, children: [r(cfg.footerRight, { size: 16, color: P.cover.footerColor }), new TextRun({ text: "                                        " }), r(cfg.footerLeft, { size: 16, color: P.cover.footerColor })] }));
  return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED, borders: allNoBorders, rows: [new TableRow({ height: { value: 16838, rule: "exact" }, children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, verticalAlign: "top", children: ch })] })] })];
}

// ═══════════ بدنهٔ گزارش ═══════════
const body = [];

// A
body.push(h1("A. وضعیت اولیهٔ مخزن و کامیت"));
body.push(para("مأموریت ادامهٔ پروژهٔ موجود انجام شد؛ پروژه از ابتدا ساخته نشد و قابلیت‌های سالم حذف نشدند. در شروع کار، مخزن هدف بررسی شد: شاخهٔ فعال main با کامیت 1809b99 (ادغام مأموریت موشن قبلی) و درخت کاری پاک. نام مخزن همچنان HAMYAR-AI است و طبق دستور، بدون هماهنگی تغییر نام ندادیم. کار روی شاخهٔ feature/local-first-identity کامیت و سپس به main منتقل شد؛ وضعیت پایانی main دو کامیت جدید دارد: 47b3e58 (معماری محلی-اول + هویت بصری) و 4df79f3 (همگام‌سازی تست قرارداد نسخه)."));
body.push(tbl(["مورد", "مقدار واقعی"], [
  ["مخزن", "aresmaeily2/HAMYAR-AI — خصوصی — نام بدون تغییر"],
  ["کامیت شروع", "1809b99 (شاخهٔ main، درخت پاک)"],
  ["کامیت پایانی main", "4df79f3 (تأییدشده با GitHub API)"],
  ["لایهٔ محیطی قبلی", "بررسی و حفظ شد: src/lib/ambient، src/components/ambient، styles/{tokens,motion,ambient,glass}.css"],
], [28, 72]));

// B
body.push(h1("B. علت ریشه‌ای پیام «سرور اشتباه است»"));
body.push(para("مسیر اجرا در نسخهٔ v2.0.0 تحویلی قبل دقیقاً ریشه‌یابی شد. AndroidManifest، MainActivity (WebView محصول وب) را لانچر می‌کرد؛ MainActivity در شروع، endpoint و نشست ذخیره‌شده را از SecureStore می‌خواند و در نبودشان به LoginActivity می‌رفت. صفحهٔ ورود، آدرس سرور را اجباری می‌خواست (DEFAULT_SERVER_URL خالی) و با AppConfig.normalizeBaseUrl اعتبارسنجی می‌شد: هر ورودی غیر-https، localhost یا IP داخلی رد و پیام «آدرس سرور نامعتبر است — فقط https و بدون localhost» (err_endpoint) نشان داده می‌شد. آدرس معتبرِ در دسترس‌ناپذیر به «اتصال به سرور برقرار نشد» و اعتبارنامهٔ غلط به پیام جداگانه می‌رسید. حالت محلی فقط یک لینک فرعی در پایین صفحه بود."));
body.push(para("علت ریشه‌ای: گره‌خوردن ورود اصلی محصول به یک سرورِ در دسترس کاربر نبود؛ نه متن خطا. راهکار واقعی، بازطراحی معماری بود — نه مخفی‌سازی پیام و نه تعویض آدرس. جزئیات پیاده‌سازی در بخش C آمده است."));

// C
body.push(h1("C. معماری نهایی و وضعیت استقلال از سرور"));
body.push(para("معماری «محلی-اول» در سورس واقعی اعمال شد: HomeActivity (رابط محلی ۱۰۰٪ آفلاین روی دارایی‌های داخل APK با مبدأ امن appassets) لانچر شد؛ اتصال به سرور به ماژول اختیاریِ جدا تبدیل شد که فقط از تنظیمات باز می‌شود؛ صفحهٔ اتصال، زیرنویس شفاف «اپ رهیار بدون سرور کامل است» دارد و دکمهٔ بازگشت به حالت محلی همیشه فعال است. خطاها تفکیک شدند: آدرس نامعتبر ≠ نبود اتصال ≠ خطای احراز هویت ≠ محدودیت نرخ تلاش. هیچ آدرس سروری در APK هاردکد نیست و localhost/IP داخلی به‌صورت عمدی رد می‌شود."));
body.push(tbl(["قابلیت", "مستقل از سرور؟", "توضیح"], [
  ["شروع اپ و رابط کاربری", "بله — کامل", "بدون هیچ درخواست شبکه در شروع"],
  ["تم/زبان/تقویم دوگانه", "بله", "جلالی + میلادی کاملاً محلی (Intl درون WebView)"],
  ["وظایف و یادآورهای درون‌برنامه‌ای", "بله", "ذخیرهٔ ماندگار LocalStore در فضای خصوصی اپ"],
  ["پشتیبان‌گیری/بازگردانی", "بله", "JSON + Share Sheet سیستم — بدون مجوز"],
  ["اتصال به سرور مالک (وب کامل)", "اختیاری", "فقط از تنظیمات؛ خروج همیشه در دسترس"],
  ["گفتگوی AI ابری / آب‌وهوا", "وابستهٔ واقعی سرور مالک", "در حالت محلی وجود ندارد؛ هیچ پاسخ جعلی نمایش داده نمی‌شود"],
], [34, 18, 48]));
body.push(para("ممنوعیت‌های معماری رعایت شد: سرور ناشناس/آزمایشی/localhost در نسخهٔ منتشرشده نیست؛ خطا پنهان نشده؛ mock به‌جای سرویس واقعی معرفی نشده؛ هیچ کلید یا رمزی در کد یا مخزن عمومی نیست."));

// D
body.push(h1("D. نتایج آزمون آفلاین و آنلاین"));
body.push(para("رابط محلی در محیط کاملاً آفلاین آزمایش شد: مرورگر Chromium با حالت offline و قطع همهٔ درخواست‌های شبکه، رابط محلی را رندر کرد؛ نشانگر «آفلاین — قابلیت‌های محلی فعال» نمایش داده شد و سه صفحهٔ خانه/وظایف/تنظیمات بدون هیچ درخواست شبکه‌ای کار کردند. ماندگاری داده پس از بسته‌شدن با تست JVM (LocalStoreTest) پوشش داده شده است. مسیر آنلاین محصول وب هم روی build production آزمایش شد: ورود واقعی مالک (HTTP 200)، بارگذاری همهٔ نماها و health-check سالم با پایگاه داده."));
body.push(para("حد صادقانه: نصب APK روی دستگاه یا شبیه‌ساز اندروید در این محیط ممکن نبود؛ بنابراین سناریوهای لمسی/نوتیفیکیشن/صدای ناتیو روی سخت‌افزار واقعی «آزمایش‌نشده» است و همین‌طور ثبت شده است."));

// E
body.push(h1("E. تغییرات واقعی Ambient Experience Layer"));
body.push(para("لایهٔ محیطی وب حفظ شد و روی build production اجرا شد (۱۸ ضبط تم). آوردهٔ تازهٔ این مأموریت: برند CSS رابط محلی اندروید (brand.css) با همان زبان بصری — توکن‌های برند، هاله‌های محیطی با حرکت بسیار کند (فقط transform/opacity)، شیشه‌مات با backdrop-filter و هایلایت لبه، ورود پله‌ای صفحات، بازخورد فشردن، و خاموشی کامل حرکت با prefers-reduced-motion. نشان برند به‌صورت SVG درون‌خطی در سربرگ هر چهار صفحهٔ محلی قرار گرفت. یک باگ واقعی هم رفع شد: تم خودکار در رابط محلی سطح تاریک می‌گرفت؛ انتخابگرها اصلاح و مجدد ضبط شد. افکت موفقیت فقط پس از موفقیت واقعی عملیات اجرا می‌شود."));
body.push(img("web/02-today.png"));
body.push(imgCap("تصویر ۱ — نمای امروز محصول وب (موبایل): لایهٔ محیطی، شیشه‌مات، کارت‌های خانه و داک شناور"));
body.push(img("themes/theme-forest-light.png"));
body.push(imgCap("تصویر ۲ — تم جنگل (روشن، دسکتاپ): پس‌زمینهٔ طبیعت با شفافیت کنترل‌شده"));
body.push(img("themes/theme-night-dark.png"));
body.push(imgCap("تصویر ۳ — تم شب (تیره، دسکتاپ): عمق تاریک و نورهای ملایم"));

// F
body.push(h1("F. لوگو و انیمیشن Splash"));
body.push(h2("F.1 — لوگو"));
body.push(para("هر دو واریانت مفهومی به محصول واقعی تبدیل شد: واریانت A (Badge Ring — حلقهٔ خطی گرادیانی) و واریانت B (Solid Mark — نشان R سفید روی مربع گوشه‌گرد با گرادیان بنفش/صورتی/فیروزه‌ای). خروجی‌های واقعی: پنج SVG تمیز، PNG شفاف ۱۰۲۴×۱۰۲۴ برای هر واریانت، آزمون خوانایی ۴۸ و ۲۴ پیکسل، نسخه‌های تک‌رنگ و تک‌رنگ معکوس، فایل پیش‌نمایش HTML و سند منشأ/مجوز (اثر اصلی اختصاصی رهیار؛ بدون اثر ثالث؛ بدون ادعای انحصاری ثبت‌شده). ادغام واقعی: آیکن لانچر adaptive اندروید (API 26+ با fallback وکتوری)، آیکن وب/PWA، لوگوی عمومی وب، سربرگ رابط محلی و نشان اسپلش. نام «rahyar AI» در همهٔ نسخه‌ها یکسان است."));
body.push(h2("F.2 — Splash بومی واقعی"));
body.push(para("اسپلش اندروید با فناوری واقعی پروژه پیاده شد (SplashView.java با Canvas + ValueAnimator + PathMeasure برای افکت رسم‌شدن خطوط R) — نه HTML نمایشی. خط‌زمانی مطابق طراحی: 0.00s هاله و ورود نشان، 0.35s رسم بخش اصلی R، 0.95s پای R، 1.25s جرقه، 1.50s نام، 1.80s شعار و محو نرم حدود 2.4 ثانیه. هیچ تأخیر اجباری برای ورود به اپ نیست (لمس = ردشدن)، فقط شروع سرد (بازگشت به اپ تکرار نمی‌کند)، با کاهش حرکت سیستم نشان و نام فوراً و ثابت نمایش داده می‌شوند و تم عمیق برند جای فلش سفید را می‌گیرد. وب هم اسپلش هم‌هویت دارد (splash.tsx — فقط شروع سرد نشست، سقف حدود 1.85 ثانیه، رعایت prefers-reduced-motion). شواهد: ۸ فریم واقعی و ویدیوی شروع سرد."));
body.push(img("splash/splash-03-t800ms.png", 300));
body.push(imgCap("تصویر ۴ — فریم واقعی اسپلش در ۸۰۰ms: هاله، گرادیان برند و رسم در حال پیشرفت R"));
body.push(img("splash/splash-06-t1700ms.png", 300));
body.push(imgCap("تصویر ۵ — فریم واقعی اسپلش در ۱۷۰۰ms: نشان کامل + جرقه + نام برند"));

// G
body.push(h1("G. نتایج تست‌ها و build"));
body.push(tbl(["آزمون", "نتیجهٔ واقعی"], [
  ["typecheck (tsc --noEmit)", "پاس — بدون خطا"],
  ["lint (eslint src)", "پاس"],
  ["تست‌های واحد وب", "۱۸۱ از ۱۸۱ موفق (۶۱۲ expect)"],
  ["بیلد production وب", "موفق (standalone) — سرور روی پورت ۳۰۰۰ سالم؛ health = ok/database ok"],
  ["تست‌های JVM اندروید (هر دو ویراست)", "۹۸ از ۹۸ موفق (شامل LocalStore، OfflineContract، AppConfig، پل بومی)"],
  ["بیلد APK (هر دو ویراست)", "BUILD SUCCESSFUL — apksigner verify روی هر دو تأیید شد"],
  ["هویت APK", "user: com.rahyarai.app vc22 — owner: com.rahyarai.app.owner vc23 — versionName 2.1.0"],
  ["نصب/اجرای واقعی روی دستگاه", "انجام نشده — دستگاه/شبیه‌ساز در دسترس نیست (صادقانه ثبت شد)"],
], [40, 60]));

// H
body.push(h1("H. APK مالک و کاربر و روش امن ورود"));
body.push(para("هر دو APK واقعی از همین سورس ساخته و با کلید انتشار جدید (RSA-4096، گواهی CN=RahyAr Release) و طرح امضای v2 امضا شدند. تفاوت ویراست‌ها فقط هویت نصب/برند/پیش‌فرض نمایشی صفحهٔ اتصال است (بدون تکرار کد، بدون رمز تعبیه‌شده)؛ نقش‌ها سمت سرور کنترل می‌شود. روش ورود: اپ بدون ورود باز می‌شود (حالت محلی)؛ ورود به سرور اختیاری و فقط از تنظیمات است. راه‌اندازی اولیهٔ مالک روی وب فقط یک‌بار و در محیط تولید نیازمند کد راه‌اندازی خارج از باند (RAHYAR_SETUP_TOKEN) است؛ رمز با scrypt هش و نشست با کوکی امن نگه داشته می‌شود؛ نرخ تلاش محدود و بررسی same-origin فعال است. رمز ورود اپ از رمز keystore کاملاً تفکیک شده است؛ keystore و رمزها gitignored و خارج از مخزن/بستهٔ عمومی‌اند و فقط از مسیر خصوصی به مالک تحویل می‌شوند."));

// I
body.push(h1("I. فایل‌های Workspace و مسیرها"));
body.push(tbl(["مسیر (download/)", "محتوا"], [
  ["RahyAr-Final-Delivery.zip", "بستهٔ کامل همهٔ فایل‌های تحویلی"],
  ["RahyAr-User.apk / RahyAr-Owner.apk", "هر دو APK امضاشدهٔ v2.1.0 (vc22/vc23)"],
  ["RahyAr-Source.zip", "سورس کامل HEAD — ۵۹۴ فایل — اسکن secret پاک"],
  ["RahyAr-Logo-Kit.zip", "SVG×۵ + PNG شفاف ۱۰۲۴ + ۴۸/۲۴ + preview.html + سند منشأ"],
  ["RahyAr-Screenshots.zip", "همهٔ اسکرین‌شات‌ها + manifest.json محیط ضبط"],
  ["RahyAr-Interaction-Video.mp4 / RahyAr-Splash-Video.mp4", "ویدیوهای واقعی تعامل و شروع سرد"],
  ["RahyAr-Final-Report.md / .docx", "این گزارش در دو قالب"],
  ["SHA256SUMS.txt / GOFILE-LINKS.txt / INSTALLATION-AND-LOGIN.md", "هش‌ها، لینک‌ها، راهنمای نصب و ورود"],
  ["final-v21/", "درخت خام شواهد (web، splash، themes، local، video)"],
], [42, 58]));

// J
body.push(h1("J. لینک‌های GoFile و نتیجهٔ راستی‌آزمایی"));
body.push(para("هر فایل جداگانه روی GoFile آپلود و سه‌لایه اعتبارسنجی شد: تطابق MD5 و حجم سرویس با فایل محلی؛ باز شدن هر لینک با مرورگر واقعی و رندر نام فایل و دکمهٔ دانلود (۸ از ۸ تأیید شد)؛ و هش SHA-256 در فایل چک‌سام. لینک‌های رسمی:"));
body.push(tbl(["فایل", "لینک دریافت"], [
  ["RahyAr-User.apk", "https://gofile.io/d/SklMvUFe"],
  ["RahyAr-Owner.apk", "https://gofile.io/d/Q5A2RMVx"],
  ["RahyAr-Source.zip", "https://gofile.io/d/qbey258c"],
  ["RahyAr-Logo-Kit.zip", "https://gofile.io/d/cgt8guIb"],
  ["RahyAr-Screenshots.zip", "https://gofile.io/d/R5sZbMcQ"],
  ["RahyAr-Interaction-Video.mp4", "https://gofile.io/d/GqGPgAxg"],
  ["RahyAr-Splash-Video.mp4", "https://gofile.io/d/CwPpo2Os"],
  ["INSTALLATION-AND-LOGIN.md", "https://gofile.io/d/R7YcqWr8"],
  ["گزارش DOCX + بستهٔ کامل + فهرست لینک‌ها", "در GOFILE-LINKS.txt کنار همین گزارش و پیام تحویل نهایی"],
], [40, 60]));
body.push(para("GoFile لینک‌های مهمان بدون تاریخ انقضای اعلامی می‌دهد اما نگهداری بلندمدت تضمین سرویس ثالث است؛ نسخهٔ مرجع در Workspace ماندگار است و هش‌های بخش L نسخه‌ها را بین Workspace، GoFile و GitHub یکسان نگه می‌دارد. api.gofile.io از IP این محیط محدود بود؛ آپلود مستقیم روی store1.gofile.io و راستی‌آزمایی با مرورگر انجام شد؛ به همین دلیل به‌جای لینک پوشهٔ تجمیعی، بستهٔ اصلی ZIP ارائه شده است."));

// K
body.push(h1("K. کامیت نهایی GitHub"));
body.push(para("وضعیت نهایی main روی مخزن خصوصی aresmaeily2/HAMYAR-AI برابر کامیت 4df79f3 (همگام‌سازی تست قرارداد نسخه) است و کامیت اصلی این مأموریت 47b3e58 (معماری محلی-اول + هویت بصری) است. push با API گیت‌هاب تأیید شد (خواندن SHA و پیام و تاریخ کامیت از مخزن). فایل‌های محرمانه هرگز track نشده‌اند — اسکن خودکار در بسته‌سازی سورس (الگوهای توکن/کلید و مسیرهای ممنوع) پاک بود. نام مخزن طبق دستور بدون هماهنگی تغییر نکرده است."));

// L
body.push(h1("L. SHA-256 فایل‌های نهایی"));
body.push(para("جدول هش‌ها دقیقاً بازتاب SHA256SUMS.txt است؛ خودِ فایل چک‌سام و بستهٔ تجمیعی به‌دلیل وابستگی حلقه‌ای در آن فهرست نمی‌شوند و هش بستهٔ ZIP در GOFILE-LINKS.txt و پیام تحویل ثبت می‌شود."));
body.push(tbl(["فایل", "SHA-256"], [
  ["RahyAr-User.apk", "3c08c1ad…93d24"],
  ["RahyAr-Owner.apk", "d577a494…b8970"],
  ["RahyAr-Source.zip", "da7ceff8…1d8ae5"],
  ["RahyAr-Logo-Kit.zip", "47c3f3fa…8d65c"],
  ["RahyAr-Screenshots.zip", "5df6234a…c0cbf"],
  ["RahyAr-Interaction-Video.mp4", "a2a7452a…0ead8"],
  ["RahyAr-Splash-Video.mp4", "d122456b…c6111d"],
  ["INSTALLATION-AND-LOGIN.md", "765c60d1…0eb78"],
  ["RahyAr-Final-Report.md", "bfe6d3f6…37ed5"],
  ["RahyAr-Final-Report.docx", "در SHA256SUMS.txt — نسخهٔ کامل"],
], [38, 62]));
body.push(para("نسخهٔ کامل ۶۴ کاراکتری هر هش در فایل SHA256SUMS.txt کنار همین گزارش آمده است."));

// M
body.push(h1("M. محدودیت‌ها و موارد باقی‌مانده"));
body.push(para("یکم، اجرای روی دستگاه اندروید انجام نشد (دستگاه/شبیه‌ساز در این محیط نیست)؛ همهٔ شواهد از اجرای واقعی وب و رابط محلی در Chromium و تست‌های JVM است و رفتار لمسی/نوتیفیکیشن/صدای ناتیو روی سخت‌افزار «آزمایش‌نشده» است. دوم، گواهی امضای انتشار جدید است (کلید قبلی با ریست محیط از بین رفته بود)؛ ارتقا روی نسخهٔ قبلی نیازمند حذف نصب قبلی است و نگهداری کلید با مالک است. سوم، نام مخزن HAMYAR-AI باقی مانده و تغییر نام به RahyAr نیازمند هماهنگی مالک است. چهارم، یادآور سیستمی و صوت ناتیو فقط در حالت متصل فعال می‌شوند و در حالت محلی یادآورها درون‌برنامه‌ای‌اند. پنجم، ویدیوها با فریم‌ریت headless ضبط شده‌اند و ادعایی درباره FPS دستگاه ندارند. ششم، GoFile سرویس ثالث است؛ نسخهٔ مرجع در Workspace است و رمزهای خصوصی هرگز در GoFile قرار نگرفته‌اند."));
body.push(img("local/01-local-home-offline.png", 340));
body.push(imgCap("تصویر ۶ — رابط محلی آفلاین اندروید (تمام‌آفلاین): نشان برند، تاریخ دو‌تقویمی جلالی/میلادی، شیشه‌مات و نشانگر آفلاین"));
body.push(img("web/07-settings.png"));
body.push(imgCap("تصویر ۷ — تنظیمات محصول وب: انتخابگر ظاهر، مدیریت کاربران مالک و حساب"));

// ═══════════ سند ═══════════
const footerArabic = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* arabic \\* MERGEFORMAT", "1")] })] });
const footerRoman = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* ROMAN \\* MERGEFORMAT", "i")] })] });
const bodyHeader = new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } }, children: [r("گزارش نهایی مأموریت یکپارچه رهیار — v2.1.0", { size: 16, color: P.secondary })] })] });

const doc = new Document({
  creator: "RahyAr",
  title: "گزارش نهایی مأموریت یکپارچه رهیار — استقلال از سرور، هویت بصری، لوگو و اسپلش",
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
        englishLabel: "RAHYAR  FINAL  DELIVERY",
        title: "گزارش نهایی مأموریت یکپارچه رهیار",
        subtitle: "استقلال واقعی از سرور، هویت بصری و لوگوی جدید، اسپلش بومی، آزمون‌ها و تحویل کامل فایل‌ها",
        metaLines: ["نسخهٔ محصول: 2.1.0 (user vc22 / owner vc23)", "کامیت نهایی: 4df79f3 — مخزن خصوصی HAMYAR-AI", "تاریخ: ۳۰ مهر ۱۴۰۵ (۲۲ اکتبر ۲۰۲۶)", "تست‌ها: وب ۱۸۱/۱۸۱ — اندروید ۹۸/۹۸ — دستگاه: آزمایش‌نشده"],
        footerRight: "تهیه‌شده برای مالک محصول رهیار",
        footerLeft: "محرمانه — استفاده داخلی",
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
  const out = "/home/z/my-project/download/RahyAr-Final-Report.docx";
  fs.writeFileSync(out, buf);
  console.log("OK:", out, buf.length, "bytes");
});
