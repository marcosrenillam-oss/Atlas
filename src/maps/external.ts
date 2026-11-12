import type { GeoPoint } from '../domain/types';

/** Enlaces de navegación externa (gratuitos; abren la app de mapas del dispositivo). */
export function appleMapsUrl(p?: GeoPoint, label?: string): string {
  const q = label ? `&q=${encodeURIComponent(label)}` : '';
  return p ? `https://maps.apple.com/?daddr=${p.lat},${p.lng}${q}` : `https://maps.apple.com/?q=${encodeURIComponent(label ?? '')}`;
}
export function googleMapsUrl(p?: GeoPoint, label?: string): string {
  return p
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label ?? '')}`;
}
export function osmUrl(p: GeoPoint): string {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`;
}
export function formatCoords(p: GeoPoint): string {
  const f = (n: number) => n.toFixed(5).replace('.', ',');
  return `${f(p.lat)}, ${f(p.lng)}`;
}
/** Distancia en km (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Interpreta "40.4168, -3.7038" o "40,4168 -3,7038". */
export function parseCoords(s: string): GeoPoint | null {
  const m = s.trim().match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
