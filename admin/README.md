# Grahachara Studio

Internal content studio for the Grahachara astrology app — generates marketing
video reels, image posts and copy, fed by the live ephemeris engine.

Four sections, nothing else:

1. **Dashboard** (`/`) — today's real sky (nakshatra, tithi, rahu kalam…), tool
   shortcuts with live counts, unified recent-generations feed.
2. **Video** (`/video`) — script (Gemini) → voiceover (Edge TTS / Kokoro) →
   stock visuals (Pexels) → editable reel queue → Remotion preview →
   render + download 9:16 MP4.
3. **Image post** (`/image`) — per-sign daily posts from the REAL
   `/api/marketing/rashi-daily` calculation (no AI), English/සිංහල, three
   formats, background/logo upload, PNG download or all-12-signs ZIP.
4. **Text** (`/text`) — caption packs (TikTok/IG/FB + hashtags), viral hooks,
   bilingual quotes, week-of-horoscope lines. One-tap copy.

## Tech stack

- **Next.js 14** (port 3001) · **Tailwind** with the "Observatory Console"
  token system (`src/app/globals.css`)
- **Remotion** — programmatic video rendering (React → MP4)
- **Gemini** — copy/script generation (server route holds the key)
- **Edge TTS / Kokoro** — free neural voiceovers with word timings
- Fonts: Fraunces (display) · Inter (UI) · JetBrains Mono (data)

## Quick start

```bash
# 1. Start the astrology engine (feeds real data)
cd ../server && npm run dev

# 2. Install + configure
cd ../admin && npm install
cp .env.example .env.local   # set GEMINI_API_KEY, PEXELS_API_KEY

# 3. Run
npm run dev                  # http://localhost:3001
```

Local dev without Google sign-in: set `DEV_NO_AUTH=1` and
`NEXT_PUBLIC_DEV_NO_AUTH=1` in `.env.local` (dev builds only — dead code in
production, which is gated by Firebase auth + the email allowlist in
`src/lib/verifyAdmin.ts`).

## Architecture

```
admin/src/
├── app/
│   ├── page.tsx          # Dashboard (Tonight's Sky + history feed)
│   ├── video/            # Video reel generator (queue + render)
│   ├── image/            # Image post generator (canvas + ZIP batch)
│   ├── text/             # Text generator (4 modes)
│   └── api/              # astro proxy · generate-script · tts · pexels ·
│                         # render · output (MP4 download) · download-image
├── remotion/             # ReelShort/ReelLong compositions + 3 themes
├── services/             # api · images · templates · tts
├── components/           # AppShell · Sidebar · ui primitives · ReelPreview
└── lib/                  # verifyAdmin · firebaseClient · history
```

Every generation is logged to the shared history (`src/lib/history.ts`,
localStorage) and surfaces on the dashboard.

## Rendering notes

- Preview and final render use the same duration math: the video sizes itself
  to the voiceover via the `audioDuration` input prop
  (`calculateMetadata` in `src/remotion/index.tsx`).
- `/api/render` spawns `scripts/render.js` in a separate Node process and
  returns a `downloadUrl` served by the auth-gated `/api/output` route.
