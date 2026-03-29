/**
 * Per-page 3-color harmonized palettes
 * Each page gets 3 matching colors:
 *   c1 — Card/glass background (dark, translucent)
 *   c2 — Mid-tone surface / divider (warm mid-dark)
 *   c3 — Accent glow / highlight tint (rich, translucent)
 *
 * Plus bg (page background), text, and border accent helpers.
 * Colors are derived from the 3D aurora/nebula engine palettes
 * to ensure perfect visual harmony.
 */

export var PAGE_PALETTES = {
  // ── Today (index.js) — Golden ──
  golden: {
    bg: '#04030C',
    c1: 'rgba(14,10,4,0.55)',      // warm amber glass
    c2: 'rgba(22,16,6,0.50)',      // honey surface
    c3: 'rgba(255,180,30,0.12)',   // gold glow wash
    accent: '#FFB800',
    accentMuted: 'rgba(255,184,0,0.15)',
    accentBorder: 'rgba(255,184,0,0.25)',
    textPrimary: '#FFF1D0',
    textSecondary: '#EBCF8B',
    textMuted: '#8B7A52',
  },

  // ── Kendara (kendara.js) — Blue ──
  blue: {
    bg: '#020412',
    c1: 'rgba(4,8,22,0.55)',       // deep sapphire glass
    c2: 'rgba(8,14,32,0.50)',      // ocean surface
    c3: 'rgba(30,100,255,0.12)',   // blue glow wash
    accent: '#60A5FA',
    accentMuted: 'rgba(96,165,250,0.15)',
    accentBorder: 'rgba(96,165,250,0.25)',
    textPrimary: '#D6E8FF',
    textSecondary: '#8BB4E8',
    textMuted: '#4A6A8B',
  },

  // ── Report (report.js) — Green ──
  green: {
    bg: '#020C06',
    c1: 'rgba(4,14,8,0.55)',       // dark emerald glass
    c2: 'rgba(8,22,12,0.50)',      // forest surface
    c3: 'rgba(16,200,100,0.12)',   // jade glow wash
    accent: '#34D399',
    accentMuted: 'rgba(52,211,153,0.15)',
    accentBorder: 'rgba(52,211,153,0.25)',
    textPrimary: '#D0FFE8',
    textSecondary: '#8BE8BF',
    textMuted: '#4A8B6A',
  },

  // ── Porondam (porondam.js) — Pink ──
  pink: {
    bg: '#0C0208',
    c1: 'rgba(18,6,12,0.55)',      // dark rose glass
    c2: 'rgba(28,10,18,0.50)',     // magenta surface
    c3: 'rgba(236,72,153,0.12)',   // rose glow wash
    accent: '#F472B6',
    accentMuted: 'rgba(244,114,182,0.15)',
    accentBorder: 'rgba(244,114,182,0.25)',
    textPrimary: '#FFD6EB',
    textSecondary: '#E88BBF',
    textMuted: '#8B4A6A',
  },

  // ── Profile (profile.js) — Purple ──
  purple: {
    bg: '#06020C',
    c1: 'rgba(14,6,22,0.55)',      // dark amethyst glass
    c2: 'rgba(22,10,34,0.50)',     // violet surface
    c3: 'rgba(140,60,255,0.12)',   // purple glow wash
    accent: '#A78BFA',
    accentMuted: 'rgba(167,139,250,0.15)',
    accentBorder: 'rgba(167,139,250,0.25)',
    textPrimary: '#E8D6FF',
    textSecondary: '#BF8BE8',
    textMuted: '#6A4A8B',
  },

  // ── Chat (chat.js) — Orange ──
  orange: {
    bg: '#0C0602',
    c1: 'rgba(18,10,4,0.55)',      // dark ember glass
    c2: 'rgba(28,16,6,0.50)',      // flame surface
    c3: 'rgba(255,100,10,0.12)',   // ember glow wash
    accent: '#FF8C00',
    accentMuted: 'rgba(255,140,0,0.15)',
    accentBorder: 'rgba(255,140,0,0.25)',
    textPrimary: '#FFE8D0',
    textSecondary: '#E8BF8B',
    textMuted: '#8B6A4A',
  },
};

export default PAGE_PALETTES;
