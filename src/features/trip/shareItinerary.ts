import sixCapsUrl from '@fontsource/six-caps/files/six-caps-latin-400-normal.woff2?url';
import { db } from '../../data/db';
import { itemTypeLabel } from '../../domain/catalog';
import { tripLength } from '../../domain/status';
import type { ItineraryItem, Participant, Trip } from '../../domain/types';
import { addDays, formatRange } from '../../lib/dates';
import { destinationPhoto } from '../../ui/Cover';
import photos from '../../ui/cover-photos.json';

/**
 * Itinerario para compartir: un único archivo HTML, autónomo (foto, tipografía y estilos dentro),
 * que se abre en cualquier móvil u ordenador sin tener ATLAS. Se puede imprimir o guardar como PDF.
 */
export interface ShareOptions {
  /** Localizadores de reservas y notas (pueden ser privados). */
  includePrivate: boolean;
}

const esc = (s = '') => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const CREDITS = (photos as { credit: Record<string, string> }).credit;

async function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Foto de portada (la del usuario o la del país) reducida para que el archivo pese poco. */
async function coverData(trip: Trip): Promise<{ src: string; credit?: string } | null> {
  try {
    let blob: Blob | null = null;
    let credit: string | undefined;
    if (trip.cover?.fileId) {
      blob = (await db.files.get(trip.cover.fileId))?.blob ?? null;
      credit = trip.cover.credit;
    } else {
      const id = destinationPhoto(trip);
      if (id) {
        const r = await fetch(`${import.meta.env.BASE_URL}world/${id}.jpg`);
        if (r.ok) blob = await r.blob();
        credit = CREDITS[id] ? `Foto: ${CREDITS[id]}` : undefined;
      }
    }
    if (!blob) return null;
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 1200 / bmp.width);
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.78));
    return out ? { src: await toDataUrl(out), credit } : null;
  } catch {
    return null;
  }
}

async function fontData(): Promise<string | null> {
  try {
    const r = await fetch(sixCapsUrl);
    return r.ok ? await toDataUrl(await r.blob()) : null;
  } catch {
    return null;
  }
}

const dayTitle = (iso: string) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const mapsLink = (it: ItineraryItem) => {
  const q = it.location?.name || it.location?.address || '';
  const p = it.location?.point;
  if (!q && !p) return '';
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (p) params.set('ll', `${p.lat},${p.lng}`);
  return `https://maps.apple.com/?${params}`;
};
const dur = (m?: number) => (!m ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

export async function buildItineraryHtml(trip: Trip, items: ItineraryItem[], people: Participant[], opts: ShareOptions): Promise<string> {
  const [cover, font] = await Promise.all([coverData(trip), fontData()]);
  const len = tripLength(trip);
  const sorted = [...items].sort((a, b) => (a.startTime ?? '99').localeCompare(b.startTime ?? '99') || a.order - b.order);
  const byDay = new Map<string, ItineraryItem[]>();
  for (const it of sorted) if (it.date) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  const days: string[] = [];
  if (trip.startDate && trip.endDate) for (let d = trip.startDate; d <= trip.endDate && days.length < 120; d = addDays(d, 1)) days.push(d);
  for (const d of [...byDay.keys()].sort()) if (!days.includes(d)) days.push(d);
  days.sort();
  const ideas = sorted.filter((i) => !i.date);

  const itemHtml = (it: ItineraryItem) => {
    const link = mapsLink(it);
    const where = it.location?.name || it.location?.address;
    const extra = [itemTypeLabel(it.type), it.to ? `→ ${esc(it.to)}` : '', dur(it.durationMin)].filter(Boolean).join(' · ');
    return `<li class="it">
      <div class="time">${esc(it.startTime ?? '')}</div>
      <div class="body">
        <div class="t">${esc(it.title)}</div>
        <div class="m">${extra}</div>
        ${where ? `<div class="w">${link ? `<a href="${esc(link)}">📍 ${esc(where)}</a>` : `📍 ${esc(where)}`}</div>` : ''}
        ${opts.includePrivate && it.booking ? `<div class="w">Reserva: <b>${esc(it.booking)}</b></div>` : ''}
        ${opts.includePrivate && it.notes ? `<div class="n">${esc(it.notes)}</div>` : ''}
      </div></li>`;
  };
  const dayHtml = (d: string, i: number) => {
    const list = byDay.get(d) ?? [];
    return `<section class="day">
      <h2><span class="num">Día ${i + 1}</span> ${esc(dayTitle(d))}</h2>
      ${list.length ? `<ol>${list.map(itemHtml).join('')}</ol>` : '<p class="empty">Día libre</p>'}
    </section>`;
  };
  const stays = sorted.filter((i) => i.type === 'alojamiento');
  const who = people.map((p) => p.name).filter(Boolean);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(trip.name)} · Itinerario</title>
<style>
${font ? `@font-face{font-family:'Six Caps';src:url(${font}) format('woff2');font-display:swap}` : ''}
:root{--ink:#111113;--muted:#5d6168;--line:#e6e7ea;--blush:#f3b9ad;--blush-ink:#4a1f17;--bg:#f2f3f5}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif}
.wrap{max-width:720px;margin:0 auto;padding:0 0 40px}
.hero{position:relative;min-height:340px;display:flex;align-items:flex-end;color:#fff;background:#1b1b1d center/cover no-repeat;border-radius:0 0 32px 32px;overflow:hidden}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.78),rgba(0,0,0,0) 65%)}
.hero .in{position:relative;z-index:1;padding:28px 22px 22px;width:100%}
.tag{display:inline-block;background:var(--blush);color:var(--blush-ink);border-radius:999px;padding:5px 12px;font-size:13px;font-weight:650}
h1{font-family:'Six Caps',Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:72px;line-height:1;letter-spacing:.01em;margin:10px 0 4px}
.sub{opacity:.88}
.credit{position:absolute;z-index:1;top:10px;right:14px;font-size:10px;opacity:.75}
.facts{display:flex;flex-wrap:wrap;gap:8px;padding:16px 18px 4px}
.fact{background:#fff;border-radius:16px;padding:10px 14px;font-size:14px;color:var(--muted)}.fact b{display:block;color:var(--ink);font-size:16px}
.day{background:#fff;margin:14px 14px 0;border-radius:24px;padding:16px 18px;break-inside:avoid}
.day h2{font-size:18px;margin:0 0 10px;letter-spacing:-.01em}.num{display:inline-block;background:var(--ink);color:#fff;border-radius:999px;padding:2px 10px;font-size:13px;margin-right:6px;vertical-align:2px}
ol{list-style:none;margin:0;padding:0}.it{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--line)}.it:first-child{border-top:0}
.time{flex:none;width:48px;font-weight:700;font-variant-numeric:tabular-nums}.t{font-weight:650}.m,.w,.n{font-size:14px;color:var(--muted)}.n{white-space:pre-wrap;margin-top:2px}
a{color:var(--ink)}.empty{color:var(--muted);margin:0}
.foot{text-align:center;color:var(--muted);font-size:12px;margin:22px 16px 0}
@media print{body{background:#fff}.day{border:1px solid var(--line)}.hero{border-radius:0;min-height:260px;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:12mm}}
</style></head><body><div class="wrap">
<header class="hero" style="${cover ? `background-image:url(${cover.src})` : ''}">
  ${cover?.credit ? `<div class="credit">${esc(cover.credit)}</div>` : ''}
  <div class="in">
    <span class="tag">Itinerario</span>
    <h1>${esc(trip.name)}</h1>
    <div class="sub">${esc(trip.stages.map((s) => s.name).filter(Boolean).join(' · '))}${trip.startDate ? ` · ${esc(formatRange(trip.startDate, trip.endDate))}` : ''}</div>
  </div>
</header>
<div class="facts">
  ${len ? `<div class="fact"><b>${len} ${len === 1 ? 'día' : 'días'}</b>de viaje</div>` : ''}
  ${trip.origin ? `<div class="fact"><b>${esc(trip.origin)}</b>salida</div>` : ''}
  ${who.length ? `<div class="fact"><b>${esc(who.join(', '))}</b>${who.length === 1 ? 'viajero' : 'viajeros'}</div>` : `<div class="fact"><b>${trip.travelers}</b>${trip.travelers === 1 ? 'viajero' : 'viajeros'}</div>`}
  ${stays.length ? `<div class="fact"><b>${esc(stays.map((s) => s.location?.name || s.title).join(' · '))}</b>alojamiento</div>` : ''}
</div>
${days.map(dayHtml).join('')}
${ideas.length ? `<section class="day"><h2><span class="num">Ideas</span> Sin día asignado</h2><ol>${ideas.map(itemHtml).join('')}</ol></section>` : ''}
<p class="foot">Hecho con ATLAS · ${esc(new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
</div></body></html>`;
}

/** Comparte el itinerario como archivo (WhatsApp, Mail, AirDrop…) o lo descarga si no se puede compartir. */
export async function shareItineraryFile(html: string, tripName: string): Promise<'shared' | 'downloaded'> {
  const name = `Itinerario - ${tripName.replace(/[\\/:*?"<>|]+/g, '').trim() || 'viaje'}.html`;
  const file = new File([html], name, { type: 'text/html' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `Itinerario · ${tripName}` });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** Abre el diálogo de impresión del sistema (en iPhone permite guardar como PDF). */
export function printItinerary(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = html;
  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    }, 300);
  };
  document.body.appendChild(frame);
}
