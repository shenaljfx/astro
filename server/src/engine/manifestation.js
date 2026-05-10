/**
 * Manifestation Engine
 * 
 * Law of Attraction features:
 * - getManifestationScore() — Daily manifestation power score (0–100)
 *   based on Moon phase, Nakshatra, Tithi, Yoga combinations
 * - calculateMagnetism() — Attraction chemistry between two charts (0–100)
 *   based on Venus-Mars spark, 7th house resonance, Nakshatra lord affinity,
 *   Rahu-Ketu karmic axis, Moon emotional sync
 */

const {
  getNakshatra, getRashi, toSidereal, getMoonLongitude, getSunLongitude,
  getAllPlanetPositions, buildHouseChart, getPanchanga, getAyanamsha,
  NAKSHATRAS, RASHIS,
} = require('./astrology');

// ═══════════════════════════════════════════════════════════════════
// MANIFESTATION SCORE (Feature B — Today screen)
// ═══════════════════════════════════════════════════════════════════

/**
 * Nakshatras considered highly auspicious for new beginnings / manifestation
 */
const MANIFESTATION_NAKSHATRAS = {
  'Ashwini': 18,    // New beginnings, healing
  'Rohini': 20,     // Growth, abundance, creativity
  'Mrigashira': 14, // Seeking, exploration
  'Punarvasu': 16,  // Renewal, restoration
  'Pushya': 20,     // Nourishment, most auspicious
  'Hasta': 16,      // Skill, manifestation through hands
  'Chitra': 14,     // Creativity, brilliance
  'Swati': 15,      // Independence, growth
  'Anuradha': 15,   // Devotion, friendship
  'Shravana': 16,   // Learning, divine knowledge
  'Dhanishtha': 14, // Wealth, musical
  'Revati': 18,     // Completion, safe travel
  'Uttara Phalguni': 15, // Generosity, contracts
  'Uttara Ashadha': 15,  // Universal, final victory
  'Uttara Bhadrapada': 14, // Depth, wisdom
};

/**
 * Moon phase score for manifestation
 * Based on LoA principles:
 * - New Moon (Tithi 1) = set intentions — high
 * - Waxing (Shukla Paksha, Tithi 1–15) = attract/grow — good
 * - Full Moon (Tithi 15) = gratitude/release — peak
 * - Waning (Krishna Paksha, Tithi 16–30) = let go — lower for attraction
 */
function getMoonPhaseScore(tithiNumber) {
  if (!tithiNumber || tithiNumber < 1) return 10;
  // Tithi 1 (Pratipada of Shukla) = New Moon setting
  if (tithiNumber === 1) return 22;  // New Moon — set intentions
  if (tithiNumber === 15) return 25; // Full Moon — peak manifestation
  // Shukla Paksha (waxing, tithi 2–14) — growing energy
  if (tithiNumber >= 2 && tithiNumber <= 14) {
    // Peaks towards full moon
    return 12 + Math.round((tithiNumber / 14) * 10);
  }
  // Krishna Paksha (waning, tithi 16–30) — releasing energy
  if (tithiNumber >= 16 && tithiNumber <= 30) {
    // Good for releasing blocks, less for attracting
    return 15 - Math.round(((tithiNumber - 15) / 15) * 8);
  }
  return 10;
}

/**
 * Yoga score for manifestation
 * Some yogas are especially favorable
 */
const FAVORABLE_YOGAS = {
  'Siddha': 8,      // Accomplishment
  'Shubha': 7,      // Auspicious
  'Sukarma': 7,     // Good deeds
  'Priti': 6,       // Love/affection
  'Ayushman': 6,    // Longevity
  'Saubhagya': 8,   // Good fortune
  'Shobhana': 6,    // Splendor
  'Vriddhi': 7,     // Growth
  'Dhruva': 6,      // Fixed/stable
  'Harshana': 6,    // Joy
  'Vardhamana': 7,  // Increasing
  'Indra': 5,       // Power
  'Brahma': 5,      // Creation
};

const UNFAVORABLE_YOGAS = {
  'Vishkumbha': -5,
  'Atiganda': -4,
  'Vyaghata': -5,
  'Vajra': -3,
  'Vyatipata': -6,
  'Parigha': -4,
  'Vaidhriti': -5,
};

/**
 * Manifestation focus areas based on the strongest planetary influence today
 */
const PLANET_FOCUS_MAP = {
  'Sun': { area: 'career', en: 'Career & Authority', si: 'වෘත්තිය සහ බලය' },
  'Moon': { area: 'emotional', en: 'Emotional Wellbeing', si: 'චිත්තවේගීය සුවය' },
  'Mars': { area: 'courage', en: 'Courage & Action', si: 'නිර්භීතකම සහ ක්‍රියාව' },
  'Mercury': { area: 'communication', en: 'Communication & Learning', si: 'සන්නිවේදනය සහ ඉගෙනීම' },
  'Jupiter': { area: 'wealth', en: 'Wealth & Wisdom', si: 'ධනය සහ ප්‍රඥාව' },
  'Venus': { area: 'love', en: 'Love & Beauty', si: 'ආදරය සහ සෞන්දර්ය' },
  'Saturn': { area: 'discipline', en: 'Discipline & Structure', si: 'විනය සහ ව්‍යුහය' },
};

/**
 * Calculate the daily manifestation power score
 * 
 * @param {Date} date - The date to calculate for
 * @param {number} lat - Latitude (default Colombo)
 * @param {number} lng - Longitude (default Colombo)
 * @returns {Object} Manifestation score and breakdown
 */
function getManifestationScore(date, lat = 6.9271, lng = 79.8612) {
  const panchanga = getPanchanga(date, lat, lng);

  // 1. Moon Phase Score (0–25)
  const tithiNumber = panchanga.tithi?.id || panchanga.tithi?.number || 1;
  const moonPhaseScore = getMoonPhaseScore(tithiNumber);
  const isWaxing = tithiNumber >= 1 && tithiNumber <= 15;

  // 2. Nakshatra Score (0–20)
  const nakshatraName = panchanga.nakshatra?.name || '';
  const nakshatraScore = MANIFESTATION_NAKSHATRAS[nakshatraName] || 8;

  // 3. Yoga Score (-6 to +8, normalized to 0–15)
  const yogaName = panchanga.yoga?.name || '';
  let rawYogaScore = FAVORABLE_YOGAS[yogaName] || UNFAVORABLE_YOGAS[yogaName] || 0;
  const yogaScore = Math.max(0, Math.min(15, rawYogaScore + 7));

  // 4. Day of week (Vaara) score (0–15)
  const vaaraScores = {
    'Sunday': 12,     // Sun — authority, vitality
    'Monday': 14,     // Moon — emotions, intuition (LoA aligned)
    'Tuesday': 8,     // Mars — action but aggressive
    'Wednesday': 13,  // Mercury — communication
    'Thursday': 15,   // Jupiter — most auspicious, expansion
    'Friday': 14,     // Venus — love, beauty, abundance
    'Saturday': 6,    // Saturn — restriction
  };
  const vaaraName = panchanga.vaara?.english || panchanga.vaara?.name || '';
  const vaaraScore = vaaraScores[vaaraName] || 10;

  // 5. Rahu Kalaya penalty — if currently in Rahu Kalaya, reduce score
  const now = new Date();
  const rahuActive = panchanga.rahuKalam?.start && panchanga.rahuKalam?.end
    ? now >= new Date(panchanga.rahuKalam.start) && now <= new Date(panchanga.rahuKalam.end)
    : false;
  const rahuPenalty = rahuActive ? -10 : 0;

  // 6. Hora bonus — check if current hora ruler is benefic
  let horaBonus = 0;
  const currentHora = (panchanga.horas || []).find(h => {
    const start = new Date(h.start);
    const end = new Date(h.end);
    return now >= start && now <= end;
  });
  if (currentHora) {
    const beneficRulers = ['Jupiter', 'Venus', 'Moon', 'Mercury'];
    if (beneficRulers.includes(currentHora.ruler)) horaBonus = 5;
  }

  // Total raw score
  const rawTotal = moonPhaseScore + nakshatraScore + yogaScore + vaaraScore + rahuPenalty + horaBonus;
  const totalScore = Math.max(0, Math.min(100, rawTotal));

  // Determine best focus area from planetary hora or day ruler
  const dayPlanet = {
    'Sunday': 'Sun', 'Monday': 'Moon', 'Tuesday': 'Mars',
    'Wednesday': 'Mercury', 'Thursday': 'Jupiter', 'Friday': 'Venus',
    'Saturday': 'Saturn',
  }[vaaraName] || 'Jupiter';

  const horaRuler = currentHora?.ruler || dayPlanet;
  const focusPlanet = PLANET_FOCUS_MAP[horaRuler] || PLANET_FOCUS_MAP[dayPlanet];

  // Secondary focus from Nakshatra lord
  const nakshatraLord = panchanga.nakshatra?.lord || 'Moon';
  const secondaryFocus = PLANET_FOCUS_MAP[nakshatraLord] || PLANET_FOCUS_MAP['Moon'];

  // Determine phase description
  let phaseEn, phaseSi;
  if (tithiNumber === 1) {
    phaseEn = 'New Moon — Set powerful intentions today';
    phaseSi = 'අමාවක — අද බලවත් අභිප්‍රායන් තබන්න';
  } else if (tithiNumber === 15) {
    phaseEn = 'Full Moon — Peak manifestation energy';
    phaseSi = 'පුර පෝය — උපරිම ප්‍රකාශන ශක්තිය';
  } else if (isWaxing) {
    phaseEn = 'Waxing Moon — Energy is growing, attract and build';
    phaseSi = 'පුර පක්ෂය — ශක්තිය වැඩෙන, ආකර්ෂණය කර ගොඩනගන්න';
  } else {
    phaseEn = 'Waning Moon — Release blocks and old patterns';
    phaseSi = 'අව පක්ෂය — බාධක සහ පැරණි රටා මුදා හරින්න';
  }

  // Rating
  let ratingEn, ratingSi;
  if (totalScore >= 80) { ratingEn = 'Exceptional'; ratingSi = 'සුවිශේෂ'; }
  else if (totalScore >= 65) { ratingEn = 'Very Strong'; ratingSi = 'ඉතා ශක්තිමත්'; }
  else if (totalScore >= 50) { ratingEn = 'Favorable'; ratingSi = 'හිතකර'; }
  else if (totalScore >= 35) { ratingEn = 'Moderate'; ratingSi = 'මධ්‍යස්ථ'; }
  else { ratingEn = 'Low Energy'; ratingSi = 'අඩු ශක්තිය'; }

  return {
    score: totalScore,
    maxScore: 100,
    percentage: totalScore,
    rating: { en: ratingEn, si: ratingSi },
    phase: { en: phaseEn, si: phaseSi },
    isWaxing,
    tithiNumber,
    breakdown: {
      moonPhase: { score: moonPhaseScore, max: 25, label: 'Moon Phase' },
      nakshatra: { score: nakshatraScore, max: 20, label: 'Nakshatra' },
      yoga: { score: yogaScore, max: 15, label: 'Yoga' },
      vaara: { score: vaaraScore, max: 15, label: 'Day' },
      hora: { score: Math.max(0, horaBonus + rahuPenalty), max: 5, label: 'Current Hora' },
    },
    focus: {
      primary: focusPlanet,
      secondary: secondaryFocus.area !== focusPlanet.area ? secondaryFocus : null,
    },
    tips: {
      en: isWaxing
        ? 'Waxing phase favors attracting new things. Visualize what you want to bring into your life.'
        : 'Waning phase favors releasing. Let go of limiting beliefs and clear space for new energy.',
      si: isWaxing
        ? 'පුර පක්ෂය නව දේ ආකර්ෂණය කිරීමට හිතකරයි. ඔබේ ජීවිතයට ගෙන ඒමට අවශ්‍ය දේ දෘශ්‍යකරණය කරන්න.'
        : 'අව පක්ෂය මුදා හැරීමට හිතකරයි. සීමා කරන විශ්වාසයන් අත් හරින්න, නව ශක්තියට ඉඩ සාදන්න.',
    },
  };
}


// ═══════════════════════════════════════════════════════════════════
// ATTRACTION MAGNETISM (Feature C — Porondam tab)
// ═══════════════════════════════════════════════════════════════════

/**
 * Natural friendship between planetary lords
 */
const PLANET_FRIENDSHIPS = {
  'Sun':     { friends: ['Moon', 'Mars', 'Jupiter'], neutral: ['Mercury'], enemies: ['Venus', 'Saturn', 'Rahu', 'Ketu'] },
  'Moon':    { friends: ['Sun', 'Mercury'], neutral: ['Mars', 'Jupiter', 'Venus', 'Saturn'], enemies: ['Rahu', 'Ketu'] },
  'Mars':    { friends: ['Sun', 'Moon', 'Jupiter'], neutral: ['Venus', 'Saturn'], enemies: ['Mercury', 'Rahu', 'Ketu'] },
  'Mercury': { friends: ['Sun', 'Venus'], neutral: ['Mars', 'Jupiter', 'Saturn'], enemies: ['Moon', 'Rahu', 'Ketu'] },
  'Jupiter': { friends: ['Sun', 'Moon', 'Mars'], neutral: ['Saturn'], enemies: ['Mercury', 'Venus', 'Rahu', 'Ketu'] },
  'Venus':   { friends: ['Mercury', 'Saturn'], neutral: ['Mars', 'Jupiter'], enemies: ['Sun', 'Moon', 'Rahu', 'Ketu'] },
  'Saturn':  { friends: ['Mercury', 'Venus'], neutral: ['Jupiter'], enemies: ['Sun', 'Moon', 'Mars', 'Rahu', 'Ketu'] },
  'Rahu':    { friends: ['Venus', 'Saturn'], neutral: ['Mercury', 'Jupiter'], enemies: ['Sun', 'Moon', 'Mars', 'Ketu'] },
  'Ketu':    { friends: ['Mars', 'Jupiter'], neutral: ['Venus', 'Saturn'], enemies: ['Sun', 'Moon', 'Mercury', 'Rahu'] },
};

/**
 * Check if two rashi signs are in a specific house relationship
 * @param {number} fromId - Rashi ID (1-12)
 * @param {number} toId - Rashi ID (1-12)
 * @returns {number} House distance (1-12)
 */
function getHouseDistance(fromId, toId) {
  return ((toId - fromId + 12) % 12) || 12;
}

/**
 * Factor 1: Venus-Mars Spark (0–25)
 * Measures physical/romantic magnetism between two charts
 */
function calculateVenusMarsSpark(personA, personB) {
  const venusA = personA.venus;
  const marsA = personA.mars;
  const venusB = personB.venus;
  const marsB = personB.mars;

  let score = 0;
  let details = [];

  // A's Venus conjunct/aspect B's Mars (and vice versa)
  // Check sign-based conjunction (same rashi)
  if (venusA.rashiId === marsB.rashiId) {
    score += 10;
    details.push({ en: 'Your Venus ignites their Mars — intense romantic chemistry', si: 'ඔබේ සිකුරු ඔවුන්ගේ කුජ දැල්වෙයි — තීව්‍ර ආදර රසායනය' });
  }
  if (venusB.rashiId === marsA.rashiId) {
    score += 10;
    details.push({ en: 'Their Venus ignites your Mars — powerful mutual desire', si: 'ඔවුන්ගේ සිකුරු ඔබේ කුජ දැල්වෙයි — බලවත් අන්‍යෝන්‍ය ආශාව' });
  }

  // Venus-Venus harmony (same sign or friendly signs)
  if (venusA.rashiId === venusB.rashiId) {
    score += 5;
    details.push({ en: 'Venus alignment — you share the same love language', si: 'සිකුරු ගැලපීම — ඔබ එකම ආදර භාෂාව බෙදා ගනියි' });
  }

  // Mars-Mars compatibility
  const marsDistance = getHouseDistance(marsA.rashiId, marsB.rashiId);
  if (marsDistance === 1 || marsDistance === 5 || marsDistance === 9) {
    score += 3; // Trikona — harmonious energy
    details.push({ en: 'Mars trine — your drive and passion flow together', si: 'කුජ ත්‍රිකෝණ — ඔබේ ප්‍රේරණය හා ආවේගය එකට ගලා යයි' });
  }

  // If no aspects found, give base score
  if (score === 0) {
    score = 5;
    details.push({ en: 'Subtle romantic undertones between your charts', si: 'ඔබේ ලග්න අතර සියුම් ආදර අන්තර් ධාරා' });
  }

  return {
    name: 'Venus-Mars Spark',
    nameEn: 'Venus-Mars Spark',
    nameSi: 'සිකුරු-කුජ ආවේගය',
    score: Math.min(25, score),
    maxScore: 25,
    details,
  };
}

/**
 * Factor 2: 7th House Resonance (0–20)
 * Checks if one person's planets fall in the other's 7th house
 */
function calculate7thHouseResonance(personA, personB) {
  let score = 0;
  let details = [];

  // 7th house from Lagna
  const a7thRashi = ((personA.lagnaRashiId - 1 + 6) % 12) + 1;
  const b7thRashi = ((personB.lagnaRashiId - 1 + 6) % 12) + 1;

  const importantPlanets = ['sun', 'moon', 'venus', 'jupiter', 'mars'];

  // Check A's planets in B's 7th house
  for (const p of importantPlanets) {
    if (personA[p] && personA[p].rashiId === b7thRashi) {
      score += 4;
      details.push({
        en: `Your ${personA[p].english || p} activates their partnership house`,
        si: `ඔබේ ${personA[p].sinhala || p} ඔවුන්ගේ සහකරු භාවය සක්‍රීය කරයි`,
      });
    }
  }

  // Check B's planets in A's 7th house
  for (const p of importantPlanets) {
    if (personB[p] && personB[p].rashiId === a7thRashi) {
      score += 4;
      details.push({
        en: `Their ${personB[p].english || p} activates your partnership house`,
        si: `ඔවුන්ගේ ${personB[p].sinhala || p} ඔබේ සහකරු භාවය සක්‍රීය කරයි`,
      });
    }
  }

  if (score === 0) {
    score = 5;
    details.push({ en: 'A gentle partnership pull exists between you', si: 'ඔබ අතර මෘදු සහකරු ආකර්ෂණයක් පවතී' });
  }

  return {
    name: '7th House Resonance',
    nameEn: '7th House Resonance',
    nameSi: '7 වන භාවය අනුනාදය',
    score: Math.min(20, score),
    maxScore: 20,
    details,
  };
}

/**
 * Factor 3: Nakshatra Lord Affinity (0–15)
 * Checks whether birth Nakshatra lords are friendly
 */
function calculateNakshatraLordAffinity(personA, personB) {
  const lordA = personA.nakshatra?.lord || 'Moon';
  const lordB = personB.nakshatra?.lord || 'Moon';
  let score = 0;
  let details = [];

  // Same lord = perfect wavelength
  if (lordA === lordB) {
    score = 15;
    details.push({ en: `Both ruled by ${lordA} — you vibrate on the same frequency`, si: `දෙදෙනාම ${lordA} විසින් පාලනය වේ — ඔබ එකම සංඛ්‍යාතයෙන් කම්පනය වේ` });
  } else {
    const friendshipA = PLANET_FRIENDSHIPS[lordA];
    const friendshipB = PLANET_FRIENDSHIPS[lordB];

    const aFeelsAboutB = friendshipA?.friends?.includes(lordB) ? 'friend'
      : friendshipA?.enemies?.includes(lordB) ? 'enemy' : 'neutral';
    const bFeelsAboutA = friendshipB?.friends?.includes(lordA) ? 'friend'
      : friendshipB?.enemies?.includes(lordA) ? 'enemy' : 'neutral';

    if (aFeelsAboutB === 'friend' && bFeelsAboutA === 'friend') {
      score = 13;
      details.push({ en: 'Mutual planetary friendship — natural energetic harmony', si: 'අන්‍යෝන්‍ය ග්‍රහ මිත්‍රත්වය — ස්වාභාවික ශක්ති සමංගිය' });
    } else if (aFeelsAboutB === 'friend' || bFeelsAboutA === 'friend') {
      score = 10;
      details.push({ en: 'One-sided planetary friendship — attraction flows more in one direction', si: 'එකපාර්ශ්වික ග්‍රහ මිත්‍රත්වය — ආකර්ෂණය එක දිශාවකට වැඩිය ගලා යයි' });
    } else if (aFeelsAboutB === 'neutral' && bFeelsAboutA === 'neutral') {
      score = 7;
      details.push({ en: 'Neutral energy — steady but unexciting connection', si: 'මධ්‍යස්ථ ශක්තිය — ස්ථාවර නමුත් උද්දීපනයක් නැති සම්බන්ධයක්' });
    } else if (aFeelsAboutB === 'enemy' && bFeelsAboutA === 'enemy') {
      score = 2;
      details.push({ en: 'Planetary tension — friction creates intensity but challenges', si: 'ග්‍රහ ආතතිය — ඝර්ෂණය තීව්‍රතාවය නිර්මාණය කරයි නමුත් අභියෝග' });
    } else {
      score = 5;
      details.push({ en: 'Mixed planetary energy — an intriguing push-pull dynamic', si: 'මිශ්‍ර ග්‍රහ ශක්තිය — සිත් ඇදගන්නා තල්ලු-ඇදීමේ ගතික' });
    }
  }

  return {
    name: 'Nakshatra Lord Affinity',
    nameEn: 'Nakshatra Lord Affinity',
    nameSi: 'නක්ෂත්‍ර අධිපති සමීපතාව',
    score: Math.min(15, score),
    maxScore: 15,
    details,
  };
}

/**
 * Factor 4: Rahu-Ketu Karmic Axis (0–20)
 * Checks for fated connection via nodal axis overlap
 */
function calculateRahuKetuAxis(personA, personB) {
  let score = 0;
  let details = [];

  const rahuA = personA.rahu;
  const ketuA = personA.ketu;
  const rahuB = personB.rahu;
  const ketuB = personB.ketu;

  // Rahu-Ketu conjunction across charts (same sign)
  if (rahuA.rashiId === rahuB.rashiId) {
    score += 6;
    details.push({ en: 'Shared Rahu axis — you seek the same karmic lessons', si: 'හවුල් රාහු අක්ෂය — ඔබ එකම කාර්මික පාඩම් සොයයි' });
  }
  if (ketuA.rashiId === ketuB.rashiId) {
    score += 6;
    details.push({ en: 'Shared Ketu axis — past-life familiarity', si: 'හවුල් කේතු අක්ෂය — පූර්ව ජන්ම පරිචිතත්වය' });
  }

  // A's Rahu on B's Ketu (or vice versa) — strongest karmic bond
  if (rahuA.rashiId === ketuB.rashiId) {
    score += 10;
    details.push({ en: 'Rahu-Ketu axis exchange — a deeply fated bond from past lives', si: 'රාහු-කේතු අක්ෂ හුවමාරුව — පූර්ව ජන්මවලින් ගැඹුරු ඉරණම් බැඳුමක්' });
  }
  if (rahuB.rashiId === ketuA.rashiId) {
    score += 10;
    details.push({ en: 'Karmic axis alignment — the universe brought you together for a purpose', si: 'කාර්මික අක්ෂ පෙළගැස්ම — විශ්වය ඔබව අරමුණක් සඳහා එකට ගෙනාවා' });
  }

  // Rahu/Ketu on important planets (Sun, Moon, Venus)
  const aSoulPlanets = [personA.sun, personA.moon, personA.venus].filter(Boolean);
  const bSoulPlanets = [personB.sun, personB.moon, personB.venus].filter(Boolean);

  for (const p of aSoulPlanets) {
    if (p.rashiId === rahuB.rashiId || p.rashiId === ketuB.rashiId) {
      score += 3;
      details.push({
        en: `Their nodes touch your ${p.english || 'planet'} — magnetic soul pull`,
        si: `ඔවුන්ගේ නෝඩ ඔබේ ${p.sinhala || 'ග්‍රහයා'} ස්පර්ශ කරයි — චුම්බක ආත්ම ඇදීම`,
      });
      break; // One is enough
    }
  }
  for (const p of bSoulPlanets) {
    if (p.rashiId === rahuA.rashiId || p.rashiId === ketuA.rashiId) {
      score += 3;
      details.push({
        en: `Your nodes touch their ${p.english || 'planet'} — destined encounter`,
        si: `ඔබේ නෝඩ ඔවුන්ගේ ${p.sinhala || 'ග්‍රහයා'} ස්පර්ශ කරයි — ඉරණමේ හමුවීම`,
      });
      break;
    }
  }

  if (score === 0) {
    score = 4;
    details.push({ en: 'No strong karmic axis overlap — a fresh connection', si: 'ශක්තිමත් කාර්මික අක්ෂ අතිච්ඡාදනයක් නැත — අළුත් සම්බන්ධයක්' });
  }

  return {
    name: 'Rahu-Ketu Karmic Axis',
    nameEn: 'Rahu-Ketu Karmic Axis',
    nameSi: 'රාහු-කේතු කාර්මික අක්ෂය',
    score: Math.min(20, score),
    maxScore: 20,
    details,
  };
}

/**
 * Factor 5: Moon Emotional Sync (0–20)
 * Measures emotional attunement through Moon sign + Nakshatra
 */
function calculateMoonSync(personA, personB) {
  let score = 0;
  let details = [];

  const moonDistRashi = getHouseDistance(personA.moonRashiId, personB.moonRashiId);

  // Same Moon sign — deep emotional resonance
  if (moonDistRashi === 1) {
    score += 12;
    details.push({ en: 'Same Moon sign — you feel each other\'s emotions deeply', si: 'එකම චන්ද්‍ර රාශිය — ඔබ එකිනෙකාගේ හැඟීම් ගැඹුරින් දැනේ' });
  }
  // Trikona (5th, 9th) — harmonious emotional flow
  else if (moonDistRashi === 5 || moonDistRashi === 9) {
    score += 10;
    details.push({ en: 'Moon trine — natural emotional understanding', si: 'චන්ද්‍ර ත්‍රිකෝණ — ස්වාභාවික චිත්තවේගීය අවබෝධය' });
  }
  // Kendra (4th, 7th, 10th) — strong but can be tense
  else if (moonDistRashi === 4 || moonDistRashi === 7 || moonDistRashi === 10) {
    score += 8;
    details.push({ en: 'Moon square/opposition — magnetic emotional tension', si: 'චන්ද්‍ර චතුරස්‍ර/විරුද්ධ — චුම්බක චිත්තවේගීය ආතතිය' });
  }
  // 2-12 or 6-8 — challenging
  else if (moonDistRashi === 2 || moonDistRashi === 12) {
    score += 5;
    details.push({ en: 'Adjacent Moon signs — you complement what the other lacks', si: 'යාබද චන්ද්‍ර රාශි — ඔබ අනෙකාට නැති දේ සම්පූර්ණ කරයි' });
  }
  else if (moonDistRashi === 6 || moonDistRashi === 8) {
    score += 3;
    details.push({ en: 'Challenging Moon position — emotional growth through friction', si: 'අභියෝගාත්මක චන්ද්‍ර ස්ථානය — ඝර්ෂණය තුළින් චිත්තවේගීය වර්ධනය' });
  }
  else {
    score += 6;
    details.push({ en: 'Moderate emotional connection — builds over time', si: 'මධ්‍යස්ථ චිත්තවේගීය සම්බන්ධය — කාලය සමඟ ගොඩනැගේ' });
  }

  // Nakshatra emotional compatibility (same Nakshatra = bonus)
  if (personA.nakshatra?.name === personB.nakshatra?.name) {
    score += 8;
    details.push({ en: 'Same birth Nakshatra — a rare soul mirror', si: 'එකම උපන් නක්ෂත්‍රය — දුර්ලභ ආත්ම දර්පණයක්' });
  }

  if (score === 0) {
    score = 4;
    details.push({ en: 'A gentle emotional thread connects you', si: 'මෘදු චිත්තවේගීය නූලක් ඔබව සම්බන්ධ කරයි' });
  }

  return {
    name: 'Moon Emotional Sync',
    nameEn: 'Moon Emotional Sync',
    nameSi: 'චන්ද්‍ර චිත්තවේගීය සමමුහුර්ත',
    score: Math.min(20, score),
    maxScore: 20,
    details,
  };
}

/**
 * Build a person's chart data for magnetism calculation
 */
function buildPersonData(birthDate, lat, lng) {
  const planets = getAllPlanetPositions(birthDate, lat, lng);
  const houseChart = buildHouseChart(birthDate, lat, lng);
  const lagnaRashiId = houseChart.lagna ? houseChart.lagna.rashi.id : 1;

  const moonSidereal = planets.moon.sidereal;
  const nakshatra = getNakshatra(moonSidereal);
  const moonRashi = getRashi(moonSidereal);

  return {
    sun: { rashiId: planets.sun.rashiId, sidereal: planets.sun.sidereal, english: 'Sun', sinhala: 'ඉර' },
    moon: { rashiId: planets.moon.rashiId, sidereal: planets.moon.sidereal, english: 'Moon', sinhala: 'හඳ' },
    mars: { rashiId: planets.mars.rashiId, sidereal: planets.mars.sidereal, english: 'Mars', sinhala: 'කුජ' },
    mercury: { rashiId: planets.mercury.rashiId, sidereal: planets.mercury.sidereal, english: 'Mercury', sinhala: 'බුධ' },
    jupiter: { rashiId: planets.jupiter.rashiId, sidereal: planets.jupiter.sidereal, english: 'Jupiter', sinhala: 'ගුරු' },
    venus: { rashiId: planets.venus.rashiId, sidereal: planets.venus.sidereal, english: 'Venus', sinhala: 'සිකුරු' },
    saturn: { rashiId: planets.saturn.rashiId, sidereal: planets.saturn.sidereal, english: 'Saturn', sinhala: 'සෙනසුරු' },
    rahu: { rashiId: planets.rahu.rashiId, sidereal: planets.rahu.sidereal, english: 'Rahu', sinhala: 'රාහු' },
    ketu: { rashiId: planets.ketu.rashiId, sidereal: planets.ketu.sidereal, english: 'Ketu', sinhala: 'කේතු' },
    lagnaRashiId,
    nakshatra,
    moonRashiId: moonRashi.id,
  };
}

/**
 * Calculate Attraction Magnetism between two people
 * 
 * @param {Date} personABirthDate - First person's birth date
 * @param {Date} personBBirthDate - Second person's birth date
 * @param {number} personALat - First person's latitude
 * @param {number} personALng - First person's longitude
 * @param {number} personBLat - Second person's latitude
 * @param {number} personBLng - Second person's longitude
 * @returns {Object} Magnetism score and factor breakdown
 */
function calculateMagnetism(personABirthDate, personBBirthDate, personALat = 6.9271, personALng = 79.8612, personBLat = 6.9271, personBLng = 79.8612) {
  const personA = buildPersonData(personABirthDate, personALat, personALng);
  const personB = buildPersonData(personBBirthDate, personBLat, personBLng);

  const factors = [
    calculateVenusMarsSpark(personA, personB),
    calculate7thHouseResonance(personA, personB),
    calculateNakshatraLordAffinity(personA, personB),
    calculateRahuKetuAxis(personA, personB),
    calculateMoonSync(personA, personB),
  ];

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  const maxPossible = 100;
  const percentage = Math.round((totalScore / maxPossible) * 100);

  // Rating
  let ratingEn, ratingSi, ratingEmoji;
  if (percentage >= 80) {
    ratingEn = 'Magnetic'; ratingSi = 'චුම්බක'; ratingEmoji = '🔥';
  } else if (percentage >= 65) {
    ratingEn = 'Strong Pull'; ratingSi = 'ශක්තිමත් ඇදීම'; ratingEmoji = '💫';
  } else if (percentage >= 50) {
    ratingEn = 'Warm Attraction'; ratingSi = 'උණුසුම් ආකර්ෂණය'; ratingEmoji = '✨';
  } else if (percentage >= 35) {
    ratingEn = 'Gentle Draw'; ratingSi = 'මෘදු ඇදීම'; ratingEmoji = '🌙';
  } else {
    ratingEn = 'Subtle'; ratingSi = 'සියුම්'; ratingEmoji = '🌟';
  }

  // Strongest factor
  const strongest = factors.reduce((a, b) => (a.score / a.maxScore) > (b.score / b.maxScore) ? a : b);

  return {
    totalScore,
    maxScore: maxPossible,
    percentage,
    rating: { en: ratingEn, si: ratingSi, emoji: ratingEmoji },
    factors,
    strongestFactor: {
      name: strongest.nameEn,
      nameSi: strongest.nameSi,
      score: strongest.score,
      maxScore: strongest.maxScore,
    },
    summary: {
      en: `Magnetic Pull: ${percentage}% — ${ratingEn}. Your strongest connection is through ${strongest.nameEn.toLowerCase()}.`,
      si: `චුම්බක ඇදීම: ${percentage}% — ${ratingSi}. ඔබේ ශක්තිමත්ම සම්බන්ධය ${strongest.nameSi} හරහායි.`,
    },
  };
}


module.exports = {
  getManifestationScore,
  calculateMagnetism,
};
