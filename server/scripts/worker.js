#!/usr/bin/env node

const { initFirebase } = require('../src/config/firebase');
const { runWorkerOnce, startWorkerLoop } = require('../src/services/jobWorker');

initFirebase();

const once = process.argv.includes('--once');
const typesArg = process.argv.find(arg => arg.startsWith('--types='));
const types = typesArg ? typesArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : ['aiReport', 'weeklyLagna'];
const workerId = process.env.WORKER_ID || `worker-${process.pid}`;

if (once) {
  runWorkerOnce(workerId, types)
    .then(result => {
      if (result) console.log('[Worker] Processed job:', JSON.stringify({ jobId: result.jobId, status: result.status }));
      else console.log('[Worker] No queued jobs.');
      process.exit(0);
    })
    .catch(err => {
      console.error('[Worker] Failed:', err);
      process.exit(1);
    });
} else {
  console.log(`[Worker] Starting durable job worker ${workerId} for types: ${types.join(', ')}`);
  startWorkerLoop({ workerId, types });
}