// ═══════════════════════════════════════════════════════════════════════
//  GoldenNebulaBg.js — Animated golden nebula background for the bottom
//  portion of the Today page. Pure Reanimated animations — no WebGL.
//  Creates pulsing golden/amber nebula glows + subtle star shimmer
//  that sits behind scrollable content below the 3D aurora.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing, interpolate,
} from 'react-native-reanimated';

var { width: SW, height: SH } = Dimensions.get('window');

// ── Tiny static star dots ──
function NebulaStars() {
  var stars = useMemo(function () {
    var arr = [];
    for (var i = 0; i < 40; i++) {
      var size = Math.random() < 0.12 ? (1.5 + Math.random() * 1.5) : (0.8 + Math.random() * 0.8);
      arr.push({
        key: i,
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: size,
        height: size,
        borderRadius: size / 2,
        opacity: 0.15 + Math.random() * 0.45,
      });
    }
    return arr;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(function (s) {
        return (
          <View
            key={s.key}
            style={{
              position: 'absolute',
              left: s.left,
              top: s.top,
              width: s.width,
              height: s.height,
              borderRadius: s.borderRadius,
              backgroundColor: 'rgba(255,220,100,0.85)',
              opacity: s.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

export default function GoldenNebulaBg() {
  // ── Animated shared values ──
  var glow1 = useSharedValue(0);
  var glow2 = useSharedValue(0);
  var glow3 = useSharedValue(0);
  var drift1 = useSharedValue(0);
  var drift2 = useSharedValue(0);
  var pulse = useSharedValue(0);

  useEffect(function () {
    glow1.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    glow2.value = withRepeat(
      withDelay(1200, withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    glow3.value = withRepeat(
      withDelay(2500, withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    drift1.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    drift2.value = withRepeat(
      withDelay(3500, withTiming(1, { duration: 22000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
  }, []);

  // ── Large warm nebula — center-left ──
  var nebula1 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow1.value, [0, 1], [0.06, 0.16]),
      transform: [
        { translateX: interpolate(drift1.value, [0, 1], [-20, 20]) },
        { translateY: interpolate(drift2.value, [0, 1], [-12, 12]) },
        { scale: interpolate(glow1.value, [0, 1], [0.92, 1.12]) },
      ],
    };
  });

  // ── Deep amber nebula — bottom-right ──
  var nebula2 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow2.value, [0, 1], [0.04, 0.13]),
      transform: [
        { translateX: interpolate(drift2.value, [0, 1], [15, -25]) },
        { translateY: interpolate(drift1.value, [0, 1], [10, -14]) },
        { scale: interpolate(glow2.value, [0, 1], [0.88, 1.08]) },
      ],
    };
  });

  // ── Diffuse golden haze — wide center ──
  var nebula3 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow3.value, [0, 1], [0.03, 0.10]),
      transform: [
        { translateX: interpolate(drift1.value, [0, 1], [10, -10]) },
        { scale: interpolate(glow3.value, [0, 1], [1.0, 1.18]) },
      ],
    };
  });

  // ── Subtle copper accent — lower-left ──
  var nebula4 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse.value, [0, 0.5, 1], [0.03, 0.09, 0.03]),
      transform: [
        { translateY: interpolate(drift2.value, [0, 1], [-8, 8]) },
        { scale: interpolate(pulse.value, [0, 1], [0.95, 1.1]) },
      ],
    };
  });

  return (
    <View
      style={{
        position: 'absolute', top: SH * 0.35, left: 0, right: 0, bottom: 0,
        zIndex: 0, overflow: 'hidden',
      }}
      pointerEvents="none"
    >
      {/* Top fade — blends smoothly from aurora above */}
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.08 }}
        pointerEvents="none"
      />

      {/* Large warm gold nebula — center-left */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.04,
          left: -SW * 0.12,
          width: SW * 0.85,
          height: SW * 0.85,
          borderRadius: SW * 0.42,
          backgroundColor: 'rgba(255,180,30,0.18)',
        }, nebula1]}
      />

      {/* Deep amber nebula — bottom-right */}
      <Animated.View
        style={[{
          position: 'absolute',
          bottom: SH * 0.02,
          right: -SW * 0.10,
          width: SW * 0.75,
          height: SW * 0.75,
          borderRadius: SW * 0.37,
          backgroundColor: 'rgba(200,120,10,0.15)',
        }, nebula2]}
      />

      {/* Wide golden haze — center spread */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.12,
          left: SW * 0.05,
          width: SW * 0.90,
          height: SH * 0.35,
          borderRadius: SW * 0.30,
          backgroundColor: 'rgba(255,200,50,0.10)',
        }, nebula3]}
      />

      {/* Copper accent — lower-left */}
      <Animated.View
        style={[{
          position: 'absolute',
          bottom: SH * 0.06,
          left: -SW * 0.05,
          width: SW * 0.60,
          height: SW * 0.60,
          borderRadius: SW * 0.30,
          backgroundColor: 'rgba(180,100,10,0.12)',
        }, nebula4]}
      />

      {/* Bright gold highlight — mid-right */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.10,
          right: SW * 0.02,
          width: SW * 0.45,
          height: SW * 0.45,
          borderRadius: SW * 0.22,
          backgroundColor: 'rgba(255,140,0,0.09)',
        }, nebula1]}
      />

      {/* Subtle star points */}
      <NebulaStars />
    </View>
  );
}
