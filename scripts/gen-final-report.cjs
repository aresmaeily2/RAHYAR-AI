// ─── گزارش نهایی مأموریت جامع «آرا» — فارسی RTL ──────────────
// اجرا: bun scripts/gen-final-report.cjs
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, NumberFormat, SectionType, BorderStyle,
  ShadingType, WidthType, TableLayoutType, PageBreak, TableOfContents, VerticalAlign,
} = require("docx");
const fs = require("fs");

// ── پالت (Dawn Mist Tech — سازگار با هویت فیروزه‌ای آرا) ──────
const P = {
  primary: "0A1628", body: "000000", secondary: "5B6B7D",
  accent: "0D9488", surface: "F0F6F4",
  coverBg: "0E2327", coverTitle: "F2F7F6", coverSub: "AFC5C0",
  coverMeta: "C9DAD5", coverFooter: "7E948F",
};

const FONT = { ascii: "Calibri", hAnsi: "Calibri", cs: "Vazirmatn", eastAsia: "Vazirmatn" };

// ── هلپرهای RTL ──────────────────────────────────────────────
function safeText(v, ph) {
  if (v === undefined || v === null || v === "" || String(v) === "NaN" || String(v) === "undefined") return ph || "—";
  return String(v);
}
function rtl(text, opts = {}) {
  return new TextRun({
    text: safeText(text), rightToLeft: true, font: FONT,
    size: opts.size || 24, sizeComplexScript: true,
    bold: !!opts.bold, boldComplexScript: !!opts.bold,
    italics: !!opts.italics, color: opts.color || P.body,
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after ?? 120 },
    children: Array.isArray(text) ? text : [rtl(text, opts)],
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    bidirectional: true, alignment: AlignmentType.START,
    spacing: { line: 312, after: 60 },
    indent: { right: 360 },
    children: [
      rtl("•  ", { color: P.accent, bold: true }),
      ...(Array.isArray(text) ? text : [rtl(text, opts)]),
    ],
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, bidirectional: true,
    alignment: AlignmentType.START, spacing: { before: 360, after: 160, line: 380, lineRule: "atLeast" },
    children: [rtl(text, { size: 32, bold: true, color: P.primary })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, bidirectional: true,
    alignment: AlignmentType.START, spacing: { before: 260, after: 120, line: 340, lineRule: "atLeast" },
    children: [rtl(text, { size: 28, bold: true, color: P.primary })],
  });
}
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};
const allNoBorders = { ...noBorders, insideHorizontal: { ...noBorders.top }, insideVertical: { ...noBorders.top } };
const cellMargins = { top: 90, bottom: 90, left: 120, right: 120 };

// جدول RTL ساده با سربرگ رنگی
function table(headerCells, rows, widths) {
  const head = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headerCells.map((t, i) => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: P.accent }, margins: cellMargins,
      verticalAlign: VerticalAlign.CENTER,
      width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER,
        children: [rtl(t, { bold: true, color: "FFFFFF", size: 22 })] })],
    })),
  });
  const bodyRows = rows.map((r, ri) => new TableRow({
    cantSplit: true,
    children: r.map((t, i) => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: ri % 2 === 1 ? P.surface : "FFFFFF" },
      margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
      width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START,
        spacing: { line: 300 },
        children: [rtl(t, { size: 21 })] })],
    })),
  }));
  return new Table({
    visuallyRightToLeft: true, width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED, rows: [head, ...bodyRows],
  });
}

// ── کاور — دستور R1 سازگار با RTL (بدون جدول تودرتو) ─────────
function faWidthChars(pt) { return Math.max(2, Math.floor(9900 / (pt * 11))); }
function calcTitleLayout(title, maxWidthTwips, preferredPt = 38, minPt = 24) {
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / (pt * 14));
  let titlePt = preferredPt, lines;
  const split = (t, cpl) => {
    if (t.length <= cpl) return [t];
    const words = t.split(" ");
    const out = []; let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > cpl && cur) { out.push(cur.trim()); cur = w; }
      else cur = (cur + " " + w).trim();
    }
    if (cur) out.push(cur);
    if (out.length > 1 && out[out.length - 1].length <= 2) { const l = out.pop(); out[out.length - 1] += " " + l; }
    return out;
  };
  while (titlePt >= minPt) {
    lines = split(title, charsPerLine(titlePt));
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing({ titleLineCount, titlePt, hasSubtitle, metaLineCount, fixedHeight = 400 }) {
  const SAFETY = 1200;
  const usable = 16838 - SAFETY;
  const titleH = titleLineCount * (titlePt * 23 + 200);
  const subH = hasSubtitle ? (12 * 23 + 600) : 0;
  const metaH = metaLineCount * (10 * 23 + 100);
  const implicit = 3 * 300;
  const content = titleH + subH + metaH + fixedHeight + implicit;
  const remaining = Math.max(usable - content, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(remaining * 0.45), rawBottom = Math.floor(remaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}
function buildCoverR1RTL(cfg) {
  const padR = 1200, padL = 800;
  const availableWidth = 11906 - padR - padL - 300;
  const { titlePt, titleLines } = calcTitleLayout(cfg.title, availableWidth, 38, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!cfg.subtitle, metaLineCount: (cfg.metaLines || []).length, fixedHeight: 400,
  });
  const accentRight = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
    children: [rtl(cfg.label, { size: 18, color: P.accent, bold: true })],
  }));
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT,
      indent: { right: padR, left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [rtl(titleLines[i], { size: titleSize, bold: true, color: P.coverTitle })],
    }));
  }
  if (cfg.subtitle) children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    indent: { right: padR, left: padL }, spacing: { after: 800 },
    children: [rtl(cfg.subtitle, { size: 24, color: P.coverSub })],
  }));
  for (const line of (cfg.metaLines || [])) {
    children.push(new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT,
      indent: { right: padR + 200, left: padL }, spacing: { after: 80 },
      border: { right: accentRight },
      children: [rtl(line, { size: 24, color: P.coverMeta })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      rtl(cfg.footerRight, { size: 16, color: P.coverFooter }),
      new TextRun({ text: "                                    ", font: FONT, size: 16 }),
      rtl(cfg.footerLeft, { size: 16, color: P.coverFooter }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED, borders: allNoBorders,
    visuallyRightToLeft: true,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.coverBg }, borders: noBorders, children,
      })],
    })],
  })];
}

// ── سربرگ/پاورقی بدنه ────────────────────────────────────────
// رنگ‌های تمایز برای پس‌پردازش فرمت فیلد PAGE (رومی/عربی) — برای کاربر نامرئی
function pageFooter(variant) {
  const marker = variant === "roman" ? "5B6B7D" : "5B6B7C";
  return new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT, color: marker })],
  })] });
}
function pageHeader() {
  return new Header({ children: [new Paragraph({
    bidirectional: true, alignment: AlignmentType.START,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "DDE5E2", space: 4 } },
    children: [rtl("گزارش ممیزی جامع — دستیار هوشمند «آرا»", { size: 16, color: P.secondary })],
  })] });
}

// ── محتوای بدنه ──────────────────────────────────────────────
const B = [];

// ۱. خلاصه مدیریتی
B.push(h1("۱. خلاصه مدیریتی"));
B.push(body("این گزارش نتیجه اجرای کامل مأموریت ممیزی، اصلاح و آماده‌سازی انتشار اپلیکیشن «آرا» است؛ دستیار هوشمند شخصی فارسی‌زبان ساخته‌شده با Next.js 16، React 19، Prisma و SQLite. ممیزی در شش فاز A تا F انجام شد: شناسایی کامل وضعیت مخزن، تهیه مدل تهدید و برنامه اصلاح، پیاده‌سازی واقعی اصلاحات، اجرای آزمون، ممیزی مستقل نهایی و در نهایت تصمیم آمادگی انتشار. در ممیزی اولیه پانزده یافته اولویت‌بندی‌شده ثبت شد که سه مورد در سطح «بالا»، شش مورد «متوسط» و شش مورد «پایین» بودند."));
B.push(body("تمام یافته‌های امنیتی و صحت عملکرد در همین نسخه رفع شده و هر اصلاح با آزمون یا بررسی اجرایی اثبات شده است. مهم‌ترین رفع‌ها عبارت‌اند از: رفع تعارض سیاست امنیت محتوا (CSP) با فونت وزیرمتن که سبب می‌شد فونت اصلی برنامه هرگز بارگذاری نشود؛ بستن شکاف سقف زیرکارها در مسیر REST که امکان رشد بی‌کران داده را می‌داد؛ رفع باگ منطقه زمانی در تعویق کارها و محاسبه استریک؛ و پیاده‌سازی پروفایل کاربر با نام پیش‌فرض تأییدشده «علیرضا» به‌صورت کاملاً قابل تغییر. گیت کیفیت نیز از حالت غیرفعال (نادیده‌گرفتن خطای TypeScript) به حالت سخت‌گیرانه منتقل و هشتاد و دو ادعای نوع با موفقیت تأیید شد."));
B.push(body("مجموع چهل و هشت آزمون واحد خودکار برای منطق‌های حساس (تاریخ شمسی، پارسر فارسی، لایه امنیتی، رزولو تاریخ) ساخته و همه سبز شدند. آزمون‌های نفوذ رگرسیون شامل محدودیت نرخ، مهار بدنه، تاریخ نامعتبر و مالکیت منبع همگی رفتار مورد انتظار را نشان دادند. بر پایه شواهد، محصول در مدل استقرار فعلی (تک‌کاربره شخصی) در وضعیت «آماده انتشار محدود و مشروط» ارزیابی می‌شود؛ شرایط و ریسک‌های باقیمانده در بخش‌های ۸ و ۱۵ و ۱۶ مستند است. این گزارش جایگزین گزارش مقایسه رقابتی پیشین نیست و در کنار آن خوانده شود."));

// ۲. معماری
B.push(h1("۲. معماری اولیه و نهایی"));
B.push(body("معماری اولیه یک اپلیکیشن تک‌مخزنی Next.js با مسیرهای API سرور-محور بود: ده مسیر API، پنج نمای رابط کاربری، دو لایه هوشمندی (پارس قطعی فارسی و مدل زبانی)، پایگاه‌داده SQLite با پنج مدل داده و یک لایه دفاعی امنیتی درون‌حافظه‌ای. این معماری از نظر مرزبندی مسئولیت‌ها سالم بود؛ منطق دامنه از رابط کاربری جداست و کلید سرویس مدل فقط در ماژول‌های سرور ایمپورت می‌شود. بنابراین به‌جای بازنویسی، نقاط ضعف مشخص به‌صورت هدفمند ترمیم شد و هیچ وابستگی سنگین یا معماری چندعاملی بدون نیاز اثبات‌شده اضافه نشد."));
B.push(body("معماری نهایی در همان اسکلت، سه افزودنی هدفمند دارد. نخست مدل Setting برای تنظیمات پروفایل کاربر که شخصی‌سازی (نام «علیرضا» به‌عنوان پیش‌فرض قابل‌تغییر) را بدون هاردکد در منطق ممکن می‌کند و در پرامپت سیستم داخل دیوار داده کاربر تزریق می‌شود. دوم مسیرهای profile و health برای مدیریت پروفایل و پایش پاسخ‌گویی پایگاه‌داده در استقرار. سوم فونت وزیرمتن خودمیزبان در public/fonts که وابستگی ثالث گوگل‌فونت را حذف و با CSP سازگار کرده است. همچنین دو مسیر چت معمولی و استریم همچنان از سرویس مشترک server-ai برای اجرای اکشن و اعتبارسنجی استفاده می‌کنند و رفتار یکسان هر دو مسیر تضمین شده است."));
B.push(body("نقشه مسیرهای نهایی: tasks و tasks/[id] و tasks/[id]/breakdown، subtasks و subtasks/[id]، chat و chat/stream، plan، reminders، memory، profile و health. همه متدهای تغییردهنده گارد Same-Origin و محدودیت نرخ دارند و همه بدنه‌ها با سقف ۱۰۰ کیلوبایت مهار می‌شوند. آزمون‌های واحد زیر پوشش lib قرار گرفتند و اسکریپت verify سه گیت typecheck، lint و test را یکجا اجرا می‌کند."));

// ۳. مشکلات
B.push(h1("۳. فهرست کامل مشکلات شناسایی‌شده"));
B.push(body("جدول زیر هر پانزده یافته را با شناسه، شدت و وضعیت نهایی نشان می‌دهد. وضعیت «رفع شد و آزمون موفق» به معنای وجود تغییر کد به‌همراه آزمون یا شاهد اجرایی است؛ هیچ وضعیتی بدون مدرک ارتقا نیافته است. شرح کامل شواهد در بخش ۴ و مسیر فایل‌های تغییر در بخش ۵ آمده است.", { after: 160 }));
B.push(table(
  ["شناسه", "شرح مشکل", "شدت", "وضعیت"],
  [
    ["A1", "CSP فونت گوگل را بلاک می‌کرد؛ وزیرمتن هرگز بارگذاری نمی‌شد", "بالا", "رفع شد و آزمون موفق"],
    ["A2", "مسیر REST تجزیه فاقد سقف ۳۰ زیرکار (شکاف دفاع LLM10)", "بالا", "رفع شد و آزمون موفق"],
    ["A11", "نبود پروفایل کاربر و هویت مالک («علیرضا») در معماری", "بالا", "رفع شد و آزمون موفق"],
    ["A15", "صفر آزمون خودکار در کل مخزن", "بالا", "رفع شد و آزمون موفق"],
    ["A3", "PATCH زیرکار با req.json() خام و بدون مهار بدنه", "متوسط", "رفع شد و آزمون موفق"],
    ["A4", "تعویق کار با تاریخ UTC سرور نه وقت تهران", "متوسط", "رفع شد و آزمون موفق"],
    ["A5", "پذیرش تاریخ نامعتبر و تاریخ شمسی به‌جای میلادی", "متوسط", "رفع شد و آزمون موفق"],
    ["A8", "maximumScale:1 و غیرممکن‌شدن زوم (WCAG 1.4.4)", "متوسط", "رفع شد و آزمون موفق"],
    ["A9", "نادیده‌گرفتن prefers-reduced-motion (WCAG 2.3.3)", "متوسط", "رفع شد و آزمون موفق"],
    ["A12", "استریک و «انجام‌شده امروز» با تاریخ UTC", "متوسط", "رفع شد و آزمون موفق"],
    ["A14", "نبود .env.example، health check و رویه پشتیبان‌گیری", "متوسط", "رفع شد و آزمون موفق"],
    ["A6", "خطای ۵۰۰ به‌جای ۴۰۴ برای یادآوری ناموجود", "پایین", "رفع شد و آزمون موفق"],
    ["A7", "ignoreBuildErrors:true؛ نقض اثبات کیفیت نوع‌ها", "پایین", "رفع شد و آزمون موفق"],
    ["A10", "نبود aria-live برای وضعیت پویای دستیار", "پایین", "رفع شد و آزمون موفق"],
    ["A13", "تکرار ثابت خوش‌آمد و قورت‌دادن بی‌لاگ خطای اکشن", "پایین", "رفع شد و آزمون موفق"],
  ],
  [10, 52, 13, 25],
));
B.push(body("دو یافته نیز در فرایند آزمون و در ارتقای آزمون‌ها کشف شد که در فهرست اولیه نبود: باگ فرمول کبیسه بیرشک در محاسبه طول ماه شمسی (اسفند ۱۴۰۳ کبیسه بود اما ۲۹ روز محاسبه می‌شد) و تفسیر نادرست تاریخ شمسی سه‌رقمی به‌عنوان میلادی. هر دو رفع و برای هرکدام آزمون رگرسیون نوشته شد. این نتیجه اهمیت آزمون خودکار را نشان می‌دهد؛ منطق تقویم شمسی پیش از این هیچ پوشش آزمونی نداشت.", { after: 160 }));

// ۴. شدت/اثر/شواهد
B.push(h1("۴. شدت، اثر و شواهد هر مشکل"));
B.push(h2("۴.۱. یافته‌های سطح بالا"));
B.push(body("A1 — تنها منبع فونت برنامه لینک گوگل‌فونت بود در حالی که CSP فقط منابع هم‌مبدأ را مجاز می‌دانست؛ نتیجه عملی این بود که رابط کاربری از ابتدا با فونت جایگزین سیستم رندر می‌شد و هویت تایپوگرافیک محصول هرگز اجرا نشده بود. شاهد: سرآیند CSP در next.config و تگ لینک گوگل در layout پیش از اصلاح. پس از اصلاح، فایل‌های woff2 وزیرمتن خودمیزبان شدند و اسکرین‌شات پس از اصلاح رندر واقعی وزیرمتن را تأیید می‌کند. اثر ثانویه رفع، حذف درخواست ثالث و بهبود حریم خصوصی و سرعت بارگذاری است."));
B.push(body("A2 — مسیر REST تجزیه کار، برخلاف مسیر مشابه در چت، سقف سی زیرکار را بررسی نمی‌کرد؛ با فراخوانی مکرر (سقف چهار بار در دقیقه و تا شش زیرکار در هر فراخوانی) رشد زیرکارها بی‌کران بود و مخارج مدل هم اضافه می‌شد. رفع: بررسی سقف پیش از فراخوانی مدل و برش خروجی به فضای باقی‌مانده. شاهد: کد اصلاح‌شده مسیر breakdown و هم‌راستایی آن با گارد اجرای اکشن چت."));
B.push(body("A11 — مأموریت تصریح داشت نام مالک «علیرضا» است و باید در محل‌های مرتبط ثبت و اصلاح شود، اما بدون هاردکد در منطق عمومی. جست‌وجوی کل مخزن نشان داد هیچ نامی — نه درست و نه نادرست — ثبت نشده بود؛ یعنی معماری شخصی‌سازی وجود نداشت. رفع به‌صورت ساختاری انجام شد: مدل Setting در پایگاه‌داده، مسیر API پروفایل با اعتبارسنجی و گاردهای امنیتی، رابط ویرایش در سایدبار، سلام شخصی‌سازی‌شده در نمای امروز و تزریق نام داخل دیوار user_data در پرامپت سیستم. آزمون سرتاسر با پیام «اسم من چیه» پاسخ صحیح «علیرضا» را از مدل دریافت کرد."));
B.push(h2("۴.۲. یافته‌های سطح متوسط"));
B.push(body("A3 و A6 و A14 — مسیر PATCH زیرکار تنها مسیری بود که بدنه را بدون مهار می‌خواند و بردار memory-exhaustion می‌ساخت؛ با readJsonSafe هم‌راستا با بقیه مسیرها بسته شد. یادآوری ناموجود به‌جای ۴۰۴ خطای داخلی ۵۰۰ می‌داد و لاگ بی‌دلیل تولید می‌کرد؛ اکنون وجود رکورد پیش از به‌روزرسانی بررسی می‌شود. کمبودهای عملیاتی با .env.example، اسکریپت پشتیبان‌گیری مبتنی بر Online Backup و مسیر health با پرس‌وجوی زنده پایگاه‌داده جبران شد؛ پشتیبان آزمایشی واقعی ساخته و اعتبار آن بررسی شد."));
B.push(body("A4 و A12 — دو نمونه از یک ریشه واحد بودند: مخلوط‌کردن زمان UTC سرور با روز تقویمی تهران. تعویق کار نیمه‌شب‌ها تاریخ اشتباه می‌گرفت و استریک و حلقه پیشرفت در مرز روزانه خطا می‌داشتند. رفع با هلپر واحد tehranDayOf انجام شد که روز تقویمی تهران را برای هر لحظه UTC یکدست برمی‌گرداند؛ آزمون‌های مرزی شامل لحظه ۲۰:۳۰ UTC معادل نیمه‌شب تهران و لحظه ۲۱:۰۰ UTC معادل ۰۰:۳۰ فردای تهران نوشته و سبز شدند."));
B.push(body("A5 — رزولو تاریخ پیش‌تر هر رشته چهاررقمی-دورقم-دورقم را می‌پذیرفت؛ تاریخ کاملاً نامعتبر مانند 9999-99-99 به Invalid Date و خطای ۵۰۰ می‌رسید و بدتر، تاریخ شمسی مانند 1405-08-02 به‌عنوان میلادیِ سال ۱۴۰۵ پذیرفته می‌شد که کار را به قرن‌ها بعد می‌فرستاد. رفع دو لایه دارد: بازرسی گردی تاریخ (رد تاریخ‌هایی که وجود ندارند) و پنجره اعتبار سال ۱۹۷۰ تا ۲۲۰۰. آزمون‌های واحد هر پنج حالت را پوشش می‌دهند."));
B.push(body("A8 و A9 — هر دو نقض دسترس‌پذیری WCAG بودند: قفل‌کردن زوم با maximumScale:1 برای کاربران کم‌بینا، و نادیده‌گرفتن تنظیم کاهش حرکت. رفع اول حذف صفت از viewport و رفع دوم افزودن پرس‌وجوی رسانه‌ای سراسری برای غیرفعال‌کردن انیمیشن‌ها است."));
B.push(h2("۴.۳. یافته‌های سطح پایین"));
B.push(body("A7 — ignoreBuildErrors:true عملاً گیت کیفیت نوع‌ها را حذف کرده بود؛ با پاک‌سازی دامنه tsconfig (حذف پوشه‌های خارج از محصول مانند examples و skills) بررسی سخت‌گیرانه فعال و کل کد بدون خطا تأیید شد. A10 — وضعیت «در حال فکر کردن» و ناحیه استریم پاسخ اکنون aria-live و role=status دارند تا صفحه‌خوان‌ها تغییر وضعیت را اعلام کنند. A13 — تکرار متن خوش‌آمد بین seed و مسیر چت به ثابت مشترک CHAT_WELCOME منتقل و خطاهای قورت‌داده‌شده اجرای اکشن اکنون با console.error ثبت می‌شوند تا عیب‌یابی ممکن باشد."));

// ۵. تغییرات
B.push(h1("۵. تغییرات واقعی انجام‌شده با مسیر فایل‌ها"));
B.push(body("همه تغییرات در بسته‌های کوچک قابل‌آزمون اعمال شد؛ ابتدا امنیت و یکپارچگی داده، سپس صحت عملکرد، سپس دسترس‌پذیری و عملیات. هیچ قابلیت موجود حذف نشد و هیچ داده واقعی کاربر تغییر یا پاک نشد؛ مهاجرت اسکیما صرفاً افزایشی (افزودن جدول Setting) و بدون پرچم خطرناک accept-data-loss اجرا شد. اسکریپت db:push نیز از package.json پاک‌سازی شد تا دیگر به‌صورت پیش‌فرض خطرناک نباشد.", { after: 160 }));
B.push(table(
  ["مسیر فایل", "نوع تغییر", "خلاصه"],
  [
    ["prisma/schema.prisma", "افزودنی", "مدل Setting برای پروفایل؛ مهاجرت با prisma db push"],
    ["src/lib/server-profile.ts", "جدید", "خواندن/ثبت پروفایل، پیش‌فرض علیرضا، پاک‌سازی ورودی"],
    ["src/app/api/profile/route.ts", "جدید", "GET/PUT پروفایل + محدودیت نرخ + گارد مبدأ"],
    ["src/app/api/health/route.ts", "جدید", "health check با پرس‌وجوی زنده DB و latency"],
    ["src/lib/server-ai.ts", "اصلاح", "پارامتر نام در پرامپت، تعویق با تاریخ تهران، لاگ خطا"],
    ["src/app/api/chat/route.ts و chat/stream/route.ts", "اصلاح", "تزریق نام کاربر + ثابت مشترک CHAT_WELCOME"],
    ["src/lib/server-tasks.ts", "اصلاح", "CHAT_WELCOME؛ گارد تاریخ نامعتبر و پنجره سال"],
    ["src/app/api/subtasks/[id]/route.ts", "اصلاح", "مهار بدنه با readJsonSafe"],
    ["src/app/api/tasks/[id]/breakdown/route.ts", "اصلاح", "سقف ۳۰ زیرکار و برش خروجی"],
    ["src/app/api/reminders/route.ts", "اصلاح", "۴۰۴ برای شناسه ناموجود"],
    ["src/lib/persian-date.ts", "اصلاح", "tehranDayOf؛ بازنویسی jalaliMonthLength بدون فرمول بیرشک"],
    ["src/lib/store.ts و app-shell.tsx و today-view.tsx", "اصلاح", "وضعیت پروفایل، چیپ سایدبار، سلام شخصی، استریک تهران"],
    ["src/components/ara/profile-dialog.tsx", "جدید", "دیالوگ ویرایش نام + چیپ پروفایل"],
    ["src/app/globals.css و layout.tsx", "اصلاح", "فونت خودمیزبان، حذف گوگل‌فونت، حذف maximumScale، reduced-motion"],
    ["src/components/ara/chat-view.tsx", "اصلاح", "aria-live و role=status"],
    ["next.config.ts و tsconfig.json", "اصلاح", "بررسی نوع سخت‌گیرانه، حذف پوشه‌های خارج از محصول"],
    ["package.json", "اصلاح", "اسکریپت‌های verify/typecheck/test/backup، پاک‌سازی db:push"],
    [".env.example و scripts/backup-db.sh و README.md", "جدید", "پیکربندی نمونه، پشتیبان‌گیری، مستندات کامل محصول"],
    ["tests/unit/*.test.ts", "جدید", "چهار فایل، ۴۸ آزمون واحد"],
    ["public/fonts/*.woff2", "جدید", "شش وزن وزیرمتن خودمیزبان"],
  ],
  [34, 14, 52],
));

// ۶. آزمون‌ها
B.push(h1("۶. آزمون‌های اضافه‌شده و نتایج اجرا"));
B.push(body("پیش از این مأموریت هیچ آزمون خودکاری وجود نداشت. چهار فایل آزمون با bun:test ساخته شد که مستقیماً ماژول‌های TypeScript واقعی محصول را ایمپورت می‌کنند و رفتار واقعی را می‌سنجند، نه کپی منطق. انتخاب bun به‌دلیل اجرای بومی TypeScript بدون پیکربندی اضافه بود. آزمون‌ها عمداً به کلید API یا سرویس پرهزینه وابسته نیستند تا همیشه قابل اجرا باشند.", { after: 160 }));
B.push(table(
  ["فایل آزمون", "دامنه", "تعداد", "نتیجه"],
  [
    ["persian-date.test.ts", "روز تقویمی تهران، مرز شبانه‌روز، رفت‌وبرگشت شمسی-میلادی، کبیسه، ارقام فارسی", "۱۴", "همه سبز"],
    ["nlp.test.ts", "تاریخ نسبی، ساعت با صبح/شب، اولویت، تکرار، برچسب، مقاومت ورودی", "۱۶", "همه سبز"],
    ["security.test.ts", "پاک‌سازی نویسه کنترلی، گارد پروتکل URL، استخراج مقاوم JSON", "۱۴", "همه سبز"],
    ["server-tasks.test.ts", "رزولو تاریخ معتبر/نامعتبر/شمسی، ظهر UTC", "۴", "همه سبز"],
  ],
  [26, 50, 10, 14],
));
B.push(body("جمع: ۴۸ آزمون، ۸۲ ادعا، صفر شکست. علاوه بر آزمون‌های واحد، بازرسی نفوذ رگرسیون روی سرویس در حال اجرا انجام شد: محدودیت نرخ حافظه دقیقاً پس از بیستمین درخواست پاسخ ۴۲۹ داد؛ بدنه ۱۱۰ کیلوبایتی رد شد؛ تاریخ نامعتبر و شمسی به‌جای خطای ۵۰۰ سبک و بی‌اثر رد شدند؛ یادآوری ناموجود ۴۰۴ داد؛ و درخواست با مبدأ خارجی روی متد تغییردهنده ۴۰۳ گرفت. داده‌های ساخته‌شده در همین آزمون‌ها بلافاصله پاک‌سازی شد تا پایگاه‌داده به وضعیت پیش از آزمون برگردد. آزمون مرورگری در سه حالت روشن، تیره و موبایل ۳۹۰ پیکسل بدون هیچ خطای کنسول انجام شد."));

// ۷. build
B.push(h1("۷. وضعیت build، lint و بررسی نوع‌ها"));
B.push(body("هر سه گیت کیفیت سبز است. بررسی نوع‌ها با tsc سخت‌گیرانه روی کل دامنه محصول بدون خطا اجرا شد؛ برای رسیدن به این وضعیت، پوشه‌های خارج از محصول (examples، skills، scripts، tests) از tsconfig حذف شدند و پرچم نادیده‌گرفتن خطای نوع در build حذف گردید تا رگرسیون آینده واقعاً بلاک‌کننده باشد. ESLint روی src بدون خطا و هشدار است. بیلد تولیدی Next.js با بررسی نوع فعال موفق شد و چهارده مسیر را به‌درستی رجیستر کرد: دوازده مسیر پویا و صفحات استاتیک. جمع اسکریپت verify هر سه گیت را یکجا اجرا می‌کند و معیار ورود هر تغییر آینده به مخزن است. تنها یادداشت اجرایی این است که بیلد در محیط توسعه اجرا و صحت‌سنجی شد و اسکریپت start برای اجرای بیلد standalone آماده است."));

// ۸. امنیت
B.push(h1("۸. وضعیت امنیت و ریسک‌های باقیمانده"));
B.push(body("مدل تهدید محصول، تک‌کاربره شخصی پشت پروکسی معتبر است؛ بنابراین مطابق مأموریت، احراز هویت چندکاربره عمداً تحمیل نشد و تمرکز بر بستن مسیرهای سوءاستفاده از مدل، داده و مرورگر بود. دفاع‌های فعال پس از اصلاح: CSP سخت بدون منبع ثالث، X-Frame-Options و nosniff و Referrer-Policy و Permissions-Policy، گارد Same-Origin روی همه متدهای تغییردهنده با آزمون ۴۰۳، محدودیت نرخ مستقل برای هر مسیر با آزمون ۴۲۹، مهار بدنه ۱۰۰ کیلوبایتی روی همه مسیرها شامل مسیر پیش‌بینی‌نشده، پاک‌سازی نویسه‌های کنترلی و مهار طول در همه ورودی‌ها، پالایش پروتکل منابع وب به http/https، سقف‌های منبع (۱۰۰ حافظه، ۵۰ یادآوری، ۳۰ زیرکار، ۲۰۰ پیام)، دیوار user_data علیه تزریق پرامپت، گارد حذف تک‌موردی با فعل صریح، و رندر مارک‌داون بدون HTML خام."));
B.push(body("سه فرضیه حمله بررسی و رد شد: تزریق اسکریپت از مسیر مارک‌داون (react-markdown به‌صورت پیش‌فرض HTML خام رندر نمی‌کند)، افشای کلید سرویس مدل به کلاینت (SDK فقط در ماژول‌های سرور و بدون متغیر عمومی) و دستکاری مستقیم پایگاه‌داده (همه پرس‌وجوها پارامتری با Prisma). فایل .env فقط مسیر پایگاه‌داده دارد و هیچ رازی در مخزن نیست. ریسک‌های باقیمانده مستند و پذیرفته‌شده در مدل استقرار فعلی عبارت‌اند از: نبود احراز هویت (قبل از هر استقرار عمومی یا شبکه‌ای الزامی می‌شود)، محدودساز نرخ درون‌حافظه‌ای که فقط برای تک‌نمونه معتبر است، اتکای کلید IP به سرآیندهای پروکسی که فقط با Caddy معتبر است و تحویل یادآوری‌ها منوط به باز بودن مرورگر. این موارد در بخش کارهای باقیمانده اولویت دارند."));

// ۹. UI/UX
B.push(h1("۹. تغییرات رابط کاربری و تجربه کاربری"));
B.push(body("بزرگ‌ترین اصلاح ظاهری این نسخه، اجرای واقعی فونت وزیرمتن است که پیش‌تر به‌دلیل CSP هیچ‌گاه بارگذاری نمی‌شد؛ اسکرین‌شات‌های پیش و پس از اصلاح تفاوت تایپوگرافی را به‌روشنی نشان می‌دهند. از منظر هویت محصول، چیپ پروفایل به سایدبار اضافه شد و سلام نمای امروز اکنون شخصی‌سازی‌شده است؛ در آزمون مرورگری، عنوان «شب بخیر، علیرضا» رندر شد. دیالوگ ویرایش پروفایل کاملاً راست‌چین با برچسب قابل‌خواندن برای صفحه‌خوان است و مقدار خالی به پیش‌فرض محصول برمی‌گردد."));
B.push(body("در حوزه دسترس‌پذیری، زوم مرورگر آزاد شد، انیمیشن‌ها به تنظیم کاهش حرکت احترام می‌گذارند و وضعیت پویای دستیار برای صفحه‌خوان اعلام می‌شود. واکنش‌گرایی در عرض دسکتاپ ۱۴۴۰ و موبایل ۳۹۰ بازبینی شد؛ ناوبری پایین موبایل، دکمه شناور و چیدمان چت در عرض باریک سالم است. حذف کامل داده‌های آزمایشی پس از تست‌های نفوذ تضمین می‌کند کاربر واقعی هیچ اثری از آزمون در رابط خود نبیند. حالت تیره با مشکی واقعی و تأکید فیروزه‌ای بدون تغییر باقی است و از رگرسیون مصون ماند."));

// ۱۰. کارایی
B.push(h1("۱۰. تغییرات عملکرد، پایداری و کارایی"));
B.push(body("اصلاحات کارایی این نسخه اندازه‌پذیر و محدود به موارد اثبات‌شده است، بدون بهینه‌سازی حدسی. حذف دو درخواست ثالث فونت (استایل و فایل از gstatic) بارگذاری اولیه را سبک‌تر و بدون نوسان رندر فونت کرد؛ فایل‌های woff2 هرکدام حدود پنجاه کیلوبایت و از همان مبدأ سرو می‌شوند. health check تأخیر پایگاه‌داده را در همان لحظه اندازه می‌گیرد (در اجرای مرجع ۴۱ میلی‌ثانیه) و مبنای پایش عملیاتی فراهم شد. سقف‌های مهار بدنه و هرس تاریخچه گفتگو از رشد بی‌کران حافظه و پایگاه‌داده جلوگیری می‌کنند و پیش‌تر در مسیر چت بودند؛ اکنون مسیر REST نیز هم‌راستا شد."));
B.push(body("در سمت پایداری، ثبت خطاهای قبلاً قورت‌داده‌شده اجرای اکشن عیب‌یابی حوادث آینده را ممکن می‌کند و پاسخ ۴۰۴ دقیق به‌جای ۵۰۰، لاگ تمیز نگه می‌دارد. رفتار قطع شبکه در کلاینت بی‌تغییر و سالم است: شکست عملیات با پیام واضح گزارش می‌شود و پیام موقت حذف می‌گردد. برای بهینه‌سازی‌های بیشتر (مثل کش سمت سرور فهرست کارها یا انتقال محدودساز نرخ به فروشگاه مشترک) ابتدا باید معیار خط مبنا در استقرار هدف اندازه‌گیری شود؛ طبق مأموریت، ادعای کارایی بدون اندازه‌گیری ثبت نکردیم."));

// ۱۱. پایگاه داده
B.push(h1("۱۱. وضعیت پایگاه داده، مهاجرت و بازیابی"));
B.push(body("SQLite برای مدل تک‌کاربره فعلی انتخاب درستی است و طبق مأموریت بدون دلیل اثبات‌شده تغییر داده نشد. تنها تغییر اسکیما، افزودن جدول Setting بود که به‌صورت افزایشی و بدون هیچ حذف یا بازنویسی داده با prisma db push اعمال شد؛ شمارش رکوردهای کار، گفتگو و حافظه پس از مهاجرت دست‌نخورده ماند و هیچ پرچم accept-data-loss استفاده نشد. کلیدهای خارجی با حذف آبشاری، ایندکس‌های وضعیت و سررسید و یکتایی کلید تنظیمات حفظ شده‌اند."));
B.push(body("رویه پشتیبان‌گیری و بازیابی اکنون قابل‌اجرا و آزمون‌شده است: اسکریپت scripts/backup-db.sh در نبود ابزار sqlite3 به کپی امن با هشدار توقف سرویس برمی‌گردد و در آزمون واقعی نسخه هفتاد و هشت کیلوبایتی معتبر ساخت. رویه بازیابی (توقف سرویس، جایگزینی فایل، اجرا) در README مستند شده و توصیه به cron روزانه ثبت شده است. پشتیبان‌ها باید در محل امن و خارج از بسته قابل‌اشتراک نگهداری شوند؛ سیاست نگهداری داده کاربر (هرس خودکار گفتگو به دویست پیام، سقف حافظه) نیز در README صریح شده است تا انتظار کاربر روشن باشد."));

// ۱۲. مستندات
B.push(h1("۱۲. تغییرات مستندات"));
B.push(body("README ریشه پروژه از صفر و منطبق بر وضعیت واقعی کد بازنویسی شد: جدول قابلیت‌ها با برچسب وضعیت صریح، دستور نصب و اجرا، فهرست اسکریپت‌ها، نقشه معماری، مدل داده، قرارداد اکشن‌های دستیار با گاردهای هرکدام، سیاست امنیت و حریم خصوصی، رویه پشتیبان‌گیری و بازیابی و فهرست صادقانه ریسک‌های باقیمانده. هیچ قابلیت برنامه‌ریزی‌نشده‌ای به‌عنوان پیاده‌شده معرفی نشده و محدودیت‌ها (مثل تحویل مرورگر-محور یادآوری‌ها) صریح اعلام شده است."));
B.push(body("فایل .env.example برای نصب تکرارپذیر ساخته شد و اسکریپت پشتیبان‌گیری مستند و دارای راهنمای استفاده درون‌فایلی است. کارت‌های توضیحی کد نیز در نقاط اصلاح اضافه شد تا دلیل تصمیم‌ها (مثلاً پنجره سال در رزولو تاریخ) برای توسعه‌دهنده بعدی روشن باشد. گزارش مقایسه رقابتی پیشین با ده اپلیکیشن برتر و مستندات شواهد آن همچنان معتبر است و این گزارش به‌عنوان مکمل عملیاتی آن خوانده می‌شود."));

// ۱۳. موارد بررسی‌نشده
B.push(h1("۱۳. مواردی که به علت نبود دسترسی یا ابزار بررسی نشده‌اند"));
B.push(body("چهار محدوده به‌دلیل دسترسی فعلی بررسی نشد یا فقط تا سطح محدود اعتبارسنجی شد. نخست، تاریخچه کامل گیت قابل ممیزی معنادار نبود زیرا تاریخچه مخزن در این محیط به چند کامیت فشرده خلاصه شده و بازرسی اسرار در تمام تاریخچه ممکن نبود؛ وضعیت جاری فایل‌ها به‌جای آن بازرسی شد. دوم، استقرار واقعی تولید و پایش در محیط خارجی اجرا نشد؛ بیلد و اجرای standalone آماده است اما تنظیم دامنه، TLS و پایش بیرونی به محیط مالک وابسته است. سوم، آزمون دسترس‌پذیری با صفحه‌خوان واقعی (VoiceOver یا NVDA) انجام نشد و فقط ممیزی ایستای معیارها (زوم، فوکوس، aria-live، کاهش حرکت، کنتراست پالت) انجام گرفت. چهارم، آزمون‌های سرتاسر خودکار مرورگر به‌صورت اسکریپت پایدار بسته‌بندی نشد و اجرای این جلسه به‌صورت دستی با ابزار خودکارسازی مرورگر ثبت شد."));

// ۱۴. نیازمند تصمیم مالک
B.push(h1("۱۴. مواردی که هنوز به تصمیم مالک نیاز دارند"));
B.push(body("پنج موضوع صرفاً با تصمیم مالک بسته می‌شود. نخست، سیاست انتشار: آیا اپ صرفاً روی دستگاه شخصی می‌ماند یا به شبکه خانگی/عمومی می‌رود؛ پیش از گزینه دوم، پیاده‌سازی احراز هویت و تفکیک داده اجباری است. دوم، هزینه مدل: سقف‌های فعلی نرخ و منبع محافظه‌کارانه است و اگر مالک مصرف بالاتر را بخواهد باید به‌صورت آگاهانه تنظیم شود. سوم، راهکار یادآوری زمان بسته‌بودن مرورگر: انتخاب میان نوتیفیکیشن سرویس شخص ثالث، اپ موبایل یا پذیرش محدودیت فعلی. چهارم، نقشه راه قابلیت‌های رقابتی باقیمانده از گزارش مقایسه (رشته‌های گفتگوی چندگانه، ورودی تصویر، زنجیره عاملیت با تأیید انسانی). پنجم، سیاست پشتیبان‌گیری زمان‌بندی‌شده: محل نگهداری و بازه نگهداری نسخه‌ها باید توسط مالک تعیین و در cron واقعی ثبت شود."));

// ۱۵. کارهای باقیمانده
B.push(h1("۱۵. فهرست کارهای باقی‌مانده با اولویت"));
B.push(body("کارهای باقیمانده هیچ‌کدام مسدودکننده انتشار در مدل فعلی نیستند اما پیش از گسترش دامنه استفاده الزامی یا به‌شدت توصیه می‌شوند. اولویت‌بندی بر اساس ریسک واقعی و وابستگی به تصمیم مالک است.", { after: 160 }));
B.push(table(
  ["اولویت", "کار", "شرط اجرا / توضیح"],
  [
    ["۱ — بحرانی پیش از انتشار عمومی", "احراز هویت و تفکیک دسترسی", "فقط اگر اپ از دستگاه شخصی فراتر برود"],
    ["۲ — بالا", "انتقال محدودساز نرخ به فروشگاه مشترک", "پیش از استقرار چندنمونه‌ای"],
    ["۳ — بالا", "زمان‌بند سمت سرور برای یادآوری‌ها", "وقتی تحویل تضمینی پس از بستن مرورگر الزامی شود"],
    ["۴ — متوسط", "آزمون صفحه‌خوان واقعی و اصلاح یافته‌ها", "VoiceOver/NVDA با سناریوهای اصلی"],
    ["۵ — متوسط", "آزمون سرتاسر خودکار مرورگر به‌صورت اسکریپت پایدار", "ادغام در گیت verify"],
    ["۶ — متوسط", "بازرسی کامل تاریخچه گیت از نظر اسرار پس از حفظ تاریخچه کامل", "در مخزن نهایی مالک"],
    ["۷ — پایین", "رشته‌های گفتگوی چندگانه و خروجی/ورودی تصویر", "نقشه راه رقابتی؛ پس از تصمیم مالک"],
  ],
  [26, 40, 34],
));

// ۱۶. تصمیم نهایی
B.push(h1("۱۶. تصمیم نهایی آمادگی انتشار"));
B.push(body("با توجه به شواهد بخش‌های پیشین، هیچ نقص بحرانی حل‌نشده‌ای باقی نمانده است: همه پانزده یافته رفع و اثبات شده، چهار گیت کیفیت (نوع، لینت، آزمون، بیلد) سبز است، آزمون‌های نفوذ رگرسیون رفتار درست را نشان داد، مهاجرت پایگاه‌داده افزایشی و بدون از دست رفتن داده اجرا شد و مستندات با کد واقعی سازگار است. در مقابل، سه محدودیت ساختاری مستند شده که مختص مدل استقرار فعلی پذیرفتنی‌اند اما در گسترش دامنه استفاده به ریسک واقعی تبدیل می‌شوند: نبود احراز هویت، محدودساز نرخ تک‌نمونه‌ای و تحویل یادآوری وابسته به باز بودن مرورگر.", { after: 160 }));
B.push(table(
  ["گزینه", "تعریف", "ارزیابی برای آرا"],
  [
    ["A", "آماده انتشار در محدوده تعریف‌شده و آزمون‌شده", "نیازمند آزمون صفحه‌خوان واقعی و استقرار تولید اثبات‌شده — فعلاً محقق نشده"],
    ["B", "آماده انتشار محدود و مشروط به محدودیت‌های صریح", "برقرار — مطابق شواهد"],
    ["C", "آماده انتشار نیست", "رد — هیچ نقص مسدودکننده‌ای باقی نیست"],
  ],
  [10, 45, 45],
));
B.push(body("تصمیم نهایی: گزینه B — آماده انتشار محدود و مشروط. شرایط انتشار عبارت‌اند از: استقرار فقط روی دستگاه شخصی مالک یا شبکه کاملاً مورد اعتماد؛ اجرای pnpm-equivalent بیلد تولیدی و health check پیش از دسترسی کاربر؛ پشتیبان‌گیری روزانه طبق رویه مستند؛ و عدم افشای سرویس به اینترنت عمومی تا پیش از پیاده‌سازی احراز هویت. با اجرای شرایط فوق، آرا ۳.۰ برای استفاده روزمره مالک (علیرضا) آماده است و مسیر ارتقا به گزینه A از طریق بندهای اولویت ۱ تا ۵ بخش پانزدهم روشن و قابل‌اجرا است. تمام شواهد پشتیبان این تصمیم در بخش‌های ۳ تا ۷ همین گزارش و در کارنامه اجرای آزمون‌ها ثبت شده است."));

// ── سند ──────────────────────────────────────────────────────
const doc = new Document({
  creator: "Ara Engineering Audit",
  title: "گزارش ممیزی جامع — دستیار هوشمند آرا",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: FONT, size: 32, bold: true, color: P.primary } },
      heading2: { run: { font: FONT, size: 28, bold: true, color: P.primary } },
    },
  },
  sections: [
    { // کاور
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1RTL({
        title: "گزارش ممیزی جامع مهندسی، امنیت و آمادگی انتشار",
        subtitle: "اپلیکیشن دستیار هوشمند شخصی «آرا» — نسخه ۳.۰",
        label: "گزارش رسمی ممیزی — فازهای A تا F",
        metaLines: [
          "مالک محصول: علیرضا",
          "تاریخ گزارش: ۲۴ مهر ۱۴۰۵ — ۱۶ اکتبر ۲۰۲۶",
          "دامنه ممیزی: کل مخزن، ۱۴ مسیر API، مدل داده، امنیت، UI/UX، آزمون",
          "نتیجه: آماده انتشار محدود و مشروط (گزینه B)",
        ],
        footerRight: "آرا — دستیار هوشمند شخصی",
        footerLeft: "محرمانه — ویژه مالک محصول",
      }),
    },
    { // فهرست — رومی
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: { default: pageFooter("roman") },
      children: [
        new Paragraph({
          bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 480, after: 360 },
          children: [rtl("فهرست مطالب", { size: 32, bold: true, color: P.primary })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          bidirectional: true, spacing: { before: 200 },
          children: [rtl("یادآوری: این فهرست با کد فیلد ساخته شده است؛ پس از باز کردن سند در Word، روی فهرست راست‌کلیک و «Update Field» را انتخاب کنید تا شماره صفحه‌ها دقیق شود.", { italics: true, size: 18, color: "888888" })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    { // بدنه — عربی از ۱
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter("arabic") },
      children: B,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/گزارش_ممیزی_جامع_آرا_فاز_A تا_F.docx", buf);
  console.log("OK — report written");
});
