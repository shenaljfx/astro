# Grahachara Prompt Engineering Findings and Roadmap

Date: 2026-05-07

Scope: AI report prompts, astrology interpretation prompts, health/organ wording, infant-health wording, timing certainty, validators, prompt evals, and the risk of prompts becoming tuned to one chart such as 1998-10-09 09:16 Colombo.

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