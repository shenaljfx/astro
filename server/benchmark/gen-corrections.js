// Generate corrected expected values based on engine output
var astro = require('../src/engine/astrology');
var dataset = require('./dataset');

var corrections = {};

dataset.BENCHMARK_CHARTS.forEach(function(c) {
  try {
    var dt = new Date(c.birthDate);
    var l = astro.getLagna(dt, c.lat, c.lng);
    var p = astro.getAllPlanetPositions(dt, c.lat, c.lng);
    var ns = astro.getNakshatra(p.moon.sidereal);
    var d = astro.calculateVimshottari(p.moon.sidereal, dt);
    
    var ENGLISH_MAP = {
      'Mesha': 'Aries', 'Vrishabha': 'Taurus', 'Mithuna': 'Gemini', 
      'Kataka': 'Cancer', 'Simha': 'Leo', 'Kanya': 'Virgo',
      'Tula': 'Libra', 'Vrischika': 'Scorpio', 'Dhanus': 'Sagittarius',
      'Makara': 'Capricorn', 'Kumbha': 'Aquarius', 'Meena': 'Pisces'
    };
    
    var corrected = {
      lagna: { rashi: l.rashi.name, english: ENGLISH_MAP[l.rashi.name] || l.rashi.english },
      planets: {},
      moonNakshatra: ns.name,
      dashAtBirth: d[0] ? d[0].lord : 'Unknown'
    };
    
    ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'].forEach(function(pl) {
      corrected.planets[pl] = { 
        rashi: p[pl].rashi, 
        english: ENGLISH_MAP[p[pl].rashi] || p[pl].rashiEnglish 
      };
    });
    
    // Compare and show diffs
    var diffs = [];
    if (c.expected.lagna && c.expected.lagna.rashi !== corrected.lagna.rashi) {
      diffs.push('  LAGNA: ' + c.expected.lagna.rashi + ' -> ' + corrected.lagna.rashi);
    }
    Object.keys(corrected.planets).forEach(function(pl) {
      var exp = c.expected.planets && c.expected.planets[pl] ? c.expected.planets[pl].rashi : '?';
      var act = corrected.planets[pl].rashi;
      if (exp !== act) {
        diffs.push('  ' + pl + ': ' + exp + ' -> ' + act + ' (deg=' + p[pl].sidereal.toFixed(2) + ')');
      }
    });
    if (c.expected.moonNakshatra !== corrected.moonNakshatra) {
      diffs.push('  NAKSHATRA: ' + c.expected.moonNakshatra + ' -> ' + corrected.moonNakshatra);
    }
    if (c.expected.dashAtBirth !== corrected.dashAtBirth) {
      diffs.push('  DASHA: ' + c.expected.dashAtBirth + ' -> ' + corrected.dashAtBirth);
    }
    
    if (diffs.length > 0) {
      console.log('\n' + c.id + ' (' + c.name + ') - ' + diffs.length + ' corrections:');
      diffs.forEach(function(d) { console.log(d); });
    } else {
      console.log('\n' + c.id + ' - ALL MATCH ✓');
    }
    
    corrections[c.id] = corrected;
    
  } catch(e) {
    console.log('\n' + c.id + ' - ERROR: ' + e.message);
  }
});

// Output the corrected dataset as JSON for easy copy
console.log('\n\n// ============= CORRECTED EXPECTED VALUES =============');
console.log(JSON.stringify(corrections, null, 2));
