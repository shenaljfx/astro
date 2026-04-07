/**
 * ═══════════════════════════════════════════════════════════════════════════
 * JYOTISH INTEGRATION ENGINE — @prisri/jyotish (ISC License)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Wraps the @prisri/jyotish library (pure JavaScript, ISC license, depends
 * on astronomy-engine) to provide:
 *
 *   1. Independent Kundli generation with Vimshottari Dasha cross-validation
 *   2. Chalit Chart (Bhava Chalit from @prisri) for planet-in-house precision
 *   3. Full 16-chart Varga (Shodashvarga) system (D1–D60)
 *   4. Ashtakoot Kundali Milan (8-factor matching for Porondam)
 *   5. Mangal Dosha independent detection with cancellation logic
 *   6. Sade Sati detection (7.5-year Saturn transit analysis)
 *   7. Tara Balam (star strength for muhurta timing)
 *   8. Chandrashtama (Moon's 8th transit — inauspicious periods)
 *   9. Disha Shoola (directional safety by day of week)
 *  10. Special Yoga detection (Amrit Siddhi, Siddha, Sarvartha Siddhi)
 *  11. Cross-validated Panchanga (independent tithi/nakshatra/yoga/karana)
 *  12. Independent Dasha system (Maha/Antar/Pratyantardasha)
 *
 * All functions gracefully degrade — if the library fails to load,
 * every function returns null with a console warning. The core Grahachara
 * engine is NEVER broken by this module.
 *
 * Author: Grahachara Engine v5.1 — Jyotish Module
 * License: ISC (all dependencies are ISC/MIT licensed)
 */

// ═══════════════════════════════════════════════════════════════════════════
//  SAFE LIBRARY LOADING
// ═══════════════════════════════════════════════════════════════════════════

let jyotish = null;
let Observer = null;

try {
  const j = require('@prisri/jyotish');
  jyotish = j;
  Observer = j.Observer;
  console.log('[Jyotish] ✓ @prisri/jyotish loaded (ISC license, pure JS, astronomy-engine backend)');
} catch (e) {
  console.warn('[Jyotish] ✗ @prisri/jyotish not available:', e.message);
}

// ═══════════════════════════════════════════════════════════════════════════
//  HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an Observer object for @prisri/jyotish
 */
function createObserver(lat = 6.9271, lng = 79.8612, alt = 0) {
  if (!Observer) return null;
  try {
    return new Observer(lat, lng, alt);
  } catch (e) {
    console.warn('[Jyotish] Failed to create observer:', e.message);
    return null;
  }
}

/**
 * Safe wrapper — calls a jyotish function and returns null on any error
 */
function safe(fn, label) {
  try {
    return fn();
  } catch (e) {
    console.warn(`[Jyotish] ${label} failed:`, e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. KUNDLI (Full Birth Chart)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a full Kundli (birth chart) using @prisri/jyotish
 * Returns: { birthDetails, ascendant, planets, houses, dasha, vargas }
 */
function getKundli(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    return jyotish.getKundli(date, obs);
  }, 'getKundli');
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. CHALIT CHART (Bhava Chalit — planet in actual house cusps)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the Chalit (Bhava) chart — planets placed by house cusps, not sign boundaries
 * This is critical for predictive accuracy: a planet at 29° Aries in D1 may 
 * actually occupy house 2 in the Chalit chart
 */
function getChalitChart(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.getChalitChart(kundli);
  }, 'getChalitChart');
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. VARGA CHARTS (16 Divisional Charts — D1 to D60)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all 16 Varga (divisional) charts from the Kundli
 * Returns: { d1, d2, d3, d4, d7, d9, d10, d12, d16, d20, d24, d27, d30, d40, d45, d60 }
 * Each contains { ascendant: { rashi, rashiName }, planets: { Sun: { rashi, rashiName }, ... } }
 */
function getVargaCharts(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli || !kundli.vargas) return null;
    return kundli.vargas;
  }, 'getVargaCharts');
}

/**
 * Get a specific divisional chart (e.g., 'd9' for Navamsha)
 */
function getSpecificVarga(birthDate, lat, lng, division = 'd9') {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli || !kundli.vargas) return null;
    return kundli.vargas[division] || null;
  }, `getVarga-${division}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. DASHA SYSTEM (Vimshottari — Maha/Antar/Pratyantardasha)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the full Vimshottari Dasha system from @prisri/jyotish
 * Returns: { birthNakshatra, nakshatraPada, mahadashas[], 
 *            currentMahadasha, currentAntardasha, currentPratyantar }
 */
function getDashaSystem(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli || !kundli.dasha) return null;
    return kundli.dasha;
  }, 'getDashaSystem');
}

/**
 * Cross-validate Dasha periods between core engine and @prisri/jyotish
 * Returns comparison of current Mahadasha/Antardasha lords
 */
function crossValidateDasha(birthDate, lat, lng, coreDasha) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli || !kundli.dasha) return null;

    const jDasha = kundli.dasha;
    const now = new Date();

    // Find current Mahadasha from @prisri
    let jCurrentMD = null;
    let jCurrentAD = null;
    for (const md of (jDasha.mahadashas || [])) {
      if (now >= new Date(md.startTime) && now <= new Date(md.endTime)) {
        jCurrentMD = md;
        for (const ad of (md.antars || [])) {
          if (now >= new Date(ad.startTime) && now <= new Date(ad.endTime)) {
            jCurrentAD = ad;
            break;
          }
        }
        break;
      }
    }

    // Extract core engine current dasha lord
    let coreMD = null;
    let coreAD = null;
    if (coreDasha) {
      if (Array.isArray(coreDasha)) {
        // Assume first entry is current
        coreMD = coreDasha[0]?.lord || coreDasha[0]?.planet;
      } else if (coreDasha.current) {
        coreMD = coreDasha.current.mahadasha || coreDasha.current.lord;
        coreAD = coreDasha.current.antardasha;
      }
    }

    const jMDLord = jCurrentMD?.planet || jDasha.currentMahadasha;
    const jADLord = jCurrentAD?.planet || jDasha.currentAntardasha;

    const mdMatch = coreMD && jMDLord && coreMD.toLowerCase() === jMDLord.toLowerCase();
    const adMatch = coreAD && jADLord && coreAD.toLowerCase() === jADLord.toLowerCase();

    return {
      source: '@prisri/jyotish',
      jyotishMahadasha: jMDLord,
      jyotishAntardasha: jADLord,
      jyotishPratyantar: jDasha.currentPratyantar || null,
      coreMahadasha: coreMD,
      coreAntardasha: coreAD,
      mahadashaMatch: mdMatch,
      antardashaMatch: adMatch,
      agreement: mdMatch && adMatch ? 'Full' : mdMatch ? 'Partial (MD matches)' : 'Divergent',
      birthNakshatra: jDasha.birthNakshatra,
      nakshatraPada: jDasha.nakshatraPada,
      dashaTimeline: (jDasha.mahadashas || []).map(md => ({
        planet: md.planet,
        start: md.startTime,
        end: md.endTime,
        durationYears: md.durationYears?.toFixed(1),
        isCurrent: md.planet === jMDLord,
      })),
    };
  }, 'crossValidateDasha');
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. MANGAL DOSHA (Mars affliction for marriage)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check Mangal (Kuja) Dosha — Mars placement analysis for marriage compatibility
 * @prisri/jyotish checks all 6 houses (1, 2, 4, 7, 8, 12) and cancellation rules
 * Note: takes kundli object, NOT date+observer
 */
function checkMangalDosha(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.checkMangalDosha(kundli);
  }, 'checkMangalDosha');
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. SADE SATI (7.5-year Saturn transit over Moon sign)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Sade Sati is currently active
 * Saturn transits through 12th, 1st, and 2nd houses from natal Moon
 * Note: takes kundli object, NOT date+observer
 */
function checkSadeSati(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.checkSadeSati(kundli);
  }, 'checkSadeSati');
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. TARA BALAM (Star Strength for Muhurta)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate Tara Balam — the strength/auspiciousness based on the
 * relationship between birth nakshatra and current transit nakshatra
 * Returns: { strength: 'Good'|'Bad'|'Moderate', type: string }
 * Note: takes kundli object
 */
function calculateTaraBalam(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.calculateTaraBalam(kundli);
  }, 'calculateTaraBalam');
}

// ═══════════════════════════════════════════════════════════════════════════
//  8. CHANDRASHTAMA (Moon's 8th transit — inauspicious window)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect Chandrashtama period — when transit Moon is in the 8th sign 
 * from natal Moon sign. Avoid important activities during this time.
 * Note: takes kundli object
 */
function getChandrashtama(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.getChandrashtama(kundli);
  }, 'getChandrashtama');
}

// ═══════════════════════════════════════════════════════════════════════════
//  9. DISHA SHOOLA (Directional Safety by Weekday)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Disha Shoola — which direction is inauspicious for travel today
 * Based on the vara (weekday) of the query date
 */
function getDishaShoola(date) {
  if (!jyotish) return null;
  return safe(() => {
    const d = new Date(date || new Date());
    const obs = createObserver(); // default Colombo
    return jyotish.getDishaShoola(d, obs);
  }, 'getDishaShoola');
}

// ═══════════════════════════════════════════════════════════════════════════
//  10. SPECIAL YOGAS (Day-Nakshatra combinations)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect special day-yogas like Amrit Siddhi Yoga, Siddha Yoga,
 * Sarvartha Siddhi Yoga based on weekday-nakshatra combinations
 */
function getSpecialYogas(birthDate, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const date = new Date(birthDate);
    const kundli = jyotish.getKundli(date, obs);
    if (!kundli) return null;
    return jyotish.getSpecialYoga(kundli);
  }, 'getSpecialYogas');
}

/**
 * Detect special yogas for TODAY (no birth chart needed, uses current sky)
 */
function getTodaySpecialYogas() {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver();
    if (!obs) return null;
    const now = new Date();
    const kundli = jyotish.getKundli(now, obs);
    if (!kundli) return null;
    return jyotish.getSpecialYoga(kundli);
  }, 'getTodaySpecialYogas');
}

// ═══════════════════════════════════════════════════════════════════════════
//  11. CROSS-VALIDATED PANCHANGA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Panchanga from @prisri/jyotish for cross-validation against core engine
 * Returns tithi, nakshatra, yoga, karana, vara + sunrise/sunset/moonrise/moonset
 * + ayanamsa, rahu kalam timing
 */
function getCrossValidatedPanchanga(date, lat, lng) {
  if (!jyotish) return null;
  return safe(() => {
    const obs = createObserver(lat, lng);
    if (!obs) return null;
    const d = new Date(date || new Date());
    const panch = jyotish.getPanchangam(d, obs);
    if (!panch) return null;

    // Map numeric values to names for comparison
    const TITHI_NAMES = [
      '', 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
    ];

    const NAKSHATRA_NAMES = [
      '', 'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
      'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
      'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
      'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
      'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
      'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
    ];

    const YOGA_NAMES = [
      '', 'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana',
      'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
      'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
      'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
      'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
      'Indra', 'Vaidhriti'
    ];

    const VARA_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      source: '@prisri/jyotish',
      tithi: {
        number: panch.tithi,
        name: TITHI_NAMES[panch.tithi] || `Tithi-${panch.tithi}`,
        paksha: panch.tithi <= 15 ? 'Shukla' : 'Krishna',
        startTime: panch.tithiStartTime,
        endTime: panch.tithiEndTime,
      },
      nakshatra: {
        number: panch.nakshatra,
        name: NAKSHATRA_NAMES[panch.nakshatra] || `Nakshatra-${panch.nakshatra}`,
        startTime: panch.nakshatraStartTime,
        endTime: panch.nakshatraEndTime,
      },
      yoga: {
        number: panch.yoga,
        name: YOGA_NAMES[panch.yoga] || `Yoga-${panch.yoga}`,
        endTime: panch.yogaEndTime,
      },
      karana: panch.karana,
      vara: {
        number: panch.vara,
        name: VARA_NAMES[panch.vara] || `Vara-${panch.vara}`,
      },
      ayanamsa: panch.ayanamsa,
      sun: {
        rise: panch.sunrise,
        set: panch.sunset,
      },
      moon: {
        rise: panch.moonrise,
        set: panch.moonset,
      },
      rahuKalam: {
        start: panch.rahuKalamStart,
        end: panch.rahuKalamEnd,
      },
      gulikaKalam: {
        start: panch.gulikaKalamStart,
        end: panch.gulikaKalamEnd,
      },
      yamaganda: {
        start: panch.yamagandaKalamStart,
        end: panch.yamagandaKalamEnd,
      },
    };
  }, 'getCrossValidatedPanchanga');
}

// ═══════════════════════════════════════════════════════════════════════════
//  12. KUNDALI MATCHING (Ashtakoot Milan for Porondam)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Match two kundlis using Ashtakoot (8-factor) system
 * Returns: { ashtakoot: { totalScore, kootas[] }, dosha: { boy, girl }, verdict }
 */
function matchKundli(birthDate1, lat1, lng1, birthDate2, lat2, lng2) {
  if (!jyotish) return null;
  return safe(() => {
    const obs1 = createObserver(lat1, lng1);
    const obs2 = createObserver(lat2, lng2);
    if (!obs1 || !obs2) return null;

    const d1 = new Date(birthDate1);
    const d2 = new Date(birthDate2);

    const kundli1 = jyotish.getKundli(d1, obs1);
    const kundli2 = jyotish.getKundli(d2, obs2);

    if (!kundli1 || !kundli2) return null;
    return jyotish.matchKundli(kundli1, kundli2);
  }, 'matchKundli');
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPOSITE REPORTS (combine multiple features for specific use cases)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a comprehensive jyotish report for a birth chart
 * Used by: birth-chart endpoint, full report, AI narrative report, chat context
 */
function generateJyotishReport(birthDate, lat, lng) {
  if (!jyotish) return null;

  const startTime = Date.now();
  const obs = createObserver(lat, lng);
  if (!obs) return null;

  const date = new Date(birthDate);
  let kundli = null;

  try {
    kundli = jyotish.getKundli(date, obs);
  } catch (e) {
    console.warn('[Jyotish] getKundli failed:', e.message);
    return null;
  }
  if (!kundli) return null;

  const result = {
    _source: '@prisri/jyotish',
    _version: '1.0.6',
    _license: 'ISC',
    _computeTimeMs: 0,
  };

  // Ascendant
  if (kundli.ascendant) {
    result.ascendant = {
      rashi: kundli.ascendant.rashiName,
      rashiId: kundli.ascendant.rashi,
      lord: kundli.ascendant.rashiLord,
      degree: kundli.ascendant.degree,
      minute: kundli.ascendant.minute,
      nakshatra: kundli.ascendant.nakshatra,
      nakshatraLord: kundli.ascendant.nakshatraLord,
      pada: kundli.ascendant.pada,
    };
  }

  // Planets
  if (kundli.planets) {
    result.planets = {};
    for (const [name, data] of Object.entries(kundli.planets)) {
      result.planets[name] = {
        rashi: data.rashiName,
        rashiId: data.rashi,
        degree: data.degree,
        minute: data.minute,
        nakshatra: data.nakshatra,
        nakshatraLord: data.nakshatraLord,
        pada: data.pada,
        isRetrograde: data.isRetrograde || false,
        isCombust: data.isCombust || false,
        house: data.house,
      };
    }
  }

  // Houses
  if (kundli.houses) {
    result.houses = kundli.houses;
  }

  // Dasha
  if (kundli.dasha) {
    result.dasha = {
      birthNakshatra: kundli.dasha.birthNakshatra,
      nakshatraPada: kundli.dasha.nakshatraPada,
      currentMahadasha: kundli.dasha.currentMahadasha,
      currentAntardasha: kundli.dasha.currentAntardasha,
      currentPratyantar: kundli.dasha.currentPratyantar,
      dashaCount: (kundli.dasha.mahadashas || []).length,
      timeline: (kundli.dasha.mahadashas || []).map(md => ({
        planet: md.planet,
        start: md.startTime,
        end: md.endTime,
        years: md.durationYears ? parseFloat(md.durationYears.toFixed(1)) : 0,
      })),
    };
  }

  // Varga charts summary
  if (kundli.vargas) {
    const vargaKeys = Object.keys(kundli.vargas);
    result.vargaCharts = {
      available: vargaKeys,
      count: vargaKeys.length,
    };

    // Navamsha (D9) — most important divisional chart
    if (kundli.vargas.d9) {
      result.navamsha = {
        ascendant: kundli.vargas.d9.ascendant?.rashiName,
        planets: {},
      };
      if (kundli.vargas.d9.planets) {
        for (const [name, data] of Object.entries(kundli.vargas.d9.planets)) {
          result.navamsha.planets[name] = data.rashiName;
        }
      }
    }

    // Dashamsha (D10) — career chart
    if (kundli.vargas.d10) {
      result.dashamsha = {
        ascendant: kundli.vargas.d10.ascendant?.rashiName,
        planets: {},
      };
      if (kundli.vargas.d10.planets) {
        for (const [name, data] of Object.entries(kundli.vargas.d10.planets)) {
          result.dashamsha.planets[name] = data.rashiName;
        }
      }
    }
  }

  // Chalit chart
  try {
    const chalit = jyotish.getChalitChart(kundli);
    if (chalit) {
      result.chalitChart = {
        ascendant: chalit.ascendant,
        planets: (chalit.planets || []).map(p => ({
          name: p.name,
          house: p.house,
          rashi: p.rashiName,
          degree: p.housePositionDegree,
          isRetrograde: p.isRetrograde,
          isCombust: p.isCombust,
        })),
      };

      // Detect planets that shift houses between D1 and Chalit
      const shifts = [];
      if (kundli.houses && chalit.planets) {
        for (const cp of chalit.planets) {
          // Find the planet's D1 house
          const d1House = kundli.houses.find(h => h.planets && h.planets.includes(cp.name));
          if (d1House && d1House.number !== cp.house) {
            shifts.push({
              planet: cp.name,
              d1House: d1House.number,
              chalitHouse: cp.house,
              significance: `${cp.name} results shift from house ${d1House.number} to house ${cp.house}`,
            });
          }
        }
      }
      if (shifts.length > 0) {
        result.chalitChart.houseShifts = shifts;
      }
    }
  } catch (e) { /* skip chalit */ }

  // Mangal Dosha
  try {
    const mangal = jyotish.checkMangalDosha(kundli);
    if (mangal) {
      // Build Sinhala description from English description
      var descSi = '';
      if (mangal.hasDosha) {
        var marsH = mangal.marsHouse || '';
        if (mangal.isHigh) {
          descSi = `ලග්නයෙන් ${marsH} වන භාවයේ කුජ පිහිටීම හේතුවෙන් ප්‍රබල කුජ දෝෂයක් පවතී. විවාහයට පෙර කුජ දෝෂ සමනය සඳහා පිළියම් අනුගමනය කිරීම වැදගත්ය.`;
        } else {
          descSi = `ලග්නයෙන් ${marsH} වන භාවයේ කුජ පිහිටීම හේතුවෙන් මධ්‍යම කුජ දෝෂයක් පවතී. මංගලික සහකරු/සහකාරියක් සමඟ ගැළපීම නිර්දේශ කෙරේ.`;
        }
        if (mangal.cancelled) {
          descSi = 'කුජ දෝෂය පවතින නමුත් සමනය කරන සාධක මගින් අවලංගු වී ඇත. විවාහයට බාධාවක් නැත.';
        }
      } else {
        descSi = 'කුජ දෝෂය නොපවතී. විවාහ ගැළපීමේ අවශ්‍යතාවක් නොමැත.';
      }
      result.mangalDosha = {
        hasDosha: mangal.hasDosha,
        isHigh: mangal.isHigh || false,
        marsHouse: mangal.marsHouse || null,
        cancelled: mangal.cancelled || false,
        description: mangal.description,
        descriptionSi: descSi,
      };
    }
  } catch (e) { /* skip */ }

  // Sade Sati
  try {
    const sadeSati = jyotish.checkSadeSati(kundli);
    if (sadeSati) {
      result.sadeSati = sadeSati;
    }
  } catch (e) { /* skip */ }

  // Special Yogas
  try {
    const yogas = jyotish.getSpecialYoga(kundli);
    if (yogas && yogas.length > 0) {
      result.specialYogas = yogas;
    }
  } catch (e) { /* skip */ }

  result._computeTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Generate today's jyotish data — for the Today/Home page
 * No birth chart needed, uses current sky state
 */
function generateTodayJyotish(lat, lng) {
  if (!jyotish) return null;

  const startTime = Date.now();
  const obs = createObserver(lat, lng);
  if (!obs) return null;

  const now = new Date();
  const result = {
    _source: '@prisri/jyotish',
    _date: now.toISOString(),
  };

  // Cross-validated Panchanga
  try {
    const panch = jyotish.getPanchangam(now, obs);
    if (panch) {
      result.panchanga = panch;
    }
  } catch (e) { /* skip */ }

  // Disha Shoola
  try {
    const ds = jyotish.getDishaShoola(now, obs);
    if (ds) {
      result.dishaShoola = ds;
    }
  } catch (e) { /* skip */ }

  // Today's special yogas (using a temporary kundli for today)
  try {
    const todayKundli = jyotish.getKundli(now, obs);
    if (todayKundli) {
      const yogas = jyotish.getSpecialYoga(todayKundli);
      if (yogas && yogas.length > 0) {
        result.specialYogas = yogas;
      }
    }
  } catch (e) { /* skip */ }

  result._computeTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Generate personalized today data — includes birth-chart-dependent features
 * Used when user has a saved birth chart
 */
function generatePersonalizedToday(birthDate, lat, lng) {
  if (!jyotish) return null;

  const startTime = Date.now();
  const obs = createObserver(lat, lng);
  if (!obs) return null;

  const date = new Date(birthDate);
  const result = {
    _source: '@prisri/jyotish',
    _birthDate: date.toISOString(),
  };

  // Build kundli first (reuse for multiple checks)
  let kundli = null;
  try {
    kundli = jyotish.getKundli(date, obs);
  } catch (e) { /* skip */ }

  // Tara Balam
  if (kundli) {
    try {
      const tara = jyotish.calculateTaraBalam(kundli);
      if (tara) {
        result.taraBalam = tara;
      }
    } catch (e) { /* skip */ }
  }

  // Chandrashtama
  if (kundli) {
    try {
      const chandrashtama = jyotish.getChandrashtama(kundli);
      if (chandrashtama) {
        result.chandrashtama = chandrashtama;
      }
    } catch (e) { /* skip */ }
  }

  // Sade Sati
  if (kundli) {
    try {
      const sadeSati = jyotish.checkSadeSati(kundli);
      if (sadeSati) {
        result.sadeSati = sadeSati;
      }
    } catch (e) { /* skip */ }
  }

  // Mangal Dosha
  if (kundli) {
    try {
      const mangal = jyotish.checkMangalDosha(kundli);
      if (mangal) {
        result.mangalDosha = mangal;
      }
    } catch (e) { /* skip */ }
  }

  result._computeTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Generate porondam (compatibility) data using @prisri/jyotish Ashtakoot
 * Provides independent cross-validation of the core porondam engine
 */
function generatePorondamJyotish(brideBirth, brideLat, brideLng, groomBirth, groomLat, groomLng) {
  if (!jyotish) return null;

  const startTime = Date.now();
  const result = {
    _source: '@prisri/jyotish (Ashtakoot Milan)',
    _license: 'ISC',
  };

  try {
    const obs1 = createObserver(brideLat, brideLng);
    const obs2 = createObserver(groomLat, groomLng);
    if (!obs1 || !obs2) return null;

    const d1 = new Date(brideBirth);
    const d2 = new Date(groomBirth);

    const kundli1 = jyotish.getKundli(d1, obs1);
    const kundli2 = jyotish.getKundli(d2, obs2);
    if (!kundli1 || !kundli2) return null;

    // Ashtakoot matching
    const match = jyotish.matchKundli(kundli1, kundli2);
    if (match) {
      result.ashtakoot = match.ashtakoot;
      result.mangalDosha = match.dosha;
      result.verdict = match.verdict;
      result.totalScore = match.ashtakoot?.totalScore;
      result.maxScore = 36;
      result.percentage = match.ashtakoot?.totalScore 
        ? parseFloat(((match.ashtakoot.totalScore / 36) * 100).toFixed(1))
        : 0;
    }

    // Individual Mangal Dosha
    try {
      const brideMangal = jyotish.checkMangalDosha(kundli1);
      const groomMangal = jyotish.checkMangalDosha(kundli2);
      result.brideMangalDosha = brideMangal;
      result.groomMangalDosha = groomMangal;
    } catch (e) { /* skip */ }

    // Sade Sati for both
    try {
      result.brideSadeSati = jyotish.checkSadeSati(kundli1);
      result.groomSadeSati = jyotish.checkSadeSati(kundli2);
    } catch (e) { /* skip */ }

  } catch (e) {
    console.warn('[Jyotish] generatePorondamJyotish failed:', e.message);
    return null;
  }

  result._computeTimeMs = Date.now() - startTime;
  return result;
}

/**
 * Generate weekly prediction context from @prisri/jyotish
 * For enriching the weekly lagna palapala AI prompt
 */
function generateWeeklyContext(weekStart) {
  if (!jyotish) return null;

  return safe(() => {
    const obs = createObserver(); // default Colombo
    const d = new Date(weekStart || new Date());
    const lines = [];

    // Panchanga for start of week
    try {
      const panch = jyotish.getPanchangam(d, obs);
      if (panch) {
        lines.push(`Week-start Panchanga (@prisri/jyotish cross-validation):`);
        lines.push(`  Tithi: ${panch.tithi}, Nakshatra: ${panch.nakshatra}, Yoga: ${panch.yoga}, Karana: ${panch.karana}`);
        lines.push(`  Ayanamsa: ${panch.ayanamsa?.toFixed(4)}°`);
      }
    } catch (e) { /* skip */ }

    // Disha Shoola for each day of the week
    try {
      lines.push(`Disha Shoola (directional avoidance):`);
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(d.getTime() + i * 86400000);
        const ds = jyotish.getDishaShoola(dayDate, obs);
        if (ds) {
          lines.push(`  ${ds.varaName}: Avoid ${ds.inauspiciousDirection}, Safe: ${ds.safeDirections.join(', ')}`);
        }
      }
    } catch (e) { /* skip */ }

    // Today's special yogas
    try {
      const todayKundli = jyotish.getKundli(d, obs);
      if (todayKundli) {
        const yogas = jyotish.getSpecialYoga(todayKundli);
        if (yogas && yogas.length > 0) {
          lines.push(`Special Day-Yogas active:`);
          yogas.forEach(y => {
            lines.push(`  ${y.name}: ${y.description} (${y.isAuspicious ? 'Auspicious' : 'Inauspicious'})`);
          });
        }
      }
    } catch (e) { /* skip */ }

    return lines.length > 0 ? lines.join('\n') : null;
  }, 'generateWeeklyContext');
}


// ═══════════════════════════════════════════════════════════════════════════
//  PER-SECTION ENRICHMENTS — Deep jyotish data for every report section
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate enrichment data for EVERY section of generateFullReport.
 * Returns an object keyed by section name, each containing jyotish-derived
 * data that the section can merge into its output.
 *
 * This is called ONCE inside generateFullReport and distributed to all 21 sections.
 */
function generateSectionEnrichments(birthDate, lat, lng) {
  if (!jyotish) return null;

  const startTime = Date.now();
  const obs = createObserver(lat, lng);
  if (!obs) return null;

  const date = new Date(birthDate);
  let kundli = null;

  try {
    kundli = jyotish.getKundli(date, obs);
  } catch (e) {
    console.warn('[Jyotish] getKundli failed for section enrichments:', e.message);
    return null;
  }
  if (!kundli) return null;

  const planets = kundli.planets || {};
  const houses = kundli.houses || [];
  const vargas = kundli.vargas || {};
  const dasha = kundli.dasha || {};
  const asc = kundli.ascendant || {};

  // Pre-compute shared data
  let chalit = null;
  try { chalit = jyotish.getChalitChart(kundli); } catch (e) { /* skip */ }

  let mangalDosha = null;
  try { mangalDosha = jyotish.checkMangalDosha(kundli); } catch (e) { /* skip */ }

  let sadeSati = null;
  try { sadeSati = jyotish.checkSadeSati(kundli); } catch (e) { /* skip */ }

  let specialYogas = null;
  try { specialYogas = jyotish.getSpecialYoga(kundli); } catch (e) { /* skip */ }

  let taraBalam = null;
  try { taraBalam = jyotish.calculateTaraBalam(kundli); } catch (e) { /* skip */ }

  let chandrashtama = null;
  try { chandrashtama = jyotish.getChandrashtama(kundli); } catch (e) { /* skip */ }

  let dishaShoola = null;
  try { dishaShoola = jyotish.getDishaShoola(new Date(), obs); } catch (e) { /* skip */ }

  // Helper: get planet from kundli by name
  const getPlanet = (name) => planets[name] || null;

  // Helper: find planet's house from chalit
  const getChalitHouse = (name) => {
    if (!chalit?.planets) return null;
    const cp = chalit.planets.find(p => p.name === name);
    return cp ? cp.house : null;
  };

  // Helper: find planet's D1 house
  const getD1House = (name) => {
    const p = getPlanet(name);
    return p ? p.house : null;
  };

  // Helper: check if planet shifted between D1 and Chalit
  const getHouseShift = (name) => {
    const d1 = getD1House(name);
    const ch = getChalitHouse(name);
    if (d1 && ch && d1 !== ch) return { d1House: d1, chalitHouse: ch, shifted: true };
    return { d1House: d1, chalitHouse: ch || d1, shifted: false };
  };

  // Helper: get planet in specific varga
  const getVargaPos = (division, planetName) => {
    const v = vargas[division];
    if (!v || !v.planets) return null;
    return v.planets[planetName] || null;
  };

  // Helper: build planet summary from all vargas
  const buildVargaSummary = (planetName) => {
    const summary = {};
    const VARGA_LABELS = {
      d1: 'Rashi', d2: 'Hora', d3: 'Drekkana', d4: 'Chaturthamsha',
      d7: 'Saptamsha', d9: 'Navamsha', d10: 'Dashamsha', d12: 'Dwadashamsha',
      d16: 'Shodashamsha', d20: 'Vimsamsha', d24: 'Chaturvimsamsha',
      d27: 'Saptavimsamsha', d30: 'Trimsamsha', d40: 'Khavedamsha',
      d45: 'Akshavedamsha', d60: 'Shashtiamsha',
    };
    for (const [key, label] of Object.entries(VARGA_LABELS)) {
      const pos = getVargaPos(key, planetName);
      if (pos) summary[key] = { rashi: pos.rashiName, label };
    }
    return summary;
  };

  // ── Build per-section enrichments ──────────────────────────────
  const enrichments = {
    _source: '@prisri/jyotish',
    _computeTimeMs: 0,

    // ─── Section 1: YOGAS ─────────────────────────────────────────
    yogaAnalysis: {
      specialYogas: specialYogas || [],
      birthPanchanga: (() => {
        try {
          const panch = jyotish.getPanchangam(date, obs);
          return panch ? {
            tithi: panch.tithi,
            nakshatra: panch.nakshatra,
            yoga: panch.yoga,
            karana: panch.karana,
            vara: panch.vara,
            ayanamsa: panch.ayanamsa,
          } : null;
        } catch (e) { return null; }
      })(),
    },

    // ─── Section 2: PERSONALITY & CHARACTER ───────────────────────
    personality: {
      ascendant: {
        rashi: asc.rashiName,
        rashiId: asc.rashi,
        lord: asc.rashiLord,
        nakshatra: asc.nakshatra,
        nakshatraLord: asc.nakshatraLord,
        pada: asc.pada,
        degree: asc.degree,
        minute: asc.minute,
      },
      moon: getPlanet('Moon') ? {
        rashi: planets.Moon.rashiName,
        nakshatra: planets.Moon.nakshatra,
        nakshatraLord: planets.Moon.nakshatraLord,
        pada: planets.Moon.pada,
        house: planets.Moon.house,
        isRetrograde: planets.Moon.isRetrograde,
      } : null,
      sun: getPlanet('Sun') ? {
        rashi: planets.Sun.rashiName,
        nakshatra: planets.Sun.nakshatra,
        house: planets.Sun.house,
      } : null,
      // D1 vs Chalit ascendant comparison
      chalitAscendant: chalit?.ascendant ? {
        rashi: chalit.ascendant.rashiName,
        degree: chalit.ascendant.longitude,
      } : null,
    },

    // ─── Section 3: MARRIAGE & RELATIONSHIPS ─────────────────────
    marriage: {
      mangalDosha: mangalDosha,
      // Venus in D9 (Navamsha) — critical for marriage quality
      venusNavamsha: getVargaPos('d9', 'Venus') ? {
        rashi: getVargaPos('d9', 'Venus').rashiName,
      } : null,
      // Jupiter in D9 (husband karaka for women)
      jupiterNavamsha: getVargaPos('d9', 'Jupiter') ? {
        rashi: getVargaPos('d9', 'Jupiter').rashiName,
      } : null,
      // 7th lord from D1 and its position in D9
      seventhLord: (() => {
        const h7 = houses[6]; // 0-indexed
        if (!h7) return null;
        const rashi7 = h7.rashi;
        // Find the lord of 7th house rashi
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId7 = h7.rashiId || h7.rashi;
        const lord7 = (typeof rashiId7 === 'number' && rashiId7 >= 1 && rashiId7 <= 12) ? RASHI_LORDS[rashiId7 - 1] : null;
        if (!lord7) return null;
        const lord7D1 = getPlanet(lord7);
        const lord7D9 = getVargaPos('d9', lord7);
        return {
          planet: lord7,
          d1House: lord7D1?.house,
          d1Rashi: lord7D1?.rashiName,
          d9Rashi: lord7D9?.rashiName,
          isRetrograde: lord7D1?.isRetrograde,
        };
      })(),
      // Venus house shift (D1 vs Chalit)
      venusShift: getHouseShift('Venus'),
      // Mars house shift (for Kuja Dosha accuracy)
      marsShift: getHouseShift('Mars'),
      // D9 ascendant (Navamsha Lagna — spouse personality indicator)
      d9Ascendant: vargas.d9?.ascendant?.rashiName || null,
    },

    // ─── Section 4: CAREER & FINANCIAL STATUS ────────────────────
    career: {
      // D10 (Dashamsha) — dedicated career chart
      d10Ascendant: vargas.d10?.ascendant?.rashiName || null,
      sunD10: getVargaPos('d10', 'Sun') ? {
        rashi: getVargaPos('d10', 'Sun').rashiName,
      } : null,
      saturnD10: getVargaPos('d10', 'Saturn') ? {
        rashi: getVargaPos('d10', 'Saturn').rashiName,
      } : null,
      mercuryD10: getVargaPos('d10', 'Mercury') ? {
        rashi: getVargaPos('d10', 'Mercury').rashiName,
      } : null,
      jupiterD10: getVargaPos('d10', 'Jupiter') ? {
        rashi: getVargaPos('d10', 'Jupiter').rashiName,
      } : null,
      // 10th lord in D1 vs Chalit
      tenthLordShift: (() => {
        const h10 = houses[9];
        if (!h10) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId10 = h10.rashiId || h10.rashi;
        const lord10 = (typeof rashiId10 === 'number' && rashiId10 >= 1 && rashiId10 <= 12) ? RASHI_LORDS[rashiId10 - 1] : null;
        if (!lord10) return null;
        return { planet: lord10, ...getHouseShift(lord10) };
      })(),
      // Sade Sati impact on career
      sadeSati: sadeSati,
    },

    // ─── Section 5: CHILDREN & FAMILY ────────────────────────────
    children: {
      // D7 (Saptamsha) — dedicated children chart
      d7Ascendant: vargas.d7?.ascendant?.rashiName || null,
      jupiterD7: getVargaPos('d7', 'Jupiter') ? {
        rashi: getVargaPos('d7', 'Jupiter').rashiName,
      } : null,
      // Jupiter's full varga positions (Putrakaraka)
      jupiterVargas: buildVargaSummary('Jupiter'),
      // 5th lord house shift
      fifthLordShift: (() => {
        const h5 = houses[4];
        if (!h5) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId5 = h5.rashiId || h5.rashi;
        const lord5 = (typeof rashiId5 === 'number' && rashiId5 >= 1 && rashiId5 <= 12) ? RASHI_LORDS[rashiId5 - 1] : null;
        if (!lord5) return null;
        return { planet: lord5, ...getHouseShift(lord5) };
      })(),
    },

    // ─── Section 6: LIFELONG FUTURE PREDICTIONS ──────────────────
    lifePredictions: {
      dashaTimeline: dasha.mahadashas ? dasha.mahadashas.map(md => ({
        planet: md.planet,
        start: md.startTime,
        end: md.endTime,
        years: md.durationYears ? parseFloat(md.durationYears.toFixed(1)) : 0,
      })) : [],
      currentMahadasha: dasha.currentMahadasha,
      currentAntardasha: dasha.currentAntardasha,
      currentPratyantar: dasha.currentPratyantar,
      birthNakshatra: dasha.birthNakshatra,
    },

    // ─── Section 7: INTELLECTUAL & MENTAL HEALTH ─────────────────
    mentalHealth: {
      moon: getPlanet('Moon') ? {
        rashi: planets.Moon.rashiName,
        house: planets.Moon.house,
        nakshatra: planets.Moon.nakshatra,
        isRetrograde: planets.Moon.isRetrograde,
        isCombust: planets.Moon.isCombust,
      } : null,
      mercury: getPlanet('Mercury') ? {
        rashi: planets.Mercury.rashiName,
        house: planets.Mercury.house,
        isRetrograde: planets.Mercury.isRetrograde,
        isCombust: planets.Mercury.isCombust,
      } : null,
      moonShift: getHouseShift('Moon'),
      mercuryShift: getHouseShift('Mercury'),
      // Moon in D9 (emotional maturity)
      moonNavamsha: getVargaPos('d9', 'Moon') ? {
        rashi: getVargaPos('d9', 'Moon').rashiName,
      } : null,
      chandrashtama: chandrashtama,
    },

    // ─── Section 8: BUSINESS GROWTH ──────────────────────────────
    business: {
      // Mercury (trade), Jupiter (expansion), Sun (authority) in D10
      keyPlanetsD10: {
        mercury: getVargaPos('d10', 'Mercury')?.rashiName || null,
        jupiter: getVargaPos('d10', 'Jupiter')?.rashiName || null,
        sun: getVargaPos('d10', 'Sun')?.rashiName || null,
      },
      // 7th house (partnerships) shift in Chalit
      seventhLordShift: (() => {
        const h7 = houses[6];
        if (!h7) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId7 = h7.rashiId || h7.rashi;
        const lord7 = (typeof rashiId7 === 'number' && rashiId7 >= 1 && rashiId7 <= 12) ? RASHI_LORDS[rashiId7 - 1] : null;
        if (!lord7) return null;
        return { planet: lord7, ...getHouseShift(lord7) };
      })(),
    },

    // ─── Section 9: TRANSIT OVERLAY ──────────────────────────────
    transits: {
      taraBalam: taraBalam,
      chandrashtama: chandrashtama,
      sadeSati: sadeSati,
      dishaShoola: dishaShoola,
    },

    // ─── Section 10: REAL ESTATE & ASSETS ────────────────────────
    realEstate: {
      // D4 (Chaturthamsha) — property/vehicles chart
      d4Ascendant: vargas.d4?.ascendant?.rashiName || null,
      marsD4: getVargaPos('d4', 'Mars')?.rashiName || null,
      saturnD4: getVargaPos('d4', 'Saturn')?.rashiName || null,
      venusD4: getVargaPos('d4', 'Venus')?.rashiName || null,
      // 4th lord shift
      fourthLordShift: (() => {
        const h4 = houses[3];
        if (!h4) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId4 = h4.rashiId || h4.rashi;
        const lord4 = (typeof rashiId4 === 'number' && rashiId4 >= 1 && rashiId4 <= 12) ? RASHI_LORDS[rashiId4 - 1] : null;
        if (!lord4) return null;
        return { planet: lord4, ...getHouseShift(lord4) };
      })(),
    },

    // ─── Section 11: EMPLOYMENT & PROMOTIONS ─────────────────────
    employment: {
      sunD10: getVargaPos('d10', 'Sun')?.rashiName || null,
      saturnD10: getVargaPos('d10', 'Saturn')?.rashiName || null,
      d10Ascendant: vargas.d10?.ascendant?.rashiName || null,
      sadeSati: sadeSati,
    },

    // ─── Section 12: FINANCIAL MANAGEMENT ────────────────────────
    financial: {
      // D2 (Hora) — wealth chart
      d2Ascendant: vargas.d2?.ascendant?.rashiName || null,
      jupiterD2: getVargaPos('d2', 'Jupiter')?.rashiName || null,
      venusD2: getVargaPos('d2', 'Venus')?.rashiName || null,
      // 2nd lord and 11th lord shifts
      secondLordShift: (() => {
        const h2 = houses[1];
        if (!h2) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId2 = h2.rashiId || h2.rashi;
        const lord2 = (typeof rashiId2 === 'number' && rashiId2 >= 1 && rashiId2 <= 12) ? RASHI_LORDS[rashiId2 - 1] : null;
        if (!lord2) return null;
        return { planet: lord2, ...getHouseShift(lord2) };
      })(),
    },

    // ─── Section 13: FUTURE TIMELINE ─────────────────────────────
    futureTimeline: {
      // Full antardasha breakdown for current mahadasha
      currentMahaDashaDetail: (() => {
        if (!dasha.mahadashas) return null;
        const now = new Date();
        for (const md of dasha.mahadashas) {
          if (now >= new Date(md.startTime) && now <= new Date(md.endTime)) {
            return {
              planet: md.planet,
              start: md.startTime,
              end: md.endTime,
              antardashas: (md.antars || []).map(ad => ({
                planet: ad.planet,
                start: ad.startTime,
                end: ad.endTime,
                years: ad.durationYears ? parseFloat(ad.durationYears.toFixed(2)) : 0,
                isCurrent: now >= new Date(ad.startTime) && now <= new Date(ad.endTime),
              })),
            };
          }
        }
        return null;
      })(),
    },

    // ─── Section 14: HEALTH BLUEPRINT ────────────────────────────
    health: {
      // Key health planets in Chalit (actual house vs sign-based)
      sunShift: getHouseShift('Sun'),
      moonShift: getHouseShift('Moon'),
      marsShift: getHouseShift('Mars'),
      saturnShift: getHouseShift('Saturn'),
      // D30 (Trimsamsha) — diseases and misfortunes chart
      d30Ascendant: vargas.d30?.ascendant?.rashiName || null,
      saturnD30: getVargaPos('d30', 'Saturn')?.rashiName || null,
      marsD30: getVargaPos('d30', 'Mars')?.rashiName || null,
      // Sade Sati (health impact during Saturn transit)
      sadeSati: sadeSati,
    },

    // ─── Section 15: FOREIGN TRAVEL & LIVING ABROAD ──────────────
    foreignTravel: {
      // Rahu and Ketu positions (foreign influence)
      rahuShift: getHouseShift('Rahu'),
      ketuShift: getHouseShift('Ketu'),
      // 9th lord (long journeys) and 12th lord (foreign lands) shifts
      ninthLordShift: (() => {
        const h9 = houses[8];
        if (!h9) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId9 = h9.rashiId || h9.rashi;
        const lord9 = (typeof rashiId9 === 'number' && rashiId9 >= 1 && rashiId9 <= 12) ? RASHI_LORDS[rashiId9 - 1] : null;
        if (!lord9) return null;
        return { planet: lord9, ...getHouseShift(lord9) };
      })(),
      twelfthLordShift: (() => {
        const h12 = houses[11];
        if (!h12) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId12 = h12.rashiId || h12.rashi;
        const lord12 = (typeof rashiId12 === 'number' && rashiId12 >= 1 && rashiId12 <= 12) ? RASHI_LORDS[rashiId12 - 1] : null;
        if (!lord12) return null;
        return { planet: lord12, ...getHouseShift(lord12) };
      })(),
    },

    // ─── Section 16: LEGAL, ENEMIES & PROTECTION ─────────────────
    legal: {
      // 6th lord (enemies/litigation)
      marsD1: getPlanet('Mars') ? { house: planets.Mars.house, rashi: planets.Mars.rashiName } : null,
      saturnD1: getPlanet('Saturn') ? { house: planets.Saturn.house, rashi: planets.Saturn.rashiName } : null,
      rahuD1: getPlanet('Rahu') ? { house: planets.Rahu.house, rashi: planets.Rahu.rashiName } : null,
      sixthLordShift: (() => {
        const h6 = houses[5];
        if (!h6) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId6 = h6.rashiId || h6.rashi;
        const lord6 = (typeof rashiId6 === 'number' && rashiId6 >= 1 && rashiId6 <= 12) ? RASHI_LORDS[rashiId6 - 1] : null;
        if (!lord6) return null;
        return { planet: lord6, ...getHouseShift(lord6) };
      })(),
    },

    // ─── Section 17: EDUCATION & KNOWLEDGE PATH ──────────────────
    education: {
      // D24 (Chaturvimsamsha) — education chart
      d24Ascendant: vargas.d24?.ascendant?.rashiName || null,
      jupiterD24: getVargaPos('d24', 'Jupiter')?.rashiName || null,
      mercuryD24: getVargaPos('d24', 'Mercury')?.rashiName || null,
      // 4th lord (formal education) and 5th lord (intelligence) shifts
      fourthLordShift: (() => {
        const h4 = houses[3];
        if (!h4) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId4 = h4.rashiId || h4.rashi;
        const lord4 = (typeof rashiId4 === 'number' && rashiId4 >= 1 && rashiId4 <= 12) ? RASHI_LORDS[rashiId4 - 1] : null;
        if (!lord4) return null;
        return { planet: lord4, ...getHouseShift(lord4) };
      })(),
      mercuryShift: getHouseShift('Mercury'),
      jupiterShift: getHouseShift('Jupiter'),
    },

    // ─── Section 18: LUCK & UNEXPECTED FORTUNES ──────────────────
    luck: {
      jupiterD1: getPlanet('Jupiter') ? {
        house: planets.Jupiter.house,
        rashi: planets.Jupiter.rashiName,
        isRetrograde: planets.Jupiter.isRetrograde,
      } : null,
      jupiterShift: getHouseShift('Jupiter'),
      ninthLordShift: (() => {
        const h9 = houses[8];
        if (!h9) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId9 = h9.rashiId || h9.rashi;
        const lord9 = (typeof rashiId9 === 'number' && rashiId9 >= 1 && rashiId9 <= 12) ? RASHI_LORDS[rashiId9 - 1] : null;
        if (!lord9) return null;
        return { planet: lord9, ...getHouseShift(lord9) };
      })(),
      // D60 (Shashtiamsha) — past life fortune chart
      d60Ascendant: vargas.d60?.ascendant?.rashiName || null,
    },

    // ─── Section 19: SPIRITUAL JOURNEY & PAST KARMA ──────────────
    spiritual: {
      ketuD1: getPlanet('Ketu') ? {
        house: planets.Ketu.house,
        rashi: planets.Ketu.rashiName,
        nakshatra: planets.Ketu.nakshatra,
      } : null,
      ketuShift: getHouseShift('Ketu'),
      // D20 (Vimsamsha) — spiritual/upasana chart
      d20Ascendant: vargas.d20?.ascendant?.rashiName || null,
      jupiterD20: getVargaPos('d20', 'Jupiter')?.rashiName || null,
      ketuD20: getVargaPos('d20', 'Ketu')?.rashiName || null,
      // 12th lord (moksha/liberation)
      twelfthLordShift: (() => {
        const h12 = houses[11];
        if (!h12) return null;
        const RASHI_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
        const rashiId12 = h12.rashiId || h12.rashi;
        const lord12 = (typeof rashiId12 === 'number' && rashiId12 >= 1 && rashiId12 <= 12) ? RASHI_LORDS[rashiId12 - 1] : null;
        if (!lord12) return null;
        return { planet: lord12, ...getHouseShift(lord12) };
      })(),
    },

    // ─── Section 20: SURPRISE PHYSICAL & PERSONALITY INSIGHTS ────
    surpriseInsights: {
      // D16 (Shodashamsha) — vehicles/comfort/luxury chart
      d16Ascendant: vargas.d16?.ascendant?.rashiName || null,
      venusD16: getVargaPos('d16', 'Venus')?.rashiName || null,
      // Vargottama check: planet in same sign in D1 and D9
      vargottamaPlanets: (() => {
        const result = [];
        if (!vargas.d9?.planets) return result;
        for (const [name, d1] of Object.entries(planets)) {
          const d9 = vargas.d9.planets[name];
          if (d1 && d9 && d1.rashi === d9.rashi) {
            result.push({ planet: name, rashi: d1.rashiName, isVargottama: true });
          }
        }
        return result;
      })(),
      specialYogas: specialYogas || [],
    },

    // ─── Section 21: PHYSICAL PROFILE ────────────────────────────
    physicalProfile: {
      ascendant: {
        rashi: asc.rashiName,
        lord: asc.rashiLord,
        nakshatra: asc.nakshatra,
        pada: asc.pada,
      },
      // D1 Ascendant lord shift in Chalit (affects physical appearance)
      lagnaLordShift: (() => {
        if (!asc.rashiLord) return null;
        return { planet: asc.rashiLord, ...getHouseShift(asc.rashiLord) };
      })(),
      // Mars (body structure/energy)
      mars: getPlanet('Mars') ? {
        house: planets.Mars.house,
        rashi: planets.Mars.rashiName,
      } : null,
      marsShift: getHouseShift('Mars'),
    },

    // ─── All 16 Vargas (for any section that needs deep analysis) ─
    allVargas: (() => {
      const summary = {};
      for (const [key, v] of Object.entries(vargas)) {
        summary[key] = {
          ascendant: v.ascendant?.rashiName || null,
        };
      }
      return summary;
    })(),

    // ─── Full Chalit chart (for cross-validation of all houses) ─
    chalitChart: chalit ? {
      ascendant: chalit.ascendant,
      planets: (chalit.planets || []).map(p => ({
        name: p.name,
        house: p.house,
        rashi: p.rashiName,
        d1House: getD1House(p.name),
        shifted: getD1House(p.name) !== p.house,
      })),
    } : null,
  };

  enrichments._computeTimeMs = Date.now() - startTime;
  return enrichments;
}



// ═══════════════════════════════════════════════════════════════════════════
//  MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core kundli
  getKundli,
  getChalitChart,
  getVargaCharts,
  getSpecificVarga,

  // Dasha
  getDashaSystem,
  crossValidateDasha,

  // Dosha & transits
  checkMangalDosha,
  checkSadeSati,

  // Muhurta helpers
  calculateTaraBalam,
  getChandrashtama,
  getDishaShoola,

  // Yogas
  getSpecialYogas,
  getTodaySpecialYogas,

  // Panchanga
  getCrossValidatedPanchanga,

  // Porondam
  matchKundli,

  // Composite reports
  generateJyotishReport,
  generateTodayJyotish,
  generatePersonalizedToday,
  generatePorondamJyotish,
  generateWeeklyContext,
  generateSectionEnrichments,

  // Meta
  isAvailable: () => !!jyotish,
};
