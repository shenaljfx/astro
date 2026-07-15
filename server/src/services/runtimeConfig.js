/**
 * runtimeConfig — live, dashboard-editable operational settings that layer on
 * top of process.env WITHOUT a restart, and a masked viewer for the rest.
 *
 * Design: only the keys in EDITABLE_KEYS (all non-secret numeric knobs) can be
 * overridden, and overrides live in Firestore `config/runtimeConfig`. Secrets
 * (API keys, JWT, webhook auth) are NEVER writable here and are only ever shown
 * masked — they stay on the VM. Overrides are cached in memory and refreshed in
 * the background so hot-path reads (budget gate) stay synchronous.
 */
const admin = require('firebase-admin');
const { getDb } = require('../config/firebase');

// Editable knobs. Each is wired into real code (budgetEnforcer / capacity math).
const EDITABLE_KEYS = {
  DAILY_GLOBAL_AI_SPEND_LIMIT_LKR: { type: 'number', min: 0, max: 1e7, group: 'Budget caps', help: 'Global daily AI spend cap (LKR). 0 = no cap.' },
  DAILY_USER_AI_SPEND_LIMIT_LKR:   { type: 'number', min: 0, max: 1e6, group: 'Budget caps', help: 'Per-user daily AI spend cap (LKR). 0 = no cap.' },
  AI_BUDGET_ESTIMATE_FULLREPORT_LKR:    { type: 'number', min: 0, max: 5000, group: 'Cost reservations', help: 'Reserved budget per full report.' },
  AI_BUDGET_ESTIMATE_PORONDAMREPORT_LKR:{ type: 'number', min: 0, max: 5000, group: 'Cost reservations', help: 'Reserved budget per porondam report.' },
  AI_BUDGET_ESTIMATE_WEEKLYLAGNA_LKR:   { type: 'number', min: 0, max: 5000, group: 'Cost reservations', help: 'Reserved budget per weekly lagna.' },
  AI_BUDGET_ESTIMATE_READING_LKR:       { type: 'number', min: 0, max: 5000, group: 'Cost reservations', help: 'Reserved budget per reading.' },
  AI_BUDGET_ESTIMATE_AIANALYSIS_LKR:    { type: 'number', min: 0, max: 5000, group: 'Cost reservations', help: 'Reserved budget per AI analysis.' },
  GEMINI_PRO_CALLS_PER_REPORT:   { type: 'number', min: 1, max: 100, group: 'Capacity estimate', help: 'Assumed pro-model calls per report (capacity math only).' },
  GEMINI_FLASH_CALLS_PER_REPORT: { type: 'number', min: 1, max: 500, group: 'Capacity estimate', help: 'Assumed flash-model calls per report (capacity math only).' },
};

// Which env keys the viewer surfaces (avoids dumping PATH etc.), and which are secret.
const APP_KEY_RX = /^(GEMINI|AI_|REVENUECAT|JWT|GOOGLE|FIREBASE|ALERT|ADMIN|PAYWALL|JOB_|WORKER|LOG_|TRUST_PROXY|NODE_ENV|PORT|EXTRA_CORS|MOCK_PAYMENTS|DAILY_|STORAGE|SENTRY|WEBHOOK|EXPO)/;
// AUTH only as a word-segment (start or after "_") so OAUTH client IDs (public)
// aren't masked, while WEBHOOK_AUTH_KEY etc. still are.
const SECRET_RX = /(SECRET|KEY|TOKEN|PASSWORD|PRIVATE|CREDENTIAL|(?:^|_)AUTH)/i;

const CONFIG_DOC = 'runtimeConfig';
let cache = {};

function isSecretKey(key) { return SECRET_RX.test(key); }

async function refresh() {
  const db = getDb();
  if (!db) return;
  try {
    const doc = await db.collection('config').doc(CONFIG_DOC).get();
    cache = doc.exists ? (doc.data() || {}) : {};
  } catch { /* keep last cache — never throw on the hot path */ }
}

/** Load once + refresh every 30s so overrideNumber() is a sync in-memory read. */
function startRuntimeConfig() {
  refresh();
  setInterval(refresh, 30 * 1000).unref();
}

/** Effective override for a numeric key, or undefined if none set. */
function overrideNumber(key) {
  const v = cache[key];
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function validate(key, value) {
  const schema = EDITABLE_KEYS[key];
  if (!schema) return { ok: false, error: `${key} is not editable` };
  if (value === null) return { ok: true, value: null }; // reset to env default
  if (schema.type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) return { ok: false, error: `${key} must be a number` };
    if (schema.min != null && n < schema.min) return { ok: false, error: `${key} must be >= ${schema.min}` };
    if (schema.max != null && n > schema.max) return { ok: false, error: `${key} must be <= ${schema.max}` };
    return { ok: true, value: n };
  }
  return { ok: false, error: `${key} has unsupported type` };
}

/** Apply a {key: value} patch (value null → reset). Returns updated effective config. */
async function setOverrides(patch, meta = {}) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');
  const write = {};
  for (const [key, value] of Object.entries(patch || {})) {
    const v = validate(key, value);
    if (!v.ok) throw new Error(v.error);
    write[key] = v.value === null ? admin.firestore.FieldValue.delete() : v.value;
  }
  if (!Object.keys(write).length) throw new Error('No editable keys in request');
  write._updatedBy = meta.by || null;
  write._updatedAt = new Date().toISOString();
  await db.collection('config').doc(CONFIG_DOC).set(write, { merge: true });
  await refresh();
  return effective();
}

/** Effective value (override ?? env) for every editable key. */
function effective() {
  const out = {};
  for (const key of Object.keys(EDITABLE_KEYS)) {
    const o = overrideNumber(key);
    out[key] = {
      value: o !== undefined ? o : (process.env[key] !== undefined ? Number(process.env[key]) : null),
      source: o !== undefined ? 'override' : (process.env[key] !== undefined ? 'env' : 'default'),
      overridden: o !== undefined,
    };
  }
  return out;
}

/** Masked list of app-relevant env vars for the read-only viewer. */
function maskedEnv() {
  return Object.keys(process.env)
    .filter((k) => APP_KEY_RX.test(k))
    .sort()
    .map((key) => {
      const val = process.env[key];
      const secret = isSecretKey(key);
      const set = val !== undefined && val !== '';
      let display;
      if (!set) display = '(not set)';
      else if (secret) display = `••••••${String(val).slice(-4)}`;
      else display = String(val).length > 80 ? `${String(val).slice(0, 80)}…` : String(val);
      return { key, set, secret, display, length: set ? String(val).length : 0, editable: !!EDITABLE_KEYS[key] };
    });
}

module.exports = {
  EDITABLE_KEYS,
  startRuntimeConfig,
  overrideNumber,
  setOverrides,
  effective,
  maskedEnv,
  isSecretKey,
  validate,
};
