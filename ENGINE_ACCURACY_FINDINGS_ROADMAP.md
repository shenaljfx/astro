# Grahachara Engine Accuracy Findings and Roadmap

Date: 2026-05-07

Scope: backend astrology calculation accuracy, report-section consistency, Nadi engine, advanced engine, AI context wiring, and AI narrative report reliability.

## Executive Summary

Grahachara already has a strong foundation: the backend uses Swiss Ephemeris through `@swisseph/node`, has a coordinate-aware timezone service, computes detailed Vedic structures, and sends deterministic chart data to the AI instead of asking the AI to calculate astrology from scratch.

The main accuracy opportunity is not replacing the engine. It is making every calculation path use the same explicit settings, the same verified ephemeris mode, the same timezone interpretation, and the same location context. Top astrology tools win by being consistent, testable, configurable, and transparent about uncertainty.

Highest-impact fixes:

1. Add one central calculation settings object for ayanamsha, house system, node type, geocentric/topocentric mode, sunrise mode, dasha year mode, timezone source, and ephemeris source.
2. Move sidereal planet calculations to Swiss Ephemeris native sidereal flags where possible, instead of manual `tropical - ayanamsha` conversion in scattered places.
3. Check Swiss Ephemeris return flags so the server knows if a calculation used Swiss files or silently fell back.
4. Pass `lat`, `lng`, and `asOfDate` consistently through all report engines.
5. Replace fixed SLT assumptions in global birth/report paths with timezone metadata from `parseBirthDateTime()`.
6. Add panchanga transition end-times for tithi, nakshatra, yoga, and karana.
7. Build a benchmark suite using Swiss/JHora/JPL-style reference vectors and boundary cases.
8. Make the AI receive calculation metadata, confidence, and provenance per section, not only narrative-friendly summaries.

## Research Findings From Top Tools and References

### Swiss Ephemeris Practices

Relevant to: `server/src/engine/astrology.js`, `server/src/engine/accuracyEngine.js`, `server/src/engine/advanced.js`, `server/src/engine/kp.js`, `server/src/engine/varshphal.js`

Findings:

- Use UT-based APIs for birth calculations.
- Set sidereal mode explicitly before sidereal calculations.
- Prefer native sidereal calculation flags over manual ayanamsha subtraction for planet positions.
- Set topocentric observer coordinates before topocentric calculations.
- Check returned flags and error strings. If Swiss ephemeris files are unavailable, Swiss Ephemeris can fall back to a different computation mode.
- East longitude is positive. The current Sri Lanka longitudes follow this convention.
- Hindu sunrise should use disc-center, no refraction, and geocentric latitude convention. The current `calculateSunriseSunset()` already matches this direction.

Current repo status:

- `@swisseph/node` is installed and used.
- Bundled files are present under `server/node_modules/@swisseph/node/ephemeris/`.
- The engine defaults to Lahiri.
- Sun, Moon, planets, Lagna, and sunrise already use Swiss primary paths.
- Manual sidereal conversion still appears in many core and report paths.

### JPL / Horizons Practices

Relevant to: validation, long-range accuracy, topocentric settings, uncertainty metadata.

Findings:

- High-grade ephemerides explicitly document reference frame, time scale, observer location, Delta T, and uncertainty.
- Topocentric outputs depend on exact observer location and Earth orientation assumptions.
- Rise/set times near the horizon are naturally uncertain due to refraction, weather, terrain, and observer height.
- Long-range historical dates are less certain because ancient UT and Delta T are reconstructed.

Roadmap implication:

- The app should expose calculation provenance and confidence, especially for old births, approximate birth times, boundary nakshatras, and sunrise-based daily features.

### JHora / Top Vedic Software Practices

Relevant to: product-level expectations for serious Vedic astrology users.

Findings:

- Top tools expose calculation choices instead of hiding them: ayanamsha, true/mean node, geocentric/topocentric, true/apparent planets, house system, sunrise definition, and dasha year mode.
- Panchanga outputs include end-times for tithi, nakshatra, yoga, karana, hora, moon sign changes, Rahu Kalam, Gulika Kalam, moonrise, and moonset.
- Advanced reports cross-check results across divisional charts, dashas, transits, and classical rules.

Roadmap implication:

- Grahachara should keep a default Sri Lankan/Vedic mode, but internally every report should record exact calculation settings.
- Power-user settings can come later; the data model should be ready first.

### TimeZoneDB / Historical Timezone Practices

Relevant to: birth parsing, global users, report display.

Findings:

- A robust birth chart parser needs location plus timestamp to resolve historical offset and DST.
- `server/src/services/timezone.js` already supports this pattern through `parseBirthDateTime()` and `resolveUtcOffset()`.

Current repo status:

- Major horoscope routes already call `parseBirthDateTime()` and fall back to `parseSLT()`.
- `server/src/routes/porondam.js` still parses bride/groom dates with `parseSLT()` directly.
- Several report display paths still hardcode UTC+5:30 labels or convert by adding `5.5` hours.

## Current Strengths

### Core Engine

Files:

- `server/src/engine/astrology.js`
- `server/src/engine/accuracyEngine.js`
- `server/src/services/timezone.js`

Strengths:

- Swiss Ephemeris is the primary path for planets and Lagna.
- Lahiri ayanamsha is explicit and configurable through internal mode support.
- Hindu sunrise calculation is already using Swiss rise/set with Hindu-style flags.
- `parseBirthDateTime()` supports coordinate-aware historical offset resolution.
- `computeAccuracyEnhancements()` already adds multi-ayanamsha checks, D9 verification, Yogi/Avayogi, Argala, returns, Bhava Bala, KP timing, Nadi chains, Varshphal, and confidence tiers.

### Report Engine

Files:

- `server/src/engine/astrology.js`
- `server/src/engine/chat.js`
- `server/src/engine/preValidator.js`
- `server/src/engine/reportValidator.js`
- `server/src/engine/crossSectionValidator.js`

Strengths:

- `generateFullReport()` builds a large deterministic raw report before AI narration.
- `generateAINarrativeReport()` runs a coherence pass and then generates 19 narrative sections.
- Pre-validation sanitizes section data before AI sees it.
- Post-validation redacts impossible years, AI self-disclosures, unsupported absolute claims, jargon leakage, and unverified numbers.
- Cross-section validation checks age-window contradictions between narrative sections.

### Nadi and Advanced Engines

Files:

- `server/src/engine/nadi.js`
- `server/src/engine/advanced.js`

Strengths:

- Nadi engine has a real event-signification structure: planet level, nakshatra lord level, sub-lord level, Rahu/Ketu dispositor/conjunction/aspect logic, event house groups, and dasha event activation.
- Advanced engine computes doshas, advanced yogas, Jaimini karakas, Shadbala, Ishta/Kashta, Bhrigu Bindu, avasthas, extended vargas, pratyantardasha, Nadi amsha, KP sub-lords, past-life indicators, and Sarvatobhadra activations.
- `generateFullReport()` wires Nadi outputs into report sections such as marriage, career, children, health, foreign travel, legal, education, luck, and spiritual.
- AI prompt construction includes advanced blocks with KP, Nadi amsha, Sarvatobhadra, Varshphal, enhanced transit, Jyotish cross-validation, and confidence data.

## Issues and Gaps By Layer

Severity guide:

- P0: Can materially change chart/report output for real users.
- P1: Can create inconsistencies, boundary errors, or lower trust.
- P2: Quality/maintainability improvement.
- P3: Future product polish.

### P0: Sidereal Calculation Consistency

Affected files:

- `server/src/engine/astrology.js`
- `server/src/engine/accuracyEngine.js`
- `server/src/engine/advanced.js`
- `server/src/engine/aiContext.js`
- `server/src/engine/ai-agents.js`
- `server/src/engine/chat.js`

Issue:

Many paths calculate tropical longitude with Swiss and then call `toSidereal()`. This is understandable and likely close in most cases, but Swiss Ephemeris recommends native sidereal mode for sidereal planet positions. The scattered pattern also makes it easy for one module to use a different ayanamsha or conversion path.

Examples found:

- `toSidereal(getMoonLongitude(date), date)` in core report generation.
- `toSidereal(getMoonLongitude(date), date)` in `accuracyEngine.js`.
- `toSidereal(getMoonLongitude(date), date)` in `chat.js` and AI context generators.
- `getAllPlanetPositions()` subtracts ayanamsha manually after Swiss tropical position calculation.

Roadmap fix:

- Add a single core helper like `calculateSiderealPosition(date, planet, settings)` that uses `SweFlag.Sidereal | SweFlag.SwissEphemeris | SweFlag.Speed`.
- Keep `toSidereal()` only for fallback libraries and derived geometric points when native Swiss sidereal output is not available.
- Add regression tests for nakshatra/rashi boundary cases.

### P0: Timezone Handling Is Not Fully Uniform

Affected files:

- `server/src/services/timezone.js`
- `server/src/utils/dateUtils.js`
- `server/src/routes/horoscope.js`
- `server/src/routes/porondam.js`
- `server/src/engine/chat.js`
- `server/src/engine/aiContext.js`

Issue:

`parseBirthDateTime()` exists and is the right direction, but not every birth-date path uses it. Some paths still assume Sri Lankan local time by default or format report time by adding `5.5` hours.

Concrete findings:

- `server/src/routes/porondam.js` parses bride and groom birth dates with `parseSLT()` directly.
- `generateAINarrativeReport()` labels exact birth time as Sri Lanka Time and computes it by adding `5.5` hours.
- `buildFullBirthContext()` defaults `timezone = 5.5`.
- Several display-only paths use fixed UTC+5:30 labels even when a global lat/lng was supplied.

Roadmap fix:

- Return a `timeContext` object from route parsing: `{ utcDate, zoneName, offsetSeconds, source, assumedOffset, displayLocalTime }`.
- Pass `timeContext` into `generateFullReport()` and AI report builders.
- Keep Sri Lanka/India traditional UTC+5:30 rule, but record it explicitly as a source decision.
- Update Porondam to parse each person with their own lat/lng.

### P0: Location Propagation Is Incomplete

Affected files:

- `server/src/engine/advanced.js`
- `server/src/engine/accuracyEngine.js`
- `server/src/engine/astrology.js`
- `server/src/engine/chat.js`
- `server/src/routes/notifications.js`
- `server/src/services/scheduler.js`

Issue:

Many modules call `getAllPlanetPositions(date)` without `lat` and `lng`. Today, geocentric planet positions are mostly not location-dependent, but the engine already has optional topocentric support. Once topocentric mode or location-aware settings are enabled, these calls silently default to Colombo.

Examples found:

- `advanced.js` calls `getAllPlanetPositions(date)` in Jaimini, Shadbala, Ishta/Kashta, Bhrigu Bindu, Avasthas, extended vargas, Nadi amsha, KP sub-lords, and Sarvatobhadra.
- `accuracyEngine.js` calls `getAllPlanetPositions(now)` and `getAllPlanetPositions(date)` in several transit/return scans.
- Core report logic has some historical transit scans that call `getAllPlanetPositions(checkDate)` without observer context.

Roadmap fix:

- Make `lat`, `lng`, and `settings` required inside report engines, even if a function currently does not use them.
- Add lint/test coverage for `getAllPlanetPositions(` calls inside report engines.
- Add `asOfDate` support for all current/transit calculations so reports are reproducible.

### P0: Nadi Aspect Counting Appears Off By One

Affected file:

- `server/src/engine/nadi.js`

Issue:

`doesAspect()` calculates `diff = ((targetSign - aspectingSign + 12) % 12)`, which is zero-based. Same sign is `0`, opposite sign is `6`. But `NADI_ASPECTS` stores inclusive Vedic aspect numbers like `7`, `4`, `8`, `5`, `9`, `3`, and `10`. This means a planet's 7th aspect may not match the sign that is actually 7th by inclusive counting.

Impact:

- Rahu/Ketu Nadi significations may miss planets that aspect them.
- Event promise scoring can shift for marriage, career, litigation, health, and foreign travel.

Roadmap fix:

- Convert the zero-based difference to inclusive count before checking aspects:
  - `inclusiveDistance = diff + 1`, with same-sign conjunction handled separately.
- Add unit tests for Sun 7th, Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10, Rahu/Ketu 5/9.

### P1: Swiss Return Flags Are Not Surfaced

Affected file:

- `server/src/engine/astrology.js`

Issue:

`@swisseph/node` returns actual flags from `calculatePosition()`, but the app does not appear to validate or persist them in report metadata.

Impact:

- If a future deployment misses ephemeris files or changes flags, reports may silently use a fallback without the AI or logs knowing.

Roadmap fix:

- Add `calculationMetadata.ephemeris` to the raw report.
- Store requested flags and returned flags for Sun, Moon, Lagna, nodes, and representative planets.
- Warn/fail health check if Swiss files are missing or fallback flags appear unexpectedly.

### P1: Panchanga Lacks Transition End-Times

Affected file:

- `server/src/engine/astrology.js`

Issue:

`getPanchanga()` returns current tithi, nakshatra, yoga, karana, vaara, Lagna, and ayanamsha. It does not return end-times for tithi/nakshatra/yoga/karana.

Impact:

- Daily panchanga is less useful than top panchanga apps.
- AI cannot say whether a tithi or nakshatra changes later in the day.
- Boundary users may receive overly static daily guidance.

Roadmap fix:

- Add binary-search transition solvers for:
  - tithi end time: Moon-Sun elongation crosses next 12-degree boundary.
  - nakshatra end time: Moon crosses next 13 degrees 20 minutes boundary.
  - yoga end time: Sun+Moon crosses next 13 degrees 20 minutes boundary.
  - karana end time: Moon-Sun elongation crosses next 6-degree boundary.
- Include local display time with timezone source.
- Add tests around transition boundaries.

### P1: Calculation Settings Are Not a First-Class Object

Affected files:

- All engine/report modules.

Issue:

Different functions rely on implicit defaults: Lahiri, Whole Sign, true node for Rahu, Hindu sunrise, default Colombo coordinates, fixed current date, and tropical-year dasha math. These are reasonable defaults, but they are not captured as one settings object.

Roadmap fix:

Create a settings schema like:

```js
{
  ayanamsha: 'lahiri',
  houseSystem: 'whole_sign',
  nodeType: 'true',
  observerMode: 'geocentric',
  sunriseMode: 'hindu_disc_center_no_refraction',
  dashaYearMode: 'tropical_365_2422',
  ephemeris: 'swiss_bundled',
  asOfDate: '2026-05-07T00:00:00.000Z',
  timezoneSource: 'timezonedb|iana|traditional_slt|explicit_offset'
}
```

Then pass it through:

- `generateFullReport()`
- `generateAINarrativeReport()`
- `computeAccuracyEnhancements()`
- `generateAdvancedAnalysis()`
- `generateNadiPredictions()`
- route-level report endpoints

### P1: Advanced Engine Recomputes and Defaults in Several Places

Affected file:

- `server/src/engine/advanced.js`

Findings:

- `generateFullReport()` computes advanced subsets, then `generateAINarrativeReport()` calls `generateAdvancedAnalysis()` again to build `advancedBlock`.
- `calculateNadiAmsha(date)` and `calculateKPSubLords(date)` do not accept `lat`, `lng`, `settings`, or `asOfDate`.
- `calculateSarvatobhadraActivations()` uses `new Date()` internally for current transit activation.
- Shadbala-related logic has a hardcoded `+5.5` hour assumption.

Impact:

- Duplicate calculation cost.
- Possible mismatch between raw report data and prompt summary if `asOfDate` changes during generation or if future settings diverge.
- Harder to reproduce reports in tests.

Roadmap fix:

- Let `generateFullReport()` return a single `advancedAnalysis` object.
- Make the AI layer consume that object instead of recomputing.
- Add `asOfDate`, `lat`, `lng`, and `settings` to advanced sub-functions.

### P1: AI Gets Rich Data, But Not Enough Provenance

Affected files:

- `server/src/engine/chat.js`
- `server/src/engine/aiContext.js`
- `server/src/engine/ai-agents.js`

Issue:

The AI prompt receives many useful summaries, but it does not consistently receive compact provenance fields such as ephemeris mode, returned flags, timezone source, node type, ayanamsha used, confidence tier, and whether values are birth-time sensitive.

Current strengths:

- AI is told not to recalculate.
- Accuracy confidence tiers are included per section.
- Pre/post/cross validators exist.
- Multi-agent context builder exists in `ai-agents.js`.

Gaps:

- `ai-agents.js` appears to be a ready context generator but is not the main full-report route pipeline.
- `aiContext.js` defaults timezone to `5.5` and recomputes Moon/Sun with manual sidereal conversion.
- Full report prompts still show some hardcoded Sri Lanka time labels.

Roadmap fix:

- Add a `calculationMetadata` block to every AI section prompt.
- Add provenance tags to important claims: `source: core|nadi|kp|advanced|jyotish|confidence|validator`.
- Use a shared payload builder so `chat.js`, `aiContext.js`, and `ai-agents.js` do not drift.

## Report Section Audit

The AI report currently generates 19 sections:

1. `yogaAnalysis`
2. `lifePredictions`
3. `career`
4. `marriage`
5. `marriedLife`
6. `financial`
7. `children`
8. `familyPortrait`
9. `health`
10. `physicalProfile`
11. `attractionProfile`
12. `foreignTravel`
13. `education`
14. `luck`
15. `legal`
16. `realEstate`
17. `transits`
18. `surpriseInsights`
19. `remedies`

Section-level findings:

| Section | Current data strengths | Main risk | Roadmap action |
|---|---|---|---|
| `yogaAnalysis` | Classical yogas, advanced yogas, doshas, Jyotish enrichment | Yoga strength/cancellation can be over-narrated | Attach source, strength, cancellation, and confidence per yoga |
| `lifePredictions` | Dasha timeline, key events calendar, coherence pass | Highest contradiction risk across marriage, career, children, health | Make this section consume the authoritative event calendar only |
| `career` | 10th house, Nadi career, D10, Shadbala, transits, KP | Career fields can drift from deterministic indicators | Add source-ranked career themes and confidence by source |
| `marriage` | 7th house, D9, Upapada, Darakaraka, Nadi, KP, denial guard | Birth-time sensitivity and denial/timing contradictions | Make Nadi/KP/D9 agreement explicit before AI timing claims |
| `marriedLife` | Reuses marriage data | Can repeat or contradict `marriage` | Treat as relationship quality only, not first-marriage timing |
| `financial` | 2nd/11th, career cap, wealth/windfall Nadi | Can exceed career support without context | Keep career/finance cross-validation and add Nadi wealth provenance |
| `children` | 5th house, marriage cap, Nadi children | Can be too absolute or conflict with marriage denial | Use probabilistic language when marriage confidence is low |
| `familyPortrait` | Parent fields and section validator | Parent event years can exceed realistic windows | Keep parent lifespan caps and add parent-specific source fields |
| `health` | Health engine, medical-house logic, validator | Medical/death claims can be unsafe or too certain | Use non-diagnostic language and confidence downgrades |
| `physicalProfile` | Chart-based profile indicators | Speculative by nature | Mark as low/medium confidence and avoid deterministic body claims |
| `attractionProfile` | Venus/Mars/7th/Darakaraka indicators | Sensitive/personal claims can overreach | Use respectful framing and expose confidence score |
| `foreignTravel` | 9th/12th, Rahu, Nadi foreign travel | Needs exact location/timezone and current transits | Add event-window provenance from dasha/transit agreement |
| `education` | 4th/5th, D24, Nadi education | Hardcoded field matching can be weak | Use D24 and Mercury/Jupiter strength as primary data |
| `luck` | 9th house, fortune indicators, Nadi wealth/windfall | Can contradict spiritual/foreign travel | Keep dharma-axis cross-validation |
| `legal` | Litigation house group and KP potential | Court outcomes can be too definite | Require confidence and avoid guaranteed results |
| `realEstate` | 4th house, property Nadi, finance cap | Property requires finance/career support | Preserve career+financial cap and add timing evidence |
| `transits` | Enhanced transits, Ashtakavarga, Sade Sati | Uses current date, can become stale | Pass `asOfDate` everywhere and display generation date |
| `surpriseInsights` | Cross-cutting derived insights | High hallucination risk if AI embellishes | Only allow facts present in raw `surpriseInsights` data |
| `remedies` | Weak planets, doshas, advanced remedies | Gemstone/mantra advice can be overconfident | Tie each remedy to a source and mark optional/cultural |

## Nadi Engine Roadmap

Files:

- `server/src/engine/nadi.js`
- `server/src/engine/advanced.js`
- `server/src/engine/astrology.js`
- `server/src/engine/chat.js`

### What Is Already Good

- Implements planet, nakshatra lord, and sub-lord hierarchy.
- Handles Rahu/Ketu through conjunction, aspects, and sign lord dispositor.
- Defines event house groups for marriage, career, education, children, property, foreign travel, health, litigation, longevity, wealth, windfall, and spiritual growth.
- Produces event summaries, denied events, career sectors, education grading, and best marriage dasha planets.
- `generateFullReport()` injects Nadi-derived fields into many report sections.

### Issues To Fix

1. Fix aspect distance counting.
2. Validate cuspal sub-lord degrees against actual house cusps, not only bhava midpoint/start assumptions.
3. Add tests for every house group verdict: strong, mixed, denied, and ordinary.
4. Treat longevity output as a confidence/longevity-strength indicator, not an exact lifespan prediction.
5. Add a Nadi provenance block to the AI payload so the AI can say which event was supported by which planets and house groups.
6. Add boundary tests for nakshatra/sub-lord changes at exact divisional edges.

### Suggested Nadi Data Contract For AI

```js
{
  event: 'marriage',
  verdict: 'strong',
  score: 72,
  confidence: 'medium',
  supportingPlanets: [
    { planet: 'Venus', level: 'subLord', houses: [2, 7, 11], score: 84 }
  ],
  negatingPlanets: [
    { planet: 'Saturn', level: 'planet', houses: [1, 6], score: -22 }
  ],
  bestDashaPlanets: ['Venus', 'Jupiter'],
  source: 'nadi.significatorTable.v1'
}
```

## Advanced Engine Roadmap

Files:

- `server/src/engine/advanced.js`
- `server/src/engine/chat.js`

### What Is Already Good

- Advanced engine covers the major high-value systems expected in a premium Vedic app.
- AI report already includes an advanced block with doshas, yogas, Jaimini, Shadbala, Bhrigu Bindu, avasthas, pratyantardasha, extended vargas, KP sub-lords, past-life indicators, Nadi amsha, Sarvatobhadra, Varshphal, enhanced transits, and Jyotish cross-validation.

### Issues To Fix

1. Stop recomputing advanced analysis separately in raw report and AI prompt generation.
2. Pass `lat`, `lng`, `settings`, and `asOfDate` into every advanced sub-function.
3. Replace fixed `+5.5` hour logic in Shadbala/time-of-day calculations with resolved local time metadata.
4. Add validation tests for D7, D10, D24, D60 edge cases.
5. Make current transit features reproducible by accepting `asOfDate` instead of using `new Date()` internally.
6. Add source confidence for approximated systems, especially Nadi amsha naming and past-life analysis.

## AI Report Wiring Roadmap

Files:

- `server/src/engine/chat.js`
- `server/src/engine/aiContext.js`
- `server/src/engine/ai-agents.js`
- `server/src/engine/preValidator.js`
- `server/src/engine/reportValidator.js`
- `server/src/engine/crossSectionValidator.js`
- `server/src/routes/horoscope.js`

### What Is Already Good

- The AI is interpretation-only; deterministic engines calculate the chart.
- The report pipeline has pre-validation, post-validation, cross-section validation, retries, and progress tracking.
- Confidence tiers from `accuracyEngine.js` are injected into section prompts.
- A multi-agent architecture exists as code in `ai-agents.js`.

### Issues To Fix

1. Create one shared AI payload builder for full report, chat, and multi-agent context.
2. Add calculation metadata to every prompt and saved report.
3. Do not display fixed Sri Lanka time for non-Sri Lankan/global birth data.
4. Wire `ai-agents.js` deliberately or remove/mark it experimental to avoid drift.
5. Add validator coverage for source contradiction, not only narrative contradiction.
6. Add section-level minimum data requirements so the AI knows when to skip or hedge.
7. Record which model generated each section and which validators changed it.

### AI Prompt Contract

Every AI section should receive:

```js
{
  sectionKey: 'career',
  calculationMetadata: {
    engineVersion: '...',
    ephemeris: 'swiss_bundled',
    requestedFlags: ['SwissEphemeris', 'Sidereal', 'Speed'],
    returnedFlagsOk: true,
    ayanamsha: 'lahiri',
    houseSystem: 'whole_sign',
    nodeType: 'true',
    observerMode: 'geocentric',
    timezone: { zoneName: 'Asia/Colombo', offsetSeconds: 19800, source: 'traditional_slt' },
    asOfDate: '2026-05-07T00:00:00.000Z'
  },
  confidence: {
    sectionTier: '★★',
    reasons: ['Birth time near lagna boundary', 'D9 confirms career but transit timing is mixed']
  },
  deterministicData: {},
  sourceMap: {
    careerScore: 'core.tenthHouse.strengthScore',
    d10: 'advanced.extendedVargas.D10',
    nadiCareer: 'nadi.events.career_service',
    kpCareer: 'kp.events.career_change'
  },
  instructions: [
    'Do not recalculate astronomy.',
    'Do not invent scores, dates, or events.',
    'If confidence is low, hedge the claim.',
    'If sources conflict, prefer the sourceMap priority and mention uncertainty.'
  ]
}
```

## Implementation Phases

### Phase 1: Accuracy Metadata and Safety Fixes

Target: immediate trust improvements.

Tasks:

- Add central `calculationSettings` and `calculationMetadata` objects.
- Check Swiss return flags and expose warnings.
- Add native Swiss sidereal helper and migrate Moon/Sun/planet core paths.
- Fix Nadi aspect distance counting.
- Pass `lat`, `lng`, and `asOfDate` through advanced and accuracy engines.
- Update Porondam date parsing to use `parseBirthDateTime()` per person.
- Remove hardcoded Sri Lanka time labels from global report prompts; use `timeContext`.

Acceptance checks:

- Existing reports still generate.
- Every saved AI report contains calculation metadata.
- Nadi aspect unit tests pass.
- No report prompt says UTC+5:30 unless that is the resolved/assumed timezone.

### Phase 2: Validation Harness

Target: reproducible accuracy.

Tasks:

- Build benchmark tests from existing `server/benchmark/dataset.js`.
- Add reference vectors for Sun, Moon, Lagna, Rahu, nakshatra, tithi, and panchanga boundaries.
- Add tests for Sri Lanka 1996-2006 traditional time handling.
- Add tests for Porondam bride/groom non-Sri-Lankan timezone parsing.
- Add tests for varga boundary rounding.
- Add regression tests for report section coherence and validator behavior.

Acceptance checks:

- CI can run deterministic engine tests without Gemini.
- Boundary cases are documented and stable.
- Any change in ephemeris/settings creates an intentional snapshot update, not silent drift.

### Phase 3: Panchanga and Timing Upgrade

Target: match top panchanga app expectations.

Tasks:

- Add transition end-times for tithi, nakshatra, yoga, karana.
- Add moonrise/moonset and moon sign change times.
- Add Rahu Kalam, Gulika Kalam, and hora end-times with local display time.
- Include uncertainty notes for sunrise/sunset near horizon and for approximate locations.

Acceptance checks:

- Daily panchanga API returns current value plus end time.
- AI can describe what changes later today without guessing.

### Phase 4: AI Payload and Multi-Agent Wiring

Target: better narrative accuracy and less hallucination.

Tasks:

- Build a shared deterministic payload builder.
- Wire `ai-agents.js` intentionally as either:
  - a pre-report specialist analysis pass, or
  - an internal experimental module not used in production.
- Add source maps and confidence to every section.
- Extend cross-section validator to compare raw source claims, not only age-window text.
- Store validator metadata with saved reports.

Acceptance checks:

- Each narrative section can be traced to source fields.
- Failed/low-confidence data is omitted or hedged, not invented.
- The same raw report input generates stable section facts even if narrative wording varies.

### Phase 5: Configurable Expert Mode

Target: serious-user credibility.

Tasks:

- Expose calculation mode presets:
  - Sri Lankan traditional default.
  - Standard Lahiri geocentric.
  - KP-focused mode.
  - research/debug mode.
- Add optional settings for ayanamsha, node type, house system, and sunrise mode.
- Persist settings with each report.
- Add a report footer or metadata screen explaining calculation choices.

Acceptance checks:

- Reports are reproducible from saved settings.
- Users and support can inspect exactly how a chart was calculated.

## Suggested Engineering Checklist

### Short-Term Pull Requests

1. `calculationSettings` and `calculationMetadata` skeleton.
2. Native sidereal helper and core Moon/Sun/planet migration.
3. Nadi aspect off-by-one fix with unit tests.
4. Porondam timezone parsing fix.
5. `asOfDate` propagation through advanced/accuracy/current transit paths.
6. Replace hardcoded SLT report labels with `timeContext`.

### Medium-Term Pull Requests

1. Panchanga transition end-times.
2. Benchmark harness and CI command.
3. Shared AI payload builder.
4. Source-map metadata in AI prompts and saved reports.
5. Cross-section validator expansion.

### Long-Term Pull Requests

1. Expert calculation settings UI/API.
2. Full multi-agent report pipeline or removal of unused multi-agent code.
3. Calibration from user feedback and benchmark chart corpus.
4. JPL/Horizons optional validation tooling for research mode, not normal runtime.

## Open Questions

1. Should Grahachara always use Sri Lankan traditional UTC+5:30 for Sri Lanka births from 1996-2006, or should users be allowed to choose civil historical offset?
2. Should topocentric mode be enabled by default only for Moon/Lagna-sensitive systems, or kept as an expert setting?
3. Should KP mode use true node, mean node, or expose both?
4. Should AI reports include a visible confidence/provenance summary, or keep it internal for now?
5. Should exact longevity estimates from Nadi be removed from user-facing outputs and kept only as internal health/longevity strength indicators?

## Recommended Next Step

Start with Phase 1. It has the best risk-to-reward ratio because it improves correctness, reproducibility, and AI trust without changing the product surface. The first concrete code change should be the Nadi aspect fix plus tests, followed by calculation metadata and timezone provenance.