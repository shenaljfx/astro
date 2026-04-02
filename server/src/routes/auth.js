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
const { getDb, getAuth, COLLECTIONS } = require('../config/firebase');

// JWT secret — MUST be set via environment variable in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('⚠️  CRITICAL: JWT_SECRET environment variable is not set!');
  console.error('   Set JWT_SECRET in .env with a strong random string (64+ chars)');
  console.error('   Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
}
const JWT_EXPIRES = '30d'; // Token valid for 30 days

// ─── Helper: Generate JWT for authenticated users ───────────────

function generateToken(uid, email) {
  return jwt.sign(
    { uid, email, type: 'google-auth' },
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
      theme: 'cosmic',
    },
    subscription: {
      status: 'pending',
      plan: null,
      subscribedAt: null,
      expiresAt: null,
      provider: null,
    },
    onboardingComplete: false,
    tokenBalance: 0,
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

    // Verify the Firebase ID token
    const auth = getAuth();
    let decodedToken = null;

    if (auth) {
      try {
        decodedToken = await auth.verifyIdToken(idToken);
      } catch (verifyErr) {
        console.error('Firebase token verification failed:', verifyErr.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else {
      // No Firebase Admin — dev mode fallback
      console.warn('[auth/google] No Firebase Admin available — using dev mode');
      // In dev mode, create a mock decoded token from the profile
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

    // Generate our JWT token
    const token = generateToken(uid, email);

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
        amount: MONTHLY_AMOUNT,
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

    const db = getDb();
    if (!db) {
      return res.json({
        success: true,
        subscription: { status: 'active', plan: 'free-dev' },
      });
    }

    const doc = await db.collection(COLLECTIONS.USERS).doc(decoded.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const user = doc.data();
    const subscription = user.subscription || { status: 'none' };

    // Check if subscription has expired
    if (subscription.status === 'active' && subscription.expiresAt) {
      const now = new Date();
      const expires = new Date(subscription.expiresAt);
      if (now > expires) {
        subscription.status = 'expired';
        subscription.needsRenewal = true;
        await updateUserSubscription(decoded.uid, subscription);
      }
    }

    res.json({
      success: true,
      subscription,
      monthlyRate: MONTHLY_AMOUNT,
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

    if (db) {
      const updates = {
        onboardingComplete: true,
        updatedAt: new Date().toISOString(),
      };
      if (displayName) updates.displayName = displayName;
      if (language && (language === 'en' || language === 'si')) {
        updates['preferences.language'] = language;
      }
      if (birthData) {
        updates.birthData = {
          dateTime: birthData.dateTime,
          lat: birthData.lat || 6.9271,
          lng: birthData.lng || 79.8612,
          locationName: birthData.locationName || '',
          timezone: birthData.timezone || 'Asia/Colombo',
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
