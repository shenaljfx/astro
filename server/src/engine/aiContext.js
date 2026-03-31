/**
 * AI Context Generator — Builds rich astrological context for AI prompts
 * 
 * Computes all Vedic astrology data using our engine, then formats it
 * as structured context that the AI model uses for interpretation.
 * The AI does NOT calculate — it ONLY interprets pre-computed data.
 * 
 * Used by:
 *   - Chat system prompt enrichment
 *   - Full reading endpoint
 *   - Weekly lagna generation
 */

const {
  getAllPlanetPositions,
  getLagna,
  buildHouseChart,
  buildNavamshaChart,
  getNakshatra,
  getRashi,
  toSidereal,
  getMoonLongitude,
  getSunLongitude,
  getPanchanga,
  calculateVimshottariDetailed,
  detectYogas,
  getPlanetStrengths,
  calculateDrishtis,
  calculateAshtakavarga,
} = require('./astrology');

// Optional engines — graceful degradation
let transitEngine, healthEngine, dashaEngine;
try { transitEngine = require('./transit'); } catch (e) { /* skip */ }
try { healthEngine = require('./health'); } catch (e) { /* skip */ }
try { dashaEngine = require('./dasha'); } catch (e) { /* skip */ }

/**
 * Planet name → Sinhala mapping
 */
function getPlanetSinhala(name) {
  var map = {
    'Sun': 'සූර්ය/රවි', 'Moon': 'චන්ද්‍ර', 'Mars': 'කුජ/අඟහරු',
    'Mercury': 'බුධ', 'Jupiter': 'ගුරු/බ්‍රහස්පති', 'Venus': 'සිකුරු/ශුක්‍ර',
    'Saturn': 'ශනි', 'Rahu': 'රාහු', 'Ketu': 'කේතු',
  };
  return map[name] || name;
}

/**
 * Generate comprehensive birth chart context for AI interpretation
 * 
 * @param {string|Date} dateOfBirth — Birth date/time (UTC)
 * @param {number} lat — Birth latitude
 * @param {number} lng — Birth longitude
 * @param {number} timezone — UTC offset in hours (default 5.5 for SLT)
 * @returns {object} — Structured context object
 */
function buildFullBirthContext(dateOfBirth, lat, lng, timezone = 5.5) {
  var bDate = new Date(dateOfBirth);
  var now = new Date();

  // ── 1. Core Calculations ──
  var houseChart = buildHouseChart(bDate, lat, lng);
  var navamshaChart = buildNavamshaChart(bDate, lat, lng);
  var lagna = getLagna(bDate, lat, lng);

  // ── 2. Moon Sign & Nakshatra (most important in Vedic) ──
  var moonLong = getMoonLongitude(bDate);
  var siderealMoon = toSidereal(moonLong, bDate);
  var moonNakshatra = getNakshatra(siderealMoon);
  var moonRashi = getRashi(siderealMoon);
  var nakshatraPada = Math.floor((siderealMoon % (360 / 27)) / (360 / 108)) + 1;

  // ── 3. Sun Sign ──
  var sunLong = getSunLongitude(bDate);
  var siderealSun = toSidereal(sunLong, bDate);
  var sunRashi = getRashi(siderealSun);
  var sunNakshatra = getNakshatra(siderealSun);

  // ── 4. Lagna details ──
  var lagnaRashi = lagna.rashi || getRashi(lagna.sidereal || lagna.longitude || 0);
  var lagnaNakshatra = getNakshatra(lagna.sidereal || lagna.longitude || 0);

  // ── 5. Dasha periods (Vimshottari) ──
  var dasaPeriods = null;
  try {
    dasaPeriods = calculateVimshottariDetailed(siderealMoon, bDate);
  } catch (e) {
    console.warn('[AIContext] Dasha calculation failed:', e.message);
  }

  // ── 6. Current Dasha/Bhukti ──
  var currentDasha = null;
  var currentBhukti = null;
  if (dasaPeriods && Array.isArray(dasaPeriods)) {
    for (var i = 0; i < dasaPeriods.length; i++) {
      var period = dasaPeriods[i];
      var pStart = new Date(period.start);
      var pEnd = new Date(period.endDate || period.end);
      if (now >= pStart && now <= pEnd) {
        currentDasha = period;
        // Find sub-period
        if (period.subPeriods) {
          for (var j = 0; j < period.subPeriods.length; j++) {
            var sub = period.subPeriods[j];
            var sStart = new Date(sub.start);
            var sEnd = new Date(sub.endDate || sub.end);
            if (now >= sStart && now <= sEnd) {
              currentBhukti = sub;
              break;
            }
          }
        }
        break;
      }
    }
  }

  // ── 7. Yogas (special combinations) ──
  var yogas = [];
  try {
    yogas = detectYogas(bDate, lat, lng);
  } catch (e) {
    console.warn('[AIContext] Yoga detection failed:', e.message);
  }

  // ── 8. Planet strengths ──
  var planetStrengths = {};
  try {
    planetStrengths = getPlanetStrengths(bDate, lat, lng);
  } catch (e) {
    console.warn('[AIContext] Planet strengths failed:', e.message);
  }

  // ── 9. Planetary aspects ──
  var drishtis = {};
  try {
    drishtis = calculateDrishtis(houseChart.houses);
  } catch (e) {
    console.warn('[AIContext] Drishti calculation failed:', e.message);
  }

  // ── 10. Planet details from house chart ──
  var planetDetails = [];
  if (houseChart.houses) {
    for (var h = 0; h < houseChart.houses.length; h++) {
      var house = houseChart.houses[h];
      if (house.planets && house.planets.length > 0) {
        for (var pi = 0; pi < house.planets.length; pi++) {
          var p = house.planets[pi];
          var pName = p.name || p;
          var pStr = planetStrengths[pName.toLowerCase()] || planetStrengths[pName] || {};

          planetDetails.push({
            name: pName,
            sinhala: getPlanetSinhala(pName),
            degree: p.degree ? p.degree.toFixed(2) : '?',
            rashi: house.rashiEnglish || house.rashi || '',
            rashiSinhala: house.rashi || '',
            rashiLord: house.rashiLord || '',
            house: h + 1,
            retrograde: p.retrograde || p.isRetrograde || false,
            dignity: pStr.dignityLevel || pStr.dignity || null,
            strength: pStr.score || pStr.percentage || null,
            strengthLabel: pStr.strength || null,
            isCombust: pStr.isCombust || false,
            isVargottama: pStr.isVargottama || false,
          });
        }
      }
    }
  }

  // ── 11. House analysis ──
  var houseNames = [
    { en: '1st (Lagna)', si: 'ලග්නය', topic: 'Self, personality, appearance' },
    { en: '2nd (Dhana)', si: 'ධන භාවය', topic: 'Wealth, family, speech' },
    { en: '3rd (Sahaja)', si: 'සහජ භාවය', topic: 'Siblings, courage, short journeys' },
    { en: '4th (Sukha)', si: 'සුඛ භාවය', topic: 'Mother, home, vehicles, education' },
    { en: '5th (Putra)', si: 'පුත්‍ර භාවය', topic: 'Children, intelligence, romance' },
    { en: '6th (Shatru)', si: 'ශත්‍රු භාවය', topic: 'Enemies, diseases, debts' },
    { en: '7th (Kalatra)', si: 'කලත්‍ර භාවය', topic: 'Marriage, partnerships, business' },
    { en: '8th (Ayu)', si: 'ආයු භාවය', topic: 'Longevity, secrets, inheritance' },
    { en: '9th (Dharma)', si: 'ධර්ම භාවය', topic: 'Father, luck, religion, higher learning' },
    { en: '10th (Karma)', si: 'කර්ම භාවය', topic: 'Career, status, authority' },
    { en: '11th (Labha)', si: 'ලාභ භාවය', topic: 'Income, gains, elder siblings' },
    { en: '12th (Vyaya)', si: 'ව්‍යය භාවය', topic: 'Loss, moksha, foreign travel' },
  ];

  var houseAnalysis = [];
  if (houseChart.houses) {
    for (var hi = 0; hi < houseChart.houses.length && hi < 12; hi++) {
      var houseData = houseChart.houses[hi];
      var planetNames = (houseData.planets || []).map(function(pp) { return pp.name || pp; });
      houseAnalysis.push({
        number: hi + 1,
        name: houseNames[hi]?.en,
        sinhala: houseNames[hi]?.si,
        topic: houseNames[hi]?.topic,
        sign: houseData.rashiEnglish || houseData.rashi || '',
        lord: houseData.rashiLord || '',
        planets: planetNames,
      });
    }
  }

  // ── 12. Navamsha positions ──
  var navamshaDetails = [];
  if (navamshaChart && navamshaChart.houses) {
    for (var ni = 0; ni < navamshaChart.houses.length; ni++) {
      var nHouse = navamshaChart.houses[ni];
      if (nHouse.planets && nHouse.planets.length > 0) {
        for (var npi = 0; npi < nHouse.planets.length; npi++) {
          var np = nHouse.planets[npi];
          navamshaDetails.push({
            name: np.name || np,
            rashi: nHouse.rashiEnglish || nHouse.rashi || '',
            house: ni + 1,
          });
        }
      }
    }
  }

  // ── 13. Current transit snapshot ──
  var transitSnapshot = null;
  if (transitEngine) {
    try {
      var transits = transitEngine.getCurrentTransits(now, bDate, lat, lng);
      if (transits && transits.planets) {
        transitSnapshot = {
          overallQuality: transits.overallQuality || 'N/A',
          planets: Object.keys(transits.planets).map(function(key) {
            var tp = transits.planets[key];
            return {
              planet: tp.planet,
              transitRashi: tp.transitRashi,
              houseFromLagna: tp.houseFromLagna,
              isRetrograde: tp.isRetrograde || false,
              effect: tp.effect ? { quality: tp.effect.quality, effect: (tp.effect.effect || '').substring(0, 100) } : null,
            };
          }),
          summary: transits.summary ? transits.summary.substring(0, 200) : null,
        };
      }
    } catch (e) { /* skip */ }
  }

  // ── 14. Age calculation ──
  var ageYears = Math.floor((now - bDate) / (365.25 * 24 * 60 * 60 * 1000));

  // ── 15. Panchanga at birth ──
  var panchanga = null;
  try {
    panchanga = getPanchanga(bDate, lat, lng);
  } catch (e) { /* skip */ }

  return {
    birthInfo: {
      dateTime: bDate.toISOString(),
      latitude: lat,
      longitude: lng,
      timezone: timezone,
      age: ageYears,
    },
    lagna: {
      rashi: lagnaRashi?.english || lagnaRashi?.name || '',
      rashiSinhala: lagnaRashi?.sinhala || '',
      lord: lagnaRashi?.lord || '',
      nakshatra: lagnaNakshatra?.name || '',
      nakshatraSinhala: lagnaNakshatra?.sinhala || '',
    },
    moonSign: {
      longitude: siderealMoon.toFixed(2),
      rashi: moonRashi?.english || moonRashi?.name || '',
      rashiSinhala: moonRashi?.sinhala || '',
      lord: moonRashi?.lord || '',
      nakshatra: moonNakshatra?.name || '',
      nakshatraSinhala: moonNakshatra?.sinhala || '',
      pada: nakshatraPada,
    },
    sunSign: {
      rashi: sunRashi?.english || sunRashi?.name || '',
      rashiSinhala: sunRashi?.sinhala || '',
      nakshatra: sunNakshatra?.name || '',
    },
    panchanga: panchanga ? {
      tithi: panchanga.tithi?.name || '',
      yoga: panchanga.yoga?.name || '',
      karana: panchanga.karana?.name || '',
      vaara: panchanga.vaara?.name || '',
    } : null,
    planets: planetDetails,
    houses: houseAnalysis,
    navamsha: navamshaDetails,
    currentDasha: currentDasha ? {
      planet: currentDasha.lord || currentDasha.planet,
      sinhala: getPlanetSinhala(currentDasha.lord || currentDasha.planet || ''),
      start: currentDasha.start,
      end: currentDasha.endDate || currentDasha.end,
    } : null,
    currentBhukti: currentBhukti ? {
      planet: currentBhukti.lord || currentBhukti.planet,
      sinhala: getPlanetSinhala(currentBhukti.lord || currentBhukti.planet || ''),
      start: currentBhukti.start,
      end: currentBhukti.endDate || currentBhukti.end,
    } : null,
    yogas: (yogas || []).slice(0, 15),
    transitSnapshot: transitSnapshot,
  };
}

/**
 * Format context into a structured prompt string for AI
 * 
 * @param {object} ctx — Output from buildFullBirthContext
 * @param {string} language — 'en' or 'si'
 * @returns {string} — Formatted text block for AI system prompt
 */
function formatContextForAI(ctx, language = 'si') {
  var lines = [];

  lines.push('═══════════════════════════════════════');
  lines.push('COMPUTED BIRTH CHART DATA (USE ONLY THIS — DO NOT RECALCULATE)');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  // Birth info
  lines.push('Birth Date/Time: ' + ctx.birthInfo.dateTime);
  lines.push('Location: ' + ctx.birthInfo.latitude + '°N, ' + ctx.birthInfo.longitude + '°E');
  lines.push('Current Age: ' + ctx.birthInfo.age + ' years');
  lines.push('');

  // Lagna
  lines.push('LAGNA (ලග්නය): ' + ctx.lagna.rashiSinhala + ' (' + ctx.lagna.rashi + ') — Lord: ' + ctx.lagna.lord);
  lines.push('  Nakshatra: ' + ctx.lagna.nakshatraSinhala + ' (' + ctx.lagna.nakshatra + ')');
  lines.push('');

  // Moon
  lines.push('MOON SIGN (චන්ද්‍ර රාශිය): ' + ctx.moonSign.rashiSinhala + ' (' + ctx.moonSign.rashi + ') — Lord: ' + ctx.moonSign.lord);
  lines.push('  Nakshatra: ' + ctx.moonSign.nakshatraSinhala + ' (' + ctx.moonSign.nakshatra + '), Pada ' + ctx.moonSign.pada);
  lines.push('');

  // Sun
  lines.push('SUN SIGN (සූර්ය රාශිය): ' + ctx.sunSign.rashiSinhala + ' (' + ctx.sunSign.rashi + ')');
  lines.push('');

  // Panchanga
  if (ctx.panchanga) {
    lines.push('BIRTH PANCHANGA: Tithi: ' + ctx.panchanga.tithi + ' | Yoga: ' + ctx.panchanga.yoga + ' | Karana: ' + ctx.panchanga.karana + ' | Vaara: ' + ctx.panchanga.vaara);
    lines.push('');
  }

  // Planets
  lines.push('PLANETARY POSITIONS (ග්‍රහ තත්ත්වය):');
  lines.push('─────────────────────────────────────');
  for (var i = 0; i < ctx.planets.length; i++) {
    var p = ctx.planets[i];
    var retro = p.retrograde ? ' [RETROGRADE/වක්‍ර]' : '';
    var dignity = p.dignity ? ' [' + p.dignity + ']' : '';
    var combust = p.isCombust ? ' [COMBUST]' : '';
    var vargottama = p.isVargottama ? ' [VARGOTTAMA]' : '';
    lines.push('  ' + p.sinhala + ' (' + p.name + '): ' + p.rashi + ' — ' + p.degree + '°' + retro + dignity + combust + vargottama);
    lines.push('    House: ' + p.house + ' | Lord: ' + p.rashiLord + ' | Strength: ' + (p.strength || '?') + '/100 (' + (p.strengthLabel || '') + ')');
  }
  lines.push('');

  // Houses
  if (ctx.houses.length > 0) {
    lines.push('HOUSE CHART (භාව සටහන):');
    lines.push('─────────────────────────────────────');
    for (var h = 0; h < ctx.houses.length; h++) {
      var house = ctx.houses[h];
      var planetStr = house.planets.length > 0 ? house.planets.join(', ') : 'Empty';
      lines.push('  ' + house.sinhala + ' (' + house.name + '): ' + house.sign + ' — Lord: ' + house.lord + ' — Planets: ' + planetStr);
    }
    lines.push('');
  }

  // Current Dasha
  if (ctx.currentDasha) {
    lines.push('CURRENT DASHA (වර්තමාන දශාව):');
    lines.push('  Maha Dasha: ' + ctx.currentDasha.sinhala + ' (' + ctx.currentDasha.planet + ') — ' + ctx.currentDasha.start + ' to ' + ctx.currentDasha.end);
    if (ctx.currentBhukti) {
      lines.push('  Antar Dasha: ' + ctx.currentBhukti.sinhala + ' (' + ctx.currentBhukti.planet + ') — ' + ctx.currentBhukti.start + ' to ' + ctx.currentBhukti.end);
    }
    lines.push('');
  }

  // Yogas
  if (ctx.yogas.length > 0) {
    lines.push('YOGAS (යෝග):');
    lines.push('─────────────────────────────────────');
    for (var y = 0; y < ctx.yogas.length; y++) {
      var yoga = ctx.yogas[y];
      lines.push('  ' + (yoga.name || yoga.type || 'Yoga') + ' (' + (yoga.strength || 'moderate') + '): ' + (yoga.description || ''));
    }
    lines.push('');
  }

  // Navamsha
  if (ctx.navamsha.length > 0) {
    lines.push('NAVAMSHA (නවාංශ) POSITIONS:');
    for (var n = 0; n < ctx.navamsha.length; n++) {
      var nv = ctx.navamsha[n];
      lines.push('  ' + nv.name + ': ' + nv.rashi + ' (House ' + nv.house + ')');
    }
    lines.push('');
  }

  // Current Transits
  if (ctx.transitSnapshot) {
    lines.push('CURRENT TRANSIT SNAPSHOT:');
    lines.push('  Overall Quality: ' + ctx.transitSnapshot.overallQuality);
    if (ctx.transitSnapshot.planets) {
      for (var ti = 0; ti < ctx.transitSnapshot.planets.length; ti++) {
        var tp = ctx.transitSnapshot.planets[ti];
        var tRetro = tp.isRetrograde ? ' [R]' : '';
        var tEffect = tp.effect ? ' — ' + tp.effect.quality + ': ' + tp.effect.effect : '';
        lines.push('  ' + tp.planet + ': ' + tp.transitRashi + ' (House ' + tp.houseFromLagna + ')' + tRetro + tEffect);
      }
    }
    if (ctx.transitSnapshot.summary) {
      lines.push('  Summary: ' + ctx.transitSnapshot.summary);
    }
  }

  return lines.join('\n');
}

module.exports = {
  buildFullBirthContext,
  formatContextForAI,
  getPlanetSinhala,
};
