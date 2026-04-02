/**
 * RevenueCat Webhook Routes
 * 
 * Receives subscription lifecycle events from RevenueCat.
 * Updates Firestore user subscription status based on events.
 * 
 * Webhook URL: https://api.grahachara.com/api/revenuecat/webhook
 * Configure in RevenueCat Dashboard → Integrations → Webhooks
 * 
 * Events handled:
 *   - INITIAL_PURCHASE      — new subscription
 *   - RENEWAL               — subscription renewed
 *   - CANCELLATION          — user cancelled (still active until period end)
 *   - EXPIRATION            — subscription expired
 *   - BILLING_ISSUE         — payment failed
 *   - SUBSCRIBER_ALIAS      — user ID alias created
 *   - PRODUCT_CHANGE        — user changed plan
 *   - UNCANCELLATION        — user re-enabled auto-renew
 *   - NON_RENEWING_PURCHASE — lifetime purchase
 */

const express = require('express');
const router = express.Router();
const { getDb, COLLECTIONS } = require('../config/firebase');

// RevenueCat webhook authorization header (set in dashboard)
const WEBHOOK_AUTH_KEY = process.env.REVENUECAT_WEBHOOK_AUTH_KEY || '';

/**
 * Verify webhook authenticity via Authorization header.
 */
function verifyWebhook(req, res, next) {
  if (WEBHOOK_AUTH_KEY) {
    var authHeader = req.headers['authorization'] || '';
    if (authHeader !== 'Bearer ' + WEBHOOK_AUTH_KEY) {
      console.warn('[RevenueCat Webhook] ✘ Unauthorized request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
}

// ─── POST /webhook ──────────────────────────────────────────────

router.post('/webhook', verifyWebhook, async (req, res) => {
  try {
    var event = req.body;

    if (!event || !event.event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    var eventType = event.event.type;
    var appUserId = event.event.app_user_id;
    var productId = event.event.product_id;
    var expirationDate = event.event.expiration_at_ms
      ? new Date(event.event.expiration_at_ms).toISOString()
      : null;
    var purchaseDate = event.event.purchased_at_ms
      ? new Date(event.event.purchased_at_ms).toISOString()
      : null;
    var store = event.event.store || 'unknown';
    var environment = event.event.environment || 'PRODUCTION';

    console.log('[RevenueCat Webhook] Event:', eventType, '| User:', appUserId, '| Product:', productId, '| Store:', store, '| Env:', environment);

    // Skip anonymous RevenueCat IDs (start with $RCAnonymousID)
    if (!appUserId || appUserId.startsWith('$RCAnonymousID')) {
      console.log('[RevenueCat Webhook] Skipping anonymous user:', appUserId);
      return res.status(200).json({ success: true, skipped: true });
    }

    var db = getDb();
    if (!db) {
      console.warn('[RevenueCat Webhook] No database — skipping');
      return res.status(200).json({ success: true, skipped: true });
    }

    var userRef = db.collection(COLLECTIONS.USERS).doc(appUserId);
    var userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn('[RevenueCat Webhook] User not found:', appUserId);
      return res.status(200).json({ success: true, userNotFound: true });
    }

    var subscriptionUpdate = {};

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        subscriptionUpdate = {
          'subscription.status': 'active',
          'subscription.plan': productId,
          'subscription.store': store,
          'subscription.expiresAt': expirationDate,
          'subscription.purchasedAt': purchaseDate,
          'subscription.willRenew': true,
          'subscription.provider': 'revenuecat',
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'PRODUCT_CHANGE':
        subscriptionUpdate = {
          'subscription.status': 'active',
          'subscription.plan': event.event.new_product_id || productId,
          'subscription.store': store,
          'subscription.expiresAt': expirationDate,
          'subscription.provider': 'revenuecat',
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'CANCELLATION':
        // User cancelled but still has access until expiration
        subscriptionUpdate = {
          'subscription.willRenew': false,
          'subscription.cancelledAt': new Date().toISOString(),
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'EXPIRATION':
        subscriptionUpdate = {
          'subscription.status': 'expired',
          'subscription.willRenew': false,
          'subscription.expiredAt': new Date().toISOString(),
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'BILLING_ISSUE':
        subscriptionUpdate = {
          'subscription.status': 'payment_failed',
          'subscription.billingIssueAt': new Date().toISOString(),
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'NON_RENEWING_PURCHASE':
        // Lifetime purchase — never expires
        subscriptionUpdate = {
          'subscription.status': 'active',
          'subscription.plan': productId,
          'subscription.store': store,
          'subscription.isLifetime': true,
          'subscription.willRenew': false,
          'subscription.purchasedAt': purchaseDate,
          'subscription.provider': 'revenuecat',
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      default:
        console.log('[RevenueCat Webhook] Unhandled event type:', eventType);
        return res.status(200).json({ success: true, unhandled: true });
    }

    // Update Firestore
    await userRef.update(subscriptionUpdate);
    console.log('[RevenueCat Webhook] ✔ Updated user:', appUserId, '→', eventType);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[RevenueCat Webhook] ✘ Error:', err.message);
    // Always return 200 to prevent RevenueCat retries on server errors
    res.status(200).json({ success: false, error: err.message });
  }
});

// ─── GET /status ────────────────────────────────────────────────

/**
 * Check subscription status from server-side (Firestore).
 * The mobile app primarily uses RevenueCat SDK directly,
 * but this endpoint is available for server-side verification.
 */
const { phoneAuth } = require('../middleware/subscription');

router.get('/status', phoneAuth, async (req, res) => {
  try {
    if (!req.user || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    var db = getDb();
    if (!db) {
      return res.json({ success: true, subscription: { status: 'active', plan: 'free-dev' } });
    }

    var doc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
    if (!doc.exists) {
      return res.json({ success: true, subscription: null });
    }

    var user = doc.data();
    res.json({ success: true, subscription: user.subscription || null });
  } catch (err) {
    console.error('[RevenueCat Status] Error:', err.message);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

module.exports = router;
