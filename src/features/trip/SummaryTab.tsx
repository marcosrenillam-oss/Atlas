import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock, ChevronRight, CloudUpload, MapPin, Plus, Share2, Trash2, Users, Wallet,
} from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { useExpenses, useItems, useParticipants, useTasks } from '../../data/queries';
import { formatRange, fmt, today, formatDuration } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { sumExpenses } from '../../domain/expenses';
import { remove, save, update } from '../../data/repo';
import type { ItineraryItem, Participant, Role, Task, Trip } from '../../domain/types';
import { CheckButton, Field, Switch } from '../../ui/Controls';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { useTripActions } from '../trips/useTripActions';
import { useSyncState } from '../../app/hooks';
import { enqueueTrip, syncNow } from '../../sync/engine';
import { Icon } from '../../ui/Icon';
import { db } from '../../data/db';
import { itemIcon } from './ItineraryTab';
import { ITEM_TONE } from '../../ui/tones';
import { WalletSheet, useWalletDocs } from './Wallet';
import { RecapSheet } from './Recap';
import { TripWeather } from './TripWeather';
import { Sparkles, WalletCards } from 'lucide-react';

const ROLE_LABEL: Record<Role, string> = { owner: 'Organizador', editor: 'Puede editar', viewer: 'Solo lectura' };

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

function sortItems(items: ItineraryItem[]) {
  return [...items].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.order - b.order);
}

export function SummaryTab({ trip }: { trip: TripWithStatus }) {
  const items = useItems(trip.id) ?? [];
  const expenses = useExpenses(trip.id) ?? [];
  const participants = useParticipants(trip.id) ?? [];
  const tasks = useTasks(trip.id) ?? [];
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const walletDocs = useWalletDocs(trip.id) ?? [];
  const [newTask, setNewTask] = useState('');
  const ui = useUI();
  const sync = useSyncState();
  const actions = useTripActions(() => {});

  const lodging = sortItems(items.filter((i) => i.type === 'alojamiento'));
  const transport = sortItems(items.filter((i) => i.type === 'transporte'));
  const spent = sumExpenses(expenses);
  const pendingExp = sumExpenses(expenses, 'pending');
  const pct = trip.budget ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;
  const nextItem = useMemo(() => {
    const now = today();
    const hhmm = new Date().toTimeString().slice(0, 5);
    return sortItems(items).find((i) => !i.done && i.date && (i.date > now || (i.date === now && (!i.startTime || i.startTime >= hhmm))));
  }, [items]);
  const pendingTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTask.trim();
    if (!title) return;
    await save<Task>('tasks', { tripId: trip.id, title, done: false });
    setNewTask('');
  }

  async function toggleShared(on: boolean) {
    await update<Trip>('trips', trip.id, { shared: on });
    if (on) {
      await enqueueTrip(trip.id);
      void syncNow();
      ui.toast('El viaje se sincronizará con tu servidor.');
    } else ui.toast('El viaje deja de sincronizarse. Los datos ya enviados siguen en el servidor.');
  }

  return (
    <div className="stack-lg stagger">
      <div className="quick-actions">
        <button onClick={() => setWalletOpen(true)} style={{ position: 'relative' }}>
          <div className="icon-tile" data-tone="violet"><WalletCards /></div>Cartera
          {walletDocs.length > 0 && <span className="badge">{walletDocs.length}</span>}
        </button>
        <button onClick={() => setRecapOpen(true)}><div className="icon-tile" data-tone="amber"><Sparkles /></div>Resumen</button>
        <Link to={`/viajes/${trip.id}/gastos`}><div className="icon-tile" data-tone="coral"><Wallet /></div>Gastos</Link>
      </div>

      <TripWeather trip={trip} />

      {/* Próxima actividad */}
      {nextItem && (
        <Link to={`/viajes/${trip.id}/itinerario?dia=${nextItem.date}`} className="card link row" style={{ gap: 12 }}>
          <div className="icon-tile lg" data-tone={ITEM_TONE[nextItem.type]}><Icon name={itemIcon(nextItem)} /></div>
          <div className="grow">
            <div className="tiny faint" style={{ textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>Próxima actividad</div>
            <div className="ellipsis" style={{ fontWeight: 600 }}>{nextItem.title}</div>
            <div className="small muted">{fmt.weekdayShort(nextItem.date!)}{nextItem.startTime ? ` · ${nextItem.startTime}` : ''}{nextItem.durationMin ? ` · ${formatDuration(nextItem.durationMin)}` : ''}</div>
          </div>
          <ChevronRight className="chev" />
        </Link>
      )}

      <div className="list">
        <div className="list-row" style={{ alignItems: 'flex-start' }}>
          <div className="icon-tile" data-tone="coral"><MapPin /></div>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Destinos</div>
            {trip.stages.length ? (
              trip.stages.map((s) => (
                <div key={s.id} className="meta">
                  {s.name}{s.start || s.end ? ` · ${formatRange(s.start, s.end)}` : ''}
                </div>
              ))
            ) : (
              <div className="meta">Sin destinos. Añádelos editando el viaje.</div>
            )}
          </div>
        </div>
        <div className="list-row">
          <div className="icon-tile" data-tone="violet"><CalendarClock /></div>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Fechas</div>
            <div className="meta">{formatRange(trip.startDate, trip.endDate)}</div>
          </div>
        </div>
        <button className="list-row" onClick={() => setPeopleOpen(true)}>
          <div className="icon-tile" data-tone="sky"><Users /></div>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Viajeros</div>
            <div className="meta ellipsis">{trip.travelers} en total{participants.length ? ` · ${participants.map((p) => p.name).join(', ')}` : ''}</div>
          </div>
          <div className="avatars">
            {participants.slice(0, 4).map((p) => <span key={p.id} className="avatar sm">{initials(p.name)}</span>)}
          </div>
          <ChevronRight className="chev" />
        </button>
      </div>

      {/* Alojamiento y transporte (desde el itinerario) */}
      <section>
        <div className="section-head"><h2>Alojamiento y transporte</h2></div>
        {lodging.length + transport.length === 0 ? (
          <div className="card flat small muted">
            Añade elementos de tipo <strong>Alojamiento</strong> o <strong>Transporte</strong> en el <Link to={`/viajes/${trip.id}/itinerario`}>itinerario</Link> y aparecerán aquí.
          </div>
        ) : (
          <div className="list">
            {[...lodging, ...transport].map((i) => (
              <Link key={i.id} to={`/viajes/${trip.id}/itinerario?dia=${i.date ?? 'ideas'}`} className="list-row">
                <div className="icon-tile" data-tone={ITEM_TONE[i.type]}><Icon name={itemIcon(i)} /></div>
                <div className="grow">
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{i.title}{i.to ? ` → ${i.to}` : ''}</div>
                  <div className="meta ellipsis">
                    {i.date ? fmt.weekdayShort(i.date) : 'Sin fecha'}{i.startTime ? ` · ${i.startTime}` : ''}{i.booking ? ` · Ref. ${i.booking}` : ''}
                  </div>
                </div>
                <ChevronRight className="chev" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Presupuesto */}
      <section>
        <div className="section-head">
          <h2>Presupuesto</h2>
          <Link className="link" to={`/viajes/${trip.id}/gastos`}>Ver gastos</Link>
        </div>
        <div className="card stack-sm">
          <div className="row-between">
            <div>
              <div className="small muted">Gastado</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 650 }}>{formatMoney(spent, trip.currency)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="small muted">Presupuesto</div>
              <div className="num" style={{ fontSize: 17, fontWeight: 600 }}>{trip.budget !== undefined ? formatMoney(trip.budget, trip.currency) : '—'}</div>
            </div>
          </div>
          {trip.budget !== undefined && (
            <>
              <div className={`progress${spent > trip.budget ? ' over' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${pct}%` }} /></div>
              <div className="small muted">
                {spent > trip.budget ? `Te has pasado ${formatMoney(spent - trip.budget, trip.currency)}` : `Quedan ${formatMoney(trip.budget - spent, trip.currency)}`}
                {pendingExp ? ` · ${formatMoney(pendingExp, trip.currency)} pendientes de pago` : ''}
              </div>
            </>
          )}
          {trip.budget === undefined && <div className="small muted"><Wallet size={14} style={{ verticalAlign: '-2px' }} /> Define un presupuesto editando el viaje.</div>}
        </div>
      </section>

      {/* Tareas */}
      <section>
        <div className="section-head"><h2>Tareas pendientes</h2><span className="small faint">{pendingTasks.length} de {tasks.length}</span></div>
        <div className="list">
          {[...pendingTasks, ...doneTasks].map((tk) => (
            <div key={tk.id} className="list-row" style={{ minHeight: 48 }}>
              <CheckButton on={tk.done} label={tk.done ? `Marcar «${tk.title}» como pendiente` : `Completar «${tk.title}»`} onToggle={() => void update<Task>('tasks', tk.id, { done: !tk.done })} />
              <span className="grow" style={{ color: tk.done ? 'var(--text-3)' : undefined, textDecoration: tk.done ? 'line-through' : undefined }}>{tk.title}</span>
              <button className="icon-btn sm muted" aria-label={`Eliminar «${tk.title}»`} onClick={() => void remove('tasks', tk.id)}><Trash2 /></button>
            </div>
          ))}
          <form className="list-row" onSubmit={addTask}>
            <Plus size={20} style={{ color: 'var(--accent)', flex: 'none', marginLeft: 3 }} />
            <input className="input" style={{ border: 0, padding: '8px 0', minHeight: 36, background: 'transparent', boxShadow: 'none' }} value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nueva tarea (p. ej. reservar parking)" aria-label="Nueva tarea" enterKeyHint="done" />
            {newTask.trim() && <button className="btn sm">Añadir</button>}
          </form>
        </div>
      </section>

      {trip.description && (
        <section>
          <div className="section-head"><h2>Descripción</h2></div>
          <div className="card" style={{ whiteSpace: 'pre-wrap' }}>{trip.description}</div>
        </section>
      )}

      {/* Compartir */}
      <section>
        <div className="section-head"><h2>Compartir</h2></div>
        <div className="list">
          <button className="list-row" onClick={() => void actions.exportOne(trip)}>
            <div className="icon-tile" data-tone="pink"><Share2 /></div>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Exportar viaje</div>
              <div className="meta">Archivo .atlas.json para importarlo en otro dispositivo</div>
            </div>
            <ChevronRight className="chev" />
          </button>
          <div className="list-row">
            <div className="icon-tile" data-tone="mint"><CloudUpload /></div>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>Sincronizar este viaje</div>
              <div className="meta">
                {sync.phase === 'disabled' ? (
                  <>Configura un servidor en <Link to="/perfil">Perfil › Sincronización</Link>.</>
                ) : trip.shared ? 'Se envía a tu servidor cuando hay conexión.' : 'Solo en este dispositivo.'}
              </div>
            </div>
            <Switch label="Sincronizar este viaje" checked={trip.shared} onChange={(v) => void toggleShared(v)} />
          </div>
        </div>
      </section>

      {walletOpen && <WalletSheet trip={trip} onClose={() => setWalletOpen(false)} />}
      {recapOpen && <RecapSheet trip={trip} onClose={() => setRecapOpen(false)} />}
      {peopleOpen && <PeopleSheet trip={trip} participants={participants} onClose={() => setPeopleOpen(false)} />}
    </div>
  );
}

function PeopleSheet({ trip, participants, onClose }: { trip: Trip; participants: Participant[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const ui = useUI();
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await save<Participant>('participants', { tripId: trip.id, name: name.trim(), role: 'editor', canSeeExpenses: true, isMe: false });
    if (participants.length + 1 > trip.travelers) await update<Trip>('trips', trip.id, { travelers: participants.length + 1 });
    setName('');
  }
  async function del(p: Participant) {
    const used = await db.expenses.where('tripId').equals(trip.id).filter((e) => e.paidBy === p.id || e.split.some((s) => s.participantId === p.id && s.value > 0)).count();
    const usedSettle = await db.settlements.where('tripId').equals(trip.id).filter((s) => s.from === p.id || s.to === p.id).count();
    if (used || usedSettle) {
      ui.toast(`${p.name} aparece en ${used + usedSettle} gasto(s) o pago(s). Edítalos antes de quitarle.`, { kind: 'error' });
      return;
    }
    if (await ui.confirm({ title: `¿Quitar a ${p.name}?`, confirmLabel: 'Quitar', danger: true })) await remove('participants', p.id);
  }
  return (
    <Sheet open title="Viajeros" onClose={onClose} closeLabel="Cerrar">
      <div className="stack">
        <div className="row-between">
          <span className="label">Número total de viajeros</span>
          <input className="input" type="number" inputMode="numeric" min={1} max={99} style={{ width: 84, textAlign: 'center' }} value={trip.travelers}
            onChange={(e) => { const n = Math.max(1, Math.min(99, Number(e.target.value) || 1)); void update<Trip>('trips', trip.id, { travelers: n }); }} aria-label="Número total de viajeros" />
        </div>
        {participants.map((p) => (
          <div key={p.id} className="card flat stack-sm">
            <div className="row">
              <span className="avatar sm">{initials(p.name)}</span>
              <input className="input grow" value={p.name} aria-label="Nombre" onChange={(e) => void update<Participant>('participants', p.id, { name: e.target.value })} />
              {!p.isMe && <button className="icon-btn sm muted" aria-label={`Quitar a ${p.name}`} onClick={() => void del(p)}><Trash2 /></button>}
            </div>
            <div className="grid-2">
              <Field label="Permisos">
                <select className="select" value={p.role} disabled={p.isMe} onChange={(e) => void update<Participant>('participants', p.id, { role: e.target.value as Role })}>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              </Field>
              <Field label="Identificador" hint="Email o alias (opcional)">
                <input className="input" value={p.handle ?? ''} placeholder={p.isMe ? 'Tú' : 'alias'} onChange={(e) => void update<Participant>('participants', p.id, { handle: e.target.value || undefined })} />
              </Field>
            </div>
            <div className="row-between">
              <span className="small">Puede ver los gastos</span>
              <Switch label={`${p.name} puede ver los gastos`} checked={p.canSeeExpenses} onChange={(v) => void update<Participant>('participants', p.id, { canSeeExpenses: v })} />
            </div>
          </div>
        ))}
        <form className="input-group" onSubmit={add}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Añadir viajero" aria-label="Nombre del nuevo viajero" />
          <button className="btn" disabled={!name.trim()}>Añadir</button>
        </form>
        <div className="notice small">
          Los permisos se guardan con el viaje y se aplican al compartirlo. Sin servidor de sincronización, cada dispositivo tiene su propia copia: no hay control de acceso real entre personas.
        </div>
      </div>
    </Sheet>
  );
}
