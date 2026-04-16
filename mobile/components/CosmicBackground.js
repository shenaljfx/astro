/**
 * CosmicBackground v3 — Atmospheric Night Sky
 * 
 * Layers:
 *  1. Sky gradient (7 stops, dark top → blue-teal horizon)
 *  2. Nebula glows (2 soft radial color patches — atmosphere)
 *  3. Stars (80 total, 4 brightness tiers, real twinkle)
 *  4. Shooting stars (3, staggered)
 *  5. Landscape silhouette (mountains + trees SVG)
 *  6. Horizon glow + bottom fade
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  Easing, interpolate,
} from 'react-native-reanimated';
import Svg, { Path, G, Rect as SvgRect } from 'react-native-svg';

var W = Dimensions.get('window').width;
var H = Dimensions.get('window').height;

/* ═══════════════════════════════════════════════════
   STAR — simple View dot with glow shadow
   ═══════════════════════════════════════════════════ */
var Star = function ({ x, y, size, delay, dur, color }) {
  var o = useSharedValue(0.2);
  useEffect(function () {
    o.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.75 + Math.random() * 0.25, { duration: dur * 0.4, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.12 + Math.random() * 0.18, { duration: dur * 0.6, easing: Easing.inOut(Easing.ease) })
    ), -1, true));
  }, []);
  var s = useAnimatedStyle(function () { return { opacity: o.value }; });
  var glow = size > 1.5;
  return (
    <Animated.View style={[{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size,
      backgroundColor: color,
    }, glow && {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.9,
      shadowRadius: size * 2.5,
      elevation: 0,
    }, s]} />
  );
};

/* ═══════════════════════════════════════════════════
   SHOOTING STAR
   ═══════════════════════════════════════════════════ */
var ShootingStar = function ({ delay }) {
  var p = useSharedValue(0);
  var topV = useMemo(function () { return 30 + Math.random() * H * 0.28; }, []);
  var rightV = useMemo(function () { return W * 0.05 + Math.random() * W * 0.5; }, []);
  var dur = useMemo(function () { return 800 + Math.random() * 1000; }, []);
  var pause = useMemo(function () { return 6000 + Math.random() * 10000; }, []);
  useEffect(function () {
    p.value = withDelay(delay, withRepeat(withSequence(
      withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: pause }),
      withTiming(0, { duration: 0 })
    ), -1, false));
  }, []);
  var head = useAnimatedStyle(function () {
    return {
      opacity: p.value > 0.01 && p.value < 0.88 ? interpolate(p.value, [0, 0.04, 0.5, 0.88], [0, 1, 0.8, 0]) : 0,
      transform: [{ rotate: '-40deg' }, { translateX: interpolate(p.value, [0, 1], [0, -W * 0.9]) }],
    };
  });
  var tail = useAnimatedStyle(function () {
    return { opacity: p.value > 0.01 && p.value < 0.88 ? interpolate(p.value, [0, 0.05, 0.4, 0.88], [0, 0.95, 0.5, 0]) : 0 };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', top: topV, right: rightV,
      width: 4, height: 4, borderRadius: 2, backgroundColor: '#fffbe8',
      shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8,
    }, head]}>
      <Animated.View style={[{ position: 'absolute', top: 1, left: 4, width: 180, height: 2, borderRadius: 1 }, tail]}>
        <LinearGradient colors={['rgba(255,235,150,0.95)', 'rgba(255,200,80,0.4)', 'rgba(255,180,60,0.08)', 'transparent']} style={{ flex: 1, borderRadius: 1 }} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
      </Animated.View>
    </Animated.View>
  );
};

/* ═══════════════════════════════════════════════════
   AURORA CURTAIN — a tall vertical gradient that sways horizontally
   This is the key difference: real aurora hang like curtains from the sky
   ═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════
   PINE TREE (SVG)
   ═══════════════════════════════════════════════════ */
var PineTree = function ({ x, y, sc, c }) {
  var f = c || '#020508';
  return (
    <G transform={'translate(' + x + ',' + y + ') scale(' + (sc || 1) + ')'}>
      <SvgRect x={-1.5} y={-4} width={3} height={8} fill={f} />
      <Path d="M-14,-4 L0,-20 L14,-4Z" fill={f} />
      <Path d="M-11,-16 L0,-32 L11,-16Z" fill={f} />
      <Path d="M-8,-28 L0,-44 L8,-28Z" fill={f} />
      <Path d="M-5,-40 L0,-54 L5,-40Z" fill={f} />
    </G>
  );
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function CosmicBackground() {

  /* ── Stars (80 total — fewer but brighter) ── */
  var stars = useMemo(function () {
    var a = [];
    var colors = ['#fff', '#FFE8C4', '#D8E8FF', '#fff', '#FFF5E0', '#C8DAFF', '#fff', '#fff'];
    // Tier 1: Bright prominent stars
    for (var i = 0; i < 6; i++) {
      a.push({ id: i, x: Math.random() * W, y: 20 + Math.random() * H * 0.45, size: 2.5 + Math.random() * 1.5, delay: Math.random() * 3000, dur: 2500 + Math.random() * 2000, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    // Tier 2: Medium stars
    for (var i = 0; i < 18; i++) {
      a.push({ id: 6 + i, x: Math.random() * W, y: 10 + Math.random() * H * 0.55, size: 1.5 + Math.random() * 0.8, delay: Math.random() * 4000, dur: 2000 + Math.random() * 2500, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    // Tier 3: Small stars  
    for (var i = 0; i < 30; i++) {
      a.push({ id: 24 + i, x: Math.random() * W, y: Math.random() * H * 0.62, size: 0.8 + Math.random() * 0.6, delay: Math.random() * 5000, dur: 1800 + Math.random() * 3000, color: '#fff' });
    }
    // Tier 4: Tiny faint stars
    for (var i = 0; i < 26; i++) {
      a.push({ id: 54 + i, x: Math.random() * W, y: Math.random() * H * 0.68, size: 0.4 + Math.random() * 0.4, delay: Math.random() * 5000, dur: 2000 + Math.random() * 3000, color: '#fff' });
    }
    return a;
  }, []);

  /* ── Nebula glow pulse ── */
  var nebPulse = useSharedValue(0.25);
  useEffect(function () {
    nebPulse.value = withRepeat(withSequence(
      withTiming(0.40, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.18, { duration: 12000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var nebStyle = useAnimatedStyle(function () { return { opacity: nebPulse.value }; });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">

      {/* ═══ 1. SKY GRADIENT ═══ */}
      <LinearGradient
        colors={[
          '#010208',   // near-black top
          '#040C1C',   // very dark navy
          '#081830',   // dark blue
          '#0E2848',   // mid navy
          '#163A60',   // blue
          '#1E4E7A',   // steel blue
          '#2A6898',   // lighter blue near horizon
        ]}
        locations={[0, 0.08, 0.20, 0.35, 0.52, 0.72, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ═══ 2. NEBULA / ATMOSPHERE GLOWS ═══ */}
      {/* Soft purple-blue glow — upper left */}
      <Animated.View style={[{
        position: 'absolute',
        top: H * 0.02, left: -W * 0.15,
        width: W * 0.8, height: H * 0.4,
        borderRadius: W * 0.4,
        backgroundColor: 'rgba(60, 30, 120, 0.15)',
      }, nebStyle]} />
      {/* Soft teal glow — upper right */}
      <Animated.View style={[{
        position: 'absolute',
        top: H * 0.08, right: -W * 0.1,
        width: W * 0.6, height: H * 0.3,
        borderRadius: W * 0.3,
        backgroundColor: 'rgba(20, 80, 100, 0.12)',
      }, nebStyle]} />

      {/* ═══ 3. STARS ═══ */}
      {stars.map(function (st) {
        return <Star key={st.id} x={st.x} y={st.y} size={st.size} delay={st.delay} dur={st.dur} color={st.color} />;
      })}

      {/* ═══ 4. SHOOTING STARS ═══ */}
      <ShootingStar delay={3000} />
      <ShootingStar delay={11000} />
      <ShootingStar delay={22000} />

      {/* ═══ 7. LANDSCAPE SILHOUETTE ═══ */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.35 }}>
        <Svg width="100%" height="100%" viewBox="0 0 375 300" preserveAspectRatio="none">
          {/* Distant mountains */}
          <Path d="M-10,120 Q30,75 80,108 Q130,82 180,100 Q230,72 290,95 Q340,78 390,110 L390,300 L-10,300Z" fill="#1A3050" opacity="0.35" />
          <Path d="M-10,150 Q50,112 120,142 Q175,118 240,135 Q300,110 390,140 L390,300 L-10,300Z" fill="#132640" opacity="0.55" />
          <Path d="M-10,175 Q70,148 160,170 Q220,150 300,165 Q350,155 390,175 L390,300 L-10,300Z" fill="#0D1E35" opacity="0.75" />

          {/* Tree ridge */}
          <Path d="M-10,205 Q50,188 120,200 Q180,186 250,198 Q310,185 390,206 L390,300 L-10,300Z" fill="#081520" />

          {/* Mid-distance trees */}
          <PineTree x={15}  y={205} sc={1.1} c="#071420" />
          <PineTree x={48}  y={202} sc={1.5} c="#071420" />
          <PineTree x={82}  y={207} sc={0.9} c="#071420" />
          <PineTree x={118} y={200} sc={1.7} c="#071420" />
          <PineTree x={155} y={206} sc={1.2} c="#071420" />
          <PineTree x={195} y={198} sc={1.6} c="#071420" />
          <PineTree x={230} y={204} sc={1.0} c="#071420" />
          <PineTree x={265} y={199} sc={1.8} c="#071420" />
          <PineTree x={302} y={205} sc={1.3} c="#071420" />
          <PineTree x={342} y={201} sc={1.5} c="#071420" />
          <PineTree x={375} y={207} sc={1.1} c="#071420" />

          {/* Foreground hill */}
          <Path d="M-10,245 Q40,230 100,242 Q160,228 230,238 Q290,225 350,240 L390,235 L390,300 L-10,300Z" fill="#040C14" />

          {/* Foreground trees — left cluster */}
          <PineTree x={-8}  y={268} sc={3.0} />
          <PineTree x={20}  y={280} sc={3.8} />
          <PineTree x={50}  y={265} sc={2.6} />
          <PineTree x={75}  y={285} sc={4.2} />
          <PineTree x={105} y={272} sc={3.0} />

          {/* Center gap (open sky view) */}
          <PineTree x={145} y={290} sc={1.6} />
          <PineTree x={185} y={294} sc={1.2} />

          {/* Foreground trees — right cluster */}
          <PineTree x={218} y={275} sc={3.4} />
          <PineTree x={248} y={262} sc={2.8} />
          <PineTree x={275} y={288} sc={4.0} />
          <PineTree x={305} y={270} sc={3.2} />
          <PineTree x={335} y={282} sc={3.6} />
          <PineTree x={362} y={268} sc={2.8} />
          <PineTree x={388} y={292} sc={4.4} />

          {/* Ground */}
          <SvgRect x={-10} y={275} width={400} height={30} fill="#020508" />
        </Svg>
      </View>

      {/* ═══ 8. HORIZON ATMOSPHERIC GLOW ═══ */}
      {/* Warm horizon light — like distant city/twilight */}
      <LinearGradient
        colors={['transparent', 'rgba(40,80,140,0.06)', 'rgba(50,100,160,0.10)', 'rgba(40,80,140,0.04)']}
        style={{ position: 'absolute', bottom: H * 0.16, left: 0, right: 0, height: H * 0.10 }}
      />
      {/* ═══ 6. BOTTOM FADE TO GROUND COLOR ═══ */}
      <LinearGradient
        colors={['transparent', 'rgba(2,5,8,0.6)', 'rgba(2,5,8,0.85)', '#020508']}
        locations={[0, 0.3, 0.6, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.12 }}
      />
    </View>
  );
}
