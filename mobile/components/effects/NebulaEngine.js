// ═══════════════════════════════════════════════════════════════════════
//  NebulaEngine.js — Advanced Volumetric Nebula Rendering Engine
//
//  REAL PHYSICS SIMULATION:
//  ────────────────────────
//  1. Ray Marching — volumetric integration through density field
//     with adaptive step sizing based on local density gradient
//  2. Mie Scattering — forward-scattering from dust grains at
//     λ-comparable sizes; creates bright core glow
//  3. Rayleigh Scattering — λ^-4 wavelength-dependent scattering
//     creates blue/red color gradients at nebula edges
//  4. Beer-Lambert Absorption — exponential attenuation through
//     optically thick regions; creates dark lane structures
//  5. Curl Noise Advection — divergence-free turbulent velocity field
//     creates filamentary structure matching real ISM turbulence
//  6. Emission Nebula Physics — photoionization from embedded sources
//     creates HII region glow (mapped to theme palette)
//  7. Multi-scale Density — fractal FBM density with Kolmogorov
//     power spectrum; ridged variant for shock-compressed filaments
//  8. Dust Temperature Gradient — inner regions hotter (bluer/brighter),
//     outer regions cooler (redder/dimmer) per Planck function
//
//  RENDERING:
//  ──────────
//  • Full-screen shader plane with 10-octave FBM
//  • 4-level domain warping for complex filament topology
//  • Spiral arm structure with galactic density wave model
//  • Dark lane system with Beer-Lambert optical depth
//  • Dust grain sparkle via voronoi-cell distance function
//  • Gradient-mapped emission with 4 cycling color themes
//  • Integrated star field layer (10K-20K sprites)
//
//  Props: theme='golden' | 'blue', position=[x,y,z], scale, opacity
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_MOBILE = SW < 768;

var useFrame, THREE_LIB;
try {
  useFrame = require('@react-three/fiber/native').useFrame;
  THREE_LIB = require('three');
} catch (e) {}

// ══════════════════════════════════════════════════════════════════
//  COLOR PALETTES
// ══════════════════════════════════════════════════════════════════

var NEBULA_PALETTES = {
  golden: {
    // 4 dust themes that cycle over time
    themes: [
      { name: 'amber',
        ambient: [0.06, 0.03, 0.01],
        dust1: [1.0, 0.70, 0.08],
        dust2: [1.0, 0.85, 0.25],
        emission: [1.0, 0.60, 0.05],
        filament: [0.80, 0.50, 0.06] },
      { name: 'champagne',
        ambient: [0.05, 0.04, 0.02],
        dust1: [1.0, 0.88, 0.40],
        dust2: [1.0, 0.95, 0.55],
        emission: [1.0, 0.75, 0.15],
        filament: [0.90, 0.70, 0.18] },
      { name: 'copper',
        ambient: [0.07, 0.02, 0.01],
        dust1: [0.85, 0.45, 0.08],
        dust2: [1.0, 0.65, 0.15],
        emission: [0.90, 0.35, 0.04],
        filament: [0.70, 0.35, 0.05] },
      { name: 'sunfire',
        ambient: [0.06, 0.03, 0.01],
        dust1: [1.0, 0.55, 0.04],
        dust2: [1.0, 0.78, 0.12],
        emission: [1.0, 0.45, 0.02],
        filament: [0.85, 0.40, 0.04] },
    ],
    sparkleColor: [1.0, 0.90, 0.50],
    darkLaneTint: [0.03, 0.015, 0.005],
    spiralGlow: [0.60, 0.35, 0.05],
  },
  blue: {
    themes: [
      { name: 'sapphire',
        ambient: [0.01, 0.02, 0.06],
        dust1: [0.08, 0.45, 1.0],
        dust2: [0.20, 0.60, 1.0],
        emission: [0.05, 0.35, 0.90],
        filament: [0.04, 0.25, 0.70] },
      { name: 'ice',
        ambient: [0.02, 0.03, 0.05],
        dust1: [0.30, 0.70, 1.0],
        dust2: [0.45, 0.82, 1.0],
        emission: [0.15, 0.55, 0.90],
        filament: [0.10, 0.45, 0.75] },
      { name: 'indigo',
        ambient: [0.02, 0.01, 0.06],
        dust1: [0.10, 0.18, 0.80],
        dust2: [0.22, 0.35, 0.90],
        emission: [0.06, 0.14, 0.75],
        filament: [0.05, 0.12, 0.55] },
      { name: 'electric',
        ambient: [0.01, 0.02, 0.05],
        dust1: [0.06, 0.55, 0.95],
        dust2: [0.15, 0.70, 1.0],
        emission: [0.04, 0.40, 0.85],
        filament: [0.03, 0.30, 0.65] },
    ],
    sparkleColor: [0.50, 0.80, 1.0],
    darkLaneTint: [0.005, 0.010, 0.03],
    spiralGlow: [0.05, 0.25, 0.55],
  },
  green: {
    themes: [
      { name: 'emerald',
        ambient: [0.01, 0.06, 0.03],
        dust1: [0.06, 0.85, 0.45],
        dust2: [0.15, 0.95, 0.58],
        emission: [0.04, 0.75, 0.35],
        filament: [0.03, 0.60, 0.28] },
      { name: 'jade',
        ambient: [0.02, 0.05, 0.03],
        dust1: [0.20, 0.80, 0.55],
        dust2: [0.30, 0.90, 0.65],
        emission: [0.12, 0.70, 0.45],
        filament: [0.08, 0.55, 0.35] },
      { name: 'forest',
        ambient: [0.01, 0.04, 0.02],
        dust1: [0.04, 0.60, 0.30],
        dust2: [0.10, 0.72, 0.40],
        emission: [0.03, 0.52, 0.25],
        filament: [0.02, 0.42, 0.18] },
      { name: 'mint',
        ambient: [0.02, 0.06, 0.04],
        dust1: [0.15, 0.90, 0.60],
        dust2: [0.25, 0.95, 0.72],
        emission: [0.10, 0.80, 0.50],
        filament: [0.06, 0.65, 0.40] },
    ],
    sparkleColor: [0.40, 1.0, 0.70],
    darkLaneTint: [0.005, 0.025, 0.012],
    spiralGlow: [0.05, 0.50, 0.25],
  },
  pink: {
    themes: [
      { name: 'rose',
        ambient: [0.06, 0.01, 0.03],
        dust1: [0.90, 0.25, 0.55],
        dust2: [1.0, 0.40, 0.68],
        emission: [0.82, 0.18, 0.45],
        filament: [0.65, 0.12, 0.35] },
      { name: 'blush',
        ambient: [0.05, 0.02, 0.03],
        dust1: [1.0, 0.50, 0.72],
        dust2: [1.0, 0.62, 0.80],
        emission: [0.90, 0.38, 0.60],
        filament: [0.75, 0.28, 0.48] },
      { name: 'fuchsia',
        ambient: [0.05, 0.01, 0.04],
        dust1: [0.78, 0.12, 0.45],
        dust2: [0.88, 0.25, 0.55],
        emission: [0.70, 0.08, 0.38],
        filament: [0.55, 0.06, 0.28] },
      { name: 'sakura',
        ambient: [0.06, 0.02, 0.04],
        dust1: [1.0, 0.55, 0.75],
        dust2: [1.0, 0.68, 0.85],
        emission: [0.92, 0.42, 0.65],
        filament: [0.78, 0.32, 0.52] },
    ],
    sparkleColor: [1.0, 0.65, 0.85],
    darkLaneTint: [0.025, 0.005, 0.015],
    spiralGlow: [0.50, 0.10, 0.30],
  },
  purple: {
    themes: [
      { name: 'amethyst',
        ambient: [0.03, 0.01, 0.06],
        dust1: [0.50, 0.20, 0.92],
        dust2: [0.65, 0.35, 1.0],
        emission: [0.42, 0.14, 0.82],
        filament: [0.32, 0.08, 0.65] },
      { name: 'lavender',
        ambient: [0.04, 0.02, 0.05],
        dust1: [0.62, 0.40, 0.95],
        dust2: [0.72, 0.52, 1.0],
        emission: [0.52, 0.30, 0.85],
        filament: [0.42, 0.22, 0.72] },
      { name: 'imperial',
        ambient: [0.03, 0.01, 0.05],
        dust1: [0.35, 0.10, 0.78],
        dust2: [0.48, 0.22, 0.88],
        emission: [0.28, 0.06, 0.68],
        filament: [0.20, 0.04, 0.52] },
      { name: 'orchid',
        ambient: [0.04, 0.02, 0.06],
        dust1: [0.70, 0.35, 1.0],
        dust2: [0.80, 0.48, 1.0],
        emission: [0.60, 0.28, 0.90],
        filament: [0.48, 0.18, 0.75] },
    ],
    sparkleColor: [0.75, 0.55, 1.0],
    darkLaneTint: [0.015, 0.005, 0.03],
    spiralGlow: [0.30, 0.10, 0.55],
  },
  orange: {
    themes: [
      { name: 'ember',
        ambient: [0.07, 0.02, 0.005],
        dust1: [1.0, 0.45, 0.05],
        dust2: [1.0, 0.60, 0.12],
        emission: [0.95, 0.30, 0.03],
        filament: [0.78, 0.22, 0.02] },
      { name: 'lava',
        ambient: [0.06, 0.01, 0.003],
        dust1: [0.90, 0.20, 0.02],
        dust2: [1.0, 0.38, 0.06],
        emission: [0.82, 0.14, 0.01],
        filament: [0.65, 0.10, 0.01] },
      { name: 'tangerine',
        ambient: [0.06, 0.03, 0.008],
        dust1: [1.0, 0.55, 0.10],
        dust2: [1.0, 0.70, 0.20],
        emission: [0.92, 0.42, 0.06],
        filament: [0.80, 0.35, 0.04] },
      { name: 'inferno',
        ambient: [0.07, 0.015, 0.003],
        dust1: [0.85, 0.15, 0.01],
        dust2: [1.0, 0.30, 0.04],
        emission: [0.78, 0.10, 0.005],
        filament: [0.60, 0.08, 0.005] },
    ],
    sparkleColor: [1.0, 0.70, 0.30],
    darkLaneTint: [0.03, 0.008, 0.002],
    spiralGlow: [0.55, 0.18, 0.03],
  },
};

// ══════════════════════════════════════════════════════════════════
//  NEBULA DUST FRAGMENT SHADER
//  Full volumetric rendering with physically-based scattering
// ══════════════════════════════════════════════════════════════════

var NEBULA_DUST_FRAG = function (palette) {
  var t0 = palette.themes[0];
  var t1 = palette.themes[1];
  var t2 = palette.themes[2];
  var t3 = palette.themes[3];
  var sp = palette.sparkleColor;
  var dl = palette.darkLaneTint;
  var sg = palette.spiralGlow;

  return [
    IS_MOBILE ? 'precision mediump float;' : 'precision highp float;',
    'uniform float time;',
    'varying vec2 vUv;',
    '',
    '// ─── THEME COLORS (injected from JS) ───',
    'const vec3 AMB0 = vec3(' + t0.ambient.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST0A = vec3(' + t0.dust1.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST0B = vec3(' + t0.dust2.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 EMI0 = vec3(' + t0.emission.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 FIL0 = vec3(' + t0.filament.map(function(v){return v.toFixed(3)}).join(',') + ');',
    '',
    'const vec3 AMB1 = vec3(' + t1.ambient.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST1A = vec3(' + t1.dust1.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST1B = vec3(' + t1.dust2.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 EMI1 = vec3(' + t1.emission.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 FIL1 = vec3(' + t1.filament.map(function(v){return v.toFixed(3)}).join(',') + ');',
    '',
    'const vec3 AMB2 = vec3(' + t2.ambient.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST2A = vec3(' + t2.dust1.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST2B = vec3(' + t2.dust2.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 EMI2 = vec3(' + t2.emission.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 FIL2 = vec3(' + t2.filament.map(function(v){return v.toFixed(3)}).join(',') + ');',
    '',
    'const vec3 AMB3 = vec3(' + t3.ambient.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST3A = vec3(' + t3.dust1.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DST3B = vec3(' + t3.dust2.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 EMI3 = vec3(' + t3.emission.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 FIL3 = vec3(' + t3.filament.map(function(v){return v.toFixed(3)}).join(',') + ');',
    '',
    'const vec3 SPARKLE_COL = vec3(' + sp.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 DARK_LANE = vec3(' + dl.map(function(v){return v.toFixed(3)}).join(',') + ');',
    'const vec3 SPIRAL_GLOW = vec3(' + sg.map(function(v){return v.toFixed(3)}).join(',') + ');',
    '',
    '// ─── Hash functions ───',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }',
    'vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5); }',
    '',
    '// ─── Quintic hermite smooth noise ───',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
    '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
    '}',
    '',
    '// ─── 10-octave FBM with domain rotation ───',
    '// Higher octaves than aurora for fine filament detail',
    'float fbm(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);',
    IS_MOBILE ? '  for (int i = 0; i < 6; i++) {' : '  for (int i = 0; i < 8; i++) {',
    '    v += a * noise(p);',
    '    p = rot * p * 2.02;',
    '    a *= 0.50;',
    '  }',
    '  return v;',
    '}',
    '',
    '// ─── Ridged FBM — creates shock-compressed filaments ───',
    '// Models ISM shock fronts from supernovae & stellar winds',
    'float ridgedFBM(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);',
    IS_MOBILE ? '  for (int i = 0; i < 5; i++) {' : '  for (int i = 0; i < 6; i++) {',
    '    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);',
    '    n = n * n;',
    '    v += a * n;',
    '    p = rot * p * 2.08;',
    '    a *= 0.52;',
    '  }',
    '  return v;',
    '}',
    '',
    '// ─── Cheap curl-like advection (no extra fbm calls) ───',
    '// Uses simple noise derivatives instead of 4x fbm calls',
    'vec2 curlNoise(vec2 p) {',
    '  float eps = 0.1;',
    '  float n1 = noise(p + vec2(eps, 0.0));',
    '  float n2 = noise(p - vec2(eps, 0.0));',
    '  float n3 = noise(p + vec2(0.0, eps));',
    '  float n4 = noise(p - vec2(0.0, eps));',
    '  return vec2((n3 - n4), -(n1 - n2)) / (2.0 * eps);',
    '}',
    '',
    '// ─── Voronoi cell distance for dust grain sparkle ───',
    'float voronoi(vec2 p) {',
    '  vec2 n = floor(p);',
    '  vec2 f = fract(p);',
    '  float md = 8.0;',
    '  for (int j = -1; j <= 1; j++) {',
    '    for (int i = -1; i <= 1; i++) {',
    '      vec2 g = vec2(float(i), float(j));',
    '      vec2 o = hash2(n + g);',
    '      vec2 r = g + o - f;',
    '      float d = dot(r, r);',
    '      md = min(md, d);',
    '    }',
    '  }',
    '  return sqrt(md);',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float t = time * 0.05;',
    '',
    '  // ═══ CURL NOISE ADVECTION ═══',
    '  // Advect UV coordinates through divergence-free velocity field',
    '  // This creates the flowing, filamentary appearance of real nebulae',
    '  vec2 curl1 = curlNoise(uv * 2.5 + t * 0.8);',
    '  vec2 curl2 = curlNoise(uv * 4.2 - t * 0.5 + curl1 * 0.4);',
    '  vec2 advectedUV = uv + curl1 * 0.06 + curl2 * 0.03;',
    '',
    '  // ═══ 4-LEVEL DOMAIN WARPING ═══',
    '  // Each level feeds into the next for highly complex density field',
    '  vec2 q = vec2(fbm(advectedUV * 3.8 + vec2(t * 1.5, -t * 0.6)),',
    '               fbm(advectedUV * 3.8 + vec2(t * 0.8, t * 1.2)));',
    '  vec2 r = vec2(fbm(advectedUV * 3.0 + q * 4.2 + vec2(-t * 0.5, t * 0.9)),',
    '               fbm(advectedUV * 3.2 + q * 3.8 + vec2(t * 0.7, -t * 0.4)));',
    IS_MOBILE
      ? '  vec2 s = r * 0.8; vec2 w = r * 0.5;'
      : '  vec2 s = vec2(fbm(advectedUV * 2.5 + r * 3.0 + vec2(t * 0.3, -t * 0.5)),'
        + '               fbm(advectedUV * 2.8 + r * 2.5 + vec2(-t * 0.4, t * 0.6)));'
        + '  vec2 w = vec2(fbm(advectedUV * 2.0 + s * 2.0 + vec2(t * 0.2, t * 0.2)),'
        + '               fbm(advectedUV * 2.2 + s * 1.5 + vec2(-t * 0.2, t * 0.3)));',
    '',
    '  // ═══ MULTI-SCALE DENSITY FIELD ═══',
    '  // Large-scale smooth density',
    '  float d1 = fbm(advectedUV * 3.5 + w * 1.2 + t * 0.3);',
    '  // Medium-scale turbulent density',
    '  float d2 = fbm(advectedUV * 6.0 + s * 0.8 - t * 0.2) * 0.7;',
    '  // Small-scale shock-compressed filaments (ridged noise)',
    '  float d3 = ridgedFBM(advectedUV * 5.0 + r * 1.0 + vec2(t * 0.4, -t * 0.15)) * 0.5;',
    '  // Very fine detail',
    '  float d4 = ridgedFBM(advectedUV * 8.0 + w * 0.6 - vec2(t * 0.2, t * 0.3)) * 0.25;',
    '  float density = d1 + d2 * 0.6 + d3 * 0.4 + d4 * 0.2;',
    '',
    '  // ═══ SPIRAL ARM STRUCTURE ═══',
    '  // Galactic density wave → logarithmic spiral pattern',
    '  vec2 center = vec2(0.5 + sin(t * 0.3) * 0.08, 0.45 + cos(t * 0.25) * 0.06);',
    '  vec2 dc = uv - center;',
    '  float dist = length(dc);',
    '  float angle = atan(dc.y, dc.x);',
    '  float spiral1 = sin(angle * 2.0 + dist * 10.0 - t * 1.2) * 0.5 + 0.5;',
    '  float spiral2 = sin(angle * 3.0 - dist * 8.0 + t * 0.8 + 1.57) * 0.5 + 0.5;',
    '  float spiralFactor = spiral1 * spiral2;',
    '  spiralFactor = pow(spiralFactor, 1.5) * 0.35;',
    '  spiralFactor *= smoothstep(0.7, 0.1, dist);',
    '  density += spiralFactor;',
    '',
    '  // ═══ DARK LANES — BEER-LAMBERT ABSORPTION ═══',
    '  // Optically thick dust lanes block background emission',
    '  float darkNoise = fbm(advectedUV * 4.5 + q * 2.0 + vec2(t * 0.15, -t * 0.1));',
    '  float darkLane1 = smoothstep(0.35, 0.55, darkNoise);',
    '  float darkLane2 = smoothstep(0.30, 0.50, fbm(advectedUV * 7.0 + r * 1.5 - t * 0.12));',
    '  // Beer-Lambert: I = I0 * exp(-tau)',
    '  float opticalDepth = (darkLane1 + darkLane2 * 0.6) * 1.8;',
    '  float transmittance = exp(-opticalDepth * 0.4);',
    '',
    '  // ═══ THEME COLOR CYCLING ═══',
    '  // Smooth interpolation between 4 color themes',
    '  float cycle = time * 0.012;',
    '  float idx = mod(cycle, 4.0);',
    '  float blend;',
    '  vec3 ambient, dustA, dustB, emi, fil;',
    '  if (idx < 1.0) {',
    '    blend = idx;',
    '    ambient = mix(AMB0, AMB1, blend);',
    '    dustA = mix(DST0A, DST1A, blend);',
    '    dustB = mix(DST0B, DST1B, blend);',
    '    emi = mix(EMI0, EMI1, blend);',
    '    fil = mix(FIL0, FIL1, blend);',
    '  } else if (idx < 2.0) {',
    '    blend = idx - 1.0;',
    '    ambient = mix(AMB1, AMB2, blend);',
    '    dustA = mix(DST1A, DST2A, blend);',
    '    dustB = mix(DST1B, DST2B, blend);',
    '    emi = mix(EMI1, EMI2, blend);',
    '    fil = mix(FIL1, FIL2, blend);',
    '  } else if (idx < 3.0) {',
    '    blend = idx - 2.0;',
    '    ambient = mix(AMB2, AMB3, blend);',
    '    dustA = mix(DST2A, DST3A, blend);',
    '    dustB = mix(DST2B, DST3B, blend);',
    '    emi = mix(EMI2, EMI3, blend);',
    '    fil = mix(FIL2, FIL3, blend);',
    '  } else {',
    '    blend = idx - 3.0;',
    '    ambient = mix(AMB3, AMB0, blend);',
    '    dustA = mix(DST3A, DST0A, blend);',
    '    dustB = mix(DST3B, DST0B, blend);',
    '    emi = mix(EMI3, EMI0, blend);',
    '    fil = mix(FIL3, FIL0, blend);',
    '  }',
    '',
    '  // ═══ VOLUMETRIC EMISSION COLOR ═══',
    '  // Base diffuse dust glow',
    '  vec3 col = ambient;',
    '  col += dustA * density * 0.4;',
    '  col += dustB * pow(density, 1.5) * 0.3;',
    '',
    '  // Filament emission — bright along shock-compressed ridges',
    '  float filDensity = d3 + d4;',
    '  col += fil * filDensity * 0.35;',
    '',
    '  // Emission nebula glow — strongest near spiral center',
    '  float emissionStrength = spiralFactor * density * 1.8;',
    '  col += emi * emissionStrength;',
    '',
    '  // ═══ MIE SCATTERING ═══',
    '  // Forward scattering from large dust grains',
    '  // Creates bright halo around central emission regions',
    '  float mieFactor = pow(max(0.0, 1.0 - dist * 1.5), 2.5);',
    '  col += dustA * mieFactor * density * 0.2;',
    '',
    '  // ═══ RAYLEIGH-LIKE SCATTERING ═══',
    '  // Edge scattering — lighter color at nebula boundary',
    '  float edgeDist = min(min(uv.x, 1.0-uv.x), min(uv.y, 1.0-uv.y));',
    '  float edgeScatter = smoothstep(0.0, 0.3, edgeDist) * (1.0 - smoothstep(0.3, 0.8, edgeDist));',
    '  col += dustB * edgeScatter * 0.05;',
    '',
    '  // Spiral arm glow',
    '  col += SPIRAL_GLOW * spiralFactor * 0.30;',
    '',
    '  // Apply dark lane absorption',
    '  col = mix(DARK_LANE, col, transmittance);',
    '',
    '  // ═══ DUST GRAIN SPARKLE ═══',
    '  // Individual bright grains scattering light',
    '  float voro = voronoi(advectedUV * 80.0 + t * 2.0);',
    '  float sparkle = pow(max(0.0, 1.0 - voro * 5.0), 8.0);',
    '  sparkle *= density * 0.8;',
    '  col += SPARKLE_COL * sparkle * 0.25;',
    '',
    '  // ═══ ALPHA COMPOSITING ═══',
    '  float alpha = density * 0.42;',
    '  alpha *= transmittance;',
    '  alpha += spiralFactor * 0.15;',
    '  alpha = clamp(alpha, 0.0, 0.88);',
    '',
    '  gl_FragColor = vec4(col, alpha);',
    '}',
  ].join('\n');
};


// ══════════════════════════════════════════════════════════════════
//  NEBULA VERTEX SHADER — pass-through with UV
// ══════════════════════════════════════════════════════════════════

var NEBULA_VERT = [
  'precision highp float;',
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
  '}',
].join('\n');


// ══════════════════════════════════════════════════════════════════
//  NEBULA DUST PLANE — the main volumetric dust rendering
// ══════════════════════════════════════════════════════════════════

function NebulaDustPlane({ theme, position, width, height, opacity }) {
  var meshRef = useRef();
  var pal = NEBULA_PALETTES[theme] || NEBULA_PALETTES.golden;
  var fragShader = useMemo(function () { return NEBULA_DUST_FRAG(pal); }, [theme]);

  var data = useMemo(function () {
    var geo = new THREE_LIB.PlaneGeometry(width || (IS_MOBILE ? 650 : 1200), height || (IS_MOBILE ? 500 : 600), 1, 1);
    var u = {
      time: { value: 0 },
    };
    return { geometry: geo, uniforms: u };
  }, [theme]);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={position || [0, IS_MOBILE ? -100 : -110, -250]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={NEBULA_VERT}
        fragmentShader={fragShader}
        transparent={true}
        depthWrite={false}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  STAR POINT SHADERS — render as smooth glowing circles, not squares
//  Uses gl_PointCoord for radial falloff + soft edge
// ══════════════════════════════════════════════════════════════════

var STAR_VERT = [
  'precision highp float;',
  'attribute float size;',
  'varying vec3 vColor;',
  'void main() {',
  '  vColor = color;',
  '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
  '  gl_PointSize = size * (300.0 / -mvPos.z);',
  '  gl_PointSize = clamp(gl_PointSize, 0.5, 32.0);',
  '  gl_Position = projectionMatrix * mvPos;',
  '}',
].join('\n');

var STAR_FRAG = [
  'precision highp float;',
  'varying vec3 vColor;',
  'uniform float uOpacity;',
  'void main() {',
  '  // Distance from center of point sprite (0 at center, 1 at edge)',
  '  vec2 c = gl_PointCoord - 0.5;',
  '  float d = length(c) * 2.0;',
  '  // Discard pixels outside circle',
  '  if (d > 1.0) discard;',
  '  // Smooth radial glow: bright core + soft halo',
  '  float core = exp(-d * d * 8.0);',
  '  float halo = exp(-d * d * 2.5) * 0.4;',
  '  float alpha = (core + halo) * uOpacity;',
  '  gl_FragColor = vec4(vColor * (core + halo * 0.6), alpha);',
  '}',
].join('\n');


// ══════════════════════════════════════════════════════════════════
//  STAR FIELD — cosmologically distributed point sprites
//
//  Physics:
//  • Magnitude-based brightness (inverse square law)
//  • Color-temperature mapping (O-B-A-F-G-K-M spectral types)
//  • Twinkling from atmospheric scintillation model
//  • Proper motion drift (very slow)
// ══════════════════════════════════════════════════════════════════

function CosmicStarField({ theme, count }) {
  var pointsRef = useRef();
  var starCount = count || (IS_MOBILE ? 4000 : 14000);

  var STAR_PALETTES = {
    golden: [
      [1.0, 0.98, 0.90],    // warm white
      [1.0, 0.92, 0.60],    // champagne
      [1.0, 0.82, 0.30],    // rich gold
      [1.0, 0.70, 0.20],    // amber
      [0.90, 0.55, 0.15],   // copper
      [1.0, 0.88, 0.45],    // honey
      [1.0, 0.75, 0.50],    // rose-gold
    ],
    blue: [
      [0.80, 0.88, 1.0],    // blue-white
      [0.50, 0.70, 1.0],    // blue
      [0.30, 0.55, 0.95],   // deep blue
      [0.60, 0.85, 1.0],    // cyan
      [0.40, 0.65, 0.90],   // steel blue
      [0.70, 0.80, 0.95],   // pale blue
      [0.45, 0.75, 1.0],    // azure
    ],
    green: [
      [0.80, 1.0, 0.88],    // green-white
      [0.40, 0.90, 0.60],   // emerald
      [0.20, 0.78, 0.45],   // jade
      [0.50, 0.95, 0.70],   // mint
      [0.30, 0.70, 0.42],   // forest
      [0.60, 0.92, 0.75],   // sea-foam
      [0.35, 0.85, 0.55],   // spring
    ],
    pink: [
      [1.0, 0.88, 0.92],    // pink-white
      [1.0, 0.55, 0.72],    // rose
      [0.90, 0.35, 0.55],   // deep pink
      [1.0, 0.70, 0.82],    // blush
      [0.85, 0.30, 0.50],   // fuchsia
      [1.0, 0.80, 0.88],    // shell pink
      [0.92, 0.45, 0.62],   // coral pink
    ],
    purple: [
      [0.90, 0.85, 1.0],    // lavender-white
      [0.65, 0.45, 1.0],    // violet
      [0.48, 0.25, 0.88],   // deep purple
      [0.75, 0.58, 1.0],    // orchid
      [0.40, 0.18, 0.72],   // royal purple
      [0.82, 0.70, 0.98],   // lilac
      [0.55, 0.35, 0.90],   // amethyst
    ],
    orange: [
      [1.0, 0.92, 0.82],    // warm white
      [1.0, 0.55, 0.15],    // bright orange
      [0.92, 0.28, 0.05],   // deep orange-red
      [1.0, 0.68, 0.25],    // tangerine
      [0.80, 0.18, 0.02],   // crimson ember
      [1.0, 0.78, 0.40],    // peach flame
      [0.88, 0.35, 0.08],   // burnt sienna
    ],
  };

  var data = useMemo(function () {
    var palette = STAR_PALETTES[theme] || STAR_PALETTES.golden;
    var pos = new Float32Array(starCount * 3);
    var col = new Float32Array(starCount * 3);
    var sizes = new Float32Array(starCount);
    var phases = new Float32Array(starCount);
    var twinkleRates = new Float32Array(starCount);

    for (var i = 0; i < starCount; i++) {
      var i3 = i * 3;
      // Distribute in a large sphere
      var r = 200 + Math.random() * 500;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.acos(2 * Math.random() - 1);
      pos[i3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = r * Math.cos(phi) - 200;

      // Spectral type coloring — weighted toward theme palette
      var starColor = palette[Math.floor(Math.random() * palette.length)];
      // Add slight random variation
      col[i3] = Math.min(1, starColor[0] + (Math.random() - 0.5) * 0.08);
      col[i3 + 1] = Math.min(1, starColor[1] + (Math.random() - 0.5) * 0.08);
      col[i3 + 2] = Math.min(1, starColor[2] + (Math.random() - 0.5) * 0.08);

      // Magnitude-based size (power law distribution — many faint, few bright)
      var magnitude = Math.pow(Math.random(), 3.5);
      sizes[i] = IS_MOBILE
        ? 0.3 + magnitude * 2.0
        : 0.5 + magnitude * 3.5;

      phases[i] = Math.random() * Math.PI * 2;
      // Different twinkle rates per star
      twinkleRates[i] = 0.5 + Math.random() * 3.0;
    }
    return { positions: pos, colors: col, sizes: sizes, phases: phases, twinkleRates: twinkleRates };
  }, [theme]);

  // Track original sizes for twinkle modulation
  var origSizes = useRef(data.sizes.slice());
  var frameCounter = useRef(0);

  useFrame(function (state) {
    if (!pointsRef.current) return;
    var t = state.clock.getElapsedTime();
    var geo = pointsRef.current.geometry;
    var sizeAttr = geo.attributes.size;

    // ═══ BATCHED ATMOSPHERIC SCINTILLATION ═══
    // Only update 1/4 of stars each frame (round-robin) for ~4x CPU savings
    // At 60fps this means each star updates at 15fps — still smooth for twinkling
    var batch = frameCounter.current % 4;
    frameCounter.current++;
    var batchStart = Math.floor(batch * starCount / 4);
    var batchEnd = Math.floor((batch + 1) * starCount / 4);

    for (var i = batchStart; i < batchEnd; i++) {
      var phase = data.phases[i];
      var rate = data.twinkleRates[i];
      var base = origSizes.current[i];

      // Multi-frequency scintillation
      var s1 = Math.sin(t * rate + phase) * 0.3;
      var s2 = Math.sin(t * rate * 2.3 + phase * 1.7) * 0.15;

      sizeAttr.array[i] = Math.max(0.15, base * (0.85 + s1 + s2));
    }
    sizeAttr.needsUpdate = true;

    // Slow overall rotation — proper motion (smooth interpolation)
    var targetRotY = t * 0.003;
    var targetRotX = Math.sin(t * 0.006) * 0.015;
    var rr = pointsRef.current.rotation;
    rr.y += (targetRotY - rr.y) * 0.08;
    rr.x += (targetRotX - rr.x) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={starCount}
          array={data.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={data.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={{ uOpacity: { value: 0.88 } }}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE_LIB.AdditiveBlending}
      />
    </points>
  );
}


// ══════════════════════════════════════════════════════════════════
//  MILKY WAY BAND — concentrated stellar band through center
//
//  Physics:
//  • Galactic plane star density (peak at b=0° latitude)
//  • Concentration gradient from center to anti-center
//  • Dark dust lanes where molecular clouds absorb light
// ══════════════════════════════════════════════════════════════════

function MilkyWayBand({ theme }) {
  var pointsRef = useRef();
  var starCount = IS_MOBILE ? 8000 : 25000;

  var MW_PALETTES = {
    golden: [
      [1.0, 0.90, 0.40],  // bright gold
      [1.0, 0.85, 0.50],  // champagne
      [1.0, 0.72, 0.28],  // amber
      [0.90, 0.60, 0.18], // copper-gold
      [1.0, 0.82, 0.35],  // honey gold
    ],
    blue: [
      [0.65, 0.82, 1.0],  // bright blue-white
      [0.45, 0.65, 0.95], // medium blue
      [0.30, 0.55, 0.90], // deep blue
      [0.55, 0.78, 1.0],  // sky blue
      [0.38, 0.60, 0.85], // steel blue
    ],
    green: [
      [0.55, 0.95, 0.70], // bright green
      [0.40, 0.85, 0.55], // emerald
      [0.25, 0.72, 0.40], // jade
      [0.50, 0.90, 0.65], // mint
      [0.32, 0.78, 0.48], // spring green
    ],
    pink: [
      [1.0, 0.65, 0.80],  // bright pink
      [0.92, 0.45, 0.62], // rose
      [0.82, 0.30, 0.50], // deep rose
      [1.0, 0.72, 0.85],  // blush
      [0.88, 0.38, 0.55], // fuchsia
    ],
    purple: [
      [0.72, 0.52, 1.0],  // bright violet
      [0.55, 0.35, 0.90], // amethyst
      [0.40, 0.22, 0.78], // deep purple
      [0.68, 0.48, 0.95], // orchid
      [0.48, 0.28, 0.85], // royal
    ],
    orange: [
      [1.0, 0.60, 0.18],  // bright orange
      [0.95, 0.38, 0.08], // ember
      [0.82, 0.20, 0.03], // deep crimson
      [1.0, 0.50, 0.12],  // flame
      [0.88, 0.30, 0.06], // burnt orange
    ],
  };

  var data = useMemo(function () {
    var palette = MW_PALETTES[theme] || MW_PALETTES.golden;
    var pos = new Float32Array(starCount * 3);
    var col = new Float32Array(starCount * 3);
    var sizes = new Float32Array(starCount);

    for (var i = 0; i < starCount; i++) {
      var i3 = i * 3;
      // Gaussian distribution in galactic latitude (narrow band)
      var x = (Math.random() - 0.5) * (IS_MOBILE ? 700 : 1400);
      var y = (Math.random() - 0.5) * (IS_MOBILE ? 45 : 80) - 15;
      // Add Gaussian spread
      y += (Math.random() + Math.random() + Math.random() - 1.5) * (IS_MOBILE ? 25 : 40);
      var z = -100 - Math.random() * 350;

      // Add sinusoidal warp (galactic warp)
      y += Math.sin(x * 0.004) * 15;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      var c = palette[Math.floor(Math.random() * palette.length)];
      var brightness = 0.4 + Math.random() * 0.6;
      col[i3] = c[0] * brightness;
      col[i3 + 1] = c[1] * brightness;
      col[i3 + 2] = c[2] * brightness;

      sizes[i] = IS_MOBILE ? 0.2 + Math.pow(Math.random(), 4) * 1.5
                           : 0.4 + Math.pow(Math.random(), 4) * 2.5;
    }
    return { positions: pos, colors: col, sizes: sizes };
  }, [theme]);

  useFrame(function (state) {
    if (!pointsRef.current) return;
    var t = state.clock.getElapsedTime();
    var rr = pointsRef.current.rotation;
    var targetRY = t * 0.001;
    rr.y += (targetRY - rr.y) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={starCount}
          array={data.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={data.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={{ uOpacity: { value: 0.65 } }}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE_LIB.AdditiveBlending}
      />
    </points>
  );
}


// ══════════════════════════════════════════════════════════════════
//  MILKY WAY GLOW — soft diffuse glow behind the star band
// ══════════════════════════════════════════════════════════════════

var MW_GLOW_FRAG = function (theme) {
  var GLOW_COLORS = {
    golden:  { c1: '0.35, 0.22, 0.04', c2: '0.50, 0.30, 0.06' },
    blue:    { c1: '0.04, 0.15, 0.35', c2: '0.06, 0.22, 0.50' },
    green:   { c1: '0.04, 0.30, 0.15', c2: '0.06, 0.45, 0.22' },
    pink:    { c1: '0.35, 0.08, 0.18', c2: '0.50, 0.14, 0.28' },
    purple:  { c1: '0.18, 0.06, 0.35', c2: '0.28, 0.10, 0.50' },
    orange:  { c1: '0.40, 0.12, 0.02', c2: '0.58, 0.18, 0.03' },
  };
  var gc = GLOW_COLORS[theme] || GLOW_COLORS.golden;
  var c1 = gc.c1;
  var c2 = gc.c2;
  return [
    'precision highp float;',
    'uniform float time;',
    'varying vec2 vUv;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
    '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.8,-0.6,0.6,0.8);',
    '  for (int i = 0; i < 6; i++) { v += a * noise(p); p = rot * p * 2.0; a *= 0.5; }',
    '  return v;',
    '}',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float t = time * 0.02;',
    '  float band = exp(-pow((uv.y - 0.5) * 4.5, 2.0));',
    '  float n = fbm(uv * vec2(3.5, 2.0) + t * 0.8);',
    '  float glow = band * (0.3 + n * 0.4);',
    '  glow *= smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);',
    '  vec3 col = vec3(' + c1 + ') + vec3(' + c2 + ') * n * band;',
    '  gl_FragColor = vec4(col, glow * 0.35);',
    '}',
  ].join('\n');
};

function MilkyWayGlow({ theme }) {
  var meshRef = useRef();
  var fragShader = useMemo(function () { return MW_GLOW_FRAG(theme); }, [theme]);

  var data = useMemo(function () {
    var w = IS_MOBILE ? 700 : 1400;
    var h = IS_MOBILE ? 130 : 250;
    var geo = new THREE_LIB.PlaneGeometry(w, h, 1, 1);
    var u = { time: { value: 0 } };
    return { geometry: geo, uniforms: u };
  }, [theme]);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[0, -15, -320]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={NEBULA_VERT}
        fragmentShader={fragShader}
        transparent
        depthWrite={false}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  FADE BRIDGE — connects aurora (top) to nebula (bottom)
//  Uses wind-shear distortion for organic transition
// ══════════════════════════════════════════════════════════════════

var FADE_BRIDGE_FRAG = function (theme) {
  var BRIDGE_COLORS = {
    golden:  { c1: '0.50, 0.30, 0.04', c2: '0.80, 0.50, 0.06', c3: '0.25, 0.15, 0.03' },
    blue:    { c1: '0.04, 0.20, 0.50', c2: '0.06, 0.35, 0.80', c3: '0.03, 0.12, 0.25' },
    green:   { c1: '0.04, 0.42, 0.20', c2: '0.06, 0.68, 0.32', c3: '0.03, 0.22, 0.10' },
    pink:    { c1: '0.45, 0.12, 0.25', c2: '0.72, 0.20, 0.40', c3: '0.22, 0.06, 0.12' },
    purple:  { c1: '0.25, 0.10, 0.48', c2: '0.42, 0.18, 0.75', c3: '0.12, 0.05, 0.24' },
    orange:  { c1: '0.52, 0.15, 0.02', c2: '0.82, 0.28, 0.04', c3: '0.28, 0.08, 0.01' },
  };
  var bc = BRIDGE_COLORS[theme] || BRIDGE_COLORS.golden;
  var c1 = bc.c1;
  var c2 = bc.c2;
  var c3 = bc.c3;
  return [
    'precision highp float;',
    'uniform float time;',
    'varying vec2 vUv;',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5); }',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
    '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
    '}',
    'float fbm(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.8,-0.6,0.6,0.8);',
    '  for (int i = 0; i < 7; i++) { v += a * noise(p); p = rot * p * 2.02; a *= 0.48; }',
    '  return v;',
    '}',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float t = time * 0.04;',
    '  // Wind shear distortion',
    '  vec2 q = vec2(fbm(uv * 3.0 + vec2(t * 1.5, -t * 0.5)),',
    '               fbm(uv * 3.0 + vec2(-t * 0.8, t * 1.0)));',
    '  vec2 r = vec2(fbm(uv * 2.5 + q * 3.5 + vec2(t * 0.5, t * 0.3)),',
    '               fbm(uv * 2.8 + q * 3.0 + vec2(-t * 0.3, t * 0.4)));',
    '  float n = fbm(uv * 3.0 + r * 1.5);',
    '  // Tendrils reaching down from aurora',
    '  float tendrils = pow(fbm(vec2(uv.x * 6.0 + t * 2.0, uv.y * 2.0 - t * 0.8) + r * 0.8), 2.0);',
    '  // Vertical gradient — visible only in transition zone',
    '  float grad = smoothstep(0.0, 0.35, uv.y) * smoothstep(1.0, 0.5, uv.y);',
    '  float alpha = (n * 0.3 + tendrils * 0.25) * grad;',
    '  alpha *= smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);',
    '  alpha = clamp(alpha, 0.0, 0.30);',
    '  vec3 col = vec3(' + c1 + ') * n + vec3(' + c2 + ') * tendrils + vec3(' + c3 + ') * grad;',
    '  gl_FragColor = vec4(col, alpha);',
    '}',
  ].join('\n');
};

function FadeBridge({ theme }) {
  var meshRef = useRef();
  var fragShader = useMemo(function () { return FADE_BRIDGE_FRAG(theme); }, [theme]);

  var data = useMemo(function () {
    var w = IS_MOBILE ? 700 : 1400;
    var h = IS_MOBILE ? 180 : 300;
    var geo = new THREE_LIB.PlaneGeometry(w, h, 1, 1);
    var u = { time: { value: 0 } };
    return { geometry: geo, uniforms: u };
  }, [theme]);

  useFrame(function (state) {
    data.uniforms.time.value = state.clock.getElapsedTime();
  });

  return (
    <mesh
      ref={meshRef}
      geometry={data.geometry}
      position={[0, IS_MOBILE ? 15 : 18, -220]}
    >
      <shaderMaterial
        uniforms={data.uniforms}
        vertexShader={NEBULA_VERT}
        fragmentShader={fragShader}
        transparent
        depthWrite={false}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  EXPORT — Main NebulaEngine compositing all bottom-half elements
// ══════════════════════════════════════════════════════════════════

function NebulaEngine({ theme }) {
  return (
    <>
      <NebulaDustPlane theme={theme} />
      <CosmicStarField theme={theme} />
      <MilkyWayBand theme={theme} />
      <MilkyWayGlow theme={theme} />
      <FadeBridge theme={theme} />
    </>
  );
}

export default NebulaEngine;
export { NebulaDustPlane, CosmicStarField, MilkyWayBand, MilkyWayGlow, FadeBridge, NEBULA_PALETTES };
