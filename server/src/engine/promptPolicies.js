const HEALTH_ORGAN_POLICIES = Object.freeze([
  {
    key: 'heart',
    publicLabel: 'Heart and circulation',
    aliases: ['heart', 'cardiovascular', 'circulation'],
  },
  {
    key: 'liver',
    publicLabel: 'Liver, pancreas, and upper digestion',
    aliases: ['liver', 'pancreas', 'upper digestion'],
  },
  {
    key: 'lungs',
    publicLabel: 'Lungs and respiratory system',
    aliases: ['lungs', 'respiratory', 'breathing'],
  },
  {
    key: 'bones',
    publicLabel: 'Bones, joints, and spine',
    aliases: ['bones', 'joints', 'spine'],
  },
  {
    key: 'eyes',
    publicLabel: 'Eyes and vision',
    aliases: ['eyes', 'vision', 'sight'],
  },
  {
    key: 'nerves',
    publicLabel: 'Nervous system and emotional regulation',
    aliases: ['nervous', 'mental health', 'emotional', 'nerves'],
  },
  {
    key: 'reproductive',
    publicLabel: 'Reproductive and urogenital balance',
    aliases: ['reproductive', 'urogenital', 'fertility'],
  },
  {
    key: 'skin',
    publicLabel: 'Skin and dermatological balance',
    aliases: ['skin', 'dermatological'],
  },
  {
    key: 'bloodPressure',
    publicLabel: 'Blood pressure and circulation',
    aliases: ['blood pressure', 'circulation'],
  },
  {
    key: 'thyroid',
    publicLabel: 'Thyroid and endocrine balance',
    aliases: ['thyroid', 'endocrine'],
  },
  {
    key: 'kidneys',
    publicLabel: 'Kidney and urinary balance',
    aliases: ['kidney', 'kidneys', 'urinary', 'renal'],
  },
  {
    key: 'feet',
    publicLabel: 'Feet, ankles, and lower limbs',
    aliases: ['feet', 'ankles', 'lower limbs', 'legs'],
  },
]);

const PROMPT_POLICY_VERSION = 'prompt-policy-v3';

const SECTION_PROMPT_POLICIES = Object.freeze({
  yogaAnalysis: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['chart_combination', 'challenge_pattern', 'strength_pattern', 'timing_window'],
    claimTypesBlocked: ['guaranteed_success', 'guaranteed_suffering', 'guaranteed_marriage_failure', 'guaranteed_wealth'],
    requireEvidenceFor: ['yoga_strength', 'dosha_severity', 'rare_combination'],
  },
  lifePredictions: {
    sensitivity: 'high',
    modelTemperature: 0.45,
    maxParagraphs: 10,
    claimTypesAllowed: ['current_phase', 'near_term_window', 'past_validation_window', 'cross_section_convergence', 'sensitive_caution_window'],
    claimTypesBlocked: ['guaranteed_event', 'exact_lifespan', 'death_prediction', 'unavoidable_outcome'],
    requireEvidenceFor: ['major_turning_point', 'health_sensitive_period', 'cross_section_year'],
  },
  career: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 10,
    claimTypesAllowed: ['career_direction', 'business_vs_service', 'career_timing_window', 'foreign_career_pattern', 'domestic_role_pattern', 'wealth_trajectory_link'],
    claimTypesBlocked: ['guaranteed_job', 'guaranteed_business_success', 'specific_income_promise', 'specific_investment_advice'],
    requireEvidenceFor: ['career_field', 'business_verdict', 'career_change_timing'],
  },
  health: {
    sensitivity: 'high',
    modelTemperature: 0.35,
    maxParagraphs: 8,
    claimTypesAllowed: ['constitution', 'wellness_pattern', 'early_life_vitality_pattern', 'timing_window', 'lifestyle_support'],
    claimTypesBlocked: ['diagnosis', 'guaranteed_illness', 'procedure_prediction', 'exact_lifespan'],
    requireEvidenceFor: ['organ', 'infant_health', 'mental_health', 'parent_health'],
  },
  familyPortrait: {
    sensitivity: 'high',
    modelTemperature: 0.45,
    maxParagraphs: 12,
    claimTypesAllowed: ['family_role', 'relationship_dynamic', 'parent_wellness_pattern', 'sibling_estimate'],
    claimTypesBlocked: ['guaranteed_parent_illness', 'invented_family_event', 'parent_diagnosis'],
    requireEvidenceFor: ['parent_health', 'sibling_count', 'family_separation', 'parent_profession'],
  },
  marriage: {
    sensitivity: 'high',
    modelTemperature: 0.45,
    maxParagraphs: 12,
    claimTypesAllowed: ['relationship_timing', 'relationship_dynamic', 'relationship_stability'],
    claimTypesBlocked: ['guaranteed_divorce', 'guaranteed_second_marriage', 'invented_spouse_detail'],
    requireEvidenceFor: ['marriage_timing', 'divorce_risk', 'second_marriage', 'spouse_profile'],
  },
  marriedLife: {
    sensitivity: 'high',
    modelTemperature: 0.45,
    maxParagraphs: 12,
    claimTypesAllowed: ['relationship_dynamic', 'relationship_stability', 'family_dynamic'],
    claimTypesBlocked: ['guaranteed_divorce', 'invented_in_law_event'],
    requireEvidenceFor: ['relationship_conflict', 'in_law_pattern', 'domestic_life'],
  },
  children: {
    sensitivity: 'high',
    modelTemperature: 0.45,
    maxParagraphs: 10,
    claimTypesAllowed: ['children_estimate', 'timing_window', 'fertility_symbolism', 'education_path', 'parenting_style', 'alternative_creativity_pattern'],
    claimTypesBlocked: ['guaranteed_birth', 'fertility_diagnosis', 'guaranteed_gender'],
    requireEvidenceFor: ['child_count', 'child_timing', 'fertility_challenge'],
  },
  physicalProfile: {
    sensitivity: 'medium',
    modelTemperature: 0.55,
    maxParagraphs: 10,
    claimTypesAllowed: ['body_type_hint', 'face_feature_hint', 'style_presence', 'aging_pattern', 'attractiveness_pattern', 'mental_profile', 'constitution_pattern'],
    claimTypesBlocked: ['exact_verifiable_feature_without_data', 'derogatory_body_claim', 'mental_health_diagnosis'],
    requireEvidenceFor: ['appearance_detail', 'body_mark', 'mental_profile'],
  },
  attractionProfile: {
    sensitivity: 'high',
    modelTemperature: 0.5,
    maxParagraphs: 8,
    claimTypesAllowed: ['romantic_presence', 'attraction_score', 'partner_type_pattern', 'love_language', 'intimacy_style', 'romantic_growth_pattern'],
    claimTypesBlocked: ['explicit_sexual_content', 'sexual_performance_claim', 'orientation_assumption', 'gender_stereotype', 'opposite_gender_assumption', 'insulting_attraction_claim', 'objective_worth_rating'],
    requireEvidenceFor: ['attraction_score', 'partner_type', 'intimacy_style'],
  },
  foreignTravel: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['travel_likelihood', 'settlement_pattern', 'visa_support_pattern', 'travel_timing_window', 'direction_hint', 'foreign_study_link', 'foreign_career_link'],
    claimTypesBlocked: ['guaranteed_visa', 'guaranteed_migration', 'immigration_legal_advice'],
    requireEvidenceFor: ['settlement_abroad', 'visa_success', 'country_direction'],
  },
  education: {
    sensitivity: 'medium',
    modelTemperature: 0.5,
    maxParagraphs: 8,
    claimTypesAllowed: ['learning_style', 'study_field_hint', 'academic_strength', 'study_timing_window', 'foreign_study_pattern', 'competitive_exam_pattern', 'education_career_bridge'],
    claimTypesBlocked: ['guaranteed_degree', 'guaranteed_exam_result', 'guaranteed_admission'],
    requireEvidenceFor: ['study_field', 'foreign_study', 'competitive_exam'],
  },
  luck: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['luck_pattern', 'lucky_period', 'lucky_number_hint', 'windfall_pattern', 'inheritance_pattern', 'speculation_caution'],
    claimTypesBlocked: ['gambling_encouragement', 'guaranteed_lottery', 'guaranteed_windfall', 'guaranteed_inheritance'],
    requireEvidenceFor: ['lottery_indication', 'windfall', 'inheritance'],
  },
  legal: {
    sensitivity: 'high',
    modelTemperature: 0.4,
    maxParagraphs: 8,
    claimTypesAllowed: ['legal_pressure_pattern', 'timing_window', 'practical_caution', 'property_dispute_pattern'],
    claimTypesBlocked: ['guaranteed_legal_outcome', 'invented_case_detail'],
    requireEvidenceFor: ['legal_period', 'legal_verdict'],
  },
  financial: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 10,
    claimTypesAllowed: ['income_pattern', 'savings_pattern', 'spending_pattern', 'timing_window', 'risk_window', 'windfall_pattern', 'investment_style', 'wealth_trajectory'],
    claimTypesBlocked: ['guaranteed_wealth', 'guaranteed_loss', 'specific_investment_advice'],
    requireEvidenceFor: ['income_peak', 'windfall', 'financial_risk'],
  },
  realEstate: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['property_potential', 'property_timing_window', 'vehicle_pattern', 'inheritance_link', 'foreign_property_pattern', 'home_stability_pattern'],
    claimTypesBlocked: ['guaranteed_purchase', 'guaranteed_vehicle', 'property_investment_advice', 'guaranteed_inheritance'],
    requireEvidenceFor: ['property_timing', 'vehicle_pattern', 'inheritance'],
  },
  transits: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['current_period_quality', 'active_transit_event', 'supportive_current_influence', 'challenging_current_influence', 'near_term_outlook', 'major_cycle'],
    claimTypesBlocked: ['guaranteed_event', 'stale_current_event', 'unbounded_transit_claim'],
    requireEvidenceFor: ['active_event', 'near_term_window', 'major_cycle'],
  },
  surpriseInsights: {
    sensitivity: 'high',
    modelTemperature: 0.55,
    maxParagraphs: 12,
    claimTypesAllowed: ['verifiable_trait', 'relationship_hint', 'behavior_pattern', 'family_hint', 'habit_tendency', 'symbolic_fun'],
    claimTypesBlocked: ['unsupported_verifiable_fact', 'diagnosis', 'addiction_label', 'guaranteed_fame', 'guaranteed_wealth'],
    requireEvidenceFor: ['body_mark', 'handedness', 'sibling_count', 'life_shift_age', 'partner_letter'],
  },
  remedies: {
    sensitivity: 'medium',
    modelTemperature: 0.45,
    maxParagraphs: 8,
    claimTypesAllowed: ['gemstone_hint', 'color_routine', 'power_day_hint', 'diet_lifestyle_support', 'exercise_support', 'sleep_support', 'mindfulness_support', 'generosity_practice'],
    claimTypesBlocked: ['guaranteed_cure', 'guaranteed_fix', 'religious_ritual_without_request', 'medical_treatment_claim'],
    requireEvidenceFor: ['gemstone', 'weak_planet', 'health_related_remedy'],
  },
});

const DEFAULT_SECTION_PROMPT_POLICY = Object.freeze({
  sensitivity: 'medium',
  modelTemperature: 0.58,
  maxParagraphs: 10,
  claimTypesAllowed: ['timing_window', 'life_pattern', 'personality_pattern'],
  claimTypesBlocked: ['guaranteed_event', 'invented_specific_detail'],
  requireEvidenceFor: ['timing', 'numbers', 'sensitive_claims'],
});

const TIMING_PROMPT_POLICY = Object.freeze({
  category: 'timing_window',
  framing: 'Treat this as timing symbolism, not a promise.',
  blockedClaimTypes: ['guaranteed_event', 'fixed_fate', 'unavoidable_outcome'],
  allowedCertainty: ['likely', 'may', 'suggests', 'strongest window', 'symbolic timing'],
});

const PARENT_HEALTH_PROMPT_POLICY = Object.freeze({
  category: 'parent_wellness_pattern',
  framing: 'Parent health claims are family-pattern hints, not diagnosis.',
  blockedClaimTypes: ['parent_diagnosis', 'guaranteed_parent_illness', 'specific_parent_procedure'],
});

const HEALTH_RISK_BEHAVIOR = Object.freeze({
  LOW: {
    allowedPublicMention: false,
    confidence: 'omit',
    detailLevel: 'omit',
  },
  MODERATE: {
    allowedPublicMention: true,
    confidence: 'weak',
    detailLevel: 'brief',
  },
  HIGH: {
    allowedPublicMention: true,
    confidence: 'moderate',
    detailLevel: 'paragraph',
  },
});

const HEALTH_FORBIDDEN_CLAIM_TYPES = Object.freeze([
  'diagnosis',
  'named_disease',
  'procedure_prediction',
  'specific_test_without_data',
  'screening_age_without_data',
  'guaranteed_illness',
]);

const HEALTH_BLOCKED_PATTERNS = Object.freeze({
  namedConditions: [
    /\bkidney\s*stones?\b/i,
    /\buti\b/i,
    /\burinary\s+tract\s+infection\b/i,
    /\bdiabetes\b/i,
    /\bhypertension\b/i,
    /\bcancer\b/i,
    /\basthma\b/i,
    /\bdepression\b/i,
    /\banxiety\b/i,
    /\binfertility\b/i,
  ],
  medicalTests: [
    /\bmedical\s+screening\b/i,
    /\bscreening\s+calendar\b/i,
    /\bcreatinine\b/i,
    /\begfr\b/i,
    /\burine\s+(test|microalbumin|analysis)\b/i,
    /\bblood\s+test\b/i,
    /\bmri\b/i,
    /\bct\s+scan\b/i,
    /\bultrasound\b/i,
  ],
  procedures: [
    /\bsurgery\b/i,
    /\bsurgical\b/i,
    /\boperation\b/i,
    /\bprocedure\b/i,
  ],
  infantEvents: [
    /\bpremature\b/i,
    /\bnicu\b/i,
    /\bincubator\b/i,
    /\blow\s+birth\s+weight\b/i,
    /\bbreathing\s+(difficulty|difficulties|trouble|problem|problems)\b/i,
    /\bhospitali[sz](ed|ation)\b/i,
  ],
});

function normalizeRisk(risk) {
  const value = String(risk || 'LOW').toUpperCase();
  return HEALTH_RISK_BEHAVIOR[value] ? value : 'LOW';
}

function getOrganPolicyByLabel(label) {
  const text = String(label || '').toLowerCase();
  let best = null;
  let bestScore = -1;

  for (const policy of HEALTH_ORGAN_POLICIES) {
    if (text === policy.publicLabel.toLowerCase()) return policy;
    for (const alias of policy.aliases) {
      const normalizedAlias = alias.toLowerCase();
      const score = text === normalizedAlias
        ? 1000 + normalizedAlias.length
        : text.includes(normalizedAlias)
          ? normalizedAlias.length
          : -1;
      if (score > bestScore) {
        best = policy;
        bestScore = score;
      }
    }
  }

  return best || {
    key: text.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown',
    publicLabel: label || 'Unknown organ system',
    aliases: [String(label || '').toLowerCase()].filter(Boolean),
  };
}

function getHealthRiskBehavior(risk) {
  return HEALTH_RISK_BEHAVIOR[normalizeRisk(risk)];
}

function getSectionPromptPolicy(sectionKey) {
  return SECTION_PROMPT_POLICIES[sectionKey] || DEFAULT_SECTION_PROMPT_POLICY;
}

module.exports = {
  PROMPT_POLICY_VERSION,
  SECTION_PROMPT_POLICIES,
  DEFAULT_SECTION_PROMPT_POLICY,
  TIMING_PROMPT_POLICY,
  PARENT_HEALTH_PROMPT_POLICY,
  HEALTH_ORGAN_POLICIES,
  HEALTH_RISK_BEHAVIOR,
  HEALTH_FORBIDDEN_CLAIM_TYPES,
  HEALTH_BLOCKED_PATTERNS,
  normalizeRisk,
  getOrganPolicyByLabel,
  getHealthRiskBehavior,
  getSectionPromptPolicy,
};