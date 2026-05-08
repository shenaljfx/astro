const crypto = require('crypto');
const { getDb, COLLECTIONS } = require('../config/firebase');

const DEFAULT_JOB_TTL_MS = Number(process.env.JOB_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const DEFAULT_LOCK_MS = Number(process.env.JOB_LOCK_MS || 10 * 60 * 1000);

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 32);
}

function getJobsCollection() {
  const db = getDb();
  if (!db) return null;
  return db.collection(COLLECTIONS.JOBS);
}

function buildJobId(type, uniqueKey) {
  if (!uniqueKey) return `${type}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  return `${type}_${hashKey(uniqueKey)}`;
}

function serializeError(error) {
  if (!error) return null;
  return {
    message: error.message || String(error),
    code: error.code || null,
    statusCode: error.statusCode || error.status || null,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };
}

async function enqueueJob(type, payload = {}, options = {}) {
  const jobs = getJobsCollection();
  if (!jobs) return null;

  const now = new Date().toISOString();
  const jobId = options.jobId || buildJobId(type, options.uniqueKey);
  const ref = jobs.doc(jobId);
  const ttlMs = Number(options.ttlMs || DEFAULT_JOB_TTL_MS);
  const jobData = {
    id: jobId,
    type,
    uid: options.uid || payload.uid || null,
    status: 'queued',
    payload,
    uniqueKey: options.uniqueKey || null,
    progressId: options.progressId || payload.reportId || null,
    attempts: 0,
    maxAttempts: Number(options.maxAttempts || 3),
    runAfter: options.runAfter || now,
    lockedBy: null,
    lockUntil: null,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };

  return getDb().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) {
      const existing = doc.data();
      if (['queued', 'running', 'retrying'].includes(existing.status)) {
        return { id: doc.id, ...existing, deduped: true };
      }
    }
    tx.set(ref, jobData, { merge: true });
    return jobData;
  });
}

async function getJob(jobId) {
  const jobs = getJobsCollection();
  if (!jobs) return null;
  const doc = await jobs.doc(String(jobId)).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function claimNextJob(workerId, types = []) {
  const jobs = getJobsCollection();
  if (!jobs) return null;
  const query = jobs.where('status', '==', 'queued');
  const snap = await query.limit(10).get();
  if (snap.empty) return null;

  const nowMs = Date.now();
  for (const doc of snap.docs) {
    const candidate = doc.data();
    if (types.length > 0 && !types.includes(candidate.type)) continue;
    if (candidate.runAfter && new Date(candidate.runAfter).getTime() > nowMs) continue;
    const claimed = await getDb().runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists) return null;
      const current = fresh.data();
      if (current.status !== 'queued') return null;
      if (current.runAfter && new Date(current.runAfter).getTime() > Date.now()) return null;
      const patch = {
        status: 'running',
        lockedBy: workerId,
        lockUntil: new Date(Date.now() + DEFAULT_LOCK_MS).toISOString(),
        attempts: (current.attempts || 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      tx.update(doc.ref, patch);
      return { id: doc.id, ...current, ...patch };
    });
    if (claimed) return claimed;
  }
  return null;
}

async function completeJob(jobId, result = {}) {
  const jobs = getJobsCollection();
  if (!jobs) return null;
  const patch = {
    status: 'complete',
    result,
    error: null,
    lockedBy: null,
    lockUntil: null,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await jobs.doc(String(jobId)).set(patch, { merge: true });
  return patch;
}

async function failJob(jobId, error, options = {}) {
  const jobs = getJobsCollection();
  if (!jobs) return null;
  const ref = jobs.doc(String(jobId));
  return getDb().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return null;
    const current = doc.data();
    const attempts = current.attempts || 1;
    const maxAttempts = current.maxAttempts || 1;
    const retryable = options.retryable !== false && attempts < maxAttempts;
    const retryDelayMs = Number(options.retryDelayMs || Math.min(15 * 60 * 1000, attempts * 60 * 1000));
    const patch = {
      status: retryable ? 'queued' : 'failed',
      error: serializeError(error),
      lockedBy: null,
      lockUntil: null,
      runAfter: retryable ? new Date(Date.now() + retryDelayMs).toISOString() : current.runAfter,
      failedAt: retryable ? current.failedAt || null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, patch, { merge: true });
    return { ...patch, retryable };
  });
}

async function enqueueReportJob(payload, options = {}) {
  return enqueueJob('aiReport', payload, {
    uid: payload.uid,
    uniqueKey: options.uniqueKey || `${payload.uid}:${payload.cacheKey || payload.reportId}`,
    progressId: payload.reportId,
    maxAttempts: options.maxAttempts || 2,
  });
}

async function enqueueWeeklyLagnaJob(payload = {}, options = {}) {
  const weekId = payload.weekId || 'current';
  return enqueueJob('weeklyLagna', payload, {
    uid: null,
    uniqueKey: options.uniqueKey || `weeklyLagna:${weekId}`,
    maxAttempts: options.maxAttempts || 2,
  });
}

module.exports = {
  enqueueJob,
  enqueueReportJob,
  enqueueWeeklyLagnaJob,
  getJob,
  claimNextJob,
  completeJob,
  failJob,
};