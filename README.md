# 🪐 Grahachara (ග්‍රහචාර) - Sri Lankan Astrology App

> Your Personal AI Astrologer — AI-powered Vedic astrology and Nakath (auspicious time) app for the Sri Lankan market.

![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue)
![Stack](https://img.shields.io/badge/Stack-React%20Native%20%7C%20Node.js-green)
![Languages](https://img.shields.io/badge/Languages-Sinhala%20%7C%20Tamil%20%7C%20English-orange)

## ✨ Features

### 1. 🕐 Rahu Kalaya & Daily Nakath Dashboard
- Real-time Rahu Kalaya calculation based on GPS location
- Beautiful dashboard with sunrise/sunset times
- Full Panchanga (Tithi, Nakshatra, Yoga, Karana, Vaara)
- Auspicious time periods (Brahma Muhurtha, Abhijit Muhurtha)

### 2. 💑 Porondam (Compatibility) Engine
- Traditional 20-point marriage compatibility system
- 7 compatibility factors: Dina, Gana, Yoni, Rashi, Vasya, Nadi, Mahendra
- Dosha detection and remedies
- Shareable "Vibe Check" links for WhatsApp

### 3. 🔮 AI "Ask the Astrologer" Chat
- AI-powered chat with Vedic astrology knowledge
- Personalized readings based on birth chart
- Multi-language: English, Sinhala (සිංහල), Tamil (தமிழ்), Singlish
- Context-aware with real-time planetary transits

### 4. ⭐ Daily Horoscope
- All 12 Vedic zodiac signs (Rashis)
- Transit-based daily forecasts
- Lucky numbers and colors
- Shareable Instagram-ready cards

### 5. 📱 Viral Loop
- WhatsApp "Vibe Check" compatibility invites
- Shareable weekly forecast cards
- Instagram Story-ready personality summaries

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native (Expo) with Expo Router |
| **Backend** | Node.js / Express REST API |
| **AI Layer** | OpenAI GPT-4o-mini / Google Gemini |
| **Astrology Engine** | Custom Vedic calculations (Lahiri Ayanamsha) |
| **Languages** | Sinhala, Tamil, English, Singlish support |

## 📂 Project Structure

```
astro/
├── server/                    # Node.js Backend
│   ├── src/
│   │   ├── index.js          # Express server entry
│   │   ├── engine/
│   │   │   ├── astrology.js  # Vedic astrology calculations
│   │   │   ├── porondam.js   # Marriage compatibility engine
│   │   │   └── chat.js       # AI chat service
│   │   └── routes/
│   │       ├── nakath.js     # Daily Nakath & Rahu Kalaya API
│   │       ├── porondam.js   # Compatibility API
│   │       ├── chat.js       # AI chat API
│   │       ├── horoscope.js  # Horoscope API
│   │       └── share.js      # Sharing & viral loop API
│   ├── package.json
│   └── .env.example
│
├── mobile/                    # React Native (Expo) Frontend
│   ├── app/
│   │   ├── _layout.js       # Root layout
│   │   └── (tabs)/
│   │       ├── _layout.js   # Tab navigation
│   │       ├── index.js     # Home - Daily Nakath dashboard
│   │       ├── porondam.js  # Marriage compatibility
│   │       ├── chat.js      # AI astrologer chat
│   │       ├── horoscope.js # Daily horoscope
│   │       └── profile.js   # Settings & profile
│   ├── constants/
│   │   └── theme.js         # Design system (cosmic dark theme)
│   ├── services/
│   │   ├── api.js           # API client
│   │   └── i18n.js          # Multi-language support
│   ├── app.json             # Expo config
│   └── package.json
│
└── shared/                    # Shared types & utilities
    └── types.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator / Expo Go app

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install mobile dependencies
cd ../mobile
npm install
```

### 2. Configure Environment

```bash
# Copy the example env file
cd server
cp .env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=your_key_here
# or
# GEMINI_API_KEY=your_key_here
```

### 3. Start Development

```bash
# Terminal 1: Start the backend server
cd server
npm run dev

# Terminal 2: Start the mobile app
cd mobile
npx expo start
```

### 4. Run on Device
- **iOS Simulator**: Press `i` in the Expo CLI
- **Android Emulator**: Press `a` in the Expo CLI
- **Physical Device**: Scan QR code with Expo Go app

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/nakath/daily` | Daily Nakath & Rahu Kalaya |
| GET | `/api/nakath/rahu-kalaya` | Rahu Kalaya times |
| GET | `/api/nakath/panchanga` | Full Panchanga |
| POST | `/api/porondam/check` | Marriage compatibility |
| POST | `/api/porondam/vibe-link` | Generate WhatsApp share link |
| POST | `/api/porondam/vibe-check/:id` | Complete vibe check |
| POST | `/api/chat/ask` | AI astrologer chat |
| GET | `/api/horoscope/daily/:sign` | Daily horoscope by sign |
| POST | `/api/horoscope/birth-chart` | Birth chart analysis |
| POST | `/api/share/weekly-card` | Shareable weekly forecast |
| POST | `/api/share/personality` | Shareable personality summary |

## 🌍 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Full support |
| Sinhala (සිංහල) | `si` | ✅ Full support |
| Tamil (தமிழ்) | `ta` | ✅ Full support |
| Singlish | `singlish` | ✅ AI chat only |

## 💰 Monetization Strategy

1. **Freemium**: Daily Rahu Kalaya, basic horoscopes, limited chat
2. **Premium Reports** (~200 LKR): Detailed Porondam, baby naming, annual forecast PDFs
3. **B2B API**: Sell calculation engine to matrimonial sites, event planners, real estate

## 🔮 Astrology Engine Details

The engine implements traditional Vedic astrology calculations:

- **Sidereal Zodiac**: Uses Lahiri Ayanamsha (standard in Sri Lanka)
- **Panchanga**: Tithi, Nakshatra, Yoga, Karana, Vaara
- **Rahu Kalaya**: Calculated from sunrise/sunset for exact GPS location
- **27 Nakshatras**: Full support with Pada divisions
- **12 Rashis**: Both Vedic and Western names
- **Navagraha**: All 9 planetary bodies

> ⚠️ For production, integrate Swiss Ephemeris (`swisseph`) for sub-arcminute planetary accuracy.

## 📄 License

MIT License - Built with ❤️ for Sri Lanka 🇱🇰
