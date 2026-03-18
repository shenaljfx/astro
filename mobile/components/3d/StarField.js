/**
 * StarField — 1000 stars rendered as GL Points with a custom glow shader.
 * Additive blending creates natural bloom; per-star twinkling via sin().
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const DEFAULT_COUNT = 1000;
const DEFAULT_SPREAD = 40;

const PALETTE = [
  [0.89, 0.91, 0.94], // cool white
  [0.83, 0.83, 0.97], // blue-white
  [0.79, 0.84, 1.00], // pale blue
  [0.72, 0.80, 0.95], // soft blue
  [0.99, 0.91, 0.54], // warm gold
  [0.98, 0.75, 0.14], // amber
  [0.75, 0.52, 0.99], // vivid purple
  [0.66, 0.55, 0.98], // soft violet
  [0.58, 0.77, 0.99], // sky blue
  [0.94, 0.67, 0.99], // pink
  [0.20, 0.82, 0.60], // emerald
  [0.13, 0.83, 0.91], // teal
];

const STAR_VERT = `
attribute float aSize;
attribute float aPhase;
attribute float aSpeed;
uniform float uTime;
varying vec3 vColor;
varying float vBrightness;

void main() {
  vColor = color;
  float t = sin(uTime * aSpeed + aPhase);
  vBrightness = 0.3 + 0.7 * (0.5 + 0.5 * t);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * vBrightness * (220.0 / -mvPos.z), 1.0, 64.0);
  gl_Position = projectionMatrix * mvPos;
}
`;

const STAR_FRAG = `
varying vec3 vColor;
varying float vBrightness;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float glow = exp(-d * d * 8.0);
  float core = exp(-d * d * 45.0);
  vec3 col = vColor * (0.5 + core * 0.5);
  float alpha = (glow * 0.6 + core * 0.4) * vBrightness;
  gl_FragColor = vec4(col * 1.3, alpha);
}
`;

export default function StarField({
  count = DEFAULT_COUNT,
  spread = DEFAULT_SPREAD,
  speed = 0.008,
}) {
  const pointsRef = useRef();
  const matRef = useRef();

  const { geometry, uniforms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      col[i * 3] = c[0];
      col[i * 3 + 1] = c[1];
      col[i * 3 + 2] = c[2];

      const r = Math.random();
      sizes[i] = r < 0.65 ? 1.0 + Math.random() * 3.0
        : r < 0.92 ? 3.5 + Math.random() * 5.5
        : 8.0 + Math.random() * 10.0;

      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.4 + Math.random() * 2.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.Float32BufferAttribute(speeds, 1));

    const u = { uTime: { value: 0 } };
    return { geometry: geo, uniforms: u };
  }, [count, spread]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += speed * 0.006;
      pointsRef.current.rotation.x += speed * 0.002;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={uniforms}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
