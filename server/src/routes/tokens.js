/**
 * Token / Micro-transaction Routes
 *
 * GET  /api/tokens/balance         — current LKR balance
 * POST /api/tokens/topup           — initiate PayHere top-up (returns payment object)
 * GET  /api/tokens/history         — last 20 transactions
 */

const express = require('express');
const router = express.Router();
const { phoneAuth } = require('../middleware/subscription');
const { getTokenBalance } = require('../middleware/tokens');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { TOP_UP_PACKAGES, buildTopUpPayment, buildPaymentHash } = require('../services/payhere');

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
      pricing: { fullReport: 350, porondamReport: 100 },
    });
  }

  try {
    const balance = await getTokenBalance(req.user.uid);
    res.json({
      success: true,
      balance,
      packages: TOP_UP_PACKAGES,
      pricing: {
        fullReport: 350,
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

  const uid = req.user.uid;
  const phone = req.user.phone || '';
  const orderId = 'TOPUP_' + uid.replace('phone_', '') + '_' + Date.now();

  try {
    // Build PayHere payment object for mobile SDK
    const paymentObject = buildTopUpPayment({
      orderId,
      amount: parsed,
      phone: phone.replace('94', '0') || '0770000000',
      userId: uid,
    });

    const hash = buildPaymentHash(orderId, paymentObject.amount);
    paymentObject.hash = hash;

    // Store pending order
    const db = getDb();
    if (db) {
      await db.collection('payhere_orders').doc(orderId).set({
        orderId,
        uid,
        type: 'topup',
        amount: parsed,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    console.log('[tokens/topup] PayHere payment initiated: ' + orderId + ' LKR ' + parsed);

    res.json({
      success: true,
      usePayHere: true,
      paymentObject,
      hash,
      orderId,
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
