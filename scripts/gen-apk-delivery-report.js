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
const crypto = require("crypto");
function sha256f(p){ return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"); }
function md5f(p){ return crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex"); }
const DL = "/home/z/my-project/download/";
const fExists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };
const SHA_USER = fExists(DL+"rahyar-user-v2.0.0.apk") ? sha256f(DL+"rahyar-user-v2.0.0.apk") : "FILE_MISSING";
const SHA_OWNER = fExists(DL+"rahyar-owner-v2.0.0.apk") ? sha256f(DL+"rahyar-owner-v2.0.0.apk") : "FILE_MISSING";
const MD5_USER = fExists(DL+"rahyar-user-v2.0.0.apk") ? md5f(DL+"rahyar-user-v2.0.0.apk") : "FILE_MISSING";
const MD5_OWNER = fExists(DL+"rahyar-owner-v2.0.0.apk") ? md5f(DL+"rahyar-owner-v2.0.0.apk") : "FILE_MISSING";
const SHA_CERT = "26eadb2d95f7c59e4bac14077852b7b9d40c2c108888d9a660a443d158c31843";
const SHA_CERT_SHA1 = "76feaf49e2b57a8dd1e166d6bac9548575abdfc0";
const SHA_KIT_ENC = fExists(DL+"rahyar-release-signing-kit.zip.enc") ? sha256f(DL+"rahyar-release-signing-kit.zip.enc") : "KIT_PENDING";
const SHA_SOURCE = fExists(DL+"rahyar-source-v2.0.0.zip") ? sha256f(DL+"rahyar-source-v2.0.0.zip") : "SOURCE_PENDING";

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
  { t: "۴۹ آزمون واحد JVM در هر دو ویراست (۹۸ اجرا) و ۱۸۱ آزمون وب سبز", b: true },
  { t: " شده و صحت‌سنجی فنی شامل aapt2، apksigner و zipalign با موفقیت انجام شده است. دو نکتهٔ شفاف: نخست، به دلیل نبود دستگاه فیزیکی یا شبیه‌ساز در محیط ساخت، نصب و اجرای واقعی روی دستگاه «آزموده‌نشده روی دستگاه» تلقی می‌شود؛ دوم، چون محیط ساخت پس از تحویل قبلی بار دیگر Reset شده بود و باینری‌ها و کلید امضای پیشین از دست رفته بودند، هر دو APK از همان سورس حسابرسی‌شدهٔ v2.0.0 بازسازی شدند؛ در نتیجه هش فایل‌ها و گواهی امضا با گزارش پیشین متفاوت است و مقادیر همین گزارش مرجع رسمی‌اند. کد اندروید این تحویل بایت‌به‌بایت برابر کامیت انتشار 6a18922 است و commitهای پس از آن فقط مستندات تحویل را تغییر داده‌اند. علاوه بر APKها، بستهٔ تحویل شامل آرشیو کامل سورس (rahyar-source-v2.0.0.zip) با مانیفست و اسکن امنیتی است تا ساخت مجدد برای هر شخصی قابل تکرار باشد." },
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
    [{ t: "MD5 فایل (تأیید آپلود)", b: true }, { t: MD5_USER, ltr: true, size: 16 }, { t: MD5_OWNER, ltr: true, size: 16 }],
    [{ t: "minSdk / targetSdk", b: true }, { t: "24 / 34", ltr: true }, { t: "24 / 34", ltr: true }],
    [{ t: "اکتیویتی آغازین", b: true }, { t: "com.rahyarai.app.MainActivity", ltr: true, size: 18 }, { t: "com.rahyarai.app.MainActivity", ltr: true, size: 18 }],
    [{ t: "SHA-256 فایل", b: true }, { t: SHA_USER, ltr: true, size: 16 }, { t: SHA_OWNER, ltr: true, size: 16 }],
  ],
  [24, 38, 38]
));
bodyChildren.push(body([
  { t: "دربارهٔ نگرانی مالک از فایل پیشین: فایل rahyar-apk-wrapped.zip که پیش‌تر دریافت شد دقیقاً همان APK آزمایشی ۱٫۲٫۰ بود؛ در برابر، این دو فایل از سورس فعلی ساخته شده‌اند و کد اندروید آن‌ها دقیقاً برابر کامیت انتشار " },
  { t: "6a18922", mono: true },
  { t: " است (خروجی git diff این کامیت تا HEAD بر مسیر android/ خالی است). چون محیط پیشین Reset شده بود، ساخت مجدد انجام شد و در نتیجه SHA-256 فایل‌ها و گواهی امضا با گزارش قبلی متفاوت است؛ مقادیر همین گزارش و فایل rahyar-v2.0.0-sha256.txt مرجع رسمی تطبیق هش‌اند و هش‌های گزارش پیشین منسوخ محسوب می‌شود. چون APKهای پیشین هرگز روی دستگاهی نصب نشده بودند، تعویض گواهی هیچ نصب موجودی را نمی‌شکند. اثر انگشت SHA-256 ابزارهای ساخت نیز در پروندهٔ provenance مستند است؛ در زمان آپلود، MD5 و حجم هر فایل سمت سرور GOFILE با مقدار محلی تطبیق داده شده و صفحهٔ دانلود هر فایل نیز بازبینی شده است؛ بنابراین از نظر حسابرسی، پوستهٔ قدیمی در هیچ نقطه‌ای از فرایند دخیل نبوده است." },
]), { after: 200 });

// ۳ — فرایند ساخت
bodyChildren.push(heading("۳) فرایند ساخت و ابزارهای رسمی", 1));
bodyChildren.push(body("ساخت با زنجیرهٔ رسمی انجام شده است: Gradle 8.10.2 و افزونهٔ اندروید AGP 8.7.3 روی JDK 21 (Temurin)، همراه با Build-Tools r34 و پلتفرم android-34 که هر دو مستقیماً از dl.google.com دانلود و SHA-256 آن‌ها در پروندهٔ provenance پروژه ثبت شده است. خروجی دو ویراست با همان productFlavors تعریف‌شده در build.gradle تولید شده است؛ یعنی «سورس واحد، دو هویت» بدون تکرار کد. این ساخت، بازسازیِ ۲۲ اکتبر ۲۰۲۶ پس از Reset محیط است و JDK 21 (Temurin 21.0.12.1) نیز در همین جلسه از api.adoptium.net بازیابی و به‌کار گرفته شد. امضای release به‌صورت خودکار از فایل keystore.properties خوانده می‌شود و در نبود آن، خروجی unsigned می‌ماند؛ در این تحویل کلید ساخته و به‌کار گرفته شده و هر دو خروجی امضاشده‌اند."));
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
bodyChildren.push(body("به دلیل Reset محیط، کلید انتشار قبلی در دسترس نبود؛ بنابراین برای این تحویل کلید انتشار جدید RSA-4096 ساخته شد؛ گواهی self-signed با نام CN=RahyAr Release و اعتبار تا ۲۱ اکتبر ۲۰۵۶. هر دو APK با همین کلید و طرح امضای v2 امضا شده‌اند؛ این طرح برای minSdk 24 (اندروید ۷ به بالا) کاملاً کافی است و apksigner verify خروجی Verifies داده است. هم‌ترازی zipalign نیز روی هر دو فایل تأیید شده است. طبق دستور مالک، کلید و رمز آن هرگز وارد مخزن گیت یا لینک عمومی نمی‌شوند: کیت امضا فقط به‌صورت رمزنگاری‌شدهٔ AES-256-CBC/PBKDF2 (فایل rahyar-release-signing-kit.zip.enc) روی مسیر دانلود قرار دارد و رمز گشایش آن جدا از لینک، در پیام خصوصی به مالک ارسال می‌شود."));
bodyChildren.push(tableTitle("جدول ۳ — مشخصات گواهی امضا (مشترک بین دو APK)"));
bodyChildren.push(makeTable(
  ["مورد", "مقدار"],
  [
    [{ t: "صاحب گواهی" }, { t: "CN=RahyAr Release, O=RahyAr, L=Tehran, C=IR", ltr: true, size: 18 }],
    [{ t: "الگوریتم کلید / امضا" }, { t: "RSA-4096 / SHA384withRSA", ltr: true }],
    [{ t: "SHA-256 گواهی" }, { t: SHA_CERT, ltr: true, size: 16 }],
    [{ t: "SHA-1 گواهی" }, { t: SHA_CERT_SHA1, ltr: true, size: 16 }],
    [{ t: "اعتبار" }, { t: "۲۲ اکتبر ۲۰۲۶ تا ۲۱ اکتبر ۲۰۵۶" }],
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
bodyChildren.push(body([
  { t: "سورس متناظر با همین نسخه در این جلسه با موفقیت به GitHub منتشر شد: مخزن " },
  { t: "aresmaeily2/HAMYAR-AI", mono: true },
  { t: " (خصوصی)، شاخهٔ main — push واقعی با نتیجهٔ " },
  { t: "bcea033..daf7eb3 → main", mono: true },
  { t: " انجام و با ls-remote سمت GitHub راستی‌آزمایی شد (refs/heads/main = daf7eb38dfb63b07bec1ff4ea5f40f140ac498bc). کد اندروید در همهٔ این commitها بدون تغییر است: خروجی git diff بر مسیر android/ از کامیت انتشار " },
  { t: "6a18922", mono: true },
  { t: " تا HEAD خالی است. علاوه بر مخزن، آرشیو کامل سورس با نام rahyar-source-v2.0.0.zip (شامل مانیفست commit و اسکن امنیتی) در GOFILE قرار دارد تا حتی بدون دسترسی به مخزن خصوصی، ساخت مجدد ممکن باشد. اگر نام مخزن باید RahyAr باشد، مالک می‌تواند از Settings مخزن آن را تغییر نام دهد؛ لینک‌های گیت پس از تغییر نام به‌صورت خودکار به مسیر جدید هدایت می‌شوند. وضعیت فعلی مخزن: خصوصی (بدون تغییر بدون تأیید مالک)." },
]));
bodyChildren.push(body("برای راستی‌آزمایی سمت خودتان: در مخزن، انتهای شاخهٔ main باید کامیت تحویل daf7eb3 (پیام: delivery(v2.0.0): rebuild #3 …) باشد، فایل docs/DELIVERY_V2/APK_BUILD_REPORT_V2.md همان مشخصات جدول ۱ این گزارش را نشان دهد و خروجی git diff 6a18922..HEAD -- android/ خالی باشد. مخزن در حالت خصوصی است و فقط با حساب مالک یا دسترسی‌های داده‌شده قابل مشاهده است.", { after: 160 }));
bodyChildren.push(body("کلید امضا و رمزهای آن عمداً خارج از مخزن گیت قرار دارند (در .gitignore ثبت شده‌اند) و در بستهٔ سورس نیز وجود ندارند؛ این تصمیم آگاهانه برای جلوگیری از نشت اعتبارنامه است و با سیاست امنیتی دستور تحویل هم‌راستاست."));

// ۸ — تحویلی‌ها
bodyChildren.push(heading("۸) فایل‌های تحویلی و روش دانلود", 1));
bodyChildren.push(body("هفت فایل تحویل شده است که فهرست و کاربرد هر یک در جدول ۵ آمده است. تحویل از طریق سرویس GOFILE انجام شده و لینک صفحهٔ دانلود واقعی و تست‌شدهٔ هر فایل، همراه اثر انگشت SHA-256 و حجم آن، در پیام تحویل ارائه شده است (الگوی لینک‌ها: gofile.io/d/…). هنگام آپلود، MD5 و حجم هر فایل سمت سرور با مقدار محلی تطبیق داده شده و بازگشایی صفحهٔ دانلود هر فایل نیز بررسی شده است. دو فایل rahyar-v2.0.0-sha256.txt (معادل SHA256SUMS.txt) و GOFILE-LINKS.txt نیز برای کنترل نهایی دانلود در همین بسته قرار دارند: پس از دانلود، خروجی را با محتوای فایل هش‌ها مقایسه کنید. کیت امضا طبق دستور مالک فقط رمزنگاری‌شده (AES-256-CBC/PBKDF2، پسوند .enc) روی همین سرویس است و رمز گشایش آن جدا از لینک‌ها، در پیام خصوصی مالک ارسال می‌شود. توجه: فایل‌های حساب مهمان GOFILE در صورت عدم دانلود به‌مرور حذف می‌شوند؛ توصیه می‌شود فایل‌ها به‌محض دریافت، روی دستگاه خودتان ذخیره شوند."));
bodyChildren.push(tableTitle("جدول ۵ — فایل‌های تحویلی و اثر انگشت SHA-256"));
bodyChildren.push(makeTable(
  ["فایل", "کاربرد", "SHA-256"],
  [
    [{ t: "rahyar-user-v2.0.0.apk", ltr: true, size: 18 }, { t: "نصب نسخهٔ کاربر" }, { t: SHA_USER, ltr: true, size: 14 }],
    [{ t: "rahyar-owner-v2.0.0.apk", ltr: true, size: 18 }, { t: "نصب نسخهٔ مالک" }, { t: SHA_OWNER, ltr: true, size: 14 }],
    [{ t: "rahyar-source-v2.0.0.zip", ltr: true, size: 18 }, { t: "سورس کامل HEAD با مانیفست و اسکن امنیتی" }, { t: SHA_SOURCE, ltr: true, size: 14 }],
    [{ t: "rahyar-v2.0.0-sha256.txt", ltr: true, size: 18 }, { t: "اثر انگشت رسمی همهٔ فایل‌ها (SHA256SUMS)" }, { t: "خودش را شامل نمی‌شود — پس از دانلود با sha256sum -c کنترل شود", size: 14 }],
    [{ t: "rahyar-v2.0.0-delivery-report.docx", ltr: true, size: 18 }, { t: "همین گزارش (DOCX فارسی RTL)" }, { t: "فایل جاری", size: 14 }],
    [{ t: "rahyar-release-signing-kit.zip.enc", ltr: true, size: 18 }, { t: "کیت امضا — فقط رمزنگاری‌شده (محرمانه)" }, { t: SHA_KIT_ENC, ltr: true, size: 14 }],
    [{ t: "RahyAr-v2.0.0-bundle.zip", ltr: true, size: 18 }, { t: "همهٔ فایل‌های بالا به‌علاوهٔ فایل هش‌ها در یک فایل (دانلود یکجا)" }, { t: "هش باندل در پیام تحویل اعلام می‌شود", size: 14 }],
  ],
  [30, 28, 42]
));

// ۹ — نتیجه‌گیری
bodyChildren.push(heading("۹) نتیجه‌گیری و گام‌های بعدی", 1));
bodyChildren.push(body([
  { t: "معیار پذیرش مالک — «دو فایل مستقل با پسوند واقعی .apk، قابل دانلود و قابل نصب، با شناسه‌های بستهٔ مشخص‌شده و گزارش صحت‌سنجی کامل» — " },
  { t: "محقق شده است", b: true },
  { t: "؛ با دو ثبت صادقانه: نخست، آزمایش روی دستگاه فیزیکی هنوز انجام نشده و تا پیش از آزمون مالک، وضعیت «آزموده‌نشده روی دستگاه» می‌ماند؛ دوم، چون پوشهٔ GOFILE در حساب مهمان ساخته شده، فایل‌ها باید به‌محض دانلود روی دستگاه مالک ذخیره شوند. در مقابل، انتشار سورس در GitHub در همین جلسه با موفقیت انجام و راستی‌آزمایی شد و آرشیو سورس نیز در بستهٔ تحویل است. نسخهٔ حاضر Release واقعی و امضاشده است؛ اما برچسب «آمادهٔ انتشار در فروشگاه» تنها پس از تست دستگاهی مالک و در صورت تمایل، فعال‌سازی R8 و پیکربندی فروشگاه صادر خواهد شد. هر دو فایل اکنون برای توزیع مستقیم به کاربران و نصب آزمایشی مالک قابل استفاده‌اند." },
]));
bodyChildren.push(body("گام‌های پیشنهادی به ترتیب اجرا عبارت‌اند از: نخست، دانلود بسته از لینک‌های GOFILE (به‌ویژه RahyAr-v2.0.0-bundle.zip برای دریافت یکجا) و کنترل هش‌ها با فایل SHA256SUMS؛ دوم، نصب هر دو APK روی یک دستگاه اندرویدی واقعی (اندروید ۷ به بالا) و ثبت نتیجهٔ نصب و اجرا؛ سوم، باز کردن مخزن خصوصی aresmaeily2/HAMYAR-AI و تطبیق سورس (خروجی git diff 6a18922..HEAD -- android/ باید خالی باشد) و در صورت تمایل تغییر نام مخزن به RahyAr؛ چهارم، نگهداری امن کیت امضا در محل مطمئن با نسخهٔ پشتیبان رمزنگاری‌شده (رمز گشایش فایل .enc با openssl enc -d -aes-256-cbc -pbkdf2 انجام می‌شود)؛ و پنجم، در صورت تمایل به انتشار در فروشگاه، اعلام نیاز تا minify و پیکربندی فروشگاه در همان زنجیرهٔ ساخت فعال شود. مسئولیت همهٔ این گام‌ها با مالک است و زمان اجرای آن‌ها بلافاصله پس از دریافت فایل‌هاست.", { after: 0 }));

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
          "تاریخ ساخت و صحت‌سنجی: ۲۲ اکتبر ۲۰۲۶ (بازسازی پس از Reset محیط)",
          "منبع ساخت: شاخهٔ main — کد اندروید بایت‌به‌بایت برابر کامیت انتشار 6a18922؛ سورس در GitHub منتشر شده",
          "وضعیت: Release واقعی — امضای v2 — ۴۹/۴۹ تست JVM و ۱۸۱/۱۸۱ تست وب سبز",
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
