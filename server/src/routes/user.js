/**
 * User Routes
 * 
 * Endpoints:
 * - POST /api/user/profile     — Create/update user profile
 * - GET  /api/user/profile      — Get current user profile
 * - PUT  /api/user/birth-data   — Update birth data
 * - PUT  /api/user/preferences  — Update preferences
 * - GET  /api/user/reports      — Get saved reports
 * - GET  /api/user/chats        — Get chat history
 * - GET  /api/user/porondam     — Get porondam history
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireSubscription } = require('../middleware/subscription');
const { INPUT_LIMITS, sanitizeString } = require('../middleware/security');
const { getBucket } = require('../config/firebase');
const {
  upsertUser,
  getUser,
  updateUserProfile,
  updateBirthData,
  updatePreferences,
  getUserReports,
  getUserChats,
  getUserPorondamHistory,
} = require('../models/firestore');

// Avatar upload limits — the client resizes to a small square before sending,
// so anything larger than this is almost certainly abuse or a client bug.
const AVATAR_MAX_BYTES = 400 * 1024; // 400 KB decoded (stays under the 500 KB body limit)
const AVATAR_MIME_EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const BIRTH_TIME_EDIT_LIMIT = 2;
const SRI_LANKA_OFFSET_MINUTES = 330;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getSriLankaMonthParts(date = new Date()) {
  const slt = new Date(date.getTime() + SRI_LANKA_OFFSET_MINUTES * 60000);
  return {
    year: slt.getUTCFullYear(),
    month: slt.getUTCMonth() + 1,
  };
}

function getSriLankaMonthKey(date = new Date()) {
  const parts = getSriLankaMonthParts(date);
  return `${parts.year}-${pad2(parts.month)}`;
}

function getNextSriLankaMonthResetIso(date = new Date()) {
  const parts = getSriLankaMonthParts(date);
  const nextMonthUtc = Date.UTC(parts.year, parts.month, 1, 0, 0, 0) - SRI_LANKA_OFFSET_MINUTES * 60000;
  return new Date(nextMonthUtc).toISOString();
}

function getBirthTimeKey(dateTime) {
  if (!dateTime) return null;
  const text = String(dateTime);
  const match = text.match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${pad2(parsed.getUTCHours())}:${pad2(parsed.getUTCMinutes())}`;
}

/**
 * POST /api/user/profile
 * Create or update user profile after sign-in
 */
router.post('/profile', requireAuth, async (req, res) => {
  try {
    const safeName = sanitizeString(req.user.displayName || req.body.displayName, INPUT_LIMITS.name);
    const safeEmail = sanitizeString(req.user.email || req.body.email, 254);
    const safePhoto = sanitizeString(req.user.photoURL || req.body.photoURL, 500);
    const safeLanguage = sanitizeString(req.body.language, 10);
    const validLangs = ['en', 'si', 'ta', 'singlish'];
    const user = await upsertUser(req.user.uid, {
      displayName: safeName || 'Cosmic Seeker',
      email: safeEmail || null,
      photoURL: safePhoto || null,
      birthData: req.body.birthData || null,
      location: req.body.location || null,
      language: validLangs.includes(safeLanguage) ? safeLanguage : 'en',
    });
    res.json({ success: true, user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/user/profile
 * Get current user's profile
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.uid);
    if (!user) {
      // Auto-create profile on first fetch
      const newUser = await upsertUser(req.user.uid, {
        displayName: req.user.displayName,
        email: req.user.email,
        photoURL: req.user.photoURL,
      });
      return res.json({ success: true, user: newUser });
    }
    // Ensure onboardingComplete is always present in the response
    if (user.onboardingComplete === undefined) {
      // If user has birthData set, they've completed onboarding
      user.onboardingComplete = !!(user.birthData && user.birthData.dateTime);
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/user/profile
 * Partial update of editable profile fields (displayName, photoURL).
 * Safe for name-only edits: never touches birthData / location / preferences.
 */
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const updates = {};

    if (req.body.displayName !== undefined) {
      const safeName = sanitizeString(req.body.displayName, INPUT_LIMITS.name);
      if (!safeName) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.displayName = safeName;
    }

    if (req.body.photoURL !== undefined) {
      updates.photoURL = sanitizeString(req.body.photoURL, 500) || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const user = await updateUserProfile(req.user.uid, updates);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Profile info update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /api/user/avatar
 * Upload a profile picture. Body: { image: <base64>, mime: 'image/jpeg' }.
 * The client resizes/compresses to a small square first. We store it in
 * Firebase Storage under avatars/<uid>/ with a download token so the public
 * URL works even under uniform bucket-level access, then persist it as photoURL.
 */
router.post('/avatar', requireAuth, async (req, res) => {
  try {
    const bucket = getBucket();
    if (!bucket) {
      return res.status(503).json({ error: 'Image storage is not available' });
    }

    const { image, mime } = req.body || {};
    const ext = AVATAR_MIME_EXT[mime];
    if (!image || typeof image !== 'string' || !ext) {
      return res.status(400).json({ error: 'A valid JPEG, PNG or WebP image is required' });
    }

    // Strip a data-URI prefix if the client sent one.
    const base64 = image.replace(/^data:[^;]+;base64,/, '');
    let buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch (decodeErr) {
      return res.status(400).json({ error: 'Image could not be decoded' });
    }
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Image is empty' });
    }
    if (buffer.length > AVATAR_MAX_BYTES) {
      return res.status(413).json({ error: 'Image is too large. Please choose a smaller photo.' });
    }

    const token = crypto.randomUUID();
    const objectPath = `avatars/${req.user.uid}/${Date.now()}.${ext}`;
    const file = bucket.file(objectPath);
    await file.save(buffer, {
      resumable: false,
      contentType: mime,
      metadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    const user = await updateUserProfile(req.user.uid, { photoURL });
    res.json({ success: true, photoURL, user });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

/**
 * PUT /api/user/birth-data
 * Update user's birth data (date, time, location)
 * Birth time is limited to 2 changes per Sri Lanka calendar month.
 * First-time setup (no existing birthData) is always allowed.
 */
router.put('/birth-data', requireAuth, async (req, res) => {
  try {
    const { dateTime, lat, lng, locationName, timezone } = req.body;
    if (!dateTime) {
      return res.status(400).json({ error: 'dateTime is required' });
    }

    const uid = req.user.uid;
    const existingUser = await getUser(uid);
    const existingBirth = existingUser?.birthData;

    // If birth data is the same, just return success without updating
    if (existingBirth && existingBirth.dateTime === dateTime
        && existingBirth.lat == lat && existingBirth.lng == lng) {
      return res.json({ success: true, message: 'Birth data unchanged' });
    }

    const now = new Date();
    const monthKey = getSriLankaMonthKey(now);
    const resetAt = getNextSriLankaMonthResetIso(now);
    const currentLimit = existingUser?.birthTimeEditLimit || {};
    const storedCount = currentLimit.monthKey === monthKey ? Number(currentLimit.count || 0) : 0;
    const currentCount = Number.isFinite(storedCount) ? storedCount : 0;
    const existingTimeKey = getBirthTimeKey(existingBirth?.dateTime);
    const incomingTimeKey = getBirthTimeKey(dateTime);
    const birthTimeChanged = !!(existingBirth?.dateTime && existingTimeKey && incomingTimeKey && existingTimeKey !== incomingTimeKey);

    if (birthTimeChanged && currentCount >= BIRTH_TIME_EDIT_LIMIT) {
      return res.status(429).json({
        error: 'Birth time can only be changed 2 times per month. It resets next month.',
        code: 'BIRTH_TIME_EDIT_LIMIT',
        limit: BIRTH_TIME_EDIT_LIMIT,
        remaining: 0,
        monthKey,
        resetsAt: resetAt,
      });
    }

    const nextBirthTimeLimit = birthTimeChanged ? {
      monthKey,
      count: currentCount + 1,
      limit: BIRTH_TIME_EDIT_LIMIT,
      remaining: Math.max(0, BIRTH_TIME_EDIT_LIMIT - currentCount - 1),
      updatedAt: now.toISOString(),
      resetsAt: resetAt,
    } : null;

    await updateBirthData(uid, {
      dateTime,
      lat: lat || 6.9271,
      lng: lng || 79.8612,
      locationName: sanitizeString(locationName, INPUT_LIMITS.locationName) || '',
      timezone: sanitizeString(timezone, INPUT_LIMITS.timezone) || 'Asia/Colombo',
    }, nextBirthTimeLimit ? { birthTimeEditLimit: nextBirthTimeLimit } : {});
    res.json({
      success: true,
      message: 'Birth data updated',
      birthTimeEditLimit: nextBirthTimeLimit || {
        monthKey,
        count: currentCount,
        limit: BIRTH_TIME_EDIT_LIMIT,
        remaining: Math.max(0, BIRTH_TIME_EDIT_LIMIT - currentCount),
        resetsAt: resetAt,
      },
    });
  } catch (err) {
    console.error('Birth data update error:', err);
    res.status(500).json({ error: 'Failed to update birth data' });
  }
});

/**
 * PUT /api/user/preferences
 * Update user preferences (language, notifications, theme)
 */
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    // Whitelist allowed preference keys and sanitize values
    const allowed = ['language', 'notifications', 'dailyPalapa', 'rahuKalayaAlerts', 'marakaApalaAlerts', 'transitAlerts', 'theme'];
    const validLangs = ['en', 'si', 'ta', 'singlish'];
    const validThemes = ['cosmic', 'light', 'dark'];
    const safePrefs = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === 'language') {
        if (validLangs.includes(req.body[key])) safePrefs[key] = req.body[key];
      } else if (key === 'theme') {
        if (validThemes.includes(req.body[key])) safePrefs[key] = req.body[key];
      } else {
        safePrefs[key] = !!req.body[key];
      }
    }
    await updatePreferences(req.user.uid, safePrefs);
    res.json({ success: true, message: 'Preferences updated' });
  } catch (err) {
    console.error('Preferences update error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /api/user/reports
 * Get user's saved AI reports
 */
router.get('/reports', requireAuth, requireSubscription, async (req, res) => {
  try {
    const reports = await getUserReports(req.user.uid);
    // Return lightweight list (no full sections)
    const list = reports.map(r => ({
      id: r.id,
      birthDate: r.birthDate,
      language: r.language,
      type: r.type,
      generationTime: r.generationTime,
      createdAt: r.createdAt,
      sectionCount: r.sections?.length || 0,
    }));
    res.json({ success: true, reports: list });
  } catch (err) {
    console.error('Reports fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * GET /api/user/chats
 * Get user's chat history
 */
router.get('/chats', requireAuth, requireSubscription, async (req, res) => {
  try {
    const chats = await getUserChats(req.user.uid, parseInt(req.query.limit) || 10);
    // Return lightweight list
    const list = chats.map(c => ({
      id: c.id,
      topic: c.topic,
      language: c.language,
      messageCount: c.messageCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastMessage: c.messages?.length > 0 ? c.messages[c.messages.length - 1].content?.substring(0, 100) : '',
    }));
    res.json({ success: true, chats: list });
  } catch (err) {
    console.error('Chats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

/**
 * GET /api/user/porondam
 * Get user's porondam (compatibility) history
 */
router.get('/porondam', requireAuth, requireSubscription, async (req, res) => {
  try {
    const results = await getUserPorondamHistory(req.user.uid, parseInt(req.query.limit) || 10);
    res.json({ success: true, results });
  } catch (err) {
    console.error('Porondam history error:', err);
    res.status(500).json({ error: 'Failed to fetch porondam history' });
  }
});

module.exports = router;
