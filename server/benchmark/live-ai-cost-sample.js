/*
 * Live AI cost sample for Grahachara.
 *
 * Runs one real sample for:
 * - Full AI report
 * - Porondam AI report
 * - Kendara chart explanation
 * - Weekly lagna palapala forecast
 *
 * Outputs:
 * - benchmark/live-ai-cost-results.json
 * - benchmark/LIVE_AI_COST_REPORT.md
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.MOCK_PAYMENTS = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'benchmark-jwt-secret-change-me-32-characters-minimum';
process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'benchmark-admin-secret';

// Do not let weekly generation replace the live Firestore document during this benchmark.
const firebaseConfig = require('../src/config/firebase');
firebaseConfig.getDb = () => null;

const { MODEL_PRICING, getUsdToLkr } = require('../src/utils/tokenCalculator');
const { calculatePorondam, calculateAdvancedPorondam } = require('../src/engine/porondam');
const { buildHouseChart } = require('../src/engine/astrology');
const { generateAdvancedAnalysis } = require('../src/engine/advanced');
const { sanitizeInputs, hppProtection } = require('../src/middleware/security');
const porondamRouter = require('../src/routes/porondam');
const horoscopeRouter = require('../src/routes/horoscope');
const weeklyLagnaRouter = require('../src/routes/weeklyLagna');

let enhancedEngine = null;
try { enhancedEngine = require('../src/engine/enhanced'); } catch (_) {}

let jyotishEngine = null;
try { jyotishEngine = require('../src/engine/jyotish'); } catch (_) {}

const OUT_JSON = path.join(__dirname, 'live-ai-cost-results.json');
const OUT_MD = path.join(__dirname, 'LIVE_AI_COST_REPORT.md');

const SAMPLE = {
  native: {
    birthDate: '1998-10-09T03:46:00.000Z',
    lat: 6.9271,
    lng: 79.8612,
    language: 'en',
    birthLocation: 'Colombo, Sri Lanka',
    userName: 'Sample Native',
    userGender: 'male',
  },
  porondam: {
    language: 'en',
    brideName: 'Sample Bride',
    groomName: 'Sample Groom',
    bride: { birthDate: '1998-10-09T03:46:00.000Z', lat: 6.9271, lng: 79.8612 },
    groom: { birthDate: '1996-08-20T04:30:00.000Z', lat: 7.2906, lng: 80.6337 },
  },
};

const BENCHMARK_USER = {
  uid: `benchmark_${Date.now()}`,
  email: 'benchmark@grahachara.local',
  type: 'google-auth',
};

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function round6(n) { return Math.round((Number(n) || 0) * 1000000) / 1000000; }

function normalizeUsage(usage) {
  usage = usage || {};
  const inputTokens = usage.promptTokenCount ?? usage.prompt_tokens ?? usage.inputTokens ?? usage.input ?? 0;
  const outputTokens = usage.candidatesTokenCount ?? usage.completion_tokens ?? usage.outputTokens ?? usage.output ?? 0;
  const thinkingTokens = usage.thoughtsTokenCount ?? usage.thinkingTokens ?? usage.thinking ?? 0;
  const hasTotalTokens = usage.totalTokenCount !== undefined || usage.total_tokens !== undefined || usage.totalTokens !== undefined || usage.total !== undefined;
  let totalTokens = usage.totalTokenCount ?? usage.total_tokens ?? usage.totalTokens ?? usage.total ?? 0;
  let billableOutputTokens = outputTokens;

  if (hasTotalTokens && totalTokens > inputTokens) {
    billableOutputTokens = Math.max(outputTokens, totalTokens - inputTokens);
  } else {
    billableOutputTokens = outputTokens + thinkingTokens;
    totalTokens = inputTokens + billableOutputTokens;
  }

  return { inputTokens, outputTokens, billableOutputTokens, thinkingTokens, totalTokens };
}

function resolvePricing(model) {
  return MODEL_PRICING[model] || MODEL_PRICING['gemini-2.5-flash'];
}

function costFromUsage(model, usage, searchQueries = 0, includePaidSearch = false) {
  const normalized = normalizeUsage(usage);
  const pricing = resolvePricing(model);
  const usdToLkr = getUsdToLkr();
  const inputCostUSD = (normalized.inputTokens / 1000000) * pricing.inputPer1M;
  const outputCostUSD = (normalized.billableOutputTokens / 1000000) * pricing.outputPer1M;
  const searchCostUSD = includePaidSearch && pricing.searchCostPer1K
    ? (searchQueries / 1000) * pricing.searchCostPer1K
    : 0;
  const totalCostUSD = inputCostUSD + outputCostUSD + searchCostUSD;
  return {
    model,
    modelLabel: pricing.label || model,
    ...normalized,
    searchQueries,
    inputCostUSD: round6(inputCostUSD),
    outputCostUSD: round6(outputCostUSD),
    searchCostUSD: round6(searchCostUSD),
    totalCostUSD: round6(totalCostUSD),
    totalCostLKR: round2(totalCostUSD * usdToLkr),
  };
}

function getGeminiStandardModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function getWeeklyModel() {
  if ((process.env.AI_PROVIDER || 'gemini') !== 'gemini') {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }
  return process.env.GEMINI_3_PRO_MODEL
    || process.env.GEMINI_PRO_MODEL
    || process.env.GEMINI_MODEL
    || 'gemini-2.5-flash';
}

function getHeroModel() {
  return process.env.GEMINI_3_PRO_MODEL
    || process.env.GEMINI_PRO_MODEL
    || process.env.GEMINI_MODEL
    || 'gemini-3.1-pro-preview';
}

function createBenchmarkApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(hppProtection);
  app.use(sanitizeInputs);
  app.use('/api/horoscope', horoscopeRouter);
  app.use('/api/porondam', porondamRouter);
  app.use('/api/weekly-lagna', weeklyLagnaRouter);
  return app;
}

function listen(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function closeServer(server) {
  if (!server) return Promise.resolve();
  return new Promise(resolve => server.close(resolve));
}

function buildAuthHeader() {
  const token = jwt.sign(BENCHMARK_USER, process.env.JWT_SECRET, { expiresIn: '2h' });
  return `Bearer ${token}`;
}

function getServerBaseUrl(server) {
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

const aiRecorder = {
  calls: [],
  pending: 0,
  activeFeature: null,
  lastActivityAt: Date.now(),
};

function extractModelFromUrl(url) {
  const match = String(url).match(/\/models\/([^/:?]+):generateContent/i);
  return match ? decodeURIComponent(match[1]) : 'unknown';
}

function installAiRecorder() {
  const originalFetch = global.fetch;
  global.fetch = async function recordedFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isGemini = String(url).includes('generativelanguage.googleapis.com');
    if (!isGemini) return originalFetch(input, init);

    const feature = aiRecorder.activeFeature || 'unattributed';
    const model = extractModelFromUrl(url);
    const startedAt = Date.now();
    aiRecorder.pending++;
    aiRecorder.lastActivityAt = Date.now();

    try {
      const response = await originalFetch(input, init);
      let usage = null;
      let searchQueries = 0;
      let errorMessage = null;

      try {
        const data = await response.clone().json();
        usage = data.usageMetadata || null;
        searchQueries = data.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0;
        errorMessage = data.error?.message || null;
      } catch (err) {
        errorMessage = err.message;
      }

      if (usage) {
        const tokenCost = costFromUsage(model, usage, searchQueries, false);
        const paidSearchCost = costFromUsage(model, usage, searchQueries, true);
        aiRecorder.calls.push({
          feature,
          label: `${feature} call ${aiRecorder.calls.filter(c => c.feature === feature).length + 1}`,
          status: response.status,
          durationMs: Date.now() - startedAt,
          ...tokenCost,
          paidSearchCost,
        });
      } else {
        aiRecorder.calls.push({
          feature,
          label: `${feature} call ${aiRecorder.calls.filter(c => c.feature === feature).length + 1}`,
          status: response.status,
          durationMs: Date.now() - startedAt,
          model,
          modelLabel: resolvePricing(model).label || model,
          inputTokens: 0,
          outputTokens: 0,
          thinkingTokens: 0,
          totalTokens: 0,
          searchQueries: 0,
          totalCostUSD: 0,
          totalCostLKR: 0,
          error: errorMessage || 'No usage metadata returned',
        });
      }

      aiRecorder.lastActivityAt = Date.now();
      return response;
    } finally {
      aiRecorder.pending--;
      aiRecorder.lastActivityAt = Date.now();
    }
  };

  return function restoreAiRecorder() {
    global.fetch = originalFetch;
  };
}

async function waitForAiIdle(feature, minCalls = 1, timeoutMs = 360000, idleMs = 2500) {
  const startedAt = Date.now();
  let lastCount = -1;
  let stableSince = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const count = aiRecorder.calls.filter(c => c.feature === feature).length;
    if (count !== lastCount) {
      lastCount = count;
      stableSince = Date.now();
    }

    if (aiRecorder.pending === 0 && count >= minCalls && Date.now() - stableSince >= idleMs) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for AI calls to finish for ${feature}`);
}

async function withFeatureRecording(feature, minCalls, timeoutMs, work) {
  const startIndex = aiRecorder.calls.length;
  aiRecorder.activeFeature = feature;
  try {
    const payload = await work();
    await waitForAiIdle(feature, minCalls, timeoutMs);
    const calls = aiRecorder.calls.slice(startIndex).filter(c => c.feature === feature);
    return { payload, calls };
  } finally {
    aiRecorder.activeFeature = null;
  }
}

async function requestJson(baseUrl, route, body, headers = {}) {
  const response = await fetch(baseUrl + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${route}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function getRouteHandler(router, routePath, method) {
  const layer = router.stack.find(item => item.route && item.route.path === routePath && item.route.methods[method]);
  if (!layer) throw new Error(`Route ${method.toUpperCase()} ${routePath} not found`);
  const routeStack = layer.route.stack;
  return routeStack[routeStack.length - 1].handle;
}

function invokeExpressHandler(handler, req) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const res = {
      statusCode: 200,
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      json(payload) {
        if (!finished) {
          finished = true;
          resolve({ statusCode: this.statusCode, payload });
        }
        return this;
      },
    };
    Promise.resolve(handler(req, res)).catch(err => {
      if (!finished) reject(err);
    });
  });
}

function buildChart(date, lat, lng) {
  const house = buildHouseChart(date, lat, lng);
  const lagnaRashiId = house.lagna ? house.lagna.rashi.id : 1;
  return { rashiChart: house.houses, lagnaRashiId };
}

function buildPorondamData() {
  const brideDate = new Date(SAMPLE.porondam.bride.birthDate);
  const groomDate = new Date(SAMPLE.porondam.groom.birthDate);
  const brideLat = SAMPLE.porondam.bride.lat;
  const brideLng = SAMPLE.porondam.bride.lng;
  const groomLat = SAMPLE.porondam.groom.lat;
  const groomLng = SAMPLE.porondam.groom.lng;

  const base = calculatePorondam(brideDate, groomDate);

  let advancedPorondam = null;
  try { advancedPorondam = calculateAdvancedPorondam(brideDate, groomDate, brideLat, brideLng, groomLat, groomLng); } catch (_) {}

  let brideAdvanced = null;
  let groomAdvanced = null;
  try { brideAdvanced = generateAdvancedAnalysis(brideDate, brideLat, brideLng); } catch (_) {}
  try { groomAdvanced = generateAdvancedAnalysis(groomDate, groomLat, groomLng); } catch (_) {}

  let brideEnhanced = null;
  let groomEnhanced = null;
  if (enhancedEngine) {
    try { brideEnhanced = enhancedEngine.generateEnhancedReport(brideDate, brideLat, brideLng); } catch (_) {}
    try { groomEnhanced = enhancedEngine.generateEnhancedReport(groomDate, groomLat, groomLng); } catch (_) {}
  }

  let jyotishMatching = null;
  if (jyotishEngine) {
    try { jyotishMatching = jyotishEngine.generatePorondamJyotish(brideDate, brideLat, brideLng, groomDate, groomLat, groomLng); } catch (_) {}
  }

  return {
    ...base,
    advancedPorondam,
    brideChart: buildChart(brideDate, brideLat, brideLng),
    groomChart: buildChart(groomDate, groomLat, groomLng),
    brideAdvanced,
    groomAdvanced,
    brideEnhanced,
    groomEnhanced,
    jyotishMatching,
  };
}

function buildKendaraExplanationParts(advancedAnalysis) {
  const parts = [];

  if (advancedAnalysis.tier1?.doshas?.items?.length > 0) {
    const doshaList = advancedAnalysis.tier1.doshas.items.map(d =>
      `${d.name} (${d.severity}${d.cancelled ? ', CANCELLED' : ''}): ${d.description}`
    ).join(' | ');
    parts.push(`DOSHAS: ${doshaList}`);
  }

  if (advancedAnalysis.tier1?.advancedYogas?.items?.length > 0) {
    const yogaList = advancedAnalysis.tier1.advancedYogas.items.map(y =>
      `${y.name} (${y.category}, ${y.strength}): ${y.description}`
    ).join(' | ');
    parts.push(`YOGAS: ${yogaList}`);
  }

  if (advancedAnalysis.tier1?.jaimini) {
    const j = advancedAnalysis.tier1.jaimini;
    const jParts = [];
    if (j.atmakaraka) jParts.push(`Soul Planet: ${j.atmakaraka.planet}`);
    if (j.karakamsha?.themes) jParts.push(`Soul Destination: ${j.karakamsha.rashi} - ${j.karakamsha.themes.desire} (${j.karakamsha.themes.archetype})`);
    if (j.arudhaLagna?.rashi) jParts.push(`Public Image: ${j.arudhaLagna.rashi}`);
    if (j.upapadaLagna?.rashi) jParts.push(`Marriage Sign: ${j.upapadaLagna.rashi}`);
    if (jParts.length) parts.push(`SOUL PURPOSE: ${jParts.join(' | ')}`);
  }

  if (advancedAnalysis.tier2?.shadbala) {
    const sbList = Object.values(advancedAnalysis.tier2.shadbala).map(sb =>
      `${sb.name}: ${sb.percentage}% (${sb.isAdequate ? 'Strong' : 'Weak'})`
    ).join(', ');
    parts.push(`PLANET POWER: ${sbList}`);
  }

  if (advancedAnalysis.tier2?.bhriguBindu) {
    const bb = advancedAnalysis.tier2.bhriguBindu;
    parts.push(`DESTINY POINT: ${bb.degree} deg in ${bb.rashi}, ${bb.nakshatra}. ${bb.isCurrentlyActive ? 'ACTIVE' : 'Not active'}`);
  }

  if (advancedAnalysis.tier3?.pastLife) {
    const pl = advancedAnalysis.tier3.pastLife;
    const plParts = [];
    if (pl.pastLife?.ketuThemes) plParts.push(`Ketu H${pl.pastLife.ketuHouse}: ${pl.pastLife.ketuThemes.domain} (${pl.pastLife.ketuThemes.archetype})`);
    if (pl.currentLifeDirection?.rahuThemes) plParts.push(`Rahu H${pl.currentLifeDirection.rahuHouse}: ${pl.currentLifeDirection.rahuThemes.domain} -> ${pl.currentLifeDirection.rahuThemes.growth}`);
    if (pl.pastLifeMerit?.assessment) plParts.push(`Merit: ${pl.pastLifeMerit.assessment}`);
    if (pl.karmaBalance) plParts.push(`Karma: Good ${pl.karmaBalance.good || 0}, Challenging ${pl.karmaBalance.challenging || 0}`);
    if (plParts.length) parts.push(`PAST LIFE: ${plParts.join(' | ')}`);
  }

  return parts;
}

async function callGeminiMeasured({ label, systemPrompt, userPrompt, model, maxOutputTokens = 4096, temperature = 0.55, responseMimeType = null }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const generationConfig = { maxOutputTokens, temperature };
  if (responseMimeType) generationConfig.responseMimeType = responseMimeType;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(`${label} Gemini call failed: HTTP ${response.status} ${data.error?.message || ''}`.trim());
  }

  const usage = data.usageMetadata || {};
  const searchQueries = data.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length || 0;
  return {
    label,
    ...costFromUsage(model, usage, searchQueries, false),
    paidSearchCost: costFromUsage(model, usage, searchQueries, true),
  };
}

function sumCalls(calls) {
  const total = {
    totalCalls: calls.length,
    inputTokens: 0,
    outputTokens: 0,
    billableOutputTokens: 0,
    thinkingTokens: 0,
    totalTokens: 0,
    searchQueries: 0,
    totalCostUSD: 0,
    totalCostLKR: 0,
    totalCostUSDWithPaidSearch: 0,
    totalCostLKRWithPaidSearch: 0,
  };

  for (const call of calls) {
    total.inputTokens += call.inputTokens || 0;
    total.outputTokens += call.outputTokens || 0;
    total.billableOutputTokens += call.billableOutputTokens || call.outputTokens || 0;
    total.thinkingTokens += call.thinkingTokens || 0;
    total.totalTokens += call.totalTokens || 0;
    total.searchQueries += call.searchQueries || 0;
    total.totalCostUSD += call.totalCostUSD || 0;
    total.totalCostLKR += call.totalCostLKR || 0;
    total.totalCostUSDWithPaidSearch += call.paidSearchCost?.totalCostUSD ?? call.totalCostUSD ?? 0;
    total.totalCostLKRWithPaidSearch += call.paidSearchCost?.totalCostLKR ?? call.totalCostLKR ?? 0;
  }

  total.totalCostUSD = round6(total.totalCostUSD);
  total.totalCostLKR = round2(total.totalCostLKR);
  total.totalCostUSDWithPaidSearch = round6(total.totalCostUSDWithPaidSearch);
  total.totalCostLKRWithPaidSearch = round2(total.totalCostLKRWithPaidSearch);
  return total;
}

function sectionBreakdownFromTokenUsage(tokenUsage) {
  return (tokenUsage?.breakdown || []).map(item => ({
    label: item.section,
    modelLabel: item.model,
    inputTokens: item.input || 0,
    outputTokens: item.output || 0,
    billableOutputTokens: item.billableOutput || item.output || 0,
    thinkingTokens: item.thinking || 0,
    totalTokens: (item.input || 0) + (item.output || 0),
    totalCostLKR: round2(item.costLKR || 0),
    totalCostUSD: round6((item.costLKR || 0) / getUsdToLkr()),
  }));
}

async function measureKendaraExplanation(baseUrl, authHeader) {
  const n = SAMPLE.native;
  const feature = 'Kendara page';
  const { payload, calls } = await withFeatureRecording(feature, 1, 180000, () => requestJson(baseUrl, '/api/horoscope/birth-chart', {
    birthDate: n.birthDate,
    lat: n.lat,
    lng: n.lng,
    language: n.language,
  }, { Authorization: authHeader }));

  return {
    feature,
    route: 'POST /api/horoscope/birth-chart',
    note: 'This calls the real kendra route as an authenticated benchmark user. Core chart/rashi/navamsha calculation is local engine cost LKR 0; captured Gemini cost is the background chartExplanations AI call used by the kendra page.',
    calls,
    total: sumCalls(calls),
    response: {
      cached: !!payload.cached,
      hasChartExplanationsInImmediateResponse: !!payload.data?.chartExplanations,
    },
  };
}

async function measurePorondamReport(baseUrl, authHeader) {
  const porondamData = buildPorondamData();
  const feature = 'Porondam AI report';
  const { payload, calls } = await withFeatureRecording(feature, 1, 180000, () => requestJson(baseUrl, '/api/porondam/report', {
    porondamData,
    language: SAMPLE.porondam.language,
    brideName: SAMPLE.porondam.brideName,
    groomName: SAMPLE.porondam.groomName,
    porondamId: null,
    entitlementInput: null,
  }, { Authorization: authHeader }));

  return {
    feature,
    route: 'POST /api/porondam/report',
    calls,
    total: sumCalls(calls),
    responseTokenUsage: payload.tokenUsage || null,
  };
}

async function measureFullReport(baseUrl, authHeader) {
  const n = SAMPLE.native;
  const feature = 'Full AI report';
  const { payload, calls } = await withFeatureRecording(feature, 1, 720000, () => requestJson(baseUrl, '/api/horoscope/full-report-ai', {
    birthDate: n.birthDate,
    lat: n.lat,
    lng: n.lng,
    language: n.language,
    birthLocation: n.birthLocation,
    userName: n.userName,
    userGender: n.userGender,
    reportId: `bench_${Date.now()}`,
  }, { Authorization: authHeader }));

  return {
    feature,
    route: 'POST /api/horoscope/full-report-ai',
    modelStrategy: {
      heroModel: getHeroModel(),
      standardModel: getGeminiStandardModel(),
    },
    calls,
    total: sumCalls(calls),
    reportedSections: sectionBreakdownFromTokenUsage(payload.tokenUsage),
    reportedTokenUsageSummary: payload.tokenUsage?.summary || null,
    quality: payload.quality || null,
  };
}

async function withCapturedLogs(fn) {
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args) => { logs.push(args.map(String).join(' ')); originalLog(...args); };
  console.warn = (...args) => { logs.push(args.map(String).join(' ')); originalWarn(...args); };
  try {
    const value = await fn();
    return { value, logs };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function measureWeeklyLagna(baseUrl) {
  const feature = 'Weekly lagna palapala forecast';
  const { payload, calls } = await withFeatureRecording(feature, 1, 720000, () => requestJson(baseUrl, '/api/weekly-lagna/generate', {}, {
    'X-Admin-Secret': process.env.ADMIN_SECRET,
  }));

  return {
    feature,
    route: 'POST /api/weekly-lagna/generate',
    note: 'This calls the real admin generation route. Firestore getDb() is patched to null in this benchmark so the expensive AI generation is measured without replacing live weekly documents.',
    weekId: payload.weekId,
    reportCount: payload.reportCount,
    calls,
    total: sumCalls(calls),
  };
}

function sumCosts(features) {
  const totals = { inputTokens: 0, outputTokens: 0, billableOutputTokens: 0, thinkingTokens: 0, totalTokens: 0, searchQueries: 0, totalCostUSD: 0, totalCostLKR: 0, totalCostUSDWithPaidSearch: 0, totalCostLKRWithPaidSearch: 0 };
  for (const f of features) {
    const t = f.total || {};
    totals.inputTokens += t.inputTokens || 0;
    totals.outputTokens += t.outputTokens || 0;
    totals.billableOutputTokens += t.billableOutputTokens || t.outputTokens || 0;
    totals.thinkingTokens += t.thinkingTokens || 0;
    totals.totalTokens += t.totalTokens || 0;
    totals.searchQueries += t.searchQueries || 0;
    totals.totalCostUSD += t.totalCostUSD || 0;
    totals.totalCostLKR += t.totalCostLKR || 0;
    totals.totalCostUSDWithPaidSearch += t.totalCostUSDWithPaidSearch ?? t.totalCostUSD ?? 0;
    totals.totalCostLKRWithPaidSearch += t.totalCostLKRWithPaidSearch ?? t.totalCostLKR ?? 0;
  }
  totals.totalCostUSD = round6(totals.totalCostUSD);
  totals.totalCostLKR = round2(totals.totalCostLKR);
  totals.totalCostUSDWithPaidSearch = round6(totals.totalCostUSDWithPaidSearch);
  totals.totalCostLKRWithPaidSearch = round2(totals.totalCostLKRWithPaidSearch);
  return totals;
}

function allFeatureCalls(features) {
  return features.flatMap(feature => (feature.calls || []).map(call => ({ ...call, feature: feature.feature })));
}

function groupCallsByModel(calls) {
  const grouped = new Map();
  for (const call of calls) {
    const model = call.model || call.modelLabel || 'unknown';
    if (!grouped.has(model)) {
      grouped.set(model, {
        model,
        modelLabel: call.modelLabel || model,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        billableOutputTokens: 0,
        thinkingTokens: 0,
        totalTokens: 0,
        searchQueries: 0,
        totalCostUSD: 0,
        totalCostLKR: 0,
        totalCostUSDWithPaidSearch: 0,
        totalCostLKRWithPaidSearch: 0,
        features: new Set(),
      });
    }
    const row = grouped.get(model);
    row.calls++;
    row.inputTokens += call.inputTokens || 0;
    row.outputTokens += call.outputTokens || 0;
    row.billableOutputTokens += call.billableOutputTokens || call.outputTokens || 0;
    row.thinkingTokens += call.thinkingTokens || 0;
    row.totalTokens += call.totalTokens || 0;
    row.searchQueries += call.searchQueries || 0;
    row.totalCostUSD += call.totalCostUSD || 0;
    row.totalCostLKR += call.totalCostLKR || 0;
    row.totalCostUSDWithPaidSearch += call.paidSearchCost?.totalCostUSD ?? call.totalCostUSD ?? 0;
    row.totalCostLKRWithPaidSearch += call.paidSearchCost?.totalCostLKR ?? call.totalCostLKR ?? 0;
    row.features.add(call.feature || 'unknown');
  }

  return Array.from(grouped.values()).map(row => ({
    ...row,
    totalCostUSD: round6(row.totalCostUSD),
    totalCostLKR: round2(row.totalCostLKR),
    totalCostUSDWithPaidSearch: round6(row.totalCostUSDWithPaidSearch),
    totalCostLKRWithPaidSearch: round2(row.totalCostLKRWithPaidSearch),
    features: Array.from(row.features).sort(),
  })).sort((a, b) => b.totalCostUSD - a.totalCostUSD);
}

function featureTotalLine(feature) {
  const t = feature.total || {};
  return `| ${feature.feature} | ${t.totalCalls || feature.calls?.length || 1} | ${t.inputTokens || 0} | ${t.outputTokens || 0} | ${t.billableOutputTokens || t.outputTokens || 0} | ${t.thinkingTokens || 0} | ${t.totalTokens || 0} | ${t.searchQueries || 0} | $${t.totalCostUSD || 0} | LKR ${t.totalCostLKR || 0} |`;
}

function buildMarkdownReport(result) {
  const lines = [];
  lines.push('# Live AI Cost Report');
  lines.push('');
  lines.push(`Generated at: ${result.generatedAt}`);
  lines.push(`USD_TO_LKR: ${result.usdToLkr}`);
  lines.push(`Language sample: ${SAMPLE.native.language}`);
  lines.push('');
  lines.push('## Models Detected');
  lines.push('');
  lines.push(`- Standard/chat model: ${result.models.standardModel}`);
  lines.push(`- Hero/report model: ${result.models.heroModel}`);
  lines.push(`- Weekly model: ${result.models.weeklyModel}`);
  lines.push('');
  lines.push('## Model-Wise Cost');
  lines.push('');
  lines.push('| Model | Features | Calls | Input | Output | Billable output | Thinking | Total tokens | Search queries | Token cost USD | Token cost LKR | With paid search USD | With paid search LKR |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  result.modelWise.forEach(row => {
    lines.push(`| ${row.modelLabel} | ${row.features.join(', ')} | ${row.calls} | ${row.inputTokens} | ${row.outputTokens} | ${row.billableOutputTokens || row.outputTokens} | ${row.thinkingTokens} | ${row.totalTokens} | ${row.searchQueries} | $${row.totalCostUSD} | LKR ${row.totalCostLKR} | $${row.totalCostUSDWithPaidSearch} | LKR ${row.totalCostLKRWithPaidSearch} |`);
  });
  lines.push('');
  lines.push('## Total By Feature');
  lines.push('');
  lines.push('| Feature | Calls | Input | Output | Billable output | Thinking | Total tokens | Search queries | Token cost USD | Token cost LKR |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  result.features.forEach(f => lines.push(featureTotalLine(f)));
  lines.push(`| Combined token API cost |  | ${result.combined.inputTokens} | ${result.combined.outputTokens} | ${result.combined.billableOutputTokens || result.combined.outputTokens} | ${result.combined.thinkingTokens} | ${result.combined.totalTokens} | ${result.combined.searchQueries} | $${result.combined.totalCostUSD} | LKR ${result.combined.totalCostLKR} |`);
  if (result.combined.totalCostUSDWithPaidSearch !== result.combined.totalCostUSD) {
    lines.push('');
    lines.push(`Paid search scenario: token cost is LKR ${result.combined.totalCostLKR}; if all captured search grounding queries are outside the free tier, total becomes LKR ${result.combined.totalCostLKRWithPaidSearch} ($${result.combined.totalCostUSDWithPaidSearch}).`);
  }
  lines.push('');
  lines.push('## Per Section / Call Detail');
  for (const feature of result.features) {
    lines.push('');
    lines.push(`### ${feature.feature}`);
    if (feature.note) lines.push(feature.note);
    lines.push('');
    lines.push('| Section/call | Model | Input | Output | Billable output | Thinking | Total tokens | Cost USD | Cost LKR |');
    lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
    (feature.calls || []).forEach(call => {
      lines.push(`| ${call.label || 'call'} | ${call.modelLabel || call.model || ''} | ${call.inputTokens || 0} | ${call.outputTokens || 0} | ${call.billableOutputTokens || call.outputTokens || 0} | ${call.thinkingTokens || 0} | ${call.totalTokens || 0} | $${call.totalCostUSD || 0} | LKR ${call.totalCostLKR || 0} |`);
    });
    if (feature.reportedSections?.length) {
      lines.push('');
      lines.push('Reported section labels from the app response:');
      lines.push('');
      lines.push('| Report section | Model | Input | Output | Billable output | Thinking | Total tokens | Cost USD | Cost LKR |');
      lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
      feature.reportedSections.forEach(section => {
        lines.push(`| ${section.label || 'section'} | ${section.modelLabel || ''} | ${section.inputTokens || 0} | ${section.outputTokens || 0} | ${section.billableOutputTokens || section.outputTokens || 0} | ${section.thinkingTokens || 0} | ${section.totalTokens || 0} | $${section.totalCostUSD || 0} | LKR ${section.totalCostLKR || 0} |`);
      });
    }
    if (feature.total?.totalCostUSDWithPaidSearch && feature.total.totalCostUSDWithPaidSearch !== feature.total.totalCostUSD) {
      lines.push('');
      lines.push(`Paid search note: token cost is LKR ${feature.total.totalCostLKR}; if Google Search grounding is outside the free tier, total becomes LKR ${feature.total.totalCostLKRWithPaidSearch} ($${feature.total.totalCostUSDWithPaidSearch}).`);
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Gemini thinking tokens are shown separately, and the cost uses billable output tokens derived from the API total token count so thinking is not missed or double-counted.');
  lines.push('- Kendara core chart generation is local astronomical calculation. The AI cost shown is only for the optional cached plain-language chart explanations.');
  lines.push('- Weekly lagna is a shared central generation for all users, not a per-user generation.');
  lines.push('- Report and porondam samples use the representative sample birth/couple data in the JSON file. Sinhala output can differ in token count.');
  return lines.join('\n');
}

function repriceCall(call) {
  if (!call || !call.model) return call;
  const repriced = costFromUsage(call.model, {
    promptTokenCount: call.inputTokens || 0,
    candidatesTokenCount: call.outputTokens || 0,
    thoughtsTokenCount: call.thinkingTokens || 0,
    totalTokenCount: call.totalTokens || 0,
  }, call.searchQueries || 0, false);
  return {
    ...call,
    ...repriced,
    paidSearchCost: costFromUsage(call.model, {
      promptTokenCount: call.inputTokens || 0,
      candidatesTokenCount: call.outputTokens || 0,
      thoughtsTokenCount: call.thinkingTokens || 0,
      totalTokenCount: call.totalTokens || 0,
    }, call.searchQueries || 0, true),
  };
}

function repriceFeatures(features) {
  return (features || []).map(feature => {
    const calls = (feature.calls || []).map(repriceCall);
    return { ...feature, calls, total: sumCalls(calls) };
  });
}

function writeResults(features) {
  const aiCalls = allFeatureCalls(features);
  const result = {
    generatedAt: new Date().toISOString(),
    usdToLkr: getUsdToLkr(),
    models: {
      standardModel: getGeminiStandardModel(),
      heroModel: getHeroModel(),
      weeklyModel: getWeeklyModel(),
    },
    sample: SAMPLE,
    features,
    aiCalls,
    modelWise: groupCallsByModel(aiCalls),
    combined: sumCosts(features),
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
  fs.writeFileSync(OUT_MD, buildMarkdownReport(result));
  return result;
}

async function runStep(label, fn) {
  console.log(`\n=== ${label} ===`);
  const startedAt = Date.now();
  try {
    const value = await fn();
    console.log(`${label} complete in ${round2((Date.now() - startedAt) / 1000)}s`);
    return value;
  } catch (err) {
    console.error(`${label} failed:`, err.message);
    return { feature: label, error: err.message, calls: [], total: { totalCostUSD: 0, totalCostLKR: 0, inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 } };
  }
}

async function main() {
  if (process.argv.includes('--rewrite-report-only')) {
    const existing = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const result = writeResults(repriceFeatures(existing.features || []));
    console.log(`Rewrote ${OUT_JSON} and ${OUT_MD} from captured usage only.`);
    console.log(JSON.stringify(result.combined, null, 2));
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in server/.env');
  }

  const restoreAiRecorder = installAiRecorder();
  const server = await listen(createBenchmarkApp());
  const baseUrl = getServerBaseUrl(server);
  const authHeader = buildAuthHeader();

  const features = [];
  try {
    for (const [label, fn] of [
      ['Kendara page', () => measureKendaraExplanation(baseUrl, authHeader)],
      ['Porondam AI report', () => measurePorondamReport(baseUrl, authHeader)],
      ['Full AI report', () => measureFullReport(baseUrl, authHeader)],
      ['Weekly lagna palapala forecast', () => measureWeeklyLagna(baseUrl)],
    ]) {
      features.push(await runStep(label, fn));
      writeResults(features);
    }
  } finally {
    restoreAiRecorder();
    await closeServer(server);
  }

  const result = writeResults(features);

  console.log('\nWrote:');
  console.log(`- ${OUT_JSON}`);
  console.log(`- ${OUT_MD}`);
  console.log('\nSummary:');
  console.log(JSON.stringify(result.combined, null, 2));
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err.stack || err.message);
  process.exitCode = 1;
  process.exit(1);
});