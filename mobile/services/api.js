import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getBaseUrl() {
  if (!__DEV__) return 'https://api.nakath.ai';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://' + window.location.hostname + ':3000';
  }
  var host = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (host) return 'http://' + host.split(':')[0] + ':3000';
  
  // Fallback for Android Emulator (when host is not detected)
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  
  return 'http://localhost:3000';
}

export var BASE = getBaseUrl();

// Auth token getter — set by AuthContext
var _getToken = null;
export function setAuthTokenGetter(fn) {
  _getToken = fn;
}

async function request(path, opts) {
  if (!opts) opts = {};
  var timeout = opts._timeout || 12000;
  delete opts._timeout;
  var url = BASE + path;
  console.log('[API] Request:', url);
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, timeout);

  // Build headers
  var headers = { 'Content-Type': 'application/json' };
  
  // Attach auth token if available
  if (_getToken) {
    try {
      var token = await _getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
    } catch (e) { /* continue without auth */ }
  }

  try {
    var res = await fetch(url, {
      headers: headers,
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(timer);
    var json = await res.json();
    if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status);
    return json;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export var getDailyNakath = function(date) {
  return request('/api/nakath/daily?date=' + date);
};

export var getDailyHoroscope = function(sign) {
  return request('/api/horoscope/daily/' + sign);
};

export var getBirthChartData = function(birthDate, lat, lng) {
  return request('/api/horoscope/birth-chart/data?date=' + birthDate + '&lat=' + lat + '&lng=' + lng);
};

export var getBirthChart = function(birthDate, lat, lng) {
  return request('/api/horoscope/birth-chart', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
  });
};

export var checkPorondam = function(bride, groom) {
  return request('/api/porondam/check', {
    method: 'POST',
    body: JSON.stringify({ bride: bride, groom: groom }),
  });
};

export var getPorondamReport = function(porondamData, language, brideName, groomName, porondamId) {
  return request('/api/porondam/report', {
    method: 'POST',
    body: JSON.stringify({ porondamData: porondamData, language: language || 'en', brideName: brideName, groomName: groomName, porondamId: porondamId || null }),
    _timeout: 120000,
  });
};

export var askAstrologer = function(message, options) {
  if (!options) options = {};
  return request('/api/chat/ask', {
    method: 'POST',
    body: JSON.stringify({ message: message, language: options.language || 'en', chatHistory: options.chatHistory || [] }),
  });
};

export var createVibeLink = function(name, birthDate) {
  return request('/api/porondam/vibe-link', {
    method: 'POST',
    body: JSON.stringify({ senderName: name, senderBirthDate: birthDate }),
  });
};

export var getFullReport = function(birthDate, lat, lng) {
  return request('/api/horoscope/full-report', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
  });
};

export var getAIReport = function(birthDate, lat, lng, language, birthLocation, userName, userGender) {
  return request('/api/horoscope/full-report-ai', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en', birthLocation: birthLocation || null, userName: userName || null, userGender: userGender || null }),
    _timeout: 120000,
  });
};

// ─── User / Profile API ─────────────────────────────────────────

export var getUserProfile = function() {
  return request('/api/user/profile');
};

export var updateUserProfile = function(data) {
  return request('/api/user/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export var saveBirthData = function(birthData) {
  return request('/api/user/birth-data', {
    method: 'PUT',
    body: JSON.stringify(birthData),
  });
};

export var updatePreferences = function(prefs) {
  return request('/api/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
};

export var getUserReports = function() {
  return request('/api/user/reports');
};

export var getUserChats = function(limit) {
  return request('/api/user/chats?limit=' + (limit || 10));
};

export var getUserPorondamHistory = function(limit) {
  return request('/api/user/porondam?limit=' + (limit || 10));
};

// ─── Phone Auth / OTP API ───────────────────────────────────────

export var sendOtp = function(phone) {
  return request('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: phone }),
  });
};

export var verifyOtp = function(phone, otp, referenceNo) {
  return request('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: phone, otp: otp, referenceNo: referenceNo }),
  });
};

export var completeOnboarding = function(data) {
  return request('/api/auth/onboarding-complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ─── Subscription API ───────────────────────────────────────────

export var subscribe = function() {
  return request('/api/auth/subscribe', { method: 'POST' });
};

export var unsubscribe = function() {
  return request('/api/auth/unsubscribe', { method: 'POST' });
};

export var getSubscriptionStatus = function() {
  return request('/api/auth/subscription');
};

export var renewSubscription = function() {
  return request('/api/auth/renew', { method: 'POST' });
};

export default {
  getDailyNakath: getDailyNakath,
  getDailyHoroscope: getDailyHoroscope,
  getBirthChart: getBirthChart,
  getBirthChartData: getBirthChartData,
  checkPorondam: checkPorondam,
  getPorondamReport: getPorondamReport,
  askAstrologer: askAstrologer,
  createVibeLink: createVibeLink,
  getFullReport: getFullReport,
  getAIReport: getAIReport,
  setAuthTokenGetter: setAuthTokenGetter,
  getUserProfile: getUserProfile,
  updateUserProfile: updateUserProfile,
  saveBirthData: saveBirthData,
  updatePreferences: updatePreferences,
  getUserReports: getUserReports,
  getUserChats: getUserChats,
  getUserPorondamHistory: getUserPorondamHistory,
  sendOtp: sendOtp,
  verifyOtp: verifyOtp,
  completeOnboarding: completeOnboarding,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  getSubscriptionStatus: getSubscriptionStatus,
  renewSubscription: renewSubscription,
};