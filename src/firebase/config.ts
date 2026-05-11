import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set as fbSet, get as fbGet } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import type { SharedState } from '@/types';

/* ============================================================
   FIREBASE CONFIG
============================================================ */
const firebaseConfig = {
  apiKey: 'AIzaSyALWvaLsBbj3BzlSg200Dugi9CI-EBEXRQ',
  authDomain: 'imperial-pos-osman.firebaseapp.com',
  databaseURL: 'https://imperial-pos-osman-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'imperial-pos-osman',
  storageBucket: 'imperial-pos-osman.firebasestorage.app',
  messagingSenderId: '20856244890',
  appId: '1:20856244890:web:2f4f8ef9b61eea1061ed23',
  measurementId: 'G-MLYMM3DHD1',
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getDatabase> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

export function initFirebase() {
  if (app) return db!;
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);
    auth = getAuth(app);
    return db;
  } catch (e) {
    console.warn('[Firebase] Init failed — offline mode:', e);
    return null;
  }
}

export const getDb      = () => db;
export const getStorage_ = () => storage;
export const getAuth_   = () => auth;

/**
 * Signs in to Firebase using the ID token provided by the native Android/iOS bridge.
 */
export async function signInWithNativeToken(idToken: string) {
  const a = getAuth_();
  if (!a) throw new Error('Firebase Auth not initialized');
  
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(a, credential);
}

/* ============================================================
   REALTIME DATABASE — Shared state sync
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
  if (!sharedRef) return;
  try {
    // Fotky jsou URL (Firebase Storage) — nikdy neukládáme base64 do RTDB
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
   FIREBASE STORAGE — Nahrání fotek produktů a loga
   Majitel může nahrávat z domu přes mobil, kasa okamžitě synchronizuje.
============================================================ */

/**
 * Nahraje obrázek produktu do Firebase Storage.
 * Vrátí public download URL.
 */
export async function uploadProductPhoto(
  productId: string,
  file: File,
): Promise<string> {
  const s = getStorage_();
  if (!s) throw new Error('Firebase Storage not initialized');

  const fileExt = file.name.split('.').pop() ?? 'jpg';
  const path = `products/${RESTAURANT_ID}/${productId}.${fileExt}`;
  const ref_ = storageRef(s, path);

  await uploadBytes(ref_, file, { contentType: file.type });
  return await getDownloadURL(ref_);
}

/**
 * Nahraje logo restaurace do Firebase Storage.
 */
export async function uploadLogo(file: File): Promise<string> {
  const s = getStorage_();
  if (!s) throw new Error('Firebase Storage not initialized');

  const fileExt = file.name.split('.').pop() ?? 'png';
  const path = `logos/${RESTAURANT_ID}/logo.${fileExt}`;
  const ref_ = storageRef(s, path);

  await uploadBytes(ref_, file, { contentType: file.type });
  return await getDownloadURL(ref_);
}

/**
 * Smaže foto produktu ze Storage (při mazání produktu nebo výměně fotky).
 */
export async function deleteProductPhoto(productId: string): Promise<void> {
  const s = getStorage_();
  if (!s) return;
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    try {
      const ref_ = storageRef(s, `products/${RESTAURANT_ID}/${productId}.${ext}`);
      await deleteObject(ref_);
      break;
    } catch { /* soubor s tímto ext neexistuje */ }
  }
}

/* ============================================================
   ORDER EVENTS
============================================================ */
export function pushEvent(type: string, payload: Record<string, unknown>) {
  const database = getDb();
  if (!database) return;
  const eventRef = ref(database, `events/${RESTAURANT_ID}/${Date.now()}`);
  fbSet(eventRef, { type, payload, ts: Date.now(), from: 'kasa' }).catch(() => {});
}

export function subscribeEvents(
  callback: (type: string, payload: Record<string, unknown>) => void,
): (() => void) | null {
  const database = getDb();
  if (!database) return null;
  const eventsRef = ref(database, `events/${RESTAURANT_ID}`);
  const unsub = onValue(eventsRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) return;
    const keys = Object.keys(val).sort();
    const latest = val[keys[keys.length - 1]];
    if (latest && Date.now() - latest.ts < 5000) {
      callback(latest.type, latest.payload);
    }
  });
  return unsub;
}
