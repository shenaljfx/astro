/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREDICTION CONFIDENCE SCORING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Scores each prediction from 0-100% based on:
 *   1. Multi-system confirmation (Parashari, KP, Jaimini, Tajaka)
 *   2. Shadbala strength of involved planets
 *   3. Birth time quality (rectified vs approximate)
 *   4. Divisional chart confirmation (Varga Visesha Bala)
 *   5. Ashtakavarga support
 *   6. Dasha-Transit alignment
 *
 * Each factor contributes weighted points to a final confidence score.
 */

const { calculateShadbala, getShadbalaWeightsForDasha, buildExtendedVargas } = require('./advanced');
const { getAllPlanetPositions, calculateAshtakavarga } = require('./astrology');
const { predictEvent } = require('./kp');
const { crossValidateDashas } = require('./dasha');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate comprehensive confidence score for a prediction.
 *
 * @param {object} params
 * @param {string} params.eventType - Event being predicted (e.g., 'marriage', 'career_change')
 * @param {Date} params.birthDate - Birth date/time
 * @param {number} params.lat - Birth latitude
 * @param {number} params.lng - Birth longitude
 * @param {Date} [params.targetDate] - Date of predicted event
 * @param {string} [params.birthTimeQuality] - 'exact', 'approximate', 'rectified', 'unknown'
 * @param {object} [params.vimshottariResult] - Existing Vimshottari result
 * @returns {object} Confidence breakdown and total score
 */
function calculateConfidence(params) {
  const { eventType, birthDate, lat, lng, targetDate, birthTimeQuality = 'approximate', vimshottariResult } = params;
  const date = new Date(birthDate);
  const target = targetDate ? new Date(targetDate) : new Date();

  const factors = [];
  let totalWeight = 0;
  let totalScore = 0;

  // ── Factor 1: KP System Confirmation (weight: 25) ──────────────
  const kpWeight = 25;
  try {
    const kp = predictEvent(eventType, date, lat, lng);
    let kpScore;
    if (kp.prediction === 'YES') kpScore = kp.confidence;
    else if (kp.prediction === 'NO') kpScore = 100 - kp.confidence;
    else kpScore = 50;
    factors.push({ name: 'KP Sub-Lord Analysis', weight: kpWeight, score: kpScore, detail: `${kp.prediction} (${kp.confidence}%)` });
    totalWeight += kpWeight;
    totalScore += kpScore * kpWeight;
  } catch (_) {
    factors.push({ name: 'KP Sub-Lord Analysis', weight: kpWeight, score: 50, detail: 'Unavailable' });
    totalWeight += kpWeight;
    totalScore += 50 * kpWeight;
  }

  // ── Factor 2: Multi-Dasha Cross-Validation (weight: 20) ────────
  const dashaWeight = 20;
  try {
    const crossVal = crossValidateDashas(date, lat, lng, target, vimshottariResult);
    const dashaScore = crossVal.confidenceScore;
    factors.push({ name: 'Multi-Dasha Agreement', weight: dashaWeight, score: dashaScore, detail: `${crossVal.crossSystemAgreement}/${crossVal.totalPairs} systems agree` });
    totalWeight += dashaWeight;
    totalScore += dashaScore * dashaWeight;
  } catch (_) {
    totalWeight += dashaWeight;
    totalScore += 50 * dashaWeight;
    factors.push({ name: 'Multi-Dasha Agreement', weight: dashaWeight, score: 50, detail: 'Unavailable' });
  }

  // ── Factor 3: Shadbala of Key Planets (weight: 15) ─────────────
  const sbWeight = 15;
  try {
    const shadbala = calculateShadbala(date, lat, lng);
    const avgPercentage = Object.values(shadbala).reduce((s, p) => s + p.percentage, 0) / Object.keys(shadbala).length;
    const sbScore = Math.min(100, avgPercentage + 10); // slightly boost since avg is typically ~50
    factors.push({ name: 'Shadbala Planetary Strength', weight: sbWeight, score: Math.round(sbScore), detail: `Avg ${Math.round(avgPercentage)}%` });
    totalWeight += sbWeight;
    totalScore += sbScore * sbWeight;
  } catch (_) {
    totalWeight += sbWeight;
    totalScore += 50 * sbWeight;
    factors.push({ name: 'Shadbala Planetary Strength', weight: sbWeight, score: 50, detail: 'Unavailable' });
  }

  // ── Factor 4: Birth Time Quality (weight: 15) ──────────────────
  const btWeight = 15;
  const btScores = { exact: 95, rectified: 85, approximate: 60, unknown: 30 };
  const btScore = btScores[birthTimeQuality] || 60;
  factors.push({ name: 'Birth Time Quality', weight: btWeight, score: btScore, detail: birthTimeQuality });
  totalWeight += btWeight;
  totalScore += btScore * btWeight;

  // ── Factor 5: Ashtakavarga Support (weight: 15) ────────────────
  const aavWeight = 15;
  try {
    const aav = calculateAshtakavarga(date, lat, lng);
    if (aav.sarvashtakavarga) {
      const avgSav = Object.values(aav.sarvashtakavarga).reduce((s, v) => s + v, 0) / 12;
      const aavScore = Math.min(100, Math.round(avgSav * 3.5)); // 28 avg → ~98 max
      factors.push({ name: 'Ashtakavarga Strength', weight: aavWeight, score: aavScore, detail: `Avg SAV ${avgSav.toFixed(1)}` });
      totalWeight += aavWeight;
      totalScore += aavScore * aavWeight;
    } else {
      totalWeight += aavWeight;
      totalScore += 50 * aavWeight;
      factors.push({ name: 'Ashtakavarga Strength', weight: aavWeight, score: 50, detail: 'No data' });
    }
  } catch (_) {
    totalWeight += aavWeight;
    totalScore += 50 * aavWeight;
    factors.push({ name: 'Ashtakavarga Strength', weight: aavWeight, score: 50, detail: 'Unavailable' });
  }

  // ── Factor 6: Divisional Chart Confirmation (weight: 10) ───────
  const vargaWeight = 10;
  try {
    const vargas = buildExtendedVargas(date, lat, lng);
    const vvb = vargas._vargaVisheshaBala;
    if (vvb) {
      const avgVarga = Object.values(vvb).reduce((s, v) => s + v.percentage, 0) / Object.keys(vvb).length;
      const vScore = Math.min(100, Math.round(avgVarga * 2 + 40)); // boost since percentages tend to be low
      factors.push({ name: 'Divisional Chart Dignity', weight: vargaWeight, score: vScore, detail: `Avg VVB ${Math.round(avgVarga)}%` });
      totalWeight += vargaWeight;
      totalScore += vScore * vargaWeight;
    } else {
      totalWeight += vargaWeight;
      totalScore += 50 * vargaWeight;
      factors.push({ name: 'Divisional Chart Dignity', weight: vargaWeight, score: 50, detail: 'No data' });
    }
  } catch (_) {
    totalWeight += vargaWeight;
    totalScore += 50 * vargaWeight;
    factors.push({ name: 'Divisional Chart Dignity', weight: vargaWeight, score: 50, detail: 'Unavailable' });
  }

  // ── FINAL SCORE ────────────────────────────────────────────────
  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  let label;
  if (finalScore >= 80) label = 'Very High Confidence';
  else if (finalScore >= 65) label = 'High Confidence';
  else if (finalScore >= 50) label = 'Moderate Confidence';
  else if (finalScore >= 35) label = 'Low Confidence';
  else label = 'Very Low Confidence';

  return {
    event: eventType,
    confidenceScore: finalScore,
    label,
    factors,
    recommendation: finalScore >= 65
      ? 'This prediction has strong astrological support across multiple systems.'
      : finalScore >= 50
        ? 'This prediction has moderate support. Consider additional factors and personal circumstances.'
        : 'This prediction has limited astrological support. Exercise caution and seek additional consultation.',
  };
}

/**
 * Calculate confidence for all supported events at once.
 */
function calculateAllConfidences(birthDate, lat, lng, birthTimeQuality) {
  const events = ['marriage', 'career_change', 'children', 'foreign_travel', 'wealth_gain', 'property', 'education', 'health_crisis', 'business', 'love_affair'];
  const results = {};
  for (const event of events) {
    results[event] = calculateConfidence({ eventType: event, birthDate, lat, lng, birthTimeQuality });
  }
  return results;
}

module.exports = {
  calculateConfidence,
  calculateAllConfidences,
};
