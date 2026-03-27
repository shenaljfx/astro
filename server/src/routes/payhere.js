/**
 * PayHere Payment Routes
 * 
 * Handles:
 *   POST /api/payhere/initiate-subscription   — Generate payment hash for mobile SDK
 *   POST /api/payhere/initiate-topup          — Generate top-up payment hash for mobile SDK
 *   POST /api/payhere/notify                  — Webhook: subscription payment callback
 *   POST /api/payhere/notify-topup            — Webhook: top-up payment callback
 *   POST /api/payhere/cancel                  — Cancel subscription
 *   GET  /api/payhere/status                  — Check subscription status
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { phoneAuth } = require('../middleware/subscription');
const { addTokenBalance } = require('../middleware/tokens');
const { getDb, COLLECTIONS } = require('../config/firebase');
const {
  MERCHANT_ID,
  SANDBOX,
  MONTHLY_AMOUNT,
  TOP_UP_PACKAGES,
  verifyNotification,
  buildSubscriptionPayment,
  buildTopUpPayment,
  buildPaymentHash,
  STATUS_CODES,
  RECURRING_TYPES,
  RECURRING_STATUS,
} = require('../services/payhere');

// ─── POST /initiate-subscription ─────────────────────────────────────────

/**
 * Generate payment object + hash for PayHere React Native SDK.
 * Mobile app calls PayHere.startPayment() with this data.
 * 
 * Body: { firstName?, lastName?, email?, phone? }
 * Returns: { paymentObject, hash }
 */
router.post('/initiate-subscription', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { firstName, lastName, email } = req.body;
    const uid = req.user.uid;
    const phone = req.user.phone || '';

    // Generate unique order ID
    const orderId = 'SUB_' + uid.replace('phone_', '') + '_' + Date.now();

    // Build payment object
    const paymentObject = buildSubscriptionPayment({
      orderId,
      firstName: firstName || 'Grahachara',
      lastName: lastName || 'User',
      email: email || 'user@grahachara.lk',
      phone: phone.replace('94', '0') || '0770000000',
      userId: uid,
    });

    // Generate server-side hash
    const hash = buildPaymentHash(orderId, paymentObject.amount);
    paymentObject.hash = hash;

    // Store pending subscription in Firestore
    const db = getDb();
    if (db) {
      await db.collection('payhere_orders').doc(orderId).set({
        orderId,
        uid,
        type: 'subscription',
        amount: MONTHLY_AMOUNT,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    console.log(`[PayHere] ✔ Subscription initiated: ${orderId} for ${uid} (sandbox=${SANDBOX})`);

    // Build checkout URL for web fallback (form-post redirect)
    const checkoutUrl = SANDBOX
      ? 'https://sandbox.payhere.lk/pay/checkout'
      : 'https://www.payhere.lk/pay/checkout';

    res.json({
      success: true,
      paymentObject,
      hash,
      orderId,
      sandbox: SANDBOX,
      checkout_url: checkoutUrl,
    });
  } catch (err) {
    console.error('[PayHere] initiate-subscription error:', err);
    res.status(500).json({ error: 'Failed to initiate subscription' });
  }
});

// ─── GET /return — PayHere redirects here after successful web checkout ──
router.get('/return', (req, res) => {
  // Redirect user back to the app (Expo web or deep link)
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Payment Complete</title>
    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#04030C;color:#fff;text-align:center;}
    .box{padding:40px;border-radius:20px;background:rgba(255,255,255,0.05);}
    h2{color:#34D399;margin-bottom:8px;} a{color:#9333EA;}</style>
  </head><body><div class="box">
    <h2>✅ Payment Successful</h2>
    <p>Your subscription is now active.</p>
    <p><a href="/">Return to app</a></p>
    <script>setTimeout(function(){window.location.href='/';},3000);</script>
  </div></body></html>`;
  res.send(html);
});

// ─── GET /cancel — PayHere redirects here if user cancels web checkout ───
router.get('/cancel', (req, res) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Payment Cancelled</title>
    <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#04030C;color:#fff;text-align:center;}
    .box{padding:40px;border-radius:20px;background:rgba(255,255,255,0.05);}
    h2{color:#FBBF24;margin-bottom:8px;} a{color:#9333EA;}</style>
  </head><body><div class="box">
    <h2>⚠️ Payment Cancelled</h2>
    <p>No charges were made. You can try again anytime.</p>
    <p><a href="/">Return to app</a></p>
    <script>setTimeout(function(){window.location.href='/';},5000);</script>
  </div></body></html>`;
  res.send(html);
});

// ─── POST /initiate-topup ────────────────────────────────────────────────

/**
 * Generate payment object + hash for one-time token top-up.
 * Body: { amount, firstName?, lastName?, email? }
 */
router.post('/initiate-topup', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { amount, firstName, lastName, email } = req.body;
    const parsed = parseFloat(amount);

    if (!parsed || !TOP_UP_PACKAGES.includes(parsed)) {
      return res.status(400).json({
        error: `Invalid amount. Choose from: ${TOP_UP_PACKAGES.join(', ')} LKR`,
        validPackages: TOP_UP_PACKAGES,
      });
    }

    const uid = req.user.uid;
    const phone = req.user.phone || '';
    const orderId = 'TOPUP_' + uid.replace('phone_', '') + '_' + Date.now();

    const paymentObject = buildTopUpPayment({
      orderId,
      amount: parsed,
      firstName: firstName || 'Grahachara',
      lastName: lastName || 'User',
      email: email || 'user@grahachara.lk',
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

    console.log(`[PayHere] ✔ Top-up initiated: ${orderId} for ${uid} — LKR ${parsed}`);

    res.json({
      success: true,
      paymentObject,
      hash,
      orderId,
    });
  } catch (err) {
    console.error('[PayHere] initiate-topup error:', err);
    res.status(500).json({ error: 'Failed to initiate top-up' });
  }
});

// ─── POST /notify — Subscription webhook ─────────────────────────────────

/**
 * PayHere server-to-server callback for subscription payments.
 * Content-Type: application/x-www-form-urlencoded
 * 
 * For recurring payments, includes:
 *   subscription_id, message_type, item_rec_status, item_rec_date_next
 */
router.post('/notify', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const notification = req.body;
    console.log('[PayHere] 📩 Subscription notification:', JSON.stringify(notification));

    // Verify hash
    if (!verifyNotification(notification)) {
      console.error('[PayHere] ✖ Invalid notification hash — possible tampering');
      return res.status(403).send('Invalid hash');
    }

    const {
      order_id,
      payment_id,
      payhere_amount,
      status_code,
      custom_1: userId,
      subscription_id,
      message_type,
      item_rec_status,
      item_rec_date_next,
    } = notification;

    const statusCode = parseInt(status_code);
    const db = getDb();
    if (!db) {
      console.warn('[PayHere] No DB — notification ignored');
      return res.sendStatus(200);
    }

    // Update order record
    await db.collection('payhere_orders').doc(order_id).set({
      paymentId: payment_id,
      statusCode,
      subscriptionId: subscription_id || null,
      messageType: message_type || null,
      recStatus: item_rec_status ? parseInt(item_rec_status) : null,
      nextChargeDate: item_rec_date_next || null,
      notifiedAt: new Date().toISOString(),
    }, { merge: true });

    // Determine action based on message type
    const isRecurring = !!message_type;

    if (isRecurring) {
      await handleRecurringNotification(db, {
        userId,
        orderId: order_id,
        paymentId: payment_id,
        amount: parseFloat(payhere_amount),
        subscriptionId: subscription_id,
        messageType: message_type,
        recStatus: parseInt(item_rec_status || '0'),
        nextChargeDate: item_rec_date_next,
      });
    } else {
      // First-time authorization
      if (statusCode === STATUS_CODES.SUCCESS) {
        await activateSubscription(db, userId, {
          paymentId: payment_id,
          orderId: order_id,
          subscriptionId: subscription_id,
          amount: parseFloat(payhere_amount),
          nextChargeDate: item_rec_date_next,
        });
      } else {
        console.warn(`[PayHere] Subscription payment status ${statusCode} for ${order_id}`);
        if (userId) {
          await db.collection(COLLECTIONS.USERS).doc(userId).update({
            'subscription.status': statusCode === STATUS_CODES.PENDING ? 'pending' : 'failed',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[PayHere] notify error:', err);
    res.sendStatus(500);
  }
});

// ─── POST /notify-topup — One-time top-up webhook ────────────────────────

router.post('/notify-topup', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const notification = req.body;
    console.log('[PayHere] 📩 Top-up notification:', JSON.stringify(notification));

    if (!verifyNotification(notification)) {
      console.error('[PayHere] ✖ Invalid top-up notification hash');
      return res.status(403).send('Invalid hash');
    }

    const {
      order_id,
      payment_id,
      payhere_amount,
      status_code,
      custom_1: userId,
    } = notification;

    const statusCode = parseInt(status_code);
    const amount = parseFloat(payhere_amount);
    const db = getDb();

    if (!db) {
      return res.sendStatus(200);
    }

    // Update order
    await db.collection('payhere_orders').doc(order_id).set({
      paymentId: payment_id,
      statusCode,
      notifiedAt: new Date().toISOString(),
    }, { merge: true });

    if (statusCode === STATUS_CODES.SUCCESS && userId) {
      // Credit token balance
      try {
        const result = await addTokenBalance(
          userId, amount, payment_id,
          `PayHere top-up LKR ${amount}`
        );
        console.log(`[PayHere] ✔ Top-up credited: LKR ${amount} to ${userId} (balance: ${result.newBalance})`);

        await db.collection('payhere_orders').doc(order_id).update({
          status: 'completed',
          newBalance: result.newBalance,
        });
      } catch (tokenErr) {
        console.error('[PayHere] ✖ Failed to credit top-up tokens:', tokenErr.message);
      }
    } else {
      console.warn(`[PayHere] Top-up status ${statusCode} for ${order_id}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[PayHere] notify-topup error:', err);
    res.sendStatus(500);
  }
});

// ─── POST /cancel — Cancel subscription ──────────────────────────────────

router.post('/cancel', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const db = getDb();
    if (!db) {
      return res.json({ success: true, message: 'Subscription cancelled (dev mode)' });
    }

    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = doc.data();
    const sub = user.subscription;

    // Update subscription status to cancelled
    await db.collection(COLLECTIONS.USERS).doc(uid).update({
      subscription: {
        ...sub,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    });

    // Note: The actual PayHere recurring subscription will continue to attempt charges.
    // PayHere doesn't have a cancel-via-API for recurring payments on PLUS plan.
    // The user must cancel from PayHere's side, or we stop activating on the notify callback.
    // We store 'cancelled' flag and ignore future recurring notifications for this user.

    console.log(`[PayHere] ✔ Subscription cancelled for ${uid}`);

    res.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
    });
  } catch (err) {
    console.error('[PayHere] cancel error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ─── GET /status — Subscription status ───────────────────────────────────

router.get('/status', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const uid = req.user.uid;
    const db = getDb();

    if (!db) {
      return res.json({
        success: true,
        subscription: { status: 'active', plan: 'free-dev' },
      });
    }

    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const user = doc.data();
    const subscription = user.subscription || { status: 'none' };

    // Check expiration
    if (subscription.status === 'active' && subscription.expiresAt) {
      const now = new Date();
      const expires = new Date(subscription.expiresAt);
      if (now > expires) {
        subscription.status = 'expired';
        subscription.needsRenewal = true;
        await db.collection(COLLECTIONS.USERS).doc(uid).update({
          subscription,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    res.json({
      success: true,
      subscription,
      monthlyRate: MONTHLY_AMOUNT,
      currency: 'LKR',
    });
  } catch (err) {
    console.error('[PayHere] status error:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// ─── POST /confirm-payment — Mobile confirms SDK payment completed ───────

/**
 * After PayHere.startPayment() returns paymentId on mobile,
 * the app calls this to verify the payment was recorded.
 * 
 * Body: { paymentId, orderId, type: 'subscription' | 'topup' }
 */
router.post('/confirm-payment', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { paymentId, orderId, type } = req.body;
    const uid = req.user.uid;
    const db = getDb();

    if (!db) {
      // Dev mode — auto-activate
      return res.json({
        success: true,
        message: 'Payment confirmed (dev mode)',
        subscription: { status: 'active', plan: 'monthly' },
      });
    }

    // Check if the webhook already processed this payment
    if (orderId) {
      const orderDoc = await db.collection('payhere_orders').doc(orderId).get();
      if (orderDoc.exists) {
        const order = orderDoc.data();
        if (order.statusCode === STATUS_CODES.SUCCESS) {
          // Already processed by webhook — just return current state
          const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
          const user = userDoc.exists ? userDoc.data() : {};
          return res.json({
            success: true,
            message: 'Payment already confirmed',
            subscription: user.subscription || { status: 'active' },
            tokenBalance: user.tokenBalance || 0,
          });
        }
      }
    }

    // Webhook hasn't arrived yet — wait briefly and re-check
    // (PayHere webhook may take a few seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (orderId) {
      const orderDoc = await db.collection('payhere_orders').doc(orderId).get();
      if (orderDoc.exists && orderDoc.data().statusCode === STATUS_CODES.SUCCESS) {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        const user = userDoc.exists ? userDoc.data() : {};
        return res.json({
          success: true,
          message: 'Payment confirmed',
          subscription: user.subscription,
          tokenBalance: user.tokenBalance || 0,
        });
      }
    }

    // Still not confirmed — tell mobile to poll
    res.json({
      success: false,
      pending: true,
      message: 'Payment is being processed. Please wait a moment.',
    });
  } catch (err) {
    console.error('[PayHere] confirm-payment error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// ─── Helper: Activate subscription in Firestore ──────────────────────────

async function activateSubscription(db, userId, paymentInfo) {
  if (!userId) {
    console.error('[PayHere] ✖ Cannot activate subscription — no userId');
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const subscription = {
    status: 'active',
    plan: 'monthly',
    amount: MONTHLY_AMOUNT,
    currency: 'LKR',
    subscribedAt: now.toISOString(),
    lastChargedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    payherePaymentId: paymentInfo.paymentId,
    payhereSubscriptionId: paymentInfo.subscriptionId || null,
    payhereOrderId: paymentInfo.orderId,
    nextChargeDate: paymentInfo.nextChargeDate || null,
  };

  await db.collection(COLLECTIONS.USERS).doc(userId).update({
    subscription,
    updatedAt: now.toISOString(),
  });

  // Also credit the monthly token balance
  try {
    const result = await addTokenBalance(
      userId, MONTHLY_AMOUNT, paymentInfo.paymentId,
      'Monthly subscription — LKR ' + MONTHLY_AMOUNT
    );
    console.log(`[PayHere] ✔ Subscription activated for ${userId}, tokens credited (balance: ${result.newBalance})`);
  } catch (tokenErr) {
    console.error(`[PayHere] ✖ Subscription activated but token credit failed: ${tokenErr.message}`);
  }
}

// ─── Helper: Handle recurring notification ───────────────────────────────

async function handleRecurringNotification(db, info) {
  const {
    userId, orderId, paymentId, amount, subscriptionId,
    messageType, recStatus, nextChargeDate,
  } = info;

  console.log(`[PayHere] 🔄 Recurring: type=${messageType} status=${recStatus} user=${userId}`);

  if (!userId) {
    console.error('[PayHere] ✖ Recurring notification has no userId');
    return;
  }

  // Check if user has cancelled on our side
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
  if (userDoc.exists) {
    const user = userDoc.data();
    if (user.subscription?.status === 'cancelled') {
      console.log(`[PayHere] ⚠ Ignoring recurring for cancelled user ${userId}`);
      return;
    }
  }

  switch (messageType) {
    case RECURRING_TYPES.AUTH_SUCCESS:
      // First authorization — activate subscription
      await activateSubscription(db, userId, {
        paymentId,
        orderId,
        subscriptionId,
        amount,
        nextChargeDate,
      });
      break;

    case RECURRING_TYPES.INSTALLMENT_SUCCESS:
      // Monthly auto-charge succeeded — extend subscription
      const now = new Date();
      const newExpiry = new Date(now);
      newExpiry.setDate(newExpiry.getDate() + 30);

      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        'subscription.status': 'active',
        'subscription.lastChargedAt': now.toISOString(),
        'subscription.expiresAt': newExpiry.toISOString(),
        'subscription.payherePaymentId': paymentId,
        'subscription.nextChargeDate': nextChargeDate || null,
        updatedAt: now.toISOString(),
      });

      // Credit monthly tokens
      try {
        await addTokenBalance(
          userId, MONTHLY_AMOUNT, paymentId,
          'Monthly recurring payment — LKR ' + MONTHLY_AMOUNT
        );
        console.log(`[PayHere] ✔ Recurring installment credited for ${userId}`);
      } catch (e) {
        console.error(`[PayHere] ✖ Recurring token credit failed:`, e.message);
      }

      // Record the recurring charge
      await db.collection('charges').doc(paymentId || uuidv4()).set({
        uid: userId,
        type: 'recurring',
        amount,
        currency: 'LKR',
        paymentId,
        subscriptionId,
        status: 'success',
        timestamp: now.toISOString(),
      });
      break;

    case RECURRING_TYPES.INSTALLMENT_FAILED:
      // Monthly charge failed — mark subscription as payment_failed
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        'subscription.status': 'payment_failed',
        'subscription.lastFailedAt': new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.warn(`[PayHere] ⚠ Recurring payment failed for ${userId}`);
      break;

    case RECURRING_TYPES.STOPPED:
    case RECURRING_TYPES.COMPLETE:
      // Subscription ended from PayHere side
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        'subscription.status': 'expired',
        'subscription.endedAt': new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`[PayHere] ✔ Subscription ended for ${userId}: ${messageType}`);
      break;

    default:
      console.warn(`[PayHere] Unknown message type: ${messageType}`);
  }
}

module.exports = router;
