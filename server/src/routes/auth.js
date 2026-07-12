/**
 * Auth Routes — Google Sign-In + Subscription Management
 * 
 * Endpoints:
 * - POST /api/auth/google           — Verify Google/Firebase ID token and login/register
 * - POST /api/auth/unsubscribe      — Cancel subscription
 * - GET  /api/auth/subscription     — Check subscription status
 * - POST /api/auth/onboarding-complete — Complete onboarding with name + birth data
 * 
 * Payment is handled by RevenueCat via in-app purchases.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { getDb, getAuth, COLLECTIONS } = require('../config/firebase');
const { getPricing } = require('../config/pricing');
const { INPUT_LIMITS, sanitizeString } = require('../middleware/security');
const { revokeUserTokens } = require('../services/tokenRevocation');

// Google OAuth web client ID — MUST be set via env var; no fallback in production (boot guard enforces this)
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
if (!GOOGLE_WEB_CLIENT_ID) {
  console.warn('⚠️  GOOGLE_OAUTH_CLIENT_ID not set — Google token verification will fail');
}
const googleClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

// JWT secret — MUST be set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('⚠️  CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('   Set JWT_SECRET in .env with a strong random string (64+ chars)');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
const JWT_EXPIRES = '30d'; // Token valid for 30 days

// ─── Helper: Generate JWT for authenticated users ───────────────

function generateToken(uid, email, tokenVersion) {
  return jwt.sign(
    { uid, email, type: 'google-auth', tokenVersion: Number(tokenVersion || 0) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/**
 * Verify JWT token
 * Returns decoded payload or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// ─── Firestore helpers for Google users ─────────────────────────

async function findUserByUid(uid) {
  const db = getDb();
  if (!db) return null;

  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (doc.exists) {
      return { uid: doc.id, ...doc.data() };
    }
  } catch (e) {
    console.warn('[findUserByUid] lookup failed:', e.message);
  }
  return null;
}

async function createGoogleUser(uid, profile) {
  const db = getDb();

  const userData = {
    uid,
    email: profile.email || null,
    displayName: profile.displayName || 'Cosmic Seeker',
    photoURL: profile.photoURL || null,
    phone: null,
    birthData: null,
    location: { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
    preferences: {
      language: 'si',
      notifications: true,
      dailyPalapa: true,
      rahuKalayaAlerts: true,
      marakaApalaAlerts: true,
      transitAlerts: false,
      theme: 'cosmic',
    },
    isSubscribed: false,
    subscription: {
      status: 'pending',
      plan: null,
      subscribedAt: null,
      expiresAt: null,
      provider: null,
    },
    onboardingComplete: false,
    tokenVersion: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reportCount: 0,
    chatCount: 0,
  };

  if (db) {
    await db.collection(COLLECTIONS.USERS).doc(uid).set(userData);
  }
  return userData;
}

async function updateUserSubscription(uid, subscriptionData) {
  const db = getDb();
  if (!db) return null;

  await db.collection(COLLECTIONS.USERS).doc(uid).update({
    subscription: subscriptionData,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

// ─── Routes ─────────────────────────────────────────────────────

/**
 * POST /api/auth/google
 * Body: { idToken: "firebase-id-token", profile: { displayName, email, photoURL } }
 * 
 * Verifies the Firebase ID token (from Google Sign-In on mobile),
 * finds or creates the user, returns a JWT for subsequent API calls.
 */
router.post('/google', async (req, res) => {
  try {
    const { idToken, profile } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    // Verify the token — try Firebase ID token first, then raw Google ID token
    const auth = getAuth();
    let decodedToken = null;

    if (auth) {
      // 1) Try Firebase ID token (from web clients using signInWithCredential)
      try {
        decodedToken = await auth.verifyIdToken(idToken);
      } catch (verifyErr) {
        console.log('[auth/google] Firebase verifyIdToken failed, trying raw Google token...', verifyErr.code || verifyErr.message);

        // 2) Fallback: verify as raw Google ID token (from Android native sign-in)
        try {
          const ticket = await googleClient.verifyIdToken({
            idToken: idToken,
            audience: GOOGLE_WEB_CLIENT_ID,
          });
          const payload = ticket.getPayload();

          // Require verified email — do not auto-create users from unverified Google accounts
          if (!payload.email_verified) {
            return res.status(401).json({ error: 'Google account email not verified' });
          }

          // Look up or create a Firebase Auth user for this Google account
          let firebaseUser;
          try {
            firebaseUser = await auth.getUserByEmail(payload.email);
          } catch (lookupErr) {
            // User doesn't exist in Firebase Auth yet — create them
            firebaseUser = await auth.createUser({
              email: payload.email,
              displayName: payload.name || profile?.displayName || 'Cosmic Seeker',
              photoURL: payload.picture || profile?.photoURL || null,
            });
            console.log(`🆕 Created Firebase Auth user for Google account: ${payload.email}`);
          }

          decodedToken = {
            uid: firebaseUser.uid,
            email: payload.email,
            name: payload.name || profile?.displayName,
            picture: payload.picture || profile?.photoURL,
          };
          console.log('[auth/google] Verified raw Google ID token for:', payload.email);
        } catch (googleErr) {
          console.error('Both Firebase and Google token verification failed:', googleErr.message);
          return res.status(401).json({ error: 'Invalid or expired token' });
        }
      }
    } else {
      // No Firebase Admin — dev mode fallback
      console.warn('[auth/google] No Firebase Admin available — using dev mode');
      decodedToken = {
        uid: 'dev_' + (profile?.email || 'user').replace(/[^a-z0-9]/gi, '_'),
        email: profile?.email || 'dev@grahachara.com',
        name: profile?.displayName || 'Dev User',
        picture: profile?.photoURL || null,
      };
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || profile?.email || null;

    // Find or create user
    let user = await findUserByUid(uid);
    let isNewUser = false;

    if (!user) {
      user = await createGoogleUser(uid, {
        email: email,
        displayName: decodedToken.name || profile?.displayName || 'Cosmic Seeker',
        photoURL: decodedToken.picture || profile?.photoURL || null,
      });
      isNewUser = true;
      console.log(`🆕 New Google user created: ${email || uid}`);
    }

    // Generate our JWT token — stamp it with the user's current token version
    // so a later logout (which bumps the version) invalidates it server-side.
    const token = generateToken(uid, email, user.tokenVersion);

    res.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        birthData: user.birthData,
        subscription: user.subscription,
        isSubscribed: user.isSubscribed === true,
        onboardingComplete: user.onboardingComplete,
        preferences: user.preferences,
      },
      isNewUser,
    });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Server-side sign-out: bumps the user's tokenVersion so every JWT issued
 * before now is immediately rejected by enforceTokenNotRevoked. The client
 * still clears its local token; this makes a leaked/stolen token unusable
 * without waiting for the 30-day expiry. Idempotent and best-effort — a
 * failure here must never block the client's local sign-out.
 */
router.post('/logout', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded || !decoded.uid) {
      // No valid token — nothing to revoke; treat as success so sign-out is smooth.
      return res.json({ success: true });
    }
    await revokeUserTokens(decoded.uid);
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    // Don't surface an error — the device will clear local state regardless.
    res.json({ success: true });
  }
});

/**
 * POST /api/auth/unsubscribe
 * Cancel monthly subscription
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    const db = getDb();
    if (db) {
      await updateUserSubscription(decoded.uid, {
        status: 'cancelled',
        plan: 'monthly',
        amount: getPricing('LKR').subscription.amount,
        currency: 'LKR',
        cancelledAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Subscription cancelled. You retain access until end of billing period.' });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Unsubscription failed' });
  }
});

/**
 * GET /api/auth/subscription
 * Check current subscription status
 */
router.get('/subscription', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    // Mock payments bypass — return active subscription in dev
    if (process.env.MOCK_PAYMENTS === 'true') {
      return res.json({
        success: true,
        isSubscribed: true,
        subscription: { status: 'active', plan: 'mock_pro', store: 'mock' },
      });
    }

    const db = getDb();
    if (!db) {
      return res.json({
        success: true,
        isSubscribed: true,
        subscription: { status: 'active', plan: 'free-dev' },
      });
    }

    const doc = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const user = doc.data();
    const subscription = user.subscription || { status: 'none' };

    // Check if subscription has expired — report it to the client but do NOT
    // mutate Firestore in a GET handler. Subscription state transitions are
    // the webhook's responsibility. Writing here caused 500s when Firestore
    // was unavailable and created race conditions with webhook updates.
    if (subscription.status === 'active' && subscription.expiresAt) {
      const now = new Date();
      const expires = new Date(subscription.expiresAt);
      if (now > expires) {
        // Add a grace period: auto-renewing subscriptions may have a short gap
        // between period end and renewal webhook. Give 24 hours before reporting
        // as expired to avoid false negatives during the renewal window.
        const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
        if (now - expires > GRACE_PERIOD_MS) {
          subscription.status = 'expired';
          subscription.needsRenewal = true;
        }
        // Within grace period: keep status='active' — renewal may be in progress
      }
    }

    // isSubscribed is the authoritative flag set by the webhook.
    // If the field doesn't exist yet (pre-migration user), derive it.
    var isSubscribed = user.isSubscribed;
    if (isSubscribed === undefined) {
      isSubscribed = subscription.status === 'active';
      // Lazy migration: backfill the field so next read is instant
      db.collection(COLLECTIONS.USERS).doc(decoded.uid).update({ isSubscribed }).catch(function(e) {
        console.warn('[subscription] Lazy migration write failed:', e.message);
      });
    }

    res.json({
      success: true,
      isSubscribed,
      subscription,
      monthlyRate: getPricing('LKR').subscription.amount,
      currency: 'LKR',
    });
  } catch (err) {
    console.error('Subscription check error:', err);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
});

/**
 * POST /api/auth/onboarding-complete
 * Mark onboarding as complete, save birth data + name
 * Body: { displayName, birthData: { dateTime, lat, lng, locationName, timezone } }
 */
router.post('/onboarding-complete', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    const { displayName, birthData, language } = req.body;
    const db = getDb();

    // Sanitize free-text inputs
    const safeName = sanitizeString(displayName, INPUT_LIMITS.name);

    if (db) {
      const updates = {
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      };
      if (safeName) updates.displayName = safeName;
      if (language && (language === 'en' || language === 'si')) {
        updates['preferences.language'] = language;
      }
      if (birthData) {
        updates.birthData = {
          dateTime: birthData.dateTime,
          lat: birthData.lat || 6.9271,
          lng: birthData.lng || 79.8612,
          locationName: sanitizeString(birthData.locationName, INPUT_LIMITS.locationName) || '',
          timezone: sanitizeString(birthData.timezone, INPUT_LIMITS.timezone) || 'Asia/Colombo',
        };
      }
      await db.collection(COLLECTIONS.USERS).doc(decoded.uid).update(updates);
    }

    res.json({ success: true, message: 'Onboarding complete' });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// ─── Token extraction helper ────────────────────────────────────

function extractUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return verifyToken(token);
}

// Export verifyToken for use in middleware
router.verifyToken = verifyToken;
router.extractUser = extractUser;

module.exports = router;
