const { getUsdToLkr } = require('../utils/tokenCalculator');

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculateSubscriptionUnitEconomics(input = {}) {
  const usdToLkr = numberEnv('USD_TO_LKR', getUsdToLkr());
  const currency = input.currency || process.env.UNIT_ECONOMICS_CURRENCY || 'LKR';
  const subscriptionRevenueLKR = currency === 'USD'
    ? numberEnv('SUBSCRIPTION_REVENUE_USD', 4.99) * usdToLkr
    : numberEnv('SUBSCRIPTION_REVENUE_LKR', 280);
  const platformFeeRate = numberEnv('SUBSCRIPTION_PLATFORM_FEE_RATE', 0.15);
  const paymentFeeLKR = subscriptionRevenueLKR * platformFeeRate;
  const netRevenueLKR = subscriptionRevenueLKR - paymentFeeLKR;

  const avgChatMessagesPerDay = numberEnv('UNIT_CHAT_MESSAGES_PER_USER_PER_DAY', 5);
  const avgChatCostLKR = numberEnv('UNIT_CHAT_COST_LKR', 1.25);
  const monthlyChatCostLKR = avgChatMessagesPerDay * 30 * avgChatCostLKR;

  const reportsPerUserMonth = numberEnv('UNIT_REPORTS_PER_USER_MONTH', 1);
  const avgReportCostLKR = numberEnv('UNIT_REPORT_COST_LKR', 80);
  const retryRate = numberEnv('UNIT_RETRY_RATE', 0.08);
  const regenerationRate = numberEnv('UNIT_SUPPORT_REGENERATION_RATE', 0.03);
  const monthlyReportCostLKR = reportsPerUserMonth * avgReportCostLKR * (1 + retryRate + regenerationRate);

  const activeSubscribers = Math.max(1, numberEnv('UNIT_ACTIVE_SUBSCRIBERS', 100));
  const weeklyLagnaMonthlyCostLKR = numberEnv('UNIT_WEEKLY_LAGNA_MONTHLY_COST_LKR', 1500);
  const weeklyLagnaShareLKR = weeklyLagnaMonthlyCostLKR / activeSubscribers;

  const supportTicketsPerUserMonth = numberEnv('UNIT_SUPPORT_TICKETS_PER_USER_MONTH', 0.02);
  const supportCostPerTicketLKR = numberEnv('UNIT_SUPPORT_COST_PER_TICKET_LKR', 150);
  const supportCostLKR = supportTicketsPerUserMonth * supportCostPerTicketLKR;

  const infrastructureShareLKR = numberEnv('UNIT_INFRA_SHARE_LKR', 20);
  const variableCostLKR = monthlyChatCostLKR + monthlyReportCostLKR + weeklyLagnaShareLKR + supportCostLKR + infrastructureShareLKR;
  const contributionMarginLKR = netRevenueLKR - variableCostLKR;

  return {
    currency,
    usdToLkr: round2(usdToLkr),
    revenue: {
      grossSubscriptionLKR: round2(subscriptionRevenueLKR),
      platformFeeLKR: round2(paymentFeeLKR),
      netSubscriptionRevenueLKR: round2(netRevenueLKR),
    },
    costs: {
      chatLKR: round2(monthlyChatCostLKR),
      reportsLKR: round2(monthlyReportCostLKR),
      weeklyLagnaShareLKR: round2(weeklyLagnaShareLKR),
      supportAndRegenerationLKR: round2(supportCostLKR),
      infrastructureShareLKR: round2(infrastructureShareLKR),
      totalVariableCostLKR: round2(variableCostLKR),
    },
    margin: {
      contributionMarginLKR: round2(contributionMarginLKR),
      contributionMarginPercent: netRevenueLKR > 0 ? round2((contributionMarginLKR / netRevenueLKR) * 100) : 0,
      breakEvenVariableCostLKR: round2(netRevenueLKR),
    },
    assumptions: {
      avgChatMessagesPerDay,
      avgChatCostLKR,
      reportsPerUserMonth,
      avgReportCostLKR,
      retryRate,
      regenerationRate,
      activeSubscribers,
      weeklyLagnaMonthlyCostLKR,
      supportTicketsPerUserMonth,
      supportCostPerTicketLKR,
      infrastructureShareLKR,
      platformFeeRate,
    },
  };
}

module.exports = {
  calculateSubscriptionUnitEconomics,
};