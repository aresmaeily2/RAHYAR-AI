// ─── گزارش تحویل مأموریت موشن‌گرافیک و ارتقای بصری رهیار — DOCX فارسی RTL ───
// الگو: recipes تأییدشده مهارت docx (جلد R1-RTL، فهرست رومی، بدنه Arabic)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, WidthType, BorderStyle,
  ShadingType, TableOfContents, PageBreak, SectionType, NumberFormat,
  SimpleField, ImageRun, TableLayoutType,
} = require("docx");
const fs = require("fs");
const { imageSize: sizeOf } = require("image-size");

// ── پالت — هماهنگ با هویت رهیار (تیل اقیانوسی) ──
const P = {
  bg: "0A1B20", accent: "2A9D8F", primary: "0F2733", body: "1B2B33", secondary: "5B6B72",
  cover: { titleColor: "FFFFFF", subtitleColor: "B4BEC2", metaColor: "93A0A4", footerColor: "6B7A7E" },
  table: { headerBg: "2A9D8F", headerText: "FFFFFF", innerLine: "C2D4D0", surface: "EAF2F0" },
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };

// ── هلپرها ──
const r = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FA, size: o.size ?? 24, bold: o.bold, color: o.color ?? P.body, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: 312, before: o.before ?? 0, after: o.after ?? 140 }, children: Array.isArray(children) ? children : [r(children, o.run || {})], keepNext: o.keepNext });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, spacing: { before: 380, after: 170, line: 380, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 32, color: P.primary })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 260, after: 130, line: 360, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 28, color: P.primary })] });

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

// تصویر شواهد — نسبت ابعاد حفظ می‌شود (image-size)
const SHOTS = "/home/z/my-project/download/motion-mission-screenshots";
function img(file, widthPx = 540) {
  const p = `${SHOTS}/${file}`;
  const buf = fs.readFileSync(p);
  const dim = sizeOf(new Uint8Array(buf));
  const h = Math.round((dim.height / dim.width) * widthPx);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: widthPx, height: h } })],
  });
}
const imgCap = (t) => para([r(t, { size: 18, color: P.secondary })], { align: AlignmentType.CENTER, after: 200 });

// ── چیدمان عنوان جلد ──
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

module.exports = { Document, Packer, Paragraph, TextRun, TableOfContents, PageBreak, SectionType, NumberFormat, AlignmentType, BorderStyle, Header, Footer, SimpleField, r, para, h1, h2, tbl, cap, img, imgCap, P, FA, buildCoverR1 };
