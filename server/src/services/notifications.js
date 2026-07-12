/**
 * Push Notification Service — Production-Ready
 * 
 * Supports:
 *   1. Expo Push Notifications (for Expo-managed apps)
 *   2. Firebase Cloud Messaging (for production standalone builds)
 * 
 * Notification Types:
 *   - DAILY_PALAPA    — Daily horoscope predictions
 *   - RAHU_KALAYA     — Rahu Kalaya start warning (15 min before)
 *   - MARAKA_APALA    — Dangerous period alerts
 *   - TRANSIT_ALERT   — Significant transit events
 *   - GENERAL         — App updates, tips
 */

const { getDb, COLLECTIONS } = require('../config/firebase');
const { toTtlTimestamp } = require('../utils/firestoreTtl');

// ─── Expo Push Notification API ─────────────────────────────────
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via Expo Push API
 * Handles batching (max 100 per request), receipts, and error handling
 * @param {Array<Object>} messages — Array of { to, title, body, data, ... }
 * @returns {Object} { sent, failed, tickets }
 */
async function sendExpoPushBatch(messages) {
  if (!messages || messages.length === 0) return { sent: 0, failed: 0, tickets: [] };

  // Filter out invalid tokens
  const validMessages = messages.filter(m => m.to && (
    m.to.startsWith('ExponentPushToken[') || m.to.startsWith('ExpoPushToken[')
  ));

  if (validMessages.length === 0) return { sent: 0, failed: 0, tickets: [] };

  const allTickets = [];
  let sent = 0;
  let failed = 0;

  // Batch in chunks of 100 (Expo limit)
  for (let i = 0; i < validMessages.length; i += 100) {
    const batch = validMessages.slice(i, i + 100);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const result = await response.json();
      const tickets = result.data || [];

      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
          // Handle device not registered — clean up token
          if (ticket.details?.error === 'DeviceNotRegistered') {
            cleanupInvalidToken(batch[idx].to).catch(() => {});
          }
        }
        allTickets.push({ ...ticket, pushToken: batch[idx].to });
      });
    } catch (err) {
      console.error('[Notifications] Expo push batch error:', err.message);
      failed += batch.length;
    }
  }

  console.log(`[Notifications] Sent: ${sent}, Failed: ${failed}, Total: ${validMessages.length}`);
  return { sent, failed, tickets: allTickets };
}

/**
 * Send a single push notification
 */
async function sendPush(pushToken, title, body, data = {}, options = {}) {
  const message = {
    to: pushToken,
    sound: options.sound || 'default',
    title,
    body,
    data: { ...data, type: data.type || 'GENERAL' },
    priority: options.priority || 'high',
    channelId: options.channelId || 'default',
    badge: options.badge || undefined,
    categoryId: options.categoryId || undefined,
  };

  return sendExpoPushBatch([message]);
}

/**
 * Send notifications to multiple users
 * @param {Array<string>} pushTokens — Expo push tokens
 * @param {string} title
 * @param {string} body
 * @param {Object} data
 */
async function sendToMultiple(pushTokens, title, body, data = {}, options = {}) {
  const messages = pushTokens.map(token => ({
    to: token,
    sound: options.sound || 'default',
    title,
    body,
    data: { ...data, type: data.type || 'GENERAL' },
    priority: options.priority || 'high',
    channelId: options.channelId || 'default',
  }));

  return sendExpoPushBatch(messages);
}

// ═══════════════════════════════════════════════════════════════
// PUSH TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Register/update a user's push token
 */
async function registerPushToken(uid, pushToken, platform = 'unknown') {
  const db = getDb();
  if (!db || !uid || !pushToken) return false;

  try {
    const tokenRef = db.collection('pushTokens').doc(uid);
    await tokenRef.set({
      uid,
      pushToken,
      platform,
      updatedAt: new Date().toISOString(),
      active: true,
    }, { merge: true });
    invalidateRecipientCache();
    return true;
  } catch (err) {
    console.error('[Notifications] Register token error:', err.message);
    return false;
  }
}

/**
 * Remove/deactivate a push token
 */
async function unregisterPushToken(uid) {
  const db = getDb();
  if (!db || !uid) return false;

  try {
    await db.collection('pushTokens').doc(uid).update({
      active: false,
      updatedAt: new Date().toISOString(),
    });
    invalidateRecipientCache();
    return true;
  } catch (err) {
    console.error('[Notifications] Unregister token error:', err.message);
    return false;
  }
}

/**
 * Get all active push tokens (for broadcast)
 */
async function getAllActiveTokens() {
  const db = getDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection('pushTokens')
      .where('active', '==', true)
      .get();

    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.error('[Notifications] Get tokens error:', err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// RECIPIENT CACHE (fix F1)
//
// The scheduler calls getTokensWithPreference() up to 4× per minute, 24/7.
// Previously each call re-read every active token + every user profile
// (~2N Firestore reads), so the scheduler alone burned ~8N reads/min forever —
// ~99% of it wasted on minutes when nobody was inside a notification window.
//
// Now the expensive token↔profile JOIN is loaded at most once per cache TTL
// (default 10 min) and every per-minute tick filters that in-memory snapshot.
// This cuts steady-state scheduler reads by ~40× on its own; combining with the
// window-gated per-user dedupe (by-id get, fix F5) removes ~99%.
// ═══════════════════════════════════════════════════════════════
const RECIPIENT_CACHE_TTL_MS = Number(process.env.NOTIFICATION_RECIPIENT_CACHE_MS || 10 * 60 * 1000);
let _recipientCache = { at: 0, data: null };

/** Drop the cache so the next read reloads fresh (called on token changes). */
function invalidateRecipientCache() {
  _recipientCache = { at: 0, data: null };
}

/**
 * Load every active recipient joined with their user profile (prefs, birthData,
 * language, timezone). This is the one expensive read; everything else filters
 * the result in memory.
 */
async function loadActiveRecipients() {
  const db = getDb();
  if (!db) return [];

  const tokens = await getAllActiveTokens();
  if (tokens.length === 0) return [];

  const tokenByUid = new Map(tokens.map(t => [t.uid, t]));
  const results = [];
  const uids = tokens.map(t => t.uid);

  // Batch fetch users (Firestore `in` query max 30)
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('uid', 'in', batch)
      .get();

    snapshot.docs.forEach(doc => {
      const userData = doc.data();
      const token = tokenByUid.get(userData.uid || doc.id);
      if (!token) return;
      const prefs = userData.preferences || {};
      results.push({
        ...token,
        preferences: prefs,
        birthData: userData.birthData || null,
        language: prefs.language || 'si',
        timezone: userData.birthData?.timezone || prefs.timezone || 'Asia/Colombo',
      });
    });
  }

  return results;
}

/** Cached active-recipient snapshot. Pass { force: true } to bypass the cache. */
async function getActiveRecipients(options = {}) {
  const now = Date.now();
  if (!options.force && _recipientCache.data && (now - _recipientCache.at) < RECIPIENT_CACHE_TTL_MS) {
    return _recipientCache.data;
  }
  try {
    const data = await loadActiveRecipients();
    _recipientCache = { at: now, data };
    return data;
  } catch (err) {
    console.error('[Notifications] Recipient load error:', err.message);
    // Serve a slightly stale cache rather than dropping a whole tick.
    return _recipientCache.data || [];
  }
}

/**
 * Get tokens for users who have a specific notification preference enabled.
 * Backed by the in-memory recipient cache (fix F1) — filtering is in memory.
 */
async function getTokensWithPreference(preferenceKey, options = {}) {
  const db = getDb();
  if (!db) return [];
  const recipients = await getActiveRecipients(options);
  return recipients.filter(r => {
    const prefs = r.preferences || {};
    // Enabled unless the user explicitly turned notifications (or this key) off.
    return prefs.notifications !== false && prefs[preferenceKey] !== false;
  });
}

// ═══════════════════════════════════════════════════════════════
// PER-DAY DEDUPE (fix F5)
//
// "Did we already send this notification today?" used to be a 3-field composite
// query (uid + type + data.date) run once PER USER PER MINUTE during a window —
// requiring a composite index and billing a query each time. It's now a single
// get-by-id against a deterministic doc, and the marker carries a Timestamp TTL
// so the dedupe collection self-cleans.
// ═══════════════════════════════════════════════════════════════
const DEDUPE_COLLECTION = 'notificationDedupe';
const DEDUPE_TTL_MS = Number(process.env.NOTIFICATION_DEDUPE_TTL_MS || 3 * 24 * 60 * 60 * 1000);

function dedupeDocId(uid, type, dateKey) {
  return `${uid}_${type}_${dateKey}`;
}

/** True if a notification of this type was already sent to the user on dateKey. */
async function hasNotificationForDate(uid, type, dateKey) {
  const db = getDb();
  if (!db) return false;
  try {
    const doc = await db.collection(DEDUPE_COLLECTION).doc(dedupeDocId(uid, type, dateKey)).get();
    return doc.exists;
  } catch (err) {
    console.error('[Notifications] Dedupe check error:', err.message);
    return false; // fail open — a rare duplicate beats silently dropping all sends
  }
}

/** Record that a notification of this type was sent to the user on dateKey. */
async function markNotificationForDate(uid, type, dateKey) {
  const db = getDb();
  if (!db) return;
  try {
    await db.collection(DEDUPE_COLLECTION).doc(dedupeDocId(uid, type, dateKey)).set({
      uid,
      type,
      date: dateKey,
      sentAt: new Date().toISOString(),
      ttlExpireAt: toTtlTimestamp(Date.now() + DEDUPE_TTL_MS),
    }, { merge: true });
  } catch (err) {
    console.error('[Notifications] Dedupe mark error:', err.message);
  }
}

/**
 * Clean up an invalid push token
 */
async function cleanupInvalidToken(pushToken) {
  const db = getDb();
  if (!db) return;

  try {
    const snapshot = await db.collection('pushTokens')
      .where('pushToken', '==', pushToken)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { active: false, invalidatedAt: new Date().toISOString() });
    });
    await batch.commit();
    invalidateRecipientCache();
  } catch (err) {
    console.error('[Notifications] Cleanup token error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION HISTORY — Log sent notifications for audit/debug
// ═══════════════════════════════════════════════════════════════

async function logNotification(uid, type, title, body, data = {}) {
  const db = getDb();
  if (!db) return;

  try {
    await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      uid,
      type,
      title,
      body,
      data,
      sentAt: new Date().toISOString(),
      read: false,
      // Timestamp TTL (fix F3) so notification history self-cleans.
      ttlExpireAt: toTtlTimestamp(Date.now() + Number(process.env.NOTIFICATION_LOG_TTL_MS || 90 * 24 * 60 * 60 * 1000)),
    });
  } catch (err) {
    // Non-critical — don't throw
    console.error('[Notifications] Log error:', err.message);
  }
}

/**
 * Get notification history for a user
 */
async function getUserNotifications(uid, limit = 30) {
  const db = getDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('uid', '==', uid)
      .orderBy('sentAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[Notifications] Get history error:', err.message);
    return [];
  }
}

/**
 * Mark notifications as read
 */
async function markNotificationsRead(uid, notificationIds) {
  const db = getDb();
  if (!db) return;

  try {
    const batch = db.batch();
    for (const id of notificationIds) {
      batch.update(db.collection(COLLECTIONS.NOTIFICATIONS).doc(id), {
        read: true,
        readAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  } catch (err) {
    console.error('[Notifications] Mark read error:', err.message);
  }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(uid) {
  const db = getDb();
  if (!db) return 0;

  try {
    const snapshot = await db.collection(COLLECTIONS.NOTIFICATIONS)
      .where('uid', '==', uid)
      .where('read', '==', false)
      .get();
    return snapshot.size;
  } catch (err) {
    return 0;
  }
}

module.exports = {
  sendPush,
  sendToMultiple,
  sendExpoPushBatch,
  registerPushToken,
  unregisterPushToken,
  getAllActiveTokens,
  getTokensWithPreference,
  getActiveRecipients,
  invalidateRecipientCache,
  hasNotificationForDate,
  markNotificationForDate,
  logNotification,
  getUserNotifications,
  markNotificationsRead,
  getUnreadCount,
};
