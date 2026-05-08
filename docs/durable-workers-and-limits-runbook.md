# Durable Workers And Limits Runbook

## Scope

Long AI work is no longer tied to an HTTP request. Report generation and weekly Lagna generation are queued into Firestore `jobs` and processed by `server/scripts/worker.js`.

## Worker Commands

Run continuously:

```bash
cd server
npm run worker
```

Run one queued job and exit, useful for Cloud Run Jobs, VM cron, or smoke checks:

```bash
cd server
npm run worker:once
```

Limit job types:

```bash
node scripts/worker.js --types=aiReport
node scripts/worker.js --types=weeklyLagna --once
```

## Firestore Collections

- `jobs`: durable queued/running/complete/failed job state with locks, attempts, result, and TTL.
- `reportProgress`: user-owned report progress documents. Mobile polls these by `reportId`; reads require the owner uid.
- `vibeLinks`: share links with `ownerUid`, `expiresAt`, `usedAt`, and sender metadata.
- `rateLimits`: distributed fixed-window rate counters.
- `dailyAiSpend`, `dailyAiUserSpend`, `aiCostEvents`: budget enforcement and spend audit trail.
- `revenuecatWebhookEvents`: RevenueCat event IDs and processing state for replay/de-duplication.

## Required Production Settings

Set these in production before enabling paid AI traffic:

```bash
DAILY_GLOBAL_AI_SPEND_LIMIT_LKR=10000
DAILY_USER_AI_SPEND_LIMIT_LKR=700
DISTRIBUTED_AI_USER_PER_MINUTE=8
DISTRIBUTED_REPORT_USER_PER_HOUR=2
REVENUECAT_WEBHOOK_MAX_AGE_MS=259200000
WORKER_POLL_MS=5000
```

Start at least one worker process. For higher availability, run two workers; Firestore job locks prevent duplicate processing.

## Managed Task Options

- VM/systemd: run `npm run worker` as a long-running service.
- Cloud Run service: run the same command with min instances set to 1.
- Cloud Run Jobs or Cloud Scheduler: invoke `npm run worker:once` every minute.
- Kubernetes: deploy `npm run worker` as a separate worker deployment.

## Operational Checks

- Queued jobs should not remain `queued` for more than 5 minutes during normal traffic.
- Running jobs should have a future `lockUntil`; stale locks indicate a crashed worker.
- `reportProgress.expiresAt`, `vibeLinks.expiresAt`, and cost/webhook `expiresAt` fields should be configured as Firestore TTL policies.
- RevenueCat duplicate events return `{ success: true, duplicate: true }` and must not mutate subscription state again.