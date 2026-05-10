/**
 * Notification Scheduler — Cron-like daily tasks
 * 
 * Runs scheduled notification jobs:
 *   1. Rahu Kalaya Warning — 15 minutes before Rahu Kalaya starts
 *   2. Daily Guidance — motivation, do and do not advice every morning
 *   3. Maraka Apala Alerts — daily check for users in dangerous periods
 *   4. Weekly Lagna Palapala — Sunday AI-generated weekly predictions
 * 
 * Uses setInterval for self-hosted servers.
 * For production: use Cloud Functions / Cloud Scheduler / cron job.
 */

const { calculateRahuKalaya, getPanchanga, getDailyNakath } = require('../engine/astrology');
const { calculateMarakaApala } = require('../engine/maraka');
const { sendPush, getTokensWithPreference, logNotification } = require('./notifications');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { enqueueWeeklyLagnaJob } = require('./jobQueue');

const SLT_OFFSET_MS = 19800 * 1000;
const SRI_LANKA_TIME_CONTEXT = { zoneName: 'Asia/Colombo', offsetSeconds: 19800, source: 'traditional_slt' };
const MARAKA_APALA_HOUR = 8;
const MARAKA_APALA_MINUTE = 0;
const DAILY_AFFIRMATION_HOUR = 8;
const DAILY_AFFIRMATION_MINUTE = 15;
const DAILY_GUIDANCE_HOUR = 8;
const DAILY_GUIDANCE_MINUTE = 30;
const NOTIFICATION_WINDOW_MINUTES = 5;

/**
 * Get hour and minute in a user's local timezone.
 * Falls back to Asia/Colombo if timezone is invalid.
 */
function getUserLocalTime(now, timezone) {
  try {
    const tz = timezone || 'Asia/Colombo';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    return { hour, minute };
  } catch (e) {
    // Invalid timezone — fall back to SLT
    const slt = toSLTDate(now);
    return { hour: slt.getUTCHours(), minute: slt.getUTCMinutes() };
  }
}

/**
 * Check if it's within a time window in the user's local timezone.
 */
function isInUserWindow(now, timezone, targetHour, targetMinute, windowMinutes) {
  const { hour, minute } = getUserLocalTime(now, timezone);
  const currentMinutes = hour * 60 + minute;
  const targetMinutes = targetHour * 60 + targetMinute;
  return currentMinutes >= targetMinutes - windowMinutes && currentMinutes <= targetMinutes + windowMinutes;
}

/**
 * Get today's date key in the user's local timezone.
 */
function getUserDateKey(now, timezone) {
  try {
    const tz = timezone || 'Asia/Colombo';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch (e) {
    return getSLTDateKey(now);
  }
}

function getWeekId(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

function toSLTDate(date) {
  return new Date(date.getTime() + SLT_OFFSET_MS);
}

function getSLTDateKey(date) {
  return toSLTDate(date).toISOString().split('T')[0];
}

function formatSLTTime(date) {
  const slt = toSLTDate(date);
  const h = slt.getUTCHours();
  const m = slt.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${(h % 12 || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isInSLTWindow(date, hour, minute, windowMinutes) {
  const slt = toSLTDate(date);
  const currentMinutes = slt.getUTCHours() * 60 + slt.getUTCMinutes();
  const targetMinutes = hour * 60 + minute;
  return currentMinutes >= targetMinutes - windowMinutes && currentMinutes <= targetMinutes + windowMinutes;
}

function getSLTDayOfYear(date) {
  const slt = toSLTDate(date);
  const year = slt.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, slt.getUTCMonth(), slt.getUTCDate());
  return Math.floor((current - start) / 86400000) + 1;
}

async function hasNotificationForDate(uid, type, dateKey) {
  const db = getDb();
  if (!db) return false;

  const existing = await db.collection(COLLECTIONS.NOTIFICATIONS)
    .where('uid', '==', uid)
    .where('type', '==', type)
    .where('data.date', '==', dateKey)
    .limit(1)
    .get();

  return !existing.empty;
}

const DAILY_GUIDANCE_COPY = {
  en: {
    title: 'Daily guidance',
    motivations: [
      'Begin with one clear intention.',
      'Steady effort brings quiet progress.',
      'Choose patience before pressure.',
      'Your calm is your strength today.',
      'Small discipline can change the whole day.',
      'Move with grace, not haste.',
      'Rest is part of alignment.',
    ],
    dos: [
      'handle important work before distractions grow',
      'protect your focus and complete one pending task',
      'speak clearly and keep promises simple',
      'review plans before acting on them',
      'make room for prayer, meditation, or reflection',
      'listen carefully before giving an answer',
      'reconnect with family, faith, or your inner steadiness',
    ],
    donts: [
      'rush new commitments during tense moments',
      'carry yesterday\'s frustration into today',
      'start conflict over small delays',
      'overpromise your time or energy',
      'ignore your intuition when something feels off',
      'make emotional purchases or impulsive promises',
      'let worry make the decision for you',
    ],
  },
  si: {
    title: 'දෛනික මඟපෙන්වීම',
    motivations: [
      'පැහැදිලි අරමුණකින් දවස අරඹන්න.',
      'ස්ථිර උත්සාහය නිහඬ ප්‍රගතියක් ගෙන එයි.',
      'පීඩනයට පෙර ඉවසීම තෝරන්න.',
      'අද ඔබේ සන්සුන්කම ඔබේ ශක්තියයි.',
      'කුඩා විනයක් දවසම වෙනස් කළ හැක.',
      'ඉක්මන් නොවී සුරුවමෙන් ඉදිරියට යන්න.',
      'විවේකයත් සන්ධානයේ කොටසකි.',
    ],
    dos: [
      'අවධානය බිඳීමට පෙර වැදගත් වැඩ කරන්න',
      'අවධානය රැකගෙන එක ඉතිරි වැඩක් අවසන් කරන්න',
      'පැහැදිලිව කතා කර පොරොන්දු සරලව තබාගන්න',
      'ක්‍රියාවට පෙර සැලසුම් නැවත බලන්න',
      'ප්‍රාර්ථනා, භාවනා හෝ සිතීමකට වේලාවක් දෙන්න',
      'පිළිතුරක් දීමට පෙර හොඳින් ඇහුම්කන් දෙන්න',
      'පවුල, ආගමික සිතුවිලි හෝ අභ්‍යන්තර සන්සුන්කම සමඟ සම්බන්ධ වෙන්න',
    ],
    donts: [
      'ආතතික මොහොතක නව පොරොන්දු හදිසි කරගන්න එපා',
      'ඊයේ කෝපය අදට ගෙන එන්න එපා',
      'කුඩා ප්‍රමාදයකින් ගැටුම් අරඹන්න එපා',
      'ඔබේ කාලය හෝ ශක්තිය අධිකව පොරොන්දු වෙන්න එපා',
      'යමක් වැරදි බව දැනුණොත් අභ්‍යන්තර හැඟීම නොසලකා හරින්න එපා',
      'හැඟීම් මත වියදම් හෝ පොරොන්දු කරන්න එපා',
      'කනස්සල්ලට ඔබ වෙනුවෙන් තීරණ දෙන්න එපා',
    ],
  },
};

function buildDailyGuidanceMessage(date, lang, panchanga, rahuKalaya, nakath) {
  const language = lang === 'en' ? 'en' : 'si';
  const copy = DAILY_GUIDANCE_COPY[language];
  const dayIndex = getSLTDayOfYear(date);
  const idx = dayIndex % copy.motivations.length;
  const nakshatra = panchanga?.nakshatra?.name || null;
  const nakshatraSi = panchanga?.nakshatra?.sinhala || null;
  const tithi = panchanga?.tithi?.name || null;
  const firstAuspicious = nakath?.auspiciousPeriods?.[0] || null;
  const rahuText = rahuKalaya?.start && rahuKalaya?.end
    ? `${formatSLTTime(rahuKalaya.start)}-${formatSLTTime(rahuKalaya.end)}`
    : null;

  if (language === 'en') {
    const sky = nakshatra ? ` Moon: ${nakshatra}${tithi ? `, ${tithi}` : ''}.` : '';
    const goodTime = firstAuspicious ? ` Good time: ${firstAuspicious.name} ${formatSLTTime(firstAuspicious.start)}.` : '';
    const rahu = rahuText ? ` Avoid new starts during Rahu Kalaya ${rahuText}.` : '';
    return {
      title: copy.title,
      body: `${copy.motivations[idx]} Do: ${copy.dos[idx]}. Do not: ${copy.donts[idx]}.${sky}${goodTime}${rahu}`,
    };
  }

  const sky = nakshatraSi || nakshatra ? ` නැකත: ${nakshatraSi || nakshatra}${tithi ? `, ${tithi}` : ''}.` : '';
  const goodTime = firstAuspicious ? ` සුබ වේලාව: ${firstAuspicious.sinhala || firstAuspicious.name} ${formatSLTTime(firstAuspicious.start)}.` : '';
  const rahu = rahuText ? ` රාහු කාලයේ (${rahuText}) නව වැඩ අරඹන්න එපා.` : '';
  return {
    title: copy.title,
    body: `${copy.motivations[idx]} කරන්න: ${copy.dos[idx]}. නොකරන්න: ${copy.donts[idx]}.${sky}${goodTime}${rahu}`,
  };
}

// ═══════════════════════════════════════════════════════════════
// 2. DAILY GUIDANCE — Motivation + Do + Do Not every morning
// ═══════════════════════════════════════════════════════════════
async function sendDailyGuidanceNotification() {
  console.log('[Scheduler] Checking daily guidance for users in 8:30 AM window...');

  try {
    const now = new Date();
    const tokens = await getTokensWithPreference('dailyPalapa');

    let sent = 0;
    let skipped = 0;
    let notInWindow = 0;

    for (const token of tokens) {
      try {
        const tz = token.timezone || 'Asia/Colombo';
        if (!isInUserWindow(now, tz, DAILY_GUIDANCE_HOUR, DAILY_GUIDANCE_MINUTE, NOTIFICATION_WINDOW_MINUTES)) {
          notInWindow++;
          continue;
        }

        const todayKey = getUserDateKey(now, tz);
        if (await hasNotificationForDate(token.uid, 'DAILY_GUIDANCE', todayKey)) {
          skipped++;
          continue;
        }

        const birthData = token.birthData || {};
        const lat = parseFloat(birthData.lat) || 6.9271;
        const lng = parseFloat(birthData.lng) || 79.8612;
        const panchanga = getPanchanga(now, lat, lng, { timeContext: SRI_LANKA_TIME_CONTEXT });
        const nakath = getDailyNakath(now, lat, lng, { timeContext: SRI_LANKA_TIME_CONTEXT });
        const rahuKalaya = calculateRahuKalaya(now, lat, lng, { timeContext: SRI_LANKA_TIME_CONTEXT });
        const guidance = buildDailyGuidanceMessage(now, token.language || 'si', panchanga, rahuKalaya, nakath);
        const data = {
          type: 'DAILY_GUIDANCE',
          date: todayKey,
          nakshatra: panchanga?.nakshatra?.name || null,
          tithi: panchanga?.tithi?.name || null,
          rahuStart: rahuKalaya?.start?.toISOString() || null,
          rahuEnd: rahuKalaya?.end?.toISOString() || null,
        };

        const result = await sendPush(token.pushToken, guidance.title, guidance.body, data, {
          channelId: 'daily-guidance',
          priority: 'normal',
        });

        if (result.sent > 0) {
          await logNotification(token.uid, 'DAILY_GUIDANCE', guidance.title, guidance.body, data);
          sent++;
        }
      } catch (err) {
        console.error(`[Scheduler] Daily guidance failed for ${token.uid}:`, err.message);
      }
    }

    console.log(`[Scheduler] Daily guidance: sent=${sent}, skipped=${skipped}, not-in-window=${notInWindow}`);
  } catch (err) {
    console.error('[Scheduler] Daily guidance error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. RAHU KALAYA WARNING — 15 min before
// ═══════════════════════════════════════════════════════════════
async function sendRahuKalayaWarning() {
  console.log('[Scheduler] Checking Rahu Kalaya...');

  try {
    const now = new Date();
    const rahuKalaya = calculateRahuKalaya(now, 6.9271, 79.8612, { timeContext: SRI_LANKA_TIME_CONTEXT });

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
  console.log('[Scheduler] Checking Maraka Apala for users in 8:00 AM window...');

  try {
    const now = new Date();
    const tokens = await getTokensWithPreference('marakaApalaAlerts');

    let notified = 0;
    let notInWindow = 0;

    for (const token of tokens) {
      try {
        const tz = token.timezone || 'Asia/Colombo';
        if (!isInUserWindow(now, tz, MARAKA_APALA_HOUR, MARAKA_APALA_MINUTE, NOTIFICATION_WINDOW_MINUTES)) {
          notInWindow++;
          continue;
        }

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
        const todayStr = getUserDateKey(now, tz);
        if (await hasNotificationForDate(token.uid, 'MARAKA_APALA', todayStr)) continue;

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
          date: todayStr,
          severity: worst.severity,
          apalaType: worst.type,
        }, { channelId: 'maraka-apala', priority: 'high' });

        await logNotification(token.uid, 'MARAKA_APALA', title, body, {
          date: todayStr,
          severity: worst.severity,
        });

        notified++;
      } catch (err) {
        console.error(`[Scheduler] Maraka check failed for ${token.uid}:`, err.message);
      }
    }

    console.log(`[Scheduler] Maraka Apala: notified=${notified}, not-in-window=${notInWindow}`);
  } catch (err) {
    console.error('[Scheduler] Maraka Apala check error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// DAILY MORNING AFFIRMATION — Beautiful Vedic-themed affirmations
// ═══════════════════════════════════════════════════════════════

const MORNING_AFFIRMATIONS = {
  en: [
    { title: '🌅 Morning Blessing', body: 'You are aligned with the rhythm of the cosmos. Today, every step you take carries purpose. Trust the path unfolding before you.' },
    { title: '✨ Cosmic Energy', body: 'The universe is conspiring in your favour today. Open your heart to receive what is already on its way to you.' },
    { title: '🌸 Inner Light', body: 'Your inner light shines brighter than any shadow. Today you radiate warmth, wisdom, and quiet confidence to everyone around you.' },
    { title: '🌿 Sacred Morning', body: 'Like the lotus rising through still water, you rise above yesterday. This morning is your fresh beginning — breathe it in deeply.' },
    { title: '💫 Abundant Day', body: 'Abundance flows through you like a river finding the sea. Today you attract exactly what your soul has been preparing for.' },
    { title: '🕊️ Peace Within', body: 'You carry a deep peace that nothing can disturb. Whatever comes today, your calm centre holds steady like the North Star.' },
    { title: '🌙 Celestial Guide', body: 'The stars that watched over your birth still guide you. Today their light illuminates the right decision at the right moment.' },
    { title: '🔥 Inner Strength', body: 'There is a fire within you that no storm can extinguish. Today you move forward with courage, clarity, and unwavering determination.' },
    { title: '🌺 Heart Blessing', body: 'Love flows to you and through you effortlessly. Today your kind words and gentle presence will touch someone who truly needs it.' },
    { title: '🌟 Destined Path', body: 'Every experience has prepared you for this moment. You are exactly where you need to be. Trust your journey and walk boldly.' },
    { title: '🍃 Gentle Power', body: 'True power is gentle. Today you lead with compassion, act with wisdom, and let your actions speak louder than your worries.' },
    { title: '💎 Precious Soul', body: 'You are rare and irreplaceable, like a gem forged through time. Today the world sees your brilliance — let it shine without apology.' },
    { title: '🌊 Flowing Grace', body: 'Like water finding its natural course, your life flows toward its highest good. Relax into today and let grace carry you forward.' },
    { title: '☀️ Radiant Morning', body: 'The sun rises for you today. Its golden warmth reminds you that every darkness passes, and your brightest chapter is still being written.' },
    { title: '🙏 Gratitude Sunrise', body: 'This breath is a gift. This morning is a blessing. Today you walk with a grateful heart, and the universe rewards your appreciation.' },
    { title: '🌈 New Possibilities', body: 'Today holds possibilities you haven\'t even imagined yet. Stay open, stay curious, and watch how beautifully the day unfolds for you.' },
    { title: '⭐ Star Alignment', body: 'The celestial bodies align to support your intentions today. What you set your mind to now carries the momentum of the cosmos behind it.' },
    { title: '🏔️ Unshakeable You', body: 'You are as steady as the mountains and as adaptable as the wind. Today, nothing can shake the foundation of peace you\'ve built within.' },
    { title: '🌻 Blossoming Day', body: 'Every seed of effort you\'ve planted is quietly blossoming. Today you begin to see the fruits of your patience and perseverance.' },
    { title: '🦋 Beautiful Change', body: 'Change is not something to fear — it is the universe reshaping your life into something more beautiful. Embrace today\'s transformation.' },
    { title: '💛 Golden Heart', body: 'Your heart is pure gold. Today, lead with kindness and watch how doors open, connections deepen, and miracles find their way to you.' },
    { title: '🌴 Rooted & Rising', body: 'Your roots run deep into ancient wisdom, and your spirit reaches for the sky. Today you stand tall between earth and heaven.' },
    { title: '🎋 Balanced Soul', body: 'Balance is not stillness — it is graceful movement through life\'s waves. Today you navigate every situation with poise and inner harmony.' },
    { title: '🕉️ Sacred Rhythm', body: 'You are part of the sacred rhythm of creation. Today your thoughts, words, and actions harmonise with the pulse of the universe.' },
    { title: '🌤️ Clear Sky Mind', body: 'Your mind is as clear as the morning sky. Today, thoughts of doubt dissolve like mist, revealing the bright clarity within you.' },
    { title: '💐 Blessed Life', body: 'Your life is a garden of blessings — some blooming now, others waiting for their season. Today, tend your garden with love and faith.' },
    { title: '🔮 Intuition Speaks', body: 'Your intuition is your cosmic compass. Today it speaks with perfect clarity — listen to its whisper before the world gets loud.' },
    { title: '🌾 Harvest Time', body: 'You have worked hard in silence. Today the universe begins to reward your dedication. Receive its gifts with grace and humility.' },
    { title: '🏯 Peaceful Warrior', body: 'You are both gentle and strong, kind and fierce. Today you protect what matters, speak your truth, and still hold space for compassion.' },
    { title: '🎆 Infinite Potential', body: 'You carry infinite potential within you — the same energy that moves the stars runs through your veins. Today, believe in your own power.' },
  ],
  si: [
    { title: '🌅 උදෑසන ආශිර්වාදය', body: 'ඔයා විශ්වයේ ලයට එකතු වෙලා ඉන්නේ. අද ඔයා තියන හැම පියවරක්ම අරමුණක් දරනවා. ඔයා ඉදිරියේ මතුවන මාර්ගය විශ්වාස කරන්න.' },
    { title: '✨ විශ්ව ශක්තිය', body: 'විශ්වය අද ඔයාට හිතකර ලෙස ක්‍රියා කරනවා. ඔයා ළඟට එන දේවල් ලැබීමට හදවත විවෘත කරන්න.' },
    { title: '🌸 අභ්‍යන්තර ආලෝකය', body: 'ඔයාගේ ඇතුළත ආලෝකය ඕනෑම සෙවණැල්ලකට වඩා දීප්තිමත්. අද ඔයා උණුසුම, ප්‍රඥාව සහ සන්සුන් විශ්වාසය පතුරවනවා.' },
    { title: '🌿 ශුද්ධ උදෑසන', body: 'නිස්කලංක දියෙන් නැගෙන නෙළුම මෙන් ඔයා ඊයේ ඉහළට නැඟෙනවා. මේ උදෑසන ඔයාගේ අලුත් ආරම්භයයි — ගැඹුරින් හුස්ම ගන්න.' },
    { title: '💫 සෞභාග්‍යමත් දවස', body: 'සමෘද්ධිය මුහුදට ගලන ගඟක් වගේ ඔයා තුළින් ගලනවා. ඔයාගේ ආත්මය සූදානම් කළ දේ හරියටම අද ඔයාට ඇදෙනවා.' },
    { title: '🕊️ ඇතුළත සාමය', body: 'ඔයා තුළ කිසිවකුට බිඳ දැමිය නොහැකි ගැඹුරු සාමයක් තියෙනවා. අද මොනවා ආවත්, ඔයාගේ සන්සුන් මධ්‍යය ස්ථිරව පවතිනවා.' },
    { title: '🌙 දිව්‍ය මඟපෙන්නුම', body: 'ඔයාගේ උපතින් ඔයාව බැලූ තරු තවමත් ඔයාව මඟ පෙන්වනවා. අද ඒ ආලෝකය නිවැරදි මොහොතේ නිවැරදි තීරණය පෙන්වනවා.' },
    { title: '🔥 අභ්‍යන්තර ශක්තිය', body: 'ඔයා තුළ කිසිදු කුණාටුවකට නිවිය නොහැකි ගින්නක් තියෙනවා. අද ඔයා නිර්භීතව, පැහැදිලිව ඉදිරියට යනවා.' },
    { title: '🌺 හදවතේ ආශිර්වාදය', body: 'ආදරය ඔයාට සහ ඔයා හරහා ආයාසයෙන් තොරව ගලනවා. අද ඔයාගේ මෘදු වචන සැබවින්ම අවශ්‍ය කෙනෙකුව ස්පර්ශ කරනවා.' },
    { title: '🌟 නියමිත මාර්ගය', body: 'සෑම අත්දැකීමක්ම ඔයාව මේ මොහොතට සූදානම් කළා. ඔයා හරියටම ඉන්න ඕනෙ තැනක ඉන්නේ. ගමන විශ්වාස කරන්න.' },
    { title: '🍃 මෘදු බලය', body: 'සැබෑ බලය මෘදු යි. අද ඔයා අනුකම්පාවෙන් මඟ පෙන්වනවා, ප්‍රඥාවෙන් ක්‍රියා කරනවා. ඔයාගේ ක්‍රියා වලට කතා කරන්න දෙන්න.' },
    { title: '💎 වටිනා ආත්මය', body: 'කාලය තුළ හැඩගැසුණු මැණිකක් වගේ ඔයා දුර්ලභයි, ආදේශ කළ නොහැකියි. අද ලෝකය ඔයාගේ දීප්තිය දකිනවා — බිය නැතුව බැබළෙන්න.' },
    { title: '🌊 ගලා යන කරුණාව', body: 'දිය ස්වභාවිකව ගලා යන්නා සේ, ඔයාගේ ජීවිතය උසස්ම යහපත දෙසට ගලනවා. අද ලිහිල් වී කරුණාවට ඔයාව ගෙන යන්න දෙන්න.' },
    { title: '☀️ දීප්තිමත් උදෑසන', body: 'අද හිරු ඔයා වෙනුවෙන් නැගෙනවා. සෝනර රන් උණුසුම සිහිපත් කරනවා — සෑම අඳුරක්ම ගෙවී යනවා, ඔයාගේ දීප්තිමත්ම පරිච්ඡේදය තවම ලියවෙමින් තියෙනවා.' },
    { title: '🙏 කෘතඥතා උදාව', body: 'මේ හුස්ම දීමනාවක්. මේ උදෑසන ආශිර්වාදයක්. අද ඔයා කෘතඥ හදවතකින් ගමන් කරනවා, විශ්වය ඔයාගේ අගයකිරීමට ත්‍යාග දෙනවා.' },
    { title: '🌈 අලුත් හැකියාවන්', body: 'ඔයා තවම සිතාවත් නැති හැකියාවන් අද ගබඩා කරගෙන තියෙනවා. විවෘතව ඉන්න, කුතුහලයෙන් ඉන්න — දවස කෙතරම් ලස්සනට දිග හැරෙනවද බලන්න.' },
    { title: '⭐ තරු සමපාතය', body: 'අද ග්‍රහලෝක ඔයාගේ අරමුණු සඳහා සහය වෙනවා. ඔයා දැන් මනස යොමු කරන දේට පිටුපස විශ්වයේ ගම්‍යතාව තියෙනවා.' },
    { title: '🏔️ කම්පනය නැති ඔයා', body: 'ඔයා කඳු තරම් ස්ථිරයි, සුළඟ තරම් අනුවර්තනශීලියි. අද, ඔයා ඇතුළත ගොඩනගාගත් සාමයේ පදනමට කිසිවකට සැලීම කළ නොහැක.' },
    { title: '🌻 මල් පිපෙන දවස', body: 'ඔයා සිටු වූ සෑම උත්සාහයක ඇටයක්ම නිහඬව මල් පිපෙනවා. අද ඔයාගේ ඉවසීමේ සහ නොපසුබස්නා බවේ ඵල පෙනෙන්නට පටන් ගන්නවා.' },
    { title: '🦋 සුන්දර වෙනස', body: 'වෙනස බිය විය යුතු දෙයක් නෙමෙයි — ඒ විශ්වය ඔයාගේ ජීවිතය වඩා සුන්දර දෙයක් බවට හැඩ ගැන්වීමයි. අද වෙනස වැළඳ ගන්න.' },
    { title: '💛 රන් හදවත', body: 'ඔයාගේ හදවත පිරිසිදු රනක්. අද කාරුණිකත්වයෙන් මඟ පෙන්වන්න — දොරවල් විවෘත වෙනවා, සම්බන්ධතා ගැඹුරු වෙනවා, පුදුම දේවල් ඔයාව සොයා එනවා.' },
    { title: '🌴 මුල්බැස නැගීම', body: 'ඔයාගේ මුල් පුරාණ ප්‍රඥාවට ගැඹුරින් දිව ගිහින් තියෙනවා, ඔයාගේ ආත්මය අහසට ළඟා වෙනවා. අද ඔයා පොළොවත් අහසත් අතර උස්ව සිටිනවා.' },
    { title: '🎋 සමබර ආත්මය', body: 'සමබරතාවය නිශ්චලතාවය නෙමෙයි — ජීවිතයේ රැළි හරහා සුරුවමෙන් ගමන් කිරීමයි. අද ඔයා සෑම තත්ත්වයක්ම අභ්‍යන්තර සාමයෙන් හසුරුවනවා.' },
    { title: '🕉️ ශුද්ධ ලය', body: 'ඔයා සෘෂ්ටියේ ශුද්ධ ලයෙහි කොටසක්. අද ඔයාගේ සිතුවිලි, වචන සහ ක්‍රියා විශ්වයේ ස්පන්දනය සමඟ සමගත වෙනවා.' },
    { title: '🌤️ පැහැදිලි අහස් මනස', body: 'ඔයාගේ මනස උදෑසන අහස තරම් පැහැදිලියි. අද සැක සිතුවිලි මීදුම වගේ දිය වෙනවා — ඔයා තුළ ඇති දීප්තිමත් පැහැදිලි බව හෙළි වෙනවා.' },
    { title: '💐 ආශිර්වාදිත ජීවිතය', body: 'ඔයාගේ ජීවිතය ආශිර්වාදයන්ගේ උද්‍යානයක් — සමහරක් දැන් මල් පිපෙනවා, තවත් ඒවා තමන්ගේ සෘතුව බලා ඉන්නවා. අද ආදරයෙන් සහ ඇදහිල්ලෙන් රැකබලා ගන්න.' },
    { title: '🔮 බුද්ධිය කතා කරනවා', body: 'ඔයාගේ බුද්ධිය ඔයාගේ විශ්ව මාලිමාවයි. අද ඒක පරිපූර්ණ පැහැදිලිකමින් කතා කරනවා — ලෝකය ශබ්ද වෙන්නට කලින් ඒකේ මුමුණුවට සවන් දෙන්න.' },
    { title: '🌾 අස්වැන්න නෙලන කාලය', body: 'ඔයා නිහඬව වෙහෙස වුණා. අද විශ්වය ඔයාගේ කැපවීමට ත්‍යාග දෙන්නට පටන් ගන්නවා. කරුණාවෙන් සහ නිහතමානීත්වයෙන් ලබා ගන්න.' },
    { title: '🏯 සාමකාමී සටන්කරු', body: 'ඔයා මෘදුයි සහ ශක්තිමත්, කාරුණිකයි සහ නිර්භීතයි. අද වැදගත් දේ රැකගන්න, ඔයාගේ සත්‍යය කියන්න, තවමත් අනුකම්පාවට ඉඩක් තියාගන්න.' },
    { title: '🎆 අනන්ත හැකියාව', body: 'ඔයා තුළ අනන්ත හැකියාවක් තියෙනවා — තරු චලනය කරන ශක්තියම ඔයාගේ නහර තුළ ගලනවා. අද, ඔයාගේම බලය විශ්වාස කරන්න.' },
  ],
};

function buildDailyAffirmationMessage(date, lang) {
  const language = lang === 'en' ? 'en' : 'si';
  const pool = MORNING_AFFIRMATIONS[language];
  const dayOfYear = getSLTDayOfYear(date);
  const idx = dayOfYear % pool.length;
  return pool[idx];
}

async function sendDailyAffirmationNotification() {
  console.log('[Scheduler] Checking daily affirmation for users in 8:15 AM window...');

  try {
    const now = new Date();
    const tokens = await getTokensWithPreference('dailyPalapa');

    let sent = 0;
    let skipped = 0;
    let notInWindow = 0;

    for (const token of tokens) {
      try {
        const tz = token.timezone || 'Asia/Colombo';
        if (!isInUserWindow(now, tz, DAILY_AFFIRMATION_HOUR, DAILY_AFFIRMATION_MINUTE, NOTIFICATION_WINDOW_MINUTES)) {
          notInWindow++;
          continue;
        }

        const todayKey = getUserDateKey(now, tz);
        if (await hasNotificationForDate(token.uid, 'DAILY_AFFIRMATION', todayKey)) {
          skipped++;
          continue;
        }

        const lang = token.language || 'si';
        const affirmation = buildDailyAffirmationMessage(now, lang);

        // Enrich with today's nakshatra
        const panchanga = getPanchanga(now, 6.9271, 79.8612, { timeContext: SRI_LANKA_TIME_CONTEXT });
        const nakshatraName = lang === 'en'
          ? (panchanga?.nakshatra?.name || '')
          : (panchanga?.nakshatra?.sinhala || panchanga?.nakshatra?.name || '');
        const suffix = nakshatraName
          ? (lang === 'en' ? `\n🌙 ${nakshatraName} Nakshatra` : `\n🌙 ${nakshatraName} නැකත`)
          : '';

        const body = affirmation.body + suffix;

        const result = await sendPush(token.pushToken, affirmation.title, body, {
          type: 'DAILY_AFFIRMATION',
          date: todayKey,
          route: '/(tabs)',
        }, {
          channelId: 'daily-affirmation',
          priority: 'high',
        });

        if (result.sent > 0) {
          await logNotification(token.uid, 'DAILY_AFFIRMATION', affirmation.title, body, { date: todayKey });
          sent++;
        }
      } catch (err) {
        console.error(`[Scheduler] Affirmation failed for ${token.uid}:`, err.message);
      }
    }

    console.log(`[Scheduler] Daily affirmation: sent=${sent}, skipped=${skipped}, not-in-window=${notInWindow}`);
  } catch (err) {
    console.error('[Scheduler] Daily affirmation error:', err.message);
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

  // ── Daily Affirmation — 8:15 AM in each user's timezone ──
  setInterval(() => {
    sendDailyAffirmationNotification().catch(err => {
      console.error('[Scheduler] Daily affirmation interval error:', err.message);
    });
  }, 60 * 1000); // every minute

  // ── Daily Guidance — 8:30 AM in each user's timezone ──
  setInterval(() => {
    sendDailyGuidanceNotification().catch(err => {
      console.error('[Scheduler] Daily guidance interval error:', err.message);
    });
  }, 60 * 1000); // every minute

  // ── Maraka Apala — 8:00 AM in each user's timezone ──
  setInterval(() => {
    checkMarakaApalaForAllUsers().catch(err => {
      console.error('[Scheduler] Maraka interval error:', err.message);
    });
  }, 60 * 1000); // every minute

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

      const weekId = getWeekId(now);
      console.log(`[Scheduler] Queueing weekly lagna palapala generation for ${weekId}...`);
      enqueueWeeklyLagnaJob({ weekId, requestedBy: 'scheduler', requestedAt: new Date().toISOString() })
        .then((job) => {
          if (!job) throw new Error('Durable weekly job storage is unavailable');
          console.log(`[Scheduler] Weekly lagna job queued: ${job.id}${job.deduped ? ' (duplicate)' : ''}`);
        })
        .catch(err => {
          console.error('[Scheduler] Weekly lagna queue error:', err.message);
          weeklyLagnaGenerated = false; // Allow retry
        });
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log('[Scheduler] ✅ Notification scheduler started');
  console.log('[Scheduler]    📊 Rahu Kalaya checks every 5 min');
  console.log('[Scheduler]    ⛔ Maraka Apala at 8:00 AM (user timezone)');
  console.log('[Scheduler]    🌅 Daily affirmation at 8:15 AM (user timezone)');
  console.log('[Scheduler]    🌅 Daily guidance at 8:30 AM (user timezone)');
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
  sendDailyGuidanceNotification,
  sendDailyAffirmationNotification,
  buildDailyGuidanceMessage,
  buildDailyAffirmationMessage,
  sendRahuKalayaWarning,
  checkMarakaApalaForAllUsers,
  sendWeeklyLagnaPushNotification,
};
