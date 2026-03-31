/**
 * Cost Calculator Engine
 * 
 * Calculates the AI API cost in LKR for:
 *   1. Full AI Report (17 sections + coherence pass)
 *   2. Weekly Lagna Palapala (12 lagnas × 1 AI call each)
 *   3. Porondam (Marriage Compatibility) AI Report (1 AI call)
 * 
 * Uses actual model pricing from tokenCalculator.js and estimates
 * token usage based on measured averages from production.
 * 
 * Usage:
 *   const { estimateFullReportCost, estimateWeeklyLagnaCost, estimatePorondamCost, runFullCostTest } = require('./costCalculator');
 *   const result = await runFullCostTest('1998-10-09T03:46:00.000Z', 6.9271, 79.8612);
 */

const { MODEL_PRICING, getUsdToLkr } = require('../utils/tokenCalculator');

// ── Average Token Usage Per Section (measured from production runs) ──
// Format: { input: avg input tokens, output: avg output tokens }
const SECTION_TOKEN_ESTIMATES = {
  // Hero sections (Gemini 3.1 Pro Preview)
  lifePredictions:  { input: 12000, output: 8000 },
  career:           { input: 11000, output: 7500 },
  marriage:         { input: 12000, output: 8000 },
  marriedLife:      { input: 11000, output: 7000 },
  health:           { input: 12000, output: 7500 },
  children:         { input: 10000, output: 6500 },
  familyPortrait:   { input: 10000, output: 6500 },
  surpriseInsights: { input: 11000, output: 7000 },
  education:        { input: 10000, output: 6500 },

  // Standard sections (Gemini 2.5 Flash)
  yogaAnalysis:     { input: 9000,  output: 5000 },
  financial:        { input: 10000, output: 5500 },
  foreignTravel:    { input: 9000,  output: 4500 },
  luck:             { input: 9000,  output: 5000 },
  legal:            { input: 9000,  output: 4500 },
  realEstate:       { input: 9000,  output: 4500 },
  transits:         { input: 10000, output: 5000 },
  remedies:         { input: 9000,  output: 5000 },
};

// Coherence pass (Gemini 2.5 Flash)
const COHERENCE_TOKEN_ESTIMATE = { input: 8000, output: 2000 };

// Weekly Lagna per lagna (Gemini 3.1 Pro with search)
const WEEKLY_LAGNA_TOKEN_ESTIMATE = { input: 4000, output: 3000 };
const WEEKLY_LAGNA_SEARCH_QUERIES_PER_LAGNA = 2; // avg search queries per lagna

// Porondam report (Gemini 2.5 Flash via chat())
const PORONDAM_TOKEN_ESTIMATE = { input: 8000, output: 6000 };

// Chat question (Gemini 2.5 Flash via chat(), single Q&A)
const CHAT_QUESTION_TOKEN_ESTIMATE = { input: 3000, output: 2000 };

// Hero sections list (uses Gemini 3.1 Pro Preview)
const HERO_SECTIONS = ['lifePredictions', 'surpriseInsights', 'marriage', 'career', 'marriedLife', 'familyPortrait', 'health', 'children', 'education'];

// ── Revenue / Business Model ────────────────────────────────────
// Prices charged to users (LKR)
const REVENUE = {
  fullReportLKR: 350,        // One-time charge per full AI report
  porondamLKR: 100,          // One-time charge per porondam report
  subscriptionLKR: 240,      // Monthly subscription
  // Subscription includes:
  //   - Weekly Lagna Palapala (generated once, shared across ALL subscribers)
  //   - 10 AI chat questions per month
  //   - One-time Kendara (birth chart) generation
  chatQuestionsPerMonth: 10,
};

/**
 * Calculate cost for a single AI call
 * @param {boolean} freeSearchTier - if true, search queries are free (within 5k/month for Gemini 3)
 */
function calculateCallCost(modelName, inputTokens, outputTokens, searchQueries = 0, freeSearchTier = true) {
  const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['gemini-2.5-flash'];
  const usdToLkr = getUsdToLkr();

  const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputPer1M;
  // Gemini 3 family gets 5,000 free search prompts/month — after that $14/1K queries
  const searchCostUSD = (!freeSearchTier && searchQueries > 0 && pricing.searchCostPer1K)
    ? (searchQueries / 1000) * pricing.searchCostPer1K
    : 0;
  const totalUSD = inputCostUSD + outputCostUSD + searchCostUSD;

  return {
    model: pricing.label || modelName,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCostUSD: round6(inputCostUSD),
    outputCostUSD: round6(outputCostUSD),
    searchCostUSD: round6(searchCostUSD),
    searchQueries,
    totalCostUSD: round6(totalUSD),
    totalCostLKR: round2(totalUSD * usdToLkr),
  };
}

/**
 * Estimate cost for Full AI Report (17 sections + coherence pass)
 * @param {boolean} freeSearchTier - true if within free 5k search prompts/month
 */
function estimateFullReportCost(freeSearchTier = true) {
  const usdToLkr = getUsdToLkr();
  const heroModel = process.env.GEMINI_3_PRO_MODEL || 'gemini-3.1-pro-preview';
  const standardModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const breakdown = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUSD = 0;
  let totalSearchQueries = 0;

  // Coherence pass (standard model)
  const coherenceCost = calculateCallCost(standardModel, COHERENCE_TOKEN_ESTIMATE.input, COHERENCE_TOKEN_ESTIMATE.output, 0, freeSearchTier);
  breakdown.push({ section: 'coherence-pass', ...coherenceCost });
  totalInputTokens += COHERENCE_TOKEN_ESTIMATE.input;
  totalOutputTokens += COHERENCE_TOKEN_ESTIMATE.output;
  totalCostUSD += coherenceCost.totalCostUSD;

  // All 17 sections
  const sectionOrder = Object.keys(SECTION_TOKEN_ESTIMATES);
  for (const section of sectionOrder) {
    const est = SECTION_TOKEN_ESTIMATES[section];
    const isHero = HERO_SECTIONS.includes(section);
    const model = isHero ? heroModel : standardModel;
    // Hero sections with 3.1 Pro get search grounding
    const searchQueries = isHero && model.includes('3.1') ? 1 : 0;
    
    const cost = calculateCallCost(model, est.input, est.output, searchQueries, freeSearchTier);
    breakdown.push({ section, isHero, ...cost });
    totalInputTokens += est.input;
    totalOutputTokens += est.output;
    totalCostUSD += cost.totalCostUSD;
    totalSearchQueries += searchQueries;
  }

  return {
    type: 'Full AI Report',
    freeSearchTier,
    totalSections: sectionOrder.length + 1, // +1 for coherence
    heroSections: HERO_SECTIONS.length,
    standardSections: sectionOrder.length - HERO_SECTIONS.length,
    models: {
      hero: heroModel,
      standard: standardModel,
    },
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalSearchQueries,
    costUSD: round6(totalCostUSD),
    costLKR: round2(totalCostUSD * usdToLkr),
    usdToLkrRate: usdToLkr,
    breakdown,
  };
}

/**
 * Estimate cost for Weekly Lagna Palapala (12 lagnas)
 * @param {boolean} freeSearchTier - true if within free 5k search prompts/month
 */
function estimateWeeklyLagnaCost(freeSearchTier = true) {
  const usdToLkr = getUsdToLkr();
  const model = process.env.GEMINI_3_PRO_MODEL || 'gemini-3.1-pro-preview';

  const breakdown = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUSD = 0;
  let totalSearchQueries = 0;

  const LAGNA_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  for (const lagna of LAGNA_NAMES) {
    const est = WEEKLY_LAGNA_TOKEN_ESTIMATE;
    const searchQueries = WEEKLY_LAGNA_SEARCH_QUERIES_PER_LAGNA;
    const cost = calculateCallCost(model, est.input, est.output, searchQueries, freeSearchTier);
    breakdown.push({ lagna, ...cost });
    totalInputTokens += est.input;
    totalOutputTokens += est.output;
    totalCostUSD += cost.totalCostUSD;
    totalSearchQueries += searchQueries;
  }

  return {
    type: 'Weekly Lagna Palapala',
    freeSearchTier,
    lagnaCount: 12,
    model,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalSearchQueries,
    costUSD: round6(totalCostUSD),
    costLKR: round2(totalCostUSD * usdToLkr),
    costPerLagnaLKR: round2((totalCostUSD * usdToLkr) / 12),
    usdToLkrRate: usdToLkr,
    breakdown,
  };
}

/**
 * Estimate cost for Porondam (Marriage Compatibility) AI Report
 */
function estimatePorondamCost() {
  const usdToLkr = getUsdToLkr();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const est = PORONDAM_TOKEN_ESTIMATE;
  const cost = calculateCallCost(model, est.input, est.output);

  return {
    type: 'Porondam AI Report',
    model,
    ...cost,
    costPerReport: round2(cost.totalCostUSD * usdToLkr),
    usdToLkrRate: usdToLkr,
  };
}

/**
 * Estimate cost for a single AI chat question
 */
function estimateChatQuestionCost() {
  const usdToLkr = getUsdToLkr();
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const est = CHAT_QUESTION_TOKEN_ESTIMATE;
  const cost = calculateCallCost(model, est.input, est.output);

  return {
    type: 'Chat Question (single)',
    model,
    ...cost,
    costPerQuestion: round2(cost.totalCostUSD * usdToLkr),
    costFor10Questions: round2(cost.totalCostUSD * usdToLkr * 10),
    usdToLkrRate: usdToLkr,
  };
}

/**
 * Run a LIVE cost test — actually generates a full report and measures real token usage
 * Uses 1998-10-09 09:16 Colombo by default
 */
async function runLiveCostTest(birthDateStr = '1998-10-09T03:46:00.000Z', lat = 6.9271, lng = 79.8612, language = 'en') {
  const { generateAINarrativeReport } = require('./chat');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LIVE COST TEST — FULL AI REPORT');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Birth: ${birthDateStr} at (${lat}, ${lng})`);
  console.log(`Language: ${language}`);
  console.log(`USD→LKR Rate: ${getUsdToLkr()}`);
  console.log('');

  const startTime = Date.now();
  const report = await generateAINarrativeReport(new Date(birthDateStr), lat, lng, language);
  const elapsed = Date.now() - startTime;

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Generation time: ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`Sections generated: ${Object.keys(report.narrativeSections).length}`);
  
  if (report.tokenUsage) {
    const usage = report.tokenUsage;
    console.log('');
    console.log('── TOKEN USAGE ──');
    console.log(`Total calls: ${usage.summary.totalCalls}`);
    console.log(`Input tokens: ${usage.summary.totalInputTokens.toLocaleString()}`);
    console.log(`Output tokens: ${usage.summary.totalOutputTokens.toLocaleString()}`);
    console.log(`Thinking tokens: ${usage.summary.totalThinkingTokens.toLocaleString()}`);
    console.log(`Total tokens: ${usage.summary.totalTokens.toLocaleString()}`);
    console.log('');
    console.log('── COST ──');
    console.log(`Cost USD: $${usage.summary.costUSD}`);
    console.log(`Cost LKR: Rs. ${usage.summary.costLKR}`);
    console.log(`Generation time: ${usage.summary.generationTimeSec}s`);
    console.log('');
    console.log('── PER-SECTION BREAKDOWN ──');
    if (usage.breakdown) {
      const maxLabelLen = Math.max(...usage.breakdown.map(b => (b.section || '').length));
      for (const b of usage.breakdown) {
        const label = (b.section || '').padEnd(maxLabelLen);
        console.log(`  ${label}  ${(b.model || '').padEnd(28)} in:${String(b.input).padStart(7)} out:${String(b.output).padStart(7)} think:${String(b.thinking).padStart(7)} → LKR ${b.costLKR}`);
      }
    }
  }

  return { report, elapsed };
}

/**
 * Print a comprehensive cost estimate summary with correct business model
 * 
 * Business Model:
 *   - Full AI Report: LKR 350 (one-time, separate charge)
 *   - Porondam Report: LKR 100 (one-time, separate charge)
 *   - Monthly Subscription: LKR 240/month includes:
 *       • Weekly Lagna Palapala (generated once, shared across ALL users)
 *       • 10 AI chat questions per month
 *       • One-time Kendara (birth chart) generation (pure math, no AI cost)
 */
function printCostSummary() {
  const usdToLkr = getUsdToLkr();
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║               GRAHACHARA — BUSINESS MODEL & COST ANALYSIS               ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log(`  Exchange Rate: 1 USD = ${usdToLkr} LKR`);
  console.log(`  Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`  Note: Gemini 3.x gets 5,000 FREE search prompts/month`);
  console.log('');

  // ── Revenue Model ──
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  REVENUE MODEL                                                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Full AI Report:     LKR ${REVENUE.fullReportLKR} per report (one-time charge)              ║`);
  console.log(`║  Porondam Report:    LKR ${REVENUE.porondamLKR} per report (one-time charge)              ║`);
  console.log(`║  Subscription:       LKR ${REVENUE.subscriptionLKR}/month                                    ║`);
  console.log('║    Includes:                                                             ║');
  console.log('║      • Weekly Lagna Palapala (shared — generated once for all users)      ║');
  console.log(`║      • ${REVENUE.chatQuestionsPerMonth} AI chat questions per month                                   ║`);
  console.log('║      • One-time Kendara generation (pure calculation, no AI cost)         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══ SCENARIO A: Within free search tier ═══
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SCENARIO A: Within FREE Search Tier (< 5K prompts/month)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // 1. Full Report (free search)
  const fullReportFree = estimateFullReportCost(true);
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  1. FULL AI REPORT  (charged: LKR 350)                          │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  Sections: ${fullReportFree.totalSections} (${fullReportFree.heroSections} hero @3.1Pro + ${fullReportFree.standardSections} std @2.5Flash + coherence)`);
  console.log(`│  Tokens: ~${(fullReportFree.totalTokens / 1000).toFixed(0)}K (${(fullReportFree.totalInputTokens / 1000).toFixed(0)}K in + ${(fullReportFree.totalOutputTokens / 1000).toFixed(0)}K out)`);
  console.log(`│  Search queries: ${fullReportFree.totalSearchQueries} (FREE tier)`);
  console.log(`│  💰 AI COST: $${fullReportFree.costUSD} USD = LKR ${fullReportFree.costLKR}`);
  console.log(`│  💵 REVENUE: LKR ${REVENUE.fullReportLKR}`);
  const reportMargin = round2(REVENUE.fullReportLKR - fullReportFree.costLKR);
  const reportMarginPct = round2((reportMargin / REVENUE.fullReportLKR) * 100);
  console.log(`│  📊 MARGIN: LKR ${reportMargin} (${reportMarginPct}%)`);
  if (reportMargin < 0) console.log('│  ⚠️  NEGATIVE MARGIN — raise price or reduce sections!');
  console.log('│');
  console.log('│  Section Breakdown:');
  for (const b of fullReportFree.breakdown) {
    const marker = b.isHero ? '⭐' : b.section === 'coherence-pass' ? '🔗' : '  ';
    console.log(`│    ${marker} ${(b.section || '').padEnd(20)} ${(b.model || '').padEnd(28)} LKR ${String(b.totalCostLKR).padStart(7)}`);
  }
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // 2. Porondam
  const porondam = estimatePorondamCost();
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  2. PORONDAM AI REPORT  (charged: LKR 100)                      │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  Model: ${porondam.model}`);
  console.log(`│  Tokens: ~${((porondam.inputTokens + porondam.outputTokens) / 1000).toFixed(0)}K`);
  console.log(`│  💰 AI COST: $${porondam.totalCostUSD} USD = LKR ${porondam.costPerReport}`);
  console.log(`│  💵 REVENUE: LKR ${REVENUE.porondamLKR}`);
  const porondamMargin = round2(REVENUE.porondamLKR - porondam.costPerReport);
  const porondamMarginPct = round2((porondamMargin / REVENUE.porondamLKR) * 100);
  console.log(`│  📊 MARGIN: LKR ${porondamMargin} (${porondamMarginPct}%)`);
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // 3. Weekly Lagna (free search) — SHARED cost, not per-user
  const weeklyLagnaFree = estimateWeeklyLagnaCost(true);
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  3. WEEKLY LAGNA PALAPALA  (shared — generated once for ALL)     │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  Model: ${weeklyLagnaFree.model}`);
  console.log(`│  Lagnas: 12 | Tokens: ~${(weeklyLagnaFree.totalTokens / 1000).toFixed(0)}K | Search: ${weeklyLagnaFree.totalSearchQueries} (FREE)`);
  console.log(`│  💰 AI COST per week: $${weeklyLagnaFree.costUSD} USD = LKR ${weeklyLagnaFree.costLKR}`);
  console.log(`│  Per lagna: LKR ${weeklyLagnaFree.costPerLagnaLKR}`);
  const monthlyLagnaCost = round2(weeklyLagnaFree.costLKR * 4.33);
  console.log(`│  📅 Monthly (4.33 weeks): LKR ${monthlyLagnaCost}`);
  console.log(`│  ℹ️  This is a FIXED cost split across all subscribers`);
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // 4. Chat Questions — included in subscription
  const chatQ = estimateChatQuestionCost();
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log(`│  4. AI CHAT QUESTIONS  (${REVENUE.chatQuestionsPerMonth}/month included in subscription)       │`);
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  Model: ${chatQ.model}`);
  console.log(`│  Tokens per Q: ~${((chatQ.inputTokens + chatQ.outputTokens) / 1000).toFixed(0)}K`);
  console.log(`│  💰 Cost per question: LKR ${chatQ.costPerQuestion}`);
  console.log(`│  💰 Cost for ${REVENUE.chatQuestionsPerMonth} questions: LKR ${chatQ.costFor10Questions}`);
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // 5. Kendara — pure calculation, no AI cost
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  5. KENDARA (Birth Chart)  (included in subscription)           │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│  💰 AI COST: LKR 0.00 (pure astronomical calculation)');
  console.log('│  ℹ️  Uses astronomia/ephemeris — no AI API calls');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // ═══ SCENARIO B: After free tier exhausted ═══
  const fullReportPaid = estimateFullReportCost(false);
  const weeklyLagnaPaid = estimateWeeklyLagnaCost(false);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SCENARIO B: PAID Search Tier (> 5K search prompts/month)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Full Report:  LKR ${fullReportPaid.costLKR}  (margin: LKR ${round2(REVENUE.fullReportLKR - fullReportPaid.costLKR)})`);
  console.log(`  Weekly Lagna: LKR ${weeklyLagnaPaid.costLKR} per week`);
  console.log(`  Porondam:     LKR ${porondam.costPerReport} (no search, same)`);
  console.log(`  Chat (×10):   LKR ${chatQ.costFor10Questions} (no search, same)`);
  console.log('');

  // ═══ SUBSCRIPTION PROFITABILITY ANALYSIS ═══
  const searchPromptsPerReport = fullReportFree.totalSearchQueries;
  const searchPromptsPerWeek = weeklyLagnaFree.totalSearchQueries;
  const monthlySearchFromLagna = round2(searchPromptsPerWeek * 4.33);

  // Per-subscriber cost (subscription includes: shared lagna cost portion + 10 chat Qs)
  // Lagna is shared, so per-subscriber cost depends on subscriber count
  const subscriberCounts = [10, 50, 100, 500, 1000];

  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SUBSCRIPTION PROFITABILITY (LKR 240/month per subscriber)               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                          ║');
  console.log(`║  Included per subscriber:                                                 ║`);
  console.log(`║    Chat (${REVENUE.chatQuestionsPerMonth} questions): LKR ${chatQ.costFor10Questions}                                        ║`);
  console.log(`║    Kendara: LKR 0.00                                                      ║`);
  console.log(`║    Lagna (shared — see table below)                                       ║`);
  console.log('║                                                                          ║');

  console.log('║  ┌────────────┬─────────────┬──────────┬──────────┬──────────┬─────────┐ ║');
  console.log('║  │ Subscribers│ Lagna/user  │ Chat×10  │ Total    │ Revenue  │ Margin  │ ║');
  console.log('║  ├────────────┼─────────────┼──────────┼──────────┼──────────┼─────────┤ ║');
  for (const subs of subscriberCounts) {
    const lagnaPerUser = round2(monthlyLagnaCost / subs);
    const totalPerUser = round2(lagnaPerUser + chatQ.costFor10Questions);
    const margin = round2(REVENUE.subscriptionLKR - totalPerUser);
    const marginPct = round2((margin / REVENUE.subscriptionLKR) * 100);
    console.log(`║  │ ${String(subs).padStart(10)} │ LKR ${String(lagnaPerUser).padStart(6)} │ LKR ${String(chatQ.costFor10Questions).padStart(4)} │ LKR ${String(totalPerUser).padStart(4)} │ LKR ${String(REVENUE.subscriptionLKR).padStart(3)} │ ${String(marginPct).padStart(5)}% │ ║`);
  }
  console.log('║  └────────────┴─────────────┴──────────┴──────────┴──────────┴─────────┘ ║');
  console.log('║                                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // ═══ SEARCH BUDGET ═══
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  SEARCH BUDGET (5,000 free prompts/month)                       │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log(`│  Per full report: ${searchPromptsPerReport} search prompts`);
  console.log(`│  Per week (lagna): ${searchPromptsPerWeek} search prompts`);
  console.log(`│  Monthly lagna: ~${Math.round(monthlySearchFromLagna)} search prompts`);
  console.log(`│  Remaining for reports: ~${5000 - Math.round(monthlySearchFromLagna)} prompts`);
  console.log(`│  Max reports in free tier: ~${Math.floor((5000 - monthlySearchFromLagna) / searchPromptsPerReport)} full reports/month`);
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');

  // ═══ OVERALL SUMMARY ═══
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY — PROFIT PER TRANSACTION (Free Search Tier)                    ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Full Report:  Revenue LKR ${REVENUE.fullReportLKR}  −  Cost LKR ${fullReportFree.costLKR}  =  Profit LKR ${reportMargin} (${reportMarginPct}%)  ║`);
  console.log(`║  Porondam:     Revenue LKR ${REVENUE.porondamLKR}  −  Cost LKR ${porondam.costPerReport}  =  Profit LKR ${porondamMargin} (${porondamMarginPct}%)   ║`);
  console.log(`║  Subscription: Revenue LKR ${REVENUE.subscriptionLKR}  −  Cost ~LKR ${chatQ.costFor10Questions}+lagna share              ║`);
  console.log(`║  Kendara:      Revenue (incl.)  −  Cost LKR 0                             ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  return { 
    free: { fullReport: fullReportFree, weeklyLagna: weeklyLagnaFree, porondam, chatQuestion: chatQ },
    paid: { fullReport: fullReportPaid, weeklyLagna: weeklyLagnaPaid, porondam, chatQuestion: chatQ },
    revenue: REVENUE,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
function round6(n) { return Math.round(n * 1000000) / 1000000; }

module.exports = {
  estimateFullReportCost,
  estimateWeeklyLagnaCost,
  estimatePorondamCost,
  estimateChatQuestionCost,
  calculateCallCost,
  printCostSummary,
  runLiveCostTest,
  HERO_SECTIONS,
  SECTION_TOKEN_ESTIMATES,
  REVENUE,
};
