// ═══════════════════════════════════════════════════════════════════════
//  CosmicAuroraNebula.js — GOLDEN Theme Compositor
//
//  Thin compositor that composes the separate physics engines:
//  • AuroraEngine.js  — 6 curtains, Birkeland currents, Alfvén waves,
//    Kelvin-Helmholtz instability, magnetic reconnection substorms
//  • NebulaEngine.js  — Volumetric dust (ray marching, Mie/Rayleigh
//    scattering, curl advection, Beer-Lambert, ridged FBM filaments),
//    cosmic star field, milky way band + glow, fade bridge
//  • ShootingStars.js — Lightweight Reanimated shooting star overlay
//
//  Layout: Aurora (TOP) → Fade Bridge (MID) → Nebula + Stars + MW (BOTTOM)
//  Theme: GOLDEN — warm gold, amber, copper, champagne palette
//
//  Works on iOS, Android, Web. Falls back to animated gradients if no GL.
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

// ── Suppress known R3F findDOMNode warning on web ──
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
//  MAIN SCENE — composes the separate engine modules
// ══════════════════════════════════════════════════════════════════
function CosmicScene() {
  return (
    <>
      <FrameThrottle />
      {/* 3-color aurora: golden (primary) + orange + pink */}
      <AuroraWaveSystem theme="golden" />
      <AuroraWaveSystem theme="orange" weight="accent" />
      <AuroraWaveSystem theme="pink" weight="accent" />
      {/* Advanced Nebula Engine — volumetric dust, stars, milky way, fade bridge */}
      <NebulaEngine theme="golden" />
    </>
  );
}


// ══════════════════════════════════════════════════════════════════
//  CANVAS WRAPPER
// ══════════════════════════════════════════════════════════════════
function ThreeJSBackground() {
  var [failed, setFailed] = useState(false);
  var containerRef = useRef(null);

  var handleError = useCallback(function () {
    setFailed(true);
  }, []);

  var handleCreated = useCallback(function (state) {
    state.gl.setClearColor(0x04030C, 1);
  }, []);

  if (failed) return <FallbackBackground />;

  var dprVal = 1;
  if (Platform.OS === 'web') {
    try { dprVal = Math.min(window.devicePixelRatio || 1, IS_MOBILE ? 1.0 : 1.5); } catch (e) { dprVal = 1; }
  }

  return (
    <View ref={containerRef} style={StyleSheet.absoluteFill} pointerEvents="none">
      <R3FCanvas
        style={{ flex: 1, backgroundColor: '#04030C' }}
        camera={{ position: [0, 0, 100], fov: 55, near: 0.1, far: 2000 }}
        gl={{ alpha: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' }}
        dpr={dprVal}
        frameloop="always"
        onCreated={handleCreated}
        onError={handleError}
      >
        <fog attach="fog" args={[0x04030C, 200, 900]} />
        <CosmicScene />
      </R3FCanvas>
      {/* Transparent black glass overlay — makes text/content more readable */}
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
//  FALLBACK — animated golden gradients for no-GL devices
// ══════════════════════════════════════════════════════════════════
function FallbackBackground() {
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
          backgroundColor: 'rgba(255,180,30,0.08)',
        }, style1]}
      />
      <Animated.View
        style={[{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: SH * 0.3,
          backgroundColor: 'rgba(180,100,10,0.06)',
        }, style2]}
      />
      {/* Glass overlay for fallback too */}
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
export default function CosmicAuroraNebula() {
  if (GL_OK) {
    return <ThreeJSBackground />;
  }
  return <FallbackBackground />;
}
