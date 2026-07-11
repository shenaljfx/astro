/**
 * Pricing Configuration — Geo-based dual-currency pricing
 * 
 * Sri Lanka users: LKR pricing via RevenueCat (in-app purchases)
 * International users: USD pricing via RevenueCat (in-app purchases)
 * 
 * Pricing tiers:
 *   SL:  LKR 490/month subscription, LKR 990 Marriage Pack (porondam), LKR 999 report
 *   INT: USD 4.99/month subscription, USD 1.99 porondam, USD 3.99 report
 *
 * ⚠️ These are DISPLAY prices. The actual charge is the Play Store product
 * price (via RevenueCat) for the matching productId. When you change a number
 * here you MUST also change that product's price in Google Play Console, or the
 * app will show one price and charge another.
 */

// ─── Price Tables ───────────────────────────────────────────────

const PRICING = {
  LKR: {
    currency: 'LKR',
    currencySymbol: 'LKR',
    country: 'Sri Lanka',
    subscription: {
      amount: 490,
      amountFormatted: '490.00',
      period: 'month',
      label: 'LKR 490/month',
      productId: 'monthly',
    },
    // Marriage Pack — the porondam compatibility experience rebranded as a
    // premium bundle (archetype + both charts + full AI report + shareable PDF).
    // Same product/flow as before; keeps productId 'porondam_check' so the
    // existing Play Store product just gets retitled + repriced (no ID change,
    // no broken purchases). A real astrologer's porondam is LKR 1,500–5,000.
    porondam: {
      amount: 990,
      amountFormatted: '990.00',
      label: 'LKR 990',
      productId: 'porondam_check',
    },
    report: {
      amount: 999,
      amountFormatted: '999.00',
      label: 'LKR 999',
      productId: 'full_report',
    },
    // Baby Kendara Pack — newborn keepsake (naming letters, ganda moola,
    // ceremony dates, chart PDF). Gift-priced; a real astrologer charges
    // LKR 3,000–10,000. Also included with Pro. ⚠️ create this product in
    // Google Play / RevenueCat before selling.
    babyKendara: {
      amount: 1490,
      amountFormatted: '1490.00',
      label: 'LKR 1,490',
      productId: 'baby_kendara',
    },
  },
  USD: {
    currency: 'USD',
    currencySymbol: '$',
    country: 'International',
    subscription: {
      amount: 4.99,
      amountFormatted: '4.99',
      period: 'month',
      label: '$4.99/month',
      productId: 'monthly',
    },
    // Was $1.99 — inverted against the LKR 990 (≈$3.30) home price; the
    // flagship must not be cheaper abroad. ⚠️ Update the porondam_check USD
    // price in Google Play Console to match, or display and charge diverge.
    porondam: {
      amount: 4.99,
      amountFormatted: '4.99',
      label: '$4.99',
      productId: 'porondam_check',
    },
    report: {
      amount: 3.99,
      amountFormatted: '3.99',
      label: '$3.99',
      productId: 'full_report',
    },
    babyKendara: {
      amount: 6.99,
      amountFormatted: '6.99',
      label: '$6.99',
      productId: 'baby_kendara',
    },
  },
};

// ─── Geo Detection ──────────────────────────────────────────────

/**
 * Determine currency from request (IP-based country detection).
 * Uses Cloudflare header, X-Forwarded-For geolocation, or falls back to LKR for Sri Lankan IPs.
 * 
 * @param {import('express').Request} req 
 * @returns {'LKR'|'USD'}
 */
function detectCurrency(req) {
  // 1. Explicit override from client (mobile sends detected country)
  const clientCurrency = req.headers['x-user-currency'] || req.body?.currency || req.query?.currency;
  if (clientCurrency === 'USD') return 'USD';
  if (clientCurrency === 'LKR') return 'LKR';

  // 2. Cloudflare country header (if behind Cloudflare)
  const cfCountry = req.headers['cf-ipcountry'];
  if (cfCountry) {
    return cfCountry === 'LK' ? 'LKR' : 'USD';
  }

  // 3. Check X-App-Country header (set by mobile app after locale detection)
  const appCountry = req.headers['x-app-country'];
  if (appCountry) {
    return appCountry === 'LK' ? 'LKR' : 'USD';
  }

  // 4. Default to LKR (safe fallback — Sri Lankan app)
  return 'LKR';
}

/**
 * Get the full pricing object for a detected/specified currency.
 * @param {'LKR'|'USD'} currency 
 * @returns {object}
 */
function getPricing(currency) {
  return PRICING[currency] || PRICING.LKR;
}

/**
 * Get the feature price for a specific feature.
 * @param {'porondam'|'report'|'subscription'} feature 
 * @param {'LKR'|'USD'} currency 
 * @returns {{ amount: number, amountFormatted: string, label: string, currency: string }}
 */
function getFeaturePrice(feature, currency) {
  const pricing = getPricing(currency);
  const featureData = pricing[feature];
  if (!featureData) return null;
  return {
    ...featureData,
    currency: pricing.currency,
    currencySymbol: pricing.currencySymbol,
  };
}

// ─── Exports ────────────────────────────────────────────────────

module.exports = {
  PRICING,
  detectCurrency,
  getPricing,
  getFeaturePrice,
};
