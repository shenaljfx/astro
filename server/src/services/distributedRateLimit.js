const crypto = require('crypto');
const { getDb, COLLECTIONS } = require('../config/firebase');

function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 40);
}

function getClientKey(req, keyBy) {
  if (keyBy === 'user') return req.user?.uid || req.ip || 'anonymous';
  if (keyBy === 'ip') return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  if (typeof keyBy === 'function') return keyBy(req);
  return req.user?.uid || req.ip || 'anonymous';
}

function distributedRateLimit(options = {}) {
  const name = options.name || 'default';
  const max = Number(options.max || 60);
  const windowMs = Number(options.windowMs || 60 * 1000);
  const keyBy = options.keyBy || 'user';

  return async function distributedRateLimitMiddleware(req, res, next) {
    const db = getDb();
    if (!db) return next();
    const bucket = Math.floor(Date.now() / windowMs);
    const rawKey = getClientKey(req, keyBy);
    const docId = `${name}_${bucket}_${hashKey(rawKey)}`;
    const ref = db.collection(COLLECTIONS.RATE_LIMITS).doc(docId);
    const now = new Date().toISOString();
    const expiresAt = new Date((bucket + 2) * windowMs).toISOString();

    try {
      const result = await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const count = doc.exists ? Number(doc.data().count || 0) : 0;
        if (count >= max) return { allowed: false, count, retryAfter: ((bucket + 1) * windowMs) - Date.now() };
        tx.set(ref, {
          name,
          keyHash: hashKey(rawKey),
          bucket,
          windowMs,
          count: count + 1,
          max,
          createdAt: doc.exists ? doc.data().createdAt : now,
          updatedAt: now,
          expiresAt,
        }, { merge: true });
        return { allowed: true, count: count + 1, retryAfter: 0 };
      });

      if (!result.allowed) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil(result.retryAfter / 1000)));
        return res.status(429).json({
          error: 'Too many requests',
          code: 'DISTRIBUTED_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.max(1, Math.ceil(result.retryAfter / 1000)),
        });
      }
      next();
    } catch (error) {
      console.warn(`[DistributedRateLimit] ${name} failed open:`, error.message);
      next();
    }
  };
}

const distributedAiUserLimiter = distributedRateLimit({
  name: 'ai-user-minute',
  keyBy: 'user',
  max: Number(process.env.DISTRIBUTED_AI_USER_PER_MINUTE || 8),
  windowMs: 60 * 1000,
});

const distributedReportUserLimiter = distributedRateLimit({
  name: 'report-user-hour',
  keyBy: 'user',
  max: Number(process.env.DISTRIBUTED_REPORT_USER_PER_HOUR || 2),
  windowMs: 60 * 60 * 1000,
});

module.exports = {
  distributedRateLimit,
  distributedAiUserLimiter,
  distributedReportUserLimiter,
};