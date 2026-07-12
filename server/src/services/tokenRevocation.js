/**
 * Token revocation — server-side invalidation for our long-lived app JWTs.
 *
 * WHY:
 *   Our google-auth JWT is valid for 30 days and, until now, sign-out only
 *   cleared it on the device — a leaked/stolen token stayed valid server-side
 *   for the full window with no way to kill it. This adds a `tokenVersion`
 *   claim: each user doc carries a current `tokenVersion`; a token is valid
 *   only while its embedded version is >= the user's current version. Logging
 *   out (or a forced global sign-out) bumps the user's version, instantly
 *   invalidating every token issued before the bump.
 *
 * COST:
 *   Checked on the authenticated/paid surface via enforceTokenNotRevoked.
 *   A 60s in-memory cache keeps this at ~1 Firestore read per user per minute
 *   instead of one per request. Multi-instance deployments converge within the
 *   cache TTL, which is fine for a "kill a leaked token" control.
 *
 * BACKWARD COMPATIBILITY:
 *   Legacy tokens (no tokenVersion claim) read as version 0, and users with no
 *   tokenVersion field read as 0 — so nothing is revoked until a logout bumps
 *   the field. Firebase ID tokens are short-lived and self-revoking; they are
 *   never subject to this check.
 */

const { getDb, COLLECTIONS } = require('../config/firebase');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // uid -> { version, ts }

/**
 * Current token version for a user (cached). Fails OPEN (returns the last
 * known value, or 0) so a transient Firestore error never locks users out.
 */
async function currentTokenVersion(uid) {
  const cached = cache.get(uid);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.version;

  const db = getDb();
  if (!db) return cached ? cached.version : 0;

  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const version = doc.exists ? Number(doc.data().tokenVersion || 0) : 0;
    cache.set(uid, { version, ts: Date.now() });
    return version;
  } catch (e) {
    console.warn('[tokenRevocation] version lookup failed (fail-open):', e.message);
    return cached ? cached.version : 0;
  }
}

/**
 * True if a token with `tokenVersion` has been revoked for this user.
 */
async function isTokenRevoked(uid, tokenVersion) {
  if (!uid) return false;
  const current = await currentTokenVersion(uid);
  return Number(tokenVersion || 0) < current;
}

/**
 * Invalidate all existing tokens for a user by bumping their version.
 * Returns the new version (or null if no DB). Also drops the cache entry so
 * the new value is read on the next check within this instance.
 */
async function revokeUserTokens(uid) {
  const db = getDb();
  if (!db || !uid) {
    cache.delete(uid);
    return null;
  }
  const ref = db.collection(COLLECTIONS.USERS).doc(uid);
  const next = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const version = doc.exists ? Number(doc.data().tokenVersion || 0) : 0;
    const bumped = version + 1;
    tx.set(ref, { tokenVersion: bumped, updatedAt: new Date().toISOString() }, { merge: true });
    return bumped;
  });
  cache.set(uid, { version: next, ts: Date.now() });
  return next;
}

/**
 * Express middleware — rejects requests bearing a revoked app JWT.
 * Must run AFTER an auth middleware that populates req.user (phoneAuth /
 * requireAuth). No-op for anonymous, missing, or Firebase-issued tokens.
 * Fails OPEN on any error so revocation-check faults never block real users.
 */
async function enforceTokenNotRevoked(req, res, next) {
  try {
    const u = req.user;
    if (u && u.uid && u.authType !== 'firebase' && u.authType !== 'anonymous' && !u.anonymous) {
      if (await isTokenRevoked(u.uid, u.tokenVersion)) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.', code: 'TOKEN_REVOKED' });
      }
    }
  } catch (e) {
    // Never block on a revocation-check failure.
  }
  next();
}

module.exports = {
  currentTokenVersion,
  isTokenRevoked,
  revokeUserTokens,
  enforceTokenNotRevoked,
};
