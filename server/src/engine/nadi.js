// ═══════════════════════════════════════════════════════════════════════════
//  NADI ASTROLOGY ENGINE
//  Based on: "Nadi Astrology - Accurate Predictive Methodology" by Umang Taneja
//  
//  Core methodology:
//  1. Each planet signifies houses through: Position + Lordship (from Bhava Chalit)
//  2. Each planet's Nakshatra Lord adds its own house significations
//  3. Each planet's Sub-Lord adds its own house significations (STRONGEST)
//  4. Rahu/Ketu signify through: conjunction + aspects + sign lord
//  5. House groups determine events: Marriage=2,7,11 / Career=2,6,10,11 / etc.
//  6. Sub-Lord > Nakshatra Lord > Planet (strength hierarchy)
//  7. Cuspal Sub-Lord determines if house promises an event or denies it
// ═══════════════════════════════════════════════════════════════════════════

const RASHIS = [
  { id: 1, name: 'Mesha', english: 'Aries', lord: 'Mars' },
  { id: 2, name: 'Vrishabha', english: 'Taurus', lord: 'Venus' },
  { id: 3, name: 'Mithuna', english: 'Gemini', lord: 'Mercury' },
  { id: 4, name: 'Kataka', english: 'Cancer', lord: 'Moon' },
  { id: 5, name: 'Simha', english: 'Leo', lord: 'Sun' },
  { id: 6, name: 'Kanya', english: 'Virgo', lord: 'Mercury' },
  { id: 7, name: 'Tula', english: 'Libra', lord: 'Venus' },
  { id: 8, name: 'Vrischika', english: 'Scorpio', lord: 'Mars' },
  { id: 9, name: 'Dhanus', english: 'Sagittarius', lord: 'Jupiter' },
  { id: 10, name: 'Makara', english: 'Capricorn', lord: 'Saturn' },
  { id: 11, name: 'Kumbha', english: 'Aquarius', lord: 'Saturn' },
  { id: 12, name: 'Meena', english: 'Pisces', lord: 'Jupiter' },
];

const NAKSHATRAS = [
  { id: 1, name: 'Ashwini', lord: 'Ketu', start: 0 },
  { id: 2, name: 'Bharani', lord: 'Venus', start: 13.333 },
  { id: 3, name: 'Krittika', lord: 'Sun', start: 26.667 },
  { id: 4, name: 'Rohini', lord: 'Moon', start: 40 },
  { id: 5, name: 'Mrigashira', lord: 'Mars', start: 53.333 },
  { id: 6, name: 'Ardra', lord: 'Rahu', start: 66.667 },
  { id: 7, name: 'Punarvasu', lord: 'Jupiter', start: 80 },
  { id: 8, name: 'Pushya', lord: 'Saturn', start: 93.333 },
  { id: 9, name: 'Ashlesha', lord: 'Mercury', start: 106.667 },
  { id: 10, name: 'Magha', lord: 'Ketu', start: 120 },
  { id: 11, name: 'Purva Phalguni', lord: 'Venus', start: 133.333 },
  { id: 12, name: 'Uttara Phalguni', lord: 'Sun', start: 146.667 },
  { id: 13, name: 'Hasta', lord: 'Moon', start: 160 },
  { id: 14, name: 'Chitra', lord: 'Mars', start: 173.333 },
  { id: 15, name: 'Swati', lord: 'Rahu', start: 186.667 },
  { id: 16, name: 'Vishakha', lord: 'Jupiter', start: 200 },
  { id: 17, name: 'Anuradha', lord: 'Saturn', start: 213.333 },
  { id: 18, name: 'Jyeshtha', lord: 'Mercury', start: 226.667 },
  { id: 19, name: 'Mula', lord: 'Ketu', start: 240 },
  { id: 20, name: 'Purva Ashadha', lord: 'Venus', start: 253.333 },
  { id: 21, name: 'Uttara Ashadha', lord: 'Sun', start: 266.667 },
  { id: 22, name: 'Shravana', lord: 'Moon', start: 280 },
  { id: 23, name: 'Dhanishtha', lord: 'Mars', start: 293.333 },
  { id: 24, name: 'Shatabhisha', lord: 'Rahu', start: 306.667 },
  { id: 25, name: 'Purva Bhadrapada', lord: 'Jupiter', start: 320 },
  { id: 26, name: 'Uttara Bhadrapada', lord: 'Saturn', start: 333.333 },
  { id: 27, name: 'Revati', lord: 'Mercury', start: 346.667 },
];

// Vimshottari Dasha periods (years) — used for Sub-Lord calculations
const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17]; // Total = 120
const TOTAL_DASA = 120;

// Nadi Astrology aspects (from Chapter 1)
// All planets aspect 7th sign; Mars also aspects 4,8; Jupiter 5,9; Saturn 3,10; Rahu/Ketu 5,9
const NADI_ASPECTS = {
  Sun: [7], Moon: [7], Mercury: [7], Venus: [7],
  Mars: [7, 4, 8], Jupiter: [7, 5, 9], Saturn: [7, 3, 10],
  Rahu: [5, 9], Ketu: [5, 9],
};

// Separative planets (book Chapter 2)
const SEPARATIVE_PLANETS = ['Sun', 'Saturn', 'Rahu', 'Ketu'];

// Natural malefics and benefics (book Chapter 1)
const NATURAL_MALEFICS = ['Rahu', 'Ketu', 'Saturn', 'Mars'];
const NATURAL_BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon', 'Sun'];

// ═══════════════════════════════════════════════════════════════════════════
//  HOUSE GROUP DEFINITIONS (from all chapters)
// ═══════════════════════════════════════════════════════════════════════════

const HOUSE_GROUPS = {
  // Chapter 9: Marriage
  marriage: {
    positive: [2, 7, 11],       // Combination for marriage
    negative: [1, 6, 10],       // Negation of marriage
    facilitator: [5, 9, 8, 12], // 5=love, 8=sex/dowry, 9=fortune, 12=bed pleasures
    neutral: [3, 4],
    label: 'Marriage & Partnership',
  },
  // Chapter 8: Career — Service
  career_service: {
    positive: [2, 6, 10, 11],
    negative: [5, 8, 12],       // 5=12th from 6, 8=obstacles, 12=losses
    facilitator: [],
    neutral: [1, 3, 4, 7, 9],
    label: 'Career in Service/Job',
  },
  // Chapter 8: Career — Business
  career_business: {
    positive: [2, 7, 10, 11],
    negative: [5, 8, 12],
    facilitator: [],
    neutral: [1, 3, 4, 6, 9],
    label: 'Business & Entrepreneurship',
  },
  // Chapter 3: Education
  education: {
    positive: [4, 9, 11],       // Prime education houses
    negative: [6, 8, 12],       // Failures & obstacles
    facilitator: [5, 3, 2],     // 5=intelligence, 3=communication, 2=knowledge
    neutral: [1, 7, 10],
    label: 'Education & Learning',
  },
  // Chapter 10: Children
  children: {
    positive: [2, 5, 11],
    negative: [1, 4, 10],       // 1=12th from 2, 4=12th from 5, 10=12th from 11
    facilitator: [9],            // Promotes childbirth
    neutral: [3, 6, 7, 8, 12],
    label: 'Children & Progeny',
  },
  // Chapter 5: Property & Vehicle
  property: {
    positive: [4, 11, 12],      // 4=property, 11=gain, 12=investment
    negative: [3, 5, 6, 8],     // 3=12th from 4, 5=12th from 6
    facilitator: [2, 9],
    neutral: [1, 7, 10],
    label: 'Property & Assets',
  },
  // Chapter 7: Foreign Travel
  foreign_travel: {
    positive: [3, 9, 12],
    negative: [2, 4, 11],       // Return home combination
    facilitator: [],
    neutral: [1, 5, 6, 7, 8, 10],
    label: 'Foreign Travel & Settlement',
  },
  // Chapter 6: Health — Disease
  health_disease: {
    positive: [1, 6, 8, 12],    // Disease combination (positive = presence of disease)
    negative: [5, 11],           // Recovery/no disease
    facilitator: [],
    neutral: [2, 3, 4, 7, 9, 10],
    label: 'Health Challenges',
  },
  // Chapter 4: Litigation
  litigation: {
    positive: [6, 8, 12],       // Litigation involvement
    negative: [2, 10, 11],      // Success/winning
    facilitator: [],
    neutral: [1, 3, 4, 5, 7, 9],
    label: 'Legal Disputes',
  },
  // Chapter 12: Longevity — Life increasing
  longevity_good: {
    positive: [1, 5, 9, 10, 11],
    negative: [6, 8, 12],       // Death inflicting
    facilitator: [],
    neutral: [2, 3, 4, 7],
    label: 'Longevity & Vitality',
  },
  // Wealth accumulation (derived from career + property rules)
  wealth: {
    positive: [2, 6, 10, 11],   // Same as career service
    negative: [5, 8, 12],
    facilitator: [9],            // Fortune
    neutral: [1, 3, 4, 7],
    label: 'Wealth & Prosperity',
  },
  // Unearned wealth (Chapter 8 note: 8,11 = dowry, PF, insurance, lottery)
  windfall: {
    positive: [8, 11],
    negative: [5, 12],
    facilitator: [2],
    neutral: [1, 3, 4, 6, 7, 9, 10],
    label: 'Windfall & Unearned Income',
  },
  // Spiritual growth
  spiritual: {
    positive: [5, 9, 12],
    negative: [3, 6, 10],       // Worldly attachments
    facilitator: [1, 8],         // Self + transformation
    neutral: [2, 4, 7, 11],
    label: 'Spiritual Growth',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  CORE: BUILD NADI PLANET SIGNIFICATOR TABLE
//  This is the heart of the Nadi system.
//  For each planet, compute which houses it signifies through:
//    1. Planet level: Position (bhava chalit house) + Lordship (signs owned → houses)
//    2. Nakshatra level: The nakshatra lord's own position + lordship houses
//    3. Sub-Lord level: The sub-lord's own position + lordship houses (STRONGEST)
//  For Rahu/Ketu: conjunction + aspects received + sign lord dispositor
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the complete Nadi Significator Table for all planets.
 * 
 * @param {Object} bhavaChalit - From buildBhavaChalit()
 * @param {Object} houseChart - From buildHouseChart() (for lordship lookups)
 * @param {Object} planets - From getAllPlanetPositions()
 * @param {Object} lagnaRashi - Lagna rashi object {id, name, ...}
 * @param {Object} kpSubLords - From calculateKPSubLords() (optional, for sub-lord)
 * @returns {Object} Planet significator table
 */
function buildNadiSignificatorTable(bhavaChalit, houseChart, planets, lagnaRashi, kpSubLords) {
  const houses = houseChart.houses;
  const lagnaRashiId = lagnaRashi.id;

  // Helper: get house number for a given sign, relative to lagna
  function getHouseForSign(signId) {
    return ((signId - lagnaRashiId + 12) % 12) + 1;
  }

  // Helper: get all houses a planet lords over (by sign ownership)
  function getLordshipHouses(planetName) {
    const lordedHouses = [];
    for (const rashi of RASHIS) {
      if (rashi.lord === planetName) {
        const h = getHouseForSign(rashi.id);
        if (!lordedHouses.includes(h)) lordedHouses.push(h);
      }
    }
    return lordedHouses.sort((a, b) => a - b);
  }

  // Helper: get the Bhava Chalit house number for a planet
  function getBhavaChalitHouse(planetName) {
    if (!bhavaChalit || !bhavaChalit.houses) {
      // Fallback to whole-sign house
      const h = houses.find(h => h.planets.some(p => p.name === planetName));
      return h ? h.houseNumber : 0;
    }
    for (const h of bhavaChalit.houses) {
      if (h.planets.some(p => p.name === planetName)) {
        return h.houseNumber;
      }
    }
    // Fallback
    const wsh = houses.find(h => h.planets.some(p => p.name === planetName));
    return wsh ? wsh.houseNumber : 0;
  }

  // Helper: get Nakshatra Lord for a planet
  function getNakshatraLord(planetKey) {
    const p = planets[planetKey];
    if (!p) return null;
    const siderealDeg = p.sidereal;
    const nakshatraIndex = Math.floor(siderealDeg / (360 / 27));
    return NAKSHATRAS[Math.min(nakshatraIndex, 26)]?.lord || null;
  }

  // Helper: get Sub-Lord for a planet (from KP system)
  function getSubLord(planetKey) {
    if (kpSubLords && kpSubLords[planetKey]) {
      return kpSubLords[planetKey].subLord;
    }
    // Fallback: calculate sub-lord from scratch
    const p = planets[planetKey];
    if (!p) return null;
    const siderealDeg = p.sidereal;
    const nakshatraSpan = 360 / 27;
    const nakshatraIndex = Math.floor(siderealDeg / nakshatraSpan);
    const starLord = NAKSHATRAS[Math.min(nakshatraIndex, 26)]?.lord;
    const degreeInNakshatra = siderealDeg % nakshatraSpan;
    const starLordIndex = DASA_LORDS.indexOf(starLord);
    if (starLordIndex === -1) return starLord;

    let accumulated = 0;
    for (let i = 0; i < 9; i++) {
      const idx = (starLordIndex + i) % 9;
      const proportion = DASA_YEARS[idx] / TOTAL_DASA;
      const subSpan = nakshatraSpan * proportion;
      if (accumulated + subSpan > degreeInNakshatra) {
        return DASA_LORDS[idx];
      }
      accumulated += subSpan;
    }
    return starLord;
  }

  // Helper: check if two planets are conjunct (same sign)
  function areConjunct(p1Key, p2Key) {
    const p1 = planets[p1Key];
    const p2 = planets[p2Key];
    if (!p1 || !p2) return false;
    return p1.rashiId === p2.rashiId;
  }

  // Helper: check if planet1 aspects planet2 (Nadi aspects, sign-based)
  function doesAspect(aspectingPlanetName, targetPlanetKey) {
    const aspectingKey = Object.keys(planets).find(k => planets[k].name === aspectingPlanetName);
    if (!aspectingKey) return false;
    const asp = planets[aspectingKey];
    const tgt = planets[targetPlanetKey];
    if (!asp || !tgt) return false;

    const aspSignIndex = asp.rashiId;
    const tgtSignIndex = tgt.rashiId;
    const diff = ((tgtSignIndex - aspSignIndex + 12) % 12);
    const aspects = NADI_ASPECTS[aspectingPlanetName] || [7];
    return aspects.includes(diff);
  }

  // ═══════════════════════════════════════════════════════════════
  // Build significator chain for each planet
  // ═══════════════════════════════════════════════════════════════
  const significatorTable = {};
  const planetKeys = Object.keys(planets).filter(k => k !== 'Lagna');

  for (const key of planetKeys) {
    const p = planets[key];
    const planetName = p.name;

    // ── LEVEL 1: Planet's own houses (position + lordship in Bhava Chalit) ──
    let planetHouses = [];
    const bhavaHouse = getBhavaChalitHouse(planetName);
    if (bhavaHouse > 0) planetHouses.push(bhavaHouse);

    // For Rahu/Ketu: special rules from book
    if (planetName === 'Rahu' || planetName === 'Ketu') {
      // 1) Results of conjunct planets
      for (const otherKey of planetKeys) {
        if (otherKey === key) continue;
        if (areConjunct(key, otherKey)) {
          const otherName = planets[otherKey].name;
          if (otherName !== 'Rahu' && otherName !== 'Ketu') {
            const otherH = getBhavaChalitHouse(otherName);
            if (otherH > 0) planetHouses.push(otherH);
            planetHouses.push(...getLordshipHouses(otherName));
          }
        }
      }
      // 2) Results of planets aspecting Rahu/Ketu
      for (const otherKey of planetKeys) {
        if (otherKey === key) continue;
        const otherName = planets[otherKey].name;
        if (otherName === 'Rahu' || otherName === 'Ketu') continue;
        if (doesAspect(otherName, key)) {
          const otherH = getBhavaChalitHouse(otherName);
          if (otherH > 0) planetHouses.push(otherH);
          planetHouses.push(...getLordshipHouses(otherName));
        }
      }
      // 3) Results of sign lord (dispositor)
      const signLord = RASHIS[p.rashiId - 1]?.lord;
      if (signLord && signLord !== 'Rahu' && signLord !== 'Ketu') {
        const dispH = getBhavaChalitHouse(signLord);
        if (dispH > 0) planetHouses.push(dispH);
        planetHouses.push(...getLordshipHouses(signLord));
      }
    } else {
      // Normal planets: add lordship houses
      planetHouses.push(...getLordshipHouses(planetName));
    }

    // Deduplicate
    planetHouses = [...new Set(planetHouses)].sort((a, b) => a - b);

    // ── LEVEL 2: Nakshatra Lord's houses ──
    const nakshatraLord = getNakshatraLord(key);
    let nakshatraHouses = [];
    if (nakshatraLord) {
      if (nakshatraLord === 'Rahu' || nakshatraLord === 'Ketu') {
        // For Rahu/Ketu as nakshatra lords, get their full significator chain
        const nlKey = Object.keys(planets).find(k => planets[k].name === nakshatraLord);
        if (nlKey) {
          const nlBhavaH = getBhavaChalitHouse(nakshatraLord);
          if (nlBhavaH > 0) nakshatraHouses.push(nlBhavaH);
          // Rahu/Ketu take results of conjunct, aspected, and sign lord
          for (const otherKey of planetKeys) {
            if (otherKey === nlKey) continue;
            if (areConjunct(nlKey, otherKey)) {
              const otherName = planets[otherKey].name;
              if (otherName !== 'Rahu' && otherName !== 'Ketu') {
                const h = getBhavaChalitHouse(otherName);
                if (h > 0) nakshatraHouses.push(h);
                nakshatraHouses.push(...getLordshipHouses(otherName));
              }
            }
          }
          for (const otherKey of planetKeys) {
            if (otherKey === nlKey) continue;
            const otherName = planets[otherKey].name;
            if (otherName === 'Rahu' || otherName === 'Ketu') continue;
            if (doesAspect(otherName, nlKey)) {
              const h = getBhavaChalitHouse(otherName);
              if (h > 0) nakshatraHouses.push(h);
              nakshatraHouses.push(...getLordshipHouses(otherName));
            }
          }
          const signLord = RASHIS[planets[nlKey].rashiId - 1]?.lord;
          if (signLord && signLord !== 'Rahu' && signLord !== 'Ketu') {
            const h = getBhavaChalitHouse(signLord);
            if (h > 0) nakshatraHouses.push(h);
            nakshatraHouses.push(...getLordshipHouses(signLord));
          }
        }
      } else {
        const nlBhavaH = getBhavaChalitHouse(nakshatraLord);
        if (nlBhavaH > 0) nakshatraHouses.push(nlBhavaH);
        nakshatraHouses.push(...getLordshipHouses(nakshatraLord));
      }
    }
    nakshatraHouses = [...new Set(nakshatraHouses)].sort((a, b) => a - b);

    // ── LEVEL 3: Sub-Lord's houses (STRONGEST per Nadi rules) ──
    const subLord = getSubLord(key);
    let subLordHouses = [];
    if (subLord) {
      if (subLord === 'Rahu' || subLord === 'Ketu') {
        const slKey = Object.keys(planets).find(k => planets[k].name === subLord);
        if (slKey) {
          const slBhavaH = getBhavaChalitHouse(subLord);
          if (slBhavaH > 0) subLordHouses.push(slBhavaH);
          for (const otherKey of planetKeys) {
            if (otherKey === slKey) continue;
            if (areConjunct(slKey, otherKey)) {
              const otherName = planets[otherKey].name;
              if (otherName !== 'Rahu' && otherName !== 'Ketu') {
                const h = getBhavaChalitHouse(otherName);
                if (h > 0) subLordHouses.push(h);
                subLordHouses.push(...getLordshipHouses(otherName));
              }
            }
          }
          for (const otherKey of planetKeys) {
            if (otherKey === slKey) continue;
            const otherName = planets[otherKey].name;
            if (otherName === 'Rahu' || otherName === 'Ketu') continue;
            if (doesAspect(otherName, slKey)) {
              const h = getBhavaChalitHouse(otherName);
              if (h > 0) subLordHouses.push(h);
              subLordHouses.push(...getLordshipHouses(otherName));
            }
          }
          const signLord = RASHIS[planets[slKey].rashiId - 1]?.lord;
          if (signLord && signLord !== 'Rahu' && signLord !== 'Ketu') {
            const h = getBhavaChalitHouse(signLord);
            if (h > 0) subLordHouses.push(h);
            subLordHouses.push(...getLordshipHouses(signLord));
          }
        }
      } else {
        const slBhavaH = getBhavaChalitHouse(subLord);
        if (slBhavaH > 0) subLordHouses.push(slBhavaH);
        subLordHouses.push(...getLordshipHouses(subLord));
      }
    }
    subLordHouses = [...new Set(subLordHouses)].sort((a, b) => a - b);

    // ── Combined houses (all levels merged) ──
    const allHouses = [...new Set([...planetHouses, ...nakshatraHouses, ...subLordHouses])].sort((a, b) => a - b);

    significatorTable[key] = {
      name: planetName,
      planet: { houses: planetHouses, description: planetHouses.join(',') },
      nakshatra: { lord: nakshatraLord, houses: nakshatraHouses, description: nakshatraHouses.join(',') },
      subLord: { lord: subLord, houses: subLordHouses, description: subLordHouses.join(',') },
      allHouses,
      allHousesDescription: allHouses.join(','),
      // Book format: "Planet  Nak  Sub"
      chain: `${planetName} ${planetHouses.join(',')}  |  ${nakshatraLord} ${nakshatraHouses.join(',')}  |  ${subLord} ${subLordHouses.join(',')}`,
    };
  }

  return significatorTable;
}


// ═══════════════════════════════════════════════════════════════════════════
//  CUSPAL SUB-LORD ANALYSIS
//  The Sub-Lord of each house cusp determines if that house promises 
//  its significations or denies them. This is fundamental to Nadi.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the cuspal sub-lord for each of the 12 houses.
 * Uses bhava chalit midpoints (or start degrees) as cusp positions.
 */
function calculateCuspalSubLords(bhavaChalit, lagnaRashiId) {
  if (!bhavaChalit || !bhavaChalit.houses) return null;

  const results = {};

  for (const h of bhavaChalit.houses) {
    const cuspDeg = h.midpoint !== undefined ? h.midpoint : h.start;
    if (cuspDeg === undefined) continue;

    // Find Nakshatra at cusp
    const nakshatraSpan = 360 / 27;
    const nakshatraIndex = Math.floor(cuspDeg / nakshatraSpan);
    const starLord = NAKSHATRAS[Math.min(nakshatraIndex, 26)]?.lord;
    const nakshatraName = NAKSHATRAS[Math.min(nakshatraIndex, 26)]?.name;

    // Find Sub-Lord at cusp
    const degreeInNakshatra = cuspDeg % nakshatraSpan;
    const starLordIndex = DASA_LORDS.indexOf(starLord);
    let subLord = starLord;

    if (starLordIndex !== -1) {
      let accumulated = 0;
      for (let i = 0; i < 9; i++) {
        const idx = (starLordIndex + i) % 9;
        const proportion = DASA_YEARS[idx] / TOTAL_DASA;
        const subSpan = nakshatraSpan * proportion;
        if (accumulated + subSpan > degreeInNakshatra) {
          subLord = DASA_LORDS[idx];
          break;
        }
        accumulated += subSpan;
      }
    }

    // Sign lord at cusp
    const signIndex = Math.floor(cuspDeg / 30);
    const signLord = RASHIS[Math.min(signIndex, 11)]?.lord;

    results[h.houseNumber] = {
      houseNumber: h.houseNumber,
      cuspDegree: cuspDeg.toFixed(4),
      signLord,
      starLord,
      nakshatraName,
      subLord,
      chain: `${signLord} → ${starLord} → ${subLord}`,
    };
  }

  return results;
}


// ═══════════════════════════════════════════════════════════════════════════
//  EVENT PREDICTION ENGINE
//  Uses the Nadi house groups + significator table to determine
//  strength of each planet for each event, and overall event promise.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze a planet's strength for a specific event (house group).
 * Returns a strength assessment at each level (Planet, Nakshatra, Sub-Lord)
 * and an overall verdict following the book's rules.
 * 
 * Book Rule 3: Sub-Lord > Nakshatra > Planet
 * Book Strength Assessment:
 *   - Sub-Lord + Nakshatra + Planet all signify → STRONGEST (event certain)
 *   - Sub-Lord signifies, Planet + Nakshatra negate → nearly impossible
 *   - Nakshatra + Planet signify, Sub-Lord negates → can happen eventually (weak)
 *   - Planet + Nakshatra neutral, Sub-Lord signifies → full strength
 *   - All three signify only facilitator houses → ordinary (needs other DBA support)
 *
 * IMPORTANT: "mixed" houses are very common since planets lord 2 signs spanning 
 * multiple houses. Pure negation (negates) is ONLY when a level has zero positive 
 * houses and one or more negative houses. Mixed-positive and mixed-negative are 
 * NOT the same as pure support/negation — they indicate the planet touches BOTH 
 * sides of the event and should be scored proportionally, not as binary denial.
 */
function analyzePlanetForEvent(planetSig, houseGroup) {
  const { positive, negative, facilitator, neutral } = houseGroup;

  function assessLevel(levelHouses) {
    let posCount = 0, negCount = 0, facCount = 0, neutCount = 0;
    for (const h of levelHouses) {
      if (positive.includes(h)) posCount++;
      else if (negative.includes(h)) negCount++;
      else if (facilitator && facilitator.includes(h)) facCount++;
      else neutCount++;
    }

    // Determine level verdict
    if (posCount > 0 && negCount === 0) return { verdict: 'supports', posCount, negCount, facCount, houses: levelHouses };
    if (posCount > 0 && negCount > 0) {
      // Mixed — use ratio to determine lean
      return posCount >= negCount
        ? { verdict: 'mixed-positive', posCount, negCount, facCount, houses: levelHouses }
        : { verdict: 'mixed-negative', posCount, negCount, facCount, houses: levelHouses };
    }
    if (posCount === 0 && negCount > 0) return { verdict: 'negates', posCount, negCount, facCount, houses: levelHouses };
    if (facCount > 0) return { verdict: 'facilitates', posCount, negCount, facCount, houses: levelHouses };
    return { verdict: 'neutral', posCount, negCount, facCount, houses: levelHouses };
  }

  const planetLevel = assessLevel(planetSig.planet.houses);
  const nakshatraLevel = assessLevel(planetSig.nakshatra.houses);
  const subLordLevel = assessLevel(planetSig.subLord.houses);

  // ── Overall strength determination (from book's rules) ──
  //
  // Critical distinction:
  //   "supports" = only positive houses → PURE support
  //   "mixed-positive" = more positive than negative → LEANS toward event
  //   "mixed-negative" = more negative than positive → LEANS against but NOT denial
  //   "negates" = ONLY negative houses, ZERO positive → PURE negation (denial)
  //   "facilitates" = only facilitator houses → neutral-positive
  //   "neutral" = no positive/negative houses → neutral
  //
  // The book's denial rule: Sub-Lord PURELY negating (zero positive houses at sub level)
  // means the event is denied through that planet. But if sub-lord is "mixed", 
  // the event can still happen — just with difficulties or delays.

  let overallStrength = 'ordinary';
  let overallVerdict = 'neutral';
  let score = 0; // -100 to +100

  // Pure support = supports or mixed-positive
  const subSupports = subLordLevel.verdict === 'supports';
  const subMixedPositive = subLordLevel.verdict === 'mixed-positive';
  const subPureNegates = subLordLevel.verdict === 'negates'; // ONLY when zero positive houses
  const subMixedNegative = subLordLevel.verdict === 'mixed-negative';
  const subFacilitates = subLordLevel.verdict === 'facilitates';
  const subNeutral = subLordLevel.verdict === 'neutral';

  const nakSupports = ['supports', 'mixed-positive'].includes(nakshatraLevel.verdict);
  const nakPureNegates = nakshatraLevel.verdict === 'negates';
  const plnSupports = ['supports', 'mixed-positive'].includes(planetLevel.verdict);
  const plnPureNegates = planetLevel.verdict === 'negates';

  // Compute a weighted score across all 3 levels
  // Sub-Lord weight = 50%, Nakshatra = 30%, Planet = 20% (book hierarchy)
  function levelScore(level) {
    // Net positive influence: pos - neg, weighted by total houses at that level
    const total = level.posCount + level.negCount + level.facCount;
    if (total === 0) return 0;
    // posCount contributes positive, negCount contributes negative, facCount is slightly positive
    return (level.posCount * 2 + level.facCount * 0.5 - level.negCount * 2);
  }

  const subScore = levelScore(subLordLevel);
  const nakScore = levelScore(nakshatraLevel);
  const plnScore = levelScore(planetLevel);
  const weightedScore = subScore * 0.50 + nakScore * 0.30 + plnScore * 0.20;

  // ── Rule-based classification ──
  if ((subSupports || subMixedPositive) && nakSupports && plnSupports) {
    // All three support → STRONGEST
    overallStrength = 'strongest';
    overallVerdict = 'certain';
    score = 85 + Math.min(15, weightedScore * 3);
  } else if (subSupports && !nakPureNegates && !plnPureNegates) {
    // Sub purely supports, others don't purely negate → strong
    overallStrength = 'strong';
    overallVerdict = 'very_likely';
    score = 70 + Math.min(15, weightedScore * 2);
  } else if (subMixedPositive && !nakPureNegates && !plnPureNegates) {
    // Sub leans positive, others don't purely negate → strong
    overallStrength = 'strong';
    overallVerdict = 'likely';
    score = 60 + Math.min(15, weightedScore * 2);
  } else if ((subSupports || subMixedPositive) && (nakPureNegates || plnPureNegates)) {
    // Sub supports but other(s) purely negate → still moderate (sub is strongest)
    overallStrength = 'moderate';
    overallVerdict = 'possible';
    score = 40 + Math.min(10, weightedScore);
  } else if (subMixedNegative && (nakSupports || plnSupports)) {
    // Sub leans negative but has SOME positive, others support → moderate
    // This is NOT denial — the sub-lord touches positive houses too
    overallStrength = 'moderate';
    overallVerdict = 'possible';
    score = 30 + Math.min(15, weightedScore);
  } else if (subMixedNegative && !nakSupports && !plnSupports) {
    // Sub leans negative, others don't help → weak but NOT denied
    overallStrength = 'weak';
    overallVerdict = 'unlikely';
    score = 10 + Math.min(10, weightedScore);
  } else if (subPureNegates && nakSupports && plnSupports) {
    // Sub purely negates but both others support → weak (book: "can happen eventually")
    overallStrength = 'weak';
    overallVerdict = 'unlikely';
    score = 15;
  } else if (subPureNegates && (nakSupports || plnSupports)) {
    // Sub purely negates, one other supports → very weak
    overallStrength = 'weak';
    overallVerdict = 'very_unlikely';
    score = 5;
  } else if (subPureNegates) {
    // Sub purely negates, others don't support → denied
    overallStrength = 'denied';
    overallVerdict = 'denied';
    score = -40 - subLordLevel.negCount * 10;
  } else if (subFacilitates && (nakSupports || plnSupports)) {
    // Sub facilitates, others support → strong
    overallStrength = 'strong';
    overallVerdict = 'likely';
    score = 60 + Math.min(10, weightedScore);
  } else if ((subFacilitates || subNeutral) && !nakPureNegates && !plnPureNegates) {
    // Sub neutral/facilitates, others neutral → ordinary
    overallStrength = 'ordinary';
    overallVerdict = 'conditional';
    score = 25 + Math.min(15, weightedScore);
  } else {
    // Fallback — use weighted score
    score = Math.round(weightedScore * 10);
    if (weightedScore >= 1.5) {
      overallStrength = 'moderate';
      overallVerdict = 'possible';
    } else if (weightedScore >= 0) {
      overallStrength = 'ordinary';
      overallVerdict = 'conditional';
    } else {
      overallStrength = 'weak';
      overallVerdict = 'unlikely';
    }
  }

  // Clamp score
  score = Math.max(-100, Math.min(100, score));

  return {
    planet: planetLevel,
    nakshatra: nakshatraLevel,
    subLord: subLordLevel,
    overallStrength,
    overallVerdict,
    score,
    chain: planetSig.chain,
  };
}


/**
 * Predict an event for the entire chart using house group analysis.
 * Checks all planets and determines overall event promise.
 * 
 * Returns: overall prediction with breakdown per planet.
 */
function predictEvent(significatorTable, houseGroupKey) {
  const houseGroup = HOUSE_GROUPS[houseGroupKey];
  if (!houseGroup) return null;

  const planetAnalysis = {};
  let totalScore = 0;
  let strongCount = 0;
  let deniedCount = 0;
  let planetCount = 0;

  const strongPlanets = [];  // Planets that strongly promise the event
  const weakPlanets = [];    // Planets that deny the event
  const bestDasaPlanets = []; // Best planets for this event in their Dasha

  for (const [key, sig] of Object.entries(significatorTable)) {
    const analysis = analyzePlanetForEvent(sig, houseGroup);
    planetAnalysis[key] = analysis;
    totalScore += analysis.score;
    planetCount++;

    if (analysis.overallStrength === 'strongest' || analysis.overallStrength === 'strong') {
      strongCount++;
      strongPlanets.push({ name: sig.name, score: analysis.score, strength: analysis.overallStrength });
      bestDasaPlanets.push(sig.name);
    } else if (analysis.overallStrength === 'denied') {
      deniedCount++;
      weakPlanets.push({ name: sig.name, score: analysis.score, strength: analysis.overallStrength });
    }
  }

  const avgScore = planetCount > 0 ? totalScore / planetCount : 0;
  
  // Also count moderate and ordinary planets (they contribute to event promise)
  let moderateCount = 0;
  let ordinaryCount = 0;
  for (const [key, sig] of Object.entries(significatorTable)) {
    const analysis = planetAnalysis[key];
    if (analysis.overallStrength === 'moderate') moderateCount++;
    else if (analysis.overallStrength === 'ordinary') ordinaryCount++;
  }

  // Overall event prediction
  // Use a combination of strong count + average score for better calibration
  // Most charts should NOT show "denied" for basic life events (career, education)
  let eventVerdict, eventStrength, eventDescription;

  const effectiveSupport = strongCount + moderateCount * 0.5; // Moderate planets count half

  if (strongCount >= 5) {
    eventVerdict = 'very_strong';
    eventStrength = 'Exceptional';
    eventDescription = `${houseGroup.label}: Very strongly indicated. ${strongCount} planets promise this event — it is almost certain to manifest prominently.`;
  } else if (strongCount >= 3 || (strongCount >= 2 && moderateCount >= 2)) {
    eventVerdict = 'strong';
    eventStrength = 'Strong';
    eventDescription = `${houseGroup.label}: Strongly indicated. ${strongCount} planets support this event across Planet-Nakshatra-SubLord chain.`;
  } else if (effectiveSupport >= 1.5 || avgScore >= 15) {
    eventVerdict = 'moderate';
    eventStrength = 'Moderate';
    eventDescription = `${houseGroup.label}: Moderately indicated. Event will manifest but may face delays or reduced intensity.`;
  } else if (deniedCount >= 7 && strongCount === 0 && moderateCount === 0) {
    // Very strict denial: only when almost ALL planets purely negate and NONE support
    eventVerdict = 'denied';
    eventStrength = 'Denied';
    eventDescription = `${houseGroup.label}: Mostly denied by Sub-Lord analysis. ${deniedCount} planets negate this event — extremely unlikely to manifest naturally.`;
  } else if (avgScore < -20 && deniedCount >= 5 && effectiveSupport < 1) {
    // Also denied but with score check
    eventVerdict = 'denied';
    eventStrength = 'Denied';
    eventDescription = `${houseGroup.label}: Denied — insufficient planetary support and negative average score.`;
  } else {
    eventVerdict = 'weak';
    eventStrength = 'Weak';
    eventDescription = `${houseGroup.label}: Weakly indicated. Event requires specific Dasha timing and favorable transits to manifest.`;
  }

  // Find best Dasha periods for this event
  // Sort strong planets by Vimshottari Dasha order for timing
  const dasaOrder = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  bestDasaPlanets.sort((a, b) => dasaOrder.indexOf(a) - dasaOrder.indexOf(b));

  return {
    event: houseGroupKey,
    label: houseGroup.label,
    houseGroupPositive: houseGroup.positive,
    houseGroupNegative: houseGroup.negative,
    verdict: eventVerdict,
    strength: eventStrength,
    description: eventDescription,
    averageScore: Math.round(avgScore),
    strongPlanets,
    weakPlanets,
    bestDashaPlanets: bestDasaPlanets,
    planetAnalysis,
  };
}


/**
 * Assess planet strength for a specific house group using the Nadi comparison rules
 * from Chapter 8 of the book:
 *   2,6,10,11 = 6,10,11 = 6,11 = 10,11 > 2,11 = 11 >> 2,6,10 = 6,10 > 6 = 10 > 2
 *   Without 11th house, strength drops drastically.
 * 
 * This scoring is specific to career/wealth but the pattern applies broadly:
 * When the "gain house" (11th) is present, strength is much higher.
 */
function assessCombinationStrength(significantHouses, houseGroup) {
  const positive = houseGroup.positive || [];
  const matchedPositive = significantHouses.filter(h => positive.includes(h));
  const has11 = matchedPositive.includes(11);
  const matchCount = matchedPositive.length;

  if (matchCount === positive.length) return { grade: 'A+', strength: 100, label: 'Full combination' };
  if (matchCount >= positive.length - 1 && has11) return { grade: 'A', strength: 90, label: 'Near-complete with gain' };
  if (has11 && matchCount >= 2) return { grade: 'B+', strength: 80, label: 'Strong with gain house' };
  if (has11) return { grade: 'B', strength: 70, label: 'Gain house present' };
  if (matchCount >= 2) return { grade: 'C+', strength: 55, label: 'Partial combination' };
  if (matchCount === 1) return { grade: 'C', strength: 40, label: 'Single house signified' };
  return { grade: 'D', strength: 20, label: 'No significant houses' };
}


/**
 * Grade education quality using the book's exact grading system (Chapter 3):
 *   4,9,11 → "A" grade (maximum marks)
 *   4,11   → "B" grade (above average)
 *   5,11   → "B" grade (most intelligent)
 *   4,5,9  → "C" grade (average)
 *   2,4,5,9 scattered → "D" grade (low)
 *   6,8,12 → Failures & obstacles
 */
function gradeEducation(significantHouses) {
  const has = (arr) => arr.every(h => significantHouses.includes(h));

  if (has([4, 9, 11])) return { grade: 'A', description: 'Excellent education with maximum marks', score: 95 };
  if (has([4, 11])) return { grade: 'B+', description: 'Above average education', score: 80 };
  if (has([5, 11])) return { grade: 'B', description: 'Intelligent child, above average', score: 78 };
  if (has([4, 5, 9])) return { grade: 'C+', description: 'Average education', score: 65 };

  // Check for failure combinations
  const hasFailure = [6, 8, 12].filter(h => significantHouses.includes(h)).length >= 2;
  if (hasFailure && !significantHouses.includes(11)) {
    return { grade: 'F', description: 'Obstacles in education, potential failures', score: 25 };
  }

  // No inclination: 3,6,8 or 3,6,12 or 3,8,12
  if (has([3, 6, 8]) || has([3, 6, 12]) || has([3, 8, 12])) {
    return { grade: 'D', description: 'No inclination for formal education', score: 35 };
  }

  // Scientific bent: 8,12 with good education houses
  if (significantHouses.includes(8) && significantHouses.includes(12) && 
      (significantHouses.includes(4) || significantHouses.includes(9) || significantHouses.includes(11))) {
    return { grade: 'B-', description: 'Scientific/research bent of mind', score: 72 };
  }

  return { grade: 'C', description: 'Average education', score: 60 };
}


/**
 * Determine field of education based on house positions and planet significators
 * (from Chapter 3 house-field mapping)
 */
function determineEducationField(significantHouses, planetName) {
  const fields = [];

  // Planet-based fields (Chapter 3)
  const PLANET_FIELDS = {
    Sun: ['Medicine', 'Chemicals', 'Optics', 'Political Science', 'Administration', 'Forestry'],
    Moon: ['Textiles', 'Navigation', 'Nursing', 'Home Science', 'Music', 'Dance', 'Psychology', 'Hotel Management'],
    Mars: ['Military Engineering', 'Weapons', 'Chemicals', 'Surgery', 'Physics'],
    Jupiter: ['Law', 'Foreign Policy', 'Preaching', 'Education', 'Gynaecology', 'Medical Science'],
    Saturn: ['Astrology', 'Excavation', 'Mining'],
    Mercury: ['Textiles', 'Mathematics', 'Accounts', 'Economics', 'Banking', 'Printing', 'Journalism'],
    Venus: ['Music', 'Cinema', 'Acting', 'Designing', 'Photography', 'Modelling', 'Hotel Management'],
  };

  // House-based fields (Chapter 3)
  const HOUSE_FIELDS = {
    1: ['Military Science', 'Psychology'],
    2: ['Economics', 'Mathematics', 'Arts', 'Painting'],
    3: ['Military Science', 'Journalism', 'Philosophy', 'Physics', 'Advertisement', 'Communication'],
    4: ['Agriculture', 'Home Science', 'Civil Engineering', 'Architecture', 'Interior Decoration'],
    5: ['Education', 'Gynaecology', 'Teacher Training', 'Higher Education'],
    6: ['Chemistry', 'Biology', 'Medical Science', 'Nursing', 'Military Science', 'Law'],
    7: ['Business Management', 'Military Science'],
    8: ['History', 'Archaeology', 'Geology', 'Mining', 'Occult Sciences'],
    9: ['Law', 'Religion', 'Spirituality', 'Teaching', 'Higher Education', 'Foreign Studies'],
    10: ['Political Science', 'Professional Training', 'Business Management'],
    11: ['Commerce', 'Sciences'],
    12: ['Foreign Languages', 'Foreign Studies', 'Occult Sciences'],
  };

  // Add planet-based fields
  if (PLANET_FIELDS[planetName]) {
    fields.push(...PLANET_FIELDS[planetName]);
  }

  // Add house-based fields for strongest houses
  for (const h of significantHouses) {
    if (HOUSE_FIELDS[h]) {
      fields.push(...HOUSE_FIELDS[h]);
    }
  }

  return [...new Set(fields)];
}


/**
 * Determine career type: job vs business (Chapter 8)
 * Service: 2,6,10,11 — Business: 2,7,10,11
 */
function determineCareerType(significatorTable) {
  let serviceScore = 0;
  let businessScore = 0;

  for (const [key, sig] of Object.entries(significatorTable)) {
    const allH = sig.allHouses;
    // Service: count 6 presence (prime house of job)
    if (allH.includes(6) && allH.includes(10)) serviceScore += 2;
    else if (allH.includes(6) && allH.includes(11)) serviceScore += 2;
    else if (allH.includes(6)) serviceScore += 1;
    
    // Business: count 7 presence (prime house of business)
    if (allH.includes(7) && allH.includes(10)) businessScore += 2;
    else if (allH.includes(7) && allH.includes(11)) businessScore += 2;
    else if (allH.includes(7)) businessScore += 1;
  }

  if (serviceScore > businessScore + 3) return { type: 'service', confidence: 'high', description: 'Strongly suited for employment/service career' };
  if (businessScore > serviceScore + 3) return { type: 'business', confidence: 'high', description: 'Strongly suited for business/entrepreneurship' };
  if (serviceScore > businessScore) return { type: 'service', confidence: 'moderate', description: 'Leans toward service but can also do business' };
  if (businessScore > serviceScore) return { type: 'business', confidence: 'moderate', description: 'Leans toward business but can also do service' };
  return { type: 'both', confidence: 'moderate', description: 'Can succeed in both service and business equally' };
}


/**
 * Determine career sector based on DBA planet type (Chapter 8):
 *   Sun/Moon → Government
 *   Mars → Uniform/Military
 *   Jupiter/Mercury/Venus → Corporate world
 *   Rahu/Ketu/Saturn → Small establishments
 */
function getCareerSectorByPlanet(planetName) {
  const SECTORS = {
    Sun: { sector: 'Government', description: 'Government job or public sector' },
    Moon: { sector: 'Government', description: 'Government or public service' },
    Mars: { sector: 'Uniform/Defence', description: 'Military, police, or uniformed services' },
    Jupiter: { sector: 'Corporate', description: 'Corporate world or large organizations' },
    Mercury: { sector: 'Corporate', description: 'Corporate or professional services' },
    Venus: { sector: 'Corporate', description: 'Corporate, luxury, or creative industries' },
    Rahu: { sector: 'Small Business', description: 'Small establishments or unconventional work' },
    Ketu: { sector: 'Small Business', description: 'Small establishments or spiritual work' },
    Saturn: { sector: 'Small Business', description: 'Small establishments, labor-intensive work' },
  };
  return SECTORS[planetName] || { sector: 'General', description: 'Various sectors' };
}


/**
 * Full Nadi Event Prediction Analysis
 * Runs all house group analyses and returns comprehensive predictions
 */
function generateNadiPredictions(bhavaChalit, houseChart, planets, lagnaRashi, kpSubLords) {
  // Build the core significator table
  const significatorTable = buildNadiSignificatorTable(bhavaChalit, houseChart, planets, lagnaRashi, kpSubLords);

  // Calculate cuspal sub-lords
  const cuspalSubLords = calculateCuspalSubLords(bhavaChalit, lagnaRashi.id);

  // Run all event predictions
  const events = {};
  for (const [key, group] of Object.entries(HOUSE_GROUPS)) {
    events[key] = predictEvent(significatorTable, key);
  }

  // Career type analysis
  const careerType = determineCareerType(significatorTable);

  // Education analysis for each planet
  const educationByPlanet = {};
  for (const [key, sig] of Object.entries(significatorTable)) {
    const eduGrade = gradeEducation(sig.allHouses);
    const eduFields = determineEducationField(sig.allHouses, sig.name);
    educationByPlanet[key] = { ...eduGrade, fields: eduFields };
  }

  // Overall education assessment (majority rule from book)
  const eduGrades = Object.values(educationByPlanet);
  const avgEduScore = eduGrades.reduce((sum, e) => sum + e.score, 0) / eduGrades.length;
  const overallEducation = avgEduScore >= 80 ? 'Excellent' : avgEduScore >= 65 ? 'Good' : avgEduScore >= 50 ? 'Average' : 'Below Average';

  // Career sector analysis: what planets are strongest for career
  // Use both service and business events, take the better one, include moderate planets
  const careerServiceEvent = events.career_service;
  const careerBusinessEvent = events.career_business;
  // Pick whichever career type has more support
  const bestCareerEvent = (careerServiceEvent?.strongPlanets?.length || 0) >= (careerBusinessEvent?.strongPlanets?.length || 0)
    ? careerServiceEvent : careerBusinessEvent;
  
  // Get top career planets: strong first, then moderate, then any with positive scores
  let topCareerPlanets = bestCareerEvent?.strongPlanets?.slice(0, 3) || [];
  if (topCareerPlanets.length === 0) {
    // Fallback: find planets with best scores for career
    const allCareerAnalysis = bestCareerEvent?.planetAnalysis || {};
    const sorted = Object.entries(allCareerAnalysis)
      .map(([k, v]) => ({ name: significatorTable[k]?.name, score: v.score, strength: v.overallStrength }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);
    topCareerPlanets = sorted.slice(0, 3);
  }
  const careerSectors = topCareerPlanets.map(p => ({
    planet: p.name,
    ...getCareerSectorByPlanet(p.name),
  }));

  // Longevity calculation (book formula: A/(A+B) × 120)
  let longevityEstimate = null;
  try {
    let lifeHouseSum = 0;
    let deathHouseSum = 0;
    const lifeHouses = [1, 5, 9, 10, 11];
    const deathHouses = [6, 8, 12]; // Badhak excluded for now

    for (const [key, sig] of Object.entries(significatorTable)) {
      if (sig.name === 'Rahu' || sig.name === 'Ketu') {
        // For Rahu/Ketu only planet level (book rule)
        for (const h of sig.planet.houses) {
          if (lifeHouses.includes(h)) lifeHouseSum++;
          if (deathHouses.includes(h)) deathHouseSum++;
        }
      } else {
        // For 7 planets: planet + nakshatra + sub-lord
        for (const h of sig.allHouses) {
          if (lifeHouses.includes(h)) lifeHouseSum++;
          if (deathHouses.includes(h)) deathHouseSum++;
        }
      }
    }

    if (lifeHouseSum + deathHouseSum > 0) {
      const longevityYears = Math.round((lifeHouseSum / (lifeHouseSum + deathHouseSum)) * 120);
      const clampedYears = Math.min(100, Math.max(35, longevityYears));
      longevityEstimate = {
        formula: `(${lifeHouseSum} / (${lifeHouseSum} + ${deathHouseSum})) × 120`,
        rawYears: longevityYears,
        estimatedYears: clampedYears,
        category: clampedYears >= 85 ? 'Long life (Deerghayu)' : clampedYears >= 60 ? 'Medium life (Madhyayu)' : 'Short life (Alpayu)',
        note: 'This is a Nadi formula estimate. Actual longevity depends on critical Dasha timing and transits.',
      };
    }
  } catch (e) {
    // Skip longevity if calculation fails
  }

  // Marriage timing analysis: which DBA combinations best promise marriage
  const marriageEvent = events.marriage;
  const bestMarriageDasha = marriageEvent?.bestDashaPlanets || [];

  return {
    significatorTable,
    cuspalSubLords,
    events,
    careerType,
    educationByPlanet,
    overallEducation,
    careerSectors,
    longevityEstimate,
    bestMarriageDasha,
    // Summary of strongest events
    eventSummary: Object.entries(events)
      .filter(([_, e]) => e.verdict === 'very_strong' || e.verdict === 'strong')
      .map(([key, e]) => ({
        event: key,
        label: e.label,
        strength: e.strength,
        bestPlanets: e.bestDashaPlanets,
      })),
    // Summary of denied events
    deniedEvents: Object.entries(events)
      .filter(([_, e]) => e.verdict === 'denied')
      .map(([key, e]) => ({
        event: key,
        label: e.label,
        reason: `${e.weakPlanets.length} planets negate this through Sub-Lord denial`,
      })),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  DASHA EVENT TIMING
//  Analyze which events activate during specific Dasha-Bhukti periods
//  by checking if the DBA lords signify the required house groups.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * For a given Dasha-Bhukti combination, predict which events are likely to manifest.
 * This follows the book's Rule 4: Dasha lord (strongest) > Bhukti lord > Antar lord
 */
function predictEventsInDasha(significatorTable, dashaLord, bhuktiLord, antarLord) {
  const dashaKey = Object.keys(significatorTable).find(k => significatorTable[k].name === dashaLord);
  const bhuktiKey = bhuktiLord ? Object.keys(significatorTable).find(k => significatorTable[k].name === bhuktiLord) : null;
  const antarKey = antarLord ? Object.keys(significatorTable).find(k => significatorTable[k].name === antarLord) : null;

  if (!dashaKey) return null;

  const results = {};

  for (const [eventKey, houseGroup] of Object.entries(HOUSE_GROUPS)) {
    const dashaAnalysis = analyzePlanetForEvent(significatorTable[dashaKey], houseGroup);

    // Dasha lord must allow the event (book Rule 4 — it's the strongest)
    if (dashaAnalysis.overallVerdict === 'denied' || dashaAnalysis.score < -20) {
      results[eventKey] = {
        label: houseGroup.label,
        verdict: 'blocked_by_dasha',
        description: `${dashaLord} Dasha blocks this event — Sub-Lord negates required houses`,
        dashaScore: dashaAnalysis.score,
      };
      continue;
    }

    let combinedScore = dashaAnalysis.score;
    let bhuktiAnalysis = null;
    let antarAnalysis = null;

    if (bhuktiKey) {
      bhuktiAnalysis = analyzePlanetForEvent(significatorTable[bhuktiKey], houseGroup);
      combinedScore += bhuktiAnalysis.score * 0.7; // Bhukti is 70% weight of Dasha
    }

    if (antarKey) {
      antarAnalysis = analyzePlanetForEvent(significatorTable[antarKey], houseGroup);
      combinedScore += antarAnalysis.score * 0.4; // Antar is 40% weight of Dasha
    }

    let verdict;
    if (combinedScore >= 70) verdict = 'very_likely';
    else if (combinedScore >= 40) verdict = 'likely';
    else if (combinedScore >= 10) verdict = 'possible';
    else if (combinedScore >= -20) verdict = 'unlikely';
    else verdict = 'denied';

    results[eventKey] = {
      label: houseGroup.label,
      verdict,
      combinedScore: Math.round(combinedScore),
      dashaScore: dashaAnalysis.score,
      bhuktiScore: bhuktiAnalysis?.score,
      antarScore: antarAnalysis?.score,
    };
  }

  return results;
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  buildNadiSignificatorTable,
  calculateCuspalSubLords,
  analyzePlanetForEvent,
  predictEvent,
  generateNadiPredictions,
  predictEventsInDasha,
  assessCombinationStrength,
  gradeEducation,
  determineEducationField,
  determineCareerType,
  getCareerSectorByPlanet,
  HOUSE_GROUPS,
  SEPARATIVE_PLANETS,
  NATURAL_MALEFICS,
  NATURAL_BENEFICS,
};
