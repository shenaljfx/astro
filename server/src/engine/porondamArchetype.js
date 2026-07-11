/**
 * Porondam Relationship Archetype Engine
 * ======================================
 *
 * Turns a compatibility reading into a culturally-rooted, dual-native
 * RELATIONSHIP ARCHETYPE — a warm couple-character — instead of a pass/fail
 * score. No pairing is ever "bad": every match is a character with real gifts
 * and honest growth edges.
 *
 * Design (agreed 2026-07):
 *  - Reframe, never hide: the archetype is the lens; genuine doshas/vetoes
 *    still surface, weighted to real severity (gravity-tiered).
 *  - Layered derivation: sign-relationship × elemental tone anchors the
 *    archetype NAME (works from lagna/moon signs alone, so the 12-lagna
 *    explorer and the full two-person result share one vocabulary). The
 *    two-person reading then enriches it with the actual porondam factors.
 *  - Guidance, not rituals: forward paths are understanding + auspicious
 *    wedding timing + play-to-strengths; a serious veto respectfully defers
 *    to "consult an experienced astrologer" (never a prescribed ritual).
 *  - The traditional X/20 count survives but demoted (always-gold), never the
 *    headline.
 *
 * Voice (rewritten 2026-07-10): SIMPLE, warm, everyday language. Short
 * sentences. Sinhala stays in the respectful ඔබ register but reads like a
 * kind friend talking, never a textbook. Every line should be instantly
 * clear to someone with zero astrology knowledge.
 * Pure & deterministic — no AI, no I/O. Safe to call anywhere.
 */

'use strict';

// rashiId (1-12) → element
const ELEMENT = {
  1: 'fire', 5: 'fire', 9: 'fire',
  2: 'earth', 6: 'earth', 10: 'earth',
  3: 'air', 7: 'air', 11: 'air',
  4: 'water', 8: 'water', 12: 'water',
};

// The four reframed bands (order preserves the honest "who suits me best"
// signal; the labels kill the doom).
const BANDS = {
  harmony:  { rank: 4, en: 'Natural Harmony',   si: 'ස්වාභාවික ගැළපීම' },
  magnetic: { rank: 3, en: 'Strong Attraction', si: 'ප්‍රබල ආකර්ෂණය' },
  balanced: { rank: 2, en: 'Balanced Bond',     si: 'සමබර බැඳීම' },
  growth:   { rank: 1, en: 'Grows with Effort', si: 'උත්සාහයෙන් වැඩෙන' },
};

// The ~14 culturally-rooted, dual-native archetypes. Names stay evocative;
// essences are one SIMPLE sentence anyone understands on first read.
const ARCHETYPES = {
  blessed_harmony: {
    band: 'harmony', emblem: 'sunny-outline',
    en: { name: 'Blessed Harmony', essence: 'You naturally understand each other — trust comes easily, and life feels lighter together.' },
    si: { name: 'සුබ සංහිඳියාව', essence: 'ඔබ දෙදෙනා ඉබේම එකිනෙකා තේරුම් ගන්නවා — විශ්වාසය පහසුවෙන් ගොඩනැගෙනවා, ජීවිතය එකට සැහැල්ලුයි.' },
  },
  still_waters: {
    band: 'harmony', emblem: 'water-outline',
    en: { name: 'Still Waters Run Deep', essence: 'A quiet, deep bond — not many words needed, feelings are simply understood.' },
    si: { name: 'ගැඹුරු නිසල දිය', essence: 'නිහඬ, ගැඹුරු බැඳීමක් — වචන ගොඩක් ඕනෑ නැහැ, හැඟීම් ඉබේම තේරෙනවා.' },
  },
  mirror_souls: {
    band: 'harmony', emblem: 'contrast-outline',
    en: { name: 'Mirror Souls', essence: 'You are alike in many ways — deep understanding, plus a shared duty to fix the same weak spots together.' },
    si: { name: 'එකම පිළිබිඹුව', essence: 'ඔබ දෙදෙනා බොහෝ දුරට සමානයි — ගැඹුරු අවබෝධයක් තිබෙනවා; එකම අඩුපාඩුත් දෙදෙනා එකට හදාගත යුතුයි.' },
  },
  two_lamps: {
    band: 'harmony', emblem: 'flame-outline',
    en: { name: 'Two Lamps, One Flame', essence: 'Two steady people making one warm home — comfort, loyalty and a feeling of safety.' },
    si: { name: 'එක් සිළුවක ලාම්පු දෙකක්', essence: 'ස්ථාවර දෙදෙනෙක් එක උණුසුම් නිවසක් හදනවා — සැනසීම, පක්ෂපාත බව සහ ආරක්ෂිත බව.' },
  },
  foundation_builders: {
    band: 'magnetic', emblem: 'home-outline',
    en: { name: 'Foundation Builders', essence: 'A strong, steady pull — together you build things that last.' },
    si: { name: 'අත්තිවාරම් හදන්නෝ', essence: 'ශක්තිමත්, ස්ථාවර ඇදීමක් — එකට ඔබ කල් පවතින දේවල් ගොඩනඟනවා.' },
  },
  magnetic_poles: {
    band: 'magnetic', emblem: 'magnet-outline',
    en: { name: 'Magnetic Poles', essence: 'You are quite different, yet strongly drawn to each other — a spark worth looking after.' },
    si: { name: 'චුම්භක ධ්‍රැව', essence: 'දෙදෙනා තරමක් වෙනස්, ඒත් ප්‍රබලව එකිනෙකාට ඇදෙනවා — රැකගත යුතු ගිනිපුපුරක්.' },
  },
  two_halves: {
    band: 'magnetic', emblem: 'sync-outline',
    en: { name: 'Two Halves, One Whole', essence: 'Natural opposites who complete each other — where one is soft, the other is strong.' },
    si: { name: 'අඩ දෙකක්, එක මුළුවක්', essence: 'එකිනෙකා සම්පූර්ණ කරන ප්‍රතිවිරුද්ධ දෙදෙනෙක් — එක් අයෙක් මෘදු තැන අනෙකා ශක්තිමත්.' },
  },
  anchor_and_tide: {
    band: 'magnetic', emblem: 'boat-outline',
    en: { name: 'Anchor and Tide', essence: 'One of you steadies, the other brings movement — together you get both calm and life.' },
    si: { name: 'නැංගුරමයි රළයි', essence: 'එක් අයෙක් ස්ථාවර කරනවා, අනෙකා ජීවය ගේනවා — එකට සිටින විට දෙකම ලැබෙනවා.' },
  },
  companions_allies: {
    band: 'balanced', emblem: 'people-outline',
    en: { name: 'Companions & Allies', essence: 'Best friends first — you cheer each other on and win as a team.' },
    si: { name: 'මිතුරු සගයෝ', essence: 'මුලින්ම හොඳම මිතුරෝ — එකිනෙකාව දිරිමත් කරමින් කණ්ඩායමක් ලෙස දිනනවා.' },
  },
  two_paths_meeting: {
    band: 'balanced', emblem: 'git-merge-outline',
    en: { name: 'Two Paths, One Meeting', essence: 'Two independent journeys that make each other richer — space plus shared goals keep it strong.' },
    si: { name: 'පාරවල් දෙකක එක් හමුවක්', essence: 'ස්වාධීන ගමන් දෙකක් එකිනෙකා පොහොසත් කරනවා — ඉඩ සහ පොදු අරමුණු බැඳීම රැකගන්නවා.' },
  },
  giving_bond: {
    band: 'balanced', emblem: 'gift-outline',
    en: { name: 'The Giving Bond', essence: 'A bond of quiet giving and receiving — devotion that deepens with time.' },
    si: { name: 'දෙන-ලබන බැම්ම', essence: 'නිහඬව දෙන-ලබන බැඳීමක් — කාලයත් සමඟ කැපවීම ගැඹුරු වෙනවා.' },
  },
  river_to_sea: {
    band: 'balanced', emblem: 'trail-sign-outline',
    en: { name: 'River Meeting the Sea', essence: 'Different natures flowing toward the same future — you complete each other’s journey.' },
    si: { name: 'ගඟ මුහුද හමුවීම', essence: 'වෙනස් ස්වභාව දෙකක් එකම අනාගතයක් කරා ගලනවා — එකිනෙකාගේ ගමන සම්පූර්ණ කරනවා.' },
  },
  sacred_forge: {
    band: 'growth', emblem: 'hammer-outline',
    en: { name: 'The Sacred Forge', essence: 'An intense bond that changes you both — it grows well when you stay honest and aware.' },
    si: { name: 'පූජනීය කම්මල', essence: 'දෙදෙනාම වෙනස් කරන තීව්‍ර බැඳීමක් — අවංකව, දැනුවත්ව සිටින විට හොඳින් වැඩෙනවා.' },
  },
  karmic_depths: {
    band: 'growth', emblem: 'planet-outline',
    en: { name: 'Karmic Depths', essence: 'A deep pull that feels fated — its depth is the gift, and patient effort is the price.' },
    si: { name: 'කර්ම ගැඹුර', essence: 'පෙර බැඳීමක් වගේ දැනෙන ගැඹුරු ඇදීමක් — ගැඹුර තෑග්ගයි, ඉවසිලිවන්ත උත්සාහය එහි මිලයි.' },
  },
};

/**
 * Relationship class from the sign gap (0-11).
 */
function relationshipClass(diff) {
  if (diff === 0) return 'same';
  if (diff === 4 || diff === 8) return 'trine';       // 5/9 — same element
  if (diff === 3 || diff === 9) return 'kendra';      // 4/10 — square
  if (diff === 6) return 'seventh';                    // opposition
  if (diff === 2 || diff === 10) return 'eleventh';   // 3/11 — friends
  if (diff === 1 || diff === 11) return 'twelfth';    // 2/12
  return 'shadashtaka';                                // 5/7 — 6/8
}

/**
 * Elemental tone of the pair: 'warm' (fire/air), 'deep' (water present),
 * 'grounded' (earth without water). Gives archetype variety within a class.
 */
function pairTone(a, b) {
  const ea = ELEMENT[a], eb = ELEMENT[b];
  if (ea === 'water' || eb === 'water') return 'deep';
  if (ea === 'earth' || eb === 'earth') return 'grounded';
  return 'warm'; // both fire/air
}

// (relationshipClass, tone) → archetype id. Every cell resolves; a class
// default guards any gap.
const SELECT = {
  same:        { warm: 'mirror_souls',        grounded: 'two_lamps',           deep: 'mirror_souls',        _: 'mirror_souls' },
  trine:       { warm: 'blessed_harmony',     grounded: 'blessed_harmony',     deep: 'still_waters',        _: 'blessed_harmony' },
  kendra:      { warm: 'foundation_builders', grounded: 'foundation_builders', deep: 'magnetic_poles',      _: 'foundation_builders' },
  seventh:     { warm: 'two_halves',          grounded: 'anchor_and_tide',     deep: 'anchor_and_tide',     _: 'two_halves' },
  eleventh:    { warm: 'companions_allies',   grounded: 'two_paths_meeting',   deep: 'two_paths_meeting',   _: 'companions_allies' },
  twelfth:     { warm: 'giving_bond',         grounded: 'giving_bond',         deep: 'river_to_sea',        _: 'giving_bond' },
  shadashtaka: { warm: 'sacred_forge',        grounded: 'sacred_forge',        deep: 'karmic_depths',       _: 'karmic_depths' },
};

/**
 * Derive the archetype for a pair of signs (lagna or moon rashi).
 * Works from signs alone — the shared vocabulary for BOTH surfaces.
 * Same-sign pairs (a === b) are fully supported and resolve to the
 * mirror archetypes.
 *
 * @param {number} aRashiId - first sign 1-12 ("your" sign in the explorer)
 * @param {number} bRashiId - second sign 1-12
 * @param {string} [lang='en']
 * @returns {{ id, band, bandRank, bandLabel, name, essence, emblem }}
 */
function deriveArchetype(aRashiId, bRashiId, lang = 'en') {
  const L = lang === 'si' ? 'si' : 'en';
  const diff = (((bRashiId - aRashiId) % 12) + 12) % 12;
  const cls = relationshipClass(diff);
  const tone = pairTone(aRashiId, bRashiId);
  const id = (SELECT[cls] && (SELECT[cls][tone] || SELECT[cls]._)) || 'companions_allies';
  const arc = ARCHETYPES[id];
  const band = BANDS[arc.band];
  return {
    id,
    band: arc.band,
    bandRank: band.rank,
    bandLabel: band[L],
    name: arc[L].name,
    essence: arc[L].essence,
    emblem: arc.emblem,
  };
}

/**
 * Build the 12-lagna explorer, grouped into the four reframed bands.
 * Includes the user's OWN sign (same-lagna marriage) flagged `isSame`.
 * @param {number} myRashiId 1-12
 * @param {string} [lang='en']
 */
function buildLagnaExplorer(myRashiId, lang = 'en') {
  const L = lang === 'si' ? 'si' : 'en';
  const order = ['harmony', 'magnetic', 'balanced', 'growth'];
  const bandGroups = {};
  for (const key of order) bandGroups[key] = { key, label: BANDS[key][L], rank: BANDS[key].rank, items: [] };

  for (let i = 1; i <= 12; i++) {
    const arc = deriveArchetype(myRashiId, i, L);
    bandGroups[arc.band].items.push({
      rashiId: i,
      archetypeId: arc.id,
      name: arc.name,
      essence: arc.essence,
      emblem: arc.emblem,
      isSame: i === myRashiId,
    });
  }
  return order.map((k) => bandGroups[k]).filter((g) => g.items.length > 0);
}

// ── Per-factor framing — gift (strong) vs nurture (weak), dual-native ────────
// Maps each porondam factor to a life-area with a simple gift line and a
// simple growth-edge line. Nadi/Rajju/Vedha carry the serious weight;
// others are gentle. Every line must read instantly, no dictionary needed.
const FACTOR_FRAME = {
  Nadi: {
    area: { en: 'Family Health', si: 'පවුලේ සෞඛ්‍යය' },
    gift: { en: 'The health signs line up well — a very good sign for healthy children and a healthy family.', si: 'සෞඛ්‍ය ලකුණු හොඳින් ගැළපෙනවා — නිරෝගී දරුවන්ට සහ නිරෝගී පවුලකට ඉතා හොඳ ලකුණක්.' },
    nurture: { en: 'This is the health signal tradition weighs most heavily. Show both horoscopes to an experienced astrologer for the full picture.', si: 'සම්ප්‍රදායේ වැඩිම බර දෙන සෞඛ්‍ය ලකුණ මෙයයි. සම්පූර්ණ චිත්‍රය දැනගන්න කේන්දර දෙකම පළපුරුදු ජ්‍යෝතිෂවේදියෙකුට පෙන්වන්න.' },
    serious: true,
  },
  Rajju: {
    area: { en: 'Longevity of the Marriage', si: 'විවාහයේ දිගු පැවැත්ම' },
    gift: { en: 'Your rajju groups differ — tradition’s strongest sign of a long, steady marriage.', si: 'දෙදෙනාගේ රජ්ජු කාණ්ඩ වෙනස් — දිගු, ස්ථාවර විවාහයකට ඇති ප්‍රබලම හොඳ ලකුණ.' },
    nurture: { en: 'A serious traditional consideration about the marriage’s long life.', si: 'විවාහයේ දිගු පැවැත්ම ගැන බැරෑරුම් සම්ප්‍රදායික කරුණක්.' },
    serious: true,
  },
  Vedha: {
    area: { en: 'Clear Path', si: 'බාධා නැති මග' },
    gift: { en: 'No blocking between your birth stars — the road ahead is clear.', si: 'දෙදෙනාගේ නැකැත් අතර බාධාවක් නැහැ — ඉදිරි මග පැහැදිලියි.' },
    nurture: { en: 'A serious point — the birth stars pull against each other here.', si: 'බැරෑරුම් කරුණක් — උපන් නැකැත් මෙහිදී එකිනෙකාට විරුද්ධව අදිනවා.' },
    serious: true,
  },
  Gana: {
    area: { en: 'Temperament', si: 'ස්වභාවය' },
    gift: { en: 'Your temperaments match — everyday life together feels easy.', si: 'දෙදෙනාගේ ස්වභාවය ගැළපෙනවා — එකට ගෙවන දවස පහසුයි.' },
    nurture: { en: 'You move at different inner speeds. A little patience with each other’s pace goes a long way.', si: 'ඔබ දෙදෙනා ඇතුළතින් යන වේගය වෙනස්. එකිනෙකාගේ වේගයට ටිකක් ඉවසීමෙන් ඉඩ දුන්නොත් බොහෝ දුර යා හැකියි.' },
  },
  Yoni: {
    area: { en: 'Closeness', si: 'සමීපකම' },
    gift: { en: 'A natural physical and emotional closeness.', si: 'ස්වාභාවික ශාරීරික හා හිතේ සමීපකමක් තිබෙනවා.' },
    nurture: { en: 'Closeness grows with gentle, unhurried understanding.', si: 'හදිසි නොවී, මෘදුව තේරුම් ගැනීමෙන් සමීපකම වැඩෙනවා.' },
  },
  Rashi: {
    area: { en: 'Emotional Understanding', si: 'හැඟීම් තේරුම් ගැනීම' },
    gift: { en: 'Your minds settle into the same emotional key easily.', si: 'දෙදෙනාගේ සිත් පහසුවෙන් එකම හැඟීම් තලයට එනවා.' },
    nurture: { en: 'You feel things differently — saying feelings out loud early keeps you close.', si: 'හැඟීම් විඳින විදිය වෙනස් — දැනෙන දේ කලින්ම කතා කළොත් සමීපකම රැකෙනවා.' },
  },
  Vasya: {
    area: { en: 'Mutual Draw', si: 'එකිනෙකාට ඇදීම' },
    gift: { en: 'A willing, magnetic pull toward each other.', si: 'කැමැත්තෙන්ම එකිනෙකාට ඇදෙන බැඳීමක් තිබෙනවා.' },
    nurture: { en: 'Influence flows unevenly — sharing the lead keeps it balanced.', si: 'බලපෑම එක පැත්තකට බරයි — මූලිකත්වය මාරුවෙන් බෙදාගත්තොත් සමබර වෙනවා.' },
  },
  Dina: {
    area: { en: 'Wellbeing', si: 'දවසේ සුවය' },
    gift: { en: 'Daily wellbeing and good fortune favour this union.', si: 'එදිනෙදා සුවය සහ වාසනාව මේ එක්වීමට හිතකරයි.' },
    nurture: { en: 'Daily rhythms need conscious care — routines that suit you both help a lot.', si: 'දවසේ රටාවලට සැලකිල්ල ඕනෑ — දෙදෙනාටම ගැළපෙන පුරුදු හදාගත්තොත් ලොකු උදව්වක්.' },
  },
  Mahendra: {
    area: { en: 'Prosperity & Children', si: 'දියුණුව සහ දරු භාග්‍යය' },
    gift: { en: 'Good signs for prosperity and the blessing of healthy children.', si: 'දියුණුවටත්, නිරෝගී දරු භාග්‍යයටත් හොඳ ලකුණු තිබෙනවා.' },
    nurture: { en: 'Shared prosperity rewards steady, patient effort.', si: 'එකට දියුණු වීමට ස්ථිර, ඉවසිලිවන්ත උත්සාහය අවශ්‍යයි.' },
  },
};

const FORWARD_PATHS = {
  timing: {
    en: 'Pick an auspicious wedding time — a good start helps every match.',
    si: 'සුබ මුහුර්තයකින් විවාහය අරඹන්න — හොඳ ආරම්භයක් හැම ගැළපීමකටම උදව්වක්.',
  },
  strengths: {
    en: 'Lean on what is already strong between you — that is where the bond grows best.',
    si: 'ඔබ දෙදෙනා අතර දැනටමත් හොඳින් තිබෙන දේ මත රැඳෙන්න — බැඳීම හොඳින්ම වැඩෙන්නේ එතැනයි.',
  },
  astrologer: {
    en: 'For a serious traditional flag, families customarily consult an experienced astrologer about how to honour it.',
    si: 'බැරෑරුම් සම්ප්‍රදායික ලකුණක් ගැන, එය සලකන ආකාරය පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් විමසීම පවුල්වල සිරිතයි.',
  },
  understanding: {
    en: 'Talk about the tender areas together, early — awareness turns friction into closeness.',
    si: 'බලාගත යුතු තැන් ගැන කලින්ම එකට කතා කරගන්න — දැනුවත්කම ගැටුම සමීපකමට හරවනවා.',
  },
};

/**
 * Build the full two-person couple reading: archetype + celebrated gifts +
 * gravity-tiered growth edges + forward paths + the demoted traditional count.
 *
 * @param {object} porondamResult - output of calculatePorondam / calculateAdvancedPorondam
 * @param {number} brideRashiId
 * @param {number} groomRashiId
 * @param {string} [lang='en']
 * @param {object} [extras] - { weddingWindow?: {start,end} } for the timing path
 */
function buildCoupleReading(porondamResult, brideRashiId, groomRashiId, lang = 'en', extras = {}) {
  const L = lang === 'si' ? 'si' : 'en';
  const archetype = deriveArchetype(brideRashiId, groomRashiId, L);

  const factors = Array.isArray(porondamResult?.factors) ? porondamResult.factors : [];
  const gifts = [];
  const nurture = [];

  for (const f of factors) {
    const frame = FACTOR_FRAME[f.name];
    if (!frame) continue;
    const ratio = f.maxScore > 0 ? f.score / f.maxScore : 0.5;
    const isVetoDosha = f.isDosha === true; // Rajju/Vedha/uncancelled Nadi carry isDosha
    if (!isVetoDosha && ratio >= 0.6) {
      gifts.push({ area: frame.area[L], text: frame.gift[L] });
    } else if (isVetoDosha || ratio < 0.5) {
      const severity = (frame.serious && (isVetoDosha || ratio < 0.25)) ? 'significant' : 'gentle';
      nurture.push({
        area: frame.area[L],
        text: frame.nurture[L],
        severity,
        path: severity === 'significant' ? FORWARD_PATHS.astrologer[L] : FORWARD_PATHS.understanding[L],
      });
    }
  }

  // Gravity order: significant first.
  nurture.sort((a, b) => (a.severity === 'significant' ? -1 : 0) - (b.severity === 'significant' ? -1 : 0));

  const hasSignificant = nurture.some((n) => n.severity === 'significant');

  const forwardPaths = [];
  if (extras.weddingWindow && extras.weddingWindow.start) {
    forwardPaths.push({ kind: 'timing', text: FORWARD_PATHS.timing[L], window: extras.weddingWindow });
  } else {
    forwardPaths.push({ kind: 'timing', text: FORWARD_PATHS.timing[L] });
  }
  forwardPaths.push({ kind: 'strengths', text: FORWARD_PATHS.strengths[L] });
  if (hasSignificant) forwardPaths.push({ kind: 'astrologer', text: FORWARD_PATHS.astrologer[L] });

  return {
    archetype,
    gifts,
    nurture,
    forwardPaths,
    hasSignificant,
    // Demoted, always-gold traditional count for those who want it.
    traditionalCount: {
      score: porondamResult?.totalScore ?? null,
      max: porondamResult?.maxPossibleScore ?? 20,
    },
  };
}

module.exports = {
  deriveArchetype,
  buildLagnaExplorer,
  buildCoupleReading,
  ARCHETYPES,
  BANDS,
  // exported for tests
  relationshipClass,
  pairTone,
};
