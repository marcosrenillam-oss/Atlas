import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Compass, Download, ListTodo, Plane, UserRound, Map as MapIcon, Plus, Users, Wallet, WalletCards } from 'lucide-react';
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
import { ItineraryTab } from '../trip/ItineraryTab';
import { QuickExpense } from '../trip/QuickExpense';
import { WalletSheet, useWalletDocs } from '../trip/Wallet';
import { enrichTrip } from '../../services/geo';

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

  if (ongoing[0]) return <TripModeHome trip={ongoing[0]} name={name} now={now} />;

  if (isEmpty) {
    return (
      <main className="page">
        <Welcome onCreate={() => setCreating(true)} name={name} />
        {!name && <Link to="/perfil" className="card link row small" style={{ marginTop: 16 }}><span className="grow muted">Dinos tu nombre para personalizar el saludo.</span><ChevronRight className="chev" /></Link>}
        <div className="notice small" style={{ marginTop: 12 }}>
          Consejo: en iPhone, abre ATLAS en Safari y usa «Compartir › Añadir a pantalla de inicio» para instalarla y que tus datos se conserven de forma estable.
        </div>
        {creating && <TripForm open onClose={() => setCreating(false)} onSaved={(id) => nav(`/viajes/${id}`)} />}
      </main>
    );
  }

  return (
    <main className="page stagger">
      <div className="home-top">
        <Link to="/perfil" className="home-avatar" aria-label="Tu perfil">{name ? name.charAt(0).toUpperCase() : <UserRound size={20} />}</Link>
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
        null
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
        <span className="float-chip a">{ongoing ? 'En curso' : trip.status === 'proximo' ? 'Próximo' : 'En preparación'}</span>
        <span className="float-chip b"><Users /> <span className="big">{trip.travelers}</span></span>
        <HeroTitle trip={trip} len={len} />
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

function HeroTitle({ trip, len }: { trip: TripWithStatus; len: number | null }) {
  return (
    <div className="overlay">
      <h2>{trip.name}</h2>
      <div className="sub">{destinationsLabel(trip)} · {formatRange(trip.startDate, trip.endDate)}{len ? ` · ${len} días` : ''}</div>
    </div>
  );
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

/** Bienvenida a pantalla completa (primera vez, sin viajes). */
function Welcome({ onCreate, name }: { onCreate: () => void; name: string }) {
  return (
    <section className="welcome-hero" aria-label="Bienvenida">
      <img src={`${import.meta.env.BASE_URL}welcome.jpg`} alt="" />
      <div className="welcome-logo" aria-hidden="true"><Plane /></div>
      <div className="welcome-title" aria-hidden="true">Atlas</div>
      <div className="welcome-body">
        <h1 className="kicker">{name ? `Hola, ${name}` : 'Bienvenido a ATLAS'}</h1>
        <h2>Tu aventura empieza aquí</h2>
        <p>Planifica rutas, reparte gastos y lleva tus documentos contigo. Todo en tu iPhone, también sin conexión.</p>
        <button className="btn block start" onClick={onCreate}>Crear mi primer viaje</button>
        <Link to="/perfil" className="restore"><Download size={14} style={{ verticalAlign: '-2px' }} /> Restaurar una copia de seguridad</Link>
        <span className="credit">Cervino · Foto: chil (Camptocamp.org) · CC BY-SA 3.0 · Wikimedia Commons</span>
      </div>
    </section>
  );
}

/** Durante un viaje en curso, Inicio es el itinerario del día: práctico y sin distracciones. */
function TripModeHome({ trip, name, now }: { trip: TripWithStatus; name: string; now: Date }) {
  const [quick, setQuick] = useState(false);
  const [wallet, setWallet] = useState(false);
  const walletDocs = useWalletDocs(trip.id) ?? [];
  const len = tripLength(trip);
  const n = trip.startDate ? diffDays(trip.startDate, today()) + 1 : null;
  useEffect(() => {
    void enrichTrip(trip.id);
  }, [trip.id]);
  return (
    <main className="page stagger">
      <div style={{ marginTop: 4 }}>
        <span className="eyebrow-chip"><span className="dot" />{capitalize(fmt.weekday(toISODate(now)))}</span>
      </div>
      <div className="page-head" style={{ marginTop: 14, marginBottom: 6 }}>
        <h1 style={{ fontSize: 34 }}>
          {greeting(now.getHours())}
          {name ? <>, <span className="serif grad-text">{name}</span></> : null}
        </h1>
      </div>
      <div style={{ marginBottom: 14 }}><SyncBadge /></div>
      <Link to={`/viajes/${trip.id}`} className="card link trip-mode-head" aria-label={`Abrir ${trip.name}`}>
        <Cover trip={trip} mini />
        <div className="grow">
          <div className="tiny" style={{ fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>De viaje{n && len ? ` · Día ${n} de ${len}` : ''}</div>
          <div className="ellipsis" style={{ fontWeight: 750, fontSize: 18 }}>{trip.name}</div>
          <div className="small muted ellipsis">{destinationsLabel(trip)}</div>
        </div>
        <ChevronRight className="chev" />
      </Link>
      <div className="quick-actions" style={{ marginTop: 14 }}>
        <button onClick={() => setQuick(true)}><div className="icon-tile" data-tone="coral"><Wallet /></div>Gasto rápido</button>
        <button onClick={() => setWallet(true)} style={{ position: 'relative' }}>
          <div className="icon-tile" data-tone="violet"><WalletCards /></div>Cartera
          {walletDocs.length > 0 && <span className="badge">{walletDocs.length}</span>}
        </button>
        <Link to={`/viajes/${trip.id}`}><div className="icon-tile" data-tone="sky"><MapIcon /></div>Ver viaje</Link>
      </div>
      <section className="section" style={{ marginTop: 22 }}>
        <ItineraryTab trip={trip} embedded />
      </section>
      {quick && <QuickExpense trip={trip} onClose={() => setQuick(false)} />}
      {wallet && <WalletSheet trip={trip} onClose={() => setWallet(false)} />}
    </main>
  );
}
