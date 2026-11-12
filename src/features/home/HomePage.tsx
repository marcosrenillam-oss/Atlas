import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Compass, Download, ListTodo, Plus, Users } from 'lucide-react';
import { useTrips, type TripWithStatus } from '../../data/queries';
import { useProfile } from '../../data/settings';
import { db } from '../../data/db';
import { update } from '../../data/repo';
import { byStart, daysUntil, tripLength } from '../../domain/status';
import { diffDays, fmt, formatRange, today, toISODate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import type { Task } from '../../domain/types';
import { Cover } from '../../ui/Cover';
import { CountUp, Ring } from '../../ui/Motion';
import { CheckButton } from '../../ui/Controls';
import { SyncBadge } from '../../app/SyncBadge';
import { useNow } from '../../app/hooks';
import { t } from '../../i18n';
import { TripCard, TripRow, destinationsLabel } from '../trips/TripCard';
import { TripForm } from '../trips/TripForm';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function greeting(h: number) {
  return h < 6 ? t('greeting.night') : h < 14 ? t('greeting.morning') : h < 21 ? t('greeting.afternoon') : t('greeting.night');
}

export function HomePage() {
  const trips = useTrips();
  const profile = useProfile();
  const now = useNow(60_000);
  const nav = useNavigate();
  const [creating, setCreating] = useState(false);

  const sorted = useMemo(() => [...(trips ?? [])].sort(byStart), [trips]);
  const ongoing = sorted.filter((x) => x.status === 'en-curso');
  const upcoming = sorted.filter((x) => x.status === 'proximo');
  const preparing = sorted.filter((x) => x.status === 'en-preparacion');
  const recent = sorted.filter((x) => x.status === 'completado').reverse().slice(0, 4);
  const featured = ongoing[0] ?? upcoming[0] ?? preparing.find((p) => p.startDate && p.startDate >= today());
  const activeIds = new Set([...ongoing, ...upcoming, ...preparing].map((x) => x.id));

  const tasks = useLiveQuery(async () => (await db.tasks.toArray()).filter((x) => !x.done), [], []);
  const openTasks = (tasks ?? []).filter((x) => activeIds.has(x.tripId)).sort((a, b) => a.createdAt - b.createdAt);
  const money = useLiveQuery(async () => {
    const exps = await db.expenses.toArray();
    const year = String(new Date().getFullYear());
    const byCur = new Map<string, { year: number; pending: number }>();
    const tripCur = new Map((await db.trips.toArray()).map((x) => [x.id, x.currency]));
    for (const e of exps) {
      const c = tripCur.get(e.tripId) ?? 'EUR';
      const v = byCur.get(c) ?? { year: 0, pending: 0 };
      if (e.date.startsWith(year)) v.year += e.amount;
      if (e.status === 'pending') v.pending += e.amount;
      byCur.set(c, v);
    }
    return byCur;
  }, []);

  const name = profile.name.trim().split(' ')[0];
  const isEmpty = trips && trips.length === 0;
  const mainCur = profile.currency;
  const mainMoney = money?.get(mainCur);

  return (
    <main className="page stagger">
      <div className="row-between" style={{ marginTop: 4 }}>
        <span className="eyebrow-chip"><span className="dot" />{capitalize(fmt.weekday(toISODate(now)))}</span>
        <button className="icon-btn grad" aria-label="Crear viaje" onClick={() => setCreating(true)}><Plus /></button>
      </div>
      <div className="page-head" style={{ marginTop: 14 }}>
        <h1 style={{ fontSize: 38 }}>
          {greeting(now.getHours())}
          {name ? <>, <span className="serif grad-text">{name}</span></> : null}
        </h1>
      </div>
      <div style={{ marginTop: -6, marginBottom: 20 }}><SyncBadge /></div>

      {isEmpty ? (
        <Welcome onCreate={() => setCreating(true)} hasName={!!name} />
      ) : (
        <>
          {featured ? <FeaturedTrip trip={featured} now={now} /> : (
            <button className="card link row" style={{ width: '100%', border: 0, textAlign: 'left' }} onClick={() => setCreating(true)}>
              <div className="icon-tile lg" data-tone="pink"><Plus /></div>
              <div className="grow"><div style={{ fontWeight: 650 }}>Planifica tu próximo viaje</div><div className="small muted">No tienes viajes próximos.</div></div>
              <ChevronRight className="chev" />
            </button>
          )}

          {upcoming.filter((x) => x.id !== featured?.id).length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Próximos viajes</h2><Link className="link" to="/viajes">Ver todos</Link></div>
              <div className="hscroll">
                {upcoming.filter((x) => x.id !== featured?.id).map((x) => <TripCard key={x.id} trip={x} />)}
              </div>
            </section>
          )}

          {preparing.filter((x) => x.id !== featured?.id).length > 0 && (
            <section className="section">
              <div className="section-head"><h2>En preparación</h2></div>
              <div className="list">{preparing.filter((x) => x.id !== featured?.id).slice(0, 5).map((x) => <TripRow key={x.id} trip={x} />)}</div>
            </section>
          )}

          <section className="section">
            <div className="section-head"><h2>Tareas pendientes</h2>{openTasks.length > 0 && <span className="small faint">{openTasks.length}</span>}</div>
            {openTasks.length === 0 ? (
              <div className="card flat row small muted"><ListTodo size={18} /> Nada pendiente. Añade tareas desde el resumen de cada viaje.</div>
            ) : (
              <div className="list">
                {openTasks.slice(0, 6).map((tk) => <HomeTask key={tk.id} task={tk} tripName={trips?.find((x) => x.id === tk.tripId)?.name ?? ''} />)}
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-head"><h2>Gastos</h2><Link className="link" to="/gastos">Detalle</Link></div>
            <div className="stats">
              <div className="stat">
                <div className="lbl">Este año</div>
                <div className="val"><CountUp value={mainMoney?.year ?? 0} format={(n) => formatMoney(Math.round(n), mainCur)} /></div>
                <div className="sub">en viajes en {mainCur}</div>
              </div>
              <div className="stat">
                <div className="lbl">Pendiente de pago</div>
                <div className="val"><CountUp value={mainMoney?.pending ?? 0} format={(n) => formatMoney(Math.round(n), mainCur)} /></div>
                <div className="sub">{[...(money?.keys() ?? [])].filter((c) => c !== mainCur).length ? 'otras monedas en Gastos' : 'entre todos los viajes'}</div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head"><h2>Accesos rápidos</h2></div>
            <div className="grid-2">
              <button className="card link row" style={{ border: 0, textAlign: 'left' }} onClick={() => setCreating(true)}><div className="icon-tile" data-tone="coral"><Plus /></div><span style={{ fontWeight: 650 }}>Crear viaje</span></button>
              <Link className="card link row" to="/explorar"><div className="icon-tile" data-tone="violet"><Compass /></div><span style={{ fontWeight: 650 }}>Mis lugares</span></Link>
            </div>
          </section>

          {recent.length > 0 && (
            <section className="section">
              <div className="section-head"><h2>Viajes recientes</h2><Link className="link" to="/viajes">Historial</Link></div>
              <div className="list">{recent.map((x) => <TripRow key={x.id} trip={x} />)}</div>
            </section>
          )}
        </>
      )}
      {creating && <TripForm open onClose={() => setCreating(false)} onSaved={(id) => nav(`/viajes/${id}`)} />}
    </main>
  );
}

/** Preparación real del viaje: tareas completadas + equipaje marcado. */
function usePrep(tripId: string) {
  return useLiveQuery(async () => {
    const tasks = await db.tasks.where('tripId').equals(tripId).toArray();
    const lists = (await db.packingLists.where('tripId').equals(tripId).primaryKeys()) as string[];
    const items = lists.length ? await db.packingItems.where('listId').anyOf(lists).toArray() : [];
    const total = tasks.length + items.length;
    const done = tasks.filter((x) => x.done).length + items.filter((x) => x.checked).length;
    return { total, done };
  }, [tripId]);
}

function FeaturedTrip({ trip, now }: { trip: TripWithStatus; now: Date }) {
  const d = daysUntil(trip);
  const len = tripLength(trip);
  const ongoing = trip.status === 'en-curso';
  const prep = usePrep(trip.id);
  let big: React.ReactNode, lbl: string;
  let ringValue = 0, ringLabel = '', ringText = '', ringSub = '';
  if (ongoing) {
    const n = diffDays(trip.startDate!, today()) + 1;
    big = <>Día <CountUp value={n} /></>;
    lbl = len ? `de ${len} · ¡disfruta!` : 'en curso';
    ringValue = len ? n / len : 0;
    ringText = len ? `${Math.round((n / len) * 100)}%` : '—';
    ringLabel = 'Viaje';
    ringSub = 'recorrido';
  } else {
    if (d === null) {
      big = '—';
      lbl = 'sin fecha';
    } else if (d === 0) {
      big = 'Hoy';
      lbl = 'sales hoy · ¡buen viaje!';
    } else if (d <= 2) {
      const dep = new Date(trip.startDate! + 'T00:00:00');
      const hours = Math.max(0, Math.floor((dep.getTime() - now.getTime()) / 3_600_000));
      big = <><CountUp value={hours} /> h</>;
      lbl = d === 1 ? 'día para salir · aprox.' : 'días para salir · aprox.';
    } else {
      big = <CountUp value={d} />;
      lbl = 'días para salir';
    }
    const total = prep?.total ?? 0;
    ringValue = total ? (prep!.done / total) : 0;
    ringText = total ? `${Math.round(ringValue * 100)}%` : '—';
    ringLabel = 'Preparación';
    ringSub = total ? `${prep!.done} de ${total} listo` : 'añade tareas o equipaje';
  }
  return (
    <Link to={`/viajes/${trip.id}`} className="hero-trip" aria-label={`Próximo viaje: ${trip.name}`}>
      <div style={{ position: 'relative' }}>
        <Cover trip={trip} />
        <span className="float-chip a"><StatusDot status={trip.status} /> {ongoing ? 'En curso' : trip.status === 'proximo' ? 'Próximo' : 'En preparación'}</span>
        <span className="float-chip b"><Users /> <span className="big">{trip.travelers}</span> {trip.travelers === 1 ? 'viajero' : 'viajeros'}</span>
        <div className="overlay">
          <h2>{trip.name}</h2>
          <div className="sub">{destinationsLabel(trip)} · {formatRange(trip.startDate, trip.endDate)}{len ? ` · ${len} días` : ''}</div>
        </div>
      </div>
      <div className="countdown">
        <div>
          <div className="big">{big}</div>
          <div className="lbl">{lbl}</div>
        </div>
        <div className="ring-cell" style={{ padding: '10px 12px' }}>
          <Ring value={ringValue} size={58} stroke={7} label={`${ringLabel}: ${ringText}`}>
            <span style={{ fontSize: 13 }}>{ringText}</span>
          </Ring>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 750, fontSize: 15 }}>{ringLabel}</div>
            <div className="lbl">{ringSub}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: TripWithStatus['status'] }) {
  const c = status === 'en-curso' ? '#12a271' : status === 'proximo' ? '#6a4cff' : '#ff9f1c';
  return <span style={{ width: 8, height: 8, borderRadius: 4, background: c, boxShadow: `0 0 0 3px ${c}33` }} />;
}

function HomeTask({ task, tripName }: { task: Task; tripName: string }) {
  return (
    <div className="list-row">
      <CheckButton on={task.done} label={`Completar «${task.title}»`} onToggle={() => void update<Task>('tasks', task.id, { done: !task.done })} />
      <Link to={`/viajes/${task.tripId}`} className="grow" style={{ color: 'inherit' }}>
        <div className="ellipsis">{task.title}</div>
        <div className="meta ellipsis">{tripName}</div>
      </Link>
    </div>
  );
}

function Welcome({ onCreate, hasName }: { onCreate: () => void; hasName: boolean }) {
  return (
    <div className="stack-lg">
      <div className="card stack" style={{ padding: 22 }}>
        <div className="icon-tile lg"><Compass /></div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Tu centro de control de viajes</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Organiza itinerarios, gastos compartidos, documentos y equipaje. Todo se guarda en este dispositivo y funciona sin conexión.
          </p>
        </div>
        <button className="btn block" onClick={onCreate}><Plus /> Crear mi primer viaje</button>
        <Link to="/perfil" className="btn secondary block"><Download /> Restaurar una copia de seguridad</Link>
      </div>
      {!hasName && <Link to="/perfil" className="card link row small"><span className="grow muted">Dinos tu nombre para personalizar el saludo.</span><ChevronRight className="chev" /></Link>}
      <div className="notice small">
        Consejo: en iPhone, abre ATLAS en Safari y usa «Compartir › Añadir a pantalla de inicio» para instalarla y que tus datos se conserven de forma estable.
      </div>
    </div>
  );
}
