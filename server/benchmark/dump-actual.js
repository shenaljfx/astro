// Dump actual engine output for all benchmark charts
var astro = require('../src/engine/astrology');
var dataset = require('./dataset');

dataset.BENCHMARK_CHARTS.forEach(function(c) {
  try {
    var dt = new Date(c.birthDate);
    var l = astro.getLagna(dt, c.lat, c.lng);
    var p = astro.getAllPlanetPositions(dt, c.lat, c.lng);
    var ms = p.moon;
    var ns = astro.getNakshatra(ms.sidereal);
    var vm = astro.calculateVimshottari(ms.sidereal, dt);
    var bd = Array.isArray(vm) ? vm[0] : (vm && vm.periods ? vm.periods[0] : null);
    
    console.log('\n=== ' + c.id + ' (' + c.name + ') ===');
    console.log('  Lagna:    ' + l.rashi.name + ' (exp: ' + (c.expected.lagna || '?') + ')' + (l.rashi.name === c.expected.lagna ? ' ✓' : ' ✗'));
    
    var planets = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'];
    planets.forEach(function(pl) {
      var exp = c.expected.planets ? c.expected.planets[pl] : '?';
      var act = p[pl] ? p[pl].rashi : '?';
      var deg = p[pl] ? p[pl].sidereal.toFixed(2) : '?';
      console.log('  ' + pl.padEnd(10) + ': ' + act.padEnd(20) + ' (exp: ' + (exp || '?').toString().padEnd(20) + ') deg=' + deg + (act === exp ? ' ✓' : ' ✗'));
    });
    
    console.log('  Nakshatra: ' + ns.name + ' (exp: ' + (c.expected.moonNakshatra || '?') + ')' + (ns.name === c.expected.moonNakshatra ? ' ✓' : ' ✗'));
    console.log('  Dasha:    ' + (bd ? bd.planet : '?') + ' (exp: ' + (c.expected.dashaAtBirth || '?') + ')' + ((bd && bd.planet === c.expected.dashaAtBirth) ? ' ✓' : ' ✗'));
    
  } catch(e) {
    console.log('\n=== ' + c.id + ' === ERROR: ' + e.message);
  }
});
