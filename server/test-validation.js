const { generateFullReport, predictMarriageTiming } = require('./src/engine/astrology');

const date = new Date('1998-11-04T21:17:00+05:30');
const lat = 6.9271;
const lng = 79.8612;

console.log('Computing full report for 1998-11-04 21:17 Colombo...\n');
const report = generateFullReport(date, lat, lng);

// 1. MARRIAGE ANALYSIS
console.log('═══════════════════════════════════════════');
console.log('1. MARRIAGE & RELATIONSHIP ANALYSIS');
console.log('═══════════════════════════════════════════');
console.log('7th Lord:', report.sections.marriage.seventhLord.name, 'in house', report.sections.marriage.seventhLord.house);
console.log('Venus in house:', report.sections.marriage.venus.house);
console.log('Kuja Dosha:', JSON.stringify(report.sections.marriage.kujaDosha));
console.log('Marriage timing indicators:', JSON.stringify(report.sections.marriage.marriageTimingIndicators, null, 2));
if (report.sections.marriage.marriageTimingPrediction) {
  console.log('\nMarriage Timing Windows:');
  const windows = report.sections.marriage.marriageTimingPrediction.firstMarriageWindows || [];
  windows.forEach(w => {
    console.log('  ', w.period, '|', w.dateRange, '| Age:', w.ageRange, '| Confidence:', w.confidence);
    console.log('    Reasons:', w.reasons?.join('; '));
  });
  if (report.sections.marriage.marriageTimingPrediction.bestWindow) {
    console.log('  BEST WINDOW:', JSON.stringify(report.sections.marriage.marriageTimingPrediction.bestWindow));
  }
}
console.log('Navamsha marriage strength:', report.sections.marriage.navamshaAnalysis?.marriageStrength);

// 2. MOTHER RELATIONSHIP (4th house)
console.log('\n═══════════════════════════════════════════');
console.log('2. MOTHER / 4TH HOUSE ANALYSIS');
console.log('═══════════════════════════════════════════');
console.log('Mother profile:', report.sections.surpriseInsights.motherProfile);
console.log('4th house details:', JSON.stringify({
  rashi: report.sections.realEstate.fourthHouse?.rashiEnglish,
  planetsIn4th: report.sections.realEstate.fourthHouse?.planetsInHouse,
  strength: report.sections.realEstate.fourthHouse?.strength,
  aspects: report.sections.realEstate.fourthHouse?.aspectingPlanets,
  lord: report.sections.realEstate.fourthLord.name,
  lordHouse: report.sections.realEstate.fourthLord.house,
}, null, 2));
console.log('Moon position (mother karaka):');
console.log('  Moon house:', report.sections.mentalHealth.moon.house);
console.log('  Moon strength:', report.sections.mentalHealth.moon.strength, 'score:', report.sections.mentalHealth.moon.score);
console.log('Mental stability:', report.sections.mentalHealth.mentalStability);

// 3. SIBLINGS (3rd house)
console.log('\n═══════════════════════════════════════════');
console.log('3. SIBLINGS / 3RD HOUSE ANALYSIS');
console.log('═══════════════════════════════════════════');
console.log('Siblings prediction:', report.sections.surpriseInsights.numberOfSiblings);
console.log('3rd house (initiative/siblings) - from business section:');
console.log('  Planets in 3rd:', report.sections.business.initiativeHouse?.planetsInHouse);
console.log('  3rd house strength:', report.sections.business.initiativeHouse?.strength);
console.log('  3rd house aspects:', report.sections.business.initiativeHouse?.aspectingPlanets);

// 4. CHILDHOOD TRAUMA (Moon, 4th house, Rahu/Ketu, 8th house, etc.)
console.log('\n═══════════════════════════════════════════');
console.log('4. CHILDHOOD TRAUMA INDICATORS');
console.log('═══════════════════════════════════════════');
console.log('Moon score:', report.sections.mentalHealth.moon.score);
console.log('Moon house:', report.sections.mentalHealth.moon.house);
const moonInDusthana = [6, 8, 12].includes(report.sections.mentalHealth.moon.house);
console.log('Moon in dusthana?', moonInDusthana);

// Moon + Saturn conjunction? (childhood sadness)
const moonHouse = report.sections.mentalHealth.moon.house;
console.log('Saturn co-located with Moon?', report.sections.surpriseInsights);

// Check personality section for lagna info
console.log('\nLagna:', report.sections.personality.lagna.name, report.sections.personality.lagna.english);
console.log('Moon sign:', report.sections.personality.moonSign.name, report.sections.personality.moonSign.english);
console.log('Nakshatra:', report.sections.personality.nakshatra.name, 'pada', report.sections.personality.nakshatra.pada);

// 5. DASHA PERIODS
console.log('\n═══════════════════════════════════════════');
console.log('5. DASHA PERIODS (key life phases)');
console.log('═══════════════════════════════════════════');
console.log('Current Dasha:', JSON.stringify(report.sections.lifePredictions.currentDasha, null, 2));
console.log('Life phase summary (relevant periods):');
report.sections.lifePredictions.lifePhaseSummary.forEach(p => {
  console.log('  ', p.lord, ':', p.period, '(' + p.years + ' yrs)', p.isCurrent ? '<<< CURRENT' : '', '—', p.theme.substring(0, 80));
});

// 6. YOGAS & DOSHAS
console.log('\n═══════════════════════════════════════════');
console.log('6. YOGAS & DOSHAS');
console.log('═══════════════════════════════════════════');
report.sections.yogaAnalysis.yogas.forEach(y => {
  console.log(' Yoga:', y.name, '|', y.strength, '|', y.description?.substring(0, 80));
});
if (report.sections.yogaAnalysis.advancedYogas?.length) {
  report.sections.yogaAnalysis.advancedYogas.forEach(y => {
    console.log(' Adv Yoga:', y.name, '|', y.strength, '|', y.description?.substring(0, 80));
  });
}
if (report.sections.yogaAnalysis.doshas?.length) {
  report.sections.yogaAnalysis.doshas.forEach(d => {
    console.log(' Dosha:', d.name, '|', d.severity, '|', d.description?.substring(0, 80));
  });
}

// 7. HEALTH vulnerabilities
console.log('\n═══════════════════════════════════════════');
console.log('7. HEALTH & MENTAL HEALTH');
console.log('═══════════════════════════════════════════');
console.log('Health vulnerabilities:', report.sections.health.healthVulnerabilities.map(v => v.planet + ': ' + v.risk?.substring(0, 60)).join('\n  '));
console.log('Mental stability:', report.sections.mentalHealth.mentalStability);
console.log('Mercury Shadbala:', JSON.stringify(report.sections.mentalHealth.mercuryShadbala, null, 2));
console.log('Moon Shadbala:', JSON.stringify(report.sections.mentalHealth.moonShadbala, null, 2));

console.log('\n═══════════════════════════════════════════');
console.log('DONE');
