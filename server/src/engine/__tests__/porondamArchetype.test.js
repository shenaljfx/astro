const {
  deriveArchetype, buildLagnaExplorer, buildCoupleReading, ARCHETYPES, BANDS, relationshipClass, pairTone,
} = require('../porondamArchetype');

describe('porondamArchetype — derivation coverage', () => {
  test('every sign pair (12×12) resolves to a real archetype', () => {
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        if (a === b) { /* same-sign still resolves */ }
        const arc = deriveArchetype(a, b, 'en');
        expect(ARCHETYPES[arc.id]).toBeDefined();
        expect(BANDS[arc.band]).toBeDefined();
        expect(typeof arc.name).toBe('string');
        expect(arc.name.length).toBeGreaterThan(0);
      }
    }
  });

  test('archetype is order-independent (bride→groom === groom→bride)', () => {
    for (let a = 1; a <= 12; a++) {
      for (let b = 1; b <= 12; b++) {
        expect(deriveArchetype(a, b, 'en').id).toBe(deriveArchetype(b, a, 'en').id);
        expect(deriveArchetype(a, b, 'en').band).toBe(deriveArchetype(b, a, 'en').band);
      }
    }
  });

  test('all four bands are reachable', () => {
    const seen = new Set();
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) if (a !== b) seen.add(deriveArchetype(a, b).band);
    expect(seen).toEqual(new Set(['harmony', 'magnetic', 'balanced', 'growth']));
  });

  test('trine (5/9) lands in harmony; 6-8 lands in growth', () => {
    expect(deriveArchetype(1, 5).band).toBe('harmony');   // Aries→Leo, trine
    expect(deriveArchetype(1, 6).band).toBe('growth');    // Aries→Virgo, 6th (shadashtaka)
    expect(deriveArchetype(1, 8).band).toBe('growth');    // Aries→Scorpio, 8th
    expect(deriveArchetype(1, 7).band).toBe('magnetic');  // Aries→Libra, 7th
  });

  test('relationshipClass + pairTone are symmetric', () => {
    expect(relationshipClass((((5 - 1) % 12) + 12) % 12)).toBe('trine');
    expect(pairTone(1, 5)).toBe(pairTone(5, 1));
  });
});

describe('porondamArchetype — lagna explorer', () => {
  test('explorer covers all 12 signs including the user’s own (same-lagna)', () => {
    const bands = buildLagnaExplorer(1, 'en');
    expect(bands.length).toBeGreaterThan(0);
    const items = bands.flatMap((g) => g.items);
    expect(items.length).toBe(12);
    const own = items.filter((it) => it.rashiId === 1);
    expect(own.length).toBe(1);
    expect(own[0].isSame).toBe(true);
    items.forEach((it) => {
      expect(typeof it.name).toBe('string');
      if (it.rashiId !== 1) expect(it.isSame).toBe(false);
    });
  });

  test('bands are ordered strongest→growth', () => {
    const bands = buildLagnaExplorer(1, 'en');
    const ranks = bands.map((b) => b.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
  });
});

describe('porondamArchetype — couple reading (gravity-tiered)', () => {
  const mockResult = (factors, total = 12) => ({ factors, totalScore: total, maxPossibleScore: 20 });

  test('strong factors become gifts, weak become nurture', () => {
    const r = buildCoupleReading(mockResult([
      { name: 'Nadi', score: 8, maxScore: 8 },
      { name: 'Gana', score: 0, maxScore: 2 },
    ]), 1, 5, 'en');
    expect(r.gifts.some((g) => /health/i.test(g.text))).toBe(true);
    expect(r.nurture.some((n) => /tempo|patience|pace/i.test(n.text))).toBe(true);
    expect(r.archetype.band).toBe('harmony');
    expect(r.traditionalCount).toEqual({ score: 12, max: 20 });
  });

  test('a hard veto (isDosha) produces a SIGNIFICANT nurture item + astrologer path', () => {
    const r = buildCoupleReading(mockResult([
      { name: 'Rajju', score: 0, maxScore: 5, isDosha: true },
      { name: 'Nadi', score: 8, maxScore: 8 },
    ]), 1, 6, 'en');
    const rajju = r.nurture.find((n) => /longevity/i.test(n.area));
    expect(rajju).toBeDefined();
    expect(rajju.severity).toBe('significant');
    expect(r.hasSignificant).toBe(true);
    // significant nurture defers to an astrologer, never a prescribed ritual
    expect(r.forwardPaths.some((p) => p.kind === 'astrologer')).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/pooja|puja|shanthi|ශාන්ති|temple|මන්ත්‍ර/i);
  });

  test('significant nurture sorts before gentle', () => {
    const r = buildCoupleReading(mockResult([
      { name: 'Gana', score: 0, maxScore: 2 },
      { name: 'Vedha', score: 0, maxScore: 2, isDosha: true },
    ]), 1, 6, 'en');
    expect(r.nurture[0].severity).toBe('significant');
  });

  test('Sinhala output uses elevated ඔබ, never casual ඔයා', () => {
    const r = buildCoupleReading(mockResult([
      { name: 'Nadi', score: 8, maxScore: 8 },
      { name: 'Rajju', score: 0, maxScore: 5, isDosha: true },
    ]), 4, 8, 'si');
    const blob = JSON.stringify(r);
    expect(blob).not.toMatch(/ඔයා/);
    expect(blob).toMatch(/ඔබ/);
  });
});
