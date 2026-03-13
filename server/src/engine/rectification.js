/**
 * Birth Time Rectification Engine
 * 
 * Calculates the most likely exact birth time by cross-referencing
 * reported life events against Vimshottari Dasha periods and
 * transit signatures across multiple candidate times.
 * 
 * Method: Test birth times at 1-minute intervals within ±30 minutes
 * of the reported time, score each against known life events,
 * and return the time with the highest event correlation.
 */

const {
  getLagna, getAllPlanetPositions, buildHouseChart, toSidereal,
  getMoonLongitude, calculateVimshottariDetailed, getNakshatra,
  getRashi, getAyanamsha, dateToJD, RASHIS
} = require('./astrology');

/**
 * Event types with their astrological signatures
 * Each event maps to houses, planets, and dasha lords that should be active
 */
const EVENT_SIGNATURES = {
  marriage: {
    houses: [7, 2, 11],
    karakas: ['Venus'],
    dashaLords: null, // calculated per chart — 7th lord
    weight: 3,
  },
  firstJob: {
    houses: [10, 6, 2],
    karakas: ['Saturn', 'Sun'],
    dashaLords: null, // 10th lord
    weight: 2,
  },
  firstChild: {
    houses: [5, 9],
    karakas: ['Jupiter'],
    dashaLords: null, // 5th lord
    weight: 3,
  },
  majorIllness: {
    houses: [6, 8, 12],
    karakas: ['Saturn', 'Mars'],
    dashaLords: null, // 6th/8th lord
    weight: 2,
  },
  accident: {
    houses: [8, 6, 12],
    karakas: ['Mars', 'Rahu'],
    dashaLords: null,
    weight: 2,
  },
  foreignTravel: {
    houses: [12, 9, 3],
    karakas: ['Rahu', 'Ketu'],
    dashaLords: null, // 12th lord
    weight: 1.5,
  },
  education: {
    houses: [4, 5, 9],
    karakas: ['Jupiter', 'Mercury'],
    dashaLords: null,
    weight: 1.5,
  },
  fatherDeath: {
    houses: [9, 10],
    karakas: ['Sun', 'Saturn'],
    dashaLords: null,
    weight: 3,
  },
  motherDeath: {
    houses: [4],
    karakas: ['Moon', 'Saturn'],
    dashaLords: null,
    weight: 3,
  },
  propertyPurchase: {
    houses: [4, 2],
    karakas: ['Mars', 'Venus'],
    dashaLords: null,
    weight: 1.5,
  },
  promotion: {
    houses: [10, 11, 9],
    karakas: ['Sun', 'Jupiter'],
    dashaLords: null,
    weight: 1.5,
  },
  divorce: {
    houses: [7, 6, 12],
    karakas: ['Mars', 'Saturn', 'Rahu'],
    dashaLords: null,
    weight: 2.5,
  },
  majorFinancialGain: {
    houses: [2, 11, 5],
    karakas: ['Jupiter', 'Venus'],
    dashaLords: null,
    weight: 2,
  },
  majorFinancialLoss: {
    houses: [12, 8, 6],
    karakas: ['Saturn', 'Rahu'],
    dashaLords: null,
    weight: 2,
  },
};

/**
 * Get the Rashi lord (ruler) for a given Rashi ID (1-12)
 */
function getRashiLord(rashiId) {
  const lords = {
    1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon',
    5: 'Sun', 6: 'Mercury', 7: 'Venus', 8: 'Mars',
    9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
  };
  return lords[rashiId] || 'Unknown';
}

/**
 * Get house lord for a specific house number given the Lagna rashi
 */
function getHouseLordForLagna(houseNumber, lagnaRashiId) {
  const rashiId = ((lagnaRashiId - 1 + houseNumber - 1) % 12) + 1;
  return getRashiLord(rashiId);
}

/**
 * Find which dasha/antardasha was running at a specific date
 * Returns { mahadasha, antardasha } lords
 */
function findDashaAtDate(dasaPeriods, eventDate) {
  const eventTime = eventDate.getTime();
  
  for (const period of dasaPeriods) {
    const periodStart = new Date(period.start).getTime();
    const periodEnd = new Date(period.endDate).getTime();
    
    if (eventTime >= periodStart && eventTime <= periodEnd) {
      // Found the mahadasha — now find antardasha if available
      let antardashaLord = null;
      if (period.subPeriods) {
        for (const sub of period.subPeriods) {
          const subStart = new Date(sub.start).getTime();
          const subEnd = new Date(sub.endDate).getTime();
          if (eventTime >= subStart && eventTime <= subEnd) {
            antardashaLord = sub.lord;
            break;
          }
        }
      }
      return {
        mahadasha: period.lord,
        antardasha: antardashaLord,
      };
    }
  }
  return null;
}

/**
 * Score a single event against a candidate chart
 * Higher score = better match
 */
function scoreEvent(event, houseChart, dasaPeriods, lagnaRashiId) {
  const signature = EVENT_SIGNATURES[event.type];
  if (!signature) return 0;

  let score = 0;
  const eventDate = new Date(event.date);
  
  // 1. Check if relevant dasha lord was running at event time
  const activeDasha = findDashaAtDate(dasaPeriods, eventDate);
  if (activeDasha) {
    // Get the house lords for the event's relevant houses
    const relevantLords = signature.houses.map(h => getHouseLordForLagna(h, lagnaRashiId));
    
    // Mahadasha lord match (strongest indicator)
    if (relevantLords.includes(activeDasha.mahadasha)) {
      score += 4;
    }
    // Karaka planet as dasha lord
    if (signature.karakas.includes(activeDasha.mahadasha)) {
      score += 2;
    }
    // Antardasha lord match
    if (activeDasha.antardasha) {
      if (relevantLords.includes(activeDasha.antardasha)) {
        score += 3;
      }
      if (signature.karakas.includes(activeDasha.antardasha)) {
        score += 1.5;
      }
    }
  }
  
  // 2. Check transit positions at event time
  try {
    const transitPositions = getAllPlanetPositions(eventDate);
    const getTransitHouse = (transitRashiId) => {
      return ((transitRashiId - lagnaRashiId + 12) % 12) + 1;
    };
    
    // Jupiter transit through relevant houses
    const jupiterHouse = getTransitHouse(transitPositions.jupiter.rashiId);
    if (signature.houses.includes(jupiterHouse)) {
      score += 2;
    }
    
    // Saturn transit through relevant houses
    const saturnHouse = getTransitHouse(transitPositions.saturn.rashiId);
    if (signature.houses.includes(saturnHouse)) {
      score += 1.5;
    }
    
    // Rahu/Ketu axis through relevant houses
    const rahuHouse = getTransitHouse(transitPositions.rahu.rashiId);
    if (signature.houses.includes(rahuHouse)) {
      score += 1;
    }
  } catch (e) {
    // Transit calculation failed — skip transit scoring
  }
  
  return score * signature.weight;
}

/**
 * Main rectification function
 * 
 * @param {string} reportedBirthDate - ISO date string with approximate birth time
 * @param {number} lat - Birth latitude
 * @param {number} lng - Birth longitude
 * @param {Array} lifeEvents - Array of { type: string, date: string, description?: string }
 * @param {number} searchRangeMinutes - How far ± to search from reported time (default 30)
 * @param {number} stepMinutes - Step size in minutes (default 1)
 * @returns {Object} Rectification result
 */
function rectifyBirthTime(reportedBirthDate, lat, lng, lifeEvents, searchRangeMinutes = 30, stepMinutes = 1) {
  if (!lifeEvents || lifeEvents.length === 0) {
    throw new Error('At least one life event is required for rectification');
  }
  
  // Validate events
  const validEvents = lifeEvents.filter(e => {
    if (!EVENT_SIGNATURES[e.type]) {
      console.warn(`[Rectification] Unknown event type: ${e.type}`);
      return false;
    }
    if (!e.date || isNaN(new Date(e.date).getTime())) {
      console.warn(`[Rectification] Invalid date for event: ${e.type}`);
      return false;
    }
    return true;
  });
  
  if (validEvents.length === 0) {
    throw new Error('No valid life events provided');
  }
  
  const reportedDate = new Date(reportedBirthDate);
  const reportedTime = reportedDate.getTime();
  const candidates = [];
  
  // Calculate total steps
  const totalSteps = Math.floor((searchRangeMinutes * 2) / stepMinutes) + 1;
  console.log(`[Rectification] Testing ${totalSteps} candidate times (±${searchRangeMinutes} min, step ${stepMinutes} min) against ${validEvents.length} events`);
  
  for (let offset = -searchRangeMinutes; offset <= searchRangeMinutes; offset += stepMinutes) {
    const candidateDate = new Date(reportedTime + offset * 60 * 1000);
    
    try {
      // Build chart for this candidate time
      const moonSid = toSidereal(getMoonLongitude(candidateDate), candidateDate);
      const houseChart = buildHouseChart(candidateDate, lat, lng);
      const lagnaRashiId = houseChart.lagna?.rashi?.id || 1;
      const dasaPeriods = calculateVimshottariDetailed(moonSid, candidateDate);
      
      // Score ALL events against this chart
      let totalScore = 0;
      const eventScores = [];
      
      for (const event of validEvents) {
        const eventScore = scoreEvent(event, houseChart, dasaPeriods, lagnaRashiId);
        totalScore += eventScore;
        eventScores.push({
          type: event.type,
          date: event.date,
          score: eventScore,
        });
      }
      
      const lagnaSign = houseChart.lagna?.rashi?.english || 'Unknown';
      const lagnaDegree = (houseChart.lagna?.sidereal % 30)?.toFixed(2) || '0';
      const nakshatra = getNakshatra(moonSid);
      
      candidates.push({
        time: candidateDate.toISOString(),
        offsetMinutes: offset,
        lagnaSign,
        lagnaDegree: parseFloat(lagnaDegree),
        nakshatra: nakshatra.name,
        nakshatraPada: nakshatra.pada,
        totalScore,
        eventScores,
      });
    } catch (e) {
      // Skip this candidate if chart building fails
    }
  }
  
  if (candidates.length === 0) {
    throw new Error('Could not compute any candidate charts');
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.totalScore - a.totalScore);
  
  // Best candidate
  const best = candidates[0];
  const reported = candidates.find(c => c.offsetMinutes === 0);
  
  // Find all candidates with the same lagna as the best
  const sameLagnaCandidates = candidates.filter(c => c.lagnaSign === best.lagnaSign);
  const lagnaRange = {
    earliest: sameLagnaCandidates[sameLagnaCandidates.length - 1]?.time,
    latest: sameLagnaCandidates[0]?.time,
  };
  
  // Check if lagna changed from reported time
  const lagnaChanged = reported && reported.lagnaSign !== best.lagnaSign;
  
  // Top 5 candidates for transparency
  const topCandidates = candidates.slice(0, 5).map(c => ({
    time: c.time,
    offsetMinutes: c.offsetMinutes,
    lagnaSign: c.lagnaSign,
    lagnaDegree: c.lagnaDegree,
    score: c.totalScore,
    confidence: Math.round((c.totalScore / candidates[0].totalScore) * 100),
  }));
  
  // Confidence assessment
  const scoreDiff = candidates.length > 1 ? (best.totalScore - candidates[1].totalScore) / best.totalScore : 1;
  let confidence;
  if (validEvents.length >= 5 && scoreDiff > 0.15) confidence = 'high';
  else if (validEvents.length >= 3 && scoreDiff > 0.08) confidence = 'medium';
  else confidence = 'low';
  
  // Compute SLT (Sri Lanka Time) for display
  const bestDate = new Date(best.time);
  const sltOffset = 5.5 * 60; // minutes
  const sltMin = bestDate.getUTCHours() * 60 + bestDate.getUTCMinutes() + sltOffset;
  const sltH = Math.floor((sltMin / 60) % 24);
  const sltM = Math.floor(sltMin % 60);
  const rectifiedTimeSLT = `${String(sltH).padStart(2, '0')}:${String(sltM).padStart(2, '0')}`;
  
  const reportedSltMin = reportedDate.getUTCHours() * 60 + reportedDate.getUTCMinutes() + sltOffset;
  const rSltH = Math.floor((reportedSltMin / 60) % 24);
  const rSltM = Math.floor(reportedSltMin % 60);
  const reportedTimeSLT = `${String(rSltH).padStart(2, '0')}:${String(rSltM).padStart(2, '0')}`;
  
  return {
    reported: {
      time: reportedBirthDate,
      timeSLT: reportedTimeSLT,
      lagnaSign: reported?.lagnaSign || 'Unknown',
      lagnaDegree: reported?.lagnaDegree || 0,
      score: reported?.totalScore || 0,
    },
    rectified: {
      time: best.time,
      timeSLT: rectifiedTimeSLT,
      offsetMinutes: best.offsetMinutes,
      lagnaSign: best.lagnaSign,
      lagnaDegree: best.lagnaDegree,
      nakshatra: best.nakshatra,
      nakshatraPada: best.nakshatraPada,
      score: best.totalScore,
    },
    lagnaChanged,
    confidence,
    eventsUsed: validEvents.length,
    candidatesTested: candidates.length,
    topCandidates,
    eventBreakdown: best.eventScores,
    recommendation: confidence === 'high'
      ? `Strong confidence in rectified time ${rectifiedTimeSLT} SLT. The ${best.lagnaSign} rising sign at ${best.lagnaDegree}° produces the best correlation with your life events.`
      : confidence === 'medium'
        ? `Moderate confidence in rectified time ${rectifiedTimeSLT} SLT. Adding more life events would improve accuracy.`
        : `Low confidence — only ${validEvents.length} event(s) provided. Please add at least 3-5 major life events for reliable rectification.`,
  };
}

/**
 * Get list of supported event types for the UI
 */
function getSupportedEventTypes() {
  return Object.entries(EVENT_SIGNATURES).map(([key, sig]) => ({
    type: key,
    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    weight: sig.weight,
    description: getEventDescription(key),
  }));
}

function getEventDescription(type) {
  const descriptions = {
    marriage: 'Date of marriage ceremony',
    firstJob: 'Date you started your first job or career',
    firstChild: 'Birth date of your first child',
    majorIllness: 'Date of a major illness, surgery, or hospitalization',
    accident: 'Date of a significant accident or injury',
    foreignTravel: 'Date of first major trip abroad or migration',
    education: 'Date of a major academic achievement (graduation, etc.)',
    fatherDeath: 'Date of father\'s passing',
    motherDeath: 'Date of mother\'s passing',
    propertyPurchase: 'Date of buying a house or significant property',
    promotion: 'Date of a major job promotion or career breakthrough',
    divorce: 'Date of divorce or separation',
    majorFinancialGain: 'Date of a major financial windfall (lottery, inheritance, business success)',
    majorFinancialLoss: 'Date of a major financial loss (bankruptcy, theft, major loss)',
  };
  return descriptions[type] || '';
}

module.exports = {
  rectifyBirthTime,
  getSupportedEventTypes,
  EVENT_SIGNATURES,
};
