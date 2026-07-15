/**
 * subscriptionReconcile — self-heal a user's subscription flag by replaying the
 * RevenueCat webhook events we already stored (revenuecatWebhookEvents).
 *
 * Why this exists: the live webhook trusts a single delivery. If an event
 * arrives before the user doc exists (returns 200 user_not_found, no retry) or
 * is otherwise missed, the subscriber is never marked and nothing heals it.
 * Every event IS stored though, so we can fold a user's event history back into
 * the correct state on demand (admin "Reconcile" button).
 *
 * computeStateFromEvents mirrors the switch in routes/revenuecat.js. Keep the
 * two in sync — a test pins the mapping.
 */
const { getDb, COLLECTIONS } = require('../config/firebase');

function tsOf(e) {
  return Number(e.eventTimestampMs) || Date.parse(e.receivedAt) || 0;
}

/**
 * Fold stored events (any order) into a final subscription state, or null if
 * there are no subscription-lifecycle events (e.g. only one-time purchases).
 */
function computeStateFromEvents(events) {
  const ordered = (events || []).filter((e) => e && e.eventType).slice().sort((a, b) => tsOf(a) - tsOf(b));
  let st = null;

  for (const e of ordered) {
    switch (e.eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
        st = {
          isSubscribed: true,
          status: 'active',
          plan: e.newProductId || e.productId || (st && st.plan) || null,
          store: e.store || (st && st.store) || null,
          expiresAt: e.subExpiresAt || (st && st.expiresAt) || null,
        };
        break;
      case 'CANCELLATION': // cancelled but retains access until expiration
        st = { ...(st || { isSubscribed: true }), isSubscribed: true, status: 'active', cancelled: true };
        break;
      case 'EXPIRATION':
        st = { ...(st || {}), isSubscribed: false, status: 'expired' };
        break;
      case 'BILLING_ISSUE':
        st = { ...(st || { isSubscribed: false }), status: 'payment_failed' };
        break;
      case 'NON_RENEWING_PURCHASE':
        if (e.productId === 'lifetime') st = { isSubscribed: true, status: 'active', plan: 'lifetime', lifetime: true, expiresAt: null };
        break; // other one-time products are credits, not subscription state
      default:
        break;
    }
  }

  if (!st) return null;

  // Safety net: if we believe active but the known expiry has already passed
  // (and it isn't lifetime), treat as expired — the EXPIRATION/RENEWAL webhook
  // may have been missed too, and we must never re-grant a lapsed subscription.
  if (st.isSubscribed === true && !st.lifetime && st.expiresAt && new Date(st.expiresAt).getTime() < Date.now()) {
    st = { ...st, isSubscribed: false, status: 'expired', expiredByKnownExpiry: true };
  }
  return st;
}

/**
 * Recompute a user's subscription from stored webhook history and write the
 * corrected flag. Returns a summary (never throws for "nothing to do").
 */
async function reconcileUserFromHistory(uid) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');

  const snap = await db.collection(COLLECTIONS.REVENUECAT_WEBHOOK_EVENTS)
    .where('appUserId', '==', uid).limit(200).get();
  const events = snap.docs.map((d) => d.data());

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();
  const before = userDoc.exists
    ? { isSubscribed: userDoc.data().isSubscribed, status: userDoc.data().subscription && userDoc.data().subscription.status }
    : null;

  const state = computeStateFromEvents(events);
  if (!userDoc.exists) return { applied: false, eventsFound: events.length, reason: 'User doc does not exist', before };
  if (!state) {
    return {
      applied: false,
      eventsFound: events.length,
      reason: events.length
        ? 'No subscription-lifecycle events for this user (only one-time purchases?). Use Grant Pro if they are genuinely subscribed.'
        : 'No RevenueCat events stored for this user — their purchase was likely made anonymously or never reached us. Verify in RevenueCat, then Grant Pro.',
      before,
    };
  }

  const update = {
    isSubscribed: state.isSubscribed,
    'subscription.status': state.status,
    'subscription.reconciledAt': new Date().toISOString(),
    'subscription.reconciledFrom': 'webhookHistory',
  };
  if (state.plan) update['subscription.plan'] = state.plan;
  if (state.store) update['subscription.store'] = state.store;
  if (state.expiresAt) update['subscription.expiresAt'] = state.expiresAt;

  await userRef.update(update);
  return {
    applied: true,
    eventsFound: events.length,
    before,
    after: { isSubscribed: state.isSubscribed, status: state.status },
    changed: !before || before.isSubscribed !== state.isSubscribed,
  };
}

/**
 * Authoritative reconcile: ask RevenueCat directly whether the user is active
 * right now (independent of stored webhooks) and heal the flag.
 *
 * UPGRADE-ONLY by design: if RevenueCat reports active → set isSubscribed=true.
 * If it reports NOT active (or has no record), we DON'T touch the flag — that
 * avoids revoking admin-granted Pro / users whose app_user_id differs, and is
 * safe to call on every app launch. Real revocation stays with the EXPIRATION
 * webhook and admin Revoke Pro. Fails safe on any API error (no change).
 */
async function reconcileFromRevenueCat(uid) {
  const rc = require('./revenueCatClient');
  if (!rc.isConfigured()) {
    return { applied: false, source: 'revenuecat', reason: 'RevenueCat API key not configured on the server (set REVENUECAT_API_KEY).' };
  }
  const db = getDb();
  if (!db) throw new Error('Database unavailable');

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return { applied: false, source: 'revenuecat', reason: 'User doc does not exist' };
  const before = { isSubscribed: userDoc.data().isSubscribed, status: userDoc.data().subscription && userDoc.data().subscription.status };

  let info;
  try {
    info = await rc.getSubscriber(uid);
  } catch (e) {
    return { applied: false, source: 'revenuecat', reason: `RevenueCat lookup failed: ${e.message}`, before, error: true };
  }

  if (!info.active) {
    return {
      applied: false,
      source: 'revenuecat',
      reason: info.found
        ? 'RevenueCat reports no active entitlement for this user (genuinely not subscribed, or lapsed).'
        : 'RevenueCat has no record of this app_user_id — purchase was anonymous or under a different ID.',
      before,
      rcFound: info.found,
    };
  }

  const update = {
    isSubscribed: true,
    'subscription.status': 'active',
    'subscription.reconciledAt': new Date().toISOString(),
    'subscription.reconciledFrom': 'revenuecatApi',
  };
  if (info.product) update['subscription.plan'] = info.product;
  if (info.store) update['subscription.store'] = info.store;
  if (info.latestExpiry) update['subscription.expiresAt'] = info.latestExpiry;

  await userRef.update(update);
  return {
    applied: true,
    source: 'revenuecat',
    before,
    after: { isSubscribed: true, status: 'active', expiresAt: info.latestExpiry, plan: info.product },
    entitlements: info.entitlements,
    changed: !before || before.isSubscribed !== true,
  };
}

module.exports = { computeStateFromEvents, reconcileUserFromHistory, reconcileFromRevenueCat };
