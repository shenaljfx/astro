/**
 * AI Chat Routes - "Ask the Astrologer"
 * 
 * Endpoints:
 * - POST /api/chat/ask - Send a message to the AI astrologer
 */

const express = require('express');
const router = express.Router();
const { chat } = require('../engine/chat');

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
router.post('/ask', async (req, res) => {
  try {
    const { message, birthDate, birthLat, birthLng, language, chatHistory } = req.body;

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

    const result = await chat(message, {
      birthDate: birthDate ? new Date(birthDate) : null,
      birthLat,
      birthLng,
      language: language || 'en',
      chatHistory: chatHistory || [],
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI Chat error:', error);

    // Handle API key errors gracefully
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
