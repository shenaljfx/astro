// ═══════════════════════════════════════════════════════════════════════
//  ThemedAuroraNebula.js — Universal Themed 3D Aurora+Nebula Compositor
//
//  Composes AuroraEngine + NebulaEngine + ShootingStars overlay with any theme.
//  Props:
//    theme   — 'golden' | 'blue' | 'green' | 'pink' | 'purple'
//    bgColor — hex background color (default '#04030C')
//
//  Usage:
//    <ThemedAuroraNebula theme="green" bgColor="#020C06" />
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Dimensions, StyleSheet, Platform } from 'react-native';
import ShootingStarsOverlay from './ShootingStars';
import AuroraWaveSystem from './AuroraEngine';
import NebulaEngine from './NebulaEngine';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  Easing, interpolate,
} from 'react-native-reanimated';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_MOBILE = SW < 768;

// ── Suppress known R3F warnings ──
if (Platform.OS === 'web') {
  var _origWarn = console.error;
  console.error = function () {
    if (arguments[0] && typeof arguments[0] === 'string') {
      if (arguments[0].indexOf('findDOMNode') !== -1) return;
      if (arguments[0].indexOf('computeBoundingSphere') !== -1) return;
    }
    return _origWarn.apply(console, arguments);
  };
}

// ── Try loading R3F + Three ──
var R3FCanvas;
var GL_OK = false;
try {
  var r3f = require('@react-three/fiber/native');
  R3FCanvas = r3f.Canvas;
  require('three');
  GL_OK = true;
} catch (e) {
  GL_OK = false;
}

// ── Theme-specific background colors ──
var THEME_BG = {
  golden: 0x04030C,
  blue:   0x020412,
  green:  0x020C06,
  pink:   0x0C0208,
  purple: 0x06020C,
  orange: 0x0C0602,
};

var THEME_BG_CSS = {
  golden: '#04030C',
  blue:   '#020412',
  green:  '#020C06',
  pink:   '#0C0208',
  purple: '#06020C',
  orange: '#0C0602',
};

// ── Fallback glow colors per theme ──
var FALLBACK_COLORS = {
  golden: { top: 'rgba(255,180,30,0.08)',  bottom: 'rgba(180,100,10,0.06)' },
  blue:   { top: 'rgba(30,80,200,0.08)',   bottom: 'rgba(20,40,140,0.06)' },
  green:  { top: 'rgba(16,200,100,0.08)',  bottom: 'rgba(10,120,60,0.06)' },
  pink:   { top: 'rgba(220,50,120,0.08)',  bottom: 'rgba(160,30,80,0.06)' },
  purple: { top: 'rgba(120,50,220,0.08)',  bottom: 'rgba(80,20,160,0.06)' },
  orange: { top: 'rgba(255,100,10,0.08)',  bottom: 'rgba(200,50,5,0.06)' },
};

// ══════════════════════════════════════════════════════════════════
//  FRAME THROTTLE — caps mobile to ~30fps for 2x perf savings
// ══════════════════════════════════════════════════════════════════
var TARGET_FRAME_MS = IS_MOBILE ? 33.3 : 16.6; // 30fps mobile, 60fps desktop
function FrameThrottle() {
  var lastTime = useRef(0);
  var r3fUseFrame;
  try { r3fUseFrame = require('@react-three/fiber/native').useFrame; } catch(e) { return null; }
  r3fUseFrame(function (state) {
    var now = state.clock.getElapsedTime() * 1000;
    if (now - lastTime.current < TARGET_FRAME_MS) {
      state.gl.autoClear = false; // skip this frame's render
    } else {
      state.gl.autoClear = true;
      lastTime.current = now;
    }
  }, -1); // run before all other useFrame callbacks
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  SCENE — renders 3 aurora wave systems with different themes
// ══════════════════════════════════════════════════════════════════
// Per-page 3-color aurora combos
var MULTI_THEMES = {
  golden:  ['golden', 'orange', 'pink'],
  blue:    ['blue', 'purple', 'green'],
  green:   ['green', 'blue', 'golden'],
  pink:    ['pink', 'purple', 'golden'],
  purple:  ['purple', 'pink', 'blue'],
  orange:  ['orange', 'golden', 'pink'],
};

function ThemedScene({ theme }) {
  var combos = MULTI_THEMES[theme] || MULTI_THEMES.golden;
  return (
    <>
      <FrameThrottle />
      <AuroraWaveSystem theme={combos[0]} />
      <AuroraWaveSystem theme={combos[1]} weight="accent" />
      <AuroraWaveSystem theme={combos[2]} weight="accent" />
      <NebulaEngine theme={theme} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CANVAS
// ══════════════════════════════════════════════════════════════════
function ThreeJSBg({ theme }) {
  var [failed, setFailed] = useState(false);
  var containerRef = useRef(null);
  var bgHex = THEME_BG[theme] || THEME_BG.golden;
  var bgCss = THEME_BG_CSS[theme] || THEME_BG_CSS.golden;

  var handleError = useCallback(function () { setFailed(true); }, []);
  var handleCreated = useCallback(function (state) {
    state.gl.setClearColor(bgHex, 1);
  }, [bgHex]);

  if (failed) return <FallbackBg theme={theme} />;

  var dprVal = 1;
  if (Platform.OS === 'web') {
    try { dprVal = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.0 : 1.5); } catch (e) { dprVal = 1; }
  }

  return (
    <View ref={containerRef} style={StyleSheet.absoluteFill} pointerEvents="none">
      <R3FCanvas
        style={{ flex: 1, backgroundColor: bgCss }}
        camera={{ position: [0, 0, 100], fov: 55, near: 0.1, far: 2000 }}
        gl={{ alpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
        dpr={dprVal}
        frameloop="always"
        onCreated={handleCreated}
        onError={handleError}
      >
        <fog attach="fog" args={[bgHex, 200, 900]} />
        <ThemedScene theme={theme} />
      </R3FCanvas>
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      {/* Lightweight shooting stars — runs outside R3F Canvas */}
      <ShootingStarsOverlay />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  FALLBACK
// ══════════════════════════════════════════════════════════════════
function FallbackBg({ theme }) {
  var fc = FALLBACK_COLORS[theme] || FALLBACK_COLORS.golden;
  var glow1 = useSharedValue(0);
  var glow2 = useSharedValue(0);

  useEffect(function () {
    glow1.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
    glow2.value = withRepeat(withTiming(1, { duration: 5500, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  var style1 = useAnimatedStyle(function () {
    return { opacity: interpolate(glow1.value, [0, 1], [0.25, 0.55]) };
  });
  var style2 = useAnimatedStyle(function () {
    return { opacity: interpolate(glow2.value, [0, 1], [0.15, 0.4]) };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.3, backgroundColor: fc.top }, style1]} />
      <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SH * 0.3, backgroundColor: fc.bottom }, style2]} />
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' }} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════════════════
export default function ThemedAuroraNebula({ theme }) {
  var t = theme || 'golden';
  if (GL_OK) {
    return <ThreeJSBg theme={t} />;
  }
  return <FallbackBg theme={t} />;
}
