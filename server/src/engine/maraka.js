/**
 * Maraka Apala (මාරක අපල) Engine
 * 
 * Calculates dangerous/inauspicious periods (apala) in a person's life
 * based on Vedic astrology principles:
 * 
 * 1. Maraka Dasha Periods — Dashas of 2nd/7th lords (death-inflicting houses)
 * 2. Shani Erashtaka (Saturn's 7.5-year transit / Sade Sati)
 * 3. Rahu-Ketu Transit over natal Moon
 * 4. Ashtama Shani (Saturn transiting 8th from Moon)
 * 5. Dangerous Antardasha combinations (6th/8th lords + Ketu + Maraka lords)
 * 6. Eclipse impacts on natal positions
 * 
 * Each apala has:
 *   - type, severity (CRITICAL / HIGH / MODERATE / LOW)
 *   - exact start/end dates
 *   - Sinhala/English descriptions
 *   - remedies (පරිහාර)
 *   - whether currently active
 */

const {
  getAllPlanetPositions,
  buildHouseChart,
  getLagna,
  calculateVimshottariDetailed,
  getMoonLongitude,
  getNakshatra,
  getRashi,
  toSidereal,
  RASHIS,
} = require('./astrology');

// ═══════════════════════════════════════════════════════════════
// RASHI LORDS (1-indexed by rashiId)
// ═══════════════════════════════════════════════════════════════
const RASHI_LORDS = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury',
  7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
};

// ═══════════════════════════════════════════════════════════════
// SATURN TRANSIT DATA — pre-computed Sidereal ingress dates
// Saturn takes ~2.5 years per sign. These are approximate sidereal ingress dates.
// ═══════════════════════════════════════════════════════════════
function getSaturnRashiAtDate(date) {
  try {
    const positions = getAllPlanetPositions(date);
    return positions.saturn?.rashiId || null;
  } catch (e) { return null; }
}

function getRahuRashiAtDate(date) {
  try {
    const positions = getAllPlanetPositions(date);
    return positions.rahu?.rashiId || null;
  } catch (e) { return null; }
}

// ═══════════════════════════════════════════════════════════════
// CORE: Calculate all Maraka Apala for a birth chart
// ═══════════════════════════════════════════════════════════════
/**
 * Calculate all Maraka Apala (dangerous periods) for a person
 * @param {Date} birthDate — UTC birth date
 * @param {number} lat — latitude
 * @param {number} lng — longitude
 * @param {Object} [options] — { yearsAhead: 5, includeTransits: true }
 * @returns {Object} Full maraka apala analysis
 */
function calculateMarakaApala(birthDate, lat, lng, options = {}) {
  const yearsAhead = options.yearsAhead || 5;
  const now = options.referenceDate || new Date();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + yearsAhead);

  // ── Build natal chart ──
  const planets = getAllPlanetPositions(birthDate);
  const lagna = getLagna(birthDate, lat, lng);
  const lagnaRashiId = lagna?.rashi?.id || 1;
  const houses = buildHouseChart(birthDate, lat, lng);
  const moonLong = getMoonLongitude(birthDate);
  const moonRashi = getRashi(toSidereal(moonLong, birthDate));
  const moonRashiId = moonRashi?.id || 1;

  // House lords
  const getHouseLord = (houseNum) => {
    const rashiId = ((lagnaRashiId - 1 + houseNum - 1) % 12) + 1;
    return RASHI_LORDS[rashiId];
  };

  const lord1 = getHouseLord(1);
  const lord2 = getHouseLord(2);  // Maraka 1
  const lord6 = getHouseLord(6);  // Disease
  const lord7 = getHouseLord(7);  // Maraka 2
  const lord8 = getHouseLord(8);  // Chronic illness / transformation
  const lord12 = getHouseLord(12); // Loss / hospitalization

  // Dasha periods
  const dashas = calculateVimshottariDetailed(toSidereal(moonLong, birthDate), birthDate);

  const apalaList = [];

  // ═══════════════════════════════════════════════════════════
  // 1. MARAKA DASHA PERIODS (2nd/7th lord Mahadashas & Antardashas)
  // ═══════════════════════════════════════════════════════════
  const marakaLords = [lord2, lord7].filter(l => l && l !== lord1);
  const dangerLords = [...new Set([...marakaLords, lord6, lord8, 'Saturn', 'Ketu'])].filter(l => l !== lord1);

  dashas.forEach(md => {
    const mdStart = new Date(md.start);
    const mdEnd = new Date(md.endDate);

    // Skip periods outside our window
    if (mdEnd < now || mdStart > endDate) return;

    const isMDMaraka = marakaLords.includes(md.lord);
    const isMDDanger = dangerLords.includes(md.lord);

    (md.antardashas || []).forEach(ad => {
      const adStart = new Date(ad.start);
      const adEnd = new Date(ad.endDate);

      // Skip periods outside window
      if (adEnd < now || adStart > endDate) return;

      const isADMaraka = marakaLords.includes(ad.lord);
      const isADDanger = dangerLords.includes(ad.lord);

      // CRITICAL: Both MD and AD are maraka lords
      if (isMDMaraka && isADMaraka) {
        apalaList.push({
          type: 'maraka_dasha',
          severity: 'CRITICAL',
          title: `${md.lord}-${ad.lord} මාරක දශා-අන්තර්දශා`,
          titleEn: `${md.lord}-${ad.lord} Maraka Dasha-Antardasha`,
          description: `${md.lord} (${lord2 === md.lord ? '2 වන' : '7 වන'} අධිපති) මහා දශාව + ${ad.lord} (${lord2 === ad.lord ? '2 වන' : '7 වන'} අධිපති) අන්තර්දශාව — ද්විත්ව මාරක බලය ක්‍රියාත්මකයි`,
          descriptionEn: `${md.lord} (${lord2 === md.lord ? '2nd' : '7th'} lord) Mahadasha + ${ad.lord} (${lord2 === ad.lord ? '2nd' : '7th'} lord) Antardasha — double Maraka activation`,
          start: adStart.toISOString(),
          end: adEnd.toISOString(),
          isActive: now >= adStart && now <= adEnd,
          remedies: getMarakaRemedies(md.lord, ad.lord, 'CRITICAL'),
        });
      }
      // HIGH: MD is maraka + AD is other danger lord, or vice versa
      else if ((isMDMaraka && isADDanger) || (isMDDanger && isADMaraka)) {
        const whichMaraka = isMDMaraka ? md.lord : ad.lord;
        const whichDanger = isMDMaraka ? ad.lord : md.lord;
        apalaList.push({
          type: 'maraka_dasha',
          severity: 'HIGH',
          title: `${md.lord}-${ad.lord} භයානක දශා සංයෝජනය`,
          titleEn: `${md.lord}-${ad.lord} Dangerous Dasha Combination`,
          description: `${whichMaraka} මාරක අධිපති + ${whichDanger} ${getDangerRoleSi(whichDanger, lord6, lord8)} — සෞඛ්‍ය/ජීවිත අවදානම`,
          descriptionEn: `${whichMaraka} Maraka lord + ${whichDanger} ${getDangerRoleEn(whichDanger, lord6, lord8)} — health/life risk period`,
          start: adStart.toISOString(),
          end: adEnd.toISOString(),
          isActive: now >= adStart && now <= adEnd,
          remedies: getMarakaRemedies(md.lord, ad.lord, 'HIGH'),
        });
      }
      // MODERATE: Both are danger lords (not maraka specifically)
      else if (isMDDanger && isADDanger) {
        apalaList.push({
          type: 'danger_dasha',
          severity: 'MODERATE',
          title: `${md.lord}-${ad.lord} අපල කාලය`,
          titleEn: `${md.lord}-${ad.lord} Difficult Period`,
          description: `${md.lord} (${getDangerRoleSi(md.lord, lord6, lord8)}) + ${ad.lord} (${getDangerRoleSi(ad.lord, lord6, lord8)}) — සෞඛ්‍යයට අවධානය`,
          descriptionEn: `${md.lord} (${getDangerRoleEn(md.lord, lord6, lord8)}) + ${ad.lord} (${getDangerRoleEn(ad.lord, lord6, lord8)}) — health vigilance required`,
          start: adStart.toISOString(),
          end: adEnd.toISOString(),
          isActive: now >= adStart && now <= adEnd,
          remedies: getMarakaRemedies(md.lord, ad.lord, 'MODERATE'),
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 2. SADE SATI (ශනි එරස්ටක / 7.5 Year Saturn Transit)
  // Saturn transiting 12th, 1st, 2nd from natal Moon sign
  // ═══════════════════════════════════════════════════════════
  const sadeSatiPeriods = calculateSadeSati(moonRashiId, now, endDate);
  sadeSatiPeriods.forEach(period => {
    apalaList.push({
      type: 'sade_sati',
      severity: period.phase === 'peak' ? 'HIGH' : 'MODERATE',
      title: period.phase === 'peak' ? 'ශනි එරස්ටක — උච්ච අවධිය' : `ශනි එරස්ටක — ${period.phase === 'rising' ? 'ආරම්භය' : 'නිමාව'}`,
      titleEn: period.phase === 'peak' ? 'Sade Sati — Peak Phase' : `Sade Sati — ${period.phase === 'rising' ? 'Rising' : 'Setting'} Phase`,
      description: period.phase === 'peak'
        ? `ශනි ඔබේ ජන්ම චන්ද්‍ර රාශියෙන් (${RASHIS[moonRashiId - 1]?.sinhala}) ගමන් කරයි — ජීවිතයේ දරුණුම අපල කාලයයි`
        : `ශනි ඔබේ චන්ද්‍ර රාශියෙන් ${period.phase === 'rising' ? '12 වැනි' : '2 වැනි'} භාවයෙන් ගමන් කරයි`,
      descriptionEn: period.phase === 'peak'
        ? `Saturn transits your natal Moon sign (${RASHIS[moonRashiId - 1]?.english}) — the most challenging phase of Sade Sati`
        : `Saturn transits ${period.phase === 'rising' ? '12th' : '2nd'} from your Moon sign — ${period.phase === 'rising' ? 'beginning' : 'ending'} phase`,
      start: period.start,
      end: period.end,
      isActive: now >= new Date(period.start) && now <= new Date(period.end),
      remedies: getSadeSatiRemedies(period.phase),
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 3. ASHTAMA SHANI (Saturn in 8th from Moon)
  // ═══════════════════════════════════════════════════════════
  const ashtamaRashiId = ((moonRashiId - 1 + 7) % 12) + 1; // 8th from Moon
  const ashtamaPeriods = findTransitPeriods('Saturn', ashtamaRashiId, now, endDate);
  ashtamaPeriods.forEach(period => {
    apalaList.push({
      type: 'ashtama_shani',
      severity: 'HIGH',
      title: 'අෂ්ටම ශනි',
      titleEn: 'Ashtama Shani (Saturn in 8th from Moon)',
      description: `ශනි ඔබේ චන්ද්‍ර රාශියෙන් 8 වැනි භාවයට (${RASHIS[ashtamaRashiId - 1]?.sinhala}) ගමන් කරයි — හදිසි අනතුරු/සෞඛ්‍ය අර්බුද`,
      descriptionEn: `Saturn transits 8th house from Moon (${RASHIS[ashtamaRashiId - 1]?.english}) — sudden crises, health emergencies, transformation`,
      start: period.start,
      end: period.end,
      isActive: now >= new Date(period.start) && now <= new Date(period.end),
      remedies: [
        { si: 'සෙනසුරාදා හනුමාන් ඇදිරිය කියවන්න', en: 'Recite Hanuman Chalisa on Saturdays' },
        { si: 'කළු තල් දන් දෙන්න', en: 'Donate black sesame seeds' },
        { si: 'නිල මැණික් පැළඳීම', en: 'Wear blue sapphire (after consultation)' },
        { si: 'රෝහල්/ගිලන්රථ සේවාවට දායක වන්න', en: 'Contribute to hospital/ambulance services' },
      ],
    });
  });

  // ═══════════════════════════════════════════════════════════
  // 4. RAHU/KETU TRANSIT OVER NATAL MOON
  // ═══════════════════════════════════════════════════════════
  const rahuOnMoon = findTransitPeriods('Rahu', moonRashiId, now, endDate);
  rahuOnMoon.forEach(period => {
    apalaList.push({
      type: 'rahu_transit_moon',
      severity: 'MODERATE',
      title: 'රාහු චන්ද්‍ර ගෝචර',
      titleEn: 'Rahu Transits Natal Moon',
      description: 'රාහු ඔබේ ජන්ම චන්ද්‍ර රාශිය මත ගමන් කරයි — මානසික අසහනය, භ්‍රමණය, නින්ද නැතිවීම',
      descriptionEn: 'Rahu transits your natal Moon sign — mental confusion, anxiety, sleep disturbances, illusions',
      start: period.start,
      end: period.end,
      isActive: now >= new Date(period.start) && now <= new Date(period.end),
      remedies: [
        { si: 'රාහු මන්ත්‍ර ජපනය කරන්න', en: 'Chant Rahu mantra (Om Rahave Namaha)' },
        { si: 'සඳුදා උපවාසය', en: 'Fast on Mondays for Moon strength' },
        { si: 'සුදු ආහාර දන් දෙන්න (කිරි, බත්)', en: 'Donate white foods (milk, rice)' },
      ],
    });
  });

  const ketuOnMoon = findTransitPeriods('Ketu', moonRashiId, now, endDate);
  ketuOnMoon.forEach(period => {
    apalaList.push({
      type: 'ketu_transit_moon',
      severity: 'MODERATE',
      title: 'කේතු චන්ද්‍ර ගෝචර',
      titleEn: 'Ketu Transits Natal Moon',
      description: 'කේතු ඔබේ ජන්ම චන්ද්‍ර රාශිය මත ගමන් කරයි — විරාගය, අනපේක්ෂිත වෙනස්කම්',
      descriptionEn: 'Ketu transits your natal Moon sign — detachment, unexpected changes, spiritual awakening',
      start: period.start,
      end: period.end,
      isActive: now >= new Date(period.start) && now <= new Date(period.end),
      remedies: [
        { si: 'කේතු මන්ත්‍ර ජපනය', en: 'Chant Ketu mantra (Om Ketave Namaha)' },
        { si: 'ගණපති පූජාව', en: 'Perform Ganapati Puja' },
        { si: 'වැඩිහිටි භික්ෂුවකට වස්ත්‍ර දන් දෙන්න', en: 'Donate clothes to elderly monks' },
      ],
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Sort by severity then start date
  // ═══════════════════════════════════════════════════════════
  const severityOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
  apalaList.sort((a, b) => {
    const sev = severityOrder[a.severity] - severityOrder[b.severity];
    if (sev !== 0) return sev;
    return new Date(a.start) - new Date(b.start);
  });

  // Identify currently active apala
  const activeApala = apalaList.filter(a => a.isActive);
  const upcomingApala = apalaList.filter(a => !a.isActive && new Date(a.start) > now)
    .slice(0, 10); // Next 10 upcoming

  // Calculate overall danger level
  const overallDanger = activeApala.some(a => a.severity === 'CRITICAL') ? 'CRITICAL'
    : activeApala.some(a => a.severity === 'HIGH') ? 'HIGH'
    : activeApala.length > 0 ? 'MODERATE' : 'SAFE';

  return {
    status: overallDanger,
    statusSi: overallDanger === 'CRITICAL' ? '⛔ අතිශය භයානක කාලයයි'
      : overallDanger === 'HIGH' ? '🔴 භයානක කාලයයි'
      : overallDanger === 'MODERATE' ? '🟡 සැලකිලිමත් වන්න'
      : '🟢 ආරක්ෂිතයි',
    statusEn: overallDanger === 'CRITICAL' ? '⛔ Extremely dangerous period'
      : overallDanger === 'HIGH' ? '🔴 Dangerous period active'
      : overallDanger === 'MODERATE' ? '🟡 Caution advised'
      : '🟢 Safe — no major apala active',
    activeApala,
    activeCount: activeApala.length,
    upcomingApala,
    allApala: apalaList,
    totalCount: apalaList.length,
    natalInfo: {
      lagnaRashi: RASHIS[lagnaRashiId - 1]?.name,
      moonRashi: RASHIS[moonRashiId - 1]?.name,
      moonRashiSinhala: RASHIS[moonRashiId - 1]?.sinhala,
      marakaLords,
      lord2,
      lord7,
    },
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// SADE SATI Calculator
// Checks Saturn's position relative to Moon sign for each month
// ═══════════════════════════════════════════════════════════════
function calculateSadeSati(moonRashiId, startDate, endDate) {
  const phases = [];
  const rashi12th = ((moonRashiId - 2 + 12) % 12) + 1; // 12th from Moon
  const rashi1st = moonRashiId;                          // Moon sign itself
  const rashi2nd = (moonRashiId % 12) + 1;               // 2nd from Moon

  const phaseMap = {
    [rashi12th]: 'rising',
    [rashi1st]: 'peak',
    [rashi2nd]: 'setting',
  };

  let currentPhase = null;
  let phaseStart = null;

  // Check monthly
  const checkDate = new Date(startDate);
  while (checkDate <= endDate) {
    const satRashi = getSaturnRashiAtDate(checkDate);
    const phase = phaseMap[satRashi] || null;

    if (phase && !currentPhase) {
      currentPhase = phase;
      phaseStart = new Date(checkDate);
    } else if (phase !== currentPhase) {
      if (currentPhase && phaseStart) {
        phases.push({
          phase: currentPhase,
          start: phaseStart.toISOString(),
          end: new Date(checkDate).toISOString(),
        });
      }
      currentPhase = phase;
      phaseStart = phase ? new Date(checkDate) : null;
    }

    checkDate.setMonth(checkDate.getMonth() + 1);
  }

  // Close any open phase
  if (currentPhase && phaseStart) {
    phases.push({
      phase: currentPhase,
      start: phaseStart.toISOString(),
      end: endDate.toISOString(),
    });
  }

  return phases;
}

// ═══════════════════════════════════════════════════════════════
// Transit Period Finder
// Scans month-by-month for when a planet enters a specific rashi
// ═══════════════════════════════════════════════════════════════
function findTransitPeriods(planetName, targetRashiId, startDate, endDate) {
  const periods = [];
  let inTransit = false;
  let transitStart = null;

  const checkDate = new Date(startDate);
  while (checkDate <= endDate) {
    let currentRashiId = null;
    try {
      const positions = getAllPlanetPositions(checkDate);
      const pKey = planetName.toLowerCase();
      currentRashiId = positions[pKey]?.rashiId || null;
    } catch (e) { /* skip */ }

    if (currentRashiId === targetRashiId && !inTransit) {
      inTransit = true;
      transitStart = new Date(checkDate);
    } else if (currentRashiId !== targetRashiId && inTransit) {
      periods.push({
        start: transitStart.toISOString(),
        end: new Date(checkDate).toISOString(),
      });
      inTransit = false;
      transitStart = null;
    }

    checkDate.setMonth(checkDate.getMonth() + 1);
  }

  // Close open transit
  if (inTransit && transitStart) {
    periods.push({
      start: transitStart.toISOString(),
      end: endDate.toISOString(),
    });
  }

  return periods;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS — Danger Role Labels
// ═══════════════════════════════════════════════════════════════
function getDangerRoleSi(lord, lord6, lord8) {
  if (lord === lord6) return '6 වන අධිපති (රෝග)';
  if (lord === lord8) return '8 වන අධිපති (නිදන්)';
  if (lord === 'Saturn') return 'ශනි (දීර්ඝකාලීන)';
  if (lord === 'Ketu') return 'කේතු (හදිසි)';
  return 'මාරක';
}

function getDangerRoleEn(lord, lord6, lord8) {
  if (lord === lord6) return '6th lord (disease)';
  if (lord === lord8) return '8th lord (chronic)';
  if (lord === 'Saturn') return 'Saturn (chronic/karmic)';
  if (lord === 'Ketu') return 'Ketu (sudden/surgical)';
  return 'Maraka';
}

// ═══════════════════════════════════════════════════════════════
// REMEDIES (පරිහාර)
// ═══════════════════════════════════════════════════════════════
function getMarakaRemedies(mdLord, adLord, severity) {
  const remedies = [];

  // Planet-specific remedies
  const planetRemedies = {
    'Sun': { si: 'ඉරිදා උපවාසය + රතු මල් බුද්ධ පූජාව', en: 'Fast on Sundays + offer red flowers at temple' },
    'Moon': { si: 'සඳුදා සුදු ආහාර දන්', en: 'Donate white foods on Mondays' },
    'Mars': { si: 'අඟහරුවාදා හනුමාන් පූජාව', en: 'Hanuman Puja on Tuesdays' },
    'Mercury': { si: 'බදාදා හරිත ආහාර දන්', en: 'Donate green foods on Wednesdays' },
    'Jupiter': { si: 'බ්‍රහස්පතින්දා පිරිත් සවන් දීම', en: 'Listen to Pirith on Thursdays' },
    'Venus': { si: 'සිකුරාදා සුදු වස්ත්‍ර දන්', en: 'Donate white clothes on Fridays' },
    'Saturn': { si: 'සෙනසුරාදා කළු තල් + යකඩ දන්', en: 'Donate black sesame + iron on Saturdays' },
    'Ketu': { si: 'ගණපති පූජාව + රතු වස්ත්‍ර', en: 'Ganapati Puja + donate red/maroon clothes' },
    'Rahu': { si: 'රාහු මන්ත්‍ර ජපනය + නිල් වස්ත්‍ර', en: 'Chant Rahu mantra + donate dark blue clothes' },
  };

  if (planetRemedies[mdLord]) remedies.push(planetRemedies[mdLord]);
  if (planetRemedies[adLord] && adLord !== mdLord) remedies.push(planetRemedies[adLord]);

  // Universal critical remedies
  if (severity === 'CRITICAL') {
    remedies.push({ si: '🙏 බෝධි පූජාව (හැමදාම)', en: '🙏 Bodhi Puja (daily)' });
    remedies.push({ si: '⚕️ නිතිපතා සෞඛ්‍ය පරීක්ෂාව', en: '⚕️ Regular health checkups' });
    remedies.push({ si: '📿 ජීවන රක්ෂණය + දානය', en: '📿 Life insurance + charitable donations' });
  }

  if (severity === 'HIGH') {
    remedies.push({ si: '🛕 නවග්‍රහ ශාන්තිය', en: '🛕 Navagraha Shanthi Puja' });
  }

  return remedies;
}

function getSadeSatiRemedies(phase) {
  const base = [
    { si: 'සෙනසුරාදා උපවාසය', en: 'Fast on Saturdays' },
    { si: 'කළු තල් දන් දෙන්න', en: 'Donate black sesame seeds' },
    { si: 'යකඩ දන් දෙන්න (ශනිට)', en: 'Donate iron items (for Saturn)' },
    { si: 'ශනි මන්ත්‍ර ජපනය', en: 'Chant Saturn mantra (Om Shanaischaraya Namaha)' },
  ];

  if (phase === 'peak') {
    base.push({ si: '🛕 ශනි ග්‍රහ ශාන්තිය (ක්ෂණිකව)', en: '🛕 Saturn Graha Shanthi (urgently recommended)' });
    base.push({ si: '⚕️ මාසිකව සෞඛ්‍ය පරීක්ෂාව', en: '⚕️ Monthly health checkups' });
    base.push({ si: 'බලු සතුන්ට ආහාර දෙන්න', en: 'Feed stray dogs (Saturn\'s animal)' });
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════
// Get currently active apala for a user (for notification checks)
// Lightweight version — only returns active + next upcoming
// ═══════════════════════════════════════════════════════════════
function getActiveMarakaApala(birthDate, lat, lng) {
  return calculateMarakaApala(birthDate, lat, lng, { yearsAhead: 1 });
}

// ═══════════════════════════════════════════════════════════════
// Check if a specific date falls within any apala period
// ═══════════════════════════════════════════════════════════════
function isDateInApala(birthDate, lat, lng, checkDate) {
  const result = calculateMarakaApala(birthDate, lat, lng, {
    yearsAhead: 1,
    referenceDate: checkDate,
  });
  return {
    inApala: result.activeCount > 0,
    status: result.status,
    activeApala: result.activeApala,
  };
}

module.exports = {
  calculateMarakaApala,
  getActiveMarakaApala,
  isDateInApala,
};
