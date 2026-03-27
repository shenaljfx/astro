// ═══════════════════════════════════════════════════════════════════════
//  CosmicPageBackground.js — Lightweight animated cosmic background
//  for tab pages. Uses pure Reanimated animations + CSS radial gradients.
//  NO WebGL / Three.js — safe to render on every tab simultaneously.
//
//  Each theme gets unique animated nebula glows, star shimmer, and
//  aurora-like flowing gradients with minimal GPU cost.
//
//  Usage: <CosmicPageBackground theme="blue" />
//  Themes: golden, blue, green, pink, purple
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, Easing, interpolate,
} from 'react-native-reanimated';

var { width: SW, height: SH } = Dimensions.get('window');

// ── Theme color palettes ──
var THEMES = {
  golden: {
    glow1: 'rgba(255,180,30,0.12)',
    glow2: 'rgba(200,120,10,0.08)',
    glow3: 'rgba(255,140,0,0.06)',
    nebula1: 'rgba(255,200,50,0.07)',
    nebula2: 'rgba(180,100,10,0.05)',
    aurora: 'rgba(255,184,0,0.04)',
    stars: 'rgba(255,220,100,0.9)',
    deep: 'rgba(40,20,0,0.3)',
  },
  blue: {
    glow1: 'rgba(30,100,255,0.12)',
    glow2: 'rgba(60,150,255,0.08)',
    glow3: 'rgba(20,80,200,0.06)',
    nebula1: 'rgba(40,120,255,0.07)',
    nebula2: 'rgba(15,60,180,0.05)',
    aurora: 'rgba(80,160,255,0.04)',
    stars: 'rgba(150,200,255,0.9)',
    deep: 'rgba(0,10,40,0.3)',
  },
  green: {
    glow1: 'rgba(16,200,130,0.12)',
    glow2: 'rgba(34,180,100,0.08)',
    glow3: 'rgba(10,160,90,0.06)',
    nebula1: 'rgba(20,220,140,0.07)',
    nebula2: 'rgba(10,140,80,0.05)',
    aurora: 'rgba(52,211,153,0.04)',
    stars: 'rgba(140,255,200,0.9)',
    deep: 'rgba(0,30,15,0.3)',
  },
  pink: {
    glow1: 'rgba(236,72,153,0.12)',
    glow2: 'rgba(219,39,119,0.08)',
    glow3: 'rgba(200,50,130,0.06)',
    nebula1: 'rgba(255,80,170,0.07)',
    nebula2: 'rgba(180,40,120,0.05)',
    aurora: 'rgba(244,114,182,0.04)',
    stars: 'rgba(255,180,220,0.9)',
    deep: 'rgba(40,0,20,0.3)',
  },
  purple: {
    glow1: 'rgba(140,70,255,0.12)',
    glow2: 'rgba(100,40,220,0.08)',
    glow3: 'rgba(124,58,237,0.06)',
    nebula1: 'rgba(160,80,255,0.07)',
    nebula2: 'rgba(90,30,200,0.05)',
    aurora: 'rgba(139,92,246,0.04)',
    stars: 'rgba(200,170,255,0.9)',
    deep: 'rgba(20,0,40,0.3)',
  },
};

// ── Static stars (no animation, just positioned dots) ──
function StaticStars({ color }) {
  var stars = useMemo(function () {
    var arr = [];
    for (var i = 0; i < 60; i++) {
      var size = Math.random() < 0.15 ? (2 + Math.random() * 2) : (1 + Math.random());
      arr.push({
        key: i,
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        width: size,
        height: size,
        borderRadius: size / 2,
        opacity: 0.2 + Math.random() * 0.6,
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
              backgroundColor: color,
              opacity: s.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

export default function CosmicPageBackground({ theme }) {
  var t = THEMES[theme] || THEMES.golden;

  // ── Animated glow values ──
  var glow1 = useSharedValue(0);
  var glow2 = useSharedValue(0);
  var glow3 = useSharedValue(0);
  var drift1 = useSharedValue(0);
  var drift2 = useSharedValue(0);
  var aurora = useSharedValue(0);

  useEffect(function () {
    // Pulsing nebula glows at different speeds
    glow1.value = withRepeat(
      withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    glow2.value = withRepeat(
      withDelay(800, withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    glow3.value = withRepeat(
      withDelay(1600, withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    // Slow drifting movement
    drift1.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
    drift2.value = withRepeat(
      withDelay(2000, withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) })), -1, true
    );
    // Aurora wave
    aurora.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }), -1, true
    );
  }, []);

  // ── Top-left nebula glow ──
  var nebulaStyle1 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow1.value, [0, 1], [0.3, 0.7]),
      transform: [
        { translateX: interpolate(drift1.value, [0, 1], [-15, 15]) },
        { translateY: interpolate(drift2.value, [0, 1], [-10, 10]) },
        { scale: interpolate(glow1.value, [0, 1], [0.9, 1.15]) },
      ],
    };
  });

  // ── Bottom-right nebula glow ──
  var nebulaStyle2 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow2.value, [0, 1], [0.2, 0.55]),
      transform: [
        { translateX: interpolate(drift2.value, [0, 1], [10, -20]) },
        { translateY: interpolate(drift1.value, [0, 1], [8, -12]) },
        { scale: interpolate(glow2.value, [0, 1], [0.85, 1.1]) },
      ],
    };
  });

  // ── Center diffuse glow ──
  var nebulaStyle3 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow3.value, [0, 1], [0.15, 0.4]),
      transform: [
        { scale: interpolate(glow3.value, [0, 1], [1.0, 1.2]) },
      ],
    };
  });

  // ── Aurora band at top ──
  var auroraStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(aurora.value, [0, 0.5, 1], [0.15, 0.45, 0.15]),
      transform: [
        { translateX: interpolate(drift1.value, [0, 1], [-30, 30]) },
        { scaleX: interpolate(aurora.value, [0, 1], [0.95, 1.08]) },
      ],
    };
  });

  // ── Deep space overlay pulse ──
  var deepStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow1.value, [0, 1], [0.6, 0.4]),
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep space base */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.deep }, deepStyle]} />

      {/* Aurora band — top of screen */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: -SH * 0.05,
          left: -SW * 0.15,
          right: -SW * 0.15,
          height: SH * 0.25,
          borderRadius: SH * 0.12,
          backgroundColor: t.aurora,
        }, auroraStyle]}
      />

      {/* Nebula glow 1 — top-left */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.05,
          left: -SW * 0.1,
          width: SW * 0.7,
          height: SW * 0.7,
          borderRadius: SW * 0.35,
          backgroundColor: t.glow1,
        }, nebulaStyle1]}
      />

      {/* Nebula glow 2 — bottom-right */}
      <Animated.View
        style={[{
          position: 'absolute',
          bottom: SH * 0.05,
          right: -SW * 0.1,
          width: SW * 0.65,
          height: SW * 0.65,
          borderRadius: SW * 0.325,
          backgroundColor: t.glow2,
        }, nebulaStyle2]}
      />

      {/* Center diffuse glow */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.3,
          left: SW * 0.1,
          width: SW * 0.8,
          height: SH * 0.35,
          borderRadius: SW * 0.3,
          backgroundColor: t.nebula1,
        }, nebulaStyle3]}
      />

      {/* Subtle accent glow — mid-left */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: SH * 0.55,
          left: -SW * 0.05,
          width: SW * 0.5,
          height: SW * 0.5,
          borderRadius: SW * 0.25,
          backgroundColor: t.nebula2,
        }, nebulaStyle1]}
      />

      {/* Static star points */}
      <StaticStars color={t.stars} />

      {/* Very subtle glass overlay for readability */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
      />
    </View>
  );
}
