// ═══════════════════════════════════════════════════════════════════════
//  ThemedNebulaBg.js — Universal themed nebula overlay for bottom content
//  Pure Reanimated animations — no WebGL.
//  Props: theme = 'golden' | 'blue' | 'green' | 'pink' | 'purple'
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withDelay, Easing, interpolate,
} from 'react-native-reanimated';

var { width: SW, height: SH } = Dimensions.get('window');

// ── Theme palettes for orbs and stars ──
var THEMES = {
  golden: {
    orb1: 'rgba(255,180,30,0.18)',
    orb2: 'rgba(200,120,10,0.15)',
    orb3: 'rgba(255,200,50,0.10)',
    orb4: 'rgba(180,100,10,0.12)',
    orb5: 'rgba(255,140,0,0.09)',
    stars: 'rgba(255,220,100,0.85)',
  },
  blue: {
    orb1: 'rgba(30,100,255,0.18)',
    orb2: 'rgba(20,60,180,0.15)',
    orb3: 'rgba(40,130,255,0.10)',
    orb4: 'rgba(15,50,150,0.12)',
    orb5: 'rgba(50,120,240,0.09)',
    stars: 'rgba(150,200,255,0.85)',
  },
  green: {
    orb1: 'rgba(16,200,100,0.18)',
    orb2: 'rgba(10,150,70,0.15)',
    orb3: 'rgba(30,220,120,0.10)',
    orb4: 'rgba(8,120,55,0.12)',
    orb5: 'rgba(20,180,90,0.09)',
    stars: 'rgba(140,255,190,0.85)',
  },
  pink: {
    orb1: 'rgba(236,72,153,0.18)',
    orb2: 'rgba(200,40,110,0.15)',
    orb3: 'rgba(255,100,170,0.10)',
    orb4: 'rgba(180,30,95,0.12)',
    orb5: 'rgba(240,60,140,0.09)',
    stars: 'rgba(255,180,215,0.85)',
  },
  purple: {
    orb1: 'rgba(140,60,255,0.18)',
    orb2: 'rgba(100,30,200,0.15)',
    orb3: 'rgba(170,90,255,0.10)',
    orb4: 'rgba(80,20,170,0.12)',
    orb5: 'rgba(130,50,230,0.09)',
    stars: 'rgba(200,170,255,0.85)',
  },
  orange: {
    orb1: 'rgba(255,100,10,0.18)',
    orb2: 'rgba(220,55,5,0.15)',
    orb3: 'rgba(255,130,30,0.10)',
    orb4: 'rgba(200,40,2,0.12)',
    orb5: 'rgba(240,80,8,0.09)',
    stars: 'rgba(255,180,100,0.85)',
  },
};

// ── Tiny static star dots ──
function NebulaStars({ color }) {
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
              backgroundColor: color,
              opacity: s.opacity,
            }}
          />
        );
      })}
    </View>
  );
}

export default function ThemedNebulaBg({ theme }) {
  var t = THEMES[theme] || THEMES.golden;

  var glow1 = useSharedValue(0);
  var glow2 = useSharedValue(0);
  var glow3 = useSharedValue(0);
  var drift1 = useSharedValue(0);
  var drift2 = useSharedValue(0);
  var pulse = useSharedValue(0);

  useEffect(function () {
    glow1.value = withRepeat(withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow2.value = withRepeat(withDelay(1200, withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) })), -1, true);
    glow3.value = withRepeat(withDelay(2500, withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.ease) })), -1, true);
    drift1.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.ease) }), -1, true);
    drift2.value = withRepeat(withDelay(3500, withTiming(1, { duration: 22000, easing: Easing.inOut(Easing.ease) })), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

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

  var nebula3 = useAnimatedStyle(function () {
    return {
      opacity: interpolate(glow3.value, [0, 1], [0.03, 0.10]),
      transform: [
        { translateX: interpolate(drift1.value, [0, 1], [10, -10]) },
        { scale: interpolate(glow3.value, [0, 1], [1.0, 1.18]) },
      ],
    };
  });

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
      style={{ position: 'absolute', top: SH * 0.35, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['transparent', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.08 }}
        pointerEvents="none"
      />
      <Animated.View style={[{ position: 'absolute', top: SH * 0.04, left: -SW * 0.12, width: SW * 0.85, height: SW * 0.85, borderRadius: SW * 0.42, backgroundColor: t.orb1 }, nebula1]} />
      <Animated.View style={[{ position: 'absolute', bottom: SH * 0.02, right: -SW * 0.10, width: SW * 0.75, height: SW * 0.75, borderRadius: SW * 0.37, backgroundColor: t.orb2 }, nebula2]} />
      <Animated.View style={[{ position: 'absolute', top: SH * 0.12, left: SW * 0.05, width: SW * 0.90, height: SH * 0.35, borderRadius: SW * 0.30, backgroundColor: t.orb3 }, nebula3]} />
      <Animated.View style={[{ position: 'absolute', bottom: SH * 0.06, left: -SW * 0.05, width: SW * 0.60, height: SW * 0.60, borderRadius: SW * 0.30, backgroundColor: t.orb4 }, nebula4]} />
      <Animated.View style={[{ position: 'absolute', top: SH * 0.10, right: SW * 0.02, width: SW * 0.45, height: SW * 0.45, borderRadius: SW * 0.22, backgroundColor: t.orb5 }, nebula1]} />
      <NebulaStars color={t.stars} />
    </View>
  );
}
