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
 *   - NON_RENEWING_PURCHASE — 'lifetime' grants Pro; other one-time products
 *                             (full_report, porondam_check) record a purchase
 *                             credit (services/purchaseCredits) instead
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { notifyAlert } = require('../services/alerting');
const { addPurchaseCredit } = require('../services/purchaseCredits');

// RevenueCat webhook authorization header (set in dashboard)
const WEBHOOK_AUTH_KEY = process.env.REVENUECAT_WEBHOOK_AUTH_KEY || '';
const WEBHOOK_MAX_AGE_MS = Number(process.env.REVENUECAT_WEBHOOK_MAX_AGE_MS || 3 * 24 * 60 * 60 * 1000);

function timingSafeEqualString(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildRevenueCatEventId(payload) {
  const e = payload?.event || {};
  if (e.id) return String(e.id);
  if (e.event_id) return String(e.event_id);
  const stable = [e.type, e.app_user_id, e.transaction_id, e.original_transaction_id, e.product_id, e.purchased_at_ms, e.event_timestamp_ms].filter(Boolean).join(':');
  if (stable) return crypto.createHash('sha256').update(stable).digest('hex');
  return crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex');
}

function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.event || typeof payload.event !== 'object') {
    return 'Invalid webhook payload';
  }
  const e = payload.event;
  if (!e.type || typeof e.type !== 'string') return 'Missing event.type';
  if (e.app_user_id && typeof e.app_user_id !== 'string') return 'Invalid event.app_user_id';
  const timestampMs = Number(e.event_timestamp_ms || e.purchased_at_ms || 0);
  if (timestampMs) {
    const ageMs = Date.now() - timestampMs;
    if (ageMs > WEBHOOK_MAX_AGE_MS) return 'RevenueCat event is outside the replay window';
    if (ageMs < -10 * 60 * 1000) return 'RevenueCat event timestamp is too far in the future';
  } else if (process.env.NODE_ENV === 'production') {
    return 'Missing RevenueCat event timestamp';
  }
  return null;
}

async function claimWebhookEvent(db, eventId, metadata) {
  const ref = db.collection(COLLECTIONS.REVENUECAT_WEBHOOK_EVENTS).doc(eventId);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) return { duplicate: true, record: doc.data() };
    const now = new Date().toISOString();
    tx.set(ref, {
      eventId,
      status: 'received',
      eventType: metadata.eventType || null,
      appUserId: metadata.appUserId || null,
      receivedAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + Number(process.env.REVENUECAT_WEBHOOK_EVENT_TTL_MS || 90 * 24 * 60 * 60 * 1000)).toISOString(),
    });
    return { duplicate: false };
  });
}

async function markWebhookEvent(db, eventId, status, patch = {}) {
  await db.collection(COLLECTIONS.REVENUECAT_WEBHOOK_EVENTS).doc(eventId).set({
    status,
    ...patch,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Verify webhook authenticity via Authorization header.
 * In production, REVENUECAT_WEBHOOK_AUTH_KEY MUST be set (enforced at boot).
 * In dev, if unset we log a warning but allow (for local testing).
 */
function verifyWebhook(req, res, next) {
  if (!WEBHOOK_AUTH_KEY) {
    if (process.env.NODE_ENV === 'production') {
      // Boot guard should already prevent this, but defense in depth
      return res.status(500).json({ error: 'Webhook auth not configured' });
    }
    console.warn('[RevenueCat Webhook] ⚠ REVENUECAT_WEBHOOK_AUTH_KEY not set — accepting all webhooks (dev only)');
    return next();
  }
  var authHeader = req.headers['authorization'] || '';
  if (!timingSafeEqualString(authHeader, 'Bearer ' + WEBHOOK_AUTH_KEY)) {
    console.warn('[RevenueCat Webhook] ✘ Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── POST /webhook ──────────────────────────────────────────────

router.post('/webhook', verifyWebhook, async (req, res) => {
  try {
    var event = req.body;

    var validationError = validateWebhookPayload(event);
    if (validationError) {
      return res.status(400).json({ error: validationError });
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

    var db = getDb();
    if (!db) {
      console.warn('[RevenueCat Webhook] No database — skipping');
      return res.status(200).json({ success: true, skipped: true });
    }

    var revenueCatEventId = buildRevenueCatEventId(event);
    var claim = await claimWebhookEvent(db, revenueCatEventId, { eventType, appUserId });
    if (claim.duplicate) {
      console.log('[RevenueCat Webhook] Duplicate event ignored:', revenueCatEventId);
      return res.status(200).json({ success: true, duplicate: true });
    }

    // Skip anonymous RevenueCat IDs (start with $RCAnonymousID)
    if (!appUserId || appUserId.startsWith('$RCAnonymousID')) {
      console.log('[RevenueCat Webhook] Skipping anonymous user:', appUserId);
      await markWebhookEvent(db, revenueCatEventId, 'skipped', { reason: 'anonymous_user' });
      return res.status(200).json({ success: true, skipped: true });
    }

    var userRef = db.collection(COLLECTIONS.USERS).doc(appUserId);
    var userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn('[RevenueCat Webhook] User not found:', appUserId);
      await markWebhookEvent(db, revenueCatEventId, 'skipped', { reason: 'user_not_found' });
      return res.status(200).json({ success: true, userNotFound: true });
    }

    var subscriptionUpdate = {};

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        subscriptionUpdate = {
          isSubscribed: true,
          'subscription.status': 'active',
          'subscription.plan': productId,
          'subscription.store': store,
          'subscription.expiresAt': expirationDate,
          'subscription.purchasedAt': purchaseDate,
          'subscription.willRenew': true,
          'subscription.provider': 'revenuecat',
          'subscription.updatedAt': new Date().toISOString(),
        };
        // RENEWAL after a BILLING_ISSUE means the payment succeeded on retry.
        // Clear the billing issue marker so the user isn't stuck in a bad state.
        if (eventType === 'RENEWAL') {
          subscriptionUpdate['subscription.billingIssueAt'] = null;
        }
        break;

      case 'PRODUCT_CHANGE':
        subscriptionUpdate = {
          isSubscribed: true,
          'subscription.status': 'active',
          'subscription.plan': event.event.new_product_id || productId,
          'subscription.store': store,
          'subscription.expiresAt': expirationDate,
          'subscription.provider': 'revenuecat',
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'CANCELLATION':
        // User cancelled but still has access until expiration.
        // isSubscribed stays true — access continues until EXPIRATION event.
        subscriptionUpdate = {
          'subscription.willRenew': false,
          'subscription.cancelledAt': new Date().toISOString(),
          'subscription.updatedAt': new Date().toISOString(),
        };
        break;

      case 'EXPIRATION':
        subscriptionUpdate = {
          isSubscribed: false,
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

      case 'NON_RENEWING_PURCHASE': {
        // Fires for EVERY one-time product. Only the real 'lifetime' product
        // may grant permanent Pro access. Consumable products (full_report,
        // porondam_check, …) record a purchase credit instead — one credit
        // admits one generation of that product (see services/purchaseCredits).
        // Previously this branch set isSubscribed+isLifetime for ALL one-time
        // products, so a LKR 750 report purchase granted lifetime Pro.
        if (productId === 'lifetime') {
          subscriptionUpdate = {
            isSubscribed: true,
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
        }

        const credit = await addPurchaseCredit(appUserId, productId, {
          eventId: revenueCatEventId,
          store,
          purchaseDate,
          environment,
        });
        if (!credit) {
          console.warn('[RevenueCat Webhook] Unknown one-time product (no credit type):', productId);
          await markWebhookEvent(db, revenueCatEventId, 'skipped', { reason: 'unknown_one_time_product', productId });
          return res.status(200).json({ success: true, skipped: true });
        }
        await markWebhookEvent(db, revenueCatEventId, 'processed', {
          processedAt: new Date().toISOString(),
          creditId: credit.id,
          creditType: credit.type,
        });
        console.log('[RevenueCat Webhook] ✔ One-time purchase → credit for', appUserId, '(', productId, ')');
        return res.status(200).json({ success: true, credit: credit.type, eventId: revenueCatEventId });
      }

      default:
        console.log('[RevenueCat Webhook] Unhandled event type:', eventType);
        await markWebhookEvent(db, revenueCatEventId, 'skipped', { reason: 'unhandled_event_type' });
        return res.status(200).json({ success: true, unhandled: true });
    }

    // Update Firestore
    await userRef.update(subscriptionUpdate);
    await markWebhookEvent(db, revenueCatEventId, 'processed', { processedAt: new Date().toISOString() });
    console.log('[RevenueCat Webhook] ✔ Updated user:', appUserId, '→', eventType);

    res.status(200).json({ success: true, eventId: revenueCatEventId });
  } catch (err) {
    console.error('[RevenueCat Webhook] ✘ Error:', err.message);
    try {
      var failedEvent = req.body && req.body.event ? buildRevenueCatEventId(req.body) : null;
      var failedDb = getDb();
      if (failedEvent && failedDb) {
        await markWebhookEvent(failedDb, failedEvent, 'failed', { error: err.message });
      }
    } catch (_) {}
    notifyAlert('revenuecat_webhook_failed', {
      message: err.message,
      eventType: req.body?.event?.type || null,
      appUserId: req.body?.event?.app_user_id || null,
    }, { severity: 'critical', dedupeKey: 'revenuecat_webhook_failed:' + (req.body?.event?.type || 'unknown') }).catch(() => null);
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
