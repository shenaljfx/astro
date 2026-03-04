/**
 * MilkyWay.js — World-Class Vivid Aurora Borealis
 * High-visibility aurora using LinearGradient bands + SVG nebula.
 * Beautiful on real devices, not just simulators.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path, Circle, Defs, RadialGradient, Stop, Ellipse, Line,
  LinearGradient as SvgLG,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

/* ====================================================
   1. AURORA BAND — Visible glowing gradient strip
   Uses expo-linear-gradient for maximum device visibility.
   Wide band that sways + breathes + stretches.
   ==================================================== */
const AuroraBand = React.memo(({
  colors, locations,
  x, y, w, h, rotation,
  swayX, swayY, breatheMin, breatheMax,
  scaleXMin, scaleXMax,
  swayDur, breatheDur, delayMs,
  borderRadius,
}) => {
  const sway = useSharedValue(0);
  const breathe = useSharedValue(breatheMin);
  const stretch = useSharedValue(scaleXMin || 1);

  useEffect(() => {
    // Organic multi-point sway
    sway.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(1, { duration: swayDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(-0.7, { duration: swayDur * 0.9, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: swayDur * 0.7, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: swayDur * 1.1, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));

    // Opacity breathing
    breathe.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(breatheMax, { duration: breatheDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(breatheMin, { duration: breatheDur * 1.15, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));

    // Horizontal stretch
    if (scaleXMax) {
      stretch.value = withDelay(delayMs,
        withRepeat(withSequence(
          withTiming(scaleXMax, { duration: swayDur * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(scaleXMin || 1, { duration: swayDur * 1.5, easing: Easing.inOut(Easing.sin) }),
        ), -1, true));
    }
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: breathe.value,
    transform: [
      { translateX: sway.value * (swayX || 20) },
      { translateY: sway.value * (swayY || 5) * -0.5 },
      { scaleX: stretch.value },
    ],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: x, top: y,
      width: w, height: h,
      transform: [{ rotate: (rotation || '0') + 'deg' }],
    }, animStyle]}>
      <LinearGradient
        colors={colors}
        locations={locations || undefined}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          flex: 1,
          borderRadius: borderRadius || w * 0.4,
        }}
      />
    </Animated.View>
  );
});

/* ====================================================
   2. AURORA RIBBON — SVG Path for organic wave shapes
   These overlay the bands for complex edge detail.
   ==================================================== */
const AuroraRibbon = React.memo(({
  pathData, gradientColors, gradientStops,
  width: svgW, height: svgH, x, y,
  swayAmount, breatheMin, breatheMax,
  swayDur, breatheDur, delayMs,
}) => {
  const sway = useSharedValue(0);
  const breathe = useSharedValue(breatheMin);

  useEffect(() => {
    sway.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(1, { duration: swayDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: swayDur * 1.1, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
    breathe.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(breatheMax, { duration: breatheDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(breatheMin, { duration: breatheDur * 1.2, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  const st = useAnimatedStyle(() => ({
    opacity: breathe.value,
    transform: [
      { translateX: sway.value * swayAmount },
      { scaleX: interpolate(sway.value, [-1, 0, 1], [0.95, 1, 1.05]) },
    ],
  }));

  const gId = 'ar_' + (x | 0) + '_' + (y | 0);
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: svgW, height: svgH }, st]}>
      <Svg width={svgW} height={svgH}>
        <Defs>
          <SvgLG id={gId} x1="50%" y1="0%" x2="50%" y2="100%">
            {gradientColors.map((c, i) => (
              <Stop key={i} offset={(gradientStops ? gradientStops[i] : (i / (gradientColors.length - 1))) * 100 + '%'}
                stopColor={c.color} stopOpacity={c.opacity + ''} />
            ))}
          </SvgLG>
        </Defs>
        <Path d={pathData} fill={'url(#' + gId + ')'} />
      </Svg>
    </Animated.View>
  );
});

/* ====================================================
   3. NEBULA GLOW — large soft radial color wash
   ==================================================== */
const NebulaGlow = React.memo(({ cx, cy, size, color, minOp, maxOp, dur, delayMs }) => {
  const op = useSharedValue(minOp);
  const sc = useSharedValue(0.95);
  useEffect(() => {
    op.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(maxOp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(minOp, { duration: dur * 1.1, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
    sc.value = withDelay(delayMs,
      withRepeat(withSequence(
        withTiming(1.05, { duration: dur * 1.2, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: dur * 1.2, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[{
      position: 'absolute',
      left: cx - size / 2, top: cy - size / 2,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
    }, st]} />
  );
});

/* ====================================================
   4. CONSTELLATION — connected star patterns
   ==================================================== */
const Constellation = React.memo(({ points, lineColor, delay: dly }) => {
  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(dly,
      withRepeat(withSequence(
        withTiming(0.35, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.08, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);
  const st = useAnimatedStyle(() => ({ opacity: op.value }));
  const lines = [];
  for (let i = 0; i < points.length - 1; i++) {
    lines.push({ x1: points[i][0], y1: points[i][1], x2: points[i + 1][0], y2: points[i + 1][1] });
  }
  return (
    <Animated.View style={[StyleSheet.absoluteFill, st]} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {lines.map((l, i) => (
          <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={lineColor || 'rgba(192,132,252,0.4)'} strokeWidth={0.6} />
        ))}
        {points.map((p, i) => (
          <Circle key={'cp' + i} cx={p[0]} cy={p[1]} r={p[2] || 1.5}
            fill="#F0E6FF" opacity={0.8} />
        ))}
      </Svg>
    </Animated.View>
  );
});

/* ====================================================
   SVG RIBBON PATH GENERATORS
   Create organic wave shapes for aurora ribbons
   ==================================================== */
function makeRibbonPath(w, h, waviness) {
  const wv = waviness || 0.1;
  return [
    'M', 0, h * 0.15,
    'C', w * 0.15, h * (0.15 - wv), w * 0.3, h * (0.15 + wv * 0.5), w * 0.45, h * 0.12,
    'C', w * 0.6, h * (0.12 - wv * 0.7), w * 0.8, h * (0.12 + wv), w, h * 0.1,
    'L', w, h * 0.55,
    'C', w * 0.85, h * (0.55 + wv), w * 0.65, h * (0.55 - wv * 0.8), w * 0.5, h * 0.6,
    'C', w * 0.35, h * (0.6 + wv * 0.6), w * 0.15, h * (0.6 - wv), 0, h * 0.65,
    'Z',
  ].join(' ');
}

function makeWideRibbonPath(w, h) {
  return [
    'M', 0, 0,
    'C', w * 0.25, h * 0.02, w * 0.5, -h * 0.01, w, h * 0.02,
    'L', w, h * 0.7,
    'C', w * 0.7, h * 0.75, w * 0.4, h * 0.65, w * 0.15, h * 0.72,
    'C', w * 0.05, h * 0.73, 0, h * 0.71, 0, h * 0.68,
    'Z',
  ].join(' ');
}

/* ====================================================
   DATA
   ==================================================== */
function genConstellations() {
  return [
    { points: [[W*0.72,H*0.07,2],[W*0.78,H*0.13,1.5],[W*0.68,H*0.15,1.8],[W*0.72,H*0.07,2]], delay: 2000, lineColor: 'rgba(251,191,36,0.35)' },
    { points: [[W*0.06,H*0.34,1.5],[W*0.12,H*0.30,2],[W*0.18,H*0.36,1.2],[W*0.24,H*0.32,1.8],[W*0.28,H*0.38,1.5]], delay: 5000, lineColor: 'rgba(52,211,153,0.3)' },
    { points: [[W*0.55,H*0.70,1.8],[W*0.60,H*0.66,1.5],[W*0.65,H*0.70,2],[W*0.60,H*0.74,1.5],[W*0.55,H*0.70,1.8]], delay: 8000, lineColor: 'rgba(192,132,252,0.35)' },
    { points: [[W*0.14,H*0.11,1.2],[W*0.22,H*0.07,2],[W*0.30,H*0.09,1.5],[W*0.36,H*0.14,1.8]], delay: 12000, lineColor: 'rgba(236,72,153,0.3)' },
    { points: [[W*0.82,H*0.43,1.5],[W*0.87,H*0.40,2],[W*0.91,H*0.44,1.2]], delay: 7000, lineColor: 'rgba(6,182,212,0.35)' },
  ];
}

/* ====================================================
   MAIN COMPONENT
   ==================================================== */
const MilkyWay = React.memo(({ style }) => {
  const constellations = useMemo(() => genConstellations(), []);
  const ribbonW = W * 1.2;
  const ribbonH = H * 0.45;

  return (
    <View style={[mwS.container, style]} pointerEvents="none">

      {/* ---- LAYER 1: Deep nebula glows (background color wash) ---- */}
      <NebulaGlow cx={W * 0.15} cy={H * 0.10} size={220} color="#10B981" minOp={0.04} maxOp={0.12} dur={14000} delayMs={0} />
      <NebulaGlow cx={W * 0.85} cy={H * 0.18} size={200} color="#06B6D4" minOp={0.03} maxOp={0.10} dur={16000} delayMs={3000} />
      <NebulaGlow cx={W * 0.50} cy={H * 0.30} size={260} color="#7C3AED" minOp={0.04} maxOp={0.11} dur={13000} delayMs={1000} />
      <NebulaGlow cx={W * 0.25} cy={H * 0.55} size={180} color="#EC4899" minOp={0.03} maxOp={0.09} dur={15000} delayMs={5000} />
      <NebulaGlow cx={W * 0.75} cy={H * 0.65} size={200} color="#FBBF24" minOp={0.03} maxOp={0.08} dur={17000} delayMs={7000} />
      <NebulaGlow cx={W * 0.50} cy={H * 0.85} size={180} color="#4F46E5" minOp={0.03} maxOp={0.09} dur={14000} delayMs={4000} />

      {/* ---- LAYER 2: AURORA BANDS (high-visibility gradient strips) ---- */}

      {/* PRIMARY: Emerald green aurora — the hero curtain */}
      <AuroraBand
        colors={['transparent', 'rgba(16,185,129,0.35)', 'rgba(52,211,153,0.25)', 'rgba(16,185,129,0.15)', 'transparent']}
        locations={[0, 0.2, 0.45, 0.7, 1]}
        x={-W * 0.1} y={-H * 0.05} w={W * 0.7} h={H * 0.75}
        rotation={-5}
        swayX={30} swayY={8}
        breatheMin={0.3} breatheMax={0.85}
        scaleXMin={0.9} scaleXMax={1.15}
        swayDur={10000} breatheDur={8000} delayMs={0}
        borderRadius={W * 0.35}
      />

      {/* Teal / Cyan accent — right side */}
      <AuroraBand
        colors={['transparent', 'rgba(6,182,212,0.30)', 'rgba(34,211,238,0.20)', 'rgba(6,182,212,0.10)', 'transparent']}
        locations={[0, 0.15, 0.4, 0.65, 1]}
        x={W * 0.35} y={-H * 0.02} w={W * 0.6} h={H * 0.65}
        rotation={8}
        swayX={25} swayY={6}
        breatheMin={0.25} breatheMax={0.75}
        scaleXMin={0.92} scaleXMax={1.12}
        swayDur={12000} breatheDur={9500} delayMs={2500}
        borderRadius={W * 0.3}
      />

      {/* Violet / Purple deep aurora — left backdrop */}
      <AuroraBand
        colors={['transparent', 'rgba(124,58,237,0.28)', 'rgba(167,139,250,0.18)', 'rgba(99,102,241,0.12)', 'transparent']}
        locations={[0, 0.2, 0.5, 0.75, 1]}
        x={-W * 0.15} y={H * 0.02} w={W * 0.55} h={H * 0.6}
        rotation={-12}
        swayX={22} swayY={5}
        breatheMin={0.2} breatheMax={0.7}
        scaleXMin={0.93} scaleXMax={1.1}
        swayDur={11000} breatheDur={8500} delayMs={1500}
        borderRadius={W * 0.28}
      />

      {/* Rose / Pink warm accent — center-right */}
      <AuroraBand
        colors={['transparent', 'rgba(236,72,153,0.22)', 'rgba(244,114,182,0.15)', 'rgba(219,39,119,0.08)', 'transparent']}
        locations={[0, 0.25, 0.5, 0.7, 1]}
        x={W * 0.15} y={H * 0.06} w={W * 0.5} h={H * 0.5}
        rotation={5}
        swayX={18} swayY={4}
        breatheMin={0.15} breatheMax={0.55}
        scaleXMin={0.95} scaleXMax={1.08}
        swayDur={13000} breatheDur={10000} delayMs={4500}
        borderRadius={W * 0.25}
      />

      {/* Gold / Amber warm streak */}
      <AuroraBand
        colors={['transparent', 'rgba(251,191,36,0.18)', 'rgba(252,211,77,0.12)', 'rgba(245,158,11,0.06)', 'transparent']}
        locations={[0, 0.3, 0.5, 0.7, 1]}
        x={W * 0.05} y={H * 0.08} w={W * 0.4} h={H * 0.45}
        rotation={-8}
        swayX={15} swayY={3}
        breatheMin={0.1} breatheMax={0.45}
        scaleXMin={0.96} scaleXMax={1.06}
        swayDur={14000} breatheDur={11000} delayMs={6000}
        borderRadius={W * 0.2}
      />

      {/* Deep Blue wide backdrop */}
      <AuroraBand
        colors={['transparent', 'rgba(59,130,246,0.20)', 'rgba(99,102,241,0.14)', 'rgba(79,70,229,0.08)', 'transparent']}
        locations={[0, 0.15, 0.4, 0.65, 1]}
        x={-W * 0.05} y={H * 0.03} w={W * 0.85} h={H * 0.55}
        rotation={3}
        swayX={12} swayY={3}
        breatheMin={0.12} breatheMax={0.4}
        swayDur={15000} breatheDur={12000} delayMs={8000}
        borderRadius={W * 0.4}
      />

      {/* ---- LAYER 3: SVG Aurora Ribbons (organic wave detail) ---- */}

      {/* Green ribbon wave */}
      <AuroraRibbon
        pathData={makeRibbonPath(ribbonW, ribbonH, 0.12)}
        gradientColors={[
          { color: '#10B981', opacity: 0.5 },
          { color: '#34D399', opacity: 0.35 },
          { color: '#059669', opacity: 0.15 },
          { color: '#10B981', opacity: 0 },
        ]}
        gradientStops={[0, 0.3, 0.6, 1]}
        width={ribbonW} height={ribbonH}
        x={-W * 0.1} y={-H * 0.02}
        swayAmount={25} breatheMin={0.15} breatheMax={0.5}
        swayDur={11000} breatheDur={9000} delayMs={500}
      />

      {/* Teal ribbon wave */}
      <AuroraRibbon
        pathData={makeWideRibbonPath(ribbonW * 0.8, ribbonH * 0.85)}
        gradientColors={[
          { color: '#06B6D4', opacity: 0.4 },
          { color: '#22D3EE', opacity: 0.25 },
          { color: '#0891B2', opacity: 0.1 },
          { color: '#06B6D4', opacity: 0 },
        ]}
        gradientStops={[0, 0.25, 0.55, 1]}
        width={ribbonW * 0.8} height={ribbonH * 0.85}
        x={W * 0.2} y={H * 0.01}
        swayAmount={20} breatheMin={0.1} breatheMax={0.4}
        swayDur={12500} breatheDur={10000} delayMs={3500}
      />

      {/* Purple ribbon wave */}
      <AuroraRibbon
        pathData={makeRibbonPath(ribbonW * 0.75, ribbonH * 0.9, 0.15)}
        gradientColors={[
          { color: '#A78BFA', opacity: 0.4 },
          { color: '#7C3AED', opacity: 0.25 },
          { color: '#6366F1', opacity: 0.1 },
          { color: '#4F46E5', opacity: 0 },
        ]}
        gradientStops={[0, 0.3, 0.6, 1]}
        width={ribbonW * 0.75} height={ribbonH * 0.9}
        x={-W * 0.05} y={H * 0.04}
        swayAmount={18} breatheMin={0.1} breatheMax={0.35}
        swayDur={10500} breatheDur={8500} delayMs={2000}
      />

      {/* ---- LAYER 4: Constellations ---- */}
      {constellations.map((c, i) => <Constellation key={'c' + i} {...c} />)}

      {/* ---- LAYER 5: Central glow focal point ---- */}
      <View style={mwS.centralGlow}>
        <LinearGradient
          colors={['rgba(192,132,252,0.12)', 'rgba(124,58,237,0.06)', 'transparent']}
          style={{ flex: 1, borderRadius: W * 0.4 }}
          start={{ x: 0.5, y: 0.3 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </View>
  );
});

const mwS = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  centralGlow: {
    position: 'absolute',
    left: W * 0.1, top: H * 0.1,
    width: W * 0.8, height: H * 0.35,
  },
});

export default MilkyWay;
