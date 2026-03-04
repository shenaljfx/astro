/**
 * Share Routes - Viral Loop Mechanisms
 * 
 * Endpoints:
 * - POST /api/share/weekly-card  - Generate shareable weekly forecast card data
 * - POST /api/share/personality  - Generate shareable personality summary
 */

const express = require('express');
const router = express.Router();
const { getPanchanga, getNakshatra, getRashi, toSidereal, getMoonLongitude, getDailyNakath, RASHIS } = require('../engine/astrology');

/**
 * POST /api/share/weekly-card
 * Generate data for a shareable weekly forecast card
 * 
 * Body:
 * {
 *   birthDate: "1995-03-15T08:30:00Z",
 *   name: "Kasun"
 * }
 */
router.post('/weekly-card', (req, res) => {
  try {
    const { birthDate, name } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date is required.' });
    }

    const date = new Date(birthDate);
    const moonSidereal = toSidereal(getMoonLongitude(date), date);
    const rashi = getRashi(moonSidereal);
    const nakshatra = getNakshatra(moonSidereal);

    // Generate 7-day forecast data
    const today = new Date();
    const weekForecast = [];

    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);

      const panchanga = getPanchanga(forecastDate);
      const moonDistance = ((panchanga.moonSign.id - rashi.id + 12) % 12) + 1;

      const favorableHouses = [1, 3, 5, 7, 9, 10, 11];
      const luck = favorableHouses.includes(moonDistance) ? 'good' : 'challenging';

      weekForecast.push({
        date: forecastDate.toISOString().split('T')[0],
        dayName: forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
        moonTransit: panchanga.moonSign.english,
        luck,
        score: favorableHouses.includes(moonDistance)
          ? Math.floor(Math.random() * 3) + 7
          : Math.floor(Math.random() * 4) + 3,
      });
    }

    res.json({
      success: true,
      data: {
        cardData: {
          name: name || 'Star Seeker',
          sign: {
            vedic: rashi.name,
            english: rashi.english,
            sinhala: rashi.sinhala,
            tamil: rashi.tamil,
            symbol: getZodiacEmoji(rashi.english),
          },
          nakshatra: nakshatra.name,
          weekOf: today.toISOString().split('T')[0],
          forecast: weekForecast,
          overallWeekScore: Math.round(weekForecast.reduce((s, d) => s + d.score, 0) / 7),
        },
        shareText: {
          en: `✨ My weekly cosmic forecast from Nakath AI 🪐\n${rashi.english} (${rashi.sinhala})\nOverall: ${Math.round(weekForecast.reduce((s, d) => s + d.score, 0) / 7)}/10\n\nDownload Nakath AI to check yours!`,
          si: `✨ මගේ සතිපතා කේන්ද්‍ර අනාවැකිය - Nakath AI 🪐\n${rashi.sinhala} ලග්නය\nසමස්ත ලකුණු: ${Math.round(weekForecast.reduce((s, d) => s + d.score, 0) / 7)}/10\n\nඔබගේ අනාවැකිය බලන්න Nakath AI download කරන්න!`,
        },
      },
    });
  } catch (error) {
    console.error('Error generating weekly card:', error);
    res.status(500).json({ error: 'Failed to generate weekly card', details: error.message });
  }
});

/**
 * POST /api/share/personality
 * Generate shareable personality traits summary
 */
router.post('/personality', (req, res) => {
  try {
    const { birthDate, name } = req.body;

    if (!birthDate) {
      return res.status(400).json({ error: 'Birth date is required.' });
    }

    const date = new Date(birthDate);
    const moonSidereal = toSidereal(getMoonLongitude(date), date);
    const rashi = getRashi(moonSidereal);
    const nakshatra = getNakshatra(moonSidereal);

    const PERSONALITY_DATA = {
      'Mesha': {
        emoji: '🔥',
        element: 'Fire',
        strengths: ['Natural leader', 'Courageous', 'Energetic', 'Adventurous'],
        challenges: ['Impulsive', 'Short-tempered', 'Impatient'],
        bestMatch: 'Simha (Leo)',
        luckyDay: 'Tuesday',
        luckyGem: 'Red Coral (රතු පබළු)',
      },
      'Vrishabha': {
        emoji: '🌍',
        element: 'Earth',
        strengths: ['Reliable', 'Patient', 'Devoted', 'Artistic'],
        challenges: ['Stubborn', 'Possessive', 'Materialistic'],
        bestMatch: 'Kanya (Virgo)',
        luckyDay: 'Friday',
        luckyGem: 'Diamond (දියමන්ති)',
      },
      'Mithuna': {
        emoji: '💨',
        element: 'Air',
        strengths: ['Versatile', 'Communicative', 'Quick-witted', 'Social'],
        challenges: ['Restless', 'Indecisive', 'Superficial'],
        bestMatch: 'Tula (Libra)',
        luckyDay: 'Wednesday',
        luckyGem: 'Emerald (මරකත)',
      },
      'Kataka': {
        emoji: '💧',
        element: 'Water',
        strengths: ['Intuitive', 'Caring', 'Protective', 'Loyal'],
        challenges: ['Moody', 'Clingy', 'Over-emotional'],
        bestMatch: 'Vrischika (Scorpio)',
        luckyDay: 'Monday',
        luckyGem: 'Pearl (මුතු)',
      },
      'Simha': {
        emoji: '🔥',
        element: 'Fire',
        strengths: ['Confident', 'Generous', 'Warm-hearted', 'Charismatic'],
        challenges: ['Proud', 'Dominating', 'Attention-seeking'],
        bestMatch: 'Dhanus (Sagittarius)',
        luckyDay: 'Sunday',
        luckyGem: 'Ruby (මාණික්‍ය)',
      },
      'Kanya': {
        emoji: '🌍',
        element: 'Earth',
        strengths: ['Analytical', 'Practical', 'Helpful', 'Detail-oriented'],
        challenges: ['Critical', 'Worrier', 'Perfectionist'],
        bestMatch: 'Vrishabha (Taurus)',
        luckyDay: 'Wednesday',
        luckyGem: 'Emerald (මරකත)',
      },
      'Tula': {
        emoji: '💨',
        element: 'Air',
        strengths: ['Diplomatic', 'Fair-minded', 'Social', 'Graceful'],
        challenges: ['Indecisive', 'Avoids confrontation', 'Self-pitying'],
        bestMatch: 'Mithuna (Gemini)',
        luckyDay: 'Friday',
        luckyGem: 'Diamond (දියමන්ති)',
      },
      'Vrischika': {
        emoji: '💧',
        element: 'Water',
        strengths: ['Passionate', 'Resourceful', 'Determined', 'Brave'],
        challenges: ['Jealous', 'Secretive', 'Vindictive'],
        bestMatch: 'Kataka (Cancer)',
        luckyDay: 'Tuesday',
        luckyGem: 'Red Coral (රතු පබළු)',
      },
      'Dhanus': {
        emoji: '🔥',
        element: 'Fire',
        strengths: ['Optimistic', 'Philosophical', 'Adventurous', 'Honest'],
        challenges: ['Careless', 'Tactless', 'Over-promising'],
        bestMatch: 'Simha (Leo)',
        luckyDay: 'Thursday',
        luckyGem: 'Yellow Sapphire (පුෂ්පරාග)',
      },
      'Makara': {
        emoji: '🌍',
        element: 'Earth',
        strengths: ['Disciplined', 'Responsible', 'Ambitious', 'Patient'],
        challenges: ['Reserved', 'Pessimistic', 'Rigid'],
        bestMatch: 'Kanya (Virgo)',
        luckyDay: 'Saturday',
        luckyGem: 'Blue Sapphire (නිල් මැණික්)',
      },
      'Kumbha': {
        emoji: '💨',
        element: 'Air',
        strengths: ['Progressive', 'Original', 'Humanitarian', 'Independent'],
        challenges: ['Detached', 'Unpredictable', 'Stubborn'],
        bestMatch: 'Mithuna (Gemini)',
        luckyDay: 'Saturday',
        luckyGem: 'Blue Sapphire (නිල් මැණික්)',
      },
      'Meena': {
        emoji: '💧',
        element: 'Water',
        strengths: ['Intuitive', 'Compassionate', 'Artistic', 'Gentle'],
        challenges: ['Escapist', 'Over-trusting', 'Easily influenced'],
        bestMatch: 'Kataka (Cancer)',
        luckyDay: 'Thursday',
        luckyGem: 'Yellow Sapphire (පුෂ්පරාග)',
      },
    };

    const personality = PERSONALITY_DATA[rashi.name] || PERSONALITY_DATA['Mesha'];

    res.json({
      success: true,
      data: {
        name: name || 'Star Seeker',
        sign: {
          vedic: rashi.name,
          english: rashi.english,
          sinhala: rashi.sinhala,
          tamil: rashi.tamil,
        },
        nakshatra: {
          name: nakshatra.name,
          sinhala: nakshatra.sinhala,
          tamil: nakshatra.tamil,
          pada: nakshatra.pada,
          lord: nakshatra.lord,
        },
        personality,
        shareText: `${personality.emoji} I'm a ${rashi.english} (${rashi.sinhala}) with ${nakshatra.name} Nakshatra!\n\nStrengths: ${personality.strengths.join(', ')}\n\nFind your cosmic identity on Nakath AI 🪐✨`,
      },
    });
  } catch (error) {
    console.error('Error generating personality:', error);
    res.status(500).json({ error: 'Failed to generate personality data', details: error.message });
  }
});

function getZodiacEmoji(sign) {
  const emojis = {
    'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
    'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
    'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓',
  };
  return emojis[sign] || '🌟';
}

module.exports = router;
