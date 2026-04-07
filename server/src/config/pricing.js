/**
 * Pricing Configuration — Geo-based dual-currency pricing
 * 
 * Sri Lanka users: LKR pricing via RevenueCat (in-app purchases)
 * International users: USD pricing via RevenueCat (in-app purchases)
 * 
 * Pricing tiers:
 *   SL:  LKR 280/month subscription, LKR 100 porondam, LKR 380 report
 *   INT: USD 4.99/month subscription, USD 1.99 porondam, USD 5.99 report
 */

// ─── Price Tables ───────────────────────────────────────────────

const PRICING = {
  LKR: {
    currency: 'LKR',
    currencySymbol: 'LKR',
    country: 'Sri Lanka',
    subscription: {
      amount: 280,
      amountFormatted: '280.00',
      period: 'month',
      label: 'LKR 280/month',
    },
    porondam: {
      amount: 100,
      amountFormatted: '100.00',
      label: 'LKR 100',
    },
    report: {
      amount: 380,
      amountFormatted: '380.00',
      label: 'LKR 380',
    },
    topUpPackages: [100, 280, 380, 500],
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
    },
    porondam: {
      amount: 1.99,
      amountFormatted: '1.99',
      label: '$1.99',
    },
    report: {
      amount: 3.99,
      amountFormatted: '3.99',
      label: '$3.99',
    },
    topUpPackages: [2, 5, 6, 10],
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
 * Validate a top-up amount against the allowed packages for a currency.
 * @param {number} amount 
 * @param {'LKR'|'USD'} currency 
 * @returns {boolean}
 */
function isValidTopUpAmount(amount, currency) {
  const pricing = getPricing(currency);
  return pricing.topUpPackages.includes(amount);
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
  isValidTopUpAmount,
  getFeaturePrice,
};
