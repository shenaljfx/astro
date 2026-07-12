/**
 * Firestore TTL helper (fix F3)
 *
 * Firestore TTL policies ONLY delete documents whose designated field is a
 * native Timestamp. Historically this codebase wrote `expiresAt` as an ISO
 * string (`.toISOString()`), so no TTL policy ever matched and the high-churn
 * collections (jobs, rateLimits, aiCostEvents, webhook events, …) grew forever.
 *
 * Every collection that wants auto-expiry should now ALSO write a canonical
 * `ttlExpireAt` Timestamp field via `toTtlTimestamp(...)`, and a TTL policy must
 * be configured on that field name in the Firebase console (see README /
 * .env.example). The human-readable `expiresAt` string is kept for debugging.
 *
 * Canonical TTL field name across all collections:
 */
const TTL_FIELD = 'ttlExpireAt';

let admin = null;
try {
  admin = require('firebase-admin');
} catch (_) {
  admin = null;
}

/**
 * Convert an expiry (Date | ISO string | epoch ms) into a Firestore Timestamp.
 * Falls back to a JS Date if the Admin SDK isn't loadable (tests/no-db).
 */
function toTtlTimestamp(expiry) {
  let ms;
  if (expiry instanceof Date) ms = expiry.getTime();
  else if (typeof expiry === 'number') ms = expiry;
  else if (typeof expiry === 'string') ms = Date.parse(expiry);
  else ms = Date.now();
  if (!Number.isFinite(ms)) ms = Date.now();

  if (admin && admin.firestore && admin.firestore.Timestamp) {
    return admin.firestore.Timestamp.fromMillis(ms);
  }
  return new Date(ms);
}

/** Timestamp `ttlMs` milliseconds from now. */
function ttlFromNow(ttlMs) {
  return toTtlTimestamp(Date.now() + Number(ttlMs || 0));
}

module.exports = { TTL_FIELD, toTtlTimestamp, ttlFromNow };
