/**
 * Convergence Calendar — deterministic dated-forecast composer tests.
 * Uses a synthetic natal chart + dasha ladder so expectations are exact,
 * plus one real end-to-end run through generateFullReport.
 */

const { buildConvergenceCalendar, DOMAINS, WEIGHTS } = require('../convergenceCalendar');

// ── Synthetic fixtures ────────────────────────────────────────────
// Lagna = Aries (id 1). Houses laid out whole-sign so house N has rashiId N.
const HOUSE_LORDS = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury',
  7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
};

function makeHouses(planetPlacements = {}) {
  // planetPlacements: { Saturn: 10, Venus: 7, ... }
  const houses = [];
  for (let h = 1; h <= 12; h++) {
    houses.push({
      houseNumber: h,
      rashiId: h,
      rashiLord: HOUSE_LORDS[h],
      planets: Object.entries(planetPlacements)
        .filter(([, house]) => house === h)
        .map(([name]) => ({ name })),
    });
  }
  return houses;
}

function makeDasha({ mdLord, adLord, pdLord, start, years = 10 }) {
  const startD = new Date(start);
  const end = new Date(startD.getTime() + years * 365.25 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return [{
    lord: mdLord,
    start: iso(startD),
    endDate: iso(end),
    antardashas: [{
      lord: adLord,
      start: iso(startD),
      endDate: iso(end),
      pratyantars: [{ lord: pdLord, start: iso(startD), endDate: iso(end) }],
    }],
  }];
}

// Fixed transit positions: Jupiter in Capricorn (rashiId 10 → house 10 from
// Aries lagna), Saturn in Cancer (rashiId 4 → house 4), Rahu in Sagittarius
// (rashiId 9 → house 9).
const fixedPositions = () => ({
  jupiter: { rashiId: 10 },
  saturn: { rashiId: 4 },
  rahu: { rashiId: 9 },
});

const BASE_CTX = {
  birthDate: new Date('1995-05-05T00:00:00Z'),
  lat: 6.9271,
  lng: 79.8612,
  settings: {},
  lagna: { rashi: { id: 1 } },
  asOfDate: new Date('2026-07-15T00:00:00Z'),
  months: 12,
  getPositions: fixedPositions,
};

describe('buildConvergenceCalendar', () => {
  test('returns 12 months with all six domains scored and clamped', () => {
    const cal = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({ Saturn: 10 }),
      dasaPeriods: makeDasha({ mdLord: 'Moon', adLord: 'Saturn', pdLord: 'Moon', start: '2020-01-01', years: 10 }),
    });
    expect(cal).not.toBeNull();
    expect(cal.months).toHaveLength(12);
    expect(cal.months[0].month).toBe('2026-07');
    expect(cal.months[11].month).toBe('2027-06');
    for (const row of cal.months) {
      for (const d of DOMAINS) {
        expect(row.scores[d]).toBeGreaterThanOrEqual(5);
        expect(row.scores[d]).toBeLessThanOrEqual(98);
      }
    }
  });

  test('AD lord occupying/ruling a career house lifts the career score by the configured weight', () => {
    // Saturn occupies house 10 AND rules 10/11 → career gets AD_LORD_HOUSE
    // + AD_LORD_KARAKA (Saturn is a career karaka) + Jupiter transit boosts.
    const withSaturnAD = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({ Saturn: 10 }),
      dasaPeriods: makeDasha({ mdLord: 'Moon', adLord: 'Saturn', pdLord: 'Moon', start: '2020-01-01' }),
    });
    const withMoonAD = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({ Saturn: 10 }),
      dasaPeriods: makeDasha({ mdLord: 'Venus', adLord: 'Moon', pdLord: 'Venus', start: '2020-01-01' }),
    });
    const careerWith = withSaturnAD.months[0].scores.career;
    const careerWithout = withMoonAD.months[0].scores.career;
    expect(careerWith - careerWithout).toBeGreaterThanOrEqual(WEIGHTS.AD_LORD_HOUSE);
    // Driver provenance recorded
    const signals = withSaturnAD.months[0].drivers.career.map(d => d.signal);
    expect(signals).toContain('ad_lord_house');
  });

  test('Jupiter transiting a domain house raises that domain (career here)', () => {
    // Jupiter fixed in house 10 → career house. Compare vs Jupiter in house 3
    // (aspects 7/9/11 — none of career's 10/6).
    const jupOnCareer = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({}),
      dasaPeriods: makeDasha({ mdLord: 'Venus', adLord: 'Moon', pdLord: 'Venus', start: '2020-01-01' }),
      getPositions: () => ({ jupiter: { rashiId: 10 }, saturn: { rashiId: 12 }, rahu: { rashiId: 1 } }),
    });
    const jupElsewhere = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({}),
      dasaPeriods: makeDasha({ mdLord: 'Venus', adLord: 'Moon', pdLord: 'Venus', start: '2020-01-01' }),
      getPositions: () => ({ jupiter: { rashiId: 3 }, saturn: { rashiId: 12 }, rahu: { rashiId: 1 } }),
    });
    expect(jupOnCareer.months[0].scores.career).toBeGreaterThan(jupElsewhere.months[0].scores.career);
  });

  test('eclipse hitting a domain planet flags the month and creates a driver', () => {
    const cal = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({}),
      dasaPeriods: makeDasha({ mdLord: 'Venus', adLord: 'Moon', pdLord: 'Venus', start: '2020-01-01' }),
      accuracy: {
        eclipseTriggers: {
          naturalTriggers: [{ eclipse: 'Solar', eclipseDate: '2026-08-12T00:00:00Z', natalPlanet: 'Venus', orb: 2, intensity: 'strong' }],
        },
      },
    });
    const aug = cal.months.find(m => m.month === '2026-08');
    expect(aug.eclipses).toHaveLength(1);
    const loveSignals = aug.drivers.love.map(d => d.signal);
    expect(loveSignals).toContain('eclipse_trigger');
  });

  test('windows merge contiguous months and carry tier + drivers', () => {
    const cal = buildConvergenceCalendar({
      ...BASE_CTX,
      houses: makeHouses({ Saturn: 10 }),
      dasaPeriods: makeDasha({ mdLord: 'Saturn', adLord: 'Saturn', pdLord: 'Saturn', start: '2020-01-01' }),
      accuracy: { yogiAvayogi: { yogiPlanet: 'Saturn', avayogiPlanet: 'Mars' } },
    });
    expect(cal.windows.length).toBeGreaterThan(0);
    const careerWin = cal.windows.find(w => w.domain === 'career' && w.type === 'opportunity');
    expect(careerWin).toBeDefined();
    expect(['★', '★★', '★★★']).toContain(careerWin.tier);
    expect(careerWin.drivers.length).toBeGreaterThan(0);
    // A stable dasha ladder + fixed transits → one merged 12-month window
    expect(careerWin.start).toBe('2026-07');
    expect(careerWin.end).toBe('2027-06');
  });

  test('returns null without houses or dasha data', () => {
    expect(buildConvergenceCalendar({ ...BASE_CTX, houses: [], dasaPeriods: [] })).toBeNull();
  });

  test('end-to-end: generateFullReport exposes sections.next12Months and _sectionScores', () => {
    const { generateFullReport } = require('../astrology');
    const report = generateFullReport(new Date('1998-10-09T03:46:00Z'), 6.9271, 79.8612, {});
    const cal = report.sections.next12Months;
    expect(cal).toBeTruthy();
    expect(cal.months).toHaveLength(12);
    expect(Array.isArray(cal.windows)).toBe(true);
    expect(cal.summary.bestMonth).toBeTruthy();
    expect(report.sections._sectionScores).toBeTruthy();
    expect(typeof report.sections._sectionScores.career).toBe('number');
  });
});
