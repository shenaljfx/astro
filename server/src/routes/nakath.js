/**
 * Nakath (Auspicious Times) API Routes
 * 
 * Endpoints:
 * - GET /api/nakath/daily       - Get daily Nakath and Rahu Kalaya
 * - GET /api/nakath/rahu-kalaya - Get Rahu Kalaya for a specific date
 * - GET /api/nakath/panchanga   - Get full Panchanga for a date
 */

const express = require('express');
const router = express.Router();
const { calculateRahuKalaya, getDailyNakath, getPanchanga } = require('../engine/astrology');
const { getManifestationScore } = require('../engine/manifestation');
const { formatLocalDateTime, formatUtcOffset } = require('../engine/calculationSettings');
const { getDb, COLLECTIONS } = require('../config/firebase');

// Jyotish engine (graceful — null if unavailable)
let jyotishEngine = null;
try { jyotishEngine = require('../engine/jyotish'); } catch (e) { console.warn('[nakath] jyotish engine not available:', e.message); }

function getQueryTimeContext(req) {
  const offsetSeconds = Number.isFinite(parseInt(req.query.offsetSeconds, 10))
    ? parseInt(req.query.offsetSeconds, 10)
    : 19800;
  return {
    zoneName: req.query.zoneName || 'Asia/Colombo',
    offsetSeconds,
    offsetLabel: formatUtcOffset(offsetSeconds),
    source: req.query.offsetSeconds ? 'query_offset' : 'traditional_slt',
    assumedOffset: !req.query.offsetSeconds,
  };
}

function formatNakathTime(date, timeContext) {
  const local = formatLocalDateTime(date, timeContext);
  const [hour, minute] = local.time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return {
    utc: date.toISOString(),
    local: local.display,
    display: `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`,
    label: local.label,
  };
}

/**
 * Build the full daily-nakath response payload. Pure date+location
 * computation — NO user chart, NO AI — so it is safe to serve free (see
 * routes/preview.js, which reuses this for the logged-out Home habit
 * surface). Kept as the single source of truth for the shape the mobile
 * Home screen consumes.
 *
 * @param {Date} date
 * @param {number} lat
 * @param {number} lng
 * @param {object} timeContext
 * @returns {object} the `data` object (same shape /daily returns)
 */
function buildDailyNakathData(date, lat, lng, timeContext) {
  const dailyNakath = getDailyNakath(date, lat, lng, { timeContext });

  return {
    ...dailyNakath,
    rahuKalaya: {
      ...dailyNakath.rahuKalaya,
      isActive: new Date() >= dailyNakath.rahuKalaya.start && new Date() <= dailyNakath.rahuKalaya.end,
      startFormatted: formatNakathTime(dailyNakath.rahuKalaya.start, timeContext),
      endFormatted: formatNakathTime(dailyNakath.rahuKalaya.end, timeContext),
    },
    gulikaKalaya: dailyNakath.gulikaKalaya ? {
      ...dailyNakath.gulikaKalaya,
      startFormatted: formatNakathTime(dailyNakath.gulikaKalaya.start, timeContext),
      endFormatted: formatNakathTime(dailyNakath.gulikaKalaya.end, timeContext),
    } : null,
    yamaganda: dailyNakath.yamaganda ? {
      ...dailyNakath.yamaganda,
      startFormatted: formatNakathTime(dailyNakath.yamaganda.start, timeContext),
      endFormatted: formatNakathTime(dailyNakath.yamaganda.end, timeContext),
    } : null,
    sunriseFormatted: formatNakathTime(dailyNakath.sunrise, timeContext),
    sunsetFormatted: formatNakathTime(dailyNakath.sunset, timeContext),
    auspiciousPeriods: dailyNakath.auspiciousPeriods.map(p => ({
      ...p,
      startFormatted: formatNakathTime(p.start, timeContext),
      endFormatted: formatNakathTime(p.end, timeContext),
    })),
    planetaryHoras: dailyNakath.planetaryHoras.map(h => ({
      ...h,
      startFormatted: formatNakathTime(h.start, timeContext),
      endFormatted: formatNakathTime(h.end, timeContext),
    })),
    location: {
      lat,
      lng,
      timezone: timeContext.zoneName,
      utcOffset: timeContext.offsetLabel,
      timezoneSource: timeContext.source,
    },
    // Jyotish cross-validation (independent panchanga, disha shoola, special yogas)
    jyotish: jyotishEngine ? jyotishEngine.generateTodayJyotish(lat, lng) : null,
    // Manifestation score (Law of Attraction — daily manifestation power)
    manifestation: (() => { try { return getManifestationScore(date, lat, lng); } catch (e) { console.error('[nakath] manifestation score error:', e.message); return null; } })(),
  };
}

/**
 * Pick the single "best time" to surface for a day, from a raw panchanga.
 * Uses Abhijit Muhurtha (midday ±24 min) — the classically universal auspicious
 * window — unless it collides with Rahu Kalaya, in which case the day has no
 * clean headline window (returns null). Pure date math, no chart, so it is safe
 * to serve free (it is the same generic nakath already shown on the Home screen).
 */
function pickBestTime(panchanga, timeContext) {
  if (!panchanga || !panchanga.sunrise || !panchanga.sunset) return null;
  const sr = new Date(panchanga.sunrise).getTime();
  const ss = new Date(panchanga.sunset).getTime();
  if (isNaN(sr) || isNaN(ss) || ss <= sr) return null;
  const noon = sr + (ss - sr) / 2;
  const start = new Date(noon - 24 * 60000);
  const end = new Date(noon + 24 * 60000);
  const rk = panchanga.rahuKalam;
  if (rk && rk.start && rk.end) {
    const rs = new Date(rk.start).getTime(), re = new Date(rk.end).getTime();
    if (!(end.getTime() < rs || start.getTime() > re)) return null; // Abhijit swallowed by Rahu
  }
  return {
    name: 'Abhijit Muhurtha',
    sinhala: 'අභිජිත් මුහුර්තය',
    tamil: 'அபிஜித் முகூர்த்தம்',
    start: start.toISOString(),
    end: end.toISOString(),
    startFormatted: formatNakathTime(start, timeContext),
    endFormatted: formatNakathTime(end, timeContext),
  };
}

// Small in-memory cache — the data is deterministic per civil day + location,
// so a cold 30-day build is reused across requests within the hour.
const _monthAheadCache = new Map(); // key -> { at, data }
const MONTH_AHEAD_TTL_MS = 60 * 60 * 1000;

// Free users see this many days ahead in full; beyond that, days come back as
// locked stubs (date + tithi only) so the client renders a named lock wall.
const NAKATH_FREE_AHEAD_DAYS = 10;

/**
 * Soft subscription check — same semantics as requireSubscription (mock bypass,
 * isSubscribed flag with lazy derive from subscription.status) but never blocks:
 * resolves true/false so free traffic still gets its 10-day window.
 */
async function userHasSubscription(req) {
  if (process.env.MOCK_PAYMENTS === 'true') return true;
  const uid = req.user && req.user.uid;
  if (!uid || req.user.authType === 'anonymous') return false;
  const db = getDb();
  if (!db) return process.env.NODE_ENV !== 'production'; // dev without DB: mirror requireSubscription's allow
  const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!doc.exists) return false;
  const user = doc.data();
  if (user.isSubscribed === undefined) return !!(user.subscription && user.subscription.status === 'active');
  return user.isSubscribed === true;
}

/**
 * Build the next-N-days summary: each day's Rahu Kalaya, headline best time
 * (Abhijit), sun/moon rise-set and tithi. One getPanchanga per day (which
 * already yields rahuKalam + moon times + tithi), so no duplicate engine work.
 */
function buildMonthAheadData(startDate, days, lat, lng, timeContext) {
  const base = new Date(startDate);
  base.setUTCHours(6, 30, 0, 0); // ~noon Sri Lanka — safely inside the civil day
  const key = `${lat.toFixed(3)}|${lng.toFixed(3)}|${base.toISOString().slice(0, 10)}|${days}|${timeContext.offsetSeconds}`;
  const cached = _monthAheadCache.get(key);
  if (cached && (Date.now() - cached.at) < MONTH_AHEAD_TTL_MS) return cached.data;

  const out = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(base.getTime() + i * 86400000);
    let p;
    try { p = getPanchanga(date, lat, lng, { timeContext }); }
    catch (e) { continue; }
    const civilDate = p.civilDate || date.toISOString().slice(0, 10);
    const rk = p.rahuKalam || {};
    const rahuStart = rk.start ? new Date(rk.start) : null;
    const rahuEnd = rk.end ? new Date(rk.end) : null;
    out.push({
      civilDate,
      iso: date.toISOString(),
      weekday: new Date(civilDate + 'T00:00:00Z').getUTCDay(),
      sunrise: p.sunrise,
      sunset: p.sunset,
      moonrise: p.moonrise,
      moonset: p.moonset,
      moonriseFormatted: p.moonrise ? formatNakathTime(new Date(p.moonrise), timeContext) : null,
      moonsetFormatted: p.moonset ? formatNakathTime(new Date(p.moonset), timeContext) : null,
      tithi: p.tithi ? { number: p.tithi.number, name: p.tithi.name, sinhala: p.tithi.sinhala || null, paksha: p.tithi.paksha || null } : null,
      rahuKalaya: (rahuStart && rahuEnd) ? {
        start: rk.start,
        end: rk.end,
        startFormatted: formatNakathTime(rahuStart, timeContext),
        endFormatted: formatNakathTime(rahuEnd, timeContext),
      } : null,
      bestTime: pickBestTime(p, timeContext),
    });
  }
  _monthAheadCache.set(key, { at: Date.now(), data: out });
  return out;
}

/**
 * GET /api/nakath/month-ahead
 *
 * The next N days at a glance: each day's Rahu Kalaya (to avoid) and best time
 * (Abhijit), plus sun/moon rise-set + tithi. Generic date+location math — no
 * chart, no AI. FREE for the first 10 days; beyond that, days return as locked
 * stubs (date + tithi only) unless the user is subscribed — the client renders
 * them as a named lock wall (same philosophy as the kendara vault locks).
 *
 * Query: days (default 30, max 40), date (start, default today), lat, lng.
 */
router.get('/month-ahead', async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 40);
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const timeContext = getQueryTimeContext(req);
    const start = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    let isPro = false;
    try { isPro = await userHasSubscription(req); }
    catch (e) { console.warn('[nakath] month-ahead subscription check failed:', e.message); }

    let daysData = buildMonthAheadData(start, days, lat, lng, timeContext);
    let lockedDays = 0;
    if (!isPro && daysData.length > NAKATH_FREE_AHEAD_DAYS) {
      lockedDays = daysData.length - NAKATH_FREE_AHEAD_DAYS;
      daysData = daysData.map((d, i) => (
        i < NAKATH_FREE_AHEAD_DAYS ? d : {
          civilDate: d.civilDate,
          iso: d.iso,
          weekday: d.weekday,
          tithi: d.tithi,     // teaser — the day is named, its times are locked
          locked: true,
        }
      ));
    }

    res.json({
      success: true,
      data: {
        days: daysData,
        freeDays: NAKATH_FREE_AHEAD_DAYS,
        lockedDays,
        isPro,
        location: { lat, lng, timezone: timeContext.zoneName, utcOffset: timeContext.offsetLabel },
      },
    });
  } catch (error) {
    console.error('Error building month-ahead Nakath:', error);
    res.status(500).json({ error: 'Failed to build month-ahead Nakath', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/nakath/daily
 *
 * Query params:
 * - date (optional): ISO date string, defaults to today
 * - lat (optional): Latitude, defaults to Colombo (6.9271)
 * - lng (optional): Longitude, defaults to Colombo (79.8612)
 * - lang (optional): Language code - en, si, ta
 */
router.get('/daily', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const timeContext = getQueryTimeContext(req);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    res.json({ success: true, data: buildDailyNakathData(date, lat, lng, timeContext) });
  } catch (error) {
    console.error('Error calculating daily Nakath:', error);
    res.status(500).json({ error: 'Failed to calculate daily Nakath', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/nakath/rahu-kalaya
 */
router.get('/rahu-kalaya', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const timeContext = getQueryTimeContext(req);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const rahuKalaya = calculateRahuKalaya(date, lat, lng, { timeContext });

    const startStr = formatNakathTime(rahuKalaya.start, timeContext).display;
    const endStr = formatNakathTime(rahuKalaya.end, timeContext).display;

    res.json({
      success: true,
      data: {
        ...rahuKalaya,
        isActive: new Date() >= rahuKalaya.start && new Date() <= rahuKalaya.end,
        message: {
          en: `Rahu Kalaya today is from ${startStr} to ${endStr}. Avoid starting new activities during this time.`,
          si: `අද රාහු කාලය ${startStr} සිට ${endStr} දක්වා. මෙම කාලය තුළ නව කටයුතු ආරම්භ කිරීමෙන් වළකින්න.`,
          ta: `இன்றைய ராகு காலம் ${startStr} முதல் ${endStr} வரை. இந்த நேரத்தில் புதிய செயல்களைத் தொடங்குவதைத் தவிர்க்கவும்.`,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating Rahu Kalaya:', error);
    res.status(500).json({ error: 'Failed to calculate Rahu Kalaya', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

/**
 * GET /api/nakath/panchanga
 */
router.get('/panchanga', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const timeContext = getQueryTimeContext(req);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const panchanga = getPanchanga(date, lat, lng, { timeContext });

    // Jyotish cross-validated panchanga
    let jyotishPanchanga = null;
    if (jyotishEngine) {
      try { jyotishPanchanga = jyotishEngine.getCrossValidatedPanchanga(date, lat, lng); }
      catch (e) { /* skip */ }
    }

    res.json({
      success: true,
      data: panchanga,
      jyotishCrossValidation: jyotishPanchanga,
    });
  } catch (error) {
    console.error('Error calculating Panchanga:', error);
    res.status(500).json({ error: 'Failed to calculate Panchanga', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

module.exports = router;
// Shared with routes/preview.js for the free logged-out Home surface.
module.exports.buildDailyNakathData = buildDailyNakathData;
module.exports.getQueryTimeContext = getQueryTimeContext;
