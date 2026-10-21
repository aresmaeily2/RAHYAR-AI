// گزارش تحویل APK رهیار ۲٫۰٫۰ — نسخهٔ Word فارسی (RTL)
// معماری: ۳ سکشن (کاور R1-RTL / فهرست رومی / بدنهٔ عربی) + postcheck
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, TableLayoutType, SectionType,
  TableOfContents, PageBreak, VerticalAlign,
} = require("docx");
const fs = require("fs");

// ─── پالت DS-1 (Deep Sea) — design-system ───
const P = {
  bg: "0B1C2C", primary: "0B1C2C", body: "000000", secondary: "506070",
  accent: "529286",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "8A929A" },
  table: { headerBg: "529286", headerText: "FFFFFF", accentLine: "529286", innerLine: "BECFCC", surface: "E8ECEB" },
};
const FA_FONT = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };
const MONO = { ascii: "Courier New", hAnsi: "Courier New", cs: "Courier New", eastAsia: "Courier New" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function safeText(v, ph) {
  if (v === undefined || v === null || v === "" || String(v) === "NaN" || String(v) === "undefined") {
    return ph || "\u3010نامشخص\u3011";
  }
  return String(v);
}

// ─── پاراگراف بدنهٔ فارسی (RTL، تراز دوطرفه، ۱٫۳ برابر) ───
function body(parts, opts = {}) {
  const arr = Array.isArray(parts) ? parts : [{ t: parts }];
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after !== undefined ? opts.after : 160 },
    children: arr.map((pt) => new TextRun({
      text: safeText(pt.t), bold: !!pt.b,
      size: pt.size || 24, sizeComplexScript: pt.size || 24,
      color: pt.color || P.body, font: pt.mono ? MONO : FA_FONT,
      rightToLeft: !pt.mono && !pt.ltr,
    })),
  });
}

// ─── تیترهای بدنه (Heading واقعی — برای فهرست) ───
function heading(text, level) {
  const size = level === 1 ? 32 : 28;
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    bidirectional: true,
    spacing: { before: level === 1 ? 400 : 260, after: 180, line: 340, lineRule: "atLeast" },
    children: [new TextRun({
      text: safeText(text), bold: true, boldComplexScript: true,
      size, sizeComplexScript: size, color: P.primary, font: FA_FONT, rightToLeft: true,
    })],
  });
}

// ─── خط کد LTR (دستورها، هش‌ها) ───
function code(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, after: opts.after !== undefined ? opts.after : 60 },
    indent: { left: opts.indent !== undefined ? opts.indent : 480 },
    shading: { type: ShadingType.CLEAR, fill: "F2F5F7" },
    children: [new TextRun({ text: safeText(text), size: 18, sizeComplexScript: 18, color: "1C2A3D", font: MONO })],
  });
}

// ─── سلول جدول ───
function cellPara(text, o = {}) {
  return new Paragraph({
    bidirectional: !o.ltr,
    alignment: o.ltr ? AlignmentType.LEFT : undefined,
    spacing: { line: 276 },
    children: [new TextRun({
      text: safeText(text), bold: !!o.header || !!o.b, boldComplexScript: !!o.header || !!o.b,
      size: o.size || 20, sizeComplexScript: o.size || 20,
      color: o.header ? P.table.headerText : P.body,
      font: o.ltr ? MONO : FA_FONT, rightToLeft: !o.ltr,
    })],
  });
}

function makeTable(headerCells, dataRows, widths) {
  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headerCells.map((h, i) => new TableCell({
          children: [cellPara(h, { header: true })],
          shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
          margins: { top: 90, bottom: 90, left: 120, right: 120 },
          width: { size: widths[i], type: WidthType.PERCENTAGE },
        })),
      }),
      ...dataRows.map((row, ri) => new TableRow({
        cantSplit: true,
        children: row.map((c, i) => new TableCell({
          children: [cellPara(c.t, { ltr: !!c.ltr, b: !!c.b, size: c.size })],
          shading: ri % 2 === 1 ? { type: ShadingType.CLEAR, fill: P.table.surface } : undefined,
          margins: { top: 70, bottom: 70, left: 120, right: 120 },
          width: { size: widths[i], type: WidthType.PERCENTAGE },
        })),
      })),
    ],
  });
}

// عنوان جدول (keepNext — چسبیده به جدول)
function tableTitle(text) {
  return new Paragraph({
    bidirectional: true, keepNext: true,
    spacing: { before: 120, after: 100, line: 300 },
    children: [new TextRun({
      text: safeText(text), bold: true, boldComplexScript: true,
      size: 21, sizeComplexScript: 21, color: P.secondary, font: FA_FONT, rightToLeft: true,
    })],
  });
}

// ─── شکست عنوان فارسی در مرز واژه‌ها (بدون یتیم‌سازی سطر آخر) ───
function splitTitleLinesFa(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([" ", "-", "\u2013", "\u2014", "/"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trimEnd());
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining.length) {
    // قانون ضدیتیم: سطر آخر ۱–۲ نویسه‌ای در سطر قبلی ادغام می‌شود
    if (remaining.length <= 2 && lines.length) {
      lines[lines.length - 1] += " " + remaining;
    } else {
      lines.push(remaining);
    }
  }
  return lines;
}

// محاسبهٔ پویا برای فارسی (پهنای میانگین نویسه ≈ pt×۱۱٫۵ twips)
function calcTitleLayoutFa(title, maxWidthTwips, preferredPt = 38, minPt = 24) {
  const charWidth = (pt) => pt * 11.5;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLinesFa(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLinesFa(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

// فاصله‌گذاری پویای کاور — دقیقاً مطابق design-system
function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ─── کاور R1 (نسخهٔ آینه‌شدهٔ RTL) — یک جدول ۱۶۸۳۸ exact، بدون حاشیه ───
function buildCoverR1RTL(config) {
  const C = config.palette;
  const padL = 800, padR = 1200;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayoutFa(config.title, availableWidth, 38, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentRight = { style: BorderStyle.SINGLE, size: 8, color: C.accentColor, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accentColor, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, sizeComplexScript: 18, color: C.accentColor,
        font: { ascii: "Calibri", hAnsi: "Calibri" }, characterSpacing: 40,
      })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      bidirectional: true,
      indent: { left: padL, right: padR },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], bold: true, boldComplexScript: true,
        size: titleSize, sizeComplexScript: titleSize,
        color: C.titleColor, font: FA_FONT, rightToLeft: true,
      })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      bidirectional: true, indent: { left: padL, right: padR },
      spacing: { after: 800, line: 340, lineRule: "atLeast" },
      children: [new TextRun({
        text: config.subtitle, size: 24, sizeComplexScript: 24,
        color: C.subtitleColor, font: FA_FONT, rightToLeft: true,
      })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      bidirectional: true, indent: { left: padL, right: padR + 200 },
      spacing: { after: 90, line: 300, lineRule: "atLeast" },
      border: { right: accentRight },
      children: [new TextRun({
        text: line, size: 22, sizeComplexScript: 22,
        color: C.metaColor, font: FA_FONT, rightToLeft: true,
      })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    bidirectional: true, indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accentColor, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerRight || "", size: 16, sizeComplexScript: 16, color: C.footerColor, font: FA_FONT, rightToLeft: true }),
      new TextRun({ text: "                                   ", size: 16, sizeComplexScript: 16 }),
      new TextRun({ text: config.footerLeft || "", size: 16, sizeComplexScript: 16, color: C.footerColor, font: { ascii: "Calibri", hAnsi: "Calibri" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.bg },
        borders: noBorders,
        verticalAlign: VerticalAlign.TOP,
        children,
      })],
    })],
  })];
}

// ═══════════════ محتوا ═══════════════
const SHA_USER = "78fffdbb922847db159eb5015ef0fc0fc20021acbed088d339387e637e59b523";
const SHA_OWNER = "9fd87170f2353ea034684e5db0e49cafe08d92bc4c9a455b03d742603efbc7d0";
const SHA_CERT = "14c8f6a5f66f5c99b8f664dd2888a42e4ef809e8a83363a87c76f8255fc473b5";

const bodyChildren = [];

// ۱ — خلاصهٔ مدیریتی
bodyChildren.push(heading("۱) خلاصهٔ مدیریتی", 1));
bodyChildren.push(body([
  { t: "این گزارش نتیجهٔ ساخت و صحت‌سنجی دو فایل APK نهایی رهیار نسخهٔ ۲٫۰٫۰ است که بنا بر دستور مالک، به‌صورت " },
  { t: "Release واقعی و امضاشده", b: true },
  { t: " تولید شدند. هر دو فایل از همان سورس نهایی v2.0.0 (شاخهٔ main مخزن پروژه) با پیکربندی دو ویراسته ساخته شده‌اند و هویت بسته دقیقاً مطابق درخواست است: نسخهٔ کاربر با شناسهٔ " },
  { t: "com.rahyarai.app", mono: true },
  { t: " و نسخهٔ مالک با شناسهٔ " },
  { t: "com.rahyarai.app.owner", mono: true },
  { t: ". هیچ‌یک از دو فایل با APK آزمایشی قدیمی ۱٫۲٫۰ اشتراک ندارد؛ شناسه، شمارهٔ نسخه، کلید امضا و محتوای بومی هر دو تازه است و اثر انگشت SHA-256 هر فایل در همین گزارش ثبت شده است." },
]));
bodyChildren.push(body([
  { t: "در مجموع " },
  { t: "۴۹ آزمون واحد JVM در هر دو ویراست (۹۸ اجرا) سبز", b: true },
  { t: " شده و صحت‌سنجی فنی شامل aapt2، apksigner و zipalign با موفقیت انجام شده است. دو محدودیت به‌صورت شفاف ثبت می‌شود: نخست، به دلیل نبود دستگاه فیزیکی یا شبیه‌ساز در محیط ساخت، نصب و اجرای واقعی روی دستگاه «آزموده‌نشده روی دستگاه» تلقی می‌شود؛ دوم، انتشار سورس در GitHub به دلیل نبود اعتبارنامه در محیط اجرا انجام نشد و به‌جای آن بستهٔ سورس قابل راستی‌آزمایی (git bundle) تحویل شده است. سرور محصول زنده و سالم است و کنترل نقش‌های مالک/کاربر در سمت سرور به‌صورت اجرایی تأیید شده است." },
]));

// ۲ — هویت فایل‌ها
bodyChildren.push(heading("۲) هویت فایل‌های APK — راستی‌آزمایی با ابزار رسمی", 1));
bodyChildren.push(body("هویت دو بسته با ابزار رسمی aapt2 (از Build-Tools رسمی گوگل) استخراج و مستقیماً با درخواست مالک مقایسه شده است. جدول ۱ نتیجهٔ این مقایسه را نشان می‌دهد؛ versionName هر دو ویراست یکسان (۲٫۰٫۰) است و تمایز آن‌ها در شناسهٔ بسته، شمارهٔ ساخت (versionCode) و برچسب نمایشی است. نزدیک‌بودن حجم دو فایل ناشی از سورس واحد است و تفاوت ۴ بایتی آن‌ها از متفاوت‌بودن شناسهٔ بسته و برچسب‌ها ناشی می‌شود."));
bodyChildren.push(tableTitle("جدول ۱ — هویت دو ویراست (خروجی aapt2 dump badging)"));
bodyChildren.push(makeTable(
  ["ویژگی", "نسخهٔ کاربر", "نسخهٔ مالک"],
  [
    [{ t: "نام فایل", b: true }, { t: "rahyar-user-v2.0.0.apk", ltr: true }, { t: "rahyar-owner-v2.0.0.apk", ltr: true }],
    [{ t: "شناسهٔ بسته", b: true }, { t: "com.rahyarai.app", ltr: true }, { t: "com.rahyarai.app.owner", ltr: true }],
    [{ t: "versionCode", b: true }, { t: "20", ltr: true }, { t: "21", ltr: true }],
    [{ t: "versionName", b: true }, { t: "2.0.0", ltr: true }, { t: "2.0.0", ltr: true }],
    [{ t: "برچسب نمایشی", b: true }, { t: "رهیار" }, { t: "رهیار مالک" }],
    [{ t: "حجم", b: true }, { t: "406,345 بایت" }, { t: "406,349 بایت" }],
    [{ t: "minSdk / targetSdk", b: true }, { t: "24 / 34", ltr: true }, { t: "24 / 34", ltr: true }],
    [{ t: "اکتیویتی آغازین", b: true }, { t: "com.rahyarai.app.MainActivity", ltr: true, size: 18 }, { t: "com.rahyarai.app.MainActivity", ltr: true, size: 18 }],
    [{ t: "SHA-256 فایل", b: true }, { t: SHA_USER, ltr: true, size: 16 }, { t: SHA_OWNER, ltr: true, size: 16 }],
  ],
  [24, 38, 38]
));
bodyChildren.push(body([
  { t: "دربارهٔ نگرانی مالک از فایل پیشین: فایل rahyar-apk-wrapped.zip که پیش‌تر دریافت شد دقیقاً همان APK آزمایشی ۱٫۲٫۰ بود؛ در برابر، این دو فایل در همین جلسه و از سورس فعلی ساخته شده‌اند. تاریخچهٔ ساخت در مخزن ثبت شده (commitهای " },
  { t: "6a18922", mono: true },
  { t: " و " },
  { t: "d8ce5e2", mono: true },
  { t: ") و اثر انگشت SHA-256 ابزارهای ساخت نیز مستند است؛ بنابراین از نظر حسابرسی، پوستهٔ قدیمی در هیچ نقطه‌ای از فرایند دخیل نبوده است." },
]), { after: 200 });

// ۳ — فرایند ساخت
bodyChildren.push(heading("۳) فرایند ساخت و ابزارهای رسمی", 1));
bodyChildren.push(body("ساخت با زنجیرهٔ رسمی انجام شده است: Gradle 8.10.2 و افزونهٔ اندروید AGP 8.7.3 روی JDK 21 (Temurin)، همراه با Build-Tools r34 و پلتفرم android-34 که هر دو مستقیماً از dl.google.com دانلود و SHA-256 آن‌ها در پروندهٔ provenance پروژه ثبت شده است. خروجی دو ویراست با همان productFlavors تعریف‌شده در build.gradle تولید شده است؛ یعنی «سورس واحد، دو هویت» بدون تکرار کد. امضای release به‌صورت خودکار از فایل keystore.properties خوانده می‌شود و در نبود آن، خروجی unsigned می‌ماند؛ در این تحویل کلید ساخته و به‌کار گرفته شده و هر دو خروجی امضاشده‌اند."));
bodyChildren.push(tableTitle("جدول ۲ — زنجیرهٔ ابزار ساخت و منبع رسمی هر جزء"));
bodyChildren.push(makeTable(
  ["ابزار", "نسخه", "منبع رسمی"],
  [
    [{ t: "Gradle" }, { t: "8.10.2", ltr: true }, { t: "services.gradle.org", ltr: true }],
    [{ t: "Android Gradle Plugin" }, { t: "8.7.3", ltr: true }, { t: "google() Maven", ltr: true }],
    [{ t: "JDK" }, { t: "21 (Temurin)", ltr: true }, { t: "api.adoptium.net", ltr: true }],
    [{ t: "Build-Tools" }, { t: "r34", ltr: true }, { t: "dl.google.com — SHA ثبت‌شده", ltr: true }],
    [{ t: "Platform" }, { t: "android-34 ext7 r03", ltr: true }, { t: "dl.google.com — SHA ثبت‌شده", ltr: true }],
    [{ t: "aapt2 / apksigner / zipalign" }, { t: "r34", ltr: true }, { t: "Build-Tools رسمی گوگل", ltr: true }],
  ],
  [34, 26, 40]
));

// ۴ — امضا
bodyChildren.push(heading("۴) امضای انتشار و مشخصات گواهی", 1));
bodyChildren.push(body("برای این تحویل، کلید انتشار جدید RSA-4096 ساخته شد؛ گواهی self-signed با نام CN=RahyAr Release و اعتبار تا سال ۲۰۵۶. هر دو APK با همین کلید و طرح امضای v2 امضا شده‌اند؛ این طرح برای minSdk 24 (اندروید ۷ به بالا) کاملاً کافی است و apksigner verify خروجی Verifies داده است. هم‌ترازی zipalign نیز روی هر دو فایل تأیید شده است. کلید و رمزها در کیت امضا (rahyar-release-signing-kit.zip) قرار دارند و عمداً وارد مخزن گیت نشده‌اند."));
bodyChildren.push(tableTitle("جدول ۳ — مشخصات گواهی امضا (مشترک بین دو APK)"));
bodyChildren.push(makeTable(
  ["مورد", "مقدار"],
  [
    [{ t: "صاحب گواهی" }, { t: "CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR", ltr: true, size: 18 }],
    [{ t: "الگوریتم کلید / امضا" }, { t: "RSA-4096 / SHA384withRSA", ltr: true }],
    [{ t: "SHA-256 گواهی" }, { t: SHA_CERT, ltr: true, size: 16 }],
    [{ t: "SHA-1 گواهی" }, { t: "90f8e3a8a3a6674dcd7b46ebc6ffa70879f50f6d", ltr: true, size: 16 }],
    [{ t: "اعتبار" }, { t: "۲۱ اکتبر ۲۰۲۶ تا ۱۳ اکتبر ۲۰۵۶" }],
    [{ t: "طرح امضای APK" }, { t: "v2 (Verifies) — کافی برای minSdk 24", ltr: false }],
  ],
  [30, 70]
));
bodyChildren.push(body([
  { t: "هشدار نگهداری: ", b: true },
  { t: "نگهداری کیت امضا حیاتی است؛ در صورت گم‌شدن آن، به‌روزرسانی روی همان شناسهٔ بسته بدون حذف و نصب مجدد ممکن نخواهد بود. پیشنهاد می‌شود از این کیت نسخهٔ پشتیبان رمزنگاری‌شده نگه دارید و رمز آن فقط نزد خودتان بماند. این کلید برای استقرار داخلی و توزیع مستقیم کافی است؛ برای انتشار در فروشگاه‌ها می‌توانید بعداً سیاست امضای فروشگاه را روی همین شناسه اعمال کنید." },
]), { after: 200 });

// ۵ — صحت‌سنجی و تست
bodyChildren.push(heading("۵) صحت‌سنجی فنی و نتایج تست", 1));
bodyChildren.push(body("صحت‌سنجی در چهار لایه انجام شد: نخست badging با aapt2 برای هویت بسته و مجوزها؛ دوم apksigner verify برای اعتبار امضا؛ سوم zipalign برای هم‌ترازی بایت‌ها؛ و چهارم آزمون‌های واحد JVM که منطق بومی را پوشش می‌دهند — پیکربندی و اعتبارسنجی آدرس، قرارداد حالت آفلاین، پل بومی صدا و TTS، زمان‌بندی یادآورها و رویدادهای گفتار. نتیجه در جدول ۴ آمده است. مجوزهای هر دو APK حداقلی و همگام با معماری v2.0.0 است: INTERNET، POST_NOTIFICATIONS، SCHEDULE_EXACT_ALARM، RECEIVE_BOOT_COMPLETED و VIBRATE."));
bodyChildren.push(tableTitle("جدول ۴ — نتایج صحت‌سنجی و تست"));
bodyChildren.push(makeTable(
  ["آزمون", "دامنه", "نتیجه"],
  [
    [{ t: "آزمون واحد JVM — ویراست user" }, { t: "۷ کلاس آزمون (AppConfig، OfflineContract، پل بومی، یادآور، صدا، هسته، ذخیره‌سازی)" }, { t: "۴۹/۴۹ سبز", b: true }],
    [{ t: "آزمون واحد JVM — ویراست owner" }, { t: "همان مجموعه روی flavor مالک" }, { t: "۴۹/۴۹ سبز", b: true }],
    [{ t: "apksigner verify" }, { t: "هر دو APK" }, { t: "Verifies — طرح v2", b: true }],
    [{ t: "zipalign -c 4" }, { t: "هر دو APK" }, { t: "موفق", b: true }],
    [{ t: "aapt2 badging" }, { t: "شناسه، نسخه، مجوزها، اکتیویتی آغازین" }, { t: "مطابق درخواست", b: true }],
    [{ t: "آزمون وب (پایهٔ محصول)" }, { t: "کد v2.0.0 — قبل از ساخت" }, { t: "۱۸۱/۱۸۱ سبز" }],
    [{ t: "نصب و اجرا روی دستگاه" }, { t: "دستگاه فیزیکی / شبیه‌ساز" }, { t: "آزموده‌نشده روی دستگاه", b: true }],
  ],
  [30, 42, 28]
));
bodyChildren.push(body("دربارهٔ سطر آخر جدول: در محیط ساخت هیچ دستگاه فیزیکی یا شبیه‌ساز (KVM/AVD) وجود ندارد؛ بنابراین نصب و اجرای واقعی روی دستگاه انجام نشده و طبق اصل شفافیت، این مورد «آزموده‌نشده روی دستگاه» ثبت می‌شود و ادعایی فراتر از آن مطرح نمی‌گردد. مانع شناخته‌شده‌ای برای نصب وجود ندارد: امضای v2 معتبر است، zipalign صحیح است و minSdk در محدودهٔ پشتیبانی‌شده قرار دارد. تنها پیش‌نیاز کاربر نهایی، فعال‌کردن «نصب از منابع ناشناس» برای نصب خارج از فروشگاه است؛ این رفتار استاندارد اندروید برای APKهای خارج از فروشگاه است."));

// ۶ — سرور و نقش‌ها
bodyChildren.push(heading("۶) وضعیت سرور محصول و کنترل نقش‌ها", 1));
bodyChildren.push(body([
  { t: "سرور محصول در محیط استقرار زنده است و endpoint سلامت آن پاسخ " },
  { t: "{\"status\":\"ok\",\"database\":\"ok\"}", mono: true },
  { t: " می‌دهد؛ یعنی هم سرویس‌دهی و هم پایگاه داده سالم‌اند. اپ اندروید با سیاست «فقط https» طراحی شده و آدرس سرور را یک‌بار در صفحهٔ ورود از کاربر می‌گیرد و آن را با کلید سخت‌افزاری Android Keystore رمزنگاری و ذخیره می‌کند. هیچ آدرس یا رمزی داخل APK هاردکد نشده است و در صورت نیاز مالک، تزریق آدرس پیش‌فرض در زمان ساخت (RAHYAR_DEFAULT_SERVER) نیز پشتیبانی می‌شود. ورودی آدرس به‌شدت اعتبارسنجی می‌شود: localhost و بازه‌های داخلی رد می‌شوند تا نشست کاربر به سرور اشتباه هدایت نشود." },
]));
bodyChildren.push(body("کنترل نقش‌ها الزام‌آور در سمت سرور است، نه پنهان‌سازی در رابط کاربری: هر مسیر API با requireUser احراز هویت می‌شود و مسیرهای مدیریتی بدون نقش OWNER پاسخ 403 می‌دهند. در آزمون زندهٔ همین تحویل، درخواست بدون نشست به /api/users پاسخ 401 داد. نشست‌ها با scrypt و توکن تصادفی ۳۲ بایتی محافظت می‌شوند و در پایگاه داده فقط SHA-256 توکن ذخیره می‌شود تا افشای دیتابیس به معنای تسخیر نشست‌ها نباشد. راه‌اندازی اولیهٔ مالک در محیط تولید به توکن خارج از باند وابسته است؛ بنابراین «اولین نفری که فرم را پر کند» مالک نمی‌شود. APK هیچ رمز، توکن یا اعتبارنامه‌ای حمل نمی‌کند؛ تنها تفاوت دو ویراست، برند و پیش‌فرض نمایشی صفحهٔ ورود است."));

// ۷ — سورس و GitHub
bodyChildren.push(heading("۷) سورس متناظر و وضعیت انتشار در GitHub", 1));
bodyChildren.push(body("سورس متناظر با همین نسخه در انتهای شاخهٔ main ثبت شده است و تاریخچهٔ کامل آن در قالب git bundle (فایل rahyar-v2.0.0-source.bundle) تحویل شده است؛ این فایل با git bundle verify راستی‌آزمایی شده و با دستور git clone مستقیماً به مخزن کامل تبدیل می‌شود. تلاش برای push مستقیم به مخزن aresmaeily2/RahyAr انجام شد، اما محیط ساخت هیچ اعتبارنامه‌ای برای GitHub ندارد و خطای «could not read Username for 'https://github.com'» ثبت شد. این مانع واقعی محیط اجراست و مطابق اصل شفافیت، به‌جای ادعای انتشار موفق، به‌همراه سند و راه‌حل گزارش می‌شود."));
bodyChildren.push(body("پس از ایجاد مخزن خالی RahyAr در حساب aresmaeily2، انتشار سورس تنها دو دستور زیر را لازم دارد؛ پس از آن می‌توانید هویت سورس را با مقایسهٔ SHA-256 فایل bundle و commitها تأیید کنید:", { after: 80 }));
bodyChildren.push(code("git remote add rahyar https://github.com/aresmaeily2/RahyAr.git"));
bodyChildren.push(code("git push rahyar main", { after: 160 }));
bodyChildren.push(body("کلید امضا و رمزهای آن عمداً خارج از مخزن گیت قرار دارند (در .gitignore ثبت شده‌اند) و در بستهٔ سورس نیز وجود ندارند؛ این تصمیم آگاهانه برای جلوگیری از نشت اعتبارنامه است و با سیاست امنیتی دستور تحویل هم‌راستاست."));

// ۸ — تحویلی‌ها
bodyChildren.push(heading("۸) فایل‌های تحویلی و روش دانلود", 1));
bodyChildren.push(body("پنج فایل تحویل شده است که فهرست و کاربرد هر یک در جدول ۵ آمده است. فایل‌های APK به‌صورت باینری واقعی با پسوند .apk تحویل شده‌اند — نه ZIP و نه فایل تغییرنام‌یافته. علاوه بر تحویل مستقیم فایل‌ها در این گفتگو، روی سرور زندهٔ محصول نیز مسیر دانلود مستقیم با سفید‌لیست دقیق فعال شده است: الگوی /api/download/<نام‌فایل>. این مسیر بدون نشست هم پاسخ می‌دهد اما فقط همان نام‌های مشخص را سرو می‌کند و تلاش برای هر مسیر دیگر پاسخ 404 می‌دهد؛ بنابراین هم راحتی دانلود و هم کنترل دسترسی حفظ شده است."));
bodyChildren.push(tableTitle("جدول ۵ — فایل‌های تحویلی و اثر انگشت SHA-256"));
bodyChildren.push(makeTable(
  ["فایل", "کاربرد", "SHA-256"],
  [
    [{ t: "rahyar-user-v2.0.0.apk", ltr: true, size: 18 }, { t: "نصب نسخهٔ کاربر" }, { t: SHA_USER, ltr: true, size: 14 }],
    [{ t: "rahyar-owner-v2.0.0.apk", ltr: true, size: 18 }, { t: "نصب نسخهٔ مالک" }, { t: SHA_OWNER, ltr: true, size: 14 }],
    [{ t: "rahyar-release-signing-kit.zip", ltr: true, size: 18 }, { t: "کلید امضا + رمز + راهنما (محرمانه)" }, { t: "e1bb79f16c39fd3b04ab30076c57d59ff8b7c0568b2a7849b70f500af3d39214", ltr: true, size: 14 }],
    [{ t: "rahyar-v2.0.0-sha256.txt", ltr: true, size: 18 }, { t: "اثر انگشت همهٔ فایل‌ها" }, { t: "1b953fe4a94a9d80e5bd9ad741c4f81dec92bf32d30511284c74cd13b712263f", ltr: true, size: 14 }],
    [{ t: "rahyar-v2.0.0-source.bundle", ltr: true, size: 18 }, { t: "سورس کامل با تاریخچهٔ گیت" }, { t: "0ec9ebf4b71f4fb79dfb743bf1003aef79dec7d2dd86bcde244c3dd0f6de56d2", ltr: true, size: 14 }],
  ],
  [30, 28, 42]
));

// ۹ — نتیجه‌گیری
bodyChildren.push(heading("۹) نتیجه‌گیری و گام‌های بعدی", 1));
bodyChildren.push(body([
  { t: "معیار پذیرش مالک — «دو فایل مستقل با پسوند واقعی .apk، قابل دانلود و قابل نصب، با شناسه‌های بستهٔ مشخص‌شده و گزارش صحت‌سنجی کامل» — " },
  { t: "محقق شده است", b: true },
  { t: "؛ با دو ثبت صادقانه: آزمایش روی دستگاه فیزیکی انجام نشده و push مستقیم GitHub به دلیل نبود اعتبارنامه در محیط ساخت به تعویق افتاد. نسخهٔ حاضر Release واقعی و امضاشده است؛ اما برچسب «آمادهٔ انتشار در فروشگاه» تنها پس از تست دستگاهی مالک و در صورت تمایل، فعال‌سازی R8 و پیکربندی فروشگاه صادر خواهد شد. هر دو فایل اکنون برای توزیع مستقیم به کاربران و نصب آزمایشی مالک قابل استفاده‌اند." },
]));
bodyChildren.push(body("گام‌های پیشنهادی به ترتیب اجرا عبارت‌اند از: نخست، نصب هر دو APK روی یک دستگاه اندرویدی واقعی (اندروید ۷ به بالا) و ثبت نتیجهٔ نصب و اجرا؛ دوم، اجرای دو دستور push بخش ۷ پس از ایجاد مخزن RahyAr تا سورس متناظر عمومی و قابل استناد شود؛ سوم، نگهداری امن کیت امضا در محل مطمئن با نسخهٔ پشتیبان رمزنگاری‌شده؛ و چهارم، در صورت تمایل به انتشار در فروشگاه، اعلام نیاز تا minify و پیکربندی فروشگاه در همان زنجیرهٔ ساخت فعال شود. مسئولیت همهٔ این گام‌ها با مالک است و زمان اجرای آن‌ها بلافاصله پس از دریافت فایل‌هاست.", { after: 0 }));

// ═══════════════ سرصفحه/پاصفحه ═══════════════
function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FA_FONT })],
    })],
  });
}
const bodyHeader = new Header({
  children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "گزارش تحویل APK رهیار — نسخهٔ ۲٫۰٫۰", size: 18, sizeComplexScript: 18,
      color: "808080", font: FA_FONT, rightToLeft: true,
    })],
  })],
});

// ═══════════════ سند ═══════════════
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1417, right: 1701 }; // آینه‌ای برای RTL

const doc = new Document({
  creator: "RahyAr Delivery",
  title: "گزارش تحویل APK رهیار — نسخهٔ ۲٫۰٫۰",
  styles: {
    default: {
      document: {
        run: { font: FA_FONT, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FA_FONT, size: 32, bold: true, color: P.primary },
        paragraph: { spacing: { before: 400, after: 180, line: 340 } },
      },
      heading2: {
        run: { font: FA_FONT, size: 28, bold: true, color: P.primary },
        paragraph: { spacing: { before: 260, after: 140, line: 320 } },
      },
    },
  },
  sections: [
    { // سکشن ۱ — کاور (بدون شمارهٔ صفحه)
      properties: {
        page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1RTL({
        title: "گزارش تحویل رهیار ۲٫۰٫۰",
        subtitle: "دو APK امضاشدهٔ Release — ویراست کاربر (com.rahyarai.app) و ویراست مالک (com.rahyarai.app.owner)",
        englishLabel: "RAHYAR DELIVERY REPORT",
        metaLines: [
          "تاریخ ساخت و صحت‌سنجی: ۲۱ اکتبر ۲۰۲۶",
          "منبع ساخت: شاخهٔ main — commitهای 5fa3648 و 6a18922 و d8ce5e2",
          "وضعیت: Release واقعی — امضای v2 — ۴۹/۴۹ تست JVM در هر دو ویراست",
        ],
        footerLeft: "RahyAr v2.0.0 — Signed Release",
        footerRight: "محرمانه — ویژهٔ مالک پروژه",
        palette: { bg: P.bg, accentColor: P.accent, titleColor: P.cover.titleColor, subtitleColor: P.cover.subtitleColor, metaColor: P.cover.metaColor, footerColor: P.cover.footerColor },
      }),
    },
    { // سکشن ۲ — فهرست (شمارهٔ رومی)
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({
            text: "فهرست مطالب", bold: true, boldComplexScript: true,
            size: 32, sizeComplexScript: 32, color: P.primary, font: FA_FONT, rightToLeft: true,
          })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          bidirectional: true, spacing: { before: 200 },
          children: [new TextRun({
            text: "یادآوری: این فهرست با کد فیلد ساخته شده است؛ پس از باز کردن سند در Word، برای به‌روزرسانی شمارهٔ صفحات روی فهرست راست‌کلیک کنید و گزینهٔ Update Field را برگزینید.",
            italics: true, size: 18, sizeComplexScript: 18, color: "888888", font: FA_FONT, rightToLeft: true,
          })],
        }),
      ],
    },
    { // سکشن ۳ — بدنه (شمارهٔ عربی از ۱)
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: bodyHeader },
      footers: { default: pageNumFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/rahyar-v2.0.0-delivery-report.docx", buf);
  console.log("DOCX_WRITTEN", buf.length, "bytes");
});
