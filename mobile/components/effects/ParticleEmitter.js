/**
 * ParticleEmitter — Ambient sparkle/dust particles using Skia Canvas.
 * Falls back to simple Reanimated dots when Skia is unavailable.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';

let SkiaCanvas, SkiaCircle, SkiaBlurMask;
try {
  const Skia = require('@shopify/react-native-skia');
  SkiaCanvas = Skia.Canvas;
  SkiaCircle = Skia.Circle;
  SkiaBlurMask = Skia.BlurMask;
} catch (e) {
  SkiaCanvas = null;
}

function FallbackParticle({ x, y, size, color, delay: dly, duration }) {
  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withDelay(
      dly,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.6, easing: Easing.out(Easing.sin) }),
          withTiming(0, { duration: duration * 0.4, easing: Easing.in(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(prog.value, [0, 1], [0, 0.8]),
    transform: [
      { translateY: interpolate(prog.value, [0, 1], [0, -8]) },
      { scale: interpolate(prog.value, [0, 0.5, 1], [0.3, 1, 0.5]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
    />
  );
}

export default function ParticleEmitter({
  width = 300,
  height = 300,
  count = 20,
  colors = ['#FBBF24', '#C084FC', '#93C5FD', '#FDE68A'],
  maxSize = 4,
  style,
}) {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * maxSize,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 4000,
        duration: 2000 + Math.random() * 3000,
      });
    }
    return arr;
  }, [width, height, count]);

  return (
    <View style={[{ width, height, position: 'absolute' }, style]} pointerEvents="none">
      {particles.map((p, i) => (
        <FallbackParticle key={i} {...p} />
      ))}
    </View>
  );
}
