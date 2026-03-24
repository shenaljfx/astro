/**
 * Sri Lankan Dataset Validation Runner
 * =====================================
 * 
 * Runs the Grahachara astrology engine against the Sri Lankan
 * personalities dataset and checks if Dasha periods and transits
 * align with documented life events.
 * 
 * Usage: node data/validate-dataset.js [--person=id] [--verbose]
 */

const path = require('path');
const {
  SRI_LANKAN_DATASET,
  DATASET_META,
  getPersonById,
  getTimeline,
  getDatasetSummary
} = require('./sri-lankan-dataset');

// Load engine
const enginePath = path.join(__dirname, '..', 'server', 'src', 'engine', 'astrology.js');
let engine;
try {
  engine = require(enginePath);
} catch (e) {
  console.error('❌ Could not load astrology engine:', e.message);
  console.error('   Make sure server/src/engine/astrology.js exists and dependencies are installed');
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const personArg = args.find(a => a.startsWith('--person='));
const targetPerson = personArg ? personArg.split('=')[1] : null;

// Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m'
};

function header(text) {
  console.log(`\n${C.bright}${C.cyan}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  ${text}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'═'.repeat(70)}${C.reset}`);
}

function subHeader(text) {
  console.log(`\n${C.bright}${C.yellow}  ── ${text} ──${C.reset}`);
}

// ============================================================
// MAIN ANALYSIS
// ============================================================
function analyzePersonChart(person) {
  const birthDate = new Date(person.birthDate + 'T' + person.birthTime + ':00Z');
  // Adjust for Sri Lanka timezone (UTC+5:30)
  const utcDate = new Date(birthDate.getTime() - (5.5 * 60 * 60 * 1000));

  const results = {
    person: person.name,
    id: person.id,
    birthInfo: {
      date: person.birthDate,
      time: person.birthTime,
      place: person.birthPlace,
      timeSource: person.birthTimeSource
    },
    chartData: null,
    dashaAnalysis: [],
    eventCorrelations: [],
    score: { total: 0, matched: 0, partial: 0, unmatched: 0 }
  };

  try {
    // Get planet positions
    const planets = engine.getAllPlanetPositions(utcDate, person.lat, person.lng);
    results.chartData = { planets: {} };

    // Extract key planet positions
    for (const [name, data] of Object.entries(planets)) {
      results.chartData.planets[name] = {
        sidereal: data.sidereal ? data.sidereal.toFixed(2) : 'N/A',
        rashi: data.rashiEnglish || data.rashi || 'N/A',
        retrograde: data.isRetrograde || false
      };
    }

    // Get Lagna (if birth time is somewhat reliable)
    try {
      const lagna = engine.getLagna(utcDate, person.lat, person.lng);
      results.chartData.lagna = {
        rashi: lagna.rashi ? (lagna.rashi.english || lagna.rashi.name) : 'N/A',
        degree: lagna.sidereal ? lagna.sidereal.toFixed(2) : 'N/A'
      };
    } catch (e) {
      results.chartData.lagna = { error: e.message };
    }

    // Get Moon Nakshatra (keys are lowercase in engine output)
    const moonData = planets.Moon || planets.moon;
    if (moonData && moonData.sidereal !== undefined) {
      try {
        const nakshatra = engine.getNakshatra(moonData.sidereal);
        results.chartData.moonNakshatra = nakshatra;
      } catch (e) {
        results.chartData.moonNakshatra = { error: e.message };
      }

      // Get Vimshottari Dasha
      try {
        const dashas = engine.calculateVimshottari(moonData.sidereal, utcDate);
        results.chartData.dashas = dashas.map(d => ({
          lord: d.lord,
          start: d.start instanceof Date ? d.start.toISOString().split('T')[0] : d.start,
          end: d.endDate instanceof Date ? d.endDate.toISOString().split('T')[0] : d.endDate,
          years: d.years
        }));

        // Correlate events with Dasha periods
        for (const event of person.lifeEvents) {
          const eventDate = new Date(event.date);
          const activeDasha = dashas.find(d => {
            const dStart = d.start instanceof Date ? d.start : new Date(d.start);
            const dEnd = d.endDate instanceof Date ? d.endDate : new Date(d.endDate);
            return eventDate >= dStart && eventDate <= dEnd;
          });

          const correlation = {
            event: event.name,
            date: event.date,
            category: event.category,
            nature: event.nature,
            dashaLord: activeDasha ? activeDasha.lord : 'Unknown',
            analysis: ''
          };

          // Simple correlation analysis
          if (activeDasha) {
            const lord = activeDasha.lord;
            const cat = event.category;
            const nat = event.nature;

            // Career/political events during Sun, Jupiter, Saturn, Rahu dashas
            if ((cat === 'career' || cat === 'political' || cat === 'awards') && nat === 'Good') {
              if (['Sun', 'Jupiter', 'Rahu', 'Mercury'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha favorable for career/recognition`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - career event during non-typical career lord`;
                results.score.partial++;
              }
            }
            // Marriage during Venus, Jupiter, Moon dashas
            else if (cat === 'marriage' && nat === 'Good') {
              if (['Venus', 'Jupiter', 'Moon', 'Mercury'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha favorable for marriage`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - marriage during non-typical marriage lord`;
                results.score.partial++;
              }
            }
            // Health/death crises during Saturn, Mars, Rahu, Ketu
            else if ((cat === 'health' || cat === 'death') && nat === 'Bad') {
              if (['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha correlates with health/crisis event`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - crisis during non-typical crisis lord`;
                results.score.partial++;
              }
            }
            // Legal trouble during Saturn, Rahu
            else if (cat === 'legal' && nat === 'Bad') {
              if (['Saturn', 'Rahu', 'Ketu', 'Mars'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha correlates with legal difficulty`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - legal event during non-typical lord`;
                results.score.partial++;
              }
            }
            // Divorce during Rahu, Ketu, Saturn, Mars
            else if (cat === 'marriage' && nat === 'Bad') {
              if (['Rahu', 'Ketu', 'Saturn', 'Mars', 'Sun'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha correlates with marital disruption`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - divorce during non-typical lord`;
                results.score.partial++;
              }
            }
            // Children during Jupiter, Venus, Moon
            else if (cat === 'children') {
              if (['Jupiter', 'Venus', 'Moon', 'Mercury'].includes(lord)) {
                correlation.analysis = `✅ ${lord} Dasha favorable for children`;
                results.score.matched++;
              } else {
                correlation.analysis = `⚠️ ${lord} Dasha - children event during non-typical lord`;
                results.score.partial++;
              }
            }
            // Neutral/other
            else {
              correlation.analysis = `ℹ️ ${lord} Dasha active during ${cat} event (${nat})`;
              results.score.partial++;
            }
          } else {
            correlation.analysis = '❓ Could not determine active Dasha for this event';
            results.score.unmatched++;
          }

          results.score.total++;
          results.eventCorrelations.push(correlation);
        }

      } catch (e) {
        results.chartData.dashas = { error: e.message };
      }
    }

  } catch (e) {
    results.error = e.message;
  }

  return results;
}

// ============================================================
// DISPLAY RESULTS
// ============================================================
function displayResults(results) {
  subHeader(`${results.person} (${results.id})`);
  console.log(`  ${C.dim}Born: ${results.birthInfo.date} at ${results.birthInfo.time} in ${results.birthInfo.place}${C.reset}`);
  console.log(`  ${C.dim}Time source: ${results.birthInfo.timeSource}${C.reset}`);

  if (results.error) {
    console.log(`  ${C.red}ERROR: ${results.error}${C.reset}`);
    return;
  }

  // Chart overview
  if (results.chartData) {
    if (results.chartData.lagna && !results.chartData.lagna.error) {
      console.log(`  ${C.green}Lagna: ${results.chartData.lagna.rashi} (${results.chartData.lagna.degree}°)${C.reset}`);
    }
    if (results.chartData.moonNakshatra && !results.chartData.moonNakshatra.error) {
      console.log(`  ${C.green}Moon Nakshatra: ${results.chartData.moonNakshatra.name} Pada ${results.chartData.moonNakshatra.pada}${C.reset}`);
    }

    // Show Dasha periods
    if (results.chartData.dashas && !results.chartData.dashas.error) {
      if (verbose) {
        console.log(`\n  ${C.bright}Vimshottari Dasha Periods:${C.reset}`);
        for (const d of results.chartData.dashas) {
          console.log(`    ${C.cyan}${d.lord.padEnd(8)}${C.reset} ${d.start} → ${d.end} (${d.years}y)`);
        }
      }
    }

    // Show planet positions if verbose
    if (verbose && results.chartData.planets) {
      console.log(`\n  ${C.bright}Planet Positions:${C.reset}`);
      for (const [name, data] of Object.entries(results.chartData.planets)) {
        const retro = data.retrograde ? ' (R)' : '';
        console.log(`    ${C.magenta}${name.padEnd(10)}${C.reset} ${data.sidereal}° in ${data.rashi}${retro}`);
      }
    }
  }

  // Event correlations
  if (results.eventCorrelations.length > 0) {
    console.log(`\n  ${C.bright}Life Event ↔ Dasha Correlations:${C.reset}`);
    for (const corr of results.eventCorrelations) {
      const natColor = corr.nature === 'Good' ? C.green : corr.nature === 'Bad' ? C.red : C.yellow;
      console.log(`    ${natColor}${corr.nature.padEnd(7)}${C.reset} ${corr.date} | ${C.white}${corr.event}${C.reset}`);
      console.log(`           ${corr.analysis}`);
    }
  }

  // Score
  const pct = results.score.total > 0 ? ((results.score.matched / results.score.total) * 100).toFixed(1) : 0;
  const partialPct = results.score.total > 0 ? (((results.score.matched + results.score.partial) / results.score.total) * 100).toFixed(1) : 0;
  console.log(`\n  ${C.bright}Score: ${results.score.matched}/${results.score.total} direct matches (${pct}%), ${results.score.partial} partial, ${results.score.unmatched} unmatched${C.reset}`);
  console.log(`  ${C.bright}Combined (match+partial): ${partialPct}%${C.reset}`);
}

// ============================================================
// RUN
// ============================================================
header('Sri Lankan Life Events Validation');

// Show dataset summary
const summary = getDatasetSummary();
console.log(`\n  ${C.bright}Dataset: ${summary.persons} persons, ${summary.totalEvents} life events${C.reset}`);
console.log(`  ${C.dim}Date range: ${summary.dateRange.earliest} → ${summary.dateRange.latest}${C.reset}`);
console.log(`  ${C.dim}By nature: Good=${summary.byNature.Good} Bad=${summary.byNature.Bad} Neutral=${summary.byNature.Neutral}${C.reset}`);
console.log(`  ${C.dim}By category: ${Object.entries(summary.byCategory).map(([k,v]) => `${k}=${v}`).join(', ')}${C.reset}`);

const persons = targetPerson
  ? [getPersonById(targetPerson)].filter(Boolean)
  : SRI_LANKAN_DATASET;

if (targetPerson && persons.length === 0) {
  console.log(`\n  ${C.red}Person '${targetPerson}' not found. Available: ${SRI_LANKAN_DATASET.map(p => p.id).join(', ')}${C.reset}`);
  process.exit(1);
}

const allResults = [];
let totalMatched = 0, totalPartial = 0, totalUnmatched = 0, totalEvents = 0;

for (const person of persons) {
  const results = analyzePersonChart(person);
  allResults.push(results);
  displayResults(results);
  totalMatched += results.score.matched;
  totalPartial += results.score.partial;
  totalUnmatched += results.score.unmatched;
  totalEvents += results.score.total;
}

// Overall summary
header('OVERALL VALIDATION SUMMARY');
const overallPct = totalEvents > 0 ? ((totalMatched / totalEvents) * 100).toFixed(1) : 0;
const overallCombinedPct = totalEvents > 0 ? (((totalMatched + totalPartial) / totalEvents) * 100).toFixed(1) : 0;

console.log(`\n  ${C.bright}Persons analyzed: ${persons.length}${C.reset}`);
console.log(`  ${C.bright}Total events: ${totalEvents}${C.reset}`);
console.log(`  ${C.green}Direct matches: ${totalMatched} (${overallPct}%)${C.reset}`);
console.log(`  ${C.yellow}Partial matches: ${totalPartial}${C.reset}`);
console.log(`  ${C.red}Unmatched: ${totalUnmatched}${C.reset}`);
console.log(`  ${C.bright}Combined score: ${overallCombinedPct}%${C.reset}`);

console.log(`\n  ${C.dim}Note: Birth times are mostly unknown (noon placeholders).${C.reset}`);
console.log(`  ${C.dim}Dasha analysis is date-dependent and works without exact birth time.${C.reset}`);
console.log(`  ${C.dim}Lagna/house-based analysis requires verified birth times for accuracy.${C.reset}`);

console.log(`\n${C.bright}${C.cyan}${'═'.repeat(70)}${C.reset}\n`);
