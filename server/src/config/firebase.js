/**
 * Firebase Admin SDK Configuration
 * 
 * Setup:
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate new private key"
 * 3. Save the file as server/firebase-service-account.json
 * 4. Or set FIREBASE_SERVICE_ACCOUNT env var with the JSON content
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let initialized = false;

function initFirebase() {
  if (initialized) return { db, auth };

  try {
    // Try loading service account from file first
    const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-service-account.json');
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // From environment variable (for deployment)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('   🔥 Firebase initialized from environment variable');
    } else if (fs.existsSync(serviceAccountPath)) {
      // From file (for local dev)
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('   🔥 Firebase initialized from service account file');
    } else {
      // No credentials — run without Firebase (for dev/testing)
      console.log('   ⚠️  Firebase: No credentials found. Running without database.');
      console.log('      To enable: add firebase-service-account.json to server/');
      initialized = true;
      return { db: null, auth: null };
    }

    db = admin.firestore();
    auth = admin.auth();
    initialized = true;

    // Firestore settings
    db.settings({ ignoreUndefinedProperties: true });

    console.log('   📦 Firestore database connected');
    return { db, auth };
  } catch (err) {
    console.error('   ❌ Firebase initialization error:', err.message);
    initialized = true;
    return { db: null, auth: null };
  }
}

function getDb() {
  if (!initialized) initFirebase();
  return db;
}

function getAuth() {
  if (!initialized) initFirebase();
  return auth;
}

// ─── Firestore Collections ─────────────────────────────────────
const COLLECTIONS = {
  USERS: 'users',
  REPORTS: 'reports',
  CHAT_SESSIONS: 'chatSessions',
  PORONDAM: 'porondamResults',
  NOTIFICATIONS: 'notifications',
};

module.exports = { initFirebase, getDb, getAuth, COLLECTIONS };
