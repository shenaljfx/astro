/**
 * Baby Kendara Pack — the newborn keepsake.
 *
 * POST /api/baby/compose — baby_kendara credit (or pending-entitlement retry).
 * Returns the COMPLETE deterministic baby report built by engine/babyReport:
 *   • chart identity + D1 grid (lagna, moon/sun, nakshatra, rashi chart)
 *   • birth-moment panchanga (weekday, tithi) + graha position table
 *   • nakshatra baby profile (deity/symbol/gana/yoni, nature, parenting note)
 *   • traditional Sinhala naming letters for all 4 padas + curated name ideas
 *   • Ganda Moola + Gandanta dosha analysis with remedies
 *   • element balance, lucky attributes, childhood dasha timeline
 *   • naming-ceremony + first-feeding auspicious dates
 * Deterministic (no AI), so it always succeeds — the credit is consumed once
 * on a successful compose.
 *
 * Legacy keys (identity/babyNames/gandaMoola/namingDates) are kept so older
 * app builds keep working; new clients read `report`.
 *
 * (Mounted with paidAccessExcept(['/compose']) so credit buyers reach it.)
 */

const express = require('express');
const router = express.Router();
const { requireSubscriptionOrCredit } = require('../middleware/subscription');
const { consumeCredit } = require('../services/purchaseCredits');
const { buildBasicChartData } = require('./horoscope');
const { findMuhurtha } = require('../engine/muhurtha');
const { buildBabyReport } = require('../engine/babyReport');
const { parseSLT } = require('../utils/dateUtils');
const { parseBirthDateTime } = require('../services/timezone');
// AI narrative phase — reuses the full report's async pipeline.
const { createReportProgress } = require('../engine/chat');
const { PROMPT_VERSION } = require('../engine/promptObservability');
const { buildReportCacheKey, getCachedReport } = require('../models/firestore');
const { enqueueReportJob } = require('../services/jobQueue');
const { createOrResumeEntitlement, recordEntitlementError } = require('../middleware/entitlements');
const { assertBudgetAvailable } = require('../services/budgetEnforcer');
const firestoreCircuit = require('../services/firestoreCircuit');

// The curated life-story sections the Baby Kendara narrates (a subset of the
// full report's REPORT_SECTION_ORDER). The live infantChartGuard forces each
// into infant-safe framing: career/education/financial → future-tense
// aptitude; familyPortrait → parent-shifted (reads the PARENTS deterministically).
const BABY_SECTION_KEYS = ['yogaAnalysis', 'career', 'education', 'familyPortrait', 'financial'];
// Dedicated version tags isolate the baby narrative cache from full reports.
const BABY_PROMPT_VERSION = `${PROMPT_VERSION}:baby-v1`;
const BABY_ENGINE_VERSION = 'grahachara-baby-narrative-v1';

let enhanced = null;
try { enhanced = require('../engine/enhanced'); } catch (e) { console.warn('[baby] enhanced engine not available:', e.message); }

function normGender(g) { return g === 'male' || g === 'female' ? g : null; }

router.post('/compose', requireSubscriptionOrCredit('babyKendara', 'baby_kendara'), async (req, res) => {
  try {
    const { birthDate, lat, lng, gender } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    const identity = buildBasicChartData(date, plat, plng);

    // The full report — every section is individually fault-tolerant inside.
    let report = null;
    try { report = buildBabyReport(date, plat, plng, identity, normGender(gender)); } catch (e) { console.warn('[baby] report build failed:', e.message); }

    // ── Legacy payload (older app builds) ──────────────────────────────────
    let babyNames = null;
    let gandaMoola = null;
    if (enhanced) {
      try { babyNames = enhanced.getBabyNameSuggestions(date, plat, plng); } catch (e) { console.warn('[baby] names failed:', e.message); }
      try { gandaMoola = enhanced.analyzeGandaMoola(date, plat, plng); } catch (e) { console.warn('[baby] ganda moola failed:', e.message); }
    }
    let namingDates = null;
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      namingDates = findMuhurtha('nameCeremony', now, end, date, plat, plng, 3);
    } catch (e) { console.warn('[baby] naming dates failed:', e.message); }

    // Spend the one-time credit on a successful compose. consumeCredit is
    // transactional: a definitive `false` means the credit was already used
    // (concurrent /compose race) → reject so one credit yields one keepsake. A
    // thrown error is transient → still deliver (fail-open, credit stays available).
    if (req.accessVia === 'credit' && req.purchaseCredit) {
      let consumed = false;
      let consumeErrored = false;
      try {
        consumed = await consumeCredit(req.purchaseCredit.id, 'baby-' + Date.now());
      } catch (e) {
        consumeErrored = true;
        console.warn('[baby] credit consume error (treating as transient):', e.message);
      }
      if (!consumed && !consumeErrored) {
        return res.status(409).json({
          error: 'This purchase has already been used. If you were charged and have no report, please contact support.',
          code: 'CREDIT_ALREADY_USED',
        });
      }
    }

    res.json({ success: true, data: { identity, report, babyNames, gandaMoola, namingDates } });
  } catch (e) {
    console.error('[baby/compose] error:', e.message);
    res.status(500).json({ error: 'Failed to compose baby kendara' });
  }
});

/**
 * POST /api/baby/generate — the FULL Baby Kendara pack (two-phase).
 *
 * Phase 1 (synchronous, in this response): the deterministic keepsake — chart,
 *   naming, doshas, vitality, lucky, dashas, nekath dates — always returned,
 *   even if the DB / AI is unavailable. Gender is MANDATORY.
 * Phase 2 (async): five AI life-story sections (character, vocation, education,
 *   family-&-bonds, fortune) run through the report pipeline — job queue, live
 *   progress (poll /api/horoscope/report-progress/:reportId), entitlement with
 *   free retries, versioned cache. The baby_kendara credit is consumed ONCE on
 *   first generation; retries are free.
 *
 * Responses:
 *   200 cached    → data.narrative { stage:'complete', savedReportId, sections }
 *   202 queued    → data.narrative { stage:'queued', reportId, jobId }
 *   200 core-only → data.narrative { stage:'unavailable', canRetry:true }  (DB/AI busy;
 *                    credit NOT consumed — the keepsake still renders)
 */
router.post('/generate', requireSubscriptionOrCredit('babyKendara', 'baby_kendara'), async (req, res) => {
  let entitlementId = null;
  try {
    const { birthDate, lat, lng, language = 'en', gender } = req.body || {};
    if (!birthDate) return res.status(400).json({ error: 'birthDate is required' });
    const g = normGender(gender);
    if (!g) return res.status(400).json({ error: 'gender is required (male | female)' });

    const plat = parseFloat(lat) || 6.9271;
    const plng = parseFloat(lng) || 79.8612;
    const lang = language === 'si' ? 'si' : 'en';

    let date = null;
    try { date = await parseBirthDateTime(birthDate, plat, plng); } catch (_) { date = parseSLT(birthDate); }
    if (!date || isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid birthDate' });

    // ── Phase 1: deterministic keepsake (always delivered) ──────────────────
    const identity = buildBasicChartData(date, plat, plng);
    let report = null;
    try { report = buildBabyReport(date, plat, plng, identity, g); } catch (e) { console.warn('[baby/generate] report build failed:', e.message); }
    const core = { identity, report };
    const coreOnly = (narrative) => res.json({ success: true, data: { ...core, narrative } });

    const uid = req.user && req.user.uid && req.user.authType !== 'anonymous' ? req.user.uid : null;

    // DB unavailable → still hand over the keepsake; narrative deferred, no charge.
    if (!uid || firestoreCircuit.isOpen()) {
      return coreOnly({ stage: 'unavailable', canRetry: true });
    }

    // ── Phase 2 setup: cache lookup ─────────────────────────────────────────
    const cacheDescriptor = buildReportCacheKey({
      birthDate: date.toISOString(), lat: plat, lng: plng, language: lang,
      userGender: g, promptVersion: BABY_PROMPT_VERSION, engineVersion: BABY_ENGINE_VERSION,
    });
    try {
      const cached = await getCachedReport(uid, cacheDescriptor.cacheKey, {
        promptVersion: BABY_PROMPT_VERSION, engineVersion: BABY_ENGINE_VERSION,
      });
      if (cached) {
        return res.json({
          success: true, cached: true,
          data: { ...core, narrative: { stage: 'complete', savedReportId: cached.id, sections: cached.sections } },
        });
      }
    } catch (e) { console.warn('[baby/generate] cache check failed:', e.message); }

    // ── Entitlement: create/resume (free retries), consume credit once ──────
    let entitlement = null;
    try {
      const inputData = { birthDate, lat: plat, lng: plng, language: lang, gender: g };
      entitlement = await createOrResumeEntitlement(uid, 'babyKendara', inputData);
      entitlementId = entitlement.id;
      if (!entitlement.isRetry && req.accessVia === 'credit' && req.purchaseCredit) {
        // Transactional consume: definitive `false` = credit already used
        // (race) → reject so one credit yields one narrative. Thrown error =
        // transient → proceed (credit stays available; pending entitlement
        // keeps the retry free).
        let consumed = false;
        let consumeErrored = false;
        try {
          consumed = await consumeCredit(req.purchaseCredit.id, entitlement.id);
        } catch (e) {
          consumeErrored = true;
          console.warn('[baby/generate] credit consume error (treating as transient):', e.message);
        }
        if (!consumed && !consumeErrored) {
          return res.status(409).json({
            error: 'This purchase has already been used. If you were charged and have no report, please contact support.',
            code: 'CREDIT_ALREADY_USED',
          });
        }
      }
    } catch (entErr) {
      if (entErr.code === 'ENTITLEMENT_EXHAUSTED') {
        return res.status(410).json({ error: entErr.message, code: entErr.code });
      }
      console.warn('[baby/generate] entitlement failed (non-fatal):', entErr.message);
    }

    // ── Budget check (inline, so the keepsake is never blocked by it) ───────
    try {
      await assertBudgetAvailable('babyReport', uid, 8);
    } catch (budgetErr) {
      return coreOnly({ stage: 'unavailable', canRetry: true, reason: 'busy' });
    }

    // ── Enqueue the AI narrative job (subset → 5 sections) ──────────────────
    const reportId = `baby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const jobPayload = {
      uid, reportId,
      birthDate, parsedDateISO: date.toISOString(),
      lat: plat, lng: plng, language: lang,
      userGender: g,
      reportType: 'baby',
      sections: BABY_SECTION_KEYS,
      sectionsTotal: BABY_SECTION_KEYS.length,
      entitlementId,
      cacheKey: cacheDescriptor.cacheKey,
      cacheVersion: cacheDescriptor.cacheVersion,
      cacheInputHash: cacheDescriptor.inputHash,
      cacheInput: cacheDescriptor.normalizedInput,
      engineVersion: BABY_ENGINE_VERSION,
      promptVersion: BABY_PROMPT_VERSION,
    };

    const job = await enqueueReportJob(jobPayload, {
      uniqueKey: `${uid}:${cacheDescriptor.cacheKey}:normal`,
      maxAttempts: 2,
    });
    if (!job) return coreOnly({ stage: 'unavailable', canRetry: true });

    const queuedReportId = job.payload && job.payload.reportId ? job.payload.reportId : reportId;
    if (!job.deduped) {
      createReportProgress(queuedReportId, BABY_SECTION_KEYS.length, uid, {
        stage: 'queued', jobId: job.id,
        cacheKey: cacheDescriptor.cacheKey,
        promptVersion: BABY_PROMPT_VERSION,
        engineVersion: BABY_ENGINE_VERSION,
      });
    }

    return res.status(202).json({
      success: true, queued: true,
      data: { ...core, narrative: { stage: 'queued', reportId: queuedReportId, jobId: job.id } },
      reportId: queuedReportId, entitlementId,
    });
  } catch (e) {
    if (entitlementId) {
      recordEntitlementError(entitlementId, e.message || 'Baby narrative failed')
        .catch((err) => console.warn('[baby/generate] entitlement error record failed:', err.message));
    }
    console.error('[baby/generate] error:', e.message);
    res.status(500).json({ error: 'Failed to generate baby kendara', canRetry: !!entitlementId });
  }
});

module.exports = router;
