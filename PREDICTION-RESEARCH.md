# 🔮 Nakath AI — Massive Research: Predicting Past, Present & Future
## Comprehensive Gap Analysis & Implementation Roadmap

**Date:** March 2026  
**Engine:** NakathAI v3.0 (astrology.js: 4500 lines, advanced.js: 1998 lines)

---

## 📊 CURRENT CAPABILITIES AUDIT

### ✅ What We HAVE (Implemented)

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Planetary positions (9 Grahas) | `astrology.js` | ✅ Full |
| 2 | Lahiri Ayanamsha (sidereal) | `astrology.js` | ✅ Full |
| 3 | Nakshatra determination (27) | `astrology.js` | ✅ Full |
| 4 | Rashi determination (12) | `astrology.js` | ✅ Full |
| 5 | Lagna (Ascendant) | `astrology.js` | ✅ Full |
| 6 | Panchanga (Tithi, Yoga, Karana, Vaara, Nakshatra) | `astrology.js` | ✅ Full |
| 7 | Rahu Kalaya | `astrology.js` | ✅ Full |
| 8 | Brahma & Abhijit Muhurtha | `astrology.js` | ✅ Full |
| 9 | D1 Rashi Chart (12 houses) | `astrology.js` | ✅ Full |
| 10 | D9 Navamsha Chart | `astrology.js` | ✅ Full |
| 11 | Shadvarga (6 divisional charts: D1, D2, D3, D9, D12, D30) | `astrology.js` | ✅ Full |
| 12 | Graha Drishti (planetary aspects per BPHS) | `astrology.js` | ✅ Full |
| 13 | Pushkara Navamsha & Bhaga | `astrology.js` | ✅ Full |
| 14 | Ashtakavarga (Sarvashtakavarga) | `astrology.js` | ✅ Full |
| 15 | Bhava Chalit Chart | `astrology.js` | ✅ Full |
| 16 | Vimshottari Dasha (MD + AD) | `astrology.js` | ✅ Full |
| 17 | Vimshottari Detailed (MD + AD + effects) | `astrology.js` | ✅ Full |
| 18 | Basic Yoga detection (6 yogas) | `astrology.js` | ✅ Full |
| 19 | Planet strength (simplified Shadbala) | `astrology.js` | ✅ Full |
| 20 | Marriage timing (7-layer system) | `astrology.js` | ✅ Full |
| 21 | Full report (20 sections!) | `astrology.js` | ✅ Full |
| 22 | Functional benefic/malefic per Lagna (BPHS Ch.34) | `astrology.js` | ✅ Full |
| 23 | House analysis (deep 12-house reading) | `astrology.js` | ✅ Full |
| 24 | Dosha detection (8 doshas) | `advanced.js` | ✅ Full |
| 25 | Advanced Yogas (25+ yogas) | `advanced.js` | ✅ Full |
| 26 | Jaimini Karakas (7 Chara Karakas) | `advanced.js` | ✅ Full |
| 27 | Karakamsha Analysis | `advanced.js` | ✅ Full |
| 28 | Arudha Lagna & Upapada Lagna | `advanced.js` | ✅ Full |
| 29 | Full Shadbala (6-component) | `advanced.js` | ✅ Full |
| 30 | Bhrigu Bindu | `advanced.js` | ✅ Full |
| 31 | Planetary Avasthas | `advanced.js` | ✅ Full |
| 32 | Extended Varga charts (D7, D10, D60, etc.) | `advanced.js` | ✅ Full |
| 33 | Pratyantardasha (3rd level dasha) | `advanced.js` | ✅ Full |
| 34 | Nadi Amsha (150 sub-divisions) | `advanced.js` | ✅ Full |
| 35 | KP Sub-Lords (Krishnamurti Paddhati) | `advanced.js` | ✅ Full |
| 36 | Past Life Analysis | `advanced.js` | ✅ Full |
| 37 | Sarvatobhadra Chakra | `advanced.js` | ✅ Full |
| 38 | Porondam (7-factor compatibility) | `porondam.js` | ✅ Full |
| 39 | Birth Time Rectification | `rectification.js` | ✅ Full |
| 40 | AI Chat (context-aware) | `chat.js` | ✅ Full |
| 41 | 25-Year Timeline | `astrology.js` | ✅ Full |
| 42 | Health Blueprint | `astrology.js` | ✅ Full |
| 43 | Foreign Travel Analysis | `astrology.js` | ✅ Full |
| 44 | Career Analysis | `astrology.js` | ✅ Full |
| 45 | Education Analysis | `astrology.js` | ✅ Full |
| 46 | Luck & Fortune Analysis | `astrology.js` | ✅ Full |
| 47 | Spiritual Journey | `astrology.js` | ✅ Full |
| 48 | Legal/Enemies Analysis | `astrology.js` | ✅ Full |
| 49 | Surprise Physical Insights | `astrology.js` | ✅ Full |

---

## ❌ WHAT'S MISSING — Comprehensive Gap Analysis

### 🔴 CATEGORY 1: TRANSIT SYSTEM (Present & Near-Future Predictions)

**This is the single biggest gap in the platform.** The current engine is heavily natal-chart-focused. Real-time and near-future predictions require a proper transit engine.

#### 1.1 Gochara (Transit) Engine — **CRITICAL MISSING**
The platform currently only checks transits inside marriage timing and Sade Sati detection. It has NO dedicated transit engine for general life predictions.

**What a proper Gochara engine needs:**
- **Real-time transit positions** of all 9 grahas mapped against natal chart houses
- **Vedha (obstruction) pairs** — transit effects are blocked when another planet is in the Vedha point (partially done in Sarvatobhadra but not applied to predictions)
- **Ashtakavarga transit scoring** — use the already-computed SAV scores to rate transit quality through each house (the SAV is computed but NOT used for transit analysis)
- **Transit results by house** — Jupiter in 2nd = wealth gain, Saturn in 8th = health crisis, etc. (complete mapping for all 9 planets × 12 houses = 108 combinations)
- **Speed/retrograde analysis** — planets in retrograde have different transit effects
- **Combustion** — planets too close to the Sun are weakened (not implemented)

**What this enables:**
- "What will happen this month/week/year?"
- "Is this a good time to start a business?"
- "When will my financial situation improve?"
- Daily/weekly/monthly predictions (currently only Panchanga-level daily info)

#### 1.2 Transit-Dasha Integration — **CRITICAL MISSING**
The most accurate Vedic predictions come from combining dashas with transits. Currently:
- ✅ Dashas are computed (MD, AD, PD)
- ✅ Transits are computed for individual planets
- ❌ **They are NOT combined** for predictions (except in marriage timing)

**What's needed:**
- When the current Dasha lord transits a key house → EVENT happens
- When transit Jupiter/Saturn activate the Dasha lord's natal position → AMPLIFIED effects
- Transit of slow planets (Jupiter, Saturn, Rahu/Ketu) over natal planet positions
- Planetary return analysis (Saturn return at ~29, Jupiter return at ~12 years)

#### 1.3 Monthly/Weekly Prediction Engine — **MISSING**
No system to generate "This month's predictions" beyond daily Panchanga. Need:
- Moon transit through all 12 signs (~2.5 days each) → emotional/daily effects
- Sun transit through signs (~30 days each) → monthly themes
- Mars/Mercury/Venus transits → short-term event triggers
- Jupiter transit analysis (~13 months per sign) → yearly theme
- Saturn transit analysis (~2.5 years per sign) → long-term trends

---

### 🔴 CATEGORY 2: TIMING OF EVENTS (When Will X Happen?)

#### 2.1 Event Timing Engine — **PARTIALLY MISSING**
Only marriage timing is implemented. Need similar engines for:

| Event | Technique | Status |
|-------|-----------|--------|
| Marriage timing | Dasha + Transit + D9 | ✅ Done |
| Career change/promotion | 10th lord dasha + Jupiter/Sun transit | ❌ Missing |
| Wealth arrival | 2nd/11th lord dasha + Jupiter transit over 2/11 | ❌ Missing |
| Childbirth timing | 5th lord dasha + Jupiter transit 5th/9th + D7 | ❌ Missing |
| Health crisis timing | 6th/8th lord dasha + Saturn/Mars transit | ❌ Missing |
| Foreign travel timing | Rahu dasha + 12th/9th lord + Rahu transit | ❌ Missing |
| Property purchase timing | 4th lord dasha + Mars/Venus transit | ❌ Missing |
| Education success timing | Mercury/Jupiter dasha + 4th/5th transit | ❌ Missing |
| Business success timing | 7th/10th lord + Jupiter transit | ❌ Missing |
| Accident/danger periods | Mars/Rahu dasha + malefic transit 8th | ❌ Missing |

#### 2.2 Muhurtha (Electional Astrology) — **PARTIALLY MISSING**
Currently only Brahma Muhurtha and Abhijit Muhurtha are implemented. A full Muhurtha engine would provide:
- **Wedding Muhurtha** — best dates/times for marriage ceremony
- **Business Start Muhurtha** — best dates to register a company, sign contracts
- **Vehicle Purchase Muhurtha** — auspicious time for buying vehicles
- **House Construction Muhurtha** — ground-breaking ceremony timing
- **Travel Muhurtha** — when to start a journey
- **Name Ceremony Muhurtha** — baby naming ceremony timing
- **Exam Muhurtha** — best times to sit for exams

**What's needed:**
- Check Tithi suitability (avoid Rikta Tithis for positive events)
- Check Nakshatra suitability (fixed Nakshatras for weddings, moveable for travel, etc.)
- Check Yoga/Karana suitability
- Avoid Rahu Kala, Gulika Kala, Yamaghanta Kala
- Check Moon's strength (avoid Kemadruma, debilitation, etc.)
- Tarabala (Nakshatra compatibility with the person's natal Nakshatra)
- Chandrabala (Moon's house position relative to natal Moon)

#### 2.3 Gulika Kala & Yamaghanta Kala — **MISSING**
Currently only Rahu Kala is computed. Three more inauspicious periods should be calculated:
- **Gulika Kala** (Mandi) — sub-period ruled by Saturn, considered most malefic
- **Yamaghanta** — death-related sub-period
- **Durmuhurtha** — general inauspicious sub-period

These are essential for proper daily Nakath calculations in Sri Lankan tradition.

---

### 🔴 CATEGORY 3: ADVANCED DASHA SYSTEMS (Past & Future)

#### 3.1 Yogini Dasha — **MISSING**
An alternative 36-year dasha system that many astrologers prefer for timing:
- 8 Yoginis: Mangala (1yr), Pingala (2yr), Dhanya (3yr), Bhramari (4yr), Bhadrika (5yr), Ulka (6yr), Siddha (7yr), Sankata (8yr)
- Based on Moon's Nakshatra (different mapping than Vimshottari)
- Total cycle = 36 years (shorter, more precise for medium-term predictions)
- Especially good for confirming Vimshottari predictions

#### 3.2 Chara Dasha (Jaimini) — **MISSING**
Jaimini Karakas are implemented, but the actual Chara Dasha system is not:
- Sign-based dashas (not planet-based like Vimshottari)
- Dasha sequence based on the Lagna sign (odd/even determines direction)
- 12 Mahadashas × 12 Antardashas = different prediction framework
- Particularly good for career, marriage, and travel timing
- Uses Pada (Arudha) system heavily

#### 3.3 Narayana Dasha — **MISSING**
Another Jaimini dasha based on the 1st house:
- More precise than Chara Dasha for some events
- Sign-based periods calculated from Lagna Lord position

#### 3.4 Sookshma Dasha (4th level) — **MISSING**
Currently have MD → AD → PD. The 4th level (Sookshma Dasha) gives even more precision:
- Each Pratyantardasha has 9 sub-sub-periods
- Useful for pinpointing exact weeks of events
- Formula: (MD years × AD years × PD years × SD years) / 120³

#### 3.5 Prana Dasha (5th level) — **MISSING**
5th level dasha — pinpoints exact DAYS of events:
- Used by advanced astrologers for "will X happen today?"
- Most useful for Muhurtha/electional work

---

### 🔴 CATEGORY 4: PREDICTION FRAMEWORKS

#### 4.1 Bhava Phala (House Results) Prediction Engine — **PARTIALLY MISSING**
The report has house analysis, but lacks a structured prediction engine that says:
- "Based on 7th lord in 10th house, you will meet your spouse through work"
- "Based on 5th lord in 12th house, your firstborn may live abroad"
- Need complete BPHS-based Bhava Phala interpretations (12 houses × multiple combinations)

**Needed: ~200+ structured interpretations covering:**
- Lord of house X in house Y (12 × 12 = 144 combinations)
- Planet X in house Y (9 × 12 = 108 combinations)
- Planet X aspecting house Y (major aspect combinations)

#### 4.2 Ashtakvarga-Based Predictions — **PARTIALLY MISSING**
SAV (Sarvashtakavarga) is computed but NOT used for predictions:
- Houses with SAV > 28 points → strong, positive results
- Houses with SAV < 25 points → weak, challenging results
- Transit planets through high-SAV signs → good results
- Transit planets through low-SAV signs → difficulties
- Bindus of individual planets (BAV) can predict specific planet transits

**Critical missing application:**
- "Jupiter is transiting Aries which has 32 SAV points → excellent year for areas governed by that house"
- "Saturn entering a house with only 18 SAV points → very difficult period"

#### 4.3 Annual Predictions (Varshaphala / Tajaka) — **COMPLETELY MISSING**
Solar return chart (Varshaphala) is a major prediction technique:
- Cast chart for the exact moment Sun returns to natal position each year
- Muntha (progressed ascendant) moves one sign per year
- Sahams (Arabic Parts adapted to Vedic) — 16 Sahams for different life areas
- Tajaka Yogas — 16 specific annual chart yogas
- Year Lord determination — which planet rules the current year

This is how most astrologers generate "this year's predictions" — and it's completely absent.

#### 4.4 Prashna Kundali (Horary Astrology) — **COMPLETELY MISSING**
Chart cast for the moment a question is asked:
- "Will I get this job?" → cast chart NOW, analyze 10th house
- "Is this person right for me?" → cast chart NOW, analyze 7th house
- Uses current planetary positions, Lagna at the moment, Arudha
- Very popular in Sri Lankan tradition (ප්‍රශ්න ශාස්ත්‍රය)
- Simpler for users who don't know exact birth time

#### 4.5 Sudarshan Chakra — **MISSING**
Triple-chart analysis viewing chart from 3 perspectives simultaneously:
- From Lagna (physical/material events)
- From Moon (emotional/mental events)  
- From Sun (soul/career/authority events)
- Each house analyzed from all 3 reference points = more nuanced predictions

---

### 🔴 CATEGORY 5: COMPATIBILITY & RELATIONSHIPS

#### 5.1 Extended Compatibility (Beyond Porondam) — **PARTIALLY MISSING**
Current: 7-factor Nakshatra-based Dasha Porondam (20 points). Missing:

- **Rajju Porondam** — critical in Sri Lankan tradition! Determines physical compatibility and lifespan. Same Rajju = dangerous.
- **Vedha Porondam** — star incompatibility that overrides all other matches
- **Stree Deergha** — man's Nakshatra should be 13+ stars ahead of woman's
- **Mangalya (Sumangali) Dosha** — checks if the woman will remain married (widowhood risk)
- **Chart-level compatibility** — comparing actual birth charts (planets, houses, dashas) not just Nakshatras
- **7th house lord exchange** — checking if both partners' 7th lords have a relationship
- **Venus-Mars compatibility** — cross-checking Venus/Mars positions in both charts
- **Dasha compatibility** — are both partners in compatible dasha periods?
- **D9 (Navamsha) compatibility** — Navamsha chart comparison for deeper marriage compatibility
- **Composite chart** — midpoint analysis of two birth charts

#### 5.2 Relationship Timeline — **MISSING**
- When will conflicts arise in the marriage?
- When is the second marriage window? (if applicable)
- When is the best period for having children?
- Extramarital risk periods (Mars/Rahu in 7th during certain dashas)

---

### 🔴 CATEGORY 6: SPECIALIZED PREDICTION DOMAINS

#### 6.1 Financial Astrology — **BASIC ONLY**
Current: basic wealth analysis in report. Missing:
- **Dhana Yoga activation timing** — when will existing wealth yogas activate?
- **Business cycle predictions** — favorable months for business expansion
- **Stock market timing** — (general: favorable/unfavorable months for investments)
- **Debt clearance timing** — when will 6th house pressures ease?
- **Property value timing** — best periods for real estate transactions

#### 6.2 Medical Astrology — **BASIC ONLY**
Current: Health Blueprint with planet-body mapping. Missing:
- **Disease onset timing** — when specific health issues may manifest
- **Surgery timing** — best dates for planned surgery (Muhurtha)
- **Recovery periods** — when Jupiter/benefic transits aid healing
- **Mental health crisis periods** — Moon-Saturn, Moon-Rahu transit triggers
- **Pandemic/epidemic susceptibility** — Rahu-Ketu transit through health houses
- **Ayurvedic body type (Prakriti)** mapping from chart — Vata/Pitta/Kapha determination

#### 6.3 Career Astrology — **BASIC ONLY**
Current: career suggestions by 10th house. Missing:
- **Job change timing** — specific windows for switching jobs
- **Business vs. Service** — detailed analysis of 7th vs 10th house strength
- **Partnership timing** — when to enter/exit business partnerships
- **Salary peaks** — 11th house activation periods
- **Government job indicators** — Sun-Saturn-10th house specific analysis
- **Self-employment timing** — 3rd/7th lord activation
- **Career change directions** — Dasamsa (D10) chart analysis for career path

#### 6.4 Education Astrology — **BASIC ONLY**
Missing:
- **Exam success timing** — Mercury/Jupiter dasha + transit analysis
- **Competitive exam prediction** — Mars + 6th house analysis
- **Higher education abroad** — 9th/12th + Rahu analysis
- **Subject selection guidance** — from D24 (Siddhamsha) chart
- **PhD/research timing** — 8th house (research) + Ketu analysis

---

### 🔴 CATEGORY 7: SRI LANKAN SPECIFIC TRADITIONS

#### 7.1 Sinhala Jyotish Traditions — **PARTIALLY MISSING**
- **Nekath Pelapala** — traditional daily fortune by Nekath (partially done)
- **Litha (Calendar) integration** — Sri Lankan Sinhala/Tamil calendar events
- **Avurudu Nekath** — Sinhala/Tamil New Year auspicious times (specific calculations)
- **Nakata Vasana** — Nakshatra-based personality traits (Sri Lankan interpretation, different from Indian)
- **Kema Nakath** — specific auspicious times for cooking, eating first food of the year
- **Ganu Denu Nekath** — financial transaction auspicious times
- **Panchangaya in Sinhala format** — Sri Lankan traditional Panchangaya format

#### 7.2 Sri Lankan Wedding Traditions — **PARTIALLY MISSING**
- **Poruwa ceremony timing** — specific Muhurtha for stepping onto Poruwa
- **Milk boiling ceremony** — auspicious time
- **Jayamangala Gatha recital timing**
- **Nekath for sending proposals (Magul Kapuwa)**
- **Direction to face during ceremony** (based on Lagna at ceremony time)

---

### 🔴 CATEGORY 8: TECHNICAL/COMPUTATION GAPS

#### 8.1 Planetary Calculations
- **Combustion** — planets within certain degrees of the Sun lose strength (NOT implemented)
- **Retrogression effects** — planets in retrograde have different effects (computed but NOT interpreted)
- **Planetary war (Graha Yuddha)** — when two planets are within 1° (NOT implemented)
- **Gandanta zones** — junction points between water and fire signs (NOT implemented)
  - Moon in Gandanta = emotional crisis indicator
  - Critical degrees: 29° Cancer/0° Leo, 29° Scorpio/0° Sagittarius, 29° Pisces/0° Aries
- **Bhava Madhya & Bhava Sandhi** — exact house cusp midpoints (partially done via Bhava Chalit)

#### 8.2 Chart Calculations
- **D7 (Saptamsha)** — children/progeny analysis (computed but not interpreted)
- **D10 (Dasamsha)** — career/profession (computed but not interpreted)  
- **D16 (Shodashamsha)** — vehicles and luxuries
- **D20 (Vimshamsha)** — spiritual progress
- **D24 (Siddhamsha/Chaturvimshamsha)** — education
- **D40 (Khavedamsha)** — maternal lineage
- **D45 (Akshavedamsha)** — paternal lineage
- **D60 (Shashtiamsha)** — overall karma (computed but limited interpretation)

#### 8.3 Missing Upagraha (Sub-Planets)
- **Gulika/Mandi** — Saturn's son, most malefic sub-planet (essential for timing)
- **Dhuma** — smoky planet from Sun
- **Vyatipata** — negative yoga point
- **Parivesha** — halo around Sun
- **Indrachapa** — rainbow planet
- **Upaketu** — comet-like sub-planet

---

### 🔴 CATEGORY 9: USER EXPERIENCE & ENGAGEMENT FEATURES

#### 9.1 Predictive Notifications — **MISSING**
- Push notifications for upcoming auspicious/inauspicious periods
- "Tomorrow's Rahu Kalaya is from X to Y"
- "Your favorable period starts next week (Jupiter transit)"
- "Caution: Saturn entering your 8th house on [date]"
- "Best day this month for starting new business: [date]"

#### 9.2 Comparative Analysis — **MISSING**
- "Compare your chart with a friend/family member"
- "How compatible are you with [person]?" (beyond Porondam)
- Year-over-year comparison: "Last year vs. this year"
- Dasha comparison between family members

#### 9.3 Remedial Tracking — **MISSING**
- Track which remedies user is performing
- Suggest remedies based on current transit challenges
- Mantra counter / meditation tracker
- Temple visit recommendations based on current planetary period
- Gem wearing schedule with do's and don'ts

#### 9.4 Life Event Logging — **MISSING**
- User logs life events (got job, married, had child, bought house)
- System correlates events with dashas/transits retroactively
- Improves future prediction accuracy
- Validates birth time accuracy
- Creates a "karmic journal"

---

## 🏗️ IMPLEMENTATION PRIORITY ROADMAP

### Phase 1: THE TRANSIT ENGINE (Highest Impact) ⭐⭐⭐⭐⭐
**Impact:** Enables present & future predictions — the #1 user demand
**Effort:** ~800-1000 lines of code

```
New file: server/src/engine/transit.js

Functions needed:
├── getCurrentTransits(date, natalChart)     — map transits to natal houses
├── getTransitPredictions(date, natalChart)   — 108 transit interpretations
├── getAshtakavargaTransit(date, natalChart)  — SAV-scored transit quality
├── getDashaPlusTransit(date, natalChart)     — combined dasha+transit predictions
├── getMonthlyForecast(month, natalChart)     — monthly prediction summary
├── getWeeklyForecast(week, natalChart)       — weekly prediction summary
├── getDailyForecast(date, natalChart)        — daily prediction with Nakshatra transit
├── getYearlyTheme(year, natalChart)          — Jupiter/Saturn annual theme
├── getRetrogradePeriods(year)                — all retrograde windows for the year
└── getPlanetaryReturn(planet, natalChart)    — Saturn return, Jupiter return, etc.
```

### Phase 2: EVENT TIMING ENGINES ⭐⭐⭐⭐
**Impact:** "When will X happen?" — second most popular query type
**Effort:** ~600 lines (reuse marriage timing pattern)

```
Extend: server/src/engine/astrology.js or new file: server/src/engine/timing.js

Functions needed:
├── predictCareerTiming(natalChart)           — job change / promotion windows
├── predictWealthTiming(natalChart)           — financial prosperity windows
├── predictChildTiming(natalChart)            — childbirth windows
├── predictForeignTravelTiming(natalChart)    — travel/relocation windows
├── predictHealthCrisis(natalChart)           — health danger periods
├── predictPropertyTiming(natalChart)         — real estate purchase windows
├── predictEducationTiming(natalChart)        — exam success / study abroad windows
└── predictBusinessTiming(natalChart)         — business start/expansion windows
```

### Phase 3: MUHURTHA ENGINE ⭐⭐⭐⭐
**Impact:** "When should I do X?" — essential for Sri Lankan users
**Effort:** ~500 lines

```
New file: server/src/engine/muhurtha.js

Functions needed:
├── findMuhurtha(eventType, dateRange, natalChart)  — find best time in range
├── checkDateQuality(date, eventType)               — rate a specific date
├── getWeddingMuhurtha(month, bride, groom)          — wedding dates
├── getBusinessMuhurtha(month, natalChart)           — business start dates
├── getVehicleMuhurtha(month, natalChart)            — vehicle purchase dates
├── getHouseMuhurtha(month, natalChart)              — construction dates
├── getTravelMuhurtha(month, direction, natalChart)  — travel dates
├── calculateGulika(date, lat, lng)                  — Gulika Kala
├── calculateYamaghanta(date, lat, lng)              — Yamaghanta Kala
├── calculateTarabala(transitNakshatra, natalNak)    — Nakshatra compatibility
└── calculateChandrabala(transitMoon, natalMoon)     — Moon position quality
```

### Phase 4: VARSHAPHALA (Annual Predictions) ⭐⭐⭐
**Impact:** "What will happen this year?" — very popular query
**Effort:** ~400 lines

```
New file: server/src/engine/varshaphala.js

Functions needed:
├── castSolarReturn(natalChart, year)         — annual chart
├── calculateMuntha(natalChart, year)          — progressed ascendant
├── calculateYearLord(natalChart, year)        — year's ruling planet
├── calculateSahams(annualChart)              — 16 Arabic Parts
├── detectTajakaYogas(annualChart)            — 16 annual yogas
└── generateAnnualPredictions(natalChart, year) — complete yearly reading
```

### Phase 5: PRASHNA (Horary Astrology) ⭐⭐⭐
**Impact:** Perfect for users without birth time; answers specific questions
**Effort:** ~300 lines

```
New file: server/src/engine/prashna.js

Functions needed:
├── castPrashnaChart(question, lat, lng)       — chart for NOW
├── analyzePrashna(prashnaChart, questionType) — interpret for the question
├── getQuickAnswer(questionType)               — yes/no based on Lagna/Moon
├── getPrashnaCompatibility(lat, lng)          — relationship question
└── getPrashnaCareer(lat, lng)                 — career question
```

### Phase 6: EXTENDED COMPATIBILITY ⭐⭐⭐
**Impact:** Marriage is huge in SL market; deeper compatibility analysis
**Effort:** ~300 lines

```
Extend: server/src/engine/porondam.js

Functions needed:
├── calculateRajjuPorondam(nak1, nak2)         — critical SL tradition
├── calculateVedhaPorondam(nak1, nak2)          — incompatibility check
├── calculateStreeDheergha(nak1, nak2)          — nakshatra distance
├── compareCharts(chart1, chart2)               — full chart compatibility
├── compareDashas(dasha1, dasha2)               — dasha period compatibility
├── compareNavamshas(nav1, nav2)                — D9 compatibility
└── generateDetailedCompatibility(birth1, birth2) — comprehensive report
```

### Phase 7: YOGINI DASHA + CHARA DASHA ⭐⭐
**Effort:** ~400 lines

### Phase 8: NOTIFICATION ENGINE ⭐⭐
**Effort:** ~300 lines + mobile integration

### Phase 9: COMBUSTION, GANDANTA, GRAHA YUDDHA ⭐⭐
**Effort:** ~200 lines

### Phase 10: LIFE EVENT LOGGING & CORRELATION ⭐⭐
**Effort:** ~400 lines (server + mobile)

---

## 📐 DETAILED TECHNICAL SPECIFICATIONS

### Transit Engine Data Structure

```javascript
// Transit result for one planet
{
  planet: 'Jupiter',
  transitRashi: 'Mesha',
  transitHouse: 5,         // from natal Lagna
  transitHouseFromMoon: 3, // from natal Moon
  natalHouse: 9,           // where Jupiter sits in natal chart
  isRetrograde: false,
  isCombust: false,
  savScore: 32,            // Ashtakavarga score of transit sign
  bavScore: 5,             // Bindu score for this planet in transit sign
  vedhaBlocked: false,     // is transit effect blocked by Vedha?
  vedhaBlocker: null,
  transitEffect: {
    general: 'Children, creativity, romance flourish. Speculative gains possible.',
    career: 'Creative projects succeed. Teaching/mentoring opportunities.',
    health: 'Generally positive. Digestive system needs attention.',
    relationship: 'Romance blooms. Existing relationships deepen.',
    finance: 'Speculative investments may yield returns.',
    spiritual: 'Mantras and spiritual practices bear fruit.',
  },
  quality: 'Excellent',    // Excellent/Good/Average/Challenging/Difficult
  startDate: '2026-04-01',
  endDate: '2027-05-01',
  activeDashaLord: 'Venus',
  dashaTransitSynergy: 'Venus dasha + Jupiter in 5th = peak romance and creativity period'
}
```

### Event Timing Engine Pattern (reuse marriage timing logic)

```javascript
function predictEventTiming(natalChart, eventType) {
  // eventType: 'career', 'wealth', 'child', 'travel', 'health', 'property'
  
  const EVENT_RULES = {
    career: {
      houses: [10, 6, 2, 11],
      karakas: ['Sun', 'Saturn', 'Mercury'],
      transitTriggers: ['Jupiter over 10th', 'Saturn over 10th lord'],
      dashaRules: ['10th lord MD/AD', 'Sun MD/AD', 'Saturn MD/AD'],
      ageWindow: [18, 60],
    },
    // ... etc for each event type
  };
  
  // Scan each Antardasha, apply rules, score, rank windows
  // (Identical pattern to predictMarriageTiming)
}
```

### Muhurtha Scoring System

```javascript
function scoreMuhurtha(dateTime, eventType, natalChart) {
  let score = 0;
  
  // 1. Tithi suitability (0-15 points)
  // 2. Nakshatra suitability (0-15 points)
  // 3. Yoga suitability (0-10 points)
  // 4. Karana suitability (0-5 points)
  // 5. Rahu Kala avoidance (0 or -20)
  // 6. Gulika Kala avoidance (0 or -15)
  // 7. Yamaghanta avoidance (0 or -10)
  // 8. Tarabala (0-10 points)
  // 9. Chandrabala (0-10 points)
  // 10. Lagna strength (0-10 points)
  
  return { score, maxScore: 100, quality, details };
}
```

---

## 📊 COMPETITIVE ANALYSIS

| Feature | Nakath AI | Astrosage | Kundli Software | Jyotish App |
|---------|-----------|-----------|----------------|-------------|
| Natal Chart | ✅ | ✅ | ✅ | ✅ |
| Divisional Charts | ✅ (6+) | ✅ (16) | ✅ (16) | ✅ (6) |
| Vimshottari Dasha | ✅ (3 levels) | ✅ (5 levels) | ✅ (5 levels) | ✅ (2 levels) |
| Transit Predictions | ❌ | ✅ | ✅ | ✅ |
| Muhurtha | ❌ | ✅ | ✅ | ❌ |
| Varshaphala | ❌ | ✅ | ✅ | ❌ |
| Prashna | ❌ | ❌ | ✅ | ❌ |
| Marriage Timing | ✅ | ✅ | ✅ | ❌ |
| AI Chat | ✅ | ❌ | ❌ | ❌ |
| Porondam | ✅ | ✅ (Ashtakoot) | ✅ | ❌ |
| KP System | ✅ | ✅ | ✅ | ❌ |
| Jaimini | ✅ (partial) | ✅ | ✅ | ❌ |
| Sri Lankan Traditions | ✅ | ❌ | ❌ | ❌ |
| Mobile App | ✅ | ✅ | ❌ | ✅ |
| Multi-language (Si/Ta/En) | ✅ | ❌ | ❌ | ❌ |
| Rectification | ✅ | ❌ | ✅ | ❌ |
| Past Life Analysis | ✅ | ❌ | ❌ | ❌ |

**Our Unique Advantages:** AI Chat, Sri Lankan traditions, Sinhala/Tamil, Past Life Analysis, Mobile-first
**Our Biggest Gap:** Transit predictions, Muhurtha, Varshaphala, Event timing (beyond marriage)

---

## 🎯 BOTTOM LINE SUMMARY

### What's EXCELLENT (industry-leading):
1. **Natal chart analysis** — 20-section report with 4500 lines of engine code
2. **Marriage timing** — best implementation I've seen with 10 scoring rules + transit
3. **AI Chat integration** — no competitor has context-aware AI astrology chat
4. **Sri Lankan cultural integration** — unique in the market
5. **Advanced techniques** — Jaimini, KP, Nadi Amsha, Shadbala — most apps don't have these

### What's MISSING (critical for "predict past, present, future"):
1. **🔴 Transit Engine** — THE biggest gap. Without this, we can't predict "what's happening NOW or NEXT"
2. **🔴 Event Timing** — Only marriage has timing; need career, wealth, children, travel, health
3. **🔴 Muhurtha** — "When should I do X?" is the #1 query for Sri Lankan users
4. **🔴 Varshaphala** — "What will happen this year?" is unanswerable without solar returns
5. **🟡 Extended Dasha** — Yogini + Chara + Sookshma would cross-validate predictions
6. **🟡 Prashna** — Horary astrology is huge in SL; doesn't need birth time
7. **🟡 Combustion/Gandanta** — computation gaps that affect accuracy
8. **🟡 Rajju Porondam** — critical SL tradition missing from compatibility

### The Path to "Predict Everything":
```
PAST    → ✅ Past Life Analysis, ✅ Ketu analysis, ✅ D60
          ❌ Need: retroactive event correlation with dashas

PRESENT → ✅ Current dasha period, ✅ Sade Sati detection
          ❌ Need: TRANSIT ENGINE, daily/weekly/monthly predictions

FUTURE  → ✅ 25-year timeline, ✅ Marriage timing
          ❌ Need: All event timing engines, Muhurtha, Varshaphala,
                   Yogini Dasha, transit-dasha integration
```

---

*This document serves as the master reference for completing the Nakath AI prediction system. 
Implementing Phases 1-3 (Transit + Event Timing + Muhurtha) would close ~70% of the gap.*
