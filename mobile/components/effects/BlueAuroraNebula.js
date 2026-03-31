// ═══════════════════════════════════════════════════════════════════════
//  BlueAuroraNebula.js — BLUE Theme Compositor (Kendara page)
//
//  Same architecture as CosmicAuroraNebula.js but with theme="blue":
//  • AuroraEngine.js  — 6 curtains with cyan/indigo/sapphire palette
//  • NebulaEngine.js  — Volumetric dust in deep blue/violet tones
//  • ShootingStars.js — Lightweight Reanimated shooting star overlay
//
//  Layout: Aurora (TOP) → Fade Bridge (MID) → Nebula + Stars + MW (BOTTOM)
//  Theme: BLUE — cyan, sapphire, indigo, teal palette
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


// ══════════════════════════════════════════════════════════════════
//  MAIN SCENE — blue theme
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
//  FRAME THROTTLE — caps mobile to ~30fps for 2x perf savings
// ══════════════════════════════════════════════════════════════════
var TARGET_FRAME_MS = IS_MOBILE ? 33.3 : 16.6;
function FrameThrottle() {
  var lastTime = useRef(0);
  var r3fUseFrame;
  try { r3fUseFrame = require('@react-three/fiber/native').useFrame; } catch(e) { return null; }
  r3fUseFrame(function (state) {
    var now = state.clock.getElapsedTime() * 1000;
    if (now - lastTime.current < TARGET_FRAME_MS) {
      state.gl.autoClear = false;
    } else {
      state.gl.autoClear = true;
      lastTime.current = now;
    }
  }, -1);
  return null;
}

function BlueScene() {
  return (
    <>
      <FrameThrottle />
      {/* 3-color aurora: blue (primary) + purple + green */}
      <AuroraWaveSystem theme="blue" />
      <AuroraWaveSystem theme="purple" weight="accent" />
      <AuroraWaveSystem theme="green" weight="accent" />
      {/* Advanced Nebula Engine — volumetric dust in sapphire/indigo */}
      <NebulaEngine theme="blue" />
    </>
  );
}


// ══════════════════════════════════════════════════════════════════
//  CANVAS WRAPPER — blue background color
// ══════════════════════════════════════════════════════════════════
function BlueThreeJSBackground() {
  var [failed, setFailed] = useState(false);
  var containerRef = useRef(null);

  var handleError = useCallback(function () {
    setFailed(true);
  }, []);

  var handleCreated = useCallback(function (state) {
    state.gl.setClearColor(0x020412, 1);
  }, []);

  if (failed) return <BlueFallbackBackground />;

  var dprVal = 1;
  if (Platform.OS === 'web') {
    try { dprVal = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.0 : 1.5); } catch (e) { dprVal = 1; }
  }

  return (
    <View ref={containerRef} style={StyleSheet.absoluteFill} pointerEvents="none">
      <R3FCanvas
        style={{ flex: 1, backgroundColor: '#020412' }}
        camera={{ position: [0, 0, 100], fov: 55, near: 0.1, far: 2000 }}
        gl={{ alpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
        dpr={dprVal}
        frameloop="always"
        onCreated={handleCreated}
        onError={handleError}
      >
        <fog attach="fog" args={[0x020412, 200, 900]} />
        <BlueScene />
      </R3FCanvas>
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.18)',
        }}
      />
      {/* Lightweight shooting stars — runs outside R3F Canvas */}
      <ShootingStarsOverlay />
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════
//  FALLBACK — animated blue gradients for no-GL devices
// ══════════════════════════════════════════════════════════════════
function BlueFallbackBackground() {
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
      <Animated.View
        style={[{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: SH * 0.3,
          backgroundColor: 'rgba(30,80,200,0.08)',
        }, style1]}
      />
      <Animated.View
        style={[{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: SH * 0.3,
          backgroundColor: 'rgba(20,40,140,0.06)',
        }, style2]}
      />
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
        }}
      />
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════════════════
export default function BlueAuroraNebula() {
  if (GL_OK) {
    return <BlueThreeJSBackground />;
  }
  return <BlueFallbackBackground />;
}
