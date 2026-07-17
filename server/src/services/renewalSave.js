/**
 * Renewal Save Flow — win back subscribers who disabled auto-renew.
 *
 * When RevenueCat sends CANCELLATION the webhook stamps the user doc with
 * `subscription.willRenew = false` + `subscription.cancelledAt` while access
 * continues until `subscription.expiresAt`. This service reads that state and
 * sends up to three staged pushes during the remaining paid month, at
 * 10:00 AM in the user's own timezone:
 *
 *   value — the morning after cancelling (≥12h later): show what Pro is
 *           already doing for them. Only when 6+ days of access remain.
 *   mid   — 14→4 days before expiry (and ≥3 days after cancelling):
 *           feature-specific value nudge.
 *   save  — final 3 days: what ends when the month ends, invitation to stay.
 *
 * The flow needs no extra enrollment writes: UNCANCELLATION / RENEWAL flip
 * `willRenew` back to true and the guards below drop the user naturally;
 * EXPIRATION moves them to the lapsed win-back banner instead.
 *
 * Each stage sends at most once per billing cycle (dedupe key includes the
 * expiry date) and the most urgent applicable stage wins — a user who cancels
 * two days before expiry gets only `save`, never a backfilled `value`.
 */

const { getDb, COLLECTIONS } = require('../config/firebase');
const {
  sendPush,
  getTokensWithPreference,
  logNotification,
  hasNotificationForDate,
  markNotificationForDate,
} = require('./notifications');

const RENEWAL_SAVE_HOUR = 10;   // 10:00 AM local — clear of the 8 AM cluster and 7 PM curiosity
const RENEWAL_SAVE_MINUTE = 0;
const RENEWAL_SAVE_WINDOW_MINUTES = 5;

// Stage markers must outlive a full billing cycle (default dedupe TTL is 3 days).
const SAVE_DEDUPE_TTL_MS = 45 * 24 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_HOURS_SINCE_CANCEL = 12;

/**
 * Decide which save-flow stage (if any) applies to a subscription right now.
 * Pure — no I/O. Returns { stage, daysUntilExpiry } or null.
 */
function computeSaveStage(subscription, now = new Date()) {
  if (!subscription || typeof subscription !== 'object') return null;
  if (subscription.status !== 'active') return null;      // expired / payment_failed have their own flows
  if (subscription.willRenew !== false) return null;      // still renewing (or UNCANCELLATION restored it)
  if (subscription.isLifetime) return null;

  const expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
  if (!expiresAt || isNaN(expiresAt.getTime())) return null;

  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  if (msUntilExpiry <= 0) return null;                    // EXPIRATION webhook is late — not ours

  // Older docs may lack cancelledAt; treat the cancel as old enough.
  const cancelledAt = subscription.cancelledAt ? new Date(subscription.cancelledAt) : null;
  const hoursSinceCancel = cancelledAt && !isNaN(cancelledAt.getTime())
    ? (now.getTime() - cancelledAt.getTime()) / (60 * 60 * 1000)
    : Infinity;

  const daysUntilExpiry = Math.ceil(msUntilExpiry / DAY_MS);

  if (daysUntilExpiry <= 3) return { stage: 'save', daysUntilExpiry };

  if (daysUntilExpiry <= 14 && hoursSinceCancel >= 3 * 24) {
    return { stage: 'mid', daysUntilExpiry };
  }

  if (daysUntilExpiry >= 6 && hoursSinceCancel >= MIN_HOURS_SINCE_CANCEL) {
    return { stage: 'value', daysUntilExpiry };
  }

  return null;
}

/** Dedupe key scope: one send per stage per billing cycle. */
function getCycleKey(subscription) {
  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  if (!expiresAt || isNaN(expiresAt.getTime())) return 'unknown-cycle';
  return expiresAt.toISOString().split('T')[0];
}

/**
 * Push copy per stage. Value-forward, premium ඔබ register, never begging.
 * Returns { title, body }.
 */
function buildRenewalSaveMessage(stage, lang, ctx = {}) {
  const language = lang === 'en' ? 'en' : 'si';
  const days = Math.max(1, Number(ctx.daysUntilExpiry) || 1);

  if (stage === 'value') {
    return language === 'si'
      ? {
        title: '✨ ඔබේ Pro මාසය දැන් සක්‍රීයයි',
        body: 'ඉදිරි මාස 12 සඳහා ඔබේ බලවත් මාස, දශා විශ්ලේෂණය සහ අසීමිත ප්‍රශ්න — සියල්ල දැන් විවෘතයි. මේ මාසයෙන් උපරිම ප්‍රයෝජන ගන්න.',
      }
      : {
        title: '✨ Your Pro month is live',
        body: 'Your power months for the year ahead, dasha analysis and unlimited questions are all open now. Make the most of this month.',
      };
  }

  if (stage === 'mid') {
    return language === 'si'
      ? {
        title: '🪐 ඔබේ ඉදිරි බලවත් කවුළුව සලකුණු වී ඇත',
        body: 'ළඟ එන සතිවල ඔබට වැදගත් දින කිහිපයක් පෙනේ. Pro විශ්ලේෂණයෙන් ඒවා දැන්ම බලා සූදානම් වන්න.',
      }
      : {
        title: '🪐 Your next power window is marked',
        body: 'The coming weeks hold important days for you. See them in your Pro analysis and plan ahead.',
      };
  }

  // save — final days of access
  if (language === 'si') {
    const title = days === 1
      ? '🕒 ඔබේ Pro මාසය හෙට අවසන් වේ'
      : `🕒 ඔබේ Pro මාසයට ඉතිරි දින ${days}යි`;
    return {
      title,
      body: 'ඉන්පසු දෛනික මඟපෙන්වීම, බලවත් මාස සහ ප්‍රශ්න වැසී යයි. ඔබේ ගමන නවත්වන්න එපා — Pro දිගටම තබාගන්න.',
    };
  }
  const title = days === 1
    ? '🕒 Your Pro month ends tomorrow'
    : `🕒 ${days} days left in your Pro month`;
  return {
    title,
    body: 'After that, daily guidance, power months and questions close. Keep your journey going — stay on Pro.',
  };
}

/** Mirror of scheduler's user-local window check (kept private there). */
function isInUserWindow(now, timezone, targetHour, targetMinute, windowMinutes) {
  let hour;
  let minute;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'Asia/Colombo',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);
    hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  } catch (e) {
    const slt = new Date(now.getTime() + 19800 * 1000);
    hour = slt.getUTCHours();
    minute = slt.getUTCMinutes();
  }
  const currentMinutes = hour * 60 + minute;
  const targetMinutes = targetHour * 60 + targetMinute;
  return currentMinutes >= targetMinutes - windowMinutes && currentMinutes <= targetMinutes + windowMinutes;
}

/**
 * Scheduler tick: send the applicable save-flow push to cancelled-but-active
 * subscribers currently inside their 10:00 AM window.
 */
async function sendRenewalSaveNotifications() {
  const db = getDb();
  if (!db) return;

  const now = new Date();
  // Dedicated preference key (default-on); global notifications toggle respected.
  const recipients = await getTokensWithPreference('renewalReminders');

  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    try {
      // Coarse filter on the (≤10 min stale) cached subscription state.
      const cachedStage = computeSaveStage(recipient.subscription, now);
      if (!cachedStage) continue;

      const tz = recipient.timezone || 'Asia/Colombo';
      if (!isInUserWindow(now, tz, RENEWAL_SAVE_HOUR, RENEWAL_SAVE_MINUTE, RENEWAL_SAVE_WINDOW_MINUTES)) continue;

      const dedupeType = 'RENEWAL_SAVE_' + cachedStage.stage.toUpperCase();
      const cycleKey = getCycleKey(recipient.subscription);
      if (await hasNotificationForDate(recipient.uid, dedupeType, cycleKey)) {
        skipped++;
        continue;
      }

      // Fresh read before sending — the cache may miss a just-fired
      // UNCANCELLATION/RENEWAL, and "your month is ending" to someone who
      // just resubscribed reads as a billing bug.
      const freshDoc = await db.collection(COLLECTIONS.USERS).doc(recipient.uid).get();
      if (!freshDoc.exists) continue;
      const freshSub = freshDoc.data().subscription || null;
      const fresh = computeSaveStage(freshSub, now);
      if (!fresh || fresh.stage !== cachedStage.stage) continue;

      const message = buildRenewalSaveMessage(fresh.stage, recipient.language || 'si', fresh);
      const data = {
        type: 'RENEWAL_SAVE',
        stage: fresh.stage,
        daysUntilExpiry: fresh.daysUntilExpiry,
        route: '/(tabs)',
      };

      const result = await sendPush(recipient.pushToken, message.title, message.body, data, {
        channelId: 'daily-guidance',
        priority: 'high',
      });

      if (result.sent > 0) {
        await logNotification(recipient.uid, 'RENEWAL_SAVE', message.title, message.body, data);
        await markNotificationForDate(recipient.uid, dedupeType, getCycleKey(freshSub), SAVE_DEDUPE_TTL_MS);
        sent++;
      }
    } catch (err) {
      console.error(`[RenewalSave] Failed for ${recipient.uid}:`, err.message);
    }
  }

  if (sent > 0 || skipped > 0) {
    console.log(`[RenewalSave] sent=${sent}, already-sent=${skipped}`);
  }
}

module.exports = {
  sendRenewalSaveNotifications,
  computeSaveStage,
  buildRenewalSaveMessage,
  getCycleKey,
  RENEWAL_SAVE_HOUR,
  RENEWAL_SAVE_MINUTE,
};
