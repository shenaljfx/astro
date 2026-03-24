/**
 * Notification Scheduler — Cron-like daily tasks
 * 
 * Runs scheduled notification jobs:
 *   1. Daily Palapa (පලාපල) — morning horoscope push at 5:30 AM SLT
 *   2. Rahu Kalaya Warning — 15 minutes before Rahu Kalaya starts
 *   3. Maraka Apala Alerts — daily check for users in dangerous periods
 *   4. Weekly Digest — Sunday summary of upcoming week
 * 
 * Uses setInterval for self-hosted servers.
 * For production: use Cloud Functions / Cloud Scheduler / cron job.
 */

const { calculateRahuKalaya, getDailyNakath, getNakshatra, getRashi, toSidereal, getMoonLongitude, getPanchanga } = require('../engine/astrology');
const { calculateMarakaApala } = require('../engine/maraka');
const { sendPush, getTokensWithPreference, logNotification } = require('./notifications');
const { getDb, COLLECTIONS } = require('../config/firebase');

// SLT offset in ms (UTC+5:30)
const SLT_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toSLTDate(date) {
  return new Date(date.getTime() + SLT_OFFSET_MS);
}

// ═══════════════════════════════════════════════════════════════
// 1. DAILY PALAPA — Morning horoscope notification
// ═══════════════════════════════════════════════════════════════
async function sendDailyPalapa() {
  console.log('[Scheduler] Starting daily palapa push...');
  
  try {
    const today = new Date();
    const panchanga = getPanchanga(today, 6.9271, 79.8612);
    const nakath = getDailyNakath(today, 6.9271, 79.8612);

    // Get all users who have daily palapa enabled
    const tokens = await getTokensWithPreference('dailyPalapa');
    console.log(`[Scheduler] Daily palapa: ${tokens.length} users to notify`);

    const tithiName = panchanga?.tithi?.name || 'Unknown';
    const nakshatraName = panchanga?.nakshatra?.name || 'Unknown';
    const nakshatraSinhala = panchanga?.nakshatra?.sinhala || '';
    const yogaName = panchanga?.yoga?.name || '';

    for (const token of tokens) {
      try {
        const lang = token.language || 'si';
        const birthData = token.birthData;

        let title, body;

        if (lang === 'si') {
          title = '🌅 අද දිනයේ පලාපල';
          body = `නක්ෂත්‍රය: ${nakshatraSinhala || nakshatraName} | තිථිය: ${tithiName}`;
          
          // Personalize if birth data available
          if (birthData?.dateTime) {
            try {
              const bDate = new Date(birthData.dateTime);
              const moonLong = getMoonLongitude(bDate);
              const siderealMoon = toSidereal(moonLong, bDate);
              const moonRashi = getRashi(siderealMoon);
              if (moonRashi?.sinhala) {
                body += ` | ඔබේ රාශිය: ${moonRashi.sinhala}`;
              }
            } catch (e) { /* personalization failed, use generic */ }
          }
        } else {
          title = '🌅 Today\'s Horoscope';
          body = `Nakshatra: ${nakshatraName} | Tithi: ${tithiName}`;
          
          if (birthData?.dateTime) {
            try {
              const bDate = new Date(birthData.dateTime);
              const moonLong = getMoonLongitude(bDate);
              const siderealMoon = toSidereal(moonLong, bDate);
              const moonRashi = getRashi(siderealMoon);
              if (moonRashi?.english) {
                body += ` | Your sign: ${moonRashi.english}`;
              }
            } catch (e) { /* skip */ }
          }
        }

        await sendPush(token.pushToken, title, body, {
          type: 'DAILY_PALAPA',
          date: today.toISOString().split('T')[0],
          nakshatra: nakshatraName,
          tithi: tithiName,
        }, { channelId: 'daily-palapa' });

        await logNotification(token.uid, 'DAILY_PALAPA', title, body);
      } catch (err) {
        console.error(`[Scheduler] Palapa push failed for ${token.uid}:`, err.message);
      }
    }

    console.log(`[Scheduler] Daily palapa sent to ${tokens.length} users`);
  } catch (err) {
    console.error('[Scheduler] Daily palapa error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. RAHU KALAYA WARNING — 15 min before
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

  // ── Daily Palapa — check every 10 minutes, send at 5:30 AM SLT ──
  setInterval(() => {
    const now = new Date();
    const slt = toSLTDate(now);
    const sltHour = slt.getUTCHours();
    const sltMin = slt.getUTCMinutes();

    // Target: 5:25-5:35 AM SLT
    if (sltHour === 5 && sltMin >= 25 && sltMin <= 35) {
      sendDailyPalapa().catch(err => {
        console.error('[Scheduler] Daily palapa interval error:', err.message);
      });
    }
  }, 10 * 60 * 1000); // 10 minutes

  // ── Maraka Apala — check once daily at 6:00 AM SLT ──
  setInterval(() => {
    const now = new Date();
    const slt = toSLTDate(now);
    const sltHour = slt.getUTCHours();
    const sltMin = slt.getUTCMinutes();

    // Target: 5:55-6:05 AM SLT
    if (sltHour === 5 && sltMin >= 55 || sltHour === 6 && sltMin <= 5) {
      checkMarakaApalaForAllUsers().catch(err => {
        console.error('[Scheduler] Maraka interval error:', err.message);
      });
    }
  }, 10 * 60 * 1000); // 10 minutes

  console.log('[Scheduler] ✅ Notification scheduler started');
  console.log('[Scheduler]    📊 Rahu Kalaya checks every 5 min');
  console.log('[Scheduler]    🌅 Daily Palapa at 5:30 AM SLT');
  console.log('[Scheduler]    ⛔ Maraka Apala at 6:00 AM SLT');
}

function stopScheduler() {
  schedulerRunning = false;
  console.log('[Scheduler] Stopped');
}

module.exports = {
  startScheduler,
  stopScheduler,
  sendDailyPalapa,
  sendRahuKalayaWarning,
  checkMarakaApalaForAllUsers,
};
