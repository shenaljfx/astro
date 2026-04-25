/**
 * useReducedMotion — true when the OS-level "reduce motion" setting is on,
 * or when the user has explicitly opted out via app settings.
 *
 * Wraps AccessibilityInfo and listens for changes. Use this to gate
 * decorative animations (starfields, pulses, halos) so the app respects
 * accessibility preferences.
 *
 * Usage:
 *   var reduced = useReducedMotion();
 *   useEffect(function () {
 *     if (reduced) return;  // don't start ambient pulse
 *     halo.value = withRepeat(withTiming(1, { duration: 2000 }), -1, true);
 *   }, [reduced]);
 */

import { useState, useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export default function useReducedMotion() {
  var [reduced, setReduced] = useState(false);

  useEffect(function () {
    var mounted = true;
    if (AccessibilityInfo && AccessibilityInfo.isReduceMotionEnabled) {
      AccessibilityInfo.isReduceMotionEnabled().then(function (val) {
        if (mounted) setReduced(!!val);
      }).catch(function () { });
    }
    var sub = null;
    if (AccessibilityInfo && AccessibilityInfo.addEventListener) {
      try {
        sub = AccessibilityInfo.addEventListener('reduceMotionChanged', function (val) {
          if (mounted) setReduced(!!val);
        });
      } catch (e) { /* ignore on platforms without support */ }
    }
    return function () {
      mounted = false;
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  // Web has no event for this; default to false.
  if (Platform.OS === 'web') return false;
  return reduced;
}
