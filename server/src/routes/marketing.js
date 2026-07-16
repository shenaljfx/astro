/**
 * Marketing data routes — serves astrology data to the admin marketing studio.
 * ONLY accessible from localhost (no auth required for local development).
 */
const express = require('express');
const router = express.Router();

const {
  getPanchanga,
  getDailyNakath,
  getAllPlanetPositions,
  getNakshatra,
  getRashi,
  detectYogas,
} = require('../engine/astrology');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');
const { adminAuth } = require('../middleware/adminAuth');

function safeEq(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length > 0 && ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Access gate, in order:
//   1. Shared secret (X-Marketing-Key) — the hosted studio's server-side proxy
//      sends this. Robust across Docker's NAT (unlike IP-based localhost checks).
//   2. Localhost — local dev.
//   3. Allowlisted admin (Firebase token).
function marketingGate(req, res, next) {
  const secret = process.env.MARKETING_API_KEY;
  if (secret && safeEq(req.headers['x-marketing-key'], secret)) return next();

  const ip = req.ip || req.connection.remoteAddress || '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost') return next();

  return adminAuth(req, res, next);
}
router.use(marketingGate);

// Kill switch (config/adminFlags.marketingKillSwitch) — pause the studio from
// the admin dashboard. Cached 60s so it adds at most one tiny read/min.
let mkCache = { on: false, at: 0 };
async function marketingKilled() {
  if (Date.now() - mkCache.at < 60 * 1000) return mkCache.on;
  try {
    const db = getDb();
    const doc = db ? await db.collection('config').doc('adminFlags').get() : null;
    mkCache = { on: !!(doc && doc.exists && doc.data().marketingKillSwitch === true), at: Date.now() };
  } catch { mkCache.at = Date.now(); }
  return mkCache.on;
}
router.use(async (req, res, next) => {
  if (await marketingKilled()) {
    return res.status(503).json({ error: 'Marketing studio is paused by the admin kill switch.', killSwitch: true });
  }
  next();
});

/**
 * GET /api/marketing/today
 * Full astrology data package for today's content generation
 */
router.get('/today', async (req, res) => {
  try {
    const now = new Date();
    const panchanga = getPanchanga(now);
    const nakath = getDailyNakath(now);
    const planets = getAllPlanetPositions(now);
    // detectYogas(date, lat, lng) takes a Date — NOT the planet array (that
    // mismatch crashed getLagna with "date.getUTCFullYear is not a function").
    const yogas = detectYogas ? detectYogas(now) : [];

    res.json({
      date: now.toISOString().split('T')[0],
      panchanga,
      nakath,
      planets,
      yogas,
      summary: {
        nakshatra: panchanga?.nakshatra || 'Unknown',
        tithi: panchanga?.tithi || 'Unknown',
        yoga: panchanga?.yoga || 'Unknown',
        moonSign: panchanga?.moonSign || 'Unknown',
      },
    });
  } catch (err) {
    console.error('Marketing today error:', err);
    res.status(500).json({ error: 'Failed to get today data' });
  }
});

/**
 * GET /api/marketing/rashi-daily
 * REAL per-sign daily content for daily posts — computed from the ephemeris
 * (Chandra gochara + Saturn/Jupiter transits), NOT AI. Ready-to-post quotes
 * in English + Sinhala for all 12 signs.
 */
const { getRashiDaily } = require('../engine/rashiDaily');
router.get('/rashi-daily', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    res.json(getRashiDaily(date));
  } catch (err) {
    console.error('Marketing rashi-daily error:', err.message);
    res.status(500).json({ error: 'Failed to compute rashi daily' });
  }
});

/**
 * GET /api/marketing/rashi-period?mode=weekly|monthly[&date=YYYY-MM-DD]
 * REAL per-sign weekly/monthly packages — day-by-day ephemeris aggregation
 * (good-day counts, best day/window, Chandrashtama caution dates). No AI.
 */
const { getRashiPeriod } = require('../engine/rashiPeriod');
router.get('/rashi-period', (req, res) => {
  try {
    const mode = req.query.mode === 'monthly' ? 'monthly' : 'weekly';
    const date = req.query.date ? new Date(req.query.date) : new Date();
    res.json(getRashiPeriod(mode, date));
  } catch (err) {
    console.error('Marketing rashi-period error:', err.message);
    res.status(500).json({ error: 'Failed to compute rashi period' });
  }
});

/**
 * GET /api/marketing/sign/:sign
 * Quick daily insight for a specific sign (for reel scripts)
 */
router.get('/sign/:sign', async (req, res) => {
  try {
    const { sign } = req.params;
    const now = new Date();
    const panchanga = getPanchanga(now);
    const planets = getAllPlanetPositions(now);

    // Find relevant transits for this sign
    const signPlanets = planets.filter(p => 
      p.sign?.toLowerCase() === sign.toLowerCase() ||
      p.rashi?.toLowerCase() === sign.toLowerCase()
    );

    res.json({
      sign,
      date: now.toISOString().split('T')[0],
      panchanga: {
        nakshatra: panchanga?.nakshatra,
        tithi: panchanga?.tithi,
        yoga: panchanga?.yoga,
      },
      planetsInSign: signPlanets,
      allPlanets: planets,
    });
  } catch (err) {
    console.error('Marketing sign error:', err);
    res.status(500).json({ error: 'Failed to get sign data' });
  }
});

const COMPAT_ELEMENTS = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};
const COMPAT_SIGNS = Object.keys(COMPAT_ELEMENTS);

function computeCompatibility(sign1, sign2) {
  const el1 = COMPAT_ELEMENTS[sign1] || 'unknown';
  const el2 = COMPAT_ELEMENTS[sign2] || 'unknown';
  let score = 50;
  if (el1 === el2) score = 85;
  else if ((el1 === 'fire' && el2 === 'air') || (el1 === 'air' && el2 === 'fire')) score = 75;
  else if ((el1 === 'earth' && el2 === 'water') || (el1 === 'water' && el2 === 'earth')) score = 75;
  else if ((el1 === 'fire' && el2 === 'water') || (el1 === 'water' && el2 === 'fire')) score = 35;
  else if ((el1 === 'earth' && el2 === 'air') || (el1 === 'air' && el2 === 'earth')) score = 45;
  return {
    sign1, sign2, element1: el1, element2: el2, score,
    chemistry: score >= 75 ? 'High' : score >= 50 ? 'Moderate' : 'Challenging',
    description: getCompatibilityDesc(sign1, sign2, score),
  };
}

/**
 * GET /api/marketing/compatibility-matrix
 * All 78 unique sign pairs in ONE response — so the studio's compatibility
 * grid costs a single request, not 78 (which trips the global rate limiter).
 */
router.get('/compatibility-matrix', (req, res) => {
  try {
    const pairs = [];
    for (let i = 0; i < COMPAT_SIGNS.length; i++) {
      for (let j = i; j < COMPAT_SIGNS.length; j++) {
        pairs.push(computeCompatibility(COMPAT_SIGNS[i], COMPAT_SIGNS[j]));
      }
    }
    res.json({ signs: COMPAT_SIGNS, pairs, computedFrom: 'element-harmony — deterministic, no AI' });
  } catch (err) {
    console.error('Marketing compatibility-matrix error:', err.message);
    res.status(500).json({ error: 'Failed to compute compatibility matrix' });
  }
});

/**
 * GET /api/marketing/compatibility/:sign1/:sign2
 * Quick compatibility data for teaser reels
 */
router.get('/compatibility/:sign1/:sign2', async (req, res) => {
  try {
    const { sign1, sign2 } = req.params;
    res.json(computeCompatibility(sign1, sign2));
  } catch (err) {
    console.error('Marketing compatibility error:', err);
    res.status(500).json({ error: 'Failed to get compatibility' });
  }
});

function getCompatibilityDesc(sign1, sign2, score) {
  if (score >= 75) return `${sign1} and ${sign2} share natural harmony. Their energies complement and elevate each other.`;
  if (score >= 50) return `${sign1} and ${sign2} have a dynamic connection with growth potential through understanding differences.`;
  return `${sign1} and ${sign2} face challenges that can become powerful catalysts for personal transformation.`;
}

module.exports = router;
