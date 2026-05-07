/**
 * Firestore Data Access Layer
 * 
 * Collections:
 * - users/{uid}           — user profiles + birth data
 * - reports/{id}          — cached AI reports
 * - chatSessions/{id}     — AI chat history
 * - porondamResults/{id}  — saved compatibility checks
 */

const { getDb, COLLECTIONS } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const {
  buildFeedbackSummary,
  buildPromptFeedbackRecord,
  buildUnsupportedTermAnalytics,
} = require('../engine/promptObservability');

// ─── USER OPERATIONS ───────────────────────────────────────────

/**
 * Create or update a user profile
 */
async function upsertUser(uid, data) {
  const db = getDb();
  if (!db) return null;

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const existing = await userRef.get();

  if (existing.exists) {
    await userRef.update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { uid, ...existing.data(), ...data };
  } else {
    const userData = {
      uid,
      displayName: data.displayName || 'Cosmic Seeker',
      email: data.email || null,
      photoURL: data.photoURL || null,
      birthData: data.birthData || null,
      location: data.location || { lat: 6.9271, lng: 79.8612, name: 'Colombo' },
      preferences: {
        language: data.language || 'si',
        notifications: true,
        dailyPalapa: true,
        rahuKalayaAlerts: true,
        marakaApalaAlerts: true,
        transitAlerts: false,
        theme: 'cosmic',
        ...(data.preferences || {}),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportCount: 0,
      chatCount: 0,
    };
    await userRef.set(userData);
    return userData;
  }
}

/**
 * Get user profile by UID
 */
async function getUser(uid) {
  const db = getDb();
  if (!db) return null;

  const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  return doc.exists ? { uid: doc.id, ...doc.data() } : null;
}

/**
 * Update user birth data
 */
async function updateBirthData(uid, birthData, extraUpdates = {}) {
  const db = getDb();
  if (!db) return null;

  await db.collection(COLLECTIONS.USERS).doc(uid).update({
    ...extraUpdates,
    birthData: {
      dateTime: birthData.dateTime,
      lat: birthData.lat,
      lng: birthData.lng,
      locationName: birthData.locationName || '',
      timezone: birthData.timezone || 'Asia/Colombo',
    },
    onboardingComplete: true,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * Update user preferences
 */
async function updatePreferences(uid, prefs) {
  const db = getDb();
  if (!db) return null;

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
  const doc = await userRef.get();
  if (!doc.exists) return null;

  const existing = doc.data().preferences || {};
  await userRef.update({
    preferences: { ...existing, ...prefs },
    updatedAt: new Date().toISOString(),
  });
  return true;
}

// ─── REPORT OPERATIONS ─────────────────────────────────────────

/**
 * Save an AI report to cache
 */
async function saveReport(uid, reportData) {
  const db = getDb();
  if (!db) return null;

  const reportId = uuidv4();
  const promptAnalytics = reportData.promptAnalytics
    || buildUnsupportedTermAnalytics(reportData.validationMetadata || {}, reportData.promptMetadata || null);
  const report = {
    id: reportId,
    uid,
    birthDate: reportData.birthDate,
    lat: reportData.lat,
    lng: reportData.lng,
    language: reportData.language || 'en',
    type: reportData.type || 'ai-narrative',
    sections: reportData.sections || [],
    rashiChart: reportData.rashiChart || null,
    birthInfo: reportData.birthInfo || null,
    promptVersion: reportData.promptVersion || reportData.promptMetadata?.promptVersion || null,
    promptMetadata: reportData.promptMetadata || null,
    promptAnalytics,
    calculationMetadata: reportData.calculationMetadata || null,
    validationMetadata: reportData.validationMetadata || null,
    generationTime: reportData.generationTime || null,
    userName: reportData.userName || null,
    userGender: reportData.userGender || null,
    birthLocation: reportData.birthLocation || null,
    createdAt: new Date().toISOString(),
    expiresAt: reportData.expiresAt || null, // null = never expires
  };

  await db.collection(COLLECTIONS.REPORTS).doc(reportId).set(report);
  await savePromptAnalyticsSnapshot(uid, reportId, report).catch(() => null);

  // Increment user's report count
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        reportCount: (userDoc.data().reportCount || 0) + 1,
        lastReportAt: new Date().toISOString(),
      });
    }
  } catch (e) { /* ignore */ }

  return reportId;
}

async function savePromptAnalyticsSnapshot(uid, reportId, reportData = {}) {
  const db = getDb();
  if (!db || !reportId) return null;

  const analytics = reportData.promptAnalytics
    || buildUnsupportedTermAnalytics(reportData.validationMetadata || {}, reportData.promptMetadata || null);
  const record = {
    id: reportId,
    reportId,
    uid: uid || reportData.uid || null,
    promptVersion: analytics.promptVersion || reportData.promptVersion || null,
    language: reportData.language || null,
    unsupportedEventCount: analytics.unsupportedEventCount || 0,
    repeatedUnsupportedTerms: analytics.repeatedUnsupportedTerms || [],
    topUnsupportedTerms: analytics.topUnsupportedTerms || [],
    byType: analytics.byType || {},
    bySection: analytics.bySection || {},
    bySource: analytics.bySource || {},
    analytics,
    createdAt: reportData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.PROMPT_ANALYTICS).doc(reportId).set(record);
  return reportId;
}

async function saveReportFeedback(uid, feedbackInput = {}) {
  const db = getDb();
  if (!db) return null;

  const reportId = feedbackInput.reportId || null;
  let reportData = {};
  let reportRef = null;
  if (reportId) {
    reportRef = db.collection(COLLECTIONS.REPORTS).doc(reportId);
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) {
      const error = new Error('Report not found');
      error.code = 'REPORT_NOT_FOUND';
      throw error;
    }
    reportData = { id: reportDoc.id, ...reportDoc.data() };
    if (uid && reportData.uid && reportData.uid !== uid) {
      const error = new Error('Access denied');
      error.code = 'ACCESS_DENIED';
      throw error;
    }
  }

  const id = uuidv4();
  const feedback = {
    id,
    ...buildPromptFeedbackRecord({
      uid,
      reportId,
      reportData,
      sectionKey: feedbackInput.sectionKey,
      claimType: feedbackInput.claimType,
      claimId: feedbackInput.claimId,
      rating: feedbackInput.rating,
      helpful: feedbackInput.helpful,
      issueType: feedbackInput.issueType,
      comment: feedbackInput.comment,
      source: feedbackInput.source || 'user',
    }),
  };

  await db.collection(COLLECTIONS.REPORT_FEEDBACK).doc(id).set(feedback);

  if (reportRef && reportData) {
    await reportRef.update({
      feedbackSummary: buildFeedbackSummary(reportData.feedbackSummary || null, feedback),
      lastFeedbackAt: feedback.createdAt,
    });
  }

  return feedback;
}

async function getPromptAnalyticsSummary(limit = 200) {
  const db = getDb();
  if (!db) {
    return {
      reports: 0,
      unsupportedEventCount: 0,
      repeatedUnsupportedTerms: [],
      topUnsupportedTerms: [],
      byType: {},
      bySection: {},
      bySource: {},
      feedback: { total: 0, averageRating: null, bySection: {}, byClaimType: {}, byIssueType: {} },
    };
  }

  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 200, 1000));
  const analyticsSnapshot = await db.collection(COLLECTIONS.PROMPT_ANALYTICS)
    .orderBy('createdAt', 'desc')
    .limit(safeLimit)
    .get();

  const summary = {
    reports: 0,
    unsupportedEventCount: 0,
    topUnsupportedTerms: {},
    repeatedUnsupportedTerms: [],
    byType: {},
    bySection: {},
    bySource: {},
    feedback: {
      total: 0,
      helpful: 0,
      unhelpful: 0,
      ratingTotal: 0,
      ratingCount: 0,
      averageRating: null,
      bySection: {},
      byClaimType: {},
      byIssueType: {},
    },
  };

  analyticsSnapshot.forEach(doc => {
    const data = doc.data();
    summary.reports += 1;
    summary.unsupportedEventCount += data.unsupportedEventCount || 0;
    for (const item of data.topUnsupportedTerms || []) {
      summary.topUnsupportedTerms[item.term] = (summary.topUnsupportedTerms[item.term] || 0) + (item.count || 0);
    }
    for (const [key, value] of Object.entries(data.byType || {})) {
      summary.byType[key] = (summary.byType[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(data.bySection || {})) {
      summary.bySection[key] = (summary.bySection[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(data.bySource || {})) {
      summary.bySource[key] = (summary.bySource[key] || 0) + value;
    }
  });

  const feedbackSnapshot = await db.collection(COLLECTIONS.REPORT_FEEDBACK)
    .orderBy('createdAt', 'desc')
    .limit(safeLimit)
    .get();

  feedbackSnapshot.forEach(doc => {
    const data = doc.data();
    summary.feedback.total += 1;
    if (data.helpful === true) summary.feedback.helpful += 1;
    if (data.helpful === false) summary.feedback.unhelpful += 1;
    if (Number.isFinite(data.rating)) {
      summary.feedback.ratingTotal += data.rating;
      summary.feedback.ratingCount += 1;
    }
    const sectionKey = data.sectionKey || 'report';
    const claimType = data.claimType || 'general';
    summary.feedback.bySection[sectionKey] = (summary.feedback.bySection[sectionKey] || 0) + 1;
    summary.feedback.byClaimType[claimType] = (summary.feedback.byClaimType[claimType] || 0) + 1;
    if (data.issueType) summary.feedback.byIssueType[data.issueType] = (summary.feedback.byIssueType[data.issueType] || 0) + 1;
  });

  summary.topUnsupportedTerms = Object.entries(summary.topUnsupportedTerms)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 20);
  summary.repeatedUnsupportedTerms = summary.topUnsupportedTerms.filter(item => item.count > 1);
  if (summary.feedback.ratingCount > 0) {
    summary.feedback.averageRating = Math.round((summary.feedback.ratingTotal / summary.feedback.ratingCount) * 100) / 100;
  }
  delete summary.feedback.ratingTotal;
  delete summary.feedback.ratingCount;

  return summary;
}

/**
 * Get cached report for a user + birth date + language combo
 */
async function getCachedReport(uid, birthDate, language) {
  const db = getDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection(COLLECTIONS.REPORTS)
      .where('uid', '==', uid)
      .where('birthDate', '==', birthDate)
      .where('language', '==', language || 'en')
      .where('type', '==', 'ai-narrative')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check expiry (reports older than 7 days get regenerated)
    const created = new Date(data.createdAt);
    const now = new Date();
    const ageMs = now - created;
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    if (ageMs > SEVEN_DAYS) return null; // expired

    return { id: doc.id, ...data };
  } catch (err) {
    console.error('getCachedReport error:', err.message);
    return null;
  }
}

/**
 * Get all AI narrative reports for a user (excludes chart explanations, translations, etc.)
 */
async function getUserReports(uid) {
  const db = getDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(COLLECTIONS.REPORTS)
      .where('uid', '==', uid)
      .where('type', '==', 'ai-narrative')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (e) {
    console.error('[getUserReports] Firestore query failed:', e.message);
    if (e.message && e.message.includes('index')) {
      console.error('[getUserReports] ⚠️ Missing Firestore composite index! Create it at the URL in the error above, or deploy firestore.indexes.json');
    }
    // Fallback: query without ordering (no composite index needed)
    try {
      const fallback = await db.collection(COLLECTIONS.REPORTS)
        .where('uid', '==', uid)
        .where('type', '==', 'ai-narrative')
        .limit(20)
        .get();
      const docs = fallback.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      return docs;
    } catch (e2) {
      console.error('[getUserReports] Fallback query also failed:', e2.message);
      return [];
    }
  }
}

// ─── CHAT OPERATIONS ───────────────────────────────────────────

/**
 * Save a chat session
 */
async function saveChatSession(uid, messages, metadata) {
  const db = getDb();
  if (!db) return null;

  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    uid,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
    })),
    language: metadata?.language || 'en',
    topic: metadata?.topic || 'general',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: messages.length,
  };

  await db.collection(COLLECTIONS.CHAT_SESSIONS).doc(sessionId).set(session);

  // Update user chat count
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        chatCount: (userDoc.data().chatCount || 0) + 1,
        lastChatAt: new Date().toISOString(),
      });
    }
  } catch (e) { /* ignore */ }

  return sessionId;
}

/**
 * Update an existing chat session with new messages
 */
async function updateChatSession(sessionId, messages) {
  const db = getDb();
  if (!db) return null;

  await db.collection(COLLECTIONS.CHAT_SESSIONS).doc(sessionId).update({
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
    })),
    updatedAt: new Date().toISOString(),
    messageCount: messages.length,
  });
  return true;
}

/**
 * Get user's chat history
 */
async function getUserChats(uid, limit = 10) {
  const db = getDb();
  if (!db) return [];

  const snapshot = await db.collection(COLLECTIONS.CHAT_SESSIONS)
    .where('uid', '==', uid)
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get a single chat session
 */
async function getChatSession(sessionId) {
  const db = getDb();
  if (!db) return null;

  const doc = await db.collection(COLLECTIONS.CHAT_SESSIONS).doc(sessionId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// ─── PORONDAM OPERATIONS ───────────────────────────────────────

/**
 * Save a porondam (compatibility) result
 */
async function savePorondamResult(uid, result) {
  const db = getDb();
  if (!db) return null;

  const id = uuidv4();
  const record = {
    id,
    uid,
    bride: {
      birthDate: result.bride?.birthDate || null,
      name: result.bride?.name || 'Bride',
      nakshatra: result.bride?.nakshatra || null,
      rashi: result.bride?.rashi || null,
      moonLongitude: result.bride?.moonLongitude || null,
    },
    groom: {
      birthDate: result.groom?.birthDate || null,
      name: result.groom?.name || 'Groom',
      nakshatra: result.groom?.nakshatra || null,
      rashi: result.groom?.rashi || null,
      moonLongitude: result.groom?.moonLongitude || null,
    },
    score: result.score || result.totalScore || 0,
    maxScore: result.totalPoints || result.maxPossibleScore || 20,
    percentage: result.percentage || 0,
    rating: result.rating || null,
    ratingEmoji: result.ratingEmoji || null,
    ratingSinhala: result.ratingSinhala || null,
    verdict: result.verdict || result.recommendation || null,
    factors: result.factors || [],
    doshas: result.doshas || [],
    brideChart: result.brideChart || null,
    groomChart: result.groomChart || null,
    brideAdvanced: result.brideAdvanced || null,
    groomAdvanced: result.groomAdvanced || null,
    advancedPorondam: result.advancedPorondam || null,
    report: result.report || null,
    reportLanguage: result.reportLanguage || null,
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.PORONDAM).doc(id).set(record);

  // Increment user's porondam count
  try {
    const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        porondamCount: (userDoc.data().porondamCount || 0) + 1,
        lastPorondamAt: new Date().toISOString(),
      });
    }
  } catch (e) { /* ignore */ }

  return id;
}

/**
 * Update an existing porondam record with the AI report
 */
async function updatePorondamReport(porondamId, report, language) {
  const db = getDb();
  if (!db) return null;

  await db.collection(COLLECTIONS.PORONDAM).doc(porondamId).update({
    report: report,
    reportLanguage: language,
    reportGeneratedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * Get a single porondam result by ID
 */
async function getPorondamById(porondamId) {
  const db = getDb();
  if (!db) return null;

  const doc = await db.collection(COLLECTIONS.PORONDAM).doc(porondamId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Get user's porondam history
 */
async function getUserPorondamHistory(uid, limit = 10) {
  const db = getDb();
  if (!db) return [];

  const snapshot = await db.collection(COLLECTIONS.PORONDAM)
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ─── CHART EXPLANATION CACHE ────────────────────────────────────

/**
 * Save AI-generated chart explanations keyed by uid + birthDate + language.
 * Data is stored as a JSON string to avoid Firestore serialization issues
 * with undefined/NaN/Infinity values in deeply nested astrology objects.
 */
async function saveChartExplanation(uid, birthDate, language, explanations) {
  const db = getDb();
  if (!db) return null;

  const docId = `expl_${uid}_${language}`;

  await db.collection(COLLECTIONS.CHARTS).doc(docId).set({
    uid,
    birthDate,
    language: language || 'en',
    type: 'chart-explanation',
    dataJSON: JSON.stringify(explanations),
    createdAt: new Date().toISOString(),
  });
  return docId;
}

/**
 * Get cached chart explanation for a uid + birthDate + language combo.
 */
async function getCachedChartExplanation(uid, birthDate, language) {
  const db = getDb();
  if (!db) return null;

  try {
    const docId = `expl_${uid}_${language}`;
    const docRef = await db.collection(COLLECTIONS.CHARTS).doc(docId).get();
    if (!docRef.exists) return null;
    const d = docRef.data();
    if (d.birthDate !== birthDate) return null;
    return d.dataJSON ? JSON.parse(d.dataJSON) : null;
  } catch (err) {
    console.error('getCachedChartExplanation error:', err.message);
    return null;
  }
}

// ─── SINHALA TRANSLATION CACHE ──────────────────────────────────

/**
 * Save translated advancedAnalysis keyed by uid.
 * Stored as JSON string for safe Firestore serialization.
 */
async function saveTranslationCache(uid, birthDate, translatedAnalysis) {
  const db = getDb();
  if (!db) return null;

  const docId = `tr_${uid}`;
  await db.collection(COLLECTIONS.CHARTS).doc(docId).set({
    uid,
    birthDate,
    type: 'si-translation',
    dataJSON: JSON.stringify(translatedAnalysis),
    createdAt: new Date().toISOString(),
  });
  return docId;
}

/**
 * Get cached Sinhala translation for advancedAnalysis.
 */
async function getCachedTranslation(uid, birthDate) {
  const db = getDb();
  if (!db) return null;

  try {
    const docId = `tr_${uid}`;
    const docRef = await db.collection(COLLECTIONS.CHARTS).doc(docId).get();
    if (!docRef.exists) return null;
    const d = docRef.data();
    if (d.birthDate !== birthDate) return null;
    return d.dataJSON ? JSON.parse(d.dataJSON) : null;
  } catch (err) {
    console.error('getCachedTranslation error:', err.message);
    return null;
  }
}

// ─── BIRTH CHART CACHE ─────────────────────────────────────────

/**
 * Save computed birth chart data for a user.
 * Keyed by uid — one chart per user. Overwritten when birth time changes.
 * Stored as JSON string to avoid Firestore serialization failures with
 * deeply nested objects containing undefined/NaN/Infinity values.
 */
async function saveBirthChartCache(uid, birthDate, chartData) {
  const db = getDb();
  if (!db) return null;

  const docId = `chart_${uid}`;
  await db.collection(COLLECTIONS.CHARTS).doc(docId).set({
    uid,
    birthDate,
    type: 'birth-chart-cache',
    dataJSON: JSON.stringify(chartData),
    createdAt: new Date().toISOString(),
  });
  return docId;
}

/**
 * Get cached birth chart. Returns { birthDate, chartData } or null.
 * Caller compares birthDate to decide if cache is stale.
 */
async function getCachedBirthChart(uid) {
  const db = getDb();
  if (!db) return null;

  try {
    const docId = `chart_${uid}`;
    const docRef = await db.collection(COLLECTIONS.CHARTS).doc(docId).get();
    if (!docRef.exists) return null;
    const d = docRef.data();
    if (d.type !== 'birth-chart-cache') return null;
    return { birthDate: d.birthDate, chartData: d.dataJSON ? JSON.parse(d.dataJSON) : null, createdAt: d.createdAt };
  } catch (err) {
    console.error('getCachedBirthChart error:', err.message);
    return null;
  }
}

module.exports = {
  upsertUser,
  getUser,
  updateBirthData,
  updatePreferences,
  saveReport,
  getCachedReport,
  getUserReports,
  savePromptAnalyticsSnapshot,
  saveReportFeedback,
  getPromptAnalyticsSummary,
  saveChatSession,
  updateChatSession,
  getUserChats,
  getChatSession,
  savePorondamResult,
  updatePorondamReport,
  getPorondamById,
  getUserPorondamHistory,
  saveChartExplanation,
  getCachedChartExplanation,
  saveTranslationCache,
  getCachedTranslation,
  saveBirthChartCache,
  getCachedBirthChart,
};
