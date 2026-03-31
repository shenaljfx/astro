/**
 * Notification Scheduler — Cron-like daily tasks
 * 
 * Runs scheduled notification jobs:
 *   1. Rahu Kalaya Warning — 15 minutes before Rahu Kalaya starts
 *   2. Maraka Apala Alerts — daily check for users in dangerous periods
 *   3. Weekly Lagna Palapala — Sunday AI-generated weekly predictions
 * 
 * Uses setInterval for self-hosted servers.
 * For production: use Cloud Functions / Cloud Scheduler / cron job.
 */

const { calculateRahuKalaya } = require('../engine/astrology');
const { calculateMarakaApala } = require('../engine/maraka');
const { sendPush, getTokensWithPreference, logNotification } = require('./notifications');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { generateWeeklyLagnaReports } = require('../engine/weeklyLagna');
const { trackCost } = require('./costTracker');

// SLT offset in ms (UTC+5:30)
const SLT_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toSLTDate(date) {
  return new Date(date.getTime() + SLT_OFFSET_MS);
}

// ═══════════════════════════════════════════════════════════════
// 1. RAHU KALAYA WARNING — 15 min before
// ═══════════════════════════════════════════════════════════════
async function sendRahuKalayaWarning() {
  console.log('[Scheduler] Checking Rahu Kalaya...');

  try {
    const now = new Date();
    const rahuKalaya = calculateRahuKalaya(now, 6.9271, 79.8612);

    if (!rahuKalaya?.start) {
      console.log('[Scheduler] No Rahu Kalaya data');
      return;
    }

    const rahuStart = new Date(rahuKalaya.start);
    const rahuEnd = new Date(rahuKalaya.end);
    const diffMinutes = (rahuStart - now) / (1000 * 60);

    // Only send if Rahu Kalaya starts in 13-17 minutes (target: 15 min)
    if (diffMinutes < 13 || diffMinutes > 17) {
      return; // Not time yet
    }

    const sltStart = toSLTDate(rahuStart);
    const sltEnd = toSLTDate(rahuEnd);
    const formatTime = (d) => {
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      return `${(h % 12 || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const startTime = formatTime(sltStart);
    const endTime = formatTime(sltEnd);

    // Get users who want rahu kalaya alerts
    const tokens = await getTokensWithPreference('rahuKalayaAlerts');
    console.log(`[Scheduler] Rahu Kalaya warning: ${tokens.length} users`);

    for (const token of tokens) {
      try {
        const lang = token.language || 'si';
        const title = lang === 'si' ? '⚠️ රාහු කාලය ආසන්නයි!' : '⚠️ Rahu Kalaya Approaching!';
        const body = lang === 'si'
          ? `රාහු කාලය ${startTime} සිට ${endTime} දක්වා. නව කටයුතු ආරම්භ නොකරන්න!`
          : `Rahu Kalaya from ${startTime} to ${endTime}. Avoid starting new activities!`;

        await sendPush(token.pushToken, title, body, {
          type: 'RAHU_KALAYA',
          start: rahuStart.toISOString(),
          end: rahuEnd.toISOString(),
        }, { channelId: 'rahu-kalaya', sound: 'default' });

        await logNotification(token.uid, 'RAHU_KALAYA', title, body);
      } catch (err) {
        console.error(`[Scheduler] Rahu push failed for ${token.uid}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Rahu Kalaya error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. MARAKA APALA CHECK — Daily check for dangerous periods
// ═══════════════════════════════════════════════════════════════
async function checkMarakaApalaForAllUsers() {
  console.log('[Scheduler] Starting Maraka Apala check...');

  try {
    const tokens = await getTokensWithPreference('marakaApalaAlerts');
    console.log(`[Scheduler] Maraka check: ${tokens.length} users with birth data`);

    let notified = 0;

    for (const token of tokens) {
      try {
        const birthData = token.birthData;
        if (!birthData?.dateTime) continue;

        const bDate = new Date(birthData.dateTime);
        const lat = birthData.lat || 6.9271;
        const lng = birthData.lng || 79.8612;

        const apala = calculateMarakaApala(bDate, lat, lng, { yearsAhead: 1 });

        // Check for newly active periods or upcoming ones (within 7 days)
        const now = new Date();
        const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const urgent = apala.allApala.filter(a => {
          const start = new Date(a.start);
          // Active now OR starting within 7 days
          return a.isActive || (start > now && start <= sevenDays);
        });

        if (urgent.length === 0) continue;

        // Don't spam — check if we already notified about this today
        const db = getDb();
        if (db) {
          const todayStr = now.toISOString().split('T')[0];
          const existing = await db.collection(COLLECTIONS.NOTIFICATIONS)
            .where('uid', '==', token.uid)
            .where('type', '==', 'MARAKA_APALA')
            .where('data.date', '==', todayStr)
            .limit(1)
            .get();
          if (!existing.empty) continue; // Already notified today
        }

        // Pick the most severe one to notify about
        const worst = urgent.sort((a, b) => {
          const sev = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
          return (sev[a.severity] || 9) - (sev[b.severity] || 9);
        })[0];

        const lang = token.language || 'si';
        let title, body;

        if (worst.isActive) {
          title = lang === 'si' ? `${worst.severity === 'CRITICAL' ? '⛔' : '🔴'} මාරක අපල කාලය ක්‍රියාත්මකයි!`
            : `${worst.severity === 'CRITICAL' ? '⛔' : '🔴'} Maraka Apala Period Active!`;
          body = lang === 'si' ? worst.description : worst.descriptionEn;
        } else {
          const startDate = new Date(worst.start);
          const daysUntil = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
          title = lang === 'si' ? `⚠️ මාරක අපල කාලය දින ${daysUntil}කින්` : `⚠️ Maraka Apala in ${daysUntil} days`;
          body = lang === 'si' ? `${worst.title} — සූදානම් වන්න. ${worst.remedies?.[0]?.si || ''}` 
            : `${worst.titleEn} — prepare yourself. ${worst.remedies?.[0]?.en || ''}`;
        }

        await sendPush(token.pushToken, title, body, {
          type: 'MARAKA_APALA',
          date: now.toISOString().split('T')[0],
          severity: worst.severity,
          apalaType: worst.type,
        }, { channelId: 'maraka-apala', priority: 'high' });

        await logNotification(token.uid, 'MARAKA_APALA', title, body, {
          date: now.toISOString().split('T')[0],
          severity: worst.severity,
        });

        notified++;
      } catch (err) {
        console.error(`[Scheduler] Maraka check failed for ${token.uid}:`, err.message);
      }
    }

    console.log(`[Scheduler] Maraka Apala: notified ${notified} users`);
  } catch (err) {
    console.error('[Scheduler] Maraka Apala check error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULER INIT — Start all notification timers
// ═══════════════════════════════════════════════════════════════
let schedulerRunning = false;

function startScheduler() {
  if (schedulerRunning) {
    console.log('[Scheduler] Already running');
    return;
  }
  schedulerRunning = true;
  console.log('[Scheduler] 🕐 Starting notification scheduler...');

  // ── Check every 5 minutes for Rahu Kalaya ──
  setInterval(() => {
    sendRahuKalayaWarning().catch(err => {
      console.error('[Scheduler] Rahu Kalaya interval error:', err.message);
    });
  }, 5 * 60 * 1000); // 5 minutes

  // ── Maraka Apala — check once daily at 6:00 AM SLT ──
  let marakaChecked = false;
  setInterval(() => {
    const now = new Date();
    const slt = toSLTDate(now);
    const sltHour = slt.getUTCHours();
    const sltMin = slt.getUTCMinutes();

    // Reset flag after the window passes
    if (!((sltHour === 5 && sltMin >= 55) || (sltHour === 6 && sltMin <= 5))) {
      marakaChecked = false;
      return;
    }

    // Target: 5:55-6:05 AM SLT
    if (((sltHour === 5 && sltMin >= 55) || (sltHour === 6 && sltMin <= 5)) && !marakaChecked) {
      marakaChecked = true;
      checkMarakaApalaForAllUsers().catch(err => {
        console.error('[Scheduler] Maraka interval error:', err.message);
        marakaChecked = false; // Allow retry on failure
      });
    }
  }, 10 * 60 * 1000); // 10 minutes

  // ── Weekly Lagna Palapala — Sunday 6:00 AM SLT ──
  // Generates AI-powered weekly predictions for all 12 lagnas
  // Then sends push notification to all users
  let weeklyLagnaGenerated = false;
  setInterval(() => {
    const now = new Date();
    const slt = toSLTDate(now);
    const sltDay = slt.getUTCDay(); // 0 = Sunday
    const sltHour = slt.getUTCHours();
    const sltMin = slt.getUTCMinutes();

    // Reset flag at midnight Sunday so it can generate again
    if (sltDay !== 0) {
      weeklyLagnaGenerated = false;
      return;
    }

    // Target: Sunday 5:55-6:10 AM SLT (window of 15 min)
    if ((sltDay === 0 && sltHour === 5 && sltMin >= 55) || (sltDay === 0 && sltHour === 6 && sltMin <= 10)) {
      if (weeklyLagnaGenerated) return;
      weeklyLagnaGenerated = true;

      console.log('[Scheduler] 🔮 Starting weekly lagna palapala generation...');
      generateWeeklyLagnaReports()
        .then(async (result) => {
          console.log(`[Scheduler] ✅ Weekly lagna reports generated: ${result.reportCount} lagnas for ${result.weekId}`);
          // Track AI cost
          if (result.usage) {
            trackCost('weeklyLagna', null, result.usage);
          }
          // Send notification to all users
          try {
            await sendWeeklyLagnaPushNotification();
          } catch (pushErr) {
            console.error('[Scheduler] Weekly lagna push error:', pushErr.message);
          }
        })
        .catch(err => {
          console.error('[Scheduler] Weekly lagna generation error:', err.message);
          weeklyLagnaGenerated = false; // Allow retry
        });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log('[Scheduler] ✅ Notification scheduler started');
  console.log('[Scheduler]    📊 Rahu Kalaya checks every 5 min');
  console.log('[Scheduler]    ⛔ Maraka Apala at 6:00 AM SLT');
  console.log('[Scheduler]    🔮 Weekly Lagna Palapala — Sunday 6:00 AM SLT');
}

// ═══════════════════════════════════════════════════════════════
// 5. WEEKLY LAGNA PUSH — Notify users about new weekly predictions
// ═══════════════════════════════════════════════════════════════
async function sendWeeklyLagnaPushNotification() {
  console.log('[Scheduler] Sending weekly lagna push notifications...');
  try {
    const tokens = await getTokensWithPreference('dailyPalapa'); // reuse same preference
    console.log(`[Scheduler] Weekly lagna push: ${tokens.length} users to notify`);

    let sent = 0;
    for (const token of tokens) {
      try {
        const lang = token.language || 'si';
        const title = lang === 'si' ? '🔮 සතිපතා ලග්න පලාපල' : '🔮 Weekly Lagna Palapala';
        const body = lang === 'si'
          ? 'මේ සතියේ ඔබේ ලග්නයට කුමක් සිදුවේද? දැන් බලන්න!'
          : "What does this week hold for your lagna? Check now!";

        await sendPush(token.pushToken, title, body, {
          type: 'WEEKLY_LAGNA',
          route: '/(tabs)',
        }, { channelId: 'weekly-lagna' });

        sent++;
      } catch (err) {
        // Skip individual failures
      }
    }
    console.log(`[Scheduler] Weekly lagna push sent to ${sent} users`);
  } catch (err) {
    console.error('[Scheduler] Weekly lagna push error:', err.message);
  }
}

function stopScheduler() {
  schedulerRunning = false;
  console.log('[Scheduler] Stopped');
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendRahuKalayaWarning,
  checkMarakaApalaForAllUsers,
  sendWeeklyLagnaPushNotification,
};
