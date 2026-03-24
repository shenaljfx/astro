// Full chart test for person born 1998-10-09 09:16 AM Sri Lanka (UTC+5:30)
// UTC = 09:16 - 5:30 = 03:46 UTC
var astro = require('../src/engine/astrology');

var birthDate = '1998-10-09T03:46:00Z';
var lat = 6.9271;  // Colombo
var lng = 79.8612;
var dt = new Date(birthDate);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  FULL VEDIC CHART — Born 1998-10-09 09:16 AM, Colombo SL   ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// 1. Basic chart data
var lagna = astro.getLagna(dt, lat, lng);
var planets = astro.getAllPlanetPositions(dt, lat, lng);
var moonNak = astro.getNakshatra(planets.moon.sidereal);
var sunNak = astro.getNakshatra(planets.sun.sidereal);
var dashas = astro.calculateVimshottari(planets.moon.sidereal, dt);

console.log('── LAGNA & LUMINARIES ──');
console.log('  Lagna:          ' + lagna.rashi.name + ' (' + lagna.rashi.english + ') at ' + lagna.sidereal.toFixed(2) + '°');
console.log('  Moon Sign:      ' + planets.moon.rashi + ' (' + planets.moon.rashiEnglish + ')');
console.log('  Sun Sign:       ' + planets.sun.rashi + ' (' + planets.sun.rashiEnglish + ')');
console.log('  Moon Nakshatra: ' + moonNak.name + ' Pada ' + moonNak.pada);
console.log('  Sun Nakshatra:  ' + sunNak.name + ' Pada ' + sunNak.pada);
console.log('  Birth Dasha:    ' + dashas[0].lord + ' (balance ' + dashas[0].years.toFixed(2) + ' years)');

// 2. All planets
console.log('\n── PLANET POSITIONS ──');
console.log('  Planet     Rashi         English        Degree    Retro  Speed');
console.log('  ─────────  ────────────  ─────────────  ────────  ─────  ─────');
['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'].forEach(function(k) {
  var p = planets[k];
  var retro = p.isRetrograde ? '  (R)' : '     ';
  var speed = p.speed ? p.speed.toFixed(2) : '-';
  console.log('  ' + p.name.padEnd(11) + p.rashi.padEnd(14) + p.rashiEnglish.padEnd(15) + 
    p.sidereal.toFixed(2).padStart(7) + '°' + retro + '  ' + speed);
});

// 3. House Chart
console.log('\n── HOUSE CHART (RASI) ──');
var houses = astro.buildHouseChart(dt, lat, lng);
houses.houses.forEach(function(h) {
  var pls = h.planets.map(function(p) { return p.name + (p.isRetrograde ? '(R)' : ''); }).join(', ');
  console.log('  House ' + String(h.houseNumber).padStart(2) + ': ' + 
    (h.rashiName || 'Unknown').padEnd(12) + (pls ? ' → ' + pls : ''));
});

// 4. Vimshottari Dasha
console.log('\n── VIMSHOTTARI DASHA PERIODS ──');
dashas.forEach(function(d) {
  var current = new Date() >= new Date(d.start) && new Date() <= new Date(d.endDate) ? ' ◄ CURRENT' : '';
  console.log('  ' + d.lord.padEnd(10) + d.start + ' to ' + d.endDate + 
    ' (' + d.years.toFixed(1) + 'y)' + current);
});

// 5. Yogas
console.log('\n── YOGA ANALYSIS ──');
var yogas = astro.detectYogas(dt, lat, lng);
if (yogas.length === 0) {
  console.log('  No classical yogas detected by basic engine');
} else {
  yogas.forEach(function(y) {
    console.log('  ✦ ' + (y.name || y.type) + (y.description ? ': ' + y.description : ''));
  });
}

// 6. Ashtakavarga
console.log('\n── SARVASHTAKAVARGA (SAV) ──');
var av = astro.calculateAshtakavarga(dt, lat, lng);
var sav = av.sarvashtakavarga || {};
var savKeys = Object.keys(sav);
savKeys.forEach(function(k) {
  var bar = '';
  for (var i = 0; i < Math.round(sav[k]); i++) bar += '█';
  console.log('  ' + k.padEnd(12) + String(sav[k]).padStart(3) + '  ' + bar);
});
var total = savKeys.reduce(function(s, k) { return s + sav[k]; }, 0);
console.log('  TOTAL: ' + total + '/337 (ideal)');

// 7. Planet Strengths
console.log('\n── PLANET STRENGTHS (12-FACTOR) ──');
var strengths = astro.getPlanetStrengths(dt, lat, lng);
Object.keys(strengths).forEach(function(k) {
  var s = strengths[k];
  if (s && s.score !== undefined) {
    var bar = '';
    for (var i = 0; i < Math.round(s.score / 5); i++) bar += '█';
    console.log('  ' + k.padEnd(10) + String(s.score.toFixed(1)).padStart(6) + '/100  ' + bar + 
      (s.classification ? '  [' + s.classification + ']' : ''));
  }
});

// 8. Navamsha
console.log('\n── NAVAMSHA (D9) ──');
var nav = astro.buildNavamshaChart(dt, lat, lng);
var navData = nav.navamsha || nav.houses || nav;
if (Array.isArray(navData)) {
  navData.forEach(function(h) {
    var pls = (h.planets || []).map(function(p) { return p.name; }).join(', ');
    console.log('  D9 House ' + String(h.houseNumber || h.house).padStart(2) + ': ' + 
      (h.rashiName || h.rashi || '').padEnd(12) + (pls ? ' → ' + pls : ''));
  });
}

// 9. Panchanga
console.log('\n── PANCHANGA ──');
var panch = astro.getPanchanga(dt, lat, lng);
console.log('  Tithi:  ' + (panch.tithi ? panch.tithi.name : 'N/A'));
console.log('  Yoga:   ' + (panch.yoga ? panch.yoga.name : 'N/A'));
console.log('  Karana: ' + (panch.karana ? panch.karana.name : 'N/A'));
console.log('  Vaara:  ' + (panch.vaara ? panch.vaara.name : 'N/A'));

// 10. Full Report smoke test
console.log('\n── FULL REPORT GENERATION ──');
var report = astro.generateFullReport(birthDate, lat, lng);
var sectionKeys = Object.keys(report.sections);
console.log('  Sections generated: ' + sectionKeys.length);
sectionKeys.forEach(function(k) {
  var sec = report.sections[k];
  var dataKeys = sec ? Object.keys(sec).length : 0;
  console.log('  ✓ ' + k.padEnd(20) + ' (' + dataKeys + ' data points)');
});

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  Chart generation COMPLETE — all systems nominal');
console.log('══════════════════════════════════════════════════════════════');
