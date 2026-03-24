/**
 * Auth Routes — Phone OTP Login + Subscription Management (PayHere)
 * 
 * Endpoints:
 * - POST /api/auth/send-otp        — Send OTP to phone number
 * - POST /api/auth/verify-otp      — Verify OTP and login/register
 * - POST /api/auth/subscribe       — (Legacy) Redirects to PayHere flow
 * - POST /api/auth/unsubscribe     — Cancel subscription
 * - GET  /api/auth/subscription    — Check subscription status
 * 
 * Payment is now handled by PayHere via /api/payhere/* routes.
 * This file only handles OTP authentication.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
  sendOtp,
  verifyOtp,
  normalizePhone,
  MOCK_MODE,
} = require('../services/ideamart');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { MONTHLY_AMOUNT } = require('../services/payhere');

// JWT secret — in production, use a strong random secret from env
const JWT_SECRET = process.env.JWT_SECRET || 'grahachara-cosmic-secret-2025-dev';
const JWT_EXPIRES = '30d'; // Token valid for 30 days

// ─── Helper: Generate JWT for phone-based auth ──────────────────

function generateToken(uid, phone) {
  return jwt.sign(
    { uid, phone, type: 'phone-auth' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/**
 * Verify JWT token from phone auth
 * Returns decoded payload or null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// ─── Firestore helpers for phone users ──────────────────────────

async function findUserByPhone(phone) {
  const db = getDb();
  if (!db) return null;

  const normalized = normalizePhone(phone);

  // Direct doc lookup by deterministic ID (fast, no index needed)
  const docId = 'phone_' + normalized;
  try {
    const docRef = await db.collection(COLLECTIONS.USERS).doc(docId).get();
    if (docRef.exists) {
      return { uid: docRef.id, ...docRef.data() };
    }
  } catch (e) {
    console.warn('[findUserByPhone] direct lookup failed:', e.message);
  }

  // Fallback: query by phone field (requires index)
  try {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('phone', '==', normalized)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { uid: doc.id, ...doc.data() };
    }
  } catch (e) {
    console.warn('[findUserByPhone] query fallback failed:', e.message);
  }

  return null;
}

async function createPhoneUser(phone, subscriberId) {
  const db = getDb();
  const normalized = normalizePhone(phone);
  const uid = 'phone_' + normalized;

  const userData = {
    uid,
    phone: normalized,
    subscriberId: subscriberId || null, // Legacy Ideamart field, kept for compat
    displayName: 'Cosmic Seeker',
    email: null,
    photoURL: null,
    birthData: null,
    location: { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
    preferences: {
      language: 'si',
      notifications: true,
      theme: 'cosmic',
    },
    subscription: {
      status: 'pending', // pending | active | cancelled | expired | payment_failed
      plan: 'monthly',
      amount: MONTHLY_AMOUNT,
      currency: 'LKR',
      subscribedAt: null,
      lastChargedAt: null,
      expiresAt: null,
      payherePaymentId: null,
      payhereSubscriptionId: null,
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

// ─── In-memory OTP reference store (maps phone → referenceNo) ──
// In production, use Redis or Firestore
const otpRefs = new Map();

// ─── Routes ─────────────────────────────────────────────────────

/**
 * POST /api/auth/send-otp
 * Body: { phone: "0771234567" }
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 11) {
      return res.status(400).json({ error: 'Invalid phone number. Use format: 07X XXXXXXX' });
    }

    const result = await sendOtp(phone);

    if (result.success) {
      // Store referenceNo mapped to phone for verification step
      otpRefs.set(normalized, {
        referenceNo: result.referenceNo,
        sentAt: Date.now(),
        otp: result._devOtp, // Store OTP for dev retrieval
      });

      const response = {
        success: true,
        message: 'OTP sent successfully',
        referenceNo: result.referenceNo,
        phone: normalized.substring(0, 4) + '****' + normalized.substring(normalized.length - 3),
      };

      // In mock mode, include OTP for testing
      if (result.mock && result._devOtp) {
        response._devOtp = result._devOtp;
        response.mock = true;
      }

      return res.json(response);
    }

    // Handle "already registered" — user can still login
    if (result.alreadyRegistered) {
      // For already registered users, we still need to send OTP
      // This might mean the user is already subscribed via Ideamart
      return res.status(409).json({
        error: 'Phone number already registered with carrier',
        statusCode: result.statusCode,
        canLogin: true,
      });
    }

    return res.status(400).json({
      error: result.error || 'Failed to send OTP',
      statusCode: result.statusCode,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Body: { phone: "0771234567", otp: "123456", referenceNo: "abc..." }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, referenceNo } = req.body;
    console.log('🔑 verify-otp request:', { phone, otp, referenceNo: referenceNo?.substring(0, 8) + '...' });

    if (!phone || !otp || !referenceNo) {
      console.log('❌ Missing fields:', { hasPhone: !!phone, hasOtp: !!otp, hasRef: !!referenceNo });
      return res.status(400).json({ error: 'Phone, OTP, and referenceNo are required' });
    }

    const result = await verifyOtp(referenceNo, otp, phone);

    if (!result.success) {
      console.log('❌ OTP verification failed:', result.error, result.statusCode);
      return res.status(400).json({
        error: result.error || 'Verification failed',
        statusCode: result.statusCode,
      });
    }

    // OTP verified! Now find or create the user
    const normalized = normalizePhone(phone);
    let user = await findUserByPhone(normalized);
    let isNewUser = false;

    if (!user) {
      // New user — create profile
      user = await createPhoneUser(normalized, result.subscriberId);
      isNewUser = true;
      console.log(`🆕 New phone user created: ${normalized}`);
    } else {
      // Update subscriberId if changed
      const db = getDb();
      if (db && result.subscriberId) {
        await db.collection(COLLECTIONS.USERS).doc(user.uid).update({
          subscriberId: result.subscriberId,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Generate JWT token
    const token = generateToken(user.uid, normalized);

    // Clean up OTP reference
    otpRefs.delete(normalized);

    res.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        phone: normalized,
        displayName: user.displayName,
        birthData: user.birthData,
        subscription: user.subscription,
        onboardingComplete: user.onboardingComplete,
        preferences: user.preferences,
      },
      isNewUser,
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/subscribe
 * Legacy endpoint — redirects to PayHere subscription flow.
 * The actual subscription is handled by /api/payhere/initiate-subscription
 * Headers: Authorization: Bearer <jwt>
 */
router.post('/subscribe', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    // Direct the client to use the PayHere flow instead
    res.json({
      success: false,
      usePayHere: true,
      message: 'Please use the PayHere payment flow. Call POST /api/payhere/initiate-subscription to start.',
      monthlyRate: MONTHLY_AMOUNT,
      currency: 'LKR',
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Subscription failed' });
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
 * POST /api/auth/renew
 * Legacy endpoint — PayHere handles auto-renewal via recurring billing.
 * If subscription expired, user should re-subscribe via PayHere.
 */
router.post('/renew', async (req, res) => {
  try {
    const decoded = extractUser(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    // PayHere auto-renews monthly — user should not need to manually renew
    res.json({
      success: false,
      usePayHere: true,
      message: 'Subscriptions auto-renew monthly via PayHere. If expired, please re-subscribe.',
      monthlyRate: MONTHLY_AMOUNT,
    });
  } catch (err) {
    console.error('Renew error:', err);
    res.status(500).json({ error: 'Renewal failed' });
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

/**
 * GET /api/auth/dev-otp/:phone
 * Retrieve last sent OTP for phone number (DEV MODE ONLY)
 */
router.get('/dev-otp/:phone', (req, res) => {
  // Only allow in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_OTP) {
    return res.status(404).json({ error: 'Not available' });
  }

  const { phone } = req.params;
  const decodedPhone = decodeURIComponent(phone);
  const normalized = normalizePhone(decodedPhone);
  
  const record = otpRefs.get(normalized);
  
  if (record && record.otp) {
    return res.json({ 
      success: true, 
      phone: normalized, 
      otp: record.otp 
    });
  }

  // Also check if we can generate a mock one on the fly? No, that would be confusing.
  // Instead, return not found.
  return res.status(404).json({ 
    error: 'No active OTP found for this number',
    phone: normalized
  });
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
