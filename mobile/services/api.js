import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getBaseUrl() {
  // Allow env override for any environment
  var envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  if (!__DEV__) return 'https://api.grahachara.com';
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

// Country code — set by PricingContext for geo-based pricing
var _detectedCountry = null;
export function setDetectedCountry(code) {
  _detectedCountry = code;
}

var MAX_RETRIES = 3;
var BACKOFF_DELAYS = [2000, 4000, 8000]; // Exponential backoff

function isRetryableError(err, statusCode) {
  if (statusCode && (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504)) return true;
  if (err && err.message) {
    var m = err.message;
    if (m.indexOf('Network') !== -1 || m.indexOf('network') !== -1 || m.indexOf('Failed to fetch') !== -1) return true;
  }
  return false;
}

async function request(path, opts) {
  if (!opts) opts = {};
  var timeout = opts._timeout || 20000;
  var retries = opts._retries || 0;
  var maxRetries = opts._maxRetries !== undefined ? opts._maxRetries : MAX_RETRIES;
  delete opts._timeout;
  delete opts._retries;
  delete opts._maxRetries;
  var url = BASE + path;
  var method = opts.method || 'GET';
  var startMs = Date.now();
  if (__DEV__) console.log('[API] ▶ ' + method + ' ' + url + (retries > 0 ? ' (retry ' + retries + '/' + maxRetries + ')' : '') + ' timeout=' + timeout + 'ms');
  var controller = new AbortController();
  var timer = setTimeout(function() {
    if (__DEV__) console.log('[API] ⏰ TIMEOUT after ' + timeout + 'ms: ' + url);
    controller.abort('Request timeout');
  }, timeout);

  // Build headers
  var headers = { 'Content-Type': 'application/json' };

  // Attach country code for geo-based pricing
  if (_detectedCountry) {
    headers['X-App-Country'] = _detectedCountry;
  }
  
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
      if (__DEV__) console.log('[API] ⚠ Token getter failed:', e.message);
    }
  }
  if (__DEV__) console.log('[API]   auth=' + (hasToken ? 'yes' : 'no') + ' body=' + (opts.body ? opts.body.length + 'b' : 'none'));

  try {
    var res = await fetch(url, {
      headers: headers,
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(timer);
    var elapsed = Date.now() - startMs;
    if (__DEV__) console.log('[API] ◀ ' + res.status + ' ' + url + ' (' + elapsed + 'ms)');

    // Retry on 429/502/503/504 before parsing body
    if (retries < maxRetries && (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504)) {
      var retryAfter = res.headers.get('Retry-After');
      var delay = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 30000) : (BACKOFF_DELAYS[retries] || 8000);
      if (isNaN(delay) || delay < 1000) delay = BACKOFF_DELAYS[retries] || 8000;
      if (__DEV__) console.log('[API] ✖ SERVER ' + res.status + ' ' + url + ' — retrying in ' + delay + 'ms...');
      await new Promise(function(r) { setTimeout(r, delay); });
      return request(path, { ...opts, _timeout: timeout, _retries: retries + 1, _maxRetries: maxRetries });
    }

    var text = await res.text();
    var json;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      if (__DEV__) console.error('[API] ✖ JSON parse failed for ' + url + ':', text.substring(0, 200));
      throw new Error('Invalid server response (not JSON)');
    }
    if (!res.ok) {
      if (__DEV__) console.error('[API] ✖ HTTP ' + res.status + ' ' + url + ':', json.error || text.substring(0, 200));
      var httpErr = new Error(json.message || json.error || 'HTTP ' + res.status);
      httpErr.statusCode = res.status;
      httpErr.code = json.code || null;
      httpErr.details = json.details || null;
      httpErr.retryAfter = json.retryAfter || res.headers.get('Retry-After') || null;
      httpErr.entitlementId = json.entitlementId || null;
      httpErr.canRetry = !!json.canRetry;
      throw httpErr;
    }
    if (__DEV__) console.log('[API] ✔ success=' + json.success + ' hasData=' + !!(json.data));
    return json;
  } catch (err) {
    clearTimeout(timer);
    var elapsed2 = Date.now() - startMs;
    // Detect abort (timeout or manual cancel)
    if (err && (err.name === 'AbortError' || (err.message && err.message.indexOf('abort') !== -1))) {
      if (__DEV__) console.log('[API] ✖ ABORT ' + url + ' after ' + elapsed2 + 'ms: ' + (err.message || 'no reason'));
      var abortErr = new Error('Request timeout — server took too long (' + elapsed2 + 'ms)');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    // Network errors — retry with exponential backoff
    if (retries < maxRetries && isRetryableError(err, err.statusCode)) {
      var delay = BACKOFF_DELAYS[retries] || 8000;
      if (__DEV__) console.log('[API] ✖ RETRYABLE ERROR ' + url + ' after ' + elapsed2 + 'ms: ' + err.message + ' — retrying in ' + delay + 'ms (' + (retries + 1) + '/' + maxRetries + ')...');
      await new Promise(function(r) { setTimeout(r, delay); });
      return request(path, { ...opts, _timeout: timeout, _retries: retries + 1, _maxRetries: maxRetries });
    }
    if (__DEV__) console.error('[API] ✖ ERROR ' + url + ' after ' + elapsed2 + 'ms:', err.name, err.message);
    throw err;
  }
}

// Quick connectivity check — pings server health endpoint
export async function checkServerReachable() {
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 5000);
    var res = await fetch(BASE + '/api/health', { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch (e) {
    return false;
  }
}

export var searchCities = function(query) {
  return request('/api/geocode/search?q=' + encodeURIComponent(query) + '&limit=8', {
    _timeout: 10000,
  });
};

export var getDailyNakath = function(date) {
  return request('/api/nakath/daily?date=' + date);
};

// Next N days at a glance — each day's Rahu Kalaya + best time (Abhijit) +
// sun/moon rise-set. Generic date math, free. Location-aware (birth lat/lng).
export var getMonthAheadNakath = function(days, lat, lng) {
  var q = '/api/nakath/month-ahead?days=' + (days || 30)
    + '&lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612);
  return request(q, { _timeout: 30000 });
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

export var getOnboardingReveal = function(birthDate, lat, lng, name, language) {
  return request('/api/horoscope/onboarding-reveal?date=' + encodeURIComponent(birthDate) + '&lat=' + lat + '&lng=' + lng + '&name=' + encodeURIComponent(name || '') + '&language=' + (language || 'en'));
};

export var getBirthChart = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/birth-chart', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
    _timeout: 35000, // Increased timeout to 35s for slow responses
  });
};

// "What's moving today" — cheap daily transit line for the kendara page.
export var getTransitToday = function(birthDate, lat, lng) {
  return request('/api/horoscope/transit-today?date=' + encodeURIComponent(birthDate) + '&lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612));
};

// ─── Subha Nakath planner (Phase 4) ──────────────────────────────────────────

// Supported activities (wedding, business, travel, education, …) — public list.
export var getMuhurthaActivities = function() {
  return request('/api/predictions/muhurtha/activities');
};

// Free tease: best DAY in the range (no exact time).
export var getNakathPreview = function(activity, startDate, endDate, lat, lng) {
  return request('/api/preview/nakath', {
    method: 'POST',
    body: JSON.stringify({ activity: activity, startDate: startDate, endDate: endDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 30000,
  });
};

// Pro: full time windows, chart-tuned.
export var findMuhurtha = function(activityType, startDate, endDate, birthDate, lat, lng, partnerBirthDate) {
  return request('/api/predictions/muhurtha/find', {
    method: 'POST',
    body: JSON.stringify({ activityType: activityType, startDate: startDate, endDate: endDate, birthDate: birthDate || null, partnerBirthDate: partnerBirthDate || null, lat: lat || 6.9271, lng: lng || 79.8612, maxResults: 5 }),
    _timeout: 40000,
  });
};

// Pro: "when will it happen" life-event timing across all domains.
export var getLifeEventTiming = function(birthDate, birthTime, lat, lng) {
  return request('/api/predictions/timing/all', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 40000,
  });
};

// ─── Baby Kendara Pack (Phase 4) ─────────────────────────────────────────────

// Free tease: lagna + nakshatra + naming-letter count + ganda-moola checked.
export var getBabyPreview = function(birthDate, lat, lng) {
  return request('/api/preview/baby', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 30000,
  });
};

// Pro / one-time: the full baby pack (names, ganda moola result, ceremony dates).
export var composeBabyKendara = function(birthDate, lat, lng, language) {
  return request('/api/baby/compose', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
    _timeout: 40000,
  });
};

// Full Baby Kendara pack (two-phase). Returns the deterministic keepsake in
// data immediately, plus data.narrative = { stage, reportId?, sections? }.
// Poll getReportProgress(reportId) and getSavedReport for the AI life-story.
// gender is MANDATORY (male | female).
export var generateBabyKendara = function(birthDate, lat, lng, language, gender) {
  return request('/api/baby/generate', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en', gender: gender }),
    _timeout: 40000,
  });
};

// Free kendara teaser (chart + hero + one insight + vault counts) for non-subscribers.
export var getKendaraPreview = function(birthDate, lat, lng, language) {
  return request('/api/preview/kendara', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
    _timeout: 20000,
  });
};

// Free basic chart identity (lagna, moon/sun, nakshatra, D1) — same shape as
// getBirthChartBasic so the Home screen renders it unchanged. Fallback for
// non-subscribers whose gated /birth-chart/data call 402s.
export var getBirthChartPreview = function(birthDate, lat, lng) {
  return request('/api/preview/birth-chart', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 20000,
  });
};

// Free daily habit surface (Rahu Kalaya, panchanga, sunrise/sunset, moon) —
// same shape as /nakath/daily so the Home screen renders it unchanged. Used as
// the fallback for non-subscribers, whose gated /nakath/daily call 401/402s.
export var getTodayPreview = function(date, lat, lng) {
  var d = date || new Date().toISOString().split('T')[0];
  return request('/api/preview/today?date=' + encodeURIComponent(d) + '&lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612), {
    _timeout: 20000,
  });
};

// Free porondam tease (archetype + 1 gift + counts, never the score) shown
// before the paywall.
export var getPorondamPreview = function(bride, groom) {
  return request('/api/preview/porondam', {
    method: 'POST',
    body: JSON.stringify({ bride: bride, groom: groom }),
    _timeout: 20000,
  });
};

// Convergence calendar — the 12-month dated-window timeline.
// Full (Pro): months + windows + drivers. Preview (free): intensity strip +
// locked window headers only.
export var getConvergence = function(birthDate, lat, lng) {
  return request('/api/predictions/convergence', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 30000,
  });
};

export var getConvergencePreview = function(birthDate, lat, lng) {
  return request('/api/preview/convergence', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 30000,
  });
};

export var checkPorondam = function(bride, groom) {
  return request('/api/porondam/check', {
    method: 'POST',
    body: JSON.stringify({ bride: bride, groom: groom }),
  });
};

export var getAffirmations = function(birthDate, lat, lng, date) {
  var dateStr = date || new Date().toISOString().split('T')[0];
  return request('/api/manifest/affirmations?birthDate=' + encodeURIComponent(birthDate) + '&lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612) + '&date=' + dateStr, {
    _timeout: 30000,
  });
};

export var getPorondamReport = function(porondamData, language, brideName, groomName, porondamId, entitlementInput) {
  return request('/api/porondam/report', {
    method: 'POST',
    body: JSON.stringify({ porondamData: porondamData, language: language || 'en', brideName: brideName, groomName: groomName, porondamId: porondamId || null, entitlementInput: entitlementInput || null }),
    _timeout: 180000,
    _maxRetries: 0,
  });
};

// Pre-payment gate: asks the server whether the report writer is available
// BEFORE the paywall is shown, so users are never charged into an outage.
export var getPorondamAiHealth = function() {
  return request('/api/porondam/report/health', {
    _timeout: 8000,
    _maxRetries: 0,
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

export var createVibeLink = function(name, birthDate, lat, lng) {
  return request('/api/porondam/vibe-link', {
    method: 'POST',
    body: JSON.stringify({ senderName: name, senderBirthDate: birthDate, senderLat: lat, senderLng: lng }),
    _timeout: 15000,
  });
};

export var getFullReport = function(birthDate, lat, lng, language) {
  return request('/api/horoscope/full-report', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en' }),
    _timeout: 600000,
  });
};

export var getAIReport = function(birthDate, lat, lng, language, birthLocation, userName, userGender, userReligion, reportId, options) {
  if (!options) options = {};
  return request('/api/horoscope/full-report-ai', {
    method: 'POST',
    body: JSON.stringify({
      birthDate: birthDate, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'en',
      birthLocation: birthLocation || null, userName: userName || null, userGender: userGender || null,
      userReligion: userReligion || null, reportId: reportId || null,
      previousReportId: options.previousReportId || null, retryReportId: options.retryReportId || null,
      recoveryRetry: !!options.recoveryRetry, timeUnknown: !!options.timeUnknown,
      // Known Facts intake — unlocks server-side validation mode + birth-time
      // rectification. All optional; omitted when the user skips the sheet.
      maritalStatus: options.maritalStatus || null,
      marriageYear: options.marriageYear || null,
      careerField: options.careerField || null,
      lifeEvents: Array.isArray(options.lifeEvents) && options.lifeEvents.length > 0 ? options.lifeEvents : null,
    }),
    _timeout: 600000,
    _maxRetries: 0,
  });
};

// ─── Prediction ledger (Phase 3) ────────────────────────────────
export var getPredictionCheckins = function() {
  return request('/api/horoscope/prediction-checkins', { method: 'GET', _timeout: 10000 });
};

export var sendPredictionOutcome = function(reportId, predictionId, outcome, prediction) {
  return request('/api/horoscope/prediction-outcome', {
    method: 'POST',
    body: JSON.stringify({ reportId: reportId, predictionId: predictionId, outcome: outcome, prediction: prediction || null }),
    _timeout: 10000,
  });
};

export var getReportProgress = function(reportId) {
  return request('/api/horoscope/report-progress/' + reportId, {
    method: 'GET',
    _timeout: 10000,
  });
};

// ─── Full AI Reading (Gemini 3.1 Pro + Search Grounding) ─────────

export var getFullReading = function(dateTime, lat, lng, language) {
  return request('/api/reading/full', {
    method: 'POST',
    body: JSON.stringify({ dateTime: dateTime, lat: lat || 6.9271, lng: lng || 79.8612, language: language || 'si' }),
    _timeout: 600000,
  });
};

// ─── User / Profile API ─────────────────────────────────────────

export var getUserProfile = function() {
  return request('/api/user/profile');
};

export var updateUserProfile = function(data) {
  // PATCH only writes the fields provided (displayName / photoURL) — it never
  // clobbers birthData or location the way the POST upsert does.
  return request('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// Upload a base64-encoded avatar. `mime` must be image/jpeg, image/png or image/webp.
export var uploadAvatar = function(base64, mime) {
  return request('/api/user/avatar', {
    method: 'POST',
    body: JSON.stringify({ image: base64, mime: mime || 'image/jpeg' }),
    _timeout: 30000,
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

export var getMyPorondamHistory = function(limit) {
  return request('/api/porondam/my-history?limit=' + (limit || 10));
};

export var getSavedPorondam = function(porondamId) {
  return request('/api/porondam/saved/' + porondamId);
};

export var deletePorondamRecord = function(recordId) {
  return request('/api/porondam/history/' + recordId, { method: 'DELETE' });
};

// ─── Google Auth API ────────────────────────────────────────────

export var googleAuth = function(idToken, profile) {
  return request('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: idToken, profile: profile || {} }),
    _timeout: 30000,
  });
};

export var completeOnboarding = function(data) {
  return request('/api/auth/onboarding-complete', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ─── Subscription API ───────────────────────────────────────────

export var unsubscribe = function() {
  return request('/api/auth/unsubscribe', { method: 'POST' });
};

export var getSubscriptionStatus = function() {
  return request('/api/auth/subscription');
};

// ─── Pricing API ────────────────────────────────────────────────

export var getPricing = function(countryCode) {
  var query = countryCode ? '?currency=' + (countryCode === 'LK' ? 'LKR' : 'USD') : '';
  return request('/api/pricing' + query);
};

export var getLiveCostStats = function() {
  return request('/api/pricing/live-stats');
};

// ─── Weekly Lagna Palapala ──────────────────────────────────────

export var getWeeklyLagna = function() {
  return request('/api/weekly-lagna');
};

export var getWeeklyLagnaById = function(lagnaId) {
  return request('/api/weekly-lagna/' + lagnaId);
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

export var analyzeHealth = function(birthDate, birthTime, lat, lng) {
  return request('/api/predictions/health/analyze', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, birthTime: birthTime || null, lat: lat || 6.9271, lng: lng || 79.8612 }),
    _timeout: 20000,
  });
};

// ─── Entitlements (retry failed generations without re-payment) ─────────────

export var checkEntitlement = function(type, inputData) {
  return request('/api/entitlements/check', {
    method: 'POST',
    body: JSON.stringify({ type: type, inputData: inputData }),
  });
};

export var getEntitlements = function(type) {
  return request('/api/entitlements' + (type ? '?type=' + type : ''));
};

// ─── Chat Quota API ──────────────────────────────────────────────────────────

export var getChatQuota = function() {
  return request('/api/chat/quota');
};

// ─── Analytics (best-effort, never throws) ───────────────────────────────────

// Records a paywall funnel event (shown | purchased | dismissed). Fire-and-
// forget: swallows all errors so analytics never affects the user flow.
export var logPaywallEvent = function(event, meta) {
  try {
    return request('/api/analytics/paywall', {
      method: 'POST',
      body: JSON.stringify({
        event: event,
        source: meta && meta.source,
        plan: meta && meta.plan,
        currency: meta && meta.currency,
      }),
      _timeout: 8000,
    }).catch(function() {});
  } catch (e) {
    return Promise.resolve();
  }
};

// ─── Notification API ────────────────────────────────────────────────────────

export var registerPushToken = function(pushToken, platform) {
  return request('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ pushToken: pushToken, platform: platform || 'unknown' }),
  });
};

export var unregisterPushToken = function() {
  return request('/api/notifications/unregister', { method: 'POST' });
};

export var getNotificationHistory = function(limit) {
  return request('/api/notifications/history?limit=' + (limit || 30));
};

export var markNotificationsRead = function(notificationIds) {
  return request('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ notificationIds: notificationIds }),
  });
};

export var getUnreadNotificationCount = function() {
  return request('/api/notifications/unread-count');
};

export var updateNotificationPreferences = function(prefs) {
  return request('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
};

export var getMarakaApala = function(years) {
  return request('/api/notifications/maraka-apala?years=' + (years || 3));
};

export var getMarakaApalaFull = function(birthDate, lat, lng, yearsAhead) {
  return request('/api/notifications/maraka-apala/full', {
    method: 'POST',
    body: JSON.stringify({ birthDate: birthDate, lat: lat, lng: lng, yearsAhead: yearsAhead || 5 }),
    _timeout: 30000,
  });
};

export var getTodayDashboard = function(lat, lng) {
  return request('/api/notifications/today?lat=' + (lat || 6.9271) + '&lng=' + (lng || 79.8612));
};

export var sendTestNotification = function() {
  return request('/api/notifications/test', { method: 'POST' });
};

export var sendTestDailyNotification = function() {
  return request('/api/notifications/test-daily', { method: 'POST' });
};

// ─── Enhanced Prediction APIs (Tier 3-5) ──────────────────────────────────

export var getEnhancedTransits = function(data) {
  return request('/api/predictions/transit/enhanced', { method: 'POST', body: JSON.stringify(data) });
};

export var kpPredictEvent = function(data) {
  return request('/api/predictions/kp/predict', { method: 'POST', body: JSON.stringify(data) });
};

export var kpPredictAll = function(data) {
  return request('/api/predictions/kp/all', { method: 'POST', body: JSON.stringify(data) });
};

export var kpChartAnalysis = function(data) {
  return request('/api/predictions/kp/chart', { method: 'POST', body: JSON.stringify(data) });
};

export var getAnnualForecast = function(data) {
  return request('/api/predictions/annual', { method: 'POST', body: JSON.stringify(data) });
};

export var getConfidence = function(data) {
  return request('/api/predictions/confidence', { method: 'POST', body: JSON.stringify(data) });
};

export var getAllConfidences = function(data) {
  return request('/api/predictions/confidence/all', { method: 'POST', body: JSON.stringify(data) });
};

export var recordFeedback = function(data) {
  return request('/api/predictions/feedback/record', { method: 'POST', body: JSON.stringify(data) });
};

export var getPendingFeedback = function() {
  return request('/api/predictions/feedback/pending');
};

// ═══════════════════════════════════════════════════════════════════════════
//  ENHANCED ANALYSIS — MIT Libraries (celestine + astrology-insights)
// ═══════════════════════════════════════════════════════════════════════════

export var getEnhancedReport = function(data) {
  return request('/api/enhanced/report', { method: 'POST', body: JSON.stringify(data), _timeout: 20000 });
};

export var getGandantaDosha = function(data) {
  return request('/api/enhanced/gandanta', { method: 'POST', body: JSON.stringify(data) });
};

export var getGandaMoolaDosha = function(data) {
  return request('/api/enhanced/ganda-moola', { method: 'POST', body: JSON.stringify(data) });
};

export var getTattvaBalance = function(data) {
  return request('/api/enhanced/tattva', { method: 'POST', body: JSON.stringify(data) });
};

export var getPlanetaryFriendships = function(data) {
  return request('/api/enhanced/friendships', { method: 'POST', body: JSON.stringify(data) });
};

export var getRemedies = function(data) {
  return request('/api/enhanced/remedies', { method: 'POST', body: JSON.stringify(data) });
};

export var getBabyNames = function(data) {
  return request('/api/enhanced/baby-names', { method: 'POST', body: JSON.stringify(data) });
};

export var getShodashvarga = function(data) {
  return request('/api/enhanced/shodashvarga', { method: 'POST', body: JSON.stringify(data) });
};

export var getDivisionalChart = function(data) {
  return request('/api/enhanced/divisional', { method: 'POST', body: JSON.stringify(data) });
};

export var getProgressions = function(data) {
  return request('/api/enhanced/progressions', { method: 'POST', body: JSON.stringify(data), _timeout: 15000 });
};

export var getSolarArc = function(data) {
  return request('/api/enhanced/solar-arc', { method: 'POST', body: JSON.stringify(data), _timeout: 15000 });
};

export var getAspectPatterns = function(data) {
  return request('/api/enhanced/patterns', { method: 'POST', body: JSON.stringify(data), _timeout: 15000 });
};

export var getRetrogradePeriods2 = function(data) {
  return request('/api/enhanced/retrogrades', { method: 'POST', body: JSON.stringify(data) });
};

export var getChoghadiya = function(params) {
  var qs = new URLSearchParams(params).toString();
  return request('/api/enhanced/choghadiya?' + qs);
};

export var getGulikaKalam = function(params) {
  var qs = new URLSearchParams(params).toString();
  return request('/api/enhanced/gulika?' + qs);
};

export var getCrossValidatedShadbala = function(data) {
  return request('/api/enhanced/cross-validate', { method: 'POST', body: JSON.stringify(data) });
};

// ═══════════════════════════════════════════════════════════════
// JYOTISH API (@prisri/jyotish — ISC license, independent Vedic engine)
// ═══════════════════════════════════════════════════════════════

export var getJyotishKundli = function(data) {
  return request('/api/jyotish/kundli', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishChalit = function(data) {
  return request('/api/jyotish/chalit', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishVarga = function(division, data) {
  return request('/api/jyotish/varga/' + division, { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishDasha = function(data) {
  return request('/api/jyotish/dasha', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishMangalDosha = function(data) {
  return request('/api/jyotish/mangal-dosha', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishSadeSati = function(data) {
  return request('/api/jyotish/sade-sati', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishTaraBalam = function(data) {
  return request('/api/jyotish/tara-balam', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishChandrashtama = function(data) {
  return request('/api/jyotish/chandrashtama', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishDishaShoola = function(params) {
  var qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request('/api/jyotish/disha-shoola' + qs);
};

export var getJyotishToday = function(params) {
  var qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request('/api/jyotish/today' + qs);
};

export var getJyotishPersonalized = function(data) {
  return request('/api/jyotish/personalized', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishMatch = function(data) {
  return request('/api/jyotish/match', { method: 'POST', body: JSON.stringify(data) });
};

export var getJyotishPanchanga = function(params) {
  var qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request('/api/jyotish/panchanga' + qs);
};

export var getJyotishSpecialYogas = function() {
  return request('/api/jyotish/special-yogas');
};

export default {
  getDailyNakath: getDailyNakath,
  getMonthAheadNakath: getMonthAheadNakath,
  getDailyHoroscope: getDailyHoroscope,
  getBirthChart: getBirthChart,
  getTransitToday: getTransitToday,
  getKendaraPreview: getKendaraPreview,
  getBirthChartPreview: getBirthChartPreview,
  getTodayPreview: getTodayPreview,
  getPorondamPreview: getPorondamPreview,
  getConvergence: getConvergence,
  getConvergencePreview: getConvergencePreview,
  getNakathPreview: getNakathPreview,
  findMuhurtha: findMuhurtha,
  getLifeEventTiming: getLifeEventTiming,
  getBabyPreview: getBabyPreview,
  composeBabyKendara: composeBabyKendara,
  generateBabyKendara: generateBabyKendara,
  getBirthChartBasic: getBirthChartBasic,
  getBirthChartData: getBirthChartData,
  checkPorondam: checkPorondam,
  getPorondamReport: getPorondamReport,
  getPorondamAiHealth: getPorondamAiHealth,
  askAstrologer: askAstrologer,
  createVibeLink: createVibeLink,
  getFullReport: getFullReport,
  getAIReport: getAIReport,
  getReportProgress: getReportProgress,
  getPredictionCheckins: getPredictionCheckins,
  sendPredictionOutcome: sendPredictionOutcome,
  getFullReading: getFullReading,
  setAuthTokenGetter: setAuthTokenGetter,
  setDetectedCountry: setDetectedCountry,
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
  getMyPorondamHistory: getMyPorondamHistory,
  getSavedPorondam: getSavedPorondam,
  deletePorondamRecord: deletePorondamRecord,
  googleAuth: googleAuth,
  completeOnboarding: completeOnboarding,
  unsubscribe: unsubscribe,
  getSubscriptionStatus: getSubscriptionStatus,
  // Pricing
  getPricing: getPricing,
  // Predictions — Transit
  getCurrentTransits: getCurrentTransits,
  getEnhancedTransits: getEnhancedTransits,
  getDailyTransitForecast: getDailyTransitForecast,
  getWeeklyTransitForecast: getWeeklyTransitForecast,
  getMonthlyTransitForecast: getMonthlyTransitForecast,
  getYearlyTransitForecast: getYearlyTransitForecast,
  getRetrogradePeriods: getRetrogradePeriods,
  // Predictions — Event Timing
  predictEventTiming: predictEventTiming,
  predictAllEventTiming: predictAllEventTiming,
  // Predictions — KP System
  kpPredictEvent: kpPredictEvent,
  kpPredictAll: kpPredictAll,
  kpChartAnalysis: kpChartAnalysis,
  // Predictions — Annual Forecast
  getAnnualForecast: getAnnualForecast,
  // Predictions — Confidence
  getConfidence: getConfidence,
  getAllConfidences: getAllConfidences,
  // Predictions — Muhurtha
  scoreMuhurtha: scoreMuhurtha,
  findBestMuhurtha: findBestMuhurtha,
  getInauspiciousPeriods: getInauspiciousPeriods,
  isGoodTimeNow: isGoodTimeNow,
  getMuhurthaActivities: getMuhurthaActivities,
  // Predictions — Health
  analyzeHealth: analyzeHealth,
  // Predictions — Feedback
  recordFeedback: recordFeedback,
  getPendingFeedback: getPendingFeedback,
  // Entitlements (retry failed generations)
  checkEntitlement: checkEntitlement,
  getEntitlements: getEntitlements,
  // Analytics
  logPaywallEvent: logPaywallEvent,
  // Chat quota
  getChatQuota: getChatQuota,
  // Notifications
  registerPushToken: registerPushToken,
  unregisterPushToken: unregisterPushToken,
  getNotificationHistory: getNotificationHistory,
  markNotificationsRead: markNotificationsRead,
  getUnreadNotificationCount: getUnreadNotificationCount,
  updateNotificationPreferences: updateNotificationPreferences,
  getMarakaApala: getMarakaApala,
  getMarakaApalaFull: getMarakaApalaFull,
  getTodayDashboard: getTodayDashboard,
  sendTestNotification: sendTestNotification,
  sendTestDailyNotification: sendTestDailyNotification,
  // Weekly Lagna Palapala
  getWeeklyLagna: getWeeklyLagna,
  getWeeklyLagnaById: getWeeklyLagnaById,
  // Live Cost Stats
  getLiveCostStats: getLiveCostStats,
  // Enhanced Analysis (MIT libraries)
  getEnhancedReport: getEnhancedReport,
  getGandantaDosha: getGandantaDosha,
  getGandaMoolaDosha: getGandaMoolaDosha,
  getTattvaBalance: getTattvaBalance,
  getPlanetaryFriendships: getPlanetaryFriendships,
  getRemedies: getRemedies,
  getBabyNames: getBabyNames,
  getShodashvarga: getShodashvarga,
  getDivisionalChart: getDivisionalChart,
  getProgressions: getProgressions,
  getSolarArc: getSolarArc,
  getAspectPatterns: getAspectPatterns,
  getRetrogradePeriods2: getRetrogradePeriods2,
  getChoghadiya: getChoghadiya,
  getGulikaKalam: getGulikaKalam,
  getCrossValidatedShadbala: getCrossValidatedShadbala,
  // Jyotish API (@prisri/jyotish — ISC)
  getJyotishKundli: getJyotishKundli,
  getJyotishChalit: getJyotishChalit,
  getJyotishVarga: getJyotishVarga,
  getJyotishDasha: getJyotishDasha,
  getJyotishMangalDosha: getJyotishMangalDosha,
  getJyotishSadeSati: getJyotishSadeSati,
  getJyotishTaraBalam: getJyotishTaraBalam,
  getJyotishChandrashtama: getJyotishChandrashtama,
  getJyotishDishaShoola: getJyotishDishaShoola,
  getJyotishToday: getJyotishToday,
  getJyotishPersonalized: getJyotishPersonalized,
  getJyotishMatch: getJyotishMatch,
  getJyotishPanchanga: getJyotishPanchanga,
  getJyotishSpecialYogas: getJyotishSpecialYogas,
  // Manifestation / Law of Attraction
  getAffirmations: getAffirmations,
};