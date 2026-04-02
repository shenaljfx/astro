# Grahachara (ග්‍රහචාර) - Sri Lankan Astrology App

## Architecture Overview

Three-layer monorepo: `/mobile` (React Native/Expo), `/server` (Node.js/Express, port 3000), `/shared` (types). The mobile app communicates exclusively with the server REST API — there is **no direct Firebase/Firestore access from mobile**; all Firebase calls go through the server.

**Data flow**: Mobile → `mobile/services/api.js` (auto-detects dev host via `Constants.expoConfig.hostUri`) → Express routes → `server/src/engine/` (pure calculation layer) → response. The `getBaseUrl()` function in `api.js` handles Android emulator (`10.0.2.2:3000`), Expo Go (via `hostUri`), and web (`window.location.hostname:3000`) automatically.

## Dev Commands

```bash
# Run both concurrently (in separate terminals)
cd server && npm run dev          # nodemon on port 3000
cd mobile && npx expo start       # Expo dev server (use --port 8081 if needed)
```

Firebase is **optional for local dev** — server starts without `firebase-service-account.json` and falls back to anonymous mode.

## Auth & Subscription Flow

1. Onboarding: Google Sign-In → Firebase Auth → ID token sent to server → JWT returned
2. JWT is wired into all API requests via `setAuthTokenGetter()` in `AuthContext`
3. Premium routes use `phoneAuth` + `requireSubscription` middleware — charges **LKR 280/month** (Sri Lanka) or **USD 4.99/month** (international) via RevenueCat (in-app purchases)
4. Subscription initiated in onboarding Step 2 via RevenueCat SDK (`react-native-purchases` + `react-native-purchases-ui`)
5. Server also accepts Firebase ID tokens directly (fallback path in `subscription.js`)

All payment/billing is handled by **RevenueCat** (`mobile/services/revenuecat.js` + `server/src/routes/revenuecat.js`).

Guard pattern for protected routes: `router.post('/endpoint', phoneAuth, requireSubscription, handler)`

## Astrology Engine (`server/src/engine/astrology.js`)

- **2778-line** core engine — all Vedic calculations are in this single file
- Uses `astronomia` (Meeus algorithms) + `ephemeris` npm packages; **not** Swiss Ephemeris
- **Always sidereal**: apply `toSidereal(tropicalDeg, date)` before any Nakshatra/Rashi lookup; uses Lahiri Ayanamsha (~23.85° at J2000 + 0.0137°/year)
- Key exports: `getPanchanga`, `getDailyNakath`, `generateFullReport`, `getAllPlanetPositions`, `getLagna`, `buildHouseChart`, `buildNavamshaChart`
- Porondam engine (`engine/porondam.js`) scores 7 factors (Dina, Gana, Yoni, Rashi, Vasya, Nadi, Mahendra) out of 20 points using Nakshatra-keyed lookup tables

## Mobile Conventions

- **All screens** use `var` (not `const`/`let`) — this is intentional project style for React Native compatibility
- **Multi-language**: wrap all user-facing strings with `t('key')` from `useLanguage()` hook; keys defined in `mobile/services/i18n.js` under `en`/`si` objects. Tamil (`ta`) and Singlish are AI-response-only languages.
- **Design system**: import colors/spacing exclusively from `mobile/constants/theme.js` — primary purple `#9333EA`, accent gold `#FBBF24`, deep background `#04030C`
- **Tab layout**: screens are `(tabs)/index.js` (Home), `kendara.js` (Chart), `report.js`, `porondam.js`, `chat.js`, `profile.js` — registered in `(tabs)/_layout.js` TABS array
- **Timezone**: all times are UTC internally; use `toSLT()` helper (UTC+5:30) for display — never use `new Date()` locale methods for time display
- Reusable UI atoms: `GlassCard`, `CosmicBackground`, `SkeletonLoader`, `SriLankanChart`, `CelestialClock` in `mobile/components/`

## Key Integration Points

| Concern | Location |
|---|---|
| Google Sign-In (Firebase Auth) | `mobile/services/firebase.js` + `mobile/contexts/AuthContext.js` |
| Server auth (JWT from Google) | `server/src/routes/auth.js` |
| RevenueCat billing | `mobile/services/revenuecat.js` + `server/src/routes/revenuecat.js` |
| Firebase Admin init | `server/src/config/firebase.js` (gracefully degrades) |
| AI chat prompts | `server/src/engine/chat.js` — `buildSystemPrompt(language)` |
| API base URL detection | `mobile/services/api.js` — `getBaseUrl()` |
| Auth token injection | `mobile/contexts/AuthContext.js` — `setAuthTokenGetter()` |

## Git & Environment Files

### Ignored files (NEVER commit these)
- `.env` / `.env.local` / `.env.production` — contain API keys, secrets
- `server/firebase-service-account.json` — Firebase Admin credentials
- `node_modules/` — dependencies (install via `npm install`)
- `mobile/.expo/` — Expo cache (auto-generated)

### `.env.example` files (ALWAYS commit these)
- `mobile/.env.example` — template for mobile env vars (Firebase config, mock payments flag)
- `server/.env.example` — template for server env vars (API keys, AI provider, timezone DB)

When adding a new env var: add the real value to `.env` (local only) AND add a placeholder to `.env.example` (committed).

### Key Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_*` | `mobile/.env` | Firebase client config |
| `EXPO_PUBLIC_MOCK_PAYMENTS` | `mobile/.env` | Set `true` to bypass RevenueCat in dev |
| `GEMINI_API_KEY` | `server/.env` | Gemini AI for report generation |
| `MOCK_PAYMENTS` | `server/.env` | Set `true` to bypass `requireSubscription` middleware |
| `JWT_SECRET` | `server/.env` | JWT signing for auth tokens |
| `TIMEZONEDB_API_KEY` | `server/.env` | Historical timezone resolution for birth charts |

### Mock Payments (dev bypass)
Set both to `true` for local dev without real payments:
- `EXPO_PUBLIC_MOCK_PAYMENTS=true` in `mobile/.env` — all RevenueCat functions auto-succeed
- `MOCK_PAYMENTS=true` in `server/.env` — `requireSubscription` middleware passes through

**⚠️ Set both to `false` or remove before production builds.**

## Adding a New Feature

1. Add calculation logic to `server/src/engine/astrology.js` (or a new engine file)
2. Create route in `server/src/routes/` and register in `server/src/index.js`
3. Add API function to `mobile/services/api.js`
4. Add i18n keys to both `en` and `si` objects in `mobile/services/i18n.js`
5. Build screen in `mobile/app/(tabs)/` using `useLanguage`, `useAuth`, and theme tokens
