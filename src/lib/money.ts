/**
 * Dinero en unidades menores enteras (céntimos). Nunca se opera con decimales flotantes.
 */
export type Minor = number;

const decimalsCache = new Map<string, number>();

export function currencyDecimals(currency: string): number {
  const c = currency.toUpperCase();
  const hit = decimalsCache.get(c);
  if (hit !== undefined) return hit;
  let d = 2;
  try {
    d = new Intl.NumberFormat('es-ES', { style: 'currency', currency: c }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    d = 2;
  }
  decimalsCache.set(c, d);
  return d;
}

/**
 * Convierte un texto introducido por el usuario a unidades menores.
 * Admite "1.234,56", "1234.56", "12,5", "1 234,5", "€ 20". Devuelve null si no es válido.
 */
export function parseAmount(input: string, currency = 'EUR'): Minor | null {
  const decimals = currencyDecimals(currency);
  let s = input.trim().replace(/[\s  ]/g, '').replace(/[^\d.,-]/g, '');
  if (!s) return null;
  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  if (s.includes('-') || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart = s;
  let fracPart = '';
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.';
    const idx = s.lastIndexOf(dec);
    intPart = s.slice(0, idx).replace(/[.,]/g, '');
    fracPart = s.slice(idx + 1);
  } else if (lastComma >= 0) {
    if ((s.match(/,/g) ?? []).length > 1) {
      if (!/^\d{1,3}(,\d{3})+$/.test(s)) return null;
      intPart = s.replace(/,/g, '');
    } else {
      intPart = s.slice(0, lastComma);
      fracPart = s.slice(lastComma + 1);
    }
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      intPart = s.replace(/\./g, ''); // 1.234 → miles (uso habitual en España)
    } else if ((s.match(/\./g) ?? []).length > 1) {
      return null;
    } else {
      intPart = s.slice(0, lastDot);
      fracPart = s.slice(lastDot + 1);
    }
  }
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (intPart === '') intPart = '0';

  // Redondeo half-up con aritmética de cadenas/enteros.
  let frac = fracPart.padEnd(decimals + 1, '0');
  const roundDigit = Number(frac[decimals] ?? '0');
  frac = frac.slice(0, decimals);
  let value = Number(intPart) * 10 ** decimals + (decimals ? Number(frac) : 0);
  if (roundDigit >= 5) value += 1;
  if (!Number.isSafeInteger(value)) return null;
  return negative ? -value : value;
}

/** Texto editable a partir de unidades menores ("12,50"). */
export function minorToInput(minor: Minor, currency = 'EUR'): string {
  const d = currencyDecimals(currency);
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const int = Math.floor(abs / 10 ** d);
  const frac = d ? String(abs % 10 ** d).padStart(d, '0') : '';
  return `${neg ? '-' : ''}${int}${d ? ',' + frac : ''}`;
}

const fmtCache = new Map<string, Intl.NumberFormat>();
export function formatMoney(minor: Minor, currency = 'EUR', opts: { compact?: boolean } = {}): string {
  const c = currency.toUpperCase();
  const d = currencyDecimals(c);
  const key = `${c}|${opts.compact ? 1 : 0}`;
  let f = fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: c,
        minimumFractionDigits: opts.compact ? 0 : d,
        maximumFractionDigits: opts.compact ? 0 : d,
      });
    } catch {
      f = new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    fmtCache.set(key, f);
  }
  // División única para mostrar: no se reutiliza el resultado en cálculos.
  return f.format(minor / 10 ** d);
}

/**
 * Reparte `total` según pesos enteros no negativos (método del mayor resto).
 * La suma del resultado es exactamente `total`. Desempates estables por índice.
 */
export function allocate(total: Minor, weights: number[]): Minor[] {
  const n = weights.length;
  if (n === 0) return [];
  const W = weights.reduce((a, b) => a + b, 0);
  if (W <= 0) return weights.map(() => 0);
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const base = weights.map((w) => Math.floor((abs * w) / W));
  let rest = abs - base.reduce((a, b) => a + b, 0);
  const order = weights
    .map((w, i) => ({ i, r: (abs * w) % W }))
    .filter((x) => weights[x.i] > 0)
    .sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; rest > 0 && order.length; k = (k + 1) % order.length, rest--) base[order[k].i] += 1;
  return base.map((v) => v * sign);
}

/** Conversión con tipo de cambio manual expresado como texto decimal ("1,0835"). */
export function convertMinor(amount: Minor, fromCurrency: string, toCurrency: string, rate: string): Minor | null {
  const r = rate.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(r)) return null;
  const [ri, rf = ''] = r.split('.');
  const scale = 10 ** rf.length;
  const rateScaled = Number(ri) * scale + (rf ? Number(rf) : 0); // tipo × scale (entero)
  if (rateScaled <= 0) return null;
  const dFrom = currencyDecimals(fromCurrency);
  const dTo = currencyDecimals(toCurrency);
  // amount / 10^dFrom * rate * 10^dTo  → entero redondeado half-up
  const num = BigInt(amount) * BigInt(rateScaled) * 10n ** BigInt(dTo);
  const den = BigInt(scale) * 10n ** BigInt(dFrom);
  const q = num / den;
  const rem = num % den;
  const rounded = rem * 2n >= den ? q + 1n : q;
  return Number(rounded);
}

export const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL',
  'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'MAD', 'THB', 'CNY', 'KRW', 'INR', 'AED', 'ISK', 'NZD',
] as const;
