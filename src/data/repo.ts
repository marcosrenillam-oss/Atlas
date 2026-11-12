import { uid } from '../lib/id';
import { db, table, type OutboxEntry } from './db';
import type {
  EntityName, Expense, ExpenseCategory, ItineraryItem, PackingItem, PackingList, Participant, Place,
  Settlement, StoredFile, Task, TravelDoc, Trip,
} from '../domain/types';

/**
 * Repositorio: única puerta de escritura. Sella fechas, y si la sincronización está activa,
 * registra cada cambio en la cola persistente (outbox) para enviarlo cuando haya conexión.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
export function onLocalChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach((l) => l());

let trackingEnabled = false;
export function setTracking(enabled: boolean) {
  trackingEnabled = enabled;
}

/** Durante la aplicación de cambios remotos no se reencolan. */
let applyingRemote = false;
export async function withRemoteApply<T>(fn: () => Promise<T>): Promise<T> {
  applyingRemote = true;
  try {
    return await fn();
  } finally {
    applyingRemote = false;
  }
}

async function track(entity: EntityName, entityId: string, op: 'put' | 'delete', tripId?: string | null) {
  if (!trackingEnabled || applyingRemote) return;
  const entry: OutboxEntry = { entity, entityId, op, at: Date.now(), tripId: tripId ?? null };
  // Compactación: un único registro pendiente por entidad.
  await db.outbox.where('[entity+entityId]').equals([entity, entityId]).delete();
  await db.outbox.add(entry);
}

function txTables(entity: EntityName) {
  return [...new Set([table(entity), db.outbox, db.packingLists])];
}

type Rec = { id: string; createdAt: number; updatedAt: number; tripId?: string | null };

export async function save<T extends Rec>(entity: EntityName, rec: Omit<T, 'createdAt' | 'updatedAt' | 'id'> & Partial<Rec>): Promise<T> {
  const now = Date.now();
  const full = { ...rec, id: rec.id ?? uid(), createdAt: rec.createdAt ?? now, updatedAt: now } as unknown as T;
  await db.transaction('rw', txTables(entity), async () => {
    await table(entity).put(full as never);
    await track(entity, full.id, 'put', await tripOf(entity, full));
  });
  emit();
  return full;
}

export async function update<T extends Rec>(entity: EntityName, id: string, patch: Partial<T>): Promise<void> {
  await db.transaction('rw', txTables(entity), async () => {
    const cur = await table(entity).get(id);
    if (!cur) throw new Error('El elemento ya no existe.');
    const next = { ...cur, ...patch, id, updatedAt: Date.now() };
    await table(entity).put(next as never);
    await track(entity, id, 'put', await tripOf(entity, next));
  });
  emit();
}

export async function remove(entity: EntityName, id: string): Promise<void> {
  await db.transaction('rw', txTables(entity), async () => {
    const cur = await table(entity).get(id);
    if (!cur) return;
    await table(entity).delete(id);
    await track(entity, id, 'delete', await tripOf(entity, cur));
  });
  emit();
}

async function tripOf(entity: EntityName, rec: { tripId?: string | null; listId?: string }): Promise<string | null> {
  if (entity === 'trips') return (rec as { id: string }).id;
  if (entity === 'packingItems' && rec.listId) return (await db.packingLists.get(rec.listId))?.tripId ?? null;
  return rec.tripId ?? null;
}

// ───────────────────────── Operaciones de dominio ─────────────────────────

const TRIP_CHILDREN: EntityName[] = ['participants', 'items', 'places', 'expenses', 'settlements', 'docs', 'tasks', 'journal', 'files', 'categories'];

export async function deleteTrip(tripId: string): Promise<void> {
  const lists = await db.packingLists.where('tripId').equals(tripId).toArray();
  for (const l of lists) await deleteList(l.id);
  for (const e of TRIP_CHILDREN) {
    const ids = (await table(e).where('tripId').equals(tripId).primaryKeys()) as string[];
    for (const id of ids) await remove(e, id);
  }
  await remove('trips', tripId);
}

export async function deleteList(listId: string): Promise<void> {
  const ids = await db.packingItems.where('listId').equals(listId).primaryKeys();
  for (const id of ids) await remove('packingItems', id);
  await remove('packingLists', listId);
}

/** Duplica la estructura del viaje: datos, viajeros, itinerario, tareas, lugares y equipaje. No copia gastos ni documentos. */
export async function duplicateTrip(tripId: string): Promise<string> {
  const t = await db.trips.get(tripId);
  if (!t) throw new Error('Viaje no encontrado.');
  const copy = await save<Trip>('trips', {
    ...t, id: undefined, createdAt: undefined, name: `${t.name} (copia)`, archived: false, shared: false, planning: 'planning',
  } as never);
  const nid = copy.id;
  const pMap = new Map<string, string>();
  for (const p of await db.participants.where('tripId').equals(tripId).toArray()) {
    const np = await save<Participant>('participants', { ...p, id: undefined, createdAt: undefined, tripId: nid } as never);
    pMap.set(p.id, np.id);
  }
  const placeMap = new Map<string, string>();
  for (const p of await db.places.where('tripId').equals(tripId).toArray()) {
    const np = await save<Place>('places', { ...p, id: undefined, createdAt: undefined, tripId: nid, photoIds: [] } as never);
    placeMap.set(p.id, np.id);
  }
  for (const it of await db.items.where('tripId').equals(tripId).toArray()) {
    await save<ItineraryItem>('items', {
      ...it, id: undefined, createdAt: undefined, tripId: nid, done: false, photoIds: [],
      placeId: it.placeId ? placeMap.get(it.placeId) : undefined,
    } as never);
  }
  for (const tk of await db.tasks.where('tripId').equals(tripId).toArray()) {
    await save<Task>('tasks', { ...tk, id: undefined, createdAt: undefined, tripId: nid, done: false } as never);
  }
  for (const l of await db.packingLists.where('tripId').equals(tripId).toArray()) {
    await copyList(l.id, { tripId: nid, isTemplate: false, name: l.name, resetChecks: true });
  }
  // La portada se comparte por referencia de archivo solo si existe; se duplica el binario para que sea independiente.
  if (t.cover) {
    const f = await db.files.get(t.cover.fileId);
    if (f) {
      const nf = await save<StoredFile>('files', { ...f, id: undefined, createdAt: undefined, tripId: nid } as never);
      await update<Trip>('trips', nid, { cover: { ...t.cover, fileId: nf.id } });
    }
  }
  return nid;
}

export async function copyList(
  listId: string,
  opts: { tripId: string | null; isTemplate: boolean; name: string; resetChecks?: boolean },
): Promise<string> {
  const src = await db.packingLists.get(listId);
  if (!src) throw new Error('Lista no encontrada.');
  const nl = await save<PackingList>('packingLists', { tripId: opts.tripId, name: opts.name, isTemplate: opts.isTemplate });
  const items = await db.packingItems.where('listId').equals(listId).sortBy('order');
  for (const it of items) {
    await save<PackingItem>('packingItems', {
      listId: nl.id, name: it.name, category: it.category, qty: it.qty, order: it.order,
      checked: opts.resetChecks ? false : it.checked,
    });
  }
  return nl.id;
}

export async function storeFile(file: Blob, name: string, tripId: string | null): Promise<StoredFile> {
  return save<StoredFile>('files', { tripId, name, mime: file.type || 'application/octet-stream', size: file.size, blob: file });
}

export async function deleteDoc(doc: TravelDoc): Promise<void> {
  await remove('docs', doc.id);
  await remove('files', doc.fileId);
}

export async function deleteExpense(e: Expense) {
  await remove('expenses', e.id);
}

export async function deleteCategory(c: ExpenseCategory, fallbackId: string) {
  const affected = await db.expenses.where('categoryId').equals(c.id).toArray();
  for (const e of affected) await update<Expense>('expenses', e.id, { categoryId: fallbackId });
  await remove('categories', c.id);
}

export async function deleteSettlement(s: Settlement) {
  await remove('settlements', s.id);
}

/** Mueve un elemento del itinerario a otro día (al final). */
export async function moveItem(item: ItineraryItem, date: string | null) {
  const siblings = await db.items.where('tripId').equals(item.tripId).filter((i) => i.date === date).toArray();
  const maxOrder = siblings.reduce((m, i) => Math.max(m, i.order), -1);
  await update<ItineraryItem>('items', item.id, { date, order: maxOrder + 1 });
}

/** Reordena: intercambia posición con el vecino. */
export async function reorderItem(list: ItineraryItem[], index: number, dir: -1 | 1) {
  const j = index + dir;
  if (j < 0 || j >= list.length) return;
  const reordered = [...list];
  [reordered[index], reordered[j]] = [reordered[j], reordered[index]];
  for (let k = 0; k < reordered.length; k++) {
    if (reordered[k].order !== k) await update<ItineraryItem>('items', reordered[k].id, { order: k });
  }
}

/** Escribe un registro tal cual (importación / sincronización) conservando su updatedAt. */
export async function putRaw(entity: EntityName, rec: Rec & Record<string, unknown>): Promise<void> {
  await db.transaction('rw', txTables(entity), async () => {
    await table(entity).put(rec as never);
    await track(entity, rec.id, 'put', await tripOf(entity, rec as never));
  });
}
export { emit as notifyLocalChange };
