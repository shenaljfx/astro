/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VARSHPHAL (TAJAKA) — Annual Solar Return Chart System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tajaka system predicts events for a specific year of life using:
 *   1. Solar Return Chart — chart for exact moment Sun returns to natal longitude
 *   2. Muntha — annual progression indicator (advances 1 sign per year)
 *   3. Tajaka Yogas — 16 special combinations unique to annual charts
 *   4. Mudda Dasha — compressed Vimshottari for the year (365 days total)
 *   5. Sahams — sensitive points for specific life areas
 *
 * Based on: Tajaka Neelakanthi, Varshaphala (Mantreswara)
 */

const {
  getAllPlanetPositions, getLagna, getSunLongitude, getAyanamsha,
  toSidereal, getRashi, getNakshatra, RASHIS, NAKSHATRAS, dateToJD,
} = require('./astrology');

const swe = require('@swisseph/node');
const { Planet: SwePlanet, CalculationFlag: SweFlag } = swe;

// ═══════════════════════════════════════════════════════════════════════════
// SOLAR RETURN — Find exact moment Sun returns to natal longitude
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find the solar return date for a given year (when the Sun returns to
 * its exact natal tropical longitude).
 */
function findSolarReturn(birthDate, targetYear) {
  const bDate = new Date(birthDate);
  const natalSunTrop = getSunLongitude(bDate);

  // Start search near the birthday in the target year
  let searchDate = new Date(Date.UTC(targetYear, bDate.getUTCMonth(), bDate.getUTCDate()));
  let bestDate = searchDate;
  let bestDiff = 360;

  // Coarse search: scan ±5 days in 2-hour steps
  for (let dayOff = -5; dayOff <= 5; dayOff++) {
    for (let hour = 0; hour < 24; hour += 2) {
      const d = new Date(searchDate.getTime() + dayOff * 86400000 + hour * 3600000);
      const sunTrop = getSunLongitude(d);
      let diff = Math.abs(sunTrop - natalSunTrop);
      if (diff > 180) diff = 360 - diff;
      if (diff < bestDiff) { bestDiff = diff; bestDate = d; }
    }
  }

  // Fine search: binary-style narrowing in 1-minute steps around best
  for (let step = 3600000; step >= 30000; step /= 2) {
    for (let off = -step * 4; off <= step * 4; off += step) {
      const d = new Date(bestDate.getTime() + off);
      const sunTrop = getSunLongitude(d);
      let diff = Math.abs(sunTrop - natalSunTrop);
      if (diff > 180) diff = 360 - diff;
      if (diff < bestDiff) { bestDiff = diff; bestDate = d; }
    }
  }

  return bestDate;
}

// ═══════════════════════════════════════════════════════════════════════════
// MUNTHA — Annual Progression
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Muntha sign = (Natal Lagna sign + age) mod 12.
 * Muntha in good houses (1,2,3,5,9,10,11) → favourable year;
 * in bad houses (6,8,12) → challenging year.
 */
function calculateMuntha(birthDate, targetYear, lat, lng) {
  const bDate = new Date(birthDate);
  const age = targetYear - bDate.getUTCFullYear();
  const natalLagna = getLagna(bDate, lat, lng);
  const lagnaRashiId = natalLagna.rashi.id;

  const munthaRashiId = ((lagnaRashiId - 1 + age) % 12) + 1;
  const munthaRashi = RASHIS[munthaRashiId - 1];

  // House position of Muntha from annual Lagna
  const solarReturnDate = findSolarReturn(birthDate, targetYear);
  const annualLagna = getLagna(solarReturnDate, lat, lng);
  const annualLagnaId = annualLagna.rashi.id;
  const munthaHouse = ((munthaRashiId - annualLagnaId + 12) % 12) + 1;

  const goodHouses = [1, 2, 3, 5, 9, 10, 11];
  const badHouses = [6, 8, 12];

  return {
    age,
    munthaSign: munthaRashi.english,
    munthaSignSinhala: munthaRashi.sinhala,
    munthaRashiId,
    munthaHouse,
    effect: goodHouses.includes(munthaHouse) ? 'Favourable'
          : badHouses.includes(munthaHouse) ? 'Challenging'
          : 'Mixed',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TAJAKA YOGAS — 16 special annual combinations
// ═══════════════════════════════════════════════════════════════════════════

function detectTajakaYogas(annualPlanets) {
  const yogas = [];
  const norm = (d) => ((d % 360) + 360) % 360;
  const angDist = (a, b) => { const d = Math.abs(a - b); return d > 180 ? 360 - d : d; };

  // 1. Ikkabal (Ejection) — Lord of Lagna weak
  // 2. Induvara — Moon with benefics
  const moonSid = annualPlanets.moon.sidereal;
  const jupSid = annualPlanets.jupiter.sidereal;
  const venSid = annualPlanets.venus.sidereal;
  const mercSid = annualPlanets.mercury.sidereal;

  if (angDist(moonSid, jupSid) < 15 || angDist(moonSid, venSid) < 15) {
    yogas.push({ name: 'Induvara Yoga', effect: 'Moon with benefics — emotional harmony, social success this year', quality: 'good' });
  }

  // 3. Ithasala — Applying aspect between two planets (faster approaching slower)
  const planetPairs = [
    ['jupiter', 'saturn'], ['venus', 'jupiter'], ['mars', 'jupiter'],
    ['mercury', 'jupiter'], ['sun', 'jupiter'], ['moon', 'venus'],
  ];
  for (const [a, b] of planetPairs) {
    const pa = annualPlanets[a];
    const pb = annualPlanets[b];
    if (!pa || !pb) continue;
    const dist = angDist(pa.sidereal, pb.sidereal);
    if (dist < 12 && pa.speed && pb.speed && Math.abs(pa.speed) > Math.abs(pb.speed)) {
      yogas.push({
        name: `Ithasala Yoga (${pa.name}-${pb.name})`,
        effect: `Applying aspect: ${pa.name} approaching ${pb.name} — promises fulfilment of ${pa.name}/${pb.name} significations`,
        quality: 'good',
      });
    }
  }

  // 4. Ishrafa — Separating aspect (unfulfilled promise)
  for (const [a, b] of planetPairs) {
    const pa = annualPlanets[a];
    const pb = annualPlanets[b];
    if (!pa || !pb) continue;
    const dist = angDist(pa.sidereal, pb.sidereal);
    if (dist > 12 && dist < 20 && pa.speed && pb.speed && Math.abs(pa.speed) > Math.abs(pb.speed)) {
      yogas.push({
        name: `Ishrafa Yoga (${pa.name}-${pb.name})`,
        effect: `Separating aspect: ${pa.name} moving away from ${pb.name} — opportunities may slip away`,
        quality: 'mixed',
      });
    }
  }

  // 5. Nakta Yoga — Exchange between night planets
  if (angDist(annualPlanets.moon.sidereal, annualPlanets.saturn.sidereal) < 15) {
    yogas.push({ name: 'Nakta Yoga', effect: 'Moon-Saturn close — patience required, slow but sure progress', quality: 'mixed' });
  }

  // 6. Yamaya Yoga — Day planets exchanging (Sun-Jupiter)
  if (angDist(annualPlanets.sun.sidereal, jupSid) < 15) {
    yogas.push({ name: 'Yamaya Yoga', effect: 'Sun-Jupiter close — authority, recognition, spiritual growth', quality: 'good' });
  }

  // 7. Manau Yoga — Benefic transfer of light
  if (angDist(venSid, jupSid) < 10 && angDist(jupSid, mercSid) < 10) {
    yogas.push({ name: 'Manau Yoga', effect: 'Benefic chain Venus→Jupiter→Mercury — excellent for learning, arts, and wealth', quality: 'good' });
  }

  // 8. Kamboola — Lagna lord and Moon lord in mutual aspect
  // 9. Gairi Kamboola — No mutual aspect
  // 10-16 are rarer, we include key ones

  // Dainya Yoga — Two planets in 6-8 from each other
  for (const [a, b] of [['sun', 'saturn'], ['moon', 'mars'], ['jupiter', 'mars']]) {
    const pa = annualPlanets[a];
    const pb = annualPlanets[b];
    if (!pa || !pb) continue;
    const hDist = Math.abs(Math.floor(pa.sidereal / 30) - Math.floor(pb.sidereal / 30));
    const hDistNorm = Math.min(hDist, 12 - hDist);
    if (hDistNorm === 5 || hDistNorm === 7) { // 6th or 8th from each other
      yogas.push({
        name: `Dainya Yoga (${pa.name}-${pb.name})`,
        effect: `${pa.name} and ${pb.name} in 6-8 axis — struggles, conflicts in their significations`,
        quality: 'bad',
      });
    }
  }

  return yogas;
}

// ═══════════════════════════════════════════════════════════════════════════
// MUDDA DASHA — Compressed Vimshottari for the year
// ═══════════════════════════════════════════════════════════════════════════

const DASA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];
const TOTAL = 120;

function calculateMuddaDasha(solarReturnDate, annualMoonSidereal) {
  const nakshatraSpan = 360 / 27;
  const nakIndex = Math.floor(annualMoonSidereal / nakshatraSpan);
  const degInNak = annualMoonSidereal % nakshatraSpan;
  const fractionRemaining = 1 - degInNak / nakshatraSpan;

  const nak = NAKSHATRAS[nakIndex] || NAKSHATRAS[0];
  const startLordIdx = DASA_LORDS.indexOf(nak.lord);

  const dashas = [];
  let currentDate = new Date(solarReturnDate);
  const yearMs = 365.25 * 24 * 60 * 60 * 1000;

  // First dasha — balance
  const firstLord = DASA_LORDS[startLordIdx];
  const firstProportion = DASA_YEARS[startLordIdx] / TOTAL;
  const firstDays = firstProportion * 365.25 * fractionRemaining;
  const firstEnd = new Date(currentDate.getTime() + firstDays * 86400000);

  dashas.push({
    lord: firstLord,
    days: Math.round(firstDays),
    start: new Date(currentDate),
    end: firstEnd,
    isBalance: true,
  });
  currentDate = firstEnd;

  // Remaining dashas for the year
  for (let i = 1; i < 9; i++) {
    const idx = (startLordIdx + i) % 9;
    const lord = DASA_LORDS[idx];
    const proportion = DASA_YEARS[idx] / TOTAL;
    const days = proportion * 365.25;
    const endDate = new Date(currentDate.getTime() + days * 86400000);

    // Stop if we go beyond the year
    if (currentDate.getTime() - solarReturnDate.getTime() > yearMs) break;

    dashas.push({
      lord,
      days: Math.round(days),
      start: new Date(currentDate),
      end: endDate,
    });
    currentDate = endDate;
  }

  return dashas;
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER — Complete annual forecast
// ═══════════════════════════════════════════════════════════════════════════

function getAnnualForecast(birthDate, targetYear, lat = 6.9271, lng = 79.8612) {
  const bDate = new Date(birthDate);
  const solarReturnDate = findSolarReturn(birthDate, targetYear);

  // Annual chart
  const annualPlanets = getAllPlanetPositions(solarReturnDate, lat, lng);
  const annualLagna = getLagna(solarReturnDate, lat, lng);

  // Muntha
  const muntha = calculateMuntha(birthDate, targetYear, lat, lng);

  // Tajaka Yogas
  const tajakaYogas = detectTajakaYogas(annualPlanets);

  // Mudda Dasha
  const muddaDasha = calculateMuddaDasha(solarReturnDate, annualPlanets.moon.sidereal);

  // Year quality score
  const goodYogas = tajakaYogas.filter(y => y.quality === 'good').length;
  const badYogas = tajakaYogas.filter(y => y.quality === 'bad').length;
  const munthaBonus = muntha.effect === 'Favourable' ? 15 : muntha.effect === 'Challenging' ? -15 : 0;
  const yearScore = Math.min(100, Math.max(0, 50 + goodYogas * 10 - badYogas * 10 + munthaBonus));

  return {
    year: targetYear,
    age: muntha.age,
    solarReturnDate: solarReturnDate.toISOString(),
    annualLagna: {
      sign: annualLagna.rashi.english,
      sinhala: annualLagna.rashi.sinhala,
      degree: annualLagna.sidereal.toFixed(2),
    },
    muntha,
    tajakaYogas,
    muddaDasha,
    annualPlanets: Object.fromEntries(
      Object.entries(annualPlanets).map(([k, v]) => [k, {
        sign: v.rashiEnglish, degree: v.sidereal.toFixed(2), isRetrograde: v.isRetrograde,
      }])
    ),
    yearScore,
    yearOutlook: yearScore >= 70 ? 'Very Promising' : yearScore >= 55 ? 'Favourable' : yearScore >= 40 ? 'Mixed' : 'Challenging',
  };
}

module.exports = {
  findSolarReturn,
  calculateMuntha,
  detectTajakaYogas,
  calculateMuddaDasha,
  getAnnualForecast,
};
