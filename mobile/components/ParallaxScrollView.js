/**
 * ParallaxScrollView - Depth effect on cosmic background
 * Implements: Idea #3 (Parallax Scroll depth)
 */
import React, { useRef } from 'react';
import { Animated as RNAnimated, StyleSheet, View, Dimensions, RefreshControl, Platform } from 'react-native';
import { Colors } from '../constants/theme';

const { height: H } = Dimensions.get('window');

export default function ParallaxScrollView({
  children,
  backgroundComponent,
  refreshing,
  onRefresh,
  contentContainerStyle,
  style,
  scrollEventThrottle = 16,
}) {
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  // Background parallax: moves at half the scroll speed
  const bgTranslateY = scrollY.interpolate({
    inputRange: [-H, 0, H],
    outputRange: [H * 0.3, 0, -H * 0.3],
    extrapolate: 'clamp',
  });

  // Subtle scale on over-scroll (pull down)
  const bgScale = scrollY.interpolate({
    inputRange: [-200, 0],
    outputRange: [1.3, 1],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  return (
    <View style={[pxS.container, style]}>
      {/* Parallax background layer */}
      {backgroundComponent && (
        <RNAnimated.View style={[pxS.bgLayer, {
          transform: [
            { translateY: bgTranslateY },
            { scale: bgScale },
          ],
        }]}>
          {backgroundComponent}
        </RNAnimated.View>
      )}

      {/* Scrollable content */}
      <RNAnimated.ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing || false}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          ) : undefined
        }
      >
        {children}
      </RNAnimated.ScrollView>
    </View>
  );
}

const pxS = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
