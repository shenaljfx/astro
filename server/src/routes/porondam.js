/**
 * Porondam (Marriage Compatibility) API Routes
 * 
 * Endpoints:
 * - POST /api/porondam/check     - Calculate compatibility between two birth charts
 * - POST /api/porondam/vibe-link - Generate a shareable compatibility link
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { calculatePorondam } = require('../engine/porondam');

// In-memory store for vibe-check links (use Redis/DB in production)
const vibeLinks = new Map();

/**
 * POST /api/porondam/check
 * 
 * Body:
 * {
 *   bride: { birthDate: "1995-03-15T08:30:00Z", lat: 6.9271, lng: 79.8612 },
 *   groom: { birthDate: "1993-07-22T14:00:00Z", lat: 7.2906, lng: 80.6337 }
 * }
 */
router.post('/check', (req, res) => {
  try {
    const { bride, groom } = req.body;

    if (!bride?.birthDate || !groom?.birthDate) {
      return res.status(400).json({
        error: 'Both bride and groom birth dates are required.',
        example: {
          bride: { birthDate: '1995-03-15T08:30:00Z', lat: 6.9271, lng: 79.8612 },
          groom: { birthDate: '1993-07-22T14:00:00Z', lat: 7.2906, lng: 80.6337 },
        },
      });
    }

    const brideBirthDate = new Date(bride.birthDate);
    const groomBirthDate = new Date(groom.birthDate);

    if (isNaN(brideBirthDate.getTime()) || isNaN(groomBirthDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO 8601.' });
    }

    const result = calculatePorondam(brideBirthDate, groomBirthDate);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error calculating Porondam:', error);
    res.status(500).json({ error: 'Failed to calculate Porondam', details: error.message });
  }
});

/**
 * POST /api/porondam/vibe-link
 * Generate a shareable "Vibe Check" link for WhatsApp
 * 
 * Body:
 * {
 *   senderName: "Kasun",
 *   senderBirthDate: "1995-03-15T08:30:00Z",
 *   senderLat: 6.9271,
 *   senderLng: 79.8612
 * }
 */
router.post('/vibe-link', (req, res) => {
  try {
    const { senderName, senderBirthDate, senderLat, senderLng } = req.body;

    if (!senderName || !senderBirthDate) {
      return res.status(400).json({
        error: 'Sender name and birth date are required.',
      });
    }

    const linkId = uuidv4().split('-')[0]; // Short unique ID
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    vibeLinks.set(linkId, {
      senderName,
      senderBirthDate,
      senderLat: senderLat || 6.9271,
      senderLng: senderLng || 79.8612,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    });

    const shareUrl = `https://nakath.ai/vibe/${linkId}`;
    const whatsappMessage = encodeURIComponent(
      `✨ ${senderName} wants to check your astrological compatibility!\n\n` +
      `🔮 Tap to see if the stars align:\n${shareUrl}\n\n` +
      `Powered by Nakath AI 🪐`
    );

    res.json({
      success: true,
      data: {
        linkId,
        shareUrl,
        whatsappUrl: `https://wa.me/?text=${whatsappMessage}`,
        expiresAt: expiresAt.toISOString(),
        message: {
          en: 'Share this link with your partner to check compatibility!',
          si: 'ගැළපීම පරීක්ෂා කිරීමට මෙම සබැඳිය ඔබේ සහකරු/සහකාරිය සමග බෙදාගන්න!',
          ta: 'பொருத்தத்தை சோதிக்க இந்த இணைப்பை உங்கள் துணையுடன் பகிரவும்!',
        },
      },
    });
  } catch (error) {
    console.error('Error generating vibe link:', error);
    res.status(500).json({ error: 'Failed to generate vibe link', details: error.message });
  }
});

/**
 * POST /api/porondam/vibe-check/:linkId
 * Complete the vibe check with the receiver's details
 * 
 * Body:
 * {
 *   receiverName: "Sachini",
 *   receiverBirthDate: "1996-08-20T10:00:00Z"
 * }
 */
router.post('/vibe-check/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const { receiverName, receiverBirthDate } = req.body;

    const vibeLink = vibeLinks.get(linkId);

    if (!vibeLink) {
      return res.status(404).json({ error: 'Vibe check link not found or expired.' });
    }

    if (new Date(vibeLink.expiresAt) < new Date()) {
      vibeLinks.delete(linkId);
      return res.status(410).json({ error: 'This vibe check link has expired.' });
    }

    if (!receiverName || !receiverBirthDate) {
      return res.status(400).json({ error: 'Receiver name and birth date are required.' });
    }

    const result = calculatePorondam(
      new Date(vibeLink.senderBirthDate),
      new Date(receiverBirthDate)
    );

    // Mark link as used
    vibeLink.used = true;
    vibeLink.receiverName = receiverName;

    res.json({
      success: true,
      data: {
        sender: vibeLink.senderName,
        receiver: receiverName,
        compatibility: result,
      },
    });
  } catch (error) {
    console.error('Error processing vibe check:', error);
    res.status(500).json({ error: 'Failed to process vibe check', details: error.message });
  }
});

module.exports = router;
