import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence,
} from 'firebase/auth';

const cfg = window.ADMIN_FIREBASE_CONFIG;
if (!cfg) throw new Error('firebase-config.js missing');

const app = initializeApp(cfg);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export const signOut = () => fbSignOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const getToken = () => (auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null));
