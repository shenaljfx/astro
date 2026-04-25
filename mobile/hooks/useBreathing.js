/**
 * useBreathing — ambient pulse shared value.
 *
 * Replaces the 6-line `withRepeat(withTiming(...), -1, true)` snippet
 * copied across screens. Honors useReducedMotion.
 *
 * Usage:
 *   var pulse = useBreathing({ duration: 2400 });
 *   var style = useAnimatedStyle(function () {
 *     return { opacity: 0.6 + 0.4 * pulse.value };
 *   });
 */

import { useEffect } from 'react';
import {
  useSharedValue, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import useReducedMotion from './useReducedMotion';

export default function useBreathing(opts) {
  var duration = (opts && opts.duration) || 2400;
  var from = (opts && opts.from) != null ? opts.from : 0;
  var to = (opts && opts.to) != null ? opts.to : 1;
  var pulse = useSharedValue(from);
  var reduced = useReducedMotion();

  useEffect(function () {
    if (reduced) {
      cancelAnimation(pulse);
      pulse.value = (from + to) / 2;
      return;
    }
    pulse.value = from;
    pulse.value = withRepeat(
      withTiming(to, { duration: duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    return function () { cancelAnimation(pulse); };
  }, [duration, from, to, reduced]);

  return pulse;
}
