const { generateFullReport, buildHouseChart, buildNavamshaChart, calculateDrishtis, detectYogas, getPlanetStrengths, calculateVimshottariDetailed, toSidereal, getMoonLongitude } = require('./src/engine/astrology.js');
const { generateAdvancedAnalysis } = require('./src/engine/advanced.js');

// 2006-03-30 08:16 Colombo (UTC+5:30) = UTC 02:46
const d = new Date('2006-03-30T02:46:00Z');
const lat = 6.9271;
const lng = 79.8612;

const r = generateFullReport(d, lat, lng);
const hc = buildHouseChart(d, lat, lng);
const adv = generateAdvancedAnalysis(d, lat, lng);

console.log('\n========== CHART ANALYSIS FOR 2006-03-30 08:16 COLOMBO ==========\n');

console.log('--- FAMILY PORTRAIT: MOTHER ---');
const mom = r.sections.familyPortrait?.mother;
if (mom) {
  console.log('4th house analysis:', JSON.stringify(mom.h4Analysis, null, 2));
  console.log('4th Lord (Moon):', JSON.stringify(mom.h4Lord));
  console.log('Moon position:', JSON.stringify(mom.moonPosition));
  console.log('Moon Shadbala:', JSON.stringify(mom.moonShadbala));
  console.log('Summary:', mom.summary);
  console.log('Challenges:', JSON.stringify(mom.challenges));
}

console.log('\n--- FAMILY PORTRAIT: FATHER ---');
const dad = r.sections.familyPortrait?.father;
if (dad) {
  console.log('9th house analysis:', JSON.stringify(dad.h9Analysis, null, 2));
  console.log('9th Lord:', JSON.stringify(dad.h9Lord));
  console.log('Sun position:', JSON.stringify(dad.sunPosition));
  console.log('Sun Shadbala:', JSON.stringify(dad.sunShadbala));
  console.log('Summary:', dad.summary);
  console.log('Challenges:', JSON.stringify(dad.challenges));
}

console.log('\n--- FAMILY PORTRAIT: SIBLINGS ---');
const sibs = r.sections.familyPortrait?.siblings;
if (sibs) {
  console.log('3rd house:', JSON.stringify(sibs.h3Analysis, null, 2));
  console.log('Likely count:', sibs.siblingCount);
  console.log('Elder/younger:', sibs.elderYounger);
  console.log('Summary:', sibs.summary);
}

console.log('\n--- MENTAL HEALTH SECTION ---');
const mh = r.sections.mentalHealth;
if (mh) {
  console.log('4th house:', JSON.stringify(mh.fourthHouse, null, 2));
  console.log('Moon analysis:', JSON.stringify(mh.moonAnalysis, null, 2));
  console.log('Depression risk:', JSON.stringify(mh.depressionRisk));
  console.log('Anxiety risk:', JSON.stringify(mh.anxietyRisk));
  console.log('Childhood trauma:', JSON.stringify(mh.childhoodTrauma));
}

console.log('\n--- ADVANCED: DOSHAS ---');
if (adv.tier1?.doshas?.items) {
  adv.tier1.doshas.items.forEach(d => {
    console.log(`  ${d.name} (${d.severity}): ${d.description}`);
  });
}

console.log('\n--- ADVANCED: PAST LIFE ---');
if (adv.tier3?.pastLife) {
  console.log('Past life:', adv.tier3.pastLife.pastLife?.pastLifeStory);
  console.log('Karma balance:', JSON.stringify(adv.tier3.pastLife.karmaBalance));
}

console.log('\n--- DASHA TIMELINE ---');
const moonSid = toSidereal(getMoonLongitude(d), d);
const dasas = calculateVimshottariDetailed(moonSid, d);
dasas.forEach(da => {
  const isCurrent = new Date(da.start) <= new Date() && new Date(da.endDate) >= new Date();
  console.log(`  ${da.lord}: ${da.start} to ${da.endDate} (${da.years.toFixed(1)} yrs)${isCurrent ? ' ← CURRENT' : ''}`);
});

console.log('\n--- KEY OBSERVATIONS ---');
console.log('Moon in H12 (Pisces) = emotional isolation, hidden suffering, mother separated/absent');
console.log('Saturn in H4 (Cancer) = disrupted home life, childhood hardship, cold/strict home');
console.log('Sun in H12 = weak father figure, father absent/disconnected');
console.log('4th lord Moon in 12th = mother in 12th (loss/separation from mother)');
console.log('Ketu in H6 = health struggles, possibly psychosomatic');
console.log('Mars in H2 = harsh family speech environment');
console.log('Rahu in H12 with Sun+Moon = mental fog, confusion, hidden fears, escapism');
