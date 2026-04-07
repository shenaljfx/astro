/**
 * Jyotish API Routes — @prisri/jyotish Integration
 * 
 * Endpoints:
 * - POST /api/jyotish/kundli          - Full Kundli with Dasha, Chalit, Vargas
 * - POST /api/jyotish/chalit          - Chalit (Bhava) chart only
 * - POST /api/jyotish/varga/:division - Specific divisional chart (d1–d60)
 * - POST /api/jyotish/dasha           - Independent Dasha system
 * - POST /api/jyotish/mangal-dosha    - Mangal Dosha check
 * - POST /api/jyotish/sade-sati       - Sade Sati detection
 * - POST /api/jyotish/tara-balam      - Tara Balam (star strength)
 * - POST /api/jyotish/chandrashtama   - Chandrashtama detection
 * - GET  /api/jyotish/disha-shoola    - Disha Shoola (directional safety)
 * - GET  /api/jyotish/today           - Today's jyotish data
 * - POST /api/jyotish/personalized    - Personalized today data
 * - POST /api/jyotish/match           - Kundali matching (Ashtakoot)
 * - GET  /api/jyotish/panchanga       - Cross-validated Panchanga
 * - GET  /api/jyotish/special-yogas   - Today's special yogas
 */

const express = require('express');
const router = express.Router();

let jyotishEngine = null;
try {
  jyotishEngine = require('../engine/jyotish');
} catch (e) {
  console.warn('[jyotish-routes] jyotish engine not available:', e.message);
}

// Middleware: check engine availability
function requireEngine(req, res, next) {
  if (!jyotishEngine || !jyotishEngine.isAvailable()) {
    return res.status(503).json({ error: '@prisri/jyotish engine not available' });
  }
  next();
}

/**
 * POST /api/jyotish/kundli
 * Full Kundli generation
 */
router.post('/kundli', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const report = jyotishEngine.generateJyotishReport(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Kundli', details: error.message });
  }
});

/**
 * POST /api/jyotish/chalit
 * Chalit (Bhava) chart — planets placed by house cusps
 */
router.post('/chalit', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const chalit = jyotishEngine.getChalitChart(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: chalit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Chalit chart', details: error.message });
  }
});

/**
 * POST /api/jyotish/varga/:division
 * Specific divisional chart (d1, d2, d3, d4, d7, d9, d10, d12, d16, d20, d24, d27, d30, d40, d45, d60)
 */
router.post('/varga/:division', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    const division = req.params.division.toLowerCase();
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const validDivisions = ['d1', 'd2', 'd3', 'd4', 'd7', 'd9', 'd10', 'd12', 'd16', 'd20', 'd24', 'd27', 'd30', 'd40', 'd45', 'd60'];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({ error: 'Invalid division', valid: validDivisions });
    }

    const varga = jyotishEngine.getSpecificVarga(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612,
      division
    );

    res.json({ success: true, division, data: varga });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Varga chart', details: error.message });
  }
});

/**
 * POST /api/jyotish/dasha
 * Independent Vimshottari Dasha system
 */
router.post('/dasha', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const dasha = jyotishEngine.getDashaSystem(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: dasha });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate Dasha', details: error.message });
  }
});

/**
 * POST /api/jyotish/mangal-dosha
 * Mangal (Kuja) Dosha check with cancellation logic
 */
router.post('/mangal-dosha', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const result = jyotishEngine.checkMangalDosha(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check Mangal Dosha', details: error.message });
  }
});

/**
 * POST /api/jyotish/sade-sati
 * Sade Sati detection (7.5-year Saturn transit)
 */
router.post('/sade-sati', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const result = jyotishEngine.checkSadeSati(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check Sade Sati', details: error.message });
  }
});

/**
 * POST /api/jyotish/tara-balam
 * Tara Balam — star strength for muhurta timing
 */
router.post('/tara-balam', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const result = jyotishEngine.calculateTaraBalam(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate Tara Balam', details: error.message });
  }
});

/**
 * POST /api/jyotish/chandrashtama
 * Chandrashtama — Moon's 8th transit detection
 */
router.post('/chandrashtama', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const result = jyotishEngine.getChandrashtama(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check Chandrashtama', details: error.message });
  }
});

/**
 * GET /api/jyotish/disha-shoola
 * Disha Shoola — directional safety for the day
 */
router.get('/disha-shoola', requireEngine, (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const result = jyotishEngine.getDishaShoola(date);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Disha Shoola', details: error.message });
  }
});

/**
 * GET /api/jyotish/today
 * Today's jyotish data (panchanga, disha shoola, special yogas)
 */
router.get('/today', requireEngine, (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const result = jyotishEngine.generateTodayJyotish(lat, lng);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate today data', details: error.message });
  }
});

/**
 * POST /api/jyotish/personalized
 * Personalized today data (Tara Balam, Chandrashtama, Sade Sati, Mangal Dosha)
 */
router.post('/personalized', requireEngine, (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate required' });

    const result = jyotishEngine.generatePersonalizedToday(
      new Date(birthDate),
      parseFloat(lat) || 6.9271,
      parseFloat(lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate personalized data', details: error.message });
  }
});

/**
 * POST /api/jyotish/match
 * Kundali matching (Ashtakoot Milan) — independent cross-validation for Porondam
 */
router.post('/match', requireEngine, (req, res) => {
  try {
    const { person1, person2 } = req.body;
    if (!person1?.birthDate || !person2?.birthDate) {
      return res.status(400).json({ error: 'Both person1 and person2 with birthDate required' });
    }

    const result = jyotishEngine.generatePorondamJyotish(
      new Date(person1.birthDate),
      parseFloat(person1.lat) || 6.9271,
      parseFloat(person1.lng) || 79.8612,
      new Date(person2.birthDate),
      parseFloat(person2.lat) || 6.9271,
      parseFloat(person2.lng) || 79.8612
    );

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to match kundlis', details: error.message });
  }
});

/**
 * GET /api/jyotish/panchanga
 * Cross-validated Panchanga from @prisri/jyotish
 */
router.get('/panchanga', requireEngine, (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;

    const result = jyotishEngine.getCrossValidatedPanchanga(date, lat, lng);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Panchanga', details: error.message });
  }
});

/**
 * GET /api/jyotish/special-yogas
 * Today's special yogas (Amrit Siddhi, Siddha, Sarvartha Siddhi etc.)
 */
router.get('/special-yogas', requireEngine, (req, res) => {
  try {
    const result = jyotishEngine.getTodaySpecialYogas();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get Special Yogas', details: error.message });
  }
});

module.exports = router;
