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

// ─── Notification Channel Setup (Android) ────────────────────
// Must be called before any notification is displayed
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('daily-palapa', {
    name: 'දෛනික පලාපල / Daily Horoscope',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    description: 'Morning daily horoscope predictions',
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
export async function registerForPushNotifications() {
  var token = null;

  // Only real devices can receive push notifications
  if (!Device.isDevice) {
    console.log('[Notifications] Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  var { status: existingStatus } = await Notifications.getPermissionsAsync();
  var finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    var { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    var tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'grahachara', // Your Expo project ID
    });
    token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    // Cache token locally
    await AsyncStorage.setItem('pushToken', token);
  } catch (err) {
    console.error('[Notifications] Token error:', err);
  }

  // Setup Android channels
  await setupNotificationChannels();

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

// ─── Parse notification data for navigation ───────────────────
export function getNotificationNavigationTarget(notification) {
  var data = notification?.request?.content?.data || {};
  var type = data.type;

  switch (type) {
    case 'DAILY_PALAPA':
      return { screen: '(tabs)/index', params: { tab: 'palapa' } };
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
      trigger: triggerDate ? { date: triggerDate } : null,
    });
    return id;
  } catch (err) {
    console.error('[Notifications] Schedule error:', err);
    return null;
  }
}

// ─── Cancel all scheduled notifications ───────────────────────
export async function cancelAllScheduled() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) { /* ignore */ }
}

export default {
  registerForPushNotifications: registerForPushNotifications,
  getCachedPushToken: getCachedPushToken,
  setupNotificationChannels: setupNotificationChannels,
  addNotificationReceivedListener: addNotificationReceivedListener,
  addNotificationResponseListener: addNotificationResponseListener,
  getNotificationNavigationTarget: getNotificationNavigationTarget,
  getBadgeCount: getBadgeCount,
  clearBadge: clearBadge,
  scheduleLocalNotification: scheduleLocalNotification,
  cancelAllScheduled: cancelAllScheduled,
};
