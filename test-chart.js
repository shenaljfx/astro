const path = require('path');
process.chdir(path.join(__dirname, 'server'));

const { buildHouseChart, getAllPlanetPositions, getLagna, toSidereal, getSunLongitude, getMoonLongitude, getAyanamsha } = require('./server/src/engine/astrology');

// Birth data: Oct 9, 1998, 9:16 AM Sri Lanka time (UTC+5:30)
// Sri Lanka is UTC+5:30, so 9:16 AM local = 3:46 AM UTC
const birthDate = new Date('1998-10-09T03:46:00Z');
const birthLat = 6.9271;  // Colombo
const birthLng = 79.8612;

console.log('=== BIRTH DATA ===');
console.log('Date:', birthDate.toISOString());
console.log('Local: Oct 9, 1998, 9:16 AM Sri Lanka');
console.log('Lat:', birthLat, 'Lng:', birthLng);

console.log('\n=== AYANAMSHA ===');
console.log('Ayanamsha:', getAyanamsha(birthDate));

console.log('\n=== LAGNA ===');
const lagna = getLagna(birthDate, birthLat, birthLng);
console.log('Tropical Asc:', lagna.tropical.toFixed(4));
console.log('Sidereal Asc:', lagna.sidereal.toFixed(4));
console.log('Lagna Rashi:', lagna.rashi.id, lagna.rashi.name, '(' + lagna.rashi.english + ')');
console.log('Degree in sign:', (lagna.sidereal % 30).toFixed(2));

console.log('\n=== EXPECTED: Mesha (Aries) Lagna ===');
console.log('Match?', lagna.rashi.name === 'Mesha' ? 'YES ✓' : 'NO ✗ (got ' + lagna.rashi.name + ')');

console.log('\n=== ALL PLANET POSITIONS ===');
const planets = getAllPlanetPositions(birthDate);
const EXPECTED = {
  sun:     { rashi: 'Kanya',   degree: 21.54, house: 6 },  // Virgo ~21°54'
  moon:    { rashi: 'Vrishabha', degree: 8.44, house: 2 },  // Taurus ~8°44'  
  mars:    { rashi: 'Simha',   degree: 7.15, house: 5 },    // Leo ~7°15'
  mercury: { rashi: 'Kanya',   degree: 1.32, house: 6 },    // Virgo ~1°32'
  jupiter: { rashi: 'Kumbha',  degree: 26.26, house: 11 },  // Aquarius ~26°26'
  venus:   { rashi: 'Kanya',   degree: 17.28, house: 6 },   // Virgo ~17°28'
  saturn:  { rashi: 'Mesha',   degree: 7.33, house: 1 },    // Aries ~7°33' (or Meena/12?)
  rahu:    { rashi: 'Simha',   degree: 6.45, house: 5 },    // Leo ~6°45'
  ketu:    { rashi: 'Kumbha',  degree: 6.45, house: 11 },   // Aquarius ~6°45'
};

for (const [key, p] of Object.entries(planets)) {
  const exp = EXPECTED[key];
  const match = exp && p.rashi === exp.rashi;
  const degDiff = exp ? Math.abs(p.degreeInSign - exp.degree).toFixed(1) : '?';
  console.log(`  ${p.name.padEnd(8)}: Rashi ${p.rashiId.toString().padStart(2)} ${p.rashi.padEnd(12)} (${p.rashiEnglish.padEnd(12)}) at ${p.degreeInSign.toFixed(2).padStart(6)}°  | Expected: ${exp ? exp.rashi : '?'} ${exp ? exp.degree : '?'}° | ${match ? '✓' : '✗ WRONG'} (diff: ${degDiff}°)`);
}

console.log('\n=== HOUSE CHART ===');
const houseChart = buildHouseChart(birthDate, birthLat, birthLng);
houseChart.houses.forEach(h => {
  const planetNames = h.planets.map(p => `${p.name}(${p.degree.toFixed(1)}°)`).join(', ') || '(empty)';
  console.log(`  House ${h.houseNumber.toString().padStart(2)}: Rashi ${h.rashiId.toString().padStart(2)} (${h.rashi.padEnd(12)}) - ${planetNames}`);
});

console.log('\n=== EXPECTED HOUSE CHART (from reference) ===');
console.log('  House  1: Mesha (Aries)       - Saturn?');
console.log('  House  2: Vrishabha (Taurus)  - Moon 8°44');
console.log('  House  3: Mithuna (Gemini)    - (empty)');
console.log('  House  4: Kataka (Cancer)     - (empty)');
console.log('  House  5: Simha (Leo)         - Mars 7°15, Rahu 6°45');
console.log('  House  6: Kanya (Virgo)       - Mercury 1°32, Sun 21°54, Venus 17°28');
console.log('  House  7: Tula (Libra)        - (empty)');
console.log('  House  8: Vrischika (Scorpio) - (empty)');
console.log('  House  9: Dhanus (Sagittarius)- (empty)');
console.log('  House 10: Makara (Capricorn)  - (empty)');
console.log('  House 11: Kumbha (Aquarius)   - Jupiter 26°26, Ketu 6°45');
console.log('  House 12: Meena (Pisces)      - Saturn 7°33');
