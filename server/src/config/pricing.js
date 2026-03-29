/**
 * Pricing Configuration — Geo-based dual-currency pricing
 * 
 * Sri Lanka users: LKR pricing via PayHere
 * International users: USD pricing via PayHere (supports multi-currency)
 * 
 * Pricing tiers:
 *   SL:  LKR 240/month subscription, LKR 100 porondam, LKR 350 report
 *   INT: USD 4/month subscription, USD 2 porondam, USD 5 report
 */

// ─── Price Tables ───────────────────────────────────────────────

const PRICING = {
  LKR: {
    currency: 'LKR',
    currencySymbol: 'LKR',
    country: 'Sri Lanka',
    subscription: {
      amount: 240,
      amountFormatted: '240.00',
      period: 'month',
      label: 'LKR 240/month',
    },
    porondam: {
      amount: 100,
      amountFormatted: '100.00',
      label: 'LKR 100',
    },
    report: {
      amount: 350,
      amountFormatted: '350.00',
      label: 'LKR 350',
    },
    topUpPackages: [100, 250, 350, 500],
  },
  USD: {
    currency: 'USD',
    currencySymbol: '$',
    country: 'International',
    subscription: {
      amount: 4,
      amountFormatted: '4.00',
      period: 'month',
      label: '$4/month',
    },
    porondam: {
      amount: 2,
      amountFormatted: '2.00',
      label: '$2',
    },
    report: {
      amount: 5,
      amountFormatted: '5.00',
      label: '$5',
    },
    topUpPackages: [2, 4, 5, 10],
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
