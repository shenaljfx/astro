/**
 * useResponsive — reactive viewport metrics for React Native.
 *
 * Replaces the common (broken) pattern of capturing
 * Dimensions.get('window') at module load. Updates on rotation,
 * foldable unfold, and split-screen resize via the Dimensions
 * change listener.
 *
 * Returns:
 *   width, height       current viewport size in dp
 *   isSmall             height < 700  (cramped phones)
 *   isShort             height < 640  (very short — drop decorations)
 *   isNarrow            width  < 360  (small Androids)
 *   isTablet            min(width, height) >= 600
 *   isLandscape         width > height
 *   scale               clamped relative size factor vs. 390x844 baseline
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

var BASE_W = 390;
var BASE_H = 844;

function measure() {
  var d = Dimensions.get('window');
  var width = d.width;
  var height = d.height;
  var min = Math.min(width, height);
  var rawScale = Math.min(width / BASE_W, height / BASE_H);
  // Clamp so we don't blow up on tablets or shrink absurdly on tiny screens.
  var scale = Math.max(0.85, Math.min(1.25, rawScale));
  return {
    width: width,
    height: height,
    isSmall: height < 700,
    isShort: height < 640,
    isNarrow: width < 360,
    isTablet: min >= 600,
    isLandscape: width > height,
    scale: scale,
  };
}

export default function useResponsive() {
  var [metrics, setMetrics] = useState(measure);

  useEffect(function () {
    var sub = Dimensions.addEventListener('change', function () {
      setMetrics(measure());
    });
    return function () { sub && sub.remove && sub.remove(); };
  }, []);

  return metrics;
}
