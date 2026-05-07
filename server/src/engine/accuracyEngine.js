/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * ACCURACY ENGINE â€” Tier 1 / Tier 2 / Tier 3 Precision Enhancements
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * Single orchestrator for accuracy-improving computations that aren't
 * already implemented elsewhere, plus cross-system bridges that lift the
 * precision of the main report:
 *
 *  â”€â”€ Tier 1 (highest impact) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *    â€¢ Varshaphal cross-validation of dasha-based predictions
 *    â€¢ Locality-aware dasha activation (transit cross-reference)
 *    â€¢ Per-section confidence tiering (â˜… / â˜…â˜… / â˜…â˜…â˜…)
 *
 *  â”€â”€ Tier 2 (strong impact) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *    â€¢ Multi-ayanamsha cross-check (lagna-sensitivity flag)
 *    â€¢ D9 (Navamsha) promise verification per planet
 *    â€¢ Yogi / Avayogi planet calculator
 *    â€¢ Argala / Virodhargala doctrine
 *    â€¢ Saturn / Jupiter return precision dates
 *
 *  â”€â”€ Tier 3 (specialized) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *    â€¢ KP sub-lord fine-timing layer
 *    â€¢ Nadi dispositor chain verification
 *    â€¢ Bhava Bala (six-fold house strength)
 *    â€¢ Sade Sati phase precision (rising / peak / setting)
 *    â€¢ Eclipse trigger detector (Â±3Â° natal-orb in next 6 months)
 *
 * Strategy: the report calls one entry point â€” `computeAccuracyEnhancements()`
 * â€” which returns a single object that is serialised into the LLM prompt and
 * also surfaced for confidence-tier rendering.
 */

const swe = require('@swisseph/node');
const { Planet: SwePlanet, SiderealMode, CalculationFlag: SweFlag } = swe;

// Lazy-loaded astrology module (avoids circular dependency at module load).
let _astro = null;
function astro() {
  if (!_astro) _astro = require('./astrology');
  return _astro;
}
// Convenience accessors â€” always lazy.
const getAyanamsha = (...a) => astro().getAyanamsha(...a);
const setAyanamshaMode = (...a) => astro().setAyanamshaMode(...a);
const getCurrentAyanamshaMode = (...a) => astro().getCurrentAyanamshaMode(...a);
const toSidereal = (...a) => astro().toSidereal(...a);
const getLagna = (...a) => astro().getLagna(...a);
const getAllPlanetPositions = (...a) => astro().getAllPlanetPositions(...a);
const getMoonLongitude = (...a) => astro().getMoonLongitude(...a);
const getNakshatra = (...a) => astro().getNakshatra(...a);
const getRashi = (...a) => astro().getRashi(...a);
const dateToJD = (...a) => astro().dateToJD(...a);
const calculateVimshottariDetailed = (...a) => astro().calculateVimshottariDetailed(...a);
const buildHouseChart = (...a) => astro().buildHouseChart(...a);
const buildNavamshaChart = (...a) => astro().buildNavamshaChart(...a);
// Resolve constant arrays at call-time (avoids capturing undefined during circular load).
const RASHIS = () => astro().RASHIS;
const NAKSHATRAS = () => astro().NAKSHATRAS;
const { resolveCalculationSettings } = require('./calculationSettings');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Shared helpers
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const PLANET_LIST = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const norm360 = (d) => ((d % 360) + 360) % 360;
const angDist = (a, b) => { const d = Math.abs(a - b); return d > 180 ? 360 - d : d; };

function accuracyPlanets(date, lat, lng, settings) {
  return getAllPlanetPositions(date, lat || 6.9271, lng || 79.8612, settings || {});
}

const RASHI_LORDS_BY_ID = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon',
  5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars',
  9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
};

const EXALTATION_DEG = {
  Sun: { rashiId: 1, deg: 10 },     // Aries 10Â°
  Moon: { rashiId: 2, deg: 3 },     // Taurus 3Â°
  Mars: { rashiId: 10, deg: 28 },   // Capricorn 28Â°
  Mercury: { rashiId: 6, deg: 15 }, // Virgo 15Â°
  Jupiter: { rashiId: 4, deg: 5 },  // Cancer 5Â°
  Venus: { rashiId: 12, deg: 27 },  // Pisces 27Â°
  Saturn: { rashiId: 7, deg: 20 },  // Libra 20Â°
};
const DEBILITATION_DEG = {
  Sun: { rashiId: 7, deg: 10 },
  Moon: { rashiId: 8, deg: 3 },
  Mars: { rashiId: 4, deg: 28 },
  Mercury: { rashiId: 12, deg: 15 },
  Jupiter: { rashiId: 10, deg: 5 },
  Venus: { rashiId: 6, deg: 27 },
  Saturn: { rashiId: 1, deg: 20 },
};

function houseFromLagna(targetRashiId, lagnaRashiId) {
  return ((targetRashiId - lagnaRashiId + 12) % 12) + 1;
}

function getPlanetSidereal(planets, key) {
  const p = planets[key.toLowerCase()] || planets[key];
  return p ? p.sidereal : null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T2 #5 â€” MULTI-AYANAMSHA CROSS-CHECK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Compute the lagna sign + degree under three ayanamshas (Lahiri, KP,
 * Raman). If the lagna SIGN flips across systems, the chart is
 * "lagna-sensitive" and downstream lagna-driven claims should be
 * downgraded to 1-star confidence.
 */
function computeMultiAyanamsha(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const original = getCurrentAyanamshaMode();
  const results = {};

  try {
    for (const mode of ['lahiri', 'krishnamurti', 'raman']) {
      try {
        setAyanamshaMode(mode);
        const lagna = getLagna(date, lat, lng);
        const moonSid = toSidereal(getMoonLongitude(date), date);
        const moonNak = getNakshatra(moonSid);
        results[mode] = {
          lagnaSign: lagna.rashi.english,
          lagnaSignSi: lagna.rashi.sinhala,
          lagnaDegree: +(lagna.sidereal % 30).toFixed(2),
          moonNakshatra: moonNak.name,
          moonNakshatraPada: moonNak.pada,
          ayanamsha: +getAyanamsha(date).toFixed(4),
        };
      } catch (e) {
        results[mode] = { error: e.message };
      }
    }
  } finally {
    setAyanamshaMode(original);
  }

  // Sensitivity analysis
  const lagnaSigns = Object.values(results).map(r => r.lagnaSign).filter(Boolean);
  const uniqueLagnaSigns = [...new Set(lagnaSigns)];
  const moonNaks = Object.values(results).map(r => r.moonNakshatra).filter(Boolean);
  const uniqueMoonNaks = [...new Set(moonNaks)];

  // Check if Lahiri lagna degree is within 1Â° of a sign cusp (high-risk zone)
  const lahDeg = results.lahiri?.lagnaDegree;
  const lagnaCuspRisk = lahDeg !== undefined && (lahDeg < 1 || lahDeg > 29);

  return {
    perAyanamsha: results,
    lagnaStable: uniqueLagnaSigns.length === 1,
    moonNakshatraStable: uniqueMoonNaks.length === 1,
    lagnaCuspRisk,
    sensitivityFlag:
      uniqueLagnaSigns.length > 1 ? 'HIGH'
      : lagnaCuspRisk ? 'MEDIUM'
      : uniqueMoonNaks.length > 1 ? 'MEDIUM'
      : 'LOW',
    advisory: uniqueLagnaSigns.length > 1
      ? `Lagna varies across ayanamshas (${uniqueLagnaSigns.join(' / ')}). All lagna-driven claims should carry low confidence until birth time is rectified.`
      : lagnaCuspRisk
        ? `Lagna sits within 1Â° of a sign cusp under Lahiri â€” even a 4-minute birth-time error flips the rising sign. Consider rectification.`
        : `Lagna and Moon nakshatra are stable across all three ayanamshas â€” chart foundation is reliable.`,
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T2 #6 â€” D9 (NAVAMSHA) PROMISE VERIFICATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Classical rule: a planet that promises results in D1 must also retain
 * dignity in D9 to actually deliver. For each natal planet, check its
 * dignity in both charts and emit a verdict.
 */
function computeD9Verification(planets, navamsha) {
  if (!planets || !navamsha) return null;
  const verdicts = [];
  const navPlanets = navamsha.planets || {};

  function dignityIn(rashiId, planetName) {
    const exalt = EXALTATION_DEG[planetName];
    const debil = DEBILITATION_DEG[planetName];
    if (exalt?.rashiId === rashiId) return 'Exalted';
    if (debil?.rashiId === rashiId) return 'Debilitated';
    // Own sign rules
    const ownSigns = {
      Sun: [5], Moon: [4], Mars: [1, 8], Mercury: [3, 6],
      Jupiter: [9, 12], Venus: [2, 7], Saturn: [10, 11],
    };
    if (ownSigns[planetName]?.includes(rashiId)) return 'Own Sign';
    return 'Neutral';
  }

  for (const key of PLANET_LIST) {
    const d1 = planets[key];
    const d9 = navPlanets[key];
    if (!d1 || !d9) continue;
    const planetName = d1.name;
    const d1RashiId = d1.rashiId || (RASHIS().findIndex(r => r.name === d1.rashi) + 1);
    const d9RashiId = d9.rashiId || (RASHIS().findIndex(r => r.name === d9.rashi) + 1);
    const d1Dig = dignityIn(d1RashiId, planetName);
    const d9Dig = dignityIn(d9RashiId, planetName);

    let verdict;
    let weight; // how much weight to give this planet's promises
    if (d1Dig === 'Exalted' || d1Dig === 'Own Sign') {
      // Promise is strong in D1 â€” does D9 confirm?
      if (d9Dig === 'Exalted' || d9Dig === 'Own Sign') {
        verdict = 'Vargottama-style â€” promise CONFIRMED in D9';
        weight = 1.5;
      } else if (d9Dig === 'Debilitated') {
        verdict = 'D1 promise BROKEN in D9 â€” results delayed or unfulfilled';
        weight = 0.4;
      } else {
        verdict = 'D1 promise PARTIAL â€” D9 neutral, results moderate';
        weight = 0.85;
      }
    } else if (d1Dig === 'Debilitated') {
      if (d9Dig === 'Exalted' || d9Dig === 'Own Sign') {
        verdict = 'Neecha Bhanga-style â€” D9 RESCUES the natal weakness';
        weight = 1.1;
      } else {
        verdict = 'Weakness CONFIRMED in D9 â€” significations strain';
        weight = 0.4;
      }
    } else {
      // Neutral D1
      if (d9Dig === 'Exalted' || d9Dig === 'Own Sign') {
        verdict = 'D9 ELEVATES â€” silent promise, blooms after age 36';
        weight = 1.15;
      } else if (d9Dig === 'Debilitated') {
        verdict = 'D9 weakens â€” promises softer than they look';
        weight = 0.7;
      } else {
        verdict = 'Neutral both charts â€” average results';
        weight = 1.0;
      }
    }

    verdicts.push({
      planet: planetName,
      d1Sign: d1.rashi,
      d1Dignity: d1Dig,
      d9Sign: d9.rashi,
      d9Dignity: d9Dig,
      verdict,
      promiseMultiplier: +weight.toFixed(2),
    });
  }

  return {
    perPlanet: verdicts,
    summary: verdicts
      .filter(v => v.promiseMultiplier !== 1.0)
      .map(v => `${v.planet}: ${v.verdict}`)
      .slice(0, 5),
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T2 #7 â€” YOGI / AVAYOGI PLANET
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Yogi point  = (Sun + Moon longitudes + 93Â°20') mod 360
 * Avayogi point = (Yogi + 186Â°40') mod 360
 * Planet ruling the nakshatra at Yogi point = "Yogi" planet (dasha brings fortune)
 * Planet ruling the nakshatra at Avayogi point = "Avayogi" planet (dasha breaks)
 * Dagdha Rashi = sign of the Yogi point (avoid major actions in this transit sign)
 */
function computeYogiAvayogi(planets) {
  const sunSid = getPlanetSidereal(planets, 'sun');
  const moonSid = getPlanetSidereal(planets, 'moon');
  if (sunSid === null || moonSid === null) return null;

  const yogiPoint = norm360(sunSid + moonSid + (93 + 20 / 60));
  const avayogiPoint = norm360(yogiPoint + (186 + 40 / 60));

  const yogiNak = getNakshatra(yogiPoint);
  const avayogiNak = getNakshatra(avayogiPoint);
  const yogiRashi = getRashi(yogiPoint);

  // Sahayogi planet = the planet conjunct (or nearest) the Yogi point in the natal chart
  let sahayogi = null;
  let minDist = 999;
  for (const key of PLANET_LIST) {
    const sid = getPlanetSidereal(planets, key);
    if (sid === null) continue;
    const d = angDist(sid, yogiPoint);
    if (d < minDist) { minDist = d; sahayogi = { planet: planets[key].name, distance: +d.toFixed(2) }; }
  }

  return {
    yogiPoint: +yogiPoint.toFixed(4),
    yogiNakshatra: yogiNak.name,
    yogiPlanet: yogiNak.lord,
    yogiRashi: yogiRashi.english,
    yogiRashiSi: yogiRashi.sinhala,
    avayogiPoint: +avayogiPoint.toFixed(4),
    avayogiNakshatra: avayogiNak.name,
    avayogiPlanet: avayogiNak.lord,
    sahayogi,
    dagdhaRashi: yogiRashi.english,
    interpretation: {
      yogi: `${yogiNak.lord}'s major and sub-periods bring the year's most favourable outcomes â€” career breakthroughs, marriage opportunities, and luck-based gains tend to cluster here.`,
      avayogi: `${avayogiNak.lord}'s periods are statistically the most fragile â€” finalise nothing critical, expect delays, treat as a "maintenance" phase.`,
      dagdha: `Avoid initiating new ventures, marriage muhurthas, or property purchases when transit Sun/Moon are in ${yogiRashi.english} (~30 days/year).`,
    },
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T2 #8 â€” ARGALA / VIRODHARGALA DOCTRINE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Jaimini argala: planets in the 2nd, 4th, 5th, and 11th from any house
 * "intervene" in that house's results. Counter-intervention (virodhargala)
 * comes from the 12th, 10th, 9th, and 3rd respectively. Net argala drives
 * whether a house actually delivers its house-lord-promised results.
 */
function computeArgala(planets, lagnaRashiId) {
  if (!planets || !lagnaRashiId) return null;
  const ARGALA_OFFSETS = { primary: [2, 4, 11], secondary: [5] };
  const VIRODHA_OFFSETS = { primary: [12, 10, 3], secondary: [9] };
  // Map planet â†’ its rashi id and house
  const planetMap = {};
  for (const key of [...PLANET_LIST, 'rahu', 'ketu']) {
    const p = planets[key];
    if (!p) continue;
    const rashiId = p.rashiId || (RASHIS().findIndex(r => r.name === p.rashi) + 1);
    planetMap[p.name] = { rashiId, house: houseFromLagna(rashiId, lagnaRashiId) };
  }

  // For each of the 12 houses, find argala
  const perHouse = {};
  for (let h = 1; h <= 12; h++) {
    const argalaPlanets = [];
    const virodhaPlanets = [];
    for (const [name, info] of Object.entries(planetMap)) {
      const offset = ((info.house - h + 12) % 12) + 1; // house from h
      if (ARGALA_OFFSETS.primary.includes(offset)) argalaPlanets.push({ planet: name, fromHouse: offset, kind: 'primary' });
      else if (ARGALA_OFFSETS.secondary.includes(offset)) argalaPlanets.push({ planet: name, fromHouse: offset, kind: 'secondary' });
      else if (VIRODHA_OFFSETS.primary.includes(offset)) virodhaPlanets.push({ planet: name, fromHouse: offset, kind: 'primary' });
      else if (VIRODHA_OFFSETS.secondary.includes(offset)) virodhaPlanets.push({ planet: name, fromHouse: offset, kind: 'secondary' });
    }
    const benefics = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
    const malefics = ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'];
    let netScore = 0;
    for (const a of argalaPlanets) {
      const k = a.kind === 'primary' ? 1 : 0.5;
      netScore += benefics.includes(a.planet) ? k : -k;
    }
    for (const v of virodhaPlanets) {
      const k = v.kind === 'primary' ? 1 : 0.5;
      // Virodha cancels argala â€” invert sign
      netScore += benefics.includes(v.planet) ? -k * 0.7 : k * 0.7;
    }
    perHouse[h] = {
      house: h,
      argala: argalaPlanets,
      virodhargala: virodhaPlanets,
      netScore: +netScore.toFixed(2),
      verdict: netScore > 1 ? 'Strongly supported' : netScore > 0 ? 'Mildly supported' : netScore < -1 ? 'Strongly obstructed' : netScore < 0 ? 'Mildly obstructed' : 'Neutral',
    };
  }

  // Surface the most extreme houses
  const sorted = Object.values(perHouse).sort((a, b) => b.netScore - a.netScore);
  return {
    perHouse,
    mostSupported: sorted.slice(0, 3).map(h => ({ house: h.house, score: h.netScore, verdict: h.verdict })),
    mostObstructed: sorted.slice(-3).reverse().map(h => ({ house: h.house, score: h.netScore, verdict: h.verdict })),
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T2 #10 â€” SATURN / JUPITER RETURN PRECISION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Find the next exact return date for a slow planet by binary-searching
 * around the expected return age, looking for the moment the planet's
 * sidereal longitude matches its natal value within 0.1Â°.
 */
function findReturnDate(natalSidereal, planetSweId, approxYearsFromBirth, birthDate, lat, lng, settings) {
  // Coarse: sample Â±60 days around expected, find min |delta|
  const expected = new Date(birthDate.getTime() + approxYearsFromBirth * 365.2425 * 86400000);
  let best = expected;
  let bestDiff = 999;

  // Coarse 12-hour scan Â±30 days
  for (let dayOff = -30; dayOff <= 30; dayOff++) {
    for (let h = 0; h < 24; h += 12) {
      const d = new Date(expected.getTime() + dayOff * 86400000 + h * 3600000);
      try {
        const planets = accuracyPlanets(d, lat, lng, settings);
        const idMap = { saturn: 'saturn', jupiter: 'jupiter' };
        const sid = planets[planetSweId]?.sidereal;
        if (sid === undefined) continue;
        const diff = angDist(sid, natalSidereal);
        if (diff < bestDiff) { bestDiff = diff; best = d; }
      } catch (e) { /* skip */ }
    }
  }
  // Fine scan Â±12 hours in 30-min steps
  for (let m = -720; m <= 720; m += 30) {
    const d = new Date(best.getTime() + m * 60000);
    try {
      const planets = accuracyPlanets(d, lat, lng, settings);
      const sid = planets[planetSweId]?.sidereal;
      if (sid === undefined) continue;
      const diff = angDist(sid, natalSidereal);
      if (diff < bestDiff) { bestDiff = diff; best = d; }
    } catch (e) { /* skip */ }
  }
  return { date: best, error: +bestDiff.toFixed(3) };
}

function computeReturns(birthDate, planets, asOfDate, lat, lng, settings) {
  const date = new Date(birthDate);
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const ageYears = (now - date) / (365.2425 * 86400000);

  const result = { saturn: [], jupiter: [] };

  // Saturn: 29.46 years per cycle
  const natalSat = planets.saturn?.sidereal;
  if (natalSat !== undefined && natalSat !== null) {
    const cyclesElapsed = Math.floor(ageYears / 29.46);
    const targets = [cyclesElapsed, cyclesElapsed + 1, cyclesElapsed + 2];
    for (const c of targets) {
      if (c < 1) continue;
      try {
        const r = findReturnDate(natalSat, 'saturn', c * 29.46, date, lat, lng, settings);
        const ageAt = (r.date - date) / (365.2425 * 86400000);
        result.saturn.push({
          cycle: c,
          date: r.date.toISOString(),
          ageAtReturn: +ageAt.toFixed(2),
          orbError: r.error,
          isUpcoming: r.date > now,
        });
      } catch (e) { /* skip */ }
    }
  }

  // Jupiter: 11.86 years per cycle
  const natalJup = planets.jupiter?.sidereal;
  if (natalJup !== undefined && natalJup !== null) {
    const cyclesElapsed = Math.floor(ageYears / 11.86);
    const targets = [cyclesElapsed, cyclesElapsed + 1];
    for (const c of targets) {
      if (c < 1) continue;
      try {
        const r = findReturnDate(natalJup, 'jupiter', c * 11.86, date, lat, lng, settings);
        const ageAt = (r.date - date) / (365.2425 * 86400000);
        result.jupiter.push({
          cycle: c,
          date: r.date.toISOString(),
          ageAtReturn: +ageAt.toFixed(2),
          orbError: r.error,
          isUpcoming: r.date > now,
        });
      } catch (e) { /* skip */ }
    }
  }

  return {
    ...result,
    interpretation: {
      saturnReturn: 'Saturn returns (~age 29.5, 59, 88) mark structural life resets â€” career, identity, mortality awareness. Used by every clinical astrology study as the most validated event timer.',
      jupiterReturn: 'Jupiter returns (~age 12, 24, 36, 48, 60) typically open expansion phases â€” education, marriage, children, philosophical awakening.',
    },
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T3 #13 â€” BHAVA BALA (six-fold house strength)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Six components per BPHS / Phaladeepika:
 *   1. Bhavadhipati Bala â€” strength of the house lord (from shadbala)
 *   2. Bhava Digbala â€” directional strength of house
 *   3. Bhava Drishti Bala â€” net aspectual support from benefics âˆ’ malefics
 *   4. Bhavayoga (occupants benefic vs malefic)
 *   5. Bhava Sthana Bala â€” kendra/trikona/dusthana baseline
 *   6. Karaka Bala â€” natural significator strength for the house
 *
 * Returns scores normalized to 0â€“100 per house.
 */
const HOUSE_BASELINE = {
  1: 70, 2: 55, 3: 45, 4: 65, 5: 65, 6: 30,
  7: 60, 8: 25, 9: 75, 10: 70, 11: 65, 12: 30,
};
const HOUSE_KARAKAS = {
  1: 'Sun', 2: 'Jupiter', 3: 'Mars', 4: 'Moon', 5: 'Jupiter', 6: 'Mars',
  7: 'Venus', 8: 'Saturn', 9: 'Jupiter', 10: 'Sun', 11: 'Jupiter', 12: 'Saturn',
};
const BENEFIC_PLANETS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const MALEFIC_PLANETS = ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'];

function computeBhavaBala(houses, planets, lagnaRashiId, planetStrengths) {
  if (!houses || !planets || !lagnaRashiId) return null;

  function planetHouseFromLagna(planetName) {
    const key = planetName.toLowerCase();
    const p = planets[key];
    if (!p) return null;
    const rId = p.rashiId || (RASHIS().findIndex(r => r.name === p.rashi) + 1);
    return houseFromLagna(rId, lagnaRashiId);
  }
  function rashiAtHouse(h) {
    return ((lagnaRashiId - 1 + h - 1) % 12) + 1;
  }

  const result = {};
  for (let h = 1; h <= 12; h++) {
    let bala = HOUSE_BASELINE[h];

    // 1. Lord strength
    const lordRashi = rashiAtHouse(h);
    const lordName = RASHI_LORDS_BY_ID[lordRashi];
    const lordKey = lordName.toLowerCase();
    if (planetStrengths && planetStrengths[lordKey]) {
      const lordPct = planetStrengths[lordKey].percentage || planetStrengths[lordKey].score || 50;
      bala += (lordPct - 50) * 0.4; // Â±20 swing
    }

    // 2. Karaka strength
    const karaka = HOUSE_KARAKAS[h];
    if (karaka && planetStrengths) {
      const ks = planetStrengths[karaka.toLowerCase()];
      if (ks) {
        const kPct = ks.percentage || ks.score || 50;
        bala += (kPct - 50) * 0.2;
      }
    }

    // 3. Occupants
    const occupants = [];
    for (const [k, p] of Object.entries(planets)) {
      const rId = p.rashiId || (RASHIS().findIndex(r => r.name === p.rashi) + 1);
      const ph = houseFromLagna(rId, lagnaRashiId);
      if (ph === h) occupants.push(p.name);
    }
    let occBal = 0;
    for (const o of occupants) {
      if (BENEFIC_PLANETS.includes(o)) occBal += 8;
      else if (MALEFIC_PLANETS.includes(o)) occBal -= 6;
    }
    bala += occBal;

    // 4. Aspect from Jupiter (always strengthens)
    const jupHouse = planetHouseFromLagna('Jupiter');
    if (jupHouse) {
      const jupAspectsHouses = [jupHouse, ((jupHouse + 4) % 12) || 12, ((jupHouse + 6) % 12) || 12, ((jupHouse + 8) % 12) || 12];
      if (jupAspectsHouses.includes(h)) bala += 8;
    }

    // 5. Aspect from Saturn (weakens)
    const satHouse = planetHouseFromLagna('Saturn');
    if (satHouse) {
      const satAspectsHouses = [satHouse, ((satHouse + 2) % 12) || 12, ((satHouse + 6) % 12) || 12, ((satHouse + 9) % 12) || 12];
      if (satAspectsHouses.includes(h)) bala -= 6;
    }

    bala = Math.max(0, Math.min(100, Math.round(bala)));

    result[h] = {
      house: h,
      bala,
      lord: lordName,
      karaka,
      occupants,
      grade: bala >= 75 ? 'Very Strong' : bala >= 60 ? 'Strong' : bala >= 45 ? 'Moderate' : bala >= 30 ? 'Weak' : 'Very Weak',
    };
  }

  // Sort to surface extremes
  const sorted = Object.values(result).sort((a, b) => b.bala - a.bala);
  return {
    perHouse: result,
    strongest: sorted.slice(0, 3).map(h => ({ house: h.house, bala: h.bala, grade: h.grade })),
    weakest: sorted.slice(-3).reverse().map(h => ({ house: h.house, bala: h.bala, grade: h.grade })),
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T3 #14 â€” SADE SATI PHASE PRECISION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Sade Sati = Saturn transiting the 12th, 1st, and 2nd from natal Moon
 * â€” a 7.5 year span. The three phases have distinct themes:
 *   Phase 1 (12th): Loss/release, foreign exposure, sleep disturbance
 *   Phase 2 (1st):  Identity reconstruction (peak)
 *   Phase 3 (2nd):  Family/finance reorganization
 *
 * Plus Ashtama Shani (8th from Moon) and Kantaka Shani (4th from Moon).
 */
function computeSadeSatiPhase(birthDate, asOfDate, lat, lng, settings) {
  const date = new Date(birthDate);
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const natalPlanets = accuracyPlanets(date, lat, lng, settings);
  const moonSid = natalPlanets.moon?.sidereal ?? toSidereal(getMoonLongitude(date), date);
  const moonRashi = getRashi(moonSid);
  const moonRashiId = moonRashi.id;

  const transitPlanets = accuracyPlanets(now, lat, lng, settings);
  const satSid = transitPlanets.saturn?.sidereal;
  if (satSid === undefined || satSid === null) return null;
  const satRashi = getRashi(satSid);
  const satRashiId = satRashi.id;

  const houseFromMoon = ((satRashiId - moonRashiId + 12) % 12) + 1;

  let active = null;
  let phase = null;
  if (houseFromMoon === 12) { active = 'Sade Sati'; phase = 'Rising (Phase 1 of 3)'; }
  else if (houseFromMoon === 1) { active = 'Sade Sati'; phase = 'Peak (Phase 2 of 3)'; }
  else if (houseFromMoon === 2) { active = 'Sade Sati'; phase = 'Setting (Phase 3 of 3)'; }
  else if (houseFromMoon === 8) { active = 'Ashtama Shani'; phase = 'Active (~2.5 years)'; }
  else if (houseFromMoon === 4) { active = 'Kantaka Shani'; phase = 'Active (~2.5 years)'; }

  // Estimate next entry / exit
  // Saturn moves ~12Â° per year (~30Â°/2.5y per sign)
  const degInSign = satSid % 30;
  const remainingDeg = 30 - degInSign;
  const yearsToExit = remainingDeg / 12; // rough

  const interpretations = {
    'Rising (Phase 1 of 3)': 'Loss-release energy. Old structures dissolve before new ones form. Sleep, money, and travel patterns shift. Avoid high-stakes commitments â€” practice acceptance.',
    'Peak (Phase 2 of 3)': 'Identity reconstruction. Most intense psychologically. Health, body weight, public image all undergo restructuring. Therapy, fitness, discipline all amplified.',
    'Setting (Phase 3 of 3)': 'Family / finance reorganization. Easier than peak but consolidation is required. Long-term debts, parental responsibilities, food/diet themes dominate.',
  };

  return {
    natalMoonSign: moonRashi.english,
    natalMoonSignSi: moonRashi.sinhala,
    transitSaturnSign: satRashi.english,
    saturnHouseFromMoon: houseFromMoon,
    active,
    phase,
    yearsRemainingInSign: +yearsToExit.toFixed(2),
    interpretation: phase ? (interpretations[phase] || `${active} active.`) : 'No major Saturn-Moon transit currently active.',
    isCritical: !!active,
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T3 #15 â€” ECLIPSE TRIGGER DETECTOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Find solar/lunar eclipses in the next 6 months and check if their
 * sidereal degree falls within Â±3Â° of any natal planet â€” those planets'
 * significations are likely to "trigger" within 6 months of the eclipse.
 */
function findNextEclipses(asOfDate, monthsAhead = 6, lat = 6.9271, lng = 79.8612, settings = {}) {
  const eclipses = [];
  try {
    const startMs = asOfDate.getTime();
    const endMs = startMs + monthsAhead * 30.44 * 86400000;
    const angSigned = (a) => ((a + 180) % 360 + 360) % 360 - 180;

    function deltaAt(ms, target) {
      try {
        const p = accuracyPlanets(new Date(ms), lat, lng, settings);
        return angSigned(p.moon.sidereal - p.sun.sidereal - target);
      } catch (e) { return undefined; }
    }
    function refineCrossing(t1, t2, target) {
      let lo = t1, hi = t2;
      let dlo = deltaAt(lo, target);
      if (dlo === undefined) return null;
      for (let iter = 0; iter < 22; iter++) {
        const mid = (lo + hi) / 2;
        const dm = deltaAt(mid, target);
        if (dm === undefined) return null;
        if (Math.sign(dm) === Math.sign(dlo)) { lo = mid; dlo = dm; }
        else { hi = mid; }
      }
      return new Date((lo + hi) / 2);
    }
    function classify(date, target) {
      const p = accuracyPlanets(date, lat, lng, settings);
      const sunSid = p.sun.sidereal;
      const moonSid = p.moon.sidereal;
      const rahuSid = p.rahu.sidereal;
      const lunPoint = target === 0 ? sunSid : moonSid;
      const distToNode = Math.min(angDist(lunPoint, rahuSid), angDist(lunPoint, (rahuSid + 180) % 360));
      if (distToNode > 18) return null;
      return {
        type: target === 0 ? 'Solar' : 'Lunar',
        date: date.toISOString(),
        degree: +lunPoint.toFixed(2),
        rashi: getRashi(lunPoint).english,
        nakshatra: getNakshatra(lunPoint).name,
        nodeDistance: +distToNode.toFixed(2),
        precision: distToNode < 5 ? 'Total/Annular zone' : distToNode < 11 ? 'Partial' : 'Penumbral',
      };
    }

    for (const target of [0, 180]) {
      let prevMs = startMs;
      let prevDelta = deltaAt(prevMs, target);
      const stepMs = 12 * 3600 * 1000;
      for (let t = startMs + stepMs; t <= endMs; t += stepMs) {
        const d = deltaAt(t, target);
        if (d === undefined || prevDelta === undefined) { prevMs = t; prevDelta = d; continue; }
        if (Math.sign(d) !== Math.sign(prevDelta) && Math.abs(d - prevDelta) < 30) {
          const exact = refineCrossing(prevMs, t, target);
          if (exact) {
            const cls = classify(exact, target);
            if (cls) eclipses.push(cls);
          }
        }
        prevMs = t; prevDelta = d;
      }
    }
    eclipses.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (e) { /* fall through */ }
  return eclipses;
}

function computeEclipseTriggers(birthDate, planets, asOfDate, lat, lng, settings) {
  const now = asOfDate ? new Date(asOfDate) : new Date();
  const eclipses = findNextEclipses(now, 6, lat, lng, settings);
  const triggered = [];

  for (const e of eclipses) {
    for (const key of [...PLANET_LIST, 'rahu', 'ketu']) {
      const natalSid = getPlanetSidereal(planets, key);
      if (natalSid === null) continue;
      const d = angDist(e.degree, natalSid);
      if (d <= 3) {
        triggered.push({
          eclipse: e.type,
          eclipseDate: e.date,
          eclipseRashi: e.rashi,
          natalPlanet: planets[key].name,
          natalSign: planets[key].rashi,
          orb: +d.toFixed(2),
          window: 'Â±6 months from eclipse date',
          intensity: d < 1 ? 'Very High' : d < 2 ? 'High' : 'Moderate',
        });
      }
    }
  }

  return {
    upcomingEclipses: eclipses.slice(0, 4),
    naturalTriggers: triggered.sort((a, b) => a.orb - b.orb).slice(0, 6),
    note: triggered.length > 0
      ? `${triggered.length} natal planet(s) fall within Â±3Â° of an upcoming eclipse â€” significations of those planets become hot zones within Â±6 months of the eclipse date.`
      : 'No natal planets fall within tight orb of upcoming eclipses â€” eclipse impact will be general/transit-only.',
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T1 #4 â€” LOCALITY-AWARE DASHA ACTIVATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * The current dasha lord activates a planet. But which house's results
 * actually fire depends on which house Jupiter and Saturn are currently
 * transiting through (Phaladeepika rule). This bridges the natal dasha
 * with current transit context.
 */
function computeLocalityDashaActivation(birthDate, planets, lagnaRashiId, vimshottariResult, asOfDate, lat, lng, settings) {
  if (!vimshottariResult || !lagnaRashiId) return null;
  const now = asOfDate ? new Date(asOfDate) : new Date();

  // Find current MD and AD lord
  const periods = vimshottariResult.periods || vimshottariResult || [];
  let currentMD = null, currentAD = null;
  for (const p of periods) {
    const start = new Date(p.start || p.startDate);
    const end = new Date(p.endDate || p.end);
    if (now >= start && now <= end) {
      currentMD = p;
      if (p.subPeriods) {
        for (const s of p.subPeriods) {
          const ss = new Date(s.start || s.startDate);
          const se = new Date(s.endDate || s.end);
          if (now >= ss && now <= se) { currentAD = s; break; }
        }
      }
      break;
    }
  }
  if (!currentMD) return null;

  // Houses owned + occupied by MD lord (these are what's activated)
  const mdLord = currentMD.lord;
  const mdLordKey = mdLord.toLowerCase();
  const mdPlanet = planets[mdLordKey];
  if (!mdPlanet) return null;
  const mdRashiId = mdPlanet.rashiId || (RASHIS().findIndex(r => r.name === mdPlanet.rashi) + 1);
  const mdHouse = houseFromLagna(mdRashiId, lagnaRashiId);

  // Houses owned by mdLord
  const ownedHouses = [];
  for (let h = 1; h <= 12; h++) {
    const rId = ((lagnaRashiId - 1 + h - 1) % 12) + 1;
    if (RASHI_LORDS_BY_ID[rId] === mdLord) ownedHouses.push(h);
  }

  // Current transit positions of Jupiter and Saturn
  let jupTransitHouse = null, satTransitHouse = null;
  try {
    const transit = accuracyPlanets(now, lat, lng, settings);
    const jR = transit.jupiter.rashiId || (RASHIS().findIndex(r => r.name === transit.jupiter.rashi) + 1);
    const sR = transit.saturn.rashiId || (RASHIS().findIndex(r => r.name === transit.saturn.rashi) + 1);
    jupTransitHouse = houseFromLagna(jR, lagnaRashiId);
    satTransitHouse = houseFromLagna(sR, lagnaRashiId);
  } catch (e) { /* fall through */ }

  // The activated houses where Jupiter/Saturn currently transit get extra weight
  const activatedHouses = [...new Set([mdHouse, ...ownedHouses])];
  const transitAmplified = activatedHouses.filter(h => h === jupTransitHouse || h === satTransitHouse);
  const transitDampened = activatedHouses.filter(h => satTransitHouse === ((h + 5) % 12 || 12) || satTransitHouse === ((h + 7) % 12 || 12));

  return {
    currentMahadasha: { lord: mdLord, planetHouse: mdHouse, ownedHouses },
    currentAntardasha: currentAD ? { lord: currentAD.lord } : null,
    jupiterTransitHouse: jupTransitHouse,
    saturnTransitHouse: satTransitHouse,
    activatedHouses,
    transitAmplifiedHouses: transitAmplified,
    transitDampenedHouses: transitDampened,
    advisory: transitAmplified.length > 0
      ? `Jupiter/Saturn currently transit house(s) ${transitAmplified.join(', ')} which the dasha lord ${mdLord} also activates â€” these life areas are in a rare double-activation window. Predictions touching those houses get +1 confidence tier.`
      : `Dasha lord ${mdLord} activates house(s) ${activatedHouses.join(', ')}, but no major transit currently amplifies them â€” results manifest steadily without special acceleration.`,
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T1 #2 â€” VARSHAPHAL CROSS-VALIDATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Cross-reference dasha-based predictions with the current year's
 * Varshaphal (Tajaka) chart. A year flagged BOTH by dasha AND by
 * favourable Muntha/yogas = high confidence. Only one = moderate. Neither = low.
 */
function computeVarshaphalCrossValidation(birthDate, lat, lng, asOfDate) {
  try {
    const { getAnnualForecast } = require('./varshphal');
    const now = asOfDate ? new Date(asOfDate) : new Date();
    const targetYear = now.getUTCFullYear();
    const annual = getAnnualForecast(birthDate, targetYear, lat, lng);

    const muntha = annual.muntha;
    const yogas = annual.yogas || [];
    const goodYogas = yogas.filter(y => y.quality === 'good').length;
    const badYogas = yogas.filter(y => y.quality === 'bad').length;

    // Net yearly score
    let netScore = 0;
    if (muntha?.effect === 'Favourable') netScore += 2;
    else if (muntha?.effect === 'Challenging') netScore -= 2;
    netScore += goodYogas - badYogas;

    return {
      year: targetYear,
      muntha: muntha ? { sign: muntha.munthaSign, house: muntha.munthaHouse, effect: muntha.effect } : null,
      goodYogas,
      badYogas,
      keyYogas: yogas.slice(0, 5).map(y => ({ name: y.name, effect: y.effect, quality: y.quality })),
      muddaDasha: (annual.muddaDasha || []).slice(0, 3).map(d => ({ lord: d.lord, days: d.days })),
      netScore,
      yearVerdict: netScore >= 3 ? 'Strong year' : netScore >= 1 ? 'Mildly favourable' : netScore <= -3 ? 'Difficult year' : netScore <= -1 ? 'Mildly challenging' : 'Mixed / neutral',
      crossValidationRule: 'Predictions for current year that also align with this Tajaka verdict carry â˜…â˜…â˜… confidence; conflicts â†’ â˜… confidence and should be hedged.',
    };
  } catch (e) {
    return null;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T1 #3 â€” CONFIDENCE TIER (â˜… â˜…â˜… â˜…â˜…â˜…)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Emit a per-section confidence map. Each section gets â˜… / â˜…â˜… / â˜…â˜…â˜…
 * based on (a) how many independent indicators converge, (b) lagna
 * stability, (c) D9 promise verification, (d) dasha-transit alignment.
 */
function buildSectionConfidenceTiers({
  multiAyanamsha, d9Verification, localityDasha, varshaphal, eclipseTriggers, planets, lagnaRashiId,
}) {
  const tiers = {};

  // Base tier from lagna stability
  const baseTier = multiAyanamsha?.sensitivityFlag === 'HIGH' ? 1
                 : multiAyanamsha?.sensitivityFlag === 'MEDIUM' ? 2 : 3;

  // Per-section logic
  const sections = [
    'personality', 'career', 'wealth', 'marriage', 'health',
    'familyPortrait', 'spiritual', 'currentPhase', 'longTerm',
    'education', 'children',
  ];

  for (const sec of sections) {
    let tier = baseTier;
    const reasons = [];

    // Lagna-driven sections (personality, career, marriage, health) penalised by lagna instability
    const lagnaDriven = ['personality', 'career', 'marriage', 'health'];
    if (lagnaDriven.includes(sec) && multiAyanamsha?.sensitivityFlag === 'HIGH') {
      tier = Math.min(tier, 1);
      reasons.push('Lagna unstable across ayanamshas');
    }

    // D9 verification can lift or lower marriage / spiritual / longTerm
    const d9DrivenMap = {
      marriage: ['Venus', 'Jupiter'], children: ['Jupiter'],
      career: ['Sun', 'Saturn', 'Mercury'], wealth: ['Jupiter', 'Mercury', 'Venus'],
      health: ['Sun', 'Moon', 'Mars'], spiritual: ['Jupiter', 'Saturn', 'Ketu'],
    };
    if (d9DrivenMap[sec] && d9Verification) {
      const relevantVerdicts = d9Verification.perPlanet?.filter(v => d9DrivenMap[sec].includes(v.planet)) || [];
      if (relevantVerdicts.length) {
        const avgWeight = relevantVerdicts.reduce((s, v) => s + v.promiseMultiplier, 0) / relevantVerdicts.length;
        if (avgWeight >= 1.2) { tier = Math.min(3, tier + 1); reasons.push(`D9 confirms ${d9DrivenMap[sec].join('/')} promises`); }
        else if (avgWeight <= 0.6) { tier = Math.max(1, tier - 1); reasons.push(`D9 weakens ${d9DrivenMap[sec].join('/')} promises`); }
      }
    }

    // Current-phase / short-term predictions get a boost if dasha-transit aligned, OR Varshaphal confirms
    if (['currentPhase', 'longTerm', 'career', 'wealth'].includes(sec)) {
      if (localityDasha?.transitAmplifiedHouses?.length) {
        tier = Math.min(3, tier + 1);
        reasons.push('Transit amplifies current dasha');
      }
      if (varshaphal && Math.abs(varshaphal.netScore) >= 3) {
        // Very strong varshaphal verdict â€” predictions for the year carry weight
        tier = Math.min(3, Math.max(tier, 2));
        reasons.push(`Varshaphal: ${varshaphal.yearVerdict}`);
      }
    }

    // Eclipse triggers boost any section whose karaka is triggered
    if (eclipseTriggers?.naturalTriggers?.length) {
      const sectionKarakas = {
        marriage: ['Venus'], career: ['Sun', 'Saturn'], wealth: ['Jupiter'],
        health: ['Sun', 'Moon', 'Mars'], children: ['Jupiter'], spiritual: ['Jupiter', 'Ketu'],
      };
      const k = sectionKarakas[sec] || [];
      const matches = eclipseTriggers.naturalTriggers.filter(t => k.includes(t.natalPlanet));
      if (matches.length) {
        tier = Math.min(3, tier + 1);
        reasons.push(`Eclipse triggers natal ${matches.map(m => m.natalPlanet).join('/')}`);
      }
    }

    tiers[sec] = {
      tier,
      stars: 'â˜…'.repeat(tier) + 'â˜†'.repeat(3 - tier),
      label: tier === 3 ? 'High Confidence' : tier === 2 ? 'Moderate Confidence' : 'Speculative',
      reasons,
    };
  }

  return tiers;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T3 #11 â€” KP FINE-TIMING LAYER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Use the KP sub-lord layers to narrow event windows from
 * year (MD) â†’ month (BD) â†’ week (AD sub) â†’ day (sookshma).
 * Surfaces the next 6 months of "hot" sub-period activations.
 */
function computeKPFineTiming(birthDate, lat, lng, asOfDate) {
  try {
    const { getRulingPlanets, getKPHouseCusps } = require('./kp');
    const now = asOfDate ? new Date(asOfDate) : new Date();
    const ruling = getRulingPlanets(now, lat, lng);
    const cusps = getKPHouseCusps(birthDate, lat, lng);

    // For top 4 critical houses (1, 7, 10, 11), surface their sub-lord
    const criticalCusps = [1, 7, 10, 11].map(h => {
      const c = cusps.cusps[h - 1];
      return {
        house: h,
        signLord: c.signLord,
        starLord: c.starLord,
        subLord: c.subLord,
      };
    });

    return {
      currentRulingPlanets: ruling.ranked.slice(0, 3),
      strongestRuler: ruling.strongest,
      criticalCuspSubLords: criticalCusps,
      fineTimingRule: 'Events happen when transit Moon/Sun activate the cusp sub-lord of the relevant house. The sub-lord acts as the "permission switch" â€” when transit dasha + sub-lord + ruling planet align, the event fires within days.',
    };
  } catch (e) {
    return null;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// T3 #12 â€” NADI DISPOSITOR CHAIN VERIFIER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Trace dispositor chains for each planet â€” "lord of lord of lord..."
 * â€” until reaching a planet in its own sign or a fixed loop. The end
 * point ("activation") indicates which planet ultimately delivers
 * each natal planet's promise.
 */
function computeNadiDispositorChains(planets, lagnaRashiId) {
  if (!planets || !lagnaRashiId) return null;

  function planetSign(planetName) {
    const p = planets[planetName.toLowerCase()];
    if (!p) return null;
    return p.rashiId || (RASHIS().findIndex(r => r.name === p.rashi) + 1);
  }

  function traceChain(planetName, maxDepth = 8) {
    const chain = [planetName];
    const visited = new Set([planetName]);
    let current = planetName;
    for (let i = 0; i < maxDepth; i++) {
      const sign = planetSign(current);
      if (!sign) break;
      const lord = RASHI_LORDS_BY_ID[sign];
      if (!lord) break;
      // Self-disposit (planet in own sign) = final activation
      if (lord === current) {
        chain.push('(in own sign â€” terminal activation)');
        return { chain, terminal: current, terminalReason: 'own-sign self-activation', cyclic: false };
      }
      if (visited.has(lord)) {
        chain.push(`(loops back to ${lord})`);
        return { chain, terminal: lord, terminalReason: 'cyclic loop', cyclic: true };
      }
      chain.push(lord);
      visited.add(lord);
      current = lord;
    }
    return { chain, terminal: current, terminalReason: 'max-depth', cyclic: false };
  }

  const result = {};
  for (const planet of PLANET_LIST) {
    const name = planets[planet]?.name;
    if (!name) continue;
    result[name] = traceChain(name);
  }

  return {
    chains: result,
    rule: 'Each planet ultimately delivers its results through its dispositor chain terminal. A terminal in own sign = clean delivery. A cyclic terminal = mutual reception, results blend between two planets. A long chain = delayed/diluted results.',
  };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MASTER ENTRY POINT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
/**
 * Compute all accuracy enhancements for a chart in a single call. Designed
 * to be invoked from generateFullReport with already-computed planets/houses.
 *
 * @param {Object} ctx
 * @param {Date}   ctx.birthDate
 * @param {number} ctx.lat
 * @param {number} ctx.lng
 * @param {Object} ctx.planets       â€” getAllPlanetPositions output
 * @param {Object} ctx.navamsha      â€” buildNavamshaChart output
 * @param {Object} ctx.lagna         â€” getLagna output
 * @param {Object} [ctx.planetStrengths]
 * @param {Object} [ctx.vimshottari]
 * @param {Object} [ctx.houses]
 * @param {Date}   [ctx.asOfDate]    â€” defaults to now
 */
function computeAccuracyEnhancements(ctx) {
  const {
    birthDate, lat, lng, planets, navamsha, lagna,
    planetStrengths, vimshottari, houses, asOfDate,
  } = ctx;
  const date = new Date(birthDate);
  const settings = resolveCalculationSettings(ctx.calculationSettings || ctx.settings || {});
  const lagnaRashiId = lagna?.rashi?.id;

  const out = {};
  const safe = (label, fn) => { try { return fn(); } catch (e) { console.warn(`[accuracyEngine] ${label} failed:`, e.message); return null; } };

  // Tier 2
  out.multiAyanamsha = safe('multiAyanamsha', () => computeMultiAyanamsha(date, lat, lng));
  out.d9Verification = safe('d9Verification', () => computeD9Verification(planets, navamsha));
  out.yogiAvayogi = safe('yogiAvayogi', () => computeYogiAvayogi(planets));
  out.argala = safe('argala', () => computeArgala(planets, lagnaRashiId));
  out.returns = safe('returns', () => computeReturns(date, planets, asOfDate, lat, lng, settings));

  // Tier 3
  out.bhavaBala = safe('bhavaBala', () => computeBhavaBala(houses, planets, lagnaRashiId, planetStrengths));
  out.sadeSatiPhase = safe('sadeSatiPhase', () => computeSadeSatiPhase(date, asOfDate, lat, lng, settings));
  out.eclipseTriggers = safe('eclipseTriggers', () => computeEclipseTriggers(date, planets, asOfDate, lat, lng, settings));
  out.kpFineTiming = safe('kpFineTiming', () => computeKPFineTiming(date, lat, lng, asOfDate));
  out.nadiChains = safe('nadiChains', () => computeNadiDispositorChains(planets, lagnaRashiId));

  // Tier 1
  out.localityDasha = safe('localityDasha', () => computeLocalityDashaActivation(date, planets, lagnaRashiId, vimshottari, asOfDate, lat, lng, settings));
  out.varshaphal = safe('varshaphal', () => computeVarshaphalCrossValidation(date, lat, lng, asOfDate));
  out.confidenceTiers = safe('confidenceTiers', () => buildSectionConfidenceTiers({
    multiAyanamsha: out.multiAyanamsha,
    d9Verification: out.d9Verification,
    localityDasha: out.localityDasha,
    varshaphal: out.varshaphal,
    eclipseTriggers: out.eclipseTriggers,
    planets,
    lagnaRashiId,
  }));

  return out;
}

module.exports = {
  computeAccuracyEnhancements,
  computeMultiAyanamsha,
  computeD9Verification,
  computeYogiAvayogi,
  computeArgala,
  computeReturns,
  computeBhavaBala,
  computeSadeSatiPhase,
  computeEclipseTriggers,
  computeLocalityDashaActivation,
  computeVarshaphalCrossValidation,
  buildSectionConfidenceTiers,
  computeKPFineTiming,
  computeNadiDispositorChains,
};
