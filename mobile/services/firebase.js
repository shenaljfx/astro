/**
 * Firebase Configuration for Mobile App
 * 
 * Auth: Google Sign-In via Firebase Auth (getAuth → signInWithCredential)
 * Payment/subscription: RevenueCat (in-app purchases)
 * Database: All data flows through the backend API at /api/auth/*
 * 
 * Setup:
 * 1. Firebase Console → Project Settings → General → Your apps → Web
 * 2. Copy apiKey, appId etc. below
 * 3. Enable Google Sign-In in Firebase Console → Authentication → Sign-in method
 * 4. Add your SHA-1 fingerprint for Android in Firebase Console → Project Settings
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth as _getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';

// Firebase project config — reads from EXPO_PUBLIC_FIREBASE_* env vars (.env file)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBzjEAvmO2Rxxfga2qITkj42JnOE-peqsY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "nakathai-6c5b7.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "nakathai-6c5b7",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "nakathai-6c5b7.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "279712940419",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:279712940419:web:ba7830108e1354621836b6",
};

if (!firebaseConfig.apiKey) {
  console.warn('⚠️ EXPO_PUBLIC_FIREBASE_API_KEY is not set — check your .env file');
}

// Initialize Firebase (only once, gracefully)
let app = null;
let firestore = null;
let auth = null;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  firestore = getFirestore(app);
  auth = _getAuth(app);
} catch (err) {
  console.warn('⚠️ Firebase init failed:', err.message);
}

// Configure native Google Sign-In (Android/iOS)
// ⚠️ REQUIRED: Set your web client ID from Firebase Console →
//   Authentication → Sign-in method → Google → Web client ID
// On Android this is auto-read from google-services.json if you omit webClientId.
try {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: '279712940419-rohbq14otfq57sjmn7vm775co13cjipa.apps.googleusercontent.com',
    offlineAccess: true,
  });
} catch (e) {
  // Google Sign-In native module not available (web platform or not installed)
  console.log('ℹ️ Native Google Sign-In not available (web mode or SDK not installed)');
}

export { app, firestore, auth, GoogleAuthProvider, signInWithPopup, signInWithCredential };
export default app;
