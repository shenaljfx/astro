/**
 * TabBackground — Per-tab themed cosmic ambient background
 * 
 * Each tab gets its own unique color palette while sharing the
 * same starfield and nebula structure for visual consistency.
 * 
 * Themes:
 *   index    → deep navy-blue night sky (celestial)
 *   kendara  → indigo-violet (mystical chart)
 *   report   → emerald-teal (growth/wisdom)
 *   chat     → warm amber-bronze (warm guidance)
 *   porondam → rose-magenta (love/match)
 *   profile  → deep purple (personal aura)
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

// ─── Theme definitions per tab ──────────────────────────────────
var THEMES = {
  index: {
    sky: ['#010208', '#030A18', '#061428', '#0A2040', '#102E58'],
    nebula1: 'rgba(40,60,140,0.12)',
    nebula2: 'rgba(20,80,120,0.10)',
    accent: 'rgba(212,160,86,0.06)',
    isSunrise: false,
    hasLandscape: true,
  },
  kendara: {
    // Spectacular morning sunrise — dark top fading to golden-orange horizon
    sky: ['#040818', '#0C1830', '#1A2848', '#2C3858', '#4A3C48', '#7A4830', '#C06820', '#E88C18', '#FFA820'],
    nebula1: 'rgba(255,140,40,0.10)',
    nebula2: 'rgba(255,100,20,0.08)',
    accent: 'rgba(255,168,32,0.12)',
    isSunrise: true,
    hasLandscape: true,
  },
  report: {
    sky: ['#010806', '#021810', '#042818', '#063822', '#084A2E'],
    nebula1: 'rgba(20,120,80,0.12)',
    nebula2: 'rgba(30,100,60,0.10)',
    accent: 'rgba(52,211,153,0.06)',
    isSunrise: false,
    hasLandscape: true,
  },
  chat: {
    sky: ['#080402', '#14080A', '#201010', '#2C1A12', '#382416'],
    nebula1: 'rgba(140,80,30,0.12)',
    nebula2: 'rgba(120,60,20,0.10)',
    accent: 'rgba(212,160,86,0.08)',
    isSunrise: false,
    hasLandscape: true,
  },
  porondam: {
    sky: ['#080208', '#140610', '#220C1C', '#30122A', '#3E1838'],
    nebula1: 'rgba(140,40,80,0.14)',
    nebula2: 'rgba(120,30,100,0.10)',
    accent: 'rgba(244,114,182,0.06)',
    isSunrise: false,
    hasLandscape: true,
  },
  profile: {
    sky: ['#04020C', '#0A0618', '#120C28', '#1A1238', '#221848'],
    nebula1: 'rgba(100,50,160,0.14)',
    nebula2: 'rgba(80,40,140,0.10)',
    accent: 'rgba(155,138,191,0.06)',
    isSunrise: false,
    hasLandscape: true,
  },
};

// ─── Ambient Star ───────────────────────────────────────────────
var AmbientStar = React.memo(function ({ x, y, size, delay, dur, color }) {
  var o = useSharedValue(0.1);
  useEffect(function () {
    o.value = withDelay(delay, withRepeat(withSequence(
      withTiming(0.5 + Math.random() * 0.4, { duration: dur * 0.45, easing: Easing.inOut(Easing.ease) }),
      withTiming(0.06 + Math.random() * 0.12, { duration: dur * 0.55, easing: Easing.inOut(Easing.ease) })
    ), -1, true));
  }, []);
  var s = useAnimatedStyle(function () { return { opacity: o.value }; });
  return (
    <Animated.View style={[{
      position: 'absolute', left: x, top: y,
      width: size, height: size, borderRadius: size,
      backgroundColor: color,
    }, size > 1.4 && {
      shadowColor: color, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8, shadowRadius: size * 2, elevation: 0,
    }, s]} />
  );
});

// ─── Generate stars (memoized) ──────────────────────────────────
function useStars() {
  return useMemo(function () {
    var a = [];
    var colors = ['#fff', '#FFE8C4', '#D8E8FF', '#fff', '#FFF5E0', '#C8DAFF'];
    // Bright
    for (var i = 0; i < 5; i++) {
      a.push({ id: i, x: Math.random() * W, y: 20 + Math.random() * H * 0.5, size: 2.2 + Math.random() * 1.2, delay: Math.random() * 3000, dur: 2800 + Math.random() * 2000, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    // Medium
    for (var i = 0; i < 14; i++) {
      a.push({ id: 5 + i, x: Math.random() * W, y: 10 + Math.random() * H * 0.6, size: 1.2 + Math.random() * 0.7, delay: Math.random() * 4000, dur: 2200 + Math.random() * 2500, color: colors[Math.floor(Math.random() * colors.length)] });
    }
    // Small
    for (var i = 0; i < 22; i++) {
      a.push({ id: 19 + i, x: Math.random() * W, y: Math.random() * H * 0.65, size: 0.6 + Math.random() * 0.5, delay: Math.random() * 5000, dur: 2000 + Math.random() * 3000, color: '#fff' });
    }
    // Tiny
    for (var i = 0; i < 18; i++) {
      a.push({ id: 41 + i, x: Math.random() * W, y: Math.random() * H * 0.7, size: 0.3 + Math.random() * 0.3, delay: Math.random() * 5000, dur: 2200 + Math.random() * 2800, color: '#fff' });
    }
    return a;
  }, []);
}

// ─── Pine Tree SVG (silhouette) ─────────────────────────────────
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

// ─── Landscape Silhouette ───────────────────────────────────────
// isSunrise: warm brown/amber tones; night: cool blue/dark tones
var LandscapeSilhouette = React.memo(function ({ isSunrise }) {
  // Color palettes for sunrise vs night
  var mt1 = isSunrise ? '#3A2818' : '#1A3050';
  var mt2 = isSunrise ? '#2C1E12' : '#132640';
  var mt3 = isSunrise ? '#1E140C' : '#0D1E35';
  var ridge = isSunrise ? '#120C06' : '#081520';
  var midTree = isSunrise ? '#100A04' : '#071420';
  var hill = isSunrise ? '#0A0604' : '#040C14';
  var fgTree = isSunrise ? '#060402' : '#020508';
  var ground = isSunrise ? '#040302' : '#020508';

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.35 }}>
      <Svg width="100%" height="100%" viewBox="0 0 375 300" preserveAspectRatio="none">
        {/* Distant mountains */}
        <Path d="M-10,120 Q30,75 80,108 Q130,82 180,100 Q230,72 290,95 Q340,78 390,110 L390,300 L-10,300Z" fill={mt1} opacity={isSunrise ? '0.45' : '0.35'} />
        <Path d="M-10,150 Q50,112 120,142 Q175,118 240,135 Q300,110 390,140 L390,300 L-10,300Z" fill={mt2} opacity={isSunrise ? '0.60' : '0.55'} />
        <Path d="M-10,175 Q70,148 160,170 Q220,150 300,165 Q350,155 390,175 L390,300 L-10,300Z" fill={mt3} opacity={isSunrise ? '0.80' : '0.75'} />

        {/* Tree ridge */}
        <Path d="M-10,205 Q50,188 120,200 Q180,186 250,198 Q310,185 390,206 L390,300 L-10,300Z" fill={ridge} />

        {/* Mid-distance trees */}
        <PineTree x={15}  y={205} sc={1.1} c={midTree} />
        <PineTree x={48}  y={202} sc={1.5} c={midTree} />
        <PineTree x={82}  y={207} sc={0.9} c={midTree} />
        <PineTree x={118} y={200} sc={1.7} c={midTree} />
        <PineTree x={155} y={206} sc={1.2} c={midTree} />
        <PineTree x={195} y={198} sc={1.6} c={midTree} />
        <PineTree x={230} y={204} sc={1.0} c={midTree} />
        <PineTree x={265} y={199} sc={1.8} c={midTree} />
        <PineTree x={302} y={205} sc={1.3} c={midTree} />
        <PineTree x={342} y={201} sc={1.5} c={midTree} />
        <PineTree x={375} y={207} sc={1.1} c={midTree} />

        {/* Foreground hill */}
        <Path d="M-10,245 Q40,230 100,242 Q160,228 230,238 Q290,225 350,240 L390,235 L390,300 L-10,300Z" fill={hill} />

        {/* Foreground trees — left cluster */}
        <PineTree x={-8}  y={268} sc={3.0} c={fgTree} />
        <PineTree x={20}  y={280} sc={3.8} c={fgTree} />
        <PineTree x={50}  y={265} sc={2.6} c={fgTree} />
        <PineTree x={75}  y={285} sc={4.2} c={fgTree} />
        <PineTree x={105} y={272} sc={3.0} c={fgTree} />

        {/* Center gap (open sky view) */}
        <PineTree x={145} y={290} sc={1.6} c={fgTree} />
        <PineTree x={185} y={294} sc={1.2} c={fgTree} />

        {/* Foreground trees — right cluster */}
        <PineTree x={218} y={275} sc={3.4} c={fgTree} />
        <PineTree x={248} y={262} sc={2.8} c={fgTree} />
        <PineTree x={275} y={288} sc={4.0} c={fgTree} />
        <PineTree x={305} y={270} sc={3.2} c={fgTree} />
        <PineTree x={335} y={282} sc={3.6} c={fgTree} />
        <PineTree x={362} y={268} sc={2.8} c={fgTree} />
        <PineTree x={388} y={292} sc={4.4} c={fgTree} />

        {/* Ground */}
        <SvgRect x={-10} y={275} width={400} height={30} fill={ground} />
      </Svg>

      {/* Sunrise horizon glow behind the trees */}
      {isSunrise && (
        <LinearGradient
          colors={['transparent', 'rgba(255,140,20,0.06)', 'rgba(255,100,10,0.03)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%' }}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          pointerEvents="none"
        />
      )}
    </View>
  );
});

// ─── Sunrise Sun Orb — animated glow at horizon ────────────────
var SunOrb = React.memo(function () {
  var pulse = useSharedValue(0.7);
  useEffect(function () {
    pulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.65, { duration: 5000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var orbStyle = useAnimatedStyle(function () {
    return {
      opacity: pulse.value,
      transform: [{ scale: interpolate(pulse.value, [0.65, 1], [0.95, 1.08]) }],
    };
  });
  var rayStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse.value, [0.65, 1], [0.15, 0.4]),
      transform: [{ scale: interpolate(pulse.value, [0.65, 1], [0.9, 1.15]) }],
    };
  });

  return (
    <View style={{ position: 'absolute', bottom: H * 0.18, left: 0, right: 0, alignItems: 'center' }}>
      {/* Wide god-rays */}
      <Animated.View style={[{
        position: 'absolute', width: W * 1.4, height: H * 0.5,
        borderRadius: W * 0.7, bottom: -H * 0.2,
        backgroundColor: 'rgba(255,168,32,0.04)',
      }, rayStyle]} />
      {/* Medium glow halo */}
      <Animated.View style={[{
        position: 'absolute', width: W * 0.8, height: W * 0.4,
        borderRadius: W * 0.4, bottom: -W * 0.08,
        backgroundColor: 'rgba(255,140,20,0.08)',
      }, rayStyle]} />
      {/* Sun disc */}
      <Animated.View style={[{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(255,180,40,0.22)',
        shadowColor: '#FFA820', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 60, elevation: 0,
      }, orbStyle]} />
      {/* Hot core */}
      <Animated.View style={[{
        position: 'absolute', bottom: 16, width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,220,100,0.30)',
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 30, elevation: 0,
      }, orbStyle]} />
    </View>
  );
});

// ─── Horizon Haze Bands (sunrise only) ─────────────────────────
var HorizonHaze = React.memo(function () {
  var drift = useSharedValue(0);
  useEffect(function () {
    drift.value = withRepeat(withSequence(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 18000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var band1 = useAnimatedStyle(function () {
    return { opacity: interpolate(drift.value, [0, 1], [0.12, 0.22]), transform: [{ translateX: interpolate(drift.value, [0, 1], [-10, 10]) }] };
  });
  var band2 = useAnimatedStyle(function () {
    return { opacity: interpolate(drift.value, [0, 1], [0.08, 0.16]), transform: [{ translateX: interpolate(drift.value, [0, 1], [8, -8]) }] };
  });
  return (
    <>
      <Animated.View style={[{
        position: 'absolute', bottom: H * 0.24, left: -20, right: -20, height: 3,
        backgroundColor: 'rgba(255,180,60,0.25)', borderRadius: 2,
      }, band1]} />
      <Animated.View style={[{
        position: 'absolute', bottom: H * 0.28, left: -10, right: -10, height: 2,
        backgroundColor: 'rgba(255,140,40,0.15)', borderRadius: 1,
      }, band2]} />
      <Animated.View style={[{
        position: 'absolute', bottom: H * 0.20, left: -30, right: -30, height: 4,
        backgroundColor: 'rgba(255,200,80,0.10)', borderRadius: 2,
      }, band2]} />
    </>
  );
});

// ─── Shooting Star ──────────────────────────────────────────────
var ShootingStar = React.memo(function ({ delay, startX, startY, angle, length, duration }) {
  var progress = useSharedValue(0);
  var visible = useSharedValue(0);

  useEffect(function () {
    function fire() {
      visible.value = 1;
      progress.value = 0;
      progress.value = withTiming(1, { duration: duration, easing: Easing.out(Easing.quad) }, function (fin) {
        if (fin) {
          visible.value = 0;
          // re-fire after random pause
          var nextDelay = 4000 + Math.random() * 12000;
          progress.value = 0;
          visible.value = withDelay(nextDelay, withTiming(0, { duration: 0 }));
          progress.value = withDelay(nextDelay, withTiming(0, { duration: 0 }));
          // Use a timeout approach via withDelay + withSequence
          progress.value = withDelay(nextDelay, withTiming(1, { duration: duration, easing: Easing.out(Easing.quad) }));
          visible.value = withDelay(nextDelay, withSequence(
            withTiming(1, { duration: 0 }),
            withDelay(duration, withTiming(0, { duration: 200 }))
          ));
        }
      });
    }
    var t = setTimeout(fire, delay);
    return function () { clearTimeout(t); };
  }, []);

  var rad = (angle * Math.PI) / 180;
  var dx = Math.cos(rad) * length;
  var dy = Math.sin(rad) * length;

  var headStyle = useAnimatedStyle(function () {
    return {
      opacity: visible.value * interpolate(progress.value, [0, 0.1, 0.7, 1], [0, 1, 0.8, 0]),
      transform: [
        { translateX: progress.value * dx },
        { translateY: progress.value * dy },
      ],
    };
  });

  var tailStyle = useAnimatedStyle(function () {
    var tailLen = Math.min(length * 0.4, 60);
    var tailDx = Math.cos(rad) * tailLen;
    var tailDy = Math.sin(rad) * tailLen;
    return {
      opacity: visible.value * interpolate(progress.value, [0, 0.15, 0.6, 1], [0, 0.6, 0.3, 0]),
      transform: [
        { translateX: progress.value * dx - tailDx * 0.5 },
        { translateY: progress.value * dy - tailDy * 0.5 },
        { rotate: angle + 'deg' },
        { scaleX: interpolate(progress.value, [0, 0.3, 1], [0.3, 1, 0.6]) },
      ],
      width: tailLen,
    };
  });

  return (
    <>
      {/* Tail streak */}
      <Animated.View style={[{
        position: 'absolute', left: startX, top: startY,
        height: 1.5, borderRadius: 1,
        backgroundColor: 'rgba(255,255,255,0.4)',
      }, tailStyle]} />
      {/* Bright head */}
      <Animated.View style={[{
        position: 'absolute', left: startX, top: startY,
        width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: '#fff',
        shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 6, elevation: 0,
      }, headStyle]} />
    </>
  );
});

// ─── Generate shooting star configs ─────────────────────────────
function useShootingStars() {
  return useMemo(function () {
    var stars = [];
    for (var i = 0; i < 3; i++) {
      stars.push({
        id: i,
        delay: 2000 + i * 5000 + Math.random() * 4000,
        startX: W * 0.15 + Math.random() * W * 0.6,
        startY: 30 + Math.random() * H * 0.3,
        angle: 25 + Math.random() * 30, // 25-55 degrees downward-right
        length: 80 + Math.random() * 120,
        duration: 600 + Math.random() * 500,
      });
    }
    return stars;
  }, []);
}

// ─── Main Component ─────────────────────────────────────────────
export default function TabBackground({ tabName }) {
  var theme = THEMES[tabName] || THEMES.index;
  var stars = useStars();
  var shootingStars = useShootingStars();

  // Nebula pulse
  var nebPulse = useSharedValue(0.22);
  useEffect(function () {
    nebPulse.value = withRepeat(withSequence(
      withTiming(0.38, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0.16, { duration: 12000, easing: Easing.inOut(Easing.sin) })
    ), -1, true);
  }, []);
  var nebStyle = useAnimatedStyle(function () { return { opacity: nebPulse.value }; });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Sky gradient */}
      <LinearGradient
        colors={theme.sky}
        locations={theme.isSunrise
          ? [0, 0.08, 0.18, 0.30, 0.45, 0.58, 0.72, 0.86, 1]
          : [0, 0.15, 0.35, 0.6, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Sunrise-specific layers */}
      {theme.isSunrise && (
        <>
          {/* Warm horizon glow wash */}
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(255,120,20,0.06)', 'rgba(255,160,40,0.14)', 'rgba(255,180,60,0.22)']}
            locations={[0, 0.4, 0.65, 0.82, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <HorizonHaze />
          <SunOrb />
        </>
      )}

      {/* Nebula glows */}
      <Animated.View style={[{
        position: 'absolute', top: H * 0.04, left: -W * 0.15,
        width: W * 0.75, height: H * 0.35, borderRadius: W * 0.38,
        backgroundColor: theme.nebula1,
      }, nebStyle]} />
      <Animated.View style={[{
        position: 'absolute', top: H * 0.12, right: -W * 0.10,
        width: W * 0.55, height: H * 0.28, borderRadius: W * 0.28,
        backgroundColor: theme.nebula2,
      }, nebStyle]} />

      {/* Stars — fewer and fainter in sunrise */}
      {stars.map(function (st) {
        if (theme.isSunrise && st.y > H * 0.45) return null;
        return <AmbientStar key={st.id} x={st.x} y={st.y}
          size={theme.isSunrise ? st.size * 0.7 : st.size}
          delay={st.delay} dur={st.dur} color={st.color} />;
      })}

      {/* Shooting stars */}
      {shootingStars.map(function (ss) {
        return <ShootingStar key={ss.id} delay={ss.delay} startX={ss.startX} startY={ss.startY} angle={ss.angle} length={ss.length} duration={ss.duration} />;
      })}

      {/* Landscape silhouette — mountains & trees */}
      {theme.hasLandscape && <LandscapeSilhouette isSunrise={theme.isSunrise} />}

      {/* Subtle accent glow at bottom */}
      <LinearGradient
        colors={['transparent', theme.accent, 'transparent']}
        style={{ position: 'absolute', bottom: H * 0.08, left: 0, right: 0, height: H * 0.15 }}
      />

      {/* Bottom fade to ground */}
      <LinearGradient
        colors={['transparent', theme.isSunrise ? 'rgba(4,3,2,0.5)' : 'rgba(2,5,8,0.5)', theme.isSunrise ? 'rgba(4,3,2,0.85)' : 'rgba(2,5,8,0.85)']}
        locations={[0, 0.4, 1]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: H * 0.10 }}
      />
    </View>
  );
}
