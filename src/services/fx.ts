import { db } from '../data/db';

/** Tipos de cambio de referencia (Frankfurter: bancos centrales, gratis, sin clave). Caché para usarlos sin conexión. */
export interface FxRate {
  rate: number;
  date: string; // fecha del dato
  cached: boolean; // true si viene de la caché por falta de conexión
}

export async function getRate(from: string, to: string): Promise<FxRate | null> {
  const f = from.toUpperCase(), t = to.toUpperCase();
  if (f === t) return { rate: 1, date: new Date().toISOString().slice(0, 10), cached: false };
  const key = `fx:${f}:${t}`;
  const cached = (await db.kv.get(key))?.value as { rate: number; date: string; at: number } | undefined;
  const fresh = cached && Date.now() - cached.at < 6 * 3600_000;
  if (fresh) return { rate: cached.rate, date: cached.date, cached: false };
  if (navigator.onLine) {
    try {
      const r = await fetch(`https://api.frankfurter.dev/v2/rate/${f.toLowerCase()}/${t.toLowerCase()}`);
      if (r.ok) {
        const j = (await r.json()) as { rate: number; date: string };
        if (typeof j.rate === 'number' && j.rate > 0) {
          await db.kv.put({ key, value: { rate: j.rate, date: j.date, at: Date.now() } });
          return { rate: j.rate, date: j.date, cached: false };
        }
      }
    } catch {
      /* sin red o servicio caído: se usa la caché */
    }
  }
  return cached ? { rate: cached.rate, date: cached.date, cached: true } : null;
}

/** Tipo como texto editable con coma ("0,8940"). */
export function rateToInput(rate: number): string {
  const digits = rate >= 100 ? 2 : rate >= 1 ? 4 : 6;
  return rate.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}
