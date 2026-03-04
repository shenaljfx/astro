/**
 * SkeletonLoader - Premium shimmer loading states with zodiac constellation animations
 * Accurate constellation patterns that draw in while content loads
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, Easing, interpolate, FadeIn, FadeInDown,
} from 'react-native-reanimated';
import { useLanguage } from '../contexts/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');

/* ================================================================
   ZODIAC CONSTELLATION DATA (for loading animations)
   ================================================================ */
const LOADING_CONSTELLATIONS = [
  {
    name: 'Leo',
    stars: [[0.20,0.55],[0.28,0.42],[0.35,0.30],[0.48,0.25],[0.58,0.30],[0.55,0.42],[0.48,0.50],[0.60,0.55],[0.70,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8]],
    color: '#F59E0B',
  },
  {
    name: 'Scorpio',
    stars: [[0.12,0.30],[0.22,0.25],[0.32,0.30],[0.42,0.28],[0.52,0.32],[0.60,0.40],[0.68,0.50],[0.75,0.55],[0.82,0.48],[0.88,0.42]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
    color: '#EF4444',
  },
  {
    name: 'Gemini',
    stars: [[0.30,0.15],[0.28,0.30],[0.25,0.45],[0.22,0.58],[0.50,0.15],[0.48,0.30],[0.45,0.45],[0.42,0.55],[0.35,0.32]],
    lines: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,7],[1,8],[8,5]],
    color: '#FBBF24',
  },
  {
    name: 'Pisces',
    stars: [[0.18,0.40],[0.28,0.32],[0.38,0.28],[0.50,0.35],[0.60,0.30],[0.72,0.35],[0.80,0.42],[0.70,0.50],[0.58,0.48],[0.48,0.52]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,3]],
    color: '#8B5CF6',
  },
  {
    name: 'Sagittarius',
    stars: [[0.25,0.60],[0.35,0.45],[0.45,0.35],[0.55,0.25],[0.50,0.50],[0.40,0.55],[0.60,0.40],[0.65,0.30]],
    lines: [[0,1],[1,2],[2,3],[2,4],[4,5],[5,0],[2,6],[6,7]],
    color: '#F59E0B',
  },
  {
    name: 'Taurus',
    stars: [[0.20,0.42],[0.30,0.35],[0.38,0.30],[0.48,0.25],[0.55,0.20],[0.42,0.38],[0.50,0.45],[0.55,0.50],[0.62,0.48],[0.58,0.55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[2,5],[5,6],[6,7],[7,8],[7,9]],
    color: '#10B981',
  },
];

/* ================================================================
   ANIMATED CONSTELLATION DRAWING
   Stars appear one by one, then lines draw in
   ================================================================ */
const ConstellationDrawing = React.memo(({ constellation, size = 160, delay: startDelay = 0 }) => {
  const { stars, lines, color } = constellation;

  // Each star fades in sequentially
  const starProgs = stars.map((_, i) => {
    const sv = useSharedValue(0);
    useEffect(() => {
      sv.value = withDelay(
        startDelay + i * 120,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
      );
    }, []);
    return sv;
  });

  // Lines draw in after stars
  const lineProgress = useSharedValue(0);
  useEffect(() => {
    lineProgress.value = withDelay(
      startDelay + stars.length * 120 + 200,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
  }, []);

  // Gentle overall breathing after fully drawn
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withDelay(
      startDelay + stars.length * 120 + 1500,
      withRepeat(withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ), -1, true)
    );
  }, []);

  const breatheStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.98, 1.02]) }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, breatheStyle]}>
      <Svg width={size} height={size}>
        {/* Lines */}
        {lines.map(([a, b], li) => {
          const lineStyle = useAnimatedStyle(() => ({
            opacity: interpolate(lineProgress.value, 
              [li / lines.length, Math.min(1, (li + 1) / lines.length)],
              [0, 0.4]
            ),
          }));
          return (
            <Animated.View key={'l' + li} style={[StyleSheet.absoluteFill, lineStyle]}>
              <Svg width={size} height={size}>
                <Line
                  x1={stars[a][0] * size} y1={stars[a][1] * size}
                  x2={stars[b][0] * size} y2={stars[b][1] * size}
                  stroke={color} strokeWidth={0.8} strokeOpacity={1}
                />
              </Svg>
            </Animated.View>
          );
        })}
        {/* Stars */}
        {stars.map((s, si) => {
          const starStyle = useAnimatedStyle(() => ({
            opacity: starProgs[si].value,
            transform: [{ scale: interpolate(starProgs[si].value, [0, 1], [0, 1]) }],
          }));
          return (
            <Animated.View key={'s' + si} style={[{
              position: 'absolute',
              left: s[0] * size - 4,
              top: s[1] * size - 4,
              width: 8,
              height: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }, starStyle]}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: color, opacity: 0.15,
              }} />
              <View style={{
                position: 'absolute',
                width: 2.5, height: 2.5, borderRadius: 1.25,
                backgroundColor: '#fff',
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1, shadowRadius: 4, elevation: 3,
              }} />
            </Animated.View>
          );
        })}
      </Svg>
    </Animated.View>
  );
});

/* ================================================================
   SHIMMER BAR
   ================================================================ */
const ShimmerBar = ({ width = '100%', height = 16, borderRadius = 8, style }) => {
  const shimmer = useSharedValue(-1);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-W, W]) }],
  }));

  return (
    <View style={[skS.bar, { width, height, borderRadius }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(192,132,252,0.08)', 'rgba(147,51,234,0.15)', 'rgba(192,132,252,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { width: W }]}
        />
      </Animated.View>
    </View>
  );
};

/* ================================================================
   PRE-BUILT SKELETON LAYOUTS WITH CONSTELLATION ANIMATIONS
   ================================================================ */

/* Card Skeleton with constellation drawing in the background */
export const CardSkeleton = ({ style }) => {
  const constellation = useMemo(() =>
    LOADING_CONSTELLATIONS[Math.floor(Math.random() * LOADING_CONSTELLATIONS.length)], []);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[skS.card, style]}>
      {/* Background constellation drawing */}
      <View style={skS.constellationBg}>
        <ConstellationDrawing constellation={constellation} size={120} delay={200} />
      </View>
      <View style={skS.cardHeader}>
        <ShimmerBar width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <ShimmerBar width="60%" height={14} />
          <ShimmerBar width="40%" height={10} style={{ marginTop: 8 }} />
        </View>
      </View>
      <ShimmerBar width="100%" height={12} style={{ marginTop: 16 }} />
      <ShimmerBar width="80%" height={12} style={{ marginTop: 8 }} />
      <ShimmerBar width="90%" height={12} style={{ marginTop: 8 }} />
    </Animated.View>
  );
};

/* Stat Skeleton with mini constellation */
export const StatSkeleton = ({ style }) => {
  const constellation = useMemo(() =>
    LOADING_CONSTELLATIONS[Math.floor(Math.random() * LOADING_CONSTELLATIONS.length)], []);

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={[skS.stat, style]}>
      <View style={skS.constellationBgSmall}>
        <ConstellationDrawing constellation={constellation} size={80} delay={400} />
      </View>
      <ShimmerBar width={38} height={38} borderRadius={19} />
      <ShimmerBar width="70%" height={10} style={{ marginTop: 8 }} />
      <ShimmerBar width="50%" height={14} style={{ marginTop: 6 }} />
    </Animated.View>
  );
};

/* Chat Bubble Skeleton */
export const ChatBubbleSkeleton = ({ isUser = false, style }) => (
  <Animated.View entering={FadeInDown.duration(400).delay(200)} style={[skS.bubble, isUser ? skS.userBubble : skS.aiBubble, style]}>
    {!isUser && (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
        <ShimmerBar width={8} height={8} borderRadius={4} />
        <ShimmerBar width={60} height={10} borderRadius={5} />
      </View>
    )}
    <ShimmerBar width="90%" height={12} />
    <ShimmerBar width="70%" height={12} style={{ marginTop: 6 }} />
    {!isUser && <ShimmerBar width="50%" height={12} style={{ marginTop: 6 }} />}
  </Animated.View>
);

/* Zodiac Grid Skeleton with constellation patterns */
export const ZodiacGridSkeleton = () => (
  <Animated.View entering={FadeIn.duration(600)} style={skS.zodiacGrid}>
    {LOADING_CONSTELLATIONS.slice(0, 6).map((c, i) => (
      <View key={i} style={skS.zodiacItem}>
        <View style={skS.zodiacItemInner}>
          <ConstellationDrawing constellation={c} size={60} delay={i * 200} />
          <ShimmerBar width="60%" height={8} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>
    ))}
  </Animated.View>
);

/* Full-screen loading with large constellation drawing */
export const CosmicLoadingScreen = ({ text }) => {
  const { t } = useLanguage();
  const loadingText = text || t('loading');
  
  const constellation = useMemo(() =>
    LOADING_CONSTELLATIONS[Math.floor(Math.random() * LOADING_CONSTELLATIONS.length)], []);

  // Map western names to Rashi keys
  const getRashiName = (westernName) => {
    const map = {
      'Leo': 'simha',
      'Scorpio': 'vrischika',
      'Gemini': 'mithuna',
      'Pisces': 'meena',
      'Sagittarius': 'dhanu',
      'Taurus': 'vrishabha',
    };
    const key = map[westernName];
    return key ? t(key) : westernName;
  };

  const textPulse = useSharedValue(0);
  useEffect(() => {
    textPulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(textPulse.value, [0, 1], [0.4, 0.9]),
  }));

  return (
    <View style={skS.cosmicLoading}>
      <LinearGradient
        colors={['#030014', '#0a0520', '#0f0a2e', '#06021a']}
        style={StyleSheet.absoluteFill}
      />
      <ConstellationDrawing constellation={constellation} size={200} delay={0} />
      <Animated.Text style={[skS.cosmicLoadingText, textStyle]}>{loadingText}</Animated.Text>
      <Text style={skS.cosmicLoadingName}>{getRashiName(constellation.name)}</Text>
    </View>
  );
};

export { ShimmerBar, ConstellationDrawing, LOADING_CONSTELLATIONS };
export default ShimmerBar;

/* ================================================================
   STYLES
   ================================================================ */
const skS = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(21,25,59,0.6)',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(21,25,59,0.35)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  constellationBg: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.5,
  },
  constellationBgSmall: {
    position: 'absolute',
    right: -5,
    top: -5,
    opacity: 0.4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(21,25,59,0.35)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(147,51,234,0.25)',
    borderColor: 'rgba(192,132,252,0.15)',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(21,25,59,0.4)',
    borderColor: 'rgba(255,255,255,0.05)',
    borderBottomLeftRadius: 6,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  zodiacItem: {
    width: (W - 56) / 3,
    aspectRatio: 0.82,
    borderRadius: 16,
    backgroundColor: 'rgba(21,25,59,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  zodiacItemInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cosmicLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cosmicLoadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C084FC',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 20,
  },
  cosmicLoadingName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
