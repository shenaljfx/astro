/**
 * SolarSystemHero — 3D mini solar system with Sun and 9 Graha orbiting.
 * Designed as the hero section for the home screen.
 */
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const GRAHAS = [
  { name: 'Sun',     color: '#FFD700', emissive: '#FFA500', size: 0.25, orbit: 0,    speed: 0,     emissiveI: 1.0 },
  { name: 'Moon',    color: '#E8E8E8', emissive: '#B0B0B0', size: 0.08, orbit: 0.65, speed: 0.8,   emissiveI: 0.4 },
  { name: 'Mercury', color: '#A0D2DB', emissive: '#5FA8BC', size: 0.05, orbit: 0.95, speed: 1.2,   emissiveI: 0.3 },
  { name: 'Venus',   color: '#FF69B4', emissive: '#FF1493', size: 0.07, orbit: 1.25, speed: 0.9,   emissiveI: 0.35 },
  { name: 'Mars',    color: '#FF4444', emissive: '#CC0000', size: 0.06, orbit: 1.6,  speed: 0.65,  emissiveI: 0.4 },
  { name: 'Jupiter', color: '#FFB347', emissive: '#FF8C00', size: 0.12, orbit: 2.1,  speed: 0.35,  emissiveI: 0.3 },
  { name: 'Saturn',  color: '#DEB887', emissive: '#CD853F', size: 0.10, orbit: 2.6,  speed: 0.22,  emissiveI: 0.25 },
  { name: 'Rahu',    color: '#708090', emissive: '#4A5568', size: 0.06, orbit: 3.0,  speed: -0.15, emissiveI: 0.5 },
  { name: 'Ketu',    color: '#A0522D', emissive: '#8B4513', size: 0.05, orbit: 3.3,  speed: -0.12, emissiveI: 0.45 },
];

function Sun() {
  const sunRef = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sunRef.current) {
      sunRef.current.rotation.y = t * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
      glowRef.current.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.05;
    }
  });

  return (
    <group>
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFA500"
          emissiveIntensity={1.5}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.38, 16, 16]} />
        <meshBasicMaterial color="#FFAA00" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      <pointLight color="#FFD700" intensity={2} distance={8} decay={2} />
    </group>
  );
}

function OrbitRing({ radius }) {
  const geo = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <line geometry={geo}>
      <lineBasicMaterial color="#FFFFFF" transparent opacity={0.06} />
    </line>
  );
}

function Planet({ graha, timeOffset = 0 }) {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (!meshRef.current || graha.orbit === 0) return;
    const t = clock.getElapsedTime() * graha.speed + timeOffset;
    meshRef.current.position.x = Math.cos(t) * graha.orbit;
    meshRef.current.position.z = Math.sin(t) * graha.orbit;
    meshRef.current.position.y = Math.sin(t * 0.5) * 0.08;
  });

  if (graha.orbit === 0) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[graha.size, 16, 16]} />
      <meshStandardMaterial
        color={graha.color}
        emissive={graha.emissive}
        emissiveIntensity={graha.emissiveI}
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  );
}

function SaturnRings() {
  const ringRef = useRef();

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const saturn = GRAHAS[6];
    const t = clock.getElapsedTime() * saturn.speed;
    ringRef.current.position.x = Math.cos(t) * saturn.orbit;
    ringRef.current.position.z = Math.sin(t) * saturn.orbit;
    ringRef.current.position.y = Math.sin(t * 0.5) * 0.08;
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI * 0.4, 0, 0]}>
      <ringGeometry args={[0.14, 0.2, 32]} />
      <meshBasicMaterial color="#DEB887" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function SolarSystemScene() {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.05 + 0.3;
    }
  });

  const timeOffsets = useMemo(() =>
    GRAHAS.map((_, i) => (i / GRAHAS.length) * Math.PI * 2), []);

  return (
    <group ref={groupRef}>
      <Sun />
      {GRAHAS.filter(g => g.orbit > 0).map((g, i) => (
        <OrbitRing key={g.name + '_orbit'} radius={g.orbit} />
      ))}
      {GRAHAS.map((g, i) => (
        <Planet key={g.name} graha={g} timeOffset={timeOffsets[i]} />
      ))}
      <SaturnRings />
    </group>
  );
}
