import { db, table } from '../data/db';
import { putRaw, onLocalChange, setTracking, withRemoteApply, notifyLocalChange } from '../data/repo';
import { getSyncConfig, saveSyncConfig, type SyncConfig } from '../data/settings';
import { base64ToBlob, blobToBase64 } from '../data/backup';
import { uid } from '../lib/id';
import type { EntityName, StoredFile } from '../domain/types';
import { httpTransport, type Change, type SyncTransport } from './transport';

export type SyncPhase = 'disabled' | 'idle' | 'syncing' | 'error';
export interface SyncState {
  phase: SyncPhase;
  online: boolean;
  pending: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

let state: SyncState = { phase: 'disabled', online: typeof navigator === 'undefined' ? true : navigator.onLine, pending: 0, lastSyncAt: null, lastError: null };
const subs = new Set<(s: SyncState) => void>();
function set(p: Partial<SyncState>) {
  state = { ...state, ...p };
  subs.forEach((f) => f(state));
}
export const getSyncState = () => state;
export function subscribeSync(fn: (s: SyncState) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

const MAX_FILE_SYNC = 15 * 1024 * 1024;
let running = false;
let timer: ReturnType<typeof setTimeout> | undefined;

async function refreshPending() {
  set({ pending: await db.outbox.count() });
}

function transportFor(cfg: SyncConfig): SyncTransport {
  return httpTransport(cfg.url, cfg.space, cfg.token);
}

async function sharedTripIds(): Promise<Set<string>> {
  const trips = await db.trips.filter((t) => t.shared).primaryKeys();
  return new Set(trips as string[]);
}

/** Encola todos los registros de un viaje (al empezar a compartirlo). */
export async function enqueueTrip(tripId: string): Promise<void> {
  const now = Date.now();
  const add = async (entity: EntityName, id: string) => {
    await db.outbox.where('[entity+entityId]').equals([entity, id]).delete();
    await db.outbox.add({ entity, entityId: id, op: 'put', at: now, tripId });
  };
  await add('trips', tripId);
  for (const e of ['participants', 'items', 'places', 'categories', 'expenses', 'settlements', 'docs', 'files', 'tasks', 'packingLists'] as EntityName[]) {
    for (const id of (await table(e).where('tripId').equals(tripId).primaryKeys()) as string[]) await add(e, id);
  }
  const lists = (await db.packingLists.where('tripId').equals(tripId).primaryKeys()) as string[];
  if (lists.length) for (const id of (await db.packingItems.where('listId').anyOf(lists).primaryKeys()) as string[]) await add('packingItems', id);
  await refreshPending();
}

async function buildChange(entity: EntityName, id: string, op: 'put' | 'delete', tripId: string | null, at: number): Promise<Change | null> {
  if (op === 'delete') return { entity, id, op, updatedAt: at, tripId };
  const rec = await table(entity).get(id);
  if (!rec) return null;
  let data = rec as unknown as Record<string, unknown>;
  if (entity === 'files') {
    const f = rec as unknown as StoredFile;
    if (f.size > MAX_FILE_SYNC) return null; // demasiado grande: solo local
    const { blob, ...rest } = f;
    data = { ...rest, data: await blobToBase64(blob) };
  }
  return { entity, id, op, updatedAt: rec.updatedAt, tripId, data };
}

async function push(t: SyncTransport, cfg: SyncConfig) {
  const shared = await sharedTripIds();
  for (;;) {
    const batch = await db.outbox.orderBy('seq').limit(50).toArray();
    if (!batch.length) return;
    const changes: Change[] = [];
    const done: number[] = [];
    for (const o of batch) {
      done.push(o.seq!);
      if (!o.tripId || !shared.has(o.tripId)) continue; // viaje no compartido: no sale del dispositivo
      const c = await buildChange(o.entity, o.entityId, o.op, o.tripId, o.at);
      if (c) changes.push(c);
    }
    if (changes.length) await t.push(cfg.deviceId, changes);
    await db.outbox.bulkDelete(done);
    await refreshPending();
  }
}

async function applyRemote(c: Change): Promise<boolean> {
  const tbl = table(c.entity);
  const cur = await tbl.get(c.id);
  if (c.op === 'delete') {
    if (cur && cur.updatedAt <= c.updatedAt) {
      await tbl.delete(c.id);
      return true;
    }
    return false;
  }
  if (!c.data) return false;
  if (cur && cur.updatedAt >= c.updatedAt) return false; // gana el más reciente
  let rec = c.data as Record<string, unknown> & { id: string; updatedAt: number; createdAt: number };
  if (c.entity === 'files') {
    const { data, ...rest } = rec as unknown as StoredFile & { data: string };
    rec = { ...rest, blob: base64ToBlob(data, rest.mime) } as never;
  }
  await putRaw(c.entity, rec);
  return true;
}

async function pull(t: SyncTransport, cfg: SyncConfig): Promise<number> {
  let cursor = cfg.cursor;
  let applied = 0;
  for (let guard = 0; guard < 100; guard++) {
    const r = await t.pull(cursor);
    await withRemoteApply(async () => {
      for (const c of r.changes) {
        if (c.deviceId === cfg.deviceId) continue;
        if (await applyRemote(c)) applied++;
      }
    });
    cursor = r.cursor;
    await saveSyncConfig({ cursor });
    if (!r.more) break;
  }
  if (applied) notifyLocalChange();
  return applied;
}

/** Sincroniza ahora (solo con conexión, la app abierta y la sincronización configurada). */
export async function syncNow(): Promise<void> {
  const cfg = await getSyncConfig();
  if (!cfg.enabled || !cfg.url || !cfg.space || !cfg.token) {
    set({ phase: 'disabled' });
    return;
  }
  if (!navigator.onLine) {
    set({ online: false, phase: 'idle' });
    return;
  }
  if (running) return;
  running = true;
  set({ phase: 'syncing' });
  try {
    const t = transportFor(cfg);
    await push(t, cfg);
    await pull(t, await getSyncConfig());
    const at = Date.now();
    await saveSyncConfig({ lastSyncAt: at, lastError: null });
    set({ phase: 'idle', lastSyncAt: at, lastError: null });
  } catch (e) {
    const msg = (e as Error).message || 'Error de sincronización';
    await saveSyncConfig({ lastError: msg });
    set({ phase: 'error', lastError: msg });
  } finally {
    running = false;
    await refreshPending();
  }
}

function schedule(ms = 2500) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

let started = false;
/** Arranca escuchas: cambio de red, vuelta a primer plano, cambios locales y un latido cada minuto. */
export async function startSync(): Promise<void> {
  const cfg = await getSyncConfig();
  setTracking(cfg.enabled);
  set({ phase: cfg.enabled ? 'idle' : 'disabled', lastSyncAt: cfg.lastSyncAt, lastError: cfg.lastError, online: navigator.onLine });
  await refreshPending();
  if (started) return;
  started = true;
  window.addEventListener('online', () => {
    set({ online: true });
    schedule(500);
  });
  window.addEventListener('offline', () => set({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule(300);
  });
  onLocalChange(() => {
    void refreshPending();
    if (state.phase !== 'disabled') schedule();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && state.phase !== 'disabled') void syncNow();
  }, 60_000);
  if (cfg.enabled) schedule(800);
}

export async function configureSync(input: { url: string; space: string; token: string }): Promise<void> {
  const t = httpTransport(input.url, input.space, input.token);
  await t.check(); // valida antes de guardar
  const cur = await getSyncConfig();
  await saveSyncConfig({ ...input, enabled: true, deviceId: cur.deviceId || uid(), cursor: 0, lastError: null });
  setTracking(true);
  for (const id of await sharedTripIds()) await enqueueTrip(id);
  set({ phase: 'idle' });
  await syncNow();
}

export async function disableSync(): Promise<void> {
  await saveSyncConfig({ enabled: false });
  setTracking(false);
  await db.outbox.clear();
  set({ phase: 'disabled', pending: 0 });
}
