/**
 * Subscription Middleware
 * 
 * Checks if the user has an active daily subscription.
 * Used to gate premium features (AI reports, unlimited chat, etc.)
 * 
 * Usage:
 *   router.post('/premium-endpoint', phoneAuth, requireSubscription, handler);
 */

const { getDb, COLLECTIONS } = require('../config/firebase');

/**
 * Phone-based auth middleware
 * Extracts and verifies JWT from phone auth system
 * Falls back to Firebase token verification
 */
function phoneAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  // Try phone JWT first
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'grahachara-cosmic-secret-2025-dev';
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.type === 'phone-auth') {
      req.user = {
        uid: decoded.uid,
        phone: decoded.phone,
        authType: 'phone',
      };
      return next();
    }
  } catch (e) {
    // Not a phone JWT, try Firebase
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

  // No valid auth
  req.user = { uid: 'anonymous', authType: 'anonymous' };
  next();
}

/**
 * Require active subscription
 * Returns 402 if no active subscription
 */
function requireSubscription(req, res, next) {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDb();
  if (!db) {
    // No database — allow in dev mode
    return next();
  }

  db.collection(COLLECTIONS.USERS).doc(req.user.uid).get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = doc.data();
      const sub = user.subscription;

      // No subscription at all
      if (!sub || sub.status === 'none' || sub.status === 'pending') {
        return res.status(402).json({
          error: 'Subscription required',
          message: 'Please subscribe to access this feature. Only LKR 240/month via PayHere.',
          subscriptionRequired: true,
        });
      }

      // Cancelled subscription
      if (sub.status === 'cancelled') {
        return res.status(402).json({
          error: 'Subscription cancelled',
          message: 'Your subscription has been cancelled. Please re-subscribe to continue.',
          subscriptionRequired: true,
        });
      }

      // Payment failed (recurring charge failed)
      if (sub.status === 'payment_failed') {
        return res.status(402).json({
          error: 'Payment failed',
          message: 'Your last payment failed. Please update your payment method or re-subscribe.',
          subscriptionRequired: true,
          paymentFailed: true,
        });
      }

      // Check if expired
      if (sub.status === 'active' && sub.expiresAt) {
        const now = new Date();
        const expires = new Date(sub.expiresAt);
        if (now > expires) {
          return res.status(402).json({
            error: 'Subscription expired',
            message: 'Your monthly subscription has expired. Please re-subscribe via PayHere.',
            subscriptionRequired: true,
            needsRenewal: true,
          });
        }
      }

      // Active and valid
      if (sub.status === 'active') {
        req.subscription = sub;
        return next();
      }

      // Any other status
      return res.status(402).json({
        error: 'Subscription required',
        subscriptionRequired: true,
      });
    })
    .catch(err => {
      console.error('Subscription check error:', err);
      // On error, allow access (graceful degradation)
      next();
    });
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
  optionalSubscription,
};
