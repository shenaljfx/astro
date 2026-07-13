/**
 * Public Preview Routes — free teasers that pull non-subscribers into the funnel.
 *
 * Mounted WITHOUT `requireSubscription` (see index.js). Each endpoint returns a
 * genuinely useful slice of a paid feature — enough to create desire — while
 * deliberately omitting the premium depth (advanced analysis, AI explanations,
 * doshas, maraka, divisional charts) so upgrading still has a clear payoff.
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  buildHouseChart, getLagna, getNakshatra, getRashi,
  toSidereal, getMoonLongitude, getSunLongitude, getPanchanga, RASHIS,
  calculateVimshottari,
} = require('../engine/astrology');
const { detectDoshas, detectAdvancedYogas, calculateShadbala } = require('../engine/advanced');
const { calculatePorondam } = require('../engine/porondam');
const { buildCoupleReading } = require('../engine/porondamArchetype');
const { buildConvergenceForBirth, previewSliceConvergence } = require('../engine/convergenceCalendar');
const { findMuhurtha } = require('../engine/muhurtha');
const { buildDailyNakathData, getQueryTimeContext } = require('./nakath');
const { buildBasicChartData } = require('./horoscope');
let enhancedEngine = null;
try { enhancedEngine = require('../engine/enhanced'); } catch (_) { /* graceful */ }
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');

/**
 * POST /api/preview/kendara
 * Free kendara teaser: the real D1 + D9 charts, lagna/moon/sun/nakshatra, and
 * the plain-language summary — but NO advancedAnalysis / chartExplanations /
 * doshas / maraka / vargas. Returns the same field shape as the full
 * birth-chart endpoint so the client renders it with no special-casing (the
 * premium vault sections auto-hide because advancedAnalysis is absent).
 */
router.post('/kendara', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat = 6.9271, lng = 79.8612 } = req.body;
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat), plng = parseFloat(lng);

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    const lagna = getLagna(date, plat, plng);
    const houseChart = buildHouseChart(date, plat, plng);
    const moonSidereal = toSidereal(getMoonLongitude(date), date);
    const sunSidereal = toSidereal(getSunLongitude(date), date);
    const moonNakshatra = getNakshatra(moonSidereal);
    const moonRashi = getRashi(moonSidereal);
    const sunRashi = getRashi(sunSidereal);

    // rashiChart in the exact shape the full birth-chart endpoint returns
    const allPlanets = houseChart.planets;
    const d1Chart = [];
    for (let i = 0; i < 12; i++) {
      const rashiId = i + 1;
      const r = RASHIS[i];
      const planetsInRashi = [];
      for (const [key, p] of Object.entries(allPlanets)) {
        if (p.rashiId === rashiId) planetsInRashi.push({ key, name: p.name, sinhala: p.sinhala, degree: p.degreeInSign });
      }
      if (lagna.rashi.id === rashiId) planetsInRashi.unshift({ name: 'Lagna', sinhala: 'ලග්න' });
      d1Chart.push({ rashiId, rashi: r.name, rashiEnglish: r.english, rashiSinhala: r.sinhala, rashiLord: r.lord, planets: planetsInRashi });
    }

    let panchanga = null;
    try {
      const pc = getPanchanga(date, plat, plng);
      panchanga = { nakshatra: pc.nakshatra, tithi: pc.tithi ? { name: pc.tithi.name } : null };
    } catch (_) { /* panchanga is optional for the teaser */ }

    // ── Vault counts — cheap signals that name the locked depth without
    // revealing it. "3 yogas found — 1 is rare 🔒" converts far better than
    // a generic "unlock more". Counts are free; meanings/remedies are Pro.
    //
    // Extended (Phase A): each locked kendara section renders a real number
    // from THIS chart — the top yoga's name, the current dasha planet + how
    // far through it the user is, the strongest planet + %, and which checks
    // (Mars/Saturn) ran. All best-effort and independently guarded so one
    // failed calc never blanks the rest of the teaser.
    let vaultCounts = null;
    try {
      const doshas = detectDoshas(date, plat, plng);
      const yogas = detectAdvancedYogas(date, plat, plng);
      const rajaYogas = yogas.filter(y => y.category === 'Raja Yoga');
      const dhanaYogas = yogas.filter(y => y.category === 'Dhana Yoga');

      // One representative strong yoga — a NAMED thing you can't read yet
      // converts better than a bare count. Prefer a strong Raja/Dhana yoga.
      const strongYogas = yogas.filter(y => y.strength === 'Very Strong' || y.strength === 'Strong');
      const pickFrom = strongYogas.length ? strongYogas : yogas;
      const topYoga = pickFrom[0] ? { name: pickFrom[0].name, category: pickFrom[0].category || null } : null;

      // Current life chapter (mahadasha) + progress — the strongest recurring
      // hook. The free ladder shows planet names + year spans (looks like a
      // life map); the reading behind it stays Pro.
      let currentDasha = null;
      let dashaLadder = [];
      try {
        const periods = calculateVimshottari(moonSidereal, date);
        const now = Date.now();
        dashaLadder = (periods || []).map(p => {
          const s = new Date(p.start).getTime();
          const e = new Date(p.endDate).getTime();
          const isCurrent = now >= s && now <= e;
          return {
            planet: p.lord,
            startYear: new Date(p.start).getFullYear(),
            endYear: new Date(p.endDate).getFullYear(),
            years: Math.round(p.years),
            isCurrent,
            isPast: now > e,
            progress: isCurrent && e > s ? Math.round(((now - s) / (e - s)) * 100) : (now > e ? 100 : 0),
          };
        });
        const cur = dashaLadder.find(p => p.isCurrent) || null;
        if (cur) currentDasha = { planet: cur.planet, endYear: cur.endYear, progress: cur.progress };
      } catch (de) { console.warn('[preview/kendara] dasha teaser failed (non-fatal):', de.message); }

      // Strongest supporting planet — reveal the winner free, lock the rest.
      let strongest = null;
      let shadbalaCount = 0;
      try {
        const sb = calculateShadbala(date, plat, plng);
        const arr = Object.values(sb || {});
        shadbalaCount = arr.length;
        if (arr.length) {
          arr.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
          strongest = { planet: arr[0].name, percentage: arr[0].percentage };
        }
      } catch (se) { console.warn('[preview/kendara] shadbala teaser failed (non-fatal):', se.message); }

      vaultCounts = {
        yogas: yogas.length,
        rajaYogas: rajaYogas.length,
        dhanaYogas: dhanaYogas.length,
        rareYogas: rajaYogas.length + dhanaYogas.length,
        doshas: doshas.length,
        hasDosha: doshas.length > 0,
        dashaTimeline: true, // the full dasha ladder is a premium vault
        // ── extended teaser signals ──
        topYoga,            // { name, category } | null — one free badge, rest locked
        currentDasha,       // { planet, endYear, progress } | null
        dashaLadder,        // [{ planet, startYear, endYear, years, isCurrent, isPast, progress }]
        strongest,          // { planet, percentage } | null — the free reveal
        shadbala: shadbalaCount, // count of planet-power meters behind the lock
        mangalChecked: true,     // Mars-in-relationships was computed (verdict is Pro)
        sadeSatiChecked: true,   // Saturn-pressure was computed (verdict is Pro)
        varga: 6,                // divisional life-area charts available (D9,D10,D7,D4,D24,D20)
      };
    } catch (e) { console.warn('[preview/kendara] vault counts failed (non-fatal):', e.message); }

    // NOTE: navamsha (D9) is deliberately NOT returned. The marriage chart is
    // the highest-desire tease on the page and is drawn as a locked placeholder
    // on the client — sending the real grid here would let it be scraped free.
    res.json({
      success: true,
      data: {
        _preview: true,
        lagna: { ...lagna.rashi, rashiId: lagna.rashi.id, degree: lagna.sidereal % 30 },
        moonSign: { ...moonRashi, degree: moonSidereal % 30 },
        sunSign: { ...sunRashi, degree: sunSidereal % 30 },
        nakshatra: moonNakshatra,
        rashiChart: d1Chart,
        panchanga,
        vaultCounts,
      },
    });
  } catch (e) {
    console.error('[preview/kendara] error:', e.message);
    res.status(500).json({ error: 'Failed to build preview' });
  }
});

/**
 * POST /api/preview/porondam
 * Free couple tease shown BEFORE the paywall. Returns ONLY the relationship
 * archetype (name + essence — the verdict-shaped hook), the single top gift,
 * and COUNTS of what the full reading holds. Never the X/20 score, the per-
 * porondam breakdown, magnetism, wedding windows, charts, or the AI report —
 * those are the paid payload. The archetype is derived from the same lagna
 * signs the paid result uses, so the free name matches what they'll unlock.
 *
 * Body: { bride: { birthDate, lat?, lng? }, groom: { birthDate, lat?, lng? } }
 */
router.post('/porondam', optionalAuth, async (req, res) => {
  try {
    const { bride, groom } = req.body || {};
    if (!bride?.birthDate || !groom?.birthDate) {
      return res.status(400).json({ error: 'Both bride and groom birth dates are required.' });
    }

    const bLat = parseFloat(bride.lat) || 6.9271, bLng = parseFloat(bride.lng) || 79.8612;
    const gLat = parseFloat(groom.lat) || 6.9271, gLng = parseFloat(groom.lng) || 79.8612;

    let bDate, gDate;
    try { bDate = await parseBirthDateTime(bride.birthDate, bLat, bLng); } catch (_) { bDate = parseSLT(bride.birthDate); }
    try { gDate = await parseBirthDateTime(groom.birthDate, gLat, gLng); } catch (_) { gDate = parseSLT(groom.birthDate); }
    if (!bDate || isNaN(bDate.getTime()) || !gDate || isNaN(gDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const result = calculatePorondam(bDate, gDate);

    // Lagna IDs the paid archetype uses (fall back to moon rashi like the full
    // /check route does) so the tease name == the unlocked name.
    let brideLagna = (result.bride && result.bride.rashi && result.bride.rashi.id) || 1;
    let groomLagna = (result.groom && result.groom.rashi && result.groom.rashi.id) || 1;
    try { brideLagna = buildHouseChart(bDate, bLat, bLng).lagna.rashi.id; } catch (_) {}
    try { groomLagna = buildHouseChart(gDate, gLat, gLng).lagna.rashi.id; } catch (_) {}

    const sliceForLang = (L) => {
      const cr = buildCoupleReading(result, brideLagna, groomLagna, L);
      return {
        archetype: {
          name: cr.archetype.name,
          essence: cr.archetype.essence,
          bandLabel: cr.archetype.bandLabel,
          emblem: cr.archetype.emblem,
        },
        topGift: (cr.gifts && cr.gifts[0]) || null,
        counts: {
          gifts: (cr.gifts || []).length,
          growthEdges: (cr.nurture || []).length,
          hasSignificant: !!cr.hasSignificant,
        },
      };
    };

    res.json({
      success: true,
      data: {
        _preview: true,
        en: sliceForLang('en'),
        si: sliceForLang('si'),
        // Named locked vaults — what upgrading reveals (labels only, no data).
        lockedVaults: ['score', 'allPorondam', 'magnetism', 'weddingWindows', 'bothCharts', 'aiReport', 'pdf'],
      },
    });
  } catch (e) {
    console.error('[preview/porondam] error:', e.message);
    res.status(500).json({ error: 'Failed to build porondam preview' });
  }
});

// Robustly count naming-letter suggestions across possible engine shapes.
function countNamingLetters(s) {
  if (!s) return 0;
  if (Array.isArray(s)) return s.length;
  if (Array.isArray(s.letters)) return s.letters.length;
  if (Array.isArray(s.syllables)) return s.syllables.length;
  if (Array.isArray(s.suggestions)) return s.suggestions.length;
  if (Array.isArray(s.sounds)) return s.sounds.length;
  return typeof s === 'object' ? Object.keys(s).length : 0;
}

/**
 * POST /api/preview/baby
 * Free Baby Kendara tease. Enter the newborn's birth details → lagna +
 * nakshatra reveal, the COUNT of auspicious naming letters, and that Ganda
 * Moola has been checked — but the actual letters, the dosha result/guidance,
 * and the ceremony dates are the paid pack.
 *
 * Body: { birthDate, lat?, lng? }
 */
router.post('/baby', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    const identity = buildBasicChartData(date, plat, plng);

    let namingLetterCount = 0;
    let gandaMoolaChecked = false;
    if (enhancedEngine) {
      try { const names = enhancedEngine.getBabyNameSuggestions(date, plat, plng); namingLetterCount = countNamingLetters(names && names.suggestions); } catch (_) {}
      try { gandaMoolaChecked = !!enhancedEngine.analyzeGandaMoola(date, plat, plng); } catch (_) {}
    }

    res.json({
      success: true,
      data: {
        _preview: true,
        lagna: identity.lagna,
        moonSign: identity.moonSign,
        nakshatra: identity.nakshatra,
        namingLetterCount,
        gandaMoolaChecked,
      },
    });
  } catch (e) {
    console.error('[preview/baby] error:', e.message);
    res.status(500).json({ error: 'Failed to build baby preview' });
  }
});

/**
 * POST /api/preview/nakath
 * Free Subha Nakath tease. Returns the best auspicious DAY in the range (date +
 * day-quality), the activity meta, and how many exact time-windows were found —
 * but never the exact time, the score breakdown, or the personalization. The
 * "which day" is the hook; the "which hour" (and chart-tuned scoring) is Pro.
 *
 * Body: { activity, startDate, endDate, lat?, lng? }
 */
router.post('/nakath', optionalAuth, async (req, res) => {
  try {
    const { activity, startDate, endDate, lat, lng } = req.body || {};
    if (!activity || !startDate || !endDate) {
      return res.status(400).json({ error: 'activity, startDate and endDate are required' });
    }
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let full;
    try {
      // birthDate = null → generic (un-personalized) scoring; personalization is Pro.
      full = findMuhurtha(activity, startDate, endDate, null, plat, plng, 5);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const best = full.bestDate;

    // Day-level "why this day" facts — panchanga names only (weekday, tithi,
    // nakshatra, yoga) so the pick is justified, without leaking the Pro
    // value: the exact hour, numeric scores, and chart-tuned tara/chandra
    // factors stay locked.
    const b = best && best.breakdown ? best.breakdown : null;
    const why = b ? [
      b.weekday && b.weekday.day ? { key: 'weekday', name: b.weekday.day, good: (b.weekday.score || 0) >= 8 } : null,
      b.tithi && b.tithi.name ? { key: 'tithi', name: b.tithi.name, number: b.tithi.number || null, good: (b.tithi.score || 0) >= 15 } : null,
      b.nakshatra && b.nakshatra.name ? { key: 'nakshatra', name: b.nakshatra.name, sinhala: b.nakshatra.sinhala || null, good: (b.nakshatra.score || 0) >= 15 } : null,
      b.yoga && b.yoga.name ? { key: 'yoga', name: b.yoga.name, good: (b.yoga.score || 0) >= 10 } : null,
    ].filter(Boolean) : [];

    res.json({
      success: true,
      data: {
        _preview: true,
        activity: full.activity,
        activitySinhala: full.activitySinhala,
        icon: full.icon,
        searchRange: full.searchRange,
        candidatesFound: full.candidatesFound,
        noGoodDate: full.noGoodDate,
        // Best DAY only — no exact time, no numeric breakdown.
        bestDay: best ? { date: best.dateTime.split('T')[0], quality: best.quality, score: best.score, why: why } : null,
        lockedWindowCount: (full.results || []).length,
      },
    });
  } catch (e) {
    console.error('[preview/nakath] error:', e.message);
    res.status(500).json({ error: 'Failed to build nakath preview' });
  }
});

/**
 * POST /api/preview/birth-chart
 * Free basic chart identity — lagna, moon/sun signs, nakshatra, D1 grid and
 * personality traits — so the Home page shows a real identity ("the mirror")
 * before subscribing. No AI, nothing user-private. The premium depth (advanced
 * analysis, doshas, dasha timeline, transits) still needs a subscription.
 *
 * Body: { birthDate, lat?, lng? }
 */
router.post('/birth-chart', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    res.json({ success: true, data: { _preview: true, ...buildBasicChartData(date, plat, plng) } });
  } catch (e) {
    console.error('[preview/birth-chart] error:', e.message);
    res.status(500).json({ error: 'Failed to build chart preview' });
  }
});

/**
 * POST /api/preview/convergence
 * Free tease of the 12-month convergence calendar. Returns the intensity strip
 * (a dot per month) and the window HEADERS (life area + direction + date range
 * + tier) — never the per-domain scores, driver reasons, or guidance. The dots
 * and dated windows are the hook; the "why" and "what to do" are Pro.
 *
 * Body: { birthDate, lat?, lng? }
 */
router.post('/convergence', optionalAuth, async (req, res) => {
  try {
    const { birthDate, lat, lng } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    const cal = buildConvergenceForBirth(date, plat, plng, { months: 12 });
    const slice = previewSliceConvergence(cal);
    if (!slice) return res.status(422).json({ error: 'Could not build the calendar for this chart' });

    res.json({ success: true, data: slice });
  } catch (e) {
    console.error('[preview/convergence] error:', e.message);
    res.status(500).json({ error: 'Failed to build convergence preview' });
  }
});

/**
 * GET /api/preview/today
 * Free daily habit surface for logged-out / non-subscriber Home. Returns the
 * SAME shape as /api/nakath/daily (Rahu Kalaya, sunrise/sunset, panchanga,
 * moon, auspicious periods) so the Home screen renders it with no special-
 * casing. This is commodity, non-personalized data (every Sinhala newspaper
 * prints it) — locking it would break the daily habit that feeds the paywall,
 * so it stays free. Personalized surfaces (aura, cosmic shield, weekly lagna)
 * remain gated and tease separately on the client.
 */
router.get('/today', (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const lat = parseFloat(req.query.lat) || 6.9271;
    const lng = parseFloat(req.query.lng) || 79.8612;
    const timeContext = getQueryTimeContext(req);

    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    res.json({ success: true, data: { _preview: true, ...buildDailyNakathData(date, lat, lng, timeContext) } });
  } catch (error) {
    console.error('[preview/today] error:', error.message);
    res.status(500).json({ error: 'Failed to build today preview' });
  }
});

module.exports = router;
