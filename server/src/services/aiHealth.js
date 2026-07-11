/**
 * AI provider health — the pre-payment gate.
 * ===========================================
 *
 * A passive circuit breaker fed by real report-generation traffic. The app
 * calls GET /api/porondam/report/health BEFORE showing the paywall, so a
 * user is never charged into a known provider outage, rate-limit storm, or
 * an exhausted daily AI budget.
 *
 * Passive by design: no ping calls (they cost tokens and can themselves be
 * rate-limited). When there is no recent traffic the state is optimistic —
 * the entitlement system (free retries) covers the residual risk after
 * payment.
 *
 * In-memory, per-instance state. If the API ever runs multi-instance, move
 * this into the distributed rate-limit store; for now one instance serves
 * the app and this stays simple.
 */

'use strict';

const FAILURE_THRESHOLD = 2;            // consecutive provider errors before reporting down
const BASE_COOLDOWN_MS = 90 * 1000;     // first cooldown once the threshold trips
const MAX_COOLDOWN_MS = 10 * 60 * 1000; // never block longer than 10 minutes per trip

const state = {
  consecutiveFailures: 0,
  blockedUntil: 0,
  lastFailureCode: null,
  lastSuccessAt: 0,
  lastFailureAt: 0,
};

/** Call after any successful AI generation. Fully resets the circuit. */
function recordAISuccess() {
  state.consecutiveFailures = 0;
  state.blockedUntil = 0;
  state.lastFailureCode = null;
  state.lastSuccessAt = Date.now();
}

/**
 * Call after a TEMPORARY provider failure (rate limit / unavailable).
 * Hard non-provider errors (bad input, our bugs) should NOT be recorded —
 * they say nothing about provider availability.
 *
 * @param {string} [code] - e.g. 'AI_PROVIDER_RATE_LIMIT' | 'AI_PROVIDER_UNAVAILABLE'
 * @param {number} [retryAfterSeconds] - provider-suggested wait, if any
 */
function recordAIFailure(code, retryAfterSeconds) {
  const now = Date.now();
  state.consecutiveFailures += 1;
  state.lastFailureAt = now;
  state.lastFailureCode = code || 'AI_PROVIDER_UNAVAILABLE';

  // A provider-stated Retry-After is authoritative even on the first failure.
  if (retryAfterSeconds && Number.isFinite(Number(retryAfterSeconds))) {
    const wait = Math.min(Math.max(Number(retryAfterSeconds) * 1000, BASE_COOLDOWN_MS), MAX_COOLDOWN_MS);
    state.blockedUntil = Math.max(state.blockedUntil, now + wait);
    return;
  }

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    const exponent = state.consecutiveFailures - FAILURE_THRESHOLD;
    const backoff = Math.min(BASE_COOLDOWN_MS * Math.pow(2, exponent), MAX_COOLDOWN_MS);
    state.blockedUntil = Math.max(state.blockedUntil, now + backoff);
  }
}

/**
 * Current availability as seen by the circuit (budget is checked separately
 * by the route, since it needs the caller's uid).
 * @returns {{ available: boolean, reason?: 'busy'|'unavailable', retryInSeconds?: number }}
 */
function getAIHealth() {
  const now = Date.now();
  if (state.blockedUntil > now) {
    return {
      available: false,
      reason: state.lastFailureCode === 'AI_PROVIDER_RATE_LIMIT' ? 'busy' : 'unavailable',
      retryInSeconds: Math.ceil((state.blockedUntil - now) / 1000),
    };
  }
  return { available: true };
}

module.exports = { recordAISuccess, recordAIFailure, getAIHealth };
