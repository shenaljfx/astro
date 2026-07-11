/**
 * Firestore Circuit Breaker
 * =========================
 *
 * A process-wide breaker that makes the whole app fail FAST and SAFE when
 * Firestore is over quota (gRPC code 8 / RESOURCE_EXHAUSTED) or unavailable
 * (code 14 / deadline / network). Without it, every caller keeps hitting a
 * dead database — which (a) burns even MORE quota, (b) hangs requests on gRPC
 * retries, and (c) spams logs (the `tick failed: 8 RESOURCE_EXHAUSTED` loop).
 *
 * Behaviour:
 *   • A quota error opens the breaker for a long cooldown (quota resets daily,
 *     so hammering is pointless).
 *   • Repeated "unavailable" errors open it for a short cooldown.
 *   • While open, guarded calls short-circuit to a fallback (or throw a clean
 *     FIRESTORE_CIRCUIT_OPEN error the routes turn into 503 + Retry-After).
 *   • It half-opens automatically when the cooldown elapses; the next success
 *     fully closes it.
 *
 * The breaker is in-process and shared by the API routes and the job worker
 * (same Node process), so the worker tripping it also protects the routes.
 */

const QUOTA_COOLDOWN_MS = Number(process.env.FIRESTORE_QUOTA_COOLDOWN_MS || 15 * 60 * 1000);      // 15 min
const UNAVAILABLE_COOLDOWN_MS = Number(process.env.FIRESTORE_UNAVAILABLE_COOLDOWN_MS || 30 * 1000); // 30 s
const FAIL_THRESHOLD = Number(process.env.FIRESTORE_FAIL_THRESHOLD || 3);
const LOG_THROTTLE_MS = 30 * 1000;

let state = 'closed';       // 'closed' | 'open'
let openUntil = 0;
let openReason = null;
let consecutiveFailures = 0;
let lastLogAt = 0;
let totalQuotaTrips = 0;

/**
 * Classify an error as a Firestore quota / availability failure (vs an
 * ordinary application error, which must NOT trip the breaker).
 */
function classifyDbError(error) {
  if (!error) return { isQuota: false, isUnavailable: false, isDbError: false };
  const code = error.code;
  const msg = error.message || String(error);
  const isQuota =
    code === 8 || code === 'resource-exhausted' ||
    /RESOURCE_EXHAUSTED|Quota exceeded|quota metric|too much contention/i.test(msg);
  const isUnavailable =
    code === 14 || code === 'unavailable' ||
    code === 4 || code === 'deadline-exceeded' ||
    /UNAVAILABLE|DEADLINE_EXCEEDED|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network error/i.test(msg);
  return { isQuota, isUnavailable, isDbError: isQuota || isUnavailable };
}

function _throttledLog(message) {
  const now = Date.now();
  if (now - lastLogAt > LOG_THROTTLE_MS) {
    console.error(`[FirestoreCircuit] ${message}`);
    lastLogAt = now;
  }
}

function open(reason, cooldownMs) {
  state = 'open';
  openReason = reason;
  openUntil = Date.now() + cooldownMs;
  if (reason === 'quota_exceeded') totalQuotaTrips += 1;
  _throttledLog(`OPEN (${reason}) for ${Math.round(cooldownMs / 1000)}s — Firestore calls fail fast until then.`);
}

function recordSuccess() {
  consecutiveFailures = 0;
  if (state === 'open' && Date.now() >= openUntil) {
    state = 'closed';
    openReason = null;
    console.log('[FirestoreCircuit] CLOSED — Firestore recovered.');
  }
}

/**
 * Record an error. Returns the classification. Only DB-availability errors
 * trip the breaker; application/logic errors pass through untouched.
 */
function recordError(error) {
  const c = classifyDbError(error);
  if (!c.isDbError) return c;
  consecutiveFailures += 1;
  if (c.isQuota) {
    open('quota_exceeded', QUOTA_COOLDOWN_MS);
  } else if (consecutiveFailures >= FAIL_THRESHOLD) {
    open('unavailable', UNAVAILABLE_COOLDOWN_MS);
  }
  return c;
}

function isOpen() {
  if (state !== 'open') return false;
  if (Date.now() >= openUntil) {
    // Cooldown elapsed → half-open: allow the next call through to probe.
    state = 'closed';
    openReason = null;
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

function msRemaining() {
  return state === 'open' ? Math.max(0, openUntil - Date.now()) : 0;
}

function getState() {
  return { state, openReason, msRemaining: msRemaining(), consecutiveFailures, totalQuotaTrips };
}

/**
 * Run a Firestore operation under the breaker.
 *
 * @param {Function} fn - async operation to run
 * @param {object}   opts
 * @param {*}        opts.fallback - value returned when the breaker is open or
 *                                   a DB error occurs and rethrow is false
 * @param {boolean}  opts.rethrow  - if true, throw FIRESTORE_CIRCUIT_OPEN (open)
 *                                   or the original DB error instead of falling back
 * @param {string}   opts.label    - short label for logging
 */
async function guard(fn, opts = {}) {
  const { fallback = undefined, rethrow = false, label = 'db' } = opts;
  if (isOpen()) {
    if (rethrow) {
      const err = new Error(`Firestore temporarily unavailable (${openReason})`);
      err.code = 'FIRESTORE_CIRCUIT_OPEN';
      err.retryAfterMs = msRemaining();
      throw err;
    }
    return fallback;
  }
  try {
    const result = await fn();
    recordSuccess();
    return result;
  } catch (error) {
    const c = recordError(error);
    if (rethrow || !c.isDbError) throw error; // surface app errors; optionally surface DB errors
    _throttledLog(`${label} degraded (${error.code || 'db_error'}) — using fallback.`);
    return fallback;
  }
}

module.exports = {
  classifyDbError,
  recordError,
  recordSuccess,
  isOpen,
  open,
  guard,
  getState,
  msRemaining,
  QUOTA_COOLDOWN_MS,
  UNAVAILABLE_COOLDOWN_MS,
};
