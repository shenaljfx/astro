/**
 * Precompute chart-feature base rates for the rarity engine.
 *
 * Usage:  node scripts/precomputeBaseRates.js [sampleSize]
 *
 * Writes src/engine/data/baseRates.json. Re-run whenever the calculation
 * engine changes in a way that affects placements (ayanamsha, node type, etc.).
 */

const fs = require('fs');
const path = require('path');
const { computeBaseRates, DATA_PATH } = require('../src/engine/rarity');

const sampleSize = parseInt(process.argv[2], 10) || 8000;

console.log(`[precompute] sampling ${sampleSize} charts …`);
const t0 = Date.now();
const result = computeBaseRates(sampleSize);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
fs.writeFileSync(DATA_PATH, JSON.stringify(result));

const featureCount = Object.keys(result.rates).length;
console.log(`[precompute] done in ${elapsed}s — ${result.sampleSize} charts, ${featureCount} distinct features → ${DATA_PATH}`);
