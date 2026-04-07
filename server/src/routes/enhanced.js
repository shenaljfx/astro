/**
 * Enhanced Analysis API Routes
 *
 * New features from MIT-licensed libraries (celestine + astrology-insights):
 *
 * Endpoints:
 * - POST /api/enhanced/report        - Full enhanced analysis
 * - POST /api/enhanced/gandanta      - Gandanta Dosha detection
 * - POST /api/enhanced/ganda-moola   - Ganda Moola Dosha detection
 * - POST /api/enhanced/tattva        - Five-element (Tattva) balance
 * - POST /api/enhanced/friendships   - Planetary friendship analysis
 * - POST /api/enhanced/remedies      - Gemstone, mantra, charity remedies
 * - POST /api/enhanced/baby-names    - Nakshatra-based name suggestions
 * - POST /api/enhanced/shodashvarga  - All 16 divisional charts
 * - POST /api/enhanced/progressions  - Secondary Progressions
 * - POST /api/enhanced/solar-arc     - Solar Arc Directions
 * - POST /api/enhanced/patterns      - Aspect pattern detection
 * - POST /api/enhanced/retrogrades   - Retrograde period scanning
 * - GET  /api/enhanced/choghadiya    - Daily Choghadiya periods
 * - GET  /api/enhanced/gulika        - Gulika Kalam
 */

const express = require('express');
const router = express.Router();

const enhanced = require('../engine/enhanced');

// ── Helper: parse birth data from request ────────────────────────
function parseBirthData(body) {
  const { birthDate, date, lat, lng, latitude, longitude } = body;
  const d = new Date(birthDate || date);
  if (isNaN(d.getTime())) return null;
  return {
    date: d,
    lat: parseFloat(lat || latitude) || 6.9271,
    lng: parseFloat(lng || longitude) || 79.8612,
  };
}

// ── POST /api/enhanced/report — Full Enhanced Report ──────────────
router.post('/report', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate. Use ISO 8601.' });

    const report = enhanced.generateEnhancedReport(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: report });
  } catch (e) {
    console.error('[Enhanced Route] Report error:', e.message);
    res.status(500).json({ error: 'Enhanced report generation failed', details: e.message });
  }
});

// ── POST /api/enhanced/gandanta — Gandanta Dosha ──────────────────
router.post('/gandanta', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.analyzeGandanta(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Gandanta analysis failed', details: e.message });
  }
});

// ── POST /api/enhanced/ganda-moola — Ganda Moola Dosha ────────────
router.post('/ganda-moola', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.analyzeGandaMoola(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Ganda Moola analysis failed', details: e.message });
  }
});

// ── POST /api/enhanced/tattva — Five-Element Balance ──────────────
router.post('/tattva', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.analyzeTattvaBalance(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Tattva analysis failed', details: e.message });
  }
});

// ── POST /api/enhanced/friendships — Planetary Friendships ────────
router.post('/friendships', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.calculatePlanetaryFriendships(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Friendship analysis failed', details: e.message });
  }
});

// ── POST /api/enhanced/remedies — Gemstones, Mantras, Charity ─────
router.post('/remedies', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.generateRemedies(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Remedies generation failed', details: e.message });
  }
});

// ── POST /api/enhanced/baby-names — Nakshatra Name Suggestions ────
router.post('/baby-names', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.getBabyNameSuggestions(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Baby name suggestions failed', details: e.message });
  }
});

// ── POST /api/enhanced/shodashvarga — 16 Divisional Charts ────────
router.post('/shodashvarga', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.calculateShodashvarga(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Shodashvarga calculation failed', details: e.message });
  }
});

// ── POST /api/enhanced/divisional — Single Divisional Chart ───────
router.post('/divisional', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });
    const division = parseInt(req.body.division) || 9;

    const result = enhanced.calculateDivisionalChart(division, bd.date, bd.lat, bd.lng);
    res.json({ success: true, division, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Divisional chart failed', details: e.message });
  }
});

// ── POST /api/enhanced/progressions — Secondary Progressions ──────
router.post('/progressions', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });
    const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();

    const result = enhanced.calculateProgressions(bd.date, targetDate, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Progressions calculation failed', details: e.message });
  }
});

// ── POST /api/enhanced/solar-arc — Solar Arc Directions ───────────
router.post('/solar-arc', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });
    const targetDate = req.body.targetDate ? new Date(req.body.targetDate) : new Date();

    const result = enhanced.calculateSolarArcDirections(bd.date, targetDate, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Solar Arc calculation failed', details: e.message });
  }
});

// ── POST /api/enhanced/patterns — Aspect Patterns ─────────────────
router.post('/patterns', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.detectAspectPatterns(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Pattern detection failed', details: e.message });
  }
});

// ── POST /api/enhanced/retrogrades — Retrograde Periods ───────────
router.post('/retrogrades', (req, res) => {
  try {
    const { planet, startDate, endDate } = req.body;
    if (!planet) return res.status(400).json({ error: 'planet is required (Mercury, Venus, Mars, Jupiter, Saturn)' });

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 86400000);

    const result = enhanced.findRetrogradePeriods(planet, start, end);
    res.json({ success: true, planet, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Retrograde scanning failed', details: e.message });
  }
});

// ── GET /api/enhanced/choghadiya — Daily Choghadiya ───────────────
router.get('/choghadiya', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sunrise = req.query.sunrise || '06:00:00';
    const sunset = req.query.sunset || '18:00:00';
    const timezone = req.query.timezone || 'Asia/Colombo';

    const result = enhanced.calculateChoghadiya(date, sunrise, sunset, timezone);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Choghadiya calculation failed', details: e.message });
  }
});

// ── GET /api/enhanced/gulika — Gulika Kalam ───────────────────────
router.get('/gulika', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const sunrise = req.query.sunrise || '06:00:00';
    const sunset = req.query.sunset || '18:00:00';
    const timezone = req.query.timezone || 'Asia/Colombo';

    const result = enhanced.calculateGulikaKalam(date, sunrise, sunset, timezone);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Gulika Kalam calculation failed', details: e.message });
  }
});

// ── POST /api/enhanced/cross-validate — Shadbala Cross-Check ──────
router.post('/cross-validate', (req, res) => {
  try {
    const bd = parseBirthData(req.body);
    if (!bd) return res.status(400).json({ error: 'Invalid birthDate' });

    const result = enhanced.crossValidateShadbala(bd.date, bd.lat, bd.lng);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ error: 'Cross-validation failed', details: e.message });
  }
});

module.exports = router;
