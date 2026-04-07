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

// Jyotish engine (graceful — null if unavailable)
let jyotishEngine = null;
try { jyotishEngine = require('../engine/jyotish'); } catch (e) { console.warn('[nakath] jyotish engine not available:', e.message); }

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

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const dailyNakath = getDailyNakath(date, lat, lng);

    // Format times for display in Sri Lanka timezone (UTC+5:30)
    const formatTime = (d) => {
      // Manually offset to Sri Lanka time
      const sriLankaTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const h = sriLankaTime.getUTCHours();
      const m = sriLankaTime.getUTCMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const display = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      return {
        utc: d.toISOString(),
        local: sriLankaTime.toISOString().replace('T', ' ').substr(0, 19) + ' IST',
        display,
      };
    };

    res.json({
      success: true,
      data: {
        ...dailyNakath,
        rahuKalaya: {
          ...dailyNakath.rahuKalaya,
          isActive: new Date() >= dailyNakath.rahuKalaya.start && new Date() <= dailyNakath.rahuKalaya.end,
          startFormatted: formatTime(dailyNakath.rahuKalaya.start),
          endFormatted: formatTime(dailyNakath.rahuKalaya.end),
        },
        sunriseFormatted: formatTime(dailyNakath.sunrise),
        sunsetFormatted: formatTime(dailyNakath.sunset),
        auspiciousPeriods: dailyNakath.auspiciousPeriods.map(p => ({
          ...p,
          startFormatted: formatTime(p.start),
          endFormatted: formatTime(p.end),
        })),
        location: {
          lat,
          lng,
          timezone: 'Asia/Colombo',
          utcOffset: '+05:30',
        },
        // Jyotish cross-validation (independent panchanga, disha shoola, special yogas)
        jyotish: jyotishEngine ? jyotishEngine.generateTodayJyotish(lat, lng) : null,
      },
    });
  } catch (error) {
    console.error('Error calculating daily Nakath:', error);
    res.status(500).json({ error: 'Failed to calculate daily Nakath', details: error.message });
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

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const rahuKalaya = calculateRahuKalaya(date, lat, lng);

    // Format time for display (manual UTC+5:30 to avoid locale issues)
    const fmtSLT = (d) => {
      const slt = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const h = slt.getUTCHours();
      const m = slt.getUTCMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    const startStr = fmtSLT(rahuKalaya.start);
    const endStr = fmtSLT(rahuKalaya.end);

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
    res.status(500).json({ error: 'Failed to calculate Rahu Kalaya', details: error.message });
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

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    const panchanga = getPanchanga(date, lat, lng);

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
    res.status(500).json({ error: 'Failed to calculate Panchanga', details: error.message });
  }
});

module.exports = router;
