/**
 * Firebase + Google Auth Middleware
 * 
 * Supports both:
 * 1. Google Auth JWT tokens (from /api/auth/google)
 * 2. Firebase ID tokens (direct)
 * 
 * Attaches user info to req.user
 */

const { getAuth } = require('../config/firebase');

/**
 * Try to verify our app JWT token (google-auth or legacy phone-auth)
 */
function tryAppJwt(token) {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'grahachara-cosmic-secret-2025-dev';
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded && (decoded.type === 'google-auth' || decoded.type === 'phone-auth')) {
      return {
        uid: decoded.uid,
        email: decoded.email || null,
        phone: decoded.phone || null,
        authType: decoded.type === 'google-auth' ? 'google' : 'phone',
        anonymous: false,
      };
    }
  } catch (e) { /* not our JWT */ }
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

  // Try app JWT first (Google auth)
  const appUser = tryAppJwt(idToken);
  if (appUser) {
    req.user = appUser;
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

  // Try app JWT first (Google auth)
  const appUser = tryAppJwt(idToken);
  if (appUser) {
    req.user = appUser;
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
