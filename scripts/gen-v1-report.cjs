// ─── گزارش نهایی نسخه ۱٫۰ رهیار AI — فارسی RTL با تصاویر ──────
// اجرا: bun scripts/gen-v1-report.cjs
// الگوی تأییدشده گزارش‌های قبلی + ImageRun برای شواهد تصویری
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, NumberFormat, SectionType, BorderStyle,
  ShadingType, WidthType, TableLayoutType, PageBreak, TableOfContents, VerticalAlign,
  ImageRun,
} = require("docx");
const fs = require("fs");
const sharp = require("sharp");

const P = {
  primary: "0A1628", body: "000000", secondary: "5B6B7D",
  accent: "0D9488", surface: "F0F6F4",
  coverBg: "0E2327", coverTitle: "F2F7F6", coverSub: "AFC5C0",
  coverMeta: "C9DAD5", coverFooter: "7E948F",
};
const FONT = { ascii: "Calibri", hAnsi: "Calibri", cs: "Vazirmatn", eastAsia: "Vazirmatn" };

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

// ── تصویر با حفظ نسبت ابعاد (image-size از طریق sharp) ───────
async function figure(path, caption, maxW = 555) {
  const meta = await sharp(path).metadata();
  const w = Math.min(maxW, meta.width);
  const h = Math.round((meta.height / meta.width) * w);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 160, after: 40 },
      children: [new ImageRun({
        data: fs.readFileSync(path), type: "png",
        transformation: { width: w, height: h },
      })],
    }),
    new Paragraph({
      bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [rtl(caption, { size: 18, color: P.secondary, italics: true })],
    }),
  ];
}

// ── کاور R1 RTL (تأییدشده) ───────────────────────────────────
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
    children: [rtl("گزارش نهایی نسخه ۱٫۰ — رهیار AI", { size: 16, color: P.secondary })],
  })] });
}

// ═══ محتوا ═══
const B = [];

B.push(h1("خلاصه اجرایی"));
B.push(body("این گزارش تحویل نهایی مأموریت نسخه ۱٫۰ «رهیار AI» است؛ مرحله‌ای که هدف آن، تکمیل محصول از یک پلنر به یک دستیار شخصی هوشمند کامل بود. هشت اولویت مأموریت — دستیار صوتی، معماری AIProvider، تقویم دوگانه و دوزبانگی، تنظیمات کامل، ماژول مالی، پیامک بانکی، معماری اتصال سرویس‌های خارجی و تکمیل لایه تجربه محیطی — همگی پیاده، آزمون و مستند شدند. قاعده حاکم همان قاعده همیشگی بود: هیچ ادعایی بدون اجرای واقعی و شاهد قابل بازبینی؛ هیچ تغییری در منطق کسب‌وکار، مدل داده موجود، مسیرهای امنیتی و معماری قبلی مگر آنکه خود مأموریت آن را می‌طلبید و تغییرات به‌صورت افزوده و مستند اعمال شد."));
B.push(body("نتیجه نهایی: چهار گیت کیفیت (typecheck، lint، آزمون، build) همگی سبزند؛ مجموعه آزمون از ۹۹ به ۱۲۷ مورد ارتقا یافت؛ پرفورمنس در همه نماهای تازه روی FPS ۶۰ هم‌تراز با خاموشی جلوه‌ها ایستاد و حافظه در ۱۰ مگابایت ثابت ماند. کلید معماری این نسخه، رابط AIProvider است: هوش مصنوعی اکنون یک قرارداد است، نه یک شرکت — موتور قواعد محلی و هر Endpoint سازگار با OpenAI در کنار سهمیه رایگان داخلی، بدون هیچ کلید Hardcode شده، از یک دروازه واحد عبور می‌کنند."));

B.push(h1("بخش ۱ — هشت اولویت، وضعیت نهایی"));
B.push(table(
  ["اولویت", "وضعیت", "شاهد"],
  [
    ["۱. تکمیل Agent و دستیار صوتی", "انجام شد", "Web Speech محلی + ۶ نیت قطعی + تطبیق فازی + پاسخ گفتاری + مسیر آزمون"],
    ["۲. معماری AI Provider", "انجام شد", "رابط AIProvider + سه Provider فعال + registry + Gateway refactor"],
    ["۳. تقویم دوگانه و دوزبانگی", "انجام شد", "۳ حالت تقویم + i18n کامل fa/en + مهاجرت ۲۲ کامپوننت"],
    ["۴. تنظیمات کامل", "انجام شد", "۱۰ دسته در یک نمای واحد + APIهای تنظیمات و داده"],
    ["۵. ماژول مالی شخصی", "انجام شد", "۲ مدل داده + ۵ API + نمای مالی + نمودار + ۴ خروجی"],
    ["۶. اتصال SMS (اندروید)", "انجام شد (وب + معماری)", "پارسر ۲۰ بانک + رضایت + ضدتکرار + مسیر اندروید مستند"],
    ["۷. معماری سرویس‌های خارجی", "تکمیل شد", "کاتالوگ ۶ اتصال با ۶ افشا + ورودی sms_android"],
    ["۸. تکمیل Ambient Layer", "انجام شد", "هویت زنده ۸ حالته + خودبازگشت + اتصال‌های معنایی"],
  ],
  [34, 16, 50],
));

B.push(h1("بخش ۲ — معماری AI Provider"));
B.push(body("قبل از این نسخه، دروازه AI تنها یک ارائه‌دهنده ثابت را می‌شناخت. اکنون «ارائه‌دهنده» یک قرارداد مستقل است و افزودن Providerهای آینده (OpenAI، Claude، Gemini، DeepSeek، Ollama، LM Studio، OpenRouter و هر سازگار دیگر) فقط یک فایل پیاده‌کننده رابط و یک خط ثبت است. هیچ API یا شرکت خاصی در دروازه Hardcode نشده و کلیدها هرگز وارد کد نمی‌شوند."));
B.push(table(
  ["موتور", "هزینه", "اینترنت", "سهمیه", "کاربرد"],
  [
    ["موتور قواعد محلی (local_rules)", "صفر", "خیر", "نمی‌سوزاند", "کارها، یادآوری، مالی، SMS، برنامه قطعی — آفلاین کامل"],
    ["Endpoint سازگار با OpenAI", "کلید خود کاربر", "بله", "نمی‌سوزاند", "Ollama، LM Studio، DeepSeek، OpenRouter، …"],
    ["سهمیه داخلی میزبان (پیش‌فرض)", "صفر", "بله", "می‌سوزاند", "شروع بدون پیکربندی — سقف‌های Gateway"],
  ],
  [26, 14, 12, 14, 34],
));
B.push(body("دروازه واحد (Gateway) همچنان تنها نقطه فراخوانی مدل است؛ گاردهای کلید قطع، سقف ورودی/خروجی، سهمیه و ثبت فراداده مصرف برای همه موتورها به‌یک‌شکل اعمال می‌شوند و موتور قواعد محلی که اصلاً مدل فرا نمی‌خواند، از سهمیه و کلید قطع مستثناست تا اپ در سخت‌ترین حالت هم زنده بماند. کلید Endpoint کاربر فقط در پایگاه داده محلی نگه‌داری می‌شود و در هیچ پاسخی — حتی ماسک — جز آخرین چهار نویسه برنمی‌گردد. جزئیات کامل در docs/AI_PROVIDERS.md"));

B.push(h1("بخش ۳ — دستیار صوتی و Agent"));
B.push(body("دستیار صوتی از تبدیل گفتار به متن فراتر رفت: ورودی صوتی محلی مرورگر (Web Speech) با زبان رابط هماهنگ است، متن موقت زنده نمایش داده می‌شود و پس از هر دستور صوتی، پاسخ به‌طور خودکار خوانده می‌شود. صدا هرگز به هیچ سروری ارسال یا ذخیره نمی‌شود. برای هر نیت، مسیریاب قطعی تصمیم می‌گیرد که موتور قواعد محلی اجرا کند یا مدل لازم است:"));
B.push(table(
  ["نیت", "نمونه گفتار", "اجراکننده", "اثر"],
  [
    ["ثبت کار", "«ثبت کن فردا ۹ تماس با دکتر»", "قواعد محلی", "کار با تاریخ/ساعت/برچسب"],
    ["لیست کارها", "«چه کارهایی دارم؟»", "قواعد محلی", "پاسخ از داده واقعی"],
    ["گزارش روز", "«گزارش امروز»", "قواعد محلی", "آمار انجام/مانده/عقب‌افتاده"],
    ["تکمیل کار", "«جلسه با تیم انجام شد»", "قواعد محلی + تطبیق فازی", "تکمیل واقعی + ثبت اقدام"],
    ["شروع تمرکز", "«شروع تمرکز»", "قواعد محلی", "باز شدن تایمر پومودورو + حالت تمرکز محیط"],
    ["راهنما", "«چیکار می‌تونی بکنی؟»", "قواعد محلی", "فهرست توانمندی‌ها"],
    ["گفتار باز", "هر چیز دیگر", "AI Provider فعال", "پاسخ مدل با گاردهای Gateway"],
  ],
  [16, 28, 24, 32],
));
B.push(body("در حالت «قواعد محلی» اگر کاربر گفتار باز بپرسد، دستیار صادقانه اعلام می‌کند که برای آن قابلیت باید یک موتور مدل معرفی شود — هیچ جعل هوشمندی رخ نمی‌دهد. برنامه‌ساز روزانه هم در همین حالت با الگوریتم قطعی (اولویت، سررسید، ستاره) برنامه می‌چیند تا هیچ قابلیتی غیرفعال نشود."));

B.push(h1("بخش ۴ — دوزبانگی و تقویم دوگانه"));
B.push(body("سیستم i18n با الگوی «کلید طبیعی» پیاده شد: متن فارسی خودِ کلید است و دو فایل ترجمه (fa.ts و en.ts با نزدیک به ۴۰۰ رشته) معادل‌ها را می‌دهند؛ ترجمه‌ای که وجود نداشته باشد محترمانه به فارسی برمی‌گردد و هیچ کلید خام تکنیکی به کاربر نمی‌رسد. زبان در localStorage و سرور ذخیره می‌شود تا بین دستگاه‌ها ثابت بماند و تغییر آن به‌صورت زنده، direction و زبان سند و قالب اعداد و تاریخ را یکجا عوض می‌کند. حدود ۲۲ کامپوننت به تابع ترجمه مهاجرت کردند و عناصر فیزیکی (فاصله و تراز) به معادل منطقی تبدیل شدند تا حالت LTR هم درست بایستد."));
B.push(body("تقویم سه حالت دارد: شمسی، دوگانه و میلادی. در حالت دوگانه — دقیقاً مطابق مشخصات مأموریت — عدد شمسی بزرگ، پررنگ و با رنگ تأکید نمایش داده می‌شود و عدد میلادی کوچک‌تر، خاکستری و به انگلیسی؛ عنوان ماه هم دو زبانه است و جهت پیمایش ماه با جهت خط عوض می‌شود."));

B.push(h1("بخش ۵ — ماژول مالی شخصی"));
B.push(body("مالی یک ماژول مستقل با مدل داده خود است: حساب‌های چندگانه (نقدی/بانکی/کارت با مانده افتتاحیه)، تراکنش‌های درآمد/هزینه/انتقال با دسته‌بندی، و ضدتکرار مبتنی بر هش برای ورودهای خودکار. مانده هر حساب و خلاصه ماه (درآمد، هزینه، خالص، تفکیک دسته و روز) با توابع خالص محاسبه می‌شود که ۸ آزمون مستقل دارند. خروجی‌ها: CSV با BOM (بازشدن درست در اکسل فارسی)، اکسل (SpreadsheetML با دو شیت)، JSON، TXT و PDF از چاپ نمای گزارش با پشتیبانی کامل RTL."));
(async () => {
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-screens/02-finance-fa.png", "نمای مالی — مانده، حساب‌ها، نمودار دسته‌ها و تراکنش‌ها"));
  B.push(h1("بخش ۶ — پیامک بانکی (SMS)"));
  B.push(body("تحلیل پیامک کاملاً محلی و قطعی است: پارسر خالص با ۷ آزمون مستقل، ارقام فارسی/عربی و جداکننده هزارگان را نرمال می‌کند، حدود ۲۰ بانک اصلی ایران را می‌شناسد، فعل تراکنش (واریز/برداشت/خرید/انتقال/کارمزد/سود) را تشخیص می‌دهد و مبلغ، موجودی، کارت ماسک‌شده و تاریخ شمسی یا میلادی را استخراج می‌کند. پیامک‌های چندخطی با استراتژی دومرحله‌ای (خط مستقل، سپس ادغام بلوک ناکام) پشتیبانی می‌شوند."));
  B.push(body("ثبت هرگز بی‌رضایت نیست: کاربر اول سوییچ «رضایت تحلیل پیامک» را روشن می‌کند، بعد پیش‌نمایش تحلیل را می‌بیند و با تأیید خودش، تراکنش‌ها با منبع SMS و کلید ضدتکرار (SHA-256 متن) ذخیره می‌شوند تا پیامک تکراری هرگز دو بار ثبت نشود. متن خام پیامک نگهداری نمی‌شود و هیچ داده مالی به مدل یا سرویس بیرونی نمی‌رود. مسیر اندروید (مجوز RECEIVE_SMS با اپ همراه و پردازش محلی روی گوشی) به‌عنوان معماری رسمی در کاتالوگ اتصال‌ها و docs/FINANCE_SMS.md مستند است."));
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-screens/04-sms-preview.png", "پیش‌نمایش تحلیل پیامک بانکی قبل از ثبت — رضایت کاربر شرط است"));

  B.push(h1("بخش ۷ — تنظیمات کامل"));
  B.push(body("تنظیمات از یک دیالوگ کوچک به یک نمای کامل با ده دسته رسید: حساب کاربری، ظاهر، هوش مصنوعی، زبان و تقویم، صدا، یادآورها، دسترسی‌ها، حریم خصوصی، داده‌ها و درباره. بخش هوش مصنوعی همان‌جا موتور فعال و Endpoint را پیکربندی می‌کند، اتصال را تست می‌کند و کلید قطع اضطراری دارد. بخش حریم خصوصی آمار مصرف مدل را نشان می‌دهد و «حق فراموشی» با تأیید دومرحله‌ای همه داده‌های محتوایی را پاک می‌کند. بخش داده‌ها خروجی/ورود JSON (ادغام بدون بازنویسی) و پشتیبان کامل را پوشش می‌دهد."));
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-screens/06-ai-endpoint-en.png", "تنظیمات هوش مصنوعی در حالت انگلیسی (LTR) — انتخاب موتور و پیکربندی Endpoint"));

  B.push(h1("بخش ۸ — لایه تجربه محیطی: هویت زنده ۸ حالته"));
  B.push(body("لایه محیطی که در مأموریت پیشین با ۵ حالت کار می‌کرد، به هویت زنده ۸ حالته ارتقا یافت. هیچ صفحه‌ای مستقیماً افکت نمی‌سازد؛ صفحات فقط «وضعیت معنایی» را به موتور اعلام می‌کنند و موتور با صفات داده و خودبازگشت زمان‌دار، رفتار بصری را مالکیت می‌کند. همه حالت‌های تازه فقط transform/opacity هستند و در reduced-motion و خاموشی جلوه‌ها ساکت می‌شوند."));
  B.push(table(
    ["حالت", "معنا", "رفتار بصری", "ماشه"],
    [
      ["idle", "آماده", "تنفس آرام", "پیش‌فرض"],
      ["breathing", "خوش‌آمد", "نفس عمیق‌تر", "ورود به اپ (خودبازگشت ۴٫۲s)"],
      ["glow", "جشن موفقیت", "درخشش گرم یک‌باره", "تکمیل کار (خودبازگشت ۲٫۴s)"],
      ["pulse", "هشدار", "تپش سریع", "یادآوری فعال (خودبازگشت ۲٫۴s)"],
      ["listening", "شنیدن", "حلقه‌های منتشرشونده", "میکروفون"],
      ["thinking", "فکر کردن", "حلقه مداری", "انتظار پاسخ"],
      ["streaming", "نوشتن پاسخ", "جریان چرخان", "توکن اول"],
      ["speaking", "صحبت", "تپش هم‌نوا با موج", "خواندن صوتی"],
    ],
    [14, 20, 32, 34],
  ));

  B.push(h1("بخش ۹ — مستندات API و فنی"));
  B.push(body("همه مسیرهای تازه با همان گاردهای امنیتی مسیرهای قبلی ساخته شدند: نشست اجباری، گارد Same-Origin روی متدهای تغییردهنده، سقف نرخ اختصاصی، مهار بدنه و پیام خطای فارسی شفاف. فهرست کامل افزوده‌های ۱۲ مسیر تازه در docs/API.md، معماری Provider در docs/AI_PROVIDERS.md، مالی و SMS در docs/FINANCE_SMS.md، فهرست تغییرات در docs/CHANGELOG-V1.md و جدول ۸ حالت اورب در docs/AMBIENT_ENGINE.md مستند است."));
  B.push(table(
    ["گروه", "مسیرها", "نکته امنیتی"],
    [
      ["تنظیمات", "settings/app، settings/ai، settings/ai/test، settings/ai/usage", "کلید هرگز برگردانده نمی‌شود؛ تست اتصال بدون ذخیره"],
      ["مالی", "finance/accounts(+id)، finance/transactions(+id)، finance/export", "همه پرس‌وجوها scope کاربر؛ ضدتکرار externalRef"],
      ["SMS", "sms/import", "رضایت صریح + تأیید دومرحله‌ای + هش SHA-256"],
      ["داده‌ها", "data/export، data/import، data/delete-all", "حذف کامل نیازمند عبارت تأیید متنی"],
    ],
    [12, 46, 42],
  ));

  B.push(h1("بخش ۱۰ — گزارش تست"));
  B.push(body("مجموعه آزمون از ۹۹ به ۱۲۷ مورد رسید. ۲۸ آزمون تازه دقیقاً روی منطق خالص ماژول‌های این نسخه سنجیده می‌شود تا رفتار قطعی، بی‌وابستگی به شبکه و قابلیت بازتولید تضمین شود:"));
  B.push(table(
    ["دسته", "تعداد", "پوشش"],
    [
      ["پارسر SMS بانکی", "۷", "نرمال‌سازی ارقام، برداشت/واریز، ارقام فارسی، پیامک غیربانکی، چند پیامک، تبدیل جلالی"],
      ["هسته مالی و خروجی‌ها", "۸", "مانده حساب، خلاصه ماه، دسته‌ها، قالب مبلغ، CSV/Excel/JSON/TXT"],
      ["تطبیق فازی", "۴", "نرمال‌سازی ی/ک و اعراب، زیررشته، بهترین تطبیق و آستانه"],
      ["مسیریاب نیت", "۶", "تکمیل، تمرکز، راهنما، لیست انگلیسی، ثبت فارسی"],
      ["i18n و Provider و سهمیه", "۹", "tf/formatNum/dir، اعتبارسنجی URL، تصمیم سهمیه، برنامه‌ساز قطعی"],
      ["آزمون‌های قبلی (نگهداری‌شده)", "۹۳", "nlp، persian-date، security، auth، gateway، assistant-router، …"],
    ],
    [28, 10, 62],
  ));
  B.push(body("نتیجه نهایی هر چهار گیت: typecheck بدون خطا، lint بدون خطا، ۱۲۷/۱۲۷ آزمون سبز، build تولیدی موفق با همه مسیرها. صحت عملکردی مهم‌ترین مسیرها علاوه بر آزمون واحد، در مرورگر واقعی هم راستی‌آزمایی شد: راه‌اندازی اولیه، ثبت کار هوشمند، ساخت حساب و تراکنش مالی، چرخه کامل پیامک (رضایت → تحلیل → پیش‌نمایش → ثبت)، تغییر زبان زنده با تغییر جهت سند، حالت دوگانه تقویم، باز شدن تایمر تمرکز با نیت صوتی و پاک‌سازی بدون خطای کنسول."));

  B.push(h1("بخش ۱۱ — گزارش عملکرد"));
  B.push(body("سنجش روی سرور تولیدی واقعی (standalone) با پروب requestAnimationFrame در صفحه زنده انجام شد: هر سناریو ۲ ثانیه گرم شدن و ۱۰ ثانیه اندازه‌گیری؛ حافظه از performance.memory مرورگر کرومیوم. نتیجه کلیدی: FPS در همه نماهای تازه هم‌تراز با خاموشی جلوه‌هاست و منحنی حافظه ثابت است — نه نشتی، نه رشد."));
  B.push(table(
    ["سناریو", "FPS میانگین", "FPS بدترین", "Heap (شروع→پایان)"],
    [
      ["امروز — جلوه‌ها روشن", "۶۰٫۱", "۵۹٫۵", "۱۰ → ۱۰ MB"],
      ["امروز — جلوه‌ها خاموش", "۶۰٫۱", "۵۹٫۵", "۱۰ → ۱۰ MB"],
      ["نمای مالی", "۶۰٫۱", "۵۹٫۵", "۱۰ → ۱۰ MB"],
      ["تقویم دوگانه", "۵۹٫۷", "۱۵ (لحظه تعویض ماه)", "۱۰ → ۱۰ MB"],
      ["تنظیمات", "۶۰٫۰", "۳۰ (لحظه اسکرول)", "۱۰ → ۱۰ MB"],
    ],
    [34, 18, 24, 24],
  ));
  B.push(body("اندازه باندل تولیدی از ۱٬۴۶۸٬۶۴۲ بایت به ۱٬۵۷۸٬۰۷۷ بایت رسید (+۷٫۴٪). این رشد، هزینه کل دوزبانگی (دو دیکشنری کامل)، ماژول مالی با خروجی‌سازها، نمای تنظیمات ده‌بخشی، لایه گفتار و تقویم دوگانه است — بدون هیچ وابستگی جدید در package.json. تقسیم کد نمایی حفظ شد و نماهای غیرپیش‌فرض همچنان lazy بار می‌شوند."));

  B.push(h1("بخش ۱۲ — تصاویر صفحات، موبایل و موشن"));
  B.push(body("۲۰ اسکرین‌شات واقعی از مرورگر در این نشست ثبت شد: پوشش همه نماها در دو زبان، دو تم، دسکتاپ و موبایل (۳۹۰×۸۴۴) — شامل نمای مالی، پیش‌نمایش SMS، تقویم دوگانه انگلیسی LTR، تنظیمات و حالت تیره. ویدئوی موشن (~۶۰ ثانیه) تعویض زنده زبان (RTL↔LTR)، پیمایش تقویم دوگانه، چرخه کامل مالی، نیت صوتی «شروع تمرکز» با باز شدن تایمر و انتقال تم دایره‌ای را ضبط می‌کند و هم‌زمان به MP4 و GIF تبدیل شد."));
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-before-after.png", "قبل و بعد — نسخه قبلی در برابر نسخه ۱٫۰ (نمای امروز)"));
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-screens/07-calendar-dual-en.png", "تقویم دوگانه در حالت انگلیسی (LTR) — شمسی بزرگ تأکیدی، میلادی کوچک خاکستری"));
  B.push(...await figure("/home/z/my-project/download/rahyar-v1-screens/13-settings-mobile-dark.png", "تنظیمات موبایل در حالت تیره"));

  B.push(h1("بخش ۱۳ — فهرست تغییرات و تحویل‌شدنی‌ها"));
  B.push(body("فهرست کامل و سطح‌فایل تغییرات در docs/CHANGELOG-V1.md نگهداری می‌شود؛ خلاصه آن: ۴ فایل معماری Provider، ۲ فایل صوت، ۴ فایل i18n، بازنویسی تقویم، ۴ فایل مالی + ۵ مسیر API، پارسر SMS + مسیر ورود، نمای تنظیمات + ۳ مسیر داده، موتور محیطی و CSS اورب، رفع عیب ورود نصب خالی، و ۲۸ آزمون تازه. تحویل‌شدنی‌های این نسخه:"));
  B.push(bullet("گزارش حاضر (docx) — خلاصه اجرایی هر ۱۳ قلم درخواستی مأموریت"));
  B.push(bullet("rahyar-v1-screens/ — ۲۰ تصویر واقعی صفحات، موبایل و دو تم (zip پیوست)"));
  B.push(bullet("rahyar-v1-motion.mp4 و .gif — ویدئوی موشن تعویض زبان/تم/مالی/تمرکز"));
  B.push(bullet("rahyar-v1-before-after.png — مونتاژ قبل/بعد از تصاویر واقعی"));
  B.push(bullet("rahyar-v1-perf.json — داده خام FPS و حافظه هر سناریو"));
  B.push(bullet("docs/ — AI_PROVIDERS، FINANCE_SMS، CHANGELOG-V1، API (به‌روزشده)، AMBIENT_ENGINE (به‌روزشده)"));
  B.push(bullet("کد کامل: addهای نسخه ۱٫۰ روی همان مخزن — بدون وابستگی جدید"));

  B.push(h1("بخش ۱۴ — تأیید نهایی و محدودیت‌های صادقانه"));
  B.push(body("تأیید گیت‌ها در پایان نشست: Typecheck سبز، Lint سبز، ۱۲۷/۱۲۷ آزمون سبز، Build تولیدی سبز، Health سبز. دو محدودیت صادقانه مستند می‌شود: نخست، خروجی PDF مالی از چاپ مرورگر انجام می‌شود تا رندر RTL فارسی بدون افزودن وابستگی سنگین تضمین شود؛ دوم، پاسخ‌های متنی موتور قواعد محلی در سرور به فارسی می‌مانند و دوزبانگی کامل سرور به نسخه بعد سپرده شد — رابط کاربری در هر دو زبان کامل است. هیچ مورد بحرانی باز نمانده و محصول در وضعیت «آماده استفاده و انتشار محدود» ارزیابی می‌شود."));

  // ═══ سند ═══
  const doc = new Document({
    creator: "Rahyar AI Engineering",
    title: "گزارش نهایی نسخه ۱٫۰ — رهیار AI",
    styles: {
      default: {
        document: { run: { font: FONT, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } },
        heading1: { run: { font: FONT, size: 32, bold: true, color: P.primary } },
        heading2: { run: { font: FONT, size: 28, bold: true, color: P.primary } },
      },
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
        children: buildCoverR1RTL({
          title: "گزارش نهایی نسخه ۱٫۰ — دستیار شخصی هوشمند",
          subtitle: "رهیار AI — از درخواست تا انجام (نسخه ۱٫۰)",
          label: "گزارش رسمی تحویل — هشت اولویت، با شواهد اجرایی",
          metaLines: [
            "دامنه: معماری AI Provider، دستیار صوتی، دوزبانگی و تقویم دوگانه",
            "ماژول مالی، پیامک بانکی، تنظیمات کامل، لایه تجربه محیطی",
            "کیفیت: ۱۲۷/۱۲۷ آزمون — FPS ۶۰ — Build/Lint/Typecheck سبز",
          ],
          footerRight: "رهیار AI — دستیار هوشمند شخصی",
          footerLeft: "محرمانه — ویژه مالک محصول",
        }),
      },
      {
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
      {
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

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/گزارش_نهایی_نسخه_۱.۰_رهیار_AI.docx", buf);
  console.log("OK — v1 report written");
})().catch((e) => {
  console.error("REPORT_FAIL", e);
  process.exit(1);
});
