/**
 * CosmicLoader — Cinematic drop-in replacement for ActivityIndicator.
 * Features: orbiting zodiac signs, pulsing logo core, rotating ring, optional text.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  interpolate, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { boxShadow } from '../../utils/shadow';
import useReducedMotion from '../../hooks/useReducedMotion';

const LOGO = require('../../assets/logo.png');

// 12 zodiac images, ordered Aries → Pisces (clockwise from 12 o'clock).
const ZODIAC_IMAGES = [
  require('../../assets/zodiac/aries.png'),
  require('../../assets/zodiac/taurus.png'),
  require('../../assets/zodiac/gemini.png'),
  require('../../assets/zodiac/cancer.png'),
  require('../../assets/zodiac/leo.png'),
  require('../../assets/zodiac/virgo.png'),
  require('../../assets/zodiac/libra.png'),
  require('../../assets/zodiac/scorpio.png'),
  require('../../assets/zodiac/sagittarius.png'),
  require('../../assets/zodiac/capricorn.png'),
  require('../../assets/zodiac/aquarius.png'),
  require('../../assets/zodiac/pisces.png'),
];

const ORBIT_GLOWS = ['#FBBF24', '#C084FC', '#34D399', '#60A5FA', '#F472B6', '#FCD34D'];

function OrbitZodiac({ index, count, radius, duration, glow, iconSize, image, skipAnim }) {
  const angle = useSharedValue(((2 * Math.PI) / count) * index - Math.PI / 2);

  useEffect(() => {
    if (skipAnim) {
      cancelAnimation(angle);
      return;
    }
    angle.value = withRepeat(
      withTiming(angle.value + 2 * Math.PI, { duration, easing: Easing.linear }),
      -1
    );
    return function () { cancelAnimation(angle); };
  }, [skipAnim]);

  const animStyle = useAnimatedStyle(() => {
    const x = Math.cos(angle.value) * radius;
    const y = Math.sin(angle.value) * radius;
    const s = interpolate(Math.sin(angle.value), [-1, 1], [0.7, 1.15]);
    return {
      transform: [{ translateX: x }, { translateY: y }, { scale: s }],
      opacity: interpolate(Math.sin(angle.value), [-1, 1], [0.45, 1]),
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.04)',
          ...boxShadow(glow, { width: 0, height: 0 }, 0.7, iconSize * 0.8),
          elevation: 5,
        },
        animStyle,
      ]}
    >
      <Image
        source={image}
        style={{ width: iconSize * 0.9, height: iconSize * 0.9 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

export default function CosmicLoader({
  size = 40,
  color = '#C084FC',
  text,
  textColor = 'rgba(255,255,255,0.6)',
  style,
}) {
  const reduced = useReducedMotion();
  const coreScale = useSharedValue(0.85);
  const ringRotation = useSharedValue(0);
  const ringOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(coreScale); cancelAnimation(ringRotation); cancelAnimation(ringOpacity);
      coreScale.value = 1; ringRotation.value = 0; ringOpacity.value = 0.4;
      return;
    }
    coreScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
    ringRotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 9000, easing: Easing.linear }),
      -1
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.2, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
    return function () {
      cancelAnimation(coreScale); cancelAnimation(ringRotation); cancelAnimation(ringOpacity);
    };
  }, [reduced]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}rad` }],
    opacity: ringOpacity.value,
  }));

  // Sizing — scale all elements off `size` so the loader works tiny→huge.
  const coreSize = Math.max(size * 0.32, 22);
  const orbitRadius = size * 0.42;
  const iconSize = Math.max(size * 0.16, 14);
  // Show 6 zodiac signs at small sizes for clarity, 12 at larger sizes.
  const orbitCount = reduced ? 4 : (size >= 120 ? 12 : 6);
  const duration = 9000;

  // Pick which zodiac signs to show — evenly distributed if not all 12.
  const zodiacSubset = [];
  const stride = ZODIAC_IMAGES.length / orbitCount;
  for (let i = 0; i < orbitCount; i++) {
    zodiacSubset.push(ZODIAC_IMAGES[Math.floor(i * stride) % ZODIAC_IMAGES.length]);
  }

  return (
    <View style={[styles.container, style]}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer ring — slow rotating constellation track */}
        <Animated.View style={[
          {
            position: 'absolute',
            width: size * 0.95,
            height: size * 0.95,
            borderRadius: size * 0.475,
            borderWidth: 1,
            borderColor: color,
            borderStyle: 'dashed',
          },
          ringStyle,
        ]} />

        {/* Orbiting zodiac glyphs */}
        {zodiacSubset.map((img, i) => (
          <OrbitZodiac
            key={i}
            index={i}
            count={orbitCount}
            radius={orbitRadius}
            duration={duration + i * 250}
            glow={ORBIT_GLOWS[i % ORBIT_GLOWS.length]}
            iconSize={iconSize}
            image={img}
            skipAnim={reduced}
          />
        ))}

        {/* Core — app logo with soft pulse + glow halo */}
        <Animated.View style={[
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(18,14,40,0.55)',
            ...boxShadow(color, { width: 0, height: 0 }, 0.95, coreSize * 1.2),
            elevation: 8,
          },
          coreStyle,
        ]}>
          <Image
            source={LOGO}
            style={{ width: coreSize * 0.78, height: coreSize * 0.78 }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {text ? (
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
