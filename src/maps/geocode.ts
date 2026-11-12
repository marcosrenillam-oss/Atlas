import type { GeoPoint } from '../domain/types';

/**
 * Búsqueda de lugares con Nominatim (OpenStreetMap). Gratuito con condiciones:
 * máx. 1 petición/segundo, sin autocompletado, con atribución. Solo funciona con conexión.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export interface GeoResult {
  name: string;
  address: string;
  point: GeoPoint;
  type: string;
}

let last = 0;
/** Caché en memoria: la política de Nominatim pide no repetir consultas idénticas. */
const cache = new Map<string, GeoResult[]>();
export async function searchPlaces(query: string, near?: GeoPoint): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = `${q.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!navigator.onLine) throw new Error('Buscar lugares nuevos necesita conexión a Internet.');
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '8', addressdetails: '0', 'accept-language': 'es' });
  if (near) {
    const d = 0.6;
    params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`);
  }
  let res: Response;
  try {
    res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new Error('No se pudo conectar con el buscador de OpenStreetMap.');
  }
  if (!res.ok) throw new Error(res.status === 429 ? 'Demasiadas búsquedas seguidas. Espera unos segundos.' : 'El buscador no está disponible ahora.');
  const rows = (await res.json()) as { name?: string; display_name: string; lat: string; lon: string; type: string }[];
  const out = rows.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    address: r.display_name,
    point: { lat: Number(r.lat), lng: Number(r.lon) },
    type: r.type,
  }));
  cache.set(key, out);
  return out;
}

/** Imagen representativa de un destino desde Wikipedia (gratuito, sin clave). Requiere conexión. */
export async function wikipediaImage(title: string): Promise<{ blob: Blob; credit: string; url: string } | null> {
  if (!navigator.onLine) throw new Error('Buscar una foto necesita conexión.');
  const t = title.trim();
  if (!t) return null;
  for (const lang of ['es', 'en']) {
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}?redirect=true`).catch(() => null);
    if (!r?.ok) continue;
    const j = (await r.json()) as { originalimage?: { source: string }; thumbnail?: { source: string }; title: string; content_urls?: { desktop?: { page?: string } } };
    const src = j.thumbnail?.source?.replace(/\/\d+px-/, '/1280px-') ?? j.originalimage?.source;
    if (!src) continue;
    const img = await fetch(src).catch(() => null);
    if (!img?.ok) {
      const fallback = j.originalimage?.source ? await fetch(j.originalimage.source).catch(() => null) : null;
      if (!fallback?.ok) continue;
      return { blob: await fallback.blob(), credit: `Wikipedia · ${j.title}`, url: j.content_urls?.desktop?.page ?? '' };
    }
    return { blob: await img.blob(), credit: `Wikipedia · ${j.title}`, url: j.content_urls?.desktop?.page ?? '' };
  }
  return null;
}
