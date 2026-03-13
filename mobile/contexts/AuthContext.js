/**
 * AuthContext — Phone OTP Authentication Provider
 * 
 * Flow:
 * 1. User enters phone number → sendOtp()
 * 2. User enters OTP code → verifyAndLogin() → receives JWT + user profile
 * 3. JWT stored in AsyncStorage for persistent login
 * 4. Onboarding: name + birth data (skippable)
 * 5. Subscription: LKR 8/day charged from mobile credit
 * 
 * Provides:
 * - user, token, loading, isLoggedIn, subscription
 * - sendOtp(phone), verifyAndLogin(phone, otp, referenceNo)
 * - completeOnboarding(name, birthData)
 * - activateSubscription(), cancelSubscription(), renewSubscription()
 * - saveBirthData(birthData), updateProfile(data), signOut()
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthTokenGetter } from '../services/api';
import {
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
  completeOnboarding as apiCompleteOnboarding,
  subscribe as apiSubscribe,
  unsubscribe as apiUnsubscribe,
  getSubscriptionStatus as apiGetSubscriptionStatus,
  renewSubscription as apiRenewSubscription,
} from '../services/api';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

var AuthContext = createContext(null);

var STORAGE_TOKEN = 'nakath_auth_token';
var STORAGE_USER = 'nakath_user_profile';
var STORAGE_ONBOARDING = 'nakath_onboarding_done';

function getBaseUrl() {
  if (!__DEV__) return 'https://api.nakath.ai';
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

  // Send OTP to phone number
  var sendOtp = useCallback(async function(phone) {
    try {
      var result = await apiSendOtp(phone);
      if (result.success) {
        return {
          success: true,
          referenceNo: result.referenceNo,
          phone: phone, // Return original phone, NOT the masked version from server
          maskedPhone: result.phone, // Masked version for display only
          _devOtp: result._devOtp,
          mock: result.mock,
        };
      }
      throw new Error(result.error || 'Failed to send OTP');
    } catch (err) {
      throw err;
    }
  }, []);

  // Verify OTP and login/register
  var verifyAndLogin = useCallback(async function(phone, otp, referenceNo) {
    try {
      // NOTE: Do NOT set global loading here, as it unmounts the UI components
      // setLoading(true); 
      var result = await apiVerifyOtp(phone, otp, referenceNo);

      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
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
      throw err;
    } finally {
      // setLoading(false);
    }
  }, []);

  // Complete onboarding with name and birth data
  var completeOnboarding = useCallback(async function(displayName, birthData) {
    try {
      await apiCompleteOnboarding({ displayName: displayName, birthData: birthData });

      setUser(function(prev) {
        var updated = {
          ...prev,
          displayName: displayName || prev?.displayName,
          birthData: birthData || prev?.birthData,
          onboardingComplete: true,
        };
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

  // Activate daily subscription (LKR 8/day)
  var activateSubscription = useCallback(async function() {
    try {
      var result = await apiSubscribe();
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

  var cancelSubscription = useCallback(async function() {
    try {
      var result = await apiUnsubscribe();
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

  var renewSub = useCallback(async function() {
    try {
      var result = await apiRenewSubscription();
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

  // Save birth data
  var saveBirthData = useCallback(async function(birthData) {
    if (!token) return;
    try {
      await fetch(getBaseUrl() + '/api/user/birth-data', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(birthData),
      });
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
    sendOtp: sendOtp,
    verifyAndLogin: verifyAndLogin,
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
