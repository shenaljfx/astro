#!/usr/bin/env node
/**
 * VEDIC ASTROLOGY ENGINE BENCHMARK RUNNER v2
 * ===========================================
 * Usage:  cd server && node benchmark/run.js
 *         cd server && node benchmark/run.js --verbose
 *         cd server && node benchmark/run.js --chart obama
 *         cd server && node benchmark/run.js --json
 */

const { BENCHMARK_CHARTS, PANCHANGA_BENCHMARKS, AYANAMSHA_BENCHMARKS } = require('./dataset');
const astro = require('../src/engine/astrology');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose') || args.includes('-v');
const JSON_OUT = args.includes('--json');
const SINGLE = args.find(a => a.startsWith('--chart='))
  ? args.find(a => a.startsWith('--chart=')).split('=')[1]
  : (args.indexOf('--chart') !== -1 ? args[args.indexOf('--chart') + 1] : null);

// Rashi/Nakshatra name normalization
const ALIASES = {
  'Dhanu': 'Dhanus',
  'Dhanishta': 'Dhanishtha',
  'Uttara Ashadha': 'Uttarashadha',
  'Purva Ashadha': 'Purvashadha',
};

function nameMatch(expected, actual) {
  if (!expected || !actual) return false;
  var e = ALIASES[expected] || expected;
  var a = ALIASES[actual] || actual;
  return e === a || expected === actual;
}

// ANSI colors
function green(s) { return '\x1b[32m' + s + '\x1b[0m'; }
function red(s) { return '\x1b[31m' + s + '\x1b[0m'; }
function yellow(s) { return '\x1b[33m' + s + '\x1b[0m'; }
function cyan(s) { return '\x1b[36m' + s + '\x1b[0m'; }
function bold(s) { return '\x1b[1m' + s + '\x1b[0m'; }
function dim(s) { return '\x1b[2m' + s + '\x1b[0m'; }

var results = { charts: [], panchanga: [], ayanamsha: [], summary: {} };

function runChartBenchmark(chart) {
  var date = new Date(chart.birthDate);
  var rpt = { id: chart.id, name: chart.name, tests: [], pass: 0, fail: 0 };

  try {
    var planets = astro.getAllPlanetPositions(date, chart.lat, chart.lng);
    var lagna = astro.getLagna(date, chart.lat, chart.lng);

    // Lagna
    if (chart.expected.lagna) {
      var p = nameMatch(chart.expected.lagna.rashi, lagna.rashi.name);
      rpt.tests.push({ cat: 'Lagna', exp: chart.expected.lagna.rashi, act: lagna.rashi.name, deg: lagna.sidereal ? lagna.sidereal.toFixed(2) : '?', pass: p });
      p ? rpt.pass++ : rpt.fail++;
    }

    // Planet Signs
    if (chart.expected.planets) {
      var planetKeys = Object.keys(chart.expected.planets);
      for (var ki = 0; ki < planetKeys.length; ki++) {
        var key = planetKeys[ki];
        var exp = chart.expected.planets[key];
        var act = planets[key];
        if (!act) { rpt.tests.push({ cat: 'P:' + key, exp: exp.rashi, act: 'MISSING', pass: false }); rpt.fail++; continue; }
        var pm = nameMatch(exp.rashi, act.rashi);
        var test = {
          cat: 'P:' + key, 
          exp: exp.rashi + ' (' + exp.english + ')', 
          act: act.rashi + ' (' + act.rashiEnglish + ')',
          deg: act.sidereal ? act.sidereal.toFixed(2) : '?',
          pass: pm
        };
        if (exp.siderealApprox !== undefined) {
          var tol = chart.expected.toleranceDeg || 1.0;
          var diff = Math.abs(act.sidereal - exp.siderealApprox);
          var dp = diff < tol || (360 - diff) < tol;
          test.sidExp = exp.siderealApprox;
          test.sidDiff = diff.toFixed(3);
          if (!dp) test.pass = false;
        }
        rpt.tests.push(test);
        test.pass ? rpt.pass++ : rpt.fail++;
      }
    }

    // Moon Nakshatra
    if (chart.expected.moonNakshatra) {
      var nk = astro.getNakshatra(planets.moon.sidereal);
      var np = nameMatch(chart.expected.moonNakshatra, nk.name);
      rpt.tests.push({ cat: 'Nakshatra', exp: chart.expected.moonNakshatra, act: nk.name, pada: nk.pada, pass: np });
      np ? rpt.pass++ : rpt.fail++;
    }

    // Dasha at Birth
    if (chart.expected.dashAtBirth) {
      var dashas = astro.calculateVimshottari(planets.moon.sidereal, date);
      var first = dashas[0] ? dashas[0].lord : 'UNKNOWN';
      var dp2 = first === chart.expected.dashAtBirth;
      rpt.tests.push({ cat: 'Dasha', exp: chart.expected.dashAtBirth, act: first, pass: dp2 });
      dp2 ? rpt.pass++ : rpt.fail++;
    }

    // House Chart
    try {
      var hc = astro.buildHouseChart(date, chart.lat, chart.lng);
      var houses = hc.houses || hc;
      var arr = Array.isArray(houses) ? houses : [];
      var pCount = arr.reduce(function(s, h) { return s + (h.planets ? h.planets.length : 0); }, 0);
      var hp = arr.length === 12 && pCount === 9;
      rpt.tests.push({ cat: 'Houses', exp: '12h/9p', act: arr.length + 'h/' + pCount + 'p', pass: hp });
      hp ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'Houses', exp: '12h/9p', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

    // Navamsha
    try {
      var nav = astro.buildNavamshaChart(date, chart.lat, chart.lng);
      var navArr = nav ? (nav.navamsha || nav.houses || nav) : null;
      var navP = false;
      if (Array.isArray(navArr)) navP = navArr.length === 12;
      else if (navArr && typeof navArr === 'object') navP = Object.keys(navArr).length >= 9;
      rpt.tests.push({ cat: 'Navamsha', exp: '12 divs', act: Array.isArray(navArr) ? navArr.length + ' divs' : typeof navArr, pass: navP });
      navP ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'Navamsha', exp: '12 divs', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

    // Ashtakavarga — signature: (date, lat, lng)
    try {
      var av = astro.calculateAshtakavarga(date, chart.lat, chart.lng);
      var sav = av.sarvashtakavarga || {};
      var avKeys = Object.keys(sav);
      var total = avKeys.reduce(function(s, k) { return s + (sav[k] || 0); }, 0);
      var avP = avKeys.length >= 12 && total >= 200 && total <= 450;
      rpt.tests.push({ cat: 'AV', exp: '12signs/~337', act: avKeys.length + 'signs/' + total, pass: avP });
      avP ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'AV', exp: 'computed', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

    // Yogas — signature: (date, lat, lng)
    try {
      var yogas = astro.detectYogas(date, chart.lat, chart.lng);
      var yP = Array.isArray(yogas); // 0 yogas is valid — not every chart has classical yogas
      rpt.tests.push({ cat: 'Yogas', exp: 'array', act: '' + (Array.isArray(yogas) ? yogas.length + ' yogas' : 'NOT_ARRAY'), pass: yP });
      yP ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'Yogas', exp: '>=1', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

    // Planet Strengths — signature: (date, lat, lng)
    try {
      var str = astro.getPlanetStrengths(date, chart.lat, chart.lng);
      var sKeys = Object.keys(str);
      var sP = sKeys.length >= 7;
      rpt.tests.push({ cat: 'Strengths', exp: '>=7', act: '' + sKeys.length, pass: sP });
      sP ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'Strengths', exp: 'computed', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

    // Full Report smoke test
    try {
      var fr = astro.generateFullReport(chart.birthDate, chart.lat, chart.lng);
      var frP = fr && fr.birthData && fr.sections && Object.keys(fr.sections).length >= 10;
      rpt.tests.push({ cat: 'FullReport', exp: 'complete', act: frP ? 'OK' : 'INCOMPLETE', pass: !!frP });
      frP ? rpt.pass++ : rpt.fail++;
    } catch (e) { rpt.tests.push({ cat: 'FullReport', exp: 'generated', act: 'ERR:' + e.message.slice(0, 50), pass: false }); rpt.fail++; }

  } catch (e) {
    rpt.tests.push({ cat: 'FATAL', exp: 'no crash', act: 'CRASH: ' + e.message, pass: false });
    rpt.fail++;
  }
  return rpt;
}

function runPanchangaBenchmark(bench) {
  var date = new Date(bench.date);
  var r = { id: bench.id, name: bench.name, tests: [], pass: 0, fail: 0 };
  try {
    var p = astro.getPanchanga(date, bench.lat, bench.lng);
    if (bench.expected.tithi) {
      var ok = (p.tithi && p.tithi.name || '').indexOf(bench.expected.tithi) >= 0;
      r.tests.push({ cat: 'Tithi', exp: bench.expected.tithi, act: p.tithi ? p.tithi.name : '?', pass: ok });
      ok ? r.pass++ : r.fail++;
    }
    if (bench.expected.vaara) {
      var vName = p.vaara ? (p.vaara.english || p.vaara.name || '') : '';
      var ok2 = vName === bench.expected.vaara;
      r.tests.push({ cat: 'Vaara', exp: bench.expected.vaara, act: vName, pass: ok2 });
      ok2 ? r.pass++ : r.fail++;
    }
    if (bench.expected.sunSign) {
      var sn = p.sunSign ? p.sunSign.name : '';
      var ok3 = nameMatch(bench.expected.sunSign, sn);
      r.tests.push({ cat: 'SunSign', exp: bench.expected.sunSign, act: sn, pass: ok3 });
      ok3 ? r.pass++ : r.fail++;
    }
  } catch (e) { r.tests.push({ cat: 'FATAL', exp: 'ok', act: e.message, pass: false }); r.fail++; }
  return r;
}

function runAyanamshaBenchmark(bench) {
  var date = new Date(bench.date);
  var r = { id: bench.source, tests: [], pass: 0, fail: 0 };
  try {
    var val = astro.getAyanamsha(date);
    var diff = Math.abs(val - bench.expected);
    var ok = diff <= bench.tolerance;
    r.tests.push({ cat: 'Ayanamsha', exp: bench.expected + ' +/-' + bench.tolerance, act: val.toFixed(4), diff: diff.toFixed(4), pass: ok });
    ok ? r.pass++ : r.fail++;
  } catch (e) { r.tests.push({ cat: 'Ayanamsha', exp: '' + bench.expected, act: e.message, pass: false }); r.fail++; }
  return r;
}

function main() {
  console.log(bold('\n' + '='.repeat(60)));
  console.log(bold('  GRAHACHARA - VEDIC ASTROLOGY ENGINE BENCHMARK'));
  console.log(bold('='.repeat(60) + '\n'));

  var charts = SINGLE ? BENCHMARK_CHARTS.filter(function(c) { return c.id === SINGLE; }) : BENCHMARK_CHARTS;
  if (SINGLE && charts.length === 0) { console.error(red('Chart "' + SINGLE + '" not found.')); process.exit(1); }

  var totP = 0, totF = 0;
  var lagP = 0, lagT = 0, plP = 0, plT = 0, nkP = 0, nkT = 0, daP = 0, daT = 0, fnP = 0, fnT = 0;

  console.log(bold(cyan('CHART BENCHMARKS (' + charts.length + ' charts)\n')));

  for (var ci = 0; ci < charts.length; ci++) {
    var chart = charts[ci];
    var rpt = runChartBenchmark(chart);
    results.charts.push(rpt);
    totP += rpt.pass;
    totF += rpt.fail;

    var pct = rpt.pass + rpt.fail > 0 ? ((rpt.pass / (rpt.pass + rpt.fail)) * 100).toFixed(0) : '0';
    var icon = rpt.fail === 0 ? green('OK') : rpt.fail <= 3 ? yellow('~~') : red('XX');
    console.log(icon + ' ' + bold(chart.name) + ' ' + dim('[' + chart.id + ']') + ' ' + green(rpt.pass + 'P') + '/' + (rpt.fail > 0 ? red(rpt.fail + 'F') : '0F') + ' (' + pct + '%)');

    for (var ti = 0; ti < rpt.tests.length; ti++) {
      var t = rpt.tests[ti];
      if (t.cat === 'Lagna') { lagT++; if (t.pass) lagP++; }
      else if (t.cat.indexOf('P:') === 0) { plT++; if (t.pass) plP++; }
      else if (t.cat === 'Nakshatra') { nkT++; if (t.pass) nkP++; }
      else if (t.cat === 'Dasha') { daT++; if (t.pass) daP++; }
      else { fnT++; if (t.pass) fnP++; }
    }

    if (VERBOSE || rpt.fail > 0) {
      for (var tj = 0; tj < rpt.tests.length; tj++) {
        var tt = rpt.tests[tj];
        if (!tt.pass || VERBOSE) {
          var ic = tt.pass ? green('  +') : red('  -');
          var extra = tt.deg ? dim(' [' + tt.deg + ']') : '';
          console.log(ic + ' ' + tt.cat + ': exp=' + cyan(tt.exp) + ' got=' + (tt.pass ? green(tt.act) : red(tt.act)) + extra);
        }
      }
    }
  }

  // Panchanga
  if (!SINGLE) {
    console.log(bold(cyan('\nPANCHANGA BENCHMARKS (' + PANCHANGA_BENCHMARKS.length + ')\n')));
    for (var pi = 0; pi < PANCHANGA_BENCHMARKS.length; pi++) {
      var b = PANCHANGA_BENCHMARKS[pi];
      var r = runPanchangaBenchmark(b);
      results.panchanga.push(r);
      totP += r.pass; totF += r.fail;
      var pIcon = r.fail === 0 ? green('OK') : red('XX');
      console.log(pIcon + ' ' + b.name);
      for (var ri = 0; ri < r.tests.length; ri++) {
        var rt = r.tests[ri];
        if (!rt.pass || VERBOSE) {
          console.log((rt.pass ? green('  +') : red('  -')) + ' ' + rt.cat + ': exp=' + cyan(rt.exp) + ' got=' + (rt.pass ? green(rt.act) : red(rt.act)));
        }
      }
    }

    // Ayanamsha
    console.log(bold(cyan('\nAYANAMSHA BENCHMARKS (' + AYANAMSHA_BENCHMARKS.length + ')\n')));
    for (var ai = 0; ai < AYANAMSHA_BENCHMARKS.length; ai++) {
      var ab = AYANAMSHA_BENCHMARKS[ai];
      var ar = runAyanamshaBenchmark(ab);
      results.ayanamsha.push(ar);
      totP += ar.pass; totF += ar.fail;
      var at = ar.tests[0];
      console.log((at.pass ? green('OK') : red('XX')) + ' ' + ab.source + ': exp=' + cyan(at.exp) + ' got=' + (at.pass ? green(at.act) : red(at.act)) + dim(' diff=' + at.diff));
    }
  }

  // SCORECARD
  var totalTests = totP + totF;
  var overallPct = totalTests > 0 ? ((totP / totalTests) * 100).toFixed(1) : '0';

  function bar(p, t) {
    if (!t) return '';
    var f = Math.round(p / t * 20);
    return green('#'.repeat(f)) + dim('.'.repeat(20 - f));
  }
  function fp(p, t) { return t > 0 ? ((p / t) * 100).toFixed(0) + '%' : 'N/A'; }

  console.log(bold('\n' + '='.repeat(60)));
  console.log(bold('  SCORECARD'));
  console.log('='.repeat(60));
  console.log('\n  Lagna:          ' + bar(lagP, lagT) + '  ' + lagP + '/' + lagT + ' ' + bold(fp(lagP, lagT)));
  console.log('  Planet Signs:   ' + bar(plP, plT) + '  ' + plP + '/' + plT + ' ' + bold(fp(plP, plT)));
  console.log('  Nakshatra:      ' + bar(nkP, nkT) + '  ' + nkP + '/' + nkT + ' ' + bold(fp(nkP, nkT)));
  console.log('  Dasha:          ' + bar(daP, daT) + '  ' + daP + '/' + daT + ' ' + bold(fp(daP, daT)));
  console.log('  Functional:     ' + bar(fnP, fnT) + '  ' + fnP + '/' + fnT + ' ' + bold(fp(fnP, fnT)));
  console.log('  ' + '_'.repeat(56));
  console.log('  ' + bold('OVERALL:') + '        ' + bar(totP, totalTests) + '  ' + totP + '/' + totalTests + ' ' + bold(overallPct + '%') + '\n');

  var grade = overallPct >= 95 ? 'A+' : overallPct >= 90 ? 'A' : overallPct >= 85 ? 'B+' : overallPct >= 80 ? 'B' : overallPct >= 70 ? 'C' : overallPct >= 60 ? 'D' : 'F';
  var gc = grade.charAt(0) === 'A' ? green : grade.charAt(0) === 'B' ? yellow : red;
  console.log('  Grade: ' + gc(bold(grade)) + '\n');

  if (JSON_OUT) {
    results.summary = { total: totalTests, pass: totP, fail: totF, percentage: parseFloat(overallPct), grade: grade };
    var jp = require('path').join(__dirname, 'results.json');
    require('fs').writeFileSync(jp, JSON.stringify(results, null, 2));
    console.log(dim('  Saved: ' + jp + '\n'));
  }

  process.exit(totF > 0 ? 1 : 0);
}

main();
