// ─── مولد DOCX گزارش تأیید مستقل v2.1.0 ───
const infra = require("./report-infra-v23.js");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, TableOfContents,
  SectionType, NumberFormat, Footer, Header, SimpleField,
  fs, P, FA, r, buildCoverR1,
} = infra;

const body = [];
require("./report-body-v23.js")(body, { ...infra });

const footerArabic = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* arabic \\* MERGEFORMAT", "1")] })] });
const footerRoman = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new SimpleField("PAGE \\* ROMAN \\* MERGEFORMAT", "i")] })] });
const bodyHeader = new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.START, border: { bottom: { style: "single", size: 2, color: P.table.innerLine, space: 4 } }, children: [r("گزارش تأیید مستقل رهیار v2.1.0 — نامزد انتشار نیازمند تأیید نهایی", { size: 16, color: P.secondary })] })] });

const doc = new Document({
  creator: "RahyAr",
  title: "گزارش تأیید مستقل رهیار v2.1.0 — تطبیق مصنوعات، امضا، مدل و Agent، صوتی، تصاویر و جدول سه‌وضعیتی",
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
        englishLabel: "RAHYAR  INDEPENDENT  VERIFICATION  REPORT",
        title: "گزارش تأیید مستقل رهیار v2.1.0",
        subtitle: "تطبیق نسخه‌ها و مصنوعات، امضای اندروید، اثبات مدل و Agent، دستیار صوتی، شواهد بصری و جدول سه‌وضعیتی",
        metaLines: [
          "وضعیت نسخه: نامزد انتشار نیازمند تأیید نهایی",
          "HEAD شاخهٔ main: 8cb0ad4 (push و راستی‌آزمایی سمت سرور امروز)",
          "کامیت تحویل قبلی: bea9779 — کد اندروید APKها: e06e2bd",
          "روش: دانلود مجدد ۱۴ مصنوع، بازسازی سورس، اجرای تازهٔ مدل و ابزارها",
        ],
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
  const out = "/home/z/my-project/download/final-v23/pkgs/RahyAr-Verification-Report.docx";
  fs.writeFileSync(out, buf);
  console.log("OK:", out, buf.length, "bytes");
});
