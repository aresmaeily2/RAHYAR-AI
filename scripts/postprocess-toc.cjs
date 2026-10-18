// ─── پس‌پردازش docx — فرمت فیلد PAGE در پاورقی‌ها + حذف pgNumType خالی ──
// مطابق references/toc.md: WPS فرمت pgNumType را نادیده می‌گیرد؛
// فیلد PAGE باید سوییچ صریح \* ROMAN یا \* arabic داشته باشد.
// تمایز پاورقی‌ها با رنگ نشانگر نامرئی: 5B6B7D=رومی، 5B6B7C=عربی
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const file = process.argv[2];
if (!file) { console.error("usage: node postprocess-toc.cjs file.docx"); process.exit(1); }

const tmp = "/tmp/ara-docx-post";
execSync(`rm -rf ${tmp} && mkdir -p ${tmp} && cd ${tmp} && unzip -q "${file}"`);

// ۱) پاورقی‌ها
const footers = fs.readdirSync(tmp + "/word").filter((f) => /^footer\d+\.xml$/.test(f));
for (const f of footers) {
  const p = path.join(tmp, "word", f);
  let xml = fs.readFileSync(p, "utf8");
  if (!/PAGE/.test(xml)) continue;
  const isRoman = xml.includes("5B6B7D");
  const sw = isRoman ? "ROMAN" : "arabic";
  xml = xml.replace(
    /(<w:instrText[^>]*>)\s*PAGE\s*(<\/w:instrText>)/g,
    `$1 PAGE \\* ${sw} \\* MERGEFORMAT $2`,
  );
  fs.writeFileSync(p, xml);
  console.log(`${f}: PAGE -> \\* ${sw}`);
}

// ۲) حذف pgNumType خالی از document.xml (سکتور کاور)
const docPath = path.join(tmp, "word", "document.xml");
let doc = fs.readFileSync(docPath, "utf8");
const before = doc.length;
doc = doc.replace(/<w:pgNumType\/>/g, "");
fs.writeFileSync(docPath, doc);
console.log(`pgNumType removed: ${before - doc.length} bytes`);

// ۳) بسته‌بندی مجدد
execSync(`cd ${tmp} && rm -f "${file}" && zip -q -r -X "${file}" '[Content_Types].xml' _rels docProps word customXml 2>/dev/null || zip -q -r -X "${file}" .`);
console.log("repacked:", file);
