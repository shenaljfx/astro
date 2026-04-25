/**
 * <Screen> — production-grade tab screen wrapper.
 *
 * Replaces the boilerplate at the top of every tab screen:
 *   <View style={{ flex:1, bg }}>
 *     <PremiumBackground />
 *     <Animated.ScrollView
 *       contentContainerStyle={{ paddingTop: Platform.OS==='ios'?100:80 }}>
 *
 * Provides:
 *  • Safe-area-correct top padding (uses useScreenInsets, not a hardcoded
 *    Platform.OS === 'ios' ? 100 : 80 number that crops on Pixel/Samsung).
 *  • Bottom padding that always clears the tab bar + home indicator.
 *  • Optional ScrollView with onScroll forwarding.
 *  • Tablet centring at Layout.maxContent.
 *  • Translucent StatusBar configured once.
 *
 * Props:
 *   noScroll?         render a plain View instead of a ScrollView
 *   refreshControl?   forwarded to ScrollView
 *   onScroll?         forwarded to ScrollView (Animated)
 *   scrollRef?        forwarded ref
 *   header?           ReactNode rendered absolutely at the top
 *   background?       ReactNode rendered behind everything (defaults to none)
 *   contentStyle?     extra style merged into contentContainer
 *   testID?
 */

import React from 'react';
import { View, StyleSheet, Platform, StatusBar, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import useScreenInsets from '../../hooks/useScreenInsets';
import useResponsive from '../../hooks/useResponsive';
import { Colors, Layout } from '../../constants/theme';

export default function Screen(props) {
  var insets = useScreenInsets();
  var resp = useResponsive();
  var isWide = resp.isTablet || resp.width >= Layout.breakpointDesktop;

  var content = props.children;
  var contentPad = {
    paddingTop: insets.contentTop,
    paddingBottom: insets.contentBottom,
  };

  var centeredContainer = isWide ? {
    maxWidth: Layout.maxContent,
    width: '100%',
    alignSelf: 'center',
  } : null;

  var body;
  if (props.noScroll) {
    body = (
      <View style={[styles.flex, contentPad, centeredContainer, props.contentStyle]}>
        {content}
      </View>
    );
  } else {
    body = (
      <Animated.ScrollView
        ref={props.scrollRef}
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, contentPad, centeredContainer, props.contentStyle]}
        onScroll={props.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={props.refreshControl}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </Animated.ScrollView>
    );
  }

  return (
    <View style={styles.root} testID={props.testID}>
      {Platform.OS !== 'web' ? (
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      ) : null}
      {props.background}
      {body}
      {props.header}
    </View>
  );
}

var styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 16 },
});
