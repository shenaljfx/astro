/**
 * AI Chat Routes - "Ask the Astrologer"
 *
 * Endpoints:
 * - POST /api/chat/ask        — Send a message (enforces daily quota)
 * - GET  /api/chat/quota      — Get remaining questions for today
 */

const express = require('express');
const router = express.Router();
const { chat } = require('../engine/chat');
const { phoneAuth } = require('../middleware/subscription');
const { getDb, COLLECTIONS } = require('../config/firebase');
const { trackCost } = require('../services/costTracker');

const DAILY_LIMIT = 5;

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
  if (!db || !uid) return { count: 0, remaining: DAILY_LIMIT };

  try {
    const ref = db.collection('chatQuota').doc(uid);
    const doc = await ref.get();
    const today = todayUTC();

    if (!doc.exists || doc.data().date !== today) {
      return { count: 0, remaining: DAILY_LIMIT, date: today };
    }
    const count = doc.data().count || 0;
    return { count, remaining: Math.max(0, DAILY_LIMIT - count), date: today };
  } catch (e) {
    console.error('[chat/quota] read error:', e.message);
    return { count: 0, remaining: DAILY_LIMIT };
  }
}

/**
 * Increment today's usage by 1.
 * Resets the counter automatically when the date changes.
 */
async function incrementQuota(uid) {
  const db = getDb();
  if (!db || !uid) return { count: 1, remaining: DAILY_LIMIT - 1 };

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

    return { count: result, remaining: Math.max(0, DAILY_LIMIT - result) };
  } catch (e) {
    console.error('[chat/quota] increment error:', e.message);
    return { count: 1, remaining: DAILY_LIMIT - 1 };
  }
}

// ─── GET /quota ─────────────────────────────────────────────────────────────

router.get('/quota', phoneAuth, async (req, res) => {
  const uid = req.user?.uid || null;
  const quota = await getQuota(uid);
  res.json({
    success: true,
    dailyLimit: DAILY_LIMIT,
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
router.post('/ask', phoneAuth, async (req, res) => {
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
        return res.status(429).json({
          error: 'Daily question limit reached.',
          dailyLimit: DAILY_LIMIT,
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
    });

    // Increment quota AFTER successful response
    let quotaAfter = { remaining: DAILY_LIMIT - 1 };
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
      dailyLimit: DAILY_LIMIT,
    });
  } catch (error) {
    console.error('AI Chat error:', error);

    if (error.message?.includes('API key') || error.message?.includes('auth')) {
      return res.status(503).json({
        error: 'AI service temporarily unavailable.',
        message: 'Please configure your AI API key in the server .env file.',
      });
    }

    res.status(500).json({
      error: 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
