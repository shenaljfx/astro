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

// ────────────────────────────────────────────────────────────
//  Layout — fixed chrome dimensions used by useScreenInsets
//  and the <Screen> wrapper. Keep these in sync with the
//  TabBar in (tabs)/_layout.js and the floating headers.
// ────────────────────────────────────────────────────────────
export const Layout = {
  // Fixed visual height of floating headers in tab screens.
  headerHeight: 64,
  // Tab bar visual height (excluding bottom safe-area inset).
  tabBarHeight: 88,
  // Maximum content width on tablets / desktop. Tab screens centre
  // their ScrollView at this width to avoid 100ch-wide text columns.
  maxContent: 680,
  // Breakpoint widths.
  breakpointNarrow: 360,   // small Androids / iPhone SE 1
  breakpointTablet: 600,   // smallest dimension >= this → tablet
  breakpointDesktop: 1024,
};

/**
 * scaledFont(size, scale) — multiply a base font size by the clamped
 * scale factor from useResponsive(). Keeps text readable across
 * 320dp phones and 11" tablets without overshooting.
 */
export function scaledFont(size, scale) {
  if (!scale || scale === 1) return size;
  return Math.round(size * scale);
}


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

/**
 * ────────────────────────────────────────────────────────────
 *  Runtime Palettes — used by ThemeContext / useTheme().
 *  Two modes share the same semantic keys so screens can read
 *  `colors.bg`, `colors.surface`, `colors.text` etc. without
 *  caring which mode is active.
 *
 *  Legacy `Colors` / `Gradients` exports above remain unchanged
 *  for back-compat with the ~10 files that import them today.
 * ────────────────────────────────────────────────────────────
 */
const _lightPalette = {
  mode: 'light',
  // Backgrounds — Warm sandstone / parchment
  bg: '#FAF6EE',
  bgMid: '#F2EBDC',
  bgDeep: '#E8DFC8',
  surface: '#FFFFFF',
  surfaceMuted: '#F5EFE2',
  surfaceElevated: '#FFFEFA',
  surfacePressed: '#EDE6D4',
  // Brand — Deep amethyst (richer than before)
  primary: '#6B46C1',
  primaryLight: '#9F7AEA',
  primaryDark: '#4C2E8A',
  primaryMuted: 'rgba(107,70,193,0.08)',
  primaryGlow: 'rgba(107,70,193,0.14)',
  // Accent — Burnished brass / antiqued gold
  accent: '#B8860B',
  accentLight: '#D4A732',
  accentDark: '#8B6914',
  accentMuted: 'rgba(184,134,11,0.10)',
  accentGlow: 'rgba(184,134,11,0.18)',
  // Sage / nature
  sage: '#3D8B6E',
  sageMuted: 'rgba(61,139,110,0.10)',
  // Text — Deep sepia ink
  text: '#2C2418',
  textPrimary: '#2C2418',
  textSecondary: '#5C5244',
  textMuted: '#9A8E7E',
  textAccent: '#8B6914',
  textOnAccent: '#FFFDF6',
  textDisabled: '#C4BAA8',
  // Borders — Warm, earthy
  border: 'rgba(44,36,24,0.08)',
  borderLight: 'rgba(44,36,24,0.04)',
  borderFocus: 'rgba(107,70,193,0.25)',
  borderAccent: 'rgba(184,134,11,0.25)',
  // Glass / nav (warm frosted cream)
  glass: 'rgba(255,253,246,0.82)',
  glassBorder: 'rgba(44,36,24,0.06)',
  glassHighlight: 'rgba(255,255,255,0.60)',
  // Status — Earthy tones
  success: '#3D8B6E',
  warning: '#C48A22',
  danger: '#B84233',
  info: '#4A7FB5',
  // Per-tab accents
  tabHome: '#B8860B',
  tabKendara: '#4A7FB5',
  tabReport: '#C48A22',
  tabPorondam: '#7B6DAD',
  tabChat: '#4A7FB5',
  // Extended tokens for screen compat
  secondary: '#4A7FB5',
  secondaryLight: '#7BA4CC',
  teal: '#3D8B6E',
  cosmicRose: '#B85A6A',
  auroraGreen: '#3D8B6E',
  cardGlow: 'rgba(184,134,11,0.10)',
  cardBorderHero: 'rgba(184,134,11,0.18)',
  cardBorderContent: 'rgba(44,36,24,0.06)',
  backgroundCard: '#FFFEFA',
  backgroundCardHover: '#FFFFFF',
  backgroundInput: '#F5EFE2',
  backgroundModal: 'rgba(250,246,238,0.97)',
  buttonPrimary: '#B8860B',
  buttonPrimaryLight: '#D4A732',
  buttonPrimaryDark: '#8B6914',
  buttonGlow: 'rgba(184,134,11,0.35)',
  buttonBorder: 'rgba(184,134,11,0.30)',
  statusBarStyle: 'dark-content',
  // Home-specific tokens
  bgCard: '#FFFEFA',
  bgWarm: '#F2EBDC',
  gold: '#B8860B',
  goldLight: '#D4A732',
  goldDark: '#8B6914',
  goldShimmer: '#E8D09C',
  goldMuted: 'rgba(184,134,11,0.08)',
  goldGlow: 'rgba(184,134,11,0.14)',
  goldBorder: 'rgba(184,134,11,0.12)',
  goldSubtle: 'rgba(184,134,11,0.04)',
  textGold: '#8B6914',
  textLight: '#B8A078',
  successBg: 'rgba(61,139,110,0.07)',
  dangerBg: 'rgba(184,66,51,0.07)',
  warningBg: 'rgba(196,138,34,0.07)',
  purple: '#7B6DAD',
  purpleBg: 'rgba(123,109,173,0.07)',
  blue: '#4A7FB5',
  blueBg: 'rgba(74,127,181,0.07)',
  rose: '#B85A6A',
  roseBg: 'rgba(184,90,106,0.07)',
  tealBg: 'rgba(61,139,110,0.07)',
  shadow: 'rgba(184,134,11,0.08)',
  divider: 'rgba(184,134,11,0.06)',
  // Rahu
  rahuActive: '#B84233',
  rahuInactive: '#3D8B6E',
  // Scores
  scoreExcellent: '#3D8B6E',
  scoreGood: '#4A7FB5',
  scoreAverage: '#C48A22',
  scorePoor: '#B84233',
};

const _duskPalette = {
  mode: 'dusk',
  // Backgrounds — Soft indigo (no pure black)
  bg: '#1A1730',
  bgMid: '#221E3C',
  bgDeep: '#13102A',
  surface: '#252046',
  surfaceMuted: '#1F1B3A',
  surfaceElevated: '#2C2752',
  surfacePressed: '#181530',
  // Brand
  primary: '#B7A6F0',
  primaryLight: '#D4C7FF',
  primaryDark: '#7C5BD6',
  primaryMuted: 'rgba(183,166,240,0.15)',
  primaryGlow: 'rgba(183,166,240,0.30)',
  // Accent — gold
  accent: '#E8C07A',
  accentLight: '#F4D899',
  accentDark: '#B8945A',
  accentMuted: 'rgba(232,192,122,0.15)',
  accentGlow: 'rgba(232,192,122,0.30)',
  // Sage
  sage: '#6FBFA0',
  sageMuted: 'rgba(111,191,160,0.15)',
  // Text
  text: '#F0EAFA',
  textPrimary: '#F0EAFA',
  textSecondary: 'rgba(240,234,250,0.78)',
  textMuted: 'rgba(240,234,250,0.50)',
  textAccent: '#F4D899',
  textOnAccent: '#1A1730',
  textDisabled: 'rgba(240,234,250,0.30)',
  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  borderFocus: 'rgba(183,166,240,0.40)',
  borderAccent: 'rgba(232,192,122,0.30)',
  // Glass (dark frosted)
  glass: 'rgba(26,23,48,0.65)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.06)',
  // Status
  success: '#6FBFA0',
  warning: '#E8C07A',
  danger: '#E07A7A',
  info: '#8AA8E0',
  // Per-tab accents (full saturation, dark bg)
  tabHome: '#D4A056',
  tabKendara: '#7B9CC4',
  tabReport: '#E8C07A',
  tabPorondam: '#9B8ABF',
  tabChat: '#7B9CC4',
  // Extended tokens for screen compat
  secondary: '#8AA8E0',
  secondaryLight: '#A8C0F0',
  teal: '#6FBFA0',
  cosmicRose: '#E07A9A',
  auroraGreen: '#6FBFA0',
  cardGlow: 'rgba(183,166,240,0.12)',
  cardBorderHero: 'rgba(232,192,122,0.18)',
  cardBorderContent: 'rgba(255,255,255,0.06)',
  backgroundCard: 'rgba(37,32,70,0.65)',
  backgroundCardHover: 'rgba(44,39,82,0.75)',
  backgroundInput: 'rgba(31,27,58,0.70)',
  backgroundModal: 'rgba(26,23,48,0.96)',
  buttonPrimary: '#E8C07A',
  buttonPrimaryLight: '#F4D899',
  buttonPrimaryDark: '#B8945A',
  buttonGlow: 'rgba(232,192,122,0.50)',
  buttonBorder: 'rgba(232,192,122,0.35)',
  statusBarStyle: 'light-content',
  // Home-specific tokens
  bgCard: '#252046',
  bgWarm: '#1F1B3A',
  gold: '#E8C07A',
  goldLight: '#F4D899',
  goldDark: '#B8945A',
  goldShimmer: '#F4D899',
  goldMuted: 'rgba(232,192,122,0.15)',
  goldGlow: 'rgba(232,192,122,0.22)',
  goldBorder: 'rgba(232,192,122,0.15)',
  goldSubtle: 'rgba(232,192,122,0.06)',
  textGold: '#E8C07A',
  textLight: '#B8945A',
  successBg: 'rgba(111,191,160,0.12)',
  dangerBg: 'rgba(224,122,122,0.12)',
  warningBg: 'rgba(232,192,122,0.12)',
  purple: '#B7A6F0',
  purpleBg: 'rgba(183,166,240,0.12)',
  blue: '#8AA8E0',
  blueBg: 'rgba(138,168,224,0.12)',
  rose: '#E07A9A',
  roseBg: 'rgba(224,122,154,0.12)',
  tealBg: 'rgba(111,191,160,0.12)',
  shadow: 'rgba(183,166,240,0.15)',
  divider: 'rgba(255,255,255,0.06)',
  // Rahu
  rahuActive: '#E07A7A',
  rahuInactive: '#6FBFA0',
  // Scores
  scoreExcellent: '#6FBFA0',
  scoreGood: '#8AA8E0',
  scoreAverage: '#E8C07A',
  scorePoor: '#E07A7A',
};

const _lightGradients = {
  bg: ['#FAF6EE', '#F2EBDC', '#E8DFC8'],
  hero: ['#FFFEFA', '#FAF6EE'],
  card: ['#FFFEFA', '#F5EFE2'],
  accent: ['#D4A732', '#B8860B', '#8B6914'],
  primary: ['#9F7AEA', '#6B46C1', '#4C2E8A'],
  aurora: ['rgba(184,134,11,0.06)', 'rgba(107,70,193,0.05)', 'rgba(61,139,110,0.04)'],
  deepSpace: ['#FAF6EE', '#F2EBDC', '#E8DFC8'],
  orangeButton: ['#D4A732', '#B8860B', '#8B6914'],
  heroCard: ['#FFFEFA', '#FAF6EE'],
  surfaceCard: ['#FFFEFA', '#F5EFE2'],
  nebulaPurple: ['#9F7AEA', '#6B46C1', '#4C2E8A'],
  profileHero: ['#F2EBDC', '#E8DFC8', '#DDD3BD'],
  celestialGold: ['#D4A732', '#B8860B', '#8B6914'],
};

const _duskGradients = {
  bg: ['#1A1730', '#221E3C', '#13102A'],
  hero: ['#2C2752', '#1A1730'],
  card: ['rgba(37,32,70,0.85)', 'rgba(26,23,48,0.92)'],
  accent: ['#F4D899', '#E8C07A', '#B8945A'],
  primary: ['#D4C7FF', '#B7A6F0', '#7C5BD6'],
  aurora: ['rgba(232,192,122,0.18)', 'rgba(183,166,240,0.14)', 'rgba(111,191,160,0.10)'],
  deepSpace: ['#13102A', '#1A1730', '#221E3C'],
  orangeButton: ['#E8C07A', '#D4A056', '#B8945A'],
  heroCard: ['rgba(44,39,82,0.60)', 'rgba(26,23,48,0.75)'],
  surfaceCard: ['rgba(37,32,70,0.60)', 'rgba(31,27,58,0.70)'],
  nebulaPurple: ['#D4C7FF', '#B7A6F0', '#7C5BD6'],
  profileHero: ['#0D0720', '#08041A', '#050210'],
  celestialGold: ['#F4D899', '#E8C07A', '#B8945A'],
};

export const Palettes = {
  light: _lightPalette,
  dusk: _duskPalette,
};

export const ThemedGradients = {
  light: _lightGradients,
  dusk: _duskGradients,
};

/**
 * screenColors(colors) — derives commonly-used accent/text tokens
 * for screens that have large dark-themed stylesheets. Screens
 * can call this once and spread the result for inline overrides.
 */
export function screenColors(colors) {
  var isDusk = colors.mode === 'dusk';
  return {
    accent: colors.accent,
    accentLight: colors.accentLight,
    accentDark: colors.accentDark,
    accentMuted: colors.accentMuted,
    accentGlow: colors.accentGlow,
    text: colors.text,
    textSec: colors.textSecondary,
    textMuted: colors.textMuted,
    textAccent: colors.textAccent,
    bg: colors.bg,
    surface: colors.surface,
    surfaceMuted: colors.surfaceMuted,
    border: colors.border,
    borderLight: colors.borderLight,
    card: isDusk ? 'rgba(255,255,255,0.04)' : 'rgba(42,36,64,0.04)',
    cardBorder: isDusk ? 'rgba(255,255,255,0.07)' : 'rgba(42,36,64,0.08)',
    mutedOverlay: isDusk ? 'rgba(255,255,255,0.06)' : 'rgba(42,36,64,0.04)',
    labelColor: isDusk ? 'rgba(255,214,102,0.50)' : 'rgba(90,83,110,0.70)',
    faintText: isDusk ? 'rgba(255,214,102,0.40)' : 'rgba(90,83,110,0.55)',
    veryFaintText: isDusk ? 'rgba(255,214,102,0.35)' : 'rgba(90,83,110,0.45)',
    subtleBorder: isDusk ? 'rgba(255,255,255,0.04)' : 'rgba(42,36,64,0.05)',
    iconAccent: isDusk ? '#FFB800' : '#D4A056',
    sectionTitle: isDusk ? '#FFE8B0' : '#2A2440',
    statusBar: colors.statusBarStyle,
  };
}

