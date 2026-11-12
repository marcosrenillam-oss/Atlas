import { memo } from 'react';

const SPARK = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0c.7 6.6 4.9 10.8 12 12-7.1 1.2-11.3 5.4-12 12-.7-6.6-4.9-10.8-12-12C7.1 10.8 11.3 6.6 12 0z" /></svg>
);
export const SparkIcon = () => SPARK;

/** Posiciones deterministas (sin aleatoriedad en cada render). */
function seq(n: number, seed: number) {
  let s = seed;
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  });
}

/** Fondo aurora animado + destellos (claro) + cielo estrellado (oscuro). Fijo y sin interacción. */
export const Ambient = memo(function Ambient() {
  const r = seq(80, 7);
  return (
    <>
      <div className="aurora" aria-hidden="true">
        <i /><i /><i /><i />
        <div className="grain" />
      </div>
      <div className="sparkles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} style={{ left: `${i % 2 ? 91 + r[i] * 7 : 1 + r[i] * 6}%`, top: `${8 + r[i + 9] * 80}%`, animationDelay: `${-r[i + 18] * 5}s`, width: 6 + r[i + 27] * 9, height: 6 + r[i + 27] * 9 }}>
            {SPARK}
          </span>
        ))}
      </div>
      <div className="stars" aria-hidden="true">
        {Array.from({ length: 40 }, (_, i) => (
          <b key={i} style={{ left: `${r[(i * 2) % 80] * 100}%`, top: `${r[(i * 2 + 1) % 80] * 100}%`, animationDelay: `${-r[(i + 40) % 80] * 6}s` }} />
        ))}
      </div>
    </>
  );
});
