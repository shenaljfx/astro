/**
 * screenAnalytics — turn app screen-view pings into a behavior heatmap that
 * shows where users spend time and where they drop off ("lose interest").
 *
 * Cost model: the client batches screen pings and posts them occasionally; the
 * whole batch collapses into a SINGLE incremented write to screenStats/{date}
 * (a map of per-screen counters), so ingestion is ~1 Firestore write per batch
 * regardless of how many screens/events it covers. The admin read is N daily
 * docs (one per day in range). Cheap at both ends.
 *
 * These helpers are pure so the aggregation math is unit-tested.
 */

/** Safe, readable field-path key for a screen name. */
function sanitizeScreen(name) {
  return String(name || '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'unknown';
}

/**
 * Collapse a batch of raw screen events into per-screen totals.
 * event: { screen, ms?, exit? }  →  { [key]: { views, totalMs, exits } }
 */
function aggregateBatch(events) {
  const out = {};
  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !e.screen) continue;
    const key = sanitizeScreen(e.screen);
    const ms = Math.max(0, Math.min(Number(e.ms) || 0, 2 * 60 * 60 * 1000)); // clamp 0..2h
    const bucket = out[key] || (out[key] = { views: 0, totalMs: 0, exits: 0 });
    bucket.views += 1;
    bucket.totalMs += ms;
    if (e.exit) bucket.exits += 1;
  }
  return out;
}

/**
 * Merge daily screenStats docs into a per-screen behavior summary.
 * doc shape: { screens: { key: { views, totalMs, exits } } }
 * Returns screens sorted by views desc, plus maxima for heatmap normalization.
 */
function mergeDailyDocs(docs) {
  const acc = {};
  for (const doc of docs || []) {
    const screens = (doc && doc.screens) || {};
    for (const [key, s] of Object.entries(screens)) {
      const a = acc[key] || (acc[key] = { views: 0, totalMs: 0, exits: 0 });
      a.views += Number(s.views) || 0;
      a.totalMs += Number(s.totalMs) || 0;
      a.exits += Number(s.exits) || 0;
    }
  }

  const screens = Object.entries(acc).map(([screen, a]) => ({
    screen,
    views: a.views,
    avgMs: a.views ? Math.round(a.totalMs / a.views) : 0,
    exits: a.exits,
    exitRate: a.views ? +(a.exits / a.views).toFixed(3) : 0,
  })).sort((x, y) => y.views - x.views);

  const maxViews = screens.reduce((m, s) => Math.max(m, s.views), 0);
  const maxAvgMs = screens.reduce((m, s) => Math.max(m, s.avgMs), 0);
  const totalViews = screens.reduce((m, s) => m + s.views, 0);

  return { screens, maxViews, maxAvgMs, totalViews };
}

module.exports = { sanitizeScreen, aggregateBatch, mergeDailyDocs };
