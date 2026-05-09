import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { ZODIAC_IMAGES } from './ZodiacIcons';
import useReducedMotion from '../hooks/useReducedMotion';
import useLowEndDevice from '../hooks/useLowEndDevice';

var ZODIAC_PATHS = [
  'M-4 4 C-4-2 0-6 0-2 C0-6 4-2 4 4',
  'M-3-3 C-5-6 5-6 3-3 M-3 0 A3 3 0 1 0 3 0 A3 3 0 1 0-3 0',
  'M-4-4 L4-4 M-4 4 L4 4 M-2-4 L-2 4 M2-4 L2 4',
  'M4-1 A3 3 0 0 0-2-1 M-2-1 A1.5 1.5 0 0 0-2 2 M-4 1 A3 3 0 0 0 2 1 M2 1 A1.5 1.5 0 0 0 2-2',
  'M-3 3 A2 2 0 1 1 1 3 Q4 3 4 0 A2 2 0 1 1 0-1',
  'M-4 4 L-4-3 Q-2-5 0-3 L0 4 M0-3 Q2-5 4-3 L4 2 Q5 5 2 5',
  'M-4 1 L4 1 M-4-1 C-4-4 4-4 4-1 M-4 3 L4 3',
  'M-4 4 L-4-3 Q-2-5 0-3 L0 4 M0-3 Q2-5 4-3 L4 4 L5 2',
  'M-3 4 L4-3 M4-3 L1-3 M4-3 L4 0 M-2 3 L2-1',
  'M-4-3 L-1-3 Q2-3 2 0 Q2 3 0 3 A2 2 0 0 1 4 3',
  'M-4-1 Q-2-3 0-1 Q2 1 4-1 M-4 2 Q-2 0 0 2 Q2 4 4 2',
  'M-3-4 A4 4 0 0 0-3 4 M3-4 A4 4 0 0 1 3 4 M-3 0 L3 0',
];

var CONSTELLATIONS = [
  [{ x: 0.13, y: 0.19 }, { x: 0.21, y: 0.13 }, { x: 0.30, y: 0.20 }, { x: 0.38, y: 0.16 }],
  [{ x: 0.87, y: 0.19 }, { x: 0.79, y: 0.13 }, { x: 0.70, y: 0.20 }, { x: 0.62, y: 0.16 }],
  [{ x: 0.13, y: 0.81 }, { x: 0.21, y: 0.87 }, { x: 0.30, y: 0.80 }, { x: 0.38, y: 0.84 }],
  [{ x: 0.87, y: 0.81 }, { x: 0.79, y: 0.87 }, { x: 0.70, y: 0.80 }, { x: 0.62, y: 0.84 }],
];

function normalizeSignIndex(index) {
  if (typeof index !== 'number' || !Number.isFinite(index)) return 0;
  return ((Math.round(index) % 12) + 12) % 12;
}

function polarPoint(centerX, centerY, radius, degree) {
  var radians = ((degree - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

function starPoints(width, height, count) {
  var points = [];
  var pairCount = Math.max(1, Math.floor(count / 2));
  for (var starIndex = 0; starIndex < pairCount; starIndex++) {
    var angle = starIndex * 2.39996323;
    var radiusMix = (Math.sin(starIndex * 5.71) + 1) * 0.5;
    var x = width * (0.12 + 0.33 * radiusMix);
    var y = height * (0.10 + 0.80 * ((Math.cos(starIndex * 3.17) + 1) * 0.5));
    var offsetX = Math.cos(angle) * width * 0.024;
    var offsetY = Math.sin(angle) * height * 0.024;
    var radius = 0.55 + ((Math.sin(starIndex * 1.73) + 1) * 0.55);
    var opacity = 0.24 + ((Math.cos(starIndex * 2.41) + 1) * 0.28);
    points.push({ x: x + offsetX, y: y + offsetY, radius: radius, opacity: opacity });
    points.push({ x: width - x - offsetX, y: y + offsetY, radius: radius, opacity: opacity });
  }
  return points.slice(0, count);
}

function crescentMoon(x, y, radius, direction) {
  var maskOffset = radius * 0.48 * direction;
  return (
    <G>
      <Circle cx={x} cy={y} r={radius} fill="#DDF7FF" opacity="0.88" />
      <Circle cx={x + maskOffset} cy={y - radius * 0.08} r={radius * 1.05} fill="#07182D" opacity="0.97" />
      <Circle cx={x} cy={y} r={radius * 1.35} fill="none" stroke="#BDEBFF" strokeWidth="0.7" opacity="0.20" />
    </G>
  );
}

function cornerPlanet(x, y, radius, color) {
  return (
    <G>
      <Circle cx={x} cy={y} r={radius * 1.55} fill={color} opacity="0.055" />
      <Circle cx={x} cy={y} r={radius} fill={color} opacity="0.22" />
      <Circle cx={x - radius * 0.25} cy={y - radius * 0.22} r={radius * 0.78} fill="#07182D" opacity="0.26" />
    </G>
  );
}

function CelestialZodiacWheel({ size = 286, signIndex = 0, accentIndex = 0, rahuActive = false }) {
  var reduced = useReducedMotion();
  var lowEnd = useLowEndDevice();
  var skipAnimations = reduced || lowEnd;
  var activeIndex = normalizeSignIndex(signIndex);
  var accent = normalizeSignIndex(accentIndex);
  var width = size;
  var height = size;
  var centerX = width / 2;
  var centerY = height / 2;
  var outerRadius = size * 0.415;
  var signRadius = size * 0.318;
  var innerRadius = size * 0.196;
  var centerSeal = size * 0.165;
  var imageSize = size * 0.292;
  var starField = starPoints(width, height, skipAnimations ? 36 : 72);
  var imageSource = ZODIAC_IMAGES[activeIndex] || ZODIAC_IMAGES[0];
  var activeDegree = activeIndex * 30 + 15;
  var activePoint = polarPoint(centerX, centerY, signRadius, activeDegree);
  var accentDegree = accent * 30 + 15;
  var accentPoint = polarPoint(centerX, centerY, outerRadius * 0.90, accentDegree);
  var accentMirrorPoint = polarPoint(centerX, centerY, outerRadius * 0.90, accentDegree + 180);
  var alertColor = rahuActive ? '#FB7185' : '#7DD3FC';

  var slowRotate = useSharedValue(0);
  var counterRotate = useSharedValue(0);
  var pulse = useSharedValue(0.5);
  var float = useSharedValue(0.5);

  useEffect(function () {
    if (skipAnimations) {
      cancelAnimation(slowRotate);
      cancelAnimation(counterRotate);
      cancelAnimation(pulse);
      cancelAnimation(float);
      slowRotate.value = 0;
      counterRotate.value = 0;
      pulse.value = 0.55;
      float.value = 0.5;
      return;
    }
    slowRotate.value = withRepeat(withTiming(360, { duration: 170000, easing: Easing.linear }), -1, false);
    counterRotate.value = withRepeat(withTiming(-360, { duration: 230000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }), -1, true);
    float.value = withRepeat(withTiming(1, { duration: 6800, easing: Easing.inOut(Easing.ease) }), -1, true);
    return function () {
      cancelAnimation(slowRotate);
      cancelAnimation(counterRotate);
      cancelAnimation(pulse);
      cancelAnimation(float);
    };
  }, [skipAnimations]);

  var wheelStyle = useAnimatedStyle(function () {
    return {
      transform: [
        { translateY: interpolate(float.value, [0, 1], [2, -2]) },
        { scale: interpolate(pulse.value, [0, 1], [0.994, 1.010]) },
      ],
    };
  });

  var starsStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: slowRotate.value + 'deg' }] };
  });

  var dustStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: counterRotate.value + 'deg' }] };
  });

  var glowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.54, 0.92]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.035]) }],
    };
  });

  return (
    <View pointerEvents="none" style={[styles.root, { width: width, height: height }]}> 
      <Animated.View style={[styles.skyGlow, { width: width * 0.92, height: height * 0.92, borderRadius: height }, glowStyle]} />

      <Svg width={width} height={height} style={styles.absoluteLayer}>
        <Defs>
          <RadialGradient id="celestialSky" cx="50%" cy="50%" r="62%">
            <Stop offset="0%" stopColor="#17324F" stopOpacity="0.62" />
            <Stop offset="42%" stopColor="#07182D" stopOpacity="0.58" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="wheelGoldGlow" cx="50%" cy="50%" r="54%">
            <Stop offset="0%" stopColor="#FFE8A3" stopOpacity="0.48" />
            <Stop offset="46%" stopColor="#E8B94F" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={centerX} cy={centerY} r={width * 0.48} fill="url(#celestialSky)" />
        <Circle cx={centerX} cy={centerY} r={outerRadius * 1.20} fill="url(#wheelGoldGlow)" />
        {crescentMoon(width * 0.82, height * 0.17, size * 0.033, 1)}
        {crescentMoon(width * 0.18, height * 0.83, size * 0.033, -1)}
        {cornerPlanet(width * 0.16, height * 0.18, size * 0.020, '#7DD3FC')}
        {cornerPlanet(width * 0.84, height * 0.82, size * 0.020, '#FFE8A3')}
      </Svg>

      <Animated.View style={[styles.absoluteLayer, starsStyle]}>
        <Svg width={width} height={height}>
          {starField.map(function (star, starIndex) {
            return <Circle key={'star' + starIndex} cx={star.x.toFixed(2)} cy={star.y.toFixed(2)} r={star.radius.toFixed(2)} fill="#FFF7D6" opacity={star.opacity} />;
          })}
        </Svg>
      </Animated.View>

      <Svg width={width} height={height} style={styles.absoluteLayer}>
        {CONSTELLATIONS.map(function (constellation, constellationIndex) {
          return (
            <G key={'constellation' + constellationIndex} opacity="0.68">
              {constellation.map(function (point, pointIndex) {
                var x = point.x * width;
                var y = point.y * height;
                var next = constellation[pointIndex + 1];
                return (
                  <G key={'constellationPoint' + constellationIndex + '-' + pointIndex}>
                    <Circle cx={x.toFixed(2)} cy={y.toFixed(2)} r={pointIndex % 2 === 0 ? 1.35 : 1.00} fill="#FFF5C8" opacity="0.82" />
                    {next ? <Line x1={x.toFixed(2)} y1={y.toFixed(2)} x2={(next.x * width).toFixed(2)} y2={(next.y * height).toFixed(2)} stroke="#FFF5C8" strokeWidth="0.55" opacity="0.30" /> : null}
                  </G>
                );
              })}
            </G>
          );
        })}
      </Svg>

      <Animated.View style={[styles.absoluteLayer, dustStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="orbitDustLayer" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7DD3FC" stopOpacity="0" />
              <Stop offset="46%" stopColor="#D7B35C" stopOpacity="0.44" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx={centerX} cy={centerY} rx={outerRadius * 1.36} ry={outerRadius * 0.41} fill="none" stroke="url(#orbitDustLayer)" strokeWidth="1.2" opacity="0.52" transform={'rotate(-18 ' + centerX + ' ' + centerY + ')'} />
          <Ellipse cx={centerX} cy={centerY} rx={outerRadius * 1.36} ry={outerRadius * 0.41} fill="none" stroke="#7DD3FC" strokeWidth="0.68" opacity="0.22" transform={'rotate(18 ' + centerX + ' ' + centerY + ')'} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.absoluteLayer, wheelStyle]}>
        <Svg width={width} height={height}>
          <Defs>
            <SvgLinearGradient id="goldStrokeLayer" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFF5C8" stopOpacity="0.96" />
              <Stop offset="42%" stopColor="#E7B84F" stopOpacity="0.88" />
              <Stop offset="70%" stopColor="#FFE8A3" stopOpacity="0.96" />
              <Stop offset="100%" stopColor="#9C6B24" stopOpacity="0.80" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={centerX} cy={centerY} r={outerRadius} fill="rgba(5,13,27,0.38)" stroke="url(#goldStrokeLayer)" strokeWidth="2.1" />
          <Circle cx={centerX} cy={centerY} r={outerRadius - size * 0.018} fill="none" stroke="#FFE8A3" strokeWidth="0.55" opacity="0.44" />
          <Circle cx={centerX} cy={centerY} r={signRadius + size * 0.042} fill="none" stroke="#E7B84F" strokeWidth="0.8" opacity="0.54" />
          <Circle cx={centerX} cy={centerY} r={signRadius - size * 0.052} fill="none" stroke="#E7B84F" strokeWidth="0.8" opacity="0.48" />
          <Circle cx={centerX} cy={centerY} r={innerRadius} fill="rgba(6,18,35,0.72)" stroke="url(#goldStrokeLayer)" strokeWidth="1.1" />

          {Array.from({ length: 72 }).map(function (_, tickIndex) {
            var degree = tickIndex * 5;
            var isMajor = tickIndex % 6 === 0;
            var tickOuter = outerRadius - size * 0.010;
            var tickInner = outerRadius - (isMajor ? size * 0.037 : size * 0.021);
            var start = polarPoint(centerX, centerY, tickInner, degree);
            var end = polarPoint(centerX, centerY, tickOuter, degree);
            return <Line key={'tick' + tickIndex} x1={start.x.toFixed(2)} y1={start.y.toFixed(2)} x2={end.x.toFixed(2)} y2={end.y.toFixed(2)} stroke="#FFE8A3" strokeWidth={isMajor ? '0.75' : '0.32'} opacity={isMajor ? 0.64 : 0.26} />;
          })}

          {Array.from({ length: 12 }).map(function (_, dividerIndex) {
            var degree = dividerIndex * 30;
            var start = polarPoint(centerX, centerY, signRadius - size * 0.054, degree);
            var end = polarPoint(centerX, centerY, outerRadius - size * 0.040, degree);
            return <Line key={'divider' + dividerIndex} x1={start.x.toFixed(2)} y1={start.y.toFixed(2)} x2={end.x.toFixed(2)} y2={end.y.toFixed(2)} stroke="#D7B35C" strokeWidth="0.72" opacity="0.48" />;
          })}

          {ZODIAC_PATHS.map(function (path, pathIndex) {
            var degree = pathIndex * 30 + 15;
            var point = polarPoint(centerX, centerY, signRadius, degree);
            var isActive = pathIndex === activeIndex;
            var glyphScale = isActive ? size * 0.0064 : size * 0.0053;
            return (
              <G key={'glyph' + pathIndex}>
                {isActive ? <Circle cx={point.x.toFixed(2)} cy={point.y.toFixed(2)} r={size * 0.030} fill="#FFE8A3" opacity="0.15" /> : null}
                <Path
                  d={path}
                  transform={'translate(' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ') scale(' + glyphScale.toFixed(3) + ')'}
                  fill="none"
                  stroke={isActive ? '#FFF5C8' : '#E7B84F'}
                  strokeWidth={isActive ? '1.85' : '1.35'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isActive ? 1 : 0.72}
                />
              </G>
            );
          })}

          <Line x1={centerX.toFixed(2)} y1={centerY.toFixed(2)} x2={activePoint.x.toFixed(2)} y2={activePoint.y.toFixed(2)} stroke="#FFF5C8" strokeWidth="1.1" opacity="0.34" />
          <Line x1={accentPoint.x.toFixed(2)} y1={accentPoint.y.toFixed(2)} x2={accentMirrorPoint.x.toFixed(2)} y2={accentMirrorPoint.y.toFixed(2)} stroke={alertColor} strokeWidth="0.45" opacity="0.22" />
          <Circle cx={accentPoint.x.toFixed(2)} cy={accentPoint.y.toFixed(2)} r={size * 0.011} fill={alertColor} opacity="0.88" />
          <Circle cx={accentPoint.x.toFixed(2)} cy={accentPoint.y.toFixed(2)} r={size * 0.027} fill={alertColor} opacity="0.12" />
          <Circle cx={accentMirrorPoint.x.toFixed(2)} cy={accentMirrorPoint.y.toFixed(2)} r={size * 0.007} fill={alertColor} opacity="0.46" />
          <Circle cx={centerX} cy={centerY} r={centerSeal * 1.36} fill="#FFE8A3" opacity="0.12" />
          <Circle cx={centerX} cy={centerY} r={centerSeal} fill="rgba(4,10,20,0.86)" stroke="url(#goldStrokeLayer)" strokeWidth="1.2" />
          <Circle cx={centerX} cy={centerY} r={centerSeal * 0.72} fill="none" stroke="#7DD3FC" strokeWidth="0.7" opacity="0.34" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.centerImageWrap, { width: imageSize, height: imageSize, marginLeft: -imageSize / 2, marginTop: -imageSize / 2, borderRadius: imageSize / 2 }, glowStyle]}>
        <Image source={imageSource} style={[styles.centerImage, { borderRadius: imageSize / 2 }]} />
      </Animated.View>
    </View>
  );
}

var styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  absoluteLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  skyGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(30,64,110,0.30)',
    shadowColor: '#FFE8A3',
    shadowOpacity: 0.46,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  centerImageWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,232,163,0.62)',
    backgroundColor: 'rgba(6,18,35,0.82)',
    shadowColor: '#FFE8A3',
    shadowOpacity: 0.56,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 22,
  },
  centerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

export default React.memo(CelestialZodiacWheel);
