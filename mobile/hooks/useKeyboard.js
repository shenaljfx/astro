/**
 * useKeyboard - reactive keyboard visibility + height.
 *
 * Critical for layouts where a custom (absolute-positioned) bottom tab bar
 * needs to be cleared above the content. When the keyboard is open,
 * the tab bar is auto-hidden (tabBarHideOnKeyboard) and the content
 * should snap to the keyboard top rather than reserve tab-bar space.
 *
 * Returns:
 *   isOpen        - true when keyboard is visible
 *   height        - keyboard height in dp (0 when closed)
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

function getKeyboardMetrics() {
  if (Platform.OS === 'web') return { isOpen: false, height: 0 };
  if (typeof Keyboard.metrics === 'function') {
    var metrics = Keyboard.metrics();
    if (metrics && metrics.height) return { isOpen: true, height: metrics.height };
  }
  if (typeof Keyboard.isVisible === 'function' && Keyboard.isVisible()) {
    return { isOpen: true, height: 0 };
  }
  return { isOpen: false, height: 0 };
}

export default function useKeyboard() {
  var [state, setState] = useState(getKeyboardMetrics);

  useEffect(function () {
    if (Platform.OS === 'web') return;

    var show = function (e) {
      var h = (e && e.endCoordinates && e.endCoordinates.height) || 0;
      setState({ isOpen: true, height: h });
    };
    var hide = function () {
      setState({ isOpen: false, height: 0 });
    };

    var subs = [
      Keyboard.addListener('keyboardWillShow', show),
      Keyboard.addListener('keyboardDidShow', show),
      Keyboard.addListener('keyboardWillChangeFrame', show),
      Keyboard.addListener('keyboardDidChangeFrame', show),
      Keyboard.addListener('keyboardWillHide', hide),
      Keyboard.addListener('keyboardDidHide', hide),
    ];
    return function () {
      subs.forEach(function (sub) { sub && sub.remove && sub.remove(); });
    };
  }, []);

  return state;
}
