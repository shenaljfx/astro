/**
 * Analytics Routes — lightweight, best-effort event capture.
 *
 * POST /api/analytics/paywall — record a paywall funnel event so every tease
 * surface gets a real conversion number:
 *     shown → dismissed | purchased   (tagged with source + plan + currency)
 *
 * Design rules:
 *   - Never blocks or errors the client. Analytics failures are swallowed.
 *   - Mounted WITHOUT the subscription gate — the paywall is shown to free and
 *     logged-out users, and those are exactly the conversions we must measure.
 *   - optionalAuth attaches uid when a token is present (anonymous otherwise).
 */

const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { getDb } = require('../config/firebase');
const { toTtlTimestamp } = require('../utils/firestoreTtl');

const VALID_EVENTS = ['shown', 'purchased', 'dismissed'];

router.post('/paywall', optionalAuth, async (req, res) => {
  try {
    const { event, source, plan, currency } = req.body || {};
    if (!VALID_EVENTS.includes(event)) {
      return res.status(400).json({ error: 'event must be one of: ' + VALID_EVENTS.join(', ') });
    }

    const db = getDb();
    if (db) {
      // Fire-and-forget — a failed analytics write must never affect the user.
      db.collection('paywallEvents').doc().set({
        event,
        source: String(source || 'unknown').slice(0, 40),
        plan: plan ? String(plan).slice(0, 20) : null,
        currency: currency ? String(currency).slice(0, 8) : null,
        uid: req.user && req.user.uid ? req.user.uid : null,
        platform: (req.headers['x-platform'] || '').slice(0, 16) || null,
        createdAt: new Date().toISOString(),
        // Timestamp TTL (fix F3) — funnel events are only useful short-term.
        ttlExpireAt: toTtlTimestamp(Date.now() + Number(process.env.PAYWALL_EVENT_TTL_MS || 180 * 24 * 60 * 60 * 1000)),
      }).catch((e) => console.warn('[analytics/paywall] write failed (non-fatal):', e.message));
    }

    res.json({ success: true });
  } catch (e) {
    // Analytics must never surface an error to the client.
    res.json({ success: true });
  }
});

module.exports = router;
