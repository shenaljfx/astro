import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import api from '../services/api';
import { setDetectedCountry } from '../services/api';
import { useLanguage } from './LanguageContext';

/**
 * PricingContext — provides geo-aware pricing throughout the app.
 * 
 * Detects user's country via device locale, then fetches server-side pricing.
 * Falls back to LKR (Sri Lanka) pricing if detection fails.
 * 
 * Usage:
 *   var { pricing, currency, isInternational, priceLabel } = usePricing();
 *   priceLabel('porondam')  → "LKR 200" or "$2"
 *   pricing.porondam.amount → 200 or 2
 */

var PricingContext = createContext(null);

// Default LKR pricing (fallback)
var DEFAULT_PRICING = {
  currency: 'LKR',
  currencySymbol: 'LKR',
  country: 'Sri Lanka',
  subscription: { amount: 490, amountFormatted: '490.00', label: 'LKR 490/month', period: 'month' },
  // Marriage Pack (rebranded porondam) — same productId 'porondam_check'
  porondam: { amount: 990, amountFormatted: '990.00', label: 'LKR 990' },
  report: { amount: 999, amountFormatted: '999.00', label: 'LKR 999' },
  babyKendara: { amount: 1490, amountFormatted: '1490.00', label: 'LKR 1,490' },
};

// Default USD pricing (international fallback — mirrors server/src/config/pricing.js)
var DEFAULT_USD_PRICING = {
  currency: 'USD',
  currencySymbol: '$',
  country: 'International',
  subscription: { amount: 4.99, amountFormatted: '4.99', label: '$4.99/month', period: 'month' },
  porondam: { amount: 4.99, amountFormatted: '4.99', label: '$4.99' },
  report: { amount: 3.99, amountFormatted: '3.99', label: '$3.99' },
  babyKendara: { amount: 6.99, amountFormatted: '6.99', label: '$6.99' },
};

/**
 * Detect user's country code from device locale.
 * Returns 'LK' for Sri Lanka, or the actual country code for international.
 */
function detectCountryCode() {
  try {
    // expo-localization v3+
    if (Localization.getLocales) {
      var locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        // Sinhala device language ⇒ Sri Lankan user ⇒ LKR, even if the device
        // REGION is set elsewhere (common on emulators / imported phones).
        if (locales[0].languageCode === 'si') return 'LK';
        if (locales[0].regionCode) return locales[0].regionCode;
      }
    }
    // Fallback: check locale string (e.g. "en-LK", "si-LK", "en-US")
    var locale = Localization.locale || '';
    var parts = locale.split('-');
    if (parts.length >= 2) {
      return parts[parts.length - 1].toUpperCase();
    }
  } catch (e) {
    // ignore
  }
  return 'LK'; // Default to Sri Lanka
}

export function PricingProvider({ children }) {
  var langCtx = useLanguage();
  // Sinhala-language users are Sri Lankan → always priced in LKR, regardless of
  // device region or store-account currency (emulators, imported phones and
  // sandbox/test accounts otherwise leak USD). English users keep geo/store
  // detection so genuine international users still see their local currency.
  // The app defaults to Sinhala, so LKR is the default for everyone.
  var forceLkr = !!(langCtx && langCtx.language === 'si');

  var [pricing, setPricing] = useState(DEFAULT_PRICING);
  var [countryCode, setCountryCode] = useState('LK');
  var [loaded, setLoaded] = useState(false);

  useEffect(function() {
    var code = forceLkr ? 'LK' : detectCountryCode();
    setCountryCode(code);
    setDetectedCountry(code); // Set in API headers for all requests

    // Fetch server pricing
    api.getPricing(code)
      .then(function(res) {
        if (res && res.success) {
          setPricing(res);
        }
      })
      .catch(function() {
        // Keep default LKR pricing
      })
      .finally(function() {
        setLoaded(true);
      });
  }, [forceLkr]);

  // Sinhala users always resolve to LKR even if a prior detection or store-
  // currency sync set USD — override the EXPOSED pricing without fighting the
  // setters. English users see whatever was detected/synced.
  var effectivePricing = (forceLkr && pricing.currency !== 'LKR') ? DEFAULT_PRICING : pricing;
  var isInternational = effectivePricing.currency === 'USD';

  /**
   * Update pricing based on a new country code.
   * Called when user selects a birth city outside Sri Lanka.
   * @param {string} code — e.g. 'LK', 'US', 'IN', 'GB'
   */
  var updateCountry = function(code) {
    if (!code || code === countryCode) return;
    setCountryCode(code);
    setDetectedCountry(code);
    api.getPricing(code)
      .then(function(res) {
        if (res && res.success) {
          setPricing(res);
        }
      })
      .catch(function() {
        // Keep current pricing
      });
  };

  /**
   * Sync pricing currency based on the user's actual Google Play / App Store
   * account country (reported by RevenueCat). This is the source of truth for
   * what currency the user will actually be charged in — much more reliable
   * than device locale, which can be misconfigured.
   *
   * @param {string} rcCurrencyCode — e.g. 'LKR', 'USD', 'INR', 'GBP'
   */
  var syncFromStoreCurrency = function(rcCurrencyCode) {
    if (!rcCurrencyCode) return;
    // Sinhala (Sri Lankan) users always stay on LKR — never flip to USD from a
    // store-account currency (test/sandbox accounts commonly report USD).
    if (forceLkr) return;
    var code = String(rcCurrencyCode).toUpperCase();
    var nextCountry = code === 'LKR' ? 'LK' : 'INTL';
    if (nextCountry === countryCode) return;
    setCountryCode(nextCountry);
    setDetectedCountry(nextCountry === 'LK' ? 'LK' : 'US');
    if (code === 'LKR') {
      setPricing(DEFAULT_PRICING);
    } else {
      // International — use USD defaults immediately, then refresh from server
      setPricing(DEFAULT_USD_PRICING);
      api.getPricing('US')
        .then(function(res) { if (res && res.success) setPricing(res); })
        .catch(function() { /* keep USD defaults */ });
    }
  };

  /**
   * Get a formatted price label for a feature.
   * @param {'porondam'|'report'|'subscription'} feature
  * @returns {string} e.g. "LKR 200" or "$2"
   */
  var priceLabel = function(feature) {
    var feat = effectivePricing[feature];
    if (!feat) return '';
    return feat.label || (effectivePricing.currencySymbol + ' ' + feat.amount);
  };

  /**
   * Get the numeric amount for a feature.
   * @param {'porondam'|'report'|'subscription'} feature
   * @returns {number}
   */
  var priceAmount = function(feature) {
    var feat = effectivePricing[feature];
    return feat ? feat.amount : 0;
  };

  /**
   * Get the subscription price label with period suffix.
   * @returns {string} e.g. "LKR 280/month" or "$4.99/month"
   */
  var subscriptionLabel = function() {
    var sub = effectivePricing.subscription;
    if (!sub) return '';
    return sub.label || (effectivePricing.currencySymbol + ' ' + sub.amount + '/' + (sub.period || 'month'));
  };

  var value = {
    pricing: effectivePricing,
    currency: effectivePricing.currency,
    currencySymbol: effectivePricing.currencySymbol,
    isInternational: isInternational,
    isSriLankan: forceLkr || countryCode === 'LK',
    countryCode: countryCode,
    loaded: loaded,
    priceLabel: priceLabel,
    priceAmount: priceAmount,
    subscriptionLabel: subscriptionLabel,
    updateCountry: updateCountry,
    syncFromStoreCurrency: syncFromStoreCurrency,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  var ctx = useContext(PricingContext);
  if (!ctx) {
    // Fallback if used outside provider
    return {
      pricing: DEFAULT_PRICING,
      currency: 'LKR',
      currencySymbol: 'LKR',
      isInternational: false,
      countryCode: 'LK',
      loaded: false,
      priceLabel: function(f) { return DEFAULT_PRICING[f] ? DEFAULT_PRICING[f].label : ''; },
      priceAmount: function(f) { return DEFAULT_PRICING[f] ? DEFAULT_PRICING[f].amount : 0; },
      subscriptionLabel: function() { return DEFAULT_PRICING.subscription ? DEFAULT_PRICING.subscription.label : ''; },
      updateCountry: function() {},
      syncFromStoreCurrency: function() {},
    };
  }
  return ctx;
}

export default { PricingProvider, usePricing };
