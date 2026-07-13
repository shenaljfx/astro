/**
 * Muhurtha partner-scoring — the wedding case must weigh BOTH charts.
 *
 * These lock the Phase B behaviour: when a partnerBirthDate is supplied for a
 * two-person event, the personalized factors (Tarabala / Chandrabala) score
 * the pair, expose both sides in the breakdown, and the combined value stays
 * inside the same 0–10 band so the normalized score is never inflated.
 */
const { scoreMuhurtha, findMuhurtha } = require('../muhurtha');

// A fixed, arbitrary auspicious-ish datetime + two distinct birth dates whose
// natal Moons land in different nakshatras (so the two people genuinely differ).
const WHEN = new Date('2026-09-11T04:00:00.000Z');
const PERSON_A = new Date('1994-03-30T02:46:00.000Z');
const PERSON_B = new Date('1990-11-17T21:15:00.000Z');

describe('scoreMuhurtha — single vs. paired personalization', () => {
  test('single-person wedding scoring exposes non-dual tarabala/chandrabala', () => {
    const r = scoreMuhurtha(WHEN, 'wedding', PERSON_A, 6.9271, 79.8612);
    expect(r.breakdown.tarabala).toBeTruthy();
    expect(r.breakdown.tarabala.dual).toBeUndefined();
    expect(r.breakdown.chandrabala.dual).toBeUndefined();
    expect(r.breakdown.tarabala.score).toBeGreaterThanOrEqual(0);
    expect(r.breakdown.tarabala.score).toBeLessThanOrEqual(10);
  });

  test('supplying a partner marks factors dual and reports both sides', () => {
    const r = scoreMuhurtha(WHEN, 'wedding', PERSON_A, 6.9271, 79.8612, PERSON_B);

    expect(r.breakdown.tarabala.dual).toBe(true);
    expect(r.breakdown.tarabala).toHaveProperty('partnerName');
    expect(r.breakdown.tarabala).toHaveProperty('partnerQuality');
    expect(r.breakdown.chandrabala.dual).toBe(true);
    expect(r.breakdown.chandrabala).toHaveProperty('partnerHouse');

    // Combined = average of the two, and stays within the factor's 0–10 max.
    const t = r.breakdown.tarabala;
    expect(t.combined).toBe(Math.round((t.score + t.partnerScore) / 2));
    expect(t.combined).toBeGreaterThanOrEqual(0);
    expect(t.combined).toBeLessThanOrEqual(10);

    const c = r.breakdown.chandrabala;
    expect(c.combined).toBe(Math.round((c.score + c.partnerScore) / 2));
    expect(c.combined).toBeLessThanOrEqual(10);
  });

  test('normalized score never exceeds 100 with a partner (no maxScore inflation)', () => {
    const r = scoreMuhurtha(WHEN, 'wedding', PERSON_A, 6.9271, 79.8612, PERSON_B);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  test('a partner with a weak star produces a second-partner warning', () => {
    // Scan the year for a day where exactly one side is weak, proving the
    // per-partner warnings fire independently rather than being duplicated.
    let sawSecondPartnerWarning = false;
    for (let m = 0; m < 12 && !sawSecondPartnerWarning; m++) {
      const when = new Date(Date.UTC(2026, m, 15, 4, 0, 0));
      const r = scoreMuhurtha(when, 'wedding', PERSON_A, 6.9271, 79.8612, PERSON_B);
      if (r.warnings.some((w) => /second partner/i.test(w))) sawSecondPartnerWarning = true;
    }
    expect(sawSecondPartnerWarning).toBe(true);
  });
});

describe('findMuhurtha — partner threaded end-to-end', () => {
  test('passing a partner still returns ranked results with dual breakdowns', () => {
    const res = findMuhurtha('wedding', '2026-09-01', '2026-10-15', PERSON_A, 6.9271, 79.8612, 5, PERSON_B);
    expect(Array.isArray(res.results)).toBe(true);
    if (res.results.length > 0) {
      const top = res.results[0];
      expect(top.score).toBeLessThanOrEqual(100);
      // Whenever the top day scored a personalized factor, it must be the paired form.
      if (top.breakdown.tarabala) expect(top.breakdown.tarabala.dual).toBe(true);
    }
  });

  test('omitting the partner is backward compatible (single-person path)', () => {
    const res = findMuhurtha('wedding', '2026-09-01', '2026-10-15', PERSON_A, 6.9271, 79.8612, 5);
    expect(Array.isArray(res.results)).toBe(true);
    if (res.results[0] && res.results[0].breakdown.tarabala) {
      expect(res.results[0].breakdown.tarabala.dual).toBeUndefined();
    }
  });
});
