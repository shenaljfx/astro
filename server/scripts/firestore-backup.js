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
const bucket = requiredEnv('FIRESTORE_BACKUP_BUCKET').replace(/^gs:\/\//, '').replace(/\/+$/, '');
const prefix = (process.env.FIRESTORE_BACKUP_PREFIX || 'firestore').replace(/^\/+|\/+$/g, '');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = process.env.FIRESTORE_BACKUP_DESTINATION || `gs://${bucket}/${prefix}/${timestamp}`;
const collectionIds = process.env.FIRESTORE_BACKUP_COLLECTION_IDS;

const args = ['firestore', 'export', destination, '--project', project];
if (collectionIds) args.push('--collection-ids', collectionIds);

console.log(`[Firestore Backup] Exporting ${project} to ${destination}`);
const result = spawnSync('gcloud', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error('[Firestore Backup] Failed to start gcloud:', result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
