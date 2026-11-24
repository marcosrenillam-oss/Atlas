import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Share } from 'lucide-react';
import { db } from '../../data/db';
import type { GeoPoint, Trip } from '../../domain/types';
import { sumExpenses } from '../../domain/expenses';
import { tripLength } from '../../domain/status';
import { formatMoney } from '../../lib/money';
import { formatRange } from '../../lib/dates';
import { distanceKm } from '../../maps/external';
import { Sheet } from '../../ui/Sheet';
import { Cover, destinationPhoto } from '../../ui/Cover';
import { flag } from '../passport/achievements';
import { CountUp } from '../../ui/Motion';
import { useUI } from '../../ui/UIProvider';
import { useFileUrl } from '../../files/files';

export interface RecapStats {
  days: number;
  destinations: number;
  countries: number;
  km: number;
  places: number;
  done: number;
  activities: number;
  spent: number;
  photos: number;
  journal: number;
  heroPhotoId?: string;
  quote?: string;
}

/** Distancia aproximada del recorrido: origen → destinos en orden → origen. */
export function routeKm(trip: Pick<Trip, 'originPoint' | 'stages'>): number {
  const pts: GeoPoint[] = [];
  if (trip.originPoint) pts.push(trip.originPoint);
  for (const s of trip.stages) if (s.point) pts.push(s.point);
  if (trip.originPoint && pts.length > 1) pts.push(trip.originPoint);
  let km = 0;
  for (let i = 1; i < pts.length; i++) km += distanceKm(pts[i - 1], pts[i]);
  return Math.round(km);
}

export function useRecap(trip: Trip) {
  return useLiveQuery(async (): Promise<RecapStats> => {
    const [items, places, expenses, journal] = await Promise.all([
      db.items.where('tripId').equals(trip.id).toArray(),
      db.places.where('tripId').equals(trip.id).toArray(),
      db.expenses.where('tripId').equals(trip.id).toArray(),
      db.journal.where('tripId').equals(trip.id).sortBy('date'),
    ]);
    const photoIds = [...journal.flatMap((j) => j.photoIds), ...items.flatMap((i) => i.photoIds), ...places.flatMap((p) => p.photoIds)];
    const countries = new Set(trip.stages.map((s) => s.countryCode).filter(Boolean));
    const quote = journal.map((j) => j.text.trim()).filter(Boolean).sort((a, b) => b.length - a.length)[0];
    return {
      days: tripLength(trip) ?? 0,
      destinations: trip.stages.filter((s) => s.name.trim()).length,
      countries: countries.size,
      km: routeKm(trip),
      places: places.length,
      done: items.filter((i) => i.done).length,
      activities: items.length,
      spent: sumExpenses(expenses),
      photos: photoIds.length,
      journal: journal.length,
      heroPhotoId: trip.cover?.fileId ?? photoIds[0],
      quote: quote ? (quote.length > 140 ? quote.slice(0, 137).trimEnd() + '…' : quote) : undefined,
    };
  }, [trip]);
}

export function RecapSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const s = useRecap(trip);
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const heroUrl = useFileUrl(trip.cover ? undefined : s?.heroPhotoId);
  const [story, setStory] = useState<{ blob: Blob; url: string } | null>(null);
  useEffect(() => {
    if (!s) return;
    let url = '';
    let alive = true;
    void renderRecapImage(trip, s).then((blob) => {
      if (!alive) return;
      url = URL.createObjectURL(blob);
      setStory({ blob, url });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [trip, s]);
  if (!s) return null;
  const stats: { n: number; label: string; fmt?: (n: number) => string }[] = [
    { n: s.days, label: s.days === 1 ? 'día' : 'días' },
    { n: s.destinations, label: s.destinations === 1 ? 'destino' : 'destinos' },
    { n: s.countries, label: s.countries === 1 ? 'país' : 'países' },
    { n: s.km, label: 'km aprox.', fmt: (n) => Math.round(n).toLocaleString('es-ES') },
    { n: s.done, label: `de ${s.activities} planes hechos` },
    { n: s.photos, label: s.photos === 1 ? 'foto' : 'fotos' },
  ];

  async function share() {
    setBusy(true);
    try {
      const blob = story?.blob ?? (await renderRecapImage(trip, s!));
      const file = new File([blob], `${trip.name.replace(/[^\p{L}\p{N}]+/gu, '-')}-resumen.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: trip.name });
      else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') ui.toast('No se pudo crear la imagen.', { kind: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open full title="Resumen del viaje" onClose={onClose} closeLabel="Cerrar">
      <div className="recap stagger">
        <div className="story-preview">
          {story ? <img src={story.url} alt={`Historia de ${trip.name} para compartir`} /> : heroUrl ? <img src={heroUrl} alt="" /> : <Cover trip={trip} />}
        </div>
        <div>
          <h2 className="recap-title">{trip.name}</h2>
          <div className="muted">{formatRange(trip.startDate, trip.endDate)}</div>
        </div>
        <div className="recap-grid">
          {stats.map((x) => (
            <div key={x.label} className="stat">
              <div className="val"><CountUp value={x.n} format={x.fmt} ms={1200} /></div>
              <div className="lbl">{x.label}</div>
            </div>
          ))}
        </div>
        <div className="stat recap-spent">
          <div className="lbl">Gasto total</div>
          <div className="val"><CountUp value={s.spent} format={(n) => formatMoney(Math.round(n), trip.currency)} ms={1400} /></div>
        </div>
        {s.quote && <blockquote className="recap-quote">«{s.quote}»</blockquote>}
        <button className="btn block" onClick={() => void share()} disabled={busy}><Share /> {busy ? 'Creando imagen…' : 'Compartir como imagen'}</button>
        <p className="tiny faint center">La imagen se crea en tu móvil (formato Stories, 1080×1920). Los km son aproximados en línea recta entre tu origen y los destinos.</p>
      </div>
    </Sheet>
  );
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(blob);
  });
}

/** Foto para la historia: la tuya (portada o diario) o la del país del destino. */
async function storyPhoto(trip: Trip, s: RecapStats): Promise<HTMLImageElement | null> {
  try {
    if (s.heroPhotoId) {
      const f = await db.files.get(s.heroPhotoId);
      if (f) return await loadImage(f.blob);
    }
    const id = destinationPhoto(trip);
    if (id) {
      const r = await fetch(`${import.meta.env.BASE_URL}world/${id}.jpg`);
      if (r.ok) return await loadImage(await r.blob());
    }
  } catch {
    /* sin foto: fondo liso */
  }
  return null;
}

/** Dibuja la historia (1080×1920, formato Stories) en el propio móvil, con el estilo de ATLAS. */
async function renderRecapImage(trip: Trip, s: RecapStats): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  await document.fonts?.load('200px "Six Caps"').catch(() => undefined);
  const sans = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
  const poster = '"Six Caps", Impact, sans-serif-condensed, sans-serif';
  // Fondo: foto a sangre
  g.fillStyle = '#16171a';
  g.fillRect(0, 0, W, H);
  const img = await storyPhoto(trip, s);
  if (img) {
    const r = Math.max(W / img.width, H / img.height);
    const sw = W / r, sh = H / r;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
  }
  const shade = g.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0.35)');
  shade.addColorStop(0.28, 'rgba(0,0,0,0)');
  shade.addColorStop(0.5, 'rgba(0,0,0,0.25)');
  shade.addColorStop(0.72, 'rgba(0,0,0,0.82)');
  shade.addColorStop(1, 'rgba(0,0,0,0.94)');
  g.fillStyle = shade;
  g.fillRect(0, 0, W, H);
  // Cabecera: marca y fechas
  g.fillStyle = '#fff';
  g.font = `400 84px ${poster}`;
  g.fillText('ATLAS', 72, 150);
  g.font = `600 36px ${sans}`;
  g.textAlign = 'right';
  g.globalAlpha = 0.9;
  g.fillText(formatRange(trip.startDate, trip.endDate), W - 72, 140);
  g.globalAlpha = 1;
  g.textAlign = 'left';
  // Etiqueta rosa
  let y = 1010;
  g.font = `700 36px ${sans}`;
  const tag = 'Mi viaje';
  const tw = g.measureText(tag).width + 56;
  g.fillStyle = '#f3b9ad';
  roundRect(g, 72, y - 50, tw, 68, 34);
  g.fill();
  g.fillStyle = '#4a1f17';
  g.fillText(tag, 100, y - 4);
  // Título en letra de cartel
  y += 40;
  g.fillStyle = '#fff';
  const title = trip.name.toUpperCase();
  let fs = 260;
  g.font = `400 ${fs}px ${poster}`;
  while (fs > 150 && title.split(' ').some((w) => g.measureText(w).width > W - 144)) g.font = `400 ${(fs -= 10)}px ${poster}`;
  y = wrapText(g, title, 72, y + fs * 0.82, W - 144, fs * 0.92) + 20;
  // Ruta y banderas
  const route = [trip.origin, ...trip.stages.map((x) => x.name)].filter((x): x is string => !!x && !!x.trim());
  g.font = `600 42px ${sans}`;
  g.globalAlpha = 0.92;
  if (route.length) y = wrapText(g, route.join('  →  '), 72, y + 64, W - 144, 54);
  g.globalAlpha = 1;
  const flags = [...new Set(trip.stages.map((x) => x.countryCode).filter(Boolean))].map((cc) => flag(cc)).join(' ');
  if (flags) {
    g.font = `64px ${sans}`;
    g.fillText(flags, 72, y + 96);
    y += 96;
  }
  // Cifras
  y += 70;
  const cand: [number, string, string][] = [
    [s.days, String(s.days), s.days === 1 ? 'día' : 'días'],
    [s.km, s.km.toLocaleString('es-ES'), 'km'],
    [s.countries > 1 ? s.countries : 0, String(s.countries), 'países'],
    [s.destinations > 1 ? s.destinations : 0, String(s.destinations), 'destinos'],
    [s.done, String(s.done), s.done === 1 ? 'plan hecho' : 'planes hechos'],
    [s.spent, formatMoney(s.spent, trip.currency, { compact: true }), 'gastado'],
    [s.photos, String(s.photos), s.photos === 1 ? 'foto' : 'fotos'],
    [s.journal, String(s.journal), s.journal === 1 ? 'día en el diario' : 'días en el diario'],
  ];
  const cells = cand.filter(([n]) => n > 0).slice(0, 4).map(([, v, l]) => [v, l]);
  if (!cells.length) cells.push(['1', 'viaje']);
  const cw = (W - 144 - 24 * (cells.length - 1)) / cells.length;
  cells.forEach(([v, l], i) => {
    const x = 72 + i * (cw + 24);
    g.fillStyle = 'rgba(255,255,255,0.14)';
    roundRect(g, x, y, cw, 190, 36);
    g.fill();
    g.fillStyle = '#fff';
    let vs = 86;
    g.font = `400 ${vs}px ${poster}`;
    while (g.measureText(v).width > cw - 30 && vs > 40) g.font = `400 ${(vs -= 6)}px ${poster}`;
    g.fillText(v, x + 24, y + 104);
    g.font = `600 28px ${sans}`;
    g.globalAlpha = 0.82;
    g.fillText(l, x + 24, y + 152);
    g.globalAlpha = 1;
  });
  y += 190;
  // Frase del diario
  if (s.quote && y < H - 260) {
    g.font = `italic 500 40px ${sans}`;
    g.globalAlpha = 0.9;
    y = wrapText(g, `«${s.quote}»`, 72, y + 100, W - 144, 52);
    g.globalAlpha = 1;
  }
  // Pie
  g.font = `600 30px ${sans}`;
  g.globalAlpha = 0.7;
  g.fillText('Planificado con ATLAS · gratis y sin conexión', 72, H - 80);
  g.globalAlpha = 1;
  return new Promise((res, rej) => c.toBlob((bl) => (bl ? res(bl) : rej(new Error('canvas'))), 'image/png'));
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > max && line) {
      g.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  g.fillText(line, x, y);
  return y;
}
