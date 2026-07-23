/**
 * Brand asset generator — builds every logo/icon asset from one master mark.
 *
 * Source of truth: assets/onboarding/el_logo.webp (gold compass emblem).
 * Run from mobile/:  node scripts/generate-brand-assets.js
 *
 * Outputs:
 *   assets/logo.png              – in-app logo (all screens via logo-inline.js)
 *   assets/logo-base64.js        – base64 module for PDF embedding (aspect
 *                                  mirrors the previous asset so the PDF
 *                                  emblem crop boxes keep framing correctly)
 *   assets/icon.png              – app icon source (1024, solid bg)
 *   assets/adaptive-icon.png     – Android adaptive foreground source (1024)
 *   assets/splash-icon.png       – splash logo source (transparent)
 *   assets/favicon.png           – web favicon (512, solid bg)
 *   assets/notification-icon.png – white-on-transparent status bar icon (96)
 *   android/app/src/main/res/**  – regenerated in place so local gradle
 *                                  builds pick the new art without a full
 *                                  `expo prebuild` (the android/ dir is CNG,
 *                                  gitignored; EAS regenerates it anyway)
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'onboarding', 'el_logo.webp');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const BG = '#0D0B2E'; // brand deep cosmic purple (matches iconBackground/splashscreen_background)

function resPath(kind, dpi, name) {
  return path.join(RES, `${kind}-${dpi}`, name);
}

async function logoBuffer(size) {
  return sharp(SRC).resize(size, size).png().toBuffer();
}

// Solid-bg square with the mark centered at `scale` of the canvas.
async function onBackground(canvas, scale, background) {
  const markSize = Math.round(canvas * scale);
  const mark = await logoBuffer(markSize);
  const offset = Math.round((canvas - markSize) / 2);
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background } })
    .composite([{ input: mark, top: offset, left: offset }])
    .png()
    .toBuffer();
}

// Transparent square with the mark centered at `scale` of the canvas.
async function onTransparent(canvas, scale) {
  const markSize = Math.round(canvas * scale);
  const mark = await logoBuffer(markSize);
  const offset = Math.round((canvas - markSize) / 2);
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, top: offset, left: offset }])
    .png()
    .toBuffer();
}

async function circleMasked(buf, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
  );
  return sharp(buf).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

// White silhouette derived from the mark's alpha channel (Android renders
// notification icons from alpha only). Alpha is boosted so the fine gold
// linework stays visible at status-bar sizes.
async function whiteAlpha(size, pad) {
  const markSize = Math.round(size * (1 - pad * 2));
  const offset = Math.round((size - markSize) / 2);
  const { data, info } = await sharp(SRC)
    .resize(markSize, markSize)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const a = data[(y * info.width + x) * 4 + 3];
      const boosted = Math.min(255, Math.round(a * 1.5));
      const i = ((y + offset) * size + (x + offset)) * 4;
      out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = boosted;
    }
  }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`master: ${SRC} ${meta.width}x${meta.height} alpha:${meta.hasAlpha}`);

  // ── Previous logo-base64 aspect (PDF emblem boxes crop to 104x56 with
  //    background-size:104px auto — the embedded image's aspect defines what
  //    lands in that box, so mirror whatever shipped before).
  let oldAspect = null;
  const b64Path = path.join(ROOT, 'assets', 'logo-base64.js');
  try {
    const oldModule = fs.readFileSync(b64Path, 'utf8');
    const match = oldModule.match(/'([A-Za-z0-9+/=\s]{100,})'/);
    if (match) {
      const oldMeta = await sharp(Buffer.from(match[1].replace(/\s+/g, ''), 'base64')).metadata();
      oldAspect = oldMeta.width / oldMeta.height;
      console.log(`old logo-base64 image: ${oldMeta.width}x${oldMeta.height} (aspect ${oldAspect.toFixed(2)})`);
    }
  } catch (e) {
    console.log('old logo-base64 unreadable:', e.message);
  }

  // ── assets/ (source-of-truth files read by app code + expo prebuild) ──
  fs.writeFileSync(path.join(ROOT, 'assets', 'logo.png'), await onTransparent(512, 1));
  fs.writeFileSync(path.join(ROOT, 'assets', 'icon.png'), await onBackground(1024, 0.74, BG));
  fs.writeFileSync(path.join(ROOT, 'assets', 'adaptive-icon.png'), await onTransparent(1024, 0.585));
  fs.writeFileSync(path.join(ROOT, 'assets', 'splash-icon.png'), await onTransparent(1024, 0.98));
  fs.writeFileSync(path.join(ROOT, 'assets', 'favicon.png'), await onBackground(512, 0.78, BG));
  fs.writeFileSync(path.join(ROOT, 'assets', 'notification-icon.png'), await whiteAlpha(96, 0.04));

  // ── logo-base64.js (PDF embedding) ──
  let b64Img;
  if (oldAspect && oldAspect > 1.3) {
    // Wide canvas: mark contained at full height, centered horizontally.
    const W = 520; const H = Math.round(520 / oldAspect);
    const mark = await logoBuffer(H);
    b64Img = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: mark, top: 0, left: Math.round((W - H) / 2) }])
      .png({ palette: true, quality: 80, compressionLevel: 9 })
      .toBuffer();
  } else {
    b64Img = await sharp(await onTransparent(512, 1)).png({ palette: true, quality: 80, compressionLevel: 9 }).toBuffer();
  }
  const b64 = b64Img.toString('base64');
  fs.writeFileSync(
    b64Path,
    `var APP_LOGO_BASE64 = '${b64}';\n` +
    `var APP_LOGO_IMAGE = { uri: 'data:image/png;base64,' + APP_LOGO_BASE64 };\n\n` +
    `export { APP_LOGO_BASE64, APP_LOGO_IMAGE };\nexport default APP_LOGO_IMAGE;\n`
  );
  console.log(`logo-base64.js: ${(b64Img.length / 1024).toFixed(1)} KB png embedded`);

  // ── android/res (regenerate in place — CNG dir, safe to overwrite) ──
  if (fs.existsSync(RES)) {
    const launcher = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
    const splash = { mdpi: 200, hdpi: 300, xhdpi: 400, xxhdpi: 600, xxxhdpi: 800 };
    const notification = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };

    for (const [dpi, size] of Object.entries(launcher)) {
      const square = await onBackground(size, 0.74, BG);
      fs.writeFileSync(resPath('mipmap', dpi, 'ic_launcher.webp'), await sharp(square).webp({ quality: 95 }).toBuffer());
      fs.writeFileSync(resPath('mipmap', dpi, 'ic_launcher_round.webp'), await sharp(await circleMasked(square, size)).webp({ quality: 95 }).toBuffer());
    }
    for (const [dpi, size] of Object.entries(foreground)) {
      fs.writeFileSync(resPath('mipmap', dpi, 'ic_launcher_foreground.webp'), await sharp(await onTransparent(size, 0.585)).webp({ quality: 95 }).toBuffer());
    }
    for (const [dpi, size] of Object.entries(splash)) {
      fs.writeFileSync(resPath('drawable', dpi, 'splashscreen_logo.png'), await onTransparent(size, 0.98));
    }
    for (const [dpi, size] of Object.entries(notification)) {
      fs.writeFileSync(resPath('drawable', dpi, 'notification_icon.png'), await whiteAlpha(size, 0.04));
    }
    console.log('android/res regenerated (launcher, round, adaptive foreground, splash, notification)');
  } else {
    console.log('android/res not found — skipped (will be generated by expo prebuild)');
  }

  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
