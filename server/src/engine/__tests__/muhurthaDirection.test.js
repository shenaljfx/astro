/**
 * Disha Shoola direction guidance — weekday → blocked/best direction.
 * Reference dates: 2026-09-11 is a Friday (so 09-07 Mon … 09-13 Sun).
 * Times are midday-ish UTC so the local weekday matches UTC in any sane TZ.
 */
const { scoreMuhurtha, getTravelDirections } = require('../muhurtha');

describe('getTravelDirections — Disha Shoola weekday rule', () => {
  const cases = [
    ['2026-09-07T04:00:00Z', 'Monday', 'East', 'West'],
    ['2026-09-08T04:00:00Z', 'Tuesday', 'North', 'South'],
    ['2026-09-09T04:00:00Z', 'Wednesday', 'North', 'South'],
    ['2026-09-10T04:00:00Z', 'Thursday', 'South', 'North'],
    ['2026-09-11T04:00:00Z', 'Friday', 'West', 'East'],
    ['2026-09-12T04:00:00Z', 'Saturday', 'East', 'West'],
    ['2026-09-13T04:00:00Z', 'Sunday', 'West', 'East'],
  ];

  test.each(cases)('%s (%s): avoid %s, best %s', (iso, _day, avoid, best) => {
    const d = getTravelDirections(new Date(iso));
    expect(d.avoid.en).toBe(avoid);
    expect(d.best.en).toBe(best);
    // avoid/best are always opposites, and Sinhala names are present
    expect(d.avoid.si).toBeTruthy();
    expect(d.best.si).toBeTruthy();
    expect(d.rule).toBe('Disha Shoola');
  });

  test('scoreMuhurtha result carries the direction block', () => {
    const r = scoreMuhurtha(new Date('2026-09-10T04:00:00Z'), 'travel', null, 6.9271, 79.8612);
    expect(r.direction).toBeTruthy();
    expect(r.direction.avoid.en).toBe('South');
    expect(r.direction.best.en).toBe('North');
    expect(r.direction.best.si).toBe('උතුර');
  });
});
