/**
 * Admin dashboard authentication — Firebase ID token + hard email allowlist.
 *
 * Unlike requireAdmin (shared-secret header for internal ops calls), this
 * authenticates a human in a browser: the admin SPA signs in with Google via
 * Firebase Auth and sends the Firebase ID token as a Bearer token. We verify
 * the token signature AND require the email to be on the allowlist with a
 * verified email. Everything else is a hard 403 — there is no dev bypass.
 */
const { getAuth, getDb } = require('../config/firebase');

const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || 'shenalsamaranayakejfx@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

async function adminAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const auth = getAuth();
    if (!auth) {
      return res.status(503).json({ error: 'Auth service unavailable' });
    }

    const decoded = await auth.verifyIdToken(header.slice(7));
    const email = String(decoded.email || '').toLowerCase();

    if (!email || decoded.email_verified !== true || !ADMIN_EMAILS.includes(email)) {
      console.warn(`[adminAuth] DENIED ${email || '(no email)'} uid=${decoded.uid || '?'} ip=${req.ip}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.admin = { uid: decoded.uid, email };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Append an entry to the adminAudit collection. Fire-and-forget — an audit
 * write failure must never block the admin action itself, but it is logged.
 */
function writeAudit(req, action, target, details = {}) {
  const db = getDb();
  if (!db) return;
  db.collection('adminAudit')
    .doc()
    .set({
      action,
      target: target == null ? null : String(target).slice(0, 200),
      details,
      by: req.admin ? req.admin.email : null,
      ip: req.ip || null,
      at: new Date().toISOString(),
    })
    .catch((e) => console.error('[adminAudit] write failed:', e.message));
}

module.exports = { adminAuth, writeAudit, ADMIN_EMAILS };
