/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EVENT TIMING ENGINE — "When Will X Happen?" Prediction System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Predicts timing windows for major life events using the same multi-layer
 * scoring system as marriage timing (Dasha + Transit + Divisional charts).
 *
 * Events covered:
 *   1. Career change / Promotion
 *   2. Wealth arrival / Financial prosperity
 *   3. Childbirth
 *   4. Health crisis periods
 *   5. Foreign travel / Relocation
 *   6. Property purchase
 *   7. Education success
 *   8. Business start / Expansion
 *   9. Accident / Danger periods
 *  10. Debt clearance
 *
 * Based on: BPHS, Phaladeepika, Sarvartha Chintamani, KP principles
 *
 * Author: Nakath AI Engine v4.0
 */

const {
  RASHIS, NAKSHATRAS, FUNCTIONAL_STATUS,
  getAllPlanetPositions, getLagna, buildHouseChart, buildNavamshaChart,
  toSidereal, getMoonLongitude, getSunLongitude,
  calculateVimshottariDetailed, getFunctionalNature,
} = require('./astrology');


// ═══════════════════════════════════════════════════════════════════════════
//  EVENT RULES — Each event has houses, karakas, and scoring config
// ═══════════════════════════════════════════════════════════════════════════

const EVENT_RULES = {
  career: {
    name: 'Career Change / Promotion',
    sinhala: 'වෘත්තීය වෙනසක් / උසස්වීම',
    icon: '💼',
    // Primary houses: 10th (career), 6th (service), 2nd (salary), 11th (gains)
    primaryHouses: [10, 6],
    secondaryHouses: [2, 11],
    // Natural karakas
    karakas: ['Sun', 'Saturn', 'Mercury'],
    // Age window
    ageMin: 18, ageMax: 65,
    // Score weights
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 1 },
    transitHouses: [10, 6, 2, 11], // Jupiter/Saturn touching these = trigger
    description: 'Indicates promotion, job change, new role, or career breakthrough',
  },
  wealth: {
    name: 'Wealth Arrival / Financial Prosperity',
    sinhala: 'ධන සමෘද්ධිය / මූල්‍ය ලාභ',
    icon: '💰',
    primaryHouses: [2, 11],
    secondaryHouses: [5, 9, 10],
    karakas: ['Jupiter', 'Venus'],
    ageMin: 18, ageMax: 70,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 1 },
    transitHouses: [2, 11, 5, 9],
    description: 'Indicates wealth gain, financial windfall, salary increase, or prosperity period',
  },
  children: {
    name: 'Childbirth / Pregnancy',
    sinhala: 'දරු උපත / ගර්භණී',
    icon: '👶',
    primaryHouses: [5, 9],
    secondaryHouses: [2, 11, 7],
    karakas: ['Jupiter'],
    ageMin: 18, ageMax: 45,
    weights: { dashaLordPrimary: 18, dashaLordSecondary: 8, karakaBonus: 12, transit: 1, age: 1.5 },
    transitHouses: [5, 9, 1, 7],
    description: 'Indicates childbirth, pregnancy, or creative fruition',
  },
  healthCrisis: {
    name: 'Health Crisis / Medical Attention',
    sinhala: 'සෞඛ්‍ය අර්බුදය / වෛද්‍ය ප්‍රතිකාර',
    icon: '🏥',
    primaryHouses: [6, 8, 2, 7],   // 2nd & 7th are Maraka houses (critical for health)
    secondaryHouses: [12, 1],
    karakas: ['Saturn', 'Mars', 'Ketu', 'Rahu'],
    ageMin: 0, ageMax: 100,
    weights: { dashaLordPrimary: 18, dashaLordSecondary: 10, karakaBonus: 8, transit: 1.5, age: 0.5 },
    transitHouses: [6, 8, 12, 1, 2, 7],
    description: 'Warning: potential health challenge, surgery, or hospitalization period. For detailed body-part analysis and disease predictions, use the dedicated Health Analysis engine.',
    isDangerEvent: true,
  },
  foreignTravel: {
    name: 'Foreign Travel / Relocation',
    sinhala: 'විදේශ ගමන් / විදේශ පදිංචිය',
    icon: '✈️',
    primaryHouses: [12, 9],
    secondaryHouses: [3, 7],
    karakas: ['Rahu', 'Ketu'],
    ageMin: 16, ageMax: 60,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 12, transit: 1, age: 1 },
    transitHouses: [12, 9, 3, 7],
    description: 'Indicates foreign travel, visa success, or permanent relocation abroad',
  },
  property: {
    name: 'Property Purchase / Land Acquisition',
    sinhala: 'දේපළ මිලදී ගැනීම / ඉඩම් ලබා ගැනීම',
    icon: '🏠',
    primaryHouses: [4, 2],
    secondaryHouses: [11, 10],
    karakas: ['Mars', 'Venus', 'Saturn'],
    ageMin: 22, ageMax: 65,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 1 },
    transitHouses: [4, 2, 11],
    description: 'Indicates property purchase, house construction, or land acquisition',
  },
  education: {
    name: 'Education Success / Academic Achievement',
    sinhala: 'අධ්‍යාපන සාර්ථකත්වය',
    icon: '🎓',
    primaryHouses: [4, 5],
    secondaryHouses: [9, 2],
    karakas: ['Mercury', 'Jupiter'],
    ageMin: 5, ageMax: 40,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 1.5 },
    transitHouses: [4, 5, 9, 2],
    description: 'Indicates exam success, degree completion, or academic breakthrough',
  },
  business: {
    name: 'Business Start / Expansion',
    sinhala: 'ව්‍යාපාර ආරම්භය / ව්‍යාපාර වර්ධනය',
    icon: '🏢',
    primaryHouses: [7, 10],
    secondaryHouses: [3, 11, 2],
    karakas: ['Mercury', 'Jupiter', 'Venus'],
    ageMin: 18, ageMax: 65,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 1 },
    transitHouses: [7, 10, 3, 11],
    description: 'Indicates business launch, expansion, or profitable partnership',
  },
  danger: {
    name: 'Accident / Danger Period',
    sinhala: 'අනතුරු / අවදානම් කාලය',
    icon: '⚠️',
    primaryHouses: [8, 6],
    secondaryHouses: [12, 3],
    karakas: ['Mars', 'Rahu', 'Saturn'],
    ageMin: 0, ageMax: 100,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 8, transit: 1, age: 0.3 },
    transitHouses: [8, 6, 12],
    description: 'Warning: accident-prone or danger period. Drive carefully, avoid risky activities.',
    isDangerEvent: true,
  },
  debtClearance: {
    name: 'Debt Clearance / Financial Relief',
    sinhala: 'ණය නිදහස / මූල්‍ය සහනය',
    icon: '🔓',
    primaryHouses: [6, 11],
    secondaryHouses: [2, 9],
    karakas: ['Jupiter', 'Venus'],
    ageMin: 18, ageMax: 70,
    weights: { dashaLordPrimary: 15, dashaLordSecondary: 8, karakaBonus: 10, transit: 1, age: 0.5 },
    transitHouses: [6, 11, 2, 9],
    description: 'Indicates period when debts clear, financial burdens ease, or relief arrives',
  },
};


// ═══════════════════════════════════════════════════════════════════════════
//  CORE: Predict Event Timing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Predict timing windows for a specific life event
 * @param {string} eventType — key from EVENT_RULES (career, wealth, children, etc.)
 * @param {Object|Date} birthInfo — { year, month, day, hour, minute, latitude, longitude, timezone } or Date
 * @param {number} [lat] — birth latitude (if birthInfo is Date)
 * @param {number} [lng] — birth longitude (if birthInfo is Date)
 * @returns {Object} ranked prediction windows with confidence scores
 */
function predictEventTiming(eventType, birthInfo, lat, lng) {
  const rules = EVENT_RULES[eventType];
  if (!rules) {
    throw new Error(`Unknown event type: ${eventType}. Valid types: ${Object.keys(EVENT_RULES).join(', ')}`);
  }

  // Parse birth info
  let date;
  if (birthInfo instanceof Date) {
    date = birthInfo;
  } else if (typeof birthInfo === 'object' && birthInfo.date instanceof Date) {
    date = birthInfo.date;
    lat = birthInfo.lat || birthInfo.latitude || lat || 6.9271;
    lng = birthInfo.lng || birthInfo.longitude || lng || 79.8612;
  } else if (typeof birthInfo === 'object' && birthInfo.year) {
    const tz = birthInfo.timezone || 5.5;
    date = new Date(Date.UTC(birthInfo.year, birthInfo.month - 1, birthInfo.day,
      birthInfo.hour || 0, birthInfo.minute || 0, birthInfo.second || 0));
    date = new Date(date.getTime() - tz * 60 * 60 * 1000);
    lat = birthInfo.latitude || lat || 6.9271;
    lng = birthInfo.longitude || lng || 79.8612;
  } else {
    date = new Date(birthInfo);
  }
  lat = lat || 6.9271;
  lng = lng || 79.8612;

  // Build natal chart
  const houseChart = buildHouseChart(date, lat, lng);
  const houses = houseChart.houses;
  const planets = houseChart.planets;
  const lagnaName = houseChart.lagna?.rashi?.name || houses[0]?.rashi || 'Mesha';
  const moonSidereal = toSidereal(getMoonLongitude(date), date);
  const dasaPeriods = calculateVimshottariDetailed(moonSidereal, date);
  const natalLagnaRashiId = houseChart.lagna?.rashi?.id || houses[0]?.rashiId || 1;

  // Helper: get planet house
  const getPlanetHouse = (name) => {
    const h = houses.find(h => h.planets.some(p => p.name === name));
    return h ? h.houseNumber : 0;
  };

  // Helper: get house lord
  const getHouseLord = (houseNum) => {
    const h = houses[houseNum - 1];
    if (!h) return 'Unknown';
    return h.rashiLord || RASHIS[(h.rashiId || 1) - 1]?.lord || 'Unknown';
  };

  // Build significator set — planets connected to the event houses
  const significators = new Set();

  // Lords of primary houses
  for (const h of rules.primaryHouses) {
    significators.add(getHouseLord(h));
  }
  // Lords of secondary houses
  for (const h of rules.secondaryHouses) {
    significators.add(getHouseLord(h));
  }
  // Natural karakas
  for (const k of rules.karakas) {
    significators.add(k);
  }
  // Planets sitting in primary houses
  for (const h of rules.primaryHouses) {
    for (const p of (houses[h - 1]?.planets || [])) {
      if (p.name !== 'Lagna') significators.add(p.name);
    }
  }

  // Scan dashas
  const windows = [];

  dasaPeriods.forEach(md => {
    if (!md.antardashas) return;

    md.antardashas.forEach(ad => {
      const adStart = new Date(ad.start);
      const adEnd = new Date(ad.endDate);
      const ageAtStart = (adStart - date) / (365.25 * 24 * 60 * 60 * 1000);
      const ageAtEnd = (adEnd - date) / (365.25 * 24 * 60 * 60 * 1000);

      // Age filter
      if (ageAtEnd < rules.ageMin || ageAtStart > rules.ageMax) return;

      let score = 0;
      const reasons = [];
      const w = rules.weights;

      const mdLord = md.lord;
      const adLord = ad.lord;

      // ── RULE 1: Dasha lord as significator ──
      if (significators.has(mdLord)) {
        score += w.dashaLordPrimary;
        reasons.push(`${mdLord} Mahadasha is event significator`);
      }
      if (significators.has(adLord)) {
        score += w.dashaLordPrimary;
        reasons.push(`${adLord} Antardasha is event significator`);
      }

      // ── RULE 2: Dasha lord is primary house lord ──
      for (const h of rules.primaryHouses) {
        const lord = getHouseLord(h);
        if (mdLord === lord) {
          score += w.dashaLordSecondary;
          reasons.push(`${mdLord} MD rules primary house ${h}`);
        }
        if (adLord === lord) {
          score += w.dashaLordSecondary;
          reasons.push(`${adLord} AD rules primary house ${h}`);
        }
      }

      // ── RULE 3: Dasha lord is a natural karaka ──
      if (rules.karakas.includes(mdLord)) {
        score += w.karakaBonus;
        reasons.push(`${mdLord} MD is natural karaka for ${rules.name}`);
      }
      if (rules.karakas.includes(adLord)) {
        score += w.karakaBonus;
        reasons.push(`${adLord} AD is natural karaka for ${rules.name}`);
      }

      // ── RULE 4: Dasha lord placed in event houses ──
      const mdHouse = getPlanetHouse(mdLord);
      const adHouse = getPlanetHouse(adLord);
      if (rules.primaryHouses.includes(mdHouse)) {
        score += 8;
        reasons.push(`${mdLord} placed in primary house ${mdHouse}`);
      }
      if (rules.primaryHouses.includes(adHouse)) {
        score += 8;
        reasons.push(`${adLord} placed in primary house ${adHouse}`);
      }
      if (rules.secondaryHouses.includes(mdHouse)) {
        score += 4;
        reasons.push(`${mdLord} in supporting house ${mdHouse}`);
      }
      if (rules.secondaryHouses.includes(adHouse)) {
        score += 4;
        reasons.push(`${adLord} in supporting house ${adHouse}`);
      }

      // ── RULE 5: Functional nature ──
      const mdNature = getFunctionalNature(lagnaName, mdLord);
      const adNature = getFunctionalNature(lagnaName, adLord);
      if (!rules.isDangerEvent) {
        // For positive events, benefic dashas score higher
        if (mdNature === 'benefic' || mdNature === 'yogaKaraka') score += 5;
        if (adNature === 'benefic' || adNature === 'yogaKaraka') score += 5;
        if (mdNature === 'malefic') score -= 3;
        if (adNature === 'malefic') score -= 3;
      } else {
        // For danger events, malefic dashas score higher (more likely)
        if (mdNature === 'malefic') score += 5;
        if (adNature === 'malefic') score += 5;
      }

      // ── RULE 6: Transit check (Jupiter/Saturn) ──
      const adDuration = adEnd.getTime() - adStart.getTime();
      const midPoint = new Date(adStart.getTime() + adDuration / 2);
      let transitScore = 0;
      const transitReasons = [];

      try {
        const tp = getAllPlanetPositions(midPoint);
        const jupRashiId = tp.jupiter?.rashiId || 1;
        const satRashiId = tp.saturn?.rashiId || 1;
        const jupH = ((jupRashiId - natalLagnaRashiId + 12) % 12) + 1;
        const satH = ((satRashiId - natalLagnaRashiId + 12) % 12) + 1;

        // Jupiter touching event houses
        for (const eh of rules.transitHouses) {
          const jupTouches = jupH === eh || [5, 7, 9].some(a => ((jupH - 1 + a) % 12) + 1 === eh);
          if (jupTouches) {
            transitScore += 8;
            transitReasons.push(`Jupiter activates house ${eh} — supports ${rules.name}`);
            break;
          }
        }

        // Saturn touching event houses
        for (const eh of rules.transitHouses) {
          const satTouches = satH === eh || [3, 7, 10].some(a => ((satH - 1 + a) % 12) + 1 === eh);
          if (satTouches) {
            transitScore += 6;
            transitReasons.push(`Saturn activates house ${eh}`);
            break;
          }
        }

        // Double transit on primary house
        for (const eh of rules.primaryHouses) {
          const jT = jupH === eh || [5, 7, 9].some(a => ((jupH - 1 + a) % 12) + 1 === eh);
          const sT = satH === eh || [3, 7, 10].some(a => ((satH - 1 + a) % 12) + 1 === eh);
          if (jT && sT) {
            transitScore += 12;
            transitReasons.push(`★ DOUBLE TRANSIT on house ${eh} — strong event trigger`);
            break;
          }
        }
      } catch (e) { /* transit calc optional */ }

      score += transitScore;
      reasons.push(...transitReasons);

      // ── RULE 7: Age suitability ──
      const avgAge = (ageAtStart + ageAtEnd) / 2;
      const ageRange = rules.ageMax - rules.ageMin;
      const ageMid = (rules.ageMin + rules.ageMax) / 2;
      const ageProximity = 1 - Math.abs(avgAge - ageMid) / (ageRange / 2);
      score += Math.round(ageProximity * 10 * w.age);

      // Minimum threshold
      const threshold = rules.isDangerEvent ? 12 : 15;
      if (score >= threshold) {
        windows.push({
          mahadasha: mdLord,
          antardasha: adLord,
          start: ad.start,
          end: ad.endDate,
          ageRange: `${Math.floor(ageAtStart)}-${Math.ceil(ageAtEnd)}`,
          score,
          confidence: score >= 50 ? 'Very High' : score >= 35 ? 'High' : score >= 25 ? 'Medium' : 'Low',
          reasons,
        });
      }
    });
  });

  // Sort
  windows.sort((a, b) => b.score - a.score);

  // Build result
  const top5 = windows.slice(0, 5);
  const now = new Date();
  const futureWindows = windows.filter(w => new Date(w.end) > now).slice(0, 5);
  const pastWindows = windows.filter(w => new Date(w.end) <= now).slice(0, 3);

  return {
    eventType,
    eventName: rules.name,
    eventSinhala: rules.sinhala,
    icon: rules.icon,
    description: rules.description,
    significators: [...significators],
    primaryHouseLords: rules.primaryHouses.map(h => ({ house: h, lord: getHouseLord(h) })),
    totalWindowsFound: windows.length,
    bestWindow: top5[0] || null,
    topWindows: top5,
    futureWindows,
    pastWindows,
    isDangerEvent: rules.isDangerEvent || false,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  PREDICT ALL EVENTS AT ONCE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all event timing predictions for a birth chart
 * Returns a complete life timeline with all predicted events
 */
function predictAllEvents(birthInfo, lat, lng) {
  const results = {};
  const eventTypes = Object.keys(EVENT_RULES);

  for (const eventType of eventTypes) {
    try {
      results[eventType] = predictEventTiming(eventType, birthInfo, lat, lng);
    } catch (e) {
      results[eventType] = { error: e.message };
    }
  }

  // Build unified timeline (next 10 years)
  const now = new Date();
  const tenYearsLater = new Date(now);
  tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10);

  const timeline = [];
  for (const [eventType, result] of Object.entries(results)) {
    if (result.error) continue;
    for (const w of (result.futureWindows || [])) {
      const wStart = new Date(w.start);
      const wEnd = new Date(w.end);
      if (wStart <= tenYearsLater) {
        timeline.push({
          eventType,
          eventName: result.eventName,
          icon: result.icon,
          isDanger: result.isDangerEvent,
          start: w.start,
          end: w.end,
          ageRange: w.ageRange,
          score: w.score,
          confidence: w.confidence,
          dasha: `${w.mahadasha}-${w.antardasha}`,
        });
      }
    }
  }

  // Sort timeline by start date
  timeline.sort((a, b) => new Date(a.start) - new Date(b.start));

  return {
    generatedAt: new Date().toISOString(),
    events: results,
    timeline10Year: timeline,
    summary: {
      totalPredictions: timeline.length,
      highConfidence: timeline.filter(t => t.confidence === 'Very High' || t.confidence === 'High').length,
      dangerPeriods: timeline.filter(t => t.isDanger).length,
      positivePeriods: timeline.filter(t => !t.isDanger).length,
    },
  };
}


// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  EVENT_RULES,
  predictEventTiming,
  predictAllEvents,
};
