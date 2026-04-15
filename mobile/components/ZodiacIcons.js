// ═══════════════════════════════════════════════════════════════════════
// ZodiacIcons.js — Fast-loading zodiac sign images
// Original PNGs resized to 128x128 & embedded as base64 data URIs
// ~191KB total (vs ~5.5MB original PNGs) — instant load, zero file I/O
//
// Usage:
//   <Image source={ZODIAC_IMAGES[0]} style={{ width: 32, height: 32 }} />
//   <SvgImage href={ZODIAC_IMAGES[0].uri} ... />   // inside <Svg>
// ═══════════════════════════════════════════════════════════════════════

var ZODIAC_IMAGES = require('../assets/zodiac/zodiac-base64');

// Keyed by Sanskrit rashi name + English name aliases
var ZODIAC_IMAGE_MAP = {
  // Sanskrit names (primary — from engine)
  'Mesha': ZODIAC_IMAGES[0],
  'Vrishabha': ZODIAC_IMAGES[1],
  'Mithuna': ZODIAC_IMAGES[2],
  'Kataka': ZODIAC_IMAGES[3],
  'Simha': ZODIAC_IMAGES[4],
  'Kanya': ZODIAC_IMAGES[5],
  'Tula': ZODIAC_IMAGES[6],
  'Vrischika': ZODIAC_IMAGES[7],
  'Dhanus': ZODIAC_IMAGES[8],
  'Makara': ZODIAC_IMAGES[9],
  'Kumbha': ZODIAC_IMAGES[10],
  'Meena': ZODIAC_IMAGES[11],
  // English name aliases (fallback)
  'Aries': ZODIAC_IMAGES[0],
  'Taurus': ZODIAC_IMAGES[1],
  'Gemini': ZODIAC_IMAGES[2],
  'Cancer': ZODIAC_IMAGES[3],
  'Leo': ZODIAC_IMAGES[4],
  'Virgo': ZODIAC_IMAGES[5],
  'Libra': ZODIAC_IMAGES[6],
  'Scorpio': ZODIAC_IMAGES[7],
  'Sagittarius': ZODIAC_IMAGES[8],
  'Capricorn': ZODIAC_IMAGES[9],
  'Aquarius': ZODIAC_IMAGES[10],
  'Pisces': ZODIAC_IMAGES[11],
};

module.exports = { ZODIAC_IMAGES: ZODIAC_IMAGES, ZODIAC_IMAGE_MAP: ZODIAC_IMAGE_MAP };
