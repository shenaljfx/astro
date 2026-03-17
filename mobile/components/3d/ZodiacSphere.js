/**
 * ZodiacSphere — 3D interactive zodiac wheel using React Three Fiber.
 * Shows 12 rashi segments as a torus ring with planet orbs positioned
 * at their zodiacal longitudes. Touch/drag to rotate.
 */
import React, { useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

const RASHI_COLORS = [
  '#EF4444', '#10B981', '#FBBF24', '#94A3B8',
  '#F59E0B', '#6366F1', '#EC4899', '#DC2626',
  '#8B5CF6', '#1E3A5F', '#3B82F6', '#14B8A6',
];

const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Kataka',
  'Simha', 'Kanya', 'Thula', 'Vrischika',
  'Dhanu', 'Makara', 'Kumbha', 'Meena',
];

const GRAHA_COLORS = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mars: '#FF4444',
  Mercury: '#00CC00', Jupiter: '#FFB347', Venus: '#FF69B4',
  Saturn: '#4169E1', Rahu: '#808080', Ketu: '#A0522D',
};

function ZodiacRing({ radius = 2.2, tubeRadius = 0.12 }) {
  const ringRef = useRef();
  const segments = useMemo(() => {
    const segs = [];
    for (let i = 0; i < 12; i++) {
      const startAngle = (i / 12) * Math.PI * 2;
      const arcLength = Math.PI * 2 / 12;
      const geo = new THREE.TorusGeometry(radius, tubeRadius, 8, 24, arcLength);
      segs.push({ geo, angle: startAngle, color: RASHI_COLORS[i] });
    }
    return segs;
  }, [radius, tubeRadius]);

  return (
    <group ref={ringRef}>
      {segments.map((seg, i) => (
        <mesh key={i} geometry={seg.geo} rotation={[0, 0, seg.angle]}>
          <meshStandardMaterial
            color={seg.color}
            emissive={seg.color}
            emissiveIntensity={0.15}
            roughness={0.6}
            metalness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function RashiLabels({ radius = 2.2 }) {
  const labelsRef = useRef();

  useFrame(({ camera }) => {
    if (labelsRef.current) {
      labelsRef.current.children.forEach(child => {
        child.lookAt(camera.position);
      });
    }
  });

  return (
    <group ref={labelsRef}>
      {RASHI_NAMES.map((name, i) => {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
        const labelRadius = radius + 0.45;
        const x = Math.cos(angle) * labelRadius;
        const y = Math.sin(angle) * labelRadius;
        return (
          <sprite key={i} position={[x, y, 0]} scale={[0.6, 0.18, 1]}>
            <spriteMaterial
              color={RASHI_COLORS[i]}
              transparent
              opacity={0.7}
            />
          </sprite>
        );
      })}
    </group>
  );
}

function PlanetOrb({ name, longitude, radius = 2.2 }) {
  const orbRef = useRef();
  const angle = (longitude / 360) * Math.PI * 2;
  const orbRadius = radius - 0.35;
  const x = Math.cos(angle) * orbRadius;
  const y = Math.sin(angle) * orbRadius;
  const color = GRAHA_COLORS[name] || '#ffffff';
  const orbSize = name === 'Sun' || name === 'Moon' ? 0.12 : 0.08;

  const pulsePhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (orbRef.current) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 2 + pulsePhase) * 0.15;
      orbRef.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={orbRef} position={[x, y, 0.1]}>
      <sphereGeometry args={[orbSize, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.3}
        metalness={0.5}
      />
    </mesh>
  );
}

function LagnaBeam({ lagnaLongitude, radius = 2.2 }) {
  const beamRef = useRef();
  const angle = (lagnaLongitude / 360) * Math.PI * 2;
  const innerR = radius - 0.6;
  const outerR = radius + 0.3;

  const points = useMemo(() => [
    new THREE.Vector3(Math.cos(angle) * innerR, Math.sin(angle) * innerR, 0.05),
    new THREE.Vector3(Math.cos(angle) * outerR, Math.sin(angle) * outerR, 0.05),
  ], [angle, innerR, outerR]);

  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame(({ clock }) => {
    if (beamRef.current) {
      beamRef.current.material.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
    }
  });

  return (
    <line ref={beamRef} geometry={geo}>
      <lineBasicMaterial color="#FBBF24" transparent opacity={0.8} linewidth={2} />
    </line>
  );
}

function RotationController({ groupRef }) {
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const autoRotateSpeed = 0.002;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!isDragging.current) {
      groupRef.current.rotation.z += autoRotateSpeed;
      groupRef.current.rotation.x += velocity.current.x * 0.95;
      groupRef.current.rotation.z += velocity.current.y * 0.95;
      velocity.current.x *= 0.92;
      velocity.current.y *= 0.92;
    }
  });

  return null;
}

export default function ZodiacSphereScene({ planets = [], lagnaLongitude = 0 }) {
  const groupRef = useRef();

  return (
    <group ref={groupRef}>
      <RotationController groupRef={groupRef} />
      <ZodiacRing />
      <RashiLabels />
      {planets.map((p, i) => (
        <PlanetOrb key={p.name || i} name={p.name} longitude={p.longitude || 0} />
      ))}
      {lagnaLongitude !== undefined && <LagnaBeam lagnaLongitude={lagnaLongitude} />}
    </group>
  );
}
