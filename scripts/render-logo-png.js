// رندر PNG شفاف 1024×1024 از واریانت‌های SVG لوگوی رهیار (sharp — librsvg)
const sharp = require('/home/z/my-project/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const SRC = '/home/z/my-project/brand/svg';
const OUT = '/home/z/my-project/brand/png';

const variants = [
  'rahyar-mark-solid',
  'rahyar-badge-ring',
  'rahyar-mark-mono',
  'rahyar-mark-mono-inverse',
  'rahyar-wordmark',
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const v of variants) {
    const svg = fs.readFileSync(path.join(SRC, v + '.svg'));
    // 1024×1024 شفاف — viewBox با width/height 1024 تعریف شده است
    const out = path.join(OUT, v + '-1024.png');
    await sharp(svg, { density: 300 }).resize(1024, v === 'rahyar-wordmark' ? 342 : 1024, {
      fit: 'fill',
    }).png().toFile(out);
    const m = await sharp(out).metadata();
    console.log('OK', out, m.width + 'x' + m.height, m.hasAlpha ? 'alpha' : 'NO-ALPHA');
  }
  // نسخهٔ کوچک آزمایش خوانایی (48 و 24 پیکسل) برای نشان اصلی
  for (const size of [48, 24]) {
    const svg = fs.readFileSync(path.join(SRC, 'rahyar-mark-solid.svg'));
    await sharp(svg, { density: 300 }).resize(size, size).png()
      .toFile(path.join(OUT, `rahyar-mark-solid-${size}.png`));
    console.log('OK small', size);
  }
})();
