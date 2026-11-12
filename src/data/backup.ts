import { db, ENTITY_TABLES, table } from './db';
import { putRaw, notifyLocalChange } from './repo';
import type { EntityName, StoredFile } from '../domain/types';

export const BACKUP_FORMAT = 'atlas-backup';
export const BACKUP_VERSION = 1;

type SerializedFile = Omit<StoredFile, 'blob'> & { data: string };
export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  kind: 'full' | 'trip';
  exportedAt: string;
  app: 'ATLAS';
  data: Partial<Record<EntityName, unknown[]>>;
  /** Solo en copias completas: preferencias del perfil. */
  profile?: unknown;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode(...buf.subarray(i, i + CH));
  return btoa(bin);
}
export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function serializeFiles(files: StoredFile[]): Promise<SerializedFile[]> {
  const out: SerializedFile[] = [];
  for (const f of files) {
    const { blob, ...rest } = f;
    out.push({ ...rest, data: await blobToBase64(blob) });
  }
  return out;
}

/** Copia completa de todos los datos (incluidos documentos y fotos). */
export async function exportAll(): Promise<BackupFile> {
  const data: BackupFile['data'] = {};
  for (const e of ENTITY_TABLES) {
    const rows = await table(e).toArray();
    data[e] = e === 'files' ? await serializeFiles(rows as unknown as StoredFile[]) : rows;
  }
  const profile = (await db.kv.get('profile'))?.value;
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, kind: 'full', exportedAt: new Date().toISOString(), app: 'ATLAS', data, profile };
}

/** Exporta un único viaje para compartirlo con otra persona o dispositivo. */
export async function exportTrip(tripId: string, opts: { includeFiles: boolean } = { includeFiles: true }): Promise<BackupFile> {
  const trip = await db.trips.get(tripId);
  if (!trip) throw new Error('Viaje no encontrado.');
  const by = <T,>(e: EntityName) => table(e).where('tripId').equals(tripId).toArray() as unknown as Promise<T[]>;
  const lists = await db.packingLists.where('tripId').equals(tripId).toArray();
  const listIds = lists.map((l) => l.id);
  const files = opts.includeFiles ? await by<StoredFile>('files') : [];
  const docs = opts.includeFiles ? await by('docs') : [];
  const data: BackupFile['data'] = {
    trips: [opts.includeFiles ? trip : { ...trip, cover: undefined }],
    participants: await by('participants'),
    items: await by('items'),
    places: await by('places'),
    categories: await by('categories'),
    expenses: await by('expenses'),
    settlements: await by('settlements'),
    tasks: await by('tasks'),
    journal: await by('journal'),
    docs,
    files: await serializeFiles(files),
    packingLists: lists,
    packingItems: listIds.length ? await db.packingItems.where('listId').anyOf(listIds).toArray() : [],
  };
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, kind: 'trip', exportedAt: new Date().toISOString(), app: 'ATLAS', data };
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  trips: number;
}

export function parseBackup(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  const b = json as BackupFile;
  if (!b || b.format !== BACKUP_FORMAT || typeof b.data !== 'object') throw new Error('El archivo no es una copia de ATLAS.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) throw new Error('La copia es de una versión más reciente de ATLAS.');
  return b;
}

function isRecord(r: unknown): r is { id: string; updatedAt: number; createdAt: number } {
  return !!r && typeof r === 'object' && typeof (r as { id: unknown }).id === 'string' && typeof (r as { updatedAt: unknown }).updatedAt === 'number';
}

/**
 * Importa una copia. merge: conserva la versión más reciente de cada registro (por updatedAt).
 * replace: borra todos los datos locales antes (solo copias completas).
 */
export async function importBackup(b: BackupFile, mode: 'merge' | 'replace' = 'merge'): Promise<ImportResult> {
  const res: ImportResult = { added: 0, updated: 0, skipped: 0, trips: 0 };
  if (mode === 'replace') {
    if (b.kind !== 'full') throw new Error('Solo una copia completa puede reemplazar todos los datos.');
    await db.transaction('rw', ENTITY_TABLES.map(table), async () => {
      for (const e of ENTITY_TABLES) await table(e).clear();
    });
  }
  // Orden: listas antes que elementos para resolver el viaje de cada elemento.
  for (const e of ENTITY_TABLES) {
    const rows = (b.data[e] ?? []) as unknown[];
    for (const raw of rows) {
      if (!isRecord(raw)) {
        res.skipped++;
        continue;
      }
      let rec = raw as Record<string, unknown> & { id: string; updatedAt: number; createdAt: number };
      if (e === 'files') {
        const { data, ...rest } = rec as unknown as SerializedFile;
        if (typeof data !== 'string') {
          res.skipped++;
          continue;
        }
        rec = { ...rest, blob: base64ToBlob(data, rest.mime) } as never;
      }
      const cur = await table(e).get(rec.id);
      if (cur && cur.updatedAt >= rec.updatedAt) {
        res.skipped++;
        continue;
      }
      await putRaw(e, rec);
      if (cur) res.updated++;
      else res.added++;
      if (e === 'trips') res.trips++;
    }
  }
  // Perfil: se restaura al reemplazar, o si este dispositivo aún no tiene nombre.
  if (b.kind === 'full' && b.profile && typeof b.profile === 'object') {
    const cur = (await db.kv.get('profile'))?.value as { name?: string } | undefined;
    if (mode === 'replace' || !cur?.name) await db.kv.put({ key: 'profile', value: { ...(cur ?? {}), ...(b.profile as object) } });
  }
  notifyLocalChange();
  return res;
}

/** Guarda o comparte un JSON como archivo. En iOS usa la hoja de compartir si está disponible. */
export async function deliverJSON(obj: unknown, filename: string): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const file = new File([blob], filename, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function backupFilename(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const safe = prefix.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'atlas';
  return `${safe}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.atlas.json`;
}
