/**
 * Notification API Routes
 * 
 * Endpoints:
 *   POST /api/notifications/register        — Register push token
 *   POST /api/notifications/unregister      — Unregister push token
 *   GET  /api/notifications/history         — Get notification history
 *   POST /api/notifications/read            — Mark notifications as read
 *   GET  /api/notifications/unread-count    — Get unread count
 *   PUT  /api/notifications/preferences     — Update notification preferences
 *   GET  /api/notifications/maraka-apala    — Get Maraka Apala for authenticated user
 *   POST /api/notifications/test            — Send a test notification (dev only)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  registerPushToken,
  unregisterPushToken,
  getUserNotifications,
  markNotificationsRead,
  getUnreadCount,
  sendPush,
  logNotification,
} = require('../services/notifications');
const { calculateMarakaApala, getActiveMarakaApala } = require('../engine/maraka');
const { calculateRahuKalaya, getDailyNakath, getPanchanga } = require('../engine/astrology');
const { getUser, updatePreferences } = require('../models/firestore');

// ─── Register Push Token ─────────────────────────────────────
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { pushToken, platform } = req.body;
    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const success = await registerPushToken(req.user.uid, pushToken, platform || 'unknown');
    res.json({ success, message: success ? 'Push token registered' : 'Failed to register' });
  } catch (err) {
    console.error('Register push token error:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// ─── Unregister Push Token ───────────────────────────────────
router.post('/unregister', requireAuth, async (req, res) => {
  try {
    const success = await unregisterPushToken(req.user.uid);
    res.json({ success });
  } catch (err) {
    console.error('Unregister push token error:', err);
    res.status(500).json({ error: 'Failed to unregister' });
  }
});

// ─── Get Notification History ─────────────────────────────────
router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const notifications = await getUserNotifications(req.user.uid, limit);
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── Mark Notifications as Read ───────────────────────────────
router.post('/read', requireAuth, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds array is required' });
    }

    await markNotificationsRead(req.user.uid, notificationIds);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ─── Get Unread Count ────────────────────────────────────────
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.uid);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// ─── Update Notification Preferences ──────────────────────────
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const {
      dailyPalapa,
      rahuKalayaAlerts,
      marakaApalaAlerts,
      transitAlerts,
    } = req.body;

    const prefs = {};
    if (dailyPalapa !== undefined) prefs.dailyPalapa = !!dailyPalapa;
    if (rahuKalayaAlerts !== undefined) prefs.rahuKalayaAlerts = !!rahuKalayaAlerts;
    if (marakaApalaAlerts !== undefined) prefs.marakaApalaAlerts = !!marakaApalaAlerts;
    if (transitAlerts !== undefined) prefs.transitAlerts = !!transitAlerts;

    await updatePreferences(req.user.uid, prefs);
    res.json({ success: true, message: 'Notification preferences updated' });
  } catch (err) {
    console.error('Update notification prefs error:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ─── Get Maraka Apala for Authenticated User ──────────────────
router.get('/maraka-apala', requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.uid);
    if (!user?.birthData?.dateTime) {
      return res.status(400).json({ error: 'Birth data required. Please set your birth details first.' });
    }

    const birthDate = new Date(user.birthData.dateTime);
    const lat = user.birthData.lat || 6.9271;
    const lng = user.birthData.lng || 79.8612;
    const yearsAhead = parseInt(req.query.years) || 3;

    const result = calculateMarakaApala(birthDate, lat, lng, { yearsAhead });

    res.json({
      success: true,
      data: {
        status: result.status,
        statusSi: result.statusSi,
        statusEn: result.statusEn,
        activeApala: result.activeApala,
        activeCount: result.activeCount,
        upcomingApala: result.upcomingApala,
        natalInfo: result.natalInfo,
        totalCount: result.totalCount,
        generatedAt: result.generatedAt,
      },
    });
  } catch (err) {
    console.error('Maraka Apala error:', err);
    res.status(500).json({ error: 'Failed to calculate Maraka Apala', details: err.message });
  }
});

// ─── Get Full Maraka Apala (with all periods) ─────────────────
router.post('/maraka-apala/full', requireAuth, async (req, res) => {
  try {
    const { birthDate, lat, lng, yearsAhead } = req.body;

    let bDate, latitude, longitude;

    if (birthDate) {
      bDate = new Date(birthDate);
      latitude = parseFloat(lat) || 6.9271;
      longitude = parseFloat(lng) || 79.8612;
    } else {
      // Use profile birth data
      const user = await getUser(req.user.uid);
      if (!user?.birthData?.dateTime) {
        return res.status(400).json({ error: 'Birth data required' });
      }
      bDate = new Date(user.birthData.dateTime);
      latitude = user.birthData.lat || 6.9271;
      longitude = user.birthData.lng || 79.8612;
    }

    const result = calculateMarakaApala(bDate, latitude, longitude, {
      yearsAhead: yearsAhead || 5,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Full Maraka Apala error:', err);
    res.status(500).json({ error: 'Failed to calculate', details: err.message });
  }
});

// ─── Today's Dashboard — Palapa + Rahu Kalaya + Active Apala ──
router.get('/today', requireAuth, async (req, res) => {
  try {
    const user = await getUser(req.user.uid);
    const today = new Date();
    const lat = parseFloat(req.query.lat) || user?.birthData?.lat || 6.9271;
    const lng = parseFloat(req.query.lng) || user?.birthData?.lng || 79.8612;

    // Panchanga & Nakath
    const panchanga = getPanchanga(today, lat, lng);
    const nakath = getDailyNakath(today, lat, lng);
    const rahuKalaya = calculateRahuKalaya(today, lat, lng);

    // Format Rahu Kalaya times (SLT)
    const formatSLT = (d) => {
      const slt = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const h = slt.getUTCHours();
      const m = slt.getUTCMinutes();
      return `${(h % 12 || 12)}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    };

    const response = {
      date: today.toISOString().split('T')[0],
      panchanga: {
        tithi: panchanga?.tithi?.name,
        nakshatra: panchanga?.nakshatra?.name,
        nakshatraSinhala: panchanga?.nakshatra?.sinhala,
        yoga: panchanga?.yoga?.name,
        karana: panchanga?.karana?.name,
        weekday: panchanga?.weekday,
      },
      rahuKalaya: rahuKalaya ? {
        start: rahuKalaya.start?.toISOString(),
        end: rahuKalaya.end?.toISOString(),
        startDisplay: formatSLT(rahuKalaya.start),
        endDisplay: formatSLT(rahuKalaya.end),
        isActive: today >= rahuKalaya.start && today <= rahuKalaya.end,
      } : null,
      auspiciousPeriods: nakath?.auspiciousPeriods?.map(p => ({
        name: p.name,
        nameSinhala: p.sinhala,
        start: formatSLT(p.start),
        end: formatSLT(p.end),
      })) || [],
    };

    // Add Maraka Apala if user has birth data
    if (user?.birthData?.dateTime) {
      try {
        const bDate = new Date(user.birthData.dateTime);
        const apala = calculateMarakaApala(bDate, lat, lng, { yearsAhead: 1 });
        response.marakaApala = {
          status: apala.status,
          statusSi: apala.statusSi,
          statusEn: apala.statusEn,
          activeCount: apala.activeCount,
          activeApala: apala.activeApala.slice(0, 3), // Top 3 active
          nextUpcoming: apala.upcomingApala.slice(0, 2), // Next 2 upcoming
        };
      } catch (e) {
        response.marakaApala = { status: 'UNKNOWN', error: e.message };
      }
    }

    res.json({ success: true, data: response });
  } catch (err) {
    console.error('Today dashboard error:', err);
    res.status(500).json({ error: 'Failed to load today\'s data' });
  }
});

// ─── Test Notification (dev only) ─────────────────────────────
router.post('/test', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Test notifications disabled in production' });
  }

  try {
    const user = await getUser(req.user.uid);
    const db = require('../config/firebase').getDb();
    if (!db) return res.status(500).json({ error: 'Firebase not initialized' });

    const tokenDoc = await db.collection('pushTokens').doc(req.user.uid).get();
    if (!tokenDoc.exists || !tokenDoc.data().pushToken) {
      return res.status(400).json({ error: 'No push token registered' });
    }

    const pushToken = tokenDoc.data().pushToken;
    const result = await sendPush(pushToken, '🧪 Test Notification', 'If you see this, notifications are working!', {
      type: 'TEST',
    });

    res.json({ success: true, result });
  } catch (err) {
    console.error('Test notification error:', err);
    res.status(500).json({ error: 'Test notification failed', details: err.message });
  }
});

module.exports = router;
