import { VisualTheme } from './templates';

export interface PexelsImage {
  id: number;
  width: number;
  height: number;
  photographer: string;
  src: {
    original: string;
    large: string;
    medium: string;
    portrait: string;
  };
  alt: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  user: string;
  videoUrl: string;
  previewUrl: string;
  fileType: string;
}

export interface BackgroundImage {
  url: string;
  localPath: string;
  id: string;
  alt: string;
}

export interface BackgroundVideo {
  url: string;
  localPath: string;
  id: string;
  duration: number;
  previewUrl: string;
}

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export const SIGN_ELEMENTS: Record<string, ZodiacElement> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

export const SIGN_IMAGE_FILE: Record<string, string> = {
  Aries: '/zodiac/aries.png',
  Taurus: '/zodiac/taurus.png',
  Gemini: '/zodiac/gemini.png',
  Cancer: '/zodiac/cancer.png',
  Leo: '/zodiac/leo.png',
  Virgo: '/zodiac/virgo.png',
  Libra: '/zodiac/libra.png',
  Scorpio: '/zodiac/scorpio.png',
  Sagittarius: '/zodiac/sagittarius.png',
  Capricorn: '/zodiac/capricorn.png',
  Aquarius: '/zodiac/aquarius.png',
  Pisces: '/zodiac/pisces.png',
};

export const ELEMENT_QUERIES: Record<string, string[]> = {
  fire: [
    'golden sunset spiritual',
    'fire flames abstract dark',
    'warm golden light mystical',
    'sunrise orange sky dramatic',
    'candle flame meditation dark',
  ],
  earth: [
    'forest mystical dark',
    'crystal stones spiritual',
    'mountain sunrise peaceful',
    'green nature meditation',
    'ancient tree roots mystical',
  ],
  air: [
    'sky clouds ethereal purple',
    'stars night sky cosmic',
    'aurora borealis northern lights',
    'wind abstract flowing light',
    'butterfly ethereal spiritual',
  ],
  water: [
    'ocean moon night mystical',
    'underwater deep blue peaceful',
    'rain drops dark moody',
    'waterfall meditation spiritual',
    'moon reflection water night',
  ],
};

export const COSMIC_QUERIES = [
  'galaxy cosmos purple',
  'nebula space colorful',
  'meditation spiritual glow',
  'sacred geometry spiritual',
  'universe stars deep space',
];

export const ELEMENT_CSS_FALLBACKS: Record<ZodiacElement, {
  gradient: string;
  accentColor: string;
}> = {
  fire: {
    gradient: 'radial-gradient(ellipse at 40% 30%, rgba(251,146,60,0.25) 0%, transparent 55%), radial-gradient(ellipse at 60% 70%, rgba(220,38,38,0.18) 0%, transparent 50%), linear-gradient(180deg, #1a0a00 0%, #0c0a09 100%)',
    accentColor: '#fb923c',
  },
  water: {
    gradient: 'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.22) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(99,102,241,0.15) 0%, transparent 50%), linear-gradient(180deg, #020617 0%, #0c0a09 100%)',
    accentColor: '#3b82f6',
  },
  earth: {
    gradient: 'radial-gradient(ellipse at 50% 30%, rgba(34,197,94,0.18) 0%, transparent 55%), radial-gradient(ellipse at 40% 80%, rgba(120,113,108,0.15) 0%, transparent 50%), linear-gradient(180deg, #052e16 0%, #0c0a09 100%)',
    accentColor: '#22c55e',
  },
  air: {
    gradient: 'radial-gradient(ellipse at 40% 20%, rgba(168,85,247,0.2) 0%, transparent 55%), radial-gradient(ellipse at 60% 75%, rgba(186,230,253,0.12) 0%, transparent 50%), linear-gradient(180deg, #0c0a1a 0%, #0c0a09 100%)',
    accentColor: '#a855f7',
  },
};

export function getSignElement(sign: string): ZodiacElement {
  return SIGN_ELEMENTS[sign] || 'fire';
}

export function getSignImagePath(sign: string): string {
  return SIGN_IMAGE_FILE[sign] || '/zodiac/aries.png';
}

/**
 * Whether a theme supports Pexels photo backgrounds.
 * CleanModern uses CSS-only.
 */
export function themeSupportsPhotos(theme: VisualTheme): boolean {
  return theme !== 'clean-modern';
}

export function getSearchQueries(sign: string, aiKeywords?: string[]): string[] {
  const element = SIGN_ELEMENTS[sign] || 'fire';
  const elementQueries = ELEMENT_QUERIES[element];

  if (aiKeywords && aiKeywords.length > 0) {
    return [...aiKeywords, ...elementQueries.slice(0, 2)];
  }

  const combined = [...elementQueries, ...COSMIC_QUERIES];
  return shuffleArray(combined).slice(0, 5);
}

export async function searchPexelsImages(query: string, perPage = 15): Promise<PexelsImage[]> {
  try {
    const res = await fetch(`/api/pexels?query=${encodeURIComponent(query)}&per_page=${perPage}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.images || [];
  } catch {
    return [];
  }
}

export async function downloadAndCacheImage(pexelsImage: PexelsImage): Promise<BackgroundImage> {
  const res = await fetch('/api/download-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: pexelsImage.src.portrait,
      id: String(pexelsImage.id),
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to download image');
  }

  const data = await res.json();
  return {
    url: pexelsImage.src.portrait,
    localPath: data.path,
    id: String(pexelsImage.id),
    alt: pexelsImage.alt,
  };
}

/**
 * Auto-fetch background images for a sign via Pexels.
 * Fetches `count` images — one per script point for the 5-things format.
 * Returns empty array if Pexels is unavailable (caller should use CSS fallback).
 */
export async function autoFetchBackgrounds(
  sign: string,
  count: number = 5,
  aiKeywords?: string[]
): Promise<BackgroundImage[]> {
  const queries = getSearchQueries(sign, aiKeywords);
  const backgrounds: BackgroundImage[] = [];

  for (const query of queries) {
    if (backgrounds.length >= count) break;

    const images = await searchPexelsImages(query, 8);
    if (images.length === 0) continue;

    const usedIds = new Set(backgrounds.map(b => b.id));
    const available = images.filter(img => !usedIds.has(String(img.id)));
    if (available.length === 0) continue;

    const pick = available[Math.floor(Math.random() * Math.min(3, available.length))];
    try {
      const bg = await downloadAndCacheImage(pick);
      backgrounds.push(bg);
    } catch {
      // Skip failed downloads
    }
  }

  return backgrounds;
}

export async function searchPexelsVideos(query: string, perPage = 10): Promise<PexelsVideo[]> {
  try {
    const res = await fetch(`/api/pexels-video?query=${encodeURIComponent(query)}&per_page=${perPage}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.videos || [];
  } catch {
    return [];
  }
}

export async function downloadAndCacheVideo(video: PexelsVideo): Promise<BackgroundVideo> {
  const res = await fetch('/api/download-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: video.videoUrl,
      id: `vid_${video.id}`,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to download video');
  }

  const data = await res.json();
  return {
    url: video.videoUrl,
    localPath: data.path,
    id: String(video.id),
    duration: video.duration,
    previewUrl: video.previewUrl,
  };
}

/**
 * Auto-fetch a stock video clip for a sign.
 * Picks a short (5-15s) portrait video that can be looped/trimmed.
 */
export async function autoFetchVideo(
  sign: string,
  aiKeywords?: string[]
): Promise<BackgroundVideo | null> {
  const element = SIGN_ELEMENTS[sign] || 'fire';
  const queries = aiKeywords && aiKeywords.length > 0
    ? [aiKeywords[0], ...ELEMENT_QUERIES[element].slice(0, 2)]
    : ELEMENT_QUERIES[element].slice(0, 3);

  for (const query of queries) {
    const videos = await searchPexelsVideos(query, 5);
    const suitable = videos.filter(v => v.duration >= 5 && v.duration <= 30 && v.videoUrl);
    if (suitable.length === 0) continue;

    const pick = suitable[Math.floor(Math.random() * Math.min(3, suitable.length))];
    try {
      return await downloadAndCacheVideo(pick);
    } catch {
      continue;
    }
  }

  return null;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
