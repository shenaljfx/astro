/**
 * Token / Micro-transaction Routes
 *
 * GET  /api/tokens/balance         — current LKR balance
 * POST /api/tokens/topup           — top-up tokens (handled via RevenueCat in-app purchase)
 * GET  /api/tokens/history         — last 20 transactions
 */

const express = require('express');
const router = express.Router();
const { phoneAuth } = require('../middleware/subscription');
const { getTokenBalance } = require('../middleware/tokens');
const { checkPendingEntitlement, getUserEntitlements, hashInput } = require('../middleware/entitlements');
const { getDb, COLLECTIONS } = require('../config/firebase');

const TOP_UP_PACKAGES = [100, 250, 500, 1000];

// ─── GET /balance ───────────────────────────────────────────────────────────

// Uses phoneAuth (optional — sets req.user = null if no token, doesn't reject)
router.get('/balance', phoneAuth, async (req, res) => {
  // No auth or anonymous — return 0 balance so UI shows correctly
  if (!req.user || req.user.authType === 'anonymous') {
    return res.json({
      success: true,
      balance: 0,
      guest: true,
      packages: TOP_UP_PACKAGES,
      pricing: { fullReport: 380, porondamReport: 100 },
    });
  }

  try {
    const balance = await getTokenBalance(req.user.uid);
    res.json({
      success: true,
      balance,
      packages: TOP_UP_PACKAGES,
      pricing: {
        fullReport: 380,
        porondamReport: 100,
      },
    });
  } catch (err) {
    console.error('[tokens/balance] error:', err.message);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// ─── POST /topup ────────────────────────────────────────────────────────────

router.post('/topup', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Token top-ups are now handled via RevenueCat in-app purchases.
  // This endpoint is kept for potential server-side crediting (e.g. promo codes).
  return res.status(410).json({
    error: 'Top-ups are now handled via in-app purchases',
    message: 'Please use the app to purchase tokens via Google Play / App Store.',
  });
});

// ─── GET /history ───────────────────────────────────────────────────────────

router.get('/history', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDb();
  if (!db) {
    return res.json({ success: true, transactions: [], mock: true });
  }

  try {
    const snapshot = await db.collection('tokenTransactions')
      .where('uid', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, transactions });
  } catch (err) {
    console.error('[tokens/history] error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ─── POST /entitlement/check — Check for pending (retryable) entitlement ────

/**
 * POST /api/tokens/entitlement/check
 * Body: { type: 'report'|'porondam', inputData: { birthDate, lat, lng, ... } }
 * Returns: { hasPending: true/false, entitlement: {...} }
 *
 * Mobile calls this BEFORE showing paywall — if a pending entitlement exists,
 * the user can retry generation without paying again.
 */
router.post('/entitlement/check', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.json({ success: true, hasPending: false });
  }

  try {
    const { type, inputData } = req.body;
    if (!type || !inputData) {
      return res.status(400).json({ error: 'type and inputData are required' });
    }

    const pending = await checkPendingEntitlement(req.user.uid, type, inputData);

    res.json({
      success: true,
      hasPending: !!pending,
      entitlement: pending || null,
    });
  } catch (err) {
    console.error('[tokens/entitlement/check] error:', err.message);
    res.json({ success: true, hasPending: false });
  }
});

// ─── GET /entitlements — List user's entitlements ───────────────────────────

router.get('/entitlements', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.json({ success: true, entitlements: [] });
  }

  try {
    const type = req.query.type || null;
    const entitlements = await getUserEntitlements(req.user.uid, type);
    res.json({ success: true, entitlements });
  } catch (err) {
    console.error('[tokens/entitlements] error:', err.message);
    res.json({ success: true, entitlements: [] });
  }
});

module.exports = router;
