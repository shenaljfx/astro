/**
 * Firebase + Phone Auth Middleware
 * 
 * Supports both:
 * 1. Phone OTP JWT tokens (from /api/auth/verify-otp)
 * 2. Firebase ID tokens (legacy)
 * 
 * Attaches user info to req.user
 */

const { getAuth } = require('../config/firebase');

/**
 * Try to verify a phone JWT token
 */
function tryPhoneJwt(token) {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'grahachara-cosmic-secret-2025-dev';
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && decoded.type === 'phone-auth') {
      return {
        uid: decoded.uid,
        phone: decoded.phone,
        authType: 'phone',
        anonymous: false,
      };
    }
  } catch (e) { /* not a phone JWT */ }
  return null;
}

/**
 * Required auth — rejects if no valid token
 */
function requireAuth(req, res, next) {
  const auth = getAuth();
  
  // If Firebase not configured, allow anonymous with a guest UID
  if (!auth) {
    req.user = { uid: 'anonymous', email: null, anonymous: true };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  // Try phone JWT first
  const phoneUser = tryPhoneJwt(idToken);
  if (phoneUser) {
    req.user = phoneUser;
    return next();
  }
  
  // Try Firebase token
  auth.verifyIdToken(idToken)
    .then(decoded => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoURL: decoded.picture || null,
        authType: 'firebase',
        anonymous: false,
      };
      next();
    })
    .catch(err => {
      console.error('Auth verification failed:', err.message);
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}

/**
 * Optional auth — continues even without token, sets req.user to null or anonymous
 */
function optionalAuth(req, res, next) {
  const auth = getAuth();
  
  if (!auth) {
    req.user = { uid: 'anonymous', email: null, anonymous: true };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const idToken = authHeader.split('Bearer ')[1];

  // Try phone JWT first
  const phoneUser = tryPhoneJwt(idToken);
  if (phoneUser) {
    req.user = phoneUser;
    return next();
  }
  
  // Try Firebase token
  auth.verifyIdToken(idToken)
    .then(decoded => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        displayName: decoded.name || null,
        photoURL: decoded.picture || null,
        authType: 'firebase',
        anonymous: false,
      };
      next();
    })
    .catch(() => {
      req.user = null;
      next();
    });
}

module.exports = { requireAuth, optionalAuth };
