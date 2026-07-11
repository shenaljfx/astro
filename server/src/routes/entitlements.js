/**
 * Entitlement Routes — "pay once, generate until success" retry checks.
 *
 * POST /api/entitlements/check  — is there a pending (retryable) generation for
 *                                 this input? Mobile calls it BEFORE the paywall
 *                                 so a failed generation retries without paying.
 * GET  /api/entitlements        — list the user's entitlements (history).
 *
 * (These endpoints formerly lived under /api/tokens/* alongside the retired
 * token-wallet system; the wallet is gone, these moved here.)
 */

const express = require('express');
const router = express.Router();
const { phoneAuth } = require('../middleware/subscription');
const { checkPendingEntitlement, getUserEntitlements } = require('../middleware/entitlements');

// ─── POST /check — is there a pending (retryable) entitlement? ───────────────

router.post('/check', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.json({ success: true, hasPending: false });
  }

  try {
    const { type, inputData } = req.body;
    if (!type || !inputData) {
      return res.status(400).json({ error: 'type and inputData are required' });
    }

    const pending = await checkPendingEntitlement(req.user.uid, type, inputData);

    res.json({
      success: true,
      hasPending: !!pending,
      entitlement: pending || null,
    });
  } catch (err) {
    console.error('[entitlements/check] error:', err.message);
    res.json({ success: true, hasPending: false });
  }
});

// ─── GET / — list the user's entitlements ───────────────────────────────────

router.get('/', phoneAuth, async (req, res) => {
  if (!req.user || req.user.authType === 'anonymous') {
    return res.json({ success: true, entitlements: [] });
  }

  try {
    const type = req.query.type || null;
    const entitlements = await getUserEntitlements(req.user.uid, type);
    res.json({ success: true, entitlements });
  } catch (err) {
    console.error('[entitlements] error:', err.message);
    res.json({ success: true, entitlements: [] });
  }
});

module.exports = router;
