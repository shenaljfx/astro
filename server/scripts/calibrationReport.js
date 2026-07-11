/**
 * PREDICTION CALIBRATION REPORT (Phase 3 tooling)
 * ================================================
 *
 * Aggregates user-confirmed prediction outcomes (predictionOutcomes
 * collection) into hit rates per domain, tier, and driver signal, so the
 * convergence-calendar weights (engine/convergenceCalendar.js WEIGHTS)
 * can be re-tuned against reality instead of hand-set intuition.
 *
 * Usage:  node scripts/calibrationReport.js
 * Output: hit-rate table + suggested attention flags. Read-only.
 *
 * Scoring: yes = 1, partial = 0.5, no = 0. A driver whose hit rate is
 * materially below the overall mean is over-weighted; above → raise it.
 */

require('dotenv').config();
const { initFirebase, getDb, COLLECTIONS } = require('../src/config/firebase');

function pct(n) { return `${Math.round(n * 100)}%`; }

async function main() {
  initFirebase();
  const db = getDb();
  if (!db) {
    console.error('Firestore unavailable — check credentials.');
    process.exit(1);
  }

  const snapshot = await db.collection(COLLECTIONS.PREDICTION_OUTCOMES).limit(5000).get();
  if (snapshot.empty) {
    console.log('No prediction outcomes recorded yet. The mobile check-in card feeds this collection.');
    return;
  }

  const rows = snapshot.docs.map(d => d.data());
  const score = (o) => (o.outcome === 'yes' ? 1 : o.outcome === 'partial' ? 0.5 : 0);

  const groups = (key, extract) => {
    const map = new Map();
    for (const r of rows) {
      for (const k of extract(r)) {
        if (!k) continue;
        const g = map.get(k) || { n: 0, sum: 0 };
        g.n += 1;
        g.sum += score(r);
        map.set(k, g);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].n - a[1].n);
  };

  const overall = rows.reduce((s, r) => s + score(r), 0) / rows.length;
  console.log(`\n═══ PREDICTION CALIBRATION — ${rows.length} outcomes ═══`);
  console.log(`Overall hit rate: ${pct(overall)}\n`);

  console.log('BY DOMAIN:');
  for (const [k, g] of groups('domain', r => [r.domain])) {
    console.log(`  ${k.padEnd(10)} n=${String(g.n).padStart(4)}  hit=${pct(g.sum / g.n)}`);
  }

  console.log('\nBY TIER:');
  for (const [k, g] of groups('tier', r => [r.tier])) {
    console.log(`  ${String(k).padEnd(10)} n=${String(g.n).padStart(4)}  hit=${pct(g.sum / g.n)}`);
  }

  console.log('\nBY DRIVER SIGNAL (convergenceCalendar WEIGHTS targets):');
  for (const [k, g] of groups('driver', r => r.drivers || [])) {
    const rate = g.sum / g.n;
    const flag = g.n >= 20 && rate < overall - 0.15 ? '  ⚠ over-weighted — reduce'
      : g.n >= 20 && rate > overall + 0.15 ? '  ★ under-weighted — raise'
      : '';
    console.log(`  ${k.padEnd(22)} n=${String(g.n).padStart(4)}  hit=${pct(rate)}${flag}`);
  }

  console.log('\nBY TYPE:');
  for (const [k, g] of groups('type', r => [r.type])) {
    console.log(`  ${String(k).padEnd(12)} n=${String(g.n).padStart(4)}  hit=${pct(g.sum / g.n)}`);
  }

  console.log('\nRule of thumb: adjust one WEIGHTS constant at a time (±25%), bump');
  console.log('AI_REPORT_ENGINE_VERSION, and re-run after the next outcome batch.\n');
}

main().catch(err => {
  console.error('Calibration report failed:', err.message);
  process.exit(1);
});
