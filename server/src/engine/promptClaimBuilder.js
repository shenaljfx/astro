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

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '' && value.trim().toUpperCase() !== 'N/A';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function scoreConfidence(score, strong = 65, moderate = 45) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'engine_supplied';
  if (value >= strong) return 'strong';
  if (value >= moderate) return 'moderate';
  return 'weak';
}

function textConfidence(value) {
  const text = String(value || '').toLowerCase();
  if (/excellent|very\s*strong|strong|high|yes|powerful/.test(text)) return 'strong';
  if (/moderate|medium|mixed|possible|average|supported/.test(text)) return 'moderate';
  if (/weak|low|challeng|unlikely|no/.test(text)) return 'weak';
  return 'engine_supplied';
}

function makeSectionClaim(sectionKey, category, publicClaim, options = {}) {
  const sectionPolicy = getSectionPromptPolicy(sectionKey);
  return {
    id: options.id || `${sectionKey}.${category}.${options.index || 1}`,
    section: sectionKey,
    subject: options.subject || 'native',
    category,
    sensitivity: options.sensitivity || sectionPolicy.sensitivity,
    allowed: options.allowed !== false,
    confidence: options.confidence || 'engine_supplied',
    publicClaim,
    forbidden: options.forbidden || sectionPolicy.claimTypesBlocked || [],
    framing: options.framing || null,
    allowedDetails: options.allowedDetails || null,
    evidence: options.evidence || [],
  };
}

function shortList(values, limit = 3) {
  return (values || [])
    .filter(hasValue)
    .slice(0, limit)
    .map(value => typeof value === 'string' ? value : compactValue(value));
}

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

function buildYogaClaims(sectionData = {}) {
  const claims = [];
  const yogas = Array.isArray(sectionData.yogas) ? sectionData.yogas : [];
  const advancedYogas = Array.isArray(sectionData.advancedYogas) ? sectionData.advancedYogas : [];
  const doshas = Array.isArray(sectionData.doshas) ? sectionData.doshas : [];
  const strongYogas = [...yogas, ...advancedYogas]
    .filter(item => /strong|excellent|powerful/i.test(item?.strength || '') || item?.isStrong === true)
    .slice(0, 5);

  if (strongYogas.length) {
    claims.push(makeSectionClaim('yogaAnalysis', 'chart_combination', `Strong chart combinations available: ${shortList(strongYogas.map(item => item.name), 5).join(', ')}. Explain as strengths, not guaranteed outcomes.`, {
      id: 'yogaAnalysis.strongCombinations',
      confidence: 'strong',
      evidence: [{ path: 'sections.yogaAnalysis.yogas|advancedYogas', value: compactValue(strongYogas.map(item => ({ name: item.name, strength: item.strength }))) }],
    }));
  }

  const activeDoshas = doshas.filter(item => item && item.cancelled !== true).slice(0, 5);
  if (activeDoshas.length) {
    claims.push(makeSectionClaim('yogaAnalysis', 'challenge_pattern', `Active challenge patterns: ${shortList(activeDoshas.map(item => `${item.name || 'challenge'} (${item.severity || 'unknown'})`), 5).join(', ')}. Describe pressure patterns without promising suffering.`, {
      id: 'yogaAnalysis.activeChallenges',
      confidence: activeDoshas.some(item => /high|severe|strong/i.test(item.severity || '')) ? 'moderate' : 'weak',
      evidence: [{ path: 'sections.yogaAnalysis.doshas', value: compactValue(activeDoshas.map(item => ({ name: item.name, severity: item.severity }))) }],
    }));
  }

  if (hasValue(sectionData.yogaKaraka)) {
    claims.push(makeSectionClaim('yogaAnalysis', 'strength_pattern', `Primary supportive planet/signature: ${sectionData.yogaKaraka}. Use as a strength pattern only.`, {
      id: 'yogaAnalysis.primaryStrength',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.yogaAnalysis.yogaKaraka', value: sectionData.yogaKaraka }],
    }));
  }

  return claims;
}

function buildLifePredictionClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if (sectionData.currentDasha) {
    claims.push(makeSectionClaim('lifePredictions', 'current_phase', `Current life phase is engine-supplied: ${compactValue(sectionData.currentDasha)}. Explain present themes without guaranteeing events.`, {
      id: 'lifePredictions.currentPhase',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.lifePredictions.currentDasha', value: compactValue(sectionData.currentDasha) }],
    }));
  }

  if (sectionData.nextDasha) {
    claims.push(makeSectionClaim('lifePredictions', 'near_term_window', `Next life phase is engine-supplied: ${compactValue(sectionData.nextDasha)}. Treat as symbolic near-term context.`, {
      id: 'lifePredictions.nextPhase',
      confidence: 'engine_supplied',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.lifePredictions.nextDasha', value: compactValue(sectionData.nextDasha) }],
    }));
  }

  const bestYears = allSections?.bestYearsRanking?.top10FutureYears || [];
  if (bestYears.length) {
    claims.push(makeSectionClaim('lifePredictions', 'cross_section_convergence', `Best-year candidates exist from ranking data: ${shortList(bestYears.map(item => `${item.year} score ${item.score}`), 5).join(', ')}. Use only as convergence hints, not promises.`, {
      id: 'lifePredictions.bestYearCandidates',
      confidence: bestYears[0]?.score >= 70 ? 'moderate' : 'weak',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.bestYearsRanking.top10FutureYears', value: compactValue(bestYears.slice(0, 5)) }],
    }));
  }

  return claims;
}

function buildCareerClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const ranking = Array.isArray(sectionData.careerPlanetRanking) ? sectionData.careerPlanetRanking : [];
  const topCareer = ranking.slice(0, 3);
  if (topCareer.length) {
    const labels = topCareer.map(item => typeof item === 'string'
      ? item
      : `${item.planet || item.role || 'career factor'}${item.role ? ` (${item.role})` : ''}${item.dignity ? `, ${item.dignity}` : ''}`);
    claims.push(makeSectionClaim('career', 'career_direction', `Use only the top career indicators as primary career directions: ${labels.join('; ')}. Do not list every possible field.`, {
      id: 'career.primaryDirections',
      confidence: topCareer.length >= 2 ? 'moderate' : 'weak',
      evidence: [{ path: 'sections.career.careerPlanetRanking[0..2]', value: compactValue(topCareer) }],
    }));
  }

  if (sectionData.businessVsService || sectionData.nadiCareer?.businessVerdict || sectionData.nadiCareer?.serviceVerdict) {
    claims.push(makeSectionClaim('career', 'business_vs_service', `Business/service signal is available. Discuss as a career working-style pattern with confidence, not guaranteed business success.`, {
      id: 'career.businessVsService',
      confidence: textConfidence(sectionData.nadiCareer?.businessStrength || sectionData.nadiCareer?.serviceStrength),
      evidence: [
        { path: 'sections.career.businessVsService', value: compactValue(sectionData.businessVsService) },
        { path: 'sections.career.nadiCareer', value: compactValue(sectionData.nadiCareer) },
      ],
    }));
  }

  if (sectionData.homeLifeIndicators?.domesticRole) {
    claims.push(makeSectionClaim('career', 'domestic_role_pattern', `Domestic role pattern: ${sectionData.homeLifeIndicators.domesticRole}. Use this only to frame career/home balance.`, {
      id: 'career.domesticRole',
      confidence: sectionData.homeLifeIndicators.domesticRole === 'PRIMARY' ? 'moderate' : 'weak',
      evidence: [{ path: 'sections.career.homeLifeIndicators.domesticRole', value: sectionData.homeLifeIndicators.domesticRole }],
    }));
  }

  if (allSections?.foreignTravel?.foreignLikelihood || allSections?.foreignTravel?.settlementAbroad) {
    claims.push(makeSectionClaim('career', 'foreign_career_pattern', `Foreign career linkage may be mentioned only as a possibility supported by travel data.`, {
      id: 'career.foreignCareerLink',
      confidence: textConfidence(allSections.foreignTravel.foreignLikelihood),
      evidence: [{ path: 'sections.foreignTravel', value: compactValue({ foreignLikelihood: allSections.foreignTravel.foreignLikelihood, settlementAbroad: allSections.foreignTravel.settlementAbroad }) }],
    }));
  }

  return claims;
}

function buildFinancialClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const secondScore = sectionData.income?.secondHouse?.strengthScore;
  const eleventhScore = sectionData.income?.eleventhHouse?.strengthScore;
  if (hasValue(secondScore) || hasValue(eleventhScore)) {
    claims.push(makeSectionClaim('financial', 'income_pattern', `Income and savings pattern is supported by engine scores: savings=${secondScore ?? 'N/A'}, gains=${eleventhScore ?? 'N/A'}. Do not promise wealth.`, {
      id: 'financial.incomePattern',
      confidence: scoreConfidence(Math.max(Number(secondScore) || 0, Number(eleventhScore) || 0)),
      evidence: [
        { path: 'sections.financial.income.secondHouse.strengthScore', value: secondScore ?? null },
        { path: 'sections.financial.income.eleventhHouse.strengthScore', value: eleventhScore ?? null },
      ],
    }));
  }

  if (sectionData.expenses?.twelfthHouse || sectionData.expenses?.twelfthLord) {
    claims.push(makeSectionClaim('financial', 'spending_pattern', `Expense pattern data is available. Use broad spending-style language, not guaranteed loss.`, {
      id: 'financial.spendingPattern',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.financial.expenses', value: compactValue(sectionData.expenses) }],
    }));
  }

  const riskPeriods = sectionData.losses?.riskPeriods || [];
  if (riskPeriods.length) {
    claims.push(makeSectionClaim('financial', 'risk_window', `Financial caution windows exist: ${shortList(riskPeriods.map(item => item.period || item.lord), 4).join(', ')}. Frame as caution periods, not guaranteed loss.`, {
      id: 'financial.riskWindows',
      confidence: 'moderate',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.financial.losses.riskPeriods', value: compactValue(riskPeriods.slice(0, 4)) }],
    }));
  }

  if (allSections?.luck?.nadiLuck?.windfallVerdict || allSections?.surpriseInsights?.wealthClass) {
    claims.push(makeSectionClaim('financial', 'windfall_pattern', `Windfall or wealth-class data is present. Keep it probabilistic and do not give investment instructions.`, {
      id: 'financial.windfallPattern',
      confidence: textConfidence(allSections?.luck?.nadiLuck?.windfallStrength || allSections?.luck?.nadiLuck?.windfallVerdict),
      evidence: [{ path: 'sections.luck.nadiLuck|sections.surpriseInsights.wealthClass', value: compactValue({ nadiLuck: allSections?.luck?.nadiLuck, wealthClass: allSections?.surpriseInsights?.wealthClass }) }],
    }));
  }

  return claims;
}

function buildChildrenClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const estimated = sectionData.estimatedChildren;
  if (estimated) {
    claims.push(makeSectionClaim('children', 'children_estimate', `Children count and gender are estimates only: count=${estimated.count ?? 'N/A'}, tendency=${estimated.genderTendency || 'N/A'}. Do not guarantee birth or gender.`, {
      id: 'children.estimatedCount',
      confidence: scoreConfidence(estimated.score, 7, 4),
      allowedDetails: { guaranteedBirth: false, guaranteedGender: false, fertilityDiagnosis: false },
      evidence: [{ path: 'sections.children.estimatedChildren', value: compactValue(estimated) }],
    }));
  }

  if (sectionData.jupiterShadbala || sectionData.jupiter || sectionData.estimatedChildren?.jupiterDebilitated) {
    claims.push(makeSectionClaim('children', 'fertility_symbolism', `Fertility data may be described only as symbolic capacity/delay. Do not diagnose infertility.`, {
      id: 'children.fertilitySymbolism',
      confidence: sectionData.estimatedChildren?.jupiterDebilitated ? 'weak' : 'engine_supplied',
      evidence: [
        { path: 'sections.children.jupiterShadbala', value: compactValue(sectionData.jupiterShadbala) },
        { path: 'sections.children.estimatedChildren.jupiterDebilitated', value: Boolean(sectionData.estimatedChildren?.jupiterDebilitated) },
      ],
    }));
  }

  if (sectionData.childrenEducation) {
    claims.push(makeSectionClaim('children', 'education_path', `Children education data is a broad tendency only: ${sectionData.childrenEducation.academicLevel || 'N/A'}. Do not guarantee outcomes.`, {
      id: 'children.educationPath',
      confidence: scoreConfidence(sectionData.childrenEducation.academicScore, 5, 3),
      evidence: [{ path: 'sections.children.childrenEducation', value: compactValue(sectionData.childrenEducation) }],
    }));
  }

  if (allSections?.marriage?.marriageAfflictions?.isMarriageDenied) {
    claims.push(makeSectionClaim('children', 'alternative_creativity_pattern', `Marriage denial data is active, so children through marriage must be conditional. Emphasize mentoring, creativity, or younger-people bonds if relevant.`, {
      id: 'children.marriageDeniedAlternative',
      confidence: 'moderate',
      evidence: [{ path: 'sections.marriage.marriageAfflictions.isMarriageDenied', value: true }],
    }));
  }

  return claims;
}

function buildForeignTravelClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if (hasValue(sectionData.foreignLikelihood)) {
    claims.push(makeSectionClaim('foreignTravel', 'travel_likelihood', `Foreign travel likelihood: ${sectionData.foreignLikelihood}. Do not guarantee travel or migration.`, {
      id: 'foreignTravel.likelihood',
      confidence: textConfidence(sectionData.foreignLikelihood),
      evidence: [{ path: 'sections.foreignTravel.foreignLikelihood', value: sectionData.foreignLikelihood }],
    }));
  }
  if (sectionData.settlementAbroad) {
    claims.push(makeSectionClaim('foreignTravel', 'settlement_pattern', `Settlement abroad flag is present. Use as a possibility, not a guaranteed migration outcome.`, {
      id: 'foreignTravel.settlementPattern',
      confidence: 'moderate',
      evidence: [{ path: 'sections.foreignTravel.settlementAbroad', value: true }],
    }));
  }
  if (hasValue(sectionData.visaSuccess)) {
    claims.push(makeSectionClaim('foreignTravel', 'visa_support_pattern', `Visa support pattern: ${sectionData.visaSuccess}. This is not visa or immigration advice.`, {
      id: 'foreignTravel.visaSupport',
      confidence: textConfidence(sectionData.visaSuccess),
      evidence: [{ path: 'sections.foreignTravel.visaSuccess', value: sectionData.visaSuccess }],
    }));
  }
  if (sectionData.suggestedDirection) {
    claims.push(makeSectionClaim('foreignTravel', 'direction_hint', `Suggested direction/countries are symbolic suitability hints only: ${compactValue(sectionData.suggestedDirection)}.`, {
      id: 'foreignTravel.directionHint',
      confidence: 'weak',
      evidence: [{ path: 'sections.foreignTravel.suggestedDirection', value: compactValue(sectionData.suggestedDirection) }],
    }));
  }
  if (allSections?.education?.foreignStudy) {
    claims.push(makeSectionClaim('foreignTravel', 'foreign_study_link', `Foreign study link is supported by education data. Keep it probabilistic.`, {
      id: 'foreignTravel.foreignStudyLink',
      confidence: 'moderate',
      evidence: [{ path: 'sections.education.foreignStudy', value: true }],
    }));
  }
  return claims;
}

function buildEducationClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const pool = Array.isArray(sectionData.eduPlanetPool) ? sectionData.eduPlanetPool.slice(0, 3) : [];
  if (pool.length) {
    claims.push(makeSectionClaim('education', 'study_field_hint', `Study fields should be derived from the top education indicators only: ${shortList(pool.map(item => `${item.planet || 'factor'} (${item.source || 'source'})`), 3).join(', ')}.`, {
      id: 'education.studyFieldHints',
      confidence: pool.length >= 2 ? 'moderate' : 'weak',
      evidence: [{ path: 'sections.education.eduPlanetPool[0..2]', value: compactValue(pool) }],
    }));
  }
  const mercuryScore = sectionData.mercury?.score || allSections?.mentalHealth?.education?.mercuryScore;
  const jupiterScore = sectionData.jupiter?.score;
  if (hasValue(mercuryScore) || hasValue(jupiterScore)) {
    claims.push(makeSectionClaim('education', 'academic_strength', `Academic strength indicators: Mercury=${mercuryScore ?? 'N/A'}, Jupiter=${jupiterScore ?? 'N/A'}. Do not guarantee degrees or exam results.`, {
      id: 'education.academicStrength',
      confidence: scoreConfidence(Math.max(Number(mercuryScore) || 0, Number(jupiterScore) || 0)),
      evidence: [
        { path: 'sections.education.mercury.score', value: mercuryScore ?? null },
        { path: 'sections.education.jupiter.score', value: jupiterScore ?? null },
      ],
    }));
  }
  if (sectionData.foreignStudy) {
    claims.push(makeSectionClaim('education', 'foreign_study_pattern', `Foreign study indicator is present. Mention only as an opportunity pattern.`, {
      id: 'education.foreignStudyPattern',
      confidence: allSections?.foreignTravel?.foreignLikelihood ? textConfidence(allSections.foreignTravel.foreignLikelihood) : 'moderate',
      evidence: [{ path: 'sections.education.foreignStudy', value: true }],
    }));
  }
  if (sectionData.competitiveExams) {
    claims.push(makeSectionClaim('education', 'competitive_exam_pattern', `Competitive exam suitability data exists. Do not guarantee exam success.`, {
      id: 'education.competitiveExamPattern',
      confidence: sectionData.competitiveExams.marsInCareerHouses ? 'moderate' : 'weak',
      evidence: [{ path: 'sections.education.competitiveExams', value: compactValue(sectionData.competitiveExams) }],
    }));
  }
  return claims;
}

function buildLuckClaims(sectionData = {}) {
  const claims = [];
  if (hasValue(sectionData.overallLuck)) {
    claims.push(makeSectionClaim('luck', 'luck_pattern', `Overall luck score/rating: ${sectionData.overallLuck}. Explain as support pattern, not guaranteed fortune.`, {
      id: 'luck.overallPattern',
      confidence: textConfidence(sectionData.overallLuck),
      evidence: [{ path: 'sections.luck.overallLuck', value: sectionData.overallLuck }],
    }));
  }
  if (hasValue(sectionData.lotteryIndication)) {
    claims.push(makeSectionClaim('luck', 'speculation_caution', `Lottery/speculation indication: ${sectionData.lotteryIndication}. Never encourage gambling or imply winning.`, {
      id: 'luck.speculationCaution',
      confidence: textConfidence(sectionData.lotteryIndication),
      forbidden: ['gambling_encouragement', 'guaranteed_lottery', 'guaranteed_windfall'],
      evidence: [{ path: 'sections.luck.lotteryIndication', value: sectionData.lotteryIndication }],
    }));
  }
  if (hasValue(sectionData.inheritanceIndication)) {
    claims.push(makeSectionClaim('luck', 'inheritance_pattern', `Inheritance indication: ${sectionData.inheritanceIndication}. Keep broad and probabilistic.`, {
      id: 'luck.inheritancePattern',
      confidence: textConfidence(sectionData.inheritanceIndication),
      evidence: [{ path: 'sections.luck.inheritanceIndication', value: sectionData.inheritanceIndication }],
    }));
  }
  if (hasValue(sectionData.luckyNumbers) || hasValue(sectionData.luckyDays)) {
    claims.push(makeSectionClaim('luck', 'lucky_number_hint', `Lucky numbers/days can be shared as symbolic daily cues, not winning mechanisms.`, {
      id: 'luck.symbolicCues',
      confidence: 'weak',
      evidence: [
        { path: 'sections.luck.luckyNumbers', value: compactValue(sectionData.luckyNumbers) },
        { path: 'sections.luck.luckyDays', value: compactValue(sectionData.luckyDays) },
      ],
    }));
  }
  return claims;
}

function buildLegalClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if (hasValue(sectionData.enemyProfile) || hasValue(sectionData.legalIndicators)) {
    claims.push(makeSectionClaim('legal', 'legal_pressure_pattern', `Legal/dispute pressure data exists. Describe dispute style and prevention only; do not predict case outcomes.`, {
      id: 'legal.pressurePattern',
      confidence: sectionData.legalIndicators ? 'moderate' : 'weak',
      evidence: [
        { path: 'sections.legal.enemyProfile', value: compactValue(sectionData.enemyProfile) },
        { path: 'sections.legal.legalIndicators', value: compactValue(sectionData.legalIndicators) },
      ],
    }));
  }
  if ((sectionData.legalCasePeriods || []).length) {
    claims.push(makeSectionClaim('legal', 'practical_caution', `Legal case periods exist. Use as practical caution windows with documentation/boundary advice, not outcomes.`, {
      id: 'legal.caseCautionWindows',
      confidence: 'moderate',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.legal.legalCasePeriods', value: compactValue(sectionData.legalCasePeriods.slice(0, 4)) }],
    }));
  }
  if (allSections?.realEstate?.propertyYoga) {
    claims.push(makeSectionClaim('legal', 'property_dispute_pattern', `Property data exists and can be mentioned only as a documentation/caution theme.`, {
      id: 'legal.propertyLink',
      confidence: 'weak',
      evidence: [{ path: 'sections.realEstate.propertyYoga', value: compactValue(allSections.realEstate.propertyYoga) }],
    }));
  }
  return claims;
}

function buildRealEstateClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  const score = sectionData.fourthHouse?.strengthScore;
  if (hasValue(score) || sectionData.propertyYoga) {
    claims.push(makeSectionClaim('realEstate', 'property_potential', `Property potential data exists: score=${score ?? 'N/A'}. Do not guarantee purchase or investment success.`, {
      id: 'realEstate.propertyPotential',
      confidence: scoreConfidence(score),
      evidence: [
        { path: 'sections.realEstate.fourthHouse.strengthScore', value: score ?? null },
        { path: 'sections.realEstate.propertyYoga', value: compactValue(sectionData.propertyYoga) },
      ],
    }));
  }
  if ((sectionData.bestPeriodsForProperty || []).length) {
    claims.push(makeSectionClaim('realEstate', 'property_timing_window', `Property timing windows exist. Frame as better-supported decision periods, not purchase promises.`, {
      id: 'realEstate.propertyTiming',
      confidence: 'moderate',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.realEstate.bestPeriodsForProperty', value: compactValue(sectionData.bestPeriodsForProperty.slice(0, 4)) }],
    }));
  }
  if (allSections?.marriage?.venus?.house || sectionData.fourthHouse) {
    claims.push(makeSectionClaim('realEstate', 'vehicle_pattern', `Vehicle/home comfort can be discussed only as a broad asset pattern, not a guaranteed purchase.`, {
      id: 'realEstate.vehiclePattern',
      confidence: 'weak',
      evidence: [{ path: 'sections.marriage.venus.house|sections.realEstate.fourthHouse', value: compactValue({ venusHouse: allSections?.marriage?.venus?.house, fourthHouse: sectionData.fourthHouse }) }],
    }));
  }
  if (allSections?.foreignTravel?.settlementAbroad) {
    claims.push(makeSectionClaim('realEstate', 'foreign_property_pattern', `Foreign property can be mentioned only as a possibility linked to settlement-abroad data.`, {
      id: 'realEstate.foreignPropertyPattern',
      confidence: 'weak',
      evidence: [{ path: 'sections.foreignTravel.settlementAbroad', value: true }],
    }));
  }
  return claims;
}

function buildTransitClaims(sectionData = {}) {
  const claims = [];
  if (hasValue(sectionData.overallTransitScore)) {
    claims.push(makeSectionClaim('transits', 'current_period_quality', `Current period score: ${sectionData.overallTransitScore}/100. Use as present climate, not destiny.`, {
      id: 'transits.currentQuality',
      confidence: scoreConfidence(sectionData.overallTransitScore, 70, 45),
      evidence: [{ path: 'sections.transits.overallTransitScore', value: sectionData.overallTransitScore }],
    }));
  }
  const majorEvents = sectionData.majorEvents || [];
  if (majorEvents.length) {
    claims.push(makeSectionClaim('transits', 'active_transit_event', `Active current events exist: ${shortList(majorEvents.map(item => item.event || item.description), 4).join(', ')}. Keep date-bounded and non-guaranteed.`, {
      id: 'transits.activeEvents',
      confidence: 'moderate',
      framing: TIMING_PROMPT_POLICY.framing,
      evidence: [{ path: 'sections.transits.majorEvents', value: compactValue(majorEvents.slice(0, 4)) }],
    }));
  }
  if (sectionData.sadheSati?.active) {
    claims.push(makeSectionClaim('transits', 'major_cycle', `Major Saturn testing cycle is active. Explain as a current pressure cycle, not a guaranteed bad event.`, {
      id: 'transits.majorCycle',
      confidence: 'moderate',
      evidence: [{ path: 'sections.transits.sadheSati', value: compactValue(sectionData.sadheSati) }],
    }));
  }
  return claims;
}

function buildPhysicalProfileClaims(sectionData = {}) {
  const claims = [];
  const cuspSensitive = Boolean(sectionData.lagnaCuspWarning?.isNearCusp);
  if (sectionData.lagnaEnglish || sectionData.planetsIn1st?.length || sectionData.lagnaLord) {
    claims.push(makeSectionClaim('physicalProfile', 'body_type_hint', `Body and presence hints are available. Use soft visual ranges${cuspSensitive ? ' and downgrade detail because birth time is cusp-sensitive' : ''}.`, {
      id: 'physicalProfile.bodyTypeHint',
      confidence: cuspSensitive ? 'weak' : 'moderate',
      evidence: [{ path: 'sections.physicalProfile.lagna|planetsIn1st|lagnaLord', value: compactValue({ lagna: sectionData.lagnaEnglish, planetsIn1st: sectionData.planetsIn1st, lagnaLord: sectionData.lagnaLord }) }],
    }));
  }
  if (hasValue(sectionData.attractivenessScore) || sectionData.venusAnalysis) {
    claims.push(makeSectionClaim('physicalProfile', 'attractiveness_pattern', `Attractiveness data is a symbolic appearance pattern, not an objective value judgment.`, {
      id: 'physicalProfile.attractivenessPattern',
      confidence: scoreConfidence(sectionData.attractivenessScore, 75, 50),
      evidence: [{ path: 'sections.physicalProfile.attractivenessScore|venusAnalysis', value: compactValue({ score: sectionData.attractivenessScore, venus: sectionData.venusAnalysis }) }],
    }));
  }
  if (hasValue(sectionData.mercuryStrength) || hasValue(sectionData.moonStrength) || hasValue(sectionData.jupiterStrength)) {
    claims.push(makeSectionClaim('physicalProfile', 'mental_profile', `Mental profile can discuss thinking/emotional style only. Do not diagnose mental health.`, {
      id: 'physicalProfile.mentalProfile',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.physicalProfile.mercuryStrength|moonStrength|jupiterStrength', value: compactValue({ mercury: sectionData.mercuryStrength, moon: sectionData.moonStrength, jupiter: sectionData.jupiterStrength }) }],
    }));
  }
  return claims;
}

function buildAttractionClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if (hasValue(sectionData.attractionPower)) {
    claims.push(makeSectionClaim('attractionProfile', 'attraction_score', `Attraction power score: ${sectionData.attractionPower}/10 (${sectionData.attractionBand || 'unbanded'}). Explain respectfully and never as objective human worth.`, {
      id: 'attractionProfile.score',
      confidence: scoreConfidence(Number(sectionData.attractionPower) * 10, 75, 50),
      allowedDetails: {
        objectiveHumanWorth: false,
        insultingLowScore: false,
        symbolicScoreOnly: true,
      },
      evidence: [{ path: 'sections.attractionProfile.attractionPower|scoreBreakdown', value: compactValue({ score: sectionData.attractionPower, band: sectionData.attractionBand, confidence: sectionData.attractionConfidence, breakdown: sectionData.scoreBreakdown }) }],
    }));
  }
  if (sectionData.scoreBreakdown || sectionData.supportiveFactors || sectionData.challengingFactors) {
    claims.push(makeSectionClaim('attractionProfile', 'romantic_presence', `Romantic presence must be derived from the weighted score breakdown, supportive factors, and challenging factors.`, {
      id: 'attractionProfile.romanticPresence',
      confidence: sectionData.attractionConfidence === 'low' ? 'weak' : 'moderate',
      allowedDetails: {
        useScoreBreakdown: true,
        mentionConfidenceWhenLow: true,
        physicalCertainty: false,
      },
      evidence: [{ path: 'sections.attractionProfile.scoreBreakdown|supportiveFactors|challengingFactors', value: compactValue({ breakdown: sectionData.scoreBreakdown, supportive: sectionData.supportiveFactors, challenging: sectionData.challengingFactors }) }],
    }));
  }
  if (sectionData.h7SignEnglish || sectionData.darakaraka) {
    claims.push(makeSectionClaim('attractionProfile', 'partner_type_pattern', `Partner type pattern exists. Use partner-aware language and avoid gender stereotypes.`, {
      id: 'attractionProfile.partnerType',
      confidence: 'moderate',
      allowedDetails: {
        genderStereotypes: false,
        orientationAssumption: false,
        guaranteedPartnerOutcome: false,
      },
      evidence: [{ path: 'sections.attractionProfile.h5|h7|darakaraka', value: compactValue({ h5Sign: sectionData.h5SignEnglish, h5Strength: sectionData.h5Strength, h7Sign: sectionData.h7SignEnglish, h7Strength: sectionData.h7Strength, darakaraka: sectionData.darakaraka }) }],
    }));
  }
  if (sectionData.marsHouse || sectionData.venusHouse || sectionData.venusMarsSameHouse !== undefined) {
    claims.push(makeSectionClaim('attractionProfile', 'intimacy_style', `Intimacy style can be discussed tastefully and broadly only. No explicit sexual content.`, {
      id: 'attractionProfile.intimacyStyle',
      confidence: 'weak',
      allowedDetails: {
        explicitSexualContent: false,
        sexualPerformanceClaim: false,
        paceTrustBoundariesOnly: true,
      },
      evidence: [{ path: 'sections.attractionProfile.venus|mars|h8', value: compactValue({ venus: sectionData.venusAnalysis || { house: sectionData.venusHouse }, mars: sectionData.marsAnalysis || { house: sectionData.marsHouse }, sameHouse: sectionData.venusMarsSameHouse, h8Planets: sectionData.h8Planets, h8Strength: sectionData.h8Strength }) }],
    }));
  }
  if (sectionData.socialAppeal) {
    claims.push(makeSectionClaim('attractionProfile', 'love_language', `Social and emotional appeal data may be used for how warmth, humor, and communication develop after first impression.`, {
      id: 'attractionProfile.socialAppeal',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.attractionProfile.socialAppeal', value: compactValue(sectionData.socialAppeal) }],
    }));
  }
  if (allSections?.surpriseInsights?.loveLanguage) {
    claims.push(makeSectionClaim('attractionProfile', 'love_language', `Love language data is available and may be used for romantic style.`, {
      id: 'attractionProfile.loveLanguage',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.surpriseInsights.loveLanguage', value: compactValue(allSections.surpriseInsights.loveLanguage) }],
    }));
  }
  return claims;
}

function buildSurpriseInsightClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if ((sectionData.bodyMarks || []).length) {
    claims.push(makeSectionClaim('surpriseInsights', 'verifiable_trait', `Body marks/scars are verifiable traits. Mention only locations/types present in evidence.`, {
      id: 'surpriseInsights.bodyMarks',
      confidence: 'weak',
      evidence: [{ path: 'sections.surpriseInsights.bodyMarks', value: compactValue(sectionData.bodyMarks.slice(0, 5)) }],
    }));
  }
  const siblings = sectionData.numberOfSiblings || allSections?.familyPortrait?.siblings?.estimatedCount;
  if (siblings) {
    claims.push(makeSectionClaim('surpriseInsights', 'family_hint', `Sibling count may be mentioned as an estimate only: ${compactValue(siblings)}.`, {
      id: 'surpriseInsights.siblingEstimate',
      confidence: 'engine_supplied_estimate',
      evidence: [{ path: 'sections.surpriseInsights.numberOfSiblings|sections.familyPortrait.siblings.estimatedCount', value: compactValue(siblings) }],
    }));
  }
  if (sectionData.partnerFirstLetter?.topLetters?.length) {
    claims.push(makeSectionClaim('surpriseInsights', 'relationship_hint', `Partner first-letter hints are low-stakes optional symbols: ${sectionData.partnerFirstLetter.topLetters.slice(0, 3).join(', ')}. Do not state as fact.`, {
      id: 'surpriseInsights.partnerLetters',
      confidence: 'weak',
      evidence: [{ path: 'sections.surpriseInsights.partnerFirstLetter.topLetters', value: compactValue(sectionData.partnerFirstLetter.topLetters.slice(0, 3)) }],
    }));
  }
  if (sectionData.addictionProfile) {
    claims.push(makeSectionClaim('surpriseInsights', 'habit_tendency', `Habit vulnerability data must be reframed as escape or habit tendency. Do not label addiction or name substances.`, {
      id: 'surpriseInsights.habitTendency',
      confidence: 'weak',
      evidence: [{ path: 'sections.surpriseInsights.addictionProfile', value: compactValue(sectionData.addictionProfile) }],
    }));
  }
  if (sectionData.spiritAnimal || sectionData.celebrityTwin || sectionData.pastLifeStory) {
    claims.push(makeSectionClaim('surpriseInsights', 'symbolic_fun', `Fun symbolic content is available. Keep clearly symbolic and separate from factual predictions.`, {
      id: 'surpriseInsights.symbolicFun',
      confidence: 'symbolic',
      evidence: [{ path: 'sections.surpriseInsights.spiritAnimal|celebrityTwin|pastLifeStory', value: compactValue({ spiritAnimal: sectionData.spiritAnimal, celebrityTwin: sectionData.celebrityTwin, pastLifeStory: sectionData.pastLifeStory }) }],
    }));
  }
  return claims;
}

function buildRemedyClaims(sectionData = {}, allSections = {}) {
  const claims = [];
  if (sectionData.lagnaGem || sectionData.yogaKaraka?.gem) {
    claims.push(makeSectionClaim('remedies', 'gemstone_hint', `Gemstone data is optional symbolic support only. Do not promise cures, fixes, or guaranteed outcomes.`, {
      id: 'remedies.gemstoneHint',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.remedies.lagnaGem|yogaKaraka.gem', value: compactValue({ lagnaGem: sectionData.lagnaGem, yogaKaraka: sectionData.yogaKaraka }) }],
    }));
  }
  if (sectionData.lagnaColor || sectionData.lagnaDay) {
    claims.push(makeSectionClaim('remedies', 'color_routine', `Color and power-day data can be used as symbolic routine cues.`, {
      id: 'remedies.colorDayRoutine',
      confidence: 'weak',
      evidence: [{ path: 'sections.remedies.lagnaColor|lagnaDay', value: compactValue({ color: sectionData.lagnaColor, day: sectionData.lagnaDay }) }],
    }));
  }
  if ((sectionData.weakPlanetRemedies || []).length) {
    claims.push(makeSectionClaim('remedies', 'diet_lifestyle_support', `Weak-planet remedy data supports lifestyle suggestions only; no medical treatment claims.`, {
      id: 'remedies.weakPlanetLifestyle',
      confidence: 'engine_supplied',
      evidence: [{ path: 'sections.remedies.weakPlanetRemedies', value: compactValue(sectionData.weakPlanetRemedies.slice(0, 5)) }],
    }));
  }
  if ((allSections?.health?.dietRecommendations || []).length) {
    claims.push(makeSectionClaim('remedies', 'exercise_support', `Health-linked remedy suggestions must stay in lifestyle-support language and cannot add new health claims.`, {
      id: 'remedies.healthLifestyleLink',
      confidence: 'weak',
      evidence: [{ path: 'sections.health.dietRecommendations', value: compactValue(allSections.health.dietRecommendations.slice(0, 5)) }],
    }));
  }
  return claims;
}

function buildSectionSpecificClaims(sectionKey, sectionData = {}, allSections = {}) {
  switch (sectionKey) {
    case 'yogaAnalysis': return buildYogaClaims(sectionData, allSections);
    case 'lifePredictions': return buildLifePredictionClaims(sectionData, allSections);
    case 'career': return buildCareerClaims(sectionData, allSections);
    case 'financial': return buildFinancialClaims(sectionData, allSections);
    case 'children': return buildChildrenClaims(sectionData, allSections);
    case 'foreignTravel': return buildForeignTravelClaims(sectionData, allSections);
    case 'education': return buildEducationClaims(sectionData, allSections);
    case 'luck': return buildLuckClaims(sectionData, allSections);
    case 'legal': return buildLegalClaims(sectionData, allSections);
    case 'realEstate': return buildRealEstateClaims(sectionData, allSections);
    case 'transits': return buildTransitClaims(sectionData, allSections);
    case 'physicalProfile': return buildPhysicalProfileClaims(sectionData, allSections);
    case 'attractionProfile': return buildAttractionClaims(sectionData, allSections);
    case 'surpriseInsights': return buildSurpriseInsightClaims(sectionData, allSections);
    case 'remedies': return buildRemedyClaims(sectionData, allSections);
    default: return [];
  }
}

function shouldBlockTimingClaim(sectionKey, claim, allSections = {}) {
  const marriageDenied = Boolean(allSections?.marriage?.marriageAfflictions?.isMarriageDenied);
  if (!marriageDenied) return false;
  if (['marriage', 'marriedLife'].includes(sectionKey)) return true;
  if (sectionKey === 'children') return true;
  return false;
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
  const rawTimingClaims = buildTimingClaims(sectionKey, sectionData, allSections);
  const blockedTimingClaims = rawTimingClaims.filter(claim => shouldBlockTimingClaim(sectionKey, claim, allSections));
  const timingClaims = rawTimingClaims.filter(claim => !shouldBlockTimingClaim(sectionKey, claim, allSections));
  const familyClaims = sectionKey === 'familyPortrait'
    ? buildFamilyClaims(sectionData, allSections)
    : [];
  const relationshipClaims = ['marriage', 'marriedLife'].includes(sectionKey)
    ? buildRelationshipClaims(sectionKey, sectionData, allSections)
    : [];
  const sectionSpecificClaims = buildSectionSpecificClaims(sectionKey, sectionData, allSections);
  const allowedClaims = [
    ...timingClaims,
    ...familyClaims,
    ...relationshipClaims,
    ...sectionSpecificClaims,
  ].filter(claim => claim.allowed !== false);
  const omitTopics = [
    ...relationshipClaims
    .filter(claim => claim.allowed === false)
    .map(claim => ({
      id: claim.id,
      reason: 'Relationship timing claim blocked by stronger denial/low-confidence data',
    })),
    ...blockedTimingClaims.map(claim => ({
      id: claim.id,
      reason: 'Timing claim blocked by stronger relationship/children denial data',
      evidence: claim.evidence,
    })),
  ];

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
  buildYogaClaims,
  buildLifePredictionClaims,
  buildCareerClaims,
  buildFinancialClaims,
  buildChildrenClaims,
  buildForeignTravelClaims,
  buildEducationClaims,
  buildLuckClaims,
  buildLegalClaims,
  buildRealEstateClaims,
  buildTransitClaims,
  buildPhysicalProfileClaims,
  buildAttractionClaims,
  buildSurpriseInsightClaims,
  buildRemedyClaims,
  buildSectionSpecificClaims,
  buildSectionPromptPayload,
  buildSectionPromptPolicyBlock,
};
