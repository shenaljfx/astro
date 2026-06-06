# Grahachara Marketing Studio

Admin web app for generating marketing reels for TikTok, Instagram, and Facebook.

## Tech Stack

- **Next.js 14** — React framework (runs on port 3001)
- **Remotion** — Programmatic video rendering (React → MP4)
- **Edge TTS** — Free Microsoft neural voices (Aria, Jenny)
- **Gemini AI** — Script generation via existing API key
- **Tailwind CSS** — UI styling
- **FFmpeg** — Audio mixing (bundled with Remotion)

## Quick Start

```bash
# 1. Start the astrology server (required for data)
cd ../server && npm run dev

# 2. Install admin dependencies
cd ../admin && npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your GEMINI_API_KEY

# 4. Start the admin panel
npm run dev
# Opens at http://localhost:3001
```

## Architecture

```
admin/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx      # Dashboard
│   │   ├── generate/     # Batch content generation
│   │   ├── review/       # Review & approve reels
│   │   ├── editor/       # Edit individual reels
│   │   ├── calendar/     # Content calendar view
│   │   ├── export/       # Bulk export with captions
│   │   └── api/          # Server routes (TTS, Gemini, Render)
│   ├── remotion/         # Video compositions
│   │   ├── ReelComposition.tsx
│   │   ├── themes/       # 3 visual themes
│   │   └── components/   # Subtitles, overlays, CTAs
│   ├── services/         # Core logic
│   │   ├── api.ts        # Astrology server client
│   │   ├── tts.ts        # Edge TTS integration
│   │   ├── gemini.ts     # Script generation
│   │   ├── templates.ts  # Template configs & types
│   │   ├── renderer.ts   # Video rendering pipeline
│   │   └── music.ts      # Background music tracks
│   └── components/       # UI components
└── public/
    └── audio/            # Royalty-free background music (add your own)
```

## Workflow

1. **Generate** — Select template, signs, theme, voice → batch-generate scripts + voiceover
2. **Review** — See all generated reels in a grid, approve/reject/edit
3. **Edit** — Tweak script, change voice/theme, regenerate audio
4. **Export** — Download approved reels with platform-specific captions + hashtags

## Content Templates

| Template | Duration | Default CTA |
|---|---|---|
| Daily Horoscope | Short (15-20s) | Follow |
| Weekly Lagna | Long (45-60s) | Follow |
| Compatibility | Short | Free Chart |
| Auspicious Times | Short | Download |
| Yoga of the Day | Long | Follow |
| Educational | Long | Follow |
| App Promo | Short | Download |

## Visual Themes

- **Cosmic Dark** — Brand-consistent (#04030C, purple/gold)
- **Clean Modern** — Bright editorial (cream, purple accents)
- **Mystic Gold** — Luxury dark (black, gold particles)

## Voices (Edge TTS - Free)

- **Aria** (en-US-AriaNeural) — Conversational, Gen-Z
- **Jenny** (en-US-JennyNeural) — Warm, trustworthy
- **Guy** (en-US-GuyNeural) — Authoritative
- **Sara** (en-US-SaraNeural) — Friendly, professional

## Output per Reel

- MP4 with voiceover + background music (full mix)
- MP4 with voiceover only (add trending audio manually)
- Thumbnail PNG
- Platform captions (TikTok, Instagram, Facebook)
- Hashtag set (20-30 per reel)
- Word timing data (for subtitle sync)

## Adding Background Music

Download royalty-free tracks and place in `public/audio/`:
- [Pixabay Music](https://pixabay.com/music/) — 100% free
- [FreePD](https://freepd.com/) — Public domain

Name files to match `src/services/music.ts` entries.
