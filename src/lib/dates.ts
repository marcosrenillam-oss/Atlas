/** Fechas de calendario como 'YYYY-MM-DD' en hora local (sin zonas horarias). */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today(): ISODate {
  return toISODate(new Date());
}
export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}
export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}
/** Días de b − a (enteros, robusto ante cambios de horario). */
export function diffDays(a: ISODate, b: ISODate): number {
  const A = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const B = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((B - A) / 86400000);
}
export function eachDay(start: ISODate, end: ISODate, max = 370): ISODate[] {
  const out: ISODate[] = [];
  if (!isISODate(start) || !isISODate(end) || end < start) return out;
  let cur = start;
  while (cur <= end && out.length < max) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

const F = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', o);
const fDayShort = F({ day: 'numeric', month: 'short' });
const fDayYear = F({ day: 'numeric', month: 'short', year: 'numeric' });
const fWeekday = F({ weekday: 'long', day: 'numeric', month: 'long' });
const fWeekdayShort = F({ weekday: 'short', day: 'numeric', month: 'short' });
const fLong = F({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fTime = F({ hour: '2-digit', minute: '2-digit' });

const clean = (s: string) => s.replace(/\./g, '');
export const fmt = {
  dayShort: (s: ISODate) => clean(fDayShort.format(parseISODate(s))),
  dayYear: (s: ISODate) => clean(fDayYear.format(parseISODate(s))),
  weekday: (s: ISODate) => fWeekday.format(parseISODate(s)),
  weekdayShort: (s: ISODate) => clean(fWeekdayShort.format(parseISODate(s))),
  long: (d: Date) => fLong.format(d),
  time: (d: Date) => fTime.format(d),
};

/** "12 – 18 may 2026", "28 dic 2026 – 3 ene 2027". */
export function formatRange(start?: ISODate, end?: ISODate): string {
  if (!start && !end) return 'Sin fechas';
  if (start && !end) return fmt.dayYear(start);
  if (!start && end) return `Hasta ${fmt.dayYear(end)}`;
  const s = start!, e = end!;
  if (s === e) return fmt.dayYear(s);
  const sameYear = s.slice(0, 4) === e.slice(0, 4);
  const sameMonth = sameYear && s.slice(5, 7) === e.slice(5, 7);
  if (sameMonth) return `${Number(s.slice(8))} – ${fmt.dayYear(e)}`;
  if (sameYear) return `${fmt.dayShort(s)} – ${fmt.dayYear(e)}`;
  return `${fmt.dayYear(s)} – ${fmt.dayYear(e)}`;
}

/** "HH:MM" válido. */
export function isTime(s: unknown): s is string {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
export function addMinutesToTime(t: string, minutes: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
export function formatDuration(min?: number): string {
  if (!min || min <= 0) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
