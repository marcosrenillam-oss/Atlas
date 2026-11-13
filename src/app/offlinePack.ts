import { useSyncExternalStore } from 'react';
import photos from '../ui/cover-photos.json';

/**
 * «Paquete sin conexión»: con conexión, guarda en segundo plano (una vez) las fotos de los
 * monumentos que usan las portadas, las fichas del Mundo ATLAS y la tarjeta de Explorar, para que
 * la app se vea igual sin conexión. Las fotos vienen del propio servidor de ATLAS (no de Wikimedia).
 * Primero las de los destinos de tus viajes; luego el resto, de tres en tres.
 */
export const PHOTO_CACHE = 'atlas-world-photos';

export interface PackState {
  done: number;
  total: number;
  running: boolean;
}

let state: PackState = { done: 0, total: 0, running: false };
const subs = new Set<() => void>();
const set = (s: Partial<PackState>) => {
  state = { ...state, ...s };
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function usePackState(): PackState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

const ALL_IDS = [...new Set(Object.values((photos as { byCountry: Record<string, string> }).byCountry)), 'teaser'];
export const photoUrl = (id: string) => new URL(`${import.meta.env.BASE_URL}world/${id}.jpg`, location.href).href;

export async function runOfflinePack(priority: string[] = []): Promise<void> {
  if (state.running || typeof caches === 'undefined') return;
  set({ running: true });
  try {
    const cache = await caches.open(PHOTO_CACHE);
    const ids = [...new Set([...priority, ...ALL_IDS])];
    const todo: string[] = [];
    let done = 0;
    for (const id of ids) {
      if (await cache.match(photoUrl(id))) done++;
      else todo.push(photoUrl(id));
    }
    set({ done, total: ids.length });
    if (!navigator.onLine) return;
    let i = 0;
    const worker = async () => {
      while (i < todo.length && navigator.onLine) {
        const url = todo[i++];
        try {
          const r = await fetch(url);
          if (r.ok) {
            await cache.put(url, r);
            set({ done: state.done + 1 });
          }
        } catch {
          /* sin conexión a mitad: se reintenta la próxima vez */
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  } finally {
    set({ running: false });
  }
}
