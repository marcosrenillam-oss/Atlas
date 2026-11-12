import { Link } from 'react-router-dom';
import { CalendarDays, MoreHorizontal, Users } from 'lucide-react';
import { Cover } from '../../ui/Cover';
import { STATUS_LABEL } from '../../domain/catalog';
import { formatRange } from '../../lib/dates';
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

export function TripCard({ trip, onMore }: { trip: TripWithStatus; onMore?: () => void }) {
  return (
    <div style={{ position: 'relative' }}>
      <Link to={`/viajes/${trip.id}`} className="trip-card" aria-label={`Abrir ${trip.name}`}>
        <Cover trip={trip} />
        <div className="body">
          <div className="row-between">
            <h3 className="ellipsis">{trip.name}</h3>
            <StatusPill status={trip.status} />
          </div>
          <div className="muted small ellipsis">{destinationsLabel(trip)}</div>
          <div className="facts">
            <span><CalendarDays aria-hidden="true" /> {formatRange(trip.startDate, trip.endDate)}</span>
            <span><Users aria-hidden="true" /> {trip.travelers} {trip.travelers === 1 ? 'viajero' : 'viajeros'}</span>
          </div>
        </div>
      </Link>
      {onMore && (
        <button className="icon-btn sm filled" style={{ position: 'absolute', top: 10, right: 10 }} aria-label={`Opciones de ${trip.name}`} onClick={onMore}>
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
