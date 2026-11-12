import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MoreHorizontal, SearchX } from 'lucide-react';
import { useParticipants, useTrip } from '../../data/queries';
import { TopBar } from '../../app/TopBar';
import { Cover } from '../../ui/Cover';
import { Empty } from '../../ui/Empty';
import { StatusPill, destinationsLabel } from '../trips/TripCard';
import { TripForm } from '../trips/TripForm';
import { useTripActions } from '../trips/useTripActions';
import { formatRange } from '../../lib/dates';
import { tripLength } from '../../domain/status';
import { save } from '../../data/repo';
import { useProfile } from '../../data/settings';
import type { Participant } from '../../domain/types';
import { t } from '../../i18n';
import { SummaryTab } from './SummaryTab';
import { ItineraryTab } from './ItineraryTab';
import { TripMapTab } from './TripMapTab';
import { ExpensesTab } from './ExpensesTab';
import { DocsTab } from './DocsTab';
import { PackingTab } from './PackingTab';

const TABS = [
  { id: 'resumen', label: t('trip.tab.summary') },
  { id: 'itinerario', label: t('trip.tab.itinerary') },
  { id: 'mapa', label: t('trip.tab.map') },
  { id: 'gastos', label: t('trip.tab.expenses') },
  { id: 'documentos', label: t('trip.tab.docs') },
  { id: 'equipaje', label: t('trip.tab.packing') },
] as const;
export type TripTab = (typeof TABS)[number]['id'];

export function TripPage() {
  const { tripId, tab = 'resumen' } = useParams();
  const trip = useTrip(tripId);
  const participants = useParticipants(tripId);
  const profile = useProfile();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const actions = useTripActions(() => setEditing(true));
  const ensured = useRef(false);

  // Todo viaje necesita al menos un participante (tú) para registrar gastos.
  useEffect(() => {
    if (!trip || ensured.current || participants === undefined) return;
    if (participants.length === 0) {
      ensured.current = true;
      void save<Participant>('participants', { tripId: trip.id, name: profile.name.trim() || 'Yo', role: 'owner', canSeeExpenses: true, isMe: true });
    }
  }, [trip, participants, profile.name]);

  if (trip === undefined) return <main className="page" aria-busy="true" />;
  if (trip === null)
    return (
      <main className="page">
        <Empty icon={SearchX} title="Este viaje no existe" text="Puede que se haya eliminado en este dispositivo." action={<Link className="btn" to="/viajes">Ir a Viajes</Link>} />
      </main>
    );

  const active = (TABS.find((x) => x.id === tab)?.id ?? 'resumen') as TripTab;
  const days = tripLength(trip);

  return (
    <>
      <TopBar title={trip.name} back="/viajes" right={
        <button className="icon-btn" aria-label="Opciones del viaje" onClick={() => actions.open(trip, () => nav('/viajes', { replace: true }))}>
          <MoreHorizontal />
        </button>
      } />
      <main className="page" style={{ paddingTop: 4 }}>
        <div className="stack" style={{ gap: 14 }}>
          <Cover trip={trip} showCredit className="rise" style={{ aspectRatio: trip.cover ? '16/8' : '16/6.5', borderRadius: 26, boxShadow: 'var(--shadow-2)' }} />
          <div>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <h1 style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.035em' }}>{trip.name}</h1>
              <StatusPill status={trip.status} />
            </div>
            <p className="muted" style={{ marginTop: 4 }}>
              {destinationsLabel(trip)} · {formatRange(trip.startDate, trip.endDate)}
              {days ? ` · ${days} ${days === 1 ? 'día' : 'días'}` : ''}
            </p>
          </div>
        </div>
        <nav className="tabs" aria-label="Secciones del viaje" style={{ marginTop: 14, position: 'sticky', top: 'calc(var(--sat) + 52px)', background: 'var(--bg)', zIndex: 10 }}>
          {TABS.map((x) => (
            <Link key={x.id} to={`/viajes/${trip.id}/${x.id}`} replace className={x.id === active ? 'active' : ''} aria-current={x.id === active ? 'page' : undefined}>
              {x.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 18 }}>
          {active === 'resumen' && <SummaryTab trip={trip} />}
          {active === 'itinerario' && <ItineraryTab trip={trip} />}
          {active === 'mapa' && <TripMapTab trip={trip} />}
          {active === 'gastos' && <ExpensesTab trip={trip} />}
          {active === 'documentos' && <DocsTab trip={trip} />}
          {active === 'equipaje' && <PackingTab trip={trip} />}
        </div>
      </main>
      {editing && <TripForm open trip={trip} onClose={() => setEditing(false)} />}
    </>
  );
}
