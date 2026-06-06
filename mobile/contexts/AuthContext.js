/**
 * AuthContext — Google Sign-In Authentication Provider
 * 
 * Flow:
 * 1. User taps "Sign in with Google" → Firebase Auth → ID token
 * 2. ID token sent to server → server verifies with Firebase Admin → JWT returned
 * 3. JWT stored in SecureStore for persistent login
 * 4. Onboarding: Subscription → RevenueCat Paywall (Google Play / App Store billing)
 * 5. Onboarding: name + birth data (skippable)
 * 
 * Provides:
 * - user, token, loading, isLoggedIn, subscription
 * - signInWithGoogle() — opens Google Sign-In flow
 * - completeOnboarding(name, birthData)
 * - activateSubscription() — opens RevenueCat Paywall for subscription
 * - cancelSubscription() — opens RevenueCat Customer Center
 * - saveBirthData(birthData), updateProfile(data), signOut()
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { setAuthTokenGetter, getBaseUrl } from '../services/api';
import {
  googleAuth as apiGoogleAuth,
  completeOnboarding as apiCompleteOnboarding,
  getSubscriptionStatus as apiGetSubscriptionStatus,
} from '../services/api';
import {
  initRevenueCat,
  loginUser as rcLoginUser,
  logoutUser as rcLogoutUser,
  checkEntitlement,
  checkEntitlementWithRetry,
  getActiveSubscription,
  presentCustomerCenter,
  restorePurchases,
  addCustomerInfoListener,
  ENTITLEMENT_ID,
} from '../services/revenuecat';
import { registerForPushNotifications, cancelDailyGuidanceNotifications } from '../services/notifications';
import { auth as firebaseAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from '../services/firebase';
import { Platform, View } from 'react-native';
import PaywallScreen from '../components/PaywallScreen';

var AuthContext = createContext(null);

var STORAGE_TOKEN = 'grahachara_auth_token';
var STORAGE_USER = 'grahachara_user_profile';
var STORAGE_ONBOARDING = 'grahachara_onboarding_done';
var STORAGE_PUSH_REGISTERED = 'grahachara_push_registered_for';
var REPORTS_CACHE_KEY = '@grahachara_saved_reports';
var PUSH_REGISTER_REFRESH_MS = 24 * 60 * 60 * 1000;

function buildActiveSubscription(activeSub, fallback) {
  fallback = fallback || {};
  var plan = activeSub ? (activeSub.plan || activeSub.productIdentifier) : null;
  var expiresAt = activeSub ? (activeSub.expiresDate || activeSub.expirationDate) : null;
  var willRenew = activeSub && activeSub.willRenew !== undefined
    ? activeSub.willRenew !== false
    : fallback.willRenew !== false;
  var isLifetime = activeSub && activeSub.isLifetime !== undefined
    ? !!activeSub.isLifetime
    : (!expiresAt && fallback.isLifetime === true);

  return {
    status: 'active',
    plan: plan || fallback.productIdentifier || fallback.plan || 'pro',
    expiresAt: expiresAt || fallback.expiresAt || null,
    willRenew: isLifetime ? false : willRenew,
    store: activeSub ? (activeSub.store || fallback.store || null) : (fallback.store || null),
    cancelledAt: activeSub ? (activeSub.unsubscribeDetectedAt || activeSub.cancelledAt || null) : (fallback.cancelledAt || null),
    billingIssueAt: activeSub ? (activeSub.billingIssueDetectedAt || null) : (fallback.billingIssueAt || null),
    isLifetime: isLifetime,
  };
}

function normalizeStoredSubscription(storedSub) {
  if (!storedSub) return null;
  if (storedSub.status === 'none' || storedSub.status === 'pending') return null;
  if (storedSub.status === 'active' && storedSub.expiresAt) {
    var expires = new Date(storedSub.expiresAt);
    if (Number.isFinite(expires.getTime())) {
      // Add 24-hour grace period for auto-renewing subscriptions.
      // expiresAt is the *current billing period end*, not the subscription end.
      // Auto-renewing subs renew within hours — without grace, we'd wrongly
      // mark them as expired during the renewal window.
      var GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() > expires.getTime() + GRACE_MS) {
        return { ...storedSub, status: 'expired', willRenew: false };
      }
    }
  }
  return storedSub;
}

function isSubscriptionCurrentlyActive(sub) {
  if (!sub || sub.status !== 'active') return false;
  if (sub.isLifetime === true || !sub.expiresAt) return true;
  var expires = new Date(sub.expiresAt);
  if (!Number.isFinite(expires.getTime())) return false;
  // 24-hour grace period: auto-renewing subscriptions may have a gap between
  // period end and the RENEWAL webhook/SDK update. Without this, users get
  // blocked during the renewal window.
  var GRACE_MS = 24 * 60 * 60 * 1000;
  return Date.now() <= expires.getTime() + GRACE_MS;
}

function buildInactiveSubscription(storedSub) {
  var normalized = normalizeStoredSubscription(storedSub);
  if (!normalized || normalized.status === 'active') return null;
  return normalized;
}

async function canUseSecureStore() {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

async function getStoredAuthToken() {
  var secureAvailable = await canUseSecureStore();
  if (secureAvailable) {
    var secureToken = await SecureStore.getItemAsync(STORAGE_TOKEN);
    if (secureToken) return secureToken;
  }

  var legacyToken = await AsyncStorage.getItem(STORAGE_TOKEN);
  if (legacyToken && secureAvailable) {
    await SecureStore.setItemAsync(STORAGE_TOKEN, legacyToken);
    await AsyncStorage.removeItem(STORAGE_TOKEN);
  }
  return legacyToken;
}

async function setStoredAuthToken(authToken) {
  if (!authToken) return;
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(STORAGE_TOKEN, authToken);
    await AsyncStorage.removeItem(STORAGE_TOKEN);
  } else {
    await AsyncStorage.setItem(STORAGE_TOKEN, authToken);
  }
}

async function removeStoredAuthToken() {
  try {
    if (await canUseSecureStore()) {
      await SecureStore.deleteItemAsync(STORAGE_TOKEN);
    }
  } catch (e) { /* continue clearing fallback storage */ }
  await AsyncStorage.removeItem(STORAGE_TOKEN);
}

// Register push token with server after auth. Idempotent — only POSTs once
// per (uid, token) pair via AsyncStorage marker so we don't spam the API.
async function registerPushTokenWithServer(authToken, uid, language) {
  try {
    if (!authToken || !uid) return;
    var pushToken = await registerForPushNotifications(language);
    if (!pushToken) return;
    var markerRaw = await AsyncStorage.getItem(STORAGE_PUSH_REGISTERED);
    var key = uid + ':' + pushToken;

    try {
      var marker = markerRaw ? JSON.parse(markerRaw) : null;
      if (marker && marker.key === key && marker.updatedAt && Date.now() - marker.updatedAt < PUSH_REGISTER_REFRESH_MS) {
        return;
      }
    } catch (e) { /* legacy marker format: refresh it once */ }

    var res = await fetch(getBaseUrl() + '/api/notifications/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authToken,
      },
      body: JSON.stringify({ pushToken: pushToken, platform: Platform.OS }),
    });
    if (res && res.ok) {
      await AsyncStorage.setItem(STORAGE_PUSH_REGISTERED, JSON.stringify({
        key: key,
        updatedAt: Date.now(),
      }));
    }
  } catch (err) {
    if (__DEV__) console.warn('[Auth] Push register failed (non-fatal):', err && err.message);
  }
}

function maskValue(value, visibleChars) {
  if (!value || typeof value !== 'string') return 'missing';
  if (value.length <= visibleChars) return value;
  return '...' + value.slice(-visibleChars);
}

function getAuthDebugContext() {
  var options = firebaseAuth?.app?.options || {};
  return {
    platform: Platform.OS,
    projectId: options.projectId || 'missing',
    appId: maskValue(options.appId, 10),
    apiKey: maskValue(options.apiKey, 6),
    apiBaseUrl: getBaseUrl(),
    authReady: !!firebaseAuth,
  };
}

function buildAuthError(stage, err, extra) {
  var context = {
    ...getAuthDebugContext(),
    stage: stage,
    code: err?.code || 'unknown',
    nativeMessage: err?.message || 'Unknown auth error',
    ...extra,
  };
  var message =
    'Google sign-in failed at ' + context.stage +
    ' [' + context.code + ']: ' + context.nativeMessage +
    ' | platform=' + context.platform +
    ' | project=' + context.projectId +
    ' | app=' + context.appId +
    ' | apiKey=' + context.apiKey +
    ' | api=' + context.apiBaseUrl;
  var wrapped = new Error(message);
  wrapped.code = context.code;
  wrapped.stage = context.stage;
  wrapped.details = context;
  wrapped.cause = err;
  return wrapped;
}

export function AuthProvider({ children }) {
  var [user, setUser] = useState(null);
  var [token, setToken] = useState(null);
  var [loading, setLoading] = useState(true);
  var [authReady, setAuthReady] = useState(false);
  var [subscription, setSubscription] = useState(null);
  var [subscriptionLoading, setSubscriptionLoading] = useState(true);
  var [paywallVisible, setPaywallVisible] = useState(false);
  var [paywallSource, setPaywallSource] = useState('onboarding');
  var [paywallDismissed, setPaywallDismissed] = useState(false);
  // Use a ref for the resolve/reject pair so it's read fresh by the modal
  // close/purchase callbacks (avoids stale closures and a race where the
  // paywall opens but the resolver hasn't been committed to state yet).
  var paywallResolverRef = useRef(null);

  // Initialize: Load saved token on app start
  useEffect(function() {
    loadSavedAuth();
  }, []);

  // Listen for RevenueCat subscription changes in real-time.
  // CRITICAL: This listener fires during SDK initialization before logIn()
  // completes, often with isProActive=false (stale anonymous customer info).
  // We must NEVER downgrade subscription here — only upgrade.
  // Downgrades are handled by verifySubscriptionInBackground() which has
  // retry + server fallback safety nets. Downgrading here caused the
  // subscription to flap (active→null→active) on every app launch, which
  // RevenueCat interpreted as cancel/resubscribe events and sent 2-5 emails.
  useEffect(function() {
    var unsubscribe = addCustomerInfoListener(function(update) {
      if (__DEV__) console.log('[Auth] RevenueCat update — pro active:', update.isProActive);
      if (update.isProActive) {
        // Upgrade: user gained entitlement — always apply
        var activeSub = update.activeSubscription;
        var sub = buildActiveSubscription(activeSub);
        setSubscription(sub);
        setUser(function(prev) {
          if (!prev) return prev;
          var updated = { ...prev, subscription: sub, isSubscribed: true };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      }
      // else: DO NOT set subscription to null here.
      // The listener fires with false during SDK init (before logIn),
      // when switching from anonymous to identified user, and on
      // network errors. Let verifySubscriptionInBackground handle
      // downgrade decisions with proper fallback logic.
    });

    return function() {
      if (unsubscribe && typeof unsubscribe.remove === 'function') {
        unsubscribe.remove();
      }
    };
  }, []);

  async function loadSavedAuth() {
    try {
      var savedToken = await getStoredAuthToken();
      var savedUser = await AsyncStorage.getItem(STORAGE_USER);

      if (savedToken && savedUser) {
        var userData = JSON.parse(savedUser);
        // Keep the raw stored subscription BEFORE normalization — we need this
        // in verifySubscriptionInBackground to detect if the user previously had
        // an active subscription (normalization may change 'active' to 'expired'
        // if expiresAt is past, even though the store may have auto-renewed).
        var rawStoredSubscription = userData.subscription ? { ...userData.subscription } : null;
        userData.subscription = normalizeStoredSubscription(userData.subscription);
        setToken(savedToken);
        setUser(userData);

        // CRITICAL: Trust the stored subscription immediately so we never
        // flash the paywall while RevenueCat SDK is still syncing.
        // Use isSubscribed (server-authoritative boolean) if available,
        // otherwise fall back to raw stored subscription status.
        var initialSub = null;
        if (userData.isSubscribed === true) {
          // Server previously confirmed subscription — trust it
          initialSub = rawStoredSubscription || userData.subscription;
        } else if (rawStoredSubscription && rawStoredSubscription.status === 'active') {
          // Legacy: no isSubscribed field yet, trust raw status
          initialSub = rawStoredSubscription;
        } else {
          initialSub = userData.subscription;
        }
        setSubscription(initialSub);

        // Wire token to API service
        setAuthTokenGetter(function() {
          return Promise.resolve(savedToken);
        });

        // Per RevenueCat docs: configure with the UID directly if known at launch.
        // This avoids the anonymous→identified switch that fires the listener
        // with stale anonymous customer info (isProActive=false).
        // Then logIn() to ensure the identified user is properly linked.
        var rcLoginResult = null;
        if (userData.uid) {
          try {
            await initRevenueCat(userData.uid);
            rcLoginResult = await rcLoginUser(userData.uid);
          } catch (rcErr) {
            if (__DEV__) console.warn('[Auth] RevenueCat init/login failed (non-fatal):', rcErr.message);
            // Ensure SDK is at least initialized even if logIn fails
            try { await initRevenueCat(null); } catch (_) {}
          }
        } else {
          await initRevenueCat(null);
        }

        // Verify subscription in background — use logIn result + retry + server fallback.
        // This runs AFTER the UI has already rendered with the trusted stored subscription,
        // so the user never sees a paywall flash.
        verifySubscriptionInBackground(userData, savedToken, rawStoredSubscription, rcLoginResult);

        // Refresh profile from server in background
        refreshProfile(savedToken);

        // Register for push notifications (idempotent, fires once per token)
        registerPushTokenWithServer(savedToken, userData.uid, userData?.preferences?.language);
      } else {
        // No saved user — initialize anonymous
        try { await initRevenueCat(null); } catch (_) {}
        setSubscriptionLoading(false);
      }
    } catch (err) {
      if (__DEV__) console.warn('Failed to load saved auth:', err.message);
      setSubscriptionLoading(false);
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }

  /**
   * Background subscription verification — runs AFTER UI is rendered with
   * trusted stored subscription. Uses logIn result + retry + server fallback.
   * Only downgrades subscription if ALL sources confirm it's inactive.
   * 
   * @param {Object} userData — user data from storage
   * @param {string} authToken — JWT token
   * @param {Object|null} rawStoredSubscription — subscription before normalization
   * @param {Object|null} rcLoginResult — result from rcLoginUser() containing customerInfo
   */
  async function verifySubscriptionInBackground(userData, authToken, rawStoredSubscription, rcLoginResult) {
    var rawStoredSub = rawStoredSubscription || userData.subscription;

    try {
      // Step 1a: Check the logIn() result first — it already has fresh CustomerInfo
      var isProActive = false;
      if (rcLoginResult && rcLoginResult.customerInfo) {
        var entitlements = rcLoginResult.customerInfo.entitlements;
        if (entitlements && entitlements.active && entitlements.active[ENTITLEMENT_ID]) {
          isProActive = true;
          if (__DEV__) console.log('[Auth] logIn() result confirms active entitlement');
        }
      }

      // Step 1b: If logIn result didn't confirm, try retry + sync fallback
      if (!isProActive) {
        isProActive = await checkEntitlementWithRetry();
      }

      if (isProActive) {
        // Subscription confirmed active via RevenueCat SDK
        var activeSub = await getActiveSubscription();
        var sub = buildActiveSubscription(activeSub);
        setSubscription(sub);
        userData.subscription = sub;
        userData.isSubscribed = true;
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
        setSubscriptionLoading(false);
        return;
      }

      // Step 2: RevenueCat says inactive — check server's isSubscribed flag.
      // This is the authoritative source (set by webhook).
      var serverConfirmedInactive = false;
      try {
        var serverStatus = await apiGetSubscriptionStatus();
        if (serverStatus && serverStatus.isSubscribed === true) {
          // Server says subscribed — trust it over SDK (SDK sync delay)
          if (__DEV__) console.log('[Auth] Server isSubscribed=true (RevenueCat disagreed)');
          var serverSub = {
            status: 'active',
            plan: serverStatus.subscription ? (serverStatus.subscription.plan || 'pro') : 'pro',
            expiresAt: serverStatus.subscription ? (serverStatus.subscription.expiresAt || null) : null,
            willRenew: serverStatus.subscription ? (serverStatus.subscription.willRenew !== false) : true,
            store: serverStatus.subscription ? (serverStatus.subscription.store || null) : null,
            isLifetime: serverStatus.subscription ? (serverStatus.subscription.isLifetime || false) : false,
          };
          setSubscription(serverSub);
          userData.subscription = serverSub;
          userData.isSubscribed = true;
          await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
          setSubscriptionLoading(false);
          return;
        }
        // Server explicitly says isSubscribed is false/missing
        serverConfirmedInactive = true;
      } catch (serverErr) {
        if (__DEV__) console.warn('[Auth] Server subscription check failed (non-fatal):', serverErr.message);
        // Server error — NOT a confirmation of inactive
      }

      // Step 3: Safety net — if we had a stored active sub and server errored
      // (not explicitly inactive), keep the stored subscription
      var hadStoredActiveSub = rawStoredSub && rawStoredSub.status === 'active';

      if (hadStoredActiveSub && !serverConfirmedInactive) {
        if (__DEV__) console.log('[Auth] Keeping stored subscription — server did not explicitly confirm inactive');
        setSubscription(rawStoredSub);
        setSubscriptionLoading(false);
        return;
      }

      // Step 4: Both sources confirm inactive — downgrade
      if (__DEV__) console.log('[Auth] Both sources confirm subscription inactive — downgrading');
      var inactiveSub = buildInactiveSubscription(userData.subscription);
      setSubscription(inactiveSub);
      userData.subscription = inactiveSub;
      userData.isSubscribed = false;
      await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
    } catch (rcErr) {
      if (__DEV__) console.warn('[Auth] Background subscription verify failed (non-fatal):', rcErr.message);
    } finally {
      setSubscriptionLoading(false);
    }
  }

  async function refreshProfile(authToken) {
    try {
      var res = await fetch(getBaseUrl() + '/api/user/profile', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken,
        },
      });
      if (res.status === 401) {
        // Token invalid or expired — defer sign-out if user might have unsaved data
        if (__DEV__) console.warn('Profile refresh returned 401');
        // Store a flag so screens can save data before we clear auth state
        try {
          await AsyncStorage.setItem('@grahachara_auth_expired', 'true');
        } catch (e) { /* non-critical */ }
        // Give screens 2s to persist any in-flight data, then clear auth
        await new Promise(function(r) { setTimeout(r, 2000); });
        await removeStoredAuthToken();
        await AsyncStorage.multiRemove([STORAGE_USER, STORAGE_ONBOARDING, '@grahachara_auth_expired', REPORTS_CACHE_KEY]);
        setToken(null);
        setUser(null);
        setSubscription(null);
        setAuthTokenGetter(null);
        return;
      }
      var json = await res.json();
      if (json.success && json.user) {
        // Preserve onboardingComplete — never lose it during refresh
        setUser(function(prev) {
          var serverUser = json.user;
          var merged = {
            ...serverUser,
            onboardingComplete: serverUser.onboardingComplete || prev?.onboardingComplete || false,
          };
          merged.subscription = normalizeStoredSubscription(merged.subscription);
          // Preserve local birthData if server doesn't have it yet (race condition after onboarding)
          if (prev?.birthData?.dateTime && !serverUser.birthData?.dateTime) {
            merged.birthData = prev.birthData;
          }
          // Skip update if nothing meaningful changed (prevents re-render cascade)
          if (prev && JSON.stringify(prev.birthData) === JSON.stringify(merged.birthData) &&
              prev.onboardingComplete === merged.onboardingComplete &&
              prev.displayName === merged.displayName &&
              JSON.stringify(prev.subscription) === JSON.stringify(merged.subscription)) {
            return prev; // Same reference = no re-render
          }
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(merged));
          return merged;
        });
        setSubscription(function(currentSub) {
          // CRITICAL: Never downgrade a locally-verified active subscription
          // with stale server data. The server profile endpoint may return
          // outdated subscription info (e.g. before RevenueCat webhook fires).
          var serverSub = normalizeStoredSubscription(json.user.subscription) || null;
          if (isSubscriptionCurrentlyActive(currentSub) && !isSubscriptionCurrentlyActive(serverSub)) {
            return currentSub; // keep local truth
          }
          return serverSub;
        });
      }
    } catch (err) {
      if (__DEV__) console.warn('Profile refresh failed:', err.message);
    }
  }

  // Sign in with Google via Firebase Auth
  var signInWithGoogle = useCallback(async function() {
    var currentStage = 'start';
    try {
      var firebaseUser = null;

      if (!firebaseAuth) {
        throw buildAuthError('firebase-init', new Error('Firebase auth was not initialized'));
      }

      if (Platform.OS === 'web') {
        // Web: use popup-based Google sign-in
        currentStage = 'google-popup';
        var provider = new GoogleAuthProvider();
        var result = await signInWithPopup(firebaseAuth, provider);
        firebaseUser = result.user;
      } else {
        // Native: use expo-auth-session or react-native Google Sign-In
        // Try @react-native-google-signin/google-signin first
        var GoogleSignin = null;
        try {
          var gsiModule = require('@react-native-google-signin/google-signin');
          GoogleSignin = gsiModule.GoogleSignin;
        } catch (e) {
          // Fallback: try expo-auth-session for Google
          if (__DEV__) console.warn('Google Sign-In native module not available, trying web fallback');
          currentStage = 'google-popup-fallback';
          var provider = new GoogleAuthProvider();
          var result = await signInWithPopup(firebaseAuth, provider);
          firebaseUser = result.user;
        }

        if (GoogleSignin && !firebaseUser) {
          currentStage = 'play-services';
          if (__DEV__) console.log('[Auth] Step 1: Checking Play Services...', getAuthDebugContext());
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          if (__DEV__) console.log('[Auth] Step 2: Play Services OK, calling signIn()...');
          
          var signInResult = null;
          try {
            currentStage = 'google-signin';
            signInResult = await GoogleSignin.signIn();
          } catch (signInErr) {
            if (__DEV__) console.error('[Auth] GoogleSignin.signIn() THREW:', signInErr?.code, signInErr?.message);
            throw signInErr;
          }
          
          if (__DEV__) console.log('[Auth] Step 3: signIn() returned, type:', signInResult?.type, 'keys:', Object.keys(signInResult || {}));

          // v13 returns { type: 'cancelled', data: null } when user cancels
          if (signInResult?.type === 'cancelled') {
            return { success: false, cancelled: true };
          }

          // v13 returns { type: 'success', data: { idToken, user, ... } }
          currentStage = 'google-id-token';
          var idToken = signInResult?.data?.idToken || signInResult?.idToken;
          if (__DEV__) console.log('[Auth] Step 4: idToken:', idToken ? 'yes (length=' + idToken.length + ')' : 'NO');
          if (!idToken) {
            var debugInfo = JSON.stringify(signInResult, null, 2);
            if (__DEV__) console.error('[Auth] No idToken! Full result:', debugInfo);
            throw new Error('Failed to get Google ID token — signIn returned type: ' + (signInResult?.type || 'unknown'));
          }
          
          // On native, skip signInWithCredential (Firebase JS SDK REST calls
          // fail on Android due to API key restrictions). Send the raw Google
          // ID token directly to our server which verifies it server-side.
          if (__DEV__) console.log('[Auth] Step 5: Skipping Firebase credential on native, sending Google token to server...');
          currentStage = 'backend-auth';
          var googleUser = signInResult?.data?.user || signInResult?.user || {};
          var result = await apiGoogleAuth(idToken, {
            displayName: googleUser.name || googleUser.givenName || '',
            email: googleUser.email || '',
            photoURL: googleUser.photo || '',
          });
          if (__DEV__) console.log('[Auth] Step 6: Server auth result:', result?.success);

          if (!result.success) {
            throw new Error(result.error || 'Authentication failed');
          }

          var authToken = result.token;
          var userData = result.user;
          userData.subscription = normalizeStoredSubscription(userData.subscription);

          currentStage = 'persist-session';
          await setStoredAuthToken(authToken);
          await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));

          setToken(authToken);
          setUser(userData);
          setSubscription(userData.subscription || null);

          setAuthTokenGetter(function() {
            return Promise.resolve(authToken);
          });

          // Login to RevenueCat with Firebase UID
          if (userData.uid) {
            try {
              var rcResult = await rcLoginUser(userData.uid);
              // Use logIn() result's customerInfo directly — it's already fresh from
              // the RevenueCat server. Only fall back to getCustomerInfo() + retry
              // if logIn didn't return entitlement data.
              var rcEntitlementActive = false;
              if (rcResult && rcResult.customerInfo && rcResult.customerInfo.entitlements &&
                  rcResult.customerInfo.entitlements.active &&
                  rcResult.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
                rcEntitlementActive = true;
              }
              if (!rcEntitlementActive) {
                rcEntitlementActive = await checkEntitlementWithRetry();
              }
              if (rcEntitlementActive) {
                var activeSub = await getActiveSubscription();
                var sub = buildActiveSubscription(activeSub);
                setSubscription(sub);
                userData.subscription = sub;
                userData.isSubscribed = true;
                await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
              } else {
                var inactiveSub = buildInactiveSubscription(userData.subscription);
                setSubscription(inactiveSub);
                userData.subscription = inactiveSub;
                // Don't override isSubscribed here — server's value from
                // the response is authoritative. RevenueCat SDK may have sync
                // delays but the server flag is set by the webhook.
                await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
              }
            } catch (rcErr) {
              if (__DEV__) console.warn('[Auth] RevenueCat login after Google auth failed (non-fatal):', rcErr.message);
            }
          }

          // Register for push notifications (idempotent)
          registerPushTokenWithServer(authToken, userData.uid, userData?.preferences?.language);

          setSubscriptionLoading(false);
          return {
            success: true,
            user: userData,
            isNewUser: result.isNewUser,
          };
        }
      }

      if (!firebaseUser) throw new Error('Google Sign-In failed');

      // Web path: get Firebase ID token and send to server
      currentStage = 'firebase-id-token';
      var idToken = await firebaseUser.getIdToken();

      // Send to our server for JWT + user creation
      currentStage = 'backend-auth';
      var result = await apiGoogleAuth(idToken, {
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
      });

      if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
      }

      var authToken = result.token;
      var userData = result.user;
      userData.subscription = normalizeStoredSubscription(userData.subscription);

      currentStage = 'persist-session';
      await setStoredAuthToken(authToken);
      await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
      setSubscription(userData.subscription || null);

      setAuthTokenGetter(function() {
        return Promise.resolve(authToken);
      });

      // Login to RevenueCat with Firebase UID
      if (userData.uid) {
        try {
          var rcResult = await rcLoginUser(userData.uid);
          // Check logIn() result's customerInfo first — already fresh from server
          var rcEntitlementActive = false;
          if (rcResult && rcResult.customerInfo && rcResult.customerInfo.entitlements &&
              rcResult.customerInfo.entitlements.active &&
              rcResult.customerInfo.entitlements.active[ENTITLEMENT_ID]) {
            rcEntitlementActive = true;
          }
          if (!rcEntitlementActive) {
            rcEntitlementActive = await checkEntitlementWithRetry();
          }
          if (rcEntitlementActive) {
            var activeSub = await getActiveSubscription();
            var sub = buildActiveSubscription(activeSub);
            setSubscription(sub);
            userData.subscription = sub;
            userData.isSubscribed = true;
            await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
          } else {
            var inactiveSub = buildInactiveSubscription(userData.subscription);
            setSubscription(inactiveSub);
            userData.subscription = inactiveSub;
            // Don't override isSubscribed — server value is authoritative
            await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
          }
        } catch (rcErr) {
          if (__DEV__) console.warn('[Auth] RevenueCat login after Google auth failed (non-fatal):', rcErr.message);
        }
      }

      setSubscriptionLoading(false);
      return {
        success: true,
        user: userData,
        isNewUser: result.isNewUser,
      };
    } catch (err) {
      if (__DEV__) console.error('[Auth] signInWithGoogle error:', currentStage, err?.code, err?.message, err?.details || err);
      // Don't throw for user cancellation — v13 uses statusCodes.SIGN_IN_CANCELLED (code "12501")
      // Also handle legacy ERR_REQUEST_CANCELED and v13 cancelled type
      if (err && (
        err.code === 'ERR_REQUEST_CANCELED' ||
        err.code === '12501' ||
        err.code === 'SIGN_IN_CANCELLED' ||
        err.message?.includes('Sign in action cancelled')
      )) {
        return { success: false, cancelled: true };
      }
      if (err?.details?.stage) throw err;
      throw buildAuthError(currentStage, err);
    }
  }, []);

  // Complete onboarding with name and birth data
  var completeOnboarding = useCallback(async function(displayName, birthData, language) {
    try {
      await apiCompleteOnboarding({ displayName: displayName, birthData: birthData, language: language || null });

      setUser(function(prev) {
        var updated = {
          ...prev,
          displayName: displayName || prev?.displayName,
          birthData: birthData || prev?.birthData,
          onboardingComplete: true,
        };
        if (language) {
          updated.preferences = { ...(prev?.preferences || {}), language: language };
        }
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });

      await AsyncStorage.setItem(STORAGE_ONBOARDING, 'true');
      return { success: true };
    } catch (err) {
      if (__DEV__) console.error('Complete onboarding error:', err);
      throw err;
    }
  }, []);

  // Activate subscription — show custom Paywall
  var activateSubscription = useCallback(async function() {
    console.log('[Auth] activateSubscription called — showing paywall');
    return new Promise(function(resolve, reject) {
      paywallResolverRef.current = { resolve: resolve, reject: reject };
      setPaywallSource('onboarding');
      setPaywallVisible(true);
      console.log('[Auth] paywallVisible set to true, source: onboarding');
    });
  }, []);

  // Called when purchase succeeds in PaywallScreen
  var handlePaywallPurchased = useCallback(async function(result) {
    console.log('[Auth] handlePaywallPurchased — result:', JSON.stringify(result).slice(0, 200));
    setPaywallVisible(false);
    var resolver = paywallResolverRef.current;
    paywallResolverRef.current = null;
    try {
      var activeSub = await getActiveSubscription();
      var sub = buildActiveSubscription(activeSub, result || {});
      setSubscription(sub);
      setUser(function(prev) {
        var updated = { ...prev, subscription: sub, isSubscribed: true };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
      if (resolver && resolver.resolve) resolver.resolve({ success: true, subscription: sub });
    } catch (err) {
      if (resolver && resolver.resolve) resolver.resolve({ success: true });
    }
  }, []);

  // Called when paywall is closed without purchase
  var handlePaywallClose = useCallback(function() {
    console.log('[Auth] handlePaywallClose — dismissing paywall');
    setPaywallVisible(false);
    setPaywallDismissed(true);
    var resolver = paywallResolverRef.current;
    paywallResolverRef.current = null;
    if (resolver && resolver.reject) resolver.reject(new Error('Payment cancelled'));
  }, []);

  // Cancel subscription — opens RevenueCat Customer Center
  var cancelSubscription = useCallback(async function() {
    try {
      await presentCustomerCenter();
      // After Customer Center closes, refresh subscription status
      var isActive = await checkEntitlement();
      var activeSub = isActive ? await getActiveSubscription() : null;
      var sub = isActive ? buildActiveSubscription(activeSub) : { status: 'cancelled' };
      setSubscription(sub);
      setUser(function(prev) {
        if (!prev) return prev;
        // Note: after cancellation, isSubscribed stays true until EXPIRATION
        // webhook fires. The user keeps access until period end.
        var updated = { ...prev, subscription: sub, isSubscribed: isActive };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
      return { success: true, subscription: sub };
    } catch (err) {
      throw err;
    }
  }, []);

  var checkSubscription = useCallback(async function() {
    try {
      var isActive = await checkEntitlementWithRetry();
      var activeSub = isActive ? await getActiveSubscription() : null;
      var sub = isActive ? buildActiveSubscription(activeSub) : null;
      setSubscription(sub);
      setUser(function(prev) {
        if (!prev) return prev;
        var updated = { ...prev, subscription: sub, isSubscribed: isActive };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
      return { success: true, subscription: sub };
    } catch (err) {
      if (__DEV__) console.warn('Subscription check failed:', err.message);
      return { success: false };
    }
  }, []);

  // Renew = just re-present the paywall (RevenueCat handles everything)
  var renewSub = useCallback(async function() {
    try {
      return await activateSubscription();
    } catch (err) {
      throw err;
    }
  }, [activateSubscription]);

  // Save birth data (birth-time edit limit enforced server-side)
  var saveBirthData = useCallback(async function(birthData) {
    if (!token) return;
    try {
      var res = await fetch(getBaseUrl() + '/api/user/birth-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(birthData),
      });
      var json = await res.json();
      if (res.status === 429) {
        var limitError = new Error(json.error || 'Birth time can only be changed 2 times per month.');
        limitError.code = json.code;
        limitError.limit = json.limit;
        limitError.remaining = json.remaining;
        limitError.resetsAt = json.resetsAt;
        throw limitError;
      }
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update birth data');
      }
      setUser(function(prev) {
        var updated = { ...prev, birthData: birthData, birthTimeEditLimit: json.birthTimeEditLimit || prev?.birthTimeEditLimit, onboardingComplete: true };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      if (__DEV__) console.error('Save birth data error:', err);
      throw err;
    }
  }, [token]);

  // Update profile
  var updateProfile = useCallback(async function(data) {
    if (!token) return;
    try {
      var res = await fetch(getBaseUrl() + '/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(data),
      });
      var json = await res.json();
      if (json.success && json.user) {
        setUser(json.user);
        await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(json.user));
      }
      return json;
    } catch (err) {
      if (__DEV__) console.error('Update profile error:', err);
      throw err;
    }
  }, [token]);

  // Get auth token for API calls
  var getAuthToken = useCallback(async function() {
    return token;
  }, [token]);

  // Sign out
  var signOut = useCallback(async function() {
    try {
      try {
        var storedToken = await getStoredAuthToken();
        if (storedToken) {
          await fetch(getBaseUrl() + '/api/notifications/unregister', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + storedToken,
            },
          });
        }
      } catch (notifErr) {
        if (__DEV__) console.warn('[Auth] Push unregister failed (non-fatal):', notifErr && notifErr.message);
      }

      try {
        await cancelDailyGuidanceNotifications();
      } catch (localNotifErr) {
        if (__DEV__) console.warn('[Auth] Local notification cleanup failed (non-fatal):', localNotifErr && localNotifErr.message);
      }

      // Logout from RevenueCat (resets to anonymous)
      try {
        await rcLogoutUser();
      } catch (rcErr) {
        if (__DEV__) console.warn('[Auth] RevenueCat logout failed (non-fatal):', rcErr.message);
      }

      // Clear all stored auth data
      await removeStoredAuthToken();
      await AsyncStorage.multiRemove([STORAGE_USER, STORAGE_ONBOARDING, STORAGE_PUSH_REGISTERED, 'pushToken', REPORTS_CACHE_KEY]);
      
      // Clear the API auth token getter
      setAuthTokenGetter(null);
      
      // Reset all state — order matters: clear token last so isLoggedIn flips
      setSubscription(null);
      setSubscriptionLoading(true);
      setUser(null);
      setToken(null);
    } catch (err) {
      if (__DEV__) console.error('Sign out error:', err);
      try {
        await removeStoredAuthToken();
        await AsyncStorage.multiRemove([STORAGE_USER, STORAGE_ONBOARDING, STORAGE_PUSH_REGISTERED, 'pushToken', REPORTS_CACHE_KEY]);
      } catch (e) { /* ignore */ }
      // Force clear state even if AsyncStorage fails
      setAuthTokenGetter(null);
      setSubscription(null);
      setSubscriptionLoading(true);
      setUser(null);
      setToken(null);
    }
  }, []);

  var value = {
    user: user,
    profile: user, // alias for backward compat
    token: token,
    loading: loading,
    authReady: authReady,
    isLoggedIn: !!token && !!user,
    isAnonymous: false,
    subscription: subscription,
    subscriptionLoading: subscriptionLoading,
    isSubscribed: !!(user && user.isSubscribed) || isSubscriptionCurrentlyActive(subscription),
    isSubscriptionRenewing: (!!(user && user.isSubscribed) || isSubscriptionCurrentlyActive(subscription)) && subscription?.willRenew !== false,
    isSubscriptionCancelled: (!!(user && user.isSubscribed) || isSubscriptionCurrentlyActive(subscription)) && subscription?.willRenew === false && !subscription?.isLifetime,
    getAuthToken: getAuthToken,
    signInWithGoogle: signInWithGoogle,
    completeOnboarding: completeOnboarding,
    activateSubscription: activateSubscription,
    cancelSubscription: cancelSubscription,
    checkSubscription: checkSubscription,
    renewSubscription: renewSub,
    restorePurchases: restorePurchases,
    presentCustomerCenter: presentCustomerCenter,
    showPaywall: function(source) {
      console.log('[Auth] showPaywall called — source:', source);
      return new Promise(function(resolve, reject) {
        setPaywallSource(source || 'onboarding');
        paywallResolverRef.current = { resolve: resolve, reject: reject };
        setPaywallVisible(true);
        console.log('[Auth] paywallVisible set to true, source:', source || 'onboarding');
      });
    },
    saveBirthData: saveBirthData,
    updateProfile: updateProfile,
    signOut: signOut,
  };

  // CRITICAL: Never force paywall while subscription verification is in progress.
  // subscriptionLoading=true means we haven't finished checking RevenueCat/server yet.
  // Without this guard, the paywall flashes on every app restart for paid users.
  // forceSubscriptionPaywall: show paywall if user is logged in, onboarded,
  // subscription check is complete, AND the user is not subscribed.
  // Uses isSubscribed from server (stored in userData) as primary check,
  // falls back to isSubscriptionCurrentlyActive for display-derived state.
  var forceSubscriptionPaywall = !!token && !!user && user.onboardingComplete === true && !subscriptionLoading && !user.isSubscribed && !isSubscriptionCurrentlyActive(subscription) && !paywallDismissed;
  var effectivePaywallVisible = paywallVisible || forceSubscriptionPaywall;
  var effectivePaywallSource = forceSubscriptionPaywall && !paywallVisible ? 'onboarding' : paywallSource;

  return (
    <AuthContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <PaywallScreen
          visible={effectivePaywallVisible}
          source={effectivePaywallSource}
          onClose={handlePaywallClose}
          onPurchased={handlePaywallPurchased}
        />
      </View>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
