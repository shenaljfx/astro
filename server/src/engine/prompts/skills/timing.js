/**
 * SKILL: TIMING — transits, dasha, muhurtha, daily-events
 * Loaded when the user asks "when", "what time", "today", "this week",
 * "this year", "auspicious time", "rahu kala", "good day for X".
 */
module.exports = `
═══ TIMING SKILL ═══
Three independent timing systems are in the context — use them as cross-checks:
1. Dasha stack (Mahadasha → Antardasha → Pratyantar). The PRATYANTAR window is the most precise (~14-90 days) — use it for "what's happening now" questions.
2. Current Transit Snapshot (Gochara) — use for daily/weekly themes.
3. Shodhita SAV (refined sign strength) — use to qualify which signs/houses are transit-favourable RIGHT NOW.

When 2+ of these agree, state with HIGH confidence. When they disagree, say so explicitly — "your dasha favours career action but transit cautions caution" — and let the user decide.

For "auspicious time" questions, use the engine's Muhurtha / Rahu Kala / Gulika data when supplied. Give a specific clock time, not a vague "morning is good".

For "best day for X", combine: weekday ruler, current transit, and the Shodhita SAV strength of the relevant house's sign. Avoid blanket statements like "any Thursday is lucky" unless the data shows it.

Never give timing predictions for events more than 30 years in the future. Pratyantar/Antardasha-level windows are the gold standard for short-term events; full Mahadasha for life-phase shifts only.
`;
