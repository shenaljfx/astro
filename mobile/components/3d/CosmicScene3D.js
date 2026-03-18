/**
 * CosmicScene3D — Lightweight 3D overlay scene.
 * Only renders the glowing star field and subtle constellation lines.
 * Color/atmosphere comes from the 2D MilkyWay layer underneath;
 * this canvas adds depth parallax via a slow auto-drift camera.
 */
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import StarField from './StarField';

/* =========================================================
   ZODIAC CONSTELLATION DATA (subset for background decor)
   ========================================================= */
const CONSTELLATIONS = [
  {
    name: 'Aries',
    stars: [[0.25,0.35],[0.38,0.28],[0.52,0.22],[0.60,0.30]],
    lines: [[0,1],[1,2],[2,3]],
    color: '#EF4444',
  },
  {
    name: 'Leo',
    stars: [[0.20,0.55],[0.28,0.42],[0.35,0.30],[0.48,0.25],[0.58,0.30],[0.55,0.42],[0.48,0.50],[0.60,0.55],[0.70,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,1],[5,7],[7,8]],
    color: '#F59E0B',
  },
  {
    name: 'Scorpio',
    stars: [[0.12,0.30],[0.22,0.25],[0.32,0.30],[0.42,0.28],[0.52,0.32],[0.60,0.40],[0.68,0.50],[0.75,0.55],[0.82,0.48],[0.88,0.42]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9]],
    color: '#C084FC',
  },
  {
    name: 'Pisces',
    stars: [[0.18,0.40],[0.28,0.32],[0.38,0.28],[0.50,0.35],[0.60,0.30],[0.72,0.35],[0.80,0.42],[0.70,0.50],[0.58,0.48],[0.48,0.52]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,3]],
    color: '#818CF8',
  },
];

/* =========================================================
   AUTO-DRIFT CAMERA
   Gentle elliptical orbit for constant parallax feel.
   ========================================================= */
function AutoDriftCamera({ radius = 0.35, speed = 0.01 }) {
  const { camera } = useThree();
  const baseZ = useRef(camera.position.z);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed;
    camera.position.x = Math.sin(t) * radius;
    camera.position.y = Math.cos(t * 0.7) * radius * 0.5;
    camera.position.z = baseZ.current + Math.sin(t * 0.35) * 0.15;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* =========================================================
   CONSTELLATION LINES 3D
   ========================================================= */
const PLACEMENTS = [
  { idx: 0, x: -7, y: 4,  z: -6,  scale: 5, opacity: 0.22 },
  { idx: 1, x: 6,  y: -3, z: -8,  scale: 6, opacity: 0.16 },
  { idx: 2, x: -4, y: -5, z: -10, scale: 5, opacity: 0.12 },
  { idx: 3, x: 7,  y: 3,  z: -12, scale: 4, opacity: 0.10 },
];

const ConstellationGroup = React.memo(function ConstellationGroup({
  constellation, x, y, z, scale, opacity,
}) {
  const { lineGeo, starGeo, lineColor } = useMemo(() => {
    const c = constellation;
    const lp = [];
    c.lines.forEach(([a, b]) => {
      lp.push(
        (c.stars[a][0] - 0.5) * scale + x,
        (c.stars[a][1] - 0.5) * scale + y, z,
        (c.stars[b][0] - 0.5) * scale + x,
        (c.stars[b][1] - 0.5) * scale + y, z,
      );
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));

    const sp = [];
    c.stars.forEach(([sx, sy]) => {
      sp.push((sx - 0.5) * scale + x, (sy - 0.5) * scale + y, z);
    });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));

    return { lineGeo: lg, starGeo: sg, lineColor: new THREE.Color(c.color) };
  }, [constellation, x, y, z, scale]);

  return (
    <>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial color={lineColor} transparent opacity={opacity} />
      </lineSegments>
      <points geometry={starGeo}>
        <pointsMaterial
          color={0xFFFFFF} size={0.12} transparent
          opacity={Math.min(1, opacity * 3)}
          sizeAttenuation
        />
      </points>
    </>
  );
});

function ConstellationLines3D() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.003;
      groupRef.current.rotation.x = Math.sin(t * 0.002) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {PLACEMENTS.map((p, i) => (
        <ConstellationGroup
          key={i}
          constellation={CONSTELLATIONS[p.idx]}
          x={p.x} y={p.y} z={p.z}
          scale={p.scale} opacity={p.opacity}
        />
      ))}
    </group>
  );
}

/* =========================================================
   MAIN SCENE EXPORT
   ========================================================= */
export default function CosmicScene3D() {
  return (
    <>
      <AutoDriftCamera />
      <StarField count={1000} spread={40} speed={0.008} />
      <ConstellationLines3D />
    </>
  );
}
