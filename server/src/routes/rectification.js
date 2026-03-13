/**
 * Birth Time Rectification API Routes
 * 
 * Endpoints:
 * - POST /api/rectification/rectify - Rectify birth time using life events
 * - GET  /api/rectification/event-types - Get supported event types
 */

const express = require('express');
const router = express.Router();
const { rectifyBirthTime, getSupportedEventTypes } = require('../engine/rectification');
const { optionalAuth } = require('../middleware/auth');
const { parseSLT } = require('../utils/dateUtils');

/**
 * POST /api/rectification/rectify
 * 
 * Rectifies birth time by cross-referencing life events against
 * Vimshottari Dasha periods and transit positions.
 * 
 * Body:
 * {
 *   birthDate: "1990-05-15T04:30:00Z",
 *   lat: 6.9271,
 *   lng: 79.8612,
 *   events: [
 *     { type: "marriage", date: "2018-06-15" },
 *     { type: "firstJob", date: "2012-03-01" },
 *     { type: "firstChild", date: "2020-01-20" }
 *   ],
 *   searchRangeMinutes: 30,  // optional, default 30
 *   stepMinutes: 1           // optional, default 1
 * }
 */
router.post('/rectify', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat, lng, events, searchRangeMinutes, stepMinutes } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (ISO 8601 format)' });
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: 'At least one life event is required',
        example: {
          events: [
            { type: 'marriage', date: '2018-06-15' },
            { type: 'firstJob', date: '2012-03-01' },
          ],
        },
        supportedTypes: getSupportedEventTypes().map(t => t.type),
      });
    }

    const parsedDate = parseSLT(birthDate);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid birthDate format. Use ISO 8601.' });
    }

    const birthLat = lat || 6.9271;
    const birthLng = lng || 79.8612;
    const range = Math.min(searchRangeMinutes || 30, 60); // max 60 minutes
    const step = Math.max(stepMinutes || 1, 1); // min 1 minute

    console.log(`[Rectification] Starting for ${parsedDate.toISOString()} with ${events.length} events, ±${range}min, step ${step}min`);
    const startTime = Date.now();

    const result = rectifyBirthTime(parsedDate, birthLat, birthLng, events, range, step);

    const elapsed = Date.now() - startTime;
    console.log(`[Rectification] Completed in ${elapsed}ms — confidence: ${result.confidence}, offset: ${result.rectified.offsetMinutes}min`);

    res.json({
      success: true,
      data: result,
      elapsed: `${elapsed}ms`,
    });
  } catch (error) {
    console.error('Rectification error:', error);
    res.status(500).json({
      error: 'Failed to rectify birth time',
      details: error.message,
    });
  }
});

/**
 * GET /api/rectification/event-types
 * 
 * Returns the list of supported life event types
 */
router.get('/event-types', (req, res) => {
  res.json({
    success: true,
    eventTypes: getSupportedEventTypes(),
  });
});

module.exports = router;
