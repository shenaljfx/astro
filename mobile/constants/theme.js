/**
 * Nakath AI - "Celestial Flow" Design System v3.0
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
  deepVoid: '#020010',
  auroraGreen: '#00FFB3',
  auroraGreenGlow: 'rgba(0,255,179,0.22)',
  plasmaBlue: '#4CC9F0',
  plasmaBlueGlow: 'rgba(76,201,240,0.25)',
  solarAmber: '#FF8C00',
  solarAmberGlow: 'rgba(255,140,0,0.30)',
  stardustSilver: 'rgba(226,232,240,0.10)',

  // Background layers (richer indigo range)
  background: '#020010',
  backgroundMid: '#0C0628',
  backgroundLight: '#150D3A',
  backgroundCard: 'rgba(20,12,50,0.65)',
  backgroundCardHover: 'rgba(28,18,60,0.75)',
  backgroundInput: 'rgba(24,16,55,0.70)',
  backgroundModal: 'rgba(2,0,16,0.94)',

  // Surface layers - Glass depth
  surface: 'rgba(20,12,50,0.65)',
  surfaceLight: 'rgba(30,20,65,0.60)',
  surfaceElevated: 'rgba(40,28,75,0.50)',
  surfacePressed: 'rgba(15,8,40,0.75)',

  // Glass tokens
  glass: 'rgba(18,10,45,0.50)',
  glassBorder: 'rgba(255,255,255,0.07)',
  glassHighlight: 'rgba(255,255,255,0.10)',
  glassShine: 'rgba(255,255,255,0.03)',

  // Text hierarchy
  textPrimary: '#F1F5F9',
  textSecondary: 'rgba(180,190,210,0.90)',
  textMuted: 'rgba(140,150,175,0.70)',
  textAccent: '#FFD666',
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
  border: 'rgba(255,255,255,0.05)',
  borderLight: 'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(180,122,255,0.40)',
  borderAccent: 'rgba(255,184,0,0.25)',
  borderSubtle: 'rgba(255,255,255,0.03)',

  // Card-specific
  cardGlow: 'rgba(180,122,255,0.12)',
  cardBorderHero: 'rgba(255,184,0,0.18)',
  cardBorderContent: 'rgba(255,255,255,0.06)',
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
    shadowColor: 'rgba(180,122,255,0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: 'rgba(180,122,255,0.45)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: 'rgba(180,122,255,0.55)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: {
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 12,
  },
  cardFloat: {
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 10,
  },
  softGlow: {
    shadowColor: 'rgba(180,122,255,0.20)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
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
  displayXXL: { fontSize: 40, fontWeight: '900', letterSpacing: 3, lineHeight: 48 },
  displayXL:  { fontSize: 32, fontWeight: '800', letterSpacing: 2, lineHeight: 38 },
  title1: { fontSize: 26, fontWeight: '800', letterSpacing: 1.5, lineHeight: 32 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 1,   lineHeight: 28 },
  title3: { fontSize: 18, fontWeight: '700', letterSpacing: 0.8, lineHeight: 24 },
  body:   { fontSize: 15, fontWeight: '400', letterSpacing: 0.2, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400', letterSpacing: 0.1, lineHeight: 22 },
  bodySm: { fontSize: 13, fontWeight: '400', letterSpacing: 0,   lineHeight: 20 },
  label:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, lineHeight: 16, textTransform: 'uppercase' },
  caption:{ fontSize: 11, fontWeight: '500', letterSpacing: 0.8, lineHeight: 16 },
  statLg: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, lineHeight: 42 },
  statMd: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, lineHeight: 34 },
  statSm: { fontSize: 20, fontWeight: '700', letterSpacing: 0,    lineHeight: 26 },
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
  auroraRise:    ['#00FFB3', '#4CC9F0', '#9333EA'],
  sunriseFire:   ['#FF8C00', '#FFB800', '#FFD666'],
  cosmicRose:    ['#FF6B9D', '#9333EA', '#6366F1'],
  deepSpace:     ['#020010', '#0C0628', '#150D3A'],
  deepSpaceReverse: ['#150D3A', '#0C0628', '#020010'],
  cardSheen:     ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)'],
  glassBlue:     ['rgba(30,20,65,0.65)', 'rgba(15,10,40,0.50)'],
  glassPurple:   ['rgba(50,20,90,0.55)', 'rgba(18,10,45,0.50)'],
  glassGold:     ['rgba(70,45,10,0.40)', 'rgba(20,12,4,0.45)'],
  heroCard:      ['rgba(40,18,75,0.60)', 'rgba(12,6,32,0.75)'],
  contentCard:   ['rgba(20,12,50,0.55)', 'rgba(10,6,28,0.65)'],
  surfaceCard:   ['rgba(12,8,30,0.60)', 'rgba(8,4,20,0.70)'],
};
