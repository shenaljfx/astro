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
        language: data.language || 'en',
        notifications: true,
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
async function updateBirthData(uid, birthData) {
  const db = getDb();
  if (!db) return null;

  await db.collection(COLLECTIONS.USERS).doc(uid).update({
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
    generationTime: reportData.generationTime || null,
    userName: reportData.userName || null,
    userGender: reportData.userGender || null,
    birthLocation: reportData.birthLocation || null,
    createdAt: new Date().toISOString(),
    expiresAt: reportData.expiresAt || null, // null = never expires
  };

  await db.collection(COLLECTIONS.REPORTS).doc(reportId).set(report);

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
 * Overwrites any existing explanation for the same combo.
 */
async function saveChartExplanation(uid, birthDate, language, explanations) {
  const db = getDb();
  if (!db) return null;

  // Deterministic doc ID so we can overwrite on birthday change
  const docId = `${uid}_${birthDate}_${language}`;

  const doc = {
    uid,
    birthDate,
    language: language || 'en',
    explanations, // the JSON object from AI
    createdAt: new Date().toISOString(),
  };

  await db.collection(COLLECTIONS.REPORTS).doc(docId).set(doc);
  return docId;
}

/**
 * Get cached chart explanation for a uid + birthDate + language combo.
 * Returns null if not found (triggers AI regeneration).
 */
async function getCachedChartExplanation(uid, birthDate, language) {
  const db = getDb();
  if (!db) return null;

  try {
    const docId = `${uid}_${birthDate}_${language}`;
    const docRef = await db.collection(COLLECTIONS.REPORTS).doc(docId).get();
    if (!docRef.exists) return null;
    return docRef.data().explanations || null;
  } catch (err) {
    console.error('getCachedChartExplanation error:', err.message);
    return null;
  }
}

// ─── SINHALA TRANSLATION CACHE ──────────────────────────────────

/**
 * Save translated advancedAnalysis keyed by uid + birthDate.
 * Birth data is deterministic so same inputs always produce same analysis.
 */
async function saveTranslationCache(uid, birthDate, translatedAnalysis) {
  const db = getDb();
  if (!db) return null;

  const docId = `tr_${uid}_${birthDate}`;
  await db.collection(COLLECTIONS.REPORTS).doc(docId).set({
    uid,
    birthDate,
    type: 'si-translation',
    translatedAnalysis,
    createdAt: new Date().toISOString(),
  });
  return docId;
}

/**
 * Get cached Sinhala translation for advancedAnalysis.
 * Returns null if not found.
 */
async function getCachedTranslation(uid, birthDate) {
  const db = getDb();
  if (!db) return null;

  try {
    const docId = `tr_${uid}_${birthDate}`;
    const docRef = await db.collection(COLLECTIONS.REPORTS).doc(docId).get();
    if (!docRef.exists) return null;
    return docRef.data().translatedAnalysis || null;
  } catch (err) {
    console.error('getCachedTranslation error:', err.message);
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
};
