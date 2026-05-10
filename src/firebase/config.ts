import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set as fbSet, get as fbGet } from 'firebase/database';
import type { SharedState } from '@/types';

/* ============================================================
   FIREBASE CONFIG
   Replace with your actual Firebase project credentials.
   ============================================================ */
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxx',
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getDatabase> | null = null;

export function initFirebase() {
  if (app) return db!;
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    return db;
  } catch (e) {
    console.warn('[Firebase] Init failed — running in offline mode:', e);
    return null;
  }
}

export function getDb() {
  return db;
}

/* ============================================================
   REALTIME SYNC HELPERS
   ============================================================ */
const RESTAURANT_ID = 'chef_osman_01';

export function getSharedRef() {
  const database = getDb();
  if (!database) return null;
  return ref(database, `shared/${RESTAURANT_ID}`);
}

export function subscribeShared(callback: (data: SharedState) => void): (() => void) | null {
  const sharedRef = getSharedRef();
  if (!sharedRef) return null;
  const unsub = onValue(sharedRef, (snapshot) => {
    const val = snapshot.val();
    if (val) callback(val as SharedState);
  });
  return unsub;
}

export async function pushShared(data: SharedState): Promise<void> {
  const sharedRef = getSharedRef();
  if (!sharedRef) {
    console.warn('[Firebase] Cannot push — no connection');
    return;
  }
  try {
    await fbSet(sharedRef, data);
  } catch (e) {
    console.warn('[Firebase] Push failed:', e);
  }
}

export async function fetchShared(): Promise<SharedState | null> {
  const sharedRef = getSharedRef();
  if (!sharedRef) return null;
  try {
    const snapshot = await fbGet(sharedRef);
    return snapshot.val() as SharedState | null;
  } catch {
    return null;
  }
}

/* ============================================================
   ORDER EVENTS (for display + admin notifications)
   ============================================================ */
export function pushEvent(type: string, payload: Record<string, unknown>) {
  const database = getDb();
  if (!database) return;
  const eventRef = ref(database, `events/${RESTAURANT_ID}/${Date.now()}`);
  fbSet(eventRef, { type, payload, ts: Date.now(), from: 'kasa' }).catch(() => {});
}

export function subscribeEvents(callback: (type: string, payload: Record<string, unknown>) => void): (() => void) | null {
  const database = getDb();
  if (!database) return null;
  const eventsRef = ref(database, `events/${RESTAURANT_ID}`);
  const unsub = onValue(eventsRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) return;
    // Only process latest event
    const keys = Object.keys(val).sort();
    const latest = val[keys[keys.length - 1]];
    if (latest && Date.now() - latest.ts < 5000) {
      callback(latest.type, latest.payload);
    }
  });
  return unsub;
}
