/**
 * useLowEndDevice — detects low-end devices (< 3GB RAM or narrow screen).
 *
 * Returns true on budget phones (Samsung A04s, Redmi 9A, etc.) so
 * heavy visuals (star dots, GL textures, concurrent animations) can
 * be scaled down or skipped entirely.
 *
 * Combines expo-device RAM info with screen-size heuristics.
 * Result is cached — safe to call from multiple components.
 */

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

var _cached = null;

function detect() {
  if (_cached !== null) return _cached;

  // Screen-based heuristic (always available)
  var { width, height } = Dimensions.get('window');
  var isNarrow = width < 360;
  var isShort = height < 700;

  // Try expo-device for RAM (optional — not all builds include it)
  var lowRam = false;
  try {
    var Device = require('expo-device');
    if (Device && Device.totalMemory) {
      // totalMemory is in bytes; < 3GB = low-end
      lowRam = Device.totalMemory < 3 * 1024 * 1024 * 1024;
    }
  } catch (e) {
    // expo-device not available — rely on screen heuristics
  }

  _cached = lowRam || (isNarrow && isShort);
  return _cached;
}

export default function useLowEndDevice() {
  var [isLowEnd, setIsLowEnd] = useState(detect);

  useEffect(function () {
    // Re-detect once after mount (expo-device may resolve async)
    var timeout = setTimeout(function () {
      var result = detect();
      setIsLowEnd(result);
    }, 100);
    return function () { clearTimeout(timeout); };
  }, []);

  // Always false on web
  if (Platform.OS === 'web') return false;
  return isLowEnd;
}
