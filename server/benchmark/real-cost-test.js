/**
 * REAL COST TEST — Measures ACTUAL AI API costs with live Gemini calls
 * 
 * Tests ALL paid services:
 *   1. Full AI Narrative Report (22 sections + coherence pass)
 *   2. Single Chat Message
 *   3. Porondam AI Narrative
 *   4. Chart Explanations (explainChartSimple)
 *   5. Firestore read/write cost estimation
 *   6. Hosting cost estimation
 * 
 * Run: node benchmark/real-cost-test.js
 */

require('dotenv').config();
const { generateFullReport, buildHouseChart, getAllPlanetPositions, getPanchanga, getDailyNakath } = require('../src/engine/astrology');
const { generateAdvancedAnalysis } = require('../src/engine/advanced');
const { calculateMarakaApala } = require('../src/engine/maraka');
const { chat, generateAINarrativeReport, explainChartSimple } = require('../src/engine/chat');
const { calculatePorondam } = require('../src/engine/porondam');
const { createTokenTracker, recordUsage, finalizeTracker, formatCostLog, getUsdToLkr } = require('../src/utils/tokenCalculator');

// ═══════════════════════════════════════════════════════════════
// Test birth data
// ═══════════════════════════════════════════════════════════════
const TEST_BIRTH = new Date(Date.UTC(1998, 9, 9, 3, 46)); // 1998-10-09 09:16 SLT
const LAT = 6.9271;
const LNG = 79.8612;

// Second person for porondam
const TEST_BIRTH_2 = new Date(Date.UTC(2000, 2, 15, 4, 0)); // 2000-03-15 09:30 SLT
const LAT_2 = 7.2906;
const LNG_2 = 80.6337;

const USD_TO_LKR = getUsdToLkr();
const results = {};

// ═══════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════
function separator(title) {
  console.log('\n' + '═'.repeat(60));
  console.log('  ' + title);
  console.log('═'.repeat(60));
}

function formatLKR(n) { return 'LKR ' + Number(n).toFixed(2); }
function formatUSD(n) { return '$' + Number(n).toFixed(6); }

// ═══════════════════════════════════════════════════════════════
// TEST 1: Free engine services (baseline — should be $0)
// ═══════════════════════════════════════════════════════════════
async function testFreeServices() {
  separator('TEST 1: FREE ENGINE SERVICES (pure math — $0 cost)');
  
  const t1 = Date.now();
  const report = generateFullReport(TEST_BIRTH, LAT, LNG);
  const t1End = Date.now() - t1;
  console.log(`  ✅ Full Report: ${t1End}ms | ${Object.keys(report.sections).length} sections`);

  const t2 = Date.now();
  const maraka = calculateMarakaApala(TEST_BIRTH, LAT, LNG, { yearsAhead: 5 });
  const t2End = Date.now() - t2;
  console.log(`  ✅ Maraka Apala: ${t2End}ms | ${maraka.totalCount} periods | Status: ${maraka.status}`);

  const t3 = Date.now();
  const panchanga = getPanchanga(new Date(), LAT, LNG);
  const t3End = Date.now() - t3;
  console.log(`  ✅ Panchanga: ${t3End}ms | ${panchanga?.nakshatra?.name}`);

  const t4 = Date.now();
  const nakath = getDailyNakath(new Date(), LAT, LNG);
  const t4End = Date.now() - t4;
  console.log(`  ✅ Daily Nakath: ${t4End}ms | ${nakath?.auspiciousPeriods?.length || 0} auspicious periods`);

  const t5 = Date.now();
  const chart = buildHouseChart(TEST_BIRTH, LAT, LNG);
  const t5End = Date.now() - t5;
  console.log(`  ✅ House Chart: ${t5End}ms | Lagna: ${chart?.lagna?.name}`);

  const t6 = Date.now();
  const advanced = generateAdvancedAnalysis(TEST_BIRTH, LAT, LNG);
  const t6End = Date.now() - t6;
  console.log(`  ✅ Advanced Analysis: ${t6End}ms | Yogas: ${advanced?.tier1?.advancedYogas?.found}, Doshas: ${advanced?.tier1?.doshas?.found}`);

  const t7 = Date.now();
  const porondam = calculatePorondam(TEST_BIRTH, TEST_BIRTH_2);
  const t7End = Date.now() - t7;
  console.log(`  ✅ Porondam (math only): ${t7End}ms | Score: ${porondam?.totalScore}/20`);

  results.freeServices = {
    cost: 0,
    totalTime: t1End + t2End + t3End + t4End + t5End + t6End + t7End,
  };

  console.log(`\n  💰 Total AI Cost: $0.00 | LKR 0.00`);
  console.log(`  ⏱️  Total Compute Time: ${results.freeServices.totalTime}ms`);
  
  return { report, advanced, porondam };
}

// ═══════════════════════════════════════════════════════════════
// TEST 2: Full AI Narrative Report (THE BIG ONE)
// ═══════════════════════════════════════════════════════════════
async function testAIReport() {
  separator('TEST 2: FULL AI NARRATIVE REPORT (22 sections — REAL API calls)');
  console.log('  ⏳ This will take 30-90 seconds (22 parallel Gemini calls)...\n');

  const t1 = Date.now();
  try {
    const report = await generateAINarrativeReport(
      TEST_BIRTH, LAT, LNG, 'en', 'Colombo', 'Shenal', 'Male', 'Buddhist'
    );
    const elapsed = Date.now() - t1;

    const usage = report.tokenUsage;
    if (usage?.summary) {
      console.log(`  ✅ Report generated in ${elapsed}ms (${(elapsed/1000).toFixed(1)}s)`);
      console.log(`  📊 Total AI calls: ${usage.summary.totalCalls}`);
      console.log(`  📥 Input tokens: ${usage.summary.totalInputTokens.toLocaleString()}`);
      console.log(`  📤 Output tokens: ${usage.summary.totalOutputTokens.toLocaleString()}`);
      console.log(`  🧠 Thinking tokens: ${usage.summary.totalThinkingTokens.toLocaleString()}`);
      console.log(`  📦 Total tokens: ${usage.summary.totalTokens.toLocaleString()}`);
      console.log(`  💵 Cost USD: ${formatUSD(usage.summary.costUSD)}`);
      console.log(`  💰 Cost LKR: ${formatLKR(usage.summary.costLKR)}`);
      console.log(`  ⏱️  Gen time: ${usage.summary.generationTimeSec}s`);

      if (usage.breakdown) {
        console.log('\n  📋 Per-section breakdown:');
        console.log('  ' + '-'.repeat(55));
        usage.breakdown.forEach(b => {
          console.log(`    ${b.section.padEnd(20)} | ${String(b.input).padStart(6)} in | ${String(b.output).padStart(6)} out | ${formatLKR(b.costLKR)}`);
        });
        console.log('  ' + '-'.repeat(55));
      }

      results.aiReport = {
        costUSD: usage.summary.costUSD,
        costLKR: usage.summary.costLKR,
        totalTokens: usage.summary.totalTokens,
        inputTokens: usage.summary.totalInputTokens,
        outputTokens: usage.summary.totalOutputTokens,
        thinkingTokens: usage.summary.totalThinkingTokens,
        calls: usage.summary.totalCalls,
        timeMs: elapsed,
        sections: Object.keys(report.narrativeSections || {}).length,
      };
    } else {
      console.log(`  ⚠️ Report generated but no token usage tracked`);
      console.log(`  ⏱️  Time: ${elapsed}ms`);
      results.aiReport = { costUSD: 0, costLKR: 0, totalTokens: 0, timeMs: elapsed, note: 'no tracking' };
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.aiReport = { costUSD: 0, costLKR: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 3: Single Chat Message
// ═══════════════════════════════════════════════════════════════
async function testChatMessage() {
  separator('TEST 3: SINGLE CHAT MESSAGE (REAL API call)');

  const t1 = Date.now();
  try {
    const result = await chat('What does my birth chart say about my career and money? When will I get a promotion?', {
      birthDate: TEST_BIRTH,
      birthLat: LAT,
      birthLng: LNG,
      language: 'en',
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 4096,
    });
    const elapsed = Date.now() - t1;

    const usage = result.usage;
    if (usage) {
      const inputTokens = usage.promptTokenCount || usage.prompt_tokens || 0;
      const outputTokens = usage.candidatesTokenCount || usage.completion_tokens || 0;
      const thinkingTokens = usage.thoughtsTokenCount || 0;

      // Calculate cost
      const model = result.model || 'gemini-2.5-flash';
      const tracker = createTokenTracker();
      recordUsage(tracker, model, 'chat', usage);
      const summary = finalizeTracker(tracker);

      console.log(`  ✅ Chat response in ${elapsed}ms`);
      console.log(`  📥 Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`  📤 Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`  🧠 Thinking tokens: ${thinkingTokens.toLocaleString()}`);
      console.log(`  💵 Cost USD: ${formatUSD(summary.summary.costUSD)}`);
      console.log(`  💰 Cost LKR: ${formatLKR(summary.summary.costLKR)}`);
      console.log(`  📝 Response length: ${result.message.length} chars`);
      console.log(`  🤖 Model: ${result.model}`);

      results.chatMessage = {
        costUSD: summary.summary.costUSD,
        costLKR: summary.summary.costLKR,
        inputTokens,
        outputTokens,
        thinkingTokens,
        timeMs: elapsed,
        responseLength: result.message.length,
      };
    } else {
      console.log(`  ⚠️ No usage data returned`);
      results.chatMessage = { costUSD: 0, costLKR: 0, timeMs: elapsed };
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.chatMessage = { costUSD: 0, costLKR: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 4: Chart Explanations (AI gloss for Kendara page)
// ═══════════════════════════════════════════════════════════════
async function testChartExplanations(advanced) {
  separator('TEST 4: CHART EXPLANATIONS — explainChartSimple (REAL API calls)');

  const t1 = Date.now();
  try {
    const expl = await explainChartSimple(advanced, 'en');
    const elapsed = Date.now() - t1;

    console.log(`  ✅ Explanations generated in ${elapsed}ms`);
    const keys = Object.keys(expl || {});
    console.log(`  📋 Sections explained: ${keys.length} — ${keys.join(', ')}`);

    // We don't get individual token tracking for this function,
    // so we estimate based on the response
    const totalChars = keys.reduce((sum, k) => sum + (expl[k]?.length || 0), 0);
    console.log(`  📝 Total output chars: ${totalChars}`);
    // Rough estimate: 4 chars ≈ 1 token, ~2x input for context
    const estOutputTokens = Math.round(totalChars / 4);
    const estInputTokens = estOutputTokens * 3; // context-heavy prompts
    const estCostUSD = (estInputTokens / 1e6) * 0.30 + (estOutputTokens / 1e6) * 2.50;
    const estCostLKR = estCostUSD * USD_TO_LKR;

    console.log(`  💰 Estimated Cost LKR: ${formatLKR(estCostLKR)} (est ~${estInputTokens} in + ~${estOutputTokens} out tokens)`);

    results.chartExplanations = {
      costUSD: estCostUSD,
      costLKR: estCostLKR,
      timeMs: elapsed,
      sections: keys.length,
      estInputTokens,
      estOutputTokens,
    };
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.chartExplanations = { costUSD: 0, costLKR: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 5: Porondam AI Narrative
// ═══════════════════════════════════════════════════════════════
async function testPorondamAI() {
  separator('TEST 5: PORONDAM AI NARRATIVE (REAL API call)');

  const t1 = Date.now();
  try {
    // First get the raw porondam data
    const porondamData = calculatePorondam(TEST_BIRTH, TEST_BIRTH_2);
    
    // Build the prompt like the route does
    const prompt = `Analyze this marriage compatibility (Porondam) result and write a detailed, personalized report.

Score: ${porondamData.totalScore}/20 (${porondamData.overallCompatibility})

Factors:
${porondamData.factors.map(f => `- ${f.name}: ${f.matched ? 'MATCHED' : 'NOT MATCHED'} (${f.points}/${f.maxPoints}) — ${f.description || ''}`).join('\n')}

Write a warm, detailed 800+ word analysis covering each factor, challenges, and practical advice. No astrology jargon.`;

    const result = await chat(prompt, {
      language: 'en',
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 8192,
    });
    const elapsed = Date.now() - t1;

    const usage = result.usage;
    if (usage) {
      const inputTokens = usage.promptTokenCount || usage.prompt_tokens || 0;
      const outputTokens = usage.candidatesTokenCount || usage.completion_tokens || 0;
      const thinkingTokens = usage.thoughtsTokenCount || 0;

      const tracker = createTokenTracker();
      recordUsage(tracker, result.model || 'gemini-2.5-flash', 'porondam', usage);
      const summary = finalizeTracker(tracker);

      console.log(`  ✅ Porondam AI report in ${elapsed}ms`);
      console.log(`  📊 Score: ${porondamData.totalScore}/20 (${porondamData.overallCompatibility})`);
      console.log(`  📥 Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`  📤 Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`  🧠 Thinking tokens: ${thinkingTokens.toLocaleString()}`);
      console.log(`  💵 Cost USD: ${formatUSD(summary.summary.costUSD)}`);
      console.log(`  💰 Cost LKR: ${formatLKR(summary.summary.costLKR)}`);
      console.log(`  📝 Response length: ${result.message.length} chars`);

      results.porondamAI = {
        costUSD: summary.summary.costUSD,
        costLKR: summary.summary.costLKR,
        inputTokens,
        outputTokens,
        thinkingTokens,
        timeMs: elapsed,
      };
    } else {
      results.porondamAI = { costUSD: 0, costLKR: 0, timeMs: elapsed };
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.porondamAI = { costUSD: 0, costLKR: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 6: Second Chat Message (Sinhala, to test bilingual cost)
// ═══════════════════════════════════════════════════════════════
async function testChatSinhala() {
  separator('TEST 6: SINHALA CHAT MESSAGE (REAL API call)');

  const t1 = Date.now();
  try {
    const result = await chat('මගේ ජන්ම පත්‍රයට අනුව මගේ විවාහය ගැන කියන්න. කවදද හොඳම කාලය?', {
      birthDate: TEST_BIRTH,
      birthLat: LAT,
      birthLng: LNG,
      language: 'si',
      provider: process.env.AI_PROVIDER || 'gemini',
      maxTokens: 4096,
    });
    const elapsed = Date.now() - t1;

    const usage = result.usage;
    if (usage) {
      const inputTokens = usage.promptTokenCount || usage.prompt_tokens || 0;
      const outputTokens = usage.candidatesTokenCount || usage.completion_tokens || 0;
      const thinkingTokens = usage.thoughtsTokenCount || 0;

      const tracker = createTokenTracker();
      recordUsage(tracker, result.model || 'gemini-2.5-flash', 'chat-si', usage);
      const summary = finalizeTracker(tracker);

      console.log(`  ✅ Sinhala chat response in ${elapsed}ms`);
      console.log(`  📥 Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`  📤 Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`  🧠 Thinking tokens: ${thinkingTokens.toLocaleString()}`);
      console.log(`  💵 Cost USD: ${formatUSD(summary.summary.costUSD)}`);
      console.log(`  💰 Cost LKR: ${formatLKR(summary.summary.costLKR)}`);

      results.chatSinhala = {
        costUSD: summary.summary.costUSD,
        costLKR: summary.summary.costLKR,
        inputTokens,
        outputTokens,
        thinkingTokens,
        timeMs: elapsed,
      };
    } else {
      results.chatSinhala = { costUSD: 0, costLKR: 0, timeMs: elapsed };
    }
  } catch (err) {
    console.error(`  ❌ FAILED: ${err.message}`);
    results.chatSinhala = { costUSD: 0, costLKR: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// FIREBASE COST CALCULATOR
// ═══════════════════════════════════════════════════════════════
function calculateFirebaseCosts(dau) {
  // Firestore pricing (beyond free tier)
  const FREE_READS_PER_DAY = 50000;
  const FREE_WRITES_PER_DAY = 20000;
  const COST_PER_100K_READS = 0.06; // USD
  const COST_PER_100K_WRITES = 0.18; // USD
  const FREE_STORAGE_GB = 1;
  const COST_PER_GB = 0.18; // USD/month

  // Estimated operations per active user per day
  const READS_PER_USER = 15;  // auth check, user data, chart cache, notifications, subscription check
  const WRITES_PER_USER = 5;  // notification log, push token, chat session, token transaction, updated_at

  const dailyReads = dau * READS_PER_USER;
  const dailyWrites = dau * WRITES_PER_USER;

  const billableReads = Math.max(0, dailyReads - FREE_READS_PER_DAY) * 30;
  const billableWrites = Math.max(0, dailyWrites - FREE_WRITES_PER_DAY) * 30;

  const readCostUSD = (billableReads / 100000) * COST_PER_100K_READS;
  const writeCostUSD = (billableWrites / 100000) * COST_PER_100K_WRITES;

  // Storage: ~10KB per user (profile + reports + notifications)
  const storageGB = (dau * 3 * 10) / (1024 * 1024); // assume 3x DAU total users
  const storageCostUSD = Math.max(0, storageGB - FREE_STORAGE_GB) * COST_PER_GB;

  return {
    dau,
    dailyReads,
    dailyWrites,
    monthlyReads: dailyReads * 30,
    monthlyWrites: dailyWrites * 30,
    billableReads,
    billableWrites,
    readCostUSD,
    writeCostUSD,
    storageCostUSD,
    storageGB,
    totalCostUSD: readCostUSD + writeCostUSD + storageCostUSD,
    totalCostLKR: (readCostUSD + writeCostUSD + storageCostUSD) * USD_TO_LKR,
  };
}

// ═══════════════════════════════════════════════════════════════
// HOSTING COST CALCULATOR
// ═══════════════════════════════════════════════════════════════
function calculateHostingCosts() {
  return [
    { name: 'Railway Free', monthly_usd: 0, monthly_lkr: 0, max_users: 500, notes: 'Free tier, sleeps after inactivity' },
    { name: 'Render Free', monthly_usd: 0, monthly_lkr: 0, max_users: 300, notes: 'Free tier, cold start ~30s' },
    { name: 'DigitalOcean $6', monthly_usd: 6, monthly_lkr: 6 * USD_TO_LKR, max_users: 5000, notes: '1 vCPU, 1GB RAM' },
    { name: 'DigitalOcean $12', monthly_usd: 12, monthly_lkr: 12 * USD_TO_LKR, max_users: 15000, notes: '2 vCPU, 2GB RAM' },
    { name: 'AWS EC2 t3.small', monthly_usd: 15, monthly_lkr: 15 * USD_TO_LKR, max_users: 20000, notes: '2 vCPU, 2GB RAM' },
    { name: 'AWS EC2 t3.medium', monthly_usd: 30, monthly_lkr: 30 * USD_TO_LKR, max_users: 50000, notes: '2 vCPU, 4GB RAM' },
    { name: 'Hetzner CPX11', monthly_usd: 4.5, monthly_lkr: 4.5 * USD_TO_LKR, max_users: 5000, notes: '2 vCPU, 2GB RAM — cheapest good option' },
  ];
}

// ═══════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════
function printFinalSummary() {
  separator('FINAL COST SUMMARY — REAL MEASURED DATA');

  console.log('\n  🔑 Exchange Rate: $1 USD = LKR ' + USD_TO_LKR);
  console.log('  🤖 AI Provider: ' + (process.env.AI_PROVIDER || 'gemini'));
  console.log('  📡 Model: ' + (process.env.GEMINI_MODEL || 'gemini-2.5-flash'));

  console.log('\n  ┌─────────────────────────────────────────────────────────────────┐');
  console.log('  │  SERVICE                    │  REAL COST LKR  │  REAL COST USD  │');
  console.log('  ├─────────────────────────────┼─────────────────┼─────────────────┤');

  const services = [
    ['Full AI Report (22 sections)', results.aiReport],
    ['Chat Message (English)', results.chatMessage],
    ['Chat Message (Sinhala)', results.chatSinhala],
    ['Porondam AI Narrative', results.porondamAI],
    ['Chart Explanations', results.chartExplanations],
  ];

  let totalCostLKR = 0;
  let totalCostUSD = 0;

  services.forEach(([name, data]) => {
    if (data && !data.error) {
      const lkr = formatLKR(data.costLKR).padStart(14);
      const usd = formatUSD(data.costUSD).padStart(14);
      console.log(`  │  ${name.padEnd(27)} │  ${lkr} │  ${usd} │`);
      totalCostLKR += data.costLKR;
      totalCostUSD += data.costUSD;
    } else {
      console.log(`  │  ${name.padEnd(27)} │  ${'FAILED'.padStart(14)} │  ${'FAILED'.padStart(14)} │`);
    }
  });

  console.log('  ├─────────────────────────────┼─────────────────┼─────────────────┤');
  console.log(`  │  ${'TOTAL (all services once)'.padEnd(27)} │  ${formatLKR(totalCostLKR).padStart(14)} │  ${formatUSD(totalCostUSD).padStart(14)} │`);
  console.log('  └─────────────────────────────────────────────────────────────────┘');

  // FREE services
  console.log('\n  🆓 FREE SERVICES (no API cost):');
  console.log('     Birth Chart, Rahu Kalaya, Daily Nakath, Panchanga, Maraka Apala,');
  console.log('     House Chart, Advanced Analysis, Porondam Math — ALL LKR 0');

  // ─── FIREBASE ────────────────────────────────────────────────
  separator('FIREBASE FIRESTORE COSTS AT SCALE');
  console.log('\n  Free tier: 50K reads/day + 20K writes/day + 1GB storage\n');

  [100, 500, 1000, 5000, 10000, 50000].forEach(dau => {
    const fb = calculateFirebaseCosts(dau);
    const withinFree = fb.totalCostUSD === 0;
    console.log(`  ${String(dau).padStart(6)} DAU → ${fb.dailyReads.toLocaleString().padStart(9)} reads/day + ${fb.dailyWrites.toLocaleString().padStart(8)} writes/day → ${withinFree ? '✅ FREE' : formatLKR(fb.totalCostLKR) + '/month (' + formatUSD(fb.totalCostUSD) + ')'}`);
  });

  // ─── HOSTING ─────────────────────────────────────────────────
  separator('SERVER HOSTING OPTIONS');
  const hosting = calculateHostingCosts();
  hosting.forEach(h => {
    console.log(`  ${h.name.padEnd(22)} → ${formatLKR(h.monthly_lkr).padStart(12)}/mo (${formatUSD(h.monthly_usd).padStart(10)}) | Up to ${h.max_users.toLocaleString()} users | ${h.notes}`);
  });

  // ─── FIXED COSTS ─────────────────────────────────────────────
  separator('ANNUAL FIXED COSTS');
  const fixedCosts = [
    { name: 'Apple Developer Account', annual_usd: 99, annual_lkr: 99 * USD_TO_LKR },
    { name: 'Google Play Console', annual_usd: 25/5, annual_lkr: (25/5) * USD_TO_LKR, note: '(one-time $25, amortized 5yr)' },
    { name: 'Domain (.lk or .com)', annual_usd: 15, annual_lkr: 15 * USD_TO_LKR },
    { name: 'SSL (free via Let\'s Encrypt)', annual_usd: 0, annual_lkr: 0 },
  ];
  fixedCosts.forEach(f => {
    console.log(`  ${(f.name + (f.note || '')).padEnd(45)} → ${formatLKR(f.annual_lkr).padStart(12)}/year (${formatUSD(f.annual_usd).padStart(10)})`);
  });
  const totalFixed = fixedCosts.reduce((s, f) => s + f.annual_lkr, 0);
  console.log(`  ${'TOTAL ANNUAL FIXED'.padEnd(45)} → ${formatLKR(totalFixed).padStart(12)}/year (${formatLKR(totalFixed / 12)}/month)`);

  // ─── PROFITABILITY ───────────────────────────────────────────
  separator('PROFITABILITY ANALYSIS (with REAL costs)');

  const reportCost = results.aiReport?.costLKR || 0;
  const chatCost = ((results.chatMessage?.costLKR || 0) + (results.chatSinhala?.costLKR || 0)) / 2; // avg
  const porondamCost = results.porondamAI?.costLKR || 0;
  const chartExplCost = results.chartExplanations?.costLKR || 0;

  console.log('\n  ─── Current Pricing vs Real Costs ───');
  console.log(`  Full Report:    Charge LKR 15  | Cost ${formatLKR(reportCost)} | Margin: ${((15 - reportCost) / 15 * 100).toFixed(1)}% ${reportCost > 15 ? '❌ LOSING MONEY' : '✅'}`);
  console.log(`  Porondam:       Charge LKR 10  | Cost ${formatLKR(porondamCost)} | Margin: ${((10 - porondamCost) / 10 * 100).toFixed(1)}% ${porondamCost > 10 ? '❌ LOSING MONEY' : '✅'}`);
  console.log(`  Chat (per msg): FREE           | Cost ${formatLKR(chatCost)} | Margin: -100% ❌`);
  console.log(`  Chart Explain:  FREE           | Cost ${formatLKR(chartExplCost)} | Margin: -100% ❌`);

  console.log('\n  ─── Recommended Pricing vs Real Costs ───');
  console.log(`  Full Report:    Charge LKR 50  | Cost ${formatLKR(reportCost)} | Margin: ${((50 - reportCost) / 50 * 100).toFixed(1)}% ✅`);
  console.log(`  Porondam:       Charge LKR 20  | Cost ${formatLKR(porondamCost)} | Margin: ${((20 - porondamCost) / 20 * 100).toFixed(1)}% ✅`);
  console.log(`  Chat (sub only):LKR 8/day sub  | Cost ${formatLKR(chatCost)}/msg | Covered by subscription ✅`);
  console.log(`  Chart Explain:  Sub only       | Cost ${formatLKR(chartExplCost)} | Covered by subscription ✅`);

  // Monthly subscriber profitability
  const dailySubNet = 8 * 0.83; // After Ideamart 17% commission
  const monthlySubRevenue = dailySubNet * 30;
  // Average subscriber usage per month: 1 report + 8 chats + 1 chart explanation + 1 porondam
  const avgSubscriberCost = reportCost + (chatCost * 8) + chartExplCost + porondamCost;

  console.log('\n  ─── Monthly Subscriber (LKR 8/day) ───');
  console.log(`  Gross revenue:    LKR ${(8 * 30).toFixed(0)}/month`);
  console.log(`  Ideamart fee:    -LKR ${(8 * 30 * 0.17).toFixed(0)} (~17%)`);
  console.log(`  Net revenue:      ${formatLKR(monthlySubRevenue)}/month`);
  console.log(`  Avg AI cost:     -${formatLKR(avgSubscriberCost)} (1 report + 8 chats + 1 chart expl + 1 porondam)`);
  console.log(`  Server share:    -LKR 2 (estimated @ 1K users)`);
  console.log(`  Firebase share:  -LKR 0.15 (estimated @ 1K users)`);
  console.log(`  ────────────────────────────`);
  const profit = monthlySubRevenue - avgSubscriberCost - 2 - 0.15;
  console.log(`  PROFIT/subscriber: ${formatLKR(profit)}/month (${(profit / monthlySubRevenue * 100).toFixed(1)}% margin)`);

  // Break-even
  const fixedMonthly = totalFixed / 12 + 6 * USD_TO_LKR; // fixed + DigitalOcean $6
  console.log(`\n  ─── Break-even ───`);
  console.log(`  Fixed monthly cost: ${formatLKR(fixedMonthly)} (hosting + amortized fixed)`);
  console.log(`  Break-even subscribers: ${Math.ceil(fixedMonthly / profit)} subscribers`);

  // Scale projections
  console.log('\n  ─── Scale Projections ───');
  [50, 100, 250, 500, 1000, 5000].forEach(subs => {
    const rev = subs * monthlySubRevenue;
    const aiCost = subs * avgSubscriberCost;
    const fb = calculateFirebaseCosts(subs);
    const hosting = subs <= 500 ? 0 : subs <= 5000 ? 6 * USD_TO_LKR : subs <= 15000 ? 12 * USD_TO_LKR : 30 * USD_TO_LKR;
    const totalCost = aiCost + fb.totalCostLKR + hosting + totalFixed / 12;
    const netProfit = rev - totalCost;
    const usdProfit = netProfit / USD_TO_LKR;
    console.log(`  ${String(subs).padStart(5)} subs → Rev ${formatLKR(rev).padStart(14)} - Cost ${formatLKR(totalCost).padStart(12)} = ${(netProfit >= 0 ? '✅' : '❌')} ${formatLKR(netProfit).padStart(14)} ($${usdProfit.toFixed(0)}/mo)`);
  });

  // Token usage table
  separator('RAW TOKEN DATA (for verification)');
  console.log(JSON.stringify(results, null, 2));
}

// ═══════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   GRAHACHARA — REAL COST MEASUREMENT TEST               ║');
  console.log('║   Using LIVE Gemini API calls with actual token costs   ║');
  console.log('║   Date: ' + new Date().toISOString().split('T')[0] + '                                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('\n  ❌ ERROR: GEMINI_API_KEY not set in .env file!');
    console.error('  Set GEMINI_API_KEY in server/.env to run real cost tests.\n');
    process.exit(1);
  }

  console.log(`\n  API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`  Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
  console.log(`  Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`);
  console.log(`  USD/LKR: ${USD_TO_LKR}`);

  // Run tests sequentially to avoid rate limits
  const { advanced } = await testFreeServices();
  await testAIReport();
  await testChatMessage();
  await testChatSinhala();
  await testChartExplanations(advanced);
  await testPorondamAI();

  printFinalSummary();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
