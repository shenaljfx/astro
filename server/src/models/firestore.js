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
const crypto = require('crypto');
const {
  buildFeedbackSummary,
  buildPromptFeedbackRecord,
  buildUnsupportedTermAnalytics,
} = require('../engine/promptObservability');

const AI_REPORT_CACHE_VERSION = 'ai-report-cache-v1';

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function normalizeCacheCoord(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Number(num.toFixed(4));
}

function buildReportCacheKey(input = {}) {
  const normalized = {
    birthDate: input.birthDate || null,
    lat: normalizeCacheCoord(input.lat),
    lng: normalizeCacheCoord(input.lng),
    language: input.language || 'en',
    birthLocation: input.birthLocation || null,
    userName: input.userName || null,
    userGender: input.userGender || null,
    userReligion: input.userReligion || null,
    maritalStatus: input.maritalStatus || null,
    marriageYear: input.marriageYear || null,
    careerField: input.careerField || null,
    lifeEvents: Array.isArray(input.lifeEvents) && input.lifeEvents.length > 0
      ? input.lifeEvents.map(e => ({ type: e?.type || null, year: e?.year || null }))
      : null,
    calculationSettings: input.calculationSettings || {},
    asOfDate: input.asOfDate || null,
    timeUnknown: input.timeUnknown === true,
    promptVersion: input.promptVersion || null,
    engineVersion: input.engineVersion || null,
    cacheVersion: AI_REPORT_CACHE_VERSION,
  };
  const serialized = stableStringify(normalized);
  const inputHash = crypto.createHash('sha256').update(serialized).digest('hex');
  return {
    cacheKey: ['ai-report', normalized.cacheVersion, normalized.promptVersion || 'unknown-prompt', normalized.engineVersion || 'unknown-engine', inputHash].join(':'),
    cacheVersion: normalized.cacheVersion,
    inputHash,
    normalizedInput: normalized,
  };
}

function sanitizeForFirestore(value, seen = new WeakSet()) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'number') return Number.isFinite(value) ? value : null;
  if (valueType === 'bigint') return value.toString();
  if (valueType === 'function' || valueType === 'symbol') return null;

  if (Array.isArray(value)) {
    if (seen.has(value)) return null;
    seen.add(value);
    const sanitizedArray = value.map(item => sanitizeForFirestore(item, seen));
    seen.delete(value);
    return sanitizedArray;
  }

  if (valueType === 'object') {
    if (seen.has(value)) return null;
    seen.add(value);
    const sanitizedObject = {};
    Object.keys(value).forEach(key => {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
      sanitizedObject[key] = sanitizeForFirestore(value[key], seen);
    });
    seen.delete(value);
    return sanitizedObject;
  }

  return null;
}

function toFiniteNumberOrNull(value) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringOrNull(value) {
  if (value === null || value === undefined) return null;
  try {
    const str = String(value);
    return str.length > 0 ? str : null;
  } catch (_) {
    return null;
  }
}

function normalizeCalculationMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return null;

  const settings = metadata.settings && typeof metadata.settings === 'object'
    ? {
        ayanamsha: toStringOrNull(metadata.settings.ayanamsha),
        houseSystem: toStringOrNull(metadata.settings.houseSystem),
        nodeType: toStringOrNull(metadata.settings.nodeType),
        observerMode: toStringOrNull(metadata.settings.observerMode),
        sunriseMode: toStringOrNull(metadata.settings.sunriseMode),
        dashaYearMode: toStringOrNull(metadata.settings.dashaYearMode),
        ephemeris: toStringOrNull(metadata.settings.ephemeris),
        timezoneSource: toStringOrNull(metadata.settings.timezoneSource),
      }
    : null;

  const ephemeris = metadata.ephemeris && typeof metadata.ephemeris === 'object'
    ? {
        provider: toStringOrNull(metadata.ephemeris.provider),
        requestedFlags: Array.isArray(metadata.ephemeris.requestedFlags)
          ? metadata.ephemeris.requestedFlags.map(flag => toStringOrNull(flag)).filter(Boolean)
          : [],
        returnedFlags: Array.isArray(metadata.ephemeris.returnedFlags)
          ? metadata.ephemeris.returnedFlags.map(group =>
            Array.isArray(group)
              ? group.map(flag => toStringOrNull(flag)).filter(Boolean)
              : []
          )
          : [],
        returnedFlagsOk: typeof metadata.ephemeris.returnedFlagsOk === 'boolean'
          ? metadata.ephemeris.returnedFlagsOk
          : null,
      }
    : null;

  const timeContext = metadata.timeContext && typeof metadata.timeContext === 'object'
    ? {
        utcDate: toStringOrNull(metadata.timeContext.utcDate),
        zoneName: toStringOrNull(metadata.timeContext.zoneName),
        offsetSeconds: toFiniteNumberOrNull(metadata.timeContext.offsetSeconds),
        offsetLabel: toStringOrNull(metadata.timeContext.offsetLabel),
        source: toStringOrNull(metadata.timeContext.source),
        assumedOffset: typeof metadata.timeContext.assumedOffset === 'boolean'
          ? metadata.timeContext.assumedOffset
          : null,
        displayLocalDate: toStringOrNull(metadata.timeContext.displayLocalDate),
        displayLocalTime: toStringOrNull(metadata.timeContext.displayLocalTime),
        displayLocalDateTime: toStringOrNull(metadata.timeContext.displayLocalDateTime),
      }
    : null;

  return {
    engineVersion: toStringOrNull(metadata.engineVersion),
    generatedAt: toStringOrNull(metadata.generatedAt),
    calculationDate: toStringOrNull(metadata.calculationDate),
    observer: {
      lat: toFiniteNumberOrNull(metadata.observer?.lat),
      lng: toFiniteNumberOrNull(metadata.observer?.lng),
    },
    settings,
    ephemeris,
    timeContext,
  };
}

function normalizeReportBirthInfo(birthInfo) {
  if (!birthInfo || typeof birthInfo !== 'object') return birthInfo || null;
  const normalized = {};
  Object.keys(birthInfo).forEach(key => {
    if (key.charAt(0) === '_') return;
    normalized[key] = birthInfo[key];
  });
  return normalized;
}

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
 * Partial update of editable profile fields (displayName, photoURL).
 * Unlike upsertUser, this ONLY writes the fields provided, so it can never
 * clobber birthData / location / preferences when the client sends a partial
 * update (e.g. renaming or setting an avatar).
 */
async function updateUserProfile(uid, fields) {
  const db = getDb();
  if (!db) return null;

  const ALLOWED = ['displayName', 'photoURL'];
  const updates = {};
  for (const key of ALLOWED) {
    if (fields[key] !== undefined) updates[key] = fields[key];
  }
  if (Object.keys(updates).length === 0) return getUser(uid);

  updates.updatedAt = new Date().toISOString();
  await db.collection(COLLECTIONS.USERS).doc(uid).update(updates);

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

  if (uid && reportData.cacheKey && !reportData.forceRegenerate) {
    try {
      const existing = await getCachedReport(uid, reportData.cacheKey, {
        promptVersion: reportData.promptVersion || reportData.promptMetadata?.promptVersion || null,
        engineVersion: reportData.engineVersion || null,
      });
      if (existing) return existing.id;
    } catch (e) {
      console.warn('[saveReport] existing report lookup failed:', e.message);
    }
  }

  const reportId = uuidv4();
  const promptAnalytics = reportData.promptAnalytics
    || buildUnsupportedTermAnalytics(reportData.validationMetadata || {}, reportData.promptMetadata || null);
  const normalizedCalculationMetadata = normalizeCalculationMetadata(reportData.calculationMetadata);
  const report = sanitizeForFirestore({
    id: reportId,
    uid,
    birthDate: reportData.birthDate,
    lat: reportData.lat,
    lng: reportData.lng,
    language: reportData.language || 'en',
    type: reportData.type || 'ai-narrative',
    sections: reportData.sections || [],
    rashiChart: reportData.rashiChart || null,
    birthInfo: normalizeReportBirthInfo(reportData.birthInfo),
    sectionScores: reportData.sectionScores || null,
    predictions: reportData.predictions || [],
    promptVersion: reportData.promptVersion || reportData.promptMetadata?.promptVersion || null,
    cacheKey: reportData.cacheKey || null,
    cacheVersion: reportData.cacheVersion || null,
    cacheInputHash: reportData.cacheInputHash || null,
    cacheInput: reportData.cacheInput || null,
    engineVersion: reportData.engineVersion || null,
    promptMetadata: reportData.promptMetadata || null,
    promptAnalytics,
    calculationMetadata: normalizedCalculationMetadata,
    validationMetadata: reportData.validationMetadata || null,
    generationTime: reportData.generationTime || null,
    userName: reportData.userName || null,
    userGender: reportData.userGender || null,
    birthLocation: reportData.birthLocation || null,
    createdAt: new Date().toISOString(),
    expiresAt: reportData.expiresAt || null, // null = never expires
  });
  let persistedReport = report;

  try {
    await db.collection(COLLECTIONS.REPORTS).doc(reportId).set(report);
  } catch (saveErr) {
    let savedViaMetadataFallback = false;
    if (/calculationMetadata/i.test(saveErr?.message || '')) {
      try {
        const reportWithoutMetadata = {
          ...report,
          calculationMetadata: null,
        };
        await db.collection(COLLECTIONS.REPORTS).doc(reportId).set(reportWithoutMetadata);
        console.warn('[saveReport] Saved report after dropping invalid calculationMetadata payload');
        persistedReport = reportWithoutMetadata;
        savedViaMetadataFallback = true;
      } catch (_) {
        // Fall through to existing error handling
      }
    }
    if (savedViaMetadataFallback) {
      // Continue to shared post-save flow (analytics snapshot + user counters).
    } else {
    if (uid && reportData.cacheKey) {
      const existing = await getCachedReport(uid, reportData.cacheKey, {
        promptVersion: report.promptVersion || null,
        engineVersion: report.engineVersion || null,
      });
      if (existing) return existing.id;
    }
    console.error('[saveReport] Firestore save failed:', saveErr.message);
    throw saveErr;
    }
  }
  await savePromptAnalyticsSnapshot(uid, reportId, persistedReport).catch(() => null);

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
 * Get cached report for a user + normalized input/prompt/engine cache key
 */
async function getCachedReport(uid, cacheKey, options = {}) {
  const db = getDb();
  if (!db) return null;
  if (!uid || !cacheKey) return null;

  try {
    let snapshot;
    try {
      snapshot = await db.collection(COLLECTIONS.REPORTS)
        .where('uid', '==', uid)
        .where('type', '==', 'ai-narrative')
        .where('cacheKey', '==', cacheKey)
        .limit(10)
        .get();
    } catch (indexedErr) {
      console.warn('getCachedReport indexed query failed, using fallback:', indexedErr.message);
      snapshot = await db.collection(COLLECTIONS.REPORTS)
        .where('uid', '==', uid)
        .where('type', '==', 'ai-narrative')
        .limit(50)
        .get();
    }

    if (snapshot.empty) return null;

    const matchingDocs = snapshot.docs
      .map(doc => ({ doc, data: doc.data() }))
      .filter(item => item.data.cacheKey === cacheKey)
      .filter(item => !options.promptVersion || item.data.promptVersion === options.promptVersion)
      .filter(item => !options.engineVersion || item.data.engineVersion === options.engineVersion)
      .sort((a, b) => (b.data.createdAt || '').localeCompare(a.data.createdAt || ''));

    if (matchingDocs.length === 0) return null;

    const doc = matchingDocs[0].doc;
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

// ─── PREDICTION LEDGER (Phase 3) ────────────────────────────────
// Each report carries dated `predictions`. When a window closes the app
// asks "did this happen?" and the answer lands here — the raw material
// for calibrating the convergence-calendar rule weights over time.

/**
 * Record a user's outcome answer for one prediction.
 * outcome ∈ 'yes' | 'no' | 'partial'
 */
async function savePredictionOutcome(uid, { reportId, predictionId, outcome, note = null, prediction = null } = {}) {
  const db = getDb();
  if (!db) return null;
  if (!uid || !reportId || !predictionId || !['yes', 'no', 'partial'].includes(outcome)) return null;

  try {
    // Idempotent per (uid, report, prediction) — answering twice overwrites.
    const docId = crypto.createHash('sha1').update(`${uid}:${reportId}:${predictionId}`).digest('hex');
    const record = sanitizeForFirestore({
      uid,
      reportId,
      predictionId,
      outcome,
      note: note ? String(note).slice(0, 300) : null,
      domain: prediction?.domain || null,
      type: prediction?.type || null,
      tier: prediction?.tier || null,
      score: prediction?.score ?? null,
      source: prediction?.source || null,
      drivers: prediction?.drivers || null,
      windowStart: prediction?.windowStart || null,
      windowEnd: prediction?.windowEnd || null,
      respondedAt: new Date().toISOString(),
    });
    await db.collection(COLLECTIONS.PREDICTION_OUTCOMES).doc(docId).set(record, { merge: true });
    return docId;
  } catch (err) {
    console.error('savePredictionOutcome error:', err.message);
    return null;
  }
}

/**
 * Outcomes already recorded by this user (to filter check-in prompts).
 */
async function getUserPredictionOutcomes(uid, limit = 100) {
  const db = getDb();
  if (!db) return [];
  try {
    const snapshot = await db.collection(COLLECTIONS.PREDICTION_OUTCOMES)
      .where('uid', '==', uid)
      .limit(limit)
      .get();
    return snapshot.docs.map(d => d.data());
  } catch (err) {
    console.error('getUserPredictionOutcomes error:', err.message);
    return [];
  }
}

module.exports = {
  AI_REPORT_CACHE_VERSION,
  buildReportCacheKey,
  upsertUser,
  getUser,
  updateUserProfile,
  updateBirthData,
  updatePreferences,
  saveReport,
  getCachedReport,
  getUserReports,
  savePredictionOutcome,
  getUserPredictionOutcomes,
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
