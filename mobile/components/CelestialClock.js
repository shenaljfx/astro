/**
 * CelestialClock - Real-time animated clock with celestial ring
 * Implements: Idea #10 (Real-Time Clock with Celestial Ring)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Circle, Defs, RadialGradient, Stop, Line, G,
  LinearGradient as SvgLG,
} from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, Easing, interpolate,
} from 'react-native-reanimated';
import { useLanguage } from '../contexts/LanguageContext';

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE / 2 - 12;

// Zodiac signs around the clock
const ZODIAC = [
  '♈','♉','♊','♋','♌','♍',
  '♎','♏','♐','♑','♒','♓',
];

export default function CelestialClock({ style }) {
  const { t } = useLanguage();
  const [time, setTime] = useState(new Date());

  const outerGlow = useSharedValue(0.3);
  const ringRotate = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    outerGlow.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );

    ringRotate.value = withRepeat(
      withTiming(360, { duration: 120000, easing: Easing.linear }),
      -1
    );

    return () => clearInterval(timer);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: outerGlow.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: ringRotate.value + 'deg' }],
  }));

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours + minutes / 60) * 30 - 90;
  const minuteAngle = (minutes + seconds / 60) * 6 - 90;
  const secondAngle = seconds * 6 - 90;

  const hourHand = {
    x: CX + Math.cos((hourAngle * Math.PI) / 180) * (R * 0.45),
    y: CY + Math.sin((hourAngle * Math.PI) / 180) * (R * 0.45),
  };
  const minuteHand = {
    x: CX + Math.cos((minuteAngle * Math.PI) / 180) * (R * 0.65),
    y: CY + Math.sin((minuteAngle * Math.PI) / 180) * (R * 0.65),
  };
  const secondHand = {
    x: CX + Math.cos((secondAngle * Math.PI) / 180) * (R * 0.75),
    y: CY + Math.sin((secondAngle * Math.PI) / 180) * (R * 0.75),
  };

  const formatTime = () => {
    const h = time.getHours();
    const m = String(time.getMinutes()).padStart(2, '0');
    const s = String(time.getSeconds()).padStart(2, '0');
    const ampmKey = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return { time: h12 + ':' + m, seconds: s, ampm: t(ampmKey) };
  };
  const ft = formatTime();

  return (
    <View style={[ccS.container, style]}>
      {/* Glow ring */}
      <Animated.View style={[ccS.glowRing, glowStyle]} />

      {/* Zodiac ring (slowly rotates) */}
      <Animated.View style={[ccS.zodiacRing, ringStyle]}>
        {ZODIAC.map((z, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const zr = R + 4;
          return (
            <Text key={i} style={[ccS.zodiacSign, {
              left: CX + Math.cos(angle) * zr - 7,
              top: CY + Math.sin(angle) * zr - 7,
            }]}>{z}</Text>
          );
        })}
      </Animated.View>

      {/* Clock face */}
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id="clockBg" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#0B0A1C" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#04030C" stopOpacity="1" />
          </RadialGradient>
          <SvgLG id="handGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#C084FC" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FBBF24" stopOpacity="1" />
          </SvgLG>
        </Defs>

        {/* Background */}
        <Circle cx={CX} cy={CY} r={R} fill="url(#clockBg)" />

        {/* Outer ring */}
        <Circle cx={CX} cy={CY} r={R} fill="none"
          stroke="rgba(192,132,252,0.3)" strokeWidth={1.5} />

        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180);
          const inner = R - 8;
          const outer = R - 3;
          return (
            <Line key={i}
              x1={CX + Math.cos(angle) * inner}
              y1={CY + Math.sin(angle) * inner}
              x2={CX + Math.cos(angle) * outer}
              y2={CY + Math.sin(angle) * outer}
              stroke={i % 3 === 0 ? '#FBBF24' : 'rgba(192,132,252,0.5)'}
              strokeWidth={i % 3 === 0 ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Hour hand */}
        <Line x1={CX} y1={CY} x2={hourHand.x} y2={hourHand.y}
          stroke="#C084FC" strokeWidth={3} strokeLinecap="round" />

        {/* Minute hand */}
        <Line x1={CX} y1={CY} x2={minuteHand.x} y2={minuteHand.y}
          stroke="#F8FAFC" strokeWidth={2} strokeLinecap="round" />

        {/* Second hand */}
        <Line x1={CX} y1={CY} x2={secondHand.x} y2={secondHand.y}
          stroke="#FBBF24" strokeWidth={1} strokeLinecap="round" />

        {/* Center dot */}
        <Circle cx={CX} cy={CY} r={3} fill="#FBBF24" />
      </Svg>

      {/* Digital time overlay */}
      <View style={ccS.digitalWrap}>
        <Text style={ccS.digitalTime}>{ft.time}</Text>
        <View style={ccS.digitalRow}>
          <Text style={ccS.digitalSec}>:{ft.seconds}</Text>
          <Text style={ccS.digitalAmpm}>{ft.ampm}</Text>
        </View>
      </View>
    </View>
  );
}

const ccS = StyleSheet.create({
  container: {
    width: SIZE + 24,
    height: SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: SIZE + 20,
    height: SIZE + 20,
    borderRadius: (SIZE + 20) / 2,
    borderWidth: 2,
    borderColor: '#FF8C00',
    shadowColor: '#FF8C00',
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 0,
  },
  zodiacRing: {
    position: 'absolute',
    width: SIZE + 24,
    height: SIZE + 24,
  },
  zodiacSign: {
    position: 'absolute',
    fontSize: 12,
    color: 'rgba(192,132,252,0.5)',
    width: 14,
    height: 14,
    textAlign: 'center',
  },
  digitalWrap: {
    position: 'absolute',
    bottom: -2,
    alignItems: 'center',
  },
  digitalTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1,
    textShadowColor: '#FF8C00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  digitalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  digitalSec: {
    fontSize: 10,
    color: '#FBBF24',
    fontWeight: '600',
  },
  digitalAmpm: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    marginLeft: 2,
  },
});
