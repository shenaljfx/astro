const {
  REQUIRED_COVERAGE_TAGS,
  evaluateFixture,
  runPromptEvals,
} = require('../../../benchmark/validate-prompts');

describe('prompt eval harness', () => {
  test('passes committed offline fixtures and covers required regression tags', async () => {
    const result = await runPromptEvals();

    expect(result.pass).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.caseCount).toBeGreaterThan(REQUIRED_COVERAGE_TAGS.length);
    expect(result.coverage.missing).toEqual([]);
  });

  test('flags unsupported organ hallucinations in fixture narratives', () => {
    const result = evaluateFixture({
      id: 'unsafe-kidney-hallucination',
      sectionKey: 'health',
      sectionData: {
        organRisks: [{ organ: 'Kidneys & Urinary Tract', risk: 'LOW', indicators: 1 }],
        earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
      },
      narrative: 'This chart clearly shows kidney and urinary trouble later in life.',
      expectations: {
        maxHealthIssues: 0,
        maxTimingIssues: 0,
      },
    });

    expect(result.pass).toBe(false);
    expect(result.healthIssueTypes).toContain('unsupported_organ_mention');
  });
});
