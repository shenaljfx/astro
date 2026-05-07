const {
  BENCHMARK_CHARTS,
  PANCHANGA_BENCHMARKS,
  AYANAMSHA_BENCHMARKS,
} = require('./dataset');

const {
  getAllPlanetPositions,
  getLagna,
  getNakshatra,
  getPanchanga,
  getAyanamsha,
  calculateVimshottariDetailed,
} = require('../src/engine/astrology');

function isTithiMatch(actual, expected) {
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  return actual.split('/').includes(expected) || expected.split('/').includes(actual);
}

function assertEqual(failures, label, actual, expected) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertApprox(failures, label, actual, expected, tolerance) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > tolerance) {
    failures.push(`${label}: expected ${expected} +/- ${tolerance}, got ${actual}`);
  }
}

function validateChart(chart) {
  const failures = [];
  const date = new Date(chart.birthDate);
  const planets = getAllPlanetPositions(date, chart.lat, chart.lng);
  const lagna = getLagna(date, chart.lat, chart.lng);
  const expected = chart.expected || {};

  assertEqual(failures, `${chart.id}.lagna`, lagna.rashi?.english, expected.lagna?.english);

  for (const [key, expectedPlanet] of Object.entries(expected.planets || {})) {
    const planet = planets[key];
    assertEqual(failures, `${chart.id}.${key}.rashi`, planet?.rashiEnglish, expectedPlanet.english);
    if (typeof expectedPlanet.siderealApprox === 'number') {
      assertApprox(
        failures,
        `${chart.id}.${key}.sidereal`,
        planet?.sidereal,
        expectedPlanet.siderealApprox,
        expected.toleranceDeg || 0.5
      );
    }
  }

  if (expected.moonNakshatra) {
    assertEqual(failures, `${chart.id}.moonNakshatra`, getNakshatra(planets.moon.sidereal).name, expected.moonNakshatra);
  }

  if (expected.dashAtBirth) {
    const dashas = calculateVimshottariDetailed(planets.moon.sidereal, date);
    assertEqual(failures, `${chart.id}.dashAtBirth`, dashas?.[0]?.lord, expected.dashAtBirth);
  }

  return failures;
}

function validatePanchanga(item) {
  const failures = [];
  const date = new Date(item.date);
  const panchanga = getPanchanga(date, item.lat, item.lng);
  const expected = item.expected || {};

  if (expected.tithi && !isTithiMatch(panchanga.tithi?.name, expected.tithi)) {
    failures.push(`${item.id}.tithi: expected ${expected.tithi}, got ${panchanga.tithi?.name}`);
  }
  if (expected.vaara) assertEqual(failures, `${item.id}.vaara`, panchanga.vaara?.name, expected.vaara);
  if (expected.sunSign) assertEqual(failures, `${item.id}.sunSign`, panchanga.sunSign?.name, expected.sunSign);

  ['tithiEndsAt', 'nakshatraEndsAt', 'yogaEndsAt', 'karanaEndsAt'].forEach(key => {
    if (!panchanga.transitions?.[key]) failures.push(`${item.id}.${key}: missing transition end-time`);
  });

  return failures;
}

function validateAyanamsha(item) {
  const failures = [];
  const actual = getAyanamsha(new Date(item.date));
  assertApprox(failures, `ayanamsha.${item.date}`, actual, item.expected, item.tolerance);
  return failures;
}

function main() {
  const failures = [];

  BENCHMARK_CHARTS.forEach(chart => {
    failures.push(...validateChart(chart));
  });
  PANCHANGA_BENCHMARKS.forEach(item => {
    failures.push(...validatePanchanga(item));
  });
  AYANAMSHA_BENCHMARKS.forEach(item => {
    failures.push(...validateAyanamsha(item));
  });

  if (failures.length) {
    console.error(`Engine benchmark failed: ${failures.length} issue(s)`);
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Engine benchmark passed: ${BENCHMARK_CHARTS.length} charts, ${PANCHANGA_BENCHMARKS.length} panchanga cases, ${AYANAMSHA_BENCHMARKS.length} ayanamsha vectors`);
}

main();