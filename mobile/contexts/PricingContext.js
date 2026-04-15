import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import api from '../services/api';
import { setDetectedCountry } from '../services/api';

/**
 * PricingContext — provides geo-aware pricing throughout the app.
 * 
 * Detects user's country via device locale, then fetches server-side pricing.
 * Falls back to LKR (Sri Lanka) pricing if detection fails.
 * 
 * Usage:
 *   var { pricing, currency, isInternational, priceLabel } = usePricing();
 *   priceLabel('porondam')  → "LKR 100" or "$2"
 *   pricing.porondam.amount → 100 or 2
 */

var PricingContext = createContext(null);

// Default LKR pricing (fallback)
var DEFAULT_PRICING = {
  currency: 'LKR',
  currencySymbol: 'LKR',
  country: 'Sri Lanka',
  subscription: { amount: 280, amountFormatted: '280.00', label: 'LKR 280/month', period: 'month' },
  porondam: { amount: 100, amountFormatted: '100.00', label: 'LKR 100' },
  report: { amount: 380, amountFormatted: '380.00', label: 'LKR 380' },
  topUpPackages: [100, 280, 380, 500],
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
      if (locales && locales.length > 0 && locales[0].regionCode) {
        return locales[0].regionCode;
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
  var [pricing, setPricing] = useState(DEFAULT_PRICING);
  var [countryCode, setCountryCode] = useState('LK');
  var [loaded, setLoaded] = useState(false);

  useEffect(function() {
    var code = detectCountryCode();
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
  }, []);

  var isInternational = pricing.currency === 'USD';

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
   * Get a formatted price label for a feature.
   * @param {'porondam'|'report'|'subscription'} feature
   * @returns {string} e.g. "LKR 100" or "$2"
   */
  var priceLabel = function(feature) {
    var feat = pricing[feature];
    if (!feat) return '';
    return feat.label || (pricing.currencySymbol + ' ' + feat.amount);
  };

  /**
   * Get the numeric amount for a feature.
   * @param {'porondam'|'report'|'subscription'} feature
   * @returns {number}
   */
  var priceAmount = function(feature) {
    var feat = pricing[feature];
    return feat ? feat.amount : 0;
  };

  /**
   * Get the subscription price label with period suffix.
   * @returns {string} e.g. "LKR 280/month" or "$4.99/month"
   */
  var subscriptionLabel = function() {
    var sub = pricing.subscription;
    if (!sub) return '';
    return sub.label || (pricing.currencySymbol + ' ' + sub.amount + '/' + (sub.period || 'month'));
  };

  var value = {
    pricing: pricing,
    currency: pricing.currency,
    currencySymbol: pricing.currencySymbol,
    isInternational: isInternational,
    countryCode: countryCode,
    loaded: loaded,
    priceLabel: priceLabel,
    priceAmount: priceAmount,
    subscriptionLabel: subscriptionLabel,
    updateCountry: updateCountry,
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
    };
  }
  return ctx;
}

export default { PricingProvider, usePricing };
