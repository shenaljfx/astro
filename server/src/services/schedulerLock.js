/**
 * Scheduler leader election (fix F2)
 *
 * The notification scheduler used to start on EVERY API instance. On any
 * autoscaled host that means the per-minute scan cost multiplied by the
 * instance count AND users received duplicate push notifications.
 *
 * This provides a lightweight Firestore lease so exactly ONE instance acts as
 * leader at a time. Leadership is acquired/renewed on a background interval
 * (not per tick), so the steady-state cost is a single transaction every
 * ~30s per instance — bounded and negligible.
 *
 * Degradation: if the DB is unavailable or the lease can't be acquired, this
 * instance simply does NOT lead. Losing a few notification ticks is preferable
 * to every instance firing duplicates.
 */
const os = require('os');
const crypto = require('crypto');
const { getDb } = require('../config/firebase');
const { toTtlTimestamp } = require('../utils/firestoreTtl');

const LOCK_COLLECTION = 'schedulerLocks';
const LOCK_DOC = process.env.SCHEDULER_LOCK_NAME || 'notification-scheduler';
const INSTANCE_ID = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;

// Lease longer than the renew interval so a brief renew hiccup doesn't drop
// leadership; short enough that a dead leader is replaced within ~1.5 min.
const LEASE_MS = Number(process.env.SCHEDULER_LEASE_MS || 90 * 1000);
const RENEW_MS = Number(process.env.SCHEDULER_RENEW_MS || 30 * 1000);

// Single-instance / self-hosted escape hatch: skip the Firestore lease entirely.
const SINGLE_INSTANCE = process.env.SCHEDULER_SINGLE_INSTANCE === 'true';

let _isLeader = false;
let _renewTimer = null;

async function tryAcquire() {
  if (SINGLE_INSTANCE) { _isLeader = true; return true; }

  const db = getDb();
  if (!db) { _isLeader = false; return false; }

  const ref = db.collection(LOCK_COLLECTION).doc(LOCK_DOC);
  const now = Date.now();

  try {
    const leader = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.exists ? doc.data() : null;
      const leaseUntilMs = data && data.leaseUntil ? Date.parse(data.leaseUntil) : 0;

      // Someone else holds a still-valid lease → we are not leader.
      const heldByOther = data && data.holder && data.holder !== INSTANCE_ID && leaseUntilMs > now;
      if (heldByOther) return false;

      const acquiredAt = (data && data.holder === INSTANCE_ID && data.acquiredAt)
        ? data.acquiredAt
        : new Date(now).toISOString();

      tx.set(ref, {
        holder: INSTANCE_ID,
        acquiredAt,
        leaseUntil: new Date(now + LEASE_MS).toISOString(),
        updatedAt: new Date(now).toISOString(),
        ttlExpireAt: toTtlTimestamp(now + LEASE_MS + 24 * 60 * 60 * 1000),
      }, { merge: true });
      return true;
    });
    _isLeader = !!leader;
  } catch (e) {
    // On any error, relinquish rather than risk split-brain duplicate sends.
    _isLeader = false;
  }
  return _isLeader;
}

function isLeader() {
  return _isLeader;
}

function startLeadership() {
  if (_renewTimer) return;
  // Fire once immediately so leadership is known before the first tick.
  tryAcquire().catch(() => { _isLeader = false; });
  _renewTimer = setInterval(() => { tryAcquire().catch(() => { _isLeader = false; }); }, RENEW_MS);
  if (_renewTimer.unref) _renewTimer.unref();
}

function stopLeadership() {
  if (_renewTimer) { clearInterval(_renewTimer); _renewTimer = null; }
  _isLeader = false;
}

module.exports = { startLeadership, stopLeadership, isLeader, INSTANCE_ID };
