/**
 * PinchableView — Wraps content with pinch-to-zoom and pan gestures.
 * Uses react-native-gesture-handler + Reanimated for 60fps performance.
 * On web, GestureDetector causes stray DOM text nodes, so we skip it.
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

export default function PinchableView({
  children,
  minScale = 1,
  maxScale = 3,
  style,
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.min(maxScale, Math.max(minScale, newScale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withSpring(1, { damping: 12 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 12 });
        translateY.value = withSpring(0, { damping: 12 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1.05) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.05) {
        scale.value = withSpring(1, { damping: 12 });
        savedScale.value = 1;
        translateX.value = withSpring(0, { damping: 12 });
        translateY.value = withSpring(0, { damping: 12 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2, { damping: 12 });
        savedScale.value = 2;
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // On web, GestureDetector injects stray DOM nodes that cause
  // "Unexpected text node" warnings — pinch/pan isn't useful on web anyway
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        {children}
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
});
