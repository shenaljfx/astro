/**
 * Pricing Routes
 * 
 * GET /api/pricing — Returns pricing for the user's detected region
 * 
 * Mobile app calls this on startup to get the correct currency & amounts.
 * Uses IP-based geo detection (Cloudflare, or explicit header from mobile).
 */

const express = require('express');
const router = express.Router();
const { detectCurrency, getPricing } = require('../config/pricing');
const { getStats, persistDailyStats } = require('../services/costTracker');

/**
 * GET /api/pricing
 * 
 * Query params:
 *   ?currency=LKR|USD  — Force a specific currency (optional)
 * 
 * Headers:
 *   X-App-Country: LK|US|...  — Country code from mobile device locale
 *   X-User-Currency: LKR|USD  — Explicit currency override
 * 
 * Returns: Full pricing object with subscription, porondam, report amounts
 */
router.get('/', (req, res) => {
  try {
    const currency = detectCurrency(req);
    const pricing = getPricing(currency);

    res.json({
      success: true,
      currency: pricing.currency,
      currencySymbol: pricing.currencySymbol,
      country: pricing.country,
      subscription: pricing.subscription,
      porondam: pricing.porondam,
      report: pricing.report,
      topUpPackages: pricing.topUpPackages,
    });
  } catch (err) {
    console.error('[Pricing] Error:', err);
    // Fallback to LKR pricing
    const fallback = getPricing('LKR');
    res.json({
      success: true,
      currency: fallback.currency,
      currencySymbol: fallback.currencySymbol,
      country: fallback.country,
      subscription: fallback.subscription,
      porondam: fallback.porondam,
      report: fallback.report,
      topUpPackages: fallback.topUpPackages,
    });
  }
});

/**
 * GET /api/pricing/live-stats
 * 
 * Returns real-time AI cost tracking data from the current server session.
 * Shows per-feature costs, revenue, profit margins, and recent requests.
 * 
 * No auth required — meant for admin/dev dashboard.
 */
router.get('/live-stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('[Pricing] Live stats error:', err);
    res.status(500).json({ error: 'Failed to get live stats' });
  }
});

/**
 * POST /api/pricing/persist-stats
 * 
 * Force-persist current daily stats to Firestore.
 * Useful for manual snapshots before server restarts.
 */
router.post('/persist-stats', async (req, res) => {
  try {
    await persistDailyStats();
    res.json({ success: true, message: 'Stats persisted to Firestore' });
  } catch (err) {
    console.error('[Pricing] Persist stats error:', err);
    res.status(500).json({ error: 'Failed to persist stats' });
  }
});

module.exports = router;
