/**
 * Live Cost Tracker — Real-time AI cost accumulation
 * 
 * Tracks ACTUAL token usage and costs from every AI call in-memory,
 * and persists daily summaries to Firestore for historical analytics.
 * 
 * Data sources:
 *   - Full AI Report: tokenUsage from generateAINarrativeReport()
 *   - Porondam Report: usage from chat() call
 *   - Chat Questions: usage from chat() call  
 *   - Weekly Lagna: usage from generateWeeklyLagnaReports()
 *   - Full Reading: usage from reading route
 * 
 * Usage:
 *   const { trackCost, getStats } = require('./costTracker');
 *   trackCost('fullReport', userId, tokenUsageObj);
 *   const stats = getStats();
 */

const { getDb } = require('../config/firebase');
const { getUsdToLkr, MODEL_PRICING } = require('../utils/tokenCalculator');

// ── Revenue constants (LKR) ─────────────────────────────────────
const REVENUE = {
  fullReport: 380,
  porondam: 100,
  subscription: 280,    // per month (includes: weekly lagna shared, 10 chats, 1 kendara)
  chat: 0,              // included in subscription (10/month)
  weeklyLagna: 0,       // shared cost, no per-user revenue
  reading: 0,           // part of report flow
  kendara: 0,           // pure calculation, no AI cost
};

// ── In-memory accumulator ────────────────────────────────────────
// Resets daily at midnight SLT (18:30 UTC)
let stats = createEmptyStats();

function createEmptyStats() {
  return {
    date: todaySLT(),
    startedAt: new Date().toISOString(),
    usdToLkr: getUsdToLkr(),

    // Per-feature aggregation
    fullReport: { count: 0, totalCostUSD: 0, totalCostLKR: 0, totalRevenueLKR: 0, totalInputTokens: 0, totalOutputTokens: 0, totalThinkingTokens: 0, avgTimeSec: 0, _totalTimeSec: 0 },
    porondam:   { count: 0, totalCostUSD: 0, totalCostLKR: 0, totalRevenueLKR: 0, totalInputTokens: 0, totalOutputTokens: 0, totalThinkingTokens: 0, avgTimeSec: 0, _totalTimeSec: 0 },
    chat:       { count: 0, totalCostUSD: 0, totalCostLKR: 0, totalRevenueLKR: 0, totalInputTokens: 0, totalOutputTokens: 0, totalThinkingTokens: 0, avgTimeSec: 0, _totalTimeSec: 0 },
    weeklyLagna:{ count: 0, totalCostUSD: 0, totalCostLKR: 0, totalRevenueLKR: 0, totalInputTokens: 0, totalOutputTokens: 0, totalThinkingTokens: 0, avgTimeSec: 0, _totalTimeSec: 0 },
    reading:    { count: 0, totalCostUSD: 0, totalCostLKR: 0, totalRevenueLKR: 0, totalInputTokens: 0, totalOutputTokens: 0, totalThinkingTokens: 0, avgTimeSec: 0, _totalTimeSec: 0 },

    // Grand totals
    totals: { requests: 0, costUSD: 0, costLKR: 0, revenueLKR: 0, profitLKR: 0, marginPercent: 0, inputTokens: 0, outputTokens: 0 },

    // Recent requests log (last 50)
    recentRequests: [],
  };
}

function todaySLT() {
  const now = new Date();
  const slt = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return slt.toISOString().slice(0, 10);
}

/**
 * Track a real AI cost from an API call
 * 
 * @param {'fullReport'|'porondam'|'chat'|'weeklyLagna'|'reading'} feature
 * @param {string|null} userId - Firebase UID or null
 * @param {Object} tokenUsage - The finalized token usage object from tokenCalculator
 *   Expected shape: { summary: { costUSD, costLKR, totalInputTokens, totalOutputTokens, totalThinkingTokens, generationTimeSec }, breakdown: [...] }
 *   OR simple: { costUSD, costLKR, inputTokens, outputTokens, timeSec }
 */
function trackCost(feature, userId, tokenUsage) {
  if (!tokenUsage) return;

  // Auto-reset on new day
  const today = todaySLT();
  if (stats.date !== today) {
    persistDailyStats().catch(err => console.error('[CostTracker] persist error:', err.message));
    stats = createEmptyStats();
  }

  const bucket = stats[feature];
  if (!bucket) {
    console.warn(`[CostTracker] Unknown feature: ${feature}`);
    return;
  }

  // Normalize: accept both finalized tracker format and simple format
  let costUSD, costLKR, inputTokens, outputTokens, thinkingTokens, timeSec, breakdown;

  if (tokenUsage.summary) {
    // Finalized tracker format (from generateAINarrativeReport)
    costUSD = tokenUsage.summary.costUSD || 0;
    costLKR = tokenUsage.summary.costLKR || 0;
    inputTokens = tokenUsage.summary.totalInputTokens || 0;
    outputTokens = tokenUsage.summary.totalOutputTokens || 0;
    thinkingTokens = tokenUsage.summary.totalThinkingTokens || 0;
    timeSec = tokenUsage.summary.generationTimeSec || 0;
    breakdown = tokenUsage.breakdown || [];
  } else {
    // Simple format — compute cost from model + token counts if costUSD not provided
    inputTokens = tokenUsage.inputTokens || tokenUsage.promptTokenCount || 0;
    outputTokens = tokenUsage.outputTokens || tokenUsage.candidatesTokenCount || 0;
    thinkingTokens = tokenUsage.thinkingTokens || tokenUsage.thoughtsTokenCount || 0;
    timeSec = tokenUsage.timeSec || 0;
    breakdown = [];

    if (tokenUsage.costUSD) {
      costUSD = tokenUsage.costUSD;
    } else {
      // Auto-compute from model pricing
      const modelName = tokenUsage.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['gemini-2.5-flash'];
      costUSD = (inputTokens / 1_000_000) * pricing.inputPer1M
              + ((outputTokens + thinkingTokens) / 1_000_000) * pricing.outputPer1M;
    }
    costLKR = tokenUsage.costLKR || (costUSD * getUsdToLkr());
  }

  const revenue = REVENUE[feature] || 0;

  // Update feature bucket
  bucket.count++;
  bucket.totalCostUSD += costUSD;
  bucket.totalCostLKR += costLKR;
  bucket.totalRevenueLKR += revenue;
  bucket.totalInputTokens += inputTokens;
  bucket.totalOutputTokens += outputTokens;
  bucket.totalThinkingTokens += thinkingTokens;
  bucket._totalTimeSec += timeSec;
  bucket.avgTimeSec = round2(bucket._totalTimeSec / bucket.count);

  // Update grand totals
  stats.totals.requests++;
  stats.totals.costUSD += costUSD;
  stats.totals.costLKR += costLKR;
  stats.totals.revenueLKR += revenue;
  stats.totals.profitLKR = round2(stats.totals.revenueLKR - stats.totals.costLKR);
  stats.totals.marginPercent = stats.totals.revenueLKR > 0
    ? round2((stats.totals.profitLKR / stats.totals.revenueLKR) * 100)
    : 0;
  stats.totals.inputTokens += inputTokens;
  stats.totals.outputTokens += outputTokens;

  // Add to recent requests (keep last 50)
  stats.recentRequests.unshift({
    feature,
    userId: userId || 'anonymous',
    costUSD: round6(costUSD),
    costLKR: round2(costLKR),
    revenueLKR: revenue,
    profitLKR: round2(revenue - costLKR),
    inputTokens,
    outputTokens,
    thinkingTokens,
    timeSec: round2(timeSec),
    sections: breakdown.length || 1,
    timestamp: new Date().toISOString(),
  });
  if (stats.recentRequests.length > 50) {
    stats.recentRequests = stats.recentRequests.slice(0, 50);
  }

  // Log to console
  const profitEmoji = (revenue - costLKR) >= 0 ? '✅' : '⚠️';
  console.log(`[CostTracker] ${profitEmoji} ${feature} | Cost: LKR ${round2(costLKR)} | Revenue: LKR ${revenue} | Profit: LKR ${round2(revenue - costLKR)} | ${inputTokens + outputTokens} tokens | ${round2(timeSec)}s${userId ? ' | user:' + userId.slice(0, 8) : ''}`);
}

/**
 * Get current live stats
 */
function getStats() {
  // Auto-reset on new day
  const today = todaySLT();
  if (stats.date !== today) {
    persistDailyStats().catch(err => console.error('[CostTracker] persist error:', err.message));
    stats = createEmptyStats();
  }

  // Calculate per-feature margins
  const features = ['fullReport', 'porondam', 'chat', 'weeklyLagna', 'reading'];
  const featureSummaries = {};
  for (const f of features) {
    const b = stats[f];
    featureSummaries[f] = {
      count: b.count,
      totalCostUSD: round6(b.totalCostUSD),
      totalCostLKR: round2(b.totalCostLKR),
      totalRevenueLKR: round2(b.totalRevenueLKR),
      profitLKR: round2(b.totalRevenueLKR - b.totalCostLKR),
      marginPercent: b.totalRevenueLKR > 0 ? round2(((b.totalRevenueLKR - b.totalCostLKR) / b.totalRevenueLKR) * 100) : (b.count > 0 ? -100 : 0),
      avgCostLKR: b.count > 0 ? round2(b.totalCostLKR / b.count) : 0,
      avgTimeSec: b.avgTimeSec,
      totalInputTokens: b.totalInputTokens,
      totalOutputTokens: b.totalOutputTokens,
      totalThinkingTokens: b.totalThinkingTokens,
    };
  }

  return {
    date: stats.date,
    startedAt: stats.startedAt,
    usdToLkr: getUsdToLkr(),
    uptime: round2((Date.now() - new Date(stats.startedAt).getTime()) / 1000 / 60), // minutes
    totals: {
      requests: stats.totals.requests,
      costUSD: round6(stats.totals.costUSD),
      costLKR: round2(stats.totals.costLKR),
      revenueLKR: round2(stats.totals.revenueLKR),
      profitLKR: round2(stats.totals.profitLKR),
      marginPercent: stats.totals.marginPercent,
      inputTokens: stats.totals.inputTokens,
      outputTokens: stats.totals.outputTokens,
      totalTokens: stats.totals.inputTokens + stats.totals.outputTokens,
    },
    features: featureSummaries,
    recentRequests: stats.recentRequests.slice(0, 20),
  };
}

/**
 * Persist daily stats to Firestore for historical analytics
 */
async function persistDailyStats() {
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = getStats();
    const docId = `costs_${snapshot.date}`;
    await db.collection('dailyCosts').doc(docId).set({
      ...snapshot,
      persistedAt: new Date().toISOString(),
    }, { merge: true });
    console.log(`[CostTracker] 💾 Persisted daily stats for ${snapshot.date}`);
  } catch (err) {
    console.error('[CostTracker] Failed to persist:', err.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function round2(n) { return Math.round(n * 100) / 100; }
function round6(n) { return Math.round(n * 1000000) / 1000000; }

module.exports = {
  trackCost,
  getStats,
  persistDailyStats,
  REVENUE,
};
