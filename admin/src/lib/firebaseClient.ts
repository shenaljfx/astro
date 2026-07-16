'use client';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence, type User,
} from 'firebase/auth';

// Same Firebase project as the mobile app + admin dashboard (public identifiers).
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBCp8Ij7IwJKPeuAj3Af7otWd4HaUj6Pxs',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'nakathai-6c5b7.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nakathai-6c5b7',
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export function signIn() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, p);
}
export const signOutUser = () => fbSignOut(auth);
export const watchAuth = (cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);
