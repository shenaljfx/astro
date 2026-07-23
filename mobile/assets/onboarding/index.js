/**
 * Onboarding art — v3 "Gilded Shadow-Box Jianzhi" (Diffui, build a520d3eb, July 2026).
 * One unified style: layered Chinese paper-cut shadow-box with real depth, antique
 * gold lattice, and teal/magenta jewel backlight glowing through the cuts — a Vedic
 * digital shrine. bg3_* are full-frame act backdrops; el3_/hero_/cloud3_/fg3_ are
 * transparent cutouts; z3_/c3_ are circular medallions. Prompts in
 * docs/onboarding-art/manifest.md. Brand logo (el_logo) is the website emblem, kept.
 */

// Three act backdrops + the floating mystic scene layers.
export const SCENE_MYSTIC = {
  bg: require('./bg3_story.webp'),       // Act I — the shrine sky (language→story)
  bgInput: require('./bg3_input.webp'),  // Act II — the arch (date→casting)
  bgReveal: require('./bg3_reveal.webp'),// Act III — the zodiac ring (identity→complete)
  // Every page gets its own dedicated shadow-box backdrop.
  bgDate: require('./bg3_date.webp'),         // the turning year (sun + crescent ring)
  bgLanguage: require('./bg3_language.webp'), // the temple gateway of welcome
  bgName: require('./bg3_name.webp'),         // the blank leaf + stylus
  bgTime: require('./bg3_time.webp'),         // the golden sundial
  bgPlace: require('./bg3_place.webp'),       // the latticed globe + island
  bgCasting: require('./bg3_casting.webp'),   // the wheel mid-formation
  bgChart: require('./bg3_chart.webp'),       // the birth-chart grid
  bgFuture: require('./bg3_future.webp'),     // the receding lit doorways
  bgSignin: require('./bg3_signin.webp'),     // the open vault gateway
  bgComplete: require('./bg3_complete.webp'), // the lotus blessing seal
  mystic: require('./hero_mystic.webp'),
  moon: require('./hero_moon.webp'),
  cloudA: require('./cloud3_a.webp'),
  cloudB: require('./cloud3_b.webp'),
};

// Named cutout elements used across chapters.
export const ELEMENTS = {
  logo: require('./el_logo.webp'),          // website brand emblem
  wheel: require('./el3_wheel.webp'),       // language halo
  seal: require('./el3_seal.webp'),         // completion mandala
  orb: require('./el3_planet_gold.webp'),   // casting focus
};

// Per-story-beat focal elements matching each beat's words.
export const BEAT_ART = {
  planetGold: require('./el3_planet_gold.webp'),
  planetTeal: require('./el3_planet_teal.webp'),
  books: require('./el3_books.webp'),
  leaf: require('./el3_leaf.webp'),
};

// Aries → Pisces, in the index order AwesomeRashiChakra expects.
export const ZODIAC_ORDERED = [
  require('./z3_aries.webp'), require('./z3_taurus.webp'), require('./z3_gemini.webp'),
  require('./z3_cancer.webp'), require('./z3_leo.webp'), require('./z3_virgo.webp'),
  require('./z3_libra.webp'), require('./z3_scorpio.webp'), require('./z3_sagittarius.webp'),
  require('./z3_capricorn.webp'), require('./z3_aquarius.webp'), require('./z3_pisces.webp'),
];

export const COSMOS_ZODIAC = {
  Aries: require('./z3_aries.webp'),
  Taurus: require('./z3_taurus.webp'),
  Gemini: require('./z3_gemini.webp'),
  Cancer: require('./z3_cancer.webp'),
  Leo: require('./z3_leo.webp'),
  Virgo: require('./z3_virgo.webp'),
  Libra: require('./z3_libra.webp'),
  Scorpio: require('./z3_scorpio.webp'),
  Sagittarius: require('./z3_sagittarius.webp'),
  Capricorn: require('./z3_capricorn.webp'),
  Aquarius: require('./z3_aquarius.webp'),
  Pisces: require('./z3_pisces.webp'),
};

// Circular domain emblems, keyed by DOMAIN_CARDS id (server onboardingReveal.js).
export const DOMAIN_CARD_ART = {
  fortune: require('./c3_fortune.webp'),
  love: require('./c3_love.webp'),
  business: require('./c3_business.webp'),
  career: require('./c3_career.webp'),
  peace: require('./c3_peace.webp'),
  energy: require('./c3_energy.webp'),
  karma: require('./c3_karma.webp'),
  rise: require('./c3_rise.webp'),
  insight: require('./c3_insight.webp'),
  timeline: require('./c3_timeline.webp'),
};
