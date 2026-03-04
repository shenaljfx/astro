import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getBaseUrl() {
  if (!__DEV__) return 'https://api.nakath.ai';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://' + window.location.hostname + ':3000';
  }
  var host = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost || Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (host) return 'http://' + host.split(':')[0] + ':3000';
  return 'http://localhost:3000';
}

var BASE = getBaseUrl();

async function request(path, opts) {
  if (!opts) opts = {};
  var url = BASE + path;
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 12000);
  try {
    var res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
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

export var checkPorondam = function(brideBirth, groomBirth) {
  return request('/api/porondam/check', {
    method: 'POST',
    body: JSON.stringify({ bride: { birthDate: brideBirth }, groom: { birthDate: groomBirth } }),
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

export default { getDailyNakath: getDailyNakath, getDailyHoroscope: getDailyHoroscope, getBirthChart: getBirthChart, getBirthChartData: getBirthChartData, checkPorondam: checkPorondam, askAstrologer: askAstrologer, createVibeLink: createVibeLink };