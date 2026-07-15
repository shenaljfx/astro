const crypto = require('crypto');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { toTtlTimestamp } = require('../utils/firestoreTtl');

// Per-event cost docs (fix F6): rare/expensive features are always logged in
// full; cheap high-frequency ones (chat, chart helpers) only when a single call
// is costly enough to be worth its own document. The daily increment counters
// below are ALWAYS written, so aggregate spend stays exact regardless.
const ALWAYS_LOG_EVENT = new Set(['fullReport', 'weeklyLagna', 'reading', 'porondamReport']);
const AI_COST_EVENT_MIN_LKR = Number(process.env.AI_COST_EVENT_MIN_LKR || 2);

// NOTE: these are pre-flight budget RESERVATIONS (gate whether a call is
// allowed), so they should reflect the real measured cost of a feature — see
// server/benchmark/LIVE_AI_COST_REPORT.md. A full report was under-reserved at
// 250 while its true cost is ~370 LKR; corrected below. Post-2026-07 cost
// optimisations (reduced hero-model use, lower thinking budgets, prompt-prefix
// caching) bring the real figure back down, so 300 is a safe reservation that
// still covers a worst-case all-Pro report.
const DEFAULT_ESTIMATES = {
  fullReport: 300,
  aiAnalysis: 35,
  chartTranslation: 15,
  chartExplanation: 20,
  porondamReport: 60,
  weeklyLagna: 180,
  chat: 8,
  reading: 120,
};

function getTodayKey() {
  const now = new Date();
  const slt = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return slt.toISOString().slice(0, 10);
}

function numberEnv(name, fallback = 0) {
  // Dashboard runtime override wins (live, no restart) — see runtimeConfig.js.
  const override = require('./runtimeConfig').overrideNumber(name);
  if (override !== undefined) return override;
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getEstimate(feature, fallback = 0) {
  const envName = `AI_BUDGET_ESTIMATE_${String(feature || '').toUpperCase()}_LKR`;
  return numberEnv(envName, DEFAULT_ESTIMATES[feature] || fallback || 0);
}

function buildUserSpendId(dateKey, uid) {
  return `${dateKey}_${crypto.createHash('sha256').update(String(uid)).digest('hex').slice(0, 32)}`;
}

function buildBudgetError(message, code = 'AI_BUDGET_EXCEEDED') {
  const err = new Error(message);
  err.code = code;
  err.statusCode = 429;
  return err;
}

// ─── Admin kill switch ──────────────────────────────────────────
// The god-mode dashboard can pause ALL AI generation instantly by setting
// config/adminFlags.aiKillSwitch = true. Cached 60s so this adds at most one
// tiny read per minute to the hot path.
let killSwitchCache = { value: false, at: 0 };
async function isKillSwitchOn(db) {
  if (Date.now() - killSwitchCache.at < 60 * 1000) return killSwitchCache.value;
  try {
    const doc = await db.collection('config').doc('adminFlags').get();
    killSwitchCache = { value: !!(doc.exists && doc.data().aiKillSwitch === true), at: Date.now() };
  } catch {
    killSwitchCache.at = Date.now(); // fail open — never block users on a flag read error
  }
  return killSwitchCache.value;
}

async function assertBudgetAvailable(feature, uid, estimateLKR) {
  const db = getDb();
  if (!db) return true;

  if (await isKillSwitchOn(db)) {
    throw buildBudgetError('AI generation is temporarily paused for maintenance. Please try again soon.', 'AI_KILL_SWITCH');
  }

  const globalLimit = numberEnv('DAILY_GLOBAL_AI_SPEND_LIMIT_LKR', 0);
  const userLimit = numberEnv('DAILY_USER_AI_SPEND_LIMIT_LKR', 0);
  if (!globalLimit && !userLimit) return true;

  const dateKey = getTodayKey();
  const estimate = Number.isFinite(Number(estimateLKR)) ? Number(estimateLKR) : getEstimate(feature);
  const globalRef = db.collection(COLLECTIONS.DAILY_AI_SPEND).doc(dateKey);
  const userRef = uid ? db.collection(COLLECTIONS.DAILY_AI_USER_SPEND).doc(buildUserSpendId(dateKey, uid)) : null;

  const [globalDoc, userDoc] = await Promise.all([
    globalRef.get(),
    userRef ? userRef.get() : Promise.resolve(null),
  ]);

  const globalCurrent = globalDoc.exists ? Number(globalDoc.data().totalCostLKR || 0) : 0;
  if (globalLimit && globalCurrent + estimate > globalLimit) {
    throw buildBudgetError('Daily AI spend budget has been reached. Please try again later.', 'GLOBAL_AI_BUDGET_EXCEEDED');
  }

  if (userLimit && userDoc) {
    const userCurrent = userDoc.exists ? Number(userDoc.data().totalCostLKR || 0) : 0;
    if (userCurrent + estimate > userLimit) {
      throw buildBudgetError('Daily AI usage budget reached for this account. Please try again later.', 'USER_AI_BUDGET_EXCEEDED');
    }
  }

  return true;
}

async function recordAICostEvent(feature, uid, cost = {}) {
  const db = getDb();
  if (!db) return null;
  const admin = require('firebase-admin');
  const dateKey = getTodayKey();
  const now = new Date().toISOString();
  const costLKR = Number(cost.costLKR || 0);
  const costUSD = Number(cost.costUSD || 0);
  const totalTokens = Number(cost.totalTokens || 0);
  const inputTokens = Number(cost.inputTokens || 0);
  const outputTokens = Number(cost.outputTokens || 0);
  const thinkingTokens = Number(cost.thinkingTokens || 0);
  const globalRef = db.collection(COLLECTIONS.DAILY_AI_SPEND).doc(dateKey);
  const ttlMs = Number(process.env.AI_COST_EVENT_TTL_MS || 90 * 24 * 60 * 60 * 1000);
  const expiresAtMs = Date.now() + ttlMs;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const ttlExpireAt = toTtlTimestamp(expiresAtMs); // Timestamp TTL (fix F3)

  const writes = [
    globalRef.set({
      date: dateKey,
      totalCostLKR: admin.firestore.FieldValue.increment(costLKR),
      totalCostUSD: admin.firestore.FieldValue.increment(costUSD),
      totalTokens: admin.firestore.FieldValue.increment(totalTokens),
      updatedAt: now,
      expiresAt,
      ttlExpireAt,
    }, { merge: true }),
  ];

  // Per-event document (fix F6): sample cheap/frequent features out.
  if (ALWAYS_LOG_EVENT.has(feature) || costLKR >= AI_COST_EVENT_MIN_LKR) {
    const eventRef = db.collection(COLLECTIONS.AI_COST_EVENTS).doc();
    writes.push(eventRef.set({
      feature,
      uid: uid || null,
      costLKR,
      costUSD,
      totalTokens,
      inputTokens,
      outputTokens,
      thinkingTokens,
      model: cost.model || null,
      createdAt: now,
      expiresAt,
      ttlExpireAt,
    }));
  }

  if (uid) {
    const userRef = db.collection(COLLECTIONS.DAILY_AI_USER_SPEND).doc(buildUserSpendId(dateKey, uid));
    writes.push(userRef.set({
      date: dateKey,
      uid,
      totalCostLKR: admin.firestore.FieldValue.increment(costLKR),
      totalCostUSD: admin.firestore.FieldValue.increment(costUSD),
      totalTokens: admin.firestore.FieldValue.increment(totalTokens),
      updatedAt: now,
      expiresAt,
      ttlExpireAt,
    }, { merge: true }));
  }

  await Promise.all(writes);
  return { date: dateKey, costLKR, costUSD };
}

function budgetGuard(feature, estimateLKR) {
  return async function budgetGuardMiddleware(req, res, next) {
    try {
      await assertBudgetAvailable(feature, req.user?.uid || null, estimateLKR != null ? estimateLKR : getEstimate(feature));
      next();
    } catch (error) {
      res.status(error.statusCode || 429).json({
        error: error.message,
        code: error.code || 'AI_BUDGET_EXCEEDED',
      });
    }
  };
}

module.exports = {
  assertBudgetAvailable,
  recordAICostEvent,
  budgetGuard,
  getEstimate,
  getTodayKey,
};