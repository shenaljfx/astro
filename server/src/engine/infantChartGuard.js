/**
 * INFANT / TODDLER CHART GUARD
 * =============================
 *
 * When the native is very young (< ~2 years for "infant", < ~6 years
 * for "toddler"), most life-event sections of the report (career,
 * marriage, education, foreign travel, financial, real estate, etc.)
 * cannot meaningfully validate against lived experience yet — the
 * native has no career to compare against, no marriage to confirm,
 * no schooling history to check.
 *
 * However, the SAME chart still encodes deterministic information
 * about:
 *   1. The PARENTS' current state (mother's profession, father's
 *      profession, family structure, siblings) — read from 4th, 9th,
 *      3rd, 11th houses. These ARE knowable today and SHOULD be
 *      stated with confidence.
 *   2. The native's INNATE TRAITS — physical profile, temperament
 *      seeds, mental tendencies — which begin manifesting from birth.
 *   3. FUTURE life events — should be framed as "will" / "tends
 *      toward" with explicit acknowledgment of the developmental
 *      window, not as "you ARE" claims.
 *
 * Without this guard, the AI either:
 *   - over-claims about the infant's career / marriage / wealth (looks
 *     ridiculous to the parent reading the report), OR
 *   - under-claims about the parents (when those facts are deterministic
 *     and would be the most validating part of the report for a parent
 *     who just got their newborn's chart cast).
 *
 * This module classifies the chart's developmental window and returns
 * a structured guidance object that the prompt builder uses to:
 *   - boost confidence on parent/family/sibling sections
 *   - soften and future-tense the native-life sections
 *   - skip developmentally-impossible content entirely
 */

// Sections grouped by which can MEANINGFULLY apply at each life stage.
// "applicable" = section content describes facts already manifest.
// "future-tense" = section should describe latent tendencies, not current reality.
// "parent-shifted" = section's primary readable subject is the PARENT,
//                    not the native, when the native is too young.
const SECTION_APPLICABILITY = {
  // Always applicable from birth — these describe the chart itself
  personality: { infant: 'partial', toddler: 'mostly', child: 'fully' },
  yogaAnalysis: { infant: 'fully', toddler: 'fully', child: 'fully' },
  physicalProfile: { infant: 'partial', toddler: 'mostly', child: 'fully' },
  remedies: { infant: 'fully', toddler: 'fully', child: 'fully' },
  spiritual: { infant: 'partial', toddler: 'partial', child: 'mostly' },

  // Parent-shifted: the chart reads the PARENTS deterministically;
  // surface their current reality with high confidence
  familyPortrait: { infant: 'parent-shifted-high', toddler: 'parent-shifted-high', child: 'fully' },

  // Future-tense — describe latent patterns, not current facts
  career: { infant: 'future-tense', toddler: 'future-tense', child: 'partial' },
  marriage: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },
  marriedLife: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },
  financial: { infant: 'future-tense', toddler: 'future-tense', child: 'partial' },
  children: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },
  realEstate: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },
  foreignTravel: { infant: 'future-tense', toddler: 'future-tense', child: 'partial' },
  attractionProfile: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },
  legal: { infant: 'future-tense', toddler: 'future-tense', child: 'future-tense' },

  // Already applicable but mostly latent
  education: { infant: 'future-tense', toddler: 'partial', child: 'fully' },
  health: { infant: 'partial', toddler: 'mostly', child: 'fully' },
  mentalHealth: { infant: 'partial', toddler: 'partial', child: 'mostly' },
  luck: { infant: 'partial', toddler: 'mostly', child: 'fully' },

  // Time-bound — always applicable as forecasts
  lifePredictions: { infant: 'fully', toddler: 'fully', child: 'fully' },
  transits: { infant: 'fully', toddler: 'fully', child: 'fully' },
  timeline25: { infant: 'fully', toddler: 'fully', child: 'fully' },
  surpriseInsights: { infant: 'partial', toddler: 'mostly', child: 'fully' },
};

const STAGE_LABELS = {
  infant: 'infant (< 2 years)',
  toddler: 'toddler (2 – 6 years)',
  child: 'child (6 – 12 years)',
  teen: 'teenager (13 – 19 years)',
  adult: 'adult (20+ years)',
};

/**
 * Classify the developmental stage of the native.
 *
 * @param {Date|string} birthDate
 * @param {Date|string} [asOfDate=now]
 * @returns {{
 *   ageDays: number,
 *   ageYears: number,
 *   stage: 'infant'|'toddler'|'child'|'teen'|'adult',
 *   stageLabel: string,
 *   isInfant: boolean,
 *   isToddler: boolean,
 *   isMinor: boolean,
 *   isAdult: boolean,
 * }}
 */
function getDevelopmentalStage(birthDate, asOfDate) {
  const b = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const now = asOfDate ? (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)) : new Date();
  const ageMs = now.getTime() - b.getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
  const ageYears = ageMs / (365.25 * 86400000);

  let stage;
  if (ageYears < 2) stage = 'infant';
  else if (ageYears < 6) stage = 'toddler';
  else if (ageYears < 13) stage = 'child';
  else if (ageYears < 20) stage = 'teen';
  else stage = 'adult';

  return {
    ageDays,
    ageYears: Math.round(ageYears * 100) / 100,
    stage,
    stageLabel: STAGE_LABELS[stage],
    isInfant: stage === 'infant',
    isToddler: stage === 'toddler',
    isMinor: ['infant', 'toddler', 'child', 'teen'].includes(stage),
    isAdult: stage === 'adult',
  };
}

/**
 * Per-section guidance for the prompt layer. Returns a map of
 *   sectionKey → { applicability, framing, instructions }
 *
 * `applicability`:
 *   - 'fully'                  — write normally
 *   - 'mostly'                 — write normally with brief acknowledgement of age
 *   - 'partial'                — write as latent tendencies starting to emerge
 *   - 'future-tense'           — describe what WILL manifest, not what IS
 *   - 'parent-shifted-high'    — surface PARENT facts with high confidence;
 *                                native-side content secondary
 *
 * The prompt uses these tags to swap framing ("you are X" → "the chart
 * suggests you will tend toward X as you grow") without rewriting the
 * underlying engine output.
 */
function buildSectionGuidance(stage) {
  const out = {};
  for (const [section, ladder] of Object.entries(SECTION_APPLICABILITY)) {
    const applicability = ladder[stage] || 'fully';
    out[section] = {
      applicability,
      framing: _framingFor(applicability),
      instructions: _instructionsFor(section, applicability, stage),
    };
  }
  return out;
}

function _framingFor(app) {
  switch (app) {
    case 'fully': return 'present-tense, normal voice';
    case 'mostly': return 'present-tense with one brief age acknowledgement';
    case 'partial': return 'latent / emerging tendency voice — "the seeds of X are visible"';
    case 'future-tense': return 'future-tense — "you will tend toward X", "the chart suggests X will unfold around age N"';
    case 'parent-shifted-high': return 'parent-focused — describe the PARENTS\' present-day reality with confidence';
    default: return 'present-tense';
  }
}

function _instructionsFor(section, applicability, stage) {
  const base = [];
  if (applicability === 'future-tense') {
    base.push(`The native is currently ${STAGE_LABELS[stage]} — DO NOT claim this section\'s content as a present-day fact.`);
    base.push('Use future-tense framing throughout. State the AGE WINDOW when each pattern is expected to manifest (e.g. "between age 22 and 28", "in the first dasha after marriage").');
    base.push('NEVER assert "you are X" for traits that cannot exist yet (career role, marriage status, wealth level, sexual attraction patterns, legal disputes).');
  }
  if (applicability === 'parent-shifted-high') {
    base.push(`The native is ${STAGE_LABELS[stage]} — the most validating content in this section is the PARENTS\' current reality, which IS deterministically readable from this chart.`);
    base.push('Lead with mother\'s and father\'s present-day state (profession, character, current health window). State them with HIGH confidence, using the engine-provided shortlists faithfully.');
    base.push('Sibling section: state the engine\'s exact older/younger count. If the count is 0, say so plainly — do not pad with "you may have a sibling".');
    base.push('Only AFTER parents and siblings, briefly describe the native\'s family-karma pattern (latent inherited tendencies).');
  }
  if (applicability === 'partial') {
    base.push(`The native is ${STAGE_LABELS[stage]} — only the early-emerging facets of this section are observable yet. Describe what is BEGINNING to manifest, not the full mature pattern.`);
  }
  if (applicability === 'mostly') {
    base.push(`The native is ${STAGE_LABELS[stage]} — most of this section is observable; briefly acknowledge developmental stage where helpful but otherwise write normally.`);
  }
  return base;
}

/**
 * One-paragraph header to inject at the TOP of the system prompt so
 * the AI is aware of the developmental context for EVERY section it
 * generates, not just the section-specific ones.
 */
function buildGlobalGuardHeader(devStage) {
  if (!devStage) return '';
  if (devStage.isAdult) return '';
  return [
    '═══ DEVELOPMENTAL STAGE GUARD ═══',
    `The native is currently ${devStage.stageLabel} (age ${devStage.ageYears} years, ${devStage.ageDays} days old).`,
    devStage.isInfant
      ? 'CRITICAL: This is an INFANT chart. Career, marriage, sexuality, wealth, and other adult-life sections MUST be written in future-tense ("you will tend toward...", "around age N..."). NEVER write "you are a successful entrepreneur" or "your marriage is happy" — these cannot exist yet.'
      : devStage.isToddler
      ? 'This is a TODDLER chart. Adult-life sections (career, marriage, finance, real estate) must be future-tense. Personality and physical traits may be described as emerging.'
      : 'This is a MINOR chart. Adult-life sections must be future-tense; school-age content may be present-tense if relevant.',
    'The PARENTS section (familyPortrait → mother, father, siblings) IS deterministically readable RIGHT NOW from this chart — state parental occupations, character, and sibling counts with HIGH confidence using the engine shortlists.',
    'For the parents who are reading their child\'s chart, the most validating content is accuracy on the parents\' OWN current reality. Get that right above all else.',
    '═══════════════════════════════════',
  ].join('\n');
}

module.exports = {
  getDevelopmentalStage,
  buildSectionGuidance,
  buildGlobalGuardHeader,
  SECTION_APPLICABILITY,
  STAGE_LABELS,
};
