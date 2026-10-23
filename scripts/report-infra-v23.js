// ─── گزارش تأیید مستقل v2.1.0 — DOCX فارسی RTL (۶ درخواست مالک) ───
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
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
};
const FA = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma", eastAsia: "Tahoma" };
const r = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FA, size: o.size ?? 24, bold: o.bold, color: o.color ?? P.body, italics: o.italics });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: 312, before: o.before ?? 0, after: o.after ?? 140 }, children: Array.isArray(children) ? children : [r(children, o.run || {})], keepNext: o.keepNext });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, spacing: { before: 380, after: 170, line: 380, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 32, color: P.primary })] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 260, after: 130, line: 360, lineRule: "atLeast" }, children: [r(t, { bold: true, size: 28, color: P.primary })] });
const mono = (t) => para([r(t, { size: 18, color: P.secondary })], { align: AlignmentType.START, after: 120 });

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

const SHOTS = "/home/z/my-project/download/final-v21";
function img(file, widthPx = 520) {
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

// ── R1 cover (recipe — همان مولد تأییدشدهٔ قبلی) ──
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

module.exports = { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, HeadingLevel, TableOfContents, SectionType, NumberFormat, Footer, Header, SimpleField, ShadingType, TableLayoutType, ImageRun, VerticalAlign, fs, P, FA, r, para, h1, h2, mono, tbl, img, imgCap, buildCoverR1 };
