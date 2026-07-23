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
var DAILY_GUIDANCE_HOUR = 8;
var DAILY_GUIDANCE_MINUTE = 0;

var DAILY_GUIDANCE_MESSAGES = {
  en: [
    {
      title: '🌅 Morning Blessing',
      body: 'You are aligned with the rhythm of the cosmos. Today, every step carries purpose. Trust the path unfolding before you. ✨',
    },
    {
      title: '✨ Cosmic Energy',
      body: 'The universe is conspiring in your favour today. Open your heart to receive what is already on its way to you. 💫',
    },
    {
      title: '🌸 Inner Light',
      body: 'Your inner light shines brighter than any shadow. Today you radiate warmth, wisdom, and quiet confidence to everyone around you.',
    },
    {
      title: '🌿 Sacred Morning',
      body: 'Like the lotus rising through still water, you rise above yesterday. This morning is your fresh beginning — breathe it in deeply. 🕊️',
    },
    {
      title: '💫 Abundant Day',
      body: 'Abundance flows through you like a river finding the sea. Today you attract exactly what your soul has been preparing for. 🌟',
    },
    {
      title: '🔥 Inner Strength',
      body: 'There is a fire within you that no storm can extinguish. Today you move forward with courage, clarity, and unwavering determination.',
    },
    {
      title: '🙏 Gratitude Sunrise',
      body: 'This breath is a gift. This morning is a blessing. Today you walk with a grateful heart, and the universe rewards your appreciation. ☀️',
    },
  ],
  si: [
    {
      title: '🌅 උදෑසන ආශිර්වාදය',
      body: 'ඔබ විශ්වයේ ලයට එකතු වෙලා ඉන්නේ. අද හැම පියවරක්ම අරමුණක් දරනවා. ඉදිරියේ මතුවන මාර්ගය විශ්වාස කරන්න. ✨',
    },
    {
      title: '✨ විශ්ව ශක්තිය',
      body: 'විශ්වය අද ඔබට හිතකර ලෙස ක්‍රියා කරනවා. ඔබ ළඟට එන දේවල් ලැබීමට හදවත විවෘත කරන්න. 💫',
    },
    {
      title: '🌸 අභ්‍යන්තර ආලෝකය',
      body: 'ඔබේ ඇතුළත ආලෝකය ඕනෑම සෙවණැල්ලකට වඩා දීප්තිමත්. අද උණුසුම, ප්‍රඥාව සහ සන්සුන් විශ්වාසය පතුරවන්න.',
    },
    {
      title: '🌿 ශුද්ධ උදෑසන',
      body: 'නිස්කලංක දියෙන් නැගෙන නෙළුම මෙන් ඔබ ඊයේ ඉහළට නැඟෙනවා. මේ උදෑසන අලුත් ආරම්භයයි — ගැඹුරින් හුස්ම ගන්න. 🕊️',
    },
    {
      title: '💫 සෞභාග්‍යමත් දවස',
      body: 'සමෘද්ධිය මුහුදට ගලන ගඟක් වගේ ඔබ තුළින් ගලනවා. ඔබේ ආත්මය සූදානම් කළ දේ හරියටම අද ඇදෙනවා. 🌟',
    },
    {
      title: '🔥 අභ්‍යන්තර ශක්තිය',
      body: 'ඔබ තුළ කිසිදු කුණාටුවකට නිවිය නොහැකි ගින්නක් තියෙනවා. අද නිර්භීතව, පැහැදිලිව ඉදිරියට යන්න.',
    },
    {
      title: '🙏 කෘතඥතා උදාව',
      body: 'මේ හුස්ම දීමනාවක්. මේ උදෑසන ආශිර්වාදයක්. අද කෘතඥ හදවතකින් ගමන් කරන්න — විශ්වය ඔබට ත්‍යාග දෙනවා. ☀️',
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
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: weekday,
    hour: DAILY_GUIDANCE_HOUR,
    minute: DAILY_GUIDANCE_MINUTE,
    channelId: 'daily-guidance',
  };
}

// ─── Notification Channel Setup (Android) ────────────────────
// Must be called before any notification is displayed
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Grahachara',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('daily-guidance', {
    name: 'දෛනික මඟපෙන්වීම / Daily Guidance',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    description: 'Daily motivation, do and do not guidance',
  });

  await Notifications.setNotificationChannelAsync('daily-affirmation', {
    name: '🌅 උදෑසන ආශිර්වාදය / Morning Affirmation',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    description: 'Beautiful morning affirmation to start your day',
  });

  await Notifications.setNotificationChannelAsync('daily-palapa', {
    name: 'දෛනික පලාපල / Daily Horoscope',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    description: 'Daily horoscope and celestial guidance',
  });

  await Notifications.setNotificationChannelAsync('weekly-lagna', {
    name: 'සතිපතා ලග්න පලාපල / Weekly Lagna',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
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

  // screen values are expo-router URL paths. Group and index segments
  // ('(tabs)/index') are NOT part of the URL — pushing one matches no route
  // and lands on the Unmatched Route screen.
  switch (type) {
    case 'DAILY_GUIDANCE':
    case 'DAILY_GUIDANCE_LOCAL':
    case 'DAILY_PALAPA':
      return { screen: '/', params: { tab: 'palapa' } };
    case 'WEEKLY_LAGNA':
      return { screen: '/', params: { tab: 'weekly' } };
    case 'RAHU_KALAYA':
      return { screen: '/', params: { tab: 'rahuKalaya' } };
    case 'MARAKA_APALA':
      return { screen: '/report', params: { section: 'marakaApala' } };
    case 'TRANSIT_ALERT':
      return { screen: '/kendara', params: { section: 'transits' } };
    default:
      return { screen: '/' };
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
    var trigger = null;
    if (triggerDate) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate instanceof Date ? triggerDate : new Date(triggerDate),
        channelId: 'default',
      };
    }
    var id = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data || {},
        sound: 'default',
      },
      trigger: trigger,
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
