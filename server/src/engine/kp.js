/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KP (Krishnamurti Paddhati) Prediction Engine
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements the full 4-step KP methodology for event prediction:
 *   Step 1: Planet (significator agent)
 *   Step 2: Star Lord (determines nature of result via house signification)
 *   Step 3: Sub-Lord (permission switch — YES or NO for event manifestation)
 *   Step 4: Ruling Planets (confirmation and timing refinement)
 *
 * Additionally:
 *   - House cusp sub-lord analysis for direct YES/NO on life events
 *   - Significator chain analysis
 *   - Ruling planet computation for the moment of query
 *
 * Based on: KP Reader Vols I-VI, Krishnamurti Padhdhati (Prof. K.S. Krishnamurti)
 */

const {
  getAllPlanetPositions, getLagna, getAyanamsha, toSidereal,
  getMoonLongitude, getNakshatra, getRashi, NAKSHATRAS, RASHIS, dateToJD,
} = require('./astrology');

const swe = require('@swisseph/node');
const { Planet: SwePlanet, HouseSystem: SweHouseSystem, SiderealMode, CalculationFlag: SweFlag } = swe;

// KP uses Krishnamurti ayanamsha (placidus houses required)
const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const TOTAL_YEARS = 120;

// ═══════════════════════════════════════════════════════════════════════════
// HOUSE CUSP CALCULATION (Placidus — required for KP)
// ═══════════════════════════════════════════════════════════════════════════

function getKPHouseCusps(date, lat, lng) {
  const jd = swe.dateToJulianDay(date);
  const houses = swe.calculateHouses(jd, lat, lng, SweHouseSystem.Placidus);
  const ayanamsha = getAyanamsha(date);
  const norm = (d) => ((d % 360) + 360) % 360;

  const cusps = [];
  for (let i = 1; i <= 12; i++) {
    const tropCusp = houses.cusps[i];
    const sidCusp = norm(tropCusp - ayanamsha);
    cusps.push({
      house: i,
      tropical: tropCusp,
      sidereal: sidCusp,
      ...getSubLordForDegree(sidCusp),
    });
  }

  return {
    cusps,
    ascendant: norm(houses.ascendant - ayanamsha),
    mc: norm(houses.mc - ayanamsha),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-LORD COMPUTATION for any sidereal degree
// ═══════════════════════════════════════════════════════════════════════════

function getSubLordForDegree(siderealDeg) {
  const nakshatraSpan = 360 / 27;
  const nakshatraIndex = Math.floor(siderealDeg / nakshatraSpan);
  const nak = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];
  const degreeInNakshatra = siderealDeg % nakshatraSpan;

  const starLord = nak.lord;
  const starLordIndex = DASA_LORDS.indexOf(starLord);

  let accumulated = 0;
  let subLord = starLord;
  let subSubLord = starLord;

  for (let i = 0; i < 9; i++) {
    const idx = (starLordIndex + i) % 9;
    const proportion = DASA_YEARS[idx] / TOTAL_YEARS;
    const subSpan = nakshatraSpan * proportion;

    if (accumulated + subSpan > degreeInNakshatra) {
      subLord = DASA_LORDS[idx];
      const degInSub = degreeInNakshatra - accumulated;
      let subAccum = 0;
      for (let j = 0; j < 9; j++) {
        const subIdx = (idx + j) % 9;
        const subSubSpan = subSpan * (DASA_YEARS[subIdx] / TOTAL_YEARS);
        if (subAccum + subSubSpan > degInSub) {
          subSubLord = DASA_LORDS[subIdx];
          break;
        }
        subAccum += subSubSpan;
      }
      break;
    }
    accumulated += subSpan;
  }

  const rashi = getRashi(siderealDeg);
  return {
    signLord: rashi.lord || RASHIS[(rashi.id || 1) - 1]?.lord,
    starLord,
    starName: nak.name,
    subLord,
    subSubLord,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNIFICATOR CHAIN — which houses a planet signifies (KP 4-step)
// ═══════════════════════════════════════════════════════════════════════════

function getSignificatorChain(planetKey, planets, houseCusps) {
  const p = planets[planetKey];
  if (!p) return null;

  const sidDeg = p.sidereal;
  const { signLord, starLord, subLord, subSubLord } = getSubLordForDegree(sidDeg);

  // Planet occupies a house (determined by Placidus cusps)
  const occupiedHouse = getHouseForDegree(sidDeg, houseCusps);

  // Planet owns houses
  const ownedHouses = [];
  for (let h = 0; h < 12; h++) {
    const cusp = houseCusps[h];
    const rashiAtCusp = Math.floor(cusp.sidereal / 30) + 1;
    const lord = RASHIS[rashiAtCusp - 1]?.lord;
    if (lord && lord.toLowerCase() === planetKey.toLowerCase()) {
      ownedHouses.push(h + 1);
    }
    if (planetKey === 'rahu' || planetKey === 'ketu') {
      // Rahu/Ketu signify their sign dispositor's houses
    }
  }

  // Star lord's significations
  const starLordKey = starLord.toLowerCase();
  const starLordOccupied = planets[starLordKey]
    ? getHouseForDegree(planets[starLordKey].sidereal, houseCusps) : null;

  // Sub lord's significations
  const subLordKey = subLord.toLowerCase();
  const subLordOccupied = planets[subLordKey]
    ? getHouseForDegree(planets[subLordKey].sidereal, houseCusps) : null;

  return {
    planet: p.name,
    occupiedHouse,
    ownedHouses,
    signLord,
    starLord,
    starLordOccupied,
    subLord,
    subLordOccupied,
    subSubLord,
    signifiedHouses: [...new Set([occupiedHouse, ...ownedHouses].filter(Boolean))],
  };
}

function getHouseForDegree(sidDeg, cusps) {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i].sidereal;
    const end = cusps[(i + 1) % 12].sidereal;
    if (start < end) {
      if (sidDeg >= start && sidDeg < end) return i + 1;
    } else {
      if (sidDeg >= start || sidDeg < end) return i + 1;
    }
  }
  return 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULING PLANETS — Confirmation and timing
// ═══════════════════════════════════════════════════════════════════════════

function getRulingPlanets(date, lat, lng) {
  const moonSid = toSidereal(getMoonLongitude(date), date);
  const lagna = getLagna(date, lat, lng);
  const lagnaInfo = getSubLordForDegree(lagna.sidereal);
  const moonInfo = getSubLordForDegree(moonSid);

  const dayLord = getDayLord(date);

  const rulers = [
    { source: 'Lagna Sign Lord', planet: lagnaInfo.signLord },
    { source: 'Lagna Star Lord', planet: lagnaInfo.starLord },
    { source: 'Moon Sign Lord', planet: moonInfo.signLord },
    { source: 'Moon Star Lord', planet: moonInfo.starLord },
    { source: 'Day Lord', planet: dayLord },
  ];

  // Count frequencies
  const freq = {};
  for (const r of rulers) {
    freq[r.planet] = (freq[r.planet] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

  return {
    rulers,
    ranked: sorted.map(([planet, count]) => ({ planet, strength: count })),
    strongest: sorted[0] ? sorted[0][0] : null,
  };
}

function getDayLord(date) {
  const days = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  return days[date.getDay()];
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT PREDICTION — YES/NO with KP 4-step
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_HOUSE_COMBOS = {
  marriage:       { positive: [2, 7, 11], negative: [1, 6, 10, 12] },
  career_change:  { positive: [2, 6, 10, 11], negative: [5, 8, 12] },
  children:       { positive: [2, 5, 11], negative: [1, 4, 10] },
  foreign_travel: { positive: [3, 9, 12], negative: [1, 4, 10] },
  wealth_gain:    { positive: [2, 6, 10, 11], negative: [5, 8, 12] },
  property:       { positive: [4, 11, 12], negative: [3, 5, 9] },
  education:      { positive: [4, 9, 11], negative: [3, 5, 8] },
  health_crisis:  { positive: [1, 6, 8, 12], negative: [5, 11] },
  business:       { positive: [7, 10, 11], negative: [6, 8, 12] },
  love_affair:    { positive: [5, 7, 11], negative: [6, 8, 12] },
};

/**
 * KP YES/NO prediction for a specific life event.
 *
 * Analyzes the house cusp sub-lords for the relevant houses. If the cusp
 * sub-lord signifies positive houses for the event → YES; if it signifies
 * negative houses → NO.
 *
 * @param {string} eventType - Key from EVENT_HOUSE_COMBOS
 * @param {Date} birthDate
 * @param {number} lat
 * @param {number} lng
 * @returns {object} Prediction with YES/NO, confidence, and reasoning
 */
function predictEvent(eventType, birthDate, lat, lng) {
  const eventDef = EVENT_HOUSE_COMBOS[eventType];
  if (!eventDef) return { error: `Unknown event type: ${eventType}` };

  const date = new Date(birthDate);
  const planets = getAllPlanetPositions(date, lat, lng);
  const { cusps } = getKPHouseCusps(date, lat, lng);

  const primaryHouse = eventDef.positive[eventDef.positive.length > 1 ? 1 : 0]; // Main significator house
  const primaryCusp = cusps[primaryHouse - 1];
  if (!primaryCusp) return { error: 'Could not compute cusp' };

  // Analyze the sub-lord of the primary cusp
  const subLordKey = primaryCusp.subLord.toLowerCase();
  const subLordPlanet = planets[subLordKey];

  // Get the signification chain of the sub-lord
  const subLordChain = getSignificatorChain(subLordKey, planets, cusps);

  // Check if sub-lord signifies positive houses for this event
  let positiveScore = 0;
  let negativeScore = 0;
  const reasons = [];

  if (subLordChain) {
    for (const h of subLordChain.signifiedHouses) {
      if (eventDef.positive.includes(h)) {
        positiveScore++;
        reasons.push(`${primaryCusp.subLord} signifies house ${h} (favourable for ${eventType})`);
      }
      if (eventDef.negative.includes(h)) {
        negativeScore++;
        reasons.push(`${primaryCusp.subLord} signifies house ${h} (unfavourable for ${eventType})`);
      }
    }

    // Also check the star lord's house significations
    if (subLordChain.starLordOccupied) {
      if (eventDef.positive.includes(subLordChain.starLordOccupied)) positiveScore += 0.5;
      if (eventDef.negative.includes(subLordChain.starLordOccupied)) negativeScore += 0.5;
    }
  }

  // Ruling planet confirmation
  const ruling = getRulingPlanets(new Date(), lat, lng);
  const rulingConfirmation = ruling.ranked.some(r =>
    r.planet.toLowerCase() === subLordKey && r.strength >= 2
  );
  if (rulingConfirmation) {
    positiveScore += 1;
    reasons.push(`Ruling planets confirm: ${primaryCusp.subLord} is strong in current ruling planets`);
  }

  const prediction = positiveScore > negativeScore ? 'YES' : negativeScore > positiveScore ? 'NO' : 'UNCERTAIN';
  const totalWeight = positiveScore + negativeScore;
  const confidence = totalWeight > 0
    ? Math.round(Math.max(positiveScore, negativeScore) / totalWeight * 100)
    : 50;

  return {
    event: eventType,
    prediction,
    confidence,
    primaryHouse,
    cuspSubLord: primaryCusp.subLord,
    cuspStarLord: primaryCusp.starLord,
    subLordSignifiedHouses: subLordChain?.signifiedHouses || [],
    positiveScore,
    negativeScore,
    reasons,
    rulingPlanets: ruling.ranked.slice(0, 3),
    rulingConfirmation,
  };
}

/**
 * Full KP analysis for all events at once.
 */
function predictAllEvents(birthDate, lat, lng) {
  const results = {};
  for (const eventType of Object.keys(EVENT_HOUSE_COMBOS)) {
    results[eventType] = predictEvent(eventType, birthDate, lat, lng);
  }
  return results;
}

/**
 * Complete KP chart analysis: cusps, sub-lords, significators, and ruling planets.
 */
function getKPChartAnalysis(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const planets = getAllPlanetPositions(date, lat, lng);
  const houseCusps = getKPHouseCusps(date, lat, lng);

  const planetSignificators = {};
  const PLANET_KEYS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
  for (const key of PLANET_KEYS) {
    planetSignificators[key] = getSignificatorChain(key, planets, houseCusps.cusps);
  }

  const rulingPlanets = getRulingPlanets(new Date(), lat, lng);

  return {
    houseCusps,
    planetSignificators,
    rulingPlanets,
  };
}

module.exports = {
  getKPHouseCusps,
  getSubLordForDegree,
  getSignificatorChain,
  getRulingPlanets,
  predictEvent,
  predictAllEvents,
  getKPChartAnalysis,
  EVENT_HOUSE_COMBOS,
};
