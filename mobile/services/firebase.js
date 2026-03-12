/**
 * Firebase Configuration for Mobile App
 * 
 * NOTE: This app primarily uses backend JWT auth (phone OTP via Ideamart).
 * Firebase JS SDK on mobile is kept for potential future client-side features
 * (e.g., push notifications via FCM, analytics).
 * 
 * All auth & data flows through the backend API at /api/auth/*
 * 
 * To get web app config:
 * 1. Go to Firebase Console → Project Settings → General
 * 2. Under "Your apps", click "Add app" → Web (</>)
 * 3. Copy the config values below
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase project: nakathai-6c5b7
// ⚠️ Fill in apiKey and appId from Firebase Console → Project Settings → Your apps → Web
const firebaseConfig = {
  apiKey: "***REMOVED***",
  authDomain: "nakathai-6c5b7.firebaseapp.com",
  projectId: "nakathai-6c5b7",
  storageBucket: "nakathai-6c5b7.firebasestorage.app",
  messagingSenderId: "106386993267",
  appId: "1:106386993267:web:placeholder",
};

// Initialize Firebase (only once, gracefully)
let app = null;
let firestore = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  firestore = getFirestore(app);
} catch (err) {
  console.warn('⚠️ Firebase init skipped (not critical — using backend JWT auth):', err.message);
}

export { app, firestore };
export default app;
