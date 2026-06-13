import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app       = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const STATE_DOC = doc(firestore, 'league', 'state');

export const db = {
  async load() {
    try {
      const snap = await getDoc(STATE_DOC);
      return snap.exists() ? snap.data() : null;
    } catch (e) {
      console.error('[Firebase] load failed:', e);
      return null;
    }
  },

  async save(state) {
    try {
      await setDoc(STATE_DOC, state);
      return true;
    } catch (e) {
      console.error('[Firebase] save failed:', e);
      return false;
    }
  },

  subscribe(callback) {
    try {
      const unsub = onSnapshot(STATE_DOC, snap => {
        if (snap.exists()) callback(snap.data());
      });
      return unsub;
    } catch (e) {
      console.error('[Firebase] subscribe failed:', e);
      return () => {};
    }
  },
};
