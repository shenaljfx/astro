# Subscription Unit Economics

## Formula

Monthly contribution per subscriber:

```text
net subscription revenue
- monthly chat AI cost
- monthly report AI cost
- weekly Lagna shared cost
- retry and support/regeneration cost
- infrastructure share
= contribution margin
```

The server exposes this model at the admin-only endpoint:

```text
GET /api/pricing/unit-economics
```

## Default Local Assumptions

- Sri Lanka subscription revenue: LKR 280/month.
- International subscription revenue: USD 4.99/month converted with `USD_TO_LKR`.
- Platform/payment fee: 15% of subscription revenue.
- Chat allowance: 5 messages/user/day.
- Average chat AI cost: LKR 1.25/message.
- Included report usage: 1 report/user/month.
- Average report AI cost: LKR 80/report.
- Retry rate: 8%.
- Support regeneration rate: 3%.
- Weekly Lagna shared monthly cost: LKR 1,500 divided by active subscribers.
- Support tickets: 0.02/user/month at LKR 150/ticket.
- Infrastructure share: LKR 20/user/month.

## Production Variables

Keep these values tied to real telemetry from `dailyAiSpend`, `dailyAiUserSpend`, RevenueCat, and support tooling:

```bash
SUBSCRIPTION_REVENUE_LKR=280
SUBSCRIPTION_REVENUE_USD=4.99
SUBSCRIPTION_PLATFORM_FEE_RATE=0.15
UNIT_CHAT_MESSAGES_PER_USER_PER_DAY=5
UNIT_CHAT_COST_LKR=1.25
UNIT_REPORTS_PER_USER_MONTH=1
UNIT_REPORT_COST_LKR=80
UNIT_RETRY_RATE=0.08
UNIT_SUPPORT_REGENERATION_RATE=0.03
UNIT_ACTIVE_SUBSCRIBERS=100
UNIT_WEEKLY_LAGNA_MONTHLY_COST_LKR=1500
UNIT_SUPPORT_TICKETS_PER_USER_MONTH=0.02
UNIT_SUPPORT_COST_PER_TICKET_LKR=150
UNIT_INFRA_SHARE_LKR=20
```

## Decision Rule

If contribution margin is below 20%, reduce included usage, lower AI token budgets, increase active subscribers before running weekly Lagna at full cadence, or move high-cost reports behind explicit one-time purchase entitlements.