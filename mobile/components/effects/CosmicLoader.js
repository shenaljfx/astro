/**
 * CosmicLoader — Cinematic drop-in replacement for ActivityIndicator.
 * Features: orbiting planet dots, pulsing core, rotating ring, and optional text.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';
import { boxShadow, textShadow } from '../../utils/shadow';

const ORBIT_COLORS = ['#FBBF24', '#C084FC', '#34D399', '#60A5FA', '#F472B6'];

function OrbitDot({ index, count, radius, duration, color, dotSize }) {
  const angle = useSharedValue(((2 * Math.PI) / count) * index);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(angle.value + 2 * Math.PI, {
        duration: duration,
        easing: Easing.linear,
      }),
      -1
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => {
    const x = Math.cos(angle.value) * radius;
    const y = Math.sin(angle.value) * radius;
    const s = interpolate(
      Math.sin(angle.value),
      [-1, 1],
      [0.6, 1.2]
    );
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: s },
      ],
      opacity: interpolate(Math.sin(angle.value), [-1, 1], [0.4, 1]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          ...boxShadow(color, { width: 0, height: 0 }, 0.8, dotSize),
          elevation: 4,
        },
        dotStyle,
      ]}
    />
  );
}

export default function CosmicLoader({
  size = 40,
  color = '#C084FC',
  text,
  textColor = 'rgba(255,255,255,0.6)',
  style,
}) {
  const coreScale = useSharedValue(0.8);
  const ringRotation = useSharedValue(0);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
    ringRotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 3000, easing: Easing.linear }),
      -1
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
  }, []);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}rad` }],
    opacity: ringOpacity.value,
  }));

  const coreSize = size * 0.25;
  const orbitRadius = size * 0.35;
  const dotSize = size * 0.1;
  const orbitCount = 5;
  const duration = 2400;

  return (
    <View style={[styles.container, style]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer ring */}
        <Animated.View style={[
          {
            position: 'absolute',
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            borderWidth: 1,
            borderColor: color,
          },
          ringStyle,
        ]} />

        {/* Orbiting dots */}
        {ORBIT_COLORS.slice(0, orbitCount).map((c, i) => (
          <OrbitDot
            key={i}
            index={i}
            count={orbitCount}
            radius={orbitRadius}
            duration={duration + i * 200}
            color={c}
            dotSize={dotSize}
          />
        ))}

        {/* Core pulse */}
        <Animated.View style={[
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            backgroundColor: color,
            ...boxShadow(color, { width: 0, height: 0 }, 1, coreSize),
            elevation: 6,
          },
          coreStyle,
        ]} />
      </View>

      {text ? (
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
