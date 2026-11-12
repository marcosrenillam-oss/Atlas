import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

export type ThemePref = 'system' | 'light' | 'dark';

export interface Profile {
  name: string;
  currency: string;
  language: 'es';
  theme: ThemePref;
}

export interface SyncConfig {
  enabled: boolean;
  url: string;
  space: string;
  token: string;
  deviceId: string;
  cursor: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

export const DEFAULT_PROFILE: Profile = { name: '', currency: 'EUR', language: 'es', theme: 'system' };

export async function getKV<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row ? ({ ...(fallback as object), ...(row.value as object) } as T) : fallback;
}
export async function setKV<T>(key: string, value: T): Promise<void> {
  await db.kv.put({ key, value });
}
export async function patchKV<T extends object>(key: string, fallback: T, patch: Partial<T>): Promise<T> {
  const cur = await getKV<T>(key, fallback);
  const next = { ...cur, ...patch };
  await setKV(key, next);
  return next;
}

export function useProfile(): Profile {
  return useLiveQuery(() => getKV('profile', DEFAULT_PROFILE), [], DEFAULT_PROFILE) ?? DEFAULT_PROFILE;
}
export const saveProfile = (patch: Partial<Profile>) => patchKV('profile', DEFAULT_PROFILE, patch);

export function defaultSync(): SyncConfig {
  return { enabled: false, url: '', space: '', token: '', deviceId: '', cursor: 0, lastSyncAt: null, lastError: null };
}
export const getSyncConfig = () => getKV<SyncConfig>('sync', defaultSync());
export const saveSyncConfig = (patch: Partial<SyncConfig>) => patchKV('sync', defaultSync(), patch);
