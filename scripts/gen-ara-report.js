// ─── گزارش مقایسه و ممیزی امنیتی دستیار آرا — تولید DOCX فارسی RTL ───
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, WidthType, BorderStyle,
  ShadingType, TableOfContents, PageBreak, SectionType, NumberFormat,
  SimpleField, ExternalHyperlink, TableLayoutType, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── پالت DS-1 (Deep Sea) — هماهنگ با تیل اپ ──
const P = {
  bg: "0B1C2C", accent: "529286", primary: "10222E", body: "1A2A33", secondary: "5B6B7D",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "529286", headerText: "FFFFFF", innerLine: "BECFCC", surface: "E8ECEB" },
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };

// ── هلپرها ──
const r = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FA, size: o.size ?? 24, bold: o.bold, color: o.color ?? P.body, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: 312, before: o.before ?? 0, after: o.after ?? 140 }, children: Array.isArray(children) ? children : [r(children, o.run || {})], keepNext: o.keepNext });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, spacing: { before: 380, after: 170, line: 380, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 32, color: P.primary })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 260, after: 130, line: 360, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 28, color: P.primary })] });
const link = (url) => new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, font: { ascii: "Courier New", hAnsi: "Courier New" }, size: 16, color: "3A7A6E", underline: {} })] });

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { ...noBorders, insideHorizontal: NB, insideVertical: NB };

// جدول RTL سه‌خطی با هدر تیل
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

// ── محاسبه چیدمان عنوان جلد (اقتباس calcTitleLayout برای فارسی) ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charW = (pt) => pt * 11; // پهنای تقریبی حرف فارسی
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

// ── جلد R1 (اقتباس RTL) ──
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

// ═══════════ محتوا ═══════════
const body = [];

// ۱) خلاصه اجرایی
body.push(h1("۱. خلاصه اجرایی"));
body.push(para("این گزارش دو مأموریت مشخص را پوشش می‌دهد: نخست، مستندسازی دقیق قابلیت‌های فعلی منوی دستیار در اپلیکیشن «آرا» و مقایسه مستند آن با ده اپلیکیشن برتر دستیار هوشمند جهان؛ و دوم، ممیزی امنیتی کامل از منظر یک هکر تهاجمی همراه با رفع تمامی رخنه‌های کشف‌شده. تمامی ادعاهای مربوط به رقبا مستقیماً به مستندات رسمی، خبرگزاری‌های معتبر و چارچوب‌های امنیتی شناخته‌شده ارجاع داده شده است تا گزارش قابلیت راستی‌آزمایی داشته باشد."));
body.push(para("بررسی رقبا نشان داد که فاصله اصلی آرا با رهبران بازار در پنج محور است: حافظه پایدار بلندمدت، پاسخ‌دهی مبتنی بر وب با استناد، پیشنهادهای دنباله‌دار، کنترل صوتی دومحوره (ورودی و خروجی) و مدیریت گفتگو (جستجو و خروجی گرفتن). بر همین اساس دوازده ارتقای مشخص برای منوی دستیار طراحی و در همین نسخه پیاده‌سازی شد؛ از جمله حافظه دائمی کاربر به سبک ChatGPT و Copilot، جستجوی زنده وب با کارت منابع به سبک Perplexity، دکمه توقف تولید، خروجی صوتی فارسی، جستجو در تاریخچه گفتگو، خروجی فایل مارک‌داون و چهار اکشن عملیاتی جدید (ستاره‌دار کردن، به‌تعویق انداختن، برنامه‌ریزی روز و یادسپاری)."));
body.push(para("در جبهه امنیت، ممیزی در نقش هکر با روش‌شناسی شناسایی نقشه حمله، مدل‌سازی سناریوهای سوءاستفاده و نگاشت یافته‌ها به OWASP Top 10 برای اپلیکیشن‌های LLM (نسخه ۲۰۲۵) انجام شد. نه رخنه یا ضعف واقعی شناسایی شد که دو مورد آن در رده بحرانی قرار دارد: نبود هرگونه محدودیت نرخ روی مسیرهای هزینه‌بر هوش مصنوعی و باز بودن زنجیره تزریق پرامپت تا اجرای خودکار اکشن‌ها. تمامی نه مورد با کنترل‌های لایه‌ای (محدودسازی نرخ پنجره‌ای، گارد Same-Origin، هدرهای امنیتی CSP، سخت‌سازی اعتبارسنجی ورودی، مهار خروجی مدل و گارد عاملیت) برطرف شد و بخش پایانی گزارش، ریسک‌های باقی‌مانده و توصیه‌های آتی را شفاف مستند می‌کند."));

// ۲) قابلیت‌های فعلی
body.push(h1("۲. قابلیت‌های فعلی منوی دستیار آرا"));
body.push(para("منوی دستیار آرا پیش از این ارتقا، یک رابط گفتگوی متنی فارسی با پشتیبانی کامل RTL بود که به موتور اجرای اکشن متصل است؛ یعنی پاسخ دستیار فقط متن نیست، بلکه می‌تواند مستقیماً روی داده‌های کاربر اثر بگذارد. مغز دستیار دو لایه دارد: لایه قطعیِ سریع برای تشخیص تاریخ شمسی، ساعت و اولویت، و لایه مدل زبانی برای گفتگوی طبیعی و تصمیم‌گیری درباره اکشن‌ها. فهرست کامل قابلیت‌های موجود در زمان شروع این پروژه در جدول ۱ آمده است."));
body.push(cap("جدول ۱ — موجودی قابلیت‌های منوی دستیار (پیش از ارتقا)"));
body.push(tbl(["قابلیت", "شرح فنی"], [
  ["چت با پاسخ استریم زنده", "پیاده‌سازی SSE در مسیر /api/chat/stream با نمایش تدریجی پاسخ و کرسر چشمک‌زن"],
  ["رندر مارک‌داون", "نمایش پشتیبانی از سرتیتر، فهرست و پیوند در پاسخ‌های دستیار با کتابخانه react-markdown"],
  ["ورودی صوتی فارسی", "تشخیص گفتار fa-IR از طریق Web Speech API و تبدیل مستقیم به پیام"],
  ["درک زمان و تقویم شمسی", "آگاهی از تاریخ جلالی امروز، ساعت تهران و مفاهیم امروز/فردا/پس‌فردا در پرامپت سیستم"],
  ["زمینه کوتاه‌مدت", "تزریق ۱۲ پیام آخر گفتگو و فهرست کارهای فعال کاربر به زمینه مدل"],
  ["شش اکشن عملیاتی", "افزودن کار، تکمیل، حذف، ویرایش، ثبت یادآوری و تجزیه کار بزرگ به زیرکار"],
  ["ابزارهای گفتگو", "کپی پاسخ، تولید دوباره پاسخ، پاک‌سازی گفتگو و چیپ‌های پیشنهادی ثابت"],
  ["تاریخچه دائمی", "ذخیره‌سازی پیام‌ها در پایگاه‌داده SQLite و بازیابی در ورود بعدی"],
], [32, 68]));
body.push(para("این موجودی، آرا را به یک دستیار وظیفه‌محور توانمند تبدیل می‌کرد؛ اما مقایسه با رقبا نشان داد که تجربه «دستیار شخصیِ همیشه‌همراه» بدون حافظه بلندمدت، بدون دسترسی به اطلاعات روز وب و بدون کنترل‌های صوتی و مدیریت گفتگو، ناقص احساس می‌شود. شناسایی دقیق همین خلأها ورودی اصلی طراحی ارتقاهای بخش ششم گزارش است."));

// ۳) روش‌شناسی
body.push(h1("۳. روش‌شناسی مقایسه"));
body.push(para("ده اپلیکیشن انتخابی بر اساس سه شاخص پوشش کاربران جهانی، بار علمی در حوزه دستیار شخصی و تنوع رویکرد انتخاب شدند: چهار دستیار عمومی بزرگ (ChatGPT، Gemini، Copilot و Siri/Apple Intelligence)، دو دستیار خانگی و صوتی (Alexa+ و Zoom AI Companion)، دو دستیار دانش‌محور (Perplexity و Notion AI) و دو دستیار بهره‌وری و وظیفه‌محور (Todoist Assist و حوزه همراهان هوش مصنوعی مانند Repl). برای هر اپلیکیشن، ویژگی‌ها از مستندات رسمی محصول، صفحه خبر رسمی شرکت یا گزارش تحلیلی معتبر استخراج و تاریخ دسترسی همه منابع ۱۶ اکتبر ۲۰۲۶ (برابر ۲۴ مهر ۱۴۰۵) ثبت شده است."));
body.push(para("مقایسه بر پایه پنج معیار انجام شده است که جمع آن‌ها تعریف عملیاتی «دستیار شخصی کامل» را می‌سازد: نخست، هوش مکالمه و کیفیت استریم پاسخ؛ دوم، حافظه و شخصی‌سازی پایدار؛ سوم، دسترسی به دانش زنده و استنادپذیری؛ چهارم، عمق اجرای عملیات واقعی (عاملیت) و ایمنی آن؛ و پنجم، تجربه تعامل شامل صوت، کنترل تولید و مدیریت گفتگو. امتیازدهی جدول جمع‌بندی بخش چهارم از همین پنج معیار نتیجه گرفته شده و به‌جای عددسازی، وضعیت هر معیار با ذکر شاهد مستند در متن آمده است."));

// ۴) مقایسه با ۱۰ اپ
body.push(h1("۴. مقایسه با ده اپلیکیشن برتر"));
body.push(para("در این بخش هر اپلیکیشن به‌اختصار اما مستند معرفی می‌شود و مزیت آن نسبت به نسخه پیش از ارتقای آرا صریحاً بیان می‌گردد. جدول ۲ در پایان بخش، جمع‌بندی مقایسه را ارائه می‌کند."));

body.push(h2("۴-۱. ChatGPT (OpenAI)"));
body.push(para("OpenAI به ChatGPT قابلیت Scheduled Tasks را افزوده است؛ دستیار می‌تواند کارهای یک‌باره یا تکرارشونده را در زمان مشخص اجرا کند، برای تغییرات پایش بگذارد و با اعلان مرورگر یا موبایل خبر دهد (مستند رسمی help.openai.com). همچنین حافظه چندلایه شامل «خاطرات ذخیره‌شده»، «ارجاع به تاریخچه گفتگو» و دستورالعمل‌های سفارشی، باعث می‌شود پاسخ‌ها با مرور زمان شخصی‌تر شوند (help.openai.com/en/articles/8590148). مزیت نسبت به آرا: اجرای زمان‌بندی‌شده خودکار و حافظه پایدار؛ دو قابلیتی که آرا نداشت و به‌ترتیب در فاز فعلی و آتی جبران شده است."));

body.push(h2("۴-۲. Google Gemini"));
body.push(para("گوگل سه قابلیت متمایز به Gemini داده است: Deep Research که به‌صورت عاملی صدها منبع وب و حتی Gmail و Drive را مرور کرده و گزارش چندصفحه‌ای با چرخه برنامه‌ریزی، جستجو، استدلال و گزارش می‌سازد (gemini.google/overview/deep-research)؛ Schedules که تا ده اقدام تکرارشونده مانند خلاصه روزانه اخبار یا کارها را در زمان مقرر آماده و اعلان می‌کند (support.google.com/gemini/answer/16316416)؛ و Daily Brief که هر صبح مهم‌ترین نکات ایمیل، تقویم و گفتگوها را اولویت‌بندی شده ارائه می‌دهد (gemini.google/overview/daily-brief). مزیت نسبت به آرا: دانش زنده وب، استنادپذیری و شروع پراکتیو روزانه."));

body.push(h2("۴-۳. Siri و Apple Intelligence"));
body.push(para("اپل با بازطراحی Siri AI بر پایه Apple Foundation Models، دستیار را به درک «زمینه شخصی» کاربر مجهز کرده است؛ Siri می‌تواند به داده‌های روی صفحه، پیام‌ها و اپلیکیشن‌های کاربر ارجاع دهد و اقدامات درون‌اپلیکیشنی را اجرا کند و بخش قابل توجهی از پردازش روی خود دستگاه انجام می‌شود (apple.com/newsroom، ژوئن و سپتامبر ۲۰۲۶). مزیت نسبت به آرا: زمینه‌آگاهی عمیق از رفتار کاربر و حریم خصوصی مبتنی بر پردازش محلی؛ درسی که در طراحی حافظه آرا به‌صورت ذخیره‌سازی محلی در پایگاه‌داده خود کاربر لحاظ شده است."));

body.push(h2("۴-۴. Amazon Alexa+"));
body.push(para("آمازون نسل جدید دستیار خود را با نام Alexa+ بر پایه مدل‌های مولد معرفی کرد: مکالمه طبیعی و روان بین موضوعات، درخواست چندکار همزمان و مهم‌تر از همه عاملیت واقعی؛ رزرو رستوران، سفارش غذا و ارسال پیام به‌جای کاربر (aboutamazon.com، فوریه ۲۰۲۵). طبق CNBC از فوریه ۲۰۲۶ این سرویس عمومی شده و ماهانه ۱۹.۹۹ دلار (رایگان برای اعضای Prime) قیمت‌گذاری شده است. مزیت نسبت به آرا: عاملیت چندمرحله‌ای بین‌سرویسی؛ آرا اکشن‌های تک‌مرحله‌ای روی داده خودش را دارد و اجرای زنجیره‌ای در نقشه راه قرار گرفت."));

body.push(h2("۴-۵. Microsoft Copilot"));
body.push(para("مایکروسافت در ژوئیه ۲۰۲۵ قابلیت Copilot Memory را معرفی کرد: ذخیره خودکار حقایق کلیدی مانند ترجیحات و سبک کاری کاربر از مکالمات، با امکان مشاهده، ویرایش و حذف هر خاطره توسط کاربر (techcommunity.microsoft.com و support.microsoft.com). در سطح بالاتر، Autopilot به‌عنوان عامل ابری همیشه‌فعال با هویت و حافظه مستقل، کارها را در پس‌زمینه پیش می‌برد. مزیت نسبت به آرا: حافظه قابل مدیریت توسط کاربر؛ همین الگو عیناً در شیت «حافظه» آرا پیاده‌سازی شد تا کاربر کنترل کامل بر خاطرات داشته باشد."));

body.push(h2("۴-۶. Perplexity"));
body.push(para("Perplexity یک «موتور پاسخ» است نه چت‌بات صرف؛ هر پاسخ با استناد مستقیم به منابع تولید می‌شود و Pro Search با چند جستجوی متوالی، سنتز ده‌ها منبع و نمایش فرایند پژوهش، پاسخ‌های عمیق می‌سازد (perplexity.ai/help-center). صفحات رسمی محصول، استنادپذیری («منبع پشت هر ادعا») و شاخص بودن داده زنده وب را به مزیت رقابتی اصلی تبدیل کرده‌اند (perplexity.ai/hub/products/search). مزیت نسبت به آرا: پاسخ علمی به سؤالات روز با امکان راستی‌آزمایی؛ الگوی کارت منابع آرا از همین محصول الهام گرفته شد."));

body.push(h2("۴-۷. Notion AI"));
body.push(para("Notion AI دستیاری درون فضای کاری است که با Q&A زمینه‌دار روی اسناد کاربر پاسخ می‌دهد، از طریق AI Connectors به Slack، Google Drive و GitHub جستجوی سازمانی می‌زند و پاسخ‌ها را با استناد به منبع داخلی ارائه می‌کند؛ همچنین Notion Agent کارهای چندمرحله‌ای را روی پایگاه‌داده‌ها اجرا می‌کند (notion.com/product/ai و راهنمای رسمی). مزیت نسبت به آرا: جستجوی زمینه‌ای روی دانش شخصی و استناد به منبع داخلی؛ آرا این را با زمینه کارها و حافظه جبران کرده اما اتصال به اسناد بیرونی در نقشه راه است."));

body.push(h2("۴-۸. Todoist Assist"));
body.push(para("Todoist مجموعه Todoist Assist را عرضه کرده است: Filter Assist برای ساخت فیلترهای پیچیده با زبان طبیعی، Task Assist برای عملیاتی‌سازی اهداف و شکستن کارهای پیچیده با پیشنهادهای زمینه‌دار، و Email Assist برای تبدیل خودکار ایمیل‌های فورواردشده به کار (todoist.com/help). نکته قابل توجه، شفافیت امنیتی آن است: پردازش روی زیرساخت خود Todoist انجام می‌شود و ارائه‌دهندگان مدل تعهد داده‌اند از داده کاربران آموزش نگیرند. مزیت نسبت به آرا: هوش توزیع‌شده در کل چرخه وظیفه؛ آرا با اکشن‌های جدید ستاره، تعویق و تجزیه در مسیر مشابه حرکت می‌کند."));

body.push(h2("۴-۹. همراهان هوش مصنوعی (Repl و Pi)"));
body.push(para("رویکرد «همراه هوشمند» بر پیوستگی رابطه تمرکز دارد: هویت پایدار، حافظه میان‌گفتگویی و مکالمه صوتی روان (تحلیل Fostera درباره حافظه و هویت در همراهان هوش مصنوعی، fostera.ai). محصولات این خانواده نشان می‌دهند بخشی از تعلق کاربر به دستیار، از «یادآوری او» و طبیعی بودن صدا می‌آید نه فقط از کارایی. مزیت نسبت به آرا: پیوستگی احساسی؛ ارتقای حافظه و خروجی صوتی آرا مستقیماً از همین الگو الهام گرفته شده است."));

body.push(h2("۴-۱۰. Zoom AI Companion"));
body.push(para("Zoom AI Companion دستیاری سازمانی است که در جلسات خلاصه زنده و پس از جلسه، اقدامات پیشنهادی و پاسخ به سؤالات مبتنی بر رونوشت جلسه تولید می‌کند و در چت و ایمیل، پیش‌نویس و خلاصه می‌سازد (راهنماهای تحلیلی getvoip.com و krisp.ai). نکته امنیتی مهم آن، تعهد به عدم استفاده از محتوای مشتریان برای آموزش مدل است. مزیت نسبت به آرا: خلاصه‌سازی و اقدام‌یابی از جریان تعاملات؛ در آرا معادل آن، خلاصه هوشمند صبح و برنامه روزانه است."));

body.push(cap("جدول ۲ — جمع‌بندی مقایسه (معیارهای پنج‌گانه)"));
body.push(tbl(["اپلیکیشن", "قابلیت شاخص مستند", "مزیت کلیدی نسبت به آرا (پیش از ارتقا)"], [
  ["ChatGPT", "Scheduled Tasks و Memory چندلایه", "اجرای زمان‌بندی‌شده و حافظه پایدار"],
  ["Gemini", "Deep Research، Schedules، Daily Brief", "دانش زنده وب و شروع پراکتیو روز"],
  ["Siri / Apple Intelligence", "زمینه شخصی و اقدام درون‌اپلیکیشنی", "زمینه‌آگاهی عمیق با پردازش محلی"],
  ["Alexa+", "عاملیت چندمرحله‌ای بین‌سرویسی", "انجام کار واقعی به‌جای کاربر"],
  ["Microsoft Copilot", "Memory قابل مدیریت و Autopilot", "حافظه تحت کنترل کامل کاربر"],
  ["Perplexity", "Pro Search و استناد به منابع", "پاسخ راستی‌آزمایی‌پذیر از وب زنده"],
  ["Notion AI", "جستجوی سازمانی با استناد و Agent", "پاسخ زمینه‌دار از دانش شخصی"],
  ["Todoist Assist", "فیلتر/کار/ایمیل هوشمند", "هوش توزیع‌شده در چرخه وظیفه"],
  ["Repl / Pi", "حافظه میان‌گفتگویی و صوت طبیعی", "پیوستگی رابطه و تعامل صوتی"],
  ["Zoom AI Companion", "خلاصه جلسه و اقدام‌یابی", "استخراج کار از جریان تعاملات"],
], [22, 39, 39]));

// ۵) تحلیل شکاف
body.push(h1("۵. تحلیل شکاف و قابلیت‌های قابل افزودن"));
body.push(para("تقاطع یافته‌های بخش چهارم با معماری آرا، ده شکاف مشخص را آشکار کرد که در جدول ۳ به‌همراه رهبر الگو، اولویت و تکلیف هرکدام آمده است. اولویت‌بندی بر اساس دو متغیر «ارزش ادراک‌شده برای کاربر روزمره» و «امکان پیاده‌سازی مطمئن در معماری فعلی» انجام شده است؛ قابلیت‌هایی که هم رهبران بازار آن را به استاندارد تبدیل کرده‌اند و هم در همین معماری قابل تحویل بودن، به نسخه فعلی منتقل شدند و مابقی به نقشه راه آینده رفت."));
body.push(cap("جدول ۳ — شکاف‌ها، اولویت و وضعیت اقدام"));
body.push(tbl(["شکاف شناسایی‌شده", "الگوی رقیب", "اولویت", "وضعیت"], [
  ["حافظه پایدار بلندمدت کاربر", "ChatGPT Memory، Copilot Memory", "بحرانی", "پیاده‌سازی شد"],
  ["پاسخ مبتنی بر وب با استناد", "Perplexity، جستجوی ChatGPT", "بحرانی", "پیاده‌سازی شد"],
  ["پیشنهادهای دنباله‌دار هر پاسخ", "Gemini، Copilot", "بالا", "پیاده‌سازی شد"],
  ["توقف تولید و خروجی صوتی", "ChatGPT Voice و مشابه", "بالا", "پیاده‌سازی شد"],
  ["جستجو و خروجی در تاریخچه گفتگو", "ChatGPT Search و Export", "بالا", "پیاده‌سازی شد"],
  ["اکشن‌های تکمیلی (ستاره، تعویق، برنامه روز)", "Todoist Assist", "بالا", "پیاده‌سازی شد"],
  ["اقدامات زمان‌بندی‌شده خودکار", "ChatGPT Tasks، Gemini Schedules", "بالا", "فاز بعد"],
  ["ورودی چندوجهی (تصویر و فایل)", "ChatGPT، Gemini، Notion", "متوسط", "نقشه راه"],
  ["اتصال به سرویس‌های بیرونی", "Alexa+، Notion Connectors", "متوسط", "نقشه راه"],
  ["عامل خودکار چندمرحله‌ای با تأیید انسانی", "Copilot Autopilot، Alexa+", "متوسط", "نقشه راه"],
], [34, 30, 14, 22]));

// ۶) نقشه راه پیاده‌شده
body.push(h1("۶. ارتقاهای پیاده‌سازی‌شده در منوی دستیار"));
body.push(para("بر اساس تحلیل شکاف، دوازده ارتقا در همین نسخه به منوی دستیار افزوده شد. منطق طراحی، حفظ زبان مینیمال موجود بود: هیچ عنصر تزئینی اضافه نشد و هر قابلیت تازه در همان گرامر بصری قبلی (تایپوگرافی محور، بدون کادر اضافه) نشسته است. جدول ۴ فهرست کامل ارتقاهاست و سپس سه قابلیت کلیدی به‌تفصیل توضیح داده می‌شوند."));
body.push(cap("جدول ۴ — فهرست ارتقاهای نسخه جدید"));
body.push(tbl(["ردیف", "ارتقا", "رفتار جدید"], [
  ["۱", "حافظه دائمی دستیار", "ذخیره حقایق کلیدی کاربر در پایگاه‌داده با اکشن‌های remember/forget و مدیریت کامل در شیت حافظه"],
  ["۲", "جستجوی زنده وب", "تشخیص نیاز به اطلاعات روز، جستجوی وب سمت سرور و پاسخ با کارت «منابع» قابل کلیک"],
  ["۳", "پیشنهادهای دنباله‌دار", "سه پیشنهاد زمینه‌دار زیر آخرین پاسخ که با کلیک، ادامه گفتگو را می‌سازند"],
  ["۴", "توقف تولید", "دکمه Stop حین استریم با قطع فوری جریان مثل ChatGPT"],
  ["۵", "خروجی صوتی فارسی", "پخش گفتاری هر پاسخ با speechSynthesis و کلید قطع/وصل خودکار"],
  ["۶", "جستجو در گفتگو", "فیلتر زنده پیام‌های گذشته مستقیماً در سربرگ چت"],
  ["۷", "خروجی گفتگو", "دانلود کامل تاریخچه به‌صورت فایل مارک‌داون"],
  ["۸", "اکشن ستاره‌دار کردن", "امکان تغییر وضعیت ستاره کار از دل گفتگو"],
  ["۹", "اکشن به‌تعویق انداختن", "انتقال کار به فردا با یک جمله («فلان کار رو بنداز فردا»)"],
  ["۱۰", "اکشن برنامه روز", "چیدن برنامه امروز توسط دستیار و پرش مستقیم به نمای برنامه"],
  ["۱۱", "حالت خالی آموزنده", "گرید قابلیت‌های دستیار برای شروع سریع کاربران تازه"],
  ["۱۲", "سخت‌سازی امنیتی کامل", "پنج کنترل لایه‌ای جدید مطابق بخش هفت روی کل مسیرهای دستیار"],
], [10, 30, 60]));
body.push(para("حافظه دائمی به سبک Copilot طراحی شد: دستیار خودش تشخیص می‌دهد کدام جمله کاربر ارزش نگه‌داری دارد (مانند «من vegetarian هستم» یا «جلسه‌هایم همیشه شنبه است»)، آن را به‌صورت یک حقیقت کوتاه ذخیره می‌کند و از دفعه بعد در پاسخ‌ها لحاظ می‌شود. کاربر کنترل کامل دارد: شیت حافظه فهرست همه خاطرات را نشان می‌دهد و هر کدام قابل حذف است؛ این همان الگوی «Memory قابل مدیریت» مستند مایکروسافت است و پاسخ به سؤال «از من چه می‌دانی» نیز از همین منبع تغذیه می‌شود."));
body.push(para("جستجوی وب به سبک Perplexity اما محافظه‌کارانه پیاده شد: پیش از فراخوانی مدل، تشخیص قطعی انجام می‌گیرد که آیا پیام به اطلاعات روز (اخبار، قیمت، آب‌وهوا، رویدادهای اخیر) نیاز دارد؛ در این صورت سمت سرور جستجوی وب انجام و نتایج پالایش‌شده به زمینه مدل تزریق می‌شود و مدل موظف است پاسخ را با پیوند مستقیم منابع بدهد. کارت «منابع» زیر پاسخ، فقط دامنه‌های http و https معتبر را نمایش می‌دهد و برخلاف نگرانی‌های رایج درباره پاسخ‌های بی‌ریشه، کاربر می‌تواند هر ادعا را یک کلیک راستی‌آزمایی کند."));

// ۷) ممیزی امنیتی
body.push(h1("۷. ممیزی امنیتی در نقش هکر"));
body.push(para("ممیزی با ذهنیت تهاجمی و در پنج گام انجام شد: نخست نقشه‌برداری کامل سطح حمله (همه مسیرهای API، ورودی‌ها، جریان داده به مدل و به مرورگر)؛ سپس مدل‌سازی سناریوهای سوءاستفاده واقعی از دید مهاجم بیرونی، کاربر بدخواه و حتی خود مدل؛ سپس تلاش برای عبور از هر کنترل موجود؛ نگاشت یافته‌ها به چارچوب مرجع OWASP Top 10 برای اپلیکیشن‌های LLM نسخه ۲۰۲۵؛ و در پایان طراحی و پیاده‌سازی رفع لایه‌ای. نتیجه: نه یافته مستند در جدول ۵ که دو مورد بحرانی آن می‌توانست منجر به تمام‌شدن اعتبار مالی سرویس مدل یا تخریب داده کاربر شود."));
body.push(cap("جدول ۵ — یافته‌های ممیزی، شدت و رفع"));
body.push(tbl(["کد", "یافته", "شدت", "نگاشت OWASP", "رفع اعمال‌شده"], [
  ["F-01", "نبود محدودیت نرخ روی همه مسیرها؛ مسیرهای LLM بدون سقف قابل فراخوانی بودند", "بحرانی", "LLM10 مصرف بی‌کران", "محدودساز پنجره‌ای درون‌حافظه‌ای برای هر مسیر و IP با پاسخ 429 و سرآیند Retry-After"],
  ["F-02", "تزریق پرامپت تا اجرای اکشن باز بود؛ حذف خودکار کارها بدون تأیید ممکن بود", "بحرانی", "LLM01 و LLM06", "جداسازی داده کاربر در دیوار <user_data>، گارد حذف تک‌موردی، سقف هشت اکشن و اعتبارسنجی سخت هر فیلد"],
  ["F-03", "نبود سرآیندهای امنیتی (CSP، X-Frame-Options و غیره)", "بالا", "پایه OWASP ASVS", "خط‌مشی CSP سخت‌گیرانه و پنج سرآیند دیگر در next.config.ts"],
  ["F-04", "نبود بررسی Same-Origin روی متدهای تغییردهنده (ریسک CSRF)", "بالا", "پایه OWASP ASVS", "گارد Same-Origin با اعتبارسنجی سرآیند Origin روی POST/PATCH/DELETE"],
  ["F-05", "سقف طول برخی ورودی‌ها (یادداشت، برچسب) تعریف نشده بود", "متوسط", "LLM05", "سقف ۲۰۰۰ نویسه یادداشت، ۴۰ برچسب و بازه معتبر برای ساعت سررسید"],
  ["F-06", "رشد بی‌کران جدول گفتگو و سقف‌نداشتن زیرکار و یادآوری", "متوسط", "LLM10", "هرس خودکار گفتگو به ۲۰۰ پیام، سقف ۳۰ زیرکار و ۵۰ یادآوری فعال"],
  ["F-07", "خروجی مدل بدون مهار طول و بدون پالایش به‌کار می‌رفت", "متوسط", "LLM05", "سقف طول پاسخ، پالایش پیشنهادها و پذیرش فقط منابع http/https"],
  ["F-08", "مسیر اطلاعاتی زائد /api با پاسخ Hello World", "پایین", "سطح حمله", "حذف کامل مسیر"],
  ["F-09", "رندر مارک‌داون — مهارشده اما بدون دفاع عمیق روی نشانی‌ها", "پایین", "LLM05", "پالایش href به http/https/mailto و حفظ rel noopener noreferrer"],
], [8, 30, 10, 16, 36]));
body.push(para("دو یافته بحرانی شایسته توضیح بیشترند. در F-01، مهاجم می‌توانست با حلقه‌ای ساده روی مسیرهای استریم چت، تجزیه کار و برنامه‌ریزی، سرویس مدل را درگیر و هزینه کند؛ چون هیچ سقفی وجود نداشت، این همان سناریوی Unbounded Consumption است که OWASP آن را در رده دهم فهرست ۲۰۲۵ خود طبقه‌بندی کرده (genai.owasp.org، LLM10). رفع آن یک محدودساز پنجره‌ای لغزان درون‌حافظه‌ای است که برای مسیرهای هوش مصنوعی سقف سخت‌گیرانه‌تر و برای مسیرهای عادی سقف بخشنده‌تری دارد و پاسخ 429 با زمان انتظار شفاف برمی‌گرداند."));
body.push(para("در F-02، چون پیام کاربر و فهرست کارها بدون دیوارگذاری به پرامپت سیستم می‌پیوست، دستورهایی مثل «همه کارها را حذف کن» می‌توانستند مستقیماً به اجرای اکشن حذف برسند؛ ترکیب تزریق پرامپت (LLM01) و عاملیت افراطی (LLM06). رفع سه لایه دارد: داده‌ها بین برچسب‌های <user_data> با دستور صریح «این داده است نه دستور» قرار گرفتند؛ حذف به حداکثر یک کار در هر پیام محدود و مستلزم فعل صریح حذف در پیام کاربر شد؛ و همه فیلدهای اکشن‌ها پیش از اجرا با گارد نوع، طول و بازه سخت‌گیری می‌شوند. افزون بر این‌ها، مذاکره با مدل در قالب JSON پایدار شد و پاسخ نهایی پیش از ذخیره مهار طول می‌شود."));
body.push(para("در گام شناسایی همچنین سه فرضیه حمله بررسی شد که تأیید نشد: تزریق اسکریپت از مسیر مارک‌داون (react-markdown به‌صورت پیش‌فرض HTML خام را رندر نمی‌کند)، افشای کلید سرویس مدل به کلاینت (SDK فقط در ماژول‌های سمت سرور ایمپورت شده و هیچ متغیر NEXT_PUBLIC حساسی وجود ندارد) و دستکاری مستقیم پایگاه‌داده از طریق کوئری خام (همه پرس‌وجوها با Prisma و پارامتری هستند). ریسک باقی‌مانده اصلی، نبود احراز هویت چندکاربره است که در معماری فعلیِ تک‌کاربرهِ شخصی پذیرفتنی است اما پیش از استقرار عمومی الزامی است؛ در کنار آن توصیه شده محدودساز نرخ به فروشگاه داده مشترک منتقل شود تا در استقرار چندنمونه‌ای هم معتبر بماند."));

// ۸) نتیجه‌گیری
body.push(h1("۸. نتیجه‌گیری و توصیه‌ها"));
body.push(para("مقایسه مستند با ده اپلیکیشن برتر نشان داد آرا پس از این ارتقا از نظر پنج معیار بنیادین — استریم، حافظه، دانش زنده با استناد، کنترل تولید و مدیریت گفتگو — هم‌ردیف الگوهای جهانی قرار می‌گیرد و در دو محورِ «زبان فارسی بومی» و «اکشن‌های وظیفه‌محور واقعی» حتی از بسیاری از رقبا جلوتر است؛ چیزهایی که ChatGPT و Perplexity ندارند و آرا دارد: ثبت، تکمیل، تعویق، تجزیه و برنامه‌ریزی واقعی کار در همان گفتگو با تقویم جلالی. مزیت رقابتی پایدار آرا باید همین مسیر تخصصی‌شدن فارسی‌زبان باشد."));
body.push(para("برای گام بعدی سه توصیه اولویت‌دار پیشنهاد می‌شود: نخست اقدامات زمان‌بندی‌شده به سبک ChatGPT Tasks تا خلاصه صبحگاهی به‌صورت پراکتیو به دست کاربر برسد؛ دوم ورودی چندوجهی (تصویر و فایل) که به گواهی مستندات Gemini و Notion به بالاترین نرخ پذیرش در دستیارهای جدید رسیده است؛ و سوم لایه تأیید انسانی برای زنجیره‌های عاملیت چندمرحله‌ای، در همان بستری که ممیزی امنیتی این گزارش ساخته است. امنیت یک پروژه تمام‌شده نیست؛ کنترل‌های پیاده‌شده باید در هر ارتقای بعدی مجدداً ممیزی شوند."));

// ۹) منابع
body.push(h1("۹. منابع و مستندات"));
const sources = [
  ["OpenAI Help Center — Scheduled Tasks in ChatGPT", "https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt"],
  ["OpenAI Help Center — Memory in ChatGPT", "https://help.openai.com/en/articles/8590148-memory-in-chatgpt"],
  ["Google — Gemini Deep Research Overview", "https://gemini.google/overview/deep-research"],
  ["Google Help — Schedules in Gemini Apps", "https://support.google.com/gemini/answer/16316416"],
  ["Google — Gemini Daily Brief Overview", "https://gemini.google/overview/daily-brief"],
  ["Apple Newsroom — Siri AI Introduction (2026)", "https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant"],
  ["Amazon — Introducing Alexa+", "https://www.aboutamazon.com/news/devices/new-alexa-generative-artificial-intelligence"],
  ["CNBC — Amazon makes Alexa+ available to everyone", "https://www.cnbc.com/2026/02/04/amazon-alexa-plus-us-releas.html"],
  ["Microsoft — Introducing Copilot Memory", "https://techcommunity.microsoft.com/blog/microsoft-copilot-blog/introducing-copilot-memory-a-more-productive-and-personalized-ai-for-the-way-you/4432059"],
  ["Perplexity Help Center — What is Pro Search", "https://www.perplexity.ai/help-center/en/articles/10352903-what-is-pro-search"],
  ["Perplexity — Search Product Page", "https://www.perplexity.ai/hub/products/search"],
  ["Notion — Meet your AI team", "https://www.notion.com/product/ai"],
  ["Todoist Help — Introduction to Todoist Assist", "https://www.todoist.com/help/todoist/todoist-and-ai/introduction-to-todoist-assist-KgPP22q5O"],
  ["Fostera — AI Companion Guide: Memory, Identity, and Control", "https://fostera.ai/companions/ai-companion"],
  ["GetVoIP — The Ultimate Guide To Zoom AI Companion", "https://getvoip.com/blog/zoom-ai-companion-guide"],
  ["OWASP GenAI — LLM01:2025 Prompt Injection", "https://genai.owasp.org/llmrisk/llm01-prompt-injection"],
  ["OWASP GenAI — LLM Top 10 (2025)", "https://genai.owasp.org/llm-top-10/"],
];
sources.forEach(([t, u], i) => {
  body.push(new Paragraph({
    bidirectional: true, numbering: { reference: "list-sources", level: 0 },
    spacing: { line: 312, after: 80 },
    children: [r(t + " — ", { size: 21 }), link(u)],
  }));
});

// ═══════════ سند ═══════════
const footerArabic = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* arabic \\* MERGEFORMAT", "1")] })] });
const footerRoman = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* ROMAN \\* MERGEFORMAT", "i")] })] });
const bodyHeader = new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } }, children: [r("گزارش ارتقای دستیار هوشمند آرا", { size: 16, color: P.secondary })] })] });

const doc = new Document({
  creator: "Ara Assistant",
  title: "گزارش مقایسه و ممیزی امنیتی دستیار آرا",
  styles: {
    default: {
      document: { run: { font: FA, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } },
      heading1: { run: { font: FA, size: 32, bold: true, color: P.primary }, paragraph: { spacing: { before: 380, after: 170 } } },
      heading2: { run: { font: FA, size: 28, bold: true, color: P.primary }, paragraph: { spacing: { before: 260, after: 130 } } },
    },
  },
  numbering: { config: [{ reference: "list-sources", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 640, hanging: 360 } } } }] }] },
  sections: [
    // جلد
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      footers: { default: new Footer({ children: [new Paragraph({ children: [] })] }) },
      children: buildCoverR1({
        englishLabel: "ARA  INTELLIGENCE  REPORT",
        title: "گزارش مقایسه و ممیزی امنیتی دستیار هوشمند آرا",
        subtitle: "مقایسه مستند با ده اپلیکیشن برتر، دوازده ارتقای منوی دستیار و رفع کامل رخنه‌های امنیتی",
        metaLines: ["نسخه: آرا ۳.۰ — چت ۲.۰", "تاریخ: ۲۴ مهر ۱۴۰۵ (۱۶ اکتبر ۲۰۲۶)", "چارچوب مرجع امنیت: OWASP Top 10 برای LLM — نسخه ۲۰۲۵"],
        footerRight: "تهیه‌شده برای تیم محصول آرا",
        footerLeft: "محرمانه — استفاده داخلی",
      }),
    },
    // فهرست
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
      footers: { default: footerRoman },
      children: [
        new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 300, line: 500, lineRule: "atLeast" }, children: [r("فهرست مطالب", { bold: true, size: 36, color: P.primary })] }),
        new TableOfContents("فهرست", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ bidirectional: true, spacing: { before: 220 }, children: [r("برای تازه‌سازی شماره صفحات، روی فهرست راست‌کلیک کرده و گزینه Update Field را انتخاب کنید.", { italics: true, size: 18, color: "8A94A0" })] }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // بدنه
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: bodyHeader },
      footers: { default: footerArabic },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/home/z/my-project/download/گزارش_مقایسه_و_ممیزی_امنیتی_دستیار_آرا.docx";
  fs.writeFileSync(out, buf);
  console.log("OK:", out, buf.length, "bytes");
});
