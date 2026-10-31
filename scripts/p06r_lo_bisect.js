// Minimal bisect harness for the landscape-section PDF export failure
const { Document, Packer, Paragraph, TextRun, WidthType, TableLayoutType,
        ShadingType, SectionType, PageOrientation, AlignmentType, BorderStyle,
        Header, Footer, SimpleField, Table, TableRow, TableCell } = require("docx");
const { r, para, P, FA } = require("/home/z/my-project/scripts/corrective-report-lib.js");
const fs = require("fs");

const variant = process.argv[2] || "1"; // 1: landscape+hdr  2: landscape no-hdr  3: no landscape
const withHdr = variant !== "2";
const withLand = variant !== "3";

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const header = () => new Header({ children: [new Paragraph({
  bidirectional: true, alignment: AlignmentType.CENTER,
  border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine } },
  children: [r("تست هدر — رهیار", { size: 18, color: "808080" })] })] });
const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE")] })] });

const mkCell = (t, w, bold = false) => new TableCell({
  children: [para([r(t, { size: 16, bold })], { align: AlignmentType.START, after: 0 })],
  shading: { type: ShadingType.CLEAR, fill: "FFFFFF" },
  margins: { top: 60, bottom: 60, left: 80, right: 80 },
  width: { size: w, type: WidthType.PERCENTAGE },
});
const smallTbl = () => new Table({
  visuallyRightToLeft: true, layout: TableLayoutType.FIXED,
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: { top: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, bottom: { style: BorderStyle.SINGLE, size: 8, color: P.accent }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine }, insideVertical: NB },
  rows: [
    new TableRow({ tableHeader: true, cantSplit: true, children: [mkCell("ستون یک", 50, true), mkCell("ستون دو", 50, true)] }),
    new TableRow({ cantSplit: false, children: [mkCell("مقدار آزمون یک", 50), mkCell("مقدار آزمون دو", 50)] }),
  ],
});

const A4P = { width: 11906, height: 16838 };
const A4L = { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE };
const sections = [
  {
    properties: { page: { size: A4P, margin: { top: 1440, bottom: 1440, left: 1417, right: 1701 } } },
    headers: withHdr ? { default: header() } : undefined,
    footers: withHdr ? { default: footer() } : undefined,
    children: [para("صفحهٔ عمودی آزمون — بخش اول. متن آزمون برای تبدیل PDF.")],
  },
];
if (withLand) sections.push({
  properties: { type: SectionType.NEXT_PAGE, page: { size: A4L, margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
  headers: withHdr ? { default: header() } : undefined,
  footers: withHdr ? { default: footer() } : undefined,
  children: [para("صفحهٔ افقی آزمون — جدول کوچک:"), smallTbl()],
});

const doc = new Document({
  styles: { default: { document: { run: { font: FA, size: 24, color: P.body }, paragraph: { spacing: { line: 312 } } } } },
  sections,
});
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(`/tmp/lo_test_${variant}.docx`, buf);
  console.log("written", `/tmp/lo_test_${variant}.docx`, buf.length, "bytes");
});
