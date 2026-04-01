/**
 * AuthContext — Google Sign-In Authentication Provider
 * 
 * Flow:
 * 1. User taps "Sign in with Google" → Firebase Auth → ID token
 * 2. ID token sent to server → server verifies with Firebase Admin → JWT returned
 * 3. JWT stored in AsyncStorage for persistent login
 * 4. Onboarding: Subscription → PayHere card payment (LKR 240/month)
 * 5. Onboarding: name + birth data (skippable)
 * 
 * Provides:
 * - user, token, loading, isLoggedIn, subscription
 * - signInWithGoogle() — opens Google Sign-In flow
 * - completeOnboarding(name, birthData)
 * - activateSubscription() — opens PayHere SDK for card/bank payment
 * - cancelSubscription()
 * - saveBirthData(birthData), updateProfile(data), signOut()
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthTokenGetter } from '../services/api';
import {
  googleAuth as apiGoogleAuth,
  completeOnboarding as apiCompleteOnboarding,
  unsubscribe as apiUnsubscribe,
  getSubscriptionStatus as apiGetSubscriptionStatus,
  initiateSubscription as apiInitiateSubscription,
  confirmPayment as apiConfirmPayment,
  cancelPayHereSubscription as apiCancelPayHere,
} from '../services/api';
import { auth as firebaseAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from '../services/firebase';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

var AuthContext = createContext(null);

var STORAGE_TOKEN = 'grahachara_auth_token';
var STORAGE_USER = 'grahachara_user_profile';
var STORAGE_ONBOARDING = 'grahachara_onboarding_done';

function getBaseUrl() {
  if (!__DEV__) return 'https://api.grahachara.lk';
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

  // Initialize: Load saved token on app start
  useEffect(function() {
    loadSavedAuth();
  }, []);

  async function loadSavedAuth() {
    try {
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
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          var signInResult = await GoogleSignin.signIn();
          var idToken = signInResult.data?.idToken || signInResult.idToken;
          if (!idToken) throw new Error('Failed to get Google ID token');
          var credential = GoogleAuthProvider.credential(idToken);
          var userCredential = await signInWithCredential(firebaseAuth, credential);
          firebaseUser = userCredential.user;
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

      return {
        success: true,
        user: userData,
        isNewUser: result.isNewUser,
      };
    } catch (err) {
      // Don't throw for user cancellation
      if (err && err.code === 'ERR_REQUEST_CANCELED') {
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

  // Activate monthly subscription via PayHere (LKR 240/month)
  var activateSubscription = useCallback(async function() {
    try {
      // Step 1: Get payment object + hash from server
      var initResult = await apiInitiateSubscription({
        firstName: user?.displayName || 'Grahachara',
        phone: user?.phone || '',
      });

      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initiate subscription');
      }

      var paymentObject = initResult.paymentObject;

      // Step 2: Try native SDK first, fall back to web checkout
      var PayHere = null;
      var useWebCheckout = false;
      try {
        PayHere = require('@payhere/payhere-mobilesdk-reactnative').default;
      } catch (e) {
        console.warn('PayHere SDK not available (web mode):', e.message);
        useWebCheckout = true;
      }

      // ─── Web fallback: open PayHere checkout page in new tab ───
      if (useWebCheckout) {
        var checkoutUrl = initResult.checkout_url || 'https://sandbox.payhere.lk/pay/checkout';

        // Build a hidden form and submit it (PayHere requires POST)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
          var form = document.createElement('form');
          form.method = 'POST';
          form.action = checkoutUrl;
          form.target = '_blank';

          var fields = paymentObject;
          Object.keys(fields).forEach(function(key) {
            if (fields[key] !== undefined && fields[key] !== null) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = key;
              input.value = String(fields[key]);
              form.appendChild(input);
            }
          });

          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);

          // Set optimistic subscription — webhook will confirm
          var webSub = { status: 'active', plan: 'monthly', pendingConfirmation: true };
          setSubscription(webSub);
          setUser(function(prev) {
            var updated = { ...prev, subscription: webSub };
            AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
            return updated;
          });
          return { success: true, subscription: webSub, pending: true, webCheckout: true };
        } else {
          throw new Error('Payment not available on this platform');
        }
      }

      // ─── Native SDK path (Android/iOS) ───
      return new Promise(function(resolve, reject) {
        PayHere.startPayment(
          paymentObject,
          async function(paymentId) {
            // Step 3: Payment completed — confirm with server
            console.log('PayHere payment completed:', paymentId);
            try {
              var confirmResult = await apiConfirmPayment(
                paymentId,
                initResult.orderId,
                'subscription'
              );

              if (confirmResult.success) {
                var sub = confirmResult.subscription || { status: 'active', plan: 'monthly' };
                setSubscription(sub);
                setUser(function(prev) {
                  var updated = { ...prev, subscription: sub };
                  AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
                  return updated;
                });
                resolve({ success: true, subscription: sub, paymentId: paymentId });
              } else if (confirmResult.pending) {
                // Webhook hasn't arrived yet — set optimistic active
                var pendingSub = { status: 'active', plan: 'monthly', pendingConfirmation: true };
                setSubscription(pendingSub);
                resolve({ success: true, subscription: pendingSub, pending: true });
              } else {
                reject(new Error('Payment confirmation failed'));
              }
            } catch (confirmErr) {
              console.error('Confirm payment error:', confirmErr);
              // Payment was made but confirmation failed — still set optimistic
              var optimisticSub = { status: 'active', plan: 'monthly', pendingConfirmation: true };
              setSubscription(optimisticSub);
              resolve({ success: true, subscription: optimisticSub, pending: true });
            }
          },
          function(errorData) {
            console.error('PayHere error:', errorData);
            reject(new Error(errorData || 'Payment failed'));
          },
          function() {
            console.log('PayHere dismissed');
            reject(new Error('Payment cancelled'));
          }
        );
      });
    } catch (err) {
      throw err;
    }
  }, [user]);

  var cancelSubscription = useCallback(async function() {
    try {
      var result = await apiCancelPayHere();
      if (result.success) {
        setSubscription({ status: 'cancelled' });
        setUser(function(prev) {
          var updated = { ...prev, subscription: { status: 'cancelled' } };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      }
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

  var checkSubscription = useCallback(async function() {
    try {
      var result = await apiGetSubscriptionStatus();
      if (result.success) {
        setSubscription(result.subscription);
      }
      return result;
    } catch (err) {
      console.warn('Subscription check failed:', err.message);
      return { success: false };
    }
  }, []);

  // PayHere auto-renews monthly — renewSub just refreshes the status
  var renewSub = useCallback(async function() {
    try {
      // With PayHere recurring, there's no manual renewal
      // If expired, user needs to re-subscribe
      var result = await apiGetSubscriptionStatus();
      if (result.success) {
        setSubscription(result.subscription);
        setUser(function(prev) {
          var updated = { ...prev, subscription: result.subscription };
          AsyncStorage.setItem(STORAGE_USER, JSON.stringify(updated));
          return updated;
        });
      }
      return result;
    } catch (err) {
      throw err;
    }
  }, []);

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
    saveBirthData: saveBirthData,
    updateProfile: updateProfile,
    signOut: signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
