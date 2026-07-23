import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BorderRadius, Spacing, Shadows } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { boxShadow, textShadow } from '../../utils/shadow';

const LIGHT_VARIANTS = {
  hero: {
    gradient: ['#FFFFFF', '#FBF7F0'],
    borderColor: 'rgba(212,160,86,0.22)',
    borderWidth: 1,
    shadow: Shadows.softGlow,
  },
  content: {
    gradient: ['#FFFFFF', '#F9F5EC'],
    borderColor: 'rgba(212,160,86,0.12)',
    borderWidth: 1,
    shadow: Shadows.sm,
  },
  surface: {
    gradient: ['#F9F5EC', '#F3EBDD'],
    borderColor: 'rgba(212,160,86,0.10)',
    borderWidth: 0.5,
    shadow: null,
  },
};

// Gilt shadow-box language: deep-indigo glass panels rimmed with a gold
// hairline, so cards read as lit paper-cut layers floating over the art.
const DUSK_VARIANTS = {
  hero: {
    gradient: ['rgba(32,22,62,0.84)', 'rgba(18,12,40,0.9)'],
    borderColor: 'rgba(232,181,77,0.42)',
    borderWidth: 1.4,
    shadow: Shadows.softGlow,
  },
  content: {
    gradient: ['rgba(26,17,50,0.76)', 'rgba(20,13,40,0.8)', 'rgba(15,10,32,0.78)'],
    borderColor: 'rgba(232,181,77,0.26)',
    borderWidth: 1,
    shadow: Shadows.sm,
  },
  surface: {
    gradient: ['rgba(22,15,44,0.7)', 'rgba(14,9,32,0.76)'],
    borderColor: 'rgba(232,181,77,0.16)',
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
  const { colors, resolved } = useTheme();
  const VARIANT_CONFIG = resolved === 'light' ? LIGHT_VARIANTS : DUSK_VARIANTS;
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.content;
  const borderColor = accentColor
    ? (typeof accentColor === 'string' ? accentColor : colors.cardBorderHero)
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
    ...boxShadow('rgba(124,91,214,0.30)', { width: 0, height: 0 }, 0.6, 16),
    elevation: 8,
  },
});
