# Dependency Audit Triage - 2026-05-08

## Actions Applied

- Ran `npm audit --omit=dev --json` in `server/` and `mobile/`.
- Ran `npm audit fix --omit=dev` in both packages to apply non-breaking production dependency updates.
- Removed unused mobile dependency `expo-three`; the app imports `three` and `expo-gl` directly, and no source file imported `expo-three`.

## Current Audit State

| Package | Before | After | Notes |
|---|---:|---:|---|
| `server` | 17 total: 8 low, 3 moderate, 6 high | 14 total: 8 low, 0 moderate, 6 high | Safe fixes updated `express-rate-limit`, `ip-address`, and affected transitive packages. |
| `mobile` | 31 total: 3 moderate, 27 high, 1 critical | 20 total: 2 moderate, 18 high, 0 critical | Safe fixes updated transitive packages such as `protobufjs`, `undici`, `node-forge`, `brace-expansion`, and `picomatch`; removing `expo-three` removed the old `node-fetch` chain. |

## Remaining Server Findings

### `astrology-insights` / `swisseph` / `node-gyp` / `tar`

- Severity: high.
- Cause: `astrology-insights` depends on `swisseph`, which pulls older build tooling.
- npm proposed fix: force-install `astrology-insights@1.1.0`, a semver-major downgrade from `^2.3.0`.
- Decision: not applied automatically because the enhanced astrology engine imports version-specific paths from `astrology-insights` and a major downgrade can break report generation.
- Follow-up: evaluate replacing the `astrology-insights` cross-check path or pinning a vetted version after running the engine accuracy suite.

### `firebase-admin` / Google Cloud transitive packages

- Severity: low.
- Cause: `firebase-admin@13.x` pulls vulnerable `@google-cloud/firestore` / `@google-cloud/storage` transitive ranges according to npm audit.
- npm proposed fix: force-install `firebase-admin@10.3.0`, a semver-major downgrade.
- Decision: not applied because downgrading Firebase Admin risks auth and Firestore behavior regressions.
- Follow-up: wait for a patched `firebase-admin@13.x` chain or test a controlled Firebase Admin migration in staging.

## Remaining Mobile Findings

### Expo SDK chain

- Severity: high/moderate.
- Cause: Expo SDK 52 packages pull vulnerable `@expo/config`, `@expo/config-plugins`, `@expo/metro-config`, `@expo/plist`, `@expo/prebuild-config`, `postcss`, and `tar` ranges.
- npm proposed fix: force-install `expo@49.0.23`, a semver-major downgrade from SDK 52.
- Decision: not applied because forced Expo SDK downgrades are not safe for an Expo app and can break native modules, build config, and EAS behavior.
- Follow-up: upgrade through the Expo-supported path using `npx expo install --fix`, then `npx expo-doctor`, then a native/EAS build smoke test.

### `expo-dev-client`, `expo-notifications`, and related Expo modules

- Severity: high/moderate.
- Cause: audit fixes require major module changes that must stay aligned with the Expo SDK version.
- Decision: not forced in isolation.
- Follow-up: handle together with the SDK upgrade rather than mixing package generations.

## Verification Performed

- `server`: full Jest suite passed after dependency fixes.
- `mobile`: package-lock regenerated after safe fixes and unused dependency removal; app source imports were checked for `expo-three` before removal.

## Next Upgrade Plan

1. Create a staging branch for the Expo SDK upgrade.
2. Run `npx expo install --fix` inside `mobile/`.
3. Run `npx expo-doctor` and resolve SDK/version mismatches.
4. Build and launch on Android, iOS, and web smoke paths.
5. Re-run `npm audit --omit=dev` in both `server/` and `mobile/`.
6. For server high findings, remove or replace the `astrology-insights` dependency if the enhanced engine can use the primary Swiss Ephemeris path instead.
