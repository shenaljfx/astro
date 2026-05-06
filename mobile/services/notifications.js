/**
 * Mobile Push Notification Service
 * 
 * Handles:
 *   - Expo push notification registration
 *   - Permission requests
 *   - Notification channel setup (Android)
 *   - Foreground notification handling
 *   - Deep-link navigation from notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

var DAILY_GUIDANCE_IDS_KEY = 'grahachara_daily_guidance_notification_ids';
var DAILY_GUIDANCE_LANG_KEY = 'grahachara_daily_guidance_notification_language';
var DAILY_GUIDANCE_PREFS_KEY = '@grahachara_notif_prefs';
var DAILY_GUIDANCE_HOUR = 6;
var DAILY_GUIDANCE_MINUTE = 30;

var DAILY_GUIDANCE_MESSAGES = {
  en: [
    {
      title: 'Daily guidance',
      body: 'Motivation: begin with one clear intention. Do: handle important work early. Do not: rush decisions during tense moments.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: steady effort brings quiet progress. Do: protect your focus. Do not: carry yesterday into today.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: choose patience before pressure. Do: speak clearly. Do not: start conflict over small delays.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: your calm is your strength. Do: finish one pending task. Do not: overpromise your time.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: small discipline changes the day. Do: review plans before acting. Do not: ignore your intuition.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: move with grace, not haste. Do: spend time in reflection. Do not: make emotional purchases.',
    },
    {
      title: 'Daily guidance',
      body: 'Motivation: rest is part of alignment. Do: reconnect with family or faith. Do not: let worry decide for you.',
    },
  ],
  si: [
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: පැහැදිලි අරමුණකින් පටන් ගන්න. කරන්න: වැදගත් වැඩ කලින් කරන්න. නොකරන්න: තීරණ හදිසි කරගන්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: ස්ථිර උත්සාහය නිහඬ ප්‍රගතියක් ගෙන එයි. කරන්න: අවධානය රකින්න. නොකරන්න: ඊයේ බර අදට ගෙන එන්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: පීඩනයට පෙර ඉවසීම තෝරන්න. කරන්න: පැහැදිලිව කතා කරන්න. නොකරන්න: කුඩා ප්‍රමාදයකින් ගැටුම් අරඹන්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: ඔබේ සන්සුන්කම ඔබේ ශක්තියයි. කරන්න: එක ඉතිරි වැඩක් අවසන් කරන්න. නොකරන්න: ඔබේ කාලය අධිකව පොරොන්දු වෙන්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: කුඩා විනය දවස වෙනස් කරයි. කරන්න: ක්‍රියාවට පෙර සැලසුම් බලන්න. නොකරන්න: අභ්‍යන්තර හැඟීම නොසලකා හරින්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: ඉක්මන් නොවී සුරුවමෙන් ඉදිරියට යන්න. කරන්න: සිතීමකට වේලාවක් දෙන්න. නොකරන්න: හැඟීම් මත වියදම් කරන්න එපා.',
    },
    {
      title: 'දෛනික මඟපෙන්වීම',
      body: 'උද්දීපනය: විවේකයත් සන්ධානයේ කොටසකි. කරන්න: පවුල හෝ ආගමික සිතුවිලි සමඟ සම්බන්ධ වෙන්න. නොකරන්න: කනස්සල්ලට තීරණ දෙන්න එපා.',
    },
  ],
};

async function getStoredNotificationLanguage(language) {
  if (language === 'en' || language === 'si') return language;
  try {
    var saved = await AsyncStorage.getItem('appLanguage');
    if (saved === 'en' || saved === 'si') return saved;
  } catch (e) { /* ignore */ }
  return 'si';
}

async function isDailyGuidanceEnabled() {
  try {
    var saved = await AsyncStorage.getItem(DAILY_GUIDANCE_PREFS_KEY);
    if (!saved) return true;
    var prefs = JSON.parse(saved);
    return prefs.dailyPalapa !== false;
  } catch (e) {
    return true;
  }
}

function buildWeeklyTrigger(weekday) {
  var trigger = {
    weekday: weekday,
    hour: DAILY_GUIDANCE_HOUR,
    minute: DAILY_GUIDANCE_MINUTE,
    channelId: 'daily-guidance',
  };

  if (Notifications.SchedulableTriggerInputTypes && Notifications.SchedulableTriggerInputTypes.WEEKLY) {
    trigger.type = Notifications.SchedulableTriggerInputTypes.WEEKLY;
  } else {
    trigger.repeats = true;
  }

  return trigger;
}

// ─── Notification Channel Setup (Android) ────────────────────
// Must be called before any notification is displayed
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Grahachara',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('daily-guidance', {
    name: 'දෛනික මඟපෙන්වීම / Daily Guidance',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Daily motivation, do and do not guidance',
  });

  await Notifications.setNotificationChannelAsync('daily-palapa', {
    name: 'දෛනික පලාපල / Daily Horoscope',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Daily horoscope and celestial guidance',
  });

  await Notifications.setNotificationChannelAsync('weekly-lagna', {
    name: 'සතිපතා ලග්න පලාපල / Weekly Lagna',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Weekly lagna horoscope predictions',
  });

  await Notifications.setNotificationChannelAsync('rahu-kalaya', {
    name: 'රාහු කාලය / Rahu Kalaya',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    description: 'Rahu Kalaya start warnings',
  });

  await Notifications.setNotificationChannelAsync('maraka-apala', {
    name: 'මාරක අපල / Danger Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500],
    description: 'Maraka Apala dangerous period alerts',
  });
}

// ─── Configure notification behavior ─────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for Push Notifications ──────────────────────────
export async function registerForPushNotifications(language) {
  var token = null;

  if (Platform.OS === 'web') {
    return null;
  }

  await setupNotificationChannels();

  // Check existing permissions before scheduling local fallback notifications.
  var { status: existingStatus } = await Notifications.getPermissionsAsync();
  var finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    var { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('[Notifications] Permission not granted');
    return null;
  }

  await ensureDailyGuidanceSchedule(language);

  // Only real devices can receive push notifications
  if (!Device.isDevice) {
    if (__DEV__) console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Get the Expo push token — use real EAS projectId from app.json
  try {
    var Constants = require('expo-constants').default;
    var projectId =
      (Constants && Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.eas && Constants.expoConfig.extra.eas.projectId) ||
      (Constants && Constants.easConfig && Constants.easConfig.projectId) ||
      null;
    if (!projectId) {
      if (__DEV__) console.warn('[Notifications] No EAS projectId found — cannot get push token');
      return null;
    }
    var tokenData = await Notifications.getExpoPushTokenAsync({ projectId: projectId });
    token = tokenData.data;
    if (__DEV__) console.log('[Notifications] Push token:', token);

    // Cache token locally
    await AsyncStorage.setItem('pushToken', token);
  } catch (err) {
    if (__DEV__) console.warn('[Notifications] Token error:', err && err.message);
  }

  return token;
}

// ─── Get cached push token ────────────────────────────────────
export async function getCachedPushToken() {
  try {
    return await AsyncStorage.getItem('pushToken');
  } catch (e) {
    return null;
  }
}

// ─── Handle notification received while app is foregrounded ───
export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

// ─── Handle notification tapped (background → foreground) ─────
export function addNotificationResponseListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getLastNotificationResponse() {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (e) {
    return null;
  }
}

// ─── Parse notification data for navigation ───────────────────
export function getNotificationNavigationTarget(notification) {
  var data = notification?.request?.content?.data || {};
  var type = data.type;

  switch (type) {
    case 'DAILY_GUIDANCE':
    case 'DAILY_GUIDANCE_LOCAL':
    case 'DAILY_PALAPA':
      return { screen: '(tabs)/index', params: { tab: 'palapa' } };
    case 'WEEKLY_LAGNA':
      return { screen: '(tabs)/index', params: { tab: 'weekly' } };
    case 'RAHU_KALAYA':
      return { screen: '(tabs)/index', params: { tab: 'rahuKalaya' } };
    case 'MARAKA_APALA':
      return { screen: '(tabs)/report', params: { section: 'marakaApala' } };
    case 'TRANSIT_ALERT':
      return { screen: '(tabs)/kendara', params: { section: 'transits' } };
    default:
      return { screen: '(tabs)/index' };
  }
}

// ─── Get notification badge count ─────────────────────────────
export async function getBadgeCount() {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (e) {
    return 0;
  }
}

// ─── Clear badge count ────────────────────────────────────────
export async function clearBadge() {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (e) { /* ignore */ }
}

// ─── Schedule a local notification ────────────────────────────
export async function scheduleLocalNotification(title, body, data, triggerDate) {
  try {
    var id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
      },
      trigger: triggerDate ? { date: triggerDate, channelId: 'default' } : null,
    });
    return id;
  } catch (err) {
    if (__DEV__) console.error('[Notifications] Schedule error:', err);
    return null;
  }
}

// ─── Daily local guidance fallback ────────────────────────────
export async function scheduleDailyGuidanceNotifications(language) {
  if (Platform.OS === 'web') return [];

  try {
    if (!(await isDailyGuidanceEnabled())) {
      await cancelDailyGuidanceNotifications();
      return [];
    }

    var { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return [];

    await setupNotificationChannels();
    await cancelDailyGuidanceNotifications();

    var lang = await getStoredNotificationLanguage(language);
    var messages = DAILY_GUIDANCE_MESSAGES[lang] || DAILY_GUIDANCE_MESSAGES.si;
    var ids = [];

    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      var weekday = i + 1; // Expo calendar triggers use 1-7 for weekly repeats.
      var id = await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'DAILY_GUIDANCE_LOCAL', weekday: weekday },
          sound: 'default',
        },
        trigger: buildWeeklyTrigger(weekday),
      });
      ids.push(id);
    }

    await AsyncStorage.setItem(DAILY_GUIDANCE_IDS_KEY, JSON.stringify(ids));
    await AsyncStorage.setItem(DAILY_GUIDANCE_LANG_KEY, lang);
    if (__DEV__) console.log('[Notifications] Daily guidance scheduled:', ids.length);
    return ids;
  } catch (err) {
    if (__DEV__) console.warn('[Notifications] Daily guidance schedule error:', err && err.message);
    return [];
  }
}

export async function ensureDailyGuidanceSchedule(language) {
  if (Platform.OS === 'web') return [];

  try {
    if (!(await isDailyGuidanceEnabled())) {
      await cancelDailyGuidanceNotifications();
      return [];
    }

    var lang = await getStoredNotificationLanguage(language);
    var savedLang = await AsyncStorage.getItem(DAILY_GUIDANCE_LANG_KEY);
    var savedRaw = await AsyncStorage.getItem(DAILY_GUIDANCE_IDS_KEY);
    var savedIds = savedRaw ? JSON.parse(savedRaw) : [];

    if (savedLang === lang && Array.isArray(savedIds) && savedIds.length === 7) {
      var scheduled = await Notifications.getAllScheduledNotificationsAsync();
      var active = {};
      scheduled.forEach(function(item) {
        active[item.identifier] = true;
      });
      var allStillScheduled = savedIds.every(function(id) { return active[id]; });
      if (allStillScheduled) return savedIds;
    }
  } catch (e) { /* reschedule below */ }

  return scheduleDailyGuidanceNotifications(language);
}

export async function cancelDailyGuidanceNotifications() {
  try {
    var savedRaw = await AsyncStorage.getItem(DAILY_GUIDANCE_IDS_KEY);
    var savedIds = savedRaw ? JSON.parse(savedRaw) : [];
    if (Array.isArray(savedIds)) {
      for (var i = 0; i < savedIds.length; i++) {
        await Notifications.cancelScheduledNotificationAsync(savedIds[i]);
      }
    }
    await AsyncStorage.removeItem(DAILY_GUIDANCE_IDS_KEY);
    await AsyncStorage.removeItem(DAILY_GUIDANCE_LANG_KEY);
  } catch (e) { /* ignore */ }
}

// ─── Cancel all scheduled notifications ───────────────────────
export async function cancelAllScheduled() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(DAILY_GUIDANCE_IDS_KEY);
    await AsyncStorage.removeItem(DAILY_GUIDANCE_LANG_KEY);
  } catch (e) { /* ignore */ }
}

export default {
  registerForPushNotifications: registerForPushNotifications,
  getCachedPushToken: getCachedPushToken,
  setupNotificationChannels: setupNotificationChannels,
  addNotificationReceivedListener: addNotificationReceivedListener,
  addNotificationResponseListener: addNotificationResponseListener,
  getLastNotificationResponse: getLastNotificationResponse,
  getNotificationNavigationTarget: getNotificationNavigationTarget,
  getBadgeCount: getBadgeCount,
  clearBadge: clearBadge,
  scheduleLocalNotification: scheduleLocalNotification,
  scheduleDailyGuidanceNotifications: scheduleDailyGuidanceNotifications,
  ensureDailyGuidanceSchedule: ensureDailyGuidanceSchedule,
  cancelDailyGuidanceNotifications: cancelDailyGuidanceNotifications,
  cancelAllScheduled: cancelAllScheduled,
};
