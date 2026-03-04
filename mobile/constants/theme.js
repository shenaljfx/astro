/**
 * Nakath AI - World-Class Celestial Design System
 * Premium dark theme with refined color science, depth layers, & micro-design tokens
 */

export const Colors = {
  // Primary palette - Refined Nebula Purple
  primary: '#9333EA',
  primaryLight: '#C084FC',
  primaryDark: '#581C87',
  primaryMuted: 'rgba(147,51,234,0.15)',
  primaryGlow: 'rgba(192,132,252,0.35)',

  // Accent - Celestial Gold
  accent: '#FBBF24',
  accentLight: '#FDE68A',
  accentDark: '#B45309',
  accentMuted: 'rgba(251,191,36,0.15)',
  accentGlow: 'rgba(251,191,36,0.35)',

  // Secondary - Nebula Blue
  secondary: '#3B82F6',
  secondaryLight: '#93C5FD',
  secondaryDark: '#1E3A8A',

  // Tertiary - Cosmic Teal
  teal: '#06B6D4',
  tealLight: '#22D3EE',
  tealDark: '#0E7490',

  // Background layers
  background: '#04030C',
  backgroundLight: '#0B0A1C',
  backgroundCard: 'rgba(16,18,48,0.55)',
  backgroundCardHover: 'rgba(24,26,64,0.65)',
  backgroundInput: 'rgba(24,30,72,0.65)',
  backgroundModal: 'rgba(4,3,12,0.92)',

  // Surface layers - Glass depth
  surface: 'rgba(37,34,80,0.55)',
  surfaceLight: 'rgba(49,46,107,0.65)',
  surfaceElevated: 'rgba(56,52,120,0.45)',
  surfacePressed: 'rgba(30,27,70,0.7)',

  // Glass tokens
  glass: 'rgba(21,25,59,0.45)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.12)',
  glassShine: 'rgba(255,255,255,0.04)',

  // Text hierarchy
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textAccent: '#FDE047',
  textGlow: '#E2E8F0',
  textDisabled: '#475569',

  // Status
  success: '#10B981',
  successGlow: 'rgba(16,185,129,0.2)',
  warning: '#F59E0B',
  warningGlow: 'rgba(245,158,11,0.2)',
  danger: '#EF4444',
  dangerGlow: 'rgba(239,68,68,0.2)',
  info: '#3B82F6',
  infoGlow: 'rgba(59,130,246,0.2)',

  // Rahu Kalaya
  rahuActive: '#E11D48',
  rahuInactive: '#059669',

  // Scores
  scoreExcellent: '#10B981',
  scoreGood: '#3B82F6',
  scoreAverage: '#FBBF24',
  scorePoor: '#EF4444',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.12)',
  borderFocus: 'rgba(147,51,234,0.4)',
  borderAccent: 'rgba(251,191,36,0.3)',
  borderSubtle: 'rgba(255,255,255,0.03)',
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const FontSizes = {
  xxs: 9,
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
  display: 48,
};

export const FontWeights = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
  black: '900',
};

export const BorderRadius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: 'rgba(147,51,234,0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: 'rgba(147,51,234,0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: 'rgba(147,51,234,0.6)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: {
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 15,
  },
  cardFloat: {
    shadowColor: 'rgba(0,0,0,0.6)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const Animations = {
  spring: { damping: 15, stiffness: 150, mass: 1 },
  springBouncy: { damping: 8, stiffness: 300, mass: 0.8 },
  springSmooth: { damping: 20, stiffness: 120, mass: 1 },
  pressIn: { damping: 15, stiffness: 300 },
  pressOut: { damping: 12, stiffness: 200 },
};
