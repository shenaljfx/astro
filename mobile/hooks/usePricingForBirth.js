/**
 * usePricingForBirth — returns pricing matched to the user's birth-city
 * country, falling back to device-locale pricing.
 *
 * Encapsulates the rule: if the user picked a Sri Lankan birth city,
 * show LKR even when the device locale is en-US. If they picked a
 * city outside Sri Lanka, show USD.
 *
 * Usage:
 *   var { priceLabel, priceAmount, isInternational } = usePricingForBirth(birthData);
 */

import { useEffect } from 'react';
import { usePricing } from '../contexts/PricingContext';

export default function usePricingForBirth(birthData) {
  var ctx = usePricing();
  var updateCountry = ctx && ctx.updateCountry;

  useEffect(function () {
    if (birthData && birthData.countryCode && updateCountry) {
      updateCountry(birthData.countryCode);
    }
  }, [birthData && birthData.countryCode]);

  return ctx;
}
