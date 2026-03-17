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
  var retries = opts._retries || 0;
  delete opts._timeout;
  delete opts._retries;
  var url = BASE + path;
  var method = opts.method || 'GET';
  var startMs = Date.now();
  console.log('[API] ▶ ' + method + ' ' + url + (retries > 0 ? ' (retry ' + retries + ')' : '') + ' timeout=' + timeout + 'ms');
  var controller = new AbortController();
  var timer = setTimeout(function() {
    console.log('[API] ⏰ TIMEOUT after ' + timeout + 'ms: ' + url);
    controller.abort('Request timeout');
  }, timeout);

  // Build headers
  var headers = { 'Content-Type': 'application/json' };
  
  // Attach auth token if available
  var hasToken = false;
  if (_getToken) {
    try {
      var token = await _getToken();
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
        hasToken = true;
      }
    } catch (e) {
      console.log('[API] ⚠ Token getter failed:', e.message);
    }
  }
  console.log('[API]   auth=' + (hasToken ? 'yes' : 'no') + ' body=' + (opts.body ? opts.body.length + 'b' : 'none'));

  try {
    var res = await fetch(url, {
      headers: headers,
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(timer);
    var elapsed = Date.now() - startMs;
    console.log('[API] ◀ ' + res.status + ' ' + url + ' (' + elapsed + 'ms)');
    var text = await res.text();
    var json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      console.error('[API] ✖ JSON parse failed for ' + url + ':', text.substring(0, 200));
      throw new Error('Invalid server response (not JSON)');
    }
    if (!res.ok) {
      console.error('[API] ✖ HTTP ' + res.status + ' ' + url + ':', json.error || text.substring(0, 200));
      throw new Error(json.error || 'HTTP ' + res.status);
    }
    console.log('[API] ✔ success=' + json.success + ' hasData=' + !!(json.data));
    return json;
  } catch (err) {
    clearTimeout(timer);
    var elapsed2 = Date.now() - startMs;
    // Detect abort (timeout or manual cancel)
    if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) {
      console.log('[API] ✖ ABORT ' + url + ' after ' + elapsed2 + 'ms: ' + (err.message || 'no reason'));
      var abortErr = new Error('Request timeout — server took too long (' + elapsed2 + 'ms)');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    // Network errors (e.g. "Network request failed") — retry once
    if (retries < 1 && err && err.message && (err.message.indexOf('Network') !== -1 || err.message.indexOf('network') !== -1 || err.message.indexOf('Failed to fetch') !== -1)) {
      console.log('[API] ✖ NETWORK ERROR ' + url + ' after ' + elapsed2 + 'ms: ' + err.message + ' — retrying in 2s...');
      await new Promise(function(r) { setTimeout(r, 2000); });
      return request(path, { ...opts, _timeout: timeout, _retries: retries + 1 });
    }
    console.error('[API] ✖ ERROR ' + url + ' after ' + elapsed2 + 'ms:', err.name, err.message);
    throw err;
  }
}

export var getDailyNakath = function(date) {
  return request('/api/nakath/daily?date=' + date);
};

export var getDailyHoroscope = function(sign) {
  return request('/api/horoscope/daily/' + sign);
};

export var getBirthChartData = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/birth-chart/data?date=' + encodeURIComponent(birthDate) + '&lat=' + lat + '&lng=' + lng + '&language=' + (language || 'en'));
};

export var getBirthChartBasic = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/birth-chart/data?date=' + encodeURIComponent(birthDate) + '&lat=' + lat + '&lng=' + lng + '&language=' + (language || 'en') + '&basic=true');
};

export var getBirthChart = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/birth-chart', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
    _timeout: 35000, // Increased timeout to 35s for slow responses
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
    body: JSON.stringify({
      message: message,
      language: options.language || 'en',
      chatHistory: options.chatHistory || [],
      birthDate: options.birthDate || null,
      birthLat: options.birthLat || null,
      birthLng: options.birthLng || null,
    }),
    _timeout: 30000,
  });
};

export var createVibeLink = function(name, birthDate) {
  return request('/api/porondam/vibe-link', {
    method: 'POST',
    body: JSON.stringify({ senderName: name, senderBirthDate: birthDate }),
  });
};

export var getFullReport = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/full-report', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
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

export var getMyHoroscopeReports = function() {
  return request('/api/horoscope/my-reports');
};

export var getSavedReport = function(reportId) {
  return request('/api/horoscope/saved-report/' + reportId);
};

export var deleteSavedReport = function(reportId) {
  return request('/api/horoscope/saved-report/' + reportId, { method: 'DELETE' });
};

export var getUserChats = function(limit) {
  return request('/api/user/chats?limit=' + (limit || 10));
};

export var getUserPorondamHistory = function(limit) {
  return request('/api/user/porondam?limit=' + (limit || 10));
};

export var deletePorondamRecord = function(recordId) {
  return request('/api/porondam/history/' + recordId, { method: 'DELETE' });
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

// ─── Predictions API — Transit, Timing, Muhurtha, Health ────────

export var getCurrentTransits = function(birthDate, birthTime, lat, lng, transitDate) {
  return request('/api/predictions/transit/current', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, transitDate: transitDate || null }),
    _timeout: 15000,
  });
};

export var getDailyTransitForecast = function(birthDate, birthTime, lat, lng, forecastDate) {
  return request('/api/predictions/transit/daily', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, forecastDate: forecastDate || null }),
    _timeout: 15000,
  });
};

export var getWeeklyTransitForecast = function(birthDate, birthTime, lat, lng, weekStart) {
  return request('/api/predictions/transit/weekly', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, weekStart: weekStart || null }),
    _timeout: 20000,
  });
};

export var getMonthlyTransitForecast = function(birthDate, birthTime, lat, lng, month, year) {
  return request('/api/predictions/transit/monthly', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, month: month || null, year: year || null }),
    _timeout: 25000,
  });
};

export var getYearlyTransitForecast = function(birthDate, birthTime, lat, lng, year) {
  return request('/api/predictions/transit/yearly', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, year: year || null }),
    _timeout: 30000,
  });
};

export var getRetrogradePeriods = function(year) {
  return request('/api/predictions/transit/retrogrades?year=' + (year || new Date().getFullYear()));
};

export var predictEventTiming = function(birthDate, birthTime, lat, lng, eventType) {
  return request('/api/predictions/timing/event', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612, eventType: eventType }),
    _timeout: 15000,
  });
};

export var predictAllEventTiming = function(birthDate, birthTime, lat, lng) {
  return request('/api/predictions/timing/all', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 25000,
  });
};

export var scoreMuhurtha = function(datetime, activity, lat, lng, birthDate, birthTime) {
  return request('/api/predictions/muhurtha/score', {
    method: 'POST',
    body: JSON.stringify({ datetime: datetime, activity: activity, lat: lat || 6.9271, lng: lng || 79.8612, birthDate: birthDate || null, birthTime: birthTime || null }),
    _timeout: 15000,
  });
};

export var findBestMuhurtha = function(activity, startDate, endDate, lat, lng, birthDate, birthTime) {
  return request('/api/predictions/muhurtha/find', {
    method: 'POST',
    body: JSON.stringify({ activity: activity, startDate: startDate, endDate: endDate, lat: lat || 6.9271, lng: lng || 79.8612, birthDate: birthDate || null, birthTime: birthTime || null }),
    _timeout: 30000,
  });
};

export var getInauspiciousPeriods = function(date, lat, lng) {
  return request('/api/predictions/muhurtha/inauspicious', {
    method: 'POST',
    body: JSON.stringify({ date: date, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 10000,
  });
};

export var isGoodTimeNow = function(lat, lng) {
  return request('/api/predictions/muhurtha/now?lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612));
};

export var getMuhurthaActivities = function() {
  return request('/api/predictions/muhurtha/activities');
};

export var analyzeHealth = function(birthDate, birthTime, lat, lng) {
  return request('/api/predictions/health/analyze', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 20000,
  });
};

// ─── Token / Micro-transaction API ──────────────────────────────────────────

export var getTokenBalance = function() {
  return request('/api/tokens/balance');
};

export var topUpTokens = function(amount) {
  return request('/api/tokens/topup', {
    method: 'POST',
    body: JSON.stringify({ amount: amount }),
  });
};

export var getTokenHistory = function() {
  return request('/api/tokens/history');
};

// ─── Chat Quota API ──────────────────────────────────────────────────────────

export var getChatQuota = function() {
  return request('/api/chat/quota');
};

export default {
  getDailyNakath: getDailyNakath,
  getDailyHoroscope: getDailyHoroscope,
  getBirthChart: getBirthChart,
  getBirthChartBasic: getBirthChartBasic,
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
  getMyHoroscopeReports: getMyHoroscopeReports,
  getSavedReport: getSavedReport,
  deleteSavedReport: deleteSavedReport,
  getUserChats: getUserChats,
  getUserPorondamHistory: getUserPorondamHistory,
  deletePorondamRecord: deletePorondamRecord,
  sendOtp: sendOtp,
  verifyOtp: verifyOtp,
  completeOnboarding: completeOnboarding,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  getSubscriptionStatus: getSubscriptionStatus,
  renewSubscription: renewSubscription,
  // Predictions — Transit
  getCurrentTransits: getCurrentTransits,
  getDailyTransitForecast: getDailyTransitForecast,
  getWeeklyTransitForecast: getWeeklyTransitForecast,
  getMonthlyTransitForecast: getMonthlyTransitForecast,
  getYearlyTransitForecast: getYearlyTransitForecast,
  getRetrogradePeriods: getRetrogradePeriods,
  // Predictions — Event Timing
  predictEventTiming: predictEventTiming,
  predictAllEventTiming: predictAllEventTiming,
  // Predictions — Muhurtha
  scoreMuhurtha: scoreMuhurtha,
  findBestMuhurtha: findBestMuhurtha,
  getInauspiciousPeriods: getInauspiciousPeriods,
  isGoodTimeNow: isGoodTimeNow,
  getMuhurthaActivities: getMuhurthaActivities,
  // Predictions — Health
  analyzeHealth: analyzeHealth,
  // Tokens / Micro-transactions
  getTokenBalance: getTokenBalance,
  topUpTokens: topUpTokens,
  getTokenHistory: getTokenHistory,
  // Chat quota
  getChatQuota: getChatQuota,
};