/**
 * AuroraBackground — Animated aurora effect with pulsing gradients,
 * drifting color blobs, and twinkling stars.
 *
 * React Native adaptation of the web aurora-background component.
 * Uses react-native-reanimated + expo-linear-gradient instead of
 * framer-motion + Tailwind CSS.
 *
 * Props:
 *   starCount      — number of twinkling star dots (default 50)
 *   colors         — [colorA, colorB] for the two nebula blobs
 *   pulseDuration  — breathing cycle in ms (default 10000)
 *   children       — content rendered above the aurora
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, withDelay,
  Easing, interpolate,
} from 'react-native-reanimated';

var W = Dimensions.get('window').width;
var H = Dimensions.get('window').height;

/* ── Twinkling star (neon-tinted) ── */
var AuroraStar = React.memo(function ({ x, y, size, delay, dur, peakOpacity, color }) {
  var o = useSharedValue(0);
  useEffect(function () {
    o.value = withDelay(delay, withRepeat(withSequence(
      withTiming(peakOpacity, { duration: dur * 0.4, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: dur * 0.6, easing: Easing.inOut(Easing.ease) })
    ), -1, true));
  }, []);
  var s = useAnimatedStyle(function () { return { opacity: o.value }; });
  var c = color || '#fff';
  var hasGlow = size > 1.2;
  return (
    <Animated.View style={[{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size,
      backgroundColor: c,
    }, hasGlow && {
      shadowColor: c,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: size * 3,
      elevation: 0,
    }, s]} />
  );
});

/* ── Drifting color blob with neon glow ── */
var ColorBlob = React.memo(function ({ color, glowColor, top, left, width, height, xRange, yRange, scaleRange, duration, baseOpacity }) {
  var p = useSharedValue(0);
  var op = baseOpacity || 0.55;
  useEffect(function () {
    p.value = withRepeat(
      withTiming(1, { duration: duration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    );
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(p.value, [0, 0.5, 1], [op * 0.7, op, op * 0.7]),
      transform: [
        { translateX: interpolate(p.value, [0, 0.5, 1], [xRange[0], xRange[1], xRange[0]]) },
        { translateY: interpolate(p.value, [0, 0.5, 1], [yRange[0], yRange[1], yRange[0]]) },
        { scale: interpolate(p.value, [0, 0.5, 1], [scaleRange[0], scaleRange[1], scaleRange[0]]) },
      ],
    };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', top: top, left: left,
      width: width, height: height, borderRadius: width / 2,
      backgroundColor: color,
      shadowColor: glowColor || color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 40,
      elevation: 0,
    }, style]} />
  );
});

/* ── Main component ── */
function AuroraBackground({
  starCount = 50,
  colors = ['rgba(168,85,247,0.35)', 'rgba(79,70,229,0.35)'],
  pulseDuration = 10000,
  children,
  style,
}) {
  var [colorA, colorB] = colors;

  /* Pulsing nebula overlay */
  var pulse = useSharedValue(0);
  useEffect(function () {
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: pulseDuration * 0.5, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: pulseDuration * 0.5, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var pulseStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.5, 0.8]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
    };
  });

  /* Secondary pulse (offset phase for colour cycling) */
  var pulse2 = useSharedValue(0);
  useEffect(function () {
    pulse2.value = withDelay(pulseDuration * 0.25, withRepeat(withSequence(
      withTiming(1, { duration: pulseDuration * 0.6, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: pulseDuration * 0.4, easing: Easing.inOut(Easing.sin) })
    ), -1, true));
  }, []);
  var pulse2Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse2.value, [0, 1], [0.3, 0.65]),
      transform: [{ scale: interpolate(pulse2.value, [0, 1], [0.95, 1.1]) }],
    };
  });

  /* Blob container fade-in */
  var blobFade = useSharedValue(0);
  useEffect(function () {
    blobFade.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) });
  }, []);
  var blobFadeStyle = useAnimatedStyle(function () { return { opacity: blobFade.value }; });

  /* Generate neon-tinted star positions once */
  var STAR_COLORS = ['#fff', '#E0AAFF', '#C77DFF', '#7DF9FF', '#FF6EC7', '#39FF14', '#FFE066', '#BDB2FF'];
  var stars = useMemo(function () {
    var a = [];
    for (var i = 0; i < starCount; i++) {
      a.push({
        id: 'as' + i,
        x: Math.random() * W,
        y: Math.random() * H,
        size: 0.5 + Math.random() * 2,
        delay: Math.random() * 5000,
        dur: 1800 + Math.random() * 3000,
        peakOpacity: 0.3 + Math.random() * 0.7,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      });
    }
    return a;
  }, [starCount]);

  return (
    <View style={[StyleSheet.absoluteFillObject, style]} pointerEvents="box-none">

      {/* ═══ Layer 1: Deep base gradient ═══ */}
      <LinearGradient
        colors={['#05000A', '#0A0018', '#080020', '#04000A']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ═══ Layer 2: Pulsing neon nebula fields ═══ */}
      <Animated.View style={[StyleSheet.absoluteFillObject, pulseStyle]}>
        <View style={[{
          position: 'absolute', top: -H * 0.15, left: -W * 0.3,
          width: W * 1.2, height: H * 0.6,
          backgroundColor: colorA,
          borderRadius: W,
          shadowColor: '#A855F7',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 60,
        }]} />
        <View style={[{
          position: 'absolute', bottom: -H * 0.2, right: -W * 0.25,
          width: W * 0.9, height: H * 0.6,
          backgroundColor: colorB,
          borderRadius: W,
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 60,
        }]} />
      </Animated.View>

      {/* ═══ Layer 2b: Secondary pulsing warm neon ═══ */}
      <Animated.View style={[StyleSheet.absoluteFillObject, pulse2Style]}>
        <View style={[{
          position: 'absolute', top: H * 0.3, left: -W * 0.1,
          width: W * 0.7, height: H * 0.4,
          backgroundColor: 'rgba(236,72,153,0.25)',
          borderRadius: W,
          shadowColor: '#EC4899',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 50,
        }]} />
        <View style={[{
          position: 'absolute', top: -H * 0.05, right: -W * 0.15,
          width: W * 0.6, height: H * 0.35,
          backgroundColor: 'rgba(6,182,212,0.2)',
          borderRadius: W,
          shadowColor: '#06B6D4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 50,
        }]} />
      </Animated.View>

      {/* ═══ Layer 3: Drifting neon blobs ═══ */}
      <Animated.View style={[StyleSheet.absoluteFillObject, blobFadeStyle]}>
        {/* Electric purple */}
        <ColorBlob
          color="rgba(168,85,247,0.55)"
          glowColor="#A855F7"
          top={-H * 0.2}
          left={-W * 0.2}
          width={W * 0.55}
          height={H * 0.45}
          xRange={[-60, 60]}
          yRange={[-25, 25]}
          scaleRange={[1, 1.25]}
          duration={25000}
          baseOpacity={0.6}
        />
        {/* Hot pink / magenta */}
        <ColorBlob
          color="rgba(236,72,153,0.5)"
          glowColor="#EC4899"
          top={H * 0.55}
          left={W * 0.45}
          width={W * 0.55}
          height={H * 0.45}
          xRange={[50, -60]}
          yRange={[25, -25]}
          scaleRange={[1, 1.3]}
          duration={32000}
          baseOpacity={0.55}
        />
        {/* Deep indigo */}
        <ColorBlob
          color="rgba(99,102,241,0.45)"
          glowColor="#6366F1"
          top={H * 0.28}
          left={W * 0.25}
          width={W * 0.4}
          height={H * 0.35}
          xRange={[25, -25]}
          yRange={[-35, 35]}
          scaleRange={[1, 1.18]}
          duration={42000}
          baseOpacity={0.5}
        />
        {/* Cyan / electric blue */}
        <ColorBlob
          color="rgba(6,182,212,0.4)"
          glowColor="#06B6D4"
          top={H * 0.05}
          left={W * 0.55}
          width={W * 0.4}
          height={H * 0.3}
          xRange={[-40, 40]}
          yRange={[15, -30]}
          scaleRange={[0.9, 1.2]}
          duration={36000}
          baseOpacity={0.45}
        />
        {/* Neon green accent */}
        <ColorBlob
          color="rgba(52,211,153,0.3)"
          glowColor="#34D399"
          top={H * 0.65}
          left={-W * 0.1}
          width={W * 0.35}
          height={H * 0.25}
          xRange={[30, -30]}
          yRange={[-20, 20]}
          scaleRange={[1, 1.15]}
          duration={28000}
          baseOpacity={0.4}
        />
        {/* Warm amber accent */}
        <ColorBlob
          color="rgba(251,191,36,0.25)"
          glowColor="#FBBF24"
          top={H * 0.42}
          left={W * 0.7}
          width={W * 0.3}
          height={H * 0.2}
          xRange={[-20, 30]}
          yRange={[20, -15]}
          scaleRange={[0.95, 1.1]}
          duration={22000}
          baseOpacity={0.35}
        />
      </Animated.View>

      {/* ═══ Layer 4: Twinkling neon stars ═══ */}
      {stars.map(function (st) {
        return (
          <AuroraStar
            key={st.id}
            x={st.x}
            y={st.y}
            size={st.size}
            delay={st.delay}
            dur={st.dur}
            peakOpacity={st.peakOpacity}
            color={st.color}
          />
        );
      })}

      {/* Foreground content */}
      {children ? <View style={az.foreground}>{children}</View> : null}
    </View>
  );
}

var az = StyleSheet.create({
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(AuroraBackground);
