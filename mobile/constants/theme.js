import { boxShadow, textShadow } from '../utils/shadow';
/**
 * Grahachara - "Celestial Flow" Design System v3.0
 * CosmicVibe-inspired: lush gradients, calming motion, warm cosmic palette
 * Deep indigo base, warm gold accents, aurora green highlights
 */

export const Colors = {
  // Primary palette - Soft Nebula Purple
  primary: '#9333EA',
  primaryLight: '#B47AFF',
  primaryDark: '#581C87',
  primaryMuted: 'rgba(147,51,234,0.15)',
  primaryGlow: 'rgba(180,122,255,0.30)',

  // Accent - Warm Celestial Gold
  accent: '#FFB800',
  accentLight: '#FFD666',
  accentDark: '#B45309',
  accentMuted: 'rgba(255,184,0,0.15)',
  accentGlow: 'rgba(255,184,0,0.30)',

  // Secondary - Nebula Blue
  secondary: '#3B82F6',
  secondaryLight: '#93C5FD',
  secondaryDark: '#1E3A8A',

  // Tertiary - Cosmic Teal
  teal: '#06B6D4',
  tealLight: '#22D3EE',
  tealDark: '#0E7490',

  // Extended palette
  cosmicRose: '#FF6B9D',
  cosmicRoseGlow: 'rgba(255,107,157,0.25)',
  deepVoid: '#04030C',
  auroraGreen: '#00FFB3',
  auroraGreenGlow: 'rgba(0,255,179,0.22)',
  plasmaBlue: '#4CC9F0',
  plasmaBlueGlow: 'rgba(76,201,240,0.25)',
  solarAmber: '#FF8C00',
  solarAmberGlow: 'rgba(255,140,0,0.30)',
  stardustSilver: 'rgba(226,232,240,0.10)',

  // Background layers (warm cosmic dark)
  background: '#04030C',
  backgroundMid: '#0A0714',
  backgroundLight: '#120E1E',
  backgroundCard: 'rgba(16,10,8,0.65)',
  backgroundCardHover: 'rgba(24,16,12,0.75)',
  backgroundInput: 'rgba(20,14,10,0.70)',
  backgroundModal: 'rgba(4,3,12,0.94)',

  // Surface layers - Glass depth
  surface: 'rgba(16,10,8,0.65)',
  surfaceLight: 'rgba(24,16,12,0.60)',
  surfaceElevated: 'rgba(32,22,16,0.50)',
  surfacePressed: 'rgba(12,8,6,0.75)',

  // Glass tokens
  glass: 'rgba(14,10,6,0.50)',
  glassBorder: 'rgba(255,255,255,0.07)',
  glassHighlight: 'rgba(255,255,255,0.10)',
  glassShine: 'rgba(255,255,255,0.03)',

  // Text hierarchy — Golden celestial shades
  textPrimary: '#FFE8B0',
  textSecondary: 'rgba(255,220,140,0.85)',
  textMuted: 'rgba(255,200,100,0.55)',
  textAccent: '#FFD666',
  textGlow: '#FFE8A0',
  textDisabled: '#6B5A3A',
  textShadowGold: 'rgba(255,184,0,0.25)',

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
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(180,122,255,0.40)',
  borderAccent: 'rgba(255,184,0,0.25)',
  borderSubtle: 'rgba(255,255,255,0.03)',

  // Card-specific
  cardGlow: 'rgba(180,122,255,0.12)',
  cardBorderHero: 'rgba(255,184,0,0.18)',
  cardBorderContent: 'rgba(255,255,255,0.06)',

  // Button — Premium Orange Glow
  buttonPrimary: '#FF8C00',
  buttonPrimaryLight: '#FFB800',
  buttonPrimaryDark: '#E07800',
  buttonGlow: 'rgba(255,140,0,0.50)',
  buttonGlowStrong: 'rgba(255,140,0,0.70)',
  buttonBorder: 'rgba(255,184,0,0.35)',
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
  sectionGap: 28,
  cardPadding: 20,
};

export const FontSizes = {
  xxs: 10,
  xs: 11,
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
    ...boxShadow('rgba(180,122,255,0.35)', { width: 0, height: 2 }, 1, 6),
    elevation: 3,
  },
  md: {
    ...boxShadow('rgba(180,122,255,0.45)', { width: 0, height: 4 }, 1, 12),
    elevation: 5,
  },
  lg: {
    ...boxShadow('rgba(180,122,255,0.55)', { width: 0, height: 8 }, 1, 24),
    elevation: 10,
  },
  glow: {
    ...boxShadow('#FF8C00', { width: 0, height: 0 }, 0.8, 18),
    elevation: 14,
  },
  buttonGlow: {
    ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.9, 20),
    elevation: 16,
  },
  cardFloat: {
    ...boxShadow('rgba(0,0,0,0.5)', { width: 0, height: 10 }, 1, 18),
    elevation: 10,
  },
  softGlow: {
    ...boxShadow('rgba(180,122,255,0.20)', { width: 0, height: 0 }, 1, 20),
    elevation: 6,
  },
};

export const Animations = {
  spring: { damping: 15, stiffness: 150, mass: 1 },
  springBouncy: { damping: 8, stiffness: 300, mass: 0.8 },
  springSmooth: { damping: 20, stiffness: 120, mass: 1 },
  pressIn: { damping: 15, stiffness: 300 },
  pressOut: { damping: 12, stiffness: 200 },
  gentleBreathe: 10000,
  slowDrift: 18000,
  auroraWave: 14000,
};

/**
 * Typography - "Celestial Type"
 */
export const Typography = {
  displayXXL: { fontSize: 40, fontWeight: '900', letterSpacing: 3, lineHeight: 48, ...textShadow('rgba(255,184,0,0.30)', { width: 0, height: 2 }, 10) },
  displayXL:  { fontSize: 32, fontWeight: '800', letterSpacing: 2, lineHeight: 38, ...textShadow('rgba(255,184,0,0.28)', { width: 0, height: 2 }, 8) },
  title1: { fontSize: 26, fontWeight: '800', letterSpacing: 1.5, lineHeight: 32, ...textShadow('rgba(255,184,0,0.22)', { width: 0, height: 1 }, 6) },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 1,   lineHeight: 28, ...textShadow('rgba(255,184,0,0.18)', { width: 0, height: 1 }, 5) },
  title3: { fontSize: 18, fontWeight: '700', letterSpacing: 0.8, lineHeight: 24, ...textShadow('rgba(255,184,0,0.15)', { width: 0, height: 1 }, 4) },
  body:   { fontSize: 15, fontWeight: '400', letterSpacing: 0.2, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400', letterSpacing: 0.1, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400', letterSpacing: 0,   lineHeight: 20 },
  label:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, lineHeight: 16, textTransform: 'uppercase' },
  caption:{ fontSize: 11, fontWeight: '500', letterSpacing: 0.8, lineHeight: 16 },
  statLg: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, lineHeight: 42, ...textShadow('rgba(255,184,0,0.30)', { width: 0, height: 2 }, 10) },
  statMd: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 34, ...textShadow('rgba(255,184,0,0.25)', { width: 0, height: 1 }, 8) },
  statSm: { fontSize: 20, fontWeight: '700', letterSpacing: 0,    lineHeight: 26, ...textShadow('rgba(255,184,0,0.20)', { width: 0, height: 1 }, 6) },
  sinhalaBody: { fontSize: 15, fontWeight: '400', letterSpacing: 0.3, lineHeight: 28 },
  sinhalaSm:   { fontSize: 13, fontWeight: '400', letterSpacing: 0.2, lineHeight: 22 },
  sinhalaMd:   { fontSize: 14, fontWeight: '500', letterSpacing: 0.2, lineHeight: 24 },
};

/**
 * Gradient presets - CosmicVibe-inspired lush color flows
 */
export const Gradients = {
  nebulaPurple:  ['#9333EA', '#6366F1', '#3B82F6'],
  celestialGold: ['#FFB800', '#F59E0B', '#D97706'],
  // Premium orange button gradient
  orangeButton:  ['#FF8C00', '#FF6D00', '#E65100'],
  orangeButtonHover: ['#FFB800', '#FF8C00', '#FF6D00'],
  auroraRise:    ['#00FFB3', '#4CC9F0', '#9333EA'],
  sunriseFire:   ['#FF8C00', '#FFB800', '#FFD666'],
  cosmicRose:    ['#FF6B9D', '#9333EA', '#6366F1'],
  deepSpace:     ['#04030C', '#0A0714', '#120E1E'],
  deepSpaceReverse: ['#120E1E', '#0A0714', '#04030C'],
  cardSheen:     ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)'],
  glassBlue:     ['rgba(20,14,10,0.65)', 'rgba(10,8,6,0.50)'],
  glassPurple:   ['rgba(30,16,10,0.55)', 'rgba(14,10,6,0.50)'],
  glassGold:     ['rgba(70,45,10,0.40)', 'rgba(20,12,4,0.45)'],
  heroCard:      ['rgba(20,14,8,0.60)', 'rgba(10,6,4,0.75)'],
  contentCard:   ['rgba(16,10,6,0.55)', 'rgba(8,5,3,0.65)'],
  surfaceCard:   ['rgba(10,7,4,0.60)', 'rgba(6,4,3,0.70)'],
};
