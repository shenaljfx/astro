/**
 * CosmicBackground.js - Deep space canvas with zodiac constellation star patterns
 * Multi-layer gradient + MilkyWay nebula aurora + twinkling stars + shooting stars
 * + Accurate IAU zodiac constellation patterns rotating in background
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, G } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing, FadeIn,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';
import MilkyWay from './MilkyWay';

const { width, height } = Dimensions.get('window');

/* ================================================================
   ACCURATE ZODIAC CONSTELLATION STAR PATTERNS
   Real star positions (normalized 0-1) based on IAU patterns
   ================================================================ */
const ZODIAC_CONSTELLATIONS = [
  {
    name: 'Aries',
    stars: [[0.25,0.35],[0.38,0.28],[0.52,0.22],[0.60,0.30]],
    lines: [[0,1],[1,2],[2,3]],
    color: '#EF4444',
  },
  {
    name: 'Taurus',
    stars: [[0.20,0.42],[0.30,0.35],[0.38,0.30],[0.48,0.25],[0.55,0.20],[0.42,0.38],[0.50,0.45],[0.55,0.50],[0.62,0.48],[0.58,0.55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[6,7],[7,8],[7,9]],
    color: '#10B981',
  },
  {
    name: 'Gemini',
    stars: [[0.30,0.15],[0.28,0.30],[0.25,0.45],[0.22,0.58],[0.50,0.15],[0.48,0.30],[0.45,0.45],[0.42,0.55],[0.35,0.32]],
    lines: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[1,8],[8,5]],
    color: '#FBBF24',
  },
  {
    name: 'Cancer',
    stars: [[0.35,0.35],[0.45,0.30],[0.55,0.35],[0.48,0.48],[0.40,0.50]],
    lines: [[0,1],[1,2],[1,3],[3,4],[4,0]],
    color: '#8B5CF6',
  },
  {
    name: 'Leo',
    stars: [[0.20,0.55],[0.28,0.42],[0.35,0.30],[0.48,0.25],[0.58,0.30],[0.55,0.42],[0.48,0.50],[0.60,0.55],[0.70,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8]],
    color: '#F59E0B',
  },
  {
    name: 'Virgo',
    stars: [[0.22,0.28],[0.32,0.22],[0.42,0.28],[0.52,0.35],[0.60,0.42],[0.48,0.48],[0.38,0.52],[0.55,0.58],[0.65,0.55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[5,7],[4,8]],
    color: '#10B981',
  },
  {
    name: 'Libra',
    stars: [[0.30,0.50],[0.42,0.35],[0.58,0.35],[0.70,0.50],[0.50,0.22]],
    lines: [[0,1],[1,2],[2,3],[1,4],[4,2]],
    color: '#3B82F6',
  },
  {
    name: 'Scorpio',
    stars: [[0.12,0.30],[0.22,0.25],[0.32,0.30],[0.42,0.28],[0.52,0.32],[0.60,0.40],[0.68,0.50],[0.75,0.55],[0.82,0.48],[0.88,0.42]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
    color: '#EF4444',
  },
  {
    name: 'Sagittarius',
    stars: [[0.25,0.60],[0.35,0.45],[0.45,0.35],[0.55,0.25],[0.50,0.50],[0.40,0.55],[0.60,0.40],[0.65,0.30]],
    lines: [[0,1],[1,2],[2,3],[2,4],[4,5],[5,0],[2,6],[6,7]],
    color: '#F59E0B',
  },
  {
    name: 'Capricorn',
    stars: [[0.22,0.30],[0.35,0.22],[0.50,0.28],[0.60,0.38],[0.55,0.52],[0.42,0.55],[0.30,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]],
    color: '#10B981',
  },
  {
    name: 'Aquarius',
    stars: [[0.18,0.25],[0.30,0.22],[0.42,0.28],[0.55,0.25],[0.65,0.30],[0.58,0.42],[0.48,0.48],[0.35,0.55],[0.25,0.50]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]],
    color: '#3B82F6',
  },
  {
    name: 'Pisces',
    stars: [[0.18,0.40],[0.28,0.32],[0.38,0.28],[0.50,0.35],[0.60,0.30],[0.72,0.35],[0.80,0.42],[0.70,0.50],[0.58,0.48],[0.48,0.52]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,3]],
    color: '#8B5CF6',
  },
];

/* ── Zodiac Constellation Background Layer ── */
const ZodiacConstellationLayer = React.memo(() => {
  // Place 4-5 constellations at different positions across the sky
  const placements = useMemo(() => {
    const selected = [];
    const used = new Set();
    const positions = [
      { x: 0.05, y: 0.08, size: 120, opacity: 0.12 },
      { x: 0.55, y: 0.05, size: 140, opacity: 0.10 },
      { x: 0.70, y: 0.35, size: 110, opacity: 0.08 },
      { x: 0.02, y: 0.55, size: 130, opacity: 0.10 },
      { x: 0.45, y: 0.65, size: 100, opacity: 0.07 },
    ];
    for (let i = 0; i < positions.length; i++) {
      let idx;
      do { idx = Math.floor(Math.random() * 12); } while (used.has(idx));
      used.add(idx);
      selected.push({
        constellation: ZODIAC_CONSTELLATIONS[idx],
        ...positions[i],
        rotateStart: Math.random() * 360,
        duration: 80000 + Math.random() * 40000,
        delay: i * 800,
      });
    }
    return selected;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {placements.map((p, i) => (
        <AnimatedConstellation key={i} {...p} />
      ))}
    </View>
  );
});

const AnimatedConstellation = React.memo(({ constellation, x, y, size, opacity, rotateStart, duration, delay }) => {
  const rotation = useSharedValue(rotateStart);
  const breathe = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    rotation.value = withDelay(delay,
      withRepeat(withTiming(rotateStart + 360, { duration, easing: Easing.linear }), -1)
    );
    breathe.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true)
    );
    drift.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true)
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: rotation.value + 'deg' },
      { translateX: drift.value * 3 },
      { translateY: drift.value * 2 },
    ],
    opacity: interpolate(breathe.value, [0, 1], [opacity * 0.6, opacity]),
  }));

  const { stars, lines, color } = constellation;

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: x * width,
      top: y * height,
      width: size,
      height: size,
    }, animStyle]}>
      <Svg width={size} height={size}>
        {/* Constellation lines */}
        {lines.map(([a, b], li) => (
          <Line key={'l' + li}
            x1={stars[a][0] * size} y1={stars[a][1] * size}
            x2={stars[b][0] * size} y2={stars[b][1] * size}
            stroke={color} strokeWidth={0.5} strokeOpacity={0.35}
          />
        ))}
        {/* Star points */}
        {stars.map((s, si) => (
          <React.Fragment key={'s' + si}>
            {/* Outer glow */}
            <Circle cx={s[0] * size} cy={s[1] * size} r={3}
              fill={color} opacity={0.1} />
            {/* Core star */}
            <Circle cx={s[0] * size} cy={s[1] * size} r={1.2}
              fill="#fff" opacity={0.7} />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
});

/* ── Realistic Star with diffraction spikes + layered glow ── */
const Star = React.memo(({ size, top, left, delay, duration, color, type }) => {
  const starType = type ?? (size > 2.2 ? 2 : size > 1.2 ? 1 : 0);

  const breathe = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    breathe.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming(1, { duration: duration * 1.2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration * 1.4, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));

    drift.value = withDelay(delay,
      withRepeat(withSequence(
        withTiming(1, { duration: duration * 3, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: duration * 3, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  // Type 0: Tiny distant star
  if (starType === 0) {
    const tinyStyle = useAnimatedStyle(() => ({
      opacity: interpolate(breathe.value, [0, 1], [0.15, 0.55]),
    }));
    return (
      <Animated.View style={[{
        position: 'absolute', top, left,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color || '#E2E8F0',
      }, tinyStyle]} />
    );
  }

  // Type 1: Medium star
  if (starType === 1) {
    const haloSize = size * 4;
    const medStyle = useAnimatedStyle(() => ({
      opacity: interpolate(breathe.value, [0, 1], [0.25, 0.75]),
      transform: [
        { scale: interpolate(breathe.value, [0, 1], [0.9, 1.05]) },
        { translateX: drift.value * 0.3 },
      ],
    }));
    return (
      <Animated.View style={[{
        position: 'absolute', top: top - haloSize / 2 + size / 2,
        left: left - haloSize / 2 + size / 2,
        width: haloSize, height: haloSize,
        alignItems: 'center', justifyContent: 'center',
      }, medStyle]}>
        <View style={{
          position: 'absolute', width: haloSize, height: haloSize,
          borderRadius: haloSize / 2,
          backgroundColor: color || '#C084FC', opacity: 0.06,
        }} />
        <View style={{
          position: 'absolute', width: size * 2.2, height: size * 2.2,
          borderRadius: size * 1.1,
          backgroundColor: '#fff', opacity: 0.12,
        }} />
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: '#fff',
          shadowColor: color || '#C084FC',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9, shadowRadius: size * 3, elevation: 3,
        }} />
      </Animated.View>
    );
  }

  // Type 2: Bright star with diffraction spikes
  const spikeLen = size * 5;
  const haloSize = size * 6;
  const brightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.35, 0.95]),
    transform: [
      { scale: interpolate(breathe.value, [0, 1], [0.85, 1.08]) },
      { rotate: interpolate(breathe.value, [0, 1], [0, 8]) + 'deg' },
      { translateX: drift.value * 0.5 },
    ],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute',
      top: top - haloSize / 2 + size / 2,
      left: left - haloSize / 2 + size / 2,
      width: haloSize, height: haloSize,
      alignItems: 'center', justifyContent: 'center',
    }, brightStyle]}>
      <View style={{
        position: 'absolute', width: haloSize, height: haloSize,
        borderRadius: haloSize / 2,
        backgroundColor: color || '#C084FC', opacity: 0.05,
      }} />
      <View style={{
        position: 'absolute', width: 1, height: spikeLen,
        backgroundColor: '#fff', opacity: 0.25, borderRadius: 0.5,
        shadowColor: color || '#E8DAFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 3, elevation: 1,
      }} />
      <View style={{
        position: 'absolute', width: spikeLen, height: 1,
        backgroundColor: '#fff', opacity: 0.25, borderRadius: 0.5,
        shadowColor: color || '#E8DAFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 3, elevation: 1,
      }} />
      <View style={{
        position: 'absolute', width: spikeLen * 0.6, height: 0.5,
        backgroundColor: '#fff', opacity: 0.12,
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute', width: spikeLen * 0.6, height: 0.5,
        backgroundColor: '#fff', opacity: 0.12,
        transform: [{ rotate: '-45deg' }],
      }} />
      <View style={{
        position: 'absolute', width: size * 2.8, height: size * 2.8,
        borderRadius: size * 1.4,
        backgroundColor: '#fff', opacity: 0.08,
      }} />
      <View style={{
        position: 'absolute', width: size * 1.6, height: size * 1.6,
        borderRadius: size * 0.8,
        backgroundColor: '#fff', opacity: 0.2,
      }} />
      <View style={{
        width: size * 0.9, height: size * 0.9,
        borderRadius: size * 0.45,
        backgroundColor: '#fff',
        shadowColor: color || '#C084FC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: size * 4, elevation: 5,
      }} />
    </Animated.View>
  );
});

/* ── Shooting Star ── */
const ShootingStar = React.memo(({ dly, startX, startY, angle }) => {
  const prog = useSharedValue(0);
  const dist = width * 1.4;
  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  useEffect(() => {
    const pause = 6000 + Math.random() * 8000;
    prog.value = withDelay(dly,
      withRepeat(withSequence(
        withTiming(1, { duration: 800, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 0 }),
        withDelay(pause, withTiming(0, { duration: 0 })),
      ), -1));
  }, []);

  const head = useAnimatedStyle(() => {
    const t = prog.value;
    return {
      transform: [
        { translateX: startX + t * dist * cosA },
        { translateY: startY + t * dist * sinA },
      ],
      opacity: interpolate(t, [0, 0.03, 0.6, 1], [0, 1, 0.8, 0]),
    };
  });

  const tail = useAnimatedStyle(() => {
    const t = Math.max(0, prog.value - 0.05);
    return {
      transform: [
        { translateX: startX + t * dist * cosA },
        { translateY: startY + t * dist * sinA },
        { rotate: angle + 'deg' },
      ],
      opacity: interpolate(prog.value, [0, 0.08, 0.5, 1], [0, 0.7, 0.4, 0]),
      width: 55,
    };
  });

  const tailFade = useAnimatedStyle(() => {
    const t = Math.max(0, prog.value - 0.12);
    return {
      transform: [
        { translateX: startX + t * dist * cosA },
        { translateY: startY + t * dist * sinA },
        { rotate: angle + 'deg' },
      ],
      opacity: interpolate(prog.value, [0, 0.1, 0.5, 1], [0, 0.4, 0.2, 0]),
      width: 35,
    };
  });

  return (
    <>
      <Animated.View style={[{ position:'absolute', height:2, borderRadius:1, backgroundColor:'rgba(251,191,36,0.25)' }, tailFade]} />
      <Animated.View style={[{ position:'absolute', height:2.5, borderRadius:1.5, backgroundColor:'rgba(255,220,120,0.6)' }, tail]} />
      <Animated.View style={[{ position:'absolute', width:6, height:6, borderRadius:3 }, head]}>
        <View style={{ width:6, height:6, borderRadius:3, backgroundColor:'#fff',
          shadowColor:'#FBBF24', shadowOpacity:1, shadowRadius:14, elevation:8,
          shadowOffset:{ width:0, height:0 } }} />
      </Animated.View>
    </>
  );
});

/* ── Scroll Hint ── */
const ScrollHint = React.memo(() => {
  const bounce = useSharedValue(0);
  const op = useSharedValue(0.6);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ), -1, true);
    op.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 1200 }),
        withTiming(0.7, { duration: 1200 }),
      ), -1, true);
  }, []);
  const st = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
    opacity: op.value,
  }));
  return (
    <Animated.View style={[{
      position: 'absolute', bottom: 85, alignSelf: 'center',
      alignItems: 'center',
    }, st]}>
      <View style={{ width: 20, height: 32, borderRadius: 10, borderWidth: 1.5,
        borderColor: 'rgba(192,132,252,0.4)', alignItems: 'center', paddingTop: 6 }}>
        <View style={{ width: 3, height: 8, borderRadius: 1.5,
          backgroundColor: '#FBBF24', shadowColor: '#FBBF24',
          shadowOpacity: 0.8, shadowRadius: 4, elevation: 3 }} />
      </View>
    </Animated.View>
  );
});

/* ── Main Export ── */
export default function CosmicBackground({ children, showScrollHint = false }) {
  const stars = useMemo(() => {
    const coolColors = ['#E2E8F0', '#D4D4F7', '#C9D6FF', '#B8C9F2', '#E8DAFF'];
    const warmColors = ['#FDE68A', '#FBBF24', '#F8D5A8'];
    const vividColors = ['#C084FC', '#818CF8', '#93C5FD', '#A78BFA', '#F0ABFC'];
    const allStars = [];

    // Layer 1: Many tiny distant dots
    for (let i = 0; i < 45; i++) {
      allStars.push({
        id: i,
        size: 0.4 + Math.random() * 1.0,
        top: Math.random() * height,
        left: Math.random() * width,
        delay: Math.random() * 8000,
        duration: 4000 + Math.random() * 6000,
        color: coolColors[Math.floor(Math.random() * coolColors.length)],
        type: 0,
      });
    }

    // Layer 2: Medium glow stars
    for (let i = 0; i < 18; i++) {
      allStars.push({
        id: 45 + i,
        size: 1.2 + Math.random() * 1.2,
        top: Math.random() * height,
        left: Math.random() * width,
        delay: Math.random() * 6000,
        duration: 3000 + Math.random() * 4000,
        color: [...coolColors, ...vividColors][Math.floor(Math.random() * (coolColors.length + vividColors.length))],
        type: 1,
      });
    }

    // Layer 3: Bright stars with diffraction spikes
    for (let i = 0; i < 7; i++) {
      allStars.push({
        id: 63 + i,
        size: 2.0 + Math.random() * 1.5,
        top: Math.random() * height * 0.85 + height * 0.05,
        left: Math.random() * width * 0.85 + width * 0.05,
        delay: Math.random() * 5000,
        duration: 2500 + Math.random() * 3500,
        color: [...vividColors, ...warmColors][Math.floor(Math.random() * (vividColors.length + warmColors.length))],
        type: 2,
      });
    }

    return allStars;
  }, []);

  return (
    <View style={bgS.container}>
      {/* Deep space gradient */}
      <LinearGradient
        colors={['#030014', '#0a0520', '#0f0a2e', '#06021a', '#030014']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Nebula aurora layer */}
      <MilkyWay />

      {/* Zodiac constellation patterns (ambient background) */}
      <ZodiacConstellationLayer />

      {/* Star field */}
      {stars.map(s => <Star key={s.id} {...s} />)}

      {/* Shooting stars */}
      <ShootingStar dly={3000} startX={-10} startY={100} angle={32} />
      <ShootingStar dly={9000} startX={width * 0.4} startY={-5} angle={36} />
      <ShootingStar dly={16000} startX={width * 0.6} startY={50} angle={28} />

      {/* Content */}
      <View style={StyleSheet.absoluteFillObject}>
        {children}
      </View>

      {/* Scroll hint indicator */}
      {showScrollHint && <ScrollHint />}
    </View>
  );
}

/* ── Also export the constellation data for use in loading screens ── */
export { ZODIAC_CONSTELLATIONS, ZodiacConstellationLayer };

const bgS = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030014' },
});
