import { db } from '../data/db';
import { update } from '../data/repo';
import type { GeoPoint, Trip } from '../domain/types';

/**
 * Geocodificación de ciudades con Open-Meteo (gratis, sin clave, CC BY 4.0).
 * Solo se usa para destinos/origen sin coordenadas; el resultado se guarda en el viaje.
 */
export interface CityHit {
  point: GeoPoint;
  country?: string;
  countryCode?: string;
}

const memo = new Map<string, CityHit | null>();

export async function geocodeCity(name: string): Promise<CityHit | null> {
  const q = name.trim();
  if (!q) return null;
  const key = q.toLowerCase();
  if (memo.has(key)) return memo.get(key)!;
  if (!navigator.onLine) return null;
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=es&format=json`);
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: { latitude: number; longitude: number; country?: string; country_code?: string }[] };
    const hit = j.results?.[0];
    const out = hit ? { point: { lat: hit.latitude, lng: hit.longitude }, country: hit.country, countryCode: hit.country_code } : null;
    memo.set(key, out);
    return out;
  } catch {
    return null;
  }
}

const enriching = new Set<string>();
/** Completa coordenadas y país de destinos y origen (una vez, con conexión). */
export async function enrichTrip(tripId: string): Promise<void> {
  if (!navigator.onLine || enriching.has(tripId)) return;
  enriching.add(tripId);
  try {
    const t = await db.trips.get(tripId);
    if (!t) return;
    let changed = false;
    const stages = [...t.stages];
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      if (!s.name.trim() || (s.point && s.countryCode)) continue;
      const hit = await geocodeCity(s.name);
      if (hit) {
        stages[i] = { ...s, point: s.point ?? hit.point, country: s.country ?? hit.country, countryCode: s.countryCode ?? hit.countryCode };
        changed = true;
      }
    }
    const patch: Partial<Trip> = {};
    if (changed) patch.stages = stages;
    if (t.origin?.trim() && !t.originPoint) {
      const hit = await geocodeCity(t.origin);
      if (hit) patch.originPoint = hit.point;
    }
    if (Object.keys(patch).length) await update<Trip>('trips', tripId, patch);
  } finally {
    enriching.delete(tripId);
  }
}
