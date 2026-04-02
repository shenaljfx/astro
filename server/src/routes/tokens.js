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

module.exports = router;
