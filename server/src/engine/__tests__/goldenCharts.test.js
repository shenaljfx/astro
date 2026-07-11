/**
 * GOLDEN CHART SUITE — calculation-correctness regression tests.
 *
 * Locks in the astronomical, dasha and matching invariants that the two
 * critical July-2026 bugs (1996–2006 timezone, balance-mahadasha antardashas)
 * and the porondam scoring errors slipped past. Values are anchored to
 * independently verifiable references (Lahiri ayanamsha, Drik/JHora sidereal
 * positions, classical Vimshottari/Jaimini/porutham rules) with tolerances.
 *
 * When adding a new reference chart, validate its expected longitudes against
 * JHora or Drik Panchang before pinning them here.
 */

const astro = require('../astrology');
const dasha = require('../dasha');
const porondam = require('../porondam');
const { parseBirthDateTimeWithContext } = require('../../services/timezone');

const NAK = (i) => 360 / 27 * (i - 1) + 0.5; // mid-ish longitude of nakshatra i (1-based)

describe('astronomy — Lahiri sidereal invariants', () => {
  const d2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

  test('Lahiri ayanamsha at J2000 is ~23.85°', () => {
    const ay = astro.getAyanamsha(d2000);
    expect(ay).toBeGreaterThan(23.83);
    expect(ay).toBeLessThan(23.88);
  });

  test('Rahu and Ketu are exactly 180° apart', () => {
    const p = astro.getAllPlanetPositions(d2000, 6.9271, 79.8612);
    const sep = ((p.ketu.sidereal - p.rahu.sidereal) % 360 + 360) % 360;
    expect(Math.abs(sep - 180)).toBeLessThan(1e-6);
  });

  test('sidereal = tropical − ayanamsha for the Sun', () => {
    const p = astro.getAllPlanetPositions(d2000, 6.9271, 79.8612);
    const ay = astro.getAyanamsha(d2000);
    const expected = ((p.sun.tropical - ay) % 360 + 360) % 360;
    expect(Math.abs(p.sun.sidereal - expected)).toBeLessThan(0.01);
  });

  test('Sun sidereal on 2000-01-01 12:00 UTC ≈ 256.4° (Drik reference)', () => {
    const p = astro.getAllPlanetPositions(d2000, 6.9271, 79.8612);
    expect(Math.abs(p.sun.sidereal - 256.4)).toBeLessThan(0.6);
    expect(p.sun.rashiEnglish).toBe('Sagittarius');
  });

  test('ephemeris did not silently fall back to Moshier', () => {
    astro.getAllPlanetPositions(d2000, 6.9271, 79.8612);
    // Swiss Ephemeris must be the active provider in the test env.
    expect(astro.getEphemerisFallbackStats().count).toBe(0);
  });
});

describe('timezone — Sri Lanka historical offsets', () => {
  test('1996-08 birth → +6:30 civil offset', async () => {
    const p = await parseBirthDateTimeWithContext('1996-08-01T10:00:00', 6.9271, 79.8612);
    expect(p.timeContext.offsetSeconds).toBe(23400);
  });
  test('1998 birth → +6:00 civil offset (was the bug)', async () => {
    const p = await parseBirthDateTimeWithContext('1998-10-09T09:16:00', 6.9271, 79.8612);
    expect(p.timeContext.offsetSeconds).toBe(21600);
    expect(p.date.toISOString()).toBe('1998-10-09T03:16:00.000Z');
  });
  test('2010 birth → +5:30 (modern)', async () => {
    const p = await parseBirthDateTimeWithContext('2010-06-15T10:00:00', 6.9271, 79.8612);
    expect(p.timeContext.offsetSeconds).toBe(19800);
  });
});

describe('Vimshottari dasha — structure & balance-mahadasha correctness', () => {
  const birth = new Date(Date.UTC(1995, 0, 1));
  // Moon 50% through Rohini (Moon-ruled nakshatra #4). Balance = 5.0y of Moon MD.
  const moonLong = 40 + (360 / 27) * 0.5;
  const periods = astro.calculateVimshottariDetailed(moonLong, birth);

  test('nine mahadashas totalling 120 years', () => {
    expect(periods).toHaveLength(9);
    const total = periods.reduce((s, p) => s + p.years, 0);
    // First is a balance (~5y), so full total is 120 − elapsed(5) = 115.
    expect(total).toBeGreaterThan(114);
    expect(total).toBeLessThan(116);
  });

  test('birth mahadasha is Moon with ~5y balance', () => {
    expect(periods[0].lord).toBe('Moon');
    expect(Math.abs(periods[0].years - 5)).toBeLessThan(0.05);
  });

  test('at birth the native is MID-sequence: first antardasha is Moon–Saturn', () => {
    // Elapsed 5y of Moon MD: Mo(0.83)+Ma(0.58)+Ra(1.5)+Ju(1.33) = 4.25y done,
    // so birth lands inside Moon–Saturn. The old code wrongly emitted Moon–Moon.
    expect(periods[0].antardashas[0].lord).toBe('Saturn');
  });

  test('antardashas are contiguous and end with the mahadasha', () => {
    const md = periods[1]; // first full MD (Mars)
    for (let i = 1; i < md.antardashas.length; i++) {
      expect(md.antardashas[i].start).toBe(md.antardashas[i - 1].endDate);
    }
    expect(md.antardashas[md.antardashas.length - 1].endDate).toBe(md.endDate);
  });

  test('no sub-period starts before birth', () => {
    const birthISO = birth.toISOString().split('T')[0];
    for (const ad of periods[0].antardashas) {
      expect(ad.start >= birthISO).toBe(true);
      for (const pd of ad.pratyantars) expect(pd.start >= birthISO).toBe(true);
    }
  });
});

describe('Yogini dasha — classical starting yogini', () => {
  const cases = [
    { nak: 1, name: 'Ashwini', expect: 'Bhramari' }, // (1+3)%8=4 → 4th yogini
    { nak: 5, name: 'Mrigashira', expect: 'Sankata' }, // (5+3)%8=0 → 8th yogini
    { nak: 8, name: 'Pushya', expect: 'Dhanya' }, // (8+3)%8=3 → 3rd yogini
  ];
  for (const c of cases) {
    test(`${c.name} → ${c.expect}`, () => {
      const y = dasha.calculateYoginiDasha(NAK(c.nak), new Date(Date.UTC(1995, 0, 1)));
      expect(y.dashas[0].lord).toBe(c.expect);
    });
  }
});

describe('Chara dasha — Jaimini duration rules', () => {
  const chara = dasha.calculateCharaDasha(new Date(Date.UTC(1995, 0, 1)), 6.9271, 79.8612);
  test('12 signs per cycle, each 1–13 years', () => {
    const cycle = chara.dashas.slice(0, 12);
    expect(cycle).toHaveLength(12);
    for (const d of cycle) {
      expect(d.years).toBeGreaterThanOrEqual(1);
      expect(d.years).toBeLessThanOrEqual(13);
    }
  });
});

describe('Porondam — classical scoring gates', () => {
  const mkNak = (id, pada = 1) => {
    const names = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
    return { id, name: names[id - 1], pada };
  };
  const mkRashi = (id) => {
    const names = ['Mesha','Vrishabha','Mithuna','Kataka','Simha','Kanya','Tula','Vrischika','Dhanus','Makara','Kumbha','Meena'];
    return { id, name: names[id - 1] };
  };

  test('Gana: Deva–Rakshasa scores 0 (was wrongly 1)', () => {
    // Ashwini = Deva, Krittika = Rakshasa
    const g = porondam.calculateGanaPorondam(mkNak(1), mkNak(3));
    expect(g.score).toBe(0);
  });

  test('Gana: same gana scores full 2', () => {
    const g = porondam.calculateGanaPorondam(mkNak(1), mkNak(5)); // both Deva
    expect(g.score).toBe(2);
  });

  test('Rashi: 6-8 shadashtaka scores 0 and flags a dosha', () => {
    const r = porondam.calculateRashiPorondam(mkRashi(1), mkRashi(6)); // Mesha vs Kanya
    expect(r.score).toBe(0);
    expect(r.isDosha).toBe(true);
  });

  test('Rashi: 7th (opposition) scores full 2', () => {
    const r = porondam.calculateRashiPorondam(mkRashi(1), mkRashi(7));
    expect(r.score).toBe(2);
  });

  test('Rajju: same limb is a hard veto (score 0)', () => {
    // Ashwini(1) and Ashlesha(9) are both Pada rajju.
    const rj = porondam.calculateRajjuPorondam(mkNak(1), mkNak(9));
    expect(rj.score).toBe(0);
    expect(rj.isDosha).toBe(true);
    expect(rj.isHardVeto).toBe(true);
  });

  test('Rajju: different limbs score full', () => {
    // Ashwini(1)=Pada, Bharani(2)=Kati
    const rj = porondam.calculateRajjuPorondam(mkNak(1), mkNak(2));
    expect(rj.isDosha).toBe(false);
    expect(rj.score).toBe(rj.maxScore);
  });

  test('Vedha: a Vedha pair is a hard veto (score 0)', () => {
    // Ashwini(1) ↔ Jyeshtha(18) is a Vedha pair.
    const v = porondam.calculateVedhaPorondam(mkNak(1), mkNak(18));
    expect(v.score).toBe(0);
    expect(v.isDosha).toBe(true);
  });

  test('Nadi: same Nadi cancelled when stars differ across different rashis', () => {
    // Ashwini(1)=Aadi, Ardra(6)=Aadi (same nadi), different stars.
    const n = porondam.calculateNadiPorondam(mkNak(1), mkNak(6), mkRashi(1), mkRashi(3));
    expect(n.isDosha).toBe(false);
    expect(n.parihara).toBeTruthy();
  });

  test('Nadi: uncancelled same-Nadi same-star is a dosha', () => {
    const n = porondam.calculateNadiPorondam(mkNak(1, 1), mkNak(1, 1), mkRashi(1), mkRashi(1));
    expect(n.isDosha).toBe(true);
    expect(n.score).toBe(0);
  });

  test('full porondam caps rating at Caution/Below Average under a hard veto', () => {
    const bride = new Date(Date.UTC(1995, 2, 15, 3, 0));
    const groom = new Date(Date.UTC(1993, 6, 22, 8, 30));
    const res = porondam.calculatePorondam(bride, groom);
    expect(res.maxPossibleScore).toBe(20);
    if (res.hasHardVeto) {
      expect(['Caution', 'Below Average']).toContain(res.rating);
    }
  });
});
