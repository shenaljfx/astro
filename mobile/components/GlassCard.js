/**
 * GlassCard - World-Class Glassmorphism Card
 * Premium glass card with animated gradient border, shine sweep,
 * press-scale micro-interaction, and layered depth.
 */
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, interpolate, Easing, FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Shadows } from '../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function GlassCard({
  children, style, onPress, delay = 0,
  borderColors, glowColor, entering,
  disabled = false, noBorder = false,
  variant = 'default', // default | elevated | subtle | hero
}) {
  const borderPhase = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const glowOp = useSharedValue(0);
  const shineX = useSharedValue(-1);

  useEffect(() => {
    // Animated gradient border rotation
    borderPhase.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.linear }),
      -1
    );
    // Periodic shine sweep across card
    shineX.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);

  const borderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      borderPhase.value,
      [0, 0.25, 0.5, 0.75, 1],
      [0.2, 0.55, 0.2, 0.55, 0.2]
    ),
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shineX.value, [-1, 1], [-400, 400]) }],
    opacity: interpolate(shineX.value, [-1, -0.5, 0, 0.5, 1], [0, 0.03, 0.06, 0.03, 0]),
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    glowOp.value = withTiming(1, { duration: 120 });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 10, stiffness: 200, overshootClamping: false });
    glowOp.value = withTiming(0, { duration: 250 });
  };

  const handlePress = () => {
    if (onPress) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onPress();
    }
  };

  const enterAnim = entering || FadeInDown.delay(delay).springify();
  const bColors = borderColors || ['#FF8C00', '#FF6D00', '#FFB800', '#FF8C00'];
  const gColor = glowColor || '#FF8C00';

  // Variant-based glass colors
  const glassColors = {
    default: ['rgba(24,22,60,0.6)', 'rgba(12,10,38,0.45)'],
    elevated: ['rgba(37,34,80,0.65)', 'rgba(20,18,55,0.5)'],
    subtle: ['rgba(16,14,42,0.45)', 'rgba(8,6,28,0.3)'],
    hero: ['rgba(40,36,90,0.7)', 'rgba(24,20,60,0.55)'],
  }[variant] || ['rgba(24,22,60,0.6)', 'rgba(12,10,38,0.45)'];

  return (
    <Animated.View entering={enterAnim} style={scaleStyle}>
      <AnimatedTouchable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.92}
        disabled={disabled || !onPress}
        style={[gcS.container, Shadows.cardFloat, style]}
      >
        {/* Animated gradient border */}
        {!noBorder && (
          <Animated.View style={[StyleSheet.absoluteFill, gcS.borderWrap, borderStyle]}>
            <LinearGradient
              colors={bColors}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* Glow on press */}
        <Animated.View style={[gcS.glowLayer, glowStyle, { shadowColor: gColor }]} />

        {/* Glass fill with top highlight */}
        <LinearGradient
          colors={glassColors}
          style={gcS.fill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Top edge highlight line */}
          <View style={gcS.topHighlight} />

          {/* Shine sweep overlay */}
          <Animated.View style={[gcS.shineSweep, shineStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>

          {children}
        </LinearGradient>
      </AnimatedTouchable>
    </Animated.View>
  );
}

const gcS = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  borderWrap: {
    borderRadius: BorderRadius.xl,
    padding: 1,
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.xl,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  fill: {
    borderRadius: BorderRadius.xl - 1,
    padding: 18,
    margin: 1,
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0, left: 20, right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 0.5,
  },
  shineSweep: {
    position: 'absolute',
    top: 0, left: 0,
    width: 200,
    height: '100%',
  },
});
