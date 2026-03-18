/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PREDICTION TRACKING & FEEDBACK LOOP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tracks predictions made vs actual outcomes reported by users.
 * Over time, this data calibrates confidence scoring weights by
 * identifying which techniques are most accurate for which prediction types.
 *
 * Storage: Firestore collection `prediction_outcomes`
 * Each document: { userId, predictionId, eventType, prediction, confidence,
 *                  techniques, predictedDate, reportedOutcome, reportedDate,
 *                  wasAccurate }
 *
 * ML calibration: Periodically analyze accuracy rates per technique per
 * event type, and adjust confidence weights accordingly.
 */

let db = null;
try {
  const admin = require('firebase-admin');
  if (admin.apps.length > 0) {
    db = admin.firestore();
  }
} catch (_) {}

const COLLECTION = 'prediction_outcomes';

// ═══════════════════════════════════════════════════════════════════════════
// RECORD PREDICTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a prediction made by the system for later validation.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.eventType - e.g., 'marriage', 'career_change'
 * @param {string} params.prediction - 'YES' or 'NO'
 * @param {number} params.confidence - 0-100
 * @param {object} params.techniques - { kp: score, dasha: score, ... }
 * @param {string} [params.predictedTimeframe] - e.g., '2026-2027'
 * @param {object} [params.chartContext] - Minimal chart reference data
 * @returns {string|null} Prediction document ID
 */
async function recordPrediction(params) {
  if (!db) return null;

  const doc = {
    userId: params.userId,
    eventType: params.eventType,
    prediction: params.prediction,
    confidence: params.confidence,
    techniques: params.techniques || {},
    predictedTimeframe: params.predictedTimeframe || null,
    chartContext: params.chartContext || null,
    createdAt: new Date().toISOString(),
    reportedOutcome: null,
    reportedDate: null,
    wasAccurate: null,
  };

  try {
    const ref = await db.collection(COLLECTION).add(doc);
    return ref.id;
  } catch (err) {
    console.error('[feedback] Failed to record prediction:', err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RECORD OUTCOME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * User reports whether a prediction came true.
 *
 * @param {string} predictionId - Document ID from recordPrediction
 * @param {boolean} didHappen - Whether the predicted event occurred
 * @param {string} [notes] - User's optional notes
 */
async function recordOutcome(predictionId, didHappen, notes) {
  if (!db || !predictionId) return false;

  try {
    const ref = db.collection(COLLECTION).doc(predictionId);
    const doc = await ref.get();
    if (!doc.exists) return false;

    const data = doc.data();
    const wasAccurate = (data.prediction === 'YES' && didHappen) || (data.prediction === 'NO' && !didHappen);

    await ref.update({
      reportedOutcome: didHappen ? 'happened' : 'did_not_happen',
      reportedDate: new Date().toISOString(),
      wasAccurate,
      userNotes: notes || null,
    });

    return true;
  } catch (err) {
    console.error('[feedback] Failed to record outcome:', err.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCURACY ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute accuracy rates grouped by event type and technique.
 * This data is used to calibrate confidence weights.
 */
async function getAccuracyStats() {
  if (!db) return getDefaultWeights();

  try {
    const snapshot = await db.collection(COLLECTION)
      .where('wasAccurate', '!=', null)
      .limit(1000)
      .get();

    if (snapshot.empty) return getDefaultWeights();

    const stats = {};
    snapshot.forEach(doc => {
      const d = doc.data();
      const key = d.eventType || 'unknown';
      if (!stats[key]) stats[key] = { total: 0, accurate: 0, byTechnique: {} };
      stats[key].total++;
      if (d.wasAccurate) stats[key].accurate++;

      // Track per technique
      if (d.techniques) {
        for (const [tech, score] of Object.entries(d.techniques)) {
          if (!stats[key].byTechnique[tech]) stats[key].byTechnique[tech] = { total: 0, accurate: 0 };
          stats[key].byTechnique[tech].total++;
          if (d.wasAccurate) stats[key].byTechnique[tech].accurate++;
        }
      }
    });

    // Compute accuracy rates
    const result = {};
    for (const [event, s] of Object.entries(stats)) {
      result[event] = {
        overallAccuracy: s.total > 0 ? Math.round(s.accurate / s.total * 100) : null,
        sampleSize: s.total,
        techniqueAccuracy: {},
      };
      for (const [tech, ts] of Object.entries(s.byTechnique)) {
        result[event].techniqueAccuracy[tech] = {
          accuracy: ts.total > 0 ? Math.round(ts.accurate / ts.total * 100) : null,
          samples: ts.total,
        };
      }
    }

    return result;
  } catch (err) {
    console.error('[feedback] Failed to get accuracy stats:', err.message);
    return getDefaultWeights();
  }
}

/**
 * Generate calibrated weights based on historical accuracy.
 * Falls back to equal weights if insufficient data.
 */
async function getCalibratedWeights(eventType) {
  const stats = await getAccuracyStats();
  const eventStats = stats[eventType];

  if (!eventStats || eventStats.sampleSize < 10) return getDefaultWeights();

  const weights = {};
  for (const [tech, ts] of Object.entries(eventStats.techniqueAccuracy)) {
    if (ts.samples >= 5) {
      weights[tech] = Math.round(ts.accuracy / 100 * 30); // Scale 0-100 accuracy to 0-30 weight
    }
  }

  return Object.keys(weights).length > 0 ? weights : getDefaultWeights();
}

function getDefaultWeights() {
  return {
    kp: 25,
    dasha: 20,
    shadbala: 15,
    birthTime: 15,
    ashtakavarga: 15,
    vargas: 10,
  };
}

/**
 * Get predictions awaiting user feedback for a given user.
 */
async function getPendingFeedback(userId, limit = 10) {
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTION)
      .where('userId', '==', userId)
      .where('reportedOutcome', '==', null)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (_) {
    return [];
  }
}

module.exports = {
  recordPrediction,
  recordOutcome,
  getAccuracyStats,
  getCalibratedWeights,
  getPendingFeedback,
  getDefaultWeights,
};
