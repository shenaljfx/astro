/**
 * HapticButton — Wraps any pressable with spring scale animation
 * + expo-haptics impact feedback. Drop-in replacement for TouchableOpacity.
 */
import React, { useCallback } from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const IMPACT_MAP = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export default function HapticButton({
  children,
  onPress,
  hapticStyle = 'light',
  scaleIn = 0.95,
  scaleOut = 1.0,
  springConfig = { damping: 12, stiffness: 300 },
  disabled = false,
  style,
  activeOpacity = 0.92,
  ...rest
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleIn, springConfig);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(IMPACT_MAP[hapticStyle] || IMPACT_MAP.light);
    }
  }, [scaleIn, hapticStyle]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(scaleOut, {
      ...springConfig,
      stiffness: springConfig.stiffness * 0.7,
      overshootClamping: false,
    });
  }, [scaleOut]);

  const handlePress = useCallback(() => {
    if (onPress) onPress();
  }, [onPress]);

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      disabled={disabled}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedTouchable>
  );
}
