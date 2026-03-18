import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, BorderRadius, Spacing, Shadows, Gradients } from '../../constants/theme';

const VARIANT_CONFIG = {
  hero: {
    gradient: Gradients.heroCard,
    borderColor: Colors.cardBorderHero,
    borderWidth: 1,
    shadow: Shadows.softGlow,
  },
  content: {
    gradient: Gradients.contentCard,
    borderColor: Colors.cardBorderContent,
    borderWidth: 1,
    shadow: Shadows.sm,
  },
  surface: {
    gradient: Gradients.surfaceCard,
    borderColor: Colors.borderSubtle,
    borderWidth: 0.5,
    shadow: null,
  },
};

export default function CosmicCard({
  variant = 'content',
  glow = false,
  accentColor,
  children,
  style,
  delay = 0,
  animated = true,
  noPadding = false,
}) {
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.content;
  const borderColor = accentColor
    ? (typeof accentColor === 'string' ? accentColor : Colors.cardBorderHero)
    : config.borderColor;

  const inner = (
    <View
      style={[
        styles.wrapper,
        config.shadow,
        glow && styles.glowShadow,
        style,
      ]}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderColor, borderWidth: config.borderWidth },
          noPadding && { padding: 0 },
        ]}
      >
        {children}
      </LinearGradient>
    </View>
  );

  if (!animated) return inner;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500).springify()}>
      {inner}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.cardPadding,
    overflow: 'hidden',
  },
  glowShadow: {
    shadowColor: Colors.primaryGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
});
