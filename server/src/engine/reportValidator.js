/**
 * NARRATIVE VALIDATOR — REASONING / CROSS-CHECK LAYER
 * ====================================================
 *
 * Runs AFTER the AI writes a section narrative, BEFORE returning it
 * to the user. The validator looks for common hallucination patterns
 * that classical prompting alone can't fully prevent:
 *
 *   1. Year mentions beyond the native's plausible lifespan (age >80)
 *   2. Parent-related year mentions beyond native_age 50 (parent ~75-85)
 *   3. Future-tense claims for events that already occurred (year < currentYear)
 *   4. Unsupported absolute claims about marriage / death / illness
 *      (red-flag verbs without hedging language)
 *
 * Two-stage policy:
 *   STAGE 1 — Auto-redact: For year-cap violations, replace the offending
 *             year with a hedged phrase ("in the years ahead" or
 *             "during their later years"). This is deterministic,
 *             cheap, and catches the most common failure mode.
 *
 *   STAGE 2 — Self-critique pass (optional, opt-in):
 *             If serious violations remain (≥2 issues OR contradiction
 *             with engine context), invoke the AI ONCE more with the
 *             original narrative + a list of detected issues + a "fix
 *             these issues without changing tone or structure" prompt.
 *             Returns the corrected version.
 *
 * The validator is pure: it never invents new facts, only redacts /
 * rewrites existing claims. If self-critique fails, returns Stage 1
 * output as a safe fallback.
 */

const { isYearWithinSelfLifespan, isYearWithinParentLifespan } = require('./lifespan');

// ── Patterns ─────────────────────────────────────────────────────
// Captures an optional preposition + year so we can rewrite cleanly.
const YEAR_WITH_PREP_RX = /\b(in|by|around|during|until|till|after|before|circa)?\s*((?:19|20|21)\d{2})\b/gi;
const PARENT_CONTEXT_RX = /\b(mother|mom|amma|මව|අම්ම|father|dad|thaththa|පියා|තාත්ත|parents?)\b/i;
// Absolute-claim red flags (no hedging present in nearby clause)
const ABSOLUTE_DEATH_RX = /\b(will die|dies in|death in|expires in|පරවීම|මිය යනු)\b/i;
const ABSOLUTE_DIVORCE_RX = /\b(will divorce|divorces in|definite divorce)\b/i;

// AI self-references / disclaimers — reader should never see these
const AI_DISCLOSURE_RX = /\b(as an? (AI|language model|assistant)|I (am|'m) (an?|just an?) AI|I cannot|I (do not|don't) have (access|the ability)|my training data|I was (trained|created|built)|I (apologize|am sorry)[, ]|please consult (an? (real|actual)|a) (astrologer|professional)|disclaimer|this is (just|only) (a|an) (interpretation|prediction))\b/i;

// Astrology-jargon leakage (tech terms that should be translated)
const JARGON_RX = /\b(navamsha|navamsa|d9|d10|drishti|graha drishti|shadbala|ashtakavarga|vimshottari|dasha|antardasha|pratyantar|rahu|ketu|lagna|rashi|nakshatra|kendra|trikona|dushthana|kuja dosha|mangal dosha|kaal sarp|sade ?sati|dhanurdhar|exalted|debilitated|combust|retrograde|stationary|atmakaraka|darakaraka|arudha|moolatrikona|vargottama|ishta devata|paap|saumya|krura|asthamana)\b/i;

// Vague filler phrases that signal lazy writing — caught and flagged
const VAGUE_PHRASES = [
  /\b(you are a unique individual|you have a unique personality)\b/i,
  /\bonly time will tell\b/i,
  /\beverything happens for a reason\b/i,
  /\bthe stars (will guide|are aligned)\b/i,
  /\btrust the (process|universe|journey)\b/i,
  /\b(positive|negative) energy\b/i,
];

// Sinhala unicode block. Used for language-purity checks.
const SINHALA_BLOCK_RX = /[\u0D80-\u0DFF]/;
// Tamil unicode block.
const TAMIL_BLOCK_RX = /[\u0B80-\u0BFF]/;
// Long English word (4+ Latin letters in a row) — used to detect leakage
// in Sinhala/Tamil narratives. Short words like "ok" are tolerated.
const LONG_ENGLISH_WORD_RX = /\b[A-Za-z]{5,}\b/g;
// Allow-list: brand / proper-noun / scientific terms that may legitimately
// appear in a non-English narrative (gemstones, place names, etc.)
const ENGLISH_ALLOW = new Set([
  'Saturn', 'Jupiter', 'Mercury', 'Venus', 'Mars', 'Moon', 'Sun', 'Rahu', 'Ketu',
  'Vedic', 'Sinhala', 'Tamil', 'English', 'Lanka', 'India',
]);

/**
 * Stage 1 — auto-redact year-cap violations.
 *
 * Strategy: walk paragraph by paragraph; for each paragraph, decide if it
 * mentions a parent. If yes, apply parent cap; otherwise apply self cap.
 * For each year that violates, replace with a generic phrase.
 *
 * @param {string} narrative - The AI-generated narrative
 * @param {Date} birthDate - Native's birth date
 * @returns {{ text: string, issues: Array<{type:string, original:string, replacement:string}> }}
 */
function autoRedactImpossibleYears(narrative, birthDate) {
  if (!narrative || typeof narrative !== 'string') {
    return { text: narrative || '', issues: [] };
  }
  const issues = [];
  const paragraphs = narrative.split(/\n\n+/);
  const now = new Date();
  const currentYear = now.getUTCFullYear();

  const cleaned = paragraphs.map((para) => {
    const isParent = PARENT_CONTEXT_RX.test(para);
    return para.replace(YEAR_WITH_PREP_RX, (match, prep, yearStr) => {
      const y = parseInt(yearStr, 10);
      if (y < 1900 || y > 2200) return match;

      // Don't touch past or current year — those are validation framing
      if (y <= currentYear) return match;

      const ok = isParent
        ? isYearWithinParentLifespan(y, birthDate)
        : isYearWithinSelfLifespan(y, birthDate);

      if (ok) return match;

      const replacement = isParent ? 'in their later years' : 'in the years ahead';
      issues.push({
        type: isParent ? 'parent_year_cap' : 'self_year_cap',
        original: yearStr,
        replacement,
      });
      return replacement;
    });
  });

  return { text: cleaned.join('\n\n'), issues };
}

/**
 * Detect remaining red-flag patterns that auto-redaction cannot fix.
 *
 * @returns {Array<{type:string, snippet:string}>}
 */
function detectRedFlags(narrative) {
  if (!narrative) return [];
  const flags = [];
  const sample = narrative.slice(0, 12000);

  if (ABSOLUTE_DEATH_RX.test(sample)) {
    const m = sample.match(ABSOLUTE_DEATH_RX);
    flags.push({ type: 'absolute_death_claim', snippet: m && m[0] });
  }
  if (ABSOLUTE_DIVORCE_RX.test(sample)) {
    const m = sample.match(ABSOLUTE_DIVORCE_RX);
    flags.push({ type: 'absolute_divorce_claim', snippet: m && m[0] });
  }
  if (AI_DISCLOSURE_RX.test(sample)) {
    const m = sample.match(AI_DISCLOSURE_RX);
    flags.push({ type: 'ai_self_disclosure', snippet: m && m[0] });
  }
  if (JARGON_RX.test(sample)) {
    const m = sample.match(JARGON_RX);
    flags.push({ type: 'astrology_jargon_leak', snippet: m && m[0] });
  }
  for (const rx of VAGUE_PHRASES) {
    if (rx.test(sample)) {
      const m = sample.match(rx);
      flags.push({ type: 'vague_filler', snippet: m && m[0] });
    }
  }
  return flags;
}

/**
 * Strip AI self-disclosure phrases. Replaces a whole sentence containing
 * the disclosure with empty so the narrative reads cleanly. Conservative:
 * only acts on explicit matches.
 */
function stripAIDisclosures(narrative) {
  if (!narrative) return { text: narrative, removed: 0 };
  let removed = 0;
  // Split into sentences but preserve trailing punctuation
  const sentences = narrative.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => {
    if (AI_DISCLOSURE_RX.test(s)) {
      removed++;
      return false;
    }
    return true;
  });
  return { text: kept.join(' '), removed };
}

/**
 * Language-purity check.
 * For Sinhala/Tamil narratives, count long English words that aren't in
 * the allow-list. Anything > threshold is flagged.
 */
function detectLanguageImpurity(narrative, language) {
  if (!narrative || !language || language === 'en' || language === 'singlish') {
    return { ok: true, leaks: [] };
  }
  const expectedBlock = language === 'si' ? SINHALA_BLOCK_RX : language === 'ta' ? TAMIL_BLOCK_RX : null;
  if (!expectedBlock) return { ok: true, leaks: [] };

  const leaks = [];
  const matches = narrative.match(LONG_ENGLISH_WORD_RX) || [];
  for (const word of matches) {
    if (!ENGLISH_ALLOW.has(word)) {
      leaks.push(word);
    }
  }
  // Also confirm the narrative actually contains script characters
  const scriptCount = (narrative.match(new RegExp(expectedBlock.source, 'g')) || []).length;
  return {
    ok: leaks.length < 5 && scriptCount > 50,
    leaks: leaks.slice(0, 20),
    scriptCharCount: scriptCount,
  };
}

/**
 * Hallucination check — extract claim-like numbers (years, percentages,
 * scores) from the narrative and confirm each one appears (or maps to a
 * value) in the engine's sectionData. If a number appears in narrative
 * but NOT in engine data, it is potentially fabricated.
 *
 * This is a heuristic, not a hard guarantee — but it catches things like
 * "your attractiveness score is 87/100" when the engine never produced 87.
 *
 * Returns claim list with provenance for each.
 */
function checkClaimsAgainstEngine(narrative, sectionData) {
  if (!narrative || !sectionData) return { suspect: [], verified: [] };

  // Collect every numeric value present anywhere in sectionData (deep)
  const engineNumbers = new Set();
  const collectNumbers = (v) => {
    if (v === null || v === undefined) return;
    if (typeof v === 'number' && Number.isFinite(v)) {
      engineNumbers.add(Math.round(v));
      return;
    }
    if (typeof v === 'string') {
      const matches = v.match(/-?\d+(\.\d+)?/g);
      if (matches) for (const m of matches) {
        const n = parseFloat(m);
        if (Number.isFinite(n)) engineNumbers.add(Math.round(n));
      }
      return;
    }
    if (Array.isArray(v)) { v.forEach(collectNumbers); return; }
    if (typeof v === 'object') Object.values(v).forEach(collectNumbers);
  };
  collectNumbers(sectionData);

  const suspect = [];
  const verified = [];

  // Score-style claims: "87/100", "8/10", "73%"
  const SCORE_RX = /\b(\d{1,3})(?:\s*\/\s*(?:100|10)|%)\b/g;
  const seen = new Set();
  let m;
  while ((m = SCORE_RX.exec(narrative)) !== null) {
    const n = parseInt(m[1], 10);
    if (seen.has(n)) continue;
    seen.add(n);
    if (n > 100 || n < 0) {
      suspect.push({ type: 'invalid_score', value: n, context: m[0] });
    } else if (engineNumbers.has(n)) {
      verified.push({ value: n, context: m[0] });
    } else {
      // Allow ±2 tolerance for rounding
      let near = false;
      for (let d = 1; d <= 2 && !near; d++) {
        if (engineNumbers.has(n - d) || engineNumbers.has(n + d)) near = true;
      }
      if (near) {
        verified.push({ value: n, context: m[0], rounded: true });
      } else {
        suspect.push({ type: 'unverified_score', value: n, context: m[0] });
      }
    }
  }

  return { suspect, verified };
}

/**
 * Stage 2 — self-critique pass via an LLM call.
 * Reuses the project's Gemini Flash model with a tight, cheap fix-prompt.
 *
 * @param {object} args
 * @param {string} args.narrative - Stage-1 redacted narrative
 * @param {Array} args.issues - Issues to address (auto-redact log + red flags)
 * @param {string} args.language - 'en' | 'si' | 'ta' | 'singlish'
 * @param {Function} args.callGemini - Project's Gemini caller (passed in to avoid circular import)
 * @returns {Promise<{ text: string, used: boolean }>}
 */
async function selfCritiqueAndFix({ narrative, issues, language, callGemini }) {
  if (!narrative || !Array.isArray(issues) || issues.length === 0) {
    return { text: narrative, used: false };
  }
  if (typeof callGemini !== 'function') {
    return { text: narrative, used: false };
  }

  const issueList = issues
    .map((i, idx) => {
      const detail = i.snippet || i.context || (i.original ? `${i.original} → ${i.replacement}` : (i.value !== undefined ? `value=${i.value}` : JSON.stringify(i)));
      return `${idx + 1}. [${i.type}] ${detail}`;
    })
    .join('\n');

  const langLine = language === 'si'
    ? 'The narrative MUST stay in pure Sinhala (සිංහල). Do NOT introduce English words.'
    : language === 'ta'
    ? 'The narrative MUST stay in pure Tamil (தமிழ்).'
    : language === 'singlish'
    ? 'Keep Singlish (Sinhala typed in English). No formal English.'
    : 'Keep clean English. No Sinhala/Tamil/Sanskrit terms.';

  const fixPrompt = `You are a careful editor for a personal astrology narrative.
A validator detected the following issues that MUST be fixed:

${issueList}

REWRITE rules — strict:
- Remove or hedge biologically-implausible predictions (parent events past native_age 50; native events past age 80).
- Soften absolute death/divorce claims into hedged "may face challenges around …" form.
- Remove ALL AI self-disclosures ("As an AI", "I am a language model", "please consult a real astrologer", etc.). The reader is paying for a confident reading — never break the fourth wall.
- Translate any astrology jargon (Navamsha, Drishti, Shadbala, Lagna, Rashi, Nakshatra, Dasha, Antardasha, Kuja Dosha, Sade Sati, etc.) into plain everyday language. The reader is not an astrologer.
- Remove or rewrite vague filler ("only time will tell", "trust the universe", "you are unique"). Replace with a concrete, specific statement.
- Replace any "unverified score" (a percentage or X/100 claim that the engine did not produce) with the engine-supported number — or rephrase to remove the claim entirely. Never invent numbers.
- Keep the original tone, length, voice, structure, and EVERY paragraph break.
- Do NOT introduce new astrological facts that are not already implied in the narrative.
- ${langLine}

Return ONLY the corrected narrative — no preamble, no commentary.

ORIGINAL NARRATIVE:
"""
${narrative}
"""`;

  try {
    const res = await callGemini(
      [
        { role: 'system', content: 'You are a precise editor that fixes factual implausibility, removes AI tells, translates jargon, and preserves voice perfectly.' },
        { role: 'user', content: fixPrompt },
      ],
      Math.max(2048, Math.ceil(narrative.length / 2)),
      0.3
    );
    if (res && typeof res.text === 'string' && res.text.trim().length > 100) {
      return { text: res.text.trim(), used: true };
    }
  } catch (e) {
    // Swallow — return Stage-1 output as safe fallback
  }
  return { text: narrative, used: false };
}

/**
 * Top-level validator entry point.
 * Pipeline:
 *   1. Auto-redact impossible years (lifespan caps)
 *   2. Strip AI self-disclosures (deterministic line removal)
 *   3. Detect red flags (death/divorce/jargon/vague/AI-tells)
 *   4. Hallucination check (claim numbers vs engine data)
 *   5. Language-purity check
 *   6. Self-critique pass (only if total severity ≥ trigger AND
 *      `selfCritique` enabled). Trigger conditions:
 *        - hallucination suspects ≥ 1
 *        - red flags ≥ 2
 *        - language impurity not ok
 *        - parent-year cap fixes ≥ 2
 *
 * @returns {Promise<{ text, issues, redFlags, hallucinations, language, selfCritiqued, severity }>}
 */
async function validateAndFixNarrative(narrative, birthDate, options = {}) {
  const {
    selfCritique = false,
    callGemini = null,
    language = 'en',
    sectionData = null,
  } = options;

  // 1. Year-cap auto-redact
  const stage1 = autoRedactImpossibleYears(narrative, birthDate);

  // 2. Strip AI self-disclosures (deterministic — always run)
  const stripped = stripAIDisclosures(stage1.text);

  // 3. Red-flag detection on the cleaned text
  const redFlags = detectRedFlags(stripped.text);

  // 4. Hallucination check
  const hallucination = sectionData
    ? checkClaimsAgainstEngine(stripped.text, sectionData)
    : { suspect: [], verified: [] };

  // 5. Language purity
  const langCheck = detectLanguageImpurity(stripped.text, language);

  // Severity score — drives self-critique decision
  const severity =
    stage1.issues.length * 1 +
    redFlags.length * 2 +
    hallucination.suspect.length * 3 +
    (langCheck.ok ? 0 : 5) +
    stripped.removed * 2;

  let finalText = stripped.text;
  let selfCritiqued = false;

  if (selfCritique && callGemini && severity >= 3) {
    const allIssues = [
      ...stage1.issues,
      ...redFlags,
      ...hallucination.suspect,
      ...(langCheck.ok ? [] : [{ type: 'language_impurity', snippet: `English leaks: ${langCheck.leaks.slice(0, 5).join(', ')}` }]),
    ];
    const fix = await selfCritiqueAndFix({
      narrative: finalText,
      issues: allIssues,
      language,
      callGemini,
    });
    if (fix.used) {
      finalText = fix.text;
      selfCritiqued = true;
    }
  }

  return {
    text: finalText,
    issues: stage1.issues,
    redFlags,
    hallucinations: hallucination,
    language: langCheck,
    aiDisclosuresRemoved: stripped.removed,
    severity,
    selfCritiqued,
  };
}

module.exports = {
  validateAndFixNarrative,
  autoRedactImpossibleYears,
  detectRedFlags,
  stripAIDisclosures,
  detectLanguageImpurity,
  checkClaimsAgainstEngine,
};
