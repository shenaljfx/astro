/**
 * CosmicBackground.js — "Celestial Flow" pure 2D background
 *
 * Layer stack (bottom → top):
 *  1. Gradient mesh     — 2x overlapping LinearGradient for deep space base
 *  2. Nebula blobs      — 5 large pulsing color washes (emerald, violet, teal, rose, gold)
 *  3. Aurora (MilkyWay) — refined aurora bands + nebula glows
 *  4. Star field        — ~35 SVG circles with native shadow glow, 3 tiers
 *  5. Constellations    — 2 SVG zodiac patterns with slow rotation
 *  6. Shooting stars    — 2 golden streaks with 8-15s intervals
 *  7. Floating dust     — 12 tiny sparkle particles
 *  8. Children          — app content
 *  9. ScrollHint        — optional indicator
 *
 * No WebGL, no R3F. All animations via react-native-reanimated (UI thread).
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps,
  withRepeat, withTiming, withSequence, withDelay,
  interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Line, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import MilkyWay from './MilkyWay';
import { Colors, Gradients } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

const AnimatedG = Animated.createAnimatedComponent(G);

/* ================================================================
   NEBULA BLOBS — slow-pulsing color washes
   ================================================================ */
const NebulaBlob = React.memo(({ color, size, x, y, delay: dly, duration }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(dly,
      withRepeat(withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration * 0.9, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  const st = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.12, 0.28]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.08]) }],
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, st]}
    />
  );
});

const NebulaBlobs = React.memo(() => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <NebulaBlob color="rgba(0,255,179,0.30)" size={W * 0.9} x={W * 0.15} y={H * 0.12} delay={0} duration={12000} />
    <NebulaBlob color="rgba(147,51,234,0.28)" size={W * 0.85} x={W * 0.78} y={H * 0.28} delay={2000} duration={14000} />
    <NebulaBlob color="rgba(76,201,240,0.24)" size={W * 0.75} x={W * 0.25} y={H * 0.55} delay={4000} duration={11000} />
    <NebulaBlob color="rgba(255,107,157,0.18)" size={W * 0.65} x={W * 0.7} y={H * 0.72} delay={3000} duration={13000} />
    <NebulaBlob color="rgba(255,184,0,0.15)" size={W * 0.55} x={W * 0.45} y={H * 0.9} delay={5000} duration={10000} />
  </View>
));

/* ================================================================
   STAR FIELD — ~35 SVG circles with 3 tiers, native shadow glow
   ================================================================ */
const STAR_COLORS = ['#FFFFFF', '#FFD666', '#B47AFF', '#4CC9F0', '#00FFB3'];

const StarField = React.memo(() => {
  const stars = useMemo(() => {
    const result = [];
    for (let i = 0; i < 35; i++) {
      const tier = i < 5 ? 'bright' : i < 15 ? 'medium' : 'dim';
      const r = tier === 'bright' ? 2 + Math.random() * 1.5
              : tier === 'medium' ? 1 + Math.random() * 1
              : 0.5 + Math.random() * 0.8;
      result.push({
        id: i,
        cx: Math.random() * W,
        cy: Math.random() * H,
        r,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        glowRadius: tier === 'bright' ? 10 : tier === 'medium' ? 5 : 2,
        tier,
      });
    }
    return result;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map(s => (
        <TwinkleStar key={s.id} star={s} />
      ))}
    </View>
  );
});

const TwinkleStar = React.memo(({ star }) => {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    const dur = star.tier === 'bright' ? 3000 + Math.random() * 3000
              : star.tier === 'medium' ? 4000 + Math.random() * 4000
              : 5000 + Math.random() * 5000;
    twinkle.value = withDelay(Math.random() * 4000,
      withRepeat(withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur * 0.8, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  const minOpacity = star.tier === 'bright' ? 0.6 : star.tier === 'medium' ? 0.3 : 0.15;
  const maxOpacity = star.tier === 'bright' ? 1.0 : star.tier === 'medium' ? 0.7 : 0.4;

  const st = useAnimatedStyle(() => ({
    opacity: interpolate(twinkle.value, [0, 1], [minOpacity, maxOpacity]),
    transform: [{ scale: interpolate(twinkle.value, [0, 1], [0.85, 1.15]) }],
  }));

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        left: star.cx - star.r,
        top: star.cy - star.r,
        width: star.r * 2,
        height: star.r * 2,
        borderRadius: star.r,
        backgroundColor: star.color,
        shadowColor: star.color,
        shadowOpacity: 0.9,
        shadowRadius: star.glowRadius,
        shadowOffset: { width: 0, height: 0 },
        elevation: star.glowRadius > 5 ? 6 : 3,
      }, st]}
    />
  );
});

/* ================================================================
   REAL CONSTELLATIONS — recognizable star patterns
   ================================================================ */
const CONSTELLATIONS = [
  { name: 'Orion',
    stars: [[0,0],[25,-12],[50,-8],[72,0],[38,30],[38,55],[38,80],[20,90],[58,88],[10,40],[65,38]],
    lines: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[6,8],[1,4],[2,4],[1,10],[2,10],[9,0],[3,10]],
    x: W * 0.08, y: H * 0.06, scale: 1.0,
  },
  { name: 'UrsaMajor',
    stars: [[0,12],[22,0],[50,4],[72,18],[90,30],[78,50],[55,48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,2]],
    x: W * 0.62, y: H * 0.04, scale: 0.9,
  },
  { name: 'Scorpius',
    stars: [[0,0],[15,18],[28,30],[42,28],[56,35],[65,50],[60,65],[50,75],[55,88]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]],
    x: W * 0.05, y: H * 0.55, scale: 0.75,
  },
  { name: 'Cassiopeia',
    stars: [[0,15],[22,0],[42,20],[62,5],[80,18]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
    x: W * 0.55, y: H * 0.52, scale: 0.8,
  },
  { name: 'Crux',
    stars: [[20,0],[0,22],[20,42],[40,22],[20,22]],
    lines: [[0,4],[4,2],[1,4],[4,3]],
    x: W * 0.78, y: H * 0.70, scale: 0.65,
  },
];

const ConstellationLayer = React.memo(() => {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(withSequence(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, []);

  const animProps = useAnimatedProps(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.12, 0.30]),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <AnimatedG animatedProps={animProps}>
          {CONSTELLATIONS.map((c, ci) => (
            <G key={ci} x={c.x} y={c.y} scale={c.scale}>
              {c.lines.map(([a, b], li) => (
                <Line key={li}
                  x1={c.stars[a][0]} y1={c.stars[a][1]}
                  x2={c.stars[b][0]} y2={c.stars[b][1]}
                  stroke="rgba(180,122,255,0.25)" strokeWidth={0.6}
                />
              ))}
              {c.stars.map(([sx, sy], si) => (
                <G key={si}>
                  <Circle cx={sx} cy={sy} r={2.5} fill="rgba(255,255,255,0.06)" />
                  <Circle cx={sx} cy={sy} r={1.2} fill="rgba(255,255,255,0.55)" />
                </G>
              ))}
            </G>
          ))}
        </AnimatedG>
      </Svg>
    </View>
  );
});

/* ================================================================
   CELESTIAL BODIES — Sun & Moon only (no planets)
   ================================================================ */
var SUN_R = 44;
var MOON_R = 28;
var SUN_RAYS_A = [0, 30, 60, 90, 120, 150];
var SUN_RAYS_B = [15, 45, 75, 105, 135, 165];

var CelestialBodies = React.memo(function () {
  var now = new Date();
  var h = now.getHours(), m = now.getMinutes();
  var dayProgress = (h + m / 60) / 24;
  var isDaytime = h >= 6 && h < 18;

  var drift = useSharedValue(0);
  var pulse = useSharedValue(0);
  var rayRot = useSharedValue(0);

  useEffect(function () {
    drift.value = withRepeat(
      withTiming(1, { duration: 28000, easing: Easing.inOut(Easing.sin) }), -1, true);
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    rayRot.value = withRepeat(
      withTiming(1, { duration: 60000, easing: Easing.linear }), -1, false);
  }, []);

  var sunX = W * (0.1 + dayProgress * 0.8);
  var sunArc = Math.sin(dayProgress * Math.PI);
  var sunY = H * (0.55 - sunArc * 0.45);

  var moonX = W * (0.9 - dayProgress * 0.8);
  var moonArc = Math.sin((dayProgress + 0.5) * Math.PI);
  var moonY = H * (0.55 - Math.abs(moonArc) * 0.40);

  var sunDrift = useAnimatedStyle(function () {
    return { transform: [
      { translateX: interpolate(drift.value, [0, 1], [-12, 12]) },
      { translateY: interpolate(drift.value, [0, 1], [-6, 6]) },
    ]};
  });
  var corona1 = useAnimatedStyle(function () {
    return {
      opacity: isDaytime ? interpolate(pulse.value, [0, 1], [0.12, 0.28]) : 0.03,
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.12]) }],
    };
  });
  var corona2 = useAnimatedStyle(function () {
    return {
      opacity: isDaytime ? interpolate(pulse.value, [0, 1], [0.18, 0.40]) : 0.04,
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.97, 1.10]) }],
    };
  });
  var corona3 = useAnimatedStyle(function () {
    return {
      opacity: isDaytime ? interpolate(pulse.value, [0, 1], [0.30, 0.55]) : 0.06,
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.06]) }],
    };
  });
  var rayStyle = useAnimatedStyle(function () {
    return {
      transform: [{ rotate: interpolate(rayRot.value, [0, 1], [0, 360]) + 'deg' }],
      opacity: isDaytime ? interpolate(pulse.value, [0, 1], [0.12, 0.26]) : 0.02,
    };
  });

  var moonDrift = useAnimatedStyle(function () {
    return { transform: [
      { translateX: interpolate(drift.value, [0, 1], [8, -8]) },
      { translateY: interpolate(drift.value, [0, 1], [4, -4]) },
    ]};
  });
  var moonGlowAnim = useAnimatedStyle(function () {
    return {
      opacity: !isDaytime ? interpolate(pulse.value, [0, 1], [0.12, 0.28]) : 0.03,
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.18]) }],
    };
  });

  var sunOp = isDaytime ? 0.92 : 0.12;
  var moonOp = !isDaytime ? 0.88 : 0.14;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* ═══ SUN ═══ */}
      <Animated.View style={[{
        position: 'absolute', left: sunX - 140, top: sunY - 140,
        width: 280, height: 280, alignItems: 'center', justifyContent: 'center',
      }, sunDrift]}>
        <Animated.View style={[{ position: 'absolute', width: 260, height: 260, borderRadius: 130,
          backgroundColor: 'rgba(255,240,200,0.06)',
          shadowColor: '#FFE082', shadowOpacity: 0.35, shadowRadius: 50, elevation: 12,
        }, corona1]} />
        <Animated.View style={[{ position: 'absolute', width: 190, height: 190, borderRadius: 95,
          backgroundColor: 'rgba(255,245,220,0.10)',
          shadowColor: '#FFF3C4', shadowOpacity: 0.4, shadowRadius: 35, elevation: 10,
        }, corona2]} />
        <Animated.View style={[{ position: 'absolute', width: 140, height: 140, borderRadius: 70,
          backgroundColor: 'rgba(255,250,235,0.18)',
          shadowColor: '#FFF8E1', shadowOpacity: 0.5, shadowRadius: 22, elevation: 8,
        }, corona3]} />

        <Animated.View style={[{
          position: 'absolute', width: 240, height: 240,
          alignItems: 'center', justifyContent: 'center',
        }, rayStyle]}>
          {SUN_RAYS_A.map(function (a) {
            return <View key={a} style={{ position: 'absolute', width: 220, height: 2, borderRadius: 1,
              backgroundColor: 'rgba(255,245,220,0.14)', transform: [{ rotate: a + 'deg' }] }} />;
          })}
          {SUN_RAYS_B.map(function (a) {
            return <View key={a} style={{ position: 'absolute', width: 170, height: 1.5, borderRadius: 0.75,
              backgroundColor: 'rgba(255,240,210,0.08)', transform: [{ rotate: a + 'deg' }] }} />;
          })}
        </Animated.View>

        <Svg width={SUN_R * 2 + 16} height={SUN_R * 2 + 16} style={{ opacity: sunOp }}>
          <Defs>
            <RadialGradient id="sunBd" cx="42%" cy="38%" r="52%" fx="36%" fy="32%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="15%" stopColor="#FFFEF5" />
              <Stop offset="40%" stopColor="#FFF8E1" />
              <Stop offset="70%" stopColor="#FFE882" />
              <Stop offset="100%" stopColor="#FFD54F" />
            </RadialGradient>
          </Defs>
          <Circle cx={SUN_R + 8} cy={SUN_R + 8} r={SUN_R} fill="url(#sunBd)" />
          <Circle cx={SUN_R - 2} cy={SUN_R - 2} r={SUN_R * 0.28} fill="rgba(255,255,255,0.20)" />
          <Circle cx={SUN_R - 7} cy={SUN_R - 7} r={SUN_R * 0.12} fill="rgba(255,255,255,0.35)" />
        </Svg>
      </Animated.View>

      {/* ═══ MOON ═══ */}
      <Animated.View style={[{
        position: 'absolute', left: moonX - 75, top: moonY - 75,
        width: 150, height: 150, alignItems: 'center', justifyContent: 'center',
      }, moonDrift]}>
        <Animated.View style={[{ position: 'absolute', width: 130, height: 130, borderRadius: 65,
          backgroundColor: 'rgba(160,170,230,0.08)',
          shadowColor: '#8888DD', shadowOpacity: 0.5, shadowRadius: 35, elevation: 10,
        }, moonGlowAnim]} />

        <Svg width={MOON_R * 2 + 20} height={MOON_R * 2 + 20} style={{ opacity: moonOp }}>
          <Defs>
            <RadialGradient id="moonBd" cx="40%" cy="36%" r="54%" fx="35%" fy="30%">
              <Stop offset="0%" stopColor="#F5F5F5" />
              <Stop offset="25%" stopColor="#E8E8EC" />
              <Stop offset="55%" stopColor="#C0C0CC" />
              <Stop offset="85%" stopColor="#808098" />
              <Stop offset="100%" stopColor="#505068" />
            </RadialGradient>
          </Defs>
          <Circle cx={MOON_R + 10} cy={MOON_R + 10} r={MOON_R + 3} fill="rgba(140,150,210,0.10)" />
          <Circle cx={MOON_R + 10} cy={MOON_R + 10} r={MOON_R} fill="url(#moonBd)" />
          <Circle cx={MOON_R + 4} cy={MOON_R + 4} r={MOON_R * 0.22} fill="rgba(255,255,255,0.12)" />
        </Svg>
      </Animated.View>
    </View>
  );
});

/* ================================================================
   METEOR — one single gradient element (no separate head/tail)
   LinearGradient fades transparent→white so the bright end IS the
   head.  Position math ensures the bright end sits exactly on the
   trajectory point after rotation.
   ================================================================ */
var Meteor = React.memo(function (_p) {
  var dly = _p.dly, sx = _p.startX, sy = _p.startY, angle = _p.angle, speed = _p.speed || 650;
  var prog = useSharedValue(0);
  var dist = W * 1.3;
  var rad = (angle * Math.PI) / 180;
  var cosA = Math.cos(rad), sinA = Math.sin(rad);
  var len = 70 + Math.random() * 40;
  var half = len / 2;

  useEffect(function () {
    var pause = 8000 + Math.random() * 10000;
    prog.value = withDelay(dly, withRepeat(withSequence(
      withTiming(1, { duration: speed, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 0 }),
      withDelay(pause, withTiming(0, { duration: 0 })),
    ), -1));
  }, []);

  var style = useAnimatedStyle(function () {
    var t = prog.value;
    var px = sx + t * dist * cosA;
    var py = sy + t * dist * sinA;
    return {
      transform: [
        { translateX: px - half * (cosA + 1) },
        { translateY: py - half * sinA - 1 },
        { rotate: angle + 'deg' },
      ],
      opacity: interpolate(t, [0, 0.01, 0.35, 1], [0, 1, 0.7, 0]),
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', width: len, height: 2, borderRadius: 1,
      shadowColor: '#FFF8E1', shadowOpacity: 0.7, shadowRadius: 5, elevation: 4,
      shadowOffset: { width: 0, height: 0 },
    }, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,245,220,0.25)', 'rgba(255,252,240,0.65)', '#FFFFF0']}
        locations={[0, 0.4, 0.85, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1, borderRadius: 1 }}
      />
    </Animated.View>
  );
});

/* ── Meteor Shower — generates random meteors ── */
var MeteorShower = React.memo(function () {
  var meteors = useMemo(function () {
    return Array.from({ length: 6 }, function (_, i) {
      var fromLeft = Math.random() > 0.4;
      return {
        id: i,
        startX: fromLeft ? -5 + Math.random() * 10 : Math.random() * W * 0.85,
        startY: fromLeft ? Math.random() * H * 0.45 : -5 + Math.random() * 10,
        angle: 18 + Math.random() * 40,
        speed: 500 + Math.random() * 350,
        dly: Math.random() * 14000,
      };
    });
  }, []);

  return (
    <>
      {meteors.map(function (m) { return <Meteor key={m.id} dly={m.dly} startX={m.startX} startY={m.startY} angle={m.angle} speed={m.speed} />; })}
    </>
  );
});

/* ================================================================
   FLOATING DUST — tiny sparkle particles
   ================================================================ */
const DUST_COLORS = [
  'rgba(255,184,0,0.55)',
  'rgba(180,122,255,0.55)',
  'rgba(76,201,240,0.50)',
  'rgba(255,214,102,0.50)',
  'rgba(0,255,179,0.45)',
];

const DustParticle = React.memo(({ left, top, size, color, delay: dly, duration }) => {
  const op = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(dly,
      withRepeat(withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: duration * 0.8, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
    drift.value = withDelay(dly,
      withRepeat(withSequence(
        withTiming(1, { duration: duration * 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: duration * 2, easing: Easing.inOut(Easing.sin) }),
      ), -1, true));
  }, []);

  const st = useAnimatedStyle(() => ({
    opacity: interpolate(op.value, [0, 1], [0, 0.40]),
    transform: [
      { translateX: drift.value * 5 },
      { translateY: drift.value * -3 },
    ],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute', left, top,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color,
      shadowColor: color,
      shadowOpacity: 0.8,
      shadowRadius: size * 2,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    }, st]} />
  );
});

const CosmicDust = React.memo(() => {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * W,
      top: Math.random() * H,
      size: 1.5 + Math.random() * 2,
      color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
      delay: Math.random() * 5000,
      duration: 4000 + Math.random() * 5000,
    })), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map(p => <DustParticle key={p.id} {...p} />)}
    </View>
  );
});

/* ================================================================
   SCROLL HINT
   ================================================================ */
const ScrollHint = React.memo(() => {
  const bounce = useSharedValue(0);
  const op = useSharedValue(0.6);

  useEffect(() => {
    bounce.value = withRepeat(withSequence(
      withTiming(12, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
    op.value = withRepeat(withSequence(
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
      <View style={{
        width: 20, height: 32, borderRadius: 10, borderWidth: 1.5,
        borderColor: 'rgba(180,122,255,0.35)', alignItems: 'center', paddingTop: 6,
      }}>
        <View style={{
          width: 3, height: 8, borderRadius: 1.5,
          backgroundColor: '#FFB800', shadowColor: '#FFB800',
          shadowOpacity: 0.8, shadowRadius: 4, elevation: 3,
        }} />
      </View>
    </Animated.View>
  );
});

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export default function CosmicBackground({ children, showScrollHint = false }) {
  return (
    <View style={bgS.container}>
      {/* 1 — Deep space gradient mesh */}
      <LinearGradient
        colors={[Colors.deepVoid, '#0C0628', '#150D3A', '#0C0628', Colors.deepVoid]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(20,12,50,0.35)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 1, y: 0.7 }}
      />

      {/* 2 — Nebula color washes */}
      <NebulaBlobs />

      {/* 3 — Milky Way star band */}
      <MilkyWay />

      {/* 4 — Star field (SVG glow stars) */}
      <StarField />

      {/* 5 — Real constellation patterns */}
      <ConstellationLayer />

      {/* 5b — Sun & Moon celestial bodies */}
      <CelestialBodies />

      {/* 6 — Randomized meteors */}
      <MeteorShower />

      {/* 7 — Floating dust */}
      <CosmicDust />

      {/* 8 — Content */}
      <View style={StyleSheet.absoluteFillObject}>{children}</View>

      {/* 9 — Scroll hint */}
      {showScrollHint && <ScrollHint />}
    </View>
  );
}

const bgS = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepVoid, overflow: 'hidden' },
});
