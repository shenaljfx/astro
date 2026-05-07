const {
  PROMPT_VERSION,
  countClaims,
  buildSectionGenerationMetadata,
  buildUnsupportedTermAnalytics,
  buildPromptFeedbackRecord,
  buildFeedbackSummary,
  summarizePromptValidationMetadata,
  buildPromptRunMetadata,
} = require('../promptObservability');
const { PROMPT_POLICY_VERSION } = require('../promptPolicies');

describe('prompt observability metadata', () => {
  test('counts allowed and omitted claims by category and sensitivity', () => {
    const counts = countClaims({
      allowedClaims: [
        { category: 'timing_window', sensitivity: 'medium' },
        { category: 'wellness_pattern', sensitivity: 'health' },
        { category: 'relationship_timing', sensitivity: 'relationship' },
      ],
      omitTopics: [{ organKey: 'kidneys' }, { organKey: 'lungs' }],
    });

    expect(counts.allowed).toBe(3);
    expect(counts.omitted).toBe(2);
    expect(counts.timing).toBe(1);
    expect(counts.health).toBe(1);
    expect(counts.relationship).toBe(1);
    expect(counts.byCategory.timing_window).toBe(1);
  });

  test('builds section metadata with prompt versions and validation summary', () => {
    const metadata = buildSectionGenerationMetadata({
      sectionKey: 'health',
      model: 'gemini-test',
      temperature: 0.35,
      promptClaims: {
        sectionPolicy: { sensitivity: 'high' },
        policyVersion: PROMPT_POLICY_VERSION,
        allowedClaims: [{ category: 'wellness_pattern', sensitivity: 'health', organKey: 'heart' }],
        omitTopics: [{ organKey: 'kidneys' }],
      },
      validation: {
        severity: 3,
        redFlags: [{ type: 'diagnosis' }],
        hallucinations: { suspect: [{ type: 'unsupported' }] },
        healthSafety: { issues: [{ type: 'unsupported_organ_mention' }] },
        timingSafety: { issues: [] },
        language: { ok: true },
        selfCritiqued: true,
      },
    });

    expect(metadata.promptVersion).toBe(PROMPT_VERSION);
    expect(metadata.promptPolicyVersion).toBe(PROMPT_POLICY_VERSION);
    expect(metadata.sectionKey).toBe('health');
    expect(metadata.claimCounts.health).toBe(1);
    expect(metadata.validationSummary.healthIssues).toBe(1);
    expect(metadata.validationSummary.selfCritiqued).toBe(true);
  });

  test('summarizes validation totals for run metadata', () => {
    const validationMetadata = {
      sections: {
        health: {
          validation: {
            severity: 2,
            redFlags: [{ type: 'medical' }],
            hallucinations: { suspect: [] },
            healthSafety: { issues: [{ type: 'unsupported_organ_mention' }] },
            timingSafety: { issues: [] },
            language: { ok: true },
          },
        },
        children: {
          validation: {
            severity: 1,
            redFlags: [],
            hallucinations: { suspect: [{ type: 'invented_year' }] },
            healthSafety: { issues: [] },
            timingSafety: { issues: [{ type: 'guaranteed_future_timing' }] },
            language: { ok: false },
          },
        },
      },
      crossSection: {
        discrepancies: [{ highStakes: true }, { highStakes: false }],
        reconciled: 2,
      },
    };

    const runMetadata = buildPromptRunMetadata({
      language: 'en',
      sectionOrder: ['health', 'children'],
      successCount: 2,
      totalSections: 2,
      failedSectionCount: 0,
      validationMetadata,
      tokenUsageSummary: { totalTokens: 1234 },
    });

    expect(runMetadata.promptVersion).toBe(PROMPT_VERSION);
    expect(runMetadata.validationSummary.sections).toBe(2);
    expect(runMetadata.validationSummary.unsupportedOrganMentions).toBe(1);
    expect(runMetadata.validationSummary.guaranteedTimingIssues).toBe(1);
    expect(runMetadata.validationSummary.crossSectionHighStakes).toBe(1);
    expect(runMetadata.tokenUsageSummary.totalTokens).toBe(1234);
  });

  test('builds unsupported term analytics by section and issue type', () => {
    const analytics = buildUnsupportedTermAnalytics({
      sections: {
        health: {
          validation: {
            healthSafety: {
              issues: [
                { type: 'unsupported_organ_mention', snippet: 'Kidney and urinary balance' },
                { type: 'unsupported_organ_mention', snippet: 'Kidney and urinary balance' },
              ],
            },
          },
        },
        children: {
          validation: {
            timingSafety: {
              issues: [{ type: 'guaranteed_child_timing', snippet: 'will be born' }],
            },
          },
        },
      },
    });

    expect(analytics.unsupportedEventCount).toBe(3);
    expect(analytics.bySection.health).toBe(2);
    expect(analytics.byType.unsupported_organ_mention).toBe(2);
    expect(analytics.repeatedUnsupportedTerms).toEqual([
      { term: 'kidney and urinary balance', count: 2 },
    ]);
  });

  test('builds feedback records with section prompt provenance', () => {
    const record = buildPromptFeedbackRecord({
      uid: 'user-1',
      reportId: 'report-1',
      reportData: {
        promptMetadata: { promptVersion: 'prompt-v-test', promptPolicyVersion: PROMPT_POLICY_VERSION },
        validationMetadata: {
          sections: {
            health: {
              promptMetadata: {
                model: 'gemini-test',
                temperature: 0.35,
                policyVersion: 'health-claims-v1',
                claimCounts: { health: 1 },
              },
            },
          },
        },
      },
      sectionKey: 'health',
      claimType: 'wellness_pattern',
      rating: 2,
      helpful: false,
      issueType: 'unsupported_organ_mention',
      comment: 'This mentioned an unsupported organ.',
    });

    expect(record.promptVersion).toBe('prompt-v-test');
    expect(record.sectionPolicyVersion).toBe('health-claims-v1');
    expect(record.sectionModel).toBe('gemini-test');
    expect(record.claimType).toBe('wellness_pattern');
    expect(record.rating).toBe(2);

    const summary = buildFeedbackSummary(null, record);
    expect(summary.total).toBe(1);
    expect(summary.unhelpful).toBe(1);
    expect(summary.averageRating).toBe(2);
    expect(summary.bySection.health).toBe(1);
    expect(summary.byClaimType.wellness_pattern).toBe(1);
  });
});
