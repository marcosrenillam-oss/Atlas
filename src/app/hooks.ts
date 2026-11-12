import { useEffect, useState, useSyncExternalStore } from 'react';
import { getSyncState, subscribeSync, type SyncState } from '../sync/engine';

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState, getSyncState);
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true);
    const b = () => setOn(false);
    window.addEventListener('online', a);
    window.addEventListener('offline', b);
    return () => {
      window.removeEventListener('online', a);
      window.removeEventListener('offline', b);
    };
  }, []);
  return on;
}

export function useScrolled(threshold = 8): boolean {
  const [s, setS] = useState(false);
  useEffect(() => {
    const f = () => setS(window.scrollY > threshold);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [threshold]);
  return s;
}

/** Re-render periódico (cuenta atrás). */
export function useNow(ms = 30_000): Date {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setD(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return d;
}

/** Pide almacenamiento persistente (evita que el navegador borre datos por falta de espacio). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
