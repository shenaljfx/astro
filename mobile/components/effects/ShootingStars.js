// ═══════════════════════════════════════════════════════════════════════
//  ShootingStars.js — Realistic 3D shooting star engine (Three.js / R3F)
//
//  Each meteor is a trail of particles with:
//   • Bright white-gold head (large, round, bloom glow)
//   • Physics-based trail: particles shed from head, cool and fade
//   • Each trail particle shrinks, dims, and red-shifts as it cools
//   • Slight gravitational arc (not perfectly straight)
//   • Random spawn from edges, varied angles/speeds/brightness
//   • Occasional bright fireballs with longer, wider trails
//   • Depth variation — some near, some far for parallax
//
//  Renders as a single Points mesh updated every frame — very efficient.
//  Must be used inside an R3F <Canvas> (called from CosmicScene).
// ═══════════════════════════════════════════════════════════════════════

import React, { useRef, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';

var { width: SW } = Dimensions.get('window');
var IS_MOBILE = SW < 768;

// ── Try loading R3F + Three ──
var useFrame, THREE_LIB;
try {
  useFrame = require('@react-three/fiber/native').useFrame;
  THREE_LIB = require('three');
} catch (e) {
  // Will not render if Three.js unavailable
}

// ══════════════════════════════════════════════════════════════════
//  CONFIGURATION
// ══════════════════════════════════════════════════════════════════
var MAX_METEORS = IS_MOBILE ? 4 : 6;           // active meteors at once
var TRAIL_LENGTH = IS_MOBILE ? 40 : 60;        // particles per trail
var TOTAL_PARTICLES = MAX_METEORS * TRAIL_LENGTH;

var SPAWN_INTERVAL_MIN = 1.5;   // seconds between spawns
var SPAWN_INTERVAL_MAX = 5.0;
var METEOR_SPEED_MIN = 80;      // units/sec
var METEOR_SPEED_MAX = 200;
var GRAVITY = -8;               // slight downward arc
var HEAD_SIZE = IS_MOBILE ? 4.0 : 5.0;
var TRAIL_SIZE_MAX = IS_MOBILE ? 2.5 : 3.5;

// ══════════════════════════════════════════════════════════════════
//  SHADERS — realistic meteor rendering
// ══════════════════════════════════════════════════════════════════

// Vertex shader: per-particle size, passed color + alpha
var METEOR_VERT = [
  'precision mediump float;',
  'attribute float aSize;',
  'attribute float aAlpha;',
  'attribute float aTemp;',     // 1.0 = hot head, 0.0 = cold tail
  'varying float vAlpha;',
  'varying float vTemp;',
  'varying vec3 vColor;',
  '',
  'void main() {',
  '  vAlpha = aAlpha;',
  '  vTemp = aTemp;',
  '  vColor = color;',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  gl_PointSize = clamp(aSize * (150.0 / -mv.z), 0.5, 48.0);',
  '  gl_Position = projectionMatrix * mv;',
  '}',
].join('\n');

// Fragment shader: round dot with bright core + bloom halo
// Temperature affects color: hot=white-gold, cool=deep amber→dim red
var METEOR_FRAG = [
  'precision mediump float;',
  'varying float vAlpha;',
  'varying float vTemp;',
  'varying vec3 vColor;',
  '',
  'void main() {',
  '  float d = length(gl_PointCoord - 0.5);',
  '  if (d > 0.5) discard;',
  '',
  '  // Sharp bright core + soft bloom halo',
  '  float core = smoothstep(0.5, 0.0, d);',
  '  float bloom = exp(-d * d * 8.0) * 0.6;',
  '  float outerGlow = exp(-d * d * 3.0) * 0.2;',
  '  float shape = core + bloom + outerGlow;',
  '',
  '  // Temperature-based color shift',
  '  // Hot: bright white-gold    Cold: deep amber → dim red ember',
  '  vec3 hotColor = vec3(1.0, 0.97, 0.85);',     // white-gold
  '  vec3 warmColor = vec3(1.0, 0.75, 0.2);',      // bright gold
  '  vec3 coolColor = vec3(0.9, 0.4, 0.05);',      // deep amber
  '  vec3 coldColor = vec3(0.5, 0.12, 0.02);',     // dim red ember
  '',
  '  vec3 col;',
  '  if (vTemp > 0.7) {',
  '    col = mix(warmColor, hotColor, (vTemp - 0.7) / 0.3);',
  '  } else if (vTemp > 0.3) {',
  '    col = mix(coolColor, warmColor, (vTemp - 0.3) / 0.4);',
  '  } else {',
  '    col = mix(coldColor, coolColor, vTemp / 0.3);',
  '  }',
  '',
  '  // Head particles get extra bloom brightness',
  '  float headBoost = smoothstep(0.85, 1.0, vTemp) * 0.4;',
  '  col += vec3(0.3, 0.2, 0.05) * headBoost * core;',
  '',
  '  float alpha = shape * vAlpha;',
  '  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));',
  '}',
].join('\n');

// ══════════════════════════════════════════════════════════════════
//  METEOR STATE MANAGEMENT (CPU-side, updated per frame)
// ══════════════════════════════════════════════════════════════════

function createMeteorState() {
  return {
    active: false,
    // Position + velocity
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    // Properties
    speed: 0,
    brightness: 1,
    isFireball: false,
    age: 0,
    lifetime: 0,
    // Trail ring buffer — stores last N head positions
    trail: null, // Float32Array(TRAIL_LENGTH * 3)
    trailHead: 0,
    trailCount: 0,
    // Spawn timer
    nextSpawn: 0,
  };
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function spawnMeteor(m, cameraZ) {
  // Visible area at z=0 with camera at z=100, fov=55:
  // y ≈ ±52, x ≈ ±52 * aspect
  var aspect = SW / Dimensions.get('window').height;
  var halfY = 55;
  var halfX = halfY * aspect;

  // Spawn from top or top-right edge
  var side = Math.random();
  if (side < 0.6) {
    // From top edge — anywhere along x
    m.x = rand(-halfX * 0.5, halfX * 1.2);
    m.y = halfY + rand(5, 20);
  } else if (side < 0.85) {
    // From right edge — upper half
    m.x = halfX + rand(5, 20);
    m.y = rand(halfY * 0.2, halfY * 1.0);
  } else {
    // From top-left (less common)
    m.x = -halfX - rand(5, 15);
    m.y = halfY + rand(0, 15);
  }

  // Depth — some near camera, some far for parallax
  m.z = rand(-30, -5);

  // Direction: mostly downward-diagonal
  var angle;
  if (side < 0.6) {
    // From top: angle 220°-310° (down-left to down-right)
    angle = rand(230, 300) * (Math.PI / 180);
  } else if (side < 0.85) {
    // From right: angle 200°-250° (down-left)
    angle = rand(200, 250) * (Math.PI / 180);
  } else {
    // From left: angle 280°-330° (down-right)
    angle = rand(280, 330) * (Math.PI / 180);
  }

  m.speed = rand(METEOR_SPEED_MIN, METEOR_SPEED_MAX);
  m.isFireball = Math.random() < 0.15;
  if (m.isFireball) {
    m.speed *= 0.7; // fireballs are slower but brighter
    m.brightness = rand(1.3, 1.8);
  } else {
    m.brightness = rand(0.6, 1.2);
  }

  m.vx = Math.cos(angle) * m.speed;
  m.vy = Math.sin(angle) * m.speed;
  m.vz = rand(-2, 2); // slight z drift

  m.age = 0;
  m.lifetime = rand(1.2, 3.5);
  m.active = true;
  m.trailHead = 0;
  m.trailCount = 0;

  // Initialize trail buffer
  if (!m.trail) {
    m.trail = new Float32Array(TRAIL_LENGTH * 3);
  }
  // Fill initial position
  for (var i = 0; i < TRAIL_LENGTH; i++) {
    m.trail[i * 3] = m.x;
    m.trail[i * 3 + 1] = m.y;
    m.trail[i * 3 + 2] = m.z;
  }
}

function updateMeteor(m, dt) {
  if (!m.active) return;

  m.age += dt;
  if (m.age > m.lifetime) {
    m.active = false;
    return;
  }

  // Apply gravity (slight arc)
  m.vy += GRAVITY * dt;

  // Update position
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  m.z += m.vz * dt;

  // Push new head position into trail ring buffer
  m.trail[m.trailHead * 3] = m.x;
  m.trail[m.trailHead * 3 + 1] = m.y;
  m.trail[m.trailHead * 3 + 2] = m.z;
  m.trailHead = (m.trailHead + 1) % TRAIL_LENGTH;
  if (m.trailCount < TRAIL_LENGTH) m.trailCount++;
}

// ══════════════════════════════════════════════════════════════════
//  R3F COMPONENT
// ══════════════════════════════════════════════════════════════════

function ShootingStarsSystem() {
  var pointsRef = useRef();

  // Initialize meteor states + geometry buffers
  var state = useMemo(function () {
    var meteors = [];
    for (var i = 0; i < MAX_METEORS; i++) {
      var m = createMeteorState();
      // Stagger initial spawn timers
      m.nextSpawn = rand(0.5, 3.0) + i * rand(0.8, 2.0);
      meteors.push(m);
    }

    // Geometry buffers — all particles for all meteors in one Points mesh
    var positions = new Float32Array(TOTAL_PARTICLES * 3);
    var colors = new Float32Array(TOTAL_PARTICLES * 3);
    var sizes = new Float32Array(TOTAL_PARTICLES);
    var alphas = new Float32Array(TOTAL_PARTICLES);
    var temps = new Float32Array(TOTAL_PARTICLES);

    // Initialize all positions to origin with zero alpha (hidden but valid — no NaN)
    for (var p = 0; p < TOTAL_PARTICLES; p++) {
      positions[p * 3] = 0;
      positions[p * 3 + 1] = 0;
      positions[p * 3 + 2] = -20;
      colors[p * 3] = 1;
      colors[p * 3 + 1] = 0.8;
      colors[p * 3 + 2] = 0.2;
      sizes[p] = 0;
      alphas[p] = 0;
      temps[p] = 0;
    }

    var geo = new THREE_LIB.BufferGeometry();
    geo.setAttribute('position', new THREE_LIB.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE_LIB.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE_LIB.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE_LIB.BufferAttribute(alphas, 1));
    geo.setAttribute('aTemp', new THREE_LIB.BufferAttribute(temps, 1));

    // Set bounding sphere manually to avoid NaN computation
    geo.boundingSphere = new THREE_LIB.Sphere(
      new THREE_LIB.Vector3(0, 0, 0), 500
    );

    var uniforms = {};

    return { meteors: meteors, geo: geo, uniforms: uniforms };
  }, []);

  useFrame(function (r3fState, delta) {
    // Clamp delta to avoid explosion on tab-switch
    var dt = Math.min(delta, 0.1);
    var elapsed = r3fState.clock.getElapsedTime();
    var meteors = state.meteors;
    var geo = state.geo;

    var posAttr = geo.attributes.position;
    var colAttr = geo.attributes.color;
    var sizeAttr = geo.attributes.aSize;
    var alphaAttr = geo.attributes.aAlpha;
    var tempAttr = geo.attributes.aTemp;

    var pos = posAttr.array;
    var col = colAttr.array;
    var sizes = sizeAttr.array;
    var alphas = alphaAttr.array;
    var temps = tempAttr.array;

    // ── Spawn / update meteors ──
    for (var mi = 0; mi < MAX_METEORS; mi++) {
      var m = meteors[mi];

      if (!m.active) {
        m.nextSpawn -= dt;
        if (m.nextSpawn <= 0) {
          spawnMeteor(m, 100);
          m.nextSpawn = rand(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
        }
      } else {
        updateMeteor(m, dt);
      }

      // ── Write trail particles into buffers ──
      var baseIdx = mi * TRAIL_LENGTH;

      for (var ti = 0; ti < TRAIL_LENGTH; ti++) {
        var pi = baseIdx + ti; // particle index in global buffer

        if (!m.active || ti >= m.trailCount) {
          // Inactive — hide at origin with zero size/alpha (safe position, no NaN)
          pos[pi * 3] = 0;
          pos[pi * 3 + 1] = 0;
          pos[pi * 3 + 2] = -20;
          sizes[pi] = 0;
          alphas[pi] = 0;
          temps[pi] = 0;
          continue;
        }

        // Read from ring buffer — newest first
        // ti=0 is the HEAD (hottest, brightest), ti=trailCount-1 is the TAIL (coldest)
        var ringIdx = ((m.trailHead - 1 - ti) + TRAIL_LENGTH * 2) % TRAIL_LENGTH;

        pos[pi * 3] = m.trail[ringIdx * 3];
        pos[pi * 3 + 1] = m.trail[ringIdx * 3 + 1];
        pos[pi * 3 + 2] = m.trail[ringIdx * 3 + 2];

        // Temperature: 1.0 at head → 0.0 at tail
        var tNorm = 1.0 - (ti / (m.trailCount - 1 || 1));
        temps[pi] = tNorm;

        // Size: head is big, trail particles shrink
        var headSz = m.isFireball ? HEAD_SIZE * 1.5 : HEAD_SIZE;
        var tailSz = m.isFireball ? TRAIL_SIZE_MAX : TRAIL_SIZE_MAX * 0.6;
        sizes[pi] = headSz * tNorm * tNorm + tailSz * (1 - tNorm) * tNorm;
        // Head particle extra big
        if (ti === 0) sizes[pi] = headSz;

        // Alpha: bright head, fading trail, dimming with meteor age
        var ageFade = 1.0 - Math.pow(m.age / m.lifetime, 2);
        var trailFade = Math.pow(tNorm, 0.6); // non-linear — stays bright longer then drops
        alphas[pi] = trailFade * ageFade * m.brightness;

        // Color: golden tones (vertex color, further modulated in shader by temp)
        var goldR = 1.0;
        var goldG = 0.85 * tNorm + 0.35 * (1 - tNorm);
        var goldB = 0.4 * tNorm * tNorm;
        col[pi * 3] = goldR;
        col[pi * 3 + 1] = goldG;
        col[pi * 3 + 2] = goldB;
      }
    }

    // Flag buffers as needing GPU upload
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    tempAttr.needsUpdate = true;
  });

  if (!THREE_LIB) return null;

  return (
    <points ref={pointsRef} geometry={state.geo} frustumCulled={false}>
      <shaderMaterial
        uniforms={state.uniforms}
        vertexShader={METEOR_VERT}
        fragmentShader={METEOR_FRAG}
        transparent={true}
        depthWrite={false}
        vertexColors={true}
        blending={THREE_LIB.AdditiveBlending}
      />
    </points>
  );
}

export default ShootingStarsSystem;
