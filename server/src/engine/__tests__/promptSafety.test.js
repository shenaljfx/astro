const {
  buildHealthPromptPayload,
  buildHealthPromptPolicyBlock,
  buildSectionPromptPayload,
  buildSectionPromptPolicyBlock,
} = require('../promptClaimBuilder');
const {
  HEALTH_ORGAN_POLICIES,
} = require('../promptPolicies');
const {
  validateHealthNarrativeSafety,
  validateTimingNarrativeSafety,
} = require('../reportValidator');

describe('health prompt claim gating', () => {
  test('omits low-risk kidney while allowing other high-risk organs', () => {
    const payload = buildHealthPromptPayload({
      organRisks: [
        { organ: 'Heart & Cardiovascular System', risk: 'HIGH', indicators: 5 },
        { organ: 'Kidneys & Urinary Tract', risk: 'LOW', indicators: 1 },
      ],
      earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
    });

    expect(payload.allowedClaims.map(claim => claim.organKey)).toContain('heart');
    expect(payload.allowedClaims.map(claim => claim.organKey)).not.toContain('kidneys');
    expect(payload.omitTopics.map(topic => topic.organKey)).toContain('kidneys');
  });

  test('allows early-life resilience without specific infant medical events', () => {
    const payload = buildHealthPromptPayload({
      organRisks: [],
      earlyLifeHealth: { severity: 'HIGH', riskCount: 3, indicators: [{ type: 'weakMoon' }] },
    });
    const earlyLife = payload.allowedClaims.find(claim => claim.id === 'health.earlyLife.vulnerability');

    expect(earlyLife).toBeTruthy();
    expect(earlyLife.allowedDetails.resilienceTheme).toBe(true);
    expect(earlyLife.allowedDetails.nicu).toBe(false);
    expect(earlyLife.allowedDetails.prematureBirth).toBe(false);
  });

  test('keeps omitted organ and infant event terms out of the AI-facing policy block', () => {
    const block = buildHealthPromptPolicyBlock({
      organRisks: [
        { organ: 'Heart & Cardiovascular System', risk: 'HIGH', indicators: 5 },
        { organ: 'Kidneys & Urinary Tract', risk: 'LOW', indicators: 1 },
      ],
      earlyLifeHealth: { severity: 'HIGH', riskCount: 3, indicators: [{ type: 'weakMoon' }] },
    }).toLowerCase();

    expect(block).not.toContain('kidney');
    expect(block).not.toContain('urinary');
    expect(block).not.toContain('nicu');
    expect(block).not.toContain('premature');
    expect(block).toContain('heart and circulation');
  });

  test('omits every low-risk organ without seeding organ aliases into the AI-facing block', () => {
    for (const policy of HEALTH_ORGAN_POLICIES) {
      const payload = buildHealthPromptPayload({
        organRisks: [
          { organ: policy.publicLabel, risk: 'LOW', indicators: 1 },
        ],
        earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
      });
      const block = buildHealthPromptPolicyBlock({
        organRisks: [
          { organ: policy.publicLabel, risk: 'LOW', indicators: 1 },
        ],
        earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
      }).toLowerCase();

      expect(payload.allowedClaims.map(claim => claim.organKey)).not.toContain(policy.key);
      expect(payload.omitTopics.map(topic => topic.organKey)).toContain(policy.key);
      for (const alias of policy.aliases) {
        if (alias.length < 5) continue;
        expect(block).not.toContain(alias.toLowerCase());
      }
    }
  });

  test('normalizes blood pressure separately from heart despite shared circulation wording', () => {
    const payload = buildHealthPromptPayload({
      organRisks: [
        { organ: 'Blood pressure and circulation', risk: 'HIGH', indicators: 5 },
      ],
      earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
    });

    expect(payload.allowedClaims.map(claim => claim.organKey)).toContain('bloodPressure');
    expect(payload.allowedClaims.map(claim => claim.organKey)).not.toContain('heart');
  });
});

describe('general prompt claim builder', () => {
  test('builds timing claims with symbolic framing', () => {
    const payload = buildSectionPromptPayload('children', {
      childrenBirthYears: {
        children: [{ childNumber: '1st', peakYear: 2031, confidence: 'moderate' }],
      },
    });

    expect(payload.allowedClaims.some(claim => claim.category === 'timing_window')).toBe(true);
    expect(payload.allowedClaims[0].framing).toContain('not a promise');
  });

  test('builds AI-facing section policy block with timing confidence', () => {
    const block = buildSectionPromptPolicyBlock('children', {
      childrenBirthYears: {
        children: [{ childNumber: '1st', peakYear: 2031, confidence: 'moderate' }],
      },
    }).toLowerCase();

    expect(block).toContain('symbolic timing window');
    expect(block).toContain('moderate');
    expect(block).toContain('not a promise');
  });

  test('builds broad parent wellness claims without named organ permission', () => {
    const payload = buildSectionPromptPayload('familyPortrait', {
      mother: { healthRisks: [{ organ: 'Kidneys', risk: 'HIGH' }], kidneyRisk: { high: true } },
      siblings: { estimatedCount: { count: 2, estimatedElderSiblings: 1, estimatedYoungerSiblings: 1 } },
    }, {
      mentalHealth: { childhoodTrauma: { level: 'HIGH', score: 9 } },
    });
    const parentClaim = payload.allowedClaims.find(claim => claim.category === 'parent_wellness_pattern');

    expect(parentClaim).toBeTruthy();
    expect(parentClaim.allowedDetails.namedOrgans).toBe(false);
    expect(payload.allowedClaims.some(claim => claim.category === 'sibling_estimate')).toBe(true);
    expect(payload.allowedClaims.some(claim => claim.id === 'family.childhoodStressPattern')).toBe(true);
  });

  test('blocks relationship timing when marriage denial data is stronger', () => {
    const payload = buildSectionPromptPayload('marriage', {
      marriageAfflictions: { isMarriageDenied: true, severity: 'HIGH', severityScore: 70 },
      marriageTimingPrediction: { bestWindow: { dateRange: '2030-2032', confidence: 'medium' } },
    });

    expect(payload.allowedClaims.some(claim => claim.category === 'relationship_timing')).toBe(false);
    expect(payload.omitTopics.some(topic => topic.id === 'marriage.relationshipTiming.bestWindow')).toBe(true);
  });

  test('builds career direction claims from the top ranked indicators only', () => {
    const payload = buildSectionPromptPayload('career', {
      careerPlanetRanking: [
        { planet: 'Mercury', role: 'analysis', dignity: 'strong' },
        { planet: 'Saturn', role: 'operations', dignity: 'stable' },
        { planet: 'Venus', role: 'design', dignity: 'friendly' },
        { planet: 'Mars', role: 'engineering', dignity: 'mixed' },
      ],
    });
    const careerClaim = payload.allowedClaims.find(claim => claim.category === 'career_direction');

    expect(careerClaim).toBeTruthy();
    expect(careerClaim.publicClaim).toContain('Mercury');
    expect(careerClaim.publicClaim).toContain('Venus');
    expect(careerClaim.publicClaim).not.toContain('Mars');
    expect(careerClaim.forbidden).toContain('guaranteed_job');
  });

  test('financial claims forbid direct investment advice and guaranteed wealth', () => {
    const payload = buildSectionPromptPayload('financial', {
      income: {
        secondHouse: { strengthScore: 72 },
        eleventhHouse: { strengthScore: 64 },
      },
      losses: { riskPeriods: [{ period: '2031-2032', lord: 'Saturn' }] },
    });
    const incomeClaim = payload.allowedClaims.find(claim => claim.id === 'financial.incomePattern');
    const riskClaim = payload.allowedClaims.find(claim => claim.id === 'financial.riskWindows');

    expect(incomeClaim).toBeTruthy();
    expect(incomeClaim.publicClaim.toLowerCase()).toContain('do not promise wealth');
    expect(incomeClaim.forbidden).toContain('specific_investment_advice');
    expect(riskClaim.framing).toContain('not a promise');
  });

  test('children timing claims are omitted when marriage denial is active', () => {
    const payload = buildSectionPromptPayload('children', {
      estimatedChildren: { count: 2, genderTendency: 'mixed', score: 6 },
      childrenBirthYears: {
        children: [{ childNumber: '1st', peakYear: 2031, confidence: 'high' }],
      },
    }, {
      marriage: { marriageAfflictions: { isMarriageDenied: true, severity: 'HIGH' } },
    });

    expect(payload.allowedClaims.some(claim => claim.category === 'children_estimate')).toBe(true);
    expect(payload.allowedClaims.some(claim => claim.category === 'timing_window')).toBe(false);
    expect(payload.omitTopics.some(topic => topic.reason.includes('blocked by stronger'))).toBe(true);
  });

  test('legal claims stay practical and block guaranteed outcomes', () => {
    const payload = buildSectionPromptPayload('legal', {
      enemyProfile: { tendency: 'competitive', source: '6th house' },
      legalIndicators: { score: 62 },
      legalCasePeriods: [{ period: '2029-2030', confidence: 'moderate' }],
    });
    const pressureClaim = payload.allowedClaims.find(claim => claim.id === 'legal.pressurePattern');
    const cautionClaim = payload.allowedClaims.find(claim => claim.id === 'legal.caseCautionWindows');

    expect(pressureClaim).toBeTruthy();
    expect(pressureClaim.publicClaim).toContain('do not predict case outcomes');
    expect(pressureClaim.forbidden).toContain('guaranteed_legal_outcome');
    expect(cautionClaim.framing).toContain('not a promise');
  });

  test('luck speculation claims explicitly forbid gambling encouragement', () => {
    const payload = buildSectionPromptPayload('luck', {
      overallLuck: 'High',
      lotteryIndication: 'Moderate',
      luckyNumbers: [3, 9, 21],
    });
    const speculationClaim = payload.allowedClaims.find(claim => claim.id === 'luck.speculationCaution');

    expect(speculationClaim).toBeTruthy();
    expect(speculationClaim.publicClaim).toContain('Never encourage gambling');
    expect(speculationClaim.forbidden).toContain('gambling_encouragement');
    expect(speculationClaim.forbidden).toContain('guaranteed_lottery');
  });
});

describe('health narrative safety validator', () => {
  const sectionData = {
    organRisks: [
      { organ: 'Heart & Cardiovascular System', risk: 'HIGH', indicators: 5 },
      { organ: 'Kidneys & Urinary Tract', risk: 'LOW', indicators: 1 },
    ],
    earlyLifeHealth: { severity: 'LOW', riskCount: 0, indicators: [] },
  };

  test('flags omitted organ mentions and unsupported medical specifics', () => {
    const narrative = 'Your heart and circulation need support. Kidney stones and annual creatinine screening are likely. You may have spent time in NICU.';
    const result = validateHealthNarrativeSafety(narrative, sectionData);

    expect(result.issues.map(issue => issue.type)).toContain('unsupported_organ_mention');
    expect(result.issues.map(issue => issue.type)).toContain('health_named_condition');
    expect(result.issues.map(issue => issue.type)).toContain('health_medical_test_without_data');
    expect(result.issues.map(issue => issue.type)).toContain('health_unsupported_infant_event');
  });

  test('allows supported organ wellness wording', () => {
    const narrative = 'Your heart and circulation show a stronger vulnerability pattern, so the chart suggests steady routines, lighter stress load, and consistent recovery habits.';
    const result = validateHealthNarrativeSafety(narrative, sectionData);

    expect(result.issues).toEqual([]);
  });
});

describe('timing narrative safety validator', () => {
  const promptClaims = buildSectionPromptPayload('children', {
    childrenBirthYears: {
      children: [{ childNumber: '1st', peakYear: 2032, confidence: 'high' }],
    },
  });

  test('flags guaranteed marriage timing language', () => {
    const result = validateTimingNarrativeSafety('You will marry in 2030 and this will happen for sure.', 'marriage', promptClaims);

    expect(result.issues.map(issue => issue.type)).toContain('guaranteed_marriage_timing');
    expect(result.issues.map(issue => issue.type)).toContain('guaranteed_event_timing');
  });

  test('flags guaranteed child birth timing language', () => {
    const result = validateTimingNarrativeSafety('Your first child will be born in 2032.', 'children', promptClaims);

    expect(result.issues.map(issue => issue.type)).toContain('guaranteed_child_timing');
  });

  test('allows symbolic child timing with explicit framing', () => {
    const result = validateTimingNarrativeSafety(
      'Your chart\'s strongest child-related timing gathers around 2032, when you are approximately 34. Treat this as timing symbolism, not a promise.',
      'children',
      promptClaims
    );

    expect(result.issues).toEqual([]);
  });
});