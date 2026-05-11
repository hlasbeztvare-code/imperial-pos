import { useEffect, useRef } from 'react';
import { useSharedStore, usePosStore } from '@/store/posStore';
import { initFirebase, subscribeShared, pushShared } from '@/firebase/config';
import type { SharedState } from '@/types';

/**
 * useFirebaseSync — Bidirectional sync between Zustand SharedStore and Firebase RTDB.
 * - On mount: initializes Firebase and subscribes to remote changes.
 * - On local change: pushes to Firebase (debounced).
 */
export function useFirebaseSync() {
  const shared = useSharedStore(s => s.shared);
  const setShared = useSharedStore(s => s.setShared);
  const setSyncStatus = usePosStore(s => s.setCloudSyncStatus);
  const lastRemoteRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Firebase and subscribe to remote updates
  useEffect(() => {
    initFirebase();

    const unsub = subscribeShared((remoteData: SharedState) => {
      const remoteJson = JSON.stringify(remoteData);
      // Prevent feedback loop
      if (remoteJson !== lastRemoteRef.current) {
        lastRemoteRef.current = remoteJson;
        setShared(remoteData);
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [setShared]);

  // Push local changes to Firebase (debounced 500ms)
  useEffect(() => {
    const localJson = JSON.stringify(shared);
    if (localJson === lastRemoteRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSyncStatus('syncing');
    debounceRef.current = setTimeout(async () => {
      lastRemoteRef.current = localJson;
      try {
        await pushShared(shared);
        setSyncStatus('synced');
      } catch {
        setSyncStatus('error');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [shared]);
}
