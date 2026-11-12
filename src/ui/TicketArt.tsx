/**
 * Ilustración de portada sin foto: un avión con su estela y dos billetes de embarque
 * con la ciudad de salida y la de destino. Vectorial, sin IA ni conexión.
 */
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

function shortDate(iso?: string) {
  if (!iso) return 'SIN FECHA';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Ajusta tamaño de letra al largo del nombre para que quepa en el billete. */
function fit(name: string, max: number, base: number) {
  if (name.length <= max) return base;
  return Math.max(base * 0.55, (base * max) / name.length);
}

const PLANE = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

export function TicketArt({ from, to, date, travelers, extra, accent, bg }: {
  from: string;
  to: string;
  date?: string;
  travelers?: number;
  extra?: number;
  accent: string;
  bg: string;
}) {
  const f = from.trim() || 'Origen';
  const t = to.trim() || 'Destino';
  const fs = fit(f, 9, 21);
  const ts = fit(t, 9, 21);
  const ink = '#0d2233';
  const sub = '#6b7f8c';
  return (
    <svg className="ticket-art" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <filter id="tk-sh" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0a2840" floodOpacity="0.28" />
        </filter>
        <clipPath id="tk-clip"><rect x="0" y="0" width="236" height="104" rx="14" /></clipPath>
      </defs>

      {/* Estela punteada y avión */}
      <path className="tk-trail" d="M28 214 C 110 200, 150 120, 250 70 S 360 26, 374 22" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="2.4" strokeDasharray="2 9" strokeLinecap="round" />
      <g className="tk-plane" transform="translate(356 10) rotate(64 12 12)">
        <circle cx="12" cy="12" r="20" fill="#fff" fillOpacity="0.22" />
        <path d={PLANE} fill="#fff" transform="translate(0 0)" />
      </g>

      {/* Billete trasero */}
      <g transform="translate(58 70) rotate(-9)" filter="url(#tk-sh)" className="tk-back">
        <rect width="236" height="104" rx="14" fill="#fff" fillOpacity="0.62" />
        <text x="18" y="30" fontSize="9" fontWeight="700" letterSpacing="1.6" fill={ink} fillOpacity="0.5">TARJETA DE EMBARQUE</text>
        <text x="18" y="62" fontSize="20" fontWeight="800" fill={ink} fillOpacity="0.35">ATLAS</text>
      </g>

      {/* Billete delantero */}
      <g transform="translate(118 96) rotate(4)" filter="url(#tk-sh)" className="tk-front">
        <g clipPath="url(#tk-clip)">
          <rect width="236" height="104" rx="14" fill="#fff" />
          <rect width="236" height="6" fill={accent} />
          {/* talón */}
          <rect x="176" y="0" width="60" height="104" fill={accent} fillOpacity="0.1" />
        </g>
        {/* perforación */}
        <line x1="176" y1="12" x2="176" y2="96" stroke={sub} strokeOpacity="0.45" strokeWidth="1.4" strokeDasharray="3 4" />
        <circle cx="176" cy="0" r="7" fill={bg} />
        <circle cx="176" cy="104" r="7" fill={bg} />

        <text x="16" y="26" fontSize="7.5" fontWeight="700" letterSpacing="1.3" fill={sub}>DESDE</text>
        <text x="16" y="49" fontSize={fs} fontWeight="800" fill={ink} letterSpacing="-0.3">{f}</text>
        <g transform="translate(78 54)">
          <line x1="0" y1="6" x2="22" y2="6" stroke={accent} strokeWidth="1.6" strokeDasharray="2 3" />
          <path d={PLANE} fill={accent} transform="translate(22 -3) rotate(90 9 9) scale(0.75)" />
        </g>
        <text x="16" y="74" fontSize="7.5" fontWeight="700" letterSpacing="1.3" fill={sub}>A</text>
        <text x="16" y="95" fontSize={ts} fontWeight="800" fill={accent} letterSpacing="-0.3">{t}{extra ? ` +${extra}` : ''}</text>

        <text x="186" y="26" fontSize="7" fontWeight="700" letterSpacing="1.1" fill={sub}>FECHA</text>
        <text x="186" y="40" fontSize="11" fontWeight="800" fill={ink}>{shortDate(date)}</text>
        <text x="186" y="58" fontSize="7" fontWeight="700" letterSpacing="1.1" fill={sub}>PAX</text>
        <text x="186" y="72" fontSize="11" fontWeight="800" fill={ink}>{travelers ?? 1}</text>
        {/* código de barras decorativo */}
        <g fill={ink} fillOpacity="0.8">
          {[0, 3, 5, 9, 11, 14, 18, 20, 23, 27, 29, 32, 35, 37, 40].map((x, i) => (
            <rect key={x} x={186 + x} y="80" width={i % 3 === 0 ? 2 : 1} height="14" />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Versión mínima para miniaturas: solo el avión. */
export function PlaneMini() {
  return (
    <svg className="ticket-mini" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PLANE} fill="#fff" transform="rotate(45 12 12)" />
    </svg>
  );
}
