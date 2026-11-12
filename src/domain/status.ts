import { diffDays, today, type ISODate } from '../lib/dates';
import type { Trip, TripStatus } from './types';

export function tripStatus(t: Pick<Trip, 'archived' | 'startDate' | 'endDate' | 'planning'>, now: ISODate = today()): TripStatus {
  if (t.archived) return 'archivado';
  const end = t.endDate ?? t.startDate;
  if (end && end < now) return 'completado';
  if (t.startDate && t.startDate <= now && (!end || end >= now)) return 'en-curso';
  if (t.planning === 'confirmed' && t.startDate) return 'proximo';
  return 'en-preparacion';
}

/** Días hasta la salida (0 = hoy). null si no hay fecha. */
export function daysUntil(t: Pick<Trip, 'startDate'>, now: ISODate = today()): number | null {
  return t.startDate ? diffDays(now, t.startDate) : null;
}

export function tripLength(t: Pick<Trip, 'startDate' | 'endDate'>): number | null {
  if (!t.startDate || !t.endDate) return null;
  return diffDays(t.startDate, t.endDate) + 1;
}

/** Ordena viajes: los activos/próximos primero por fecha de salida. */
export function byStart(a: Pick<Trip, 'startDate' | 'createdAt'>, b: Pick<Trip, 'startDate' | 'createdAt'>): number {
  if (a.startDate && b.startDate) return a.startDate.localeCompare(b.startDate);
  if (a.startDate) return -1;
  if (b.startDate) return 1;
  return b.createdAt - a.createdAt;
}
