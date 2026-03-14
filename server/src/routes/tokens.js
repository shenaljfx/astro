/**
 * Token / Micro-transaction Routes
 *
 * GET  /api/tokens/balance         — current LKR balance
 * POST /api/tokens/topup           — charge mobile credit & credit balance
 * GET  /api/tokens/history         — last 20 transactions
 */

const express = require('express');
const router = express.Router();
const { phoneAuth } = require('../middleware/subscription');
const { getTokenBalance, topUpViaIdeamart } = require('../middleware/tokens');
const { getDb, COLLECTIONS } = require('../config/firebase');

// Top-up packages available (LKR)
const TOP_UP_PACKAGES = [15, 30, 50];

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
      pricing: { fullReport: 15, porondamReport: 10 },
    });
  }

  try {
    const balance = await getTokenBalance(req.user.uid);
    res.json({
      success: true,
      balance,
      packages: TOP_UP_PACKAGES,
      pricing: {
        fullReport: 15,
        porondamReport: 10,
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

  const { amount } = req.body;
  const parsed = parseFloat(amount);

  if (!parsed || parsed <= 0) {
    return res.status(400).json({ error: 'Invalid amount', validPackages: TOP_UP_PACKAGES });
  }

  if (!TOP_UP_PACKAGES.includes(parsed)) {
    return res.status(400).json({
      error: `Invalid package. Choose from: ${TOP_UP_PACKAGES.join(', ')} LKR`,
      validPackages: TOP_UP_PACKAGES,
    });
  }

  // Fetch subscriberId from user doc (stored during phone auth)
  const db = getDb();
  let subscriberId = null;
  if (db) {
    try {
      const doc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
      if (doc.exists) {
        subscriberId = doc.data().subscriberId || null;
      }
    } catch (e) { /* ignore */ }
  }

  // In mock/dev mode, subscriberId is not required
  if (!subscriberId && process.env.IDEAMART_APP_ID) {
    return res.status(400).json({
      error: 'No subscriber ID linked to this account. Please verify your phone number first.',
    });
  }

  try {
    const result = await topUpViaIdeamart(
      req.user.uid,
      subscriberId || `tel:94000000000`, // mock fallback
      parsed,
      `Token top-up LKR ${parsed}`
    );

    res.json({
      success: true,
      charged: result.charged,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
      mock: result.mock || false,
    });
  } catch (err) {
    console.error('[tokens/topup] error:', err.message);
    res.status(500).json({ error: err.message || 'Top-up failed' });
  }
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
