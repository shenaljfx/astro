import { TemplateType, CTAType } from './gemini';
import { VoiceKey } from './tts';

export type VisualTheme = 'cosmic-dark' | 'clean-modern' | 'mystic-gold';
export type ReelStatus = 'draft' | 'generated' | 'approved' | 'exported';
export type ReelDuration = 'short' | 'long';

export interface ReelConfig {
  id: string;
  templateType: TemplateType;
  sign?: string;
  date: string;
  duration: ReelDuration;
  theme: VisualTheme;
  voice: VoiceKey;
  cta: CTAType;
  status: ReelStatus;
  script?: {
    hook: string;
    body: string;
    cta: string;
    fullScript: string;
    hashtags: string[];
    captions: { tiktok: string; instagram: string; facebook: string };
    keyPhrases: string[];
    imageKeywords?: string[];
  };
  audio?: {
    url: string;
    duration: number;
    wordTimings: Array<{ word: string; start: number; end: number }>;
  };
  backgroundImages?: Array<{
    url: string;
    localPath: string;
    id: string;
    alt: string;
  }>;
  backgroundVideo?: {
    url: string;
    localPath: string;
    id: string;
    duration: number;
    previewUrl: string;
  };
  render?: {
    videoUrl: string;
    videoOnlyUrl: string;
    thumbnailUrl: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContentCalendarEntry {
  date: string;
  reels: ReelConfig[];
  platform: 'tiktok' | 'instagram' | 'facebook';
  scheduledTime?: string;
  posted: boolean;
}

export interface BatchGenerateOptions {
  templateType: TemplateType;
  date: string;
  duration: ReelDuration;
  theme: VisualTheme;
  voice: VoiceKey;
  cta: CTAType;
  signs?: string[]; // If empty, generate for all 12
}

// Template metadata for the UI
export const TEMPLATES: Record<TemplateType, { 
  name: string; 
  description: string; 
  icon: string;
  defaultDuration: ReelDuration;
  defaultCta: CTAType;
  requiresSign: boolean;
}> = {
  'daily-horoscope': {
    name: 'Daily Horoscope',
    description: 'Per-sign daily reading based on current Nakshatra & transits',
    icon: '☀️',
    defaultDuration: 'short',
    defaultCta: 'follow',
    requiresSign: true,
  },
  'weekly-lagna': {
    name: 'Weekly Lagna Forecast',
    description: 'Longer weekly overview per rising sign',
    icon: '📅',
    defaultDuration: 'long',
    defaultCta: 'follow',
    requiresSign: true,
  },
  'compatibility': {
    name: 'Compatibility Teaser',
    description: 'Sign pairing chemistry — viral engagement bait',
    icon: '💕',
    defaultDuration: 'short',
    defaultCta: 'free-chart',
    requiresSign: true,
  },
  'auspicious-times': {
    name: 'Auspicious Times',
    description: 'Best times this week to start new ventures',
    icon: '⏰',
    defaultDuration: 'short',
    defaultCta: 'download',
    requiresSign: false,
  },
  'yoga-of-day': {
    name: 'Yoga of the Day',
    description: 'Active planetary yoga and who benefits',
    icon: '🌟',
    defaultDuration: 'long',
    defaultCta: 'follow',
    requiresSign: false,
  },
  'educational': {
    name: 'Educational',
    description: 'Vedic astrology concepts explained for beginners',
    icon: '📚',
    defaultDuration: 'long',
    defaultCta: 'follow',
    requiresSign: false,
  },
  'app-promo': {
    name: 'App Promo',
    description: 'Feature showcase and testimonial-style content',
    icon: '📱',
    defaultDuration: 'short',
    defaultCta: 'download',
    requiresSign: false,
  },
};

export const VISUAL_THEMES: Record<VisualTheme, {
  name: string;
  description: string;
  colors: { bg: string; text: string; accent: string; secondary: string };
}> = {
  'cosmic-dark': {
    name: 'Cosmic Dark',
    description: 'Brand-consistent deep space theme',
    colors: { bg: '#04030C', text: '#FFFFFF', accent: '#9333EA', secondary: '#FBBF24' },
  },
  'clean-modern': {
    name: 'Clean Modern',
    description: 'Bright editorial style for Instagram',
    colors: { bg: '#FEFCE8', text: '#1C1917', accent: '#7C3AED', secondary: '#F59E0B' },
  },
  'mystic-gold': {
    name: 'Mystic Gold',
    description: 'Luxury dark with gold accents',
    colors: { bg: '#0C0A09', text: '#FEF3C7', accent: '#D97706', secondary: '#A855F7' },
  },
};

// Generate a unique ID
export function generateId(): string {
  return `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
