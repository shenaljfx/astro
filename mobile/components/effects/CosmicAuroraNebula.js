// ═══════════════════════════════════════════════════════════════════════
//  CosmicAuroraNebula.js — FAITHFUL port of website/js/cosmos3d.js
//
//  Layout: Aurora (TOP) → Fade Bridge (MID) → Cosmic Dust Nebula (BOTTOM)
//   1. AURORA WAVES — 4 PlaneGeometry curtains with auroraVert + auroraFrag
//      (multi-frequency wave displacement, FBM domain warping, plasma noise,
//       magnetic field lines, shimmer rays, energy pulses)
//   2. FADE BRIDGE — shader gradient plane blending aurora teal into nebula purple
//   3. COSMIC DUST NEBULA — full-screen bottom shader with FBM noise, curl
//      advection, Beer-Lambert absorption, 4 cycling color themes
//   4. STARS + MILKY WAY — point sprites with flicker/glow
//
//  Works on iOS, Android, Web. Falls back to animated gradients if no GL.
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Dimensions, StyleSheet, Platform } from 'react-native';
import ShootingStarsSystem from './ShootingStars';
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
var R3FCanvas, useFrame, THREE_LIB;
var GL_OK = false;
try {
  var r3f = require('@react-three/fiber/native');
  R3FCanvas = r3f.Canvas;
  useFrame = r3f.useFrame;
  THREE_LIB = require('three');
  GL_OK = true;
} catch (e) {
  GL_OK = false;
}

// ══════════════════════════════════════════════════════════════════
//  AURORA SHADERS — exact port from website createAuroraWaves()
// ══════════════════════════════════════════════════════════════════

var AURORA_VERT = [
  'precision mediump float;',
  'uniform float time;',
  'uniform float speed;',
  'uniform float waveFreq;',
  'varying vec2 vUv;',
  'varying float vDisplace;',
  '',
  'void main() {',
  '  vUv = uv;',
  '  vec3 pos = position;',
  '  float t = time * speed;',
  '',
  '  // ── Solar wind base flow — large-scale Kelvin-Helmholtz instability ──',
  '  float windPhase = pos.x * 0.003 + t * 0.15;',
  '  float windSurge = sin(windPhase) * 0.5 + 0.5;',
  '  windSurge = windSurge * windSurge; // quadratic for burst-like surges',
  '',
  '  // ── Multi-frequency magnetic field oscillation ──',
  '  // Real aurora: charged particles spiral along B-field lines',
  '  // Superposition of standing waves at different harmonics',
  '  float w1 = sin(pos.x * 0.008 * waveFreq + t * 0.7) * 12.0;',
  '  float w2 = sin(pos.x * 0.015 * waveFreq - t * 0.4 + windSurge * 1.5) * 8.0;',
  '  float w3 = cos(pos.x * 0.005 * waveFreq + t * 0.25) * 15.0;',
  '  float w4 = sin(pos.x * 0.025 * waveFreq + pos.y * 0.01 + t * 1.1) * 5.0;',
  '',
  '  // ── Lorentz force response — particles accelerate in curved B-field ──',
  '  // Adds non-linear acceleration bursts that make motion feel physical',
  '  float lorentz = sin(pos.x * 0.012 * waveFreq + t * 0.9) * cos(pos.y * 0.008 + t * 0.35);',
  '  lorentz = lorentz * lorentz * sign(lorentz) * 8.0; // cubic response = acceleration',
  '',
  '  // ── Turbulent cascade — energy from large scales feeding small scales ──',
  '  float turb = sin(pos.x * 0.04 * waveFreq + t * 2.2) * 2.5;',
  '  turb += sin(pos.x * 0.07 * waveFreq - t * 3.1 + pos.y * 0.03) * 1.2;',
  '  turb *= windSurge; // turbulence amplified during solar wind surges',
  '',
  '  pos.y += (w1 + w2 + w3 + w4 + lorentz + turb) * (0.7 + windSurge * 0.3);',
  '',
  '  // ── Z-axis undulation — curtain billowing in 3D ──',
  '  pos.z += sin(pos.x * 0.01 + t * 0.5) * 8.0;',
  '  pos.z += cos(pos.y * 0.02 + t * 0.3) * 5.0;',
  '  pos.z += sin(pos.x * 0.025 + pos.y * 0.015 - t * 0.7) * 3.0 * windSurge;',
  '',
  '  vDisplace = (w1 + w2 + w3 + w4 + lorentz) / 48.0;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
  '}',
].join('\n');

var AURORA_FRAG = [
  'precision mediump float;',
  'uniform float time;',
  'uniform vec3 color1;',
  'uniform vec3 color2;',
  'uniform vec3 color3;',
  'uniform float opacity;',
  'uniform float speed;',
  'uniform float waveFreq;',
  'uniform float intensity;',
  'varying vec2 vUv;',
  'varying float vDisplace;',
  '',
  '// Improved noise',
  'float hash(vec2 p) {',
  '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);',
  '}',
  'float vnoise(vec2 p) {',
  '  vec2 i = floor(p);',
  '  vec2 f = fract(p);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  float a = hash(i);',
  '  float b = hash(i + vec2(1.0, 0.0));',
  '  float c = hash(i + vec2(0.0, 1.0));',
  '  float d = hash(i + vec2(1.0, 1.0));',
  '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
  '}',
  '// Higher-quality FBM with 7 octaves',
  'float fbm(vec2 p) {',
  '  float v = 0.0; float a = 0.5; float f = 1.0;',
  '  for (int i = 0; i < 7; i++) {',
  '    v += a * vnoise(p * f);',
  '    a *= 0.48; f *= 2.05;',
  '  }',
  '  return v;',
  '}',
  '// Curl-like turbulence',
  'float turbulence(vec2 p) {',
  '  float v = 0.0;',
  '  v += abs(vnoise(p) - 0.5) * 2.0;',
  '  v += abs(vnoise(p * 2.1) - 0.5) * 1.0;',
  '  v += abs(vnoise(p * 4.3) - 0.5) * 0.5;',
  '  v += abs(vnoise(p * 8.7) - 0.5) * 0.25;',
  '  return v / 3.75;',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vUv;',
  '  float t = time * speed;',
  '',
  '  // ── Solar wind surge factor — modulates everything ──',
  '  float solarWind = sin(t * 0.12) * 0.5 + 0.5;',
  '  solarWind = 0.6 + 0.4 * solarWind * solarWind;',
  '',
  '  // Domain warping — 3-level cascade for turbulent plasma flow',
  '  vec2 q = vec2(fbm(uv * 3.0 + vec2(t * 0.3, t * 0.05)),',
  '               fbm(uv * 3.0 + vec2(-t * 0.15, t * 0.2)));',
  '  vec2 r = vec2(fbm(uv * 3.0 + q * 4.0 + vec2(t * 0.1, t * 0.15)),',
  '               fbm(uv * 3.0 + q * 4.0 + vec2(t * 0.2, -t * 0.1)));',
  '  // 3rd level — makes flow paths more complex and less repetitive',
  '  vec2 s = vec2(fbm(uv * 2.0 + r * 2.5 + vec2(-t * 0.08, t * 0.12)),',
  '               fbm(uv * 2.5 + r * 2.0 + vec2(t * 0.06, -t * 0.09)));',
  '  float domainWarp = fbm(uv * 3.0 + s * 1.5);',
  '',
  '  // Wavy curtain distortion — varying amplitude with solar wind',
  '  float wave1 = sin(uv.x * waveFreq + t * 0.8) * (0.15 + 0.05 * solarWind);',
  '  float wave2 = sin(uv.x * waveFreq * 1.7 - t * 0.5) * 0.12;',
  '  float wave3 = cos(uv.x * waveFreq * 0.5 + t * 0.3) * 0.14;',
  '  float wave4 = sin(uv.x * waveFreq * 3.2 + t * 1.4) * (0.04 + 0.04 * solarWind);',
  '  // Kelvin-Helmholtz roll-up — curling wave tips',
  '  float khRoll = sin(uv.x * waveFreq * 2.3 + t * 1.8) * 0.03;',
  '  khRoll *= smoothstep(0.5, 0.85, uv.y); // only at top edge',
  '  float waveY = uv.y + wave1 + wave2 + wave3 + wave4 + khRoll;',
  '',
  '  // Flowing plasma noise',
  '  float n1 = fbm(vec2(uv.x * 4.0 + t * 0.5, waveY * 2.5 - t * 0.25));',
  '  float n2 = fbm(vec2(uv.x * 2.5 - t * 0.35, waveY * 3.5 + t * 0.18));',
  '  float turb = turbulence(vec2(uv.x * 2.0 + t * 0.15, waveY * 1.5));',
  '  float noiseMix = n1 * 0.35 + n2 * 0.3 + domainWarp * 0.35;',
  '',
  '  // Vertical fade — strong at top, fading to bottom',
  '  float vertFade = smoothstep(0.0, 0.25, uv.y) * smoothstep(1.0, 0.45, uv.y);',
  '  // Enhanced top glow with energy pulses — irregular timing',
  '  float topGlow = smoothstep(0.5, 1.0, uv.y) * 0.7;',
  '  float energyPulse = sin(t * 1.5 + uv.x * 6.0) * 0.5 + 0.5;',
  '  // Secondary pulse at different frequency for complex rhythm',
  '  float pulse2 = sin(t * 0.7 + uv.x * 3.0 + 1.57) * 0.5 + 0.5;',
  '  topGlow *= (0.5 + 0.3 * energyPulse + 0.2 * pulse2) * solarWind;',
  '',
  '  // Horizontal fade',
  '  float hFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);',
  '',
  '  // Color gradient — richer blending with domain warp influence',
  '  float colorPos = uv.x + noiseMix * 0.35 + sin(t * 0.2) * 0.18;',
  '  vec3 col;',
  '  if (colorPos < 0.5) {',
  '    col = mix(color1, color2, colorPos * 2.0);',
  '  } else {',
  '    col = mix(color2, color3, (colorPos - 0.5) * 2.0);',
  '  }',
  '',
  '  // Magnetic field lines — bright golden filaments',
  '  float fieldLines = pow(abs(sin(uv.x * 50.0 + turb * 8.0 + t * 0.8)), 10.0);',
  '  fieldLines += pow(abs(sin(uv.x * 35.0 - turb * 6.0 + t * 0.5)), 8.0) * 0.6;',
  '  fieldLines += pow(abs(sin(uv.x * 70.0 + turb * 12.0 - t * 1.2)), 14.0) * 0.3;',
  '  fieldLines *= vertFade * 0.55;',
  '',
  '  // Shimmer rays — golden vertical streaks',
  '  float rays = pow(noiseMix, 1.3) * 1.4;',
  '  float shimmer = sin(uv.x * 45.0 + t * 2.5) * 0.5 + 0.5;',
  '  shimmer *= sin(uv.x * 28.0 - t * 1.8) * 0.5 + 0.5;',
  '  rays += shimmer * 0.2 * vertFade;',
  '',
  '  // Vertex displacement brightness boost',
  '  float displaceGlow = abs(vDisplace) * 0.6;',
  '',
  '  float alpha = (rays + topGlow + fieldLines + displaceGlow) * vertFade * hFade * opacity * intensity;',
  '  alpha *= noiseMix * 1.5;',
  '  alpha = clamp(alpha, 0.0, 1.0);',
  '',
  '  // ── Golden plasma hot spots + subtle bloom ──',
  '  col += vec3(0.35, 0.24, 0.03) * topGlow * noiseMix;',
  '  col += vec3(0.4, 0.22, 0.04) * fieldLines;',
  '  col += vec3(0.15, 0.1, 0.02) * displaceGlow;',
  '',
  '  // Golden bloom — gentle warm glow',
  '  float bloomMask = smoothstep(0.2, 0.85, uv.y) * noiseMix * solarWind;',
  '  col += vec3(0.6, 0.4, 0.06) * bloomMask * 0.15;',
  '',
  '  // Gold edge highlights on wave crests',
  '  float crest = pow(max(0.0, vDisplace), 2.0) * 3.0;',
  '  col += vec3(1.0, 0.78, 0.15) * crest * vertFade * 0.2;',
  '',
  '  // Warm color tint',
  '  col.r = col.r * 1.08;',
  '  col.g = col.g * 1.02;',
  '',
  '  gl_FragColor = vec4(col, alpha);',
  '}',
].join('\n');


// ══════════════════════════════════════════════════════════════════
//  COSMIC DUST NEBULA SHADER — smooth full-screen bottom-half effect
//  Uses FBM noise, curl advection, Beer-Lambert absorption
//  Renders as a single large shader plane — no lights needed
// ══════════════════════════════════════════════════════════════════

var NEBULA_DUST_VERT = [
  'precision mediump float;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
  '}',
].join('\n');

var NEBULA_DUST_FRAG = [
  'precision mediump float;',
  'uniform float time;',
  'uniform float opacity;',
  'varying vec2 vUv;',
  '',
  '// ── Smooth noise with quintic interpolation ──',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
  'float vnoise(vec2 p) {',
  '  vec2 i = floor(p); vec2 f = fract(p);',
  '  f = f*f*f*(f*(f*6.0-15.0)+10.0);',
  '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
  '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
  '}',
  '',
  '// ── FBM with domain rotation — 7 octaves for fine dust detail ──',
  'float fbm(vec2 p) {',
  '  float v = 0.0, a = 0.5;',
  '  mat2 rot = mat2(0.8,-0.6,0.6,0.8);',
  '  for(int i=0; i<7; i++) {',
  '    v += a * vnoise(p);',
  '    p = rot * p * 2.05;',
  '    a *= 0.48;',
  '  }',
  '  return v;',
  '}',
  '',
  '// ── Ridged FBM — creates filamentary structures like real nebulae ──',
  'float ridgedFbm(vec2 p) {',
  '  float v = 0.0, a = 0.5;',
  '  mat2 rot = mat2(0.8,-0.6,0.6,0.8);',
  '  for(int i=0; i<5; i++) {',
  '    float n = 1.0 - abs(vnoise(p) - 0.5) * 2.0;',
  '    n = n * n;',
  '    v += a * n;',
  '    p = rot * p * 2.1;',
  '    a *= 0.5;',
  '  }',
  '  return v;',
  '}',
  '',
  '// ── Curl-noise for organic flow ──',
  'vec2 curl(vec2 p, float t) {',
  '  float e = 0.012;',
  '  float n  = fbm(p + vec2(t*0.15, 0.0));',
  '  float nx = fbm(p + vec2(e + t*0.15, 0.0));',
  '  float ny = fbm(p + vec2(t*0.15, e));',
  '  return vec2(-(ny-n)/e, (nx-n)/e);',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vUv;',
  '  float t = time;',
  '  float slow = t * 0.08;',
  '',
  '  // ── Vertical mask: visible from bottom, fading out at top ──',
  '  float vertMask = smoothstep(1.0, 0.25, uv.y);',
  '  vertMask *= vertMask;',
  '  float topFade = smoothstep(0.9, 0.35, uv.y);',
  '',
  '  // Horizontal fade at edges',
  '  float hFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);',
  '',
  '  // ── Multi-scale curl advection — turbulent cascade ──',
  '  vec2 wind = curl(uv * 1.2, t * 0.065) * 0.2;',
  '  vec2 convect = curl(uv * 2.8 + 3.7, t * 0.1) * 0.12;',
  '  vec2 eddy = curl(uv * 5.5 + 7.1, t * 0.15) * 0.05;',
  '  vec2 micro = curl(uv * 10.0 + 2.3, t * 0.2) * 0.02;',
  '',
  '  float gravity = -t * 0.005 * (1.0 - uv.y);',
  '  vec2 flowUv = uv + wind + convect + eddy + micro + vec2(0.0, gravity);',
  '',
  '  // ── Domain warping — 3 levels for complex structure ──',
  '  vec2 warp1 = vec2(fbm(flowUv * 1.5 + vec2(slow*0.3, 0.0)),',
  '                    fbm(flowUv * 1.5 + vec2(0.0, slow*0.2)));',
  '  vec2 warp2 = vec2(fbm(flowUv * 2.5 + warp1 * 1.5 + vec2(-slow*0.15, slow*0.1)),',
  '                    fbm(flowUv * 2.5 + warp1 * 1.5 + vec2(slow*0.1, -slow*0.12)));',
  '',
  '  // ── Main cloud density — layered ──',
  '  float n1 = fbm(flowUv * 2.0 + warp2 * 0.4 + vec2(slow*0.35, -slow*0.18));',
  '  float n2 = fbm(flowUv * 3.5 + warp1 * 0.3 - vec2(slow*0.2, slow*0.12));',
  '  float n3 = fbm(flowUv * 6.0 + vec2(-slow*0.25, slow*0.15));',
  '  float n4 = fbm(flowUv * 11.0 + vec2(slow*0.1, -slow*0.08));',
  '',
  '  // ── Filamentary ridged structures — like real dust lanes ──',
  '  float filaments = ridgedFbm(flowUv * 3.0 + warp1 * 0.6 + vec2(slow*0.2, 0.0));',
  '  float fineFilaments = ridgedFbm(flowUv * 6.5 - vec2(0.0, slow*0.15));',
  '',
  '  // ── Dark lanes — absorption features that block light ──',
  '  float darkLane1 = fbm(flowUv * 3.5 + warp2 * 0.5 + vec2(slow*0.1, 0.0));',
  '  float darkLane2 = fbm(flowUv * 5.0 - vec2(slow*0.15, slow*0.08));',
  '  float darkness = smoothstep(0.4, 0.65, darkLane1) * smoothstep(0.35, 0.6, darkLane2);',
  '  darkness = 1.0 - darkness * 0.55;',
  '',
  '  // ── Composite cloud density ──',
  '  float cloud = n1*0.35 + n2*0.25 + n3*0.15 + n4*0.05;',
  '  cloud += filaments * 0.15;',
  '  cloud += fineFilaments * 0.05;',
  '',
  '  // Gentle spiral arm structure',
  '  float angle = atan(flowUv.y - 0.3, flowUv.x - 0.5);',
  '  float rad = length(flowUv - vec2(0.5, 0.3));',
  '  float spiral = sin(angle * 2.0 - rad * 3.5 + slow * 0.6) * 0.5 + 0.5;',
  '  spiral = smoothstep(0.2, 0.8, spiral);',
  '  cloud += spiral * 0.06;',
  '',
  '  cloud = smoothstep(0.12, 0.65, cloud);',
  '  cloud *= darkness;',
  '',
  '  // ── Beer-Lambert volumetric absorption ──',
  '  float optDepth = cloud * 3.2;',
  '  float transmit = exp(-optDepth * 0.55);',
  '',
  '  // ── Dust scattering — forward scatter gives bright edges ──',
  '  float scatter = exp(-optDepth * 0.3) * cloud * 0.4;',
  '',
  '  // ── Temperature gradient — heated dust emits more ──',
  '  float radius = length(uv - vec2(0.5, 0.3));',
  '  float tempGrad = smoothstep(0.65, 0.0, radius);',
  '  float emission = cloud * (0.5 + 0.5 * tempGrad);',
  '',
  '  // ── Color — 4 golden dust themes cycling ──',
  '  float phase = mod(t * 0.008, 6.28);',
  '',
  '  vec3 cA = mix(vec3(0.12,0.06,0.01), vec3(0.7,0.48,0.06), cloud);',
  '  vec3 cB = mix(vec3(0.1,0.05,0.0), vec3(0.8,0.45,0.08), cloud);',
  '  vec3 cC = mix(vec3(0.08,0.05,0.02), vec3(0.85,0.65,0.25), cloud);',
  '  vec3 cD = mix(vec3(0.1,0.03,0.01), vec3(0.75,0.38,0.08), cloud);',
  '',
  '  float wA = max(0.0, cos(phase)); wA *= wA;',
  '  float wB = max(0.0, sin(phase)); wB *= wB;',
  '  float wC = max(0.0,-cos(phase)); wC *= wC;',
  '  float wD = max(0.0,-sin(phase)); wD *= wD;',
  '  float wSum = wA+wB+wC+wD+0.001;',
  '  wA/=wSum; wB/=wSum; wC/=wSum; wD/=wSum;',
  '',
  '  vec3 col = cA*wA + cB*wB + cC*wC + cD*wD;',
  '',
  '  // ── Warm core glow ──',
  '  col += vec3(0.7,0.35,0.08) * tempGrad * cloud * 0.3;',
  '',
  '  // ── Edge-lit dust — bright rim on cloud boundaries ──',
  '  float edgeLight = abs(dFdx(cloud)) + abs(dFdy(cloud));',
  '  edgeLight = smoothstep(0.0, 0.15, edgeLight);',
  '  col += vec3(1.0, 0.8, 0.3) * edgeLight * 0.15 * cloud;',
  '',
  '  // ── Scattered starlight through dust ──',
  '  col += vec3(0.9,0.85,0.7) * scatter * 0.5;',
  '',
  '  // ── Dust grain sparkle — tiny bright specks ──',
  '  float grain = vnoise(flowUv * 35.0 + slow*0.05);',
  '  float sparkle = smoothstep(0.88, 0.98, grain) * cloud * vertMask;',
  '  col += vec3(1.0,0.95,0.8) * sparkle * 0.6;',
  '',
  '  // ── Final composite ──',
  '  col *= emission * 1.5 + 0.12;',
  '  float alpha = (1.0-transmit) * vertMask * topFade * hFade * opacity;',
  '  alpha = clamp(alpha, 0.0, 1.0);',
  '',
  '  gl_FragColor = vec4(col, alpha);',
  '}',
].join('\n');


// ══════════════════════════════════════════════════════════════════
//  STAR FIELD SHADERS — realistic deep-space star field
//  Thousands of tiny pinpricks with realistic magnitude distribution
// ══════════════════════════════════════════════════════════════════
var STARS_VERT = [
  'precision mediump float;',
  'attribute float aSize;',
  'attribute float aPhase;',
  'attribute float aMag;',   // magnitude class 0.0=bright, 1.0=faintest
  'uniform float time;',
  'varying vec3 vColor;',
  'varying float vBrightness;',
  'varying float vMag;',
  '',
  'void main() {',
  '  vColor = color;',
  '  vMag = aMag;',
  '  // ── Vibrant atmospheric scintillation ──',
  '  // Bright stars twinkle more noticeably',
  '  float twinkleAmt = mix(0.32, 0.08, aMag);', // bright=more, dim=less
  '  float f1 = sin(time * 1.3 + aPhase * 6.28) * twinkleAmt;',
  '  float f2 = sin(time * 2.7 + aPhase * 4.17 + position.x * 0.02) * twinkleAmt * 0.7;',
  '  float f3 = sin(time * 0.5 + aPhase * 2.35) * twinkleAmt * 0.3;',
  '  float tw = 0.88 + f1 + f2 + f3;',
  '  vBrightness = clamp(tw, 0.3, 1.25);',
  '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
  '  // Bigger, more visible stars — max 9px for brightest',
  '  gl_PointSize = clamp(aSize * tw * (150.0 / -mvPos.z), 0.4, 9.0);',
  '  gl_Position = projectionMatrix * mvPos;',
  '}',
].join('\n');

var STARS_FRAG = [
  'precision mediump float;',
  'varying vec3 vColor;',
  'varying float vBrightness;',
  'varying float vMag;',
  '',
  'void main() {',
  '  float d = length(gl_PointCoord - 0.5);',
  '  if (d > 0.5) discard;',
  '  // Gaussian core with visible glow',
  '  float core = exp(-d * d * 14.0);',
  '  // Brighter halo for all stars — colorful and visible',
  '  float halo = exp(-d * d * 3.0) * (1.0 - vMag * 0.5) * 0.3;',
  '  float alpha = (core + halo) * vBrightness * 1.2;',
  '  // Slight color saturation boost for vibrancy',
  '  vec3 boosted = vColor * (1.0 + (1.0 - vMag) * 0.2);',
  '  gl_FragColor = vec4(boosted, clamp(alpha, 0.0, 1.0));',
  '}',
].join('\n');

// ══════════════════════════════════════════════════════════════════
//  MILKY WAY BAND SHADERS — dense diagonal star band, realistic sizes
// ══════════════════════════════════════════════════════════════════
var MW_VERT = [
  'precision mediump float;',
  'attribute float aSize;',
  'attribute float aPhase;',
  'attribute float aDepth;',
  'uniform float time;',
  'varying vec3 vColor;',
  'varying float vTwinkle;',
  'varying float vGlow;',
  '',
  'void main() {',
  '  vColor = color;',
  '  // ── Very subtle scintillation for MW stars ──',
  '  float f1 = sin(time * 0.7 + aPhase * 6.28) * 0.1;',
  '  float f2 = sin(time * 1.6 + aPhase * 4.37 + aDepth * 2.0) * 0.07;',
  '  float tw = 0.83 + f1 + f2;',
  '  vTwinkle = clamp(tw, 0.4, 1.1);',
  '  // Core stars glow slightly more',
  '  vGlow = 1.0 + (1.0 - aDepth) * 0.35;',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  float depthScale = 110.0 + aDepth * 40.0;',
  '  gl_PointSize = clamp(aSize * vTwinkle * (depthScale / -mv.z), 0.3, 7.0);',
  '  gl_Position = projectionMatrix * mv;',
  '}',
].join('\n');

var MW_FRAG = [
  'precision mediump float;',
  'varying vec3 vColor;',
  'varying float vTwinkle;',
  'varying float vGlow;',
  'uniform float opacity;',
  '',
  'void main() {',
  '  float d = length(gl_PointCoord - 0.5);',
  '  if (d > 0.5) discard;',
  '  // Visible core with warm glow',
  '  float core = exp(-d * d * 16.0);',
  '  float halo = exp(-d * d * 3.5) * 0.3;',
  '  float alpha = (core + halo) * opacity * vTwinkle * vGlow * 1.15;',
  '  vec3 col = vColor + vec3(0.15, 0.1, 0.0) * core * vTwinkle;',
  '  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));',
  '}',
].join('\n');

// ══════════════════════════════════════════════════════════════════
//  R3F COMPONENTS
// ══════════════════════════════════════════════════════════════════

// ── Deep-space star field — denser, more visible, colorful ──
function CosmicStars() {
  var ref = useRef();
  // Much denser star field — spectacular night sky
  var COUNT = IS_MOBILE ? 8000 : 16000;
  var SPREAD = 200;

  var data = useMemo(function () {
    var pos = new Float32Array(COUNT * 3);
    var col = new Float32Array(COUNT * 3);
    var sizes = new Float32Array(COUNT);
    var phases = new Float32Array(COUNT);
    var mags = new Float32Array(COUNT);

    // Rich colorful golden-celestial palette — visible & spectacular
    var palette = [
      [1.0, 1.0, 0.92],     // warm white
      [1.0, 0.95, 0.75],    // champagne gold
      [1.0, 0.85, 0.45],    // rich gold
      [1.0, 0.78, 0.28],    // deep gold
      [0.98, 0.72, 0.12],   // amber gold
      [1.0, 0.65, 0.18],    // burnt amber
      [1.0, 0.88, 0.55],    // pale honey
      [0.95, 0.9, 0.6],     // soft champagne
      [1.0, 0.55, 0.15],    // copper-orange
      [1.0, 0.92, 0.35],    // bright gold
      [0.85, 0.75, 1.0],    // lavender-gold highlight
      [1.0, 0.82, 0.72],    // rose-gold tint
      [0.7, 0.85, 1.0],     // cool blue diamond
      [1.0, 0.5, 0.3],      // fiery amber
    ];

    for (var i = 0; i < COUNT; i++) {
      // Spread across a wide sphere for depth
      pos[i * 3] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 2] = -Math.random() * SPREAD * 0.9;

      // ── Brighter magnitude distribution ──
      // More bright/mid stars visible, fewer invisible pinpricks
      var mag = Math.pow(Math.random(), 0.55); // shifted brighter (was 0.4)
      mags[i] = mag;

      var c = palette[Math.floor(Math.random() * palette.length)];
      // Higher base brightness so more stars are visible
      var b = (1.0 - mag) * 0.75 + 0.25;
      col[i * 3] = c[0] * b;
      col[i * 3 + 1] = c[1] * b;
      col[i * 3 + 2] = c[2] * b;

      // ── Bigger sizes — more visible ──
      // Top ~8% get sizes 1.5-2.8 (bright prominent stars)
      // Mid ~25% get sizes 0.8-1.5 (clearly visible)
      // Rest get 0.25-0.8 (small but still noticeable)
      if (mag < 0.08) {
        sizes[i] = 1.5 + Math.random() * 1.3;
      } else if (mag < 0.33) {
        sizes[i] = 0.8 + Math.random() * 0.7;
      } else {
        sizes[i] = 0.25 + Math.random() * 0.55;
      }

      phases[i] = Math.random() * 6.28;
    }

    var geo = new THREE_LIB.BufferGeometry();
    geo.setAttribute('position', new THREE_LIB.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE_LIB.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE_LIB.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE_LIB.BufferAttribute(phases, 1));
    geo.setAttribute('aMag', new THREE_LIB.BufferAttribute(mags, 1));
    // Manual bounding sphere — prevents NaN from computeBoundingSphere
    geo.boundingSphere = new THREE_LIB.Sphere(new THREE_LIB.Vector3(0, 0, 0), 300);

    return {
      geometry: geo,
      uniforms: { time: { value: 0 } },
    };
  }, []);

  useFrame(function (state) {
    var t = state.clock.getElapsedTime();
    data.uniforms.time.value = t;
    if (ref.current) {
      // Ultra-slow celestial sphere drift
      ref.current.rotation.y = t * 0.0015;
      ref.current.rotation.x = Math.sin(t * 0.006) * 0.002;
      ref.current.position.x = Math.sin(t * 0.012) * 0.5;
      ref.current.position.y = Math.cos(t * 0.01) * 0.3;
    }
  });

  return (
    <points ref={ref} geometry={data.geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={STARS_VERT}
        fragmentShader={STARS_FRAG}
        transparent={true}
        depthWrite={false}
        vertexColors={true}
        blending={THREE_LIB.AdditiveBlending}
      />
    </points>
  );
}

// ── Milky Way band — dense diagonal star stream, realistic tiny stars ──
function MilkyWayBand() {
  var ref = useRef();
  var COUNT = IS_MOBILE ? 18000 : 40000;

  var data = useMemo(function () {
    var pos = new Float32Array(COUNT * 3);
    var col = new Float32Array(COUNT * 3);
    var sizes = new Float32Array(COUNT);
    var phases = new Float32Array(COUNT);
    var depths = new Float32Array(COUNT);

    // Golden star palette — warm range
    var palette = [
      [1.0, 0.84, 0.0],    // bright gold
      [0.98, 0.82, 0.15],   // warm gold
      [1.0, 0.78, 0.05],    // rich gold
      [1.0, 0.95, 0.7],     // champagne
      [0.98, 0.92, 0.65],   // pale champagne
      [1.0, 0.9, 0.55],     // warm champagne
      [1.0, 0.7, 0.1],      // deep gold
      [0.95, 0.65, 0.08],   // amber
      [0.92, 0.6, 0.05],    // dark amber
      [1.0, 0.58, 0.18],    // copper-gold
      [1.0, 0.72, 0.45],    // rose gold
      [1.0, 0.97, 0.85],    // white-gold (hot)
      [1.0, 0.95, 0.8],     // warm white
      [0.8, 0.62, 0.1],     // antique gold
      [1.0, 0.76, 0.22],    // honey gold
    ];

    for (var i = 0; i < COUNT; i++) {
      var bandLen = IS_MOBILE ? 320 : 600;
      var t = (Math.random() - 0.5) * bandLen;

      // Gaussian perpendicular spread
      var u1 = Math.random(), u2 = Math.random();
      var gauss = Math.sqrt(-2.0 * Math.log(u1 + 0.0001)) * Math.cos(6.28 * u2);
      var bandWidth = IS_MOBILE ? 18 : 26;
      var perp = gauss * bandWidth;

      // Dense core
      var isCore = Math.random() < 0.35;
      if (isCore) {
        perp *= 0.2;
        t *= 0.45;
      }

      pos[i * 3] = t;
      pos[i * 3 + 1] = perp;

      var zSpread = IS_MOBILE ? 8 : 15;
      var depthFactor = Math.random();
      if (isCore) depthFactor *= 0.4;
      pos[i * 3 + 2] = (depthFactor - 0.5) * zSpread;

      // Color selection
      var distFromCenter = Math.abs(perp) / bandWidth;
      var cIdx;
      if (isCore) {
        var corePool = [0, 1, 2, 3, 4, 5, 11, 12];
        cIdx = corePool[Math.floor(Math.random() * corePool.length)];
      } else if (distFromCenter < 0.5) {
        cIdx = Math.floor(Math.random() * palette.length);
      } else {
        var edgePool = [6, 7, 8, 9, 13, 14];
        cIdx = edgePool[Math.floor(Math.random() * edgePool.length)];
      }
      var c = palette[cIdx];

      var brightness = isCore ? (0.55 + Math.random() * 0.4) : (0.18 + Math.random() * 0.45);
      brightness *= (1.0 - depthFactor * 0.3);

      col[i * 3] = c[0] * brightness;
      col[i * 3 + 1] = c[1] * brightness;
      col[i * 3 + 2] = c[2] * brightness;

      // ── Bigger MW stars — more visible ──
      if (isCore) {
        sizes[i] = Math.random() < 0.08 ? (1.0 + Math.random() * 0.9) : (0.18 + Math.random() * 0.55);
      } else {
        sizes[i] = 0.12 + Math.random() * 0.45;
      }

      phases[i] = Math.random();
      depths[i] = depthFactor;
    }

    var geo = new THREE_LIB.BufferGeometry();
    geo.setAttribute('position', new THREE_LIB.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE_LIB.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE_LIB.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE_LIB.BufferAttribute(phases, 1));
    geo.setAttribute('aDepth', new THREE_LIB.BufferAttribute(depths, 1));
    // Manual bounding sphere — prevents NaN from computeBoundingSphere
    geo.boundingSphere = new THREE_LIB.Sphere(new THREE_LIB.Vector3(0, 0, 0), 500);

    return {
      geometry: geo,
      uniforms: { time: { value: 0 }, opacity: { value: IS_MOBILE ? 0.85 : 0.95 } },
    };
  }, []);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <points ref={ref} geometry={data.geometry} frustumCulled={false}>
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={MW_VERT}
        fragmentShader={MW_FRAG}
        transparent={true}
        depthWrite={false}
        vertexColors={true}
        blending={THREE_LIB.AdditiveBlending}
      />
    </points>
  );
}

// ── Single Aurora Curtain Mesh ──
function AuroraCurtain({ cfg }) {
  var meshRef = useRef();
  var baseYRef = useRef(cfg.y);
  var baseXRef = useRef(cfg.x);

  var data = useMemo(function () {
    var segs = cfg.segments || 32;
    var geo = new THREE_LIB.PlaneGeometry(cfg.w, cfg.h, segs, Math.max(1, Math.floor(segs / 4)));
    var u = {
      time: { value: 0 },
      color1: { value: new THREE_LIB.Vector3(cfg.color1[0], cfg.color1[1], cfg.color1[2]) },
      color2: { value: new THREE_LIB.Vector3(cfg.color2[0], cfg.color2[1], cfg.color2[2]) },
      color3: { value: new THREE_LIB.Vector3(cfg.color3[0], cfg.color3[1], cfg.color3[2]) },
      opacity: { value: cfg.opacity },
      speed: { value: cfg.speed },
      waveFreq: { value: cfg.waveFreq },
      intensity: { value: cfg.intensity || 1.0 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  // Store base colors for hue cycling
  var baseColors = useRef([cfg.color1.slice(), cfg.color2.slice(), cfg.color3.slice()]);
  var tmpColor = useMemo(function () { return new THREE_LIB.Color(); }, []);
  var tmpHsl = useRef({ h: 0, s: 0, l: 0 });
  var idx = useRef(cfg._idx || 0);

  useFrame(function (state) {
    var t = state.clock.getElapsedTime();
    data.uniforms.time.value = t;

    if (meshRef.current) {
      // ── Solar wind driven motion — realistic magnetosphere dynamics ──
      var i = idx.current;

      // Slow solar wind pressure — large scale, aperiodic
      var windPressure = Math.sin(t * 0.07 + i * 1.8) * Math.cos(t * 0.042 + i * 0.7);
      // Sudden magnetospheric substorm bursts (rare, strong)
      var substorm = Math.pow(Math.max(0, Math.sin(t * 0.16 + i * 3.14)), 8.0) * 0.4;

      // Multi-frequency drift — incommensurate frequencies = non-repeating
      var driftX = Math.sin(t * 0.11 + i * 2.0) * 22
                 + Math.cos(t * 0.062 + i * 0.9) * 12
                 + Math.sin(t * 0.034 + i * 4.1) * 8 // very slow wander
                 + windPressure * 18 // solar wind push
                 + substorm * 35;   // substorm burst
      var driftY = Math.sin(t * 0.084 + i * 1.5) * 7
                 + Math.cos(t * 0.046 + i * 2.3) * 4
                 + Math.sin(t * 0.022 + i * 3.7) * 3; // ultra-slow vertical drift

      meshRef.current.position.y = baseYRef.current + driftY;
      meshRef.current.position.x = baseXRef.current + driftX;

      // ── Organic rotation — tilt responds to drift velocity ──
      // Curtain tilts in direction of movement (like fabric in wind)
      var tiltFromMotion = Math.cos(t * 0.11 + i * 2.0) * 0.003; // derivative of driftX
      meshRef.current.rotation.z += Math.sin(t * 0.036 + i * 0.7) * 0.00006 + tiltFromMotion * 0.0001;

      // Gentle pitch oscillation — curtain breathing in/out
      meshRef.current.rotation.x = cfg.rotX + Math.sin(t * 0.05 + i * 1.3) * 0.015;

      // Slow color cycling — with solar wind intensity modulation
      var hueShift = Math.sin(t * 0.024 + i * 1.5) * 0.22;
      // Intensity surge during substorms — aurora brightens
      var intensitySurge = 1.0 + substorm * 2.5;
      data.uniforms.intensity.value = (cfg.intensity || 1.0) * intensitySurge;
      var bc = baseColors.current;
      for (var ci = 0; ci < 3; ci++) {
        tmpColor.setRGB(bc[ci][0], bc[ci][1], bc[ci][2]);
        tmpColor.getHSL(tmpHsl.current);
        tmpColor.setHSL(
          (tmpHsl.current.h + hueShift + 1.0) % 1.0,
          Math.min(1.0, tmpHsl.current.s * 1.1),
          tmpHsl.current.l
        );
        var uName = ci === 0 ? 'color1' : ci === 1 ? 'color2' : 'color3';
        data.uniforms[uName].value.set(tmpColor.r, tmpColor.g, tmpColor.b);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[cfg.x, cfg.y, cfg.z]}
      rotation={[cfg.rotX, 0, cfg.rotZ]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={AURORA_VERT}
        fragmentShader={AURORA_FRAG}
        transparent={true}
        depthWrite={false}
        side={THREE_LIB.DoubleSide}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Aurora Waves — 4 curtains, pushed to TOP of screen ──
function AuroraWaves() {
  var configs = useMemo(function () {
    return [
      // Main bright gold aurora — wide, at top
      {
        w: IS_MOBILE ? 700 : 1500, h: IS_MOBILE ? 160 : 320,
        x: 0, y: IS_MOBILE ? 90 : 130, z: -220,
        rotX: 0.15, rotZ: 0.05,
        color1: [1.0, 0.85, 0.18],  // vivid bright gold
        color2: [1.0, 0.72, 0.1],   // rich amber-gold
        color3: [1.0, 0.92, 0.5],   // shimmering champagne gold
        opacity: IS_MOBILE ? 0.24 : 0.32,
        speed: 0.4, waveFreq: 4.5, intensity: 1.3,
        segments: IS_MOBILE ? 32 : 64,
        _idx: 0,
      },
      // Rich deep gold aurora — slightly lower but still top half
      {
        w: IS_MOBILE ? 600 : 1200, h: IS_MOBILE ? 140 : 280,
        x: IS_MOBILE ? -60 : -100, y: IS_MOBILE ? 65 : 90, z: -320,
        rotX: 0.12, rotZ: -0.08,
        color1: [1.0, 0.62, 0.12],  // warm copper-gold
        color2: [1.0, 0.8, 0.25],   // bright warm gold
        color3: [0.92, 0.5, 0.06],  // deep sunset amber
        opacity: IS_MOBILE ? 0.18 : 0.26,
        speed: 0.3, waveFreq: 3.8, intensity: 1.2,
        segments: IS_MOBILE ? 24 : 48,
        _idx: 1,
      },
      // Champagne-gold wide aurora — far back, highest — ethereal
      {
        w: IS_MOBILE ? 800 : 1600, h: IS_MOBILE ? 120 : 240,
        x: IS_MOBILE ? 40 : 80, y: IS_MOBILE ? 120 : 180, z: -450,
        rotX: -0.06, rotZ: 0.12,
        color1: [1.0, 0.95, 0.6],   // light champagne
        color2: [1.0, 0.82, 0.25],  // rich gold
        color3: [1.0, 0.88, 0.4],   // warm gold glow
        opacity: IS_MOBILE ? 0.12 : 0.18,
        speed: 0.24, waveFreq: 3.2, intensity: 1.1,
        segments: IS_MOBILE ? 24 : 48,
        _idx: 2,
      },
      // Honey-gold accent aurora — bridge zone
      {
        w: IS_MOBILE ? 500 : 1100, h: IS_MOBILE ? 100 : 200,
        x: IS_MOBILE ? 80 : 160, y: IS_MOBILE ? 45 : 60, z: -380,
        rotX: 0.08, rotZ: 0.15,
        color1: [1.0, 0.78, 0.2],   // honey gold
        color2: [0.95, 0.65, 0.12], // warm amber
        color3: [1.0, 0.85, 0.35],  // bright gold
        opacity: IS_MOBILE ? 0.09 : 0.14,
        speed: 0.28, waveFreq: 5.0, intensity: 1.0,
        segments: IS_MOBILE ? 16 : 32,
        _idx: 3,
      },
    ];
  }, []);

  return (
    <>
      {configs.map(function (cfg, i) {
        return <AuroraCurtain key={i} cfg={cfg} />;
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  COSMIC DUST NEBULA — shader plane covering bottom half of screen
//  No lights, no textures — pure GPU shader for smooth cosmic dust
// ══════════════════════════════════════════════════════════════════

function CosmicDustNebula() {
  var meshRef = useRef();

  var data = useMemo(function () {
    // Giant plane — covers entire bottom half and overlaps into mid-zone
    // Camera at z=100, fov=55: at z=-100 (200 units away), visible range ~±200
    var w = IS_MOBILE ? 350 : 550;
    var h = IS_MOBILE ? 250 : 400;
    var geo = new THREE_LIB.PlaneGeometry(w, h, 1, 1);
    var u = {
      time: { value: 0 },
      opacity: { value: IS_MOBILE ? 0.55 : 0.65 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[0, IS_MOBILE ? -60 : -80, -100]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={NEBULA_DUST_VERT}
        fragmentShader={NEBULA_DUST_FRAG}
        transparent={true}
        depthWrite={false}
        side={THREE_LIB.DoubleSide}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  AURORA-TO-NEBULA FADE BRIDGE
//  A tall vertical gradient plane in the mid-zone that smoothly
//  blends the aurora glow down into the nebula dust
// ══════════════════════════════════════════════════════════════════

var FADE_BRIDGE_VERT = [
  'precision mediump float;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
  '}',
].join('\n');

var FADE_BRIDGE_FRAG = [
  'precision mediump float;',
  'uniform float time;',
  'uniform float opacity;',
  'varying vec2 vUv;',
  '',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
  'float vnoise(vec2 p) {',
  '  vec2 i = floor(p); vec2 f = fract(p);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
  '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
  '}',
  'float fbm(vec2 p) {',
  '  float v = 0.0, a = 0.5;',
  '  for(int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.1; a *= 0.5; }',
  '  return v;',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vUv;',
  '  float t = time * 0.08;',
  '',
  '  // ── Wind shear — top and bottom flow at different speeds ──',
  '  // Simulates aurora particles falling/flowing down into nebula zone',
  '  float shearOffset = (uv.y - 0.5) * t * 0.15;',
  '  vec2 shearedUv = uv + vec2(shearOffset, 0.0);',
  '',
  '  // ── Downward drift — aurora glow cascading into nebula ──',
  '  vec2 driftUv = shearedUv + vec2(t * 0.2, -t * 0.4);',
  '',
  '  // Vertical gradient: strong in middle, fades at top and bottom edges',
  '  float yFade = smoothstep(0.0, 0.35, uv.y) * smoothstep(1.0, 0.65, uv.y);',
  '  float xFade = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);',
  '',
  '  // Flowing noise — drifting wisps',
  '  float n = fbm(driftUv * 3.0 + vec2(t * 0.5, -t * 0.8));',
  '  float n2 = fbm(driftUv * 5.0 - vec2(t * 0.3, t * 0.6));',
  '  // Fine wispy tendrils falling downward',
  '  float tendrils = fbm(vec2(shearedUv.x * 8.0, shearedUv.y * 3.0 - t * 1.5));',
  '  tendrils = smoothstep(0.4, 0.7, tendrils) * 0.3;',
  '',
  '  // Color: golden at top, transitioning to deep amber at bottom',
  '  vec3 auroraCol = vec3(1.0, 0.8, 0.2);    // bright gold',
  '  vec3 nebulaCol = vec3(0.6, 0.35, 0.05);  // deep amber',
  '  vec3 warmCol   = vec3(0.9, 0.55, 0.08);  // rich golden accent',
  '',
  '  float blend = smoothstep(0.3, 0.7, uv.y); // top=aurora, bottom=nebula',
  '  vec3 col = mix(nebulaCol, auroraCol, blend);',
  '  // Add warm accent in middle',
  '  col += warmCol * (1.0 - abs(uv.y - 0.5) * 2.0) * 0.3;',
  '',
  '  // Modulate with noise for organic wisps + falling tendrils',
  '  float density = (n * 0.5 + n2 * 0.3 + tendrils) * yFade * xFade;',
  '  density = smoothstep(0.12, 0.55, density);',
  '',
  '  float alpha = density * opacity;',
  '  gl_FragColor = vec4(col * (0.8 + n * 0.4), alpha);',
  '}',
].join('\n');

function FadeBridge() {
  var meshRef = useRef();

  var data = useMemo(function () {
    // Tall plane spanning the mid-zone between aurora and nebula
    var w = IS_MOBILE ? 160 : 280;
    var h = IS_MOBILE ? 60 : 80;
    var geo = new THREE_LIB.PlaneGeometry(w, h, 1, 1);
    var u = {
      time: { value: 0 },
      opacity: { value: IS_MOBILE ? 0.18 : 0.22 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[0, IS_MOBILE ? -5 : -8, -50]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={FADE_BRIDGE_VERT}
        fragmentShader={FADE_BRIDGE_FRAG}
        transparent={true}
        depthWrite={false}
        side={THREE_LIB.DoubleSide}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  MILKY WAY DIFFUSE GLOW — soft hazy band behind the star points
//  Makes the band visible as a continuous river of light, not just dots
// ══════════════════════════════════════════════════════════════════

var MW_GLOW_VERT = [
  'precision mediump float;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
  '}',
].join('\n');

var MW_GLOW_FRAG = [
  'precision mediump float;',
  'uniform float time;',
  'uniform float opacity;',
  'varying vec2 vUv;',
  '',
  'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
  'float vnoise(vec2 p) {',
  '  vec2 i = floor(p); vec2 f = fract(p);',
  '  f = f*f*(3.0-2.0*f);',
  '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
  '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
  '}',
  'float fbm(vec2 p) {',
  '  float v=0.0,a=0.5; mat2 rot=mat2(0.8,-0.6,0.6,0.8);',
  '  for(int i=0;i<5;i++){v+=a*vnoise(p);p=rot*p*2.05;a*=0.5;}',
  '  return v;',
  '}',
  '',
  'void main() {',
  '  vec2 uv = vUv;',
  '  float t = time * 0.015;',
  '',
  '  // Band shape — narrow Gaussian along the diagonal center line',
  '  // uv.y = 0.5 is the band center, fades to 0 at top/bottom',
  '  float bandDist = abs(uv.y - 0.5);',
  '  float bandShape = exp(-bandDist * bandDist * 28.0);',
  '',
  '  // Galactic core concentration — brighter near uv.x center',
  '  float coreDist = length(uv - vec2(0.5, 0.5));',
  '  float coreGlow = exp(-coreDist * coreDist * 8.0) * 1.5;',
  '',
  '  // Horizontal taper at edges',
  '  float hFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);',
  '',
  '  // Subtle texture — dust clouds within the band',
  '  float dust = fbm(uv * vec2(6.0, 2.0) + vec2(t, -t * 0.3));',
  '  float darkLanes = 1.0 - smoothstep(0.35, 0.55, dust) * 0.35;',
  '',
  '  // Color — rich golden core, warm amber edges',
  '  vec3 coreCol = vec3(1.0, 0.85, 0.35); // bright gold',
  '  vec3 edgeCol = vec3(0.85, 0.6, 0.15);  // deep amber-gold',
  '  vec3 col = mix(edgeCol, coreCol, coreGlow);',
  '  // Rich golden accent at core',
  '  col += vec3(0.25, 0.15, 0.0) * coreGlow;',
  '',
  '  float density = (bandShape + coreGlow * 0.6) * hFade * darkLanes;',
  '  float alpha = density * opacity;',
  '  alpha = clamp(alpha, 0.0, 1.0);',
  '',
  '  gl_FragColor = vec4(col, alpha);',
  '}',
].join('\n');

function MilkyWayGlow() {
  var meshRef = useRef();

  var data = useMemo(function () {
    // Long narrow plane — matches the star band dimensions in local space
    // Stars spread bandLen=320 along x, bandWidth Gaussian ~±36 along y
    // Plane is slightly wider/taller to create a soft halo around the stars
    var w = IS_MOBILE ? 350 : 620;
    var h = IS_MOBILE ? 80 : 120;
    var geo = new THREE_LIB.PlaneGeometry(w, h, 1, 1);
    var u = {
      time: { value: 0 },
      opacity: { value: IS_MOBILE ? 0.12 : 0.16 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  // Local coords within the MW group — no rotation needed, parent group rotates both
  // Sits slightly behind the stars (z=-3) so stars render on top
  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[0, 0, -3]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={MW_GLOW_VERT}
        fragmentShader={MW_GLOW_FRAG}
        transparent={true}
        depthWrite={false}
        side={THREE_LIB.DoubleSide}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  MAIN SCENE
// ══════════════════════════════════════════════════════════════════
function CosmicScene() {
  return (
    <>
      <AuroraWaves />
      <CosmicDustNebula />
      <CosmicStars />
      <ShootingStarsSystem />
      {/* Milky Way group — shared rotation ensures stars and glow are perfectly aligned */}
      <group position={[0, 0, IS_MOBILE ? -75 : -90]} rotation={[0, 0, -0.85]}>
        <MilkyWayGlow />
        <MilkyWayBand />
      </group>
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
    try { dprVal = Math.min(window.devicePixelRatio || 1, 1.5); } catch (e) { dprVal = 1; }
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
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
        }}
      />
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════
//  FALLBACK
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
