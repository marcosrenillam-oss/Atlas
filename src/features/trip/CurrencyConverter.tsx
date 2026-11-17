import { useEffect, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { CURRENCIES } from '../../lib/money';
import { getRate, type FxRate } from '../../services/fx';
import type { Trip } from '../../domain/types';

/** Moneda local de cada país (solo las que ofrece el servicio de cambios). */
const EURO = 'AT BE HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK'.split(' ');
const LOCAL: Record<string, string> = {
  US: 'USD', GB: 'GBP', CH: 'CHF', LI: 'CHF', JP: 'JPY', CA: 'CAD', AU: 'AUD', MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP', PE: 'PEN',
  BR: 'BRL', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', TR: 'TRY', MA: 'MAD', TH: 'THB', CN: 'CNY', KR: 'KRW',
  IN: 'INR', AE: 'AED', IS: 'ISK', NZ: 'NZD', EC: 'USD', SV: 'USD', PA: 'USD', TL: 'USD', FM: 'USD', MH: 'USD', PW: 'USD', KI: 'AUD', NR: 'AUD', TV: 'AUD',
};
export function localCurrency(trip: Pick<Trip, 'stages'>): string | null {
  for (const s of trip.stages) {
    const cc = s.countryCode?.toUpperCase();
    if (!cc) continue;
    if (EURO.includes(cc)) return 'EUR';
    if (LOCAL[cc]) return LOCAL[cc];
  }
  return null;
}

const SYMBOL: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩', INR: '₹', THB: '฿', TRY: '₺', CHF: 'CHF' };
const nf = (n: number, max = 2) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: max, minimumFractionDigits: 0 }).format(n);
const parse = (s: string) => {
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Conversor rápido de divisas para usar durante el viaje (funciona sin red con el último tipo guardado). */
export function CurrencyConverter({ trip, home, onClose }: { trip: Pick<Trip, 'stages' | 'currency'>; home: string; onClose: () => void }) {
  const local = localCurrency(trip);
  const [from, setFrom] = useState(local && local !== home ? local : trip.currency !== home ? trip.currency : home === 'EUR' ? 'USD' : 'EUR');
  const [to, setTo] = useState(home);
  const [text, setText] = useState('');
  const [fx, setFx] = useState<FxRate | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setFx(undefined);
    void getRate(from, to).then((r) => alive && setFx(r));
    return () => {
      alive = false;
    };
  }, [from, to]);

  const amount = parse(text || '0');
  const rate = fx?.rate ?? null;
  const big = (n: number) => (n >= 1000 ? nf(n, 0) : nf(n, n < 1 ? 4 : 2));
  const steps = rate && rate < 0.05 ? [100, 500, 1000, 2000, 5000, 10000] : [1, 5, 10, 20, 50, 100];
  const opts = [...new Set([from, to, ...CURRENCIES])];

  return (
    <Sheet open title="Divisas" onClose={onClose}>
      <div className="fx-card">
        <label className="fx-row">
          <select className="fx-cur" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Moneda de origen">
            {opts.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input className="fx-input" inputMode="decimal" autoComplete="off" placeholder="0" value={text} onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))} aria-label={`Cantidad en ${from}`} autoFocus />
        </label>
        <button type="button" className="fx-swap" aria-label="Intercambiar monedas" onClick={() => { setFrom(to); setTo(from); }}><ArrowDownUp /></button>
        <div className="fx-row">
          <select className="fx-cur" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Moneda de destino">
            {opts.map((c) => <option key={c}>{c}</option>)}
          </select>
          <output className="fx-out" aria-live="polite">{rate ? big(amount * rate) : '—'} <small>{SYMBOL[to] ?? to}</small></output>
        </div>
      </div>
      <p className="small muted" style={{ margin: '10px 4px 0' }}>
        {fx === undefined ? 'Buscando el tipo de cambio…' : rate ? `1 ${from} = ${nf(rate, rate < 1 ? 6 : 4)} ${to} · tipo de referencia del ${new Date(fx!.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : 'No hay ningún tipo guardado para estas monedas todavía.'}
      </p>
      {rate && (
        <div className="fx-table">
          {steps.map((n) => (
            <button key={n} type="button" onClick={() => setText(String(n))}>
              <span>{nf(n, 0)} {from}</span>
              <b>{big(n * rate)} {SYMBOL[to] ?? to}</b>
            </button>
          ))}
        </div>
      )}
      <p className="tiny faint" style={{ margin: '12px 4px 0' }}>Tipos de referencia de bancos centrales (Frankfurter). Tu banco o el cajero pueden aplicar comisiones.</p>
    </Sheet>
  );
}
