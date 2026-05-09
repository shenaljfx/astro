import React, { useEffect, memo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence,
  interpolate, Easing,
} from 'react-native-reanimated';

var { width: SW, height: SH } = Dimensions.get('window');

// Pre-computed star positions — 3 tiers: dim dust, mid, bright accent
var STARS_DIM = [];
var STARS_MID = [];
var STARS_BRIGHT = [];
// Golden variant stars — warm amber/bronze tones
var STARS_DIM_GOLD = [];
var STARS_MID_GOLD = [];
var STARS_BRIGHT_GOLD = [];
var STARS_DIM_ROYAL = [];
var STARS_MID_ROYAL = [];
var STARS_BRIGHT_ROYAL = [];
(function () {
  for (var i = 0; i < 35; i++) {
    var baseX = ((i * 7919 + 2741) % 1000) / 10;
    var baseY = ((i * 4517 + 1433) % 1000) / 10;
    var baseSize = 1 + ((i * 3137) % 100) / 120;
    var baseOp = 0.08 + ((i * 6271) % 100) / 350;
    var baseSpd = 3000 + ((i * 2399) % 4000);
    var baseDly = ((i * 1847) % 3000);
    STARS_DIM.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? '#E9D5FF' : '#FFF8E1',
    });
    STARS_DIM_GOLD.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp * 0.9, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? '#FFE4B5' : i % 3 === 1 ? '#D4A574' : '#FFF0D0',
    });
    STARS_DIM_ROYAL.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp * 0.92, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? Colors.luxuryGoldSoft : i % 3 === 1 ? '#C8A96A' : '#BFA4FF',
    });
  }
  for (var i = 0; i < 14; i++) {
    var baseX = ((i * 5431 + 917) % 1000) / 10;
    var baseY = ((i * 8513 + 4219) % 1000) / 10;
    var baseSize = 1.5 + ((i * 2741) % 100) / 65;
    var baseOp = 0.2 + ((i * 3719) % 100) / 250;
    var baseSpd = 2000 + ((i * 1913) % 3000);
    var baseDly = ((i * 2371) % 2500);
    STARS_MID.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp, speed: baseSpd, delay: baseDly,
      color: i % 4 === 0 ? '#C4B5FD' : i % 4 === 1 ? '#DDD6FE' : '#FFF8E1',
    });
    STARS_MID_GOLD.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp, speed: baseSpd, delay: baseDly,
      color: i % 4 === 0 ? '#FFD700' : i % 4 === 1 ? '#DAA520' : i % 4 === 2 ? '#F4C430' : '#FFEAA7',
    });
    STARS_MID_ROYAL.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp, speed: baseSpd, delay: baseDly,
      color: i % 4 === 0 ? Colors.luxuryGold : i % 4 === 1 ? Colors.luxuryGoldSoft : i % 4 === 2 ? '#A987FF' : '#FFF7DD',
    });
  }
  for (var i = 0; i < 6; i++) {
    var baseX = ((i * 9721 + 1571) % 1000) / 10;
    var baseY = ((i * 3517 + 7919) % 1000) / 10;
    var baseSize = 2.5 + ((i * 1847) % 100) / 55;
    var baseOp = 0.4 + ((i * 6197) % 100) / 350;
    var baseSpd = 1500 + ((i * 3571) % 2000);
    var baseDly = ((i * 997) % 2000);
    STARS_BRIGHT.push({ x: baseX, y: baseY, size: baseSize, baseOpacity: baseOp, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? '#A78BFA' : i % 3 === 1 ? '#C084FC' : '#FBBF24',
    });
    STARS_BRIGHT_GOLD.push({ x: baseX, y: baseY, size: baseSize * 1.1, baseOpacity: baseOp * 1.1, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? '#FFB800' : i % 3 === 1 ? '#FF8C00' : '#FFD700',
    });
    STARS_BRIGHT_ROYAL.push({ x: baseX, y: baseY, size: baseSize * 1.05, baseOpacity: baseOp * 1.04, speed: baseSpd, delay: baseDly,
      color: i % 3 === 0 ? Colors.luxuryGoldSoft : i % 3 === 1 ? Colors.luxuryGold : '#BFA4FF',
    });
  }
})();

var CosmicStar = memo(function CosmicStar({ star, reduced }) {
  var twinkle = useSharedValue(0);
  useEffect(function () {
    if (reduced) return;
    twinkle.value = withDelay(star.delay,
      withRepeat(withSequence(
        withTiming(1, { duration: star.speed * 0.4, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: star.speed * 0.6, easing: Easing.inOut(Easing.sin) })
      ), -1, false)
    );
  }, [reduced]);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(twinkle.value, [0, 1], [star.baseOpacity * 0.15, star.baseOpacity]),
      transform: [{ scale: interpolate(twinkle.value, [0, 1], [0.4, 1.4]) }],
    };
  });
  return (
    <Animated.View style={[{
      position: 'absolute', left: star.x + '%', top: star.y + '%',
      width: star.size, height: star.size, borderRadius: star.size / 2,
      backgroundColor: star.color,
    }, style]} />
  );
});

function CosmicBackground({ reduced, lowEnd, variant }) {
  var isRoyal = variant === 'royalObsidian';
  var isGolden = variant === 'golden';
  var nebulaDrift = useSharedValue(0);
  var auroraPulse = useSharedValue(0);
  var chaosSpin = useSharedValue(0);

  useEffect(function () {
    if (reduced || lowEnd) return;
    nebulaDrift.value = withRepeat(
      withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true
    );
    auroraPulse.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.sin) }), -1, true
    );
    chaosSpin.value = withRepeat(
      withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false
    );
  }, [reduced, lowEnd]);

  var nebula1Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(nebulaDrift.value, [0, 0.5, 1], [0.12, 0.22, 0.12]),
      transform: [
        { translateX: interpolate(nebulaDrift.value, [0, 1], [-35, 35]) },
        { translateY: interpolate(nebulaDrift.value, [0, 1], [20, -25]) },
        { scale: interpolate(nebulaDrift.value, [0, 0.5, 1], [1, 1.2, 1]) },
      ],
    };
  });
  var nebula2Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(nebulaDrift.value, [0, 0.5, 1], [0.15, 0.08, 0.15]),
      transform: [
        { translateX: interpolate(nebulaDrift.value, [0, 1], [25, -30]) },
        { translateY: interpolate(nebulaDrift.value, [0, 1], [-15, 22]) },
        { scale: interpolate(nebulaDrift.value, [0, 0.5, 1], [1.1, 0.9, 1.1]) },
      ],
    };
  });
  var nebula3Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(auroraPulse.value, [0, 0.5, 1], [0.05, 0.16, 0.05]),
      transform: [
        { translateX: interpolate(nebulaDrift.value, [0, 1], [15, -20]) },
        { scale: interpolate(auroraPulse.value, [0, 1], [0.85, 1.25]) },
      ],
    };
  });
  var nebula4Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(auroraPulse.value, [0, 0.5, 1], [0.08, 0.18, 0.08]),
      transform: [
        { translateX: interpolate(auroraPulse.value, [0, 1], [-10, 20]) },
        { translateY: interpolate(nebulaDrift.value, [0, 1], [10, -18]) },
        { rotate: interpolate(chaosSpin.value, [0, 1], [0, 360]) + 'deg' },
      ],
    };
  });
  var nebula5Style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(nebulaDrift.value, [0, 0.3, 0.7, 1], [0.06, 0.12, 0.04, 0.06]),
      transform: [
        { scale: interpolate(auroraPulse.value, [0, 1], [1.05, 0.92]) },
      ],
    };
  });
  var centerGlow = useAnimatedStyle(function () {
    return {
      opacity: interpolate(auroraPulse.value, [0, 0.5, 1], [0.06, 0.14, 0.06]),
      transform: [{ scale: interpolate(auroraPulse.value, [0, 1], [0.92, 1.1]) }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={isRoyal
          ? [Colors.luxuryObsidian, '#07050C', Colors.luxuryObsidianMid, '#130B1B', Colors.luxuryObsidianLift, '#0A0610', '#040307']
          : isGolden
          ? ['#0C0804', '#140E06', '#1C1208', '#1A1006', '#170E05', '#100A03', '#0A0602']
          : ['#08031A', '#0D0526', '#150A38', '#1A0D3A', '#12072E', '#0A0420', '#06021A']}
        locations={[0, 0.15, 0.3, 0.45, 0.65, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!lowEnd && (
        <>
          <Animated.View style={[{
            position: 'absolute', width: SW * 0.95, height: SW * 0.95,
            borderRadius: SW * 0.475, top: -SH * 0.12, right: -SW * 0.3,
            backgroundColor: isRoyal ? 'rgba(214,181,109,0.12)' : isGolden ? 'rgba(180,120,30,0.18)' : 'rgba(147,51,234,0.20)',
          }, nebula1Style]} />
          <Animated.View style={[{
            position: 'absolute', width: SW * 0.8, height: SW * 0.8,
            borderRadius: SW * 0.4, bottom: -SH * 0.02, left: -SW * 0.25,
            backgroundColor: isRoyal ? 'rgba(123,73,207,0.14)' : isGolden ? 'rgba(139,90,20,0.16)' : 'rgba(109,40,217,0.18)',
          }, nebula2Style]} />
          <Animated.View style={[{
            position: 'absolute', width: SW * 0.55, height: SW * 0.55,
            borderRadius: SW * 0.275, top: SH * 0.28, right: -SW * 0.1,
            backgroundColor: isRoyal ? 'rgba(244,228,188,0.08)' : isGolden ? 'rgba(218,165,32,0.12)' : 'rgba(192,132,252,0.14)',
          }, nebula3Style]} />
          <Animated.View style={[{
            position: 'absolute', width: SW * 0.65, height: SW * 0.45,
            borderRadius: SW * 0.225, top: SH * 0.15, left: -SW * 0.08,
            backgroundColor: isRoyal ? 'rgba(71,43,118,0.12)' : isGolden ? 'rgba(160,100,20,0.10)' : 'rgba(99,102,241,0.10)',
          }, nebula4Style]} />
          <Animated.View style={[{
            position: 'absolute', width: SW * 1.2, height: SH * 0.5,
            borderRadius: SW * 0.3, top: SH * 0.2, left: -SW * 0.1,
            backgroundColor: isRoyal ? 'rgba(214,181,109,0.055)' : isGolden ? 'rgba(200,150,50,0.07)' : 'rgba(139,92,246,0.08)',
          }, nebula5Style]} />
          <Animated.View style={[{
            position: 'absolute', width: SW * 0.85, height: SW * 0.85,
            borderRadius: SW * 0.425,
            top: SH * 0.2, left: (SW - SW * 0.85) / 2,
            backgroundColor: isRoyal ? 'rgba(244,228,188,0.055)' : isGolden ? 'rgba(255,184,0,0.06)' : 'rgba(167,139,250,0.08)',
          }, centerGlow]} />
        </>
      )}
      {!lowEnd && (
        <>
          {(isRoyal ? STARS_DIM_ROYAL : isGolden ? STARS_DIM_GOLD : STARS_DIM).map(function (star, i) {
            return <CosmicStar key={'sd' + i} star={star} reduced={reduced} />;
          })}
          {(isRoyal ? STARS_MID_ROYAL : isGolden ? STARS_MID_GOLD : STARS_MID).map(function (star, i) {
            return <CosmicStar key={'sm' + i} star={star} reduced={reduced} />;
          })}
          {(isRoyal ? STARS_BRIGHT_ROYAL : isGolden ? STARS_BRIGHT_GOLD : STARS_BRIGHT).map(function (star, i) {
            return <CosmicStar key={'sb' + i} star={star} reduced={reduced} />;
          })}
        </>
      )}
      <LinearGradient
        colors={isRoyal
          ? ['rgba(5,4,9,0.84)', 'transparent', 'transparent', 'rgba(4,3,7,0.80)']
          : isGolden
          ? ['rgba(12,8,4,0.80)', 'transparent', 'transparent', 'rgba(10,6,2,0.75)']
          : ['rgba(15,5,36,0.85)', 'transparent', 'transparent', 'rgba(10,4,32,0.80)']}
        locations={[0, 0.18, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

var MemoCosmicBackground = memo(CosmicBackground);
export { MemoCosmicBackground as CosmicBackground };
