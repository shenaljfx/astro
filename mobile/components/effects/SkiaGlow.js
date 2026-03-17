/**
 * SkiaGlow — Radial glow effect using @shopify/react-native-skia.
 * Falls back to a View with shadow on platforms where Skia is unavailable.
 */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

let SkiaCanvas, SkiaCircle, SkiaBlurMask;
try {
  const Skia = require('@shopify/react-native-skia');
  SkiaCanvas = Skia.Canvas;
  SkiaCircle = Skia.Circle;
  SkiaBlurMask = Skia.BlurMask;
} catch (e) {
  SkiaCanvas = null;
}

export default function SkiaGlow({
  size = 120,
  color = '#9333EA',
  blur = 30,
  opacity = 0.5,
  style,
}) {
  if (!SkiaCanvas) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: opacity * 0.4,
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: blur,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <SkiaCanvas style={{ width: size, height: size }}>
        <SkiaCircle cx={size / 2} cy={size / 2} r={size / 3} color={color} opacity={opacity}>
          <SkiaBlurMask blur={blur} style="normal" />
        </SkiaCircle>
      </SkiaCanvas>
    </View>
  );
}
