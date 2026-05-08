# Grahachara Security, Integrity, Availability, and Cost Audit

Date: 2026-05-08  
Scope: mobile app, server API, astrology/AI engines, deployment scripts, Docker config, dependency audit output, local secret tracking status.  
Method: source review, route/middleware tracing, repo secret tracking check, and `npm audit --omit=dev --json` for `server` and `mobile`.  
Limitations: Firestore security rules, cloud IAM, RevenueCat dashboard settings, Google Cloud budget alerts, production logs, and live infrastructure were not available in this workspace.

## Executive Summary

The app has a decent security foundation: production boot guards exist, AI chat and full AI reports are subscription-gated in key routes, CORS is restricted in production, Helmet/HPP/body limits are enabled, saved reports and saved porondam records perform owner checks, and real `.env` / Firebase service account files are ignored rather than tracked.

The main danger is not one single missing library. It is several trust-boundary gaps around paid AI routes, public business telemetry, high AI token ceilings, background AI work, fragile operations, and weak cost observability. The highest-priority finding is that the AI Porondam report endpoint can generate paid AI content without `requireSubscription`. The second-highest is that cost/revenue live stats are publicly callable. The third is that report generation paths allow very large token budgets, retries, and extra background AI calls that can quietly become expensive.

Risk rating: High until P0 items are fixed.  
Production readiness: Not ready for scaled production without tightening billing enforcement, cost caps, backups, monitoring, and deployment reliability.

## Confirmed Good Controls

- Production boot fails if `MOCK_PAYMENTS=true`, weak `JWT_SECRET`, missing RevenueCat webhook key, or missing Google OAuth client ID in [server/src/index.js:10](server/src/index.js#L10).
- Core server middleware enables restricted CORS, Helmet, HPP, request body limits, global/IP limiters, and per-user AI/report limiters in [server/src/index.js:66](server/src/index.js#L66) and [server/src/middleware/security.js:1](server/src/middleware/security.js#L1).
- Premium chat is gated with `phoneAuth`, `requireSubscription`, and `aiUserLimiter` in [server/src/routes/chat.js:108](server/src/routes/chat.js#L108).
- Full AI report generation is gated with `reportLimiter`, `phoneAuth`, `requireSubscription`, and `reportUserLimiter` in [server/src/routes/horoscope.js:1055](server/src/routes/horoscope.js#L1055).
- Full reading is subscription-gated in [server/src/routes/reading.js:110](server/src/routes/reading.js#L110).
- Saved report reads/deletes verify `uid` ownership in [server/src/routes/horoscope.js:1294](server/src/routes/horoscope.js#L1294) and [server/src/routes/horoscope.js:1410](server/src/routes/horoscope.js#L1410).
- Real secret files are ignored and not tracked: `git ls-files` showed only [mobile/google-services.json](mobile/google-services.json), [mobile/package-lock.json](mobile/package-lock.json), and [server/package-lock.json](server/package-lock.json) from the checked files. [mobile/.env](mobile/.env), [server/.env](server/.env), and [server/firebase-service-account.json](server/firebase-service-account.json) are ignored locally.

## P0 Findings - Fix Immediately

### 1. AI Porondam Report Is Not Subscription-Gated

Evidence: [server/src/routes/porondam.js:230](server/src/routes/porondam.js#L230) uses `router.post('/report', aiLimiter, phoneAuth, async ...)`. `phoneAuth` is optional when no token is supplied, and there is no `requireSubscription`, no token deduction, and no server-side RevenueCat receipt verification. The route comment says payment is handled by RevenueCat, but the server does not enforce it.

Impact: Anyone can call `/api/porondam/report` directly and generate an expensive AI report. This is both a monetization bypass and a direct AI cost-abuse path.

Fix:
- Add a server-enforced payment gate before generation. Use `phoneAuth, requireSubscription, aiUserLimiter` if Porondam report is included in Pro.
- If it is a one-time purchase, add a server-side verified purchase/entitlement check tied to `uid`, product ID, and input hash before generation.
- Return 401/402 before the prompt is built.
- Add a regression test that unauthenticated `/api/porondam/report` returns 401 or 402 and never calls `chat()`.

### 2. Public Business and Cost Telemetry

Evidence: [server/src/routes/pricing.js:67](server/src/routes/pricing.js#L67) exposes `/api/pricing/live-stats` without auth. [server/src/routes/pricing.js:83](server/src/routes/pricing.js#L83) exposes `/api/pricing/persist-stats` without auth. [mobile/services/api.js:348](mobile/services/api.js#L348) also has a client API wrapper for live cost stats.

Impact: Public callers can view live AI costs, revenue, profit, feature margins, recent request metadata, and force persistence to Firestore. This leaks business intelligence and creates a write path from the public internet.

Fix:
- Protect both endpoints with `requireAdmin`.
- Remove or hide the mobile client wrapper unless it is an authenticated admin-only screen.
- Do not return recent user/request details to public endpoints.
- Add a smoke test: unauthenticated live stats and persist stats must return 403.

### 3. AI Token Ceilings Are Extremely High

Evidence: [server/src/engine/chat.js:4147](server/src/engine/chat.js#L4147) sets `maxOutputTokens: 65536` for long sections. [server/src/engine/chat.js:4238](server/src/engine/chat.js#L4238) sets `maxOutputTokens: 65536` for hero sections with a `thinkingBudget` of 24576. The full AI report has 19 sections, concurrency 4, retries failed sections sequentially, and can run cross-section reconciliation in [server/src/engine/chat.js:5186](server/src/engine/chat.js#L5186) and [server/src/engine/chat.js:5311](server/src/engine/chat.js#L5311). Weekly Lagna also allows 65536 output tokens in [server/src/engine/weeklyLagna.js:284](server/src/engine/weeklyLagna.js#L284).

Impact: Actual responses may usually be smaller, but the hard caps permit runaway requests. A single full report can authorize a coherence pass, 19 initial section calls, retries for failed sections, and cross-section reconciliation. With expensive Gemini models on hero sections, this is a serious budget risk.

Fix:
- Set per-section caps to measured needs, for example 3000-6000 for normal sections and 6000-9000 for hero sections.
- Cap weekly Lagna to a realistic JSON size, for example 12000-16000.
- Lower thinking budgets, especially for routine sections.
- Add a post-call guard: if actual output/thinking tokens exceed expected by more than a threshold, log and alert.
- Add per-user and global daily spend ceilings at the application layer.

### 4. Broken Production Build Script

Evidence: [build-push.sh:48](build-push.sh#L48) has a stray `done`, followed by orphaned health-check code referencing undefined `CONTAINER_NAME`.

Impact: Production image build/push automation can fail before deployment. This makes urgent security fixes harder to ship and increases deployment risk.

Fix:
- Remove the stray `done` and orphaned lines after the final deployment hint.
- Add `shellcheck` to CI for deploy scripts.

### 5. No Confirmed Backup and Recovery Plan

Evidence: Firestore is initialized in [server/src/config/firebase.js:1](server/src/config/firebase.js#L1), but there is no backup job, restore runbook, or deployment preflight that exports Firestore. Deployment scripts in [vm-deploy.sh](vm-deploy.sh) manage only the container.

Impact: User profiles, reports, subscriptions, notification tokens, and entitlements could be permanently lost after operator error, account compromise, or Firestore project failure.

Fix:
- Add scheduled Firestore exports to a locked storage bucket with retention.
- Test restore monthly.
- Add a documented recovery runbook and RPO/RTO targets.

## P1 Findings - Fix This Week

### 6. Public Non-AI Full Report Endpoint Exposes Premium-Grade Computation

Evidence: [server/src/routes/horoscope.js:975](server/src/routes/horoscope.js#L975) exposes `/api/horoscope/full-report` with only `reportLimiter`. It generates a comprehensive non-AI report without auth or subscription. [mobile/services/api.js:235](mobile/services/api.js#L235) calls this endpoint.

Impact: This is not direct AI cost, but it gives public callers a premium-grade full report and consumes CPU. Because the mobile app also starts this alongside AI report generation, it increases server load during paid reports.

Fix:
- Decide whether this is truly free. If not, add `phoneAuth`, `requireSubscription`, and `reportUserLimiter`.
- If it must stay free, return a reduced version and move the full 13-section report behind auth.

### 7. Mobile Report Flow Starts Raw and AI Report Requests Together

Evidence: [mobile/app/(tabs)/report.js:1672](mobile/app/%28tabs%29/report.js#L1672) starts `api.getFullReport(...)`, [mobile/app/(tabs)/report.js:1676](mobile/app/%28tabs%29/report.js#L1676) starts `api.getAIReport(...)`, and [mobile/app/(tabs)/report.js:1681](mobile/app/%28tabs%29/report.js#L1681) waits with `Promise.allSettled` while progress polling is active.

Impact: Every paid report can also trigger a large raw report calculation. That may be useful for extra data, but it is currently coupled to the same UX action and increases load and failure surface. Combined with the public raw endpoint, this is a cost and availability multiplier.

Fix:
- Generate raw data inside the AI report server path once, or fetch only the minimal chart data needed by the UI.
- Avoid starting the public raw report request for users who only need the AI narrative.

### 8. Background AI Work on Birth Chart Is Not Subscription-Gated or Cost-Tracked

Evidence: `/api/horoscope/birth-chart` uses `optionalAuth` at [server/src/routes/horoscope.js:314](server/src/routes/horoscope.js#L314). For any authenticated user, it can start background AI explanation generation via `explainChartSimple` at [server/src/routes/horoscope.js:556](server/src/routes/horoscope.js#L556). Sinhala translation also uses background Gemini translation in [server/src/engine/chat.js:5462](server/src/engine/chat.js#L5462). These calls are not tracked with `trackCost`.

Impact: Logged-in non-subscribers can trigger background AI cost through chart generation. Because it is background work, cost spikes may not show up as failed requests or visible user actions.

Fix:
- Gate AI explanations/translations behind subscription or a clearly budgeted free-tier quota.
- Track every translation/explanation AI call with `trackCost`.
- Add a per-user daily quota and a global daily budget cap.

### 9. AI Analysis Endpoint Is Gated but Cost Is Not Tracked

Evidence: `/api/horoscope/ai-analysis` is properly gated in [server/src/routes/horoscope.js:586](server/src/routes/horoscope.js#L586), then calls `chat()` at [server/src/routes/horoscope.js:712](server/src/routes/horoscope.js#L712). It does not call `trackCost` for that AI response.

Impact: Premium cost accounting is incomplete. Profit and usage numbers underreport actual AI spend.

Fix:
- Add `trackCost('aiAnalysis', req.user.uid, usage)` or expand the tracker feature list.
- Include model and tokens in logs and cost dashboards.

### 10. Report Cache Is Disabled, So Paid Reports Always Regenerate

Evidence: [server/src/routes/horoscope.js:1090](server/src/routes/horoscope.js#L1090) explicitly disables cached report lookup for `/full-report-ai`.

Impact: Repeat requests for the same user/input/language always incur fresh AI cost, even when the previous report is still valid. This is expensive during retries, testing, support cases, and impatient repeated taps.

Fix:
- Re-enable cache with prompt/engine version invalidation.
- Add a `forceRegenerate` admin/user choice with explicit cost behavior.
- Cache by normalized input hash plus language plus prompt version.

### 11. Report Progress Endpoint Has No Auth or Ownership Check

Evidence: [server/src/routes/horoscope.js:1028](server/src/routes/horoscope.js#L1028) returns generation stage, section counts, current section, errors, and `savedReportId` for any `reportId`.

Impact: Report IDs are random but client-generated and pollable. A leaked ID allows visibility into another user's generation status and saved report ID.

Fix:
- Bind progress records to `uid` and require auth for polling.
- Return only minimal progress data unless the authenticated user owns the report.

### 12. RevenueCat Webhook Auth Should Be Hardened

Evidence: [server/src/routes/revenuecat.js:30](server/src/routes/revenuecat.js#L30) compares `Authorization` against `Bearer ${WEBHOOK_AUTH_KEY}` using normal string equality.

Impact: The production boot guard requires a key, which is good. Still, webhook forgery would directly change subscription status. Normal bearer matching has no replay protection, no HMAC body binding, and no timing-safe comparison.

Fix:
- Use RevenueCat's recommended webhook authentication model if available for the account.
- At minimum use `crypto.timingSafeEqual`, replay protection/event ID de-duplication, strict event schema validation, and audit logging.

### 13. Sensitive Mobile Data Uses Plain AsyncStorage

Evidence: Auth tokens are loaded from AsyncStorage in [mobile/contexts/AuthContext.js:190](mobile/contexts/AuthContext.js#L190) and saved at [mobile/contexts/AuthContext.js:385](mobile/contexts/AuthContext.js#L385). Reports are cached in AsyncStorage in [mobile/app/(tabs)/report.js:1414](mobile/app/%28tabs%29/report.js#L1414) and [mobile/app/(tabs)/report.js:1492](mobile/app/%28tabs%29/report.js#L1492).

Impact: Device compromise, debug backups, or shared-device scenarios can expose JWTs, birth data, locations, health/marriage/life predictions, and generated report content.

Fix:
- Use `expo-secure-store` for tokens.
- Encrypt report/chart caches or store only IDs and fetch content from the server.
- Clear report/chart caches on logout in [mobile/contexts/AuthContext.js:724](mobile/contexts/AuthContext.js#L724).

### 14. Public CPU-Heavy Calculation Routes Need Tiers or Quotas

Evidence: Enhanced routes are public in [server/src/routes/enhanced.js:41](server/src/routes/enhanced.js#L41). Jyotish routes are public calculation endpoints such as [server/src/routes/jyotish.js:43](server/src/routes/jyotish.js#L43). Prediction routes use `optionalAuth` across many endpoints such as [server/src/routes/predictions.js:51](server/src/routes/predictions.js#L51). Rectification is public with `optionalAuth` in [server/src/routes/rectification.js:35](server/src/routes/rectification.js#L35).

Impact: These are mostly calculation-only, but they can still consume CPU and expose premium astrology functions. Rectification can be especially expensive when scanning minute ranges.

Fix:
- Classify every route as free, authenticated free, subscription, admin, or internal.
- Apply per-user and per-IP quotas to calculation-heavy endpoints.
- Consider a queue/worker for heavier chart calculations.

### 15. Dependency Audit Has Real Vulnerabilities

Evidence: Production `npm audit --omit=dev` returned:
- Server: 17 total vulnerabilities - 6 high, 3 moderate, 8 low. High chain includes `astrology-insights -> swisseph -> node-gyp/make-fetch-happen/tar`; direct `express-rate-limit` has a moderate advisory.
- Mobile: 31 total vulnerabilities - 1 critical, 27 high, 3 moderate. Critical is `protobufjs <7.5.5`; high issues include Expo-related transitive packages, `node-fetch`, `node-forge`, `tar`, and `undici`.

Impact: Some may be build-time or transitive-only, but the mobile critical/high findings should be triaged before release builds. Server high findings around tar/node-gyp are especially relevant to build pipelines and native package installation.

Fix:
- Update `express-rate-limit` and lockfile.
- Triage `astrology-insights` and `swisseph`; replace or pin if the suggested downgrade is not acceptable.
- Upgrade Expo SDK/dependencies along a supported path rather than blindly applying audit's semver-major suggestions.
- Add `npm audit --omit=dev --audit-level=high` to CI, with allowlist only for reviewed non-runtime advisories.

## P2 Findings - Fix Next Sprint

### 16. Cost Tracker Is In-Memory and Loses Data on Crash

Evidence: [server/src/services/costTracker.js:28](server/src/services/costTracker.js#L28) stores stats in memory and persists daily summaries only on date reset or manual persist.

Impact: A restart loses same-day cost data, which weakens budget alerting and margin analysis.

Fix:
- Persist hourly checkpoints.
- Add per-request lightweight cost events to Firestore/BigQuery/log pipeline.
- Alert on daily cost, route cost, and provider cost thresholds.

### 17. Single-VM Deployment Is Undersized and Not Scalable

Evidence: [vm-deploy.sh:17](vm-deploy.sh#L17) sets 512 MB memory and [vm-deploy.sh:19](vm-deploy.sh#L19) sets 0.5 CPU. The server starts long AI report requests and runs the scheduler in-process in [server/src/index.js:154](server/src/index.js#L154).

Impact: Long AI requests, CPU-heavy chart generation, and scheduler work can compete in the same process. A single VM has no horizontal scaling or high availability.

Fix:
- Raise baseline capacity for production.
- Move long report generation to a queue/worker.
- Use a load balancer and more than one instance.
- Store progress in Firestore/Redis instead of process memory.

### 18. Scheduler Is In-Process and Can Duplicate Work When Scaled

Evidence: [server/src/services/scheduler.js:1](server/src/services/scheduler.js#L1) documents `setInterval` scheduler use. Weekly generation starts in [server/src/services/scheduler.js:443](server/src/services/scheduler.js#L443).

Impact: Multiple server instances can generate duplicate weekly reports and send duplicate notifications. A restart can miss or retry jobs unpredictably.

Fix:
- Use Cloud Scheduler/Cloud Tasks or a cron runner with a distributed lock.
- Make weekly generation idempotent by week ID before calling AI.
- Record job attempts and failures.

### 19. No Graceful Shutdown

Evidence: [server/src/index.js:145](server/src/index.js#L145) starts the server and scheduler, but no SIGTERM/SIGINT handler drains active requests.

Impact: Container restarts can drop long report generation, webhook processing, cost persistence, and scheduler work.

Fix:
- Add signal handlers to stop accepting new requests, drain in-flight work, persist cost stats, and stop scheduler loops.

### 20. Logs and Health Checks Are Too Thin

Evidence: [vm-deploy.sh:112](vm-deploy.sh#L112) keeps only 3 x 10 MB Docker logs. Health check is configured in [server/Dockerfile:47](server/Dockerfile#L47), but there is no external alerting visible in the repo.

Impact: Failures can be silent. High AI cost, 5xx spikes, OOM restarts, and webhook failures may not be noticed quickly.

Fix:
- Add centralized logs, metrics, uptime checks, and alerts.
- Alert on AI spend, report failure rate, response latency, 5xx rate, process restart, and memory pressure.

### 21. Geocode Proxy Has No Route-Specific Rate Limit

Evidence: [server/src/routes/geocode.js:26](server/src/routes/geocode.js#L26) proxies Nominatim search with only in-memory cache and the global limiter.

Impact: Abuse can hit Nominatim, degrade UX, or violate provider usage expectations.

Fix:
- Add a geocode-specific limiter and query normalization.
- Consider a local Sri Lankan city dataset first, then fallback to Nominatim.

### 22. In-Memory Vibe Links and Report Progress Are Volatile

Evidence: Vibe links are stored in a `Map` in [server/src/routes/porondam.js:532](server/src/routes/porondam.js#L532). Report progress is also process-memory based through the chat engine progress helpers.

Impact: Restarting the server breaks shared links and loses progress state.

Fix:
- Store vibe links in Firestore with TTL and rate limits.
- Store report progress by `reportId + uid` in Firestore or Redis with TTL.

## Notes on Public Keys and Secrets

Firebase web API keys and RevenueCat mobile SDK keys are public identifiers in mobile apps. They are not equivalent to server secrets. The risk is unrestricted use, missing App Check, weak Firebase rules, and lack of API key restrictions. The local `.env` files contain sensitive values and were visible to local search, but `git ls-files` confirms they are ignored and not tracked in this repo state. If those values were ever pasted into chat, logs, screenshots, or a shared archive, rotate them.

Recommended secret actions:
- Rotate Gemini API key, JWT secret, admin secret, RevenueCat webhook key, and Firebase service account if there is any chance they were exposed outside the machine.
- Enable Firebase App Check and API key restrictions by package name/SHA-1/bundle ID where possible.
- Keep [server/firebase-service-account.json](server/firebase-service-account.json) out of images and repos. The Dockerfile already avoids baking it in.

## Cost Hotspots Ranked

1. [server/src/routes/porondam.js:230](server/src/routes/porondam.js#L230) - unauthenticated/ungated AI Porondam report generation.
2. [server/src/engine/chat.js:4147](server/src/engine/chat.js#L4147) and [server/src/engine/chat.js:4238](server/src/engine/chat.js#L4238) - 65k section output caps plus thinking budgets.
3. [server/src/routes/horoscope.js:314](server/src/routes/horoscope.js#L314) and [server/src/routes/horoscope.js:556](server/src/routes/horoscope.js#L556) - background chart explanation AI for authenticated users without subscription gate or cost tracking.
4. [server/src/engine/weeklyLagna.js:284](server/src/engine/weeklyLagna.js#L284) - weekly generation with 65k cap and optional search grounding.
5. [mobile/app/(tabs)/report.js:1672](mobile/app/%28tabs%29/report.js#L1672) and [mobile/app/(tabs)/report.js:1676](mobile/app/%28tabs%29/report.js#L1676) - raw full report and AI report launched together.
6. [server/src/routes/horoscope.js:1090](server/src/routes/horoscope.js#L1090) - AI report cache intentionally disabled.
7. [server/src/routes/horoscope.js:712](server/src/routes/horoscope.js#L712) - gated AI analysis not included in cost tracker.
8. [server/src/services/costTracker.js:28](server/src/services/costTracker.js#L28) - in-memory cost stats can be lost on restart.

## Remediation Plan

### First 24 Hours

1. Gate [server/src/routes/porondam.js:230](server/src/routes/porondam.js#L230) with server-side subscription or verified one-time purchase entitlement.
2. Gate [server/src/routes/pricing.js:67](server/src/routes/pricing.js#L67) and [server/src/routes/pricing.js:83](server/src/routes/pricing.js#L83) with `requireAdmin`.
3. Lower 65k `maxOutputTokens` caps and thinking budgets in [server/src/engine/chat.js](server/src/engine/chat.js) and [server/src/engine/weeklyLagna.js](server/src/engine/weeklyLagna.js).
4. Fix [build-push.sh:48](build-push.sh#L48).
5. Add `trackCost` to every AI route or temporarily disable untracked AI endpoints.

### First Week

1. Re-enable AI report caching with prompt/engine version keys.
2. Move auth tokens to SecureStore and encrypt or reduce report cache content on mobile.
3. Add Firestore backup automation and restore runbook.
4. Add external uptime, 5xx, latency, memory, report failure, webhook failure, and AI spend alerts.
5. Triage and upgrade dependency audit findings.
6. Add route classification tests for all paid/admin endpoints.

### First Month

1. Move long report generation and weekly scheduler jobs to durable workers or managed tasks.
2. Store report progress and vibe links in durable storage with TTL and ownership.
3. Add distributed rate limiting and budget enforcement, preferably Redis or Firestore-backed.
4. Harden RevenueCat webhook validation with replay/event de-duplication and timing-safe checks.
5. Review Firestore security rules and add rule tests.
6. Define actual unit economics for subscription users: subscription revenue minus chat, report, weekly Lagna share, retries, and support/regeneration cost.

## Acceptance Criteria

- Unauthenticated calls to paid AI routes return 401/402 and no AI provider call is made.
- `/api/pricing/live-stats` and `/api/pricing/persist-stats` return 403 without admin secret.
- No route can exceed an agreed per-request token budget.
- Every AI provider call records feature, user, model, input tokens, output tokens, thinking tokens, and estimated cost.
- Daily cost data survives server restarts.
- Firestore backup and restore has been tested.
- Mobile tokens are stored in SecureStore, not AsyncStorage.
- `npm audit --omit=dev --audit-level=high` is clean or has reviewed, documented exceptions.
- Deployment scripts pass shell linting and health checks.
