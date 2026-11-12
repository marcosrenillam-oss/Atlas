import { useEffect, useRef, useState, type ReactNode } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Número que cuenta hasta su valor al aparecer o cambiar. */
export function CountUp({ value, format = (n) => String(Math.round(n)), ms = 900 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(reduced() ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{format(shown)}</>;
}

let gradSeq = 0;
/** Anillo de progreso con degradado, animado al montarse. */
export function Ring({ value, size = 56, stroke = 6, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const [p, setP] = useState(reduced() ? value : 0);
  const id = useRef(`rg${++gradSeq}`);
  useEffect(() => {
    const t = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, value))));
    return () => cancelAnimationFrame(t);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={id.current} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22c1c3" />
            <stop offset=".55" stopColor="#1e7bd8" />
            <stop offset="1" stopColor="#3a4bd8" />
          </linearGradient>
        </defs>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="bar" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id.current})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      {children !== undefined && <div className="label">{children}</div>}
    </div>
  );
}

const COLORS = ['#22c1c3', '#1e7bd8', '#ff8a6b', '#f2c46d', '#5eead4', '#3a4bd8'];
const STAR = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 0c.7 6.6 4.9 10.8 12 12-7.1 1.2-11.3 5.4-12 12-.7-6.6-4.9-10.8-12-12C7.1 10.8 11.3 6.6 12 0z"/></svg>';

/** Pequeña explosión de destellos en un punto de la pantalla (recompensa al completar). */
export function celebrate(x: number, y: number, count = 10) {
  if (reduced()) return;
  const host = document.createElement('div');
  host.className = 'burst';
  host.style.left = `${x}px`;
  host.style.top = `${y}px`;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 34 + Math.random() * 30;
    s.style.setProperty('--x', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--y', `${Math.sin(ang) * dist}px`);
    s.style.setProperty('--s', `${0.5 + Math.random() * 0.7}`);
    s.style.setProperty('--r', `${Math.random() * 240 - 120}deg`);
    s.style.setProperty('--c', COLORS[i % COLORS.length]);
    s.innerHTML = STAR;
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 1000);
  try {
    navigator.vibrate?.(12);
  } catch {
    /* sin vibración */
  }
}

export function celebrateFrom(el: Element | null, count?: number) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  celebrate(r.left + r.width / 2, r.top + r.height / 2, count);
}
