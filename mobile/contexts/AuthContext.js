/**
 * AuthContext — Google Sign-In Authentication Provider
 * 
 * Flow:
 * 1. User taps "Sign in with Google" → Firebase Auth → ID token
 * 2. ID token sent to server → server verifies with Firebase Admin → JWT returned
 * 3. JWT stored in AsyncStorage for persistent login
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

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthTokenGetter } from '../services/api';
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
  getActiveSubscription,
  presentCustomerCenter,
  restorePurchases,
  addCustomerInfoListener,
} from '../services/revenuecat';
import { auth as firebaseAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from '../services/firebase';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import PaywallScreen from '../components/PaywallScreen';

var AuthContext = createContext(null);

var STORAGE_TOKEN = 'grahachara_auth_token';
var STORAGE_USER = 'grahachara_user_profile';
var STORAGE_ONBOARDING = 'grahachara_onboarding_done';

function getBaseUrl() {
  if (!__DEV__) return 'http://api.grahachara.com:3000';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://' + window.location.hostname + ':3000';
  }
  var host = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (host) return 'http://' + host.split(':')[0] + ':3000';
  
  // Fallback for Android Emulator
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  
  return 'http://localhost:3000';
}

export function AuthProvider({ children }) {
  var [user, setUser] = useState(null);
  var [token, setToken] = useState(null);
  var [loading, setLoading] = useState(true);
  var [authReady, setAuthReady] = useState(false);
  var [subscription, setSubscription] = useState(null);
  var [paywallVisible, setPaywallVisible] = useState(false);
  var [paywallResolve, setPaywallResolve] = useState(null);
  var [paywallSource, setPaywallSource] = useState('onboarding');

  // Initialize: Load saved token on app start
  useEffect(function() {
    loadSavedAuth();
  }, []);

  // Listen for RevenueCat subscription changes in real-time
  useEffect(function() {
    var unsubscribe = addCustomerInfoListener(function(update) {
      console.log('[Auth] RevenueCat update — pro active:', update.isProActive);
      if (update.isProActive) {
        var activeSub = update.activeSubscription;
        var sub = {
          status: 'active',
          plan: activeSub ? activeSub.productIdentifier : 'pro',
          expiresAt: activeSub ? activeSub.expirationDate : null,
          willRenew: activeSub ? activeSub.willRenew : true,
          store: activeSub ? activeSub.store : null,
        };
        setSubscription(sub);
        setUser(function(prev) {
          if (!prev) return prev;
          var updated = { ...prev, subscription: sub };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      } else {
        setSubscription(null);
        setUser(function(prev) {
          if (!prev) return prev;
          var updated = { ...prev, subscription: null };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      }
    });

    return function() {
      if (unsubscribe && typeof unsubscribe.remove === 'function') {
        unsubscribe.remove();
      }
    };
  }, []);

  async function loadSavedAuth() {
    try {
      // Initialize RevenueCat early (anonymous until login)
      await initRevenueCat(null);

      var savedToken = await AsyncStorage.getItem(STORAGE_TOKEN);
      var savedUser = await AsyncStorage.getItem(STORAGE_USER);

      if (savedToken && savedUser) {
        var userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setSubscription(userData.subscription || null);

        // Wire token to API service
        setAuthTokenGetter(function() {
          return Promise.resolve(savedToken);
        });

        // Login to RevenueCat with user's Firebase UID
        if (userData.uid) {
          try {
            await rcLoginUser(userData.uid);
          } catch (rcErr) {
            console.warn('[Auth] RevenueCat login failed (non-fatal):', rcErr.message);
          }
        }

        // Sync subscription status from RevenueCat
        try {
          var isProActive = await checkEntitlement();
          if (isProActive) {
            var activeSub = await getActiveSubscription();
            var sub = {
              status: 'active',
              plan: activeSub ? activeSub.plan : 'pro',
              expiresAt: activeSub ? activeSub.expiresDate : null,
              willRenew: activeSub ? activeSub.willRenew : true,
            };
            setSubscription(sub);
            userData.subscription = sub;
            await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
          }
        } catch (rcErr) {
          console.warn('[Auth] RevenueCat entitlement check failed (non-fatal):', rcErr.message);
        }

        // Refresh profile from server in background
        refreshProfile(savedToken);
      }
    } catch (err) {
      console.warn('Failed to load saved auth:', err.message);
    } finally {
      setLoading(false);
      setAuthReady(true);
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
        // Token invalid or expired
        console.warn('Profile refresh returned 401, signing out');
        await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER, STORAGE_ONBOARDING]);
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
        setSubscription(json.user.subscription || null);
      }
    } catch (err) {
      console.warn('Profile refresh failed:', err.message);
    }
  }

  // Sign in with Google via Firebase Auth
  var signInWithGoogle = useCallback(async function() {
    try {
      var firebaseUser = null;

      if (Platform.OS === 'web') {
        // Web: use popup-based Google sign-in
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
          console.warn('Google Sign-In native module not available, trying web fallback');
          var provider = new GoogleAuthProvider();
          var result = await signInWithPopup(firebaseAuth, provider);
          firebaseUser = result.user;
        }

        if (GoogleSignin && !firebaseUser) {
          console.log('[Auth] Step 1: Checking Play Services...');
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          console.log('[Auth] Step 2: Play Services OK, calling signIn()...');
          
          var signInResult = null;
          try {
            signInResult = await GoogleSignin.signIn();
          } catch (signInErr) {
            console.error('[Auth] GoogleSignin.signIn() THREW:', signInErr?.code, signInErr?.message);
            Alert.alert(
              'Google Sign-In Error',
              'Code: ' + (signInErr?.code || 'none') + '\nMessage: ' + (signInErr?.message || 'unknown') + '\n\nFull: ' + JSON.stringify(signInErr, Object.getOwnPropertyNames(signInErr || {}), 2)
            );
            throw signInErr;
          }
          
          console.log('[Auth] Step 3: signIn() returned, type:', signInResult?.type, 'keys:', Object.keys(signInResult || {}));

          // v13 returns { type: 'cancelled', data: null } when user cancels
          if (signInResult?.type === 'cancelled') {
            return { success: false, cancelled: true };
          }

          // v13 returns { type: 'success', data: { idToken, user, ... } }
          var idToken = signInResult?.data?.idToken || signInResult?.idToken;
          console.log('[Auth] Step 4: idToken:', idToken ? 'yes (length=' + idToken.length + ')' : 'NO');
          if (!idToken) {
            var debugInfo = JSON.stringify(signInResult, null, 2);
            console.error('[Auth] No idToken! Full result:', debugInfo);
            Alert.alert('No ID Token', 'signIn returned:\n' + debugInfo.substring(0, 500));
            throw new Error('Failed to get Google ID token — signIn returned type: ' + (signInResult?.type || 'unknown'));
          }
          
          console.log('[Auth] Step 5: Creating Firebase credential...');
          var credential = GoogleAuthProvider.credential(idToken);
          var userCredential = await signInWithCredential(firebaseAuth, credential);
          firebaseUser = userCredential.user;
          console.log('[Auth] Step 6: Firebase signIn success, uid:', firebaseUser?.uid);
        }
      }

      if (!firebaseUser) throw new Error('Google Sign-In failed');

      // Get Firebase ID token
      var idToken = await firebaseUser.getIdToken();

      // Send to our server for JWT + user creation
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

      await AsyncStorage.setItem(STORAGE_TOKEN, authToken);
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
          await rcLoginUser(userData.uid);
          // Check if user already has an active subscription via RevenueCat
          var isActive = await checkEntitlement();
          if (isActive) {
            var activeSub = await getActiveSubscription();
            var sub = {
              status: 'active',
              plan: activeSub ? activeSub.plan : 'pro',
              expiresAt: activeSub ? activeSub.expiresDate : null,
              willRenew: activeSub ? activeSub.willRenew : true,
            };
            setSubscription(sub);
            userData.subscription = sub;
            await AsyncStorage.setItem(STORAGE_USER, JSON.stringify(userData));
          }
        } catch (rcErr) {
          console.warn('[Auth] RevenueCat login after Google auth failed (non-fatal):', rcErr.message);
        }
      }

      return {
        success: true,
        user: userData,
        isNewUser: result.isNewUser,
      };
    } catch (err) {
      console.error('[Auth] signInWithGoogle error:', err?.code, err?.message, err);
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
      throw err;
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
      console.error('Complete onboarding error:', err);
      throw err;
    }
  }, []);

  // Activate subscription — show custom Paywall
  var activateSubscription = useCallback(async function() {
    return new Promise(function(resolve, reject) {
      setPaywallResolve({ resolve: resolve, reject: reject });
      setPaywallVisible(true);
    });
  }, []);

  // Called when purchase succeeds in PaywallScreen
  var handlePaywallPurchased = useCallback(async function(result) {
    setPaywallVisible(false);
    try {
      var activeSub = await getActiveSubscription();
      var sub = {
        status: 'active',
        plan: activeSub ? activeSub.plan : 'pro',
        expiresAt: activeSub ? activeSub.expiresDate : null,
        willRenew: activeSub ? activeSub.willRenew : true,
        store: activeSub ? activeSub.store : null,
      };
      setSubscription(sub);
      setUser(function(prev) {
        var updated = { ...prev, subscription: sub };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
      if (paywallResolve) {
        if (paywallResolve.resolve) paywallResolve.resolve({ success: true, subscription: sub });
        setPaywallResolve(null);
      }
    } catch (err) {
      if (paywallResolve) {
        if (paywallResolve.resolve) paywallResolve.resolve({ success: true });
        setPaywallResolve(null);
      }
    }
  }, [paywallResolve]);

  // Called when paywall is closed without purchase
  var handlePaywallClose = useCallback(function() {
    setPaywallVisible(false);
    if (paywallResolve) {
      if (paywallResolve.reject) paywallResolve.reject(new Error('Payment cancelled'));
      setPaywallResolve(null);
    }
  }, [paywallResolve]);

  // Cancel subscription — opens RevenueCat Customer Center
  var cancelSubscription = useCallback(async function() {
    try {
      await presentCustomerCenter();
      // After Customer Center closes, refresh subscription status
      var isActive = await checkEntitlement();
      if (!isActive) {
        setSubscription({ status: 'cancelled' });
        setUser(function(prev) {
          var updated = { ...prev, subscription: { status: 'cancelled' } };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      }
      return { success: true };
    } catch (err) {
      throw err;
    }
  }, []);

  var checkSubscription = useCallback(async function() {
    try {
      var isActive = await checkEntitlement();
      var activeSub = isActive ? await getActiveSubscription() : null;
      var sub = isActive ? {
        status: 'active',
        plan: activeSub ? activeSub.plan : 'pro',
        expiresAt: activeSub ? activeSub.expiresDate : null,
        willRenew: activeSub ? activeSub.willRenew : true,
      } : null;
      setSubscription(sub);
      return { success: true, subscription: sub };
    } catch (err) {
      console.warn('Subscription check failed:', err.message);
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

  // Save birth data (once per day limit enforced server-side)
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
        throw new Error(json.errorSi || json.error || 'Birth time can only be updated once per day.');
      }
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update birth data');
      }
      setUser(function(prev) {
        var updated = { ...prev, birthData: birthData, onboardingComplete: true };
        AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error('Save birth data error:', err);
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
      console.error('Update profile error:', err);
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
      // Logout from RevenueCat (resets to anonymous)
      try {
        await rcLogoutUser();
      } catch (rcErr) {
        console.warn('[Auth] RevenueCat logout failed (non-fatal):', rcErr.message);
      }

      // Clear all stored auth data
      await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER, STORAGE_ONBOARDING]);
      
      // Clear the API auth token getter
      setAuthTokenGetter(null);
      
      // Reset all state — order matters: clear token last so isLoggedIn flips
      setSubscription(null);
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Sign out error:', err);
      // Force clear state even if AsyncStorage fails
      setAuthTokenGetter(null);
      setSubscription(null);
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
    isSubscribed: subscription?.status === 'active',
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
      return new Promise(function(resolve, reject) {
        setPaywallSource(source || 'onboarding');
        setPaywallResolve({ resolve: resolve, reject: reject });
        setPaywallVisible(true);
      });
    },
    saveBirthData: saveBirthData,
    updateProfile: updateProfile,
    signOut: signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <PaywallScreen
        visible={paywallVisible}
        source={paywallSource}
        onClose={handlePaywallClose}
        onPurchased={handlePaywallPurchased}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
