/**
 * EntranceCeremony - App launch splash with zodiac constellation reveal
 * Cosmic vortex + constellation drawing animation that reveals the app
 */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, withSpring, withRepeat, Easing, interpolate, runOnJS,
} from 'react-native-reanimated';
import { useLanguage } from '../contexts/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

const NUM_RINGS = 5;
const NUM_PARTICLES = 20;

/* ================================================================
   ZODIAC CONSTELLATION DATA FOR SPLASH
   ================================================================ */
const SPLASH_CONSTELLATIONS = [
  {
    name: 'Leo',
    stars: [[0.20,0.55],[0.28,0.42],[0.35,0.30],[0.48,0.25],[0.58,0.30],[0.55,0.42],[0.48,0.50],[0.60,0.55],[0.70,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8]],
    color: '#F59E0B',
  },
  {
    name: 'Scorpio',
    stars: [[0.12,0.35],[0.22,0.28],[0.32,0.32],[0.42,0.28],[0.52,0.35],[0.60,0.42],[0.68,0.52],[0.75,0.55],[0.82,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]],
    color: '#EF4444',
  },
  {
    name: 'Sagittarius',
    stars: [[0.25,0.60],[0.35,0.45],[0.45,0.35],[0.55,0.25],[0.50,0.50],[0.40,0.55],[0.60,0.40],[0.65,0.30]],
    lines: [[0,1],[1,2],[2,3],[2,4],[4,5],[5,0],[2,6],[6,7]],
    color: '#FBBF24',
  },
  {
    name: 'Pisces',
    stars: [[0.18,0.40],[0.28,0.32],[0.38,0.28],[0.50,0.35],[0.60,0.30],[0.72,0.35],[0.80,0.42],[0.70,0.50],[0.58,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]],
    color: '#8B5CF6',
  },
];

/* ── Constellation Reveal Animation ── */
const SplashConstellation = ({ constellation, size, delay: startDelay }) => {
  const { stars, lines, color } = constellation;

  const overallOp = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    overallOp.value = withDelay(startDelay,
      withSequence(
        withTiming(0.6, { duration: 800, easing: Easing.out(Easing.quad) }),
        withDelay(1200, withTiming(0, { duration: 400 })),
      )
    );
    rotation.value = withDelay(startDelay,
      withTiming(15, { duration: 2400, easing: Easing.out(Easing.quad) })
    );
    scale.value = withDelay(startDelay,
      withSequence(
        withSpring(1, { damping: 12, stiffness: 80 }),
        withDelay(800, withTiming(1.5, { duration: 400, easing: Easing.in(Easing.quad) })),
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: overallOp.value,
    transform: [
      { rotate: rotation.value + 'deg' },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute',
      width: size, height: size,
    }, animStyle]}>
      <Svg width={size} height={size}>
        {lines.map(([a, b], li) => (
          <Line key={'sl' + li}
            x1={stars[a][0] * size} y1={stars[a][1] * size}
            x2={stars[b][0] * size} y2={stars[b][1] * size}
            stroke={color} strokeWidth={0.8} strokeOpacity={0.5}
          />
        ))}
        {stars.map((s, si) => (
          <React.Fragment key={'ss' + si}>
            <Circle cx={s[0] * size} cy={s[1] * size} r={4}
              fill={color} opacity={0.12} />
            <Circle cx={s[0] * size} cy={s[1] * size} r={1.5}
              fill="#fff" opacity={0.85} />
          </React.Fragment>
        ))}
      </Svg>
    </Animated.View>
  );
};

/* ── Cosmic Ring ── */
const CosmicRing = ({ index }) => {
  const ringProgress = useSharedValue(0);

  useEffect(() => {
    ringProgress.value = withDelay(
      index * 120,
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
        withDelay(600, withTiming(2, { duration: 500, easing: Easing.in(Easing.quad) })),
      )
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const baseSize = 60 + index * 55;
    const sc = interpolate(ringProgress.value, [0, 0.5, 1, 1.5, 2], [0, 0.8, 1, 1.2, 3]);
    const op = interpolate(ringProgress.value, [0, 0.3, 1, 1.5, 2], [0, 0.8, 0.5, 0.3, 0]);
    const rot = interpolate(ringProgress.value, [0, 2], [0, 180 + index * 30]);

    return {
      width: baseSize,
      height: baseSize,
      borderRadius: baseSize / 2,
      borderWidth: 1.5,
      borderColor: ['#C084FC', '#818CF8', '#60A5FA', '#FBBF24', '#F0ABFC'][index] || '#C084FC',
      position: 'absolute',
      transform: [{ scale: sc }, { rotate: rot + 'deg' }],
      opacity: op,
    };
  });

  return <Animated.View style={style} />;
};

/* ── Splash Particle ── */
const SplashParticle = ({ x, y, delay: dly }) => {
  const prog = useSharedValue(0);
  useEffect(() => {
    prog.value = withDelay(dly,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
  }, []);

  const st = useAnimatedStyle(() => {
    const angle = Math.atan2(y - H / 2, x - W / 2);
    const dist = interpolate(prog.value, [0, 1], [0, 150]);
    return {
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
      ],
      opacity: interpolate(prog.value, [0, 0.2, 0.8, 1], [0, 1, 0.6, 0]),
    };
  });

  return (
    <Animated.View style={[{
      position: 'absolute', left: W / 2 - 2, top: H / 2 - 2,
      width: 4, height: 4, borderRadius: 2,
      backgroundColor: '#FBBF24',
      shadowColor: '#FBBF24', shadowOpacity: 1, shadowRadius: 8,
      elevation: 3,
    }, st]} />
  );
};

/* ── Main Entrance Ceremony ── */
export default function EntranceCeremony({ visible, onFinish }) {
  const { t } = useLanguage();
  const anim = useRef(new Animated.Value(0)).current;

  const [showing, setShowing] = useState(true);

  const logoScale = useSharedValue(0);
  const logoOp = useSharedValue(0);
  const titleOp = useSharedValue(0);
  const containerOp = useSharedValue(1);
  const vortexScale = useSharedValue(1);
  const glowOp = useSharedValue(0);

  // Pick 3 random constellations for the splash
  const splashConsts = useMemo(() => {
    const shuffled = [...SPLASH_CONSTELLATIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  useEffect(() => {
    // Logo appears
    logoScale.value = withDelay(400,
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    logoOp.value = withDelay(400,
      withTiming(1, { duration: 600 })
    );

    // Glow pulse
    glowOp.value = withDelay(500,
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withTiming(0.3, { duration: 400 }),
        withTiming(0.6, { duration: 300 }),
      )
    );

    // Title
    titleOp.value = withDelay(900,
      withTiming(1, { duration: 500 })
    );

    // Exit: scale up + fade
    containerOp.value = withDelay(2200,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) })
    );
    vortexScale.value = withDelay(2200,
      withTiming(3, { duration: 500, easing: Easing.in(Easing.quad) })
    );

    const timer = setTimeout(() => {
      setShowing(false);
      if (onFinish) onFinish();
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOp.value,
    transform: [{ scale: vortexScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOp.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOp.value,
    transform: [{ translateY: interpolate(titleOp.value, [0, 1], [20, 0]) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOp.value,
  }));

  if (!showing) return null;

  const particles = Array.from({ length: NUM_PARTICLES }).map((_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * W,
    y: H / 2 + (Math.random() - 0.5) * H,
    delay: 600 + Math.random() * 800,
  }));

  // Constellation placements around the logo
  const constPlacements = [
    { x: W * 0.05, y: H * 0.15, size: 180, delay: 100 },
    { x: W * 0.55, y: H * 0.08, size: 160, delay: 300 },
    { x: W * 0.15, y: H * 0.60, size: 150, delay: 500 },
  ];

  return (
    <Animated.View style={[ecS.container, containerStyle]}>
      <LinearGradient
        colors={['#030014', '#0a0520', '#0f0a2e', '#06021a', '#030014']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Zodiac constellation patterns in the background */}
      {splashConsts.map((c, i) => (
        <SplashConstellation
          key={c.name}
          constellation={c}
          size={constPlacements[i].size}
          delay={constPlacements[i].delay}
        />
      ))}

      {/* Cosmic rings */}
      <View style={ecS.center}>
        {Array.from({ length: NUM_RINGS }).map((_, i) => (
          <CosmicRing key={i} index={i} />
        ))}
      </View>

      {/* Particles */}
      {particles.map((p, i) => (
        <SplashParticle key={i} {...p} />
      ))}

      {/* Central glow */}
      <Animated.View style={[ecS.glowWrap, glowStyle]}>
        <Svg width={200} height={200}>
          <Defs>
            <RadialGradient id="splashGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#C084FC" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#9333EA" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={100} cy={100} rx={100} ry={100} fill="url(#splashGlow)" />
        </Svg>
      </Animated.View>

      {/* Logo */}
      <View style={ecS.center}>
        <Animated.Text style={[ecS.logo, logoStyle]}>
          🪐
        </Animated.Text>
        <Animated.Text style={[ecS.title, titleStyle]}>
          {t('appName')}
        </Animated.Text>
        <Animated.Text style={[ecS.subtitle, titleStyle]}>
          {t('appTagline')}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const ecS = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    width: W,
    height: H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowWrap: {
    position: 'absolute',
    left: W / 2 - 100,
    top: H / 2 - 100,
  },
  logo: {
    fontSize: 72,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    textShadowColor: '#9333EA',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
