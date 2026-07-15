/**
 * /admin/* — God-mode dashboard API (admin.grahachara.com).
 *
 * Every route requires adminAuth: a Firebase ID token whose verified email is
 * on the ADMIN_EMAILS allowlist. Mutations write to the adminAudit collection.
 * Reads use projections + limits so god mode can never hurt the small VM.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { adminAuth, writeAudit } = require('../middleware/adminAuth');
const { tailLog } = require('../utils/logTee');
const { getStats } = require('../services/costTracker');
const { getAIHealth } = require('../services/aiHealth');
const { getState: getCircuitState } = require('../services/firestoreCircuit');
const { getTodayKey } = require('../services/budgetEnforcer');
const { getUserCredits, addPurchaseCredit, PRODUCT_CREDIT_TYPES } = require('../services/purchaseCredits');
const { LIMITS: FAIR_USE_LIMITS } = require('../services/fairUse');
const { getAllActiveTokens, sendToMultiple } = require('../services/notifications');
const { calculateSubscriptionUnitEconomics } = require('../services/unitEconomics');
const runtimeConfig = require('../services/runtimeConfig');
const { reconcileUserFromHistory, reconcileFromRevenueCat } = require('../services/subscriptionReconcile');

const router = express.Router();

// Rough LKR value per purchase event — for the revenue *estimate* tiles only.
// Authoritative revenue lives in RevenueCat; the dashboard deep-links to it.
const ADMIN_PRICE_LKR = { full_report: 999, porondam_check: 990, baby_kendara: 1490, subscription: 490 };

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests' },
});

router.use(adminLimiter);
router.use(adminAuth);

function needDb(res) {
  const db = getDb();
  if (!db) res.status(503).json({ error: 'Database unavailable' });
  return db;
}

const safeCount = async (query) => {
  try { return (await query.count().get()).data().count; } catch { return null; }
};

// ─── Overview ────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const todayKey = getTodayKey();
    const cutoff30 = new Date(Date.now() - 30 * 864e5).toISOString();

    const [users, subs, queued, processing, failed, spendDoc, costDocs, purch30] = await Promise.all([
      safeCount(db.collection(COLLECTIONS.USERS)),
      safeCount(db.collection(COLLECTIONS.USERS).where('isSubscribed', '==', true)),
      safeCount(db.collection(COLLECTIONS.JOBS).where('status', '==', 'queued')),
      safeCount(db.collection(COLLECTIONS.JOBS).where('status', '==', 'running')),
      safeCount(db.collection(COLLECTIONS.JOBS).where('status', '==', 'failed')),
      db.collection(COLLECTIONS.DAILY_AI_SPEND).doc(todayKey).get().catch(() => null),
      db.collection('dailyCosts').orderBy('__name__', 'desc').limit(30).get().catch(() => null),
      db.collection(COLLECTIONS.REVENUECAT_WEBHOOK_EVENTS)
        .where('receivedAt', '>=', cutoff30).limit(2000).get().catch(() => null),
    ]);

    // Purchase events → estimated revenue + counts by type
    const eventCounts = {}; let revenue30 = 0;
    if (purch30) {
      purch30.docs.forEach((d) => {
        const e = d.data();
        const t = e.eventType || 'UNKNOWN';
        eventCounts[t] = (eventCounts[t] || 0) + 1;
        if (t === 'INITIAL_PURCHASE' || t === 'RENEWAL' || t === 'NON_RENEWING_PURCHASE') {
          revenue30 += ADMIN_PRICE_LKR[e.productId] || ADMIN_PRICE_LKR.subscription;
        }
      });
    }

    res.json({
      generatedAt: new Date().toISOString(),
      users: { total: users, subscribers: subs },
      jobs: { queued, running: processing, failed },
      aiToday: getStats(),
      aiSpendToday: spendDoc && spendDoc.exists ? spendDoc.data() : null,
      costHistory: costDocs ? costDocs.docs.map((d) => ({ date: d.id, ...d.data() })).reverse() : [],
      purchases30d: { events: eventCounts, estRevenueLKR: revenue30 },
      aiHealth: getAIHealth(),
      circuit: getCircuitState(),
      recentErrors: tailLog('server', { level: 'error', lines: 20 }),
    });
  } catch (e) {
    console.error('[admin/overview]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── AI costs ────────────────────────────────────────────────────
router.get('/costs', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const days = Math.min(Number(req.query.days) || 30, 120);
  try {
    const snap = await db.collection('dailyCosts').orderBy('__name__', 'desc').limit(days).get();
    const events = await db.collection(COLLECTIONS.AI_COST_EVENTS)
      .orderBy('at', 'desc').limit(50).get().catch(() => null);
    res.json({
      live: getStats(),
      unitEconomics: (() => { try { return calculateSubscriptionUnitEconomics(); } catch { return null; } })(),
      days: snap.docs.map((d) => ({ date: d.id, ...d.data() })).reverse(),
      recentEvents: events ? events.docs.map((d) => ({ id: d.id, ...d.data() })) : [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Purchases feed ──────────────────────────────────────────────
router.get('/purchases', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  try {
    const snap = await db.collection(COLLECTIONS.REVENUECAT_WEBHOOK_EVENTS)
      .orderBy('receivedAt', 'desc').limit(limit).get();
    const credits = await db.collection(COLLECTIONS.PURCHASE_CREDITS)
      .orderBy('createdAt', 'desc').limit(50).get().catch(() => null);
    res.json({
      events: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      recentCredits: credits ? credits.docs.map((d) => ({ id: d.id, ...d.data() })) : [],
      priceMapLKR: ADMIN_PRICE_LKR,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Jobs ────────────────────────────────────────────────────────
const JOB_FIELDS = ['type', 'uid', 'status', 'attempts', 'maxAttempts', 'error', 'createdAt', 'updatedAt', 'runAfter', 'lockedBy', 'lockUntil'];

router.get('/jobs', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const { status } = req.query;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    let q = db.collection(COLLECTIONS.JOBS).select(...JOB_FIELDS);
    if (status) q = q.where('status', '==', String(status));
    const snap = await q.limit(limit * 2).get();
    const jobs = snap.docs
      .map((d) => {
        const j = { id: d.id, ...d.data() };
        // A 'running' job whose lock expired is orphaned (worker died) —
        // flag it so the dashboard offers Retry until the reaper collects it.
        j.stale = j.status === 'running' && (!j.lockUntil || new Date(j.lockUntil).getTime() < Date.now());
        return j;
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, limit);
    const counts = {};
    for (const s of ['queued', 'running', 'complete', 'failed']) {
      counts[s] = await safeCount(db.collection(COLLECTIONS.JOBS).where('status', '==', s));
    }
    res.json({ jobs, counts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/jobs/:id/retry', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const ref = db.collection(COLLECTIONS.JOBS).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    const now = new Date().toISOString();
    await ref.update({ status: 'queued', attempts: 0, error: null, lockedBy: null, lockUntil: null, runAfter: now, updatedAt: now });
    writeAudit(req, 'job.retry', req.params.id, { previousStatus: doc.data().status });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/jobs/:id/cancel', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const ref = db.collection(COLLECTIONS.JOBS).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Job not found' });
    await ref.update({ status: 'cancelled', updatedAt: new Date().toISOString() });
    writeAudit(req, 'job.cancel', req.params.id, { previousStatus: doc.data().status });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Users ───────────────────────────────────────────────────────
// Paginated directory of ALL users (newest first). Lean projection for the
// table; full per-user detail comes from /users/lookup on click.
router.get('/users', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const cursor = req.query.cursor || null;
  try {
    let q = db.collection(COLLECTIONS.USERS)
      .select('email', 'displayName', 'photoURL', 'isSubscribed', 'subscription', 'reportCount',
        'createdAt', 'updatedAt', 'onboardingComplete', 'preferences.language', 'location.name', 'phone')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    if (cursor) q = q.startAfter(cursor);
    const snap = await q.get();
    const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const nextCursor = snap.size === limit && users.length ? users[users.length - 1].createdAt : null;

    // Counts are expensive — only compute on the first page.
    let counts = null;
    if (!cursor) {
      const [total, subscribers, onboarded] = await Promise.all([
        safeCount(db.collection(COLLECTIONS.USERS)),
        safeCount(db.collection(COLLECTIONS.USERS).where('isSubscribed', '==', true)),
        safeCount(db.collection(COLLECTIONS.USERS).where('onboardingComplete', '==', true)),
      ]);
      counts = { total, subscribers, onboarded };
    }
    res.json({ users, nextCursor, counts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/lookup', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required (email or uid)' });
  try {
    let docs = [];
    if (q.includes('@')) {
      const snap = await db.collection(COLLECTIONS.USERS).where('email', '==', q.toLowerCase()).limit(5).get();
      docs = snap.docs;
    } else {
      const doc = await db.collection(COLLECTIONS.USERS).doc(q).get();
      if (doc.exists) docs = [doc];
    }
    const users = await Promise.all(docs.map(async (d) => ({
      uid: d.id,
      profile: d.data(),
      credits: await getUserCredits(d.id).catch(() => []),
      reportCount: await safeCount(db.collection(COLLECTIONS.REPORTS).where('uid', '==', d.id)),
      fairUse: await (async () => {
        const out = {};
        for (const f of Object.keys(FAIR_USE_LIMITS || {})) {
          const fu = await db.collection('proFairUse').doc(`${d.id}_${f}`).get().catch(() => null);
          if (fu && fu.exists) out[f] = fu.data();
        }
        return out;
      })(),
    })));
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users/:uid/credits', async (req, res) => {
  const { productId, reason } = req.body || {};
  if (!PRODUCT_CREDIT_TYPES[productId]) {
    return res.status(400).json({ error: `productId must be one of: ${Object.keys(PRODUCT_CREDIT_TYPES).join(', ')}` });
  }
  try {
    const result = await addPurchaseCredit(req.params.uid, productId, {
      eventId: `admin-${Date.now()}`,
      source: 'admin_grant',
      grantedBy: req.admin.email,
      reason: String(reason || '').slice(0, 300),
    });
    writeAudit(req, 'user.grantCredit', req.params.uid, { productId, reason: reason || null, result: !!result });
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users/:uid/pro', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const { action, days } = req.body || {}; // action: 'grant' | 'revoke'
  if (!['grant', 'revoke'].includes(action)) return res.status(400).json({ error: "action must be 'grant' or 'revoke'" });
  try {
    const now = new Date().toISOString();
    const update = action === 'grant'
      ? {
          isSubscribed: true,
          subscription: {
            status: 'active', plan: 'admin_grant', store: 'admin',
            grantedBy: req.admin.email, grantedAt: now,
            expiresAt: days ? new Date(Date.now() + Number(days) * 864e5).toISOString() : null,
          },
        }
      : { isSubscribed: false, subscription: { status: 'expired', revokedBy: req.admin.email, revokedAt: now } };
    await db.collection(COLLECTIONS.USERS).doc(req.params.uid).set(update, { merge: true });
    writeAudit(req, `user.pro.${action}`, req.params.uid, { days: days || null });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Self-heal a wrongly-unsubscribed user by replaying their stored RevenueCat
// webhook events (fixes missed / user-not-found-at-delivery webhooks).
router.post('/users/:uid/reconcile-subscription', async (req, res) => {
  try {
    const result = await reconcileUserFromHistory(req.params.uid);
    writeAudit(req, 'user.reconcileSubscription', req.params.uid,
      result.applied ? { before: result.before, after: result.after } : { reason: result.reason });
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Authoritative sync straight from RevenueCat (fixes older subscribers whose
// webhook events were never stored / TTL-expired). Upgrade-only.
router.post('/users/:uid/reconcile-revenuecat', async (req, res) => {
  try {
    const result = await reconcileFromRevenueCat(req.params.uid);
    writeAudit(req, 'user.reconcileRevenueCat', req.params.uid,
      result.applied ? { before: result.before, after: result.after } : { reason: result.reason });
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/users/:uid/fairuse/reset', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const features = Object.keys(FAIR_USE_LIMITS || {});
    await Promise.all(features.map((f) => db.collection('proFairUse').doc(`${req.params.uid}_${f}`).delete().catch(() => null)));
    writeAudit(req, 'user.fairUse.reset', req.params.uid, { features });
    res.json({ success: true, features });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Reports (recent, projected fields only) ─────────────────────
router.get('/reports/recent', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const snap = await db.collection(COLLECTIONS.REPORTS)
      .select('uid', 'type', 'status', 'createdAt', 'name', 'language')
      .orderBy('createdAt', 'desc').limit(Math.min(Number(req.query.limit) || 20, 100)).get();
    res.json({ reports: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Health ──────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const [heartbeat, spendDoc, activePushTokens] = await Promise.all([
      db.collection('system').doc('workerHeartbeat').get().catch(() => null),
      db.collection(COLLECTIONS.DAILY_AI_SPEND).doc(getTodayKey()).get().catch(() => null),
      safeCount(db.collection('pushTokens').where('active', '==', true)),
    ]);
    res.json({
      server: {
        uptimeSec: Math.round(process.uptime()),
        memory: process.memoryUsage(),
        node: process.version,
        pid: process.pid,
      },
      pushTokensActive: activePushTokens,
      worker: heartbeat && heartbeat.exists ? heartbeat.data() : null,
      aiHealth: getAIHealth(),
      circuit: getCircuitState(),
      aiSpendToday: spendDoc && spendDoc.exists ? spendDoc.data() : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Logs ────────────────────────────────────────────────────────
router.get('/logs', (req, res) => {
  const source = req.query.source === 'worker' ? 'worker' : 'server';
  const lines = tailLog(source, {
    lines: Number(req.query.lines) || 300,
    q: req.query.q || '',
    level: req.query.level || '',
  });
  res.json({ source, count: lines.length, lines });
});

// ─── Funnel (paywall analytics) ──────────────────────────────────
router.get('/funnel', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const days = Math.min(Number(req.query.days) || 14, 60);
  try {
    const cutoff = new Date(Date.now() - days * 864e5).toISOString();
    const snap = await db.collection('paywallEvents')
      .where('createdAt', '>=', cutoff).limit(4000).get();
    const byEvent = {}; const bySource = {}; const byDay = {};
    snap.docs.forEach((d) => {
      const e = d.data();
      byEvent[e.event] = (byEvent[e.event] || 0) + 1;
      const key = `${e.event}::${e.source || 'unknown'}`;
      bySource[key] = (bySource[key] || 0) + 1;
      const day = String(e.createdAt || '').slice(0, 10);
      byDay[day] = byDay[day] || {};
      byDay[day][e.event] = (byDay[day][e.event] || 0) + 1;
    });
    res.json({ days, total: snap.size, byEvent, bySource, byDay });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Flags + AI kill switch ──────────────────────────────────────
router.get('/flags', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const doc = await db.collection('config').doc('adminFlags').get().catch(() => null);
  res.json({ flags: doc && doc.exists ? doc.data() : {} });
});

router.post('/flags', async (req, res) => {
  const db = needDb(res); if (!db) return;
  const patch = req.body && typeof req.body === 'object' ? req.body : {};
  const clean = {};
  // Only allow scalar flag values; never nested structures from a browser.
  for (const [k, v] of Object.entries(patch)) {
    if (['string', 'number', 'boolean'].includes(typeof v) && k.length <= 40) clean[String(k)] = v;
  }
  if (!Object.keys(clean).length) return res.status(400).json({ error: 'No valid flag values' });
  try {
    clean._updatedBy = req.admin.email;
    clean._updatedAt = new Date().toISOString();
    await db.collection('config').doc('adminFlags').set(clean, { merge: true });
    writeAudit(req, 'flags.update', 'config/adminFlags', clean);
    const doc = await db.collection('config').doc('adminFlags').get();
    res.json({ success: true, flags: doc.data() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Push broadcast (danger zone) ────────────────────────────────
router.post('/push/broadcast', async (req, res) => {
  const { title, body, confirm } = req.body || {};
  if (confirm !== 'SEND') return res.status(400).json({ error: "confirm must be exactly 'SEND'" });
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  try {
    // getAllActiveTokens returns { uid, pushToken, ... } records; sendToMultiple
    // expects raw Expo token STRINGS. Extract + dedupe before sending.
    const records = await getAllActiveTokens();
    const tokens = [...new Set(
      records
        .map((t) => (typeof t === 'string' ? t : t && t.pushToken))
        .filter((t) => typeof t === 'string' && t.startsWith('Expo'))
    )];
    if (!tokens.length) return res.status(400).json({ error: 'No active push tokens' });
    const result = await sendToMultiple(tokens, String(title).slice(0, 120), String(body).slice(0, 400), { type: 'ADMIN_BROADCAST' });
    const sent = result && typeof result.sent === 'number' ? result.sent : tokens.length;
    writeAudit(req, 'push.broadcast', `${tokens.length} devices`, { title, body, sent });
    res.json({ success: true, sentTo: sent, tokens: tokens.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Gemini capacity ─────────────────────────────────────────────
// Google exposes NO balance API for Gemini keys — this panel instead shows
// configured models, pricing, free-tier request limits (env-overridable
// assumptions), live usage, and a coarse "reports left today" estimate.
const { MODEL_PRICING } = require('../utils/tokenCalculator');

router.get('/gemini', async (req, res) => {
  const db = getDb();
  const key = process.env.GEMINI_API_KEY || '';
  let freeTierRPD = { pro: 100, flash: 250, flashLite: 1000 };
  try { if (process.env.GEMINI_FREE_RPD_JSON) freeTierRPD = { ...freeTierRPD, ...JSON.parse(process.env.GEMINI_FREE_RPD_JSON) }; } catch { /* keep defaults */ }
  const proCallsPerReport = runtimeConfig.overrideNumber('GEMINI_PRO_CALLS_PER_REPORT') ?? Number(process.env.GEMINI_PRO_CALLS_PER_REPORT || 4);
  const flashCallsPerReport = runtimeConfig.overrideNumber('GEMINI_FLASH_CALLS_PER_REPORT') ?? Number(process.env.GEMINI_FLASH_CALLS_PER_REPORT || 16);

  const live = getStats();
  const reportsToday = live.fullReport?.calls ?? live.fullReport?.count ?? 0;
  const proUsed = reportsToday * proCallsPerReport;
  const flashUsed = reportsToday * flashCallsPerReport
    + ['chat', 'aiAnalysis', 'chartTranslation', 'chartExplanation', 'porondam'].reduce((s, f) => s + (live[f]?.calls ?? live[f]?.count ?? 0), 0);
  const freeReportsLeft = Math.max(0, Math.min(
    Math.floor((freeTierRPD.pro - proUsed) / proCallsPerReport),
    Math.floor((freeTierRPD.flash - flashUsed) / flashCallsPerReport),
  ));

  const spendDoc = db ? await db.collection(COLLECTIONS.DAILY_AI_SPEND).doc(getTodayKey()).get().catch(() => null) : null;

  res.json({
    keyMasked: key ? `${key.slice(0, 10)}…${key.slice(-4)}` : null,
    billing: {
      balanceApiExists: false,
      note: 'Google provides no wallet/balance API for Gemini keys. Authoritative usage & billing live in the consoles below; capacity here is estimated from our own tracking.',
      links: {
        aiStudioUsage: 'https://aistudio.google.com/usage',
        cloudBilling: 'https://console.cloud.google.com/billing',
        rateLimits: 'https://ai.google.dev/gemini-api/docs/rate-limits',
      },
    },
    modelsInUse: {
      flash: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      pro: process.env.GEMINI_3_PRO_MODEL || process.env.GEMINI_PRO_MODEL || null,
    },
    pricingUSDper1M: MODEL_PRICING,
    freeTierRPD,
    assumptions: { proCallsPerReport, flashCallsPerReport },
    usageToday: { reportsGenerated: reportsToday, estProRequests: proUsed, estFlashRequests: flashUsed },
    capacity: { freeReportsLeftToday: freeReportsLeft },
    spendToday: spendDoc && spendDoc.exists ? spendDoc.data() : null,
    liveByFeature: live,
  });
});

// ─── Failed report fulfillment ───────────────────────────────────
// Failed generations joined with user contact so reports can be produced
// manually and sent to the customer.
router.get('/failed-reports', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const snap = await db.collection(COLLECTIONS.JOBS)
      .where('status', '==', 'failed').limit(60).get();
    let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, 30);
    if (req.query.type) items = items.filter((j) => j.type === req.query.type);

    const uids = [...new Set(items.map((j) => j.uid).filter(Boolean))];
    const contacts = {};
    await Promise.all(uids.map(async (uid) => {
      const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get().catch(() => null);
      if (doc && doc.exists) {
        const u = doc.data();
        contacts[uid] = { email: u.email || null, name: u.name || u.displayName || u.fullName || null };
      }
    }));

    res.json({
      failed: items.map((j) => ({
        id: j.id, type: j.type, uid: j.uid || null,
        email: contacts[j.uid]?.email || null,
        name: contacts[j.uid]?.name || null,
        attempts: j.attempts, maxAttempts: j.maxAttempts,
        error: j.error && typeof j.error === 'object' ? (j.error.message || JSON.stringify(j.error)) : (j.error || null),
        failedAt: j.failedAt || j.updatedAt,
        payload: j.payload || null,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Runtime config (safe, live-editable settings + masked env viewer) ──────
router.get('/config', (req, res) => {
  res.json({
    schema: runtimeConfig.EDITABLE_KEYS,
    effective: runtimeConfig.effective(),
    env: runtimeConfig.maskedEnv(),
    note: 'Secrets are shown masked and are NOT editable here — they stay on the VM. Editable knobs apply live (no restart) via a Firestore override layered over process.env.',
  });
});

router.post('/config', async (req, res) => {
  const patch = req.body && typeof req.body === 'object' ? (req.body.patch || req.body) : {};
  try {
    const effective = await runtimeConfig.setOverrides(patch, { by: req.admin.email });
    writeAudit(req, 'config.update', 'config/runtimeConfig', patch);
    res.json({ success: true, effective });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── Audit log ───────────────────────────────────────────────────
router.get('/audit', async (req, res) => {
  const db = needDb(res); if (!db) return;
  try {
    const snap = await db.collection('adminAudit').orderBy('at', 'desc')
      .limit(Math.min(Number(req.query.limit) || 100, 500)).get();
    res.json({ entries: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
