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

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  upsertUser,
  getUser,
  updateBirthData,
  updatePreferences,
  getUserReports,
  getUserChats,
  getUserPorondamHistory,
} = require('../models/firestore');

/**
 * POST /api/user/profile
 * Create or update user profile after sign-in
 */
router.post('/profile', requireAuth, async (req, res) => {
  try {
    const user = await upsertUser(req.user.uid, {
      displayName: req.user.displayName || req.body.displayName,
      email: req.user.email || req.body.email,
      photoURL: req.user.photoURL || req.body.photoURL,
      birthData: req.body.birthData || null,
      location: req.body.location || null,
      language: req.body.language || 'en',
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
 * PUT /api/user/birth-data
 * Update user's birth data (date, time, location)
 * Limited to once per day — returns 429 if already updated today.
 * First-time setup (no existing birthData) is always allowed.
 */
router.put('/birth-data', requireAuth, async (req, res) => {
  try {
    const { dateTime, lat, lng, locationName, timezone, force } = req.body;
    if (!dateTime) {
      return res.status(400).json({ error: 'dateTime is required' });
    }

    const uid = req.user.uid;
    const existingUser = await getUser(uid);
    const existingBirth = existingUser?.birthData;

    // If user already has birth data, enforce once-per-day limit
    if (existingBirth && existingBirth.dateTime && !force) {
      const lastUpdated = existingUser.updatedAt || existingUser.createdAt;
      if (lastUpdated) {
        const lastDate = new Date(lastUpdated);
        const now = new Date();
        const sameDay = lastDate.getUTCFullYear() === now.getUTCFullYear()
          && lastDate.getUTCMonth() === now.getUTCMonth()
          && lastDate.getUTCDate() === now.getUTCDate();

        // If birth data is the same, just return success without updating
        if (existingBirth.dateTime === dateTime) {
          return res.json({ success: true, message: 'Birth data unchanged' });
        }

        if (sameDay) {
          return res.status(429).json({
            error: 'Birth time can only be updated once per day. Try again tomorrow.',
            errorSi: 'උපන් වේලාව දිනකට එක් වරක් පමණක් යාවත්කාලීන කළ හැකිය. හෙට නැවත උත්සාහ කරන්න.',
            code: 'BIRTH_UPDATE_LIMIT',
          });
        }
      }
    }

    await updateBirthData(uid, {
      dateTime,
      lat: lat || 6.9271,
      lng: lng || 79.8612,
      locationName: locationName || '',
      timezone: timezone || 'Asia/Colombo',
    });
    res.json({ success: true, message: 'Birth data updated' });
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
    await updatePreferences(req.user.uid, req.body);
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
router.get('/reports', requireAuth, async (req, res) => {
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
router.get('/chats', requireAuth, async (req, res) => {
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
router.get('/porondam', requireAuth, async (req, res) => {
  try {
    const results = await getUserPorondamHistory(req.user.uid, parseInt(req.query.limit) || 10);
    res.json({ success: true, results });
  } catch (err) {
    console.error('Porondam history error:', err);
    res.status(500).json({ error: 'Failed to fetch porondam history' });
  }
});

module.exports = router;
