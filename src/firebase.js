// ─── FIREBASE PLACEHOLDER ────────────────────────────────────────────────────
// Step 4: Replace this entire file with real Firebase config.
// Instructions will be provided when you set up the Firebase project.
//
// What to do:
//  1. Go to console.firebase.google.com
//  2. Create a new project called "wc26-fantasy"
//  3. Add a Web App, copy the firebaseConfig object
//  4. Replace the config below with your real values
//  5. Run: npm install firebase
//  6. Uncomment the real implementation below the placeholder

// ── PLACEHOLDER (localStorage-backed, single browser only) ───────────────────
// This keeps the app fully functional locally until Firebase is connected.

const STORAGE_KEY = 'wc26_fantasy_state';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('localStorage save failed:', e);
  }
}

export const db = {
  // Load full app state
  async load() {
    return loadState();
  },

  // Save full app state
  async save(state) {
    saveState(state);
    return true;
  },

  // Subscribe to changes (no-op in placeholder — real-time sync added with Firebase)
  subscribe(callback) {
    // In placeholder mode, no cross-browser sync.
    // Firebase will replace this with onSnapshot for real-time updates.
    return () => {}; // returns unsubscribe fn
  },
};

// ── REAL FIREBASE IMPLEMENTATION (uncomment in Step 4) ───────────────────────
/*
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY",
  authDomain:        "PASTE_YOUR_AUTH_DOMAIN",
  projectId:         "PASTE_YOUR_PROJECT_ID",
  storageBucket:     "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId:             "PASTE_YOUR_APP_ID",
};

const app       = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const STATE_DOC = doc(firestore, 'league', 'state');

export const db = {
  async load() {
    const snap = await getDoc(STATE_DOC);
    return snap.exists() ? snap.data() : null;
  },

  async save(state) {
    await setDoc(STATE_DOC, state);
    return true;
  },

  subscribe(callback) {
    const unsub = onSnapshot(STATE_DOC, snap => {
      if (snap.exists()) callback(snap.data());
    });
    return unsub;
  },
};
*/
