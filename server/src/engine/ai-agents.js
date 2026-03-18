/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MULTI-AGENT AI ARCHITECTURE for Vedic Astrology Predictions
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Instead of a single monolithic LLM prompt, this system uses specialized
 * AI agents that each focus on one aspect of the chart:
 *
 *   1. Chart Analyzer Agent — Interprets planetary configurations and houses
 *   2. Transit Timer Agent  — Correlates Dasha + transit windows for timing
 *   3. Yoga Identifier Agent — Detects, grades, and explains yogas
 *   4. Remedial Agent        — Suggests gems, mantras, donations, rituals
 *   5. Synthesis Agent       — Combines all agent outputs into coherent prediction
 *
 * Each agent receives only the data it needs, produces a focused analysis,
 * and the Synthesis Agent weaves everything into a unified narrative.
 */

const { getAllPlanetPositions, getLagna, buildHouseChart, buildNavamshaChart,
  calculateDrishtis, detectYogas, getPlanetStrengths, getPanchanga,
  calculateVimshottariDetailed, toSidereal, getMoonLongitude, RASHIS,
} = require('./astrology');

const { detectDoshas, detectAdvancedYogas, calculateJaiminiKarakas,
  calculateShadbala, calculateIshtaKashta, getShadbalaWeightsForDasha,
  buildExtendedVargas, generateAdvancedAnalysis,
} = require('./advanced');

const { calculateYoginiDasha, calculateCharaDasha, crossValidateDashas } = require('./dasha');
const { predictAllEvents, getKPChartAnalysis } = require('./kp');
const { getEnhancedTransits } = require('./transit');

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 1: CHART ANALYZER
// ═══════════════════════════════════════════════════════════════════════════

function buildChartAnalyzerContext(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const planets = getAllPlanetPositions(date, lat, lng);
  const lagna = getLagna(date, lat, lng);
  const houseChart = buildHouseChart(date, lat, lng);
  const navamsha = buildNavamshaChart(date, lat, lng);
  const drishtis = calculateDrishtis(houseChart.houses);
  const shadbala = calculateShadbala(date, lat, lng);
  const ishtaKashta = calculateIshtaKashta(date, lat, lng);
  const jaimini = calculateJaiminiKarakas(date, lat, lng);

  let vargas = null;
  try { vargas = buildExtendedVargas(date, lat, lng); } catch (_) {}

  return {
    agent: 'chart_analyzer',
    systemPrompt: `You are an expert Vedic astrologer analyzing a birth chart (Kundali). 
Focus on: planetary dignities, house lordships, key configurations, 
strongest/weakest planets, and the overall life themes indicated by this chart.
Be specific — reference exact degrees, houses, and sign placements.
Use Shadbala and Ishta/Kashta Phala to assess which planets can deliver results.`,
    data: {
      lagna: { sign: lagna.rashi.english, degree: lagna.sidereal.toFixed(2) },
      planets: formatPlanets(planets, shadbala, ishtaKashta),
      houses: houseChart.houses.map(h => ({
        house: h.houseNumber,
        sign: h.rashiEnglish,
        lord: h.rashiLord,
        planets: h.planets.map(p => p.name),
      })),
      navamsha: navamsha.houses ? navamsha.houses.map(h => ({
        house: h.houseNumber, sign: h.rashiEnglish || h.rashi,
        planets: h.planets.map(p => p.name),
      })) : [],
      aspects: Object.entries(drishtis.planetAspects || {}).map(([p, d]) => ({
        planet: p, from: d.fromHouse,
        targets: d.details.map(t => ({ house: t.house, type: t.type })),
      })),
      jaimini: {
        atmakaraka: jaimini.atmakaraka?.planet,
        amatyakaraka: jaimini.amatyakaraka?.planet,
      },
      vargaStrengths: vargas?._vargaVisheshaBala || null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 2: TRANSIT TIMER
// ═══════════════════════════════════════════════════════════════════════════

function buildTransitTimerContext(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const moonSid = toSidereal(getMoonLongitude(date), date);
  const dashas = calculateVimshottariDetailed(moonSid, date);
  const shadbalaWeights = getShadbalaWeightsForDasha(date, lat, lng);

  const yoginiDasha = calculateYoginiDasha(moonSid, date);
  const charaDasha = calculateCharaDasha(date, lat, lng);

  // Current period cross-validation
  const crossVal = crossValidateDashas(date, lat, lng, new Date(), dashas);

  // Current transits
  let transits = null;
  try { transits = getEnhancedTransits(null, birthDate, lat, lng); } catch (_) {}

  return {
    agent: 'transit_timer',
    systemPrompt: `You are a Vedic timing specialist. Analyze the Dasha periods (Vimshottari, 
Yogini, Chara) and current transits to identify:
1. What life themes are active NOW (current Mahadasha/Antardasha)
2. When key events are most likely (upcoming period transitions)
3. Transit triggers that activate Dasha promises
4. Shadbala weights indicate how effectively each Dasha lord delivers results.
Be precise about dates and timing windows.`,
    data: {
      vimshottari: dashas.slice(0, 5).map(d => ({
        lord: d.lord, start: d.start, end: d.endDate, years: d.years,
        weight: shadbalaWeights[d.lord] || 1.0,
      })),
      yogini: yoginiDasha.dashas.slice(0, 8).map(d => ({
        lord: d.lord, planet: d.planet, years: d.actualYears || d.years,
        start: d.start, end: d.end,
      })),
      chara: charaDasha.dashas.slice(0, 6).map(d => ({
        sign: d.signEnglish, years: d.years, start: d.start, end: d.end,
      })),
      crossValidation: {
        confidence: crossVal.confidenceScore,
        activePeriods: crossVal.activePeriods,
      },
      transits: transits ? {
        compositeScore: transits.compositeAshtakavargaScore,
        label: transits.compositeLabel,
        doubleTransits: transits.doubleTransits,
        dashaSynergy: transits.dashaSynergy,
      } : null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 3: YOGA IDENTIFIER
// ═══════════════════════════════════════════════════════════════════════════

function buildYogaIdentifierContext(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const classicalYogas = detectYogas(date, lat, lng);

  let advanced = null;
  try {
    const adv = generateAdvancedAnalysis(date, lat, lng);
    advanced = {
      doshas: adv.tier1?.doshas?.items || [],
      advancedYogas: adv.tier1?.advancedYogas?.items || [],
    };
  } catch (_) {}

  return {
    agent: 'yoga_identifier',
    systemPrompt: `You are a yoga (planetary combination) specialist in Vedic astrology.
Analyze the detected yogas and doshas. For each:
1. Explain what it means for the native's life
2. Rate its strength (how completely formed it is)
3. Identify any cancellations (Bhanga) or enhancements
4. Predict which life areas and timeframes will be most affected.
Prioritize the most impactful yogas.`,
    data: {
      classicalYogas: classicalYogas.map(y => ({
        name: y.name, strength: y.strength, description: y.description,
      })),
      doshas: advanced?.doshas?.map(d => ({
        name: d.name, severity: d.severity, cancelled: d.cancelled, description: d.description,
      })) || [],
      advancedYogas: advanced?.advancedYogas?.map(y => ({
        name: y.name, category: y.category, strength: y.strength, planets: y.planets,
      })) || [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 4: REMEDIAL ADVISOR
// ═══════════════════════════════════════════════════════════════════════════

function buildRemedialContext(birthDate, lat, lng) {
  const date = new Date(birthDate);
  const planets = getAllPlanetPositions(date, lat, lng);
  const shadbala = calculateShadbala(date, lat, lng);
  const ishtaKashta = calculateIshtaKashta(date, lat, lng);

  // Find weak planets that need remedies
  const weakPlanets = [];
  for (const [key, sb] of Object.entries(shadbala)) {
    if (sb.percentage < 40 || (ishtaKashta[key] && ishtaKashta[key].netBenefic < -5)) {
      weakPlanets.push({
        planet: sb.name,
        strength: sb.percentage,
        tendency: ishtaKashta[key]?.tendency || 'unknown',
        house: sb.house,
        rashi: sb.rashi,
      });
    }
  }

  // KP event predictions to know what to focus remedies on
  let kpPredictions = null;
  try { kpPredictions = predictAllEvents(date, lat, lng); } catch (_) {}

  return {
    agent: 'remedial_advisor',
    systemPrompt: `You are a Vedic astrology remedial specialist. Based on weak planets and 
challenging configurations, suggest specific, actionable remedies:
1. Gemstones (with finger, metal, and weight recommendations)
2. Mantras (with counts and timing)
3. Charitable donations (what, when, to whom)
4. Fasting days and rituals
5. Behavioral/lifestyle changes
Be practical and culturally sensitive for a Sri Lankan audience.`,
    data: {
      weakPlanets,
      eventPredictions: kpPredictions ? Object.entries(kpPredictions)
        .filter(([_, v]) => v.prediction === 'NO' || v.confidence < 60)
        .map(([event, v]) => ({ event, prediction: v.prediction, confidence: v.confidence }))
        : [],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT 5: SYNTHESIS — Combines all agent outputs
// ═══════════════════════════════════════════════════════════════════════════

function buildSynthesisPrompt(agentOutputs, language = 'en') {
  const langInstruction = language === 'si'
    ? 'Write the final report in Sinhala (සිංහල). Use traditional Vedic terminology in Sinhala.'
    : 'Write the final report in clear, accessible English.';

  return {
    agent: 'synthesis',
    systemPrompt: `You are the master Vedic astrologer synthesizing analyses from four specialist agents.
Weave their findings into a cohesive, compelling life reading that:
1. Opens with the most defining feature of this chart
2. Organizes insights by life theme (career, relationships, health, wealth, spirituality)
3. Provides a clear timeline of upcoming opportunities and challenges
4. Ends with prioritized remedies and actionable advice
5. Uses a warm, wise, yet authoritative tone
${langInstruction}
Do NOT fabricate data — only use what the specialist agents provided.`,
    agentOutputs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MASTER PIPELINE — Runs all agents and returns structured context
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate the complete multi-agent context for AI report generation.
 * This replaces the monolithic prompt approach. Each agent context can be
 * sent to the LLM independently or composed into a synthesis prompt.
 *
 * @param {string|Date} birthDate
 * @param {number} lat
 * @param {number} lng
 * @param {string} language
 * @returns {object} All agent contexts ready for LLM processing
 */
function generateMultiAgentContext(birthDate, lat = 6.9271, lng = 79.8612, language = 'en') {
  const chartAnalyzer = buildChartAnalyzerContext(birthDate, lat, lng);
  const transitTimer = buildTransitTimerContext(birthDate, lat, lng);
  const yogaIdentifier = buildYogaIdentifierContext(birthDate, lat, lng);
  const remedialAdvisor = buildRemedialContext(birthDate, lat, lng);

  return {
    agents: {
      chartAnalyzer,
      transitTimer,
      yogaIdentifier,
      remedialAdvisor,
    },
    buildSynthesisPrompt: (agentOutputs) => buildSynthesisPrompt(agentOutputs, language),
    metadata: {
      birthDate: new Date(birthDate).toISOString(),
      lat, lng, language,
      generatedAt: new Date().toISOString(),
      engineVersion: '5.0-multi-agent',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatPlanets(planets, shadbala, ishtaKashta) {
  const result = {};
  for (const [key, p] of Object.entries(planets)) {
    const sb = shadbala[key];
    const ik = ishtaKashta[key];
    result[key] = {
      sign: p.rashiEnglish,
      degree: p.sidereal.toFixed(2),
      degreeInSign: p.degreeInSign.toFixed(2),
      retrograde: p.isRetrograde,
      shadbala: sb ? { rupas: sb.totalRupas, strength: sb.strength, percentage: sb.percentage } : null,
      ishtaKashta: ik ? { ishta: ik.ishtaPhala, kashta: ik.kashtaPhala, tendency: ik.tendency } : null,
    };
  }
  return result;
}

module.exports = {
  generateMultiAgentContext,
  buildChartAnalyzerContext,
  buildTransitTimerContext,
  buildYogaIdentifierContext,
  buildRemedialContext,
  buildSynthesisPrompt,
};
