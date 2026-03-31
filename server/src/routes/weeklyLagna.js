/**
 * Weekly Lagna Palapala Routes
 * 
 * GET  /api/weekly-lagna          — Get this week's reports for all 12 lagnas
 * GET  /api/weekly-lagna/:lagnaId — Get report for a specific lagna (1-12)
 * POST /api/weekly-lagna/generate — Force-generate (admin/scheduler only)
 * 
 * Reports are AI-generated once per week (Sunday 6AM SLT) centrally,
 * stored in Firestore, and deleted+replaced each Sunday.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { generateWeeklyLagnaReports } = require('../engine/weeklyLagna');
const { trackCost } = require('../services/costTracker');

const COLLECTION = 'weeklyLagnaReports';

// Lagna names for reference
const LAGNA_NAMES = [
  { id: 1,  en: 'Aries',       si: 'මේෂ',     sanskrit: 'Mesha' },
  { id: 2,  en: 'Taurus',      si: 'වෘෂභ',    sanskrit: 'Vrishabha' },
  { id: 3,  en: 'Gemini',      si: 'මිථුන',    sanskrit: 'Mithuna' },
  { id: 4,  en: 'Cancer',      si: 'කටක',     sanskrit: 'Kataka' },
  { id: 5,  en: 'Leo',         si: 'සිංහ',     sanskrit: 'Simha' },
  { id: 6,  en: 'Virgo',       si: 'කන්‍යා',   sanskrit: 'Kanya' },
  { id: 7,  en: 'Libra',       si: 'තුලා',     sanskrit: 'Thula' },
  { id: 8,  en: 'Scorpio',     si: 'වෘශ්චික',  sanskrit: 'Vrischika' },
  { id: 9,  en: 'Sagittarius', si: 'ධනු',      sanskrit: 'Dhanu' },
  { id: 10, en: 'Capricorn',   si: 'මකර',     sanskrit: 'Makara' },
  { id: 11, en: 'Aquarius',    si: 'කුම්භ',    sanskrit: 'Kumbha' },
  { id: 12, en: 'Pisces',      si: 'මීන',      sanskrit: 'Meena' },
];

/**
 * GET /api/weekly-lagna
 * Returns this week's lagna palapala for all 12 lagnas
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.json({ success: true, reports: [], mock: true, message: 'DB not available' });
    }

    // Find the current week's report document
    // Reports are generated on Sunday for the upcoming week,
    // so try current week first, then fall back to previous week on Sunday
    const now = new Date();
    const weekId = getWeekId(now);
    
    let docRef = db.collection(COLLECTION).doc(weekId);
    let doc = await docRef.get();
    
    // On Sunday before generation, the current week's report might not exist yet
    // but last week's report (stored under next-week's ID) should be there
    // Also try tomorrow's weekId in case we're on Sunday and report was already generated for next week
    if (!doc.exists) {
      const tomorrowId = getWeekId(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      if (tomorrowId !== weekId) {
        docRef = db.collection(COLLECTION).doc(tomorrowId);
        doc = await docRef.get();
      }
    }
    
    // Also try yesterday's weekId as fallback (e.g., early Monday before any report exists)
    if (!doc.exists) {
      const yesterdayId = getWeekId(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      if (yesterdayId !== weekId) {
        docRef = db.collection(COLLECTION).doc(yesterdayId);
        doc = await docRef.get();
      }
    }
    
    if (!doc.exists) {
      return res.json({
        success: true,
        reports: [],
        weekId,
        message: 'No reports for this week yet. Reports are generated every Sunday at 6:00 AM.',
      });
    }

    const data = doc.data();
    res.json({
      success: true,
      weekId: data.weekId || weekId,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      generatedAt: data.generatedAt,
      reports: data.reports || [],
      lagnaNames: LAGNA_NAMES,
    });
  } catch (err) {
    console.error('[WeeklyLagna] GET / error:', err.message);
    res.status(500).json({ error: 'Failed to fetch weekly lagna reports' });
  }
});

/**
 * GET /api/weekly-lagna/:lagnaId
 * Returns report for a specific lagna (1-12)
 */
router.get('/:lagnaId', async (req, res) => {
  try {
    const lagnaId = parseInt(req.params.lagnaId);
    if (isNaN(lagnaId) || lagnaId < 1 || lagnaId > 12) {
      return res.status(400).json({ error: 'Invalid lagnaId. Must be 1-12.' });
    }

    const db = getDb();
    if (!db) {
      return res.json({ success: true, report: null, mock: true });
    }

    const now = new Date();
    const weekId = getWeekId(now);
    let docRef = db.collection(COLLECTION).doc(weekId);
    let doc = await docRef.get();

    // Fallback: try next week's ID (Sunday after generation) or previous
    if (!doc.exists) {
      const tomorrowId = getWeekId(new Date(now.getTime() + 24 * 60 * 60 * 1000));
      if (tomorrowId !== weekId) {
        docRef = db.collection(COLLECTION).doc(tomorrowId);
        doc = await docRef.get();
      }
    }
    if (!doc.exists) {
      const yesterdayId = getWeekId(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      if (yesterdayId !== weekId) {
        docRef = db.collection(COLLECTION).doc(yesterdayId);
        doc = await docRef.get();
      }
    }

    if (!doc.exists) {
      return res.json({ success: true, report: null, weekId, message: 'No report yet' });
    }

    const data = doc.data();
    const report = (data.reports || []).find(r => r.lagnaId === lagnaId);

    res.json({
      success: true,
      weekId: data.weekId || weekId,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      report: report || null,
      lagnaName: LAGNA_NAMES[lagnaId - 1],
    });
  } catch (err) {
    console.error('[WeeklyLagna] GET /:lagnaId error:', err.message);
    res.status(500).json({ error: 'Failed to fetch lagna report' });
  }
});

/**
 * POST /api/weekly-lagna/generate
 * Force-generate reports (called by scheduler or admin)
 */
router.post('/generate', async (req, res) => {
  try {
    console.log('[WeeklyLagna] Force-generating weekly reports...');
    const result = await generateWeeklyLagnaReports();

    // Track AI cost
    if (result.usage) {
      trackCost('weeklyLagna', null, result.usage);
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[WeeklyLagna] Generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate reports: ' + err.message });
  }
});

/**
 * Get a week identifier string like "2026-W13" (ISO week)
 */
function getWeekId(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  // Get Thursday of this week (ISO week starts Monday)
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

module.exports = router;
module.exports.getWeekId = getWeekId;
module.exports.LAGNA_NAMES = LAGNA_NAMES;
