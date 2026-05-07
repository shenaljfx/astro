const { PROMPT_POLICY_VERSION, TIMING_PROMPT_POLICY } = require('./promptPolicies');

const PROMPT_VERSION = 'grahachara-report-prompt-v7';
const PROMPT_OBSERVABILITY_VERSION = 'prompt-observability-v1';
const CLAIM_BUILDER_VERSION = 'prompt-claim-builder-v3';

function normalizeAnalyticsTerm(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'unknown';
}

function incrementCounter(target, key, amount = 1) {
  const normalized = normalizeAnalyticsTerm(key);
  target[normalized] = (target[normalized] || 0) + amount;
}

function countClaims(promptClaims = null) {
  const allowedClaims = Array.isArray(promptClaims?.allowedClaims) ? promptClaims.allowedClaims : [];
  const omitTopics = Array.isArray(promptClaims?.omitTopics) ? promptClaims.omitTopics : [];
  const byCategory = {};
  const bySensitivity = {};

  for (const claim of allowedClaims) {
    const category = claim.category || 'unknown';
    const sensitivity = claim.sensitivity || 'unspecified';
    byCategory[category] = (byCategory[category] || 0) + 1;
    bySensitivity[sensitivity] = (bySensitivity[sensitivity] || 0) + 1;
  }

  return {
    allowed: allowedClaims.length,
    omitted: omitTopics.length,
    timing: allowedClaims.filter(claim => claim.category === TIMING_PROMPT_POLICY.category).length,
    health: allowedClaims.filter(claim => claim.sensitivity === 'health').length,
    relationship: allowedClaims.filter(claim => claim.sensitivity === 'relationship').length,
    byCategory,
    bySensitivity,
  };
}

function summarizeValidation(validation = null) {
  if (!validation) {
    return {
      severity: 0,
      redFlags: 0,
      hallucinationSuspects: 0,
      healthIssues: 0,
      timingIssues: 0,
      languageOk: true,
      selfCritiqued: false,
    };
  }

  return {
    severity: validation.severity || 0,
    redFlags: Array.isArray(validation.redFlags) ? validation.redFlags.length : 0,
    hallucinationSuspects: Array.isArray(validation.hallucinations?.suspect) ? validation.hallucinations.suspect.length : 0,
    healthIssues: Array.isArray(validation.healthSafety?.issues) ? validation.healthSafety.issues.length : 0,
    timingIssues: Array.isArray(validation.timingSafety?.issues) ? validation.timingSafety.issues.length : 0,
    languageOk: validation.language?.ok !== false,
    aiDisclosuresRemoved: validation.aiDisclosuresRemoved || 0,
    selfCritiqued: Boolean(validation.selfCritiqued),
  };
}

function buildSectionGenerationMetadata({
  sectionKey,
  model = null,
  temperature = null,
  promptClaims = null,
  validation = null,
  generationMode = null,
  retry = false,
} = {}) {
  return {
    promptVersion: PROMPT_VERSION,
    promptPolicyVersion: PROMPT_POLICY_VERSION,
    claimBuilderVersion: CLAIM_BUILDER_VERSION,
    observabilityVersion: PROMPT_OBSERVABILITY_VERSION,
    sectionKey,
    generationMode,
    model,
    temperature,
    retry,
    sectionPolicy: promptClaims?.sectionPolicy || null,
    policyVersion: promptClaims?.policyVersion || null,
    claimCounts: countClaims(promptClaims),
    validationSummary: summarizeValidation(validation),
    generatedAt: new Date().toISOString(),
  };
}

function summarizePromptValidationMetadata(validationMetadata = {}) {
  const sections = validationMetadata.sections || {};
  const summary = {
    sections: 0,
    totalSeverity: 0,
    redFlags: 0,
    hallucinationSuspects: 0,
    healthIssues: 0,
    timingIssues: 0,
    selfCritiqued: 0,
    unsupportedOrganMentions: 0,
    guaranteedTimingIssues: 0,
    languageFailures: 0,
  };

  for (const meta of Object.values(sections)) {
    summary.sections += 1;
    const validation = meta.validation || null;
    const basic = summarizeValidation(validation);
    summary.totalSeverity += basic.severity;
    summary.redFlags += basic.redFlags;
    summary.hallucinationSuspects += basic.hallucinationSuspects;
    summary.healthIssues += basic.healthIssues;
    summary.timingIssues += basic.timingIssues;
    summary.selfCritiqued += basic.selfCritiqued ? 1 : 0;
    summary.languageFailures += basic.languageOk ? 0 : 1;

    const healthIssues = validation?.healthSafety?.issues || [];
    summary.unsupportedOrganMentions += healthIssues.filter(issue => issue.type === 'unsupported_organ_mention').length;

    const timingIssues = validation?.timingSafety?.issues || [];
    summary.guaranteedTimingIssues += timingIssues.filter(issue => /^guaranteed_/.test(issue.type)).length;
  }

  if (validationMetadata.crossSection) {
    summary.crossSectionDiscrepancies = Array.isArray(validationMetadata.crossSection.discrepancies)
      ? validationMetadata.crossSection.discrepancies.length
      : 0;
    summary.crossSectionHighStakes = (validationMetadata.crossSection.discrepancies || [])
      .filter(discrepancy => discrepancy.highStakes)
      .length;
    summary.crossSectionReconciled = validationMetadata.crossSection.reconciled || 0;
  }

  return summary;
}

function collectUnsupportedTermEvents(validationMetadata = {}) {
  const sections = validationMetadata.sections || {};
  const events = [];

  for (const [sectionKey, meta] of Object.entries(sections)) {
    const validation = meta.validation || {};
    const addIssue = (source, issue) => {
      if (!issue) return;
      const type = issue.type || source;
      const rawTerm = issue.snippet || issue.context || issue.sentence || issue.value || issue.claimId || type;
      events.push({
        sectionKey,
        source,
        type,
        term: normalizeAnalyticsTerm(rawTerm),
        rawTerm: String(rawTerm || '').slice(0, 240),
      });
    };

    for (const issue of validation.healthSafety?.issues || []) addIssue('healthSafety', issue);
    for (const issue of validation.timingSafety?.issues || []) addIssue('timingSafety', issue);
    for (const issue of validation.redFlags || []) addIssue('redFlags', issue);
    for (const issue of validation.hallucinations?.suspect || []) addIssue('hallucinations', issue);
  }

  return events;
}

function buildUnsupportedTermAnalytics(validationMetadata = {}, promptMetadata = null) {
  const events = collectUnsupportedTermEvents(validationMetadata);
  const termCounts = {};
  const byType = {};
  const bySection = {};
  const bySource = {};

  for (const event of events) {
    incrementCounter(termCounts, event.term);
    incrementCounter(byType, event.type);
    incrementCounter(bySection, event.sectionKey);
    incrementCounter(bySource, event.source);
  }

  const topUnsupportedTerms = Object.entries(termCounts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 20);

  return {
    promptVersion: promptMetadata?.promptVersion || validationMetadata.promptRun?.promptVersion || PROMPT_VERSION,
    promptPolicyVersion: promptMetadata?.promptPolicyVersion || validationMetadata.promptRun?.promptPolicyVersion || PROMPT_POLICY_VERSION,
    generatedAt: new Date().toISOString(),
    unsupportedEventCount: events.length,
    repeatedUnsupportedTerms: topUnsupportedTerms.filter(item => item.count > 1),
    topUnsupportedTerms,
    byType,
    bySection,
    bySource,
    events: events.slice(0, 100),
  };
}

function getSectionPromptMetadata(reportData = {}, sectionKey = null) {
  if (!sectionKey) return null;
  return reportData.sections?.[sectionKey]?.promptMetadata
    || reportData.validationMetadata?.sections?.[sectionKey]?.promptMetadata
    || null;
}

function buildPromptFeedbackRecord({
  uid = null,
  reportId = null,
  reportData = {},
  sectionKey = null,
  claimType = null,
  claimId = null,
  rating = null,
  helpful = null,
  issueType = null,
  comment = null,
  source = 'user',
} = {}) {
  const runMetadata = reportData.promptMetadata || reportData.validationMetadata?.promptRun || {};
  const sectionMetadata = getSectionPromptMetadata(reportData, sectionKey) || {};
  const normalizedClaimType = normalizeAnalyticsTerm(claimType || issueType || 'general');
  const numericRating = Number.isFinite(Number(rating)) ? Number(rating) : null;

  return {
    uid,
    reportId,
    sectionKey: sectionKey || 'report',
    claimType: normalizedClaimType,
    claimId: claimId || null,
    rating: numericRating,
    helpful: typeof helpful === 'boolean' ? helpful : null,
    issueType: issueType ? normalizeAnalyticsTerm(issueType) : null,
    comment: comment ? String(comment).slice(0, 2000) : null,
    source,
    promptVersion: runMetadata.promptVersion || sectionMetadata.promptVersion || PROMPT_VERSION,
    promptPolicyVersion: runMetadata.promptPolicyVersion || sectionMetadata.promptPolicyVersion || PROMPT_POLICY_VERSION,
    claimBuilderVersion: runMetadata.claimBuilderVersion || sectionMetadata.claimBuilderVersion || CLAIM_BUILDER_VERSION,
    sectionPolicyVersion: sectionMetadata.policyVersion || null,
    sectionModel: sectionMetadata.model || null,
    sectionTemperature: sectionMetadata.temperature || null,
    sectionClaimCounts: sectionMetadata.claimCounts || null,
    createdAt: new Date().toISOString(),
  };
}

function buildFeedbackSummary(existingSummary = null, feedbackRecord = {}) {
  const summary = existingSummary || {
    total: 0,
    helpful: 0,
    unhelpful: 0,
    ratingTotal: 0,
    ratingCount: 0,
    averageRating: null,
    bySection: {},
    byClaimType: {},
    byIssueType: {},
  };
  const next = JSON.parse(JSON.stringify(summary));
  next.bySection = next.bySection || {};
  next.byClaimType = next.byClaimType || {};
  next.byIssueType = next.byIssueType || {};
  next.total = (next.total || 0) + 1;
  if (feedbackRecord.helpful === true) next.helpful = (next.helpful || 0) + 1;
  if (feedbackRecord.helpful === false) next.unhelpful = (next.unhelpful || 0) + 1;
  if (Number.isFinite(feedbackRecord.rating)) {
    next.ratingTotal = (next.ratingTotal || 0) + feedbackRecord.rating;
    next.ratingCount = (next.ratingCount || 0) + 1;
    next.averageRating = Math.round((next.ratingTotal / next.ratingCount) * 100) / 100;
  }
  incrementCounter(next.bySection, feedbackRecord.sectionKey || 'report');
  incrementCounter(next.byClaimType, feedbackRecord.claimType || 'general');
  if (feedbackRecord.issueType) incrementCounter(next.byIssueType, feedbackRecord.issueType);
  next.updatedAt = new Date().toISOString();
  return next;
}

function buildPromptRunMetadata({
  language = 'en',
  sectionOrder = [],
  startedAt = null,
  completedAt = null,
  successCount = 0,
  totalSections = sectionOrder.length,
  failedSectionCount = 0,
  validationMetadata = null,
  tokenUsageSummary = null,
} = {}) {
  return {
    promptVersion: PROMPT_VERSION,
    promptPolicyVersion: PROMPT_POLICY_VERSION,
    claimBuilderVersion: CLAIM_BUILDER_VERSION,
    observabilityVersion: PROMPT_OBSERVABILITY_VERSION,
    language,
    startedAt,
    completedAt,
    sectionCount: totalSections,
    successCount,
    failedSectionCount,
    sectionOrder,
    tokenUsageSummary,
    validationSummary: validationMetadata ? summarizePromptValidationMetadata(validationMetadata) : null,
  };
}

module.exports = {
  PROMPT_VERSION,
  PROMPT_OBSERVABILITY_VERSION,
  CLAIM_BUILDER_VERSION,
  countClaims,
  summarizeValidation,
  buildSectionGenerationMetadata,
  summarizePromptValidationMetadata,
  collectUnsupportedTermEvents,
  buildUnsupportedTermAnalytics,
  buildPromptFeedbackRecord,
  buildFeedbackSummary,
  buildPromptRunMetadata,
};
