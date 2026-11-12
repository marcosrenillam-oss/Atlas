import { useEffect, useState } from 'react';
import { db } from '../data/db';
import type { GeoPoint } from '../domain/types';

/** Previsión diaria con Open-Meteo (gratis para uso no comercial, CC BY 4.0). Se guarda para verla sin conexión. */
export interface DayWeather {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number | null;
}
interface Cached {
  fetchedAt: number;
  days: DayWeather[];
}

const TTL = 3 * 3600_000;
const keyFor = (p: GeoPoint) => `weather:${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;

export async function getForecast(p: GeoPoint, force = false): Promise<Cached | null> {
  const key = keyFor(p);
  const cached = (await db.kv.get(key))?.value as Cached | undefined;
  if (cached && !force && Date.now() - cached.fetchedAt < TTL) return cached;
  if (!navigator.onLine) return cached ?? null;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`;
    const r = await fetch(url);
    if (!r.ok) return cached ?? null;
    const j = (await r.json()) as { daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: (number | null)[] } };
    const d = j.daily;
    const days = d.time.map((date, i) => ({ date, code: d.weather_code[i], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]), rain: d.precipitation_probability_max[i] }));
    const out = { fetchedAt: Date.now(), days };
    await db.kv.put({ key, value: out });
    return out;
  } catch {
    return cached ?? null;
  }
}

/** Previsión por fecha para un punto. undefined = cargando; null = sin datos. */
export function useForecast(p?: GeoPoint): { byDate: Map<string, DayWeather>; fetchedAt: number | null } | null | undefined {
  const [state, setState] = useState<{ byDate: Map<string, DayWeather>; fetchedAt: number | null } | null | undefined>(undefined);
  const lat = p?.lat, lng = p?.lng;
  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      setState(null);
      return;
    }
    let alive = true;
    void getForecast({ lat, lng }).then((c) => {
      if (alive) setState(c ? { byDate: new Map(c.days.map((d) => [d.date, d])), fetchedAt: c.fetchedAt } : null);
    });
    return () => {
      alive = false;
    };
  }, [lat, lng]);
  return state;
}

/** Códigos WMO → texto e icono (Lucide). */
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Despejado', icon: 'Sun' };
  if (code <= 2) return { label: 'Poco nuboso', icon: 'CloudSun' };
  if (code === 3) return { label: 'Nublado', icon: 'Cloud' };
  if (code === 45 || code === 48) return { label: 'Niebla', icon: 'CloudFog' };
  if (code >= 51 && code <= 57) return { label: 'Llovizna', icon: 'CloudDrizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Lluvia', icon: 'CloudRain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Nieve', icon: 'CloudSnow' };
  if (code >= 95) return { label: 'Tormenta', icon: 'CloudLightning' };
  return { label: 'Variable', icon: 'CloudSun' };
}
