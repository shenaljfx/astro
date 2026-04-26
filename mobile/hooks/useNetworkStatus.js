/**
 * useNetworkStatus — tracks device connectivity in real-time.
 * Uses @react-native-community/netinfo on native, falls back to
 * navigator.onLine on web.
 *
 * Returns { isConnected, isInternetReachable }
 */
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

var NetInfo = null;
if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo').default;
  } catch (e) {
    // NetInfo unavailable — will fall back to assuming online
  }
}

export default function useNetworkStatus() {
  var [status, setStatus] = useState({ isConnected: true, isInternetReachable: true });

  useEffect(function () {
    if (NetInfo) {
      var unsubscribe = NetInfo.addEventListener(function (state) {
        setStatus({
          isConnected: state.isConnected !== false,
          isInternetReachable: state.isInternetReachable !== false,
        });
      });
      return function () { unsubscribe(); };
    }

    // Web fallback
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      var update = function () {
        setStatus({ isConnected: navigator.onLine, isInternetReachable: navigator.onLine });
      };
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
      return function () {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }
  }, []);

  return status;
}
