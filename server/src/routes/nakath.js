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

    const dailyNakath = getDailyNakath(date, lat, lng, { timeContext });

    res.json({
      success: true,
      data: {
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
      },
    });
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
