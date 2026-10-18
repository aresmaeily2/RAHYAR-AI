// ─── گزارش نهایی مأموریت ۱۲بندی «رهیار AI» — فارسی RTL ───────
// اجرا: bun scripts/gen-mission12-report.cjs
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, NumberFormat, SectionType, BorderStyle,
  ShadingType, WidthType, TableLayoutType, PageBreak, TableOfContents, VerticalAlign,
} = require("docx");
const fs = require("fs");

// ── پالت (Dawn Mist Tech — سازگار با هویت فیروزه‌ای رهیار) ────
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

// ── کاور — دستور R1 سازگار با RTL ────────────────────────────
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
    children: [rtl("گزارش نهایی مأموریت ۱۲بندی — رهیار AI", { size: 16, color: P.secondary })],
  })] });
}

// ── محتوای بدنه ──────────────────────────────────────────────
const B = [];

B.push(h1("خلاصه اجرایی"));
B.push(body("این گزارش نتیجه اجرای کامل مأموریت دوازده‌بندی رساندن «رهیار AI» به سطح محصول قابل انتشار عمومی است. قاعده حاکم بر کل مأموریت این بود که هیچ بخشی صرفاً بر اساس گزارش‌های پیشین موفق اعلام نشود و هر ادعا با اجرای واقعی، شاهد فایل و خروجی آزمون پشتیبانی شود. به همین دلیل راستی‌آزمایی از صفر آغاز شد: هر سه گیت کیفیت (typecheck، lint، آزمون) از نو اجرا شد، بیلد پروداکشن تازه گرفته شد، سرور تولیدی واقعاً روی پورت مستقل بالا آورده و با درخواست‌های زنده سنجیده شد، و هر ۲۱ مسیر API با آزمون زنده و ممیزی مستقل کد بررسی گردید."));
B.push(body("در جریان ممیزی، ده ضعف واقعی شناسایی و همگی در همین نشست رفع شد؛ از جمله ابطال نشست‌ها پس از تغییر رمز، انتقال جستجوی وب به دروازه AI با ثبت مصرف، رفع ذخیره تکراری پیام کاربر در مسیر خطای استریم، اعمال سقف خروجی روی استریم مدل، ادعای اتمیک راه‌اندازی اولیه، هم‌ترازی زمان پاسخ ورود، و یکتاسازی سطح کاربر برای کلید ضدتکرار. اثبات هر اصلاح با مجموعه آزمون زنده پانزده‌موردی و آزمون تزریق پرامپت مستقیم و غیرمستقیم ارائه شد. بر پایه این شواهد، محصول در مدل استقرار فعلی در وضعیت «آماده انتشار محدود و مشروط» ارزیابی می‌شود؛ هیچ مورد بحرانی باز نمانده و محدودیت‌های صادقانه باقی‌مانده در بخش‌های ۱۲ تا ۱۴ مستند است."));

B.push(h1("بخش ۱ — راستی‌آزمایی کامل"));
B.push(body("همه گیت‌ها از ابتدا و بدون اتکا به نتایج قبلی اجرا شدند. جدول زیر نتیجه دقیق آخرین اجرای هر گیت در پایان نشست است؛ همه دستورها با کد خروج صفر و بدون هیچ خطا یا هشدار پایان یافتند."));
B.push(table(
  ["گیت", "دستور", "نتیجه", "شاهد"],
  [
    ["typecheck", "tsc --noEmit (سخت‌گیرانه)", "PASS", "خروجی صفر خطا"],
    ["lint", "eslint src", "PASS", "خروجی صفر خطا"],
    ["آزمون واحد", "bun test tests/unit", "PASS", "۹۹/۹۹ آزمون، ۲۶۰ expect، ۸ فایل"],
    ["build", "next build + standalone", "PASS", "۲۶ مسیر + Middleware، کد خروج ۰"],
    ["health", "GET /api/health", "PASS", "status=ok، database=ok، 2ms"],
    ["اجرا production", "standalone روی 3100", "PASS", "Ready؛ صفحه ۲۰۰؛ بدون نشست ۳۰۷→login"],
    ["فهرست API", "۲۱ فایل route", "PASS", "همه با گارد و شواهد بررسی شدند"],
  ],
  [16, 26, 12, 46],
));

B.push(h1("بخش ۲ — امنیت"));
B.push(h2("۲.۱ — ممیزی ایستای ۲۱ مسیر"));
B.push(body("هر ۲۱ فایل مسیر API به‌صورت مستقل ممیزی شد. نتیجه: هر ۱۸ مسیر غیرعمومی requireUser را فراخوانی می‌کنند و سه مسیر عمومی (health، login، setup) عمداً عمومی‌اند و خودمحور؛ تمام پرس‌وجوها به userId نشست محدودند، هیچ مسیری userId را از بدنه کلاینت نمی‌پذیرد، و شناسه‌های کلاینت همیشه با شرط مالکیت راستی‌آزمایی می‌شوند — پروب بین‌کاربری در آزمون زنده ۴۰۴ برگرداند. گارد Same-Origin روی همه متدهای تغییردهنده فعال است و بدنه‌ها همگی با سقف استریمی ۱۰۰ کیلوبایت مهار می‌شوند."));
B.push(h2("۲.۲ — ده اصلاح اجراشده در همین نشست"));
B.push(table(
  ["#", "اصلاح", "فایل", "اثبات"],
  [
    ["۱", "ابطال واقعی نشست‌های دیگر پس از تغییر رمز", "auth.ts + auth/password", "آزمون زنده ابطال: ۲ حذف، نشست فعلی زنده"],
    ["۲", "جستجوی وب از دروازه: کلید قطع + سقف سراسری ۲۰/min + ثبت مصرف", "server-search.ts", "ردیف AiUsage با model=web_search ثبت شد"],
    ["۳", "رفع ذخیره تکراری پیام کاربر در خطای Gateway", "chat/stream", "کد + آزمون زنده مسیر خطا"],
    ["۴", "سقف خروجی استریم (۴۰۰۰ نویسه) با قطع upstream", "chat/stream", "کد؛ reader.cancel در عبور از سقف"],
    ["۵", "سقف سراسری AI روی chat و chat/stream", "هر دو مسیر چت", "کد + آزمون واحد لیمیتر"],
    ["۶", "هم‌ترازی زمان ورود (دفاع timing-oracle)", "auth.ts + login", "burnPasswordTiming روی مسیر بدون حساب"],
    ["۷", "سقف نرخ ۱۲۰/min برای auth/session", "auth/session", "درخواست ۱۲۱م → ۴۲۹ (زنده)"],
    ["۸", "ادعای اتمیک راه‌اندازی اولیه (رفع TOCTOU)", "auth/setup", "updateMany با شرط sentinel و شمارش ۱"],
    ["۹", "یکتایی سطح کاربر کلید ضدتکرار", "schema + action-log", "بکاپ اول، جدول خالی، push موفق، ۹۹/۹۹"],
    ["۱۰", "پارامترسازی userId در جستجو برای ثبت مصرف", "هر دو مسیر چت", "typecheck + آزمون زنده"],
  ],
  [6, 40, 24, 30],
));
B.push(h2("۲.۳ — اسرار و تاریخچه گیت"));
B.push(body("اسکن الگوهای راز (sk-، api_key، Bearer، password=) روی src و tests و docs و prisma صفر مورد در کد محصول یافت؛ فقط اسکریپت‌های عملیاتی محلی مقادیر آزمایشی دارند که توصیه پارامترسازی برای آن‌ها ثبت شد. درباره تاریخچه گیت: فایل‌های .env و پایگاه‌داده در کامیت‌های قدیمی ردیابی شده بودند (blob در تاریخچه مانده است)؛ بررسی نام متغیرهای تاریخی نشان داد فقط DATABASE_URL در آن‌ها بوده و هیچ کلید API هرگز کامیت نشده، بنابراین چرخش کلید لازم نیست. پاک‌سازی تاریخچه صرفاً با تأیید مالک و پیش از هر push (در حال حاضر remote وجود ندارد) توصیه می‌شود. سرآیندهای امنیتی (CSP با nonce و strict-dynamic، X-Frame-Options DENY، nosniff، Referrer-Policy، Permissions-Policy) در پاسخ زنده تأیید شدند."));
B.push(h2("۲.۴ — آزمون زنده گیت‌ها (۱۵/۱۵ PASS)"));
B.push(body("اسکریپت آزمون زنده غیرمخرب اجرا شد که بدون دست زدن به رمز واقعی مالک، نشست آزمایشی مستقل می‌سازد و در پایان همه آثار خود را پاک می‌کند. نتیجه پانزده از پانزده: سلامت سرویس، گیت ۴۰۱ بدون کوکی روی چهار مسیر نمونه، نشست مینت‌شده معتبر، ۴۰۴ بین‌کاربری، ۴۰۰ بدنه نامعتبر، ثبت کار از مسیر قطعی دستیار، خنثی‌بودن اجرای تکراری، پاسخ شفاف کلید قطع، ثبت مصرف جستجوی وب، پاسخ سالم چت مدل‌محور، ابطال نشست پس از تغییر رمز، ۴۲۹ در تلاش یازدهم ورود، ۴۲۹ در درخواست صدوبیستم نشست، رد Origin خارجی، و پاک‌سازی کامل داده آزمون. دقت رندر نتایج: نسخه اول پارسر SSE آزمون خطا داشت (تکه‌های متن مدل با رویداد done اشتباه گرفته می‌شد)؛ پارسر اصلاح و کل مجموعه با همان کد سبز شد — این مورد در لاگ کار ثبت شده است."));

B.push(h1("بخش ۳ — هوش مصنوعی و دروازه"));
B.push(body("همه فراخوانی‌های مدل از دروازه مرکزی (src/lib/ai/gateway.ts) عبور می‌کنند: SDK فقط در دو فایل سرور ایمپورت می‌شود و چهار مصرف‌کننده مدل همگی از gatewayRun یا gatewayRunStream استفاده می‌کنند. ترتیب گاردها در دروازه: کلید قطع (تنظیم DB یا env)، سقف ورودی ۲۴هزار نویسه، سهمیه کاربر/روز (۶۰)، کاربر/ماه (۹۰۰) و سامانه/روز (۳۰۰) با شمارش ماندگار در DB، سپس اجرا با حداکثر یک تلاش مجدد فقط برای خطای گذرا، و ثبت مصرف فقط با فراداده. fallback پولی وجود ندارد و عمداً خاموش است؛ costEst صفر با کامنت صریح ثبت می‌شود و هیچ مسیر پولی مخفی وجود ندارد."));
B.push(body("عملیات ساده از مدل عبور نمی‌کنند: مسیریاب قطعی فارسی، ثبت کار، لیست و گزارش روزانه را بدون هیچ فراخوانی مدل انجام می‌دهد — در آزمون زنده، پیام «کار جدید» در کمتر از یک ثانیه و بدون مدل ثبت شد. سقف‌ها در همین نشست سخت‌گیرانه‌تر شد: جستجوی وب (که پیش‌تر خارج از دروازه بود) اکنون مشمول کلید قطع، سقف سراسری ۲۰ در دقیقه و ثبت مصرف است و استریم خروجی هم در ۴۰۰۰ نویسه بریده و upstream قطع می‌شود. آزمون تزریق پرامپت مستقیم (درخواست چاپ پرامپت سیستم) و غیرمستقیم (عنوان کار حاوی دستور آلوده) هر دو PASS شد: مدل در حالت مستقیم از افشا خودداری کرد و در حالت غیرمستقیم عنوان آلوده را «داده» تلقی کرد نه دستور — دیوار user_data و قانون سخت‌گیرانه پرامپت سیستم اثر خود را نشان داد."));

B.push(h1("بخش ۴ — معماری"));
B.push(body("تفکیک لایه‌ها سالم است: مسیرها فقط گارد و ارکستراسیون دارند، منطق دامنه در lib، SDK فقط در لایه دروازه، و کلاینت هرگز به سرور-لایب‌ها دسترسی ندارد. Middleware دو دفاع دارد: CSP با nonce per-request و گارد حضور کوکی، و اعتبارسنجی واقعی در هر مسیر. مدل داده شامل ده مدل است که همه مدل‌های متعلق به کاربر onDelete: Cascade به User دارند و ایندکس‌های ترکیبی روی الگوهای خواندن (کار بر اساس وضعیت و سررسید، یادآور بر اساس وضعیت اطلاق، چت/حافظه/مصرف بر اساس کاربر و زمان) تعریف شده‌اند. قیدهای یکتا شامل نام کاربری، هش توکن نشست، تنظیمات (کاربر، کلید) و کلید ضدتکرار در سطح کاربر است. چرخه حیات داده مهار شده: هرس چت به ۲۰۰ پیام، سقف حافظه ۱۰۰، یادآور فعال ۵۰، زیرکار ۳۰ و هرس نشست منقضی توسط زمان‌بند."));
B.push(body("یادداشت شفاف درباره مهاجرت: گردش کار فعلی prisma db push است (اسکیمای افزایشی بدون فایل مهاجرت)؛ تغییر این نشست (یکتایی ترکیبی ActionLog) با بکاپ قبلی، اثبات خالی‌بودن جدول از مقادیر تکراری و سپس push انجام شد و هیچ داده‌ای از دست نرفت. برای استقرار تیمی آینده، مسیر prisma migrate در اسکریپت‌ها موجود است و در docs/DEPLOYMENT.md مستند شده است."));

B.push(h1("بخش ۵ — رابط کاربری و تجربه کاربری"));
B.push(body("ارزیابی عملی با مرورگر واقعی انجام شد: دوازده اسکرین‌شات از نمای امروز (خالی و پر)، کارها، تقویم شمسی، دستیار، برنامه، حافظه، تمرکز، تم تیره، موبایل ۳۹۰ پیکسل و صفحه ۴۰۴ گرفته شد و کنسول در همه نماها بدون خطا ماند. معیارهای Apple HIG و Material 3 که برقرارند: شیشه‌ای فقط روی کنترل‌های شناور مناسب، موج کلیک نرم فقط روی عناصر تعاملی، آیکون‌های گرد lucide با ضخامت یکدست، پالت تک‌رنگ فیروزه‌ای بدون رنگ‌های هشدار بی‌مورد، و احترام کامل به prefers-reduced-motion در CSS و موشن‌ها. فونت وزیرمتن خودمیزبان است و رندر واقعی آن در اسکرین‌شات‌ها دیده می‌شود؛ RTL در همه نماها و در موبایل بی‌نقص است و کنتراست هر دو تم بالا."));
B.push(body("دو بهبود واقعی در همین نشست اعمال شد. نخست، صفحه ۴۰۴ پیش‌فرض انگلیسی و چپ‌به‌راست فریم‌ورک با صفحه فارسی RTL سازگار با هویت محصول جایگزین شد و رندر آن در مرورگر تأیید شد. دوم، نماهای غیرپیش‌فرض به next/dynamic منتقل شدند تا با اسکلتون شیمردار بارگذاری شوند (جزئیات در بخش ۹). Skeleton، حالت خالی دومنظوره و حالت خطا با دکمه تلاش مجدد از نسخه‌های قبل برقرارند و در اسکرین‌شات‌ها مشهودند. یادداشت صادقانه: آزمون با صفحه‌خوان واقعی (VoiceOver/NVDA) در این محیط ممکن نبود؛ برچسب‌گذاری ARIA، نقش‌های معنایی و aria-live در کد تأیید شد ولی آزمون کاربری صفحه‌خوان به‌عنوان کار باقی‌مانده در بخش ۱۴ ثبت است."));

B.push(h1("بخش ۶ — دستیار اجرایی"));
B.push(body("شش الزام دستیار اجرایی همگی برقرار و آزمون‌شده‌اند. استخراج وظیفه از زبان طبیعی با مسیریاب قطعی (بدون مدل) برای فعل‌های ثبت/لیست/گزارش انجام می‌شود و در آزمون زنده کار «آزمون زنده نهایی» ثبت شد. گزارش روزانه قطعی در API و نمای برنامه و دستیار برقرار است و پاسخ زنده آن شاهد شد. یادآوری صوتی با سه صدای WebAudio، گفتار محلی فارسی و اعلان مرورگر opt-in پیاده شده و تنظیمات هر کاربر نرمال‌سازی می‌شود. ثبت نتیجه اقدامات در دفتر ActionLog با وضعیت success/failed و فراداده غیرخصوصی انجام می‌شود. جلوگیری از اجرای تکراری با کلید کلاینت و یکتایی سطح کاربر برقرار است — آزمون زنده با کلید تکراری، تعداد کارها را ثابت نگه داشت. زمان‌بندی قابل اعتماد با زمان‌بند ۶۰ ثانیه‌ای سرور (منقضی‌سازی یادآور، هرس نشست، بازتولید تکرارشونده) و ثبت در instrumentation انجام می‌شود؛ محدودیت شفاف آن وابستگی به زنده بودن پروسه سرور است و پوش تضمینی نیازمند Web Push (تصمیم مالک) است."));

B.push(h1("بخش ۷ — موبایل"));
B.push(body("برای هر لایه، وضعیت صادقانه این است. PWA: پیاده‌سازی شده و زنده — manifest با نام/زبان/جهت فارسی و حالت standalone پاسخ ۲۰۰ می‌دهد، service worker مینیمال فقط دارایی‌های بی‌خطر (فونت، آیکون) را کش می‌کند و هیچ داده کاربری در کش ذخیره نمی‌شود؛ نصب روی اندروید/iOS قابل اجراست و بدون مجوز خاص است. Capacitor: طرح معماری و مرزهای قابلیت در docs/MOBILE_ARCHITECTURE.md مستند است؛ بسته‌بندی واقعی نیازمند محیط Android SDK/دستگاه است که در سندباکس موجود نبود — بنابراین «قابل اجرا، هنوز اجرا نشده» و ادعای موفقیتی برای آن ثبت نمی‌شود. Android: اعلان‌های محلی در WebView قابل اجرا؛ دسترسی نامحدود به برنامه‌های دیگر فرض و ادعا نشده است. محدودیت‌های سیستم‌عامل (سقف اعلان iOS در PWA، نبود Web Speech در برخی مرورگرها) در docs/REMINDERS_PLATFORMS.md فهرست شده است."));

B.push(h1("بخش ۸ — اتصال سرویس‌ها"));
B.push(body("چارچوب اتصال‌ها با شفافیت کامل پیاده شده: مسیر connections کاتالوگ ایستای ایمیل، تقویم، تلگرام و واتساپ را برمی‌گرداند که همه در وضعیت needs_owner_config هستند؛ هیچ توکن، کلید یا داده بیرونی در سیستم ذخیره نمی‌شود و برای هر اتصال، حداقل دسترسی، داده جمع‌شونده و محل اجرای عملیات در docs/CONNECTIONS.md پیش‌نمایش شده است. حذف داده در معماری فعلی ساده و تضمینی است: چون هیچ داده بیرونی وارد نشده، حذف کاربر همه آثار را کسکیدی پاک می‌کند. وضعیت صادقانه: فعال‌سازی واقعی OAuth نیازمند ثبت برنامه در ارائه‌دهنده، کلاینت‌سکرت و callback خارج از سندباکس است؛ تلگرام به توکن Bot API و واتساپ به حساب Business متا نیاز دارد. بنابراین این بخش با وضعیت Warning (طراحی کامل، اجرا معلق به تصمیم و حساب مالک) بسته می‌شود و ادعای اتصال زنده‌ای ثبت نمی‌شود."));

B.push(h1("بخش ۹ — کارایی"));
B.push(body("بهبود واقعی این نشست: نماهای کارها، تقویم، دستیار، برنامه و تایمر تمرکز از باندل اولیه خارج و با next/dynamic بارگذاری شدند؛ رندر هر پنج نما پس از تغییر در مرورگر تأیید شد و اسکلتون شیمردار در حال انتظار نمایش داده می‌شود. خروجی بیلد نشان می‌دهد چانک‌های جداگانه برای این نماها تولید شده است. در رندرهای غیرضروری، الگوی useSyncExternalStore و انتخابگرهای دقیق Zustand از نسخه‌های قبل برقرار است. در_race condition_: بوت‌استرپ کارها با mutex مشترک و throttle شصت ثانیه، و لیمیتر نرخ با هرس دوره‌ای ۶۰ ثانیه‌ای از رشد حافظه جلوگیری می‌کند؛ کش: service worker فقط دارایی استاتیک، و پاسخ‌های API همیشه no-store رفتار می‌کنند. در پرس‌وجوی DB، ایندکس‌های ترکیبی با الگوهای خواندن هم‌راستا هستند و هیچ N+1 شناخته‌شده‌ای در مسیرهای اصلی وجود ندارد."));

B.push(h1("بخش ۱۰ — مانیتورینگ"));
B.push(body("شش الزام به این صورت برقرار است. لاگ ساختاریافته: خروجی یکدست درخواست‌های Next با مدت و مسیر + خطاهای سرور با پیشوند مسیر، بدون محتوای خصوصی کاربر. گزارش خطا: خطاها سمت سرور ثبت و به کلاینت فقط پیام فارسی ایستا می‌رود؛ سرویس گزارش خطای خارجی عمداً وجود ندارد (حریم خصوصی استقرار شخصی). Health endpoint: پاسخ زنده با وضعیت DB و تأخیر؛ مناسب مانیتور خارجی. Metrics: دو جدول AiUsage و ActionLog سنجه‌های مصرف مدل و نتیجه اقدامات را ماندگار نگه می‌دارند. پشتیبان‌گیری: اسکریپت VACUUM INTO با integrity_check در همین نشست واقعاً اجرا و پشتیبان معتبر ساخت. بازیابی: رویه توقف سرویس، جایگزینی فایل و اجرای مجدد در خروجی اسکریپت و docs/DEPLOYMENT.md مستند است."));

B.push(h1("بخش ۱۱ — مستندات"));
B.push(body("پنج سند جدید در همین نشست نوشته شد: docs/ARCHITECTURE.md (معماری لایه‌ای، مدل داده، زمان‌بند)، docs/THREAT_MODEL.md (ماتریس STRIDE + OWASP LLM با وضعیت هر دفاع و ریسک‌های پذیرفته‌شده)، docs/API.md (مرجع کامل ۲۱ مسیر با گاردها و سقف‌ها)، docs/DEPLOYMENT.md (استقرار، پیکربندی، پشتیبان/بازیابی) و docs/ROADMAP.md (نقشه راه با وضعیت شفاف). README به‌روزرسانی شد تا به همه اسناد پیوند دهد و .env.example همه متغیرهای دروازه را با مقادیر نمونه غیرمحرمانه توضیح می‌دهد. زبان همه اسناد فارسی و هم‌راستا با هویت محصول است."));

B.push(h1("بخش ۱۲ — جمع‌بندی وضعیت و تصمیم تحویل"));
B.push(table(
  ["بخش", "وضعیت", "ملاک اصلی"],
  [
    ["۱ راستی‌آزمایی", "PASS", "همه گیت‌ها سبز با اجرای از صفر"],
    ["۲ امنیت", "PASS", "۱۰ اصلاح + ۱۵/۱۵ آزمون زنده + اسکن اسرار پاک"],
    ["۳ هوش مصنوعی", "PASS", "همه مسیرها از دروازه؛ تزریق PASS؛ بدون fallback پولی"],
    ["۴ معماری", "PASS", "لایه‌بندی، ایندکس، کسکید و قیدها ممیزی و سالم"],
    ["۵ UI/UX", "PASS", "۱۲ شاهد تصویری؛ یادداشت: صفحه‌خوان واقعی آزمون نشده"],
    ["۶ دستیار اجرایی", "PASS", "شش الزام با آزمون زنده؛ پوش تضمینی معلق به VAPID"],
    ["۷ موبایل", "PASS / Warning", "PWA زنده؛ Capacitor نیازمند محیط Android — ادعا نشد"],
    ["۸ اتصال‌ها", "Warning", "طراحی و شفافیت کامل؛ فعال‌سازی نیازمند حساب مالک"],
    ["۹ کارایی", "PASS", "تقسیم کد واقعی + ایندکس‌ها + مهار مسابقه"],
    ["۱۰ مانیتورینگ", "PASS", "health/بکاپ/متریک‌ها واقعی؛ SIEM خارجی در دامنه نیست"],
    ["۱۱ مستندات", "PASS", "۵ سند جدید + README به‌روز"],
    ["۱۲ تحویل", "آماده انتشار محدود و مشروط", "هیچ بحرانی باز نیست؛ شروط در ادامه"],
  ],
  [22, 26, 52],
));
B.push(body("شرط‌های انتشار: استقرار روی دستگاه مالک یا شبکه مورد اعتماد با TLS؛ پشتیبان‌گیری دوره‌ای طبق رویه مستند؛ عدم افشای عمومی اینترنتی پیش از تصمیم مالک درباره پاک‌سازی تاریخچه گیت و سرویس مانیتورینگ خارجی. معیار پذیرش هر بند در جدول یافته‌ها و اسناد docs ثبت شده است."));

B.push(h1("محدودیت‌ها و ریسک‌های باقیمانده (شفاف)"));
B.push(bullet("لیمیتر نرخ و زمان‌بند درون‌حافظه‌ای‌اند — استقرار چندنمونه‌ای بدون استور مشترک مجاز نیست (مستند در کد و .env.example)."));
B.push(bullet("بلاب‌های حساس قدیمی در تاریخچه گیت مانده‌اند (بدون کلید API)؛ پاک‌سازی فقط با تأیید مالک و پیش از push."));
B.push(bullet("آزمون با صفحه‌خوان واقعی و دستگاه اندروید فیزیکی در سندباکس ممکن نشد؛ هر دو به‌عنوان کار باقی‌مانده ثبت‌اند."));
B.push(bullet("اتصال‌های واقعی ایمیل/تقویم/تلگرام/واتساپ نیازمند حساب و کلید بیرونی‌اند — طراحی و مستندسازی کامل، اجرا معلق."));
B.push(bullet("یادآوری تضمینی خارج از باز بودن تب، نیازمند Web Push با کلیدهای VAPID است (تصمیم مالک)."));

B.push(h1("پیوست — شواهد و مسیرها"));
B.push(bullet("آزمون زنده ۱۵موردی: scripts/live-final-audit.ts — خروجی ۱۵/۱۵ PASS در لاگ نشست."));
B.push(bullet("آزمون تزریق: scripts/live-injection-test.ts — مستقیم و غیرمستقیم PASS."));
B.push(bullet("بسته کد یکپارچه: artifacts/rahyar-audit/RAHYAR_SOURCE_BUNDLE.txt (۱۵۸ فایل، ۷۵۴KB)."));
B.push(bullet("اسکرین‌شات‌ها: artifacts/final-audit/ (۱۲ تصویر واقعی مرورگر در دو تم و موبایل)."));
B.push(bullet("پشتیبان DB در آستانه تغییر اسکیما: backups/ara-20261018-052155.db (صحت ok)."));
B.push(bullet("کامیت محلی نهایی روی شاخه main — بدون push (remote وجود ندارد)."));

// ── سند ──────────────────────────────────────────────────────
const doc = new Document({
  creator: "Rahyar AI Engineering",
  title: "گزارش نهایی مأموریت ۱۲بندی — رهیار AI",
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
        title: "گزارش نهایی مأموریت دوازده‌بندی آمادگی انتشار",
        subtitle: "رهیار AI — دستیار هوشمند شخصی فارسی (نسخه ۴.۱)",
        label: "گزارش رسمی تحویل — با شواهد اجرایی",
        metaLines: [
          "دامنه: ۲۱ مسیر API، دروازه AI، امنیت، UI/UX، موبایل، عملیات",
          "روش: راستی‌آزمایی از صفر — شاهد واقعی برای هر ادعا",
          "نتیجه: آماده انتشار محدود و مشروط — بدون مورد بحرانی باز",
        ],
        footerRight: "رهیار AI — از درخواست تا انجام",
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
  fs.writeFileSync("/home/z/my-project/download/گزارش_نهایی_مأموریت_۱۲بندی_رهیار_AI.docx", buf);
  console.log("OK — mission report written");
});
