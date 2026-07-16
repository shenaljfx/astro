const { getRashiDaily } = require('../rashiDaily');

describe('getRashiDaily (deterministic, ephemeris-driven)', () => {
  const out = getRashiDaily(new Date('2026-07-16T06:00:00Z'));

  test('returns all 12 signs with ready-to-post content', () => {
    expect(out.signs).toHaveLength(12);
    for (const s of out.signs) {
      expect(typeof s.quote).toBe('string');
      expect(s.quote.length).toBeGreaterThan(10);
      expect(typeof s.quoteSi).toBe('string');
      expect(s.moonHouse).toBeGreaterThanOrEqual(1);
      expect(s.moonHouse).toBeLessThanOrEqual(12);
      expect(s.score).toBeGreaterThanOrEqual(20);
      expect(s.score).toBeLessThanOrEqual(96);
      expect(['Favorable', 'Balanced', 'Take care']).toContain(s.rating);
      expect(s.lucky.number).toBeGreaterThanOrEqual(1);
      expect(s.lucky.number).toBeLessThanOrEqual(9);
    }
  });

  test('exactly one sign is in Chandrashtama (Moon in its 8th house)', () => {
    // For any Moon position, exactly one sign has the Moon in its 8th house.
    const ashtama = out.signs.filter((s) => s.chandrashtama);
    expect(ashtama).toHaveLength(1);
    expect(ashtama[0].moonHouse).toBe(8);
  });

  test('is deterministic — same date yields identical output', () => {
    const again = getRashiDaily(new Date('2026-07-16T06:00:00Z'));
    expect(again.signs.map((s) => s.quote)).toEqual(out.signs.map((s) => s.quote));
    expect(again.signs.map((s) => s.score)).toEqual(out.signs.map((s) => s.score));
  });
});
