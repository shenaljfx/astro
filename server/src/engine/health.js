/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ADVANCED MEDICAL ASTROLOGY ENGINE — Health Prediction & Body Mapping
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A comprehensive health analysis engine based on:
 *   - BPHS Ch.11 (body parts per house), Ch.26 (diseases per planet)
 *   - Phaladeepika Ch.22 (disease indications)
 *   - Jataka Parijata Ch.6 (Maraka analysis)
 *   - Prashna Marga Ch.19 (timing of illness)
 *   - Sarvartha Chintamani (health yogas)
 *
 * What this engine does:
 *   1. Constitutional Analysis — Tridosha (Vata/Pitta/Kapha) from chart
 *   2. Vulnerable Body Parts — Rashi/House/Planet body mapping
 *   3. Disease Susceptibility — Planet-disease linkage with severity
 *   4. Maraka Analysis — 2nd/7th lords, 22nd Drekkana, 64th Navamsha
 *   5. Health Crisis Timing — Multi-layer Dasha scanning (MD + AD + PD)
 *   6. Transit Health Alerts — Saturn/Mars/Rahu transiting sensitive houses
 *   7. Mental Health Assessment — Moon/Mercury/4th house analysis
 *   8. Longevity Estimation — Jaimini Ayurdaya + classical methods
 *   9. Preventive Recommendations — Remedies, diet, lifestyle per dosha
 *
 * Author: Nakath AI Engine v4.0 — Medical Astrology Module
 */

const {
  RASHIS, NAKSHATRAS, FUNCTIONAL_STATUS,
  getAllPlanetPositions, getLagna, buildHouseChart, buildNavamshaChart,
  toSidereal, getMoonLongitude, getSunLongitude,
  calculateVimshottariDetailed, getFunctionalNature,
  calculateAshtakavarga, calculateDrishtis,
  getPlanetStrengths, HOUSE_SIGNIFICATIONS, PLANET_KARAKAS,
} = require('./astrology');


// ═══════════════════════════════════════════════════════════════════════════
//  RASHI → BODY PART MAPPING (Kaalapurusha)
// ═══════════════════════════════════════════════════════════════════════════

const RASHI_BODY_MAP = {
  1:  { english: 'Aries',       part: 'Head, Brain, Face',          sinhala: 'හිස, මොළය, මුහුණ',         system: 'Nervous (cranial)' },
  2:  { english: 'Taurus',      part: 'Face, Throat, Neck, Thyroid', sinhala: 'මුහුණ, උගුර, බෙල්ල',       system: 'ENT, Endocrine' },
  3:  { english: 'Gemini',      part: 'Arms, Shoulders, Lungs, Bronchi', sinhala: 'අත්, උරහිස්, පෙනහළු',   system: 'Respiratory' },
  4:  { english: 'Cancer',      part: 'Chest, Breast, Stomach, Esophagus', sinhala: 'छාති, ආමාශය',        system: 'Digestive (upper)' },
  5:  { english: 'Leo',         part: 'Heart, Spine, Upper Back',   sinhala: 'හෘදය, කොඳු ඇට පෙළ',       system: 'Cardiovascular' },
  6:  { english: 'Virgo',       part: 'Intestines, Abdomen, Digestive', sinhala: 'බඩවැල්, උදරය',          system: 'Digestive (lower)' },
  7:  { english: 'Libra',       part: 'Kidneys, Lower Back, Bladder', sinhala: 'වකුගඩු, පහළ පිට',        system: 'Urinary' },
  8:  { english: 'Scorpio',     part: 'Reproductive Organs, Rectum, Pelvis', sinhala: 'ප්‍රජනන අවයව',      system: 'Reproductive' },
  9:  { english: 'Sagittarius', part: 'Thighs, Hips, Liver, Sciatic', sinhala: 'ඉකිලි, උකුල්, අක්මාව',  system: 'Hepatic, Musculoskeletal' },
  10: { english: 'Capricorn',   part: 'Knees, Joints, Bones, Skin', sinhala: 'දණහිස්, සන්ධි, ඇට',        system: 'Skeletal' },
  11: { english: 'Aquarius',    part: 'Ankles, Calves, Blood Circulation', sinhala: 'වළලුකර, පාද, රුධිර', system: 'Circulatory' },
  12: { english: 'Pisces',      part: 'Feet, Toes, Lymphatic System', sinhala: 'පාද, ඇඟිලි, වසා පද්ධතිය', system: 'Lymphatic, Immune' },
};

// ═══════════════════════════════════════════════════════════════════════════
//  HOUSE → BODY ZONE MAPPING
// ═══════════════════════════════════════════════════════════════════════════

const HOUSE_BODY_MAP = {
  1:  { zone: 'Head, Overall Vitality, Constitution',    healthRole: 'General health & immunity' },
  2:  { zone: 'Face, Right Eye, Mouth, Teeth',           healthRole: 'Diet quality, oral health' },
  3:  { zone: 'Right Ear, Arms, Throat (lower)',         healthRole: 'Courage & nervous energy' },
  4:  { zone: 'Chest, Heart, Lungs, Breasts',            healthRole: 'Emotional & cardiac health' },
  5:  { zone: 'Upper Abdomen, Stomach, Mind',            healthRole: 'Digestive & mental well-being' },
  6:  { zone: 'Intestines, Navel, Immune System',        healthRole: 'Disease proneness & recovery' },
  7:  { zone: 'Lower Abdomen, Kidneys, Reproductive',    healthRole: 'Sexual health, partnerships' },
  8:  { zone: 'Chronic Illness Zone, Hidden Diseases',   healthRole: 'Longevity, chronic conditions, surgery' },
  9:  { zone: 'Thighs, Hips, Arterial System',           healthRole: 'Dharmic protection of health' },
  10: { zone: 'Knees, Back, Skeletal Structure',          healthRole: 'Physical activity & career strain' },
  11: { zone: 'Left Ear, Ankles, Circulatory System',    healthRole: 'Recovery & gains from treatment' },
  12: { zone: 'Feet, Left Eye, Sleep, Hospitalization',   healthRole: 'Hospital stays, bed rest, addictions' },
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLANET → DISEASE MAPPING (BPHS + Phaladeepika)
// ═══════════════════════════════════════════════════════════════════════════

const PLANET_DISEASE_MAP = {
  Sun: {
    bodyParts: ['Heart', 'Right Eye', 'Bones', 'Head', 'Bile'],
    diseases: ['Heart disease', 'Eye problems', 'Bone disorders', 'High fever', 'Headaches', 'Baldness', 'Bile disorders', 'Sunstroke'],
    chronic: ['Cardiac conditions', 'Bone degeneration', 'Eye degeneration'],
    ayurveda: 'Pitta',
    element: 'Fire',
  },
  Moon: {
    bodyParts: ['Mind', 'Left Eye', 'Blood', 'Fluids', 'Breasts', 'Uterus'],
    diseases: ['Mental illness', 'Depression', 'Anxiety', 'Insomnia', 'Anemia', 'Fluid retention', 'Cold/Cough', 'Menstrual disorders', 'Lung congestion'],
    chronic: ['Clinical depression', 'Bipolar disorder', 'Chronic fatigue', 'Hormonal imbalance'],
    ayurveda: 'Kapha/Vata',
    element: 'Water',
  },
  Mars: {
    bodyParts: ['Blood', 'Muscles', 'Marrow', 'Head', 'Genitals'],
    diseases: ['Blood pressure', 'Injuries', 'Accidents', 'Fever', 'Inflammation', 'Surgery', 'Cuts/Burns', 'Hemorrhoids', 'Hernia', 'Miscarriage'],
    chronic: ['Hypertension', 'Blood disorders', 'Chronic inflammation'],
    ayurveda: 'Pitta',
    element: 'Fire',
  },
  Mercury: {
    bodyParts: ['Nervous System', 'Skin', 'Lungs', 'Tongue', 'Hands'],
    diseases: ['Nervous disorders', 'Skin diseases', 'Speech defects', 'Allergies', 'Asthma', 'OCD', 'Anxiety disorders', 'Tremors', 'Epilepsy'],
    chronic: ['Chronic skin conditions', 'Neurological disorders', 'Respiratory issues'],
    ayurveda: 'Tridosha (mixed)',
    element: 'Earth',
  },
  Jupiter: {
    bodyParts: ['Liver', 'Fat', 'Pancreas', 'Ears', 'Spleen'],
    diseases: ['Liver disease', 'Obesity', 'Diabetes', 'Jaundice', 'Tumor/Growth', 'Ear infections', 'Cholesterol'],
    chronic: ['Diabetes mellitus', 'Fatty liver', 'Metabolic syndrome'],
    ayurveda: 'Kapha',
    element: 'Ether',
  },
  Venus: {
    bodyParts: ['Reproductive System', 'Kidneys', 'Face', 'Throat', 'Semen'],
    diseases: ['Kidney stones', 'UTI', 'STDs', 'Diabetes (sugar)', 'Thyroid', 'Hormonal imbalance', 'Infertility', 'Skin beautification issues'],
    chronic: ['Kidney disease', 'PCOS/hormonal', 'Chronic diabetes'],
    ayurveda: 'Kapha',
    element: 'Water',
  },
  Saturn: {
    bodyParts: ['Bones', 'Teeth', 'Joints', 'Legs', 'Tendons', 'Nerves'],
    diseases: ['Arthritis', 'Joint pain', 'Paralysis', 'Chronic pain', 'Dental problems', 'Fractures', 'Rheumatism', 'Constipation', 'Depression (chronic)', 'Slow metabolism'],
    chronic: ['Osteoarthritis', 'Rheumatoid conditions', 'Chronic pain syndrome', 'Degenerative diseases'],
    ayurveda: 'Vata',
    element: 'Air',
  },
  Rahu: {
    bodyParts: ['Brain (subconscious)', 'Nervous system (central)'],
    diseases: ['Mysterious ailments', 'Poisoning', 'Drug addiction', 'Hallucinations', 'Phobias', 'Viral infections', 'Cancer (malignant growth)', 'Psychosis', 'Possession-like states'],
    chronic: ['Cancer', 'Autoimmune disorders', 'Addictions', 'Chronic anxiety'],
    ayurveda: 'Vata (disturbed)',
    element: 'Smoke/Air',
  },
  Ketu: {
    bodyParts: ['Feet', 'Spine (lower)', 'Immune system'],
    diseases: ['Mysterious fevers', 'Viral infections', 'Spiritual ailments', 'Insect bites', 'Surgery complications', 'Skin eruptions', 'Worm infestations', 'Past-life karmic diseases'],
    chronic: ['Autoimmune disorders', 'Chronic viral infections', 'Immune deficiency'],
    ayurveda: 'Pitta (karmic)',
    element: 'Fire (subtle)',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  TRIDOSHA DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════

const PLANET_DOSHA = {
  Sun: 'Pitta', Moon: 'Kapha', Mars: 'Pitta',
  Mercury: 'Tridosha', Jupiter: 'Kapha', Venus: 'Kapha',
  Saturn: 'Vata', Rahu: 'Vata', Ketu: 'Pitta',
};

const RASHI_DOSHA = {
  1: 'Pitta', 2: 'Vata', 3: 'Tridosha', 4: 'Kapha',
  5: 'Pitta', 6: 'Vata', 7: 'Tridosha', 8: 'Kapha',
  9: 'Pitta', 10: 'Vata', 11: 'Tridosha', 12: 'Kapha',
};


// ═══════════════════════════════════════════════════════════════════════════
//  CORE: COMPREHENSIVE HEALTH ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a full medical astrology report
 *
 * @param {Date|string} birthDate — birth date/time
 * @param {number} lat — birth latitude
 * @param {number} lng — birth longitude
 * @returns {Object} comprehensive health analysis
 */
function analyzeHealth(birthDate, lat = 6.9271, lng = 79.8612) {
  const date = new Date(birthDate);

  // Build natal chart
  const chart = buildHouseChart(date, lat, lng);
  const { houses, lagna, planets } = chart;
  const lagnaName = lagna.rashi.name;
  const lagnaRashiId = lagna.rashi.id;
  const lagnaLord = lagna.rashi.lord;

  // Get drishtis (aspects)
  let drishtis = null;
  try { drishtis = calculateDrishtis(date, lat, lng); } catch (e) { /* ok */ }

  // Planet strengths
  let planetStrengths = {};
  try { planetStrengths = getPlanetStrengths(date, lat, lng); } catch (e) { /* ok */ }

  // Moon position
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const moonRashiId = Math.floor(moonSidereal / 30) + 1;

  // Navamsha chart
  let navamsha = null;
  try { navamsha = buildNavamshaChart(date, lat, lng); } catch (e) { /* ok */ }

  // Ashtakavarga
  let ashtakavarga = null;
  try { ashtakavarga = calculateAshtakavarga(date, lat, lng); } catch (e) { /* ok */ }

  // Dasha periods
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);

  // Helpers
  const getPlanetHouse = (name) => {
    const h = houses.find(h => h.planets.some(p => p.name === name));
    return h ? h.houseNumber : 0;
  };
  const getHouseLord = (num) => {
    const h = houses[num - 1];
    return h ? h.rashiLord : 'Unknown';
  };
  const getHouseRashiId = (num) => {
    const h = houses[num - 1];
    return h ? h.rashiId : 1;
  };

  // ─────────────────────────────────────────────────────────────
  // 1. CONSTITUTIONAL ANALYSIS (Tridosha)
  // ─────────────────────────────────────────────────────────────
  const doshaScores = { Vata: 0, Pitta: 0, Kapha: 0 };

  // Lagna rashi dosha (primary but not overwhelming)
  const lagnaDosha = RASHI_DOSHA[lagnaRashiId] || 'Tridosha';
  if (lagnaDosha === 'Tridosha') { doshaScores.Vata += 2; doshaScores.Pitta += 2; doshaScores.Kapha += 2; }
  else { doshaScores[lagnaDosha] += 4; /* also add minor secondary */ const others = ['Vata','Pitta','Kapha'].filter(d => d !== lagnaDosha); others.forEach(d => doshaScores[d] += 1); }

  // Moon rashi dosha
  const moonDosha = RASHI_DOSHA[moonRashiId] || 'Tridosha';
  if (moonDosha === 'Tridosha') { doshaScores.Vata += 1; doshaScores.Pitta += 1; doshaScores.Kapha += 1; }
  else { doshaScores[moonDosha] += 3; const others = ['Vata','Pitta','Kapha'].filter(d => d !== moonDosha); others.forEach(d => doshaScores[d] += 1); }

  // Lagna lord's rashi dosha
  const lagnaLordRashiId = planets[lagnaLord.toLowerCase()]?.rashiId;
  if (lagnaLordRashiId) {
    const llDosha = RASHI_DOSHA[lagnaLordRashiId] || 'Tridosha';
    if (llDosha === 'Tridosha') { doshaScores.Vata += 1; doshaScores.Pitta += 1; doshaScores.Kapha += 1; }
    else { doshaScores[llDosha] += 2; const others = ['Vata','Pitta','Kapha'].filter(d => d !== llDosha); others.forEach(d => doshaScores[d] += 1); }
  }

  // ALL planets contribute their natural dosha (weighted by strength)
  const allPNames = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  for (const pn of allPNames) {
    const pDosha = PLANET_DOSHA[pn];
    const pk = pn.toLowerCase();
    const str = planetStrengths[pk]?.score || 50;
    const weight = str >= 65 ? 2 : str >= 45 ? 1 : 0;
    if (weight === 0) continue;
    if (pDosha === 'Tridosha') { doshaScores.Vata += 1; doshaScores.Pitta += 1; doshaScores.Kapha += 1; }
    else if (pDosha) doshaScores[pDosha] += weight;
  }

  const totalDosha = doshaScores.Vata + doshaScores.Pitta + doshaScores.Kapha;
  const constitution = {
    vata: Math.round((doshaScores.Vata / totalDosha) * 100),
    pitta: Math.round((doshaScores.Pitta / totalDosha) * 100),
    kapha: Math.round((doshaScores.Kapha / totalDosha) * 100),
    primary: Object.entries(doshaScores).sort((a, b) => b[1] - a[1])[0][0],
    secondary: Object.entries(doshaScores).sort((a, b) => b[1] - a[1])[1][0],
    type: '', // filled below
    sinhala: '',
    diet: [],
    lifestyle: [],
  };

  // Determine Prakriti type
  const sorted = Object.entries(doshaScores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] - sorted[1][1] <= 2) {
    constitution.type = `${sorted[0][0]}-${sorted[1][0]}`;
  } else {
    constitution.type = sorted[0][0];
  }

  // Diet & lifestyle per dosha
  const DOSHA_ADVICE = {
    Vata: {
      sinhala: 'වාත ප්‍රකෘති',
      diet: ['Warm, cooked, oily foods', 'Sweet, sour, salty tastes', 'Avoid raw/cold foods, caffeine', 'Sesame oil & ghee are beneficial', 'Regular meal times essential'],
      lifestyle: ['Consistent daily routine', 'Warm oil massage (Abhyanga)', 'Avoid cold/windy environments', 'Gentle yoga, no excessive exercise', 'Early sleep before 10 PM'],
      vulnerabilities: ['Nervous disorders', 'Joint pain', 'Constipation', 'Anxiety', 'Insomnia', 'Dry skin'],
    },
    Pitta: {
      sinhala: 'පිත්ත ප්‍රකෘති',
      diet: ['Cool, raw, sweet foods', 'Bitter, sweet, astringent tastes', 'Avoid spicy, sour, fermented foods', 'Coconut oil & cooling herbs', 'No alcohol, reduce coffee'],
      lifestyle: ['Avoid midday sun and overheating', 'Cooling activities, swimming', 'Moderate exercise, not competitive', 'Moon-gazing, meditation', 'Anger management practices'],
      vulnerabilities: ['Inflammation', 'Acid reflux', 'Liver issues', 'Skin rashes', 'Eye problems', 'Hypertension'],
    },
    Kapha: {
      sinhala: 'කෆ ප්‍රකෘති',
      diet: ['Light, dry, warm foods', 'Pungent, bitter, astringent tastes', 'Avoid heavy, oily, sweet foods', 'Honey (unheated) is beneficial', 'Skip breakfast occasionally (intermittent fasting)'],
      lifestyle: ['Vigorous daily exercise', 'Wake before 6 AM', 'Avoid daytime sleep', 'Stimulating activities & variety', 'Dry brushing and steam baths'],
      vulnerabilities: ['Obesity', 'Diabetes', 'Water retention', 'Respiratory congestion', 'Lethargy', 'Hypothyroid'],
    },
  };

  const primaryAdvice = DOSHA_ADVICE[constitution.primary] || DOSHA_ADVICE.Vata;
  constitution.sinhala = primaryAdvice.sinhala;
  constitution.diet = primaryAdvice.diet;
  constitution.lifestyle = primaryAdvice.lifestyle;
  constitution.vulnerabilities = primaryAdvice.vulnerabilities;

  // ─────────────────────────────────────────────────────────────
  // 2. VULNERABLE BODY PARTS
  // ─────────────────────────────────────────────────────────────
  const vulnerableParts = [];

  // 6th house rashi → primary disease zone
  const sixthRashiId = getHouseRashiId(6);
  const sixthBody = RASHI_BODY_MAP[sixthRashiId];
  if (sixthBody) {
    vulnerableParts.push({
      source: '6th House (Disease House)',
      bodyPart: sixthBody.part,
      system: sixthBody.system,
      sinhala: sixthBody.sinhala,
      severity: 'Primary vulnerability',
      reason: `6th house in ${sixthBody.english} — disease tends to manifest in this zone`,
    });
  }

  // 8th house rashi → chronic disease zone
  const eighthRashiId = getHouseRashiId(8);
  const eighthBody = RASHI_BODY_MAP[eighthRashiId];
  if (eighthBody) {
    vulnerableParts.push({
      source: '8th House (Chronic Illness House)',
      bodyPart: eighthBody.part,
      system: eighthBody.system,
      sinhala: eighthBody.sinhala,
      severity: 'Chronic vulnerability',
      reason: `8th house in ${eighthBody.english} — chronic or hidden conditions in this area`,
    });
  }

  // Lagna rashi → constitutional weakness
  const lagnaBody = RASHI_BODY_MAP[lagnaRashiId];
  if (lagnaBody) {
    vulnerableParts.push({
      source: 'Lagna (Ascendant)',
      bodyPart: lagnaBody.part,
      system: lagnaBody.system,
      sinhala: lagnaBody.sinhala,
      severity: 'Constitutional tendency',
      reason: `Lagna in ${lagnaBody.english} — this body area defines your physical constitution`,
    });
  }

  // Malefics in houses → add their body zone
  const MALEFICS = ['Saturn', 'Mars', 'Rahu', 'Ketu'];
  for (const mal of MALEFICS) {
    const h = getPlanetHouse(mal);
    if (h && [1, 6, 8, 12].includes(h)) {
      const hRashiId = getHouseRashiId(h);
      const body = RASHI_BODY_MAP[hRashiId];
      if (body) {
        vulnerableParts.push({
          source: `${mal} in House ${h}`,
          bodyPart: body.part,
          system: body.system,
          severity: mal === 'Saturn' ? 'Chronic risk' : mal === 'Mars' ? 'Acute/Surgical risk' : 'Mysterious/Hidden risk',
          reason: `${mal} afflicts house ${h} (${HOUSE_BODY_MAP[h]?.zone || ''})`,
        });
      }
    }
  }

  // Weak Lagna lord
  const lagnaLordHouse = getPlanetHouse(lagnaLord);
  if (lagnaLordHouse && [6, 8, 12].includes(lagnaLordHouse)) {
    vulnerableParts.push({
      source: 'Lagna Lord in Dusthana',
      bodyPart: RASHI_BODY_MAP[getHouseRashiId(lagnaLordHouse)]?.part || 'General',
      severity: 'Significant — weakens overall vitality',
      reason: `Lagna lord ${lagnaLord} in house ${lagnaLordHouse} (dusthana) — reduces native's general health & resistance`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. DISEASE SUSCEPTIBILITY ANALYSIS
  // ─────────────────────────────────────────────────────────────
  const diseaseSusceptibility = [];

  // Analyze 6th lord — primary disease indicator
  const lord6 = getHouseLord(6);
  const lord6House = getPlanetHouse(lord6);
  const lord6Diseases = PLANET_DISEASE_MAP[lord6];
  if (lord6Diseases) {
    diseaseSusceptibility.push({
      indicator: `6th Lord (${lord6})`,
      diseases: lord6Diseases.diseases.slice(0, 5),
      chronicRisk: lord6Diseases.chronic,
      bodyParts: lord6Diseases.bodyParts,
      severity: [6, 8, 12].includes(lord6House) ? 'Elevated' : [1, 4, 7, 10].includes(lord6House) ? 'Moderate' : 'Low',
      reason: `${lord6} as 6th lord in house ${lord6House} — the primary disease significator`,
    });
  }

  // Analyze 8th lord — chronic/hidden disease indicator
  const lord8 = getHouseLord(8);
  const lord8House = getPlanetHouse(lord8);
  const lord8Diseases = PLANET_DISEASE_MAP[lord8];
  if (lord8Diseases) {
    diseaseSusceptibility.push({
      indicator: `8th Lord (${lord8})`,
      diseases: lord8Diseases.chronic,
      bodyParts: lord8Diseases.bodyParts,
      severity: [1, 6, 8].includes(lord8House) ? 'High' : 'Moderate',
      reason: `${lord8} as 8th lord in house ${lord8House} — chronic illness & transformation indicator`,
    });
  }

  // Planets in 6th house
  const sixthHousePlanets = houses[5]?.planets || [];
  for (const p of sixthHousePlanets) {
    if (p.name === 'Lagna') continue;
    const pDiseases = PLANET_DISEASE_MAP[p.name];
    if (pDiseases) {
      diseaseSusceptibility.push({
        indicator: `${p.name} in 6th House`,
        diseases: pDiseases.diseases.slice(0, 4),
        bodyParts: pDiseases.bodyParts,
        severity: MALEFICS.includes(p.name) ? 'High' : 'Moderate',
        reason: `${p.name} placed in disease house — activates ${p.name}-related ailments`,
      });
    }
  }

  // Debilitated planets
  const DEBILITATION = { Sun: 7, Moon: 8, Mars: 4, Mercury: 12, Jupiter: 10, Venus: 6, Saturn: 1 };
  for (const [pn, debRashi] of Object.entries(DEBILITATION)) {
    const pk = pn.toLowerCase();
    if (planets[pk]?.rashiId === debRashi) {
      const pDiseases = PLANET_DISEASE_MAP[pn];
      if (pDiseases) {
        diseaseSusceptibility.push({
          indicator: `${pn} Debilitated`,
          diseases: pDiseases.diseases.slice(0, 4),
          bodyParts: pDiseases.bodyParts,
          severity: 'Elevated — debilitation weakens planet\'s protective ability',
          reason: `Debilitated ${pn} in ${RASHIS[debRashi - 1]?.english} — significantly weakens the body parts governed by ${pn}`,
        });
      }
    }
  }

  // Combust planets (too close to Sun)
  const COMBUSTION_ORBS = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  const sunLong = planets.sun?.longitude || 0;
  for (const [pn, orb] of Object.entries(COMBUSTION_ORBS)) {
    const pk = pn.toLowerCase();
    const pLong = planets[pk]?.longitude;
    if (pLong !== undefined) {
      let diff = Math.abs(sunLong - pLong);
      if (diff > 180) diff = 360 - diff;
      if (diff < orb) {
        const pDiseases = PLANET_DISEASE_MAP[pn];
        if (pDiseases) {
          diseaseSusceptibility.push({
            indicator: `${pn} Combust`,
            diseases: pDiseases.diseases.slice(0, 3),
            bodyParts: pDiseases.bodyParts,
            severity: diff < orb / 2 ? 'High (deep combustion)' : 'Moderate',
            reason: `${pn} combust within ${diff.toFixed(1)}° of Sun — planet's significations are burnt/weakened`,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. MARAKA ANALYSIS (Death-Inflicting Planets)
  // ─────────────────────────────────────────────────────────────
  const lord2 = getHouseLord(2);
  const lord7 = getHouseLord(7);
  const lord2House = getPlanetHouse(lord2);
  const lord7House = getPlanetHouse(lord7);

  // 22nd Drekkana Lord (a key Maraka sub-lord)
  // 22nd Drekkana = the rashi of the 8th house Drekkana that the 8th cusp falls in
  // Simplified: sign of (Lagna degree + 7*30 + decanate offset)
  const lagnaExactDeg = lagna.rashi.degree || 0;
  const lagnaAbsDeg = (lagnaRashiId - 1) * 30 + lagnaExactDeg;
  const drek22Deg = (lagnaAbsDeg + 210) % 360; // 22nd Drekkana = lagna + 7 signs + drekkana
  const drek22RashiId = Math.floor(drek22Deg / 30) + 1;
  // Drekkana subdivision (0-10 = 1st, 10-20 = 2nd, 20-30 = 3rd)
  const drek22DegInSign = drek22Deg % 30;
  let drek22SubRashi;
  if (drek22DegInSign < 10) drek22SubRashi = drek22RashiId;
  else if (drek22DegInSign < 20) drek22SubRashi = ((drek22RashiId - 1 + 4) % 12) + 1; // 5th from sign
  else drek22SubRashi = ((drek22RashiId - 1 + 8) % 12) + 1; // 9th from sign
  const drek22Lord = RASHIS[drek22SubRashi - 1]?.lord || 'Unknown';

  // 64th Navamsha Lord
  // 64th Navamsha = Moon's navamsha + 63 = (moonNavamshaIndex + 63) / 108 equivalent
  // Simplified: sign at Moon degree + 7 signs + navamsha offset
  const moon64Deg = (moonSidereal + 210) % 360; // 64th from Moon
  const nav64RashiId = Math.floor(moon64Deg / 30) + 1;
  const nav64DegInSign = moon64Deg % 30;
  const navamshaSize = 30 / 9;
  const nav64SubIdx = Math.floor(nav64DegInSign / navamshaSize);
  // Navamsha starts: Fire signs from Aries, Earth from Cap, Air from Libra, Water from Cancer
  const FIRE_SIGNS = [1, 5, 9]; const EARTH_SIGNS = [2, 6, 10]; const AIR_SIGNS = [3, 7, 11]; const WATER_SIGNS = [4, 8, 12];
  let nav64Start;
  if (FIRE_SIGNS.includes(nav64RashiId)) nav64Start = 1;
  else if (EARTH_SIGNS.includes(nav64RashiId)) nav64Start = 10;
  else if (AIR_SIGNS.includes(nav64RashiId)) nav64Start = 7;
  else nav64Start = 4;
  const nav64NavRashi = ((nav64Start - 1 + nav64SubIdx) % 12) + 1;
  const nav64Lord = RASHIS[nav64NavRashi - 1]?.lord || 'Unknown';

  const marakaAnalysis = {
    title: 'Maraka Analysis (Critical Health Planets)',
    sinhala: 'මාරක විශ්ලේෂණය',
    marakaHouses: [
      { house: 2, lord: lord2, lordHouse: lord2House, note: '2nd house lord is primary Maraka (death-inflicting)' },
      { house: 7, lord: lord7, lordHouse: lord7House, note: '7th house lord is secondary Maraka' },
    ],
    drek22Lord: {
      lord: drek22Lord,
      house: getPlanetHouse(drek22Lord),
      note: '22nd Drekkana lord — triggers chronic disease/crises during its dasha',
    },
    nav64Lord: {
      lord: nav64Lord,
      house: getPlanetHouse(nav64Lord),
      note: '64th Navamsha lord — dangerous during its dasha/transit, especially for Moon-related health',
    },
    dangerousPlanets: [...new Set([lord2, lord7, drek22Lord, nav64Lord])],
    warning: `Dashas or transits of ${lord2}, ${lord7}, ${drek22Lord}, or ${nav64Lord} require health vigilance`,
  };

  // ─────────────────────────────────────────────────────────────
  // 5. HEALTH CRISIS TIMING (Multi-Layer Dasha Scan)
  // ─────────────────────────────────────────────────────────────
  const crisisWindows = [];
  const dangerSet = new Set(marakaAnalysis.dangerousPlanets);

  // Also include lords of 6th, 8th, 12th
  dangerSet.add(getHouseLord(6));
  dangerSet.add(getHouseLord(8));
  dangerSet.add(getHouseLord(12));

  // Planets placed in 6th, 8th, 12th
  for (const h of [6, 8, 12]) {
    for (const p of (houses[h - 1]?.planets || [])) {
      if (p.name !== 'Lagna') dangerSet.add(p.name);
    }
  }

  // Remove 'Unknown'
  dangerSet.delete('Unknown');

  // Build the natural malefic set for bonus scoring
  const naturalMalefics = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu']);

  dasaPeriods.forEach(md => {
    if (!md.antardashas) return;

    md.antardashas.forEach(ad => {
      const adStart = new Date(ad.start);
      const adEnd = new Date(ad.endDate);
      const age = (adStart - date) / (365.25 * 24 * 60 * 60 * 1000);

      let score = 0;
      const reasons = [];
      const diseases = [];
      const mdLord = md.lord;
      const adLord = ad.lord;
      const mdNature = getFunctionalNature(lagnaName, mdLord);
      const adNature = getFunctionalNature(lagnaName, adLord);

      // ── RULE 1: MD/AD lord is a Maraka planet ──
      if (lord2 === mdLord || lord7 === mdLord) {
        score += 18;
        reasons.push(`${mdLord} Mahadasha is Maraka (lord of house ${lord2 === mdLord ? 2 : 7})`);
      }
      if (lord2 === adLord || lord7 === adLord) {
        score += 18;
        reasons.push(`${adLord} Antardasha is Maraka (lord of house ${lord2 === adLord ? 2 : 7})`);
      }

      // ── RULE 2: MD/AD lord is 22nd Drekkana or 64th Navamsha lord ──
      if (mdLord === drek22Lord) {
        score += 14;
        reasons.push(`${mdLord} MD is 22nd Drekkana lord — strong disease trigger`);
      }
      if (adLord === drek22Lord) {
        score += 14;
        reasons.push(`${adLord} AD is 22nd Drekkana lord — strong disease trigger`);
      }
      if (mdLord === nav64Lord) {
        score += 12;
        reasons.push(`${mdLord} MD is 64th Navamsha lord — health vulnerability`);
      }
      if (adLord === nav64Lord) {
        score += 12;
        reasons.push(`${adLord} AD is 64th Navamsha lord — health vulnerability`);
      }

      // ── RULE 3: MD/AD lord rules or occupies 6th/8th/12th ──
      const lord6IsHere = getHouseLord(6);
      const lord8IsHere = getHouseLord(8);
      const lord12IsHere = getHouseLord(12);

      if (mdLord === lord6IsHere) { score += 10; reasons.push(`${mdLord} MD rules 6th house (disease)`); }
      if (mdLord === lord8IsHere) { score += 12; reasons.push(`${mdLord} MD rules 8th house (chronic illness/crisis)`); }
      if (mdLord === lord12IsHere) { score += 8; reasons.push(`${mdLord} MD rules 12th house (hospitalization)`); }
      if (adLord === lord6IsHere) { score += 10; reasons.push(`${adLord} AD rules 6th house (disease)`); }
      if (adLord === lord8IsHere) { score += 12; reasons.push(`${adLord} AD rules 8th house`); }
      if (adLord === lord12IsHere) { score += 8; reasons.push(`${adLord} AD rules 12th house`); }

      // ── RULE 4: MD/AD lord placed in dusthana ──
      const mdH = getPlanetHouse(mdLord);
      const adH = getPlanetHouse(adLord);
      if ([6, 8, 12].includes(mdH)) {
        score += 7;
        reasons.push(`${mdLord} placed in dusthana (house ${mdH})`);
      }
      if (mdLord !== adLord && [6, 8, 12].includes(adH)) {
        score += 7;
        reasons.push(`${adLord} placed in dusthana (house ${adH})`);
      }

      // ── RULE 5: Functional malefic dasha ──
      if (mdNature === 'malefic') { score += 5; reasons.push(`${mdLord} is functional malefic for ${lagnaName} lagna`); }
      if (mdLord !== adLord && adNature === 'malefic') { score += 5; reasons.push(`${adLord} is functional malefic for ${lagnaName} lagna`); }

      // ── RULE 6: Natural malefic dasha on natural malefic = amplified ──
      if (naturalMalefics.has(mdLord) && naturalMalefics.has(adLord)) {
        score += 8;
        reasons.push(`Both MD (${mdLord}) and AD (${adLord}) are natural malefics — amplified health risk`);
      }

      // ── RULE 7: Debilitated MD/AD lord ──
      const mdPKey = mdLord.toLowerCase();
      const adPKey = adLord.toLowerCase();
      if (DEBILITATION[mdLord] && planets[mdPKey]?.rashiId === DEBILITATION[mdLord]) {
        score += 6;
        reasons.push(`${mdLord} is debilitated — weakened protective capacity`);
      }
      if (DEBILITATION[adLord] && planets[adPKey]?.rashiId === DEBILITATION[adLord]) {
        score += 6;
        reasons.push(`${adLord} is debilitated`);
      }

      // ── RULE 8: Transit malefics over natal 1st/6th/8th at midpoint ──
      const midPoint = new Date(adStart.getTime() + (adEnd - adStart) / 2);
      try {
        const tp = getAllPlanetPositions(midPoint);
        const satTransitRashi = tp.saturn?.rashiId || 1;
        const marsTransitRashi = tp.mars?.rashiId || 1;
        const rahuTransitRashi = tp.rahu?.rashiId || 1;

        const satTransitH = ((satTransitRashi - lagnaRashiId + 12) % 12) + 1;
        const marsTransitH = ((marsTransitRashi - lagnaRashiId + 12) % 12) + 1;
        const rahuTransitH = ((rahuTransitRashi - lagnaRashiId + 12) % 12) + 1;

        // Saturn transiting 1st, 6th, 8th, or over natal Moon
        if ([1, 6, 8].includes(satTransitH)) {
          score += 8;
          reasons.push(`Transit Saturn in house ${satTransitH} — health pressure from Saturn`);
        }
        // Check Sade Sati during this period
        const satFromMoon = ((satTransitRashi - moonRashiId + 12) % 12) + 1;
        if ([12, 1, 2].includes(satFromMoon)) {
          score += 6;
          reasons.push('Sade Sati active during this period — emotional and physical drain');
        }

        // Mars transiting 1st, 6th, 8th
        if ([1, 6, 8].includes(marsTransitH)) {
          score += 5;
          reasons.push(`Transit Mars in house ${marsTransitH} — accident/injury risk`);
        }

        // Rahu transiting 1st, 6th, 8th
        if ([1, 6, 8].includes(rahuTransitH)) {
          score += 5;
          reasons.push(`Transit Rahu in house ${rahuTransitH} — mysterious health issues`);
        }

        // Ashtakavarga bindu check — malefic in low-bindu sign = worse
        if (ashtakavarga?.sarvashtakavarga) {
          const satSignName = RASHIS[satTransitRashi - 1]?.name;
          const satBindus = ashtakavarga.sarvashtakavarga[satSignName] || 28;
          if (satBindus < 25 && [1, 6, 8].includes(satTransitH)) {
            score += 4;
            reasons.push(`Saturn transiting weak Ashtakavarga sign (${satBindus} bindus) — intensified malefic effect`);
          }
        }
      } catch (e) { /* transit calc optional */ }

      // ── Collect predicted diseases based on MD/AD lords ──
      if (PLANET_DISEASE_MAP[mdLord]) diseases.push(...PLANET_DISEASE_MAP[mdLord].diseases.slice(0, 3));
      if (PLANET_DISEASE_MAP[adLord]) diseases.push(...PLANET_DISEASE_MAP[adLord].diseases.slice(0, 3));

      // Minimum threshold
      if (score >= 20) {
        const confidence = score >= 60 ? 'Very High' : score >= 45 ? 'High' : score >= 30 ? 'Medium' : 'Low';
        const severity = score >= 55 ? 'Serious' : score >= 40 ? 'Significant' : score >= 25 ? 'Moderate' : 'Mild';

        crisisWindows.push({
          mahadasha: mdLord,
          antardasha: adLord,
          start: ad.start,
          end: ad.endDate,
          ageRange: `${Math.floor(age)}-${Math.ceil(age + (adEnd - adStart) / (365.25 * 24 * 60 * 60 * 1000))}`,
          score,
          confidence,
          severity,
          reasons,
          predictedDiseases: [...new Set(diseases)],
          isMarakaDasha: dangerSet.has(mdLord) || dangerSet.has(adLord),
          preventiveAdvice: generatePreventiveAdvice(mdLord, adLord, score),
        });
      }
    });
  });

  // Sort by score descending
  crisisWindows.sort((a, b) => b.score - a.score);

  // Split into past, current, future
  const now = new Date();
  const currentAge = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
  const futureWindows = crisisWindows.filter(w => new Date(w.end) > now).slice(0, 8);
  const pastWindows = crisisWindows.filter(w => new Date(w.end) <= now).slice(0, 5);
  const currentWindow = crisisWindows.find(w => new Date(w.start) <= now && new Date(w.end) >= now);

  // ─────────────────────────────────────────────────────────────
  // 6. MENTAL HEALTH ASSESSMENT
  // ─────────────────────────────────────────────────────────────
  const moonHouse = getPlanetHouse('Moon');
  const mercuryHouse = getPlanetHouse('Mercury');
  const saturnHouse = getPlanetHouse('Saturn');
  const lord4 = getHouseLord(4);
  const lord4House = getPlanetHouse(lord4);

  const mentalHealthFactors = [];
  let mentalScore = 70; // baseline

  // Moon strength
  const moonStr = planetStrengths.moon?.score || 50;
  if (moonStr >= 70) { mentalScore += 10; mentalHealthFactors.push({ factor: 'Strong Moon', effect: 'positive', detail: 'Good emotional stability and mental resilience' }); }
  else if (moonStr < 40) { mentalScore -= 15; mentalHealthFactors.push({ factor: 'Weak Moon', effect: 'negative', detail: 'Prone to emotional instability, anxiety, mood swings' }); }

  // Moon in dusthana
  if ([6, 8, 12].includes(moonHouse)) {
    mentalScore -= 12;
    mentalHealthFactors.push({ factor: `Moon in house ${moonHouse}`, effect: 'negative', detail: 'Moon in dusthana — emotional turbulence, mental health fluctuations' });
  }

  // Moon-Saturn conjunction or aspect (Vish Yoga)
  if (moonHouse === saturnHouse) {
    mentalScore -= 20;
    mentalHealthFactors.push({ factor: 'Moon-Saturn Conjunction (Vish Yoga)', effect: 'severe', detail: 'Deep emotional suffering, possible depression, childhood difficulties. Most critical mental health indicator.' });
  } else if (saturnHouse) {
    const satToMoon = ((moonHouse - saturnHouse + 12) % 12) + 1;
    if ([3, 7, 10].includes(satToMoon)) {
      mentalScore -= 10;
      mentalHealthFactors.push({ factor: 'Saturn aspects Moon', effect: 'negative', detail: 'Emotional suppression, chronic worry, delayed emotional maturity' });
    }
  }

  // Moon-Rahu conjunction (Grahan Yoga)
  const rahuHouse = getPlanetHouse('Rahu');
  if (moonHouse === rahuHouse) {
    mentalScore -= 15;
    mentalHealthFactors.push({ factor: 'Moon-Rahu Conjunction (Grahan Yoga)', effect: 'severe', detail: 'Mental confusion, phobias, obsessive thoughts, possible psychotic tendencies' });
  }

  // Moon-Ketu conjunction
  const ketuHouse = getPlanetHouse('Ketu');
  if (moonHouse === ketuHouse) {
    mentalScore -= 10;
    mentalHealthFactors.push({ factor: 'Moon-Ketu Conjunction', effect: 'negative', detail: 'Emotional detachment, spiritual crisis, past-life mental karma' });
  }

  // Mercury affliction (nervous disorders)
  const mercStr = planetStrengths.mercury?.score || 50;
  if (mercStr < 40) {
    mentalScore -= 8;
    mentalHealthFactors.push({ factor: 'Weak Mercury', effect: 'negative', detail: 'Nervous anxiety, communication difficulties, learning challenges' });
  }
  if (mercuryHouse === rahuHouse) {
    mentalScore -= 8;
    mentalHealthFactors.push({ factor: 'Mercury-Rahu Conjunction', effect: 'negative', detail: 'Deceptive thinking, OCD tendencies, nervous breakdowns' });
  }

  // 4th house affliction (emotional foundation)
  if ([6, 8, 12].includes(lord4House)) {
    mentalScore -= 8;
    mentalHealthFactors.push({ factor: '4th Lord in Dusthana', effect: 'negative', detail: 'Disrupted emotional foundation, possible domestic instability affecting mental peace' });
  }

  // Kemdrum Yoga check (Moon isolated — no planets in 2nd/12th from Moon)
  if (moonHouse) {
    const house2FromMoon = (moonHouse % 12) + 1;
    const house12FromMoon = ((moonHouse - 2 + 12) % 12) + 1;
    const planetsAdjacent = houses[house2FromMoon - 1]?.planets?.filter(p => p.name !== 'Lagna' && p.name !== 'Rahu' && p.name !== 'Ketu').length || 0;
    const planetsAdjacent2 = houses[house12FromMoon - 1]?.planets?.filter(p => p.name !== 'Lagna' && p.name !== 'Rahu' && p.name !== 'Ketu').length || 0;
    if (planetsAdjacent === 0 && planetsAdjacent2 === 0) {
      mentalScore -= 10;
      mentalHealthFactors.push({ factor: 'Kemdrum Yoga', effect: 'negative', detail: 'Moon isolated — feelings of loneliness, poverty consciousness, emotional insecurity' });
    }
  }

  // Jupiter aspecting Moon (cancels many negatives)
  const jupiterHouse = getPlanetHouse('Jupiter');
  if (jupiterHouse && moonHouse) {
    const jupToMoon = ((moonHouse - jupiterHouse + 12) % 12) + 1;
    if ([1, 5, 7, 9].includes(jupToMoon)) {
      mentalScore += 12;
      mentalHealthFactors.push({ factor: 'Jupiter aspects Moon (Gaja Kesari)', effect: 'protective', detail: 'Jupiter\'s wisdom protects emotional health — resilience and optimism even in difficulty' });
    }
  }

  mentalScore = Math.max(0, Math.min(100, mentalScore));

  const mentalHealth = {
    score: mentalScore,
    quality: mentalScore >= 75 ? 'Strong' : mentalScore >= 55 ? 'Moderate' : mentalScore >= 35 ? 'Vulnerable' : 'At Risk',
    factors: mentalHealthFactors,
    moonStrength: moonStr,
    mercuryStrength: mercStr,
    recommendations: mentalScore < 55 ? [
      'Regular meditation and pranayama practice',
      'Moon remedies: wear Pearl, chant "Om Chandraya Namaha"',
      'Avoid isolation — maintain social connections',
      'Seek professional counseling when needed',
      'Perform Chandra Shanti pooja',
      'Drink milk with honey before bed',
    ] : [
      'Maintain your meditation practice',
      'Moon-day (Monday) fasting or charity supports mental strength',
    ],
  };

  // ─────────────────────────────────────────────────────────────
  // 7. LONGEVITY INDICATORS
  // ─────────────────────────────────────────────────────────────
  // Classical three-pair method: Lagna+8th, Moon+Saturn, Lagna lord+8th lord
  const lord1 = lagnaLord;
  const lord1House = getPlanetHouse(lord1);

  // Categorize each pair
  const categorizePosition = (h1, h2) => {
    // Kendra (1,4,7,10), Panaphara (2,5,8,11), Apoklima (3,6,9,12)
    const isKendra = h => [1, 4, 7, 10].includes(h);
    const isPanaphara = h => [2, 5, 8, 11].includes(h);
    const isApoklima = h => [3, 6, 9, 12].includes(h);

    const k1 = isKendra(h1); const p1 = isPanaphara(h1); const a1 = isApoklima(h1);
    const k2 = isKendra(h2); const p2 = isPanaphara(h2); const a2 = isApoklima(h2);

    if (k1 && k2) return 'Long';
    if (p1 && p2) return 'Medium';
    if (a1 && a2) return 'Short';
    // Mixed
    if ((k1 && p2) || (p1 && k2)) return 'Long';
    if ((k1 && a2) || (a1 && k2)) return 'Medium';
    if ((p1 && a2) || (a1 && p2)) return 'Medium';
    return 'Medium';
  };

  const pair1 = categorizePosition(1, 8); // Lagna and 8th house (always 1 and 8 from lagna)
  const pair2 = categorizePosition(moonHouse || 1, saturnHouse || 1);
  const pair3 = categorizePosition(lord1House || 1, lord8House || 1);

  // Count categories
  const categories = [pair1, pair2, pair3];
  const longCount = categories.filter(c => c === 'Long').length;
  const shortCount = categories.filter(c => c === 'Short').length;

  let longevityClass;
  if (longCount >= 2) longevityClass = 'Long (Deergha Ayus)';
  else if (shortCount >= 2) longevityClass = 'Short (Alpa Ayus) — requires protective remedies';
  else longevityClass = 'Medium (Madhya Ayus)';

  // Boost/reduce based on other factors
  const longevityModifiers = [];
  // Jupiter in Kendra = life protector
  if (jupiterHouse && [1, 4, 7, 10].includes(jupiterHouse)) {
    longevityModifiers.push({ factor: 'Jupiter in Kendra', effect: 'positive', detail: 'Jupiter protects longevity from Kendra position' });
  }
  // Lagna lord strong
  const lord1Str = planetStrengths[lord1.toLowerCase()]?.score || 50;
  if (lord1Str >= 70) {
    longevityModifiers.push({ factor: 'Strong Lagna Lord', effect: 'positive', detail: 'Strong constitution and disease resistance' });
  } else if (lord1Str < 35) {
    longevityModifiers.push({ factor: 'Weak Lagna Lord', effect: 'negative', detail: 'Weakened constitution — more vulnerable to illness' });
  }
  // 8th lord in 8th (Sarala Yoga) = protection
  if (lord8House === 8) {
    longevityModifiers.push({ factor: 'Sarala Yoga (8th Lord in 8th)', effect: 'protective', detail: 'Viparita Raja Yoga — crises convert into gains, natural protection' });
  }

  const longevity = {
    pairAnalysis: {
      lagnaAnd8th: pair1,
      moonAndSaturn: pair2,
      lagnaLordAnd8thLord: pair3,
    },
    classification: longevityClass,
    modifiers: longevityModifiers,
    note: 'Longevity analysis is an indicator of constitutional strength, not a life-span prediction. Modern medicine significantly extends lifespan beyond classical indications.',
  };

  // ─────────────────────────────────────────────────────────────
  // 8. OVERALL HEALTH SCORE
  // ─────────────────────────────────────────────────────────────
  let healthScore = 65; // baseline
  const firstHousePlanets = houses[0]?.planets || [];

  // Lagna lord strength
  if (lord1Str >= 70) healthScore += 10;
  else if (lord1Str < 40) healthScore -= 10;

  // Malefics in 1st house
  const maleficsIn1 = firstHousePlanets.filter(p => MALEFICS.includes(p.name)).length;
  healthScore -= maleficsIn1 * 5;

  // Benefics in 1st house
  const beneficsIn1 = firstHousePlanets.filter(p => ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(p.name)).length;
  healthScore += beneficsIn1 * 4;

  // 6th lord in strong position (fighting disease) vs weak
  if ([3, 6, 10, 11].includes(lord6House)) healthScore += 5; // 6th lord in upachaya = victory over disease
  if ([1, 4, 7].includes(lord6House)) healthScore -= 5; // 6th lord in kendra = disease comes to native

  // Longevity class
  if (longevityClass.includes('Long')) healthScore += 5;
  if (longevityClass.includes('Short')) healthScore -= 8;

  // Mental health contribution
  healthScore += Math.round((mentalScore - 50) * 0.15);

  // Current crisis
  if (currentWindow) healthScore -= Math.min(15, currentWindow.score * 0.2);

  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  const overallHealth = {
    score: healthScore,
    quality: healthScore >= 75 ? 'Strong Constitution' : healthScore >= 55 ? 'Moderate Constitution' : healthScore >= 40 ? 'Vulnerable — preventive care essential' : 'Weak — focused remedial action needed',
    sinhala: healthScore >= 75 ? 'ශක්තිමත් සෞඛ්‍ය ස්වභාවය' : healthScore >= 55 ? 'මධ්‍යම සෞඛ්‍ය ස්වභාවය' : 'දුර්වල — පූර්ව ප්‍රතිකාර අත්‍යවශ්‍යයි',
  };

  // ─────────────────────────────────────────────────────────────
  // 9. CURRENT TRANSIT HEALTH ALERT
  // ─────────────────────────────────────────────────────────────
  let currentTransitAlert = null;
  try {
    const transitPlanets = getAllPlanetPositions(now);
    const alerts = [];

    // Saturn transit check
    const satTransitRashi = transitPlanets.saturn?.rashiId;
    if (satTransitRashi) {
      const satH = ((satTransitRashi - lagnaRashiId + 12) % 12) + 1;
      const satFromMoon = ((satTransitRashi - moonRashiId + 12) % 12) + 1;

      if ([1, 6, 8].includes(satH)) {
        alerts.push({
          planet: 'Saturn',
          house: satH,
          severity: 'High',
          message: `Saturn transiting house ${satH} — health vigilance needed. ${satH === 1 ? 'Overall vitality under pressure' : satH === 6 ? 'Disease resistance being tested' : 'Chronic condition flare-up possible'}`,
        });
      }
      if ([12, 1, 2].includes(satFromMoon)) {
        alerts.push({
          planet: 'Saturn (Sade Sati)',
          phase: satFromMoon === 12 ? 'Rising' : satFromMoon === 1 ? 'Peak' : 'Setting',
          severity: satFromMoon === 1 ? 'High' : 'Moderate',
          message: `Sade Sati ${satFromMoon === 12 ? 'beginning' : satFromMoon === 1 ? 'at peak intensity' : 'in final phase'} — emotional and physical drain. ${satFromMoon === 1 ? 'Maximum pressure period. Prioritize health check-ups.' : 'Maintain health discipline.'}`,
        });
      }
    }

    // Mars transit
    const marsTransitRashi = transitPlanets.mars?.rashiId;
    if (marsTransitRashi) {
      const marsH = ((marsTransitRashi - lagnaRashiId + 12) % 12) + 1;
      if ([1, 6, 8].includes(marsH)) {
        alerts.push({
          planet: 'Mars',
          house: marsH,
          severity: 'Moderate',
          message: `Mars transiting house ${marsH} — ${marsH === 1 ? 'accident risk, blood pressure' : marsH === 6 ? 'inflammation, fever risk' : 'surgical situation possible'}. Drive carefully, avoid confrontation.`,
        });
      }
    }

    // Rahu transit
    const rahuTransitRashi = transitPlanets.rahu?.rashiId;
    if (rahuTransitRashi) {
      const rahuH = ((rahuTransitRashi - lagnaRashiId + 12) % 12) + 1;
      if ([1, 6, 8].includes(rahuH)) {
        alerts.push({
          planet: 'Rahu',
          house: rahuH,
          severity: 'Moderate',
          message: `Rahu transiting house ${rahuH} — unusual health symptoms, misdiagnosis risk. Seek second opinions for medical conditions.`,
        });
      }
    }

    currentTransitAlert = alerts.length > 0 ? { active: true, alerts } : { active: false, message: 'No major malefic transits affecting health houses currently.' };
  } catch (e) {
    currentTransitAlert = { active: false, error: 'Transit calculation unavailable' };
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL COMPILATION
  // ─────────────────────────────────────────────────────────────
  return {
    generatedAt: new Date().toISOString(),
    overallHealth,
    constitution,
    vulnerableBodyParts: vulnerableParts,
    diseaseSusceptibility: diseaseSusceptibility.slice(0, 10),
    marakaAnalysis,
    healthCrisisTiming: {
      totalWindowsFound: crisisWindows.length,
      currentCrisis: currentWindow || null,
      futureWindows,
      pastWindows,
      mostDangerousPeriod: crisisWindows[0] || null,
    },
    mentalHealth,
    longevity,
    currentTransitAlert,
    remedies: generateHealthRemedies(constitution, vulnerableParts, mentalScore, crisisWindows, lagnaName, lagnaLord),
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function generatePreventiveAdvice(mdLord, adLord, score) {
  const advice = [];

  // General
  if (score >= 50) advice.push('Schedule a comprehensive health check-up before this period begins');
  if (score >= 40) advice.push('Maintain regular exercise and balanced diet');
  if (score >= 30) advice.push('Avoid risky activities and unnecessary travel');

  // Planet-specific
  const PLANET_ADVICE = {
    Saturn: ['Protect joints and bones — calcium supplements', 'Avoid cold/damp environments', 'Saturday Shani Shanti pooja', 'Donate black sesame on Saturdays'],
    Mars: ['Drive carefully — accident risk elevated', 'Control blood pressure — check regularly', 'Avoid heated arguments', 'Tuesday Mangal Shanti pooja'],
    Rahu: ['Beware of misdiagnosis — seek multiple opinions', 'Avoid substances (alcohol, drugs)', 'Rahu Shanti pooja on Saturdays', 'Donate to snake/Naga temple'],
    Ketu: ['Watch for viral infections', 'Strengthen immunity with proper nutrition', 'Ketu Shanti pooja', 'Donate blankets/warm clothing'],
    Sun: ['Protect heart and eyes', 'Regular cardiac check-ups', 'Surya Namaskar at sunrise', 'Offer water to Sun'],
    Moon: ['Prioritize mental health', 'Regular sleep schedule essential', 'Chandra Shanti pooja on Mondays', 'Wear Pearl or Moonstone'],
    Mercury: ['Watch nervous system — manage stress', 'Skin care attention', 'Budha Shanti on Wednesdays', 'Donate green items'],
    Jupiter: ['Monitor liver and blood sugar', 'Moderate diet — avoid excess', 'Guru Shanti on Thursdays', 'Donate yellow items'],
    Venus: ['Kidney and reproductive health check', 'Diabetes screening', 'Shukra Shanti on Fridays', 'Donate white items'],
  };

  if (PLANET_ADVICE[mdLord]) advice.push(...PLANET_ADVICE[mdLord].slice(0, 2));
  if (PLANET_ADVICE[adLord] && adLord !== mdLord) advice.push(...PLANET_ADVICE[adLord].slice(0, 2));

  return advice;
}


function generateHealthRemedies(constitution, vulnerableParts, mentalScore, crisisWindows, lagnaName, lagnaLord) {
  const remedies = {
    immediate: [],
    ongoing: [],
    dietary: constitution.diet || [],
    lifestyle: constitution.lifestyle || [],
    mantras: [],
    gemstones: [],
  };

  // Lagna lord gem
  const GEM_MAP = {
    Sun: 'Ruby (මාණික්‍ය) — worn on ring finger, Sunday', Moon: 'Pearl (මුතු) — worn on ring finger, Monday',
    Mars: 'Red Coral (රතු පබළු) — ring finger, Tuesday', Mercury: 'Emerald (මරකත) — little finger, Wednesday',
    Jupiter: 'Yellow Sapphire (පුෂ්පරාග) — index finger, Thursday', Venus: 'Diamond (දියමන්ති) — ring finger, Friday',
    Saturn: 'Blue Sapphire (නිල මැණික) — middle finger, Saturday (use with caution)',
  };

  if (GEM_MAP[lagnaLord]) {
    remedies.gemstones.push({
      primary: GEM_MAP[lagnaLord],
      purpose: 'Strengthen Lagna lord for better health vitality',
      note: 'Always consult an astrologer before wearing gemstones — trial period of 3 days recommended',
    });
  }

  // Mantras based on weak areas
  const MANTRA_MAP = {
    Sun: 'Om Suryaya Namaha (108×, sunrise)', Moon: 'Om Chandraya Namaha (108×, Monday)',
    Mars: 'Om Mangalaya Namaha (108×, Tuesday)', Mercury: 'Om Budhaya Namaha (108×, Wednesday)',
    Jupiter: 'Om Gurave Namaha (108×, Thursday)', Venus: 'Om Shukraya Namaha (108×, Friday)',
    Saturn: 'Om Shanaishcharaya Namaha (108×, Saturday)', Rahu: 'Om Rahave Namaha (108×, Saturday night)',
    Ketu: 'Om Ketave Namaha (108×, Tuesday)', 
  };

  remedies.mantras.push({
    primary: MANTRA_MAP[lagnaLord] || 'Om Dhanvantaraye Namaha (Health Deity)',
    purpose: 'Lagna lord strengthening',
  });

  if (mentalScore < 55) {
    remedies.mantras.push({ primary: 'Om Chandraya Namaha (108×, every Monday)', purpose: 'Mental health & emotional stability' });
    remedies.immediate.push('Start daily meditation — even 10 minutes of breathing practice');
  }

  // Future crisis preparation
  if (crisisWindows.length > 0) {
    const nextCrisis = crisisWindows.find(w => new Date(w.end) > new Date());
    if (nextCrisis) {
      remedies.immediate.push(`Upcoming health-sensitive period: ${nextCrisis.start?.split?.('T')?.[0] || 'N/A'} to ${nextCrisis.end?.split?.('T')?.[0] || 'N/A'} (${nextCrisis.mahadasha}-${nextCrisis.antardasha})`);
      remedies.ongoing.push(`Preventive care for: ${nextCrisis.predictedDiseases?.slice(0, 3).join(', ') || 'general health'}`);
      if (MANTRA_MAP[nextCrisis.mahadasha]) {
        remedies.mantras.push({ primary: MANTRA_MAP[nextCrisis.mahadasha], purpose: `Protection during ${nextCrisis.mahadasha} period` });
      }
    }
  }

  // General health remedies
  remedies.ongoing.push('Annual comprehensive health check-up');
  remedies.ongoing.push(`Ayurvedic Prakriti: ${constitution.type} — follow ${constitution.primary}-balancing regimen`);

  return remedies;
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  analyzeHealth,
  RASHI_BODY_MAP,
  HOUSE_BODY_MAP,
  PLANET_DISEASE_MAP,
  PLANET_DOSHA,
  RASHI_DOSHA,
};
