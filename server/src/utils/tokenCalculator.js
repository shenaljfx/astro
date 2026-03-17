/**
 * Token & Cost Calculator for AI API Calls
 * 
 * Tracks token usage across all AI calls (Gemini, OpenAI) and calculates
 * costs in both USD and LKR for reports and porondam.
 * 
 * Pricing (per 1,000,000 tokens) — as of March 2026:
 * 
 * Gemini 2.5 Flash:     Input $0.30, Output $2.50 (incl. thinking tokens)
 * Gemini 2.5 Pro:       Input $1.25, Output $10.00 (incl. thinking tokens)
 * GPT-4o-mini:          Input $0.15, Output $0.60
 * 
 * USD → LKR exchange rate: configurable via env var USD_TO_LKR (default ~305)
 */

// ── Model Pricing (USD per 1,000,000 tokens) ────────────────────
const MODEL_PRICING = {
  // Gemini 2.5 Flash (default model)
  'gemini-2.5-flash': {
    inputPer1M: 0.30,
    outputPer1M: 2.50, // includes thinking tokens
    label: 'Gemini 2.5 Flash',
  },
  'gemini-2.5-flash-preview-05-20': {
    inputPer1M: 0.30,
    outputPer1M: 2.50,
    label: 'Gemini 2.5 Flash Preview',
  },
  // Gemini 2.5 Pro (hero sections)
  'gemini-2.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    label: 'Gemini 2.5 Pro',
  },
  'gemini-2.5-pro-preview-05-06': {
    inputPer1M: 1.25,
    outputPer1M: 10.00,
    label: 'Gemini 2.5 Pro Preview',
  },
  // Gemini 2.0 Flash (legacy)
  'gemini-2.0-flash': {
    inputPer1M: 0.10,
    outputPer1M: 0.40,
    label: 'Gemini 2.0 Flash',
  },
  // OpenAI GPT-4o-mini (fallback)
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    label: 'GPT-4o-mini',
  },
  // OpenAI GPT-4o
  'gpt-4o': {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    label: 'GPT-4o',
  },
};

// Default fallback pricing (Gemini 2.5 Flash)
const DEFAULT_PRICING = MODEL_PRICING['gemini-2.5-flash'];

// USD to LKR exchange rate (configurable via env)
function getUsdToLkr() {
  return parseFloat(process.env.USD_TO_LKR) || 305;
}

/**
 * Create a new token usage tracker
 * Call this at the start of a report/porondam generation
 */
function createTokenTracker() {
  return {
    calls: [],        // individual API call records
    totalInput: 0,
    totalOutput: 0,
    totalThinking: 0,
    totalTokens: 0,
    totalCostUSD: 0,
    totalCostLKR: 0,
    startTime: Date.now(),
  };
}

/**
 * Record a single API call's token usage
 * 
 * @param {Object} tracker - The tracker from createTokenTracker()
 * @param {string} model - Model name (e.g., 'gemini-2.5-flash')
 * @param {string} label - Human label (e.g., 'personality' or 'coherence-pass')
 * @param {Object} usage - Token usage from API response
 *   For Gemini: { promptTokenCount, candidatesTokenCount, totalTokenCount, thoughtsTokenCount? }
 *   For OpenAI: { prompt_tokens, completion_tokens, total_tokens }
 */
function recordUsage(tracker, model, label, usage) {
  if (!tracker || !usage) return;

  const pricing = MODEL_PRICING[model] || DEFAULT_PRICING;
  const usdToLkr = getUsdToLkr();

  // Normalize token counts (Gemini vs OpenAI formats)
  let inputTokens = 0;
  let outputTokens = 0;
  let thinkingTokens = 0;

  if (usage.promptTokenCount !== undefined) {
    // Gemini format
    inputTokens = usage.promptTokenCount || 0;
    outputTokens = usage.candidatesTokenCount || 0;
    thinkingTokens = usage.thoughtsTokenCount || 0;
    // Note: Gemini's candidatesTokenCount already INCLUDES thinking tokens
    // So we don't add them separately — thinking is a subset of output
  } else if (usage.prompt_tokens !== undefined) {
    // OpenAI format
    inputTokens = usage.prompt_tokens || 0;
    outputTokens = usage.completion_tokens || 0;
    thinkingTokens = 0;
  }

  // Calculate cost
  const inputCostUSD = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUSD = (outputTokens / 1_000_000) * pricing.outputPer1M;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  const totalCostLKR = totalCostUSD * usdToLkr;

  const callRecord = {
    label,
    model: pricing.label || model,
    inputTokens,
    outputTokens,
    thinkingTokens,
    totalTokens: inputTokens + outputTokens,
    inputCostUSD: round6(inputCostUSD),
    outputCostUSD: round6(outputCostUSD),
    totalCostUSD: round6(totalCostUSD),
    totalCostLKR: round4(totalCostLKR),
  };

  tracker.calls.push(callRecord);
  tracker.totalInput += inputTokens;
  tracker.totalOutput += outputTokens;
  tracker.totalThinking += thinkingTokens;
  tracker.totalTokens += inputTokens + outputTokens;
  tracker.totalCostUSD += totalCostUSD;
  tracker.totalCostLKR += totalCostLKR;

  return callRecord;
}

/**
 * Finalize the tracker and return a summary
 */
function finalizeTracker(tracker) {
  if (!tracker) return null;

  const elapsed = Date.now() - tracker.startTime;

  return {
    summary: {
      totalCalls: tracker.calls.length,
      totalInputTokens: tracker.totalInput,
      totalOutputTokens: tracker.totalOutput,
      totalThinkingTokens: tracker.totalThinking,
      totalTokens: tracker.totalTokens,
      costUSD: round6(tracker.totalCostUSD),
      costLKR: round2(tracker.totalCostLKR),
      usdToLkrRate: getUsdToLkr(),
      generationTimeMs: elapsed,
      generationTimeSec: round2(elapsed / 1000),
    },
    breakdown: tracker.calls.map(c => ({
      section: c.label,
      model: c.model,
      input: c.inputTokens,
      output: c.outputTokens,
      thinking: c.thinkingTokens,
      costLKR: c.totalCostLKR,
    })),
    // Cost per section type for analytics
    costBySection: tracker.calls.reduce((acc, c) => {
      acc[c.label] = {
        tokens: c.totalTokens,
        costLKR: c.totalCostLKR,
      };
      return acc;
    }, {}),
  };
}

/**
 * Extract usageMetadata from a Gemini API response
 */
function extractGeminiUsage(data) {
  if (!data) return null;
  return data.usageMetadata || null;
}

/**
 * Extract usage from an OpenAI API response
 */
function extractOpenAIUsage(response) {
  if (!response) return null;
  return response.usage || null;
}

/**
 * Format a cost summary as a log-friendly string
 */
function formatCostLog(tracker) {
  if (!tracker) return 'No usage tracked';
  const s = finalizeTracker(tracker)?.summary;
  if (!s) return 'No usage data';
  return `${s.totalCalls} calls | ${s.totalInputTokens.toLocaleString()} in + ${s.totalOutputTokens.toLocaleString()} out = ${s.totalTokens.toLocaleString()} tokens | $${s.costUSD} USD | LKR ${s.costLKR}`;
}

// Rounding helpers
function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }
function round6(n) { return Math.round(n * 1000000) / 1000000; }

module.exports = {
  MODEL_PRICING,
  createTokenTracker,
  recordUsage,
  finalizeTracker,
  extractGeminiUsage,
  extractOpenAIUsage,
  formatCostLog,
  getUsdToLkr,
};
