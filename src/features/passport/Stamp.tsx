import { flag } from './achievements';

/** Sello de pasaporte dibujado (SVG): forma, tinta e inclinación propias de cada país. */
const INKS = ['#c2463a', '#1f4e79', '#2e7d5b', '#7a3e9d', '#b5651d', '#0f6f78'];
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function Stamp({ code, name, year, trips }: { code: string; name: string; year?: string; trips: number }) {
  const h = hash(code);
  const ink = INKS[h % INKS.length];
  const shape = h % 3; // 0 círculo · 1 rectángulo · 2 óvalo
  const rot = ((h >> 4) % 25) - 12;
  const label = name.toUpperCase();
  const fid = `ink-${code}`;
  const small = label.length > 12;
  return (
    <figure className="stamp" style={{ transform: `rotate(${rot}deg)` }} aria-label={`Sello de ${name}${year ? `, ${year}` : ''}`}>
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <defs>
          <filter id={fid}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={h % 97} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.25" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
          <path id={`arc-${code}`} d="M 22 60 A 38 38 0 1 1 98 60" />
        </defs>
        <g filter={`url(#${fid})`} fill="none" stroke={ink} opacity="0.88">
          {shape === 0 && (<><circle cx="60" cy="60" r="52" strokeWidth="4" /><circle cx="60" cy="60" r="44" strokeWidth="1.5" /></>)}
          {shape === 1 && (<><rect x="8" y="18" width="104" height="84" rx="10" strokeWidth="4" /><rect x="15" y="25" width="90" height="70" rx="6" strokeWidth="1.5" /></>)}
          {shape === 2 && (<><ellipse cx="60" cy="60" rx="54" ry="44" strokeWidth="4" /><ellipse cx="60" cy="60" rx="46" ry="36" strokeWidth="1.5" strokeDasharray="3 3" /></>)}
          {shape === 0 ? (
            <text fill={ink} stroke="none" fontSize={small ? 9 : 11} fontWeight="800" letterSpacing="1.5" fontFamily="-apple-system, system-ui, sans-serif">
              <textPath href={`#arc-${code}`} startOffset="50%" textAnchor="middle">{label}</textPath>
            </text>
          ) : (
            <text x="60" y={shape === 1 ? 42 : 38} textAnchor="middle" fill={ink} stroke="none" fontSize={small ? 9 : 11} fontWeight="800" letterSpacing="1.2" fontFamily="-apple-system, system-ui, sans-serif">{label}</text>
          )}
          <text x="60" y={shape === 0 ? 92 : 88} textAnchor="middle" fill={ink} stroke="none" fontSize="9" fontWeight="700" letterSpacing="1.5" fontFamily="-apple-system, system-ui, sans-serif">
            {`ENTRADA${year ? ` · ${year}` : ''}`}
          </text>
          {trips > 1 && <text x="60" y={shape === 0 ? 104 : 100} textAnchor="middle" fill={ink} stroke="none" fontSize="8" fontWeight="700" fontFamily="-apple-system, system-ui, sans-serif">{`×${trips}`}</text>}
        </g>
      </svg>
      <span className="stamp-flag" aria-hidden="true">{flag(code)}</span>
    </figure>
  );
}
