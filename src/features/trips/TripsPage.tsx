import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Luggage, Plus, Search, SearchX } from 'lucide-react';
import { useTrips } from '../../data/queries';
import { TripCard } from './TripCard';
import { TripForm } from './TripForm';
import { useTripActions } from './useTripActions';
import { Empty } from '../../ui/Empty';
import { Segmented } from '../../ui/Controls';
import { TRIP_TYPES } from '../../domain/catalog';
import { byStart } from '../../domain/status';
import type { Trip, TripType } from '../../domain/types';

type Group = 'proximos' | 'preparacion' | 'completados' | 'archivados';
type Sort = 'fecha' | 'nombre' | 'recientes';
const GROUPS: { value: Group; label: string }[] = [
  { value: 'proximos', label: 'Próximos' },
  { value: 'preparacion', label: 'Preparación' },
  { value: 'completados', label: 'Completados' },
  { value: 'archivados', label: 'Archivados' },
];

const inGroup = (g: Group, s: string) =>
  g === 'proximos' ? s === 'proximo' || s === 'en-curso' : g === 'preparacion' ? s === 'en-preparacion' : g === 'completados' ? s === 'completado' : s === 'archivado';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function TripsPage() {
  const trips = useTrips();
  const nav = useNavigate();
  const [group, setGroup] = useState<Group>('proximos');
  const [q, setQ] = useState('');
  const [type, setType] = useState<TripType | 'all'>('all');
  const [sort, setSort] = useState<Sort>('fecha');
  const [form, setForm] = useState<{ open: boolean; trip?: Trip }>({ open: false });
  const actions = useTripActions((t) => setForm({ open: true, trip: t }));

  const counts = useMemo(() => {
    const c: Record<Group, number> = { proximos: 0, preparacion: 0, completados: 0, archivados: 0 };
    for (const t of trips ?? []) for (const g of GROUPS) if (inGroup(g.value, t.status)) c[g.value]++;
    return c;
  }, [trips]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    const out = (trips ?? []).filter(
      (t) =>
        inGroup(group, t.status) &&
        (type === 'all' || t.type === type) &&
        (!nq || norm(`${t.name} ${t.stages.map((s) => s.name).join(' ')} ${t.description ?? ''}`).includes(nq)),
    );
    if (sort === 'nombre') out.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else if (sort === 'recientes') out.sort((a, b) => b.updatedAt - a.updatedAt);
    else {
      out.sort(byStart);
      if (group === 'completados') out.reverse();
    }
    return out;
  }, [trips, group, q, type, sort]);

  const total = trips?.length ?? 0;

  return (
    <main className="page stagger">
      <div className="page-head">
        <h1>Mis <span className="serif grad-text">viajes</span></h1>
        <button className="btn sm" onClick={() => setForm({ open: true })}>
          <Plus /> Crear viaje
        </button>
      </div>

      {trips && total === 0 ? (
        <div className="card">
          <Empty icon={Luggage} title="Tu biblioteca está vacía" text="Crea tu primer viaje: puedes empezar solo con un nombre y completar el resto cuando quieras."
            action={<button className="btn" onClick={() => setForm({ open: true })}><Plus /> Crear viaje</button>} />
        </div>
      ) : (
        <div className="stack">
          <div className="input-group" style={{ position: 'relative' }}>
            <Search size={17} style={{ position: 'absolute', left: 13, top: 14, color: 'var(--text-3)' }} aria-hidden="true" />
            <input className="input" type="search" placeholder="Buscar por nombre o destino" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 38 }} aria-label="Buscar viajes" />
          </div>
          <Segmented label="Grupo de viajes" value={group} onChange={setGroup} options={GROUPS.map((g) => ({ value: g.value, label: counts[g.value] ? `${g.label} ${counts[g.value]}` : g.label }))} />
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ minHeight: 38, fontSize: 14, padding: '6px 34px 6px 12px' }} value={type} onChange={(e) => setType(e.target.value as TripType | 'all')} aria-label="Filtrar por tipo">
              <option value="all">Todos los tipos</option>
              {TRIP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select className="select" style={{ minHeight: 38, fontSize: 14, padding: '6px 34px 6px 12px' }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
              <option value="fecha">Por fecha</option>
              <option value="nombre">Por nombre</option>
              <option value="recientes">Editados recientemente</option>
            </select>
          </div>

          {list.length === 0 ? (
            <div className="card flat">
              {q || type !== 'all' ? (
                <Empty icon={SearchX} title="Sin resultados" text="Prueba con otra búsqueda o quita los filtros." action={<button className="btn secondary sm" onClick={() => { setQ(''); setType('all'); }}>Quitar filtros</button>} />
              ) : (
                <Empty icon={Luggage} title={`No hay viajes ${GROUPS.find((g) => g.value === group)!.label.toLowerCase()}`}
                  text={group === 'proximos' ? 'Marca un viaje como «Confirmado» con fecha de salida para verlo aquí.' : group === 'preparacion' ? 'Los viajes nuevos empiezan en preparación.' : group === 'completados' ? 'Los viajes aparecen aquí cuando pasa su fecha de regreso.' : 'Archiva viajes para apartarlos sin borrarlos.'} />
              )}
            </div>
          ) : (
            <div className="cards-grid">
              {list.map((t) => <TripCard key={t.id} trip={t} onMore={() => actions.open(t)} />)}
            </div>
          )}
        </div>
      )}
      {form.open && <TripForm open onClose={() => setForm({ open: false })} trip={form.trip} onSaved={(id) => !form.trip && nav(`/viajes/${id}`)} />}
    </main>
  );
}
