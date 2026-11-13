import { Link } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { Cover } from '../../ui/Cover';
import { STATUS_LABEL } from '../../domain/catalog';
import { formatRange } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { daysUntil, tripLength } from '../../domain/status';
import type { TripWithStatus } from '../../data/queries';
import type { TripStatus } from '../../domain/types';

export const statusTone: Record<TripStatus, string> = {
  'en-preparacion': 'warn',
  proximo: 'accent',
  'en-curso': 'success',
  completado: '',
  archivado: '',
};

export function StatusPill({ status }: { status: TripStatus }) {
  return (
    <span className={`pill ${statusTone[status]}`}>
      <span className="dot" /> {STATUS_LABEL[status]}
    </span>
  );
}

export function destinationsLabel(t: { stages: { name: string }[] }): string {
  const names = t.stages.map((s) => s.name).filter(Boolean);
  if (!names.length) return 'Sin destino';
  return names.length > 2 ? `${names.slice(0, 2).join(' · ')} +${names.length - 2}` : names.join(' · ');
}

/** Texto de la etiqueta rosa de la tarjeta: cuánto falta o en qué estado está. */
export function tripTag(trip: TripWithStatus): string {
  const d = daysUntil(trip);
  if (trip.status === 'en-curso') return 'De viaje ahora';
  if (trip.status === 'completado') return 'Completado';
  if (trip.status === 'archivado') return 'Archivado';
  if (d !== null && d >= 0) return d === 0 ? '¡Sales hoy!' : d === 1 ? 'Sales mañana' : `En ${d} días`;
  return STATUS_LABEL[trip.status];
}

/** Tarjeta de viaje: foto a sangre (la tuya o la del país), etiqueta rosa y datos clave encima. */
export function TripCard({ trip, onMore }: { trip: TripWithStatus; onMore?: () => void }) {
  const len = tripLength(trip);
  return (
    <div style={{ position: 'relative' }}>
      <Link to={`/viajes/${trip.id}`} className="trip-card photo-card" aria-label={`Abrir ${trip.name}`}>
        <Cover trip={trip} />
        <div className="shade" />
        <span className="tag tag-blush">{tripTag(trip)}</span>
        <div className="info">
          <div style={{ minWidth: 0 }}>
            <h3 className="ellipsis">{trip.name}</h3>
            <div className="sub ellipsis">{destinationsLabel(trip)}</div>
            <div className="sub ellipsis">{formatRange(trip.startDate, trip.endDate)} · {trip.travelers} {trip.travelers === 1 ? 'viajero' : 'viajeros'}</div>
          </div>
          {(trip.budget || len) && (
            <div className="aside">
              {trip.budget ? <b>{formatMoney(trip.budget, trip.currency, { compact: true })}</b> : <b>{len} {len === 1 ? 'día' : 'días'}</b>}
              {trip.budget && len ? <small>/ {len} {len === 1 ? 'día' : 'días'}</small> : <small>de viaje</small>}
            </div>
          )}
        </div>
      </Link>
      {onMore && (
        <button className="glass-circle" aria-label={`Opciones de ${trip.name}`} onClick={onMore}>
          <MoreHorizontal />
        </button>
      )}
    </div>
  );
}

export function TripRow({ trip }: { trip: TripWithStatus }) {
  return (
    <Link to={`/viajes/${trip.id}`} className="trip-row list-row">
      <Cover trip={trip} mini />
      <div className="grow">
        <div className="ellipsis" style={{ fontWeight: 600 }}>{trip.name}</div>
        <div className="meta ellipsis">{formatRange(trip.startDate, trip.endDate)} · {destinationsLabel(trip)}</div>
      </div>
      <StatusPill status={trip.status} />
    </Link>
  );
}
