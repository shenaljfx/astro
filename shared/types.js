/**
 * Shared types for Nakath AI
 * Used by both server and mobile app
 */

/**
 * @typedef {Object} Location
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 */

/**
 * @typedef {'en' | 'si' | 'ta' | 'singlish'} Language
 */

/**
 * @typedef {Object} Nakshatra
 * @property {number} id
 * @property {string} name
 * @property {string} sinhala
 * @property {string} tamil
 * @property {string} lord
 * @property {number} pada
 */

/**
 * @typedef {Object} Rashi
 * @property {number} id
 * @property {string} name
 * @property {string} english
 * @property {string} sinhala
 * @property {string} tamil
 * @property {string} lord
 */

/**
 * @typedef {Object} RahuKalaya
 * @property {string} start
 * @property {string} end
 * @property {string} warning
 */

/**
 * @typedef {Object} PorondamResult
 * @property {number} totalScore
 * @property {number} maxPossibleScore
 * @property {number} percentage
 * @property {string} rating
 * @property {string} ratingEmoji
 * @property {Array} factors
 * @property {Array} doshas
 */

/**
 * API Endpoints
 */
const API_ENDPOINTS = {
  HEALTH: '/api/health',
  NAKATH_DAILY: '/api/nakath/daily',
  NAKATH_RAHU_KALAYA: '/api/nakath/rahu-kalaya',
  NAKATH_PANCHANGA: '/api/nakath/panchanga',
  PORONDAM_CHECK: '/api/porondam/check',
  PORONDAM_VIBE_LINK: '/api/porondam/vibe-link',
  PORONDAM_VIBE_CHECK: '/api/porondam/vibe-check',
  CHAT_ASK: '/api/chat/ask',
  HOROSCOPE_DAILY: '/api/horoscope/daily',
  HOROSCOPE_BIRTH_CHART: '/api/horoscope/birth-chart',
  SHARE_WEEKLY_CARD: '/api/share/weekly-card',
  SHARE_PERSONALITY: '/api/share/personality',
};

module.exports = { API_ENDPOINTS };
