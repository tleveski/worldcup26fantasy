import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyBjpebarVAoZgYe3J7M5I9nAPS_7QpLTNA",
  authDomain:        "wc26-fantasy.firebaseapp.com",
  projectId:         "wc26-fantasy",
  storageBucket:     "wc26-fantasy.firebasestorage.app",
  messagingSenderId: "44533981101",
  appId:             "1:44533981101:web:47e6faf43437a76ea40b24",
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
