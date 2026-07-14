/**
 * PROFESSION DIVERSITY HARNESS
 * ============================
 *
 * This is the COMPLEMENT to goldenCharts.test.js. Golden charts verify the
 * engine is CORRECT on charts whose answer we already know — but that is exactly
 * the loop that produced the "wood work career for everyone" overfit: tuning
 * rules until a handful of known charts pass, with nothing measuring what those
 * rules do to the other 99% of charts.
 *
 * This test measures OUTPUT SPREAD across many randomized charts. If any single
 * profession domain is the top-1 answer for too large a fraction of charts, a
 * rule is over-triggering (too loose a condition and/or too high a weight).
 *
 * It is deterministic (seeded PRNG) so CI is stable.
 */

const { rankParentProfessions } = require('../parentProfession');

// ── Deterministic PRNG (mulberry32) ──────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const DIGNITIES = ['Exalted', 'Own Sign', 'Mooltrikona', 'Friendly', 'Neutral', 'Enemy', 'Debilitated', 'Combust'];

function buildRandomEvidence(rand, parent) {
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  // Distribute the 9 planets across 12 houses (independent placement is enough
  // for a diversity stress test — Rahu/Ketu kept opposite for realism).
  const houseOf = {};
  for (const p of PLANETS) {
    if (p === 'Ketu') continue;
    houseOf[p] = 1 + Math.floor(rand() * 12);
  }
  houseOf.Ketu = ((houseOf.Rahu + 6 - 1) % 12) + 1;
  const planetsInHouse = (h) => PLANETS.filter((p) => houseOf[p] === h);

  const careerHouse = 1 + Math.floor(rand() * 12);
  const karaka = parent === 'mother' ? 'Moon' : 'Sun';

  // Four distinct houses feed the parent body/wealth/effort/business arrays.
  const houses4 = [];
  while (houses4.length < 4) {
    const h = 1 + Math.floor(rand() * 12);
    if (!houses4.includes(h)) houses4.push(h);
  }

  return {
    parent,
    careerLord: pick(PLANETS),
    careerLordHouse: 1 + Math.floor(rand() * 12),
    careerLordDignity: pick(DIGNITIES),
    careerLordShadbala: 20 + Math.floor(rand() * 70),
    careerHousePlanets: planetsInHouse(careerHouse),
    careerHouseSign: pick(SIGNS),
    parentKaraka: karaka,
    parentKarakaHouse: houseOf[karaka],
    parentKarakaSign: pick(SIGNS),
    d10Lagna: pick(SIGNS),
    parentBodyPlanets: planetsInHouse(houses4[0]),
    parentWealthPlanets: planetsInHouse(houses4[1]),
    parentEffortPlanets: planetsInHouse(houses4[2]),
    parentBusinessPlanets: planetsInHouse(houses4[3]),
  };
}

describe('parent-profession diversity (anti-overfit guard)', () => {
  const N = 500;
  const rand = mulberry32(0xC0FFEE);
  const topCounts = new Map();
  let total = 0;

  beforeAll(() => {
    for (let i = 0; i < N; i++) {
      for (const parent of ['mother', 'father']) {
        const ranking = rankParentProfessions(buildRandomEvidence(rand, parent), {
          topN: 5,
          nativeBirthYear: 1970 + Math.floor(rand() * 40),
          region: 'LK',
        });
        const top1 = ranking.top[0]?.occupation;
        if (top1) {
          topCounts.set(top1, (topCounts.get(top1) || 0) + 1);
          total++;
        }
      }
    }
  });

  test('distribution is printed for inspection', () => {
    const sorted = [...topCounts.entries()].sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line no-console
    console.log('\nTop-1 domain distribution over %d charts:', total);
    for (const [domain, count] of sorted.slice(0, 15)) {
      // eslint-disable-next-line no-console
      console.log(`  ${(100 * count / total).toFixed(1).padStart(5)}%  ${domain}`);
    }
    expect(total).toBeGreaterThan(0);
  });

  test('no single domain dominates the top-1 slot (>15%)', () => {
    const sorted = [...topCounts.entries()].sort((a, b) => b[1] - a[1]);
    const [worstDomain, worstCount] = sorted[0];
    const worstShare = worstCount / total;
    expect({ worstDomain, worstShare: Number(worstShare.toFixed(3)) }).toMatchObject({
      worstShare: expect.any(Number),
    });
    expect(worstShare).toBeLessThan(0.15);
  });

  test('furniture/timber does not dominate (the original overfit regression)', () => {
    let woodShare = 0;
    for (const [domain, count] of topCounts) {
      if (/furniture|timber|wood/i.test(domain)) woodShare += count;
    }
    woodShare /= total;
    expect(woodShare).toBeLessThan(0.10);
  });

  test('the engine surfaces a broad spread of domains as top-1', () => {
    expect(topCounts.size).toBeGreaterThanOrEqual(12);
  });
});
