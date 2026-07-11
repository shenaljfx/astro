/**
 * CROSS-SECTION CONSISTENCY VALIDATOR
 * ====================================
 *
 * Runs AFTER every section has been written and post-validated. Looks
 * for contradictions across sections that no individual section can
 * catch on its own. The classic failure: marriage section says
 * "marriage at age 28-32" but the lifePredictions section says
 * "marriage in your mid-40s." Each section is internally fine; the
 * pair is inconsistent and erodes trust.
 *
 * Strategy:
 *   1. Extract structured claims from each narrative (regex-based,
 *      cheap and language-aware where possible).
 *   2. Compare claim families across sections:
 *        - Marriage age window
 *        - First child age window
 *        - Career peak age / year
 *        - Mother / father health windows
 *        - Wealth peak window
 *   3. For each contradiction, emit a `discrepancy` describing both
 *      sides and which section is more authoritative (the one whose
 *      sectionData natively carries that claim).
 *   4. Optional self-critique: feed a tight prompt to Gemini Flash
 *      to reconcile the inconsistencies in the LESS-authoritative
 *      sections only.
 *
 * Cost discipline: at most ONE LLM call per inconsistent section,
 * skipped entirely when no discrepancies are found.
 */

// Rough age extraction. Catches "age 32", "by age 32", "around 30",
// "in your 30s", "32-year-old", "between 28 and 32".
const AGE_RANGE_RX = /\b(?:age|aged|by age|around age|at age|between ages?)\s+(\d{1,2})(?:\s*(?:[-–to]+|\s*and\s*)\s*(\d{1,2}))?/gi;
const AGE_DECADE_RX = /\bin (?:your|her|his) (early |mid |late )?(\d{1,2})s\b/gi;
// Sinhala age windows: "වයස 28දී", "වයස අවුරුදු 28-32", "අවුරුදු 28ත් 32ත් අතර",
// "28 වියේදී". Without these, Sinhala reports got ZERO cross-section checking.
const AGE_RANGE_SI_RX = /(?:වයස\s*(?:අවුරුදු\s*)?|අවුරුදු\s*)(\d{1,2})(?!\d)(?:\s*(?:[-–]|ත්|සිට|සහ|හා)\s*(\d{1,2})(?!\d)(?:ත්)?(?:\s*(?:අතර|දක්වා))?)?/g;
const AGE_VIYE_SI_RX = /(?<!\d)(\d{1,2})\s*විය(?:ේ|ේදී|ෙදි)/g;

function _extractAgeWindows(narrative) {
  const windows = [];
  if (!narrative) return windows;
  let m;
  AGE_RANGE_RX.lastIndex = 0;
  while ((m = AGE_RANGE_RX.exec(narrative)) !== null) {
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (a >= 0 && a <= 120 && b >= 0 && b <= 120) {
      windows.push({ start: Math.min(a, b), end: Math.max(a, b), raw: m[0] });
    }
  }
  AGE_DECADE_RX.lastIndex = 0;
  while ((m = AGE_DECADE_RX.exec(narrative)) !== null) {
    const decade = parseInt(m[2], 10);
    const qual = (m[1] || '').trim();
    let start = decade;
    let end = decade + 9;
    if (qual === 'early') end = decade + 3;
    else if (qual === 'mid') { start = decade + 3; end = decade + 6; }
    else if (qual === 'late') start = decade + 6;
    windows.push({ start, end, raw: m[0] });
  }
  for (const rx of [AGE_RANGE_SI_RX, AGE_VIYE_SI_RX]) {
    rx.lastIndex = 0;
    while ((m = rx.exec(narrative)) !== null) {
      const a = parseInt(m[1], 10);
      const b = m[2] ? parseInt(m[2], 10) : a;
      if (a >= 5 && a <= 100 && b >= 5 && b <= 110) {
        windows.push({ start: Math.min(a, b), end: Math.max(a, b), raw: m[0] });
      }
    }
  }
  return windows;
}

/**
 * Test whether two age windows overlap. Inclusive on both ends, with
 * a tolerance of 2 years to account for narrative softness.
 */
function _overlaps(a, b, tol = 2) {
  if (!a || !b) return false;
  return a.end + tol >= b.start && b.end + tol >= a.start;
}

function _eventSeverity(eventLabel) {
  return ['marriage_age', 'first_child', 'mother_health', 'father_health', 'legal_outcome'].includes(eventLabel)
    ? 'high'
    : 'medium';
}

/**
 * Find contradictions between two sections that talk about the same
 * event family.
 */
function _compareEventClaim(eventLabel, primaryNarrative, otherNarrative, primarySection, otherSection) {
  const a = _extractAgeWindows(primaryNarrative);
  const b = _extractAgeWindows(otherNarrative);
  if (!a.length || !b.length) return null;
  // Pick the most specific (narrowest) window from each side
  const pick = (arr) => arr.slice().sort((x, y) => (x.end - x.start) - (y.end - y.start))[0];
  const A = pick(a);
  const B = pick(b);
  if (_overlaps(A, B)) return null;
  const severity = _eventSeverity(eventLabel);
  return {
    type: 'cross_section_age_mismatch',
    severity,
    highStakes: severity === 'high',
    event: eventLabel,
    authoritativeSection: primarySection,
    conflictingSection: otherSection,
    authoritativeWindow: { start: A.start, end: A.end, raw: A.raw },
    conflictingWindow: { start: B.start, end: B.end, raw: B.raw },
  };
}

/**
 * Top-level cross-section validator.
 *
 * @param {object} narrativeSections - Map keyed by sectionKey to
 *   `{ title, narrative, rawData }` (matches the chat.js structure).
 * @returns {{ discrepancies: Array, summary: string }}
 */
function findCrossSectionDiscrepancies(narrativeSections) {
  if (!narrativeSections || typeof narrativeSections !== 'object') {
    return { discrepancies: [], summary: '' };
  }

  const get = (k) => narrativeSections[k]?.narrative || null;
  const discrepancies = [];

  // Event keyword filters — English AND Sinhala so the comparison works for
  // both output languages (previously Sinhala paragraphs never matched and
  // the whole cross-section pass silently skipped).
  const MARRIAGE_KW = /marriage|spouse|wedding|married|wife|husband|විවාහ|මංගල|සහකරු|සහකාරිය|සැමිය|බිරිඳ|බැඳීම/i;
  const CAREER_KW = /career|job|profession|work|promotion|business|රැකියා|රස්සාව|වෘත්තිය|උසස්වීම|ව්‍යාපාර/i;
  const CHILDREN_KW = /child|baby|son|daughter|kids|fatherhood|motherhood|pregnancy|දරුව|දරුවන්|දරුවෙක්|පුතා|දුව|ගැබ්/i;

  // Marriage age — marriage section is authoritative
  if (get('marriage')) {
    for (const other of ['lifePredictions', 'surpriseInsights', 'marriedLife', 'familyPortrait']) {
      if (get(other)) {
        // Restrict to paragraphs that mention marriage
        const otherParas = get(other).split(/\n\n+/).filter((p) => MARRIAGE_KW.test(p)).join('\n\n');
        if (!otherParas) continue;
        const d = _compareEventClaim('marriage_age', get('marriage'), otherParas, 'marriage', other);
        if (d) discrepancies.push(d);
      }
    }
  }

  // Career peak — career section is authoritative
  if (get('career')) {
    for (const other of ['lifePredictions', 'surpriseInsights', 'financial']) {
      if (get(other)) {
        const otherParas = get(other).split(/\n\n+/).filter((p) => CAREER_KW.test(p)).join('\n\n');
        if (!otherParas) continue;
        const d = _compareEventClaim('career_peak', get('career'), otherParas, 'career', other);
        if (d) discrepancies.push(d);
      }
    }
  }

  // Children — children section is authoritative
  if (get('children')) {
    for (const other of ['lifePredictions', 'familyPortrait', 'surpriseInsights']) {
      if (get(other)) {
        const otherParas = get(other).split(/\n\n+/).filter((p) => CHILDREN_KW.test(p)).join('\n\n');
        if (!otherParas) continue;
        const d = _compareEventClaim('first_child', get('children'), otherParas, 'children', other);
        if (d) discrepancies.push(d);
      }
    }
  }

  const summary =
    discrepancies.length > 0
      ? `${discrepancies.length} cross-section inconsistency(ies) detected. ${
          discrepancies
            .map((d) => `${d.conflictingSection} disagrees with ${d.authoritativeSection} on ${d.event}`)
            .join('; ')
        }`
      : '';

  return { discrepancies, summary };
}

/**
 * Self-critique reconciler. For each inconsistent section, ask the AI
 * to revise that ONE section's offending paragraph(s) to match the
 * authoritative section's claim. Returns the updated narrativeSections
 * map. ONE Gemini call per conflicting section — capped at 5 calls
 * total to keep cost bounded.
 *
 * @param {object} args
 * @param {object} args.narrativeSections
 * @param {Array}  args.discrepancies
 * @param {Function} args.callGemini
 * @param {string} args.language
 */
async function reconcileDiscrepancies({ narrativeSections, discrepancies, callGemini, language = 'en' }) {
  if (!Array.isArray(discrepancies) || discrepancies.length === 0) return { reconciled: 0, sectionsUpdated: [] };
  if (typeof callGemini !== 'function') return { reconciled: 0, sectionsUpdated: [] };

  // Group discrepancies by conflicting section so we make one call per section
  const byConflict = new Map();
  for (const d of discrepancies) {
    if (!byConflict.has(d.conflictingSection)) byConflict.set(d.conflictingSection, []);
    byConflict.get(d.conflictingSection).push(d);
  }

  const MAX_CALLS = 5;
  let calls = 0;
  const sectionsUpdated = [];

  for (const [sectionKey, items] of byConflict.entries()) {
    if (calls >= MAX_CALLS) break;
    const target = narrativeSections[sectionKey];
    if (!target?.narrative) continue;

    const issueList = items
      .map((d, i) =>
        `${i + 1}. ${d.event}: ${d.authoritativeSection} says age ${d.authoritativeWindow.start}-${d.authoritativeWindow.end} ("${d.authoritativeWindow.raw}"), but ${d.conflictingSection} says age ${d.conflictingWindow.start}-${d.conflictingWindow.end} ("${d.conflictingWindow.raw}"). Trust ${d.authoritativeSection}.`
      )
      .join('\n');

    const langLine = language === 'si'
      ? 'Keep the narrative in pure Sinhala.'
      : language === 'ta'
      ? 'Keep the narrative in pure Tamil.'
      : language === 'singlish'
      ? 'Keep Singlish.'
      : 'Keep the narrative in clean English.';

    const prompt = `You are a precise editor. The following narrative section "${sectionKey}" contradicts other report sections on these specific claims:

${issueList}

REWRITE rules:
- Update ONLY the contradicting age windows to match the authoritative section. Do NOT change anything else.
- Keep timing language symbolic and confidence-calibrated. Do not turn the corrected window into a promise or guaranteed event.
- Keep the same paragraph structure, tone, length, and voice.
- Do NOT mention the contradiction or the editing process.
- ${langLine}

Return ONLY the corrected narrative, no preamble.

ORIGINAL "${sectionKey}" NARRATIVE:
"""
${target.narrative}
"""`;

    try {
      const res = await callGemini(
        [
          { role: 'system', content: 'You reconcile factual contradictions between report sections without altering tone.' },
          { role: 'user', content: prompt },
        ],
        Math.max(2048, Math.ceil(target.narrative.length / 2)),
        0.25
      );
      calls++;
      if (res && typeof res.text === 'string' && res.text.trim().length > 100) {
        narrativeSections[sectionKey] = {
          ...target,
          narrative: res.text.trim(),
          _crossReconciled: true,
        };
        sectionsUpdated.push(sectionKey);
      }
    } catch (e) {
      // Swallow — keep original section
    }
  }

  return { reconciled: sectionsUpdated.length, sectionsUpdated, llmCalls: calls };
}

module.exports = {
  findCrossSectionDiscrepancies,
  reconcileDiscrepancies,
};
