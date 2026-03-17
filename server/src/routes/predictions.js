/**
 * Prediction Routes — Transit, Event Timing & Muhurtha APIs
 *
 * Endpoints:
 *   Transit:
 *     POST /api/predictions/transit/current       → Current transit analysis
 *     POST /api/predictions/transit/daily          → Daily forecast
 *     POST /api/predictions/transit/weekly         → Weekly forecast
 *     POST /api/predictions/transit/monthly        → Monthly forecast
 *     POST /api/predictions/transit/yearly         → Yearly forecast
 *     GET  /api/predictions/transit/retrogrades    → Retrograde periods for a year
 *
 *   Event Timing:
 *     POST /api/predictions/timing/event           → When will event X happen?
 *     POST /api/predictions/timing/all             → All event timing + timeline
 *
 *   Muhurtha:
 *     POST /api/predictions/muhurtha/score         → Score a specific date/time
 *     POST /api/predictions/muhurtha/find          → Find best date in range
 *     POST /api/predictions/muhurtha/inauspicious  → Inauspicious periods for a day
 *     GET  /api/predictions/muhurtha/now            → Is now a good time?
 *     GET  /api/predictions/muhurtha/activities     → List all supported activities
 */

const express = require('express');
const router = express.Router();

const { getCurrentTransits, getDailyForecast, getWeeklyForecast, getMonthlyForecast, getYearlyForecast, getRetrogradePeriods } = require('../engine/transit');
const { predictEventTiming, predictAllEvents, EVENT_RULES } = require('../engine/timing');
const { scoreMuhurtha, findMuhurtha, getInauspiciousPeriods, isGoodTimeNow, ACTIVITY_RULES } = require('../engine/muhurtha');
const { analyzeHealth } = require('../engine/health');
const { optionalAuth } = require('../middleware/auth');
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');

/** Combine separate birthDate + birthTime into a single parseable string */
function combineDatetime(dateStr, timeStr) {
  if (!timeStr) return dateStr;
  return `${dateStr.split('T')[0]}T${timeStr}`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  TRANSIT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/predictions/transit/current
 * Body: { transitDate?, birthDate, birthTime?, lat?, lng? }
 */
router.post('/transit/current', optionalAuth, async (req, res) => {
  try {
    const { transitDate, birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (e.g. "1995-05-15T10:30:00")' });
    }

    const tDate = transitDate ? new Date(transitDate) : new Date();
    const bDateStr = birthTime ? `${birthDate.split('T')[0]}T${birthTime}` : birthDate;
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(bDateStr, latitude, longitude).catch(() => parseSLT(bDateStr));

    const result = getCurrentTransits(tDate, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Transit current error:', error);
    res.status(500).json({ error: 'Failed to calculate current transits', message: error.message });
  }
});

/**
 * POST /api/predictions/transit/daily
 * Body: { date?, birthDate, birthTime, lat?, lng? }
 */
router.post('/transit/daily', optionalAuth, async (req, res) => {
  try {
    const { date, birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const targetDate = date ? new Date(date) : new Date();
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const result = getDailyForecast(targetDate, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Transit daily error:', error);
    res.status(500).json({ error: 'Failed to generate daily forecast', message: error.message });
  }
});

/**
 * POST /api/predictions/transit/weekly
 * Body: { startDate?, birthDate, birthTime, lat?, lng? }
 */
router.post('/transit/weekly', optionalAuth, async (req, res) => {
  try {
    const { startDate, birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const result = getWeeklyForecast(start, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Transit weekly error:', error);
    res.status(500).json({ error: 'Failed to generate weekly forecast', message: error.message });
  }
});

/**
 * POST /api/predictions/transit/monthly
 * Body: { month?, year?, birthDate, birthTime, lat?, lng? }
 */
router.post('/transit/monthly', optionalAuth, async (req, res) => {
  try {
    const { month, year, birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const result = getMonthlyForecast(m, y, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Transit monthly error:', error);
    res.status(500).json({ error: 'Failed to generate monthly forecast', message: error.message });
  }
});

/**
 * POST /api/predictions/transit/yearly
 * Body: { year?, birthDate, birthTime, lat?, lng? }
 */
router.post('/transit/yearly', optionalAuth, async (req, res) => {
  try {
    const { year, birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const y = year || new Date().getFullYear();
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const result = getYearlyForecast(y, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Transit yearly error:', error);
    res.status(500).json({ error: 'Failed to generate yearly forecast', message: error.message });
  }
});

/**
 * GET /api/predictions/transit/retrogrades?year=2025
 */
router.get('/transit/retrogrades', optionalAuth, async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const result = getRetrogradePeriods(year);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Retrograde periods error:', error);
    res.status(500).json({ error: 'Failed to get retrograde periods', message: error.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
//  EVENT TIMING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/predictions/timing/event
 * Body: { eventType, birthDate, birthTime, lat?, lng? }
 * eventType: career | wealth | children | healthCrisis | foreignTravel |
 *            property | education | business | danger | debtClearance
 */
router.post('/timing/event', optionalAuth, async (req, res) => {
  try {
    const { eventType, birthDate, birthTime, lat, lng } = req.body;
    if (!eventType || !birthDate) {
      return res.status(400).json({ error: 'eventType and birthDate are required' });
    }

    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const birthInfo = { date: bDate, lat: latitude, lng: longitude };
    const result = predictEventTiming(eventType, birthInfo, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Event timing error:', error);
    res.status(500).json({ error: 'Failed to predict event timing', message: error.message });
  }
});

/**
 * POST /api/predictions/timing/all
 * Body: { birthDate, birthTime, lat?, lng? }
 */
router.post('/timing/all', optionalAuth, async (req, res) => {
  try {
    const { birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(combineDatetime(birthDate, birthTime), latitude, longitude).catch(() => parseSLT(combineDatetime(birthDate, birthTime)));

    const birthInfo = { date: bDate, lat: latitude, lng: longitude };
    const result = predictAllEvents(birthInfo, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('All events timing error:', error);
    res.status(500).json({ error: 'Failed to predict all event timings', message: error.message });
  }
});

/**
 * GET /api/predictions/timing/events
 * List all supported event types
 */
router.get('/timing/events', (req, res) => {
  const events = Object.entries(EVENT_RULES).map(([key, rule]) => ({
    type: key,
    name: rule.name || key,
    primaryHouses: rule.primaryHouses,
    karakas: rule.karakas,
    ageRange: `${rule.ageMin || 0}–${rule.ageMax || 100}`,
  }));
  res.json({ success: true, data: events });
});


// ═══════════════════════════════════════════════════════════════════════════
//  MUHURTHA ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/predictions/muhurtha/score
 * Body: { dateTime, activityType, birthDate?, lat?, lng? }
 */
router.post('/muhurtha/score', optionalAuth, async (req, res) => {
  try {
    const { dateTime, activityType, birthDate, lat, lng } = req.body;
    if (!dateTime || !activityType) {
      return res.status(400).json({ error: 'dateTime and activityType are required' });
    }

    const dt = new Date(dateTime);
    const bDate = birthDate ? new Date(birthDate) : null;
    const latitude = lat || 6.9271;
    const longitude = lng || 79.8612;

    const result = scoreMuhurtha(dt, activityType, bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Muhurtha score error:', error);
    res.status(500).json({ error: 'Failed to score muhurtha', message: error.message });
  }
});

/**
 * POST /api/predictions/muhurtha/find
 * Body: { activityType, startDate, endDate, birthDate?, lat?, lng?, maxResults? }
 */
router.post('/muhurtha/find', optionalAuth, async (req, res) => {
  try {
    const { activityType, startDate, endDate, birthDate, lat, lng, maxResults } = req.body;
    if (!activityType || !startDate || !endDate) {
      return res.status(400).json({ error: 'activityType, startDate, and endDate are required' });
    }

    const bDate = birthDate ? new Date(birthDate) : null;
    const latitude = lat || 6.9271;
    const longitude = lng || 79.8612;
    const limit = maxResults || 5;

    const result = findMuhurtha(activityType, startDate, endDate, bDate, latitude, longitude, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Muhurtha find error:', error);
    res.status(500).json({ error: 'Failed to find muhurtha', message: error.message });
  }
});

/**
 * POST /api/predictions/muhurtha/inauspicious
 * Body: { date?, lat?, lng? }
 */
router.post('/muhurtha/inauspicious', optionalAuth, async (req, res) => {
  try {
    const { date, lat, lng } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const latitude = lat || 6.9271;
    const longitude = lng || 79.8612;

    const result = getInauspiciousPeriods(targetDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Inauspicious periods error:', error);
    res.status(500).json({ error: 'Failed to get inauspicious periods', message: error.message });
  }
});

/**
 * GET /api/predictions/muhurtha/now?lat=&lng=
 * Quick check: is now a good time?
 */
router.get('/muhurtha/now', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const birthDate = req.query.birthDate ? new Date(req.query.birthDate) : null;

    const result = isGoodTimeNow(birthDate, lat, lng);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Is good time now error:', error);
    res.status(500).json({ error: 'Failed to check current time quality', message: error.message });
  }
});

/**
 * GET /api/predictions/muhurtha/activities
 * List all supported activities with their rules
 */
router.get('/muhurtha/activities', (req, res) => {
  const activities = Object.entries(ACTIVITY_RULES).map(([key, rule]) => ({
    type: key,
    name: rule.name,
    sinhala: rule.sinhala,
    icon: rule.icon,
    goodWeekdays: rule.goodWeekdays.map(d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]),
    badWeekdays: rule.badWeekdays.map(d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]),
    avoidRahuKala: rule.avoidRahuKala,
    avoidGulikaKala: rule.avoidGulikaKala,
    specialRule: rule.specialRule || null,
  }));
  res.json({ success: true, data: activities });
});


// ═══════════════════════════════════════════════════════════════════════════
//  HEALTH ANALYSIS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/predictions/health/analyze
 * Body: { birthDate, birthTime?, lat?, lng? }
 * Returns: comprehensive health analysis (constitution, body mapping,
 *          disease susceptibility, Maraka analysis, crisis timing,
 *          mental health, longevity, transit alerts, remedies)
 */
router.post('/health/analyze', optionalAuth, async (req, res) => {
  try {
    const { birthDate, birthTime, lat, lng } = req.body;
    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required' });
    }

    const bDateStr = birthTime ? `${birthDate.split('T')[0]}T${birthTime}` : birthDate;
    const latitude = parseFloat(lat) || 6.9271;
    const longitude = parseFloat(lng) || 79.8612;
    const bDate = await parseBirthDateTime(bDateStr, latitude, longitude).catch(() => parseSLT(bDateStr));

    const result = analyzeHealth(bDate, latitude, longitude);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Health analysis error:', error);
    res.status(500).json({ error: 'Failed to generate health analysis', message: error.message });
  }
});


module.exports = router;
