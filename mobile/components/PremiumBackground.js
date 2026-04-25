/**
 * PremiumBackground — Unified luxury obsidian + gold cosmic background
 *
 * One background for every tab. Replaces CosmicBackground and TabBackground.
 *
 * Layers (bottom → top):
 *   1. Obsidian sky gradient (near-black with warm undertone)
 *   2. Breathing gold nebula glows (two soft radial patches)
 *   3. Swaying gold aurora curtain
 *   4. 4-tier twinkling starfield (~85 stars, ~10% warm-gold tinted)
 *   5. Gold dust particles drifting diagonally (3 parallax depth layers)
 *   6. Shooting stars with warm cream→gold tail
 *   7. Edge vignette for cinematic framing
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence, withDelay,
  Easing, interpolate,
} from 'react-native-reanimated';

var W = Dimensions.get('window').width;
var H = Dimensions.get('window').height;

/* ═══════════════════════════════════════════════════
   STAR — twinkling dot with optional glow
   ═══════════════════════════════════════════════════ */
var Star = React.memo(function ({ x, y, size, delay, dur, color }) {
  var o = useSharedValue(0.15);
  useEffect(function () {
    o.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.75 + Math.random() * 0.25, { duration: dur * 0.4, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.10 + Math.random() * 0.18, { duration: dur * 0.6, easing: Easing.inOut(Easing.ease) })
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
});

/* ═══════════════════════════════════════════════════
   SHOOTING STAR — warm cream→gold streak
   ═══════════════════════════════════════════════════ */
var ShootingStar = React.memo(function ({ delay }) {
  var p = useSharedValue(0);
  var topV = useMemo(function () { return 30 + Math.random() * H * 0.30; }, []);
  var rightV = useMemo(function () { return W * 0.05 + Math.random() * W * 0.5; }, []);
  var dur = useMemo(function () { return 800 + Math.random() * 1000; }, []);
  var pause = useMemo(function () { return 7000 + Math.random() * 11000; }, []);
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
      transform: [{ rotate: '-38deg' }, { translateX: interpolate(p.value, [0, 1], [0, -W * 0.9]) }],
    };
  });
  var tail = useAnimatedStyle(function () {
    return { opacity: p.value > 0.01 && p.value < 0.88 ? interpolate(p.value, [0, 0.05, 0.4, 0.88], [0, 0.95, 0.5, 0]) : 0 };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', top: topV, right: rightV,
      width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF5E0',
      shadowColor: '#E8C07A', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 8,
    }, head]}>
      <Animated.View style={[{ position: 'absolute', top: 1, left: 4, width: 200, height: 2, borderRadius: 1 }, tail]}>
        <LinearGradient
          colors={['rgba(255,240,200,0.95)', 'rgba(232,192,122,0.55)', 'rgba(212,160,86,0.15)', 'transparent']}
          style={{ flex: 1, borderRadius: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════
   AURORA CURTAIN — tall swaying gold gradient band
   ═══════════════════════════════════════════════════ */
var AuroraCurtain = React.memo(function () {
  var sway = useSharedValue(0);
  var alpha = useSharedValue(0.22);
  useEffect(function () {
    sway.value = withRepeat(withSequence(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 14000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
    alpha.value = withRepeat(withSequence(
      withTiming(0.38, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.16, { duration: 11000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: alpha.value,
      transform: [{ translateX: interpolate(sway.value, [0, 1], [-W * 0.08, W * 0.08]) }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        top: H * 0.04,
        left: W * 0.2,
        width: W * 0.6,
        height: H * 0.72,
      }, style]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(232,192,122,0.10)',
          'rgba(212,160,86,0.18)',
          'rgba(232,192,122,0.10)',
          'transparent',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1, borderRadius: W }}
      />
    </Animated.View>
  );
});

/* ═══════════════════════════════════════════════════
   GOLD DUST PARTICLE — diagonal drift with parallax depth
   ═══════════════════════════════════════════════════ */
var DustParticle = React.memo(function ({ startX, startY, size, dur, delay, opacity, color }) {
  var p = useSharedValue(0);
  useEffect(function () {
    p.value = withDelay(delay, withRepeat(
      withTiming(1, { duration: dur, easing: Easing.linear }),
      -1, false
    ));
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(p.value, [0, 0.1, 0.85, 1], [0, opacity, opacity, 0]),
      transform: [
        { translateX: interpolate(p.value, [0, 1], [0, -W * 0.5]) },
        { translateY: interpolate(p.value, [0, 1], [0, H * 0.35]) },
      ],
    };
  });
  return (
    <Animated.View style={[{
      position: 'absolute',
      left: startX, top: startY,
      width: size, height: size, borderRadius: size,
      backgroundColor: color,
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: size * 2,
    }, style]} />
  );
});

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
function PremiumBackground() {

  /* ── Stars (~85 total, 4 tiers, ~10% warm gold tint) ── */
  var stars = useMemo(function () {
    var a = [];
    var whites = ['#fff', '#FFF5E0', '#FFE8C4', '#F5F2E8'];
    var golds = ['#FFE8A0', '#F5D890', '#E8C07A'];
    var pickColor = function () {
      return Math.random() < 0.12
        ? golds[Math.floor(Math.random() * golds.length)]
        : whites[Math.floor(Math.random() * whites.length)];
    };
    // Tier 1: bright prominent
    for (var i = 0; i < 7; i++) {
      a.push({ id: 'b' + i, x: Math.random() * W, y: 20 + Math.random() * H * 0.55, size: 2.4 + Math.random() * 1.6, delay: Math.random() * 3000, dur: 2500 + Math.random() * 2000, color: pickColor() });
    }
    // Tier 2: medium
    for (var i = 0; i < 20; i++) {
      a.push({ id: 'm' + i, x: Math.random() * W, y: 10 + Math.random() * H * 0.85, size: 1.4 + Math.random() * 0.8, delay: Math.random() * 4000, dur: 2000 + Math.random() * 2500, color: pickColor() });
    }
    // Tier 3: small
    for (var i = 0; i < 32; i++) {
      a.push({ id: 's' + i, x: Math.random() * W, y: Math.random() * H * 0.95, size: 0.8 + Math.random() * 0.5, delay: Math.random() * 5000, dur: 1800 + Math.random() * 3000, color: '#fff' });
    }
    // Tier 4: tiny faint dust-stars
    for (var i = 0; i < 28; i++) {
      a.push({ id: 't' + i, x: Math.random() * W, y: Math.random() * H * 0.98, size: 0.35 + Math.random() * 0.4, delay: Math.random() * 5000, dur: 2000 + Math.random() * 3000, color: '#fff' });
    }
    return a;
  }, []);

  /* ── Gold dust particles (3 parallax depth layers, ~30 total) ── */
  var dust = useMemo(function () {
    var a = [];
    // Far layer — slow, tiny, faint
    for (var i = 0; i < 12; i++) {
      a.push({
        id: 'd-far-' + i,
        startX: Math.random() * W + W * 0.3,
        startY: Math.random() * H * 0.8,
        size: 1.0 + Math.random() * 0.6,
        dur: 22000 + Math.random() * 8000,
        delay: Math.random() * 20000,
        opacity: 0.20 + Math.random() * 0.15,
        color: '#D4A056',
      });
    }
    // Mid layer
    for (var i = 0; i < 10; i++) {
      a.push({
        id: 'd-mid-' + i,
        startX: Math.random() * W + W * 0.2,
        startY: Math.random() * H * 0.85,
        size: 1.5 + Math.random() * 0.9,
        dur: 14000 + Math.random() * 6000,
        delay: Math.random() * 14000,
        opacity: 0.30 + Math.random() * 0.20,
        color: '#E8C07A',
      });
    }
    // Near layer — faster, larger, brighter
    for (var i = 0; i < 8; i++) {
      a.push({
        id: 'd-near-' + i,
        startX: Math.random() * W + W * 0.15,
        startY: Math.random() * H * 0.9,
        size: 1.8 + Math.random() * 1.2,
        dur: 9000 + Math.random() * 5000,
        delay: Math.random() * 9000,
        opacity: 0.40 + Math.random() * 0.25,
        color: '#F5D890',
      });
    }
    return a;
  }, []);

  /* ── Nebula glow pulse ── */
  var nebPulse = useSharedValue(0.22);
  useEffect(function () {
    nebPulse.value = withRepeat(withSequence(
      withTiming(0.38, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.15, { duration: 12000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var nebStyle = useAnimatedStyle(function () { return { opacity: nebPulse.value }; });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">

      {/* ═══ 1. OBSIDIAN SKY GRADIENT ═══ */}
      <LinearGradient
        colors={[
          '#000000', // true black top
          '#030208', // near black
          '#05040C', // obsidian
          '#08060F', // deep obsidian with warm hint
          '#0A0612', // warm obsidian
          '#0C0810', // base
        ]}
        locations={[0, 0.18, 0.38, 0.58, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ═══ 2. NEBULA GLOWS (breathing gold/amber) ═══ */}
      <Animated.View style={[{
        position: 'absolute',
        top: -H * 0.08, left: -W * 0.2,
        width: W * 0.9, height: H * 0.55,
        borderRadius: W * 0.45,
        backgroundColor: 'rgba(212,160,86,0.09)',
      }, nebStyle]} />
      <Animated.View style={[{
        position: 'absolute',
        bottom: -H * 0.1, right: -W * 0.2,
        width: W * 0.85, height: H * 0.5,
        borderRadius: W * 0.425,
        backgroundColor: 'rgba(180,120,50,0.07)',
      }, nebStyle]} />

      {/* ═══ 3. AURORA CURTAIN ═══ */}
      <AuroraCurtain />

      {/* ═══ 4. STARFIELD ═══ */}
      {stars.map(function (st) {
        return <Star key={st.id} x={st.x} y={st.y} size={st.size} delay={st.delay} dur={st.dur} color={st.color} />;
      })}

      {/* ═══ 5. GOLD DUST PARTICLES ═══ */}
      {dust.map(function (d) {
        return (
          <DustParticle
            key={d.id}
            startX={d.startX}
            startY={d.startY}
            size={d.size}
            dur={d.dur}
            delay={d.delay}
            opacity={d.opacity}
            color={d.color}
          />
        );
      })}

      {/* ═══ 6. SHOOTING STARS ═══ */}
      <ShootingStar delay={3500} />
      <ShootingStar delay={13000} />
      <ShootingStar delay={24000} />

      {/* ═══ 7. EDGE VIGNETTE — cinematic framing ═══ */}
      {/* Top fade */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.18 }}
      />
      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.65)', '#000000']}
        locations={[0, 0.6, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.22 }}
      />
      {/* Left edge */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: W * 0.12 }}
      />
      {/* Right edge */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.45)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: W * 0.12 }}
      />
    </View>
  );
}

// Memoized: takes no props, so it should never re-render once mounted.
// Eliminates background re-renders when parent screens update state.
export default React.memo(PremiumBackground);
