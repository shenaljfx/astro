/**
 * StarField — Instanced mesh of 600 points for a 3D star background.
 * Reusable inside any CelestialCanvas scene. Stars slowly drift and twinkle.
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const STAR_COUNT = 600;
const SPREAD = 30;

export default function StarField({ count = STAR_COUNT, spread = SPREAD, speed = 0.02 }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return arr;
  }, [count, spread]);

  const scales = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = 0.3 + Math.random() * 0.7;
    }
    return arr;
  }, [count]);

  const twinklePhases = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = Math.random() * Math.PI * 2;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      dummy.position.set(x, y, z);
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.5 + twinklePhases[i]);
      const s = scales[i] * twinkle;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.rotation.y += speed * 0.01;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.03, 6, 6]} />
      <meshBasicMaterial color="#E2E8F0" transparent opacity={0.8} />
    </instancedMesh>
  );
}
