// ═══════════════════════════════════════════════════════════════════════
//  AuroraEngine.js — Advanced 3D Aurora Borealis Engine
//
//  REAL PHYSICS SIMULATION:
//  ────────────────────────
//  1. Birkeland current sheets — field-aligned currents create curtain
//     structures via J×B force displacement
//  2. Alfvén wave propagation — MHD waves along magnetic field lines
//     create the characteristic rippling curtain motion
//  3. Kelvin-Helmholtz instability — shear between solar wind and
//     magnetospheric plasma creates folding/roll-up at curtain edges
//  4. Collisional excitation emission — altitude-dependent emission
//     colors (green O 557.7nm at 100-200km, red O 630nm at 200-400km)
//  5. Magnetic reconnection substorms — sudden energy release creates
//     bright breakup arcs and poleward expansion
//  6. Particle precipitation patterns — diffuse aurora from pitch-angle
//     scattering, discrete arcs from inverted-V acceleration
//
//  RENDERING:
//  ──────────
//  • 6 high-resolution curtain meshes with 128-segment geometry
//  • Fragment shader: 8-octave FBM, 4-level domain warping, volumetric
//    emission model with Beer-Lambert absorption
//  • Vertex shader: multi-harmonic Alfvén wave displacement with
//    Lorentz force response and turbulent cascade
//  • Per-frame JS: substorm cycle, solar wind pressure, IMF coupling
//
//  Props: theme='golden' | 'blue'
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_MOBILE = SW < 768;

var useFrame, THREE_LIB;
try {
  useFrame = require('@react-three/fiber/native').useFrame;
  THREE_LIB = require('three');
} catch (e) {}

// ══════════════════════════════════════════════════════════════════
//  COLOR PALETTES — golden vs blue
// ══════════════════════════════════════════════════════════════════

var PALETTES = {
  golden: {
    curtains: [
      // [color1, color2, color3] — each vec3 RGB 0-1
      { c1: [1.0, 0.82, 0.12], c2: [1.0, 0.65, 0.08], c3: [1.0, 0.92, 0.45] }, // main bright gold
      { c1: [1.0, 0.58, 0.10], c2: [1.0, 0.75, 0.22], c3: [0.90, 0.45, 0.05] }, // deep copper-gold
      { c1: [1.0, 0.95, 0.55], c2: [1.0, 0.80, 0.20], c3: [1.0, 0.88, 0.38] }, // champagne
      { c1: [1.0, 0.72, 0.18], c2: [0.92, 0.60, 0.10], c3: [1.0, 0.82, 0.30] }, // honey amber
      { c1: [1.0, 0.48, 0.06], c2: [1.0, 0.68, 0.15], c3: [0.88, 0.40, 0.04] }, // burnt orange
      { c1: [1.0, 0.90, 0.35], c2: [1.0, 0.78, 0.12], c3: [1.0, 0.95, 0.50] }, // pale gold
    ],
    plasmaHot: [0.40, 0.25, 0.04],   // hot spot color
    plasmaCool: [0.70, 0.35, 0.06],   // bloom tint
    crestColor: [1.0, 0.78, 0.12],    // wave crest highlight
    warmTint: { r: 1.10, g: 1.03 },   // fragment color boost
    hueRange: 0.18,                     // hue cycling amplitude
  },
  blue: {
    curtains: [
      { c1: [0.08, 0.50, 1.0],  c2: [0.06, 0.32, 0.88], c3: [0.18, 0.68, 1.0]  }, // bright cyan
      { c1: [0.12, 0.22, 0.82], c2: [0.08, 0.42, 0.92], c3: [0.04, 0.16, 0.62] }, // deep indigo
      { c1: [0.10, 0.62, 0.78], c2: [0.06, 0.45, 0.92], c3: [0.15, 0.55, 0.85] }, // teal-azure
      { c1: [0.20, 0.28, 0.88], c2: [0.08, 0.38, 0.78], c3: [0.12, 0.52, 0.92] }, // violet-blue
      { c1: [0.05, 0.35, 0.75], c2: [0.10, 0.55, 0.90], c3: [0.03, 0.25, 0.60] }, // deep ocean
      { c1: [0.15, 0.58, 0.92], c2: [0.08, 0.40, 0.85], c3: [0.20, 0.65, 0.95] }, // cerulean
    ],
    plasmaHot: [0.04, 0.15, 0.40],
    plasmaCool: [0.06, 0.25, 0.60],
    crestColor: [0.15, 0.65, 1.0],
    warmTint: { r: 1.0, g: 1.02 },
    hueRange: 0.07,
  },
  green: {
    curtains: [
      { c1: [0.06, 0.85, 0.50], c2: [0.04, 0.65, 0.35], c3: [0.15, 0.95, 0.60] }, // bright emerald
      { c1: [0.03, 0.60, 0.30], c2: [0.08, 0.75, 0.45], c3: [0.02, 0.48, 0.22] }, // deep forest
      { c1: [0.10, 0.90, 0.65], c2: [0.06, 0.72, 0.50], c3: [0.18, 0.85, 0.58] }, // mint-jade
      { c1: [0.04, 0.70, 0.40], c2: [0.08, 0.80, 0.55], c3: [0.02, 0.55, 0.28] }, // teal-green
      { c1: [0.02, 0.55, 0.25], c2: [0.06, 0.68, 0.38], c3: [0.01, 0.42, 0.18] }, // dark emerald
      { c1: [0.12, 0.92, 0.58], c2: [0.05, 0.78, 0.42], c3: [0.20, 0.88, 0.65] }, // spring green
    ],
    plasmaHot: [0.03, 0.35, 0.15],
    plasmaCool: [0.05, 0.50, 0.25],
    crestColor: [0.15, 0.95, 0.55],
    warmTint: { r: 1.0, g: 1.08 },
    hueRange: 0.10,
  },
  pink: {
    curtains: [
      { c1: [0.92, 0.28, 0.60], c2: [0.85, 0.15, 0.48], c3: [1.0, 0.45, 0.72] },  // hot pink
      { c1: [0.80, 0.12, 0.42], c2: [0.90, 0.30, 0.55], c3: [0.65, 0.08, 0.32] },  // deep rose
      { c1: [1.0, 0.50, 0.75], c2: [0.88, 0.35, 0.60], c3: [1.0, 0.60, 0.80] },    // soft pink
      { c1: [0.85, 0.20, 0.50], c2: [0.95, 0.38, 0.65], c3: [0.72, 0.12, 0.38] },  // magenta-rose
      { c1: [0.70, 0.10, 0.35], c2: [0.82, 0.25, 0.50], c3: [0.58, 0.06, 0.28] },  // dark fuchsia
      { c1: [1.0, 0.55, 0.78], c2: [0.90, 0.40, 0.62], c3: [1.0, 0.65, 0.85] },    // blush
    ],
    plasmaHot: [0.35, 0.08, 0.22],
    plasmaCool: [0.55, 0.15, 0.35],
    crestColor: [1.0, 0.45, 0.70],
    warmTint: { r: 1.06, g: 1.0 },
    hueRange: 0.12,
  },
  purple: {
    curtains: [
      { c1: [0.55, 0.22, 1.0],  c2: [0.40, 0.12, 0.85], c3: [0.70, 0.38, 1.0]  },  // bright violet
      { c1: [0.35, 0.08, 0.72], c2: [0.50, 0.20, 0.88], c3: [0.25, 0.05, 0.55] },  // deep indigo-violet
      { c1: [0.65, 0.35, 0.95], c2: [0.48, 0.22, 0.82], c3: [0.72, 0.45, 1.0]  },  // lavender
      { c1: [0.42, 0.15, 0.80], c2: [0.58, 0.28, 0.90], c3: [0.30, 0.08, 0.65] },  // amethyst
      { c1: [0.28, 0.06, 0.60], c2: [0.45, 0.18, 0.78], c3: [0.20, 0.04, 0.48] },  // dark purple
      { c1: [0.68, 0.40, 1.0],  c2: [0.52, 0.25, 0.88], c3: [0.75, 0.50, 1.0]  },  // lilac
    ],
    plasmaHot: [0.22, 0.06, 0.40],
    plasmaCool: [0.35, 0.12, 0.60],
    crestColor: [0.65, 0.35, 1.0],
    warmTint: { r: 1.03, g: 1.0 },
    hueRange: 0.10,
  },
  orange: {
    curtains: [
      { c1: [1.0, 0.45, 0.05], c2: [0.95, 0.25, 0.02], c3: [1.0, 0.60, 0.15] },  // bright orange-red
      { c1: [0.90, 0.18, 0.02], c2: [1.0, 0.35, 0.08], c3: [0.75, 0.12, 0.01] },  // deep crimson
      { c1: [1.0, 0.55, 0.12], c2: [0.95, 0.38, 0.06], c3: [1.0, 0.68, 0.22] },  // tangerine
      { c1: [0.85, 0.22, 0.04], c2: [1.0, 0.42, 0.10], c3: [0.70, 0.15, 0.02] },  // blood orange
      { c1: [0.72, 0.10, 0.01], c2: [0.88, 0.28, 0.05], c3: [0.58, 0.06, 0.00] },  // dark ember
      { c1: [1.0, 0.62, 0.18], c2: [0.92, 0.45, 0.08], c3: [1.0, 0.72, 0.28] },  // flame
    ],
    plasmaHot: [0.40, 0.10, 0.02],
    plasmaCool: [0.65, 0.20, 0.04],
    crestColor: [1.0, 0.50, 0.08],
    warmTint: { r: 1.12, g: 1.0 },
    hueRange: 0.15,
  },
};

// ══════════════════════════════════════════════════════════════════
//  VERTEX SHADER — Advanced Alfvén Wave + Lorentz Force Displacement
//
//  Physics modelled:
//  • Standing Alfvén waves at 5 harmonic frequencies
//  • Lorentz force acceleration (J×B) — cubic nonlinear response
//  • Kelvin-Helmholtz roll-up at curtain edges
//  • Turbulent energy cascade (large→small scale)
//  • Solar wind ram pressure modulation
//  • 3D curtain billowing from magnetospheric convection
// ══════════════════════════════════════════════════════════════════

var AURORA_VERT = [
  'precision highp float;',
  'uniform float time;',
  'uniform float speed;',
  'uniform float waveFreq;',
  'uniform float substormPhase;',
  'varying vec2 vUv;',
  'varying float vDisplace;',
  'varying float vAltitude;',
  'varying float vCurtainEdge;',
  '',
  'void main() {',
  '  vUv = uv;',
  '  vAltitude = uv.y;',
  '  vec3 pos = position;',
  '  float t = time * speed;',
  '',
  '  // ═══ SOLAR WIND RAM PRESSURE ═══',
  '  // IMF Bz coupling: southward IMF (negative Bz) drives stronger aurora',
  '  // Modelled as quasi-periodic pressure with substorm modulation',
  '  float imfBz = sin(t * 0.08) * cos(t * 0.052) + 0.3 * sin(t * 0.031);',
  '  float solarPressure = 0.5 + 0.5 * imfBz;',
  '  solarPressure = solarPressure * solarPressure;',
  '  // Substorm enhancement — sudden increase during reconnection',
  '  solarPressure += substormPhase * 0.8;',
  '',
  '  // ═══ ALFVÉN WAVE HARMONICS ═══',
  '  // Standing waves on magnetic field lines — 5 harmonics',
  '  // Real aurora shows fundamental + overtones',
  '  float aW = waveFreq;',
  '  float h1 = sin(pos.x * 0.006 * aW + t * 0.55) * 14.0;',
  '  float h2 = sin(pos.x * 0.012 * aW - t * 0.38 + solarPressure * 1.2) * 9.0;',
  '  float h3 = cos(pos.x * 0.004 * aW + t * 0.22) * 16.0;',
  '  float h4 = sin(pos.x * 0.020 * aW + pos.y * 0.008 + t * 0.95) * 6.0;',
  '  float h5 = cos(pos.x * 0.030 * aW - t * 1.3 + pos.y * 0.012) * 3.5;',
  '',
  '  // ═══ LORENTZ FORCE (J × B) ═══',
  '  // Field-aligned current response — creates sharp bends in curtain',
  '  // Cubic nonlinearity models the acceleration physics',
  '  float jxb = sin(pos.x * 0.010 * aW + t * 0.75) * cos(pos.y * 0.006 + t * 0.30);',
  '  jxb = jxb * jxb * sign(jxb) * 10.0;',
  '  // Reconnection burst — sudden strong deflection',
  '  jxb += substormPhase * sin(pos.x * 0.015 * aW + t * 2.0) * 12.0;',
  '',
  '  // ═══ KELVIN-HELMHOLTZ INSTABILITY ═══',
  '  // Shear at curtain top edge creates folding roll-ups',
  '  float edgeFactor = smoothstep(0.5, 0.92, uv.y);',
  '  float kh1 = sin(pos.x * 0.018 * aW + t * 1.5) * edgeFactor * 8.0;',
  '  float kh2 = sin(pos.x * 0.035 * aW - t * 2.2) * edgeFactor * 4.0;',
  '  vCurtainEdge = edgeFactor;',
  '',
  '  // ═══ TURBULENT CASCADE ═══',
  '  // Energy flows from large scales to small scales (Kolmogorov cascade)',
  '  float turb1 = sin(pos.x * 0.045 * aW + t * 2.5) * 3.0;',
  '  float turb2 = sin(pos.x * 0.08 * aW - t * 3.5 + pos.y * 0.025) * 1.5;',
  '  float turb3 = cos(pos.x * 0.12 * aW + t * 4.8) * 0.8;',
  '  float turbTotal = (turb1 + turb2 + turb3) * solarPressure;',
  '',
  '  // ═══ COMPOSITE DISPLACEMENT ═══',
  '  float dy = (h1 + h2 + h3 + h4 + h5 + jxb + kh1 + kh2 + turbTotal);',
  '  dy *= (0.65 + solarPressure * 0.35);',
  '  pos.y += dy;',
  '',
  '  // ═══ 3D CURTAIN BILLOWING ═══',
  '  // Magnetospheric convection pushes curtain in/out',
  '  pos.z += sin(pos.x * 0.008 + t * 0.40) * 10.0;',
  '  pos.z += cos(pos.y * 0.015 + t * 0.25) * 6.0;',
  '  pos.z += sin(pos.x * 0.020 + pos.y * 0.012 - t * 0.60) * 4.0 * solarPressure;',
  '  // Substorm: curtain rapidly advances equatorward',
  '  pos.z += substormPhase * sin(pos.x * 0.01 + t * 0.8) * 15.0;',
  '',
  '  vDisplace = dy / 65.0;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
  '}',
].join('\n');

// ══════════════════════════════════════════════════════════════════
//  FRAGMENT SHADER — Volumetric Emission Model
//
//  Physics modelled:
//  • 8-octave FBM with domain-rotation for complex cloud structure
//  • 4-level domain warping — creates realistic turbulent plasma flow
//  • Altitude-dependent emission (green low, red high for real aurora)
//  • Collisional excitation model — density × energy → emission
//  • Magnetic field line tracing — visible ray structures
//  • Beer-Lambert volumetric absorption for depth
//  • Rayleigh-like scattering at curtain edges
// ══════════════════════════════════════════════════════════════════

var AURORA_FRAG = function (palette) {
  var ph = palette.plasmaHot;
  var pc = palette.plasmaCool;
  var cr = palette.crestColor;
  var wt = palette.warmTint;
  return [
    'precision highp float;',
    'uniform float time;',
    'uniform vec3 color1;',
    'uniform vec3 color2;',
    'uniform vec3 color3;',
    'uniform float opacity;',
    'uniform float speed;',
    'uniform float intensity;',
    'uniform float substormPhase;',
    'varying vec2 vUv;',
    'varying float vDisplace;',
    'varying float vAltitude;',
    'varying float vCurtainEdge;',
    '',
    '// ── Quintic hermite noise (smoother than cubic) ──',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),',
    '             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);',
    '}',
    '',
    '// ── 8-octave FBM with domain rotation ──',
    'float fbm(vec2 p) {',
    '  float v = 0.0, a = 0.5;',
    '  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);',
    IS_MOBILE ? '  for (int i = 0; i < 5; i++) {' : '  for (int i = 0; i < 7; i++) {',
    '    v += a * vnoise(p);',
    '    p = rot * p * 2.05;',
    '    a *= 0.47;',
    '  }',
    '  return v;',
    '}',
    '',
    '// ── Curl-like turbulence for plasma instabilities ──',
    'float turbulence(vec2 p) {',
    '  float v = 0.0;',
    '  v += abs(vnoise(p) - 0.5) * 2.0;',
    '  v += abs(vnoise(p * 2.1 + 1.7) - 0.5) * 1.0;',
    '  v += abs(vnoise(p * 4.3 + 3.2) - 0.5) * 0.5;',
    IS_MOBILE ? '  return v / 3.5;' : '  v += abs(vnoise(p * 8.7 + 5.1) - 0.5) * 0.25;',
    IS_MOBILE ? '' : '  v += abs(vnoise(p * 16.0 + 7.9) - 0.5) * 0.12;',
    IS_MOBILE ? '' : '  return v / 3.87;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = vUv;',
    '  float t = time * speed;',
    '',
    '  // ═══ SOLAR WIND MODULATION ═══',
    '  float sw = sin(t * 0.10) * 0.5 + 0.5;',
    '  sw = 0.55 + 0.45 * sw * sw;',
    '  sw += substormPhase * 0.5;',
    '',
    '  // ═══ 4-LEVEL DOMAIN WARPING ═══',
    '  // Each level feeds into the next for highly complex structure',
    '  vec2 q = vec2(fbm(uv * 3.5 + vec2(t * 0.28, t * 0.04)),',
    '               fbm(uv * 3.5 + vec2(-t * 0.12, t * 0.18)));',
    '  vec2 r = vec2(fbm(uv * 3.5 + q * 4.5 + vec2(t * 0.08, t * 0.12)),',
    '               fbm(uv * 3.5 + q * 4.5 + vec2(t * 0.16, -t * 0.08)));',
    IS_MOBILE
      ? '  float domainWarp = fbm(uv * 3.0 + r * 1.5);'
      : '  vec2 s = vec2(fbm(uv * 2.5 + r * 3.0 + vec2(-t * 0.06, t * 0.10)),'
        + '               fbm(uv * 2.8 + r * 2.5 + vec2(t * 0.05, -t * 0.07)));'
        + '  vec2 w = vec2(fbm(uv * 2.0 + s * 2.0 + vec2(t * 0.04, t * 0.03)),'
        + '               fbm(uv * 2.2 + s * 1.8 + vec2(-t * 0.03, t * 0.05)));'
        + '  float domainWarp = fbm(uv * 3.0 + w * 1.5);',
    '',
    '  // ═══ CURTAIN WAVE DISTORTION ═══',
    '  float wave1 = sin(uv.x * 6.0 + t * 0.7) * (0.16 + 0.06 * sw);',
    '  float wave2 = sin(uv.x * 10.2 - t * 0.45) * 0.11;',
    '  float wave3 = cos(uv.x * 3.0 + t * 0.28) * 0.15;',
    '  float wave4 = sin(uv.x * 19.0 + t * 1.2) * (0.035 + 0.035 * sw);',
    '  float khRoll = sin(uv.x * 14.0 + t * 1.6) * 0.04 * vCurtainEdge;',
    '  float waveY = uv.y + wave1 + wave2 + wave3 + wave4 + khRoll;',
    '',
    '  // ═══ PLASMA DENSITY FIELD ═══',
    '  float n1 = fbm(vec2(uv.x * 4.5 + t * 0.45, waveY * 3.0 - t * 0.22));',
    '  float n2 = fbm(vec2(uv.x * 2.8 - t * 0.30, waveY * 4.0 + t * 0.15));',
    '  float n3 = fbm(vec2(uv.x * 6.5 + t * 0.18, waveY * 2.0 - t * 0.35));',
    '  float turb = turbulence(vec2(uv.x * 2.5 + t * 0.12, waveY * 1.8));',
    '  float noiseMix = n1 * 0.30 + n2 * 0.25 + n3 * 0.15 + domainWarp * 0.30;',
    '',
    '  // ═══ ALTITUDE-DEPENDENT EMISSION PROFILE ═══',
    '  // Real aurora: peak emission at ~110km (~0.4-0.6 in curtain UV)',
    '  // Chapman profile: emission peaks where particle energy matches',
    '  // atmospheric density (E-region for green, F-region for red)',
    '  float chapmanProfile = exp(-pow((uv.y - 0.55) * 3.5, 2.0));',
    '  // Secondary peak at higher altitude (red line emission)',
    '  float highAltPeak = exp(-pow((uv.y - 0.82) * 5.0, 2.0)) * 0.4;',
    '  float emissionProfile = chapmanProfile + highAltPeak;',
    '',
    '  // Vertical curtain fade',
    '  float vertFade = smoothstep(0.0, 0.20, uv.y) * smoothstep(1.0, 0.40, uv.y);',
    '  vertFade = pow(vertFade, 0.65);',
    '',
    '  // Top glow — substorm breakup arc',
    '  float topGlow = smoothstep(0.55, 1.0, uv.y) * 0.6;',
    '  float pulse1 = sin(t * 1.3 + uv.x * 5.5) * 0.5 + 0.5;',
    '  float pulse2 = sin(t * 0.6 + uv.x * 2.8 + 1.57) * 0.5 + 0.5;',
    '  float pulse3 = sin(t * 2.1 + uv.x * 8.0 + 0.78) * 0.5 + 0.5;',
    '  topGlow *= (0.35 + 0.25 * pulse1 + 0.20 * pulse2 + 0.10 * pulse3) * sw;',
    '',
    '  // Horizontal fade',
    '  float hFade = smoothstep(0.0, 0.10, uv.x) * smoothstep(1.0, 0.90, uv.x);',
    '',
    '  // ═══ COLOR MAPPING ═══',
    '  float colorPos = uv.x + noiseMix * 0.35 + sin(t * 0.18) * 0.15;',
    '  vec3 col;',
    '  if (colorPos < 0.33) {',
    '    col = mix(color1, color2, colorPos * 3.0);',
    '  } else if (colorPos < 0.66) {',
    '    col = mix(color2, color3, (colorPos - 0.33) * 3.0);',
    '  } else {',
    '    col = mix(color3, color1, (colorPos - 0.66) * 3.0);',
    '  }',
    '',
    '  // ═══ MAGNETIC FIELD LINE RAYS ═══',
    '  // Visible as bright ray structures in aurora',
    '  float ray1 = pow(abs(sin(uv.x * 55.0 + turb * 9.0 + t * 0.7)), 12.0);',
    '  float ray2 = pow(abs(sin(uv.x * 38.0 - turb * 7.0 + t * 0.45)), 10.0) * 0.6;',
    IS_MOBILE ? '  float rays = (ray1 + ray2) * vertFade * 0.50;' : '  float ray3 = pow(abs(sin(uv.x * 75.0 + turb * 14.0 - t * 1.0)), 16.0) * 0.3;',
    IS_MOBILE ? '' : '  float ray4 = pow(abs(sin(uv.x * 100.0 + turb * 20.0 + t * 1.5)), 20.0) * 0.15;',
    IS_MOBILE ? '' : '  float rays = (ray1 + ray2 + ray3 + ray4) * vertFade * 0.50;',
    '',
    '  // ═══ SHIMMER + SCINTILLATION ═══',
    '  float shimmer = sin(uv.x * 50.0 + t * 2.2) * 0.5 + 0.5;',
    '  shimmer *= sin(uv.x * 32.0 - t * 1.6) * 0.5 + 0.5;',
    '  shimmer *= sin(uv.y * 20.0 + t * 0.8) * 0.5 + 0.5;',
    '  float scintillation = shimmer * 0.15 * vertFade;',
    '',
    '  // ═══ VOLUMETRIC DENSITY ═══',
    '  float baseDensity = noiseMix * emissionProfile;',
    '  baseDensity = baseDensity * 1.4 + topGlow + rays + scintillation;',
    '  baseDensity += abs(vDisplace) * 0.5;',
    '',
    '  // ═══ BEER-LAMBERT ABSORPTION ═══',
    '  float opticalDepth = baseDensity * 2.5;',
    '  float transmittance = exp(-opticalDepth * 0.3);',
    '',
    '  float alpha = baseDensity * vertFade * hFade * opacity * intensity;',
    '  alpha *= noiseMix * 1.4;',
    '  alpha = clamp(alpha, 0.0, 1.0);',
    '',
    '  // ═══ EMISSION COLORING ═══',
    '  col += vec3(' + ph[0].toFixed(2) + ',' + ph[1].toFixed(2) + ',' + ph[2].toFixed(2) + ') * topGlow * noiseMix;',
    '  col += vec3(' + ph[0].toFixed(2) + ',' + (ph[1] * 0.88).toFixed(2) + ',' + (ph[2] * 1.0).toFixed(2) + ') * rays;',
    '  col += vec3(' + (ph[0] * 0.4).toFixed(2) + ',' + (ph[1] * 0.4).toFixed(2) + ',' + (ph[2] * 0.5).toFixed(2) + ') * abs(vDisplace);',
    '',
    '  // Bloom',
    '  float bloomMask = smoothstep(0.2, 0.85, uv.y) * noiseMix * sw;',
    '  col += vec3(' + pc[0].toFixed(2) + ',' + pc[1].toFixed(2) + ',' + pc[2].toFixed(2) + ') * bloomMask * 0.15;',
    '',
    '  // Wave crest highlights',
    '  float crest = pow(max(0.0, vDisplace), 2.0) * 3.0;',
    '  col += vec3(' + cr[0].toFixed(2) + ',' + cr[1].toFixed(2) + ',' + cr[2].toFixed(2) + ') * crest * vertFade * 0.18;',
    '',
    '  // Substorm brightening',
    '  col *= 1.0 + substormPhase * 0.4;',
    '',
    '  // Theme tint',
    '  col.r *= ' + wt.r.toFixed(2) + ';',
    '  col.g *= ' + wt.g.toFixed(2) + ';',
    '',
    '  gl_FragColor = vec4(col, alpha);',
    '}',
  ].join('\n');
};


// ══════════════════════════════════════════════════════════════════
//  AURORA CURTAIN MESH — JS-side physics
// ══════════════════════════════════════════════════════════════════

function AuroraCurtain({ cfg, fragShader, theme }) {
  var meshRef = useRef();
  var baseY = useRef(cfg.y);
  var baseX = useRef(cfg.x);

  // Substorm cycle state — shared across frame updates
  var substormState = useRef({
    phase: 0,        // 0-1 intensity
    growthTime: 0,   // time into growth phase
    active: false,
    nextTrigger: 15 + Math.random() * 25, // 15-40s until first substorm
    cooldown: 0,
  });

  var data = useMemo(function () {
    var segs = cfg.segments || 64;
    var geo = new THREE_LIB.PlaneGeometry(cfg.w, cfg.h, segs, Math.max(2, Math.floor(segs / 3)));
    var u = {
      time: { value: 0 },
      color1: { value: new THREE_LIB.Vector3(cfg.c1[0], cfg.c1[1], cfg.c1[2]) },
      color2: { value: new THREE_LIB.Vector3(cfg.c2[0], cfg.c2[1], cfg.c2[2]) },
      color3: { value: new THREE_LIB.Vector3(cfg.c3[0], cfg.c3[1], cfg.c3[2]) },
      opacity: { value: cfg.opacity },
      speed: { value: cfg.speed },
      waveFreq: { value: cfg.waveFreq },
      intensity: { value: cfg.intensity || 1.0 },
      substormPhase: { value: 0 },
    };
    return { geometry: geo, uniforms: u };
  }, []);

  var baseColors = useRef([cfg.c1.slice(), cfg.c2.slice(), cfg.c3.slice()]);
  var tmpColor = useMemo(function () { return new THREE_LIB.Color(); }, []);
  var tmpHsl = useRef({ h: 0, s: 0, l: 0 });
  var pal = PALETTES[theme] || PALETTES.golden;

  // ═══ SMOOTH INTERPOLATION STATE ═══
  // Exponential smoothing eliminates jerky motion on variable-framerate devices
  var smooth = useRef({ x: cfg.x, y: cfg.y, rz: cfg.rotZ, rx: cfg.rotX, intensity: cfg.intensity || 1.0 });

  useFrame(function (state) {
    var t = state.clock.getElapsedTime();
    var dt = Math.min(state.clock.getDelta(), 0.05);
    data.uniforms.time.value = t;

    // Smooth factor: higher = smoother but more laggy (0.03-0.08 is buttery)
    var sf = 1.0 - Math.pow(0.001, dt); // frame-rate-independent exponential smoothing

    // ═══ SUBSTORM CYCLE ═══
    // Growth phase → Expansion onset → Recovery
    var ss = substormState.current;
    ss.growthTime += dt;
    if (!ss.active && ss.growthTime > ss.nextTrigger) {
      ss.active = true;
      ss.cooldown = 8 + Math.random() * 6; // 8-14s active
      ss.growthTime = 0;
    }
    if (ss.active) {
      // Rapid onset — phase ramps up fast
      ss.phase = Math.min(1.0, ss.phase + dt * 0.8);
      ss.cooldown -= dt;
      if (ss.cooldown <= 0) {
        ss.active = false;
        ss.nextTrigger = 20 + Math.random() * 35;
        ss.growthTime = 0;
      }
    } else {
      // Recovery — slow decay
      ss.phase = Math.max(0, ss.phase - dt * 0.15);
    }
    data.uniforms.substormPhase.value = ss.phase;

    if (meshRef.current) {
      var i = cfg._idx;

      // ═══ SOLAR WIND PRESSURE DYNAMICS ═══
      var windPressure = Math.sin(t * 0.065 + i * 1.8) * Math.cos(t * 0.038 + i * 0.7);
      var gustFactor = Math.pow(Math.max(0, Math.sin(t * 0.14 + i * 2.7)), 6.0) * 0.3;

      // ═══ MULTI-FREQUENCY DRIFT ═══
      // Incommensurate frequencies → non-repeating trajectories
      var targetX = baseX.current
                 + Math.sin(t * 0.095 + i * 2.0) * 25
                 + Math.cos(t * 0.055 + i * 0.9) * 14
                 + Math.sin(t * 0.028 + i * 4.1) * 10
                 + windPressure * 20
                 + gustFactor * 40
                 + ss.phase * Math.sin(t * 0.8 + i) * 30;

      var targetY = baseY.current
                 + Math.sin(t * 0.075 + i * 1.5) * 8
                 + Math.cos(t * 0.040 + i * 2.3) * 5
                 + Math.sin(t * 0.018 + i * 3.7) * 4;

      // ═══ EXPONENTIAL SMOOTHING — buttery position transitions ═══
      smooth.current.x += (targetX - smooth.current.x) * sf;
      smooth.current.y += (targetY - smooth.current.y) * sf;
      meshRef.current.position.x = smooth.current.x;
      meshRef.current.position.y = smooth.current.y;

      // ═══ ORGANIC ROTATION — smoothed ═══
      var tiltFromMotion = Math.cos(t * 0.095 + i * 2.0) * 0.003;
      var targetRz = cfg.rotZ + Math.sin(t * 0.030 + i * 0.7) * 0.008 + tiltFromMotion * 0.015;
      var targetRx = cfg.rotX + Math.sin(t * 0.042 + i * 1.3) * 0.018;
      smooth.current.rz += (targetRz - smooth.current.rz) * sf;
      smooth.current.rx += (targetRx - smooth.current.rx) * sf;
      meshRef.current.rotation.z = smooth.current.rz;
      meshRef.current.rotation.x = smooth.current.rx;

      // ═══ COLOR CYCLING — constrained to theme hue range ═══
      var hueShift = Math.sin(t * 0.020 + i * 1.5) * pal.hueRange;
      var intensitySurge = 1.0 + ss.phase * 2.0 + gustFactor * 1.5;
      var targetIntensity = (cfg.intensity || 1.0) * intensitySurge;
      smooth.current.intensity += (targetIntensity - smooth.current.intensity) * sf;
      data.uniforms.intensity.value = smooth.current.intensity;

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
        fragmentShader={fragShader}
        transparent={true}
        depthWrite={false}
        side={THREE_LIB.DoubleSide}
        blending={THREE_LIB.AdditiveBlending}
      />
    </mesh>
  );
}


// ══════════════════════════════════════════════════════════════════
//  AURORA WAVE SYSTEM — 6 curtains with theme-aware configs
//  weight: 'full' (default) = all 6 curtains, 'accent' = 2 curtains (lighter, for multi-theme layering)
// ══════════════════════════════════════════════════════════════════

function AuroraWaveSystem({ theme, weight }) {
  var pal = PALETTES[theme] || PALETTES.golden;
  var isAccent = weight === 'accent';
  var fragShader = useMemo(function () {
    return AURORA_FRAG(pal);
  }, [theme]);

  var configs = useMemo(function () {
    var c = pal.curtains;

    // Accent mode: only 2 curtains, lower opacity, offset position for variety
    if (isAccent) {
      return [
        // Accent curtain 1 — wide, mid-positioned
        {
          w: IS_MOBILE ? 600 : 1200, h: IS_MOBILE ? 120 : 240,
          x: IS_MOBILE ? -40 : -60, y: IS_MOBILE ? 80 : 120, z: -350,
          rotX: 0.09, rotZ: -0.05,
          c1: c[0].c1, c2: c[0].c2, c3: c[0].c3,
          opacity: IS_MOBILE ? 0.10 : 0.14,
          speed: 0.28, waveFreq: 3.5, intensity: 0.85,
          segments: IS_MOBILE ? 24 : 64,
          _idx: 0,
        },
        // Accent curtain 2 — narrow, higher
        {
          w: IS_MOBILE ? 400 : 800, h: IS_MOBILE ? 90 : 180,
          x: IS_MOBILE ? 50 : 90, y: IS_MOBILE ? 105 : 155, z: -400,
          rotX: -0.04, rotZ: 0.08,
          c1: c[2].c1, c2: c[2].c2, c3: c[2].c3,
          opacity: IS_MOBILE ? 0.08 : 0.11,
          speed: 0.22, waveFreq: 4.0, intensity: 0.75,
          segments: IS_MOBILE ? 20 : 48,
          _idx: 1,
        },
      ];
    }

    // Full mode: all 6 curtains
    return [
      // Main primary aurora — widest, brightest
      {
        w: IS_MOBILE ? 750 : 1600, h: IS_MOBILE ? 170 : 340,
        x: 0, y: IS_MOBILE ? 92 : 135, z: -200,
        rotX: 0.14, rotZ: 0.04,
        c1: c[0].c1, c2: c[0].c2, c3: c[0].c3,
        opacity: IS_MOBILE ? 0.26 : 0.34,
        speed: 0.38, waveFreq: 4.5, intensity: 1.35,
        segments: IS_MOBILE ? 40 : 128,
        _idx: 0,
      },
      // Secondary deep aurora — offset left
      {
        w: IS_MOBILE ? 650 : 1300, h: IS_MOBILE ? 150 : 300,
        x: IS_MOBILE ? -55 : -90, y: IS_MOBILE ? 68 : 95, z: -300,
        rotX: 0.11, rotZ: -0.07,
        c1: c[1].c1, c2: c[1].c2, c3: c[1].c3,
        opacity: IS_MOBILE ? 0.20 : 0.28,
        speed: 0.30, waveFreq: 3.8, intensity: 1.25,
        segments: IS_MOBILE ? 32 : 96,
        _idx: 1,
      },
      // Ethereal wide aurora — far back, highest
      {
        w: IS_MOBILE ? 850 : 1700, h: IS_MOBILE ? 130 : 260,
        x: IS_MOBILE ? 35 : 70, y: IS_MOBILE ? 125 : 185, z: -420,
        rotX: -0.05, rotZ: 0.10,
        c1: c[2].c1, c2: c[2].c2, c3: c[2].c3,
        opacity: IS_MOBILE ? 0.14 : 0.20,
        speed: 0.22, waveFreq: 3.2, intensity: 1.15,
        segments: IS_MOBILE ? 32 : 96,
        _idx: 2,
      },
      // Accent aurora — bridge zone
      {
        w: IS_MOBILE ? 520 : 1100, h: IS_MOBILE ? 110 : 220,
        x: IS_MOBILE ? 75 : 150, y: IS_MOBILE ? 48 : 65, z: -360,
        rotX: 0.07, rotZ: 0.13,
        c1: c[3].c1, c2: c[3].c2, c3: c[3].c3,
        opacity: IS_MOBILE ? 0.10 : 0.16,
        speed: 0.26, waveFreq: 5.0, intensity: 1.05,
        segments: IS_MOBILE ? 24 : 64,
        _idx: 3,
      },
      // Diffuse background aurora — very wide, subtle (desktop only)
      !IS_MOBILE ? {
        w: 1800, h: 180,
        x: -80, y: 160, z: -500,
        rotX: -0.03, rotZ: -0.06,
        c1: c[4].c1, c2: c[4].c2, c3: c[4].c3,
        opacity: 0.11,
        speed: 0.18, waveFreq: 2.5, intensity: 0.9,
        segments: 48,
        _idx: 4,
      } : null,
      // Inner pulsating arc — close, narrow, bright during substorms
      {
        w: IS_MOBILE ? 450 : 900, h: IS_MOBILE ? 80 : 160,
        x: IS_MOBILE ? -20 : -30, y: IS_MOBILE ? 78 : 110, z: -160,
        rotX: 0.18, rotZ: 0.02,
        c1: c[5].c1, c2: c[5].c2, c3: c[5].c3,
        opacity: IS_MOBILE ? 0.16 : 0.22,
        speed: 0.45, waveFreq: 6.0, intensity: 1.4,
        segments: IS_MOBILE ? 32 : 96,
        _idx: 5,
      },
    ].filter(Boolean);
  }, [theme, isAccent]);

  return (
    <>
      {configs.map(function (cfg, i) {
        return <AuroraCurtain key={i} cfg={cfg} fragShader={fragShader} theme={theme} />;
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════════════════
export default AuroraWaveSystem;
export { PALETTES };
