/**
 * Zodiac asset generator — rebuilds the fast-load base64 zodiac module from
 * the v3 gilded medallions (assets/onboarding/z3_*.webp, 560px circular).
 *
 * Run from mobile/:  node scripts/generate-zodiac-assets.js
 *
 * Outputs:
 *   assets/zodiac/zodiac-base64.js   – array of 12 { uri } data-URI entries,
 *                                      Aries→Pisces, consumed app-wide via
 *                                      components/ZodiacIcons.js and embedded
 *                                      into PDFs by utils/pdfReportGenerator.js
 *                                      (shape must stay: CJS default array)
 *   ../admin/public/zodiac/<sign>.png – 512px PNGs for the marketing studio
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

async function main() {
  const entries = [];
  let total = 0;

  for (const sign of SIGNS) {
    const src = path.join(ROOT, 'assets', 'onboarding', `z3_${sign}.webp`);
    const buf = await sharp(src)
      .resize(128, 128)
      .png({ palette: true, quality: 75, compressionLevel: 9 })
      .toBuffer();
    total += buf.length;
    entries.push(`  { uri: 'data:image/png;base64,${buf.toString('base64')}' }`);
    console.log(`${sign.padEnd(12)} ${(buf.length / 1024).toFixed(1)} KB`);
  }

  const header =
    '// ═══════════════════════════════════════════════════════════════════════\n' +
    '// zodiac-base64.js — Fast-loading zodiac medallions (GENERATED FILE)\n' +
    '// v3 gilded medallions (assets/onboarding/z3_*.webp) resized to 128x128\n' +
    '// and embedded as base64 PNG data URIs — instant load, zero file I/O,\n' +
    '// and .uri works inside react-native-svg <Image href> and PDF HTML.\n' +
    '// Regenerate with: node scripts/generate-zodiac-assets.js\n' +
    '// Order: Aries → Pisces (index 0-11), mapped in components/ZodiacIcons.js\n' +
    '// ═══════════════════════════════════════════════════════════════════════\n\n';

  fs.writeFileSync(
    path.join(ROOT, 'assets', 'zodiac', 'zodiac-base64.js'),
    header + 'var ZODIAC_IMAGES = [\n' + entries.join(',\n') + ',\n];\n\nmodule.exports = ZODIAC_IMAGES;\n'
  );
  console.log(`zodiac-base64.js total embedded: ${(total / 1024).toFixed(0)} KB`);

  // Marketing studio sign art (admin/public/zodiac/<sign>.png, 512px)
  const adminZodiac = path.join(ROOT, '..', 'admin', 'public', 'zodiac');
  if (fs.existsSync(adminZodiac)) {
    for (const sign of SIGNS) {
      const src = path.join(ROOT, 'assets', 'onboarding', `z3_${sign}.webp`);
      await sharp(src).resize(512, 512).png().toFile(path.join(adminZodiac, `${sign}.png`));
    }
    console.log('admin/public/zodiac/*.png regenerated (512px)');
  }

  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
