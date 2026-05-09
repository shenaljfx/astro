/**
 * useScreenInsets — production-grade safe-area + chrome padding.
 *
 * Combines react-native-safe-area-context insets (notch/cutout/home-bar)
 * with the Android translucent StatusBar height and the bottom tab bar
 * height, returning ready-to-use top/bottom padding values.
 *
 * Why: hardcoded `paddingTop: Platform.OS === 'ios' ? 100 : 80` ignores
 * actual device chrome — a Pixel 8 Pro status bar is 48dp, an iPhone SE
 * has none. This hook gives every screen the same correct numbers.
 *
 * Usage:
 *   var { contentTop, contentBottom } = useScreenInsets();
 *   <ScrollView contentContainerStyle={{ paddingTop: contentTop, paddingBottom: contentBottom }} />
 *
 * Returns:
 *   top              raw safe-area top inset (status bar / notch)
 *   bottom           raw safe-area bottom inset (home indicator)
 *   headerTop        padding for a fixed header (top + breathing room)
 *   contentTop       padding for ScrollView content under a floating header
 *   contentBottom    padding so content clears the tab bar
 *   tabBarHeight     approximate tab bar height including bottom inset
 */

import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout } from '../constants/theme';
import useKeyboard from './useKeyboard';
import useResponsive from './useResponsive';

var HEADER_BREATHING = 12;

export default function useScreenInsets() {
  var insets = useSafeAreaInsets();
  var keyboard = useKeyboard();
  var responsive = useResponsive();

  // On Android with translucent StatusBar, insets.top can be 0 in some
  // edge cases. Fall back to StatusBar.currentHeight.
  var androidStatus = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  var top = Math.max(insets.top || 0, androidStatus);
  var bottom = insets.bottom || 0;

  var headerH = (Layout && Layout.headerHeight) || 64;
  var tabBarVisual = (Layout && Layout.tabBarHeight) || 60;
  var breathing = responsive.isShort ? 6 : responsive.isSmall ? 8 : HEADER_BREATHING;
  var bottomBreathing = responsive.isShort ? 8 : 16;
  var keyboardBottom = Math.max(bottom, 8) + bottomBreathing;
  var restingBottom = tabBarVisual + bottom + bottomBreathing;

  return {
    top: top,
    bottom: bottom,
    keyboard: keyboard,
    responsive: responsive,
    headerTop: top + breathing,
    contentTop: top + headerH + breathing,
    contentBottom: keyboard.isOpen ? keyboardBottom : restingBottom,
    keyboardBottom: keyboardBottom,
    restingBottom: restingBottom,
    tabBarHeight: tabBarVisual + bottom,
  };
}
