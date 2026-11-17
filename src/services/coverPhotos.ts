import photos from '../ui/cover-photos.json';
import type { Trip } from '../domain/types';

/**
 * Fotos para elegir portada: las del país que ya trae la app (sin conexión) y, con conexión,
 * las del artículo de Wikipedia de cada destino, con autor y licencia de Wikimedia Commons.
 */
export interface CoverChoice {
  key: string;
  thumb: string;
  full: string;
  credit: string;
  page?: string;
}

const PHOTOS = photos as { byCountry: Record<string, string>; byName: Record<string, string>; credit: Record<string, string> };
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Fotos incluidas en la app para los destinos del viaje (una por país). */
export function localChoices(trip: Pick<Trip, 'name' | 'stages'>): CoverChoice[] {
  const ids: string[] = [];
  for (const st of trip.stages) {
    const id = (st.countryCode && PHOTOS.byCountry[st.countryCode.toUpperCase()]) || PHOTOS.byName[norm(st.name)] || (st.country && PHOTOS.byName[norm(st.country)]);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids.map((id) => {
    const url = `${import.meta.env.BASE_URL}world/${id}.jpg`;
    return { key: `w:${id}`, thumb: url, full: url, credit: `Foto: ${PHOTOS.credit[id]}` };
  });
}

const SKIP = /\.(svg|png|gif|tif?f)$|logo|map|mapa|plano|flag|bandera|escudo|coat_of_arms|locator|location|seal|icon|signature|firma/i;
const strip = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Fotos del artículo de Wikipedia (es y, si hay pocas, en) de un destino. */
export async function onlineChoices(place: string, max = 12): Promise<CoverChoice[]> {
  const q = place.trim();
  if (!q || !navigator.onLine) return [];
  const files: string[] = [];
  let unavailable = false;
  for (const lang of ['es', 'en']) {
    const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(q.replace(/ /g, '_'))}?redirect=true`).catch(() => null);
    if (!r || r.status === 429 || r.status >= 500) unavailable = true;
    if (!r?.ok) continue;
    const j = (await r.json()) as { items?: { title: string; type: string }[] };
    for (const it of j.items ?? []) {
      if (it.type !== 'image') continue;
      const name = it.title.replace(/^[^:]+:/, '');
      if (SKIP.test(name) || files.includes(name)) continue;
      files.push(name);
    }
    if (files.length >= max) break;
  }
  if (!files.length) {
    if (unavailable) throw new Error('Wikipedia no responde ahora mismo. Prueba en un rato.');
    return [];
  }
  // Datos de cada archivo en Commons: miniatura, versión grande, autor y licencia.
  const params = new URLSearchParams({
    action: 'query', format: 'json', origin: '*', prop: 'imageinfo', iiprop: 'url|extmetadata|size',
    iiurlwidth: '1280', titles: files.slice(0, max * 2).map((f) => `File:${f}`).join('|'),
  });
  const r = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`).catch(() => null);
  if (!r?.ok) throw new Error('Wikimedia no responde ahora mismo. Prueba en un rato.');
  const j = (await r.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; url: string; descriptionurl: string; width: number; height: number; extmetadata?: Record<string, { value: string }> }[] }> } };
  const out: CoverChoice[] = [];
  for (const p of Object.values(j.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.width < 700 || ii.height < 400) continue;
    const full = ii.thumburl ?? ii.url;
    const author = strip(ii.extmetadata?.Artist?.value) || 'Autor desconocido';
    const lic = strip(ii.extmetadata?.LicenseShortName?.value);
    out.push({ key: p.title, thumb: full.replace(/\/1280px-/, '/500px-'), full, credit: `Foto: ${author.slice(0, 60)}${lic ? ` · ${lic}` : ''} · Wikimedia Commons`, page: ii.descriptionurl });
    if (out.length >= max) break;
  }
  return out;
}
