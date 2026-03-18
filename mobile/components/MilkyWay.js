/**
 * MilkyWay.js — Realistic Milky Way band
 *
 * A diagonal strip of ~220 faint stars concentrated in a Gaussian band,
 * plus subtle diffuse glow gradients underneath. No bold colored aurora —
 * just a natural-looking luminous river of unresolved starlight.
 */
import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedProps, useAnimatedStyle,
  withRepeat, withTiming, withSequence,
  interpolate, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

var W = Dimensions.get('window').width;
var H = Dimensions.get('window').height;

var AnimG = Animated.createAnimatedComponent(G);

var BAND_ANGLE = -32;
var BAND_RAD = (BAND_ANGLE * Math.PI) / 180;
var COS_B = Math.cos(BAND_RAD);
var SIN_B = Math.sin(BAND_RAD);
var DIAG = Math.sqrt(W * W + H * H);
var BAND_W = W * 0.32;

function makeBandStars(n) {
  var result = [];
  var cx = W / 2, cy = H / 2;
  for (var i = 0; i < n; i++) {
    var along = (Math.random() * 2 - 1) * DIAG * 0.6;
    var spread = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    var across = spread * BAND_W;

    var x = cx + along * COS_B - across * SIN_B;
    var y = cy + along * SIN_B + across * COS_B;
    if (x < -15 || x > W + 15 || y < -15 || y > H + 15) continue;

    var distFrac = Math.abs(spread);
    var bright = Math.max(0.05, 1 - distFrac * 1.6);
    var r = bright > 0.6 ? 0.5 + Math.random() * 0.8 : 0.3 + Math.random() * 0.4;
    var op = bright * (0.12 + Math.random() * 0.38);

    result.push({ id: i, x: x, y: y, r: r, op: op });
  }
  return result;
}

var MilkyWay = React.memo(function (props) {
  var stars = useMemo(function () { return makeBandStars(220); }, []);

  var breathe = useSharedValue(0);
  useEffect(function () {
    breathe.value = withRepeat(withSequence(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, []);

  var starsProps = useAnimatedProps(function () {
    return { opacity: interpolate(breathe.value, [0, 1], [0.50, 0.82]) };
  });

  var glowStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(breathe.value, [0, 1], [0.30, 0.50]) };
  });

  return (
    <View style={[s.wrap, props.style]} pointerEvents="none">
      {/* Diffuse glow — subtle diagonal luminosity */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(210,210,225,0.025)', 'rgba(220,218,235,0.05)', 'rgba(210,210,225,0.025)', 'transparent']}
          locations={[0, 0.30, 0.50, 0.70, 1]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.72 }}
          end={{ x: 1, y: 0.28 }}
        />
        <LinearGradient
          colors={['transparent', 'rgba(225,222,240,0.03)', 'rgba(235,230,248,0.06)', 'rgba(225,222,240,0.03)', 'transparent']}
          locations={[0, 0.37, 0.50, 0.63, 1]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.70 }}
          end={{ x: 1, y: 0.30 }}
        />
      </Animated.View>

      {/* Star field concentrated in diagonal band */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <AnimG animatedProps={starsProps}>
          {stars.map(function (st) {
            return <Circle key={st.id} cx={st.x} cy={st.y} r={st.r} fill="rgba(230,230,245,1)" opacity={st.op} />;
          })}
        </AnimG>
      </Svg>
    </View>
  );
});

var s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
});

export default MilkyWay;
