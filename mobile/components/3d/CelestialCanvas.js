/**
 * CelestialCanvas — R3F <Canvas> wrapper with expo-gl context,
 * camera defaults, ambient + directional lighting, and a 2D fallback
 * for devices that can't create a GL context.
 */
import React, { useState, useCallback, Suspense } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Canvas } from '@react-three/fiber/native';

function FallbackBox({ width, height, children }) {
  return (
    <View style={[styles.fallback, { width, height }]}>
      {children || <Text style={styles.fallbackText}>3D not available</Text>}
    </View>
  );
}

export default function CelestialCanvas({
  children,
  width = 300,
  height = 300,
  cameraPosition = [0, 0, 5],
  cameraFov = 50,
  fallback = null,
  style,
  onCreated,
}) {
  const [glFailed, setGlFailed] = useState(false);

  const handleCreated = useCallback(
    (state) => {
      if (onCreated) onCreated(state);
    },
    [onCreated]
  );

  if (glFailed) {
    return <FallbackBox width={width} height={height}>{fallback}</FallbackBox>;
  }

  return (
    <View style={[{ width, height }, style]}>
      <Canvas
        style={{ width, height }}
        camera={{ position: cameraPosition, fov: cameraFov, near: 0.1, far: 1000 }}
        gl={{ preserveDrawingBuffer: true }}
        onCreated={handleCreated}
        onError={() => setGlFailed(true)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#C084FC" />
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,5,25,0.8)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});
