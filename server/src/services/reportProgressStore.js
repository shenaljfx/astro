const { getDb, COLLECTIONS } = require('../config/firebase');
const { toTtlTimestamp } = require('../utils/firestoreTtl');

const DEFAULT_PROGRESS_TTL_MS = Number(process.env.REPORT_PROGRESS_TTL_MS || 24 * 60 * 60 * 1000);

function buildExpiresAt(ttlMs = DEFAULT_PROGRESS_TTL_MS) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function getProgressRef(reportId) {
  const db = getDb();
  if (!db || !reportId) return null;
  return db.collection(COLLECTIONS.REPORT_PROGRESS).doc(String(reportId));
}

async function createProgressRecord(reportId, data = {}) {
  const ref = getProgressRef(reportId);
  if (!ref) return null;
  const now = new Date().toISOString();
  const record = {
    reportId: String(reportId),
    ownerUid: data.ownerUid || null,
    jobId: data.jobId || null,
    stage: data.stage || 'queued',
    sectionsDone: data.sectionsDone || 0,
    sectionsTotal: data.sectionsTotal || 0,
    currentSection: data.currentSection || null,
    completedSections: Array.isArray(data.completedSections) ? data.completedSections : [],
    savedReportId: data.savedReportId || null,
    error: data.error || null,
    startedAt: data.startedAt || Date.now(),
    createdAt: data.createdAt || now,
    updatedAt: now,
    expiresAt: data.expiresAt || buildExpiresAt(data.ttlMs),
    // Timestamp TTL (fix F3) so progress records self-clean.
    ttlExpireAt: toTtlTimestamp(data.expiresAt || (Date.now() + Number(data.ttlMs || DEFAULT_PROGRESS_TTL_MS))),
  };
  await ref.set(record, { merge: true });
  return record;
}

async function updateProgressRecord(reportId, update = {}) {
  const ref = getProgressRef(reportId);
  if (!ref) return null;
  const patch = {
    ...update,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(patch, { merge: true });
  return patch;
}

async function getProgressRecord(reportId) {
  const ref = getProgressRef(reportId);
  if (!ref) return null;
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;
  return { id: doc.id, ...data };
}

async function archiveProgressRecord(reportId) {
  return updateProgressRecord(reportId, { archivedAt: new Date().toISOString() });
}

module.exports = {
  createProgressRecord,
  updateProgressRecord,
  getProgressRecord,
  archiveProgressRecord,
  buildExpiresAt,
};