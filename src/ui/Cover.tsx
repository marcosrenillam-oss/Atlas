import type { Trip } from '../domain/types';
import { useFileUrl } from '../files/files';
import { PlaneMini, TicketArt } from './TicketArt';

/** Portada: foto del usuario o, si no hay, un fondo neutro con curvas de nivel e iniciales. Nunca fotos inventadas. */
type CoverTrip = Pick<Trip, 'name' | 'cover' | 'stages'> & Partial<Pick<Trip, 'origin' | 'startDate' | 'travelers'>>;

export function Cover({ trip, className, style, showCredit, mini }: { trip: CoverTrip; className?: string; style?: React.CSSProperties; showCredit?: boolean; mini?: boolean }) {
  const url = useFileUrl(trip.cover?.fileId);
  const label = trip.stages[0]?.name || trip.name;
  return (
    <div className={`cover${url ? '' : ' fallback'} ${className ?? ''}`} style={style}>
      {url ? (
        <>
          <img src={url} alt="" loading="lazy" decoding="async" />
          {showCredit && trip.cover?.credit && <span className="credit">{trip.cover.credit}</span>}
        </>
      ) : (
        <CoverFallback label={label} trip={trip} mini={mini} />
      )}
    </div>
  );
}

/** Paletas vivas (base + tres manchas de color) inspiradas en atardeceres y cielos. */
const PALETTES: [string, string, string, string][] = [
  ['#14b8c4', '#5eead4', '#1e7bd8', '#a5f3fc'], // laguna
  ['#1e40af', '#22c1c3', '#3b82f6', '#93c5fd'], // mar abierto
  ['#ff8a6b', '#ffc27a', '#f2789a', '#fde3a7'], // atardecer en la costa
  ['#2a9d8f', '#9bd3ae', '#e9c46a', '#5eead4'], // olivo y salvia
  ['#6d7fe0', '#b4bdff', '#5eead4', '#dfe6ff'], // lavanda
  ['#d9975a', '#f6d5a7', '#ff8a6b', '#fff1d6'], // arena
  ['#2563eb', '#bae6fd', '#38bdf8', '#7dd3fc'], // Santorini
]

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export function paletteFor(label: string) {
  return PALETTES[hashString(label || 'atlas') % PALETTES.length];
}

const SPARK_PATH = 'M12 0c.7 6.6 4.9 10.8 12 12-7.1 1.2-11.3 5.4-12 12-.7-6.6-4.9-10.8-12-12C7.1 10.8 11.3 6.6 12 0z';

/** Portada sin foto: degradado vivo propio de cada destino, en movimiento lento, con su inicial en cursiva. */
export function CoverFallback({ label, trip, mini }: { label: string; trip?: CoverTrip; mini?: boolean }) {
  const h = hashString(label || 'atlas');
  const [base, a, b, c] = paletteFor(label);
  return (
    <div className="cover-fallback vivid" style={{ background: base }} aria-hidden="true">
      <div className="mesh">
        <i style={{ background: a, left: '-5%', top: '-10%' }} />
        <i style={{ background: b, right: '-10%', top: '10%' }} />
        <i style={{ background: c, left: '25%', bottom: '-30%' }} />
      </div>
      {[0, 1, 2].map((i) => (
        <svg key={i} className="spark" viewBox="0 0 24 24" style={{ left: `${6 + ((h >> (i * 3)) % 22)}%`, top: `${10 + ((h >> (i * 5)) % 40)}%`, animationDelay: `${-i * 1.2}s`, width: 8 + i * 3, height: 8 + i * 3 }}>
          <path fill="currentColor" d={SPARK_PATH} />
        </svg>
      ))}
      {mini ? (
        <PlaneMini />
      ) : (
        <div className="ticket-wrap">
          <TicketArt
            from={trip?.origin ?? ''}
            to={trip?.stages.find((x) => x.name.trim())?.name || trip?.name || label}
            extra={Math.max(0, (trip?.stages.filter((x) => x.name.trim()).length ?? 0) - 1)}
            date={trip?.startDate}
            travelers={trip?.travelers}
            accent={darken(base)}
            bg={base}
          />
        </div>
      )}
    </div>
  );
}

/** Oscurece un color para que el texto del billete tenga contraste sobre blanco. */
function darken(hex: string, k = 0.72): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
