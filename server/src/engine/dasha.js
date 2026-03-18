/**
 * Multi-Dasha System Engine
 *
 * Implements three Dasha systems alongside the existing Vimshottari:
 *   1. Yogini Dasha   — 36-year cycle, 8 yoginis, excellent for short-term event timing
 *   2. Chara Dasha    — Jaimini sign-based, strong for career/relationship milestones
 *   3. Narayana Dasha  — Sign-based, complementary to Vimshottari for life themes
 *
 * Cross-validates predictions across systems to produce confidence scores.
 */

const { getAllPlanetPositions, getNakshatra, getRashi, getLagna, getAyanamsha, toSidereal, getMoonLongitude, dateToJD } = require('./astrology');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. YOGINI DASHA — 36-year cycle
// ═══════════════════════════════════════════════════════════════════════════════

const YOGINI_LORDS = [
  { name: 'Mangala',    planet: 'Moon',    years: 1, sinhala: 'මංගලා' },
  { name: 'Pingala',    planet: 'Sun',     years: 2, sinhala: 'පිංගලා' },
  { name: 'Dhanya',     planet: 'Jupiter', years: 3, sinhala: 'ධන්‍යා' },
  { name: 'Bhramari',   planet: 'Mars',    years: 4, sinhala: 'භ්‍රාමරි' },
  { name: 'Bhadrika',   planet: 'Mercury', years: 5, sinhala: 'භද්‍රිකා' },
  { name: 'Ulka',       planet: 'Saturn',  years: 6, sinhala: 'උල්කා' },
  { name: 'Siddha',     planet: 'Venus',   years: 7, sinhala: 'සිද්ධා' },
  { name: 'Sankata',    planet: 'Rahu',    years: 8, sinhala: 'සංකටා' },
];

const YOGINI_TOTAL_YEARS = 36; // sum of all yogini periods

/**
 * Calculate Yogini Dasha from Moon's Nakshatra at birth.
 * Yogini index = (Nakshatra number + 3) % 8
 */
function calculateYoginiDasha(moonSidereal, birthDate) {
  const nakIndex = Math.floor(moonSidereal / (360 / 27)); // 0-based
  const degreesInNak = moonSidereal % (360 / 27);
  const fractionRemaining = 1 - degreesInNak / (360 / 27);

  // Yogini starting index: (nakshatra_number + 3) mod 8
  // nakshatra_number is 1-based in traditional texts
  const yoginiStartIdx = (nakIndex + 1 + 3) % 8;

  const dashas = [];
  let currentDate = new Date(birthDate);

  // First dasha has only the remaining portion
  const firstYogini = YOGINI_LORDS[yoginiStartIdx];
  const firstDurationYears = firstYogini.years * fractionRemaining;
  const firstEndDate = addYears(currentDate, firstDurationYears);

  dashas.push({
    lord: firstYogini.name,
    planet: firstYogini.planet,
    sinhala: firstYogini.sinhala,
    years: firstYogini.years,
    actualYears: firstDurationYears,
    start: new Date(currentDate),
    end: firstEndDate,
    isBalance: true,
  });
  currentDate = firstEndDate;

  // Subsequent full cycles
  for (let cycle = 0; cycle < 4; cycle++) {
    for (let i = 0; i < 8; i++) {
      const idx = (yoginiStartIdx + 1 + i) % 8;
      if (cycle === 0 && i === 7) break; // don't double-count
      const yogini = YOGINI_LORDS[idx];
      const endDate = addYears(currentDate, yogini.years);
      dashas.push({
        lord: yogini.name,
        planet: yogini.planet,
        sinhala: yogini.sinhala,
        years: yogini.years,
        actualYears: yogini.years,
        start: new Date(currentDate),
        end: endDate,
      });
      currentDate = endDate;
    }
  }

  return {
    system: 'yogini',
    totalCycle: YOGINI_TOTAL_YEARS,
    dashas: dashas.slice(0, 25), // ~100 years
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CHARA DASHA (Jaimini) — Sign-based
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chara Dasha follows signs starting from the Lagna sign.
 * Duration depends on whether the sign is odd or even, and the degree of the
 * sign lord within its placed sign.
 *
 * Odd signs (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius): count forward
 * Even signs (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces): count backward
 */
const SIGN_LORDS = {
  1: 'mars', 2: 'venus', 3: 'mercury', 4: 'moon',
  5: 'sun', 6: 'mercury', 7: 'venus', 8: 'mars',
  9: 'jupiter', 10: 'saturn', 11: 'saturn', 12: 'jupiter',
};

function isOddSign(rashiId) {
  return rashiId % 2 === 1;
}

function charaDashaDuration(rashiId, planets) {
  const lordKey = SIGN_LORDS[rashiId];
  const lord = planets[lordKey];
  if (!lord) return 12;

  // Duration = distance of the lord from its sign (in whole signs)
  const lordRashiId = lord.rashiId;
  let distance;
  if (isOddSign(rashiId)) {
    distance = ((lordRashiId - rashiId) % 12 + 12) % 12;
  } else {
    distance = ((rashiId - lordRashiId) % 12 + 12) % 12;
  }

  // If lord is in own sign, duration = 12 years
  return distance === 0 ? 12 : distance;
}

function calculateCharaDasha(birthDate, lat, lng) {
  const planets = getAllPlanetPositions(birthDate, lat, lng);
  const lagna = getLagna(birthDate, lat, lng);
  const lagnaRashiId = lagna.rashi.id;

  const dashas = [];
  let currentDate = new Date(birthDate);

  // Start from Lagna sign, advance through all 12 signs
  // Direction: if Lagna is odd sign → forward, else → backward
  const forward = isOddSign(lagnaRashiId);

  for (let cycle = 0; cycle < 2; cycle++) { // 2 cycles covers ~120+ years
    for (let i = 0; i < 12; i++) {
      let signIdx;
      if (forward) {
        signIdx = ((lagnaRashiId - 1 + i) % 12) + 1;
      } else {
        signIdx = ((lagnaRashiId - 1 - i + 24) % 12) + 1;
      }

      const duration = charaDashaDuration(signIdx, planets);
      const endDate = addYears(currentDate, duration);
      const rashi = getRashi(((signIdx - 1) * 30) + 1);

      dashas.push({
        sign: rashi.name,
        signEnglish: rashi.english,
        signSinhala: rashi.sinhala,
        rashiId: signIdx,
        years: duration,
        start: new Date(currentDate),
        end: endDate,
      });
      currentDate = endDate;
    }
  }

  return {
    system: 'chara',
    direction: forward ? 'forward' : 'backward',
    lagnaSign: lagnaRashiId,
    dashas,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. NARAYANA DASHA — Sign-based, from strongest Kendra
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Narayana Dasha starts from the sign in the 1st house (Lagna) of the D1 chart.
 * Duration is similar to Chara Dasha but considers the 7th lord for even signs.
 * This is a simplified Narayana Dasha implementation.
 */
function calculateNarayanaDasha(birthDate, lat, lng) {
  const planets = getAllPlanetPositions(birthDate, lat, lng);
  const lagna = getLagna(birthDate, lat, lng);
  const lagnaRashiId = lagna.rashi.id;

  const dashas = [];
  let currentDate = new Date(birthDate);
  const forward = isOddSign(lagnaRashiId);

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < 12; i++) {
      let signIdx;
      if (forward) {
        signIdx = ((lagnaRashiId - 1 + i) % 12) + 1;
      } else {
        signIdx = ((lagnaRashiId - 1 - i + 24) % 12) + 1;
      }

      const lordKey = SIGN_LORDS[signIdx];
      const lord = planets[lordKey];
      let duration;

      if (!lord) {
        duration = 12;
      } else {
        const lordRashiId = lord.rashiId;
        if (isOddSign(signIdx)) {
          duration = ((lordRashiId - signIdx) % 12 + 12) % 12;
        } else {
          duration = ((signIdx - lordRashiId) % 12 + 12) % 12;
        }
        if (duration === 0) duration = 12;

        // Narayana adds 1 year if sign contains an exalted planet
        const EXALTATION = { sun: 1, moon: 2, mars: 10, mercury: 6, jupiter: 4, venus: 12, saturn: 7 };
        for (const [pKey, exRashi] of Object.entries(EXALTATION)) {
          if (planets[pKey] && planets[pKey].rashiId === signIdx && exRashi === signIdx) {
            duration += 1;
            break;
          }
        }
      }

      const endDate = addYears(currentDate, duration);
      const rashi = getRashi(((signIdx - 1) * 30) + 1);

      dashas.push({
        sign: rashi.name,
        signEnglish: rashi.english,
        signSinhala: rashi.sinhala,
        rashiId: signIdx,
        years: duration,
        start: new Date(currentDate),
        end: endDate,
      });
      currentDate = endDate;
    }
  }

  return {
    system: 'narayana',
    direction: forward ? 'forward' : 'backward',
    lagnaSign: lagnaRashiId,
    dashas,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-SYSTEM CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find which Dasha period is active at a given date across all systems.
 */
function getActiveDashaAtDate(dashaResult, targetDate) {
  const ts = targetDate.getTime();
  return dashaResult.dashas.find(d => {
    const s = d.start instanceof Date ? d.start.getTime() : new Date(d.start).getTime();
    const e = (d.end || d.endDate);
    const eTs = e instanceof Date ? e.getTime() : new Date(e).getTime();
    return ts >= s && ts < eTs;
  }) || null;
}

/**
 * Cross-validate predictions: if multiple dasha systems indicate a similar
 * planetary/sign influence at a given time, confidence is higher.
 *
 * @param {Date} birthDate
 * @param {number} lat
 * @param {number} lng
 * @param {Date} targetDate - Date to analyze
 * @param {object} vimshottariResult - Existing Vimshottari dasha from astrology.js
 * @returns {object} Cross-system analysis with confidence score
 */
function crossValidateDashas(birthDate, lat, lng, targetDate, vimshottariResult) {
  const bd = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const td = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const planets = getAllPlanetPositions(bd, lat, lng);
  const moonSid = planets.moon.sidereal;

  const yogini = calculateYoginiDasha(moonSid, bd);
  const chara = calculateCharaDasha(bd, lat, lng);
  const narayana = calculateNarayanaDasha(bd, lat, lng);

  const activeYogini = getActiveDashaAtDate(yogini, td);
  const activeChara = getActiveDashaAtDate(chara, td);
  const activeNarayana = getActiveDashaAtDate(narayana, td);

  // Extract the dominant planet/sign from each system
  const influences = [];
  if (vimshottariResult) {
    const activeVim = getActiveDashaAtDate({ dashas: vimshottariResult }, td);
    if (activeVim) influences.push({ system: 'vimshottari', planet: activeVim.lord, type: 'planet' });
  }
  if (activeYogini) influences.push({ system: 'yogini', planet: activeYogini.planet, type: 'planet' });
  if (activeChara) influences.push({ system: 'chara', sign: activeChara.sign, rashiId: activeChara.rashiId, type: 'sign' });
  if (activeNarayana) influences.push({ system: 'narayana', sign: activeNarayana.sign, rashiId: activeNarayana.rashiId, type: 'sign' });

  // Count agreements: same planet or related sign lords
  let agreements = 0;
  let totalPairs = 0;
  for (let i = 0; i < influences.length; i++) {
    for (let j = i + 1; j < influences.length; j++) {
      totalPairs++;
      const a = influences[i];
      const b = influences[j];
      if (a.type === 'planet' && b.type === 'planet' && a.planet === b.planet) {
        agreements++;
      } else if (a.type === 'sign' && b.type === 'sign' && a.rashiId === b.rashiId) {
        agreements++;
      } else if (a.type === 'planet' && b.type === 'sign') {
        const signLord = SIGN_LORDS[b.rashiId];
        if (signLord && signLord.toLowerCase() === a.planet.toLowerCase()) agreements += 0.5;
      } else if (a.type === 'sign' && b.type === 'planet') {
        const signLord = SIGN_LORDS[a.rashiId];
        if (signLord && signLord.toLowerCase() === b.planet.toLowerCase()) agreements += 0.5;
      }
    }
  }

  const confidence = totalPairs > 0 ? Math.round((agreements / totalPairs) * 100) : 50;

  // Find active Vimshottari for return
  let activeVim = null;
  if (vimshottariResult) {
    activeVim = getActiveDashaAtDate({ dashas: vimshottariResult }, td);
  }

  return {
    targetDate: td.toISOString(),
    activePeriods: {
      yogini: activeYogini,
      chara: activeChara,
      narayana: activeNarayana,
    },
    activeVimshottari: activeVim,
    activeYogini,
    activeChara,
    activeNarayana,
    influences,
    agreements,
    totalPairs,
    confidenceScore: Math.min(100, 40 + confidence),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function addYears(date, years) {
  const ms = years * 365.25 * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + ms);
}

module.exports = {
  calculateYoginiDasha,
  calculateCharaDasha,
  calculateNarayanaDasha,
  crossValidateDashas,
  getActiveDashaAtDate,
  YOGINI_LORDS,
};
