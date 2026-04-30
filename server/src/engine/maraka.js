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
        { si: '⚕️ සම්පූර්ණ සෞඛ්‍ය පරීක්ෂාවක් කරන්න — ප්‍රමාද නොකරන්න', en: '⚕️ Get a full health checkup — don\'t delay or ignore symptoms' },
        { si: '🛡️ රක්ෂණ coverage (සෞඛ්‍ය + ජීවිත) review කරන්න', en: '🛡️ Review your insurance coverage (health + life) — update if needed' },
        { si: '🚫 මේ කාලය තුළ ලොකු financial risks ගන්න එපා', en: '🚫 Avoid major financial risks during this period — protect what you have' },
        { si: '🧘 Stress management routine එකක් පටන් ගන්න (yoga/meditation)', en: '🧘 Start a stress management routine (yoga, meditation, or therapy)' },
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
        { si: '😴 නින්දේ quality වැඩි කරන්න — screen time අඩු කරන්න, නිතිපතා schedule එකකට', en: '😴 Prioritize sleep quality — reduce screen time before bed, keep a consistent schedule' },
        { si: '⚠️ ඉක්මන් තීරණ ගන්න එපා — 48 පැය rule එක use කරන්න', en: '⚠️ Don\'t make impulsive decisions — use the 48-hour rule before committing' },
        { si: '📵 Misinformation/scams වලින් පරෙස්සම් — verify කරන්න', en: '📵 Be cautious of misinformation/scams — verify everything before acting' },
        { si: '🧘 Anxiety management: breathing exercises/journaling පුරුදු කරන්න', en: '🧘 Manage anxiety: practice breathing exercises or daily journaling' },
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
        { si: '🧭 වෙනස්කම් වලට සූදානම් වෙන්න — flexible plan එකක් තබන්න', en: '🧭 Prepare for unexpected changes — keep a flexible backup plan' },
        { si: '📝 ජීවිත priorities list එකක් ලියන්න — අවශ්‍ය නැති දේ release කරන්න', en: '📝 Write a life priorities list — consciously release what no longer serves you' },
        { si: '🧘 Mindfulness/spiritual practice එකක් පටන් ගන්න — self-reflection time', en: '🧘 Start a mindfulness practice — dedicate time for self-reflection' },
        { si: '🤝 Community/volunteering එකකට සම්බන්ධ වෙන්න — purpose feeling එක ලබන්න', en: '🤝 Join a community or volunteer — find purpose through service to others' },
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

  // Planet-specific practical remedies (globally actionable)
  const planetRemedies = {
    'Sun': { si: '☀️ උදේ 15min හිරු එළිය ගන්න + විටමින් D පරීක්ෂාව', en: '☀️ Get 15min morning sunlight + check Vitamin D levels' },
    'Moon': { si: '🧘 නිතිපතා meditation කරන්න + නින්ද schedule එකකට අනුගත වෙන්න', en: '🧘 Practice daily meditation + maintain a consistent sleep schedule' },
    'Mars': { si: '🏋️ නිතිපතා ව්‍යායාම කරන්න + අධික ආවේගශීලී තීරණ වලින් වළකින්න', en: '🏋️ Exercise regularly + avoid impulsive decisions, pause before reacting' },
    'Mercury': { si: '📝 වැදගත් ගිවිසුම් ප්‍රවේශමෙන් කියවන්න + backup තබන්න', en: '📝 Read contracts carefully + keep backups of important documents & data' },
    'Jupiter': { si: '📚 අලුත් දෙයක් ඉගෙන ගන්න + mentor කෙනෙක් සොයන්න', en: '📚 Invest in learning/upskilling + seek a mentor for guidance' },
    'Venus': { si: '💰 අනවශ්‍ය luxury වියදම් අඩු කරන්න + relationships වලට කාලය දෙන්න', en: '💰 Reduce unnecessary luxury spending + prioritize quality time in relationships' },
    'Saturn': { si: '📋 දිගු කාලීන plan එකක් හදන්න + ඉවසීම පුහුණු කරන්න', en: '📋 Create a long-term plan with milestones + practice patience and discipline' },
    'Ketu': { si: '🧭 Spiritual practice එකක් පටන් ගන්න + attachment අඩු කරන්න', en: '🧭 Start a spiritual/mindfulness practice + learn to detach from outcomes' },
    'Rahu': { si: '⚠️ ඉක්මන් ධනවත් වීමේ schemes වලින් පරෙස්සම් + realistic goals තබන්න', en: '⚠️ Avoid get-rich-quick schemes + set realistic goals, verify before trusting' },
  };

  if (planetRemedies[mdLord]) remedies.push(planetRemedies[mdLord]);
  if (planetRemedies[adLord] && adLord !== mdLord) remedies.push(planetRemedies[adLord]);

  // Universal critical remedies — practical and actionable
  if (severity === 'CRITICAL') {
    remedies.push({ si: '⚕️ සෞඛ්‍ය පරීක්ෂාවක් (full body checkup) කරන්න', en: '⚕️ Schedule a comprehensive health checkup' });
    remedies.push({ si: '📋 ජීවිත රක්ෂණය + හදිසි අරමුදලක් පවත්වාගෙන යන්න', en: '📋 Maintain life insurance + keep 6-month emergency fund' });
    remedies.push({ si: '🚗 අනවශ්‍ය risk-taking (රිය පැදවීම, ආයෝජන) අඩු කරන්න', en: '🚗 Minimize risk-taking — drive carefully, avoid speculative investments' });
  }

  if (severity === 'HIGH') {
    remedies.push({ si: '🛡️ ප්‍රධාන ජීවිත තීරණ (job change, relocation) 3 මාසයක් ප්‍රමාද කරන්න', en: '🛡️ Delay major life decisions (job change, relocation) by 3 months if possible' });
    remedies.push({ si: '🤝 විශ්වාසනීය මිතුරන්/පවුලේ අය ලඟ තබාගන්න', en: '🤝 Keep trusted friends/family close — lean on your support network' });
  }

  return remedies;
}

function getSadeSatiRemedies(phase) {
  const base = [
    { si: '📋 දිගු කාලීන සැලසුම් හදන්න — ඉවසීමෙන් ක්‍රමානුකූලව ගමන් කරන්න', en: '📋 Build long-term plans — progress through patience and consistency' },
    { si: '🏋️ නිතිපතා ව්‍යායාම + නින්ද 7-8 පැය ගන්න', en: '🏋️ Exercise regularly + maintain 7-8 hours of quality sleep' },
    { si: '💰 හදිසි අරමුදලක් (මාස 6ක වියදම්) පවත්වාගෙන යන්න', en: '💰 Maintain a 6-month emergency fund — avoid unnecessary debt' },
    { si: '🧘 දිනපතා 10min meditation/breathing — stress කළමනාකරණය', en: '🧘 10min daily meditation/breathing — active stress management' },
  ];

  if (phase === 'peak') {
    base.push({ si: '⚕️ මාසිකව/කාර්තුවකට වරක් සෞඛ්‍ය පරීක්ෂාව', en: '⚕️ Schedule quarterly health checkups — don\'t ignore symptoms' });
    base.push({ si: '🚫 අනවශ්‍ය ලොකු risk (job quit, big loan) වළකින්න — timing බලන්න', en: '🚫 Avoid major risks (quitting job, big loans) — timing matters, wait if possible' });
    base.push({ si: '🤝 mentor/advisor කෙනෙක් ලඟ තබාගන්න — තනිව තීරණ ගන්න එපා', en: '🤝 Keep a mentor/advisor close — don\'t make big decisions alone' });
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
