const os = require('os');
const { generateAINarrativeReport, createReportProgress, updateReportProgress, REPORT_SECTION_ORDER } = require('../engine/chat');
const { generateWeeklyLagnaReports } = require('../engine/weeklyLagna');
const { PROMPT_VERSION } = require('../engine/promptObservability');
const { getCachedReport, saveReport } = require('../models/firestore');
const { fulfillEntitlement, recordEntitlementError } = require('../middleware/entitlements');
const { trackCost } = require('./costTracker');
const { notifyAlert } = require('./alerting');
const { claimNextJob, completeJob, failJob } = require('./jobQueue');
const { sendWeeklyLagnaPushNotification } = require('./scheduler');
const firestoreCircuit = require('./firestoreCircuit');

const WORKER_POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);
const WORKER_IDLE_MAX_MS = Number(process.env.WORKER_IDLE_MAX_MS || 60000);   // idle backoff cap
const WORKER_ERROR_MAX_MS = Number(process.env.WORKER_ERROR_MAX_MS || 120000); // transient error backoff cap
const REPORT_SECTION_TOTAL = (REPORT_SECTION_ORDER || []).length || 20; // single source of truth — never hardcode
const RECOVERY_RECHECKS = 3;
const RECOVERY_DELAY_MS = 30000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function serializeTimeContext(timeContext) {
  if (!timeContext) return null;
  return JSON.parse(JSON.stringify(timeContext));
}

function isTemporaryAIProviderError(error) {
  const statusCode = error?.statusCode || error?.upstreamStatus || 0;
  return error?.code === 'AI_PROVIDER_RATE_LIMIT' ||
    error?.code === 'AI_PROVIDER_UNAVAILABLE' ||
    statusCode === 429 || statusCode >= 500 ||
    /Gemini .*HTTP (429|5\d\d)|RESOURCE_EXHAUSTED/i.test(error?.message || '');
}

async function executeAIReportJob(payload, job = {}) {
  const reportId = payload.reportId;
  const uid = payload.uid;
  const date = new Date(payload.parsedDateISO || payload.birthDate);
  const reportLat = Number(payload.lat || 6.9271);
  const reportLng = Number(payload.lng || 79.8612);
  const language = payload.language || 'en';

  // A section subset (e.g. Baby Kendara's 5 narrative sections) narrows the
  // progress total; absent → the full report's section count.
  const sectionSubset = Array.isArray(payload.sections) && payload.sections.length ? payload.sections : null;
  const sectionTotal = sectionSubset ? sectionSubset.length : REPORT_SECTION_TOTAL;

  // Queue-wait tells us instantly whether a worker was alive when the job was
  // enqueued — the #1 cause of "AI part always fails" is no worker claiming.
  const queuedAt = job.createdAt ? new Date(job.createdAt).getTime() : null;
  const waitMs = queuedAt ? Date.now() - queuedAt : null;
  console.log(`[JobWorker] ▶ ${payload.reportType === 'baby' ? 'BABY narrative' : 'FULL report'} claimed — report=${reportId} uid=${uid || 'n/a'} sections=${sectionTotal} lang=${language}${waitMs != null ? ` queueWait=${Math.round(waitMs / 1000)}s` : ''} attempt=${job.attempts || 1}/${job.maxAttempts || 2}`);

  createReportProgress(reportId, sectionTotal, uid, {
    jobId: job.id || payload.jobId || null,
    stage: payload.recoveryRetry ? 'recovering' : 'engine',
    currentSection: payload.recoveryRetry ? 'checking_saved_report' : null,
    cacheKey: payload.cacheKey || null,
    promptVersion: payload.promptVersion || PROMPT_VERSION,
    engineVersion: payload.engineVersion || null,
    recoveryRetry: !!payload.recoveryRetry,
  });
  const startTime = Date.now();

  const findExistingSavedReport = async () => {
    if (!uid || !payload.cacheKey) return null;
    if (payload.forceRegenerate && !payload.recoveryRetry) return null;
    try {
      return await getCachedReport(uid, payload.cacheKey, {
        promptVersion: payload.promptVersion || PROMPT_VERSION,
        engineVersion: payload.engineVersion || null,
      });
    } catch (e) {
      console.warn('[JobWorker] Cached report recovery lookup failed:', e.message);
      return null;
    }
  };

  const completeWithExistingReport = async (existingReport, metadata = {}) => {
    const recoveredCount = Object.keys(existingReport.sections || {}).length || REPORT_SECTION_TOTAL;
    updateReportProgress(reportId, {
      stage: 'complete',
      savedReportId: existingReport.id,
      sectionsDone: recoveredCount,
      sectionsTotal: recoveredCount,
      currentSection: null,
      error: null,
      recoveryRetry: !!payload.recoveryRetry,
      ...metadata,
    });
    if (payload.entitlementId) {
      try { await fulfillEntitlement(payload.entitlementId, { reportId: existingReport.id, recovered: true }); }
      catch (e) { console.warn('[JobWorker] Entitlement fulfill failed:', e.message); }
    }
    return {
      savedReportId: existingReport.id,
      elapsedMs: Date.now() - startTime,
      sectionsGenerated: recoveredCount,
      sectionsTotal: recoveredCount,
      recoveredFromCache: true,
      ...metadata,
    };
  };

  const recoverExistingSavedReport = async () => {
    const immediate = await findExistingSavedReport();
    if (immediate) return completeWithExistingReport(immediate, { recoveryChecks: 0 });
    if (!payload.recoveryRetry) return null;

    for (let attempt = 1; attempt <= RECOVERY_RECHECKS; attempt++) {
      updateReportProgress(reportId, {
        stage: 'recovering',
        sectionsDone: REPORT_SECTION_TOTAL,
        sectionsTotal: REPORT_SECTION_TOTAL,
        currentSection: 'checking_saved_report',
        recoveryAttempt: attempt,
        recoveryAttemptsTotal: RECOVERY_RECHECKS,
        error: null,
      });
      await wait(RECOVERY_DELAY_MS);
      const recovered = await findExistingSavedReport();
      if (recovered) return completeWithExistingReport(recovered, { recoveryChecks: attempt });
    }

    updateReportProgress(reportId, {
      stage: 'engine',
      sectionsDone: 0,
      sectionsTotal: REPORT_SECTION_TOTAL,
      currentSection: null,
      recoveryChecks: RECOVERY_RECHECKS,
      recoveryMissed: true,
      error: null,
    });
    return null;
  };

  const recoveredBeforeGeneration = await recoverExistingSavedReport();
  if (recoveredBeforeGeneration) return recoveredBeforeGeneration;

  try {
    const report = await generateAINarrativeReport(
      date,
      reportLat,
      reportLng,
      language,
      payload.birthLocation || null,
      payload.userName || null,
      payload.userGender || null,
      payload.userReligion || null,
      {
        maritalStatus: payload.maritalStatus || null,
        marriageYear: payload.marriageYear || null,
        careerField: payload.careerField || null,
        motherOccupation: payload.motherOccupation || null,
        fatherOccupation: payload.fatherOccupation || null,
        lifeEvents: Array.isArray(payload.lifeEvents) ? payload.lifeEvents : [],
        calculationSettings: payload.calculationSettings || {},
        asOfDate: payload.asOfDate || null,
        timeUnknown: payload.timeUnknown === true,
        timeContext: serializeTimeContext(payload.timeContext),
        sections: sectionSubset, // null → full report; array → curated subset (Baby Kendara)
      },
      reportId
    );

    const elapsed = Date.now() - startTime;
    const sectionCount = Object.keys(report.narrativeSections || {}).length;
    if (sectionCount === 0) {
      const error = new Error('Report generation produced zero narrative sections');
      error.code = 'EMPTY_REPORT';
      throw error;
    }

    trackCost('fullReport', uid || null, report.tokenUsage);

    if (!uid) {
      const error = new Error('AI report job requires an authenticated owner uid');
      error.code = 'MISSING_OWNER_UID';
      throw error;
    }

    const savedReportId = await saveReport(uid, {
      birthDate: payload.birthDate,
      lat: reportLat,
      lng: reportLng,
      language,
      type: payload.reportType === 'baby' ? 'baby-narrative' : 'ai-narrative',
      sections: report.narrativeSections,
      rashiChart: report.rashiChart,
      navamshaChart: report.navamshaChart || null,
      navamshaLagna: (report.navamshaChart && report.navamshaChart.lagna) || null,
      birthInfo: report.birthData,
      sectionScores: report.sectionScores || null,
      predictions: report.predictions || [],
      promptVersion: report.promptVersion || PROMPT_VERSION,
      cacheKey: payload.cacheKey || null,
      cacheVersion: payload.cacheVersion || null,
      cacheInputHash: payload.cacheInputHash || null,
      cacheInput: payload.cacheInput || null,
      engineVersion: payload.engineVersion || null,
      promptMetadata: report.promptMetadata || null,
      promptAnalytics: report.promptAnalytics || null,
      calculationMetadata: report.calculationMetadata || null,
      validationMetadata: report.validationMetadata || null,
      generationTime: `${elapsed}ms`,
      userName: payload.userName || null,
      userGender: payload.userGender || null,
      birthLocation: payload.birthLocation || null,
      forceRegenerate: payload.forceRegenerate || false,
    });

    updateReportProgress(reportId, { stage: 'complete', savedReportId, sectionsDone: sectionCount, currentSection: null });

    if (payload.entitlementId) {
      // Store the saved report id on the entitlement — entitlement-view access
      // can then serve the exact owned report even after a cache-version bump.
      try { await fulfillEntitlement(payload.entitlementId, { reportId: savedReportId }); }
      catch (e) { console.warn('[JobWorker] Entitlement fulfill failed:', e.message); }
    }

    console.log(`[JobWorker] ✔ ${payload.reportType === 'baby' ? 'BABY narrative' : 'FULL report'} DONE — report=${reportId} saved=${savedReportId} sections=${sectionCount}/${report.totalSections || sectionCount} in ${Math.round(elapsed / 1000)}s${report.failedSections && report.failedSections.length ? ` failedSections=[${report.failedSections.map(f => f.key).join(',')}]` : ''}`);
    return {
      savedReportId,
      elapsedMs: elapsed,
      sectionsGenerated: report.successCount || sectionCount,
      sectionsTotal: report.totalSections || sectionCount,
      failedSections: report.failedSections ? report.failedSections.map(f => f.key) : [],
    };
  } catch (error) {
    const willRetry = isTemporaryAIProviderError(error);
    console.error(`[JobWorker] ✖ ${payload.reportType === 'baby' ? 'BABY narrative' : 'FULL report'} FAILED — report=${reportId} code=${error.code || 'n/a'} retrying=${willRetry} error=${error.message}`);
    const existingAfterFailure = await findExistingSavedReport();
    if (existingAfterFailure) {
      return completeWithExistingReport(existingAfterFailure, {
        recoveredAfterFailure: true,
        originalError: error.message || null,
      });
    }

    updateReportProgress(reportId, {
      stage: willRetry ? 'retrying' : 'failed',
      error: error.message || 'Report generation failed',
    });
    if (payload.entitlementId) {
      try { await recordEntitlementError(payload.entitlementId, error.message || 'Generation failed'); }
      catch (e) { console.warn('[JobWorker] Entitlement error record failed:', e.message); }
    }
    notifyAlert('report_generation_failed', {
      uid,
      code: error.code || 'GENERATION_FAILED',
      message: error.message || 'Unknown report generation failure',
      jobId: job.id || null,
    }, { severity: 'critical', dedupeKey: `report_generation_failed:${error.code || 'unknown'}` }).catch(() => null);
    throw error;
  }
}

async function executeWeeklyLagnaJob(payload = {}, job = {}) {
  const result = await generateWeeklyLagnaReports(payload);
  if (result.usage) trackCost('weeklyLagna', null, result.usage);
  try {
    await sendWeeklyLagnaPushNotification();
  } catch (pushErr) {
    console.error('[JobWorker] Weekly lagna push error:', pushErr.message);
  }
  return result;
}

async function processJob(job) {
  if (!job) return null;
  if (job.type === 'aiReport') return executeAIReportJob(job.payload || {}, job);
  if (job.type === 'weeklyLagna') return executeWeeklyLagnaJob(job.payload || {}, job);
  throw new Error(`Unknown job type: ${job.type}`);
}

async function runWorkerOnce(workerId, types) {
  const job = await claimNextJob(workerId, types);
  if (!job) return null;
  try {
    const result = await processJob(job);
    await completeJob(job.id, result || {});
    return { jobId: job.id, status: 'complete', result };
  } catch (error) {
    const failure = await failJob(job.id, error, { retryable: isTemporaryAIProviderError(error) });
    if (!failure?.retryable && job.type === 'aiReport' && job.payload?.reportId) {
      updateReportProgress(job.payload.reportId, { stage: 'failed', error: error.message || 'Report generation failed' });
    }
    return { jobId: job.id, status: failure?.retryable ? 'queued' : 'failed', error };
  }
}

function startWorkerLoop(options = {}) {
  const workerId = options.workerId || `${os.hostname()}-${process.pid}`;
  const types = options.types || ['aiReport', 'weeklyLagna'];
  const basePoll = Number(options.pollMs || WORKER_POLL_MS);
  let stopped = false;

  // Adaptive scheduling state.
  let idleStreak = 0;    // consecutive empty polls → ramp interval up to IDLE_MAX
  let errorStreak = 0;   // consecutive transient errors → exponential backoff
  // Throttled logging: collapse identical repeated errors into a summary.
  let lastLogKey = null;
  let lastLogAt = 0;
  let suppressed = 0;

  const logThrottled = (key, message) => {
    const now = Date.now();
    if (key !== lastLogKey || now - lastLogAt > 60000) {
      const suffix = suppressed > 0 ? ` (…${suppressed} identical suppressed)` : '';
      console.error(`[JobWorker] ${message}${suffix}`);
      lastLogKey = key;
      lastLogAt = now;
      suppressed = 0;
    } else {
      suppressed += 1;
    }
  };

  async function tick() {
    if (stopped) return;
    let nextDelay = basePoll;

    // If the DB breaker is open (quota/unavailable), don't even poll — wait it out.
    if (firestoreCircuit.isOpen()) {
      const wait = Math.max(5000, firestoreCircuit.msRemaining());
      logThrottled('circuit_open', `Firestore circuit open — pausing polling ${Math.round(wait / 1000)}s (no data loss; queued jobs resume after cooldown).`);
      if (!stopped) setTimeout(tick, Math.min(wait, WORKER_IDLE_MAX_MS));
      return;
    }

    try {
      const result = await runWorkerOnce(workerId, types);
      firestoreCircuit.recordSuccess();
      errorStreak = 0;
      if (result) {
        // Did work → poll again promptly in case more jobs are queued.
        idleStreak = 0;
        nextDelay = 250;
      } else {
        // Idle → ramp the interval up to reduce steady-state Firestore reads.
        idleStreak += 1;
        nextDelay = Math.min(WORKER_IDLE_MAX_MS, basePoll * Math.min(idleStreak, 12));
      }
    } catch (error) {
      idleStreak = 0;
      errorStreak += 1;
      const cls = firestoreCircuit.recordError(error);
      if (cls.isQuota) {
        // Quota resets daily — hammering is pointless. The breaker is now open;
        // wait out its cooldown instead of retrying every few seconds.
        nextDelay = Math.max(firestoreCircuit.msRemaining(), 60000);
        logThrottled('quota', `Firestore quota exceeded — pausing ${Math.round(nextDelay / 60000)} min. Worker idle, jobs stay queued. (${error.message})`);
      } else if (cls.isUnavailable) {
        nextDelay = Math.min(WORKER_ERROR_MAX_MS, 1000 * 2 ** Math.min(errorStreak, 7)) + Math.random() * 1000;
        logThrottled('unavailable', `Firestore unavailable — backoff ${Math.round(nextDelay / 1000)}s. (${error.message})`);
      } else {
        // Non-DB error in the poll path — back off modestly, keep going.
        nextDelay = Math.min(WORKER_ERROR_MAX_MS, 1000 * 2 ** Math.min(errorStreak, 6)) + Math.random() * 1000;
        logThrottled('tick', `tick failed: ${error.message}`);
      }
    } finally {
      if (!stopped) setTimeout(tick, nextDelay);
    }
  }

  tick();
  return function stopWorkerLoop() {
    stopped = true;
  };
}

module.exports = {
  executeAIReportJob,
  executeWeeklyLagnaJob,
  processJob,
  runWorkerOnce,
  startWorkerLoop,
};