/**
 * Porondam (Marriage Compatibility) Engine
 * 
 * Implements the traditional Sri Lankan / South Indian marriage compatibility
 * system based on 20 Porondam (compatibility points).
 * 
 * The system matches based on:
 * - Nakshatra compatibility (Gana, Yoni, Rashi, Nadi, etc.)
 * - Dasha Porondam (10 compatibility factors scored out of 20)
 */

const { getNakshatra, getRashi, toSidereal, getMoonLongitude, getAyanamsha,
  getAllPlanetPositions, buildHouseChart, buildNavamshaChart, getLagna,
  calculateVimshottariDetailed, calculateDrishtis, getPlanetStrengths } = require('./astrology');

/**
 * Gana (Temperament) classification for each Nakshatra
 * Deva (Divine), Manushya (Human), Rakshasa (Demon)
 */
const GANA_MAP = {
  'Ashwini': 'Deva', 'Bharani': 'Manushya', 'Krittika': 'Rakshasa',
  'Rohini': 'Manushya', 'Mrigashira': 'Deva', 'Ardra': 'Manushya',
  'Punarvasu': 'Deva', 'Pushya': 'Deva', 'Ashlesha': 'Rakshasa',
  'Magha': 'Rakshasa', 'Purva Phalguni': 'Manushya', 'Uttara Phalguni': 'Manushya',
  'Hasta': 'Deva', 'Chitra': 'Rakshasa', 'Swati': 'Deva',
  'Vishakha': 'Rakshasa', 'Anuradha': 'Deva', 'Jyeshtha': 'Rakshasa',
  'Mula': 'Rakshasa', 'Purva Ashadha': 'Manushya', 'Uttara Ashadha': 'Manushya',
  'Shravana': 'Deva', 'Dhanishtha': 'Rakshasa', 'Shatabhisha': 'Rakshasa',
  'Purva Bhadrapada': 'Manushya', 'Uttara Bhadrapada': 'Manushya', 'Revati': 'Deva',
};

/**
 * Yoni (Animal symbol) for each Nakshatra
 */
const YONI_MAP = {
  'Ashwini': 'Horse', 'Bharani': 'Elephant', 'Krittika': 'Goat',
  'Rohini': 'Serpent', 'Mrigashira': 'Serpent', 'Ardra': 'Dog',
  'Punarvasu': 'Cat', 'Pushya': 'Goat', 'Ashlesha': 'Cat',
  'Magha': 'Rat', 'Purva Phalguni': 'Rat', 'Uttara Phalguni': 'Cow',
  'Hasta': 'Buffalo', 'Chitra': 'Tiger', 'Swati': 'Buffalo',
  'Vishakha': 'Tiger', 'Anuradha': 'Deer', 'Jyeshtha': 'Deer',
  'Mula': 'Dog', 'Purva Ashadha': 'Monkey', 'Uttara Ashadha': 'Mongoose',
  'Shravana': 'Monkey', 'Dhanishtha': 'Lion', 'Shatabhisha': 'Horse',
  'Purva Bhadrapada': 'Lion', 'Uttara Bhadrapada': 'Cow', 'Revati': 'Elephant',
};

/**
 * Nadi (Pulse/Energy channel) classification
 * Aadi (First), Madhya (Middle), Antya (Last)
 */
const NADI_MAP = {
  'Ashwini': 'Aadi', 'Bharani': 'Madhya', 'Krittika': 'Antya',
  'Rohini': 'Antya', 'Mrigashira': 'Madhya', 'Ardra': 'Aadi',
  'Punarvasu': 'Aadi', 'Pushya': 'Madhya', 'Ashlesha': 'Antya',
  'Magha': 'Antya', 'Purva Phalguni': 'Madhya', 'Uttara Phalguni': 'Aadi',
  'Hasta': 'Aadi', 'Chitra': 'Madhya', 'Swati': 'Antya',
  'Vishakha': 'Antya', 'Anuradha': 'Madhya', 'Jyeshtha': 'Aadi',
  'Mula': 'Aadi', 'Purva Ashadha': 'Madhya', 'Uttara Ashadha': 'Antya',
  'Shravana': 'Antya', 'Dhanishtha': 'Madhya', 'Shatabhisha': 'Aadi',
  'Purva Bhadrapada': 'Aadi', 'Uttara Bhadrapada': 'Madhya', 'Revati': 'Antya',
};

/**
 * Vasya (Dominance/Compatibility) groups
 */
const VASYA_GROUPS = {
  'Mesha': ['Simha', 'Vrischika'],
  'Vrishabha': ['Kataka', 'Tula'],
  'Mithuna': ['Kanya'],
  'Kataka': ['Vrischika', 'Dhanus'],
  'Simha': ['Tula'],
  'Kanya': ['Meena', 'Mithuna'],
  'Tula': ['Makara', 'Kanya'],
  'Vrischika': ['Kataka'],
  'Dhanus': ['Meena'],
  'Makara': ['Mesha', 'Kumbha'],
  'Kumbha': ['Mesha'],
  'Meena': ['Makara'],
};

/**
 * Enemy Yoni pairs (incompatible animals)
 */
const ENEMY_YONIS = [
  ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Goat', 'Monkey'],
  ['Serpent', 'Mongoose'], ['Dog', 'Deer'], ['Cat', 'Rat'],
  ['Tiger', 'Cow'],
];

/**
 * Calculate Dina (Day) Porondam
 * Count from bride's nakshatra to groom's nakshatra
 * Maximum: 3 points
 */
function calculateDinaPorondam(brideNakshatra, groomNakshatra) {
  const count = ((groomNakshatra.id - brideNakshatra.id + 27) % 27) + 1;
  const remainder = count % 9;

  // Remainder of 2, 4, 6, 8, 9 is good
  const isGood = [2, 4, 6, 8, 0].includes(remainder);
  return {
    name: 'Dina',
    sinhala: 'දින',
    tamil: 'தினம்',
    score: isGood ? 3 : 0,
    maxScore: 3,
    count,
    remainder,
    description: isGood
      ? 'Good day compatibility - promotes health and well-being'
      : 'Day compatibility is unfavorable',
    descriptionSinhala: isGood
      ? 'යහපත් දින ගැලපීමක් - සෞඛ්‍යය සහ යහපැවැත්ම සදහා උපකාරී වෙනවා'
      : 'දින පොරොන්දම ගැලපීම අවාසිදායකය',
  };
}

/**
 * Calculate Gana Porondam
 * Temperament compatibility
 * Maximum: 2 points
 */
function calculateGanaPorondam(brideNakshatra, groomNakshatra) {
  const brideGana = GANA_MAP[brideNakshatra.name];
  const groomGana = GANA_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';
  let descriptionSinhala = '';

  if (brideGana === groomGana) {
    score = 2;
    description = 'Same temperament - excellent compatibility';
    descriptionSinhala = 'එකම ගණයේ ගැලපීම - ඉතා උසස් ගැලපීමකි';
  } else if (
    (brideGana === 'Deva' && groomGana === 'Manushya') ||
    (brideGana === 'Manushya' && groomGana === 'Deva')
  ) {
    // Deva–Manushya is the only acceptable cross-gana pairing. Any pairing
    // involving Rakshasa with a non-Rakshasa (Deva–Rakshasa OR Manushya–Rakshasa)
    // is a classical incompatibility and scores zero. The previous code
    // wrongly promoted Deva–Rakshasa — one of the worst pairings — to "moderate".
    score = 1;
    description = 'Moderate temperament compatibility';
    descriptionSinhala = 'සාමාන්‍ය ගණ ගැලපීමකි';
  } else {
    score = 0;
    description = 'Different temperaments - may cause friction';
    descriptionSinhala = 'වෙනස් ගණ ගැලපීමකි - මත ගැටුම් තියෙනවාි විය පුළුවන්';
  }

  return {
    name: 'Gana',
    sinhala: 'ගණ',
    tamil: 'கணம்',
    score,
    maxScore: 2,
    brideGana,
    groomGana,
    description,
    descriptionSinhala,
  };
}

/**
 * Calculate Yoni Porondam
 * Sexual/physical compatibility
 * Maximum: 3 points
 */
function calculateYoniPorondam(brideNakshatra, groomNakshatra) {
  const brideYoni = YONI_MAP[brideNakshatra.name];
  const groomYoni = YONI_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';
  let descriptionSinhala = '';

  if (brideYoni === groomYoni) {
    score = 3;
    description = 'Same yoni - excellent physical compatibility';
    descriptionSinhala = 'එකම යෝනි ගැලපීම - ඉතා උසස් කායික ගැලපීමකි';
  } else {
    const isEnemy = ENEMY_YONIS.some(
      ([a, b]) => (brideYoni === a && groomYoni === b) || (brideYoni === b && groomYoni === a)
    );
    if (isEnemy) {
      score = 0;
      description = 'Enemy yonis - physical incompatibility';
      descriptionSinhala = 'සතුරු යෝනි - කායික ගැලපීම අවාසිදායකය';
    } else {
      score = 2;
      description = 'Friendly yonis - good physical compatibility';
      descriptionSinhala = 'මිතුරු යෝනි - යහපත් කායික ගැලපීමකි';
    }
  }

  return {
    name: 'Yoni',
    sinhala: 'යෝනි',
    tamil: 'யோனி',
    score,
    maxScore: 3,
    brideYoni,
    groomYoni,
    description,
    descriptionSinhala,
  };
}

/**
 * Calculate Rashi Porondam
 * Sign compatibility (emotional compatibility)
 * Maximum: 2 points
 */
function calculateRashiPorondam(brideRashi, groomRashi) {
  const diff = Math.abs(brideRashi.id - groomRashi.id);
  const normalizedDiff = Math.min(diff, 12 - diff); // 0..6 (fold to nearest)

  let score = 0;
  let description = '';
  let descriptionSinhala = '';
  let isDosha = false;
  let severity = null;

  // normalizedDiff maps to the sign relationship between the two Moon signs:
  //   0 → same sign, 1 → 2/12, 2 → 3/11, 3 → 4/10 (kendra),
  //   4 → 5/9 (trikona), 5 → 6/8 (shadashtaka), 6 → 7th (opposition).
  // The previous logic did `[1,5,7,9].includes(normalizedDiff+1)` which never
  // matched 9 and let the 6/8 shadashtaka fall through to a "moderate" 1 — the
  // single worst combination scoring as average with no warning.
  if (normalizedDiff === 5) {
    // Shadashtaka (6-8) — classical hard flag.
    score = 0;
    isDosha = true;
    severity = 'high';
    description = '6-8 relationship (Shadashtaka) - the most challenging sign match; friction in health and harmony';
    descriptionSinhala = '6-8 සම්බන්ධය (ෂඩාෂ්ටක) - රාශි ගැලපීම්වලින් වඩාත්ම දුෂ්කරයි; සෞඛ්‍යයට හා සමඟියට බලපායි';
  } else if (normalizedDiff === 1) {
    // Dwirdwadasha (2-12) — financial/expenditure concern.
    score = 0;
    isDosha = true;
    severity = 'moderate';
    description = '2-12 relationship (Dwirdwadasha) - concerns around finances and expenditure';
    descriptionSinhala = '2-12 සම්බන්ධය (ද්විර්ද්වාදශ) - මූල්‍ය හා වියදම් සම්බන්ධ ගැටළු';
  } else if (normalizedDiff === 0 || normalizedDiff === 3 || normalizedDiff === 4 || normalizedDiff === 6) {
    // Same sign, kendra (4/10), trikona (5/9), or 7th — emotionally harmonious.
    score = 2;
    description = 'Good sign compatibility - emotional harmony';
    descriptionSinhala = 'යහපත් රාශි ගැලපීමක් - මානසික එකඟතාවය තියෙනවා';
  } else {
    // 3/11 relationship — workable but not ideal.
    score = 1;
    description = 'Moderate sign compatibility';
    descriptionSinhala = 'සාමාන්‍ය රාශි ගැලපීමකි';
  }

  return {
    name: 'Rashi',
    sinhala: 'රාශි',
    tamil: 'ராசி',
    score,
    maxScore: 2,
    isDosha,
    severity,
    description,
    descriptionSinhala,
  };
}

/**
 * Calculate Vasya Porondam
 * Magnetic control/dominance compatibility
 * Maximum: 1 point
 */
function calculateVasyaPorondam(brideRashi, groomRashi) {
  const brideName = brideRashi.name;
  const groomName = groomRashi.name;

  const brideVasya = VASYA_GROUPS[brideName] || [];
  const groomVasya = VASYA_GROUPS[groomName] || [];

  let score = 0;
  let description = '';
  let descriptionSinhala = '';

  if (brideVasya.includes(groomName) || groomVasya.includes(brideName)) {
    score = 1;
    description = 'Vasya compatibility present - mutual attraction';
    descriptionSinhala = 'වශ්‍ය ගැලපීම තියෙනවා - අන්‍යෝන්‍ය ආකර්ෂණය තියෙනවා';
  } else if (brideName === groomName) {
    score = 1;
    description = 'Same sign - natural attraction';
    descriptionSinhala = 'එකම රාශිය - ස්වාභාවික ආකර්ෂණය තියෙනවා';
  } else {
    score = 0;
    description = 'No Vasya compatibility';
    descriptionSinhala = 'වශ්‍ය ගැලපීමක් නැත';
  }

  return {
    name: 'Vasya',
    sinhala: 'වශ්‍ය',
    tamil: 'வஸ்யம்',
    score,
    maxScore: 1,
    description,
    descriptionSinhala,
  };
}

/**
 * Calculate Nadi Porondam
 * Health and genetic compatibility
 * Maximum: 8 points (most important!)
 */
function calculateNadiPorondam(brideNakshatra, groomNakshatra, brideRashi = null, groomRashi = null) {
  const brideNadi = NADI_MAP[brideNakshatra.name];
  const groomNadi = NADI_MAP[groomNakshatra.name];

  let score = 0;
  let description = '';
  let descriptionSinhala = '';
  let isDosha = false;
  let parihara = null; // cancellation reason, if any

  if (brideNadi !== groomNadi) {
    score = 8;
    description = 'Different Nadi - excellent health compatibility for offspring';
    descriptionSinhala = 'වෙනස් නාඩි - දරුවන්ගේ සෞඛ්‍යය සදහා ඉතා යහපත්';
  } else {
    // Same Nadi = Nadi Dosha, UNLESS a classical parihara (cancellation) applies:
    //   1. Same nakshatra but different pada (quarter) → dosha cancelled.
    //   2. Different nakshatras falling in different rashis → dosha cancelled.
    // The previous implementation flagged EVERY same-Nadi pair with no
    // parihara check, over-reporting the scariest dosha in the whole system.
    const sameNakshatra = brideNakshatra.id === groomNakshatra.id;
    const differentPada = (brideNakshatra.pada || 0) !== (groomNakshatra.pada || 0);
    const differentNakshatra = brideNakshatra.id !== groomNakshatra.id;
    const differentRashi = brideRashi && groomRashi && brideRashi.id !== groomRashi.id;

    if (sameNakshatra && differentPada) {
      parihara = 'Same birth star but different quarter (pada) — Nadi Dosha is cancelled';
      score = 8;
    } else if (differentNakshatra && differentRashi) {
      parihara = 'Different birth stars in different Moon signs — Nadi Dosha is cancelled';
      score = 8;
    } else {
      isDosha = true;
      score = 0;
    }

    description = isDosha
      ? 'Same Nadi (Nadi Dosha) - a traditional consideration for family health. Consulting an experienced astrologer is customarily advised.'
      : `Same Nadi, but cancelled: ${parihara}.`;
    descriptionSinhala = isDosha
      ? 'එකම නාඩි (නාඩි දෝෂය) - පවුලේ සෞඛ්‍යය පිළිබඳ සම්ප්‍රදායික සලකා බැලීමකි. පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් විමසීම සුදුසුයි.'
      : 'එකම නාඩි වුවත් දෝෂය පිරිහරණය වී ඇත (පාද/රාශි වෙනස).';
  }

  return {
    name: 'Nadi',
    sinhala: 'නාඩි',
    tamil: 'நாடி',
    score,
    maxScore: 8,
    brideNadi,
    groomNadi,
    description,
    descriptionSinhala,
    isDosha,
    parihara,
  };
}

/**
 * Rajju group (body-limb) for each of the 27 nakshatras.
 * The 27 stars zig-zag across 5 limbs (foot→head→foot). A SAME-Rajju match
 * is the single most serious flag in Sri Lankan / South Indian matching —
 * traditionally a hard veto on spouse longevity, severity depending on the
 * shared limb. Different Rajju = full marks.
 */
const RAJJU_MAP = {
  // Pada (feet) — misfortune / constant wandering
  1: 'Pada', 9: 'Pada', 10: 'Pada', 18: 'Pada', 19: 'Pada', 27: 'Pada',
  // Kati (waist) — poverty / loss of wealth
  2: 'Kati', 8: 'Kati', 11: 'Kati', 17: 'Kati', 20: 'Kati', 26: 'Kati',
  // Nabhi (navel) — danger to children / progeny
  3: 'Nabhi', 7: 'Nabhi', 12: 'Nabhi', 16: 'Nabhi', 21: 'Nabhi', 25: 'Nabhi',
  // Kantha (neck) — danger to the wife
  4: 'Kantha', 6: 'Kantha', 13: 'Kantha', 15: 'Kantha', 22: 'Kantha', 24: 'Kantha',
  // Siro (head) — danger to the husband
  5: 'Siro', 14: 'Siro', 23: 'Siro',
};

const RAJJU_MEANING = {
  Siro:   { en: 'danger to the husband', si: 'සැමියාට අනතුරු' },
  Kantha: { en: 'danger to the wife', si: 'බිරිඳට අනතුරු' },
  Nabhi:  { en: 'danger to children / progeny', si: 'දරුවන්ට අනතුරු' },
  Kati:   { en: 'loss of wealth / poverty', si: 'ධන හානි' },
  Pada:   { en: 'wandering and hardship', si: 'ඉබ්බාගාතේ යාම හා දුක්' },
};

/**
 * Calculate Rajju Porondam (spouse-longevity veto).
 * Maximum: 5 points. Same limb → 0 and a hard dosha flag.
 */
function calculateRajjuPorondam(brideNakshatra, groomNakshatra) {
  const brideRajju = RAJJU_MAP[brideNakshatra.id];
  const groomRajju = RAJJU_MAP[groomNakshatra.id];
  const sameRajju = brideRajju === groomRajju;

  const meaning = sameRajju ? RAJJU_MEANING[brideRajju] : null;

  return {
    name: 'Rajju',
    sinhala: 'රජ්ජු',
    tamil: 'ரஜ்ஜு',
    score: sameRajju ? 0 : 5,
    maxScore: 5,
    brideRajju,
    groomRajju,
    isDosha: sameRajju,
    severity: sameRajju ? (brideRajju === 'Siro' || brideRajju === 'Kantha' ? 'high' : 'moderate') : null,
    isHardVeto: sameRajju,
    description: sameRajju
      ? `Same Rajju (${brideRajju}) — a serious longevity consideration: ${meaning.en}. Consulting an experienced astrologer before proceeding is strongly advised.`
      : 'Different Rajju — the couple fall on different body-limbs, which is auspicious for a long, stable union.',
    descriptionSinhala: sameRajju
      ? `එකම රජ්ජුව (${brideRajju}) — ${meaning.si}. ඉදිරියට යාමට පෙර පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් විමසීම දැඩිව නිර්දේශ කෙරේ.`
      : 'වෙනස් රජ්ජු — දිගු, ස්ථාවර විවාහයකට සුබයි.',
  };
}

/**
 * Vedha (mutual obstruction) nakshatra pairs. A Vedha pairing is a classical
 * hard flag — the two stars obstruct each other. Chitra (14) is Vedha-free.
 */
const VEDHA_PAIRS = [
  [1, 18], [2, 17], [3, 16], [4, 15], [5, 23], [6, 22], [7, 21],
  [8, 20], [9, 19], [10, 27], [11, 26], [12, 25], [13, 24],
];

/**
 * Calculate Vedha Porondam (mutual-obstruction veto).
 * Maximum: 2 points. Vedha pair → 0 and a hard dosha flag.
 */
function calculateVedhaPorondam(brideNakshatra, groomNakshatra) {
  const a = brideNakshatra.id;
  const b = groomNakshatra.id;
  const hasVedha = VEDHA_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

  return {
    name: 'Vedha',
    sinhala: 'වේධ',
    tamil: 'வேதை',
    score: hasVedha ? 0 : 2,
    maxScore: 2,
    isDosha: hasVedha,
    isHardVeto: hasVedha,
    severity: hasVedha ? 'high' : null,
    description: hasVedha
      ? 'Vedha present — the two birth stars mutually obstruct each other, a serious classical consideration. Consulting an experienced astrologer is advised.'
      : 'No Vedha — the birth stars do not obstruct each other.',
    descriptionSinhala: hasVedha
      ? 'වේධ දෝෂය — උපන් තරු දෙක එකිනෙක අවහිර කරයි; බැරෑරුම් සලකා බැලීමකි. පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් විමසීම නිර්දේශ කෙරේ.'
      : 'වේධ දෝෂයක් නැත — උපන් තරු දෙක එකිනෙකට බාධා නොකරයි.',
  };
}

/**
 * Calculate Mahendra Porondam
 * Prosperity and well-being
 * Maximum: 1 point
 */
function calculateMahendraPorondam(brideNakshatra, groomNakshatra) {
  const count = ((groomNakshatra.id - brideNakshatra.id + 27) % 27) + 1;
  const isGood = [4, 7, 10, 13, 16, 19, 22, 25].includes(count);

  return {
    name: 'Mahendra',
    sinhala: 'මහේන්ද්‍ර',
    tamil: 'மகேந்திரம்',
    score: isGood ? 1 : 0,
    maxScore: 1,
    description: isGood
      ? 'Mahendra compatible - promotes prosperity and progeny'
      : 'Mahendra not compatible',
    descriptionSinhala: isGood
      ? 'මහේන්ද්‍ර ගැලපීම තියෙනවා - දරුවන් සහ සමෘද්ධිය සදහා යහපත්'
      : 'මහේන්ද්‍ර ගැලපීමක් නැත',
  };
}

/**
 * Calculate full 20-point Porondam compatibility
 */
function calculatePorondam(brideBirthDate, groomBirthDate) {
  // Get Moon positions
  const brideMoonTropical = getMoonLongitude(brideBirthDate);
  const groomMoonTropical = getMoonLongitude(groomBirthDate);
  const brideMoonSidereal = toSidereal(brideMoonTropical, brideBirthDate);
  const groomMoonSidereal = toSidereal(groomMoonTropical, groomBirthDate);

  // Get Nakshatras and Rashis
  const brideNakshatra = getNakshatra(brideMoonSidereal);
  const groomNakshatra = getNakshatra(groomMoonSidereal);
  const brideRashi = getRashi(brideMoonSidereal);
  const groomRashi = getRashi(groomMoonSidereal);

  // ── Traditional 20-point factors (the additive score) ──────────────
  const traditionalFactors = [
    calculateDinaPorondam(brideNakshatra, groomNakshatra),
    calculateGanaPorondam(brideNakshatra, groomNakshatra),
    calculateYoniPorondam(brideNakshatra, groomNakshatra),
    calculateRashiPorondam(brideRashi, groomRashi),
    calculateVasyaPorondam(brideRashi, groomRashi),
    calculateNadiPorondam(brideNakshatra, groomNakshatra, brideRashi, groomRashi),
    calculateMahendraPorondam(brideNakshatra, groomNakshatra),
  ];

  // ── Rajju & Vedha — traditional PASS/FAIL vetoes, not additive points ──
  // In the Sri Lankan / South Indian system these gate the match rather than
  // contributing to the 20-point tally, so the headline score stays out of 20
  // for backward compatibility while these surface as prominent flags.
  const rajju = calculateRajjuPorondam(brideNakshatra, groomNakshatra);
  const vedha = calculateVedhaPorondam(brideNakshatra, groomNakshatra);

  const totalScore = traditionalFactors.reduce((sum, f) => sum + f.score, 0);
  const maxPossibleScore = 20;
  const percentage = Math.round((totalScore / maxPossibleScore) * 100);

  // Factors shown to the user include the two vetoes, tagged so the UI can
  // render them distinctly (they don't count toward the /20 headline).
  const factors = [
    ...traditionalFactors,
    { ...rajju, isVeto: true },
    { ...vedha, isVeto: true },
  ];

  // Determine overall compatibility rating
  let rating, ratingEmoji, ratingSinhala, ratingTamil;
  if (totalScore >= 18) {
    rating = 'Excellent';
    ratingEmoji = '💫';
    ratingSinhala = 'උතුම්';
    ratingTamil = 'சிறப்பு';
  } else if (totalScore >= 14) {
    rating = 'Very Good';
    ratingEmoji = '🌟';
    ratingSinhala = 'ඉතා හොඳ';
    ratingTamil = 'மிக நல்லது';
  } else if (totalScore >= 10) {
    rating = 'Good';
    ratingEmoji = '✨';
    ratingSinhala = 'හොඳ';
    ratingTamil = 'நல்லது';
  } else if (totalScore >= 7) {
    rating = 'Average';
    ratingEmoji = '⭐';
    ratingSinhala = 'සාමාන්‍ය';
    ratingTamil = 'சராசரி';
  } else {
    rating = 'Below Average';
    ratingEmoji = '🔮';
    ratingSinhala = 'සාමාන්‍යයට පහළ';
    ratingTamil = 'சராசரிக்கு கீழே';
  }

  // Check for major doshas (including the Rajju / Vedha hard vetoes)
  const doshas = [];
  const nadiResult = traditionalFactors.find(f => f.name === 'Nadi');
  if (nadiResult && nadiResult.isDosha) {
    doshas.push({
      name: 'Nadi Dosha',
      sinhala: 'නාඩි දෝෂය',
      severity: 'high',
      description: 'Same Nadi is a traditional consideration for children\'s health. An experienced astrologer can advise on how to honour it.',
      descriptionSinhala: 'එකම නාඩි ගැලපීම දරුවන්ගේ සෞඛ්‍ය ගැටළු පෙන්නුම් කරයි.',
    });
  }
  if (rajju.isDosha) {
    doshas.push({
      name: 'Rajju Dosha',
      sinhala: 'රජ්ජු දෝෂය',
      severity: rajju.severity || 'high',
      description: rajju.description,
      descriptionSinhala: rajju.descriptionSinhala,
    });
  }
  if (vedha.isDosha) {
    doshas.push({
      name: 'Vedha Dosha',
      sinhala: 'වේධ දෝෂය',
      severity: 'high',
      description: vedha.description,
      descriptionSinhala: vedha.descriptionSinhala,
    });
  }

  // ── Hard-veto override ──────────────────────────────────────────────
  // A Rajju or Vedha clash (or an uncancelled Nadi Dosha) is a classical
  // pass/fail gate: even a high point score cannot be presented as
  // "Excellent" when one is present. Cap the rating and flag it clearly.
  const hardVetoes = [];
  if (rajju.isDosha) hardVetoes.push('Rajju');
  if (vedha.isDosha) hardVetoes.push('Vedha');
  if (nadiResult && nadiResult.isDosha) hardVetoes.push('Nadi');
  const hasHardVeto = hardVetoes.length > 0;

  if (hasHardVeto) {
    // Never above "Average" while a hard veto stands.
    if (totalScore >= 10) {
      rating = 'Caution';
      ratingEmoji = '⚠️';
      ratingSinhala = 'ප්‍රවේශමෙන්';
      ratingTamil = 'எச்சரிக்கை';
    } else {
      rating = 'Below Average';
      ratingEmoji = '🔮';
      ratingSinhala = 'සාමාන්‍යයට පහළ';
      ratingTamil = 'சராசரிக்கு கீழே';
    }
  }

  return {
    bride: {
      birthDate: brideBirthDate.toISOString(),
      nakshatra: brideNakshatra,
      rashi: brideRashi,
      moonLongitude: brideMoonSidereal,
    },
    groom: {
      birthDate: groomBirthDate.toISOString(),
      nakshatra: groomNakshatra,
      rashi: groomRashi,
      moonLongitude: groomMoonSidereal,
    },
    totalScore,
    maxPossibleScore,
    percentage,
    rating,
    ratingEmoji,
    ratingSinhala,
    ratingTamil,
    factors,
    rajju,
    vedha,
    doshas,
    hardVetoes,
    hasHardVeto,
    recommendation: hasHardVeto
      ? `A traditional hard flag is present (${hardVetoes.join(', ')}). Regardless of the point score, an experienced astrologer should be consulted about remedies before proceeding.`
      : totalScore >= 10
        ? 'This match is considered favorable according to traditional Vedic astrology.'
        : 'This match may face challenges. Consulting a traditional astrologer for remedies is recommended.',
    recommendationSinhala: hasHardVeto
      ? `සම්ප්‍රදායික බැරෑරුම් දෝෂයක් ඇත (${hardVetoes.join(', ')}). ලකුණු කොපමණ වුවත්, ඉදිරියට යාමට පෙර පළපුරුදු ජ්‍යෝතිෂවේදියෙකුගෙන් පිළියම් ගැන විමසන්න.`
      : totalScore >= 10
        ? 'සාම්ප්‍රදායික ජ්‍යෝතිෂ්‍ය අනුව මෙම ගැලපීම හිතකර ලෙස සැලකේ.'
        : 'මෙම ගැලපීම අභියෝගවලට මුහුණ දිය පුළුවන්. ප්‍රතිකාර සඳහා සාම්ප්‍රදායික ජ්‍යෝතිෂවේදියෙකුගෙන් විමසන්න.',
  };
}

/**
 * ═══════════════════════════════════════════════════════════
 * PORONDAM+ Advanced Compatibility Analysis
 * Goes beyond the 7-factor traditional system with:
 * - Cross-chart Dasha phase compatibility
 * - Navamsha (D9) marriage chart comparison
 * - Mangala Dosha cross-check
 * - Venus/7th lord strength comparison
 * - Composite transit timing recommendation
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Analyze cross-chart Dasha compatibility
 * Checks if both people are in harmonious life phases
 */
function analyzeDashaCompatibility(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  try {
    const now = new Date();
    const brideMoonSid = toSidereal(getMoonLongitude(brideBirthDate), brideBirthDate);
    const groomMoonSid = toSidereal(getMoonLongitude(groomBirthDate), groomBirthDate);
    
    const brideDashas = calculateVimshottariDetailed(brideMoonSid, brideBirthDate);
    const groomDashas = calculateVimshottariDetailed(groomMoonSid, groomBirthDate);
    
    // Find current dasha for each
    const findCurrentDasha = (dashas) => {
      const nowTime = now.getTime();
      for (const d of dashas) {
        const start = new Date(d.start).getTime();
        const end = new Date(d.endDate).getTime();
        if (nowTime >= start && nowTime <= end) return d;
      }
      return dashas[0];
    };
    
    const brideCurrent = findCurrentDasha(brideDashas);
    const groomCurrent = findCurrentDasha(groomDashas);
    
    // Natural friend/enemy relationships
    const FRIENDS = {
      Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus'], Rahu: ['Mercury', 'Venus', 'Saturn'],
      Ketu: ['Mars', 'Jupiter'],
    };
    const ENEMIES = {
      Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'],
      Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'],
      Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
      Rahu: ['Sun', 'Moon'], Ketu: ['Moon'],
    };
    
    const brideLord = brideCurrent?.lord || 'Unknown';
    const groomLord = groomCurrent?.lord || 'Unknown';
    
    let dashaHarmony = 'neutral';
    let dashaScore = 1;
    
    if (FRIENDS[brideLord]?.includes(groomLord) || FRIENDS[groomLord]?.includes(brideLord)) {
      dashaHarmony = 'harmonious';
      dashaScore = 2;
    } else if (ENEMIES[brideLord]?.includes(groomLord) || ENEMIES[groomLord]?.includes(brideLord)) {
      dashaHarmony = 'conflicting';
      dashaScore = 0;
    }
    
    // Check if both are in benefic vs malefic periods
    const beneficLords = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    const brideInBenefic = beneficLords.includes(brideLord);
    const groomInBenefic = beneficLords.includes(groomLord);
    
    return {
      bride: { currentDasha: brideLord, period: `${brideCurrent?.start} to ${brideCurrent?.endDate}`, isBeneficPeriod: brideInBenefic },
      groom: { currentDasha: groomLord, period: `${groomCurrent?.start} to ${groomCurrent?.endDate}`, isBeneficPeriod: groomInBenefic },
      harmony: dashaHarmony,
      score: dashaScore,
      maxScore: 2,
      bothInBeneficPeriod: brideInBenefic && groomInBenefic,
      description: dashaHarmony === 'harmonious'
        ? 'Both partners are in compatible life phases — the timing for this union is favorable.'
        : dashaHarmony === 'conflicting'
          ? 'The current life phases may create friction — a later date could be more harmonious.'
          : 'Neutral life phase compatibility — neither strongly for nor against.',
      descriptionSi: dashaHarmony === 'harmonious'
        ? 'දෙන්නම අනුකූල ජීවන අවධිවල ඉන්නවා — මෙම එක්වීම සඳහා කාලය හිතකරයි.'
        : dashaHarmony === 'conflicting'
          ? 'වර්තමාන ජීවන අවධි ගැටුම් තියෙනවාි කළ පුළුවන් — පසු දිනයක් වඩාත් සුදුසු විය පුළුවන්ිය.'
          : 'මධ්‍යස්ථ ජීවන අවධි අනුකූලතාව — ප්‍රබල ලෙස පක්ෂව හෝ විරුද්ධව නොවෙනවා.',
    };
  } catch (e) {
    return { harmony: 'unknown', score: 1, maxScore: 2, error: e.message };
  }
}

/**
 * Compare D9 (Navamsha) charts for marriage compatibility
 * The Navamsha is THE marriage chart in Vedic astrology
 */
function analyzeNavamshaCompatibility(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  try {
    const brideD9 = buildNavamshaChart(brideBirthDate, brideLat, brideLng);
    const groomD9 = buildNavamshaChart(groomBirthDate, groomLat, groomLng);
    
    let score = 0;
    const insights = [];
    const insightsSi = [];
    
    // 1. Check if D9 Lagna signs are compatible (trine/same/kendra/7th)
    const brideD9Lagna = brideD9.houses?.[0]?.rashiId || 1;
    const groomD9Lagna = groomD9.houses?.[0]?.rashiId || 1;
    const d9LagnaDiff = Math.abs(brideD9Lagna - groomD9Lagna);
    const normalizedDiff = Math.min(d9LagnaDiff, 12 - d9LagnaDiff);
    
    if (normalizedDiff === 0) {
      score += 3;
      insights.push('Same marriage chart rising sign — exceptional soul-level connection');
      insightsSi.push('එකම විවාහ සටහන් ලග්නය — අසාමාන්‍ය ආත්ම මට්ටමේ සම්බන්ධතාවයක්');
    } else if ([4, 8].includes(normalizedDiff)) {
      // Trines (5th/9th from each other)
      score += 2;
      insights.push('Harmonious marriage chart alignment — natural rapport');
      insightsSi.push('සුසංයෝගී විවාහ සටහන් පෙළගැස්ම — ස්වභාවික සම්බන්ධතාවයක්');
    } else if ([3, 9].includes(normalizedDiff)) {
      // Kendras (4th/10th from each other)
      score += 2;
      insights.push('Strong kendra alignment in marriage charts — solid foundation for partnership');
      insightsSi.push('විවාහ සටහන්වල ප්‍රබල කේන්ද්‍ර පෙළගැස්ම — හවුල්කාරිත්වයට ශක්තිමත් පදනමක්');
    } else if (normalizedDiff === 6) {
      // 7th house (opposition)
      score += 1;
      insights.push('Opposite marriage chart signs — magnetic attraction but requires adjustment');
      insightsSi.push('ප්‍රතිවිරුද්ධ විවාහ සටහන් ලකුණු — චුම්බක ආකර්ෂණයක් නමුත් සකස්වීම් ඕනේ');
    }
    
    // 2. Check Venus placement in each other's D9
    const findPlanetInD9 = (d9Chart, planetName) => {
      for (const h of (d9Chart.houses || [])) {
        const found = h.planets.find(p => p.name === planetName);
        if (found) return { house: h.houseNumber, rashi: h.rashiEnglish || h.rashi };
      }
      return null;
    };
    
    const brideVenusD9 = findPlanetInD9(brideD9, 'Venus');
    const groomVenusD9 = findPlanetInD9(groomD9, 'Venus');
    
    if (brideVenusD9 && groomVenusD9) {
      if (brideVenusD9.rashi === groomVenusD9.rashi) {
        score += 2;
        insights.push('Venus in the same sign in both marriage charts — strong romantic alignment');
        insightsSi.push('විවාහ සටහන් දෙකේම සිකුරු එකම රාශියේ — ප්‍රබල ප්‍රේමණීය ගැළපුමක්');
      }
    }
    
    // 3. Check Jupiter (husband karaka for bride) and Venus (wife karaka for groom)
    const brideJupiterD9 = findPlanetInD9(brideD9, 'Jupiter');
    const groomMarsD9 = findPlanetInD9(groomD9, 'Mars');
    
    if (brideJupiterD9 && [1, 4, 5, 7, 9, 10].includes(brideJupiterD9.house)) {
      score += 1;
      insights.push('Bride\'s Jupiter well-placed in marriage chart — her husband will be supportive');
      insightsSi.push('මනාලියගේ ගුරු විවාහ සටහනේ හොඳ ස්ථානයක — සැමියා සහයෝගී වනු තියෙනවා');
    }
    if (groomVenusD9 && [1, 4, 5, 7, 9, 10].includes(groomVenusD9.house)) {
      score += 1;
      insights.push('Groom\'s Venus well-placed in marriage chart — his wife will bring harmony');
      insightsSi.push('මනාලයාගේ සිකුරු විවාහ සටහනේ හොඳ ස්ථානයක — බිරිඳ සංහිඳියාව ගෙන එනු තියෙනවා');
    }
    
    return {
      brideD9Lagna: brideD9.houses?.[0]?.rashiEnglish || 'Unknown',
      brideD9LagnaSi: brideD9.houses?.[0]?.rashiSinhala || 'නොදනී',
      groomD9Lagna: groomD9.houses?.[0]?.rashiEnglish || 'Unknown',
      groomD9LagnaSi: groomD9.houses?.[0]?.rashiSinhala || 'නොදනී',
      score,
      maxScore: 7,
      insights,
      insightsSi,
      description: score >= 5
        ? 'Excellent marriage chart compatibility — deep soul-level connection likely.'
        : score >= 3
          ? 'Good marriage chart alignment — the relationship has strong spiritual support.'
          : 'Moderate marriage chart compatibility — the bond will grow with effort and understanding.',
      descriptionSi: score >= 5
        ? 'විශිෂ්ට විවාහ සටහන් අනුකූලතාව — ගැඹුරු ආත්ම මට්ටමේ සම්බන්ධතාවයක් තියෙනවාි විය පුළුවන්ිය.'
        : score >= 3
          ? 'හොඳ විවාහ සටහන් පෙළගැස්ම — සබඳතාවයට ප්‍රබල ආධ්‍යාත්මික සහාය තියෙනවා.'
          : 'මධ්‍යස්ථ විවාහ සටහන් අනුකූලතාව — උත්සාහයෙන් හා අවබෝධයෙන් බැඳීම වර්ධනය වනු තියෙනවා.',
    };
  } catch (e) {
    return { score: 0, maxScore: 7, insights: [], error: e.message };
  }
}

/**
 * Cross-check Mangala (Mars) Dosha between both charts
 * If both have it, it cancels out. If only one has it, it's a concern.
 */
function analyzeMangalaDosha(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  try {
    const checkMangala = (birthDate, lat, lng) => {
      const houseChart = buildHouseChart(birthDate, lat, lng);
      const planets = houseChart.planets || {};
      const mars = planets.mars;
      const moon = planets.moon;
      const venus = planets.venus;
      const lagnaRashiId = houseChart.lagna?.rashi?.id || 1;
      if (!mars) return { hasDosha: false, marsHouse: 0, cancelled: false, cancellationReason: '', references: [] };

      const marsRashi = mars.rashiId;
      // Mangala/Kuja Dosha is reckoned from the Ascendant, the MOON, AND VENUS
      // — Mars in the 1st/2nd/4th/7th/8th/12th from ANY of the three triggers
      // it. The previous implementation checked the Ascendant only, missing the
      // Moon- and Venus-based dosha that traditional matching always includes.
      const houseFrom = (refRashiId) => ((marsRashi - refRashiId + 12) % 12) + 1;
      const doshaHouses = [1, 2, 4, 7, 8, 12];

      const fromLagna = houseFrom(lagnaRashiId);
      const fromMoon = moon ? houseFrom(moon.rashiId) : 0;
      const fromVenus = venus ? houseFrom(venus.rashiId) : 0;

      const references = [];
      if (doshaHouses.includes(fromLagna)) references.push('Ascendant');
      if (moon && doshaHouses.includes(fromMoon)) references.push('Moon');
      if (venus && doshaHouses.includes(fromVenus)) references.push('Venus');
      const hasDosha = references.length > 0;
      const marsHouse = fromLagna; // primary reference for display

      // Check for cancellations
      let cancelled = false;
      let cancellationReason = '';
      if (hasDosha) {
        // Mars in own sign (Aries=1 / Scorpio=8) or exalted (Capricorn=10) → neutralized.
        // (The old blanket "Leo cancels" rule was a minority reading and is dropped.)
        if ([1, 8, 10].includes(marsRashi)) {
          cancelled = true;
          cancellationReason = 'Mars is in its own sign or exalted — dosha is neutralized';
        }
        // Jupiter aspects Mars (from-lagna houses) — neutralized.
        const jup = planets.jupiter;
        if (jup) {
          const jupHouse = ((jup.rashiId - lagnaRashiId + 12) % 12) + 1;
          const jupAspects = [jupHouse, ((jupHouse - 1 + 4) % 12) + 1, ((jupHouse - 1 + 6) % 12) + 1, ((jupHouse - 1 + 8) % 12) + 1];
          if (jupAspects.includes(fromLagna)) {
            cancelled = true;
            cancellationReason = 'Jupiter aspects Mars — dosha is neutralized by Jupiter\'s grace';
          }
        }
      }

      return { hasDosha, marsHouse, fromLagna, fromMoon, fromVenus, references, cancelled, cancellationReason };
    };
    
    const brideMangala = checkMangala(brideBirthDate, brideLat, brideLng);
    const groomMangala = checkMangala(groomBirthDate, groomLat, groomLng);
    
    let severity = 'none';
    let description = '';
    let descriptionSi = '';
    let score = 2;
    
    if (brideMangala.hasDosha && groomMangala.hasDosha) {
      severity = 'cancelled';
      description = 'Both partners have Mars influence — it cancels out! This is actually favorable.';
      descriptionSi = 'දෙදෙනාටම කුජ බලපෑමක් තියෙනවා — එය අවලංගු වෙනවා! මෙය තියෙනවා්ත වශයෙන්ම හිතකරයි.';
      score = 2;
    } else if (!brideMangala.hasDosha && !groomMangala.hasDosha) {
      severity = 'none';
      description = 'Neither partner has Mars influence concerns — clean compatibility.';
      descriptionSi = 'කිසිදු පාර්ශ්වකරුවෙකුට කුජ බලපෑම් ගැටලු නැත — පිරිසිදු අනුකූලතාව.';
      score = 2;
    } else if (brideMangala.cancelled || groomMangala.cancelled) {
      severity = 'mild';
      description = 'One partner has Mars influence but it is neutralized by other factors.';
      descriptionSi = 'එක් පාර්ශ්වකරුවෙකුට කුජ බලපෑමක් තියෙනවාි නමුත් අනෙකුත් සාධක මගින් සමනය වී තියෙනවා.';
      score = 1;
    } else {
      severity = 'present';
      description = 'One partner has Mars influence while the other doesn\'t — may bring friction in temperament that awareness and timing help balance.';
      descriptionSi = 'එක් අයෙකුට කුජ බලපෑමක් ඇති අතර අනෙකාට නැත — දැනුවත්භාවයෙන් හා කාලය තෝරාගැනීමෙන් සමනය කළ හැකි ස්වභාවයේ ඝට්ටනයක් ඇති විය හැක.';
      score = 0;
    }
    
    return {
      bride: brideMangala,
      groom: groomMangala,
      severity,
      score,
      maxScore: 2,
      description,
      descriptionSi,
    };
  } catch (e) {
    return { severity: 'unknown', score: 1, maxScore: 2, error: e.message };
  }
}

/**
 * Analyze Venus and 7th lord strength for both partners
 * Strong Venus + 7th lord = better marriage potential
 */
function analyzeMarriagePlanetStrength(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  try {
    const analyzeOne = (birthDate, lat, lng, label) => {
      const strengths = getPlanetStrengths(birthDate, lat, lng);
      const houseChart = buildHouseChart(birthDate, lat, lng);
      const lagnaRashiId = houseChart.lagna?.rashi?.id || 1;
      const seventhRashiId = ((lagnaRashiId - 1 + 6) % 12) + 1;
      // Rashi lords: Mesha=Mars, Vrishabha=Venus, Mithuna=Mercury, Kataka=Moon, Simha=Sun, Kanya=Mercury, Tula=Venus, Vrischika=Mars, Dhanus=Jupiter, Makara=Saturn, Kumbha=Saturn, Meena=Jupiter
      const lords = { 1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter' };
      const seventhLord = lords[seventhRashiId] || 'Unknown';
      
      const venusStrength = strengths.venus?.score || 50;
      const seventhLordKey = seventhLord.toLowerCase();
      const seventhLordStrength = strengths[seventhLordKey]?.score || 50;
      
      return {
        label,
        venusStrength,
        venusAssessment: venusStrength >= 70 ? 'Strong' : venusStrength >= 40 ? 'Moderate' : 'Weak',
        seventhLord,
        seventhLordStrength,
        seventhLordAssessment: seventhLordStrength >= 70 ? 'Strong' : seventhLordStrength >= 40 ? 'Moderate' : 'Weak',
        combinedScore: Math.round((venusStrength + seventhLordStrength) / 2),
      };
    };
    
    const bride = analyzeOne(brideBirthDate, brideLat, brideLng, 'Bride');
    const groom = analyzeOne(groomBirthDate, groomLat, groomLng, 'Groom');
    
    const avgCombined = Math.round((bride.combinedScore + groom.combinedScore) / 2);
    
    return {
      bride,
      groom,
      overallMarriageStrength: avgCombined,
      assessment: avgCombined >= 65 ? 'Strong marriage potential for both partners' : avgCombined >= 45 ? 'Moderate marriage potential — some areas need attention' : 'Marriage planets are weak — relationship will need conscious effort',
      assessmentSi: avgCombined >= 65 ? 'දෙදෙනාටම ප්‍රබල විවාහ පුළුවන්ියාව' : avgCombined >= 45 ? 'මධ්‍යස්ථ විවාහ පුළුවන්ියාව — සමහර ක්ෂේත්‍රවලට අවධානය ඕනේ' : 'විවාහ ග්‍රහයන් දුර්වලයි — සබඳතාවයට දැනුවත් උත්සාහයක් ඕනේ',
      score: avgCombined >= 65 ? 3 : avgCombined >= 45 ? 2 : 1,
      maxScore: 3,
    };
  } catch (e) {
    return { score: 1.5, maxScore: 3, error: e.message };
  }
}

/**
 * Find the best wedding date window based on both charts
 */
function findBestWeddingWindow(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  try {
    const brideMoonSid = toSidereal(getMoonLongitude(brideBirthDate), brideBirthDate);
    const groomMoonSid = toSidereal(getMoonLongitude(groomBirthDate), groomBirthDate);
    
    const brideDashas = calculateVimshottariDetailed(brideMoonSid, brideBirthDate);
    const groomDashas = calculateVimshottariDetailed(groomMoonSid, groomBirthDate);
    
    const now = new Date();
    const searchEnd = new Date(now.getTime() + 3 * 365.25 * 24 * 60 * 60 * 1000);
    
    // Find favorable dasha periods for marriage within the next 3 years
    const beneficForMarriage = ['Venus', 'Jupiter', 'Moon', 'Mercury'];
    
    const findFavorablePeriods = (dashas, label) => {
      const periods = [];
      for (const d of dashas) {
        const start = new Date(d.start);
        const end = new Date(d.endDate);
        if (end < now || start > searchEnd) continue;
        if (beneficForMarriage.includes(d.lord)) {
          periods.push({
            lord: d.lord,
            start: start > now ? start.toISOString().split('T')[0] : now.toISOString().split('T')[0],
            end: end < searchEnd ? end.toISOString().split('T')[0] : searchEnd.toISOString().split('T')[0],
          });
        }
      }
      return periods;
    };
    
    const brideFavorable = findFavorablePeriods(brideDashas, 'Bride');
    const groomFavorable = findFavorablePeriods(groomDashas, 'Groom');
    
    // Find overlapping periods
    const overlaps = [];
    // Score planets for marriage favorability
    const marriageWeight = { Venus: 5, Jupiter: 4, Moon: 3, Mercury: 2 };
    for (const bp of brideFavorable) {
      for (const gp of groomFavorable) {
        const overlapStart = new Date(Math.max(new Date(bp.start).getTime(), new Date(gp.start).getTime()));
        const overlapEnd = new Date(Math.min(new Date(bp.end).getTime(), new Date(gp.end).getTime()));
        if (overlapStart < overlapEnd) {
          const durationDays = (overlapEnd - overlapStart) / (24 * 60 * 60 * 1000);
          const score = (marriageWeight[bp.lord] || 1) + (marriageWeight[gp.lord] || 1) + Math.min(durationDays / 60, 3);
          overlaps.push({
            start: overlapStart.toISOString().split('T')[0],
            end: overlapEnd.toISOString().split('T')[0],
            durationDays: Math.round(durationDays),
            score: Math.round(score * 10) / 10,
            brideDashaLord: bp.lord,
            groomDashaLord: gp.lord,
            reason: `${bp.lord} period for bride + ${gp.lord} period for groom — both in favorable phases`,
            reasonSi: `මනාලියට ${bp.lord} කාලය + මනාලයාට ${gp.lord} කාලය — දෙන්නම හිතකර අවධිවල`,
          });
        }
      }
    }
    
    // Sort by score descending — best windows first
    overlaps.sort((a, b) => b.score - a.score);
    
    // Mark the best one
    if (overlaps.length > 0) overlaps[0].best = true;
    
    return {
      favorableWindows: overlaps.length > 0 ? overlaps : [{ start: 'No overlapping favorable period found in next 3 years', startSi: 'ඉදිරි වසර 3ක් තුළ අනුකූල කාල කවුළුවක් හමු නොවුණි', end: '', reason: 'Consider consulting for specific muhurtha dates', reasonSi: 'නිශ්චිත මුහුර්ත දිනයන් සඳහා ජ්‍යෝතිෂවෙනවාදියෙකුගෙන් උපදෙස් ගන්න' }],
      bridePeriods: brideFavorable,
      groomPeriods: groomFavorable,
    };
  } catch (e) {
    return { favorableWindows: [], error: e.message };
  }
}

/**
 * MASTER: Calculate Advanced Porondam+ compatibility
 * Combines traditional 20-point + advanced factors
 */
function calculateAdvancedPorondam(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng) {
  // Traditional 20-point system
  const traditional = calculatePorondam(brideBirthDate, groomBirthDate);
  
  // Advanced factors
  const dashaCompat = analyzeDashaCompatibility(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
  const navamshaCompat = analyzeNavamshaCompatibility(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
  const mangalaDosha = analyzeMangalaDosha(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
  const marriageStrength = analyzeMarriagePlanetStrength(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
  const weddingWindows = findBestWeddingWindow(brideBirthDate, groomBirthDate, brideLat, brideLng, groomLat, groomLng);
  
  // Calculate advanced total score (out of 14)
  const advancedScore = (dashaCompat.score || 0) + (navamshaCompat.score || 0) + (mangalaDosha.score || 0) + (marriageStrength.score || 0);
  const advancedMax = (dashaCompat.maxScore || 2) + (navamshaCompat.maxScore || 7) + (mangalaDosha.maxScore || 2) + (marriageStrength.maxScore || 3);
  
  // Combined score: traditional (out of 20) + advanced (out of 14) = out of 34
  const combinedScore = traditional.totalScore + advancedScore;
  const combinedMax = traditional.maxPossibleScore + advancedMax;
  const combinedPercentage = Math.round((combinedScore / combinedMax) * 100);
  
  // Combined rating
  let combinedRating, combinedRatingEmoji, combinedRatingSi;
  if (combinedPercentage >= 80) { combinedRating = 'Exceptional'; combinedRatingEmoji = '💫✨'; combinedRatingSi = 'විශිෂ්ට'; }
  else if (combinedPercentage >= 65) { combinedRating = 'Very Good'; combinedRatingEmoji = '🌟'; combinedRatingSi = 'ඉතා හොඳ'; }
  else if (combinedPercentage >= 50) { combinedRating = 'Good'; combinedRatingEmoji = '✨'; combinedRatingSi = 'හොඳ'; }
  else if (combinedPercentage >= 35) { combinedRating = 'Average'; combinedRatingEmoji = '⭐'; combinedRatingSi = 'සාමාන්‍ය'; }
  else { combinedRating = 'Below Average'; combinedRatingEmoji = '🔮'; combinedRatingSi = 'සාමාන්‍යයට පහළ'; }
  
  return {
    ...traditional,
    advanced: {
      dashaCompatibility: dashaCompat,
      navamshaCompatibility: navamshaCompat,
      mangalaDosha,
      marriagePlanetStrength: marriageStrength,
      weddingWindows,
      advancedScore,
      advancedMaxScore: advancedMax,
      advancedPercentage: Math.round((advancedScore / advancedMax) * 100),
    },
    combined: {
      score: combinedScore,
      maxScore: combinedMax,
      percentage: combinedPercentage,
      rating: combinedRating,
      ratingSi: combinedRatingSi,
      ratingEmoji: combinedRatingEmoji,
    },
  };
}

module.exports = {
  calculatePorondam,
  calculateAdvancedPorondam,
  // Individual factor calculators — exported for unit testing / reuse.
  calculateDinaPorondam,
  calculateGanaPorondam,
  calculateYoniPorondam,
  calculateRashiPorondam,
  calculateVasyaPorondam,
  calculateNadiPorondam,
  calculateMahendraPorondam,
  calculateRajjuPorondam,
  calculateVedhaPorondam,
  GANA_MAP,
  YONI_MAP,
  NADI_MAP,
  RAJJU_MAP,
  VEDHA_PAIRS,
};
