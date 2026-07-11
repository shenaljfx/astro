/**
 * Monthly fair-use counters for the "unlimited" Pro subscription.
 *
 * A subscriber gets report + porondam generation included with Pro (they skip
 * the one-time paywall). "Unlimited" needs a generous ceiling so the worst case
 * (someone scripting 500 AI reports) can't wreck margin — while a normal user
 * (1–2 reports a month) never sees it. Mirrors the chat fair-use pattern, but
 * on a monthly window.
 *
 * Applies ONLY to subscription access. One-time credit buyers get exactly what
 * they paid for (one generation) via the credit system, and paid-but-failed
 * retries reuse their pending entitlement — neither counts here.
 *
 * Count once per NEW generation (call recordMonthlyUse after a new entitlement
 * is created, never on a retry), so "pay once, generate until success" holds.
 */

const { getDb } = require('../config/firebase');

// Generous, env-tunable ceilings. Defaults chosen so real users never hit them.
const LIMITS = {
  report: Math.max(1, Number(process.env.REPORT_FAIR_USE_MONTHLY) || 5),
  porondam: Math.max(1, Number(process.env.PORONDAM_FAIR_USE_MONTHLY) || 10),
};

function monthKey() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function docId(uid, feature) {
  return `${uid}_${feature}`;
}

function limitFor(feature) {
  return LIMITS[feature] || 0;
}

/**
 * Read this month's usage for a subscriber.
 * @returns {{ count, remaining, limit, month }}
 */
async function getMonthlyUse(uid, feature) {
  const limit = limitFor(feature);
  const db = getDb();
  if (!db || !uid) return { count: 0, remaining: limit, limit, month: monthKey() };

  try {
    const doc = await db.collection('proFairUse').doc(docId(uid, feature)).get();
    const month = monthKey();
    if (!doc.exists || doc.data().month !== month) {
      return { count: 0, remaining: limit, limit, month };
    }
    const count = doc.data().count || 0;
    return { count, remaining: Math.max(0, limit - count), limit, month };
  } catch (e) {
    console.error('[fairUse] read error:', e.message);
    // Fail open — never block a paying subscriber on a counter read error.
    return { count: 0, remaining: limit, limit, month: monthKey() };
  }
}

/**
 * Increment this month's usage by 1 (resets automatically on a new month).
 * Call ONLY when a new generation actually starts for a subscriber.
 */
async function recordMonthlyUse(uid, feature) {
  const db = getDb();
  if (!db || !uid) return;
  const ref = db.collection('proFairUse').doc(docId(uid, feature));
  const month = monthKey();
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      let count = 1;
      if (doc.exists && doc.data().month === month) count = (doc.data().count || 0) + 1;
      tx.set(ref, { uid, feature, month, count, updatedAt: new Date().toISOString() });
    });
  } catch (e) {
    // Non-fatal — a missed increment only means the user got a touch more
    // generosity, never a failed generation.
    console.warn('[fairUse] increment failed (non-fatal):', e.message);
  }
}

// Soft, fair-use-framed message (not a harsh quota). Resets next month.
function fairUseMessage(feature, language) {
  const en = feature === 'report'
    ? "You've generated a lot of reports this month 🌙 — this is our fair-use limit so the astrologer stays fast for every subscriber. It reopens next month, and your saved reports are always here."
    : "You've run many compatibility checks this month 🌙 — this is our fair-use limit for subscribers. It reopens next month, and your saved checks are always here.";
  const si = feature === 'report'
    ? 'ඔබ මේ මාසයේ වාර්තා ගොඩක් සෑදුවා 🌙 — හැම දායකයෙකුටම සේවය වේගවත්ව තබන්න මෙය සාධාරණ භාවිත සීමාවකි. ලබන මාසයේ නැවත විවෘත වේ; ඔබේ වාර්තා සුරැකිව තිබේ.'
    : 'ඔබ මේ මාසයේ ගැලපීම් බොහොමයක් බැලුවා 🌙 — දායකයන් සඳහා මෙය සාධාරණ භාවිත සීමාවකි. ලබන මාසයේ නැවත විවෘත වේ; ඔබේ පරීක්ෂණ සුරැකිව තිබේ.';
  return language === 'si' ? si : (language === 'ta' ? en : en);
}

module.exports = {
  LIMITS,
  limitFor,
  getMonthlyUse,
  recordMonthlyUse,
  fairUseMessage,
};
