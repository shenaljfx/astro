# Grahachara Prompt Engineering Findings and Roadmap

Date: 2026-05-07
Updated: 2026-05-08

Scope: AI report prompts, astrology interpretation prompts, health/organ wording, infant-health wording, timing certainty, validators, prompt evals, and the risk of prompts becoming tuned to one chart such as 1998-10-09 09:16 Colombo.

Implementation progress:

- 2026-05-08: Added section-level prompt policies and evidence-gated claim builders for the first live report sections beyond health/family/relationship: yoga analysis, life predictions, career, financial, children, foreign travel, education, luck, legal, real estate, transits, physical profile, attraction profile, surprise insights, and remedies. The existing `sectionClaimPolicyBlock` pipeline now receives richer allowed-claim payloads without changing the giant narrative prompts yet.
- 2026-05-08: Added prompt-safety tests for career ranking limits, financial investment-advice blocking, child timing omission under marriage denial, legal outcome blocking, and luck/gambling language.

## Executive Summary

The main prompt risk is not one kidney paragraph. The real risk is asymmetric prompt design: one organ, one life event, or one sample chart gets special language, and then the model learns a story pattern that can leak into unrelated users' reports.

The safest direction is to stop adding one-off prompt blocks such as "kidney section", "infant section", or "mother kidney section" directly inside the narrative prompt. Instead, build a generic evidence-gated claim system. The deterministic engine should produce structured claim candidates, and the AI should only translate those allowed claims into human language.

For astrology reports, prompt engineering should follow this contract:

1. The astrology engine calculates; the AI narrates.
2. Every sensitive claim must have a structured evidence object.
3. Missing evidence means omit, not improvise.
4. All organs use the same risk policy; kidney should not be singled out.
5. Infant health uses the same evidence policy as adult health; do not infer NICU, premature birth, illness, or dangerous infancy unless the structured data explicitly supports that level of claim.
6. Timing is symbolic probability, not a promise.
7. Prompts must be tested across many charts, including absence tests, not tuned from one birth time.

## Research Findings

Sources reviewed:

- OpenAI prompt engineering guide: https://developers.openai.com/api/docs/guides/prompt-engineering
- OpenAI evals guide: https://developers.openai.com/api/docs/guides/evals
- Google Gemini prompt design strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies
- Microsoft Azure OpenAI prompt engineering techniques: https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/prompt-engineering
- Anthropic prompt engineering overview: https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/overview
- Anthropic prompting best practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Anthropic success criteria and evaluations: https://platform.claude.com/docs/en/test-and-evaluate/develop-tests

Key lessons from these sources:

1. Define success criteria before prompt tuning.
   Prompt changes should be measured against behavior: no unsupported organ claims, no timing promises, no medical diagnosis language, no chart-specific leakage, no contradictions. If these criteria are not written as tests, prompt iteration becomes guesswork.

2. Ground the model in supplied data.
   The most reliable way to reduce hallucination is to give the model data to use and tell it what to do when data is absent. For this app, the engine data should be the model's limit of truth.

3. Use clear structure and boundaries.
   Markdown/XML-style sections help the model separate instructions from data. The current prompts are large and expressive, but they mix rules, examples, data, emotional writing guidance, and hard constraints in one long template. This increases recency bias and conflicting instruction risk.

4. Use examples carefully.
   Few-shot examples are powerful, but they can overfit. If an example mentions kidney, NICU, marriage age 28-32, or a specific childhood pattern, the model may repeat that pattern. Examples must be diverse and must include negative/absence cases.

5. Positive instructions usually work better than negative instructions.
   Negative examples can seed the exact words we want to avoid. For health prompts, even saying "do not mention stones or UTIs" can prime the model with those terms. Prefer generic rules like "do not mention named conditions unless structured data includes them."

6. Break complex tasks into smaller stages.
   Instead of asking one prompt to classify evidence, decide significance, write a premium narrative, avoid medical overreach, translate language, and self-check, split the pipeline into deterministic stages: claim extraction, claim gating, narrative generation, validation.

7. Use structured outputs where possible.
   If the model must produce a claim list or self-check, ask for JSON with a schema. Long prose should be the final stage, not the first place where factual decisions happen.

8. Build evals and regression tests.
   Prompt changes must be tested with representative data. Evals should include edge cases, absence cases, contradictory data, multiple ages, multiple genders, multiple countries, approximate birth times, and synthetic charts.

9. Tune model parameters by section risk.
   Creative prose sections can use moderate temperature. Sensitive sections such as health, family, marriage, children, legal, and finance should use lower temperature and stronger source constraints.

10. Give the model an out.
   A model should be allowed to say "the chart does not show a strong enough pattern to discuss this" or simply omit a topic. Prompts that require every section to be dramatic force hallucination.

## Astrology-Specific Prompt Engineering Principles

Astrology prompts are different from generic advice prompts because they mix deterministic chart data, interpretive tradition, personal identity, timing, relationships, health, and emotional sensitivity. The right architecture is not "AI astrologer calculates everything." It is "engine calculates, AI explains responsibly."

Recommended principles:

1. Interpret, do not calculate.
   The AI must never recompute planetary positions, dashas, house placements, or scores. It should only translate structured engine output.

2. Separate symbolic meaning from literal events.
   A chart can suggest a theme, pressure point, or timing window. It should not state certainty unless the event is already known from user input.

3. Use confidence labels consistently.
   Every major claim should have confidence: strong, moderate, weak, or omit. Health and relationship claims should require stronger evidence than personality or preference claims.

4. Treat sensitive domains as high-risk.
   Health, mental health, fertility, child timing, divorce, death, parent health, legal outcomes, finances, and trauma should use special safety policy.

5. Avoid one-chart calibration.
   A prompt that was adjusted until it sounds accurate for one birth time can become wrong for everyone else. Prompt success must be measured across a benchmark chart set.

6. Avoid dramatic pressure words.
   Words like MUST, MANDATORY, CRITICAL, EXACT, HERO, DANGER, and "people LOVE" can force the model to overstate and fill gaps. Use policy language instead: allowed, omit, mention briefly, strong evidence required.

7. Make absence a first-class output.
   The engine should explicitly say when something is not present. The prompt should reward omission as a correct behavior.

8. Do not let vividness outrank truth.
   Premium style is good, but only after claim safety. The report should feel personal because it uses real data, not because it invents dramatic details.

## Current Prompt Audit

Files reviewed:

- `server/src/engine/chat.js`
- `server/src/engine/astrology.js`
- `server/src/engine/preValidator.js`
- `server/src/engine/reportValidator.js`
- `server/src/engine/crossSectionValidator.js`

Current strengths:

- The system prompt now says every factual claim must trace to context data.
- Timing and health safety framing were added.
- Calculation provenance is included in section prompts.
- `reportValidator.js` checks impossible years, AI self-disclosure, astrology jargon, vague filler, and unverified numeric scores.
- `preValidator.js` clamps malformed numbers and filters lifespan-sensitive period arrays.
- `crossSectionValidator.js` compares age windows across important sections.
- Kidney wording has already been made more conservative and evidence-gated.

Current risks:

1. Health remains too medically specific.
   The health prompt still asks for organ vulnerability, prevention, screening, and a medical screening calendar. Even with disclaimers, this can become medical advice. The safer target is wellness-oriented vulnerability language plus professional-care guidance when appropriate.

2. Kidney is now protected, but other organs are not equally protected.
   Kidney has a strict gate. Heart, liver, lungs, reproductive, thyroid, nerves, skin, bones, eyes, circulation, and feet still flow through the general organ risk map. That asymmetry can make the app overclaim other organ issues.

3. Infant health wording can overstate.
   The prompt can instruct the model to write about dangerous infant/childhood struggles from chart indicators. This is risky because many users know their early life history. A false infant-health story breaks trust immediately.

4. Prompt language still applies pressure.
   Phrases like MUST, CRITICAL, EXACT, DANGER, direct truth-telling, and long mandatory paragraph counts encourage overconfident statements, especially in sensitive sections.

5. Chart-specific tuning is possible.
   The current prompt history includes changes influenced by the 1998-10-09 09:16 Colombo chart. That is useful for debugging, but dangerous for global prompt policy. The final prompt must pass diverse charts, not only this one.

6. Examples can seed hallucinations.
   Example phrasing such as specific tests, specific age thresholds, or specific family dynamics can be copied even when data is weak. Sensitive examples should be generic or moved into a controlled policy config.

7. The model sees too many raw labels.
   Large context blocks include internal labels like danger periods, health crisis, longevity estimate, and disease verdict. The final public report policy should normalize these labels before the model sees them.

8. Validators are helpful but mostly post-hoc.
   Post-validation can catch numbers and red-flag phrases, but it cannot reliably prove that a prose claim maps to a structured source. Source-aware validation is needed.

## 2026-05-08 Section-Level Research Addendum

Repository research reviewed:

- `server/src/engine/chat.js` currently builds live AI narrative prompts for 19 sections through `sectionOrder`: `yogaAnalysis`, `lifePredictions`, `career`, `marriage`, `marriedLife`, `financial`, `children`, `familyPortrait`, `health`, `physicalProfile`, `attractionProfile`, `foreignTravel`, `education`, `luck`, `legal`, `realEstate`, `transits`, `surpriseInsights`, and `remedies`.
- `mobile/app/(tabs)/report.js` displays 23 section keys: the 19 live AI sections plus `personality`, `mentalHealth`, `spiritual`, and `timeline25`.
- `mobile/components/ReportLoadingScreen.js` and the report screen default progress to 19 sections, matching the server AI generation path.
- `server/src/engine/promptPolicies.js` exists and currently defines detailed policies for health, family portrait, marriage, married life, children, legal, financial, and default sections.
- `server/src/engine/promptClaimBuilder.js` exists and currently builds strong health claims plus generic timing claims, parent wellness claims, family claims, and relationship claims.
- `server/benchmark/validate-prompts.js` and `server/benchmark/prompt-fixtures/` exist and already cover health organ absence/high, infant health, timing certainty, parent health, the 1998 Colombo regression chart, missing birth time, cusp birth time, international timezone, older users, minors, gender, and marital status.

External prompt-engineering research refreshed:

- OpenAI recommends pinning model behavior, using message hierarchy, clear prompt boundaries with Markdown/XML, structured outputs, few-shot examples with diverse inputs, and evals before iteration.
- Gemini documentation emphasizes clear constraints, consistent structures, grounding in supplied context, structured output for complex schemas, breaking complex prompts into chained stages, and lower randomness for deterministic tasks.
- Anthropic documentation emphasizes defining success criteria and building empirical tests before prompt tuning, and choosing prompt engineering only when the failing behavior is controllable by prompt changes.

Product inventory finding:

- The product request says "all 16 sections", but the current code path generates 19 live AI sections and the mobile report has 23 display keys. Before implementation, decide whether the product should remain 19 live sections, become a true 16-section report, or generate AI content for all 23 display keys.
- Recommended near-term decision: keep the live 19-section architecture because server, progress UI, and prompt observability already expect 19. If a true 16-section report is required, consolidate before tuning: merge `marriedLife` into `marriage`, merge `attractionProfile` into `physicalProfile`, and merge `luck` into `remedies` or `lifePredictions`.

## Section-By-Section Prompt Engineering Roadmap

### Shared Section Contract

Every report section should move toward the same architecture:

1. Engine calculates raw facts.
2. Claim builder converts raw facts into allowed claims, omitted topics, confidence, sensitivity, and evidence paths.
3. Narrative prompt receives only the relevant allowed claims, safe summaries, voice rules, and omission rules.
4. Validator checks the prose against the claim IDs and section policy.
5. Observability records prompt version, section policy version, model, temperature, claim counts, validator issues, and user feedback.

Shared prompt skeleton for every section:

```text
<section_contract>
Write only from allowedClaims and safeContext. If evidence is absent, omit the topic. Do not infer missing events, dates, family details, medical details, legal outcomes, financial outcomes, or relationship outcomes.
</section_contract>

<section_policy>
Section: [sectionKey]
Sensitivity: [low|medium|high]
Allowed claim types: [...]
Blocked claim types: [...]
Timing rule: all dates/ages/years are symbolic windows, not promises.
</section_policy>

<allowed_claims>
[JSON]
</allowed_claims>

<omit_topics>
[JSON]
</omit_topics>

<safe_context>
[small, normalized section-specific data]
</safe_context>

<task>
Write warm, specific, jargon-free prose. Mention only supported claims. Keep sensitive topics calm and probabilistic.
</task>
```

### Section 1: `yogaAnalysis` - Chart Strengths And Challenges

Prompt risk:

- Current prompt exposes yoga names, dosha names, severity labels, functional benefics/malefics, and Nadi cross-references directly.
- It pressures the model to make every yoga/dosha dramatic and to translate doshas into daily-life challenges.
- It can overstate cancelled doshas, weak yogas, or advanced combinations as certain life outcomes.

Roadmap:

1. Add `buildYogaClaims(sectionData, allSections, policy)`.
2. Normalize each yoga/dosha into `combination_type`, `strength`, `cancelled`, `confidence`, `lifeArea`, `allowedPublicMention`, and `evidencePaths`.
3. Allow strong yogas and uncancelled high-severity doshas to receive full paragraphs; moderate/weak items become short notes or are omitted.
4. Replace raw dosha descriptions with public-safe summaries before the LLM sees them.
5. Add a validator that blocks unsupported certainty such as guaranteed fame, guaranteed suffering, guaranteed marriage failure, or guaranteed wealth from yoga claims.

Acceptance:

- No yoga or dosha appears in public prose unless it exists in allowed claims.
- Cancelled doshas cannot be described as active harms.
- Weak yogas cannot produce major life promises.

### Section 2: `lifePredictions` - Life Journey Timeline

Prompt risk:

- Current prompt asks for specific dates, current phase, next phase, future phases, critical turning points, and one transformative year.
- It receives cross-section data and can amplify one weak timing window into a strong life promise.
- It includes Nadi longevity estimates and health-sensitive periods, creating lifespan and health overreach risk.

Roadmap:

1. Add `buildLifeTimelineClaims(sectionData, allSections, policy)`.
2. Create claim types: `current_phase`, `near_term_window`, `past_validation_window`, `cross_section_convergence`, and `sensitive_caution_window`.
3. Require 2+ independent evidence sources before a year can be called a major turning point; require 3+ for the single most important year.
4. Hide raw longevity estimates from the narrative prompt; expose only resilience/framing claims.
5. Make the prompt handle past windows as validation language, current windows as active-period language, and future windows as probability language.

Acceptance:

- No event is promised.
- No year beyond age 80 appears unless the section is explicitly retrospective and already lived.
- Health and lifespan details are not introduced from timeline data.

### Section 3: `career` - Career And Money Path

Prompt risk:

- Current prompt mixes career, business/service, wealth trajectory, foreign career, domestic role, financial risk, and retirement in one large prompt.
- It may recommend career fields from weak or low-ranked planet data.
- It may give financial or business advice that sounds deterministic.

Roadmap:

1. Add `buildCareerClaims(sectionData, allSections, policy)`.
2. Claim types: `career_direction`, `business_vs_service`, `career_timing_window`, `foreign_career_pattern`, `domestic_role_pattern`, `wealth_trajectory_link`.
3. Only top 2-3 convergent career directions should reach the LLM. All lower-ranked fields become omitted topics.
4. Separate career from financial advice: career may reference wealth trajectory, but investment strategy belongs in `financial`.
5. Add age-aware gates for career starts, changes, consolidation, retirement, and legacy.

Acceptance:

- Career output names no more than three primary paths unless the data explicitly supports a mixed portfolio career.
- Business/service verdict requires convergent evidence and uses confidence language.
- No investment advice appears in career prose.

### Section 4: `marriage` - Love And Relationships

Prompt risk:

- Current prompt is high pressure and age/culture specific.
- It can overstate marriage denial, second marriage, divorce risk, spouse traits, partner first letters, or exact timing.
- It sometimes tells the model to write long dramatic paragraphs even for sensitive relationship outcomes.

Roadmap:

1. Extend `buildRelationshipClaims` into a full `buildMarriageClaims`.
2. Claim types: `relationship_timing`, `relationship_likelihood`, `spouse_profile`, `relationship_challenge`, `second_marriage_pattern`, `relationship_stability`, and `confirmed_marriage_validation`.
3. Block timing claims automatically when denial evidence is stronger than timing evidence.
4. Turn partner letters into low-stakes optional hints with confidence and explicit uncertainty.
5. Replace culture-specific assumptions with profile-aware framing: current age, marital status if known, confirmed marriage year if supplied, and country context only if available.

Acceptance:

- No guaranteed marriage, divorce, second marriage, or exact spouse profession.
- A denied or high-affliction chart cannot still receive optimistic marriage timing.
- Past windows are never framed as future predictions.

### Section 5: `marriedLife` - Daily Married Life

Prompt risk:

- Current prompt assumes or conditionally assumes married status from age.
- It asks for in-law dynamics, conflict, intimacy, household money, children impact, separation risk, and decade-by-decade evolution.
- These are highly verifiable and sensitive, especially if the person is unmarried.

Roadmap:

1. Add `buildMarriedLifeClaims(sectionData, allSections, profile, policy)`.
2. Claim types: `domestic_dynamic`, `communication_pattern`, `conflict_pattern`, `in_law_pattern`, `household_finance_pattern`, `marriage_evolution_window`, `separation_pressure_pattern`.
3. Require explicit marital status or strong relationship-status evidence before writing in present tense.
4. Keep intimacy language tasteful, broad, and non-explicit.
5. Gate in-law claims by evidence and prohibit invented relatives, living arrangements, or direct accusations.

Acceptance:

- Present-tense marriage claims appear only when marital status supports them.
- No guaranteed separation, divorce, or in-law conflict.
- No fabricated domestic routines.

### Section 6: `financial` - Money Blueprint

Prompt risk:

- Current prompt asks for income, savings, expenses, losses, risk periods, investment advice, windfalls, and wealth class.
- It may sound like personalized financial advice or guarantee losses/gains.

Roadmap:

1. Expand financial policy in `promptPolicies.js`.
2. Add `buildFinancialClaims(sectionData, allSections, policy)`.
3. Claim types: `income_pattern`, `savings_pattern`, `expense_pattern`, `risk_window`, `windfall_pattern`, `investment_style`, `wealth_trajectory`.
4. Replace investment recommendations with broad planning style, such as conservative, diversified, entrepreneurial, savings-first, or avoid-speculation windows.
5. Add a validator for banned financial certainty: guaranteed rich, guaranteed loss, invest in X, buy/sell, loan advice, or exact income level.

Acceptance:

- No direct investment instructions.
- Windfalls and losses are always probabilistic.
- Wealth class is framed as symbolic financial tendency, not fixed destiny.

### Section 7: `children` - Children And Family Life

Prompt risk:

- Current prompt asks for estimated count, gender tendency, birth years, fertility strength, children's education/career, and parenting style.
- Fertility, child timing, child gender, and future child outcomes are high sensitivity.

Roadmap:

1. Add `buildChildrenClaims(sectionData, allSections, profile, policy)`.
2. Claim types: `children_estimate`, `child_timing_window`, `fertility_symbolism`, `parenting_style`, `child_education_pattern`, `alternative_creativity_pattern`.
3. Turn child count and gender into confidence-labeled estimates, not facts.
4. Block child timing when marriage denial or marital status makes the claim unsupported.
5. Move children's education/career into broad tendencies, not guaranteed academic outcomes.

Acceptance:

- No guaranteed birth, no guaranteed gender, no fertility diagnosis.
- Birth years appear only as symbolic windows and require confidence.
- If marriage evidence is blocked, children claims become conditional or creative/mentoring alternatives.

### Section 8: `familyPortrait` - Parents, Siblings And Family Karma

Prompt risk:

- Current prompt is one of the highest verification-risk sections.
- It asks for parent personality, occupation, health, caution periods, bond, struggles, sibling count, and family karma.
- It includes profession synthesis dictionaries and parent health data that can overfit to one known chart.

Roadmap:

1. Expand `buildFamilyClaims` into parent, sibling, profession, bond, and family-pattern claim builders.
2. Claim types: `parent_personality_pattern`, `parent_profession_hint`, `parent_wellness_pattern`, `parent_bond_pattern`, `sibling_estimate`, `family_dynamic`, `family_timing_window`.
3. Parent profession must expose top 2-3 candidate domains with confidence, never one absolute job title.
4. Parent health claims stay broad and cannot name organs or conditions unless allowed details exist.
5. Sibling count should carry `estimated` wording unless user confirmation exists.

Acceptance:

- No exact parent profession is stated as fact.
- No parent diagnosis, organ prediction, or impossible parent-age timing.
- Sibling count is clearly an estimate unless confirmed.

### Section 9: `health` - Health And Wellbeing

Prompt risk:

- Health is already the strongest section architecturally because it uses `buildHealthPromptPayload` and `buildHealthPromptPolicyBlock`.
- Remaining risk is raw body-risk and Nadi health language still appears in the prompt and can seed disease-like output.

Roadmap:

1. Finish moving all health inputs into `allowedClaims`, `omitTopics`, and safe summaries.
2. Hide raw Nadi disease verdict and longevity estimate from the LLM; expose only wellness resilience or caution claims.
3. Add allowed details for lifestyle support, broad body-system vulnerability, early-life resilience, stress recovery, and health-sensitive timing.
4. Add source-aware validation so every named organ in prose maps to an allowed organ claim.
5. Add Sinhala/Tamil/Singlish blocked-term checks for unsupported medical terms.

Acceptance:

- No unsupported organ names.
- No named disease, medical test, procedure, screening calendar, infant event, or exact lifespan unless explicitly allowed.
- Early-life health remains resilience language only.

### Section 10: `physicalProfile` - Body, Face And Mind Profile

Prompt risk:

- Current prompt asks for highly verifiable appearance, face, complexion, hair, voice, aging, attractiveness, mental landscape, and body constitution.
- Physical predictions are easy for users to reject if too specific or unsupported.

Roadmap:

1. Add `buildPhysicalProfileClaims(sectionData, allSections, policy)`.
2. Claim types: `body_type_hint`, `face_feature_hint`, `style_presence`, `aging_pattern`, `attractiveness_pattern`, `mental_profile`, `constitution_pattern`.
3. Require `lagnaStability` confidence before detailed body/face claims.
4. Use ranges and soft visual language for appearance; reserve exact body marks for `surpriseInsights` only if supported.
5. Split mental profile from health or diagnosis language.

Acceptance:

- No exact physical feature claim without supporting data.
- No derogatory body language.
- No mental health diagnosis from physical-profile data.

### Section 11: `attractionProfile` - Attraction And Romantic Power

Prompt risk:

- Current prompt asks for attraction score, opposite-gender perception, sexual energy, love language, reveal journey, and romantic superpower.
- It can become gender-stereotyped, over-sexualized, or harsh for low attraction scores.

Roadmap:

1. Add `buildAttractionClaims(sectionData, allSections, profile, policy)`.
2. Claim types: `romantic_presence`, `attraction_score`, `partner_type_pattern`, `love_language`, `intimacy_style`, `romantic_growth_pattern`.
3. Replace "opposite gender" with partner-aware or gender-neutral wording unless user preference is known.
4. Keep sexual energy tasteful and optional; block explicit content.
5. For low scores, frame as lower visibility or slower-blooming magnetism, not personal deficiency.

Acceptance:

- No explicit sexual content.
- No gender stereotypes or insulting attractiveness claims.
- Attraction score is not treated as objective personal value.

### Section 12: `foreignTravel` - Travel And Living Abroad

Prompt risk:

- Current prompt asks for travel likelihood, settlement, visa success, directions, countries, foreign study, and career links.
- It can sound like guaranteed visa/migration advice.

Roadmap:

1. Add `buildForeignTravelClaims(sectionData, allSections, policy)`.
2. Claim types: `travel_likelihood`, `settlement_pattern`, `visa_support_pattern`, `travel_timing_window`, `direction_hint`, `foreign_study_link`, `foreign_career_link`.
3. Treat countries and directions as symbolic suitability, not immigration recommendation.
4. Visa success should be broad confidence language only.
5. Timing windows should map to travel type: study, work, family, pilgrimage, relocation, or short travel only when supported.

Acceptance:

- No guaranteed visa approval or migration outcome.
- No country recommendation as legal or immigration advice.
- Settlement abroad requires convergent evidence.

### Section 13: `education` - Education And Knowledge Path

Prompt risk:

- Current prompt asks for academic strength, study fields, study periods, foreign study, competitive exams, and learning style.
- It may overstate educational level or force career alignment.

Roadmap:

1. Add `buildEducationClaims(sectionData, allSections, policy)`.
2. Claim types: `learning_style`, `study_field_hint`, `academic_strength`, `study_timing_window`, `foreign_study_pattern`, `competitive_exam_pattern`, `education_career_bridge`.
3. Use education planet pool as ranked hints, not deterministic degrees.
4. Gate foreign study through both education and travel evidence.
5. Age-aware outputs: minors get study support; adults get lifelong learning and career retraining framing.

Acceptance:

- No guaranteed degree, exam result, or foreign admission.
- Study fields are top-ranked suggestions with confidence.
- Education-career alignment cannot contradict `career` claims.

### Section 14: `luck` - Luck And Unexpected Fortunes

Prompt risk:

- Current prompt asks for luck score, lucky periods, numbers/days, lottery, inheritance, and windfalls.
- Lottery and windfall language can become gambling encouragement or guaranteed fortune.

Roadmap:

1. Add `buildLuckClaims(sectionData, allSections, policy)`.
2. Claim types: `luck_pattern`, `lucky_period`, `lucky_number_hint`, `windfall_pattern`, `inheritance_pattern`, `speculation_caution`.
3. Add a gambling-safety policy: never encourage gambling, never imply lottery certainty, and always cap speculation language.
4. Inheritance claims require explicit evidence and should remain broad.
5. Lucky numbers/days/colors can be low-risk lifestyle hints, separated from financial outcomes.

Acceptance:

- No gambling encouragement.
- No guaranteed lottery/windfall/inheritance.
- Lucky numbers are framed as symbolic personal cues, not winning mechanisms.

### Section 15: `legal` - Legal, Enemies And Protection

Prompt risk:

- Current prompt asks for enemy profile, legal periods, disputes, property conflict, divorce/legal overlap, and protection advice.
- It can invent enemies, legal cases, or legal outcomes.

Roadmap:

1. Expand legal policy into `buildLegalClaims(sectionData, allSections, policy)`.
2. Claim types: `dispute_pattern`, `enemy_profile_hint`, `legal_timing_window`, `property_dispute_pattern`, `relationship_legal_overlap`, `protective_action`.
3. Remove outcome language: no win/lose, no court result, no criminal implication.
4. Protection advice should be practical: documentation, calm communication, boundaries, contracts, professional counsel when needed.
5. Legal windows require confidence and sensitive timing framing.

Acceptance:

- No guaranteed legal case or outcome.
- No accusations against specific people.
- No substitute for legal advice.

### Section 16: `realEstate` - Property, Home And Assets

Prompt risk:

- Current prompt asks for ownership potential, property timing, vehicles, inheritance, and foreign property.
- It can become property investment advice or promise ownership.

Roadmap:

1. Add `buildRealEstateClaims(sectionData, allSections, policy)`.
2. Claim types: `property_potential`, `property_timing_window`, `vehicle_pattern`, `inheritance_link`, `foreign_property_pattern`, `home_stability_pattern`.
3. Cross-check all property timing with financial capacity claims.
4. Replace "buy property in this period" with "property decisions may receive better support in this window".
5. Inheritance should defer to `luck`/`familyPortrait` claims and remain probabilistic.

Acceptance:

- No guaranteed property purchase, vehicle purchase, or inheritance.
- No investment advice.
- Property timing cannot contradict financial risk windows.

### Section 17: `transits` - Current Period

Prompt risk:

- Current prompt asks for current events, Saturn testing, planet-by-planet effects, score interpretation, and next 6-12 months.
- It can overstate transient influence as life-changing certainty.

Roadmap:

1. Add `buildTransitClaims(sectionData, allSections, policy)`.
2. Claim types: `current_period_quality`, `active_transit_event`, `supportive_current_influence`, `challenging_current_influence`, `near_term_outlook`, `sade_sati_or_major_cycle`.
3. Limit planet-by-planet coverage to the 3-5 strongest active claims.
4. Make all transit windows expire-aware; do not discuss stale transits as active.
5. Add a validator to detect current-date mismatches and overly absolute phrases.

Acceptance:

- Current-period claims are date-bounded.
- No stale transit is described as active.
- No transit guarantees an event.

### Section 18: `surpriseInsights` - Personal Insights

Prompt risk:

- Current prompt is the highest hallucination-risk prompt because it asks for body marks, siblings, parent profiles, partner letters, handedness, addiction vulnerability, fame, wealth class, past-life story, spirit animal, celebrity twin, golden period, and a comedic roast.
- Many items are immediately verifiable or identity-sensitive.

Roadmap:

1. Split this section into modular claim families: `verifiable_traits`, `relationship_hints`, `behavior_patterns`, `family_hints`, `risk_hints`, `symbolic_fun`.
2. Add `buildSurpriseInsightClaims(sectionData, allSections, policy)`.
3. Body marks, handedness, siblings, parent profiles, first love age, and life shift ages require explicit fields and confidence.
4. Addiction vulnerability should be reframed as habit/escape tendency and must not name substances unless user data supplies them.
5. Fame, wealth class, past life, spirit animal, celebrity twin, and roast should be labeled as symbolic/fun, not factual claims.

Acceptance:

- No unsupported verifiable facts.
- No diagnosis, addiction label, or guaranteed fame/wealth.
- Fun symbolic content is clearly separated from claim-backed life predictions.

### Section 19: `remedies` - Personal Power Toolkit

Prompt risk:

- Current prompt asks for gemstones, colors, days, weak planet lifestyle, diet, exercise, generosity, meditation, sleep, and social habits.
- It includes strong gemstone instructions that could be interpreted as guaranteed effectiveness.
- It correctly blocks religious activities, but should also adapt to user religion and preferences when remedies are requested.

Roadmap:

1. Add `buildRemedyClaims(sectionData, allSections, profile, policy)`.
2. Claim types: `gemstone_hint`, `color_routine`, `power_day_hint`, `diet_lifestyle_support`, `exercise_support`, `sleep_support`, `mindfulness_support`, `generosity_practice`.
3. Gemstones should be optional symbolic accessories, not guaranteed fixes; include safety note for affordability and user preference.
4. Diet/exercise remedies must avoid medical treatment language and should cross-check health claims.
5. If user religion is supplied, keep remedies culturally respectful and never prescribe faith-specific rituals unless explicitly requested.

Acceptance:

- No promise that remedies cure, fix, or guarantee outcomes.
- No religious ritual unless user asks.
- Health-related remedies cannot introduce unsupported organ or disease claims.

## Display-Only Section Gaps

The mobile report displays four section keys that are not currently generated in `generateAINarrativeReport` section order. Decide whether to remove them from mobile, generate them with AI, or merge them into live sections.

### Gap A: `personality`

Recommended action:

1. Either merge into `yogaAnalysis`, `physicalProfile`, and `surpriseInsights`, or add a dedicated `personality` prompt.
2. If dedicated, build `personality_pattern`, `emotional_style`, `strength_pattern`, `growth_edge`, and `social_style` claims.
3. Keep it low/medium sensitivity unless it references mental health, trauma, or family.

Acceptance:

- No generic lagna-only personality text.
- No mental-health labels.

### Gap B: `mentalHealth`

Recommended action:

1. Do not generate this as a standalone dramatic section unless product explicitly wants it.
2. Prefer folding safe emotional-regulation claims into `health`, `familyPortrait`, `marriage`, and `physicalProfile`.
3. If standalone, use a high-sensitivity mental wellness policy with no named conditions, no trauma certainty, and no clinical labels.

Acceptance:

- No anxiety/depression/trauma diagnosis.
- No claim that parents or childhood events definitely caused present patterns.

### Gap C: `spiritual`

Recommended action:

1. Either merge into `remedies`, `surpriseInsights`, and `lifePredictions`, or add a dedicated symbolic spirituality prompt.
2. Claim types should include `spiritual_inclination`, `practice_style`, `past_karma_theme`, `service_pattern`, and `detachment_pattern`.
3. Keep religion-aware, not religion-prescriptive.

Acceptance:

- No claim that the user must follow a specific faith path.
- No guaranteed renunciation, monkhood, or spiritual destiny.

### Gap D: `timeline25`

Recommended action:

1. Merge into `lifePredictions` unless the UI needs a compact year-by-year timeline.
2. If standalone, generate structured JSON first: year range, life area, confidence, evidence paths, and wording.
3. Avoid long prose for 25 annual predictions; it invites filler and contradictions.

Acceptance:

- No more than one or two claims per year.
- No year contradicts marriage, children, career, health, financial, legal, or transit sections.

## Section Priority And Implementation Order

Priority 0: resolve section inventory.

- Decide 19 live sections versus true 16 versus all 23 display keys.
- Make `sectionOrder`, mobile `SECTION_KEYS`, loading labels, report progress defaults, PDF export, and prompt observability agree.

Priority 1: highest safety risk.

1. `health`
2. `familyPortrait`
3. `children`
4. `marriage`
5. `marriedLife`
6. `legal`
7. `financial`

Priority 2: high hallucination and verification risk.

1. `surpriseInsights`
2. `physicalProfile`
3. `attractionProfile`
4. `career`
5. `lifePredictions`
6. `transits`

Priority 3: medium sensitivity and polish.

1. `education`
2. `foreignTravel`
3. `realEstate`
4. `luck`
5. `yogaAnalysis`
6. `remedies`

## Section-Specific Eval Expansion

Add prompt fixtures for every live section:

- `yoga-analysis-dosha-cancelled.json`
- `life-predictions-past-window.json`
- `career-overbroad-fields.json`
- `marriage-denial-overrides-timing.json`
- `married-life-unmarried-user.json`
- `financial-no-investment-advice.json`
- `children-marriage-denied.json`
- `family-parent-profession-uncertain.json`
- `health-organ-absence-all.json`
- `physical-profile-cusp-lagna.json`
- `attraction-low-score-respectful.json`
- `foreign-travel-no-visa-guarantee.json`
- `education-no-exam-guarantee.json`
- `luck-no-gambling-encouragement.json`
- `legal-no-outcome-guarantee.json`
- `real-estate-no-purchase-guarantee.json`
- `transits-stale-event.json`
- `surprise-verifiable-absence.json`
- `remedies-no-cure-claims.json`

Add cross-section regression fixtures:

- `all-sections-older-married-user.json`
- `all-sections-single-age-40.json`
- `all-sections-minor-user.json`
- `all-sections-cusp-birth-time.json`
- `all-sections-low-health-evidence.json`
- `all-sections-no-marriage-but-children-high.json`

Success criteria for the expanded suite:

- 0 unsupported sensitive claims across all live sections.
- 0 guaranteed events in timing, marriage, children, finance, legal, property, travel, or transits.
- 0 medical diagnosis, procedure, test, infant event, or exact lifespan claims without explicit allowed details.
- 0 gambling encouragement.
- 0 parent diagnosis or impossible parent-event timing.
- 0 exact physical/verifiable facts unless the source field exists.
- Mobile section count, server generated section count, and progress count match.

## Hallucination Modes To Expect

| Area | How hallucination can happen | Example failure | Root cause | Fix direction |
|---|---|---|---|---|
| Kidney | Separate kidney block seeds a story | User with no kidney issue gets kidney warning | One-off organ prompt | Generic organ policy with evidence gates |
| Other organs | Kidney protected but heart/liver/lungs not protected | Report names heart/liver problems from weak signals | Asymmetric safety | Same rules for all organs |
| Infant health | Prompt says write infant struggles from severity | User knows they were healthy as infant | Dramatic mandatory language | Evidence tiers and omission |
| Mental health | Moon/Saturn prompt names anxiety/depression/trauma | User receives diagnostic-feeling claim | Named conditions in prompt | Emotional pattern language only |
| Fertility | Children section references reproductive risk | Infertility implied without enough data | Sensitive cross-section leakage | Fertility safety gate |
| Parent health | Family section highlights parent organ risks | "Mother will have kidney problems" style output | Parent health prompt pressure | Parent health policy and age plausibility |
| Timing | Exact windows become promises | "Marriage will happen in 2030" | Exactness pressure | Timing-symbolism framing and confidence |
| Career/finance | Dramatic wealth peak from weak signals | Unrealistic income or windfall claim | Vividness over data | Confidence and cap checks |
| Legal | Litigation outcome sounds guaranteed | "You will win/lose" | Outcome certainty | Probability language only |
| Siblings | Exact sibling count stated as fact | User has different sibling count | Estimated count treated as ground truth | Confidence and rectification note |
| Physical profile | Body marks/scars invented | User cannot verify or sees false claim | High-verifiability pressure | Only output if exact field exists |
| One-chart tuning | 1998 chart patterns leak globally | Similar kidney/infant/marriage story appears for many users | Manual prompt calibration | Diverse eval suite |

## Why One-Off Prompt Blocks Are Dangerous

A one-off prompt block feels helpful because it fixes one bad output. But it changes the model's distribution. A kidney block does not just protect kidney language; it teaches the model that kidney is important. An infant-health block does not just improve one infant claim; it teaches the model that infant history is expected. A marriage-age block tuned against one person can teach the model a demographic expectation.

The right fix is not "add more special blocks." If kidney gets a block, every organ needs the same policy. If infant health gets a block, every early-life claim needs the same evidence ladder. If one user's chart reveals a bug, that chart becomes a test case, not a prompt template.

## Proposed Prompt Architecture

### Stage 1: Deterministic Engine Output

The engine should continue calculating raw astrology facts. It should not write public claims. For each section, it should expose structured data only.

Example:

```js
{
  sectionKey: 'health',
  organRisks: [
    {
      organKey: 'heart',
      publicLabel: 'Heart and circulation',
      risk: 'HIGH',
      confidence: 'moderate',
      indicatorCount: 4,
      requiredIndicatorCount: 4,
      evidence: [
        { type: 'sunScoreLow', value: 38 },
        { type: 'h4Afflicted', value: true }
      ]
    }
  ]
}
```

### Stage 2: Claim Candidate Builder

Build a `claimCandidates` array before the LLM sees anything. This is the main anti-hallucination layer.

```js
{
  id: 'health.organ.heart.vulnerability',
  section: 'health',
  subject: 'native',
  category: 'wellness_pattern',
  sensitivity: 'health',
  allowed: true,
  confidence: 'moderate',
  publicClaim: 'The chart suggests extra care around heart and circulation themes.',
  forbidden: ['diagnosis', 'named_disease', 'procedure', 'specific_test_without_data'],
  evidence: [
    { path: 'sections.health.organRisks[heart].indicatorCount', value: 4 },
    { path: 'sections.health.organRisks[heart].risk', value: 'HIGH' }
  ]
}
```

If a claim candidate is not generated, the AI cannot mention that topic. This is stronger than asking the AI to decide from raw data.

### Stage 3: Section Policy

Each section should have a policy file or config, not hard-coded special prose.

```js
health: {
  sensitivity: 'high',
  modelTemperature: 0.35,
  maxParagraphs: 8,
  claimTypesAllowed: ['constitution', 'wellness_pattern', 'timing_window', 'lifestyle_support'],
  claimTypesBlocked: ['diagnosis', 'guaranteed_illness', 'procedure_prediction', 'exact_lifespan'],
  requireEvidenceFor: ['organ', 'infant_health', 'mental_health', 'fertility', 'parent_health'],
}
```

### Stage 4: Narrative Prompt

The narrative prompt should receive only:

- Section goal.
- Voice rules.
- Allowed claim candidates.
- Omission rules.
- Output shape.
- Timing/health caveats.

It should not receive raw disease lists, scary labels, or one-off dramatic instructions.

### Stage 5: Source-Aware Validator

After generation, validate every sensitive claim against claim IDs.

The validator should check:

- Every named organ in output exists in an allowed health claim.
- Every timing window exists in an allowed timing claim.
- Every parent health claim exists in an allowed parent claim.
- Every infant claim exists in an allowed infant claim.
- No blocked terms appear unless explicitly allowed.
- No new numbers appear unless present in evidence.
- No forbidden certainty language appears in sensitive sections.

## Uniform Organ Policy

The current kidney fix should become a general organ policy.

### Organ Risk Levels

| Engine risk | AI behavior |
|---|---|
| LOW | Do not mention publicly. |
| MODERATE | Mention only if it is the primary section topic or user asks directly; use one soft sentence. |
| HIGH with weak evidence | Mention as general vulnerability only; no named conditions. |
| HIGH with strong evidence | One careful paragraph; wellness/prevention framing only. |
| CRITICAL equivalent | Still not diagnosis; recommend professional care generally, not specific tests unless data provides them. |

### Required Organ Schema

Every organ should use the same fields:

```js
{
  organKey: 'kidneys',
  publicLabel: 'Kidney and urinary balance',
  risk: 'LOW|MODERATE|HIGH',
  confidence: 'weak|moderate|strong',
  indicatorCount: 0,
  specificIndicatorCount: 0,
  supportIndicatorCount: 0,
  evidencePaths: [],
  allowedPublicMention: false,
  allowedDetails: {
    namedConditions: false,
    tests: false,
    ageThresholds: false,
    prevention: true
  }
}
```

### Organ List To Normalize

The policy must cover all current organ systems from the engine, not just kidney:

- Heart and circulation.
- Liver, pancreas, and upper digestion.
- Lungs and respiratory system.
- Bones, joints, and spine.
- Eyes and vision.
- Nervous system and mental health.
- Reproductive and urogenital system.
- Skin and dermatological themes.
- Blood pressure and circulation.
- Thyroid and endocrine system.
- Kidneys and urinary tract.
- Feet, ankles, and lower limbs.

### Organ Prompt Rule

Use this style:

> Mention organ systems only from `allowedClaims`. If no claim exists for an organ, do not name that organ. For allowed organ claims, describe vulnerability themes and practical wellness support. Do not name diseases, tests, procedures, or age thresholds unless the allowed claim explicitly includes those fields.

Do not use this style:

> If organ is HIGH, write a full paragraph with diseases, ages, prevention, and screening.

## Infant And Early-Life Health Policy

Infant health is especially sensitive because users or their families may know the facts. A false infant story feels worse than a vague future prediction.

### Early-Life Risk Levels

| Engine signal | Public behavior |
|---|---|
| LOW | Omit. Do not say "born healthy" unless data explicitly supports it. |
| MODERATE | Say early vitality may have needed extra support; keep broad. |
| HIGH | Mention early-life vulnerability themes, not events. |
| CRITICAL | Mention strong early-life pressure as symbolic caution, but do not assert NICU, premature birth, low birth weight, breathing difficulty, or hospitalization unless structured data explicitly says so. |

### Infant Claim Schema

```js
{
  id: 'health.earlyLife.vulnerability',
  allowed: true,
  severity: 'HIGH',
  confidence: 'moderate',
  allowedDetails: {
    prematureBirth: false,
    nicu: false,
    lowBirthWeight: false,
    breathingDifficulty: false,
    hospitalization: false,
    resilienceTheme: true
  },
  wording: 'The chart suggests the early-life vitality pattern needed extra protection and recovery support.'
}
```

### Infant Prompt Rule

Use this style:

> If an early-life claim is allowed, describe the pattern as resilience and early sensitivity. Do not state a specific medical event unless it appears in `allowedDetails` as true.

Do not use this style:

> If earlyLifeHealth is HIGH, describe premature birth, NICU, low birth weight, and dangerous infant period.

## Chart-Specific Tuning Risk

The 1998-10-09 09:16 Colombo chart should be treated as a regression fixture, not as a prompt design target.

Risks from tuning to one chart:

1. The prompt learns that the health section should focus on the organs that appeared in that chart.
2. The prompt learns an expected marriage/children/career age pattern from that chart.
3. The prompt learns family or sibling language from one user's known life details.
4. Prompt changes feel accurate during manual testing but fail for women, older users, non-Sri Lankan users, users with missing birth times, or charts with different lagna/nakshatra patterns.

Mitigation:

1. Keep the 1998 chart in the test set.
2. Add at least 50 additional test charts before prompt tuning.
3. Include generated synthetic edge cases for each organ and each absence case.
4. Every prompt fix must pass an absence test: if a claim is not supported, the output must not mention it.
5. Use blind review: do not inspect only the chart that inspired the change.

## Prompt Evaluation Suite

Create a prompt eval harness separate from the engine benchmark.

Suggested file:

- `server/benchmark/validate-prompts.js`

Suggested fixtures:

- `server/benchmark/prompt-fixtures/health-organ-absence.json`
- `server/benchmark/prompt-fixtures/health-organ-high.json`
- `server/benchmark/prompt-fixtures/infant-health.json`
- `server/benchmark/prompt-fixtures/timing-certainty.json`
- `server/benchmark/prompt-fixtures/family-parent-health.json`
- `server/benchmark/prompt-fixtures/1998-colombo-regression.json`

Eval categories:

1. Absence tests.
   If `kidneyRisk=LOW`, output must not contain kidney/urinary terms. Repeat for every organ.

2. Evidence tests.
   If a paragraph names an organ, there must be an allowed claim candidate for that organ.

3. Medical safety tests.
   Output must not contain diagnosis language, disease certainty, procedures, or specific tests unless allowed.

4. Infant safety tests.
   Output must not mention premature birth, NICU, low birth weight, breathing trouble, or hospitalization unless structured data allows it.

5. Timing tests.
   Timing windows must include symbolic/probability framing and must not use promise language.

6. Cross-section tests.
   Marriage, children, career, health, finance, and life timeline must not disagree on ages and years.

7. Language tests.
   Sinhala/Tamil/Singlish outputs must not leak unsupported English medical terms.

8. Overfit tests.
   Run the same prompt over diverse charts and check that repeated phrases or repeated organ stories do not appear at abnormal frequency.

Success criteria:

- 0 unsupported organ mentions in absence fixtures.
- 0 named medical conditions unless explicitly supplied.
- 0 procedure predictions.
- 0 exact lifespan/death claims.
- 0 infant event claims without structured allowance.
- Less than 1 percent unsupported numbers across a 100-report eval run.
- Cross-section validator reconciles every detected high-stakes contradiction.

## Roadmap

### Phase 0: Stop The Bleeding

Goal: prevent one-off prompt fixes from spreading.

Tasks:

1. Keep the recent kidney evidence gate, but mark it temporary.
2. Remove concrete medical examples from prompts and negative examples.
3. Replace "medical screening calendar" with "wellness support plan" unless structured data explicitly includes tests.
4. Remove named conditions from mental health and fertility prompt examples.
5. Convert "danger periods" public language to "health-sensitive periods" everywhere.
6. Lower health section temperature from hero creativity to precision-first.
7. Add a test that the 1998 Colombo sample now has no kidney mention when `kidneyRisk=LOW`.

### Phase 1: Prompt Policy Config

Goal: move sensitive rules out of scattered prompt prose.

New file proposal:

- `server/src/engine/promptPolicies.js`

Contents:

- Section sensitivity levels.
- Allowed claim types per section.
- Forbidden claim types per section.
- Organ policy.
- Infant-health policy.
- Parent-health policy.
- Timing policy.
- Certainty language map.
- Temperature defaults.

Acceptance:

- No section prompt directly defines a one-off organ rule.
- Health, infant, fertility, mental health, parent health, and timing all reference shared policy.

### Phase 2: Claim Candidate Builder

Goal: turn raw engine data into allowed claims before AI sees it.

New file proposal:

- `server/src/engine/promptClaimBuilder.js`

Functions:

- `buildHealthClaims(sectionData, allSections, policy)`
- `buildTimingClaims(sectionKey, sectionData, allSections, policy)`
- `buildFamilyClaims(sectionData, allSections, policy)`
- `buildRelationshipClaims(sectionData, allSections, policy)`
- `buildSectionPromptPayload(sectionKey, sectionData, allSections, birthData, policy)`

Acceptance:

- Health prompt receives `allowedClaims`, not raw disease-like labels.
- The AI sees `omitTopics` explicitly.
- Every claim has evidence paths and confidence.

### Phase 3: Health Prompt Refactor

Goal: make all organs symmetrical and safe.

Tasks:

1. Replace organ-by-organ free prose instructions with an organ claim table.
2. Make kidney just one organ in the policy.
3. Normalize primary health concern so LOW/MODERATE organs cannot become dramatic lead topics.
4. Remove disease names, tests, procedures, and screening ages from the prompt unless allowed by structured data.
5. Add a public wording ladder:
   - low: omit
   - moderate: "may need extra balance"
   - high: "stronger vulnerability pattern"
   - critical: "extra protective attention"
6. Add `healthSafetyValidator` that rejects unsupported organ terms.

Acceptance:

- No one-off organ prompt remains in `chat.js`.
- Every organ follows the same gate.
- Absence tests pass for all organs.

### Phase 4: Infant And Childhood Health Refactor

Goal: stop overclaiming early-life events.

Tasks:

1. Replace the current infant-health paragraph instruction with a claim gate.
2. Add allowed-detail booleans for premature birth, NICU, low birth weight, breathing difficulty, hospitalization, and general resilience.
3. Default to broad resilience language.
4. Add a validator that blocks unallowed infant-event terms.
5. Include adult age context but do not make age alone determine truth. A 40-year-old can know their infancy; the issue is evidence, not age.

Acceptance:

- Infant event terms appear only when allowed.
- HIGH severity alone does not force NICU/premature/low-birth claims.

### Phase 5: Timing And Certainty Refactor

Goal: keep useful timing without promises.

Tasks:

1. Create a shared timing phrase policy.
2. Replace "USE EXACT YEARS" with "Use exact years only as symbolic timing windows."
3. Attach confidence to every date/year window.
4. Remove "people love specific predictions" style guidance.
5. Make cross-section validator run on every high-stakes discrepancy, not only multiple discrepancies.

Acceptance:

- Marriage, children, career, finance, travel, legal, and health timing all use the same probability framing.
- No section promises events.

### Phase 6: Prompt Evals And Regression Harness

Status: implemented in `server/benchmark/validate-prompts.js`, `server/benchmark/prompt-fixtures/`, and `server/src/engine/__tests__/promptEvalHarness.test.js`.

Goal: prevent future prompt regressions.

Tasks:

1. Add prompt fixtures for diverse charts.
2. Add absence fixtures for every organ.
3. Add fixtures for missing birth time, cusp birth time, non-Sri Lankan timezone, older users, minors, different genders, and different marital statuses.
4. Add model-output graders using regex plus LLM judge for nuanced safety.
5. Run the prompt eval before changing `chat.js`.

Acceptance:

- Prompt changes have pass/fail output.
- The 1998 chart is one fixture among many, not the target.

### Phase 7: Prompt Versioning And Observability

Status: implemented in `server/src/engine/promptObservability.js`, wired through `server/src/engine/chat.js`, persisted by the report save path, and exposed through report feedback plus admin prompt analytics endpoints.

Goal: know which prompt produced which report.

Tasks:

1. Add `promptVersion` to saved report metadata.
2. Save section policy version.
3. Save model, temperature, validator results, and claim counts per section.
4. Track user feedback by section and claim type.
5. Add analytics for repeated unsupported terms.

Implementation notes:

- Saved reports now include prompt analytics snapshots for unsupported-term counts, repeated terms, and issue grouping by section/source/type.
- `POST /api/horoscope/report-feedback` records user feedback with report, section, claim type, prompt version, model, temperature, and section claim counts.
- `GET /api/horoscope/prompt-analytics` provides an admin summary of repeated unsupported terms and feedback distribution.

Acceptance:

- A bad report can be traced to prompt version, model, section, and claim source.
- Prompt improvements can be measured, not guessed.

## Immediate File-Level Recommendations

### `server/src/engine/chat.js`

- Remove one-off kidney prompt logic after generic organ policy exists.
- Replace hard-pressure words with policy words.
- Move health, infant, parent health, fertility, timing, and legal safety out of prose and into policy config.
- Lower health temperature or classify health as data-heavy instead of hero-creative.
- Replace medical screening calendar wording with wellness support unless explicit structured data allows medical tests.

### `server/src/engine/astrology.js`

- Keep organ scoring deterministic.
- Add normalized organ keys and evidence paths for every organ.
- Add `allowedPublicMention` and `confidence` for each organ risk.
- Add infant-health allowed-details fields.
- Keep the 1998 Colombo chart as a regression fixture.

### `server/src/engine/reportValidator.js`

- Add term gates for all organs.
- Add unsupported disease/procedure/test detection.
- Add infant-event detection.
- Add claim-ID validation once claim candidates exist.
- Treat sensitive unsupported claims as severity high enough for automatic rewrite.

### `server/src/engine/preValidator.js`

- Add explicit missing-field markers for health claim evidence.
- Add parent event plausibility beyond simple native-age filtering.
- Add sensitive-data sanitization before prompt assembly.

### `server/src/engine/crossSectionValidator.js`

- Reconcile any high-stakes discrepancy, even a single one.
- Add health, infant, parent health, fertility, and legal contradiction families.
- Prefer authoritative raw section claims over narrative text.

## Proposed Prompt Skeleton

Use a smaller, stricter section prompt:

```text
<role>
You are a professional astrology report writer. You interpret supplied engine facts into warm, grounded prose.
</role>

<truth_contract>
Use only allowedClaims. If a topic is absent from allowedClaims, omit it. Do not infer missing medical, family, relationship, or timing facts.
</truth_contract>

<sensitive_policy>
Timing windows are symbolic probability windows, not promises.
Health content is wellness symbolism, not diagnosis.
Do not name conditions, procedures, tests, or exact outcomes unless allowedClaims explicitly include them.
</sensitive_policy>

<allowed_claims>
[JSON claim candidates]
</allowed_claims>

<omit_topics>
[JSON list]
</omit_topics>

<task>
Write the section using only allowed claims. Make it specific, calm, useful, and humane. Omit unsupported topics completely.
</task>
```

## What To Avoid Going Forward

Avoid adding these directly into a narrative prompt:

- A special organ block for only one organ.
- A story based on one known user's real life.
- Named diseases as examples.
- Named tests and screening ages unless structured data supplies them.
- Premature birth/NICU/low-birth-weight examples unless structured data supplies them.
- "MUST write a full paragraph" for sensitive topics.
- "People love" or "be bold" pressure in prediction sections.
- Absolute age expectations based on culture unless user profile explicitly supports that framing.

## Recommended Next Step

Start with Phase 1 and Phase 2 before more prompt edits. The system needs a reusable prompt policy layer and a claim candidate builder. After that, refactor the health prompt so every organ follows the same gate. This will fix the kidney problem properly, protect all organs, and reduce the chance that the report style is tuned to one birth time.

The 1998-10-09 09:16 Colombo chart should remain useful, but only as one regression case. The product should prove that any prompt improvement works across many charts, many ages, and many missing-data scenarios before it becomes the default.