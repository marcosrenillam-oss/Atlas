import { useState } from 'react';
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
import { Cover, paletteFor } from '../../ui/Cover';
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
      const blob = await renderRecapImage(trip, s!);
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
        <div className="recap-hero">
          {heroUrl ? <img src={heroUrl} alt="" /> : <Cover trip={trip} />}
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

/** Dibuja la tarjeta de Stories en un canvas (sin servicios externos). */
async function renderRecapImage(trip: Trip, s: RecapStats): Promise<Blob> {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const [a, b, d] = paletteFor(trip.stages[0]?.name || trip.name);
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, a);
  bg.addColorStop(0.55, b);
  bg.addColorStop(1, d);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Foto principal
  let y = 120;
  if (s.heroPhotoId) {
    const f = await db.files.get(s.heroPhotoId);
    if (f) {
      try {
        const img = await loadImage(f.blob);
        const bw = W - 160, bh = 820;
        const r = Math.max(bw / img.width, bh / img.height);
        const sw = bw / r, sh = bh / r;
        g.save();
        roundRect(g, 80, y, bw, bh, 56);
        g.clip();
        g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 80, y, bw, bh);
        g.restore();
        y += bh + 70;
      } catch {
        /* imagen no decodificable */
      }
    }
  }
  if (y === 120) y = 360;
  const sans = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
  g.fillStyle = '#fff';
  g.font = `800 92px ${sans}`;
  y = wrapText(g, trip.name, 80, y + 80, W - 160, 100);
  g.globalAlpha = 0.9;
  g.font = `500 44px ${sans}`;
  g.fillText(formatRange(trip.startDate, trip.endDate), 80, y + 30);
  g.globalAlpha = 1;
  y += 110;
  const cells = [
    [String(s.days), s.days === 1 ? 'día' : 'días'],
    [String(s.destinations), s.destinations === 1 ? 'destino' : 'destinos'],
    [s.km.toLocaleString('es-ES'), 'km'],
    [formatMoney(s.spent, trip.currency, { compact: true }), 'gastado'],
  ];
  const cw = (W - 160 - 30) / 2;
  cells.forEach(([v, l], i) => {
    const x = 80 + (i % 2) * (cw + 30);
    const yy = y + Math.floor(i / 2) * 200;
    g.fillStyle = 'rgba(255,255,255,0.2)';
    roundRect(g, x, yy, cw, 170, 40);
    g.fill();
    g.fillStyle = '#fff';
    g.font = `800 72px ${sans}`;
    g.fillText(v, x + 36, yy + 92);
    g.font = `600 36px ${sans}`;
    g.globalAlpha = 0.85;
    g.fillText(l, x + 36, yy + 140);
    g.globalAlpha = 1;
  });
  g.font = `800 40px ${sans}`;
  g.fillStyle = '#fff';
  g.globalAlpha = 0.9;
  g.fillText('ATLAS ✦', 80, H - 90);
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
