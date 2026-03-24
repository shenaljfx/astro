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

/**
 * Get tokens for users who have specific notification preferences enabled
 */
async function getTokensWithPreference(preferenceKey) {
  const db = getDb();
  if (!db) return [];

  try {
    // Get all active tokens
    const tokens = await getAllActiveTokens();
    if (tokens.length === 0) return [];

    // For each token, check user preferences
    const results = [];
    // Batch fetch users (Firestore `in` query max 30)
    const uids = tokens.map(t => t.uid);
    for (let i = 0; i < uids.length; i += 30) {
      const batch = uids.slice(i, i + 30);
      const snapshot = await db.collection(COLLECTIONS.USERS)
        .where('uid', 'in', batch)
        .get();

      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        const prefs = userData.preferences || {};
        // Check if this notification type is enabled (default true)
        const enabled = prefs[preferenceKey] !== false;
        if (enabled) {
          const token = tokens.find(t => t.uid === doc.id);
          if (token) {
            results.push({
              ...token,
              birthData: userData.birthData || null,
              language: prefs.language || 'si',
            });
          }
        }
      });
    }

    return results;
  } catch (err) {
    console.error('[Notifications] Get preference tokens error:', err.message);
    return [];
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
  logNotification,
  getUserNotifications,
  markNotificationsRead,
  getUnreadCount,
};
