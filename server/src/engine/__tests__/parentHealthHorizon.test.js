/**
 * PARENT HEALTH HORIZON — regression guard for the "2048 mother sick" bug.
 *
 * The plain parent lifespan cap (native age 50) TRUNCATED long dasha periods
 * to end exactly at the cap year, so for a 1998-born native the year 2048
 * appeared in nearly every report as a parent-health date. Parent wellness
 * windows must be near-term (active now or starting within ~7 years) and no
 * displayed year may exceed the horizon.
 */
const { filterNearTermParentWindows, PARENT_HEALTH_HORIZON_YEARS } = require('../lifespan');

const BIRTH = new Date('1998-10-09T09:16:00Z');
const NOW = new Date('2026-07-14T00:00:00Z');
const HORIZON_YEAR = NOW.getUTCFullYear() + PARENT_HEALTH_HORIZON_YEARS;

function years(item) {
  const all = String(item.period || `${item.start} to ${item.endDate || item.end}`).match(/\d{4}/g) || [];
  return all.map(Number);
}

describe('filterNearTermParentWindows (2048 regression)', () => {
  test('drops windows starting beyond the horizon (the 2048 class)', () => {
    const out = filterNearTermParentWindows(
      [{ start: '2040-01-01', endDate: '2048-01-01', period: '2040-01-01 to 2048-01-01' }],
      BIRTH, { now: NOW }
    );
    expect(out).toHaveLength(0);
  });

  test('drops windows already finished', () => {
    const out = filterNearTermParentWindows(
      [{ start: '2010-01-01', endDate: '2020-01-01', period: '2010-01-01 to 2020-01-01' }],
      BIRTH, { now: NOW }
    );
    expect(out).toHaveLength(0);
  });

  test('keeps a currently-active window but clips its displayed end to the horizon', () => {
    const out = filterNearTermParentWindows(
      [{ start: '2024-01-01', endDate: '2043-01-01', period: '2024-01-01 to 2043-01-01' }],
      BIRTH, { now: NOW }
    );
    expect(out).toHaveLength(1);
    expect(out[0].ongoingBeyondHorizon).toBe(true);
    for (const y of years(out[0])) {
      expect(y).toBeLessThanOrEqual(HORIZON_YEAR);
    }
  });

  test('keeps near-term windows untouched', () => {
    const item = { start: '2027-03-01', endDate: '2029-06-01', period: '2027-03-01 to 2029-06-01' };
    const out = filterNearTermParentWindows([item], BIRTH, { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].period).toBe(item.period);
    expect(out[0].ongoingBeyondHorizon).toBeUndefined();
  });

  test('no output item ever displays a year beyond the horizon', () => {
    const mixed = [
      { start: '2025-01-01', endDate: '2031-01-01', period: '2025-01-01 to 2031-01-01' },
      { start: '2030-01-01', endDate: '2048-01-01', period: '2030-01-01 to 2048-01-01' },
      { start: '2044-01-01', endDate: '2048-01-01', period: '2044-01-01 to 2048-01-01' },
    ];
    const out = filterNearTermParentWindows(mixed, BIRTH, { now: NOW });
    for (const item of out) {
      for (const y of years(item)) {
        expect(y).toBeLessThanOrEqual(HORIZON_YEAR);
      }
    }
  });
});
