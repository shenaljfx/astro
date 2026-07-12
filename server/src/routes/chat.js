/**
 * AI Chat Routes - "Ask the Astrologer"
 *
 * Endpoints:
 * - POST /api/chat/ask        — Send a message (fair-use daily cap)
 * - GET  /api/chat/quota      — Get remaining questions for today
 */

const express = require('express');
const router = express.Router();
const { chat } = require('../engine/chat');
const { phoneAuth, requireSubscription } = require('../middleware/subscription');
const { aiUserLimiter } = require('../middleware/security');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { trackCost } = require('../services/costTracker');
const { budgetGuard } = require('../services/budgetEnforcer');
const { distributedAiUserLimiter } = require('../services/distributedRateLimit');

// ── Fair-use daily cap for the "unlimited" chat plan ────────────────────────
// Generous enough that a normal subscriber (a handful of questions a day) never
// hits it, so the "unlimited" promise holds — but it bounds the worst-case AI
// cost per subscriber and stops scripted abuse. Tune via env as you learn your
// real usage distribution: lower protects margin, higher feels more unlimited.
// At ~LKR 1.25/message: 30/day caps a heavy day near LKR 37; the average user
// (~5/day) is nowhere near it.
const CHAT_FAIR_USE_DAILY = Math.max(1, Number(process.env.CHAT_FAIR_USE_DAILY) || 30);

// ─── Quota helpers ─────────────────────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/**
 * Read today's usage for a uid from Firestore.
 * Returns { count, date } — always returns 0 count if date differs (= new day).
 * Falls back to 0 if no Firestore.
 */
async function getQuota(uid) {
  const db = getDb();
  if (!db || !uid) return { count: 0, remaining: CHAT_FAIR_USE_DAILY };

  try {
    const ref = db.collection('chatQuota').doc(uid);
    const doc = await ref.get();
    const today = todayUTC();

    if (!doc.exists || doc.data().date !== today) {
      return { count: 0, remaining: CHAT_FAIR_USE_DAILY, date: today };
    }
    const count = doc.data().count || 0;
    return { count, remaining: Math.max(0, CHAT_FAIR_USE_DAILY - count), date: today };
  } catch (e) {
    console.error('[chat/quota] read error:', e.message);
    return { count: 0, remaining: CHAT_FAIR_USE_DAILY };
  }
}

/**
 * Increment today's usage by 1.
 * Resets the counter automatically when the date changes.
 */
async function incrementQuota(uid) {
  const db = getDb();
  if (!db || !uid) return { count: 1, remaining: CHAT_FAIR_USE_DAILY - 1 };

  try {
    const ref = db.collection('chatQuota').doc(uid);
    const today = todayUTC();

    // Use a transaction so concurrent requests don't double-count
    const result = await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      let count = 1;
      if (doc.exists && doc.data().date === today) {
        count = (doc.data().count || 0) + 1;
      }
      tx.set(ref, { uid, date: today, count, updatedAt: new Date().toISOString() });
      return count;
    });

    return { count: result, remaining: Math.max(0, CHAT_FAIR_USE_DAILY - result) };
  } catch (e) {
    console.error('[chat/quota] increment error:', e.message);
    return { count: 1, remaining: CHAT_FAIR_USE_DAILY - 1 };
  }
}

// ─── GET /quota ─────────────────────────────────────────────────────────────

router.get('/quota', phoneAuth, async (req, res) => {
  const uid = req.user?.uid || null;
  const quota = await getQuota(uid);
  res.json({
    success: true,
    dailyLimit: CHAT_FAIR_USE_DAILY,
    used: quota.count,
    remaining: quota.remaining,
    date: quota.date || todayUTC(),
    resetsAt: todayUTC() + 'T18:30:00Z', // midnight SLT = 18:30 UTC
  });
});

/**
 * POST /api/chat/ask
 *
 * Body:
 * {
 *   message: "Is next Tuesday a good day to sign a contract?",
 *   birthDate: "1995-03-15T08:30:00Z",  // optional
 *   birthLat: 6.9271,                     // optional
 *   birthLng: 79.8612,                    // optional
 *   language: "en",                       // en, si, ta, singlish
 *   chatHistory: []                       // optional previous messages
 * }
 */
router.post('/ask', phoneAuth, requireSubscription, aiUserLimiter, distributedAiUserLimiter, budgetGuard('chat'), async (req, res) => {
  try {
    const { message, birthDate, birthLat, birthLng, language, chatHistory } = req.body;
    const uid = req.user?.uid || null;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required.',
        example: {
          message: 'Is next Tuesday a good day to sign a contract?',
          language: 'en',
        },
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
    }

    // ── Daily quota check ──────────────────────────────────────────────
    // Only enforce when Firestore is available and user is authenticated
    const db = getDb();
    if (db && uid) {
      const quota = await getQuota(uid);
      if (quota.remaining <= 0) {
        // Fair-use framing (not a harsh quota) — resets at midnight SLT.
        const fairUseMsg = {
          si: 'ඔබ අද බොහෝ ප්‍රශ්න ඇසුවා 🌙 නැකැත්කරු හැමෝටම වේගවත්ව තබා ගැනීමට මෙය සාධාරණ භාවිත සීමාවකි. ඔබේ ප්‍රශ්න මධ්‍යම රාත්‍රියේ නැවත විවෘත වෙනවා.',
          ta: 'இன்று நீங்கள் நிறைய கேள்விகள் கேட்டீர்கள் 🌙 அனைவருக்கும் சேவையை வேகமாக வைத்திருக்க இது நியாயமான பயன்பாட்டு வரம்பு. உங்கள் கேள்விகள் நள்ளிரவில் மீண்டும் திறக்கும்.',
          en: "You've asked a lot today 🌙 — this is our fair-use limit, so the astrologer stays fast for everyone. Your questions reopen at midnight.",
        };
        return res.status(429).json({
          error: fairUseMsg[language] || fairUseMsg.en,
          code: 'FAIR_USE_LIMIT',
          dailyLimit: CHAT_FAIR_USE_DAILY,
          remaining: 0,
          resetsAt: todayUTC() + 'T18:30:00Z',
          limitReached: true,
        });
      }
    }

    const result = await chat(message, {
      birthDate: birthDate ? new Date(birthDate) : null,
      birthLat,
      birthLng,
      language: language || 'en',
      chatHistory: chatHistory || [],
      maxTokens: 4096,
      // A single chat Q&A does not need 4096 reasoning tokens (which bill as
      // output). 1024 keeps answer quality for date/muhurtha questions while
      // cutting per-message thinking cost ~75%. Tune via env.
      thinkingBudget: Number(process.env.GEMINI_CHAT_THINKING_BUDGET) || 1024,
    });

    // Increment quota AFTER successful response
    let quotaAfter = { remaining: CHAT_FAIR_USE_DAILY - 1 };
    if (db && uid) {
      quotaAfter = await incrementQuota(uid);
    }

    // Track AI cost
    trackCost('chat', uid, {
      inputTokens: result.usage?.promptTokenCount || result.usage?.prompt_tokens || 0,
      outputTokens: result.usage?.candidatesTokenCount || result.usage?.completion_tokens || 0,
      thinkingTokens: result.usage?.thoughtsTokenCount || 0,
      model: result.model,
    });

    res.json({
      success: true,
      data: result,
      remaining: quotaAfter.remaining,
      dailyLimit: CHAT_FAIR_USE_DAILY,
    });
  } catch (error) {
    console.error('AI Chat error:', error);

    if (error.message?.includes('API key') || error.message?.includes('auth') || error.message?.includes('denied access') || error.message?.includes('permission')) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable.',
        message: 'AI provider access issue. Please check your API key and project status.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    res.status(500).json({
      error: 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
