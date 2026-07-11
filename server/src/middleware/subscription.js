/**
 * Subscription Middleware
 * 
 * Checks if the user has an active subscription.
 * Used to gate premium features (AI reports, unlimited chat, etc.)
 * 
 * Usage:
 *   router.post('/premium-endpoint', phoneAuth, requireSubscription, handler);
 */

const { getDb, COLLECTIONS } = require('../config/firebase');
const { detectCurrency, getPricing } = require('../config/pricing');

/**
 * Auth middleware — JWT + Firebase token verification
 * Extracts and verifies JWT from Google/phone auth system
 * Falls back to Firebase Admin token verification
 */
function phoneAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  // Try our JWT first (google-auth or legacy phone-auth)
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      // No JWT_SECRET configured — skip JWT verification
      throw new Error('JWT_SECRET not set');
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && (decoded.type === 'google-auth' || decoded.type === 'phone-auth')) {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        phone: decoded.phone || null,
        authType: decoded.type === 'google-auth' ? 'google' : 'phone',
      };
      return next();
    }
  } catch (e) {
    // Not our JWT, try Firebase
  }

  // Try Firebase Admin token
  try {
    const { getAuth } = require('../config/firebase');
    const auth = getAuth();
    if (auth) {
      auth.verifyIdToken(token)
        .then(decoded => {
          req.user = {
            uid: decoded.uid,
            email: decoded.email || null,
            authType: 'firebase',
          };
          next();
        })
        .catch(() => {
          req.user = null;
          next();
        });
      return;
    }
  } catch (e) { /* ignore */ }

  // No valid auth — fail closed
  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Require active subscription
 * 
 * Uses the `isSubscribed` boolean flag on the user document as the single
 * source of truth. This flag is set exclusively by the RevenueCat webhook.
 * 
 * Lazy migration: if `isSubscribed` is undefined (pre-migration user),
 * derives the value from `subscription.status` and backfills the field.
 * 
 * Returns 402 if not subscribed.
 */
function requireSubscription(req, res, next) {
  // Mock payments bypass — skip all subscription checks in dev
  if (process.env.MOCK_PAYMENTS === 'true') {
    req.subscription = { status: 'active', plan: 'mock_pro', store: 'mock' };
    return next();
  }

  if (!req.user || req.user.authType === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDb();
  if (!db) {
    // No database — allow in dev mode only
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Subscription service unavailable' });
    }
    return next();
  }

  db.collection(COLLECTIONS.USERS).doc(req.user.uid).get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = doc.data();
      var isSubscribed = user.isSubscribed;

      // Lazy migration: if the field doesn't exist yet, derive from
      // subscription.status and backfill the document for future reads.
      if (isSubscribed === undefined) {
        const sub = user.subscription;
        isSubscribed = !!(sub && sub.status === 'active');
        // Best-effort backfill — don't block the request
        db.collection(COLLECTIONS.USERS).doc(req.user.uid)
          .update({ isSubscribed })
          .catch(e => console.warn('[subscription] Lazy migration failed:', e.message));
      }

      if (isSubscribed === true) {
        req.subscription = user.subscription || { status: 'active' };
        return next();
      }

      // Not subscribed — return 402 with pricing info
      const currency = detectCurrency(req);
      const pricing = getPricing(currency);
      return res.status(402).json({
        error: 'Subscription required',
        message: 'Please subscribe to access this feature.',
        subscriptionRequired: true,
        pricing: pricing.subscription,
      });
    })
    .catch(err => {
      console.error('Subscription check error:', err);
      return res.status(503).json({
        error: 'Subscription verification temporarily unavailable',
        message: 'Please try again in a moment.',
      });
    });
}

/**
 * Resolve the isSubscribed flag from a user document, deriving from
 * subscription.status for pre-migration documents (mirrors the lazy
 * migration in requireSubscription, without the backfill write).
 */
function resolveIsSubscribed(user) {
  if (!user) return false;
  if (user.isSubscribed !== undefined) return user.isSubscribed === true;
  return !!(user.subscription && user.subscription.status === 'active');
}

/**
 * Require an active subscription OR a purchase credit for a one-time product.
 *
 * Used on the generation routes that one-time SKUs pay for (full report,
 * porondam). Grants access when the user:
 *   1. has an active subscription                    → req.accessVia = 'subscription'
 *   2. has a retryable pending generation entitlement → req.accessVia = 'entitlement-retry'
 *      (they already paid; generation failed; retries are free)
 *   3. has an unconsumed purchase credit              → req.accessVia = 'credit'
 *      (req.purchaseCredit is attached; the route consumes it when it
 *       creates a NEW entitlement — see consumeCredit)
 * Otherwise → 402 with both subscription and one-time pricing.
 *
 * @param {'report'|'porondam'} creditType - credit/entitlement type vocabulary
 * @param {'full_report'|'porondam_check'} productKey - pricing config key for the 402 payload
 */
function requireSubscriptionOrCredit(creditType, productKey) {
  return async function (req, res, next) {
    // Mock payments bypass — mirror requireSubscription
    if (process.env.MOCK_PAYMENTS === 'true') {
      req.subscription = { status: 'active', plan: 'mock_pro', store: 'mock' };
      req.accessVia = 'subscription';
      return next();
    }

    if (!req.user || !req.user.uid || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = getDb();
    if (!db) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Subscription service unavailable' });
      }
      req.accessVia = 'dev';
      return next();
    }

    try {
      const doc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = doc.data();

      if (resolveIsSubscribed(user)) {
        req.subscription = user.subscription || { status: 'active' };
        req.accessVia = 'subscription';
        return next();
      }

      // Paid, generation failed earlier → free retry (input-bound matching
      // happens in the route via createOrResumeEntitlement).
      const { hasPendingEntitlement } = require('./entitlements');
      if (await hasPendingEntitlement(req.user.uid, creditType)) {
        req.accessVia = 'entitlement-retry';
        return next();
      }

      const { getAvailableCredit } = require('../services/purchaseCredits');
      const credit = await getAvailableCredit(req.user.uid, creditType);
      if (credit) {
        req.purchaseCredit = credit;
        req.accessVia = 'credit';
        return next();
      }

      const currency = detectCurrency(req);
      const pricing = getPricing(currency);
      // Map the store product id → its pricing config key for the 402 payload.
      const PRODUCT_PRICING_KEY = { full_report: 'report', porondam_check: 'porondam', baby_kendara: 'babyKendara' };
      const pricingKey = PRODUCT_PRICING_KEY[productKey];
      return res.status(402).json({
        error: 'Subscription required',
        message: 'Subscribe, or purchase this item once, to access this feature.',
        subscriptionRequired: true,
        pricing: pricing.subscription,
        oneTime: pricingKey && pricing[pricingKey]
          ? { productId: productKey, ...pricing[pricingKey] }
          : null,
      });
    } catch (err) {
      console.error('Subscription/credit check error:', err);
      return res.status(503).json({
        error: 'Subscription verification temporarily unavailable',
        message: 'Please try again in a moment.',
      });
    }
  };
}

/**
 * Optional subscription check — doesn't block, just attaches info
 */
function optionalSubscription(req, res, next) {
  if (!req.user || !req.user.uid || req.user.uid === 'anonymous') {
    req.subscription = null;
    return next();
  }

  const db = getDb();
  if (!db) {
    req.subscription = { status: 'active', plan: 'free-dev' };
    return next();
  }

  db.collection(COLLECTIONS.USERS).doc(req.user.uid).get()
    .then(doc => {
      if (doc.exists) {
        req.subscription = doc.data().subscription || null;
      } else {
        req.subscription = null;
      }
      next();
    })
    .catch(() => {
      req.subscription = null;
      next();
    });
}

module.exports = {
  phoneAuth,
  requireSubscription,
  requireSubscriptionOrCredit,
  optionalSubscription,
};
