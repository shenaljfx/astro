// ═══════════════════════════════════════════════════════════════════════
// AwesomeRashiChakra.js — Premium Celestial Rashi Chakra v5
// No emoji glyphs — all zodiac signs rendered as SVG paths.
// Removed cluttered middle sacred-geometry / lotus / inner-dust layers.
// Added: multi-ring rotating star dots, 3D volumetric aura halos,
// specular graha bodies, cinematic center orb with lens flares.
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  Easing, interpolate,
} from 'react-native-reanimated';
import Svg, {
  Circle, Text as SvgText, G, Line, Defs, RadialGradient, LinearGradient,
  Stop, Path, Polygon, Ellipse, Image as SvgImage,
} from 'react-native-svg';
import { ZODIAC_IMAGES } from './ZodiacIcons';

// ═══════════════════════════════════════════════════════
// ZODIAC SVG MINI-PATHS  (drawn at origin, scale to ~1em)
// Each is a tiny vector glyph, rendered via <Path> + transform.
// ═══════════════════════════════════════════════════════

var ZODIAC_PATHS = [
  // Aries ♈ — ram horns
  'M-4 4 C-4-2 0-6 0-2 C0-6 4-2 4 4',
  // Taurus ♉ — circle + horns
  'M-3-3 C-5-6 5-6 3-3 M-3 0 A3 3 0 1 0 3 0 A3 3 0 1 0-3 0',
  // Gemini ♊ — twin pillars
  'M-4-4 L4-4 M-4 4 L4 4 M-2-4 L-2 4 M2-4 L2 4',
  // Cancer ♋ — two arcs
  'M4-1 A3 3 0 0 0-2-1 M-2-1 A1.5 1.5 0 0 0-2 2 M-4 1 A3 3 0 0 0 2 1 M2 1 A1.5 1.5 0 0 0 2-2',
  // Leo ♌ — swirl + arc
  'M-3 3 A2 2 0 1 1 1 3 Q4 3 4 0 A2 2 0 1 1 0-1',
  // Virgo ♍ — M + tail
  'M-4 4 L-4-3 Q-2-5 0-3 L0 4 M0-3 Q2-5 4-3 L4 2 Q5 5 2 5',
  // Libra ♎ — scales
  'M-4 1 L4 1 M-4-1 C-4-4 4-4 4-1 M-4 3 L4 3',
  // Scorpio ♏ — M + arrow tail
  'M-4 4 L-4-3 Q-2-5 0-3 L0 4 M0-3 Q2-5 4-3 L4 4 L5 2',
  // Sagittarius ♐ — arrow
  'M-3 4 L4-3 M4-3 L1-3 M4-3 L4 0 M-2 3 L2-1',
  // Capricorn ♑ — horn + tail
  'M-4-3 L-1-3 Q2-3 2 0 Q2 3 0 3 A2 2 0 0 1 4 3',
  // Aquarius ♒ — two waves
  'M-4-1 Q-2-3 0-1 Q2 1 4-1 M-4 2 Q-2 0 0 2 Q2 4 4 2',
  // Pisces ♓ — two arcs + bar
  'M-3-4 A4 4 0 0 0-3 4 M3-4 A4 4 0 0 1 3 4 M-3 0 L3 0',
];

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════

var RASHIS = [
  { name: 'Ari', pri: '#E8575D', sec: '#5C1D22' },
  { name: 'Tau', pri: '#D4A84C', sec: '#4A3818' },
  { name: 'Gem', pri: '#3DCFB6', sec: '#144A3E' },
  { name: 'Can', pri: '#5FA8D4', sec: '#1B3A50' },
  { name: 'Leo', pri: '#E09730', sec: '#503512' },
  { name: 'Vir', pri: '#8BBF6A', sec: '#2E4A1E' },
  { name: 'Lib', pri: '#A0DDD5', sec: '#264A44' },
  { name: 'Sco', pri: '#CF5A5A', sec: '#4C1A1A' },
  { name: 'Sag', pri: '#D49555', sec: '#4A3318' },
  { name: 'Cap', pri: '#7EC87E', sec: '#1E4A1E' },
  { name: 'Aqu', pri: '#6AADDD', sec: '#1B3B52' },
  { name: 'Pis', pri: '#A08EDA', sec: '#2D2456' },
];

var GRAHAS = [
  { label: 'Su', color: '#FBBF24', glow: '#FDE68A', ang: 10,  r: 3.2 },
  { label: 'Mo', color: '#C7D2FE', glow: '#E0E7FF', ang: 55,  r: 2.6 },
  { label: 'Ma', color: '#F87171', glow: '#FECACA', ang: 110, r: 2.8 },
  { label: 'Me', color: '#6EE7B7', glow: '#A7F3D0', ang: 152, r: 2.4 },
  { label: 'Ju', color: '#FCD34D', glow: '#FEF3C7', ang: 208, r: 3.2 },
  { label: 'Ve', color: '#F9A8D4', glow: '#FBCFE8', ang: 258, r: 2.8 },
  { label: 'Sa', color: '#A5B4FC', glow: '#C7D2FE', ang: 302, r: 2.4 },
  { label: 'Ra', color: '#94A3B8', glow: '#CBD5E1', ang: 180, r: 2.2 },
  { label: 'Ke', color: '#C4B5FD', glow: '#DDD6FE', ang: 355, r: 2.2 },
];

// ═══════════════════════════════════════════════════════
// GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════

function wedgePath(cx, cy, rIn, rOut, sDeg, eDeg) {
  var s = ((sDeg - 90) * Math.PI) / 180;
  var e = ((eDeg - 90) * Math.PI) / 180;
  var lg = eDeg - sDeg > 180 ? 1 : 0;
  var ox1 = (cx + rOut * Math.cos(s)).toFixed(2);
  var oy1 = (cy + rOut * Math.sin(s)).toFixed(2);
  var ox2 = (cx + rOut * Math.cos(e)).toFixed(2);
  var oy2 = (cy + rOut * Math.sin(e)).toFixed(2);
  var ix1 = (cx + rIn * Math.cos(e)).toFixed(2);
  var iy1 = (cy + rIn * Math.sin(e)).toFixed(2);
  var ix2 = (cx + rIn * Math.cos(s)).toFixed(2);
  var iy2 = (cy + rIn * Math.sin(s)).toFixed(2);
  return 'M' + ox1 + ',' + oy1 +
    ' A' + rOut.toFixed(2) + ',' + rOut.toFixed(2) + ' 0 ' + lg + ' 1 ' + ox2 + ',' + oy2 +
    ' L' + ix1 + ',' + iy1 +
    ' A' + rIn.toFixed(2) + ',' + rIn.toFixed(2) + ' 0 ' + lg + ' 0 ' + ix2 + ',' + iy2 + ' Z';
}

function star6(cx, cy, outerR, innerR) {
  var d = '';
  for (var i = 0; i < 12; i++) {
    var r = i % 2 === 0 ? outerR : innerR;
    var a = (i * Math.PI) / 6 - Math.PI / 2;
    d += (i === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}

function makeStarDots(n, rMin, rMax, cx, cy) {
  var out = [];
  for (var i = 0; i < n; i++) {
    var theta = i * 2.39996323; // golden angle
    var dist = rMin + (rMax - rMin) * ((Math.sin(i * 5.71) + 1) * 0.5);
    out.push({
      x: cx + dist * Math.cos(theta),
      y: cy + dist * Math.sin(theta),
      r: 0.35 + (Math.sin(i * 3.91) + 1) * 0.55,
      o: 0.18 + (Math.cos(i * 2.17) + 1) * 0.28,
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function AwesomeRashiChakra({ size = 320, activeSignIndex }) {
  var cx = size / 2;
  var cy = size / 2;

  // ── Radii ──
  var Redge    = cx - 2;
  var Rband    = cx - 14;
  var RsegOut  = cx - 26;
  var RsegMid  = cx - 46;
  var RsegIn   = cx - 66;
  var Rorbit   = cx - 76;
  var Rcore    = Rorbit * 0.52;
  var Rcenter  = Rcore * 0.50;

  var fname = Math.max(7, Math.round(size * 0.026));

  // ── Animation drivers ──
  var rotSlow   = useSharedValue(0);
  var rotMed    = useSharedValue(0);
  var rotStars1 = useSharedValue(0);
  var rotStars2 = useSharedValue(0);
  var rotStars3 = useSharedValue(0);
  var rotAura   = useSharedValue(0);
  var pulse     = useSharedValue(0);
  var pulse2    = useSharedValue(0);
  var glow      = useSharedValue(0);

  useEffect(function () {
    rotSlow.value   = withRepeat(withTiming(360,  { duration: 140000, easing: Easing.linear }), -1, false);
    rotMed.value    = withRepeat(withTiming(-360, { duration: 85000,  easing: Easing.linear }), -1, false);
    rotStars1.value = withRepeat(withTiming(360,  { duration: 200000, easing: Easing.linear }), -1, false);
    rotStars2.value = withRepeat(withTiming(-360, { duration: 160000, easing: Easing.linear }), -1, false);
    rotStars3.value = withRepeat(withTiming(360,  { duration: 120000, easing: Easing.linear }), -1, false);
    rotAura.value   = withRepeat(withTiming(-360, { duration: 55000,  easing: Easing.linear }), -1, false);
    pulse.value     = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, true);
    pulse2.value    = withRepeat(withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow.value      = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  var slowStyle   = useAnimatedStyle(function () { return { transform: [{ rotate: rotSlow.value + 'deg' }] }; });
  var medStyle    = useAnimatedStyle(function () { return { transform: [{ rotate: rotMed.value + 'deg' }] }; });
  var stars1Style = useAnimatedStyle(function () { return { transform: [{ rotate: rotStars1.value + 'deg' }] }; });
  var stars2Style = useAnimatedStyle(function () { return { transform: [{ rotate: rotStars2.value + 'deg' }] }; });
  var stars3Style = useAnimatedStyle(function () { return { transform: [{ rotate: rotStars3.value + 'deg' }] }; });
  var auraStyle   = useAnimatedStyle(function () { return { transform: [{ rotate: rotAura.value + 'deg' }] }; });

  var breatheStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [0.993, 1.007]) }],
      opacity: interpolate(pulse.value, [0, 1], [0.92, 1.0]),
    };
  });

  var auraPulseStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(pulse2.value, [0, 1], [0.35, 0.78]),
      transform: [{ scale: interpolate(pulse2.value, [0, 1], [0.96, 1.04]) }],
    };
  });

  var glowStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(glow.value, [0, 1], [0.55, 1.0]) };
  });

  var nebStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(pulse2.value, [0, 1], [0.5, 0.85]) };
  });

  // ── Star dot data — 3 concentric rings ──
  var starsOuter = useMemo(function () { return makeStarDots(90, Rband + 6, Redge + 35, cx, cy); }, [size]);
  var starsMid   = useMemo(function () { return makeStarDots(55, RsegOut + 6, Rband - 2, cx, cy); }, [size]);
  var starsInner = useMemo(function () { return makeStarDots(35, Rorbit - 8, RsegIn - 4, cx, cy); }, [size]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'absolute' }}>

      {/* ══════════════════════════════════════════════════════
          L0 — Deep-space vignette base
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, nebStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="vig" cx="50%" cy="50%" r="56%">
              <Stop offset="0%"   stopColor="#1C1030" stopOpacity="0.92" />
              <Stop offset="40%"  stopColor="#0E0818" stopOpacity="0.65" />
              <Stop offset="75%"  stopColor="#050310" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={cx} cy={cy} r={cx} fill="url(#vig)" />
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L1 — 3D Volumetric Aura  (rotating elliptical halos)
          Creates depth illusion with tilted ellipses at different
          angles, sizes, and opacities — like a planetary ring system.
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, auraPulseStyle]}>
        <Animated.View style={auraStyle}>
          <Svg width={size + 40} height={size + 40} style={{ marginLeft: -20, marginTop: -20 }}>
            <Defs>
              <RadialGradient id="auraWarm" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor="#FFE4A0" stopOpacity="0.22" />
                <Stop offset="40%"  stopColor="#B87333" stopOpacity="0.12" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="haloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%"   stopColor="#FBBF24" stopOpacity="0.5" />
                <Stop offset="35%"  stopColor="#F472B6" stopOpacity="0.3" />
                <Stop offset="70%"  stopColor="#A78BFA" stopOpacity="0.35" />
                <Stop offset="100%" stopColor="#22D3EE" stopOpacity="0.4" />
              </LinearGradient>
            </Defs>

            {/* Warm core glow */}
            <Circle cx={cx + 20} cy={cy + 20} r={Rcore * 1.8} fill="url(#auraWarm)" />

            {/* Tilted elliptical halos — fake 3D ring system */}
            <Ellipse cx={cx + 20} cy={cy + 20} rx={Redge + 12} ry={Redge * 0.38}
              stroke="url(#haloGrad)" strokeWidth="1.8" fill="none" opacity={0.22}
              transform={'rotate(-25,' + (cx + 20) + ',' + (cy + 20) + ')'}
            />
            <Ellipse cx={cx + 20} cy={cy + 20} rx={Redge + 6} ry={Redge * 0.52}
              stroke="#FBBF24" strokeWidth="0.7" fill="none" opacity={0.15}
              transform={'rotate(20,' + (cx + 20) + ',' + (cy + 20) + ')'}
            />
            <Ellipse cx={cx + 20} cy={cy + 20} rx={Redge - 2} ry={Redge * 0.28}
              stroke="#A78BFA" strokeWidth="1.2" fill="none" opacity={0.12}
              transform={'rotate(-55,' + (cx + 20) + ',' + (cy + 20) + ')'}
            />
            <Ellipse cx={cx + 20} cy={cy + 20} rx={Redge + 16} ry={Redge * 0.18}
              stroke="#22D3EE" strokeWidth="0.6" fill="none" opacity={0.1}
              transform={'rotate(42,' + (cx + 20) + ',' + (cy + 20) + ')'}
            />
            <Ellipse cx={cx + 20} cy={cy + 20} rx={Rband + 8} ry={Rband * 0.32}
              stroke="#F472B6" strokeWidth="0.5" fill="none" opacity={0.1}
              transform={'rotate(-10,' + (cx + 20) + ',' + (cy + 20) + ')'}
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L2 — Rotating star dots ring 1 (outermost, slow CW)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, stars1Style]}>
        <Svg width={size + 70} height={size + 70} style={{ marginLeft: -35, marginTop: -35 }}>
          {starsOuter.map(function (s, i) {
            var sx = s.x + 35;
            var sy = s.y + 35;
            return (
              <G key={'s1' + i}>
                {s.o > 0.35 && <Circle cx={sx} cy={sy} r={s.r + 2} fill="#B87333" opacity={0.04} />}
                <Circle cx={sx} cy={sy} r={s.r}
                  fill={i % 5 === 0 ? '#FFE4A0' : (i % 5 === 1 ? '#F9A8D4' : (i % 5 === 2 ? '#A5B4FC' : (i % 5 === 3 ? '#C9B896' : '#6EE7B7')))}
                  opacity={s.o}
                />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L2b — Rotating star dots ring 2 (mid, slow CCW)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, stars2Style]}>
        <Svg width={size} height={size}>
          {starsMid.map(function (s, i) {
            return (
              <G key={'s2' + i}>
                {s.o > 0.32 && <Circle cx={s.x} cy={s.y} r={s.r + 1.5} fill="#D4A84C" opacity={0.05} />}
                <Circle cx={s.x} cy={s.y} r={s.r}
                  fill={i % 3 === 0 ? '#FFE4A0' : (i % 3 === 1 ? '#E0E7FF' : '#D4C5A9')}
                  opacity={s.o * 0.9}
                />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L2c — Rotating star dots ring 3 (inner, faster CW)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, stars3Style]}>
        <Svg width={size} height={size}>
          {starsInner.map(function (s, i) {
            return (
              <G key={'s3' + i}>
                <Circle cx={s.x} cy={s.y} r={s.r * 0.85}
                  fill={i % 2 === 0 ? '#FFE4A0' : '#C4B5FD'}
                  opacity={s.o * 0.7}
                />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L3 — Platinum outer ring + decorative band (breathing)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, breatheStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="platR" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#E8E0D0" stopOpacity="0.6" />
              <Stop offset="50%"  stopColor="#B8A88A" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#D4C5A9" stopOpacity="0.55" />
            </LinearGradient>
          </Defs>

          {/* Outermost hairline */}
          <Circle cx={cx} cy={cy} r={Redge} stroke="#C9B896" strokeWidth="0.5" fill="none" opacity={0.25} />

          {/* Decorative tick band */}
          {Array.from({ length: 72 }).map(function (_, i) {
            var a = ((i * 5 - 90) * Math.PI) / 180;
            var isLong = i % 6 === 0;
            var len = isLong ? 7 : 3;
            return (
              <Line key={'bd' + i}
                x1={(cx + (Rband - len) * Math.cos(a)).toFixed(2)}
                y1={(cy + (Rband - len) * Math.sin(a)).toFixed(2)}
                x2={(cx + Rband * Math.cos(a)).toFixed(2)}
                y2={(cy + Rband * Math.sin(a)).toFixed(2)}
                stroke="#C9B896" strokeWidth={isLong ? '0.7' : '0.3'}
                opacity={isLong ? 0.5 : 0.2}
              />
            );
          })}

          {/* Platinum ring */}
          <Circle cx={cx} cy={cy} r={Rband} stroke="url(#platR)" strokeWidth="1.5" fill="none" opacity={0.65} />
          <Circle cx={cx} cy={cy} r={Rband - 2.5} stroke="#B8A88A" strokeWidth="0.3" fill="none" opacity={0.2} />
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L4 — Zodiac arcs + SVG zodiac glyphs (slow CW)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, breatheStyle]}>
        <Animated.View style={slowStyle}>
          <Svg width={size} height={size}>
            <Defs>
              {RASHIS.map(function (r, i) {
                return (
                  <LinearGradient key={'zg' + i} id={'zg' + i} x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%"   stopColor={r.pri} stopOpacity="0.5" />
                    <Stop offset="100%" stopColor={r.sec} stopOpacity="0.15" />
                  </LinearGradient>
                );
              })}
            </Defs>

            {/* Zodiac wedge fills */}
            {RASHIS.map(function (r, i) {
              return (
                <Path key={'zw' + i}
                  d={wedgePath(cx, cy, RsegIn, RsegOut, i * 30 + 0.5, i * 30 + 29.5)}
                  fill={'url(#zg' + i + ')'}
                />
              );
            })}

            {/* Divider lines */}
            {RASHIS.map(function (_, i) {
              var a = ((i * 30 - 90) * Math.PI) / 180;
              return (
                <Line key={'zd' + i}
                  x1={(cx + RsegIn * Math.cos(a)).toFixed(2)}
                  y1={(cy + RsegIn * Math.sin(a)).toFixed(2)}
                  x2={(cx + RsegOut * Math.cos(a)).toFixed(2)}
                  y2={(cy + RsegOut * Math.sin(a)).toFixed(2)}
                  stroke="#0C0818" strokeWidth="1" opacity={0.65}
                />
              );
            })}

            {/* Outer border */}
            <Circle cx={cx} cy={cy} r={RsegOut} stroke="#C9B896" strokeWidth="1.6" fill="none" opacity={0.72} />
            <Circle cx={cx} cy={cy} r={RsegOut + 1.5} stroke="#FFE4A0" strokeWidth="0.25" fill="none" opacity={0.3} />

            {/* Inner border */}
            <Circle cx={cx} cy={cy} r={RsegIn} stroke="#8B7D9B" strokeWidth="1.2" fill="none" opacity={0.55} />

            {/* SVG zodiac glyphs + name labels */}
            {RASHIS.map(function (r, i) {
              var midDeg = i * 30 + 15;
              var midRad = ((midDeg - 90) * Math.PI) / 180;

              // Center the image in the wedge band
              var glyphR = RsegMid;
              var gx = cx + glyphR * Math.cos(midRad);
              var gy = cy + glyphR * Math.sin(midRad);

              // Jewel dot at outer edge
              var jx = (cx + (RsegOut - 4.5) * Math.cos(midRad)).toFixed(2);
              var jy = (cy + (RsegOut - 4.5) * Math.sin(midRad)).toFixed(2);

              // Image sized to fit within wedge without overlapping neighbors
              // Wedge arc length at RsegMid ≈ 2π * RsegMid / 12 — use ~60% of that
              var wedgeArc = (2 * Math.PI * RsegMid) / 12;
              var wedgeDepth = RsegOut - RsegIn;
              var imgSize = Math.min(wedgeArc * 0.58, wedgeDepth * 0.60);

              return (
                <G key={'zl' + i}>
                  {/* Jewel indicator dot */}
                  <Circle cx={jx} cy={jy} r="2.4" fill={r.pri} opacity={0.82} />
                  <Circle cx={jx} cy={jy} r="4.5" fill={r.pri} opacity={0.1} />

                  {/* Subtle glow behind image */}
                  <Circle cx={gx.toFixed(2)} cy={gy.toFixed(2)} r={imgSize * 0.42} fill={r.pri} opacity={0.08} />

                  {/* Zodiac image (base64 inline) — properly sized to wedge */}
                  <SvgImage
                    x={gx - imgSize / 2}
                    y={gy - imgSize / 2}
                    width={imgSize}
                    height={imgSize}
                    href={ZODIAC_IMAGES[i].uri}
                    opacity={0.95}
                  />
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L5 — Graha orbit ring (medium CCW)
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, medStyle]}>
        <Svg width={size} height={size}>
          {/* Orbit track */}
          <Circle cx={cx} cy={cy} r={Rorbit} stroke="#FFD98E" strokeWidth="0.6" fill="none" opacity={0.32} />
          <Circle cx={cx} cy={cy} r={Rorbit + 2.5} stroke="#C9A44E" strokeWidth="0.25" fill="none" opacity={0.15} />
          <Circle cx={cx} cy={cy} r={Rorbit - 2.5} stroke="#C9A44E" strokeWidth="0.25" fill="none" opacity={0.15} />

          {/* Tick marks */}
          {Array.from({ length: 36 }).map(function (_, i) {
            var a = ((i * 10 - 90) * Math.PI) / 180;
            var major = i % 3 === 0;
            var len = major ? 4 : 1.8;
            return (
              <Line key={'ot' + i}
                x1={(cx + (Rorbit - len) * Math.cos(a)).toFixed(2)}
                y1={(cy + (Rorbit - len) * Math.sin(a)).toFixed(2)}
                x2={(cx + (Rorbit + len) * Math.cos(a)).toFixed(2)}
                y2={(cy + (Rorbit + len) * Math.sin(a)).toFixed(2)}
                stroke="#FFD98E" strokeWidth={major ? '0.6' : '0.25'}
                opacity={major ? 0.5 : 0.22}
              />
            );
          })}

          {/* Graha bodies with 3D specular look */}
          {GRAHAS.map(function (g, i) {
            var a = ((g.ang - 90) * Math.PI) / 180;
            var px = cx + Rorbit * Math.cos(a);
            var py = cy + Rorbit * Math.sin(a);
            return (
              <G key={'gp' + i}>
                <Circle cx={px.toFixed(2)} cy={py.toFixed(2)} r={g.r + 5.5} fill={g.glow} opacity={0.05} />
                <Circle cx={px.toFixed(2)} cy={py.toFixed(2)} r={g.r + 2.2} fill={g.glow} opacity={0.14} />
                <Circle cx={px.toFixed(2)} cy={py.toFixed(2)} r={g.r} fill={g.color} opacity={0.9} />
                <Circle cx={(px - g.r * 0.22).toFixed(2)} cy={(py - g.r * 0.28).toFixed(2)} r={g.r * 0.32} fill="#FFF" opacity={0.5} />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          L6 — Pulsing center orb + lens flare + 6-star
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[{ position: 'absolute' }, glowStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="orbG" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.92" />
              <Stop offset="14%"  stopColor="#FFE4A0" stopOpacity="0.82" />
              <Stop offset="36%"  stopColor="#D4A84C" stopOpacity="0.52" />
              <Stop offset="58%"  stopColor="#B87333" stopOpacity="0.28" />
              <Stop offset="100%" stopColor="#1A1028" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Wide warm halo */}
          <Circle cx={cx} cy={cy} r={Rcenter * 4.5} fill="url(#orbG)" />

          {/* 6-pointed star halo */}
          <Path d={star6(cx, cy, Rcenter * 2.2, Rcenter * 1.1)} fill="#C9B896" opacity={0.12} />
          <Path d={star6(cx, cy, Rcenter * 1.7, Rcenter * 0.88)} fill="#FFE4A0" opacity={0.2} />

          {/* Cinematic lens flares (4 directions) */}
          {[0, 90, 45, 135].map(function (angle, i) {
            var aRad = (angle * Math.PI) / 180;
            var len = Rcenter * (i < 2 ? 3.2 : 1.8);
            return (
              <Line key={'fl' + i}
                x1={(cx - len * Math.cos(aRad)).toFixed(2)}
                y1={(cy - len * Math.sin(aRad)).toFixed(2)}
                x2={(cx + len * Math.cos(aRad)).toFixed(2)}
                y2={(cy + len * Math.sin(aRad)).toFixed(2)}
                stroke="#FFE4A0" strokeWidth={i < 2 ? '0.7' : '0.35'}
                opacity={i < 2 ? 0.45 : 0.22}
              />
            );
          })}

          {/* Core concentric discs */}
          <Circle cx={cx} cy={cy} r={Rcenter * 1.1} fill="#D4A84C" opacity={0.15} />
          <Circle cx={cx} cy={cy} r={Rcenter * 0.72} fill="#FFE4A0" opacity={0.25} />
          <Circle cx={cx} cy={cy} r={Rcenter * 0.38} fill="#FFF8E1" opacity={0.45} />

          {/* Active zodiac sign in center — large prominent image */}
          {activeSignIndex != null && ZODIAC_IMAGES[activeSignIndex] && (() => {
            var imgR = Rorbit * 0.88;
            return (
              <G>
                {/* Outer golden ring */}
                <Circle cx={cx} cy={cy} r={imgR + 4} fill="none" stroke="rgba(255,214,102,0.22)" strokeWidth="1.5" />
                <Circle cx={cx} cy={cy} r={imgR + 1.5} fill="none" stroke="rgba(255,184,0,0.12)" strokeWidth="0.8" />
                {/* Dark backdrop for contrast */}
                <Circle cx={cx} cy={cy} r={imgR} fill="rgba(4,3,12,0.55)" />
                {/* The zodiac image */}
                <SvgImage
                  x={cx - imgR}
                  y={cy - imgR}
                  width={imgR * 2}
                  height={imgR * 2}
                  href={ZODIAC_IMAGES[activeSignIndex].uri}
                  opacity={0.92}
                />
                {/* Subtle inner vignette ring */}
                <Circle cx={cx} cy={cy} r={imgR - 1} fill="none" stroke="rgba(255,214,102,0.08)" strokeWidth="0.5" />
              </G>
            );
          })()}
        </Svg>
      </Animated.View>

    </View>
  );
}
