# Assets

Brand + icon assets. Everything here is GENERATED from master art — do not
hand-edit the outputs, rerun the generators instead.

## Generators (run from mobile/)

- `node scripts/generate-brand-assets.js` — rebuilds every logo/icon asset
  from the master mark `assets/onboarding/el_logo.webp` (gold compass):
  `logo.png`, `logo-base64.js`, `icon.png`, `adaptive-icon.png`,
  `splash-icon.png`, `favicon.png`, `notification-icon.png`, plus the
  `android/res` launcher/splash/notification images in place.
- `node scripts/generate-zodiac-assets.js` — rebuilds
  `zodiac/zodiac-base64.js` (12 base64 medallions consumed app-wide via
  `components/ZodiacIcons.js`) and `admin/public/zodiac/*.png` from the v3
  medallions `assets/onboarding/z3_*.webp`.

## Files

- `icon.png` — app icon source (1024, compass on #0D0B2E)
- `adaptive-icon.png` — Android adaptive foreground (1024, transparent)
- `splash-icon.png` — splash logo (transparent)
- `favicon.png` — web favicon; also sized for the Play Console 512 store icon
- `notification-icon.png` — white-on-alpha status bar icon
- `logo.png` / `logo-inline.js` — in-app logo (all screens)
- `logo-base64.js` — logo for PDF embedding (keep square aspect)
- `zodiac/zodiac-base64.js` — zodiac medallion data URIs (Aries→Pisces)
- `oracle/` — chat gateway tarot cards (cosmic-guide, dream-oracle),
  Diffui-generated in the v3 gilded constellation style
- `onboarding/` — v3 "Gilded Shadow-Box Jianzhi" art set (master source for
  the brand mark + zodiac); prompts in docs/onboarding-art/manifest.md

## Brand

- Deep cosmic purple `#0D0B2E` background, antique gold mark
- Style reference: docs/onboarding-art/manifest.md (v3 style string)
