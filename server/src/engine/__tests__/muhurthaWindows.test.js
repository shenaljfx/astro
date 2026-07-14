/**
 * suggestTimeWindows — 2–3 auspicious windows inside ONE day.
 *
 * These lock the core promises of the "date is fixed — when exactly?" flow:
 *   1. No suggested window EVER overlaps Rahu Kalaya (nor Gulika/Yamaghanta
 *      for activities whose rules avoid them).
 *   2. Windows are daylight one-muhurtha slices, chronological, ≤ maxWindows.
 *   3. The avoid list names the periods (Rahu first-class) with display times.
 *   4. findMuhurtha only attaches per-day windows when explicitly asked.
 */
const { suggestTimeWindows, findMuhurtha } = require('../muhurtha');
const { calculateRahuKalaya, calculateSunriseSunset } = require('../astrology');

const LAT = 6.9271, LNG = 79.8612;
const DAY = '2026-09-11'; // Friday — a wedding-friendly weekday
const GROOM = new Date('1994-03-30T02:46:00.000Z');
const BRIDE = new Date('1990-11-17T21:15:00.000Z');

const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

describe('suggestTimeWindows — window mechanics', () => {
  const res = suggestTimeWindows(DAY, 'wedding', GROOM, LAT, LNG, BRIDE);

  test('returns 1–3 chronological daylight windows with display strings', () => {
    expect(res.date).toBe(DAY);
    expect(Array.isArray(res.windows)).toBe(true);
    expect(res.windows.length).toBeGreaterThanOrEqual(1);
    expect(res.windows.length).toBeLessThanOrEqual(3);

    const { sunrise, sunset } = calculateSunriseSunset(new Date(DAY), LAT, LNG);
    let prevStart = 0;
    for (const w of res.windows) {
      const s = new Date(w.start).getTime();
      const e = new Date(w.end).getTime();
      expect(e).toBeGreaterThan(s);
      expect(s).toBeGreaterThanOrEqual(sunrise.getTime());
      expect(e).toBeLessThanOrEqual(sunset.getTime());
      expect(s).toBeGreaterThan(prevStart); // chronological order
      prevStart = s;
      expect(typeof w.startDisplay).toBe('string');
      expect(w.startDisplay).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
      expect(w.score).toBeGreaterThanOrEqual(0);
      expect(w.score).toBeLessThanOrEqual(100);
      expect(typeof w.quality).toBe('string');
      expect(w.hora && typeof w.hora.ruler).toBe('string');
      expect(typeof w.hora.benefic).toBe('boolean');
      expect(w.daypart && w.daypart.en).toBeTruthy();
    }
  });

  test('no window overlaps Rahu Kalaya', () => {
    const rahu = calculateRahuKalaya(new Date(DAY), LAT, LNG);
    for (const w of res.windows) {
      expect(overlaps(
        new Date(w.start).getTime(), new Date(w.end).getTime(),
        rahu.start.getTime(), rahu.end.getTime()
      )).toBe(false);
    }
  });

  test('avoid list leads with named periods incl. Rahu Kalaya + Sinhala + displays', () => {
    const rahu = res.avoid.find(p => p.name === 'Rahu Kalaya');
    expect(rahu).toBeTruthy();
    expect(rahu.sinhala).toBe('රාහු කාලය');
    expect(rahu.severity).toBe('High');
    expect(rahu.startDisplay).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    // sorted by start time
    const starts = res.avoid.map(p => new Date(p.start).getTime());
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });

  test('wedding windows also clear Gulika and Yamaghanta (rules avoid both)', () => {
    const gulika = res.avoid.find(p => p.name === 'Gulika Kala');
    const yama = res.avoid.find(p => p.name === 'Yamaghanta');
    for (const w of res.windows) {
      const s = new Date(w.start).getTime(), e = new Date(w.end).getTime();
      if (gulika) expect(overlaps(s, e, new Date(gulika.start).getTime(), new Date(gulika.end).getTime())).toBe(false);
      if (yama) expect(overlaps(s, e, new Date(yama.start).getTime(), new Date(yama.end).getTime())).toBe(false);
    }
  });

  test('wedding day headline is pair-scored (dual tarabala) and window lagna present', () => {
    expect(res.day).toBeTruthy();
    expect(res.day.score).toBeGreaterThanOrEqual(0);
    expect(res.day.score).toBeLessThanOrEqual(100);
    if (res.day.breakdown.tarabala) expect(res.day.breakdown.tarabala.dual).toBe(true);
    // wedding has lagnaCheck → windows carry the rising sign
    for (const w of res.windows) {
      expect(w.lagna === null || typeof w.lagna.name === 'string').toBe(true);
    }
  });
});

describe('suggestTimeWindows — activity variants', () => {
  test('non-lagna activity (education) still yields Rahu-free windows', () => {
    const r = suggestTimeWindows(DAY, 'education', GROOM, LAT, LNG);
    expect(r.windows.length).toBeGreaterThanOrEqual(1);
    const rahu = calculateRahuKalaya(new Date(DAY), LAT, LNG);
    for (const w of r.windows) {
      expect(overlaps(
        new Date(w.start).getTime(), new Date(w.end).getTime(),
        rahu.start.getTime(), rahu.end.getTime()
      )).toBe(false);
    }
  });

  test('unknown activity throws', () => {
    expect(() => suggestTimeWindows(DAY, 'nonsense', null, LAT, LNG)).toThrow(/Unknown activity/);
  });

  test('works without any birth data (generic day)', () => {
    const r = suggestTimeWindows(DAY, 'business', null, LAT, LNG);
    expect(r.windows.length).toBeGreaterThanOrEqual(1);
    expect(r.day).toBeTruthy();
  });
});

describe('findMuhurtha — per-day time windows are opt-in', () => {
  test('with includeTimeWindows, each result day carries windows + avoid list', () => {
    const res = findMuhurtha('wedding', '2026-09-01', '2026-09-20', GROOM, LAT, LNG, 3, BRIDE, { includeTimeWindows: true });
    expect(res.results.length).toBeGreaterThan(0);
    for (const r of res.results) {
      expect(Array.isArray(r.timeWindows)).toBe(true);
      expect(r.timeWindows.length).toBeLessThanOrEqual(3);
      expect(Array.isArray(r.avoid)).toBe(true);
      const rahu = calculateRahuKalaya(new Date(r.dateTime), LAT, LNG);
      for (const w of r.timeWindows) {
        expect(overlaps(
          new Date(w.start).getTime(), new Date(w.end).getTime(),
          rahu.start.getTime(), rahu.end.getTime()
        )).toBe(false);
      }
    }
  });

  test('without the flag, results stay lean (backward compatible)', () => {
    const res = findMuhurtha('wedding', '2026-09-01', '2026-09-20', GROOM, LAT, LNG, 3, BRIDE);
    expect(res.results.length).toBeGreaterThan(0);
    for (const r of res.results) {
      expect(r.timeWindows).toBeUndefined();
    }
  });
});
