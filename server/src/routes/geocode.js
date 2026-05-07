const express = require('express');
const router = express.Router();

// Simple in-memory cache — avoids hitting Nominatim repeatedly for the same query
const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE = 500;

function pruneCache() {
  if (cache.size <= MAX_CACHE) return;
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now - val.ts > CACHE_TTL) cache.delete(key);
  }
  // If still over limit, drop oldest half
  if (cache.size > MAX_CACHE) {
    const entries = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    entries.slice(0, Math.floor(entries.length / 2)).forEach(([k]) => cache.delete(k));
  }
}

/**
 * GET /api/geocode/search?q=<query>&limit=8
 * Proxies Nominatim geocoding for mobile clients.
 */
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 15);
    const cacheKey = q.toLowerCase() + '|' + limit;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json({ success: true, data: cached.results, cached: true });
    }

    const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(q) + '&limit=' + limit + '&addressdetails=1&accept-language=en';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'GrahacharaApp/1.0 (astrology app; contact@grahachara.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      console.warn('[Geocode] Nominatim returned HTTP', resp.status);
      return res.json({ success: true, data: [] });
    }

    const data = await resp.json();
    if (!Array.isArray(data)) {
      return res.json({ success: true, data: [] });
    }

    const results = [];
    const seen = {};

    for (const item of data) {
      const addr = item.address || {};
      const name = addr.city || addr.town || addr.village || addr.state || (item.display_name || '').split(',')[0];
      const country = addr.country || '';
      const countryCode = (addr.country_code || '').toUpperCase();
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      if (!name || isNaN(lat) || isNaN(lng)) continue;

      const key = name + '|' + country;
      if (seen[key]) continue;
      seen[key] = true;

      results.push({ name, displayName: item.display_name, country, countryCode, lat, lng });
    }

    // Cache results
    pruneCache();
    cache.set(cacheKey, { results, ts: Date.now() });

    res.json({ success: true, data: results });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Geocode] Nominatim request timed out');
    } else {
      console.warn('[Geocode] Error:', err.message);
    }
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
