const {
  HEALTH_FORBIDDEN_CLAIM_TYPES,
  PARENT_HEALTH_PROMPT_POLICY,
  PROMPT_POLICY_VERSION,
  TIMING_PROMPT_POLICY,
  getHealthRiskBehavior,
  getOrganPolicyByLabel,
  getSectionPromptPolicy,
  normalizeRisk,
} = require('./promptPolicies');

const MAX_TIMING_CLAIMS = 12;

function compactValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  try {
    return JSON.stringify(value).slice(0, 240);
  } catch (_) {
    return String(value).slice(0, 240);
  }
}

function normalizeTimingConfidence(confidence) {
  const text = String(confidence || '').trim().toLowerCase();
  if (!text) return 'engine_supplied';
  if (['high', 'strong', '★★★', '3'].includes(text)) return 'high';
  if (['medium', 'moderate', 'supported', '★★', '2'].includes(text)) return 'moderate';
  if (['low', 'weak', 'hinted', '★', '1'].includes(text)) return 'weak';
  return text;
}

function collectTimingValues(value, path = 'sectionData', depth = 0, out = [], parentContext = null) {
  if (!value || depth > 5 || out.length >= MAX_TIMING_CLAIMS) return out;
  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((item, index) => collectTimingValues(item, `${path}[${index}]`, depth + 1, out, item));
    return out;
  }
  if (typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value)) {
    if (out.length >= MAX_TIMING_CLAIMS) break;
    const childPath = `${path}.${key}`;
    const looksLikeTiming = /(year|age|period|window|date|range|peak|start|end|timing)/i.test(key);
    const confidence = child && typeof child === 'object'
      ? child.confidence || child.confidenceLevel || child.strength
      : value.confidence || value.confidenceLevel || parentContext?.confidence || parentContext?.confidenceLevel || null;
    if (looksLikeTiming && child !== null && child !== undefined && typeof child !== 'object') {
      out.push({ path: childPath, key, value: child, confidence });
    } else if (looksLikeTiming && child && typeof child === 'object' && !Array.isArray(child)) {
      const summary = compactValue(child);
      if (summary && summary !== '{}') out.push({ path: childPath, key, value: summary, confidence });
      collectTimingValues(child, childPath, depth + 1, out, child);
    } else {
      collectTimingValues(child, childPath, depth + 1, out, child && typeof child === 'object' ? child : value);
    }
  }
  return out;
}

function getIndicatorCount(organ) {
  const value = Number(organ?.indicators ?? organ?.indicatorCount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function buildOrganClaim(organ, index) {
  const organPolicy = getOrganPolicyByLabel(organ?.organ || organ?.publicLabel || organ?.label);
  const risk = normalizeRisk(organ?.risk);
  const behavior = getHealthRiskBehavior(risk);
  const indicatorCount = getIndicatorCount(organ);
  const confidence = risk === 'HIGH' && indicatorCount >= 5 ? 'strong' : behavior.confidence;

  return {
    id: `health.organ.${organPolicy.key}.vulnerability`,
    section: 'health',
    subject: 'native',
    category: 'wellness_pattern',
    sensitivity: 'health',
    organKey: organPolicy.key,
    publicLabel: organPolicy.publicLabel,
    sourceLabel: organ?.organ || organPolicy.publicLabel,
    risk,
    confidence,
    indicatorCount,
    rank: index + 1,
    allowed: behavior.allowedPublicMention,
    detailLevel: behavior.detailLevel,
    publicClaim: behavior.allowedPublicMention
      ? `${organPolicy.publicLabel}: ${risk.toLowerCase()} chart vulnerability pattern (${indicatorCount} indicator${indicatorCount === 1 ? '' : 's'}).`
      : `${organPolicy.publicLabel}: omit from public report unless user asks and stronger evidence exists.`,
    forbidden: HEALTH_FORBIDDEN_CLAIM_TYPES,
    allowedDetails: {
      namedConditions: false,
      medicalTests: false,
      procedures: false,
      ageThresholds: false,
      prevention: true,
    },
    evidence: [
      { path: `sections.health.organRisks[${organPolicy.key}].risk`, value: risk },
      { path: `sections.health.organRisks[${organPolicy.key}].indicators`, value: indicatorCount },
    ],
  };
}

function dedupeOrganClaims(claims) {
  const byKey = new Map();
  for (const claim of claims) {
    const existing = byKey.get(claim.organKey);
    if (!existing || claim.rank < existing.rank || claim.indicatorCount > existing.indicatorCount) {
      byKey.set(claim.organKey, claim);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const riskOrder = { HIGH: 3, MODERATE: 2, LOW: 1 };
    const riskDiff = (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
    if (riskDiff !== 0) return riskDiff;
    return (b.indicatorCount || 0) - (a.indicatorCount || 0);
  });
}

function buildHealthClaims(sectionData = {}) {
  const organInputs = Array.isArray(sectionData.organRisks) && sectionData.organRisks.length
    ? sectionData.organRisks
    : Array.isArray(sectionData.rankedOrganRisks)
      ? sectionData.rankedOrganRisks
      : [];

  const organClaims = dedupeOrganClaims(organInputs.map(buildOrganClaim));
  const allowedOrganClaims = organClaims.filter(claim => claim.allowed);
  const omittedOrganClaims = organClaims.filter(claim => !claim.allowed);
  const highConfidencePrimary = allowedOrganClaims.find(claim => claim.risk === 'HIGH') || null;

  return {
    organClaims,
    allowedOrganClaims,
    omittedOrganClaims,
    primaryHealthConcern: highConfidencePrimary,
  };
}

function buildEarlyLifeClaim(sectionData = {}) {
  const earlyLife = sectionData.earlyLifeHealth || {};
  const severity = normalizeRisk(earlyLife.severity === 'CRITICAL' ? 'HIGH' : earlyLife.severity);
  const rawSeverity = String(earlyLife.severity || 'LOW').toUpperCase();
  const riskCount = Number(earlyLife.riskCount || 0);
  const allowed = rawSeverity !== 'LOW' && riskCount > 0;

  return {
    id: 'health.earlyLife.vulnerability',
    section: 'health',
    subject: 'native',
    category: 'early_life_vitality_pattern',
    sensitivity: 'health',
    allowed,
    severity: rawSeverity,
    risk: severity,
    confidence: riskCount >= 4 ? 'moderate' : 'weak',
    indicatorCount: riskCount,
    allowedDetails: {
      prematureBirth: false,
      nicu: false,
      incubator: false,
      lowBirthWeight: false,
      breathingDifficulty: false,
      hospitalization: false,
      resilienceTheme: allowed,
    },
    publicClaim: allowed
      ? `Early-life vitality shows a ${rawSeverity.toLowerCase()} sensitivity pattern; describe resilience and extra care, not specific medical events.`
      : 'No public early-life health claim should be written.',
    forbidden: [
      'specific_infant_medical_event',
      'named_infant_condition',
      'infant_treatment_or_facility_claim',
    ],
    evidence: [
      { path: 'sections.health.earlyLifeHealth.severity', value: rawSeverity },
      { path: 'sections.health.earlyLifeHealth.riskCount', value: riskCount },
    ],
  };
}

function buildHealthPromptPayload(sectionData = {}) {
  const healthClaims = buildHealthClaims(sectionData);
  const earlyLifeClaim = buildEarlyLifeClaim(sectionData);
  const allowedClaims = [
    ...healthClaims.allowedOrganClaims,
    ...(earlyLifeClaim.allowed ? [earlyLifeClaim] : []),
  ];
  const omitTopics = [
    ...healthClaims.omittedOrganClaims.map(claim => ({
      id: claim.id,
      organKey: claim.organKey,
      publicLabel: claim.publicLabel,
      reason: `${claim.risk} risk is below public mention threshold`,
    })),
    ...(earlyLifeClaim.allowed ? [] : [{
      id: earlyLifeClaim.id,
      reason: 'Early-life health evidence is absent or low',
    }]),
  ];

  return {
    section: 'health',
    promptPolicyVersion: PROMPT_POLICY_VERSION,
    policyVersion: 'health-claims-v1',
    sectionPolicy: getSectionPromptPolicy('health'),
    allowedClaims,
    omitTopics,
    primaryHealthConcern: healthClaims.primaryHealthConcern,
  };
}

function buildTimingClaims(sectionKey, sectionData = {}, allSections = {}) {
  return collectTimingValues(sectionData).map((item, index) => ({
    id: `${sectionKey}.timing.${index + 1}`,
    section: sectionKey,
    subject: 'native',
    category: TIMING_PROMPT_POLICY.category,
    sensitivity: getSectionPromptPolicy(sectionKey).sensitivity,
    allowed: true,
    confidence: normalizeTimingConfidence(/confidence/i.test(item.key) ? item.value : item.confidence),
    publicClaim: `Timing field ${item.key}: ${compactValue(item.value)}. ${TIMING_PROMPT_POLICY.framing}`,
    forbidden: TIMING_PROMPT_POLICY.blockedClaimTypes,
    framing: TIMING_PROMPT_POLICY.framing,
    evidence: [
      { path: item.path, value: compactValue(item.value) },
    ],
    crossChecks: {
      marriageDenied: Boolean(allSections?.marriage?.marriageAfflictions?.isMarriageDenied),
    },
  }));
}

function buildParentWellnessClaim(parentKey, parentData = {}) {
  const healthRisks = Array.isArray(parentData.healthRisks) ? parentData.healthRisks : [];
  const healthPeriods = Array.isArray(parentData.motherHealthPeriods || parentData.fatherEventPeriods)
    ? (parentData.motherHealthPeriods || parentData.fatherEventPeriods)
    : [];
  const kidneyRisk = parentData.kidneyRisk || null;
  const hasWellnessData = healthRisks.length > 0 || healthPeriods.length > 0 || kidneyRisk;
  if (!hasWellnessData) return null;

  return {
    id: `family.${parentKey}.wellnessPattern`,
    section: 'familyPortrait',
    subject: parentKey,
    category: PARENT_HEALTH_PROMPT_POLICY.category,
    sensitivity: 'health',
    allowed: true,
    confidence: healthRisks.length >= 2 || healthPeriods.length >= 2 ? 'moderate' : 'weak',
    publicClaim: `${parentKey} has broad wellness caution data. Use probabilistic family-pattern language only.`,
    forbidden: PARENT_HEALTH_PROMPT_POLICY.blockedClaimTypes,
    allowedDetails: {
      namedConditions: false,
      namedOrgans: false,
      procedures: false,
      exactEventPrediction: false,
      broadWellnessPattern: true,
    },
    framing: PARENT_HEALTH_PROMPT_POLICY.framing,
    evidence: [
      { path: `sections.familyPortrait.${parentKey}.healthRisks.length`, value: healthRisks.length },
      { path: `sections.familyPortrait.${parentKey}.wellnessPeriods.length`, value: healthPeriods.length },
      { path: `sections.familyPortrait.${parentKey}.kidneyRisk.present`, value: Boolean(kidneyRisk) },
    ],
  };
}

function buildFamilyClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const motherClaim = buildParentWellnessClaim('mother', sectionData.mother || {});
  const fatherClaim = buildParentWellnessClaim('father', sectionData.father || {});
  if (motherClaim) claims.push(motherClaim);
  if (fatherClaim) claims.push(fatherClaim);

  const estimatedCount = sectionData.siblings?.estimatedCount;
  if (estimatedCount) {
    claims.push({
      id: 'family.siblings.estimatedCount',
      section: 'familyPortrait',
      subject: 'siblings',
      category: 'sibling_estimate',
      sensitivity: 'family',
      allowed: true,
      confidence: 'engine_supplied_estimate',
      publicClaim: `Sibling count is an estimate: total=${estimatedCount.count ?? 'N/A'}, elder=${estimatedCount.estimatedElderSiblings ?? 'N/A'}, younger=${estimatedCount.estimatedYoungerSiblings ?? 'N/A'}.`,
      forbidden: ['guaranteed_sibling_count_without_confidence'],
      evidence: [
        { path: 'sections.familyPortrait.siblings.estimatedCount', value: compactValue(estimatedCount) },
      ],
    });
  }

  const stressPattern = allSections?.mentalHealth?.childhoodTrauma;
  if (stressPattern?.level) {
    claims.push({
      id: 'family.childhoodStressPattern',
      section: 'familyPortrait',
      subject: 'native',
      category: 'family_dynamic',
      sensitivity: 'mental_health',
      allowed: true,
      confidence: stressPattern.score >= 8 ? 'moderate' : 'weak',
      publicClaim: `Childhood stress pattern level: ${stressPattern.level}. Use non-diagnostic family-dynamic language only.`,
      forbidden: ['diagnosis', 'invented_trauma_event', 'parent_blame'],
      evidence: [
        { path: 'sections.mentalHealth.childhoodTrauma.level', value: stressPattern.level },
        { path: 'sections.mentalHealth.childhoodTrauma.score', value: stressPattern.score || 0 },
      ],
    });
  }

  return claims;
}

function buildRelationshipClaims(sectionKey, sectionData = {}, allSections = {}) {
  const claims = [];
  const afflictions = sectionData.marriageAfflictions || allSections?.marriage?.marriageAfflictions;
  if (afflictions) {
    claims.push({
      id: `${sectionKey}.relationshipStability`,
      section: sectionKey,
      subject: 'native',
      category: 'relationship_stability',
      sensitivity: 'relationship',
      allowed: true,
      confidence: afflictions.severityScore >= 50 ? 'moderate' : 'weak',
      publicClaim: `Relationship stability pattern: ${afflictions.severity || 'N/A'}; use probabilistic language and do not guarantee divorce or denial.`,
      forbidden: ['guaranteed_divorce', 'guaranteed_second_marriage', 'fixed_spouse_outcome'],
      evidence: [
        { path: `sections.${sectionKey}.marriageAfflictions.severity`, value: afflictions.severity || null },
        { path: `sections.${sectionKey}.marriageAfflictions.severityScore`, value: afflictions.severityScore || 0 },
      ],
    });
  }

  const timing = sectionData.marriageTimingPrediction || allSections?.marriage?.marriageTimingPrediction;
  if (timing?.bestWindow) {
    claims.push({
      id: `${sectionKey}.relationshipTiming.bestWindow`,
      section: sectionKey,
      subject: 'native',
      category: 'relationship_timing',
      sensitivity: 'relationship',
      allowed: !afflictions?.isMarriageDenied,
      confidence: timing.bestWindow.confidence || 'engine_supplied',
      publicClaim: `Marriage timing window: ${timing.bestWindow.dateRange || 'N/A'}. ${TIMING_PROMPT_POLICY.framing}`,
      forbidden: TIMING_PROMPT_POLICY.blockedClaimTypes,
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [
        { path: 'sections.marriage.marriageTimingPrediction.bestWindow', value: compactValue(timing.bestWindow) },
      ],
    });
  }

  return claims;
}

function buildHealthPromptPolicyBlock(sectionData = {}) {
  const payload = buildHealthPromptPayload(sectionData);
  const promptSafePayload = {
    ...payload,
    omitTopicCount: payload.omitTopics.length,
    omitTopics: payload.omitTopics.map((topic, index) => ({
      id: `omitted.topic.${index + 1}`,
      reason: topic.organKey ? 'Below public mention threshold' : topic.reason,
    })),
    allowedClaims: payload.allowedClaims.map(claim => ({
      id: claim.id,
      category: claim.category,
      organKey: claim.organKey,
      publicLabel: claim.publicLabel,
      risk: claim.risk,
      severity: claim.severity,
      confidence: claim.confidence,
      indicatorCount: claim.indicatorCount,
      detailLevel: claim.detailLevel,
      publicClaim: claim.publicClaim,
      medicalSpecificsAllowed: false,
      evidence: claim.evidence,
    })),
  };
  const allowedOrgans = payload.allowedClaims
    .filter(claim => claim.category === 'wellness_pattern')
    .map(claim => `- ${claim.publicLabel}: ${claim.risk}, ${claim.confidence} confidence, ${claim.indicatorCount} indicators, detail=${claim.detailLevel}`)
    .join('\n') || '- None. Do not name any organ system as a risk.';
  const omittedOrgans = payload.omitTopics
    .filter(topic => topic.organKey)
    .length;
  const earlyLife = payload.allowedClaims.find(claim => claim.id === 'health.earlyLife.vulnerability');

  return `
━━━ EVIDENCE-GATED HEALTH CLAIM POLICY (SOURCE OF TRUTH) ━━━
Allowed organ claims:
${allowedOrgans}

Omitted organ systems:
- ${omittedOrgans} low-evidence organ system${omittedOrgans === 1 ? '' : 's'} hidden from the prompt to avoid seeding unsupported claims. Do not infer or name hidden organ systems.

Early-life health claim:
${earlyLife ? `- Allowed as broad resilience/vitality language only. Severity: ${earlyLife.severity}; indicators: ${earlyLife.indicatorCount}. Do not mention specific infant medical events.` : '- Not allowed. Do not write an infant-health paragraph or claim birth complications.'}

Health writing rules:
- Use only the allowed organ and early-life claims above.
- Do not name diseases, medical tests, procedures, surgeries, or screening ages unless an allowed claim explicitly says that detail is allowed.
- LOW organ systems are absence evidence. Omitting them is the correct behavior.
- Timing windows are symbolic caution periods, not promises.
- This is wellness symbolism, not diagnosis.

Structured allowed-claims payload:
${JSON.stringify(promptSafePayload, null, 2)}
`;
}

function buildSectionPromptPayload(sectionKey, sectionData = {}, allSections = {}) {
  if (sectionKey === 'health') return buildHealthPromptPayload(sectionData);

  const sectionPolicy = getSectionPromptPolicy(sectionKey);
  const timingClaims = buildTimingClaims(sectionKey, sectionData, allSections);
  const familyClaims = sectionKey === 'familyPortrait'
    ? buildFamilyClaims(sectionData, allSections)
    : [];
  const relationshipClaims = ['marriage', 'marriedLife'].includes(sectionKey)
    ? buildRelationshipClaims(sectionKey, sectionData, allSections)
    : [];
  const allowedClaims = [
    ...timingClaims,
    ...familyClaims,
    ...relationshipClaims,
  ].filter(claim => claim.allowed !== false);
  const omitTopics = relationshipClaims
    .filter(claim => claim.allowed === false)
    .map(claim => ({
      id: claim.id,
      reason: 'Relationship timing claim blocked by stronger denial/low-confidence data',
    }));

  return {
    section: sectionKey,
    promptPolicyVersion: PROMPT_POLICY_VERSION,
    policyVersion: `${sectionKey}-claims-v1`,
    sectionPolicy,
    allowedClaims,
    omitTopics,
    timingPolicy: timingClaims.length ? TIMING_PROMPT_POLICY : null,
  };
}

function buildSectionPromptPolicyBlock(sectionKey, sectionData = {}, allSections = {}) {
  if (sectionKey === 'health') return '';
  const payload = buildSectionPromptPayload(sectionKey, sectionData, allSections);
  if (!payload || (!payload.allowedClaims.length && !payload.omitTopics.length)) return '';

  const timingClaims = payload.allowedClaims.filter(claim => claim.category === 'timing_window');
  const sensitiveClaims = payload.allowedClaims.filter(claim => claim.category !== 'timing_window');
  const safePayload = {
    section: payload.section,
    promptPolicyVersion: payload.promptPolicyVersion,
    policyVersion: payload.policyVersion,
    sectionPolicy: payload.sectionPolicy,
    timingPolicy: payload.timingPolicy,
    allowedTimingClaims: timingClaims.slice(0, 10).map(claim => ({
      id: claim.id,
      category: claim.category,
      confidence: claim.confidence,
      publicClaim: claim.publicClaim,
      framing: claim.framing,
      evidence: claim.evidence,
    })),
    allowedSensitiveClaims: sensitiveClaims.slice(0, 8).map(claim => ({
      id: claim.id,
      category: claim.category,
      sensitivity: claim.sensitivity,
      confidence: claim.confidence,
      publicClaim: claim.publicClaim,
      framing: claim.framing || null,
      forbidden: claim.forbidden || [],
      allowedDetails: claim.allowedDetails || null,
      evidence: claim.evidence,
    })),
    omitTopics: payload.omitTopics,
  };

  return `
━━━ SECTION CLAIM AND TIMING POLICY (SOURCE OF TRUTH) ━━━
- Use only the allowed timing and sensitive claims in this block for dates, years, ages, parent health, relationship stability, and other high-stakes claims.
- Every date/year/age is a symbolic timing window, not a promise. Include confidence language naturally.
- If a timing or sensitive topic appears only in omitTopics, omit it completely.
- Do not turn estimates into guarantees.

Structured section-claims payload:
${JSON.stringify(safePayload, null, 2)}
`;
}

module.exports = {
  buildHealthClaims,
  buildEarlyLifeClaim,
  buildHealthPromptPayload,
  buildHealthPromptPolicyBlock,
  buildTimingClaims,
  buildFamilyClaims,
  buildRelationshipClaims,
  buildSectionPromptPayload,
  buildSectionPromptPolicyBlock,
};