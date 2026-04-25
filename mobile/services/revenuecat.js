/**
 * RevenueCat Service — Subscription Management via RevenueCat SDK
 * 
 * Handles all subscription/purchase operations via Google Play / App Store.
 * Uses RevenueCat Paywalls UI + Customer Center for self-service.
 * 
 * Products (configured in RevenueCat Dashboard):
 *   - monthly  → Grahachara Pro Monthly
 *   - yearly   → Grahachara Pro Yearly
 *   - lifetime → Grahachara Pro Lifetime
 * 
 * Entitlement: "Grahachara Pro"
 * 
 * Usage:
 *   import { initRevenueCat, checkEntitlement, presentPaywall, presentCustomerCenter } from '../services/revenuecat';
 *   await initRevenueCat(firebaseUid);
 *   var hasPro = await checkEntitlement();
 */

import { Platform } from 'react-native';

// ─── Web guard — RevenueCat SDK is native-only (iOS/Android) ────
var IS_WEB = Platform.OS === 'web';
var Purchases = null;
var LOG_LEVEL = null;

if (!IS_WEB) {
  try {
    var _mod = require('react-native-purchases');
    Purchases = _mod.default || _mod;
    LOG_LEVEL = _mod.LOG_LEVEL;
  } catch (e) {
    console.warn('[RevenueCat] Native module not available:', e.message);
  }
}

// ─── Configuration ──────────────────────────────────────────────

var API_KEY = 'goog_PejQORDlHxpiMNuGwhLLnwavkEy';
var ENTITLEMENT_ID = 'Grahachara Pro';

// Mock payments — bypass RevenueCat when EXPO_PUBLIC_MOCK_PAYMENTS=true
var MOCK_PAYMENTS = process.env.EXPO_PUBLIC_MOCK_PAYMENTS === 'true';

// Product identifiers (must match RevenueCat dashboard & Google Play Console)
var PRODUCT_IDS = {
  // Subscriptions
  monthly: 'monthly',
  yearly: 'yearly',
  lifetime: 'lifetime',
  // One-time purchases
  full_report: 'full_report',
  porondam_check: 'porondam_check',
};

export { PRODUCT_IDS, ENTITLEMENT_ID };

var _initialized = false;

// ─── Initialize RevenueCat ──────────────────────────────────────

/**
 * Initialize RevenueCat SDK. Call once at app startup after auth.
 * @param {string|null} appUserID — Firebase UID or null for anonymous
 */
export async function initRevenueCat(appUserID) {
  if (_initialized) return;
  if (MOCK_PAYMENTS) { _initialized = true; return; }
  if (!Purchases) { _initialized = true; return; }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
    }

    await Purchases.configure({
      apiKey: API_KEY,
      appUserID: appUserID || null,
    });

    _initialized = true;
  } catch (err) {
    console.warn('[RevenueCat] Init failed:', err && err.message);
    throw err;
  }
}

// ─── User Identity ──────────────────────────────────────────────

/**
 * Log in to RevenueCat with a specific user ID (e.g. Firebase UID).
 * Call this after Google Sign-In completes.
 * @param {string} appUserID — Firebase UID
 * @returns {Object} { customerInfo, created }
 */
export async function loginUser(appUserID) {
  if (MOCK_PAYMENTS) return { customerInfo: null, created: false };
  if (!Purchases) return { customerInfo: null, created: false };
  try {
    var result = await Purchases.logIn(appUserID);
    return result;
  } catch (err) {
    console.warn('[RevenueCat] Login failed:', err && err.message);
    throw err;
  }
}

/**
 * Log out of RevenueCat (generates a new anonymous ID).
 * Call when the user signs out of your app.
 */
export async function logoutUser() {
  if (MOCK_PAYMENTS) return null;
  if (!Purchases) return null;
  try {
    var info = await Purchases.logOut();
    return info;
  } catch (err) {
    console.warn('[RevenueCat] Logout failed:', err && err.message);
    throw err;
  }
}

// ─── Entitlement Checking ───────────────────────────────────────

/**
 * Check if the current user has the "Grahachara Pro" entitlement.
 * @returns {boolean}
 */
export async function checkEntitlement() {
  if (MOCK_PAYMENTS) return true;
  if (!Purchases) return false;
  try {
    var customerInfo = await Purchases.getCustomerInfo();
    var isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return isActive;
  } catch (err) {
    console.warn('[RevenueCat] ✘ Entitlement check failed:', err.message);
    return false;
  }
}

/**
 * Get full customer info from RevenueCat.
 * @returns {Object} CustomerInfo object
 */
export async function getCustomerInfo() {
  if (MOCK_PAYMENTS) return { entitlements: { active: { [ENTITLEMENT_ID]: { isActive: true, productIdentifier: 'mock_monthly', isSandbox: true } } } };
  if (!Purchases) return null;
  try {
    var info = await Purchases.getCustomerInfo();
    return info;
  } catch (err) {
    console.warn('[RevenueCat] ✘ Get customer info failed:', err.message);
    return null;
  }
}

/**
 * Get the active subscription details if any.
 * @returns {Object|null} { plan, expiresDate, isActive, willRenew, productId }
 */
export async function getActiveSubscription() {
  if (MOCK_PAYMENTS) {
    return {
      plan: 'mock_monthly',
      isActive: true,
      willRenew: true,
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      productId: 'mock_monthly',
      isSandbox: true,
      store: 'mock',
    };
  }
  if (!Purchases) return null;
  try {
    var customerInfo = await Purchases.getCustomerInfo();
    var entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) return null;

    return {
      plan: entitlement.productIdentifier,
      isActive: entitlement.isActive,
      willRenew: entitlement.willRenew,
      expiresDate: entitlement.expirationDate,
      productId: entitlement.productIdentifier,
      isSandbox: entitlement.isSandbox,
      store: entitlement.store,
    };
  } catch (err) {
    console.warn('[RevenueCat] ✘ Get active subscription failed:', err.message);
    return null;
  }
}

// ─── Offerings & Products ───────────────────────────────────────

/**
 * Get current offerings (product configurations from RevenueCat Dashboard).
 * @returns {Object} Offerings object with current, all, etc.
 */
export async function getOfferings() {
  if (MOCK_PAYMENTS) {
    return {
      current: {
        identifier: 'mock_offering',
        availablePackages: [{
          packageType: 'MONTHLY',
          identifier: '$rc_monthly',
          product: { identifier: 'monthly', priceString: 'LKR 280.00', price: 280 },
        }],
      },
    };
  }
  if (!Purchases) {
    return null;
  }
  try {
    var offerings = await Purchases.getOfferings();
    return offerings;
  } catch (err) {
    console.warn('[RevenueCat] getOfferings failed:', err && err.message);
    return null;
  }
}

// ─── Purchases ──────────────────────────────────────────────────

/**
 * Purchase a specific package from an offering.
 * @param {Object} pkg — Package object from offerings
 * @returns {Object} { customerInfo, productIdentifier }
 */
export async function purchasePackage(pkg) {
  if (MOCK_PAYMENTS) {
    console.log('[RevenueCat] 🧪 Mock purchase — auto-succeeding');
    return {
      customerInfo: { entitlements: { active: { [ENTITLEMENT_ID]: { isActive: true } } } },
      productIdentifier: pkg?.product?.identifier || 'mock_monthly',
      isProActive: true,
    };
  }
  if (!Purchases) throw new Error('Purchases not available on this platform');
  if (!pkg) {
    throw new Error('No package selected');
  }
  try {
    var result = await Purchases.purchasePackage(pkg);
    var isActive = result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return {
      customerInfo: result.customerInfo,
      productIdentifier: pkg.product.identifier,
      isProActive: isActive,
    };
  } catch (err) {
    if (err.userCancelled) {
      throw new Error('Payment cancelled');
    }
    console.warn('[RevenueCat] Purchase failed:', err && err.message);
    throw err;
  }
}

/**
 * Purchase a one-time (non-subscription) product by its product ID.
 * Use for report & porondam one-time payments.
 * @param {string} productId — e.g. 'full_report' or 'porondam_check'
 * @returns {Object} { customerInfo, productIdentifier, purchased: true }
 */
export async function purchaseOneTimeProduct(productId) {
  if (MOCK_PAYMENTS) {
    return {
      customerInfo: null,
      productIdentifier: productId,
      purchased: true,
      isProActive: true,
    };
  }
  if (!Purchases) throw new Error('Purchases not available on this platform');
  try {
    // Get offerings to find the package with this product
    var offerings = await Purchases.getOfferings();
    var pkg = null;
    if (offerings && offerings.current && offerings.current.availablePackages) {
      pkg = offerings.current.availablePackages.find(function(p) {
        return p.product && p.product.identifier === productId;
      });
    }
    // Also scan all offerings if not found in current
    if (!pkg && offerings && offerings.all) {
      var keys = Object.keys(offerings.all);
      for (var k = 0; k < keys.length; k++) {
        var off = offerings.all[keys[k]];
        if (off && off.availablePackages) {
          var found = off.availablePackages.find(function (p) {
            return p.product && p.product.identifier === productId;
          });
          if (found) { pkg = found; break; }
        }
      }
    }
    // If found in offerings, purchase as package (preferred path)
    if (pkg) {
      var result = await Purchases.purchasePackage(pkg);
      var isActiveA = result.customerInfo && result.customerInfo.entitlements && result.customerInfo.entitlements.active && result.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      return {
        customerInfo: result.customerInfo,
        productIdentifier: productId,
        purchased: true,
        isProActive: isActiveA,
      };
    }
    // Fallback: no offering configured — buy by product ID directly (StoreProduct)
    var products = await Purchases.getProducts([productId]);
    if (!products || products.length === 0) {
      throw new Error('Product unavailable');
    }
    var storeResult = await Purchases.purchaseStoreProduct(products[0]);
    var isActiveB = storeResult.customerInfo && storeResult.customerInfo.entitlements && storeResult.customerInfo.entitlements.active && storeResult.customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return {
      customerInfo: storeResult.customerInfo,
      productIdentifier: productId,
      purchased: true,
      isProActive: isActiveB,
    };
  } catch (err) {
    if (err && err.userCancelled) {
      throw new Error('Payment cancelled');
    }
    console.warn('[RevenueCat] Purchase failed:', err && err.message);
    throw err;
  }
}

// ─── Paywall (RevenueCat UI) ────────────────────────────────────

/**
 * Present the RevenueCat Paywall UI.
 * Uses the paywall configured in the RevenueCat dashboard.
 * @returns {boolean} true if purchase/restore succeeded
 */
export async function presentPaywall() {
  if (MOCK_PAYMENTS) return true;
  if (IS_WEB) return false;
  try {
    var RevenueCatUI = require('react-native-purchases-ui').default;
    var PAYWALL_RESULT = require('react-native-purchases-ui').PAYWALL_RESULT;

    var result = await RevenueCatUI.presentPaywall();

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
      case PAYWALL_RESULT.NOT_PRESENTED:
        return true;
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
      default:
        return false;
    }
  } catch (err) {
    console.warn('[RevenueCat] Paywall failed:', err && err.message);
    throw err;
  }
}

/**
 * Present paywall only if the user does NOT have the "Grahachara Pro" entitlement.
 * If they already have it, does nothing and returns true.
 * @returns {boolean} true if user has entitlement (either already or after purchase)
 */
export async function presentPaywallIfNeeded() {
  if (MOCK_PAYMENTS) return true;
  if (IS_WEB) return false;
  try {
    var RevenueCatUI = require('react-native-purchases-ui').default;
    var PAYWALL_RESULT = require('react-native-purchases-ui').PAYWALL_RESULT;

    var result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: ENTITLEMENT_ID,
    });

    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
      case PAYWALL_RESULT.NOT_PRESENTED:
        return true;
      case PAYWALL_RESULT.ERROR:
      case PAYWALL_RESULT.CANCELLED:
      default:
        return false;
    }
  } catch (err) {
    console.warn('[RevenueCat] Paywall failed:', err && err.message);
    throw err;
  }
}

// ─── Customer Center (RevenueCat UI) ────────────────────────────

/**
 * Present the RevenueCat Customer Center for subscription management.
 * Allows users to: cancel, request refund, change plan, restore purchases.
 */
export async function presentCustomerCenter() {
  if (IS_WEB) return;
  try {
    var RevenueCatUI = require('react-native-purchases-ui').default;

    await RevenueCatUI.presentCustomerCenter({
      callbacks: {
        onRestoreFailed: function(param) {
          console.warn('[RevenueCat] Restore failed:', param && param.error);
        },
      },
    });
  } catch (err) {
    console.warn('[RevenueCat] Customer Center failed:', err && err.message);
    throw err;
  }
}

// ─── Restore Purchases ──────────────────────────────────────────

/**
 * Restore purchases from the store.
 * @returns {Object} CustomerInfo after restore
 */
export async function restorePurchases() {
  if (MOCK_PAYMENTS) return { customerInfo: null, isProActive: true };
  if (!Purchases) return { customerInfo: null, isProActive: false };
  try {
    var customerInfo = await Purchases.restorePurchases();
    var isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return { customerInfo: customerInfo, isProActive: isActive };
  } catch (err) {
    console.warn('[RevenueCat] Restore failed:', err && err.message);
    throw err;
  }
}

// ─── Listener for CustomerInfo updates ──────────────────────────

/**
 * Add a listener for real-time CustomerInfo updates.
 * @param {Function} callback — called with customerInfo when it changes
 * @returns {Function} unsubscribe function
 */
export function addCustomerInfoListener(callback) {
  if (!Purchases) return { remove: function() {} };
  var listener = Purchases.addCustomerInfoUpdateListener(function(info) {
    var isActive = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    callback({
      customerInfo: info,
      isProActive: isActive,
      activeSubscription: isActive ? info.entitlements.active[ENTITLEMENT_ID] : null,
    });
  });
  return listener;
}

// ─── Exports ────────────────────────────────────────────────────

export default {
  initRevenueCat: initRevenueCat,
  loginUser: loginUser,
  logoutUser: logoutUser,
  checkEntitlement: checkEntitlement,
  getCustomerInfo: getCustomerInfo,
  getActiveSubscription: getActiveSubscription,
  getOfferings: getOfferings,
  purchasePackage: purchasePackage,
  purchaseOneTimeProduct: purchaseOneTimeProduct,
  presentPaywall: presentPaywall,
  presentPaywallIfNeeded: presentPaywallIfNeeded,
  presentCustomerCenter: presentCustomerCenter,
  restorePurchases: restorePurchases,
  addCustomerInfoListener: addCustomerInfoListener,
  ENTITLEMENT_ID: ENTITLEMENT_ID,
  PRODUCT_IDS: PRODUCT_IDS,
};
