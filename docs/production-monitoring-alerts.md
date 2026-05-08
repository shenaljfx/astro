# Production Monitoring And Alerts

## Runtime Webhook Alerts

The API sends throttled JSON alerts when `ALERT_WEBHOOK_URL` is set. The webhook can be Slack, Discord, Google Chat, PagerDuty Events API, or a small internal relay.

Configure in `server/.env` or the production secret store:

```bash
ALERT_WEBHOOK_URL=https://example.com/ops-webhook
ALERT_THROTTLE_MS=300000
ALERT_LATENCY_MS=30000
ALERT_MEMORY_RSS_MB=450
ALERT_DAILY_AI_SPEND_LKR=5000
```

Covered in code:

- `http_5xx`: any API response with status `>= 500`.
- `http_latency_high`: requests slower than `ALERT_LATENCY_MS`.
- `memory_rss_high`: process RSS above `ALERT_MEMORY_RSS_MB`.
- `report_generation_failed`: full AI report generation failures.
- `revenuecat_webhook_failed`: RevenueCat webhook processing failures.
- `ai_spend_threshold`: daily AI cost crossing `ALERT_DAILY_AI_SPEND_LKR`.

## External Uptime

Use an external monitor that is outside the production host and network. Monitor:

```text
GET https://api.grahachara.com/api/health
```

Recommended thresholds:

- Check every 60 seconds from at least two regions.
- Alert after 2 consecutive failures.
- Escalate after 5 minutes unresolved.

## 5xx And Latency

The in-app alerting covers request-level 5xx and latency. Also configure provider-side alerts in Cloud Monitoring, the load balancer, or the hosting platform:

- 5xx rate > 2% for 5 minutes.
- p95 latency > 10 seconds for 5 minutes.
- p99 latency > 45 seconds for 5 minutes.

Long report requests can run for several minutes, so alert on percentile trends rather than individual report duration alone.

## Memory

Use both process alerting and host metrics:

- Process RSS > `ALERT_MEMORY_RSS_MB`.
- Container memory > 85% for 5 minutes.
- Restart count > 1 in 10 minutes.

## Report And Webhook Failures

Investigate report failures by checking:

- Gemini/OpenAI quota and API status.
- `/api/horoscope/full-report-ai` 5xx logs.
- Firestore write errors for `reports`.
- Rate-limit and duplicate-generation responses.

Investigate webhook failures by checking:

- RevenueCat dashboard delivery logs.
- `REVENUECAT_WEBHOOK_AUTH_KEY` secret drift.
- Firestore user lookup and update errors.

## AI Spend

`ai_spend_threshold` fires once per Sri Lanka day when total tracked AI cost crosses the configured threshold. Pair this with provider billing alerts at 50%, 80%, and 100% of the monthly budget.
