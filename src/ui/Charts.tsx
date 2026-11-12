import { formatMoney, type Minor } from '../lib/money';

/** Paleta sobria basada en azul oscuro y azul grisáceo, distinguible en claro y oscuro. */
export const SERIES = ['#1e7bd8', '#22c1c3', '#ff8a6b', '#e2b25c', '#3a4bd8', '#6fbf9a', '#93a6b4', '#e07a96'];
export const SERIES_DARK = ['#60a5fa', '#5eead4', '#ffa58c', '#f2cd7d', '#8fa2ff', '#86d9b2', '#a7b8c4', '#f29bb2'];
export const seriesColor = (i: number) => (document.documentElement.dataset.theme === 'dark' ? SERIES_DARK : SERIES)[i % SERIES.length];

export interface Slice {
  label: string;
  value: Minor;
}

export function Donut({ slices, currency, center }: { slices: Slice[]; currency: string; center?: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 128 128" role="img" aria-label={`Gasto por categoría. Total ${formatMoney(total, currency)}`}>
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--bg-elev)" strokeWidth="14" />
        {total > 0 &&
          slices.map((s, i) => {
            const len = (s.value / total) * C;
            const el = (
              <circle key={s.label} cx="64" cy="64" r={R} fill="none" stroke={seriesColor(i)} strokeWidth="14"
                strokeDasharray={`${Math.max(len - 1.5, 0.5)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 64 64)" />
            );
            acc += len;
            return el;
          })}
        <text x="64" y="60" textAnchor="middle" fontSize="10" fill="var(--text-2)">Total</text>
        <text x="64" y="76" textAnchor="middle" fontSize="13.5" fontWeight="650" fill="var(--text)">{center ?? formatMoney(total, currency, { compact: true })}</text>
      </svg>
      <div className="legend">
        {slices.map((s, i) => (
          <div className="li" key={s.label}>
            <span className="sw" style={{ background: seriesColor(i) }} />
            <span className="grow ellipsis">{s.label}</span>
            <span className="num muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Bars({ rows, currency }: { rows: { label: string; value: Minor; sub?: string }[]; currency: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <div className="bars">
      {rows.map((r, i) => (
        <div className="bar-row" key={r.label + i}>
          <div className="top">
            <span className="ellipsis">{r.label}</span>
            <span className="num">{formatMoney(r.value, currency)}</span>
          </div>
          <div className="progress">
            <div style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: seriesColor(i) }} />
          </div>
        </div>
      ))}
    </div>
  );
}
