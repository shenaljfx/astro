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

export default function useKeyboard() {
  var [state, setState] = useState({ isOpen: false, height: 0 });

  useEffect(function () {
    var showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    var hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    var showSub = Keyboard.addListener(showEvt, function (e) {
      var h = (e && e.endCoordinates && e.endCoordinates.height) || 0;
      setState({ isOpen: true, height: h });
    });
    var hideSub = Keyboard.addListener(hideEvt, function () {
      setState({ isOpen: false, height: 0 });
    });
    return function () {
      showSub && showSub.remove && showSub.remove();
      hideSub && hideSub.remove && hideSub.remove();
    };
  }, []);

  return state;
}
