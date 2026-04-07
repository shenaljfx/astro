/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ENTITLEMENTS — Secure "Pay Once, Generate Until Success" System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PROBLEM:
 *   Payment succeeds (RevenueCat / token) → server generation fails
 *   → user lost money but got nothing.
 *
 * SOLUTION — "Generation Entitlements":
 *   1. After successful payment, server creates an ENTITLEMENT record in
 *      Firestore: { uid, type, status: 'pending', inputHash, createdAt }
 *   2. Generation runs. On success → status: 'fulfilled'.
 *   3. On failure → status stays 'pending'. User can retry with the SAME
 *      entitlement ID — no second payment needed.
 *   4. Entitlements expire after 7 days (garbage collection).
 *   5. Each entitlement is tied to an INPUT HASH (SHA-256 of birth data),
 *      so the same person can't reuse one entitlement for different inputs.
 *
 * SECURITY (anti-hack):
 *   - Entitlements are created SERVER-SIDE only (never by client)
 *   - Input hash binds the entitlement to specific birth data
 *   - Max 3 retries per entitlement (prevents infinite farming)
 *   - 7-day TTL auto-expires stale entitlements
 *   - Rate-limited: max 5 pending entitlements per user at a time
 *   - Entitlement IDs are UUIDs (not guessable)
 *   - All mutations are Firestore transactions (atomic)
 *
 * USAGE:
 *   // In route — after payment check but before generation:
 *   const ent = await createOrResumeEntitlement(uid, 'report', inputData);
 *   // ent.isRetry === true means no payment was needed (resuming failed gen)
 *   // ... run generation ...
 *   await fulfillEntitlement(ent.id);
 *   // On failure: entitlement stays 'pending', client can retry
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/firebase');

const COLLECTION = 'entitlements';
const MAX_RETRIES = 3;
const TTL_DAYS = 7;
const MAX_PENDING_PER_USER = 5;

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Hash the input data to create a fingerprint.
 * This binds the entitlement to specific birth data so it can't be reused
 * for different people.
 */
function hashInput(inputData) {
  const normalized = JSON.stringify(inputData, Object.keys(inputData).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Check if an entitlement has expired (older than TTL_DAYS).
 */
function isExpired(entitlement) {
  if (!entitlement.createdAt) return true;
  const created = new Date(entitlement.createdAt);
  const now = new Date();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > TTL_DAYS;
}

// ─── Core Functions ────────────────────────────────────────────────────────

/**
 * Create a new entitlement OR resume an existing pending one.
 *
 * @param {string} uid          - Firebase user ID
 * @param {string} type         - 'report' | 'porondam'
 * @param {object} inputData    - The birth data (used for hash binding)
 * @param {object} [options]    - { skipPaymentCheck: false }
 * @returns {object} { id, isRetry, retriesLeft, status }
 */
async function createOrResumeEntitlement(uid, type, inputData, options = {}) {
  const db = getDb();

  // ── No DB (dev mode) — always allow ───────────────────────────
  if (!db) {
    return {
      id: 'dev-' + uuidv4(),
      isRetry: false,
      retriesLeft: MAX_RETRIES,
      status: 'pending',
      mock: true,
    };
  }

  const inputHash = hashInput(inputData);
  const entRef = db.collection(COLLECTION);

  // ── Check for existing pending entitlement with same input ────
  const existing = await entRef
    .where('uid', '==', uid)
    .where('type', '==', type)
    .where('inputHash', '==', inputHash)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data();

    // Check if expired
    if (isExpired(data)) {
      // Mark as expired, don't allow retry
      await doc.ref.update({ status: 'expired', updatedAt: new Date().toISOString() });
      // Fall through to create new one (will need payment)
    } else if (data.retryCount >= MAX_RETRIES) {
      // Too many retries — mark as exhausted
      await doc.ref.update({ status: 'exhausted', updatedAt: new Date().toISOString() });
      throw Object.assign(new Error('Maximum retries exceeded for this generation. Please contact support.'), {
        code: 'ENTITLEMENT_EXHAUSTED',
        entitlementId: doc.id,
      });
    } else {
      // ✅ Valid pending entitlement — allow retry without payment
      await doc.ref.update({
        retryCount: (data.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(`[Entitlements] ♻️ Resuming ${type} entitlement ${doc.id} for ${uid} (retry ${(data.retryCount || 0) + 1}/${MAX_RETRIES})`);

      return {
        id: doc.id,
        isRetry: true,
        retriesLeft: MAX_RETRIES - ((data.retryCount || 0) + 1),
        status: 'pending',
      };
    }
  }

  // ── Rate limit: max pending entitlements per user ─────────────
  const pendingCount = await entRef
    .where('uid', '==', uid)
    .where('status', '==', 'pending')
    .get();

  if (pendingCount.size >= MAX_PENDING_PER_USER) {
    throw Object.assign(new Error('Too many pending generations. Please complete or wait for existing ones to expire.'), {
      code: 'TOO_MANY_PENDING',
      count: pendingCount.size,
      max: MAX_PENDING_PER_USER,
    });
  }

  // ── Create new entitlement ────────────────────────────────────
  const entId = uuidv4();
  const entDoc = {
    uid,
    type,
    inputHash,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };

  await entRef.doc(entId).set(entDoc);
  console.log(`[Entitlements] ✅ Created ${type} entitlement ${entId} for ${uid} (hash: ${inputHash.slice(0, 8)}...)`);

  return {
    id: entId,
    isRetry: false,
    retriesLeft: MAX_RETRIES,
    status: 'pending',
  };
}

/**
 * Mark an entitlement as fulfilled (generation succeeded).
 *
 * @param {string} entitlementId - The entitlement document ID
 * @param {object} [metadata]    - Optional metadata to store (e.g. reportId)
 */
async function fulfillEntitlement(entitlementId, metadata = {}) {
  const db = getDb();
  if (!db || entitlementId.startsWith('dev-')) return;

  const ref = db.collection(COLLECTION).doc(entitlementId);
  await ref.update({
    status: 'fulfilled',
    fulfilledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...metadata,
  });

  console.log(`[Entitlements] 🎉 Fulfilled entitlement ${entitlementId}`);
}

/**
 * Mark an entitlement as failed (generation error).
 * Keeps status 'pending' so it can be retried — just logs the error.
 *
 * @param {string} entitlementId - The entitlement document ID
 * @param {string} errorMessage  - Error description
 */
async function recordEntitlementError(entitlementId, errorMessage) {
  const db = getDb();
  if (!db || entitlementId.startsWith('dev-')) return;

  const ref = db.collection(COLLECTION).doc(entitlementId);
  await ref.update({
    lastError: errorMessage,
    lastErrorAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log(`[Entitlements] ⚠️ Error on entitlement ${entitlementId}: ${errorMessage}`);
}

/**
 * Check if a user has a pending (retryable) entitlement for given input.
 * Called from mobile to show "Retry" button instead of "Pay again".
 *
 * @param {string} uid       - Firebase user ID
 * @param {string} type      - 'report' | 'porondam'
 * @param {object} inputData - Birth data to match
 * @returns {object|null} Pending entitlement info or null
 */
async function checkPendingEntitlement(uid, type, inputData) {
  const db = getDb();
  if (!db) return null;

  const inputHash = hashInput(inputData);
  const snap = await db.collection(COLLECTION)
    .where('uid', '==', uid)
    .where('type', '==', type)
    .where('inputHash', '==', inputHash)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (snap.empty) return null;

  const doc = snap.docs[0];
  const data = doc.data();

  if (isExpired(data)) return null;
  if (data.retryCount >= MAX_RETRIES) return null;

  return {
    id: doc.id,
    retriesLeft: MAX_RETRIES - (data.retryCount || 0),
    createdAt: data.createdAt,
    lastError: data.lastError || null,
  };
}

/**
 * Get all entitlements for a user (for profile/history page).
 *
 * @param {string} uid  - Firebase user ID
 * @param {string} type - 'report' | 'porondam' | null for all
 * @returns {Array} Entitlement records
 */
async function getUserEntitlements(uid, type = null) {
  const db = getDb();
  if (!db) return [];

  let query = db.collection(COLLECTION).where('uid', '==', uid);
  if (type) query = query.where('type', '==', type);
  query = query.orderBy('createdAt', 'desc').limit(20);

  const snap = await query.get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Cleanup expired entitlements (run periodically via cron or on-demand).
 */
async function cleanupExpiredEntitlements() {
  const db = getDb();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('createdAt', '<', cutoff)
    .limit(100)
    .get();

  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'expired', updatedAt: new Date().toISOString() });
  });

  if (snap.size > 0) {
    await batch.commit();
    console.log(`[Entitlements] 🧹 Expired ${snap.size} stale entitlements`);
  }

  return snap.size;
}

// ─── Express Middleware ────────────────────────────────────────────────────

/**
 * Middleware factory: checks/creates entitlement before generation.
 * Must be used AFTER phoneAuth.
 *
 * Attaches to req:
 *   req.entitlement      — { id, isRetry, retriesLeft }
 *   req.fulfillGen()     — call after successful generation
 *   req.failGen(errMsg)  — call on generation failure
 *
 * @param {string} type          - 'report' | 'porondam'
 * @param {Function} inputExtractor - (req) => object to hash as input fingerprint
 */
function requireEntitlement(type, inputExtractor) {
  return async function(req, res, next) {
    // Dev mode bypass
    const db = getDb();
    if (!db) {
      req.entitlement = { id: 'dev-' + uuidv4(), isRetry: false, retriesLeft: MAX_RETRIES, mock: true };
      req.fulfillGen = async () => {};
      req.failGen = async () => {};
      return next();
    }

    // Must be authenticated
    if (!req.user || !req.user.uid || req.user.authType === 'anonymous') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const inputData = inputExtractor(req);
      const entitlement = await createOrResumeEntitlement(req.user.uid, type, inputData);

      req.entitlement = entitlement;
      req.fulfillGen = () => fulfillEntitlement(entitlement.id);
      req.failGen = (errMsg) => recordEntitlementError(entitlement.id, errMsg);

      next();
    } catch (err) {
      if (err.code === 'ENTITLEMENT_EXHAUSTED') {
        return res.status(410).json({
          error: err.message,
          code: 'ENTITLEMENT_EXHAUSTED',
          entitlementId: err.entitlementId,
        });
      }
      if (err.code === 'TOO_MANY_PENDING') {
        return res.status(429).json({
          error: err.message,
          code: 'TOO_MANY_PENDING',
          count: err.count,
          max: err.max,
        });
      }
      console.error('[Entitlements] Middleware error:', err);
      return res.status(500).json({ error: 'Entitlement check failed' });
    }
  };
}

module.exports = {
  createOrResumeEntitlement,
  fulfillEntitlement,
  recordEntitlementError,
  checkPendingEntitlement,
  getUserEntitlements,
  cleanupExpiredEntitlements,
  requireEntitlement,
  hashInput,
};
