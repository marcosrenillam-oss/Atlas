import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Clock, Lightbulb, MapPin, MoreHorizontal, Plus, Ticket } from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { useItems } from '../../data/queries';
import type { ItineraryItem } from '../../domain/types';
import { ITEM_TYPES, itemTypeLabel } from '../../domain/catalog';
import { eachDay, fmt, formatDuration, addMinutesToTime, today, parseISODate } from '../../lib/dates';
import { moveItem, remove, reorderItem, save, update } from '../../data/repo';
import { CheckButton, Segmented } from '../../ui/Controls';
import { Empty } from '../../ui/Empty';
import { Icon } from '../../ui/Icon';
import { PhotoRow } from '../../ui/Photos';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { appleMapsUrl, googleMapsUrl } from '../../maps/external';
import { ItemForm, orderForTime } from './ItemForm';
import { ITEM_TONE } from '../../ui/tones';
import { useForecast } from '../../services/weather';
import { WeatherChip } from '../../ui/Weather';
import { JournalCard } from './Journal';
import type { GeoPoint, Trip } from '../../domain/types';

const IDEAS = 'ideas';

/** Icono del elemento; en transportes se deduce del título (vuelo, barco, coche, bus). */
export function itemIcon(item: Pick<ItineraryItem, 'type' | 'title'>): string {
  if (item.type === 'transporte') {
    const t = item.title.toLowerCase();
    if (/vuelo|avi[oó]n|flight|✈|\b[a-z]{2}\d{2,4}\b/.test(t)) return 'Plane';
    if (/ferry|barco|crucero|ship|boat/.test(t)) return 'Ship';
    if (/coche|alquiler|car|conducir/.test(t)) return 'Car';
    if (/bus|autob[uú]s|autocar/.test(t)) return 'Bus';
  }
  return ITEM_TYPES.find((x) => x.value === item.type)?.icon ?? 'Sparkles';
}

/** Punto del destino en el que estás ese día (etapa que lo cubre o, si no, el primero con coordenadas). */
export function pointForDay(trip: Pick<Trip, 'stages'>, date: string): GeoPoint | undefined {
  const st = trip.stages.find((s) => s.point && s.start && s.end && s.start <= date && date <= s.end) ?? trip.stages.find((s) => s.point);
  return st?.point;
}

export function ItineraryTab({ trip, embedded }: { trip: TripWithStatus; embedded?: boolean }) {
  const items = useItems(trip.id);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'dia' | 'resumen'>('dia');
  const [form, setForm] = useState<{ item?: ItineraryItem; date: string | null } | null>(null);
  const [moving, setMoving] = useState<ItineraryItem | null>(null);
  const ui = useUI();

  const tripDays = useMemo(() => eachDay(trip.startDate ?? '', trip.endDate ?? trip.startDate ?? ''), [trip.startDate, trip.endDate]);
  /** Días con elementos fuera del rango del viaje (p. ej. tras cambiar fechas). */
  const extraDays = useMemo(() => {
    const set = new Set<string>();
    for (const i of items ?? []) if (i.date && !tripDays.includes(i.date)) set.add(i.date);
    return [...set].sort();
  }, [items, tripDays]);
  const allDays = [...tripDays, ...extraDays];

  const byDay = useMemo(() => {
    const m = new Map<string, ItineraryItem[]>();
    for (const i of items ?? []) {
      const k = i.date ?? IDEAS;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(i);
    }
    for (const l of m.values()) l.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    return m;
  }, [items]);

  const paramDay = params.get('dia');
  const now = today();
  const defaultDay = allDays.includes(now) ? now : allDays[0] ?? IDEAS;
  const selected = paramDay && (paramDay === IDEAS || allDays.includes(paramDay)) ? paramDay : defaultDay;
  const selectDay = (d: string) => setParams((p) => { p.set('dia', d); return p; }, { replace: true });
  const list = byDay.get(selected) ?? [];
  const forecast = useForecast(selected === IDEAS ? undefined : pointForDay(trip, selected));
  const weather = forecast?.byDate.get(selected);

  if (items === undefined) return null;

  function more(item: ItineraryItem, index: number) {
    const loc = item.location;
    ui.menu(item.title, [
      { label: 'Editar', onSelect: () => setForm({ item, date: item.date }) },
      { label: item.done ? 'Marcar como pendiente' : 'Marcar como completada', onSelect: () => void update<ItineraryItem>('items', item.id, { done: !item.done }) },
      { label: 'Duplicar', onSelect: async () => {
        const order = await orderForTime(trip.id, item.date, item.startTime);
        await save<ItineraryItem>('items', { ...item, id: undefined, createdAt: undefined, title: item.title, done: false, order, photoIds: [] } as never);
        ui.toast('Duplicado');
      } },
      { label: 'Mover a otro día', onSelect: () => setMoving(item) },
      ...(index > 0 ? [{ label: 'Subir', onSelect: () => void reorderItem(list, index, -1) }] : []),
      ...(index < list.length - 1 ? [{ label: 'Bajar', onSelect: () => void reorderItem(list, index, 1) }] : []),
      ...(loc?.point || loc?.name ? [
        { label: 'Abrir en Apple Maps', onSelect: () => window.open(appleMapsUrl(loc.point, loc.name), '_blank') },
        { label: 'Abrir en Google Maps', onSelect: () => window.open(googleMapsUrl(loc.point, loc.name), '_blank') },
      ] : []),
      { label: 'Eliminar', danger: true, onSelect: async () => {
        if (await ui.confirm({ title: `¿Eliminar «${item.title}»?`, confirmLabel: 'Eliminar', danger: true })) {
          await remove('items', item.id);
          for (const pid of item.photoIds) await remove('files', pid);
        }
      } },
    ]);
  }

  const dayLabel = (d: string) => (d === IDEAS ? 'Ideas sin fecha' : `${tripDays.includes(d) ? `Día ${tripDays.indexOf(d) + 1} · ` : ''}${fmt.weekday(d)}`);

  return (
    <div className="stack">
      {!embedded && (
        <div className="row-between">
          <Segmented label="Vista del itinerario" value={view} onChange={setView} options={[{ value: 'dia', label: 'Por día' }, { value: 'resumen', label: 'Resumen' }]} />
          <button className="btn sm" onClick={() => setForm({ date: view === 'dia' ? (selected === IDEAS ? null : selected) : null })}><Plus /> Añadir</button>
        </div>
      )}

      {view === 'dia' ? (
        <>
          <div className="days" role="tablist" aria-label="Días del viaje">
            {allDays.map((d) => {
              const n = byDay.get(d)?.length ?? 0;
              const date = parseISODate(d);
              return (
                <button key={d} role="tab" className="day-pill" aria-pressed={d === selected} aria-selected={d === selected} onClick={() => selectDay(d)} aria-label={`${dayLabel(d)}, ${n} elementos`}>
                  <span className="dow">{date.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="dnum">{date.getDate()}</span>
                  <span className="dots">{Array.from({ length: Math.min(n, 3) }, (_, i) => <i key={i} />)}</span>
                </button>
              );
            })}
            <button className="day-pill wide" aria-pressed={selected === IDEAS} onClick={() => selectDay(IDEAS)} aria-label={`Ideas sin fecha, ${byDay.get(IDEAS)?.length ?? 0} elementos`}>
              <span className="dow">Ideas</span>
              <span className="dnum"><Lightbulb size={18} /></span>
              <span className="dots">{Array.from({ length: Math.min(byDay.get(IDEAS)?.length ?? 0, 3) }, (_, i) => <i key={i} />)}</span>
            </button>
          </div>

          <div className="row-between">
            <h2 className="cap" style={{ fontSize: 18, fontWeight: 650 }}>{selected === now && embedded ? 'Hoy' : dayLabel(selected)}</h2>
            <div className="row" style={{ gap: 6 }}>
              {extraDays.includes(selected) && <span className="pill warn">Fuera de fechas</span>}
              {weather && <WeatherChip w={weather} />}
              {embedded && <button className="btn sm" onClick={() => setForm({ date: selected === IDEAS ? null : selected })} aria-label="Añadir al itinerario"><Plus /></button>}
            </div>
          </div>

          {!allDays.length && selected === IDEAS && !list.length && (
            <div className="notice"><CalendarPlus /> Añade fechas al viaje para organizar el itinerario por días. Mientras tanto, guarda aquí tus ideas.</div>
          )}

          {list.length === 0 ? (
            <div className="card flat">
              <Empty icon={selected === IDEAS ? Lightbulb : CalendarPlus} title={selected === IDEAS ? 'Sin ideas guardadas' : 'Día libre'}
                text={selected === IDEAS ? 'Apunta planes que aún no tienen día y muévelos cuando los decidas.' : 'Añade actividades, comidas, transportes o notas para este día.'}
                action={<button className="btn secondary sm" onClick={() => setForm({ date: selected === IDEAS ? null : selected })}><Plus /> Añadir</button>} />
            </div>
          ) : (
            <ol className="timeline stagger" key={selected} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {list.map((it, idx) => <TimelineItem key={it.id} item={it} onOpen={() => setForm({ item: it, date: it.date })} onMore={() => more(it, idx)} />)}
            </ol>
          )}
          {selected !== IDEAS && <JournalCard tripId={trip.id} date={selected} />}
        </>
      ) : (
        <Overview days={allDays} tripDays={tripDays} byDay={byDay} onOpenDay={(d) => { selectDay(d); setView('dia'); }} />
      )}

      {form && <ItemForm trip={trip} item={form.item} defaultDate={form.date} onClose={() => setForm(null)} />}
      {moving && (
        <Sheet open title="Mover a…" onClose={() => setMoving(null)}>
          <div className="list">
            {[...allDays, IDEAS].map((d) => (
              <button key={d} className="list-row" disabled={(moving.date ?? IDEAS) === d} style={{ opacity: (moving.date ?? IDEAS) === d ? 0.45 : 1 }}
                onClick={async () => {
                  await moveItem(moving, d === IDEAS ? null : d);
                  setMoving(null);
                  ui.toast('Movido', { action: { label: 'Ver', onClick: () => selectDay(d) } });
                }}>
                <span className="grow cap">{dayLabel(d)}</span>
                <span className="meta">{byDay.get(d)?.length ?? 0}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function TimelineItem({ item, onOpen, onMore }: { item: ItineraryItem; onOpen: () => void; onMore: () => void }) {
  const icon = itemIcon(item);
  return (
    <li className="tl-item">
      <div className="tl-time">
        {item.startTime ?? <span className="faint">—</span>}
        {item.durationMin ? <span className="dur">{item.startTime ? `→ ${addMinutesToTime(item.startTime, item.durationMin)}` : formatDuration(item.durationMin)}</span> : null}
      </div>
      <div className={`tl-card${item.done ? ' done' : ''}`}>
        <div className="icon-tile" data-tone={ITEM_TONE[item.type]} aria-hidden="true"><Icon name={icon} /></div>
        <button className="grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', color: 'inherit' }} onClick={onOpen} aria-label={`Editar ${item.title}`}>
          <div className="tl-title">{item.title}{item.to ? ` → ${item.to}` : ''}</div>
          <div className="tl-sub">
            <span>{itemTypeLabel(item.type)}</span>
            {item.durationMin ? <span><Clock aria-hidden="true" />{formatDuration(item.durationMin)}</span> : null}
            {item.location?.name && <span className="ellipsis" style={{ maxWidth: 200 }}><MapPin aria-hidden="true" />{item.location.name}</span>}
            {item.booking && <span><Ticket aria-hidden="true" />{item.booking}</span>}
          </div>
          {item.notes && <div className="small muted" style={{ marginTop: 6, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.notes}</div>}
          <PhotoRow ids={item.photoIds} />
        </button>
        <div className="stack-sm" style={{ alignItems: 'center', gap: 2 }}>
          <CheckButton on={item.done} label={item.done ? 'Marcar como pendiente' : 'Marcar como completada'} onToggle={() => void update<ItineraryItem>('items', item.id, { done: !item.done })} />
          <button className="icon-btn sm muted" aria-label={`Más opciones de ${item.title}`} onClick={onMore} style={{ marginTop: 8 }}><MoreHorizontal /></button>
        </div>
      </div>
    </li>
  );
}

function Overview({ days, tripDays, byDay, onOpenDay }: { days: string[]; tripDays: string[]; byDay: Map<string, ItineraryItem[]>; onOpenDay: (d: string) => void }) {
  const ideas = byDay.get(IDEAS) ?? [];
  const total = [...byDay.values()].reduce((a, l) => a + l.length, 0);
  const done = [...byDay.values()].reduce((a, l) => a + l.filter((i) => i.done).length, 0);
  if (!total && !days.length) return <div className="card flat"><Empty icon={CalendarPlus} title="Itinerario vacío" text="Añade fechas al viaje y empieza a planificar día a día." /></div>;
  return (
    <div className="stack">
      <div className="stats">
        <div className="stat"><div className="lbl">Elementos</div><div className="val">{total}</div><div className="sub">{done} completados</div></div>
        <div className="stat"><div className="lbl">Días planificados</div><div className="val">{tripDays.filter((d) => byDay.get(d)?.length).length}<span className="small muted"> / {tripDays.length}</span></div><div className="sub">{ideas.length} ideas sin fecha</div></div>
      </div>
      <div className="list">
        {[...days, ...(ideas.length ? [IDEAS] : [])].map((d) => {
          const l = byDay.get(d) ?? [];
          return (
            <button key={d} className="list-row" style={{ alignItems: 'flex-start' }} onClick={() => onOpenDay(d)}>
              <div style={{ width: 46, flex: 'none' }}>
                {d === IDEAS ? <Lightbulb size={20} style={{ color: 'var(--accent-2)' }} /> : (
                  <>
                    <div className="tiny faint" style={{ textTransform: 'uppercase' }}>{tripDays.includes(d) ? `Día ${tripDays.indexOf(d) + 1}` : 'Extra'}</div>
                    <div style={{ fontWeight: 650 }}>{fmt.dayShort(d)}</div>
                  </>
                )}
              </div>
              <div className="grow">
                {l.length === 0 ? <span className="faint small">Sin planes</span> : l.slice(0, 4).map((i) => (
                  <div key={i.id} className="small ellipsis" style={{ color: i.done ? 'var(--text-3)' : undefined }}>
                    <span className="num faint">{i.startTime ?? '·'}</span> {i.title}
                  </div>
                ))}
                {l.length > 4 && <div className="tiny faint">+{l.length - 4} más</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
