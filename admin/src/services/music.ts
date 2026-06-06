/**
 * Background music tracks - royalty-free ambient loops.
 * These are placeholder references. You'll need to download actual MP3 files from:
 * - Pixabay Audio (https://pixabay.com/music/) - 100% free, no attribution
 * - FreePD (https://freepd.com/) - public domain
 * 
 * Place MP3 files in /admin/public/audio/ directory.
 */

export interface MusicTrack {
  id: string;
  name: string;
  filename: string;
  duration: number; // seconds
  mood: string;
  bpm: number;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'cosmic-ambient-1',
    name: 'Cosmic Drift',
    filename: '/audio/cosmic-drift.mp3',
    duration: 60,
    mood: 'mystical, ethereal',
    bpm: 70,
  },
  {
    id: 'cosmic-ambient-2',
    name: 'Stellar Meditation',
    filename: '/audio/stellar-meditation.mp3',
    duration: 60,
    mood: 'calm, spiritual',
    bpm: 60,
  },
  {
    id: 'modern-lofi-1',
    name: 'Astral Lo-Fi',
    filename: '/audio/astral-lofi.mp3',
    duration: 60,
    mood: 'trendy, chill',
    bpm: 85,
  },
  {
    id: 'modern-lofi-2',
    name: 'Zodiac Beats',
    filename: '/audio/zodiac-beats.mp3',
    duration: 60,
    mood: 'upbeat, engaging',
    bpm: 95,
  },
  {
    id: 'mystic-gold-1',
    name: 'Golden Hour',
    filename: '/audio/golden-hour.mp3',
    duration: 60,
    mood: 'luxurious, warm',
    bpm: 75,
  },
  {
    id: 'dramatic-1',
    name: 'Celestial Rising',
    filename: '/audio/celestial-rising.mp3',
    duration: 60,
    mood: 'dramatic, attention-grabbing',
    bpm: 100,
  },
];

/**
 * Get recommended tracks for a visual theme
 */
export function getTracksForTheme(theme: string): MusicTrack[] {
  switch (theme) {
    case 'cosmic-dark':
      return MUSIC_TRACKS.filter(t => t.mood.includes('mystical') || t.mood.includes('ethereal'));
    case 'clean-modern':
      return MUSIC_TRACKS.filter(t => t.mood.includes('trendy') || t.mood.includes('upbeat'));
    case 'mystic-gold':
      return MUSIC_TRACKS.filter(t => t.mood.includes('luxurious') || t.mood.includes('dramatic'));
    default:
      return MUSIC_TRACKS;
  }
}
