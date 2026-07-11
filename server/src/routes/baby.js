/**
 * Baby Kendara Pack — the newborn keepsake.
 *
 * POST /api/baby/compose — subscription OR baby_kendara credit. Bundles what
 * the engines already produce for a newborn's chart:
 *   • basic chart identity (lagna, moon/sun, nakshatra)
 *   • naming letters by nakshatra pada (+ Sinhala note)
 *   • Ganda Moola dosha result + guidance
 *   • naming-ceremony (nam thebeema) auspicious dates
 * Deterministic (no AI), so it always succeeds — the credit is consumed once
 * on a successful compose.
 *
 * (Mounted with paidAccessExcept(['/compose']) so credit buyers reach it.)
 */

const express = require('express');
const router = express.Router();
const { requireSubscriptionOrCredit } = require('../middleware/subscription');
const { consumeCredit } = require('../services/purchaseCredits');
const { buildBasicChartData } = require('./horoscope');
const { findMuhurtha } = require('../engine/muhurtha');
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');

let enhanced = null;
try { enhanced = require('../engine/enhanced'); } catch (e) { console.warn('[baby] enhanced engine not available:', e.message); }

router.post('/compose', requireSubscriptionOrCredit('babyKendara', 'baby_kendara'), async (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    const identity = buildBasicChartData(date, plat, plng);

    let babyNames = null;
    let gandaMoola = null;
    if (enhanced) {
      try { babyNames = enhanced.getBabyNameSuggestions(date, plat, plng); } catch (e) { console.warn('[baby] names failed:', e.message); }
      try { gandaMoola = enhanced.analyzeGandaMoola(date, plat, plng); } catch (e) { console.warn('[baby] ganda moola failed:', e.message); }
    }

    // Upcoming naming-ceremony dates (next 60 days), tuned to the baby's chart.
    let namingDates = null;
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      namingDates = findMuhurtha('nameCeremony', now, end, date, plat, plng, 3);
    } catch (e) { console.warn('[baby] naming dates failed:', e.message); }

    // Spend the one-time credit on a successful compose (subscribers pay nothing).
    if (req.accessVia === 'credit' && req.purchaseCredit) {
      await consumeCredit(req.purchaseCredit.id, 'baby-' + Date.now())
        .catch((e) => console.warn('[baby] credit consume failed (non-fatal):', e.message));
    }

    res.json({ success: true, data: { identity, babyNames, gandaMoola, namingDates } });
  } catch (e) {
    console.error('[baby/compose] error:', e.message);
    res.status(500).json({ error: 'Failed to compose baby kendara' });
  }
});

module.exports = router;
