#!/usr/bin/env node

const { spawnSync } = require('child_process');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || requiredEnv('FIREBASE_PROJECT_ID');
const source = requiredEnv('FIRESTORE_RESTORE_SOURCE');
const confirmed = process.env.CONFIRM_FIRESTORE_RESTORE === 'YES';
const collectionIds = process.env.FIRESTORE_RESTORE_COLLECTION_IDS;

if (!confirmed) {
  console.error('Refusing to restore without CONFIRM_FIRESTORE_RESTORE=YES. Restore overwrites matching documents.');
  process.exit(1);
}

const args = ['firestore', 'import', source, '--project', project];
if (collectionIds) args.push('--collection-ids', collectionIds);

console.log(`[Firestore Restore] Importing ${source} into ${project}`);
const result = spawnSync('gcloud', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('[Firestore Restore] Failed to start gcloud:', result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
