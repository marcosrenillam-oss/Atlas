import { db } from '../data/db';

/**
 * «Qué ver»: lugares de interés de Wikivoyage (contenido libre, CC BY-SA) para un destino.
 * Se leen las fichas «ver/see» (y «hacer/do» si hay pocas) del artículo en español y, si no hay,
 * en inglés. El resultado se guarda en el dispositivo para verlo también sin conexión.
 */
export interface Sight {
  name: string;
  description?: string;
  lat?: number;
  lng?: number;
  address?: string;
  url?: string;
  kind: 'ver' | 'hacer';
}
export interface SightsResult {
  place: string;
  lang: 'es' | 'en';
  page: string;
  sights: Sight[];
  fetchedAt: number;
}

/** Quita el marcado de wiki: [[enlace|texto]], ''cursiva'', <ref>, plantillas simples. */
export function cleanWiki(s = ''): string {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Separa los parámetros de una plantilla respetando [[...]] y {{...}} anidados. */
function splitParams(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0, cur = '';
  const parts: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  for (const p of parts.slice(1)) {
    const k = p.indexOf('=');
    if (k > 0) out[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim();
  }
  return out;
}

const SEE = /^(ver|see|visitar)$/i;
const DO = /^(hacer|do)$/i;

/** Extrae las fichas {{ver|...}} / {{see|...}} / {{listing|type=see|...}} del wikitexto. */
export function parseListings(wikitext: string): Sight[] {
  const out: Sight[] = [];
  const re = /\{\{\s*(ver|see|visitar|hacer|do|listing|marcador)\s*\|/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wikitext))) {
    // busca el cierre }} de esta plantilla (con anidamiento)
    let i = m.index + 2, depth = 1;
    while (i < wikitext.length && depth > 0) {
      const two = wikitext.slice(i, i + 2);
      if (two === '{{') { depth++; i += 2; } else if (two === '}}') { depth--; i += 2; } else i++;
    }
    const body = wikitext.slice(m.index + 2, i - 2);
    const p = splitParams(body);
    const tname = m[1].toLowerCase();
    const type = tname === 'listing' || tname === 'marcador' ? (p.type ?? p.tipo ?? '') : tname;
    const kind: Sight['kind'] | null = SEE.test(type) ? 'ver' : DO.test(type) ? 'hacer' : null;
    if (!kind) continue;
    const name = cleanWiki(p.nombre ?? p.name ?? '');
    if (!name) continue;
    const lat = Number(p.lat), lng = Number(p.long ?? p.lon ?? p.lng);
    const desc = cleanWiki(p['descripción'] ?? p.descripcion ?? p.content ?? p.description ?? '');
    out.push({
      name,
      kind,
      description: desc ? (desc.length > 220 ? desc.slice(0, 217).trimEnd() + '…' : desc) : undefined,
      lat: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
      lng: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
      address: cleanWiki(p['dirección'] ?? p.direccion ?? p.address ?? '') || undefined,
      url: /^https?:\/\//.test(p.url ?? '') ? p.url : undefined,
    });
  }
  // primero «ver», luego «hacer»; sin duplicados
  const seen = new Set<string>();
  return [...out.filter((s) => s.kind === 'ver'), ...out.filter((s) => s.kind === 'hacer')].filter((s) => {
    const k = s.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function fetchArticle(lang: 'es' | 'en', title: string): Promise<{ page: string; text: string } | null> {
  const params = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: title, redirects: '1', format: 'json', formatversion: '2', origin: '*' });
  const r = await fetch(`https://${lang}.wikivoyage.org/w/api.php?${params}`);
  if (r.status === 429 || r.status >= 500) throw new Error('Wikivoyage no responde ahora mismo. Prueba en un rato.');
  if (!r.ok) return null;
  const j = (await r.json()) as { query?: { pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[] } };
  const pg = j.query?.pages?.[0];
  const text = pg?.revisions?.[0]?.slots?.main?.content;
  return pg && !pg.missing && text ? { page: pg.title, text } : null;
}

const key = (place: string) => `wv:${place.trim().toLowerCase()}`;

/** Lugares guardados (sin conexión) de un destino, si los hay. */
export async function cachedSights(place: string): Promise<SightsResult | null> {
  return ((await db.kv.get(key(place)))?.value as SightsResult | undefined) ?? null;
}

async function searchTitle(lang: 'es' | 'en', q: string): Promise<string | null> {
  const params = new URLSearchParams({ action: 'query', list: 'search', srsearch: q, srlimit: '1', srnamespace: '0', format: 'json', formatversion: '2', origin: '*' });
  const r = await fetch(`https://${lang}.wikivoyage.org/w/api.php?${params}`).catch(() => null);
  if (!r?.ok) return null;
  const j = (await r.json()) as { query?: { search?: { title: string }[] } };
  return j.query?.search?.[0]?.title ?? null;
}

/** Las ciudades grandes reparten sus lugares por barrios («Lisbon/Alfama»): se leen los más citados. */
export function districtsOf(page: string, text: string, max = 4): string[] {
  const esc = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\[\\[${esc}/([^\\]|#]+)`, 'g');
  const count = new Map<string, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) count.set(m[1].trim(), (count.get(m[1].trim()) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([d]) => `${page}/${d}`);
}

async function collect(lang: 'es' | 'en', q: string): Promise<{ page: string; sights: Sight[] } | null> {
  let art = await fetchArticle(lang, q);
  if (!art && lang === 'en') {
    const t = await searchTitle('en', q);
    if (t) art = await fetchArticle('en', t);
  }
  if (!art) return null;
  let sights = parseListings(art.text);
  if (sights.filter((x) => x.kind === 'ver').length < 6) {
    for (const d of districtsOf(art.page, art.text)) {
      const sub = await fetchArticle(lang, d).catch(() => null);
      if (sub) sights = [...sights, ...parseListings(sub.text)];
      if (sights.filter((x) => x.kind === 'ver').length >= 20) break;
    }
    const seen = new Set<string>();
    sights = [...sights.filter((x) => x.kind === 'ver'), ...sights.filter((x) => x.kind === 'hacer')].filter((x) => !seen.has(x.name.toLowerCase()) && !!seen.add(x.name.toLowerCase()));
  }
  return { page: art.page, sights };
}

/** Busca (o reutiliza, si son recientes) los lugares de interés de un destino. */
export async function getSights(place: string, force = false): Promise<SightsResult | null> {
  const q = place.trim();
  if (!q) return null;
  const cached = await cachedSights(q);
  if (cached && !force && Date.now() - cached.fetchedAt < 30 * 86400_000) return cached;
  if (!navigator.onLine) return cached;
  const ver = (r: { sights: Sight[] } | null) => r?.sights.filter((x) => x.kind === 'ver').length ?? 0;
  try {
    const es = await collect('es', q);
    let best: { lang: 'es' | 'en'; page: string; sights: Sight[] } | null = es ? { lang: 'es', ...es } : null;
    if (ver(es) < 6) {
      const en = await collect('en', q);
      if (en && ver(en) > ver(es)) best = { lang: 'en', ...en };
    }
    if (!best || !best.sights.length) return cached;
    const res: SightsResult = { place: q, lang: best.lang, page: best.page, sights: best.sights.slice(0, 24), fetchedAt: Date.now() };
    await db.kv.put({ key: key(q), value: res });
    return res;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
}
