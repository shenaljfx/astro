# Nakath AI - Sri Lankan Astrology App

## Project Overview
AI-powered astrology and Nakath (auspicious time) app for the Sri Lankan market.

## Tech Stack
- **Frontend**: React Native (Expo) with Expo Router - Cross-platform iOS/Android
- **Backend**: Node.js/Express REST API
- **AI Layer**: OpenAI GPT-4o-mini / Google Gemini API integration for Vedic astrology chat
- **Astrology Engine**: Custom Vedic calculations with Lahiri Ayanamsha (sidereal)
- **Languages**: Sinhala (සිංහල), Tamil (தமிழ்), English, Singlish support

## Project Structure
- `/mobile` - React Native (Expo) frontend with tab navigation
- `/server` - Node.js/Express backend API (port 3000)
- `/shared` - Shared types and utilities

## Key Features
1. **Rahu Kalaya & Daily Nakath Dashboard** - Real-time calculations for any GPS location
2. **Porondam (Compatibility) Engine** - Traditional 20-point marriage matching (7 factors)
3. **AI "Ask the Astrologer" Chat** - Multi-language AI astrologer with birth chart context
4. **Daily Horoscope** - All 12 Vedic rashis with transit-based forecasts
5. **Viral Loop** - WhatsApp "Vibe Check" links, Instagram-ready share cards
6. **Cultural Event Nakath** - Push notification support for Avurudu, Vesak, etc.

## Development
- Backend: `cd server && npm run dev` (nodemon auto-restart)
- Frontend: `cd mobile && npx expo start`
- Backend only: `cd server && node src/index.js`

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/nakath/daily` - Daily Nakath & Rahu Kalaya
- `GET /api/nakath/rahu-kalaya` - Rahu Kalaya times
- `GET /api/nakath/panchanga` - Full Panchanga
- `POST /api/porondam/check` - Marriage compatibility
- `POST /api/porondam/vibe-link` - WhatsApp share link
- `POST /api/chat/ask` - AI astrologer chat
- `GET /api/horoscope/daily/:sign` - Daily horoscope
- `POST /api/horoscope/birth-chart` - Birth chart analysis
- `POST /api/share/weekly-card` - Shareable weekly forecast
- `POST /api/share/personality` - Shareable personality data

## Astrology Engine
- Sidereal zodiac with Lahiri Ayanamsha
- Full Panchanga: Tithi, Nakshatra (27), Yoga, Karana, Vaara
- Navagraha (9 planetary bodies)
- Sunrise/sunset calculation for any coordinates
- Rahu Kalaya based on daylight division
- For production accuracy, integrate Swiss Ephemeris (swisseph)
