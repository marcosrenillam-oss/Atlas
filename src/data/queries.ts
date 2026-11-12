import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { tripStatus } from '../domain/status';
import type { Trip, TripStatus } from '../domain/types';

export type TripWithStatus = Trip & { status: TripStatus };

export function useTrips(): TripWithStatus[] | undefined {
  return useLiveQuery(async () => (await db.trips.toArray()).map((t) => ({ ...t, status: tripStatus(t) })), []);
}

export function useTrip(id?: string): TripWithStatus | null | undefined {
  return useLiveQuery(async () => {
    if (!id) return null;
    const t = await db.trips.get(id);
    return t ? { ...t, status: tripStatus(t) } : null;
  }, [id]);
}

export function useParticipants(tripId?: string) {
  // Sin valor por defecto: undefined = cargando (distinto de "sin participantes").
  return useLiveQuery(() => (tripId ? db.participants.where('tripId').equals(tripId).sortBy('createdAt') : []), [tripId]);
}
export function useItems(tripId?: string) {
  return useLiveQuery(() => (tripId ? db.items.where('tripId').equals(tripId).toArray() : []), [tripId]);
}
export function useExpenses(tripId?: string) {
  return useLiveQuery(() => (tripId ? db.expenses.where('tripId').equals(tripId).toArray() : []), [tripId]);
}
export function useSettlements(tripId?: string) {
  return useLiveQuery(() => (tripId ? db.settlements.where('tripId').equals(tripId).toArray() : []), [tripId], []);
}
export function useTasks(tripId?: string) {
  return useLiveQuery(() => (tripId ? db.tasks.where('tripId').equals(tripId).sortBy('createdAt') : []), [tripId], []);
}
/** Categorías base + las propias del viaje. */
export function useCategories(tripId?: string) {
  return useLiveQuery(
    async () => (await db.categories.toArray()).filter((c) => c.tripId === null || c.tripId === tripId),
    [tripId],
    [],
  );
}
export function usePlaces(tripId?: string | 'all') {
  return useLiveQuery(
    () => (tripId === 'all' || tripId === undefined ? db.places.toArray() : db.places.where('tripId').equals(tripId).toArray()),
    [tripId],
  );
}
export function useDocs(tripId?: string) {
  return useLiveQuery(() => (tripId ? db.docs.where('tripId').equals(tripId).toArray() : []), [tripId]);
}
