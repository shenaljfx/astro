const {
  findCrossSectionDiscrepancies,
  reconcileDiscrepancies,
} = require('../crossSectionValidator');

describe('cross-section validator', () => {
  test('marks a single marriage timing mismatch as high-stakes', () => {
    const result = findCrossSectionDiscrepancies({
      marriage: {
        narrative: 'Your strongest marriage timing gathers around age 28 to 30, with relationship stability improving after that window.',
      },
      lifePredictions: {
        narrative: 'Marriage themes appear between ages 42 and 44, with a later relationship turning point.',
      },
    });

    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].event).toBe('marriage_age');
    expect(result.discrepancies[0].severity).toBe('high');
    expect(result.discrepancies[0].highStakes).toBe(true);
  });

  test('reconciles one high-stakes discrepancy with one editor call', async () => {
    const narrativeSections = {
      marriage: {
        narrative: 'Your strongest marriage timing gathers around age 28 to 30, with relationship stability improving after that window.',
      },
      lifePredictions: {
        narrative: 'Marriage themes appear between ages 42 and 44, with a later relationship turning point. This paragraph has enough detail to pass the length threshold used by the reconciler in production.',
      },
    };
    const { discrepancies } = findCrossSectionDiscrepancies(narrativeSections);
    const callGemini = jest.fn(async () => ({
      text: 'Marriage themes are strongest around age 28 to 30, matching the relationship section. This keeps the original life-pattern framing while correcting the timing window without making it a guaranteed event.',
    }));

    const result = await reconcileDiscrepancies({
      narrativeSections,
      discrepancies,
      callGemini,
      language: 'en',
    });

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(result.llmCalls).toBe(1);
    expect(result.reconciled).toBe(1);
    expect(result.sectionsUpdated).toEqual(['lifePredictions']);
  });
});
