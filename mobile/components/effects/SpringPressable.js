/**
 * SpringPressable — Drop-in replacement for TouchableOpacity with:
 * - withSpring scale (press-in: 0.95, press-out: 1.0 with overshoot)
 * - Optional expo-haptics feedback (light/medium/heavy)
 * - Pressable-compatible API (onPress, onLongPress, disabled, etc.)
 */
import React, { useCallback } from 'react';
import { Pressable, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const IMPACT_MAP = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export default function SpringPressable({
  children,
  onPress,
  onLongPress,
  haptic = 'light',
  scalePressed = 0.95,
  disabled = false,
  style,
  ...rest
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scalePressed, { damping: 15, stiffness: 300 });
    if (Platform.OS !== 'web' && haptic) {
      Haptics.impactAsync(IMPACT_MAP[haptic] || IMPACT_MAP.light);
    }
  }, [scalePressed, haptic]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }, []);

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
