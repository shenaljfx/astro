/**
 * useIsDesktop — returns true when the viewport is wide enough to show
 * the desktop layout (≥ 1024 px). Subscribes to Dimensions change events
 * so the layout switches automatically on resize.
 */

import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

var DESKTOP_BREAKPOINT = 1024;

export default function useIsDesktop() {
  function measure() {
    var { width } = Dimensions.get('window');
    return width >= DESKTOP_BREAKPOINT;
  }

  var [isDesktop, setIsDesktop] = useState(measure);

  useEffect(function () {
    // On native platforms the window never changes, so skip listener
    if (Platform.OS !== 'web') return;

    function handler(e) {
      setIsDesktop(e.window.width >= DESKTOP_BREAKPOINT);
    }

    var sub = Dimensions.addEventListener('change', handler);
    return function () { sub && sub.remove && sub.remove(); };
  }, []);

  return isDesktop;
}
