import { useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Controls';
import { Icon } from '../../ui/Icon';
import { PhotoField } from '../../ui/Photos';
import { useUI } from '../../ui/UIProvider';
import { LocationPicker } from '../../maps/LocationPicker';
import { ITEM_TYPES } from '../../domain/catalog';
import type { ItineraryItem, ItemType, Place, Trip } from '../../domain/types';
import { eachDay, fmt, isISODate, isTime } from '../../lib/dates';
import { db } from '../../data/db';
import { save, update } from '../../data/repo';
import { usePlaces } from '../../data/queries';

/** Coloca un elemento con hora entre sus hermanos según la hora. */
export async function orderForTime(tripId: string, date: string | null, time: string | undefined, excludeId?: string): Promise<number> {
  const sib = (await db.items.where('tripId').equals(tripId).filter((i) => i.date === date && i.id !== excludeId).toArray()).sort((a, b) => a.order - b.order);
  if (!sib.length) return 0;
  if (!time) return sib[sib.length - 1].order + 1;
  const after = sib.find((s) => s.startTime && s.startTime > time);
  if (!after) return sib[sib.length - 1].order + 1;
  // Desplaza los posteriores para hacer hueco.
  for (const s of sib) if (s.order >= after.order) await update<ItineraryItem>('items', s.id, { order: s.order + 1 });
  return after.order;
}

export function ItemForm({ trip, item, defaultDate, onClose }: { trip: Trip; item?: ItineraryItem; defaultDate: string | null; onClose: () => void }) {
  const ui = useUI();
  const places = usePlaces(trip.id) ?? [];
  const general = usePlaces('all')?.filter((p) => p.tripId === null) ?? [];
  const [d, setD] = useState<Partial<ItineraryItem>>(() => item ?? { type: 'actividad', date: defaultDate, photoIds: [], done: false });
  const [dateMode, setDateMode] = useState<'trip' | 'custom'>(() => (item?.date && trip.startDate && trip.endDate && (item.date < trip.startDate || item.date > trip.endDate) ? 'custom' : 'trip'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hours, setHours] = useState(() => (item?.durationMin ? String(Math.floor(item.durationMin / 60)) : ''));
  const [mins, setMins] = useState(() => (item?.durationMin ? String(item.durationMin % 60) : ''));
  const set = <K extends keyof ItineraryItem>(k: K, v: ItineraryItem[K]) => setD((x) => ({ ...x, [k]: v }));
  const days = eachDay(trip.startDate ?? '', trip.endDate ?? trip.startDate ?? '');
  const firstStage = trip.stages.find((s) => s.point)?.point;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const er: Record<string, string> = {};
    if (!d.title?.trim()) er.title = 'Escribe un título.';
    if (d.startTime && !isTime(d.startTime)) er.time = 'Hora no válida.';
    if (d.date && !isISODate(d.date)) er.date = 'Fecha no válida.';
    const h = hours ? Number(hours) : 0;
    const m = mins ? Number(mins) : 0;
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59 || h > 240) er.duration = 'Duración no válida.';
    setErrors(er);
    if (Object.keys(er).length) return;
    const durationMin = h * 60 + m || undefined;
    const date = d.date ?? null;
    const base = {
      tripId: trip.id, type: d.type as ItemType, title: d.title!.trim(), date, startTime: d.startTime || undefined, durationMin,
      location: d.location?.name || d.location?.point ? d.location : undefined, placeId: d.placeId, booking: d.booking?.trim() || undefined,
      notes: d.notes?.trim() || undefined, photoIds: d.photoIds ?? [], done: d.done ?? false, to: d.to?.trim() || undefined,
    };
    try {
      if (item) {
        const moved = item.date !== date || item.startTime !== base.startTime;
        const order = moved ? await orderForTime(trip.id, date, base.startTime, item.id) : item.order;
        await update<ItineraryItem>('items', item.id, { ...base, order });
      } else {
        const order = await orderForTime(trip.id, date, base.startTime);
        await save<ItineraryItem>('items', { ...base, order });
      }
      onClose();
    } catch (err) {
      ui.toast((err as Error).message, { kind: 'error' });
    }
  }

  return (
    <Sheet open full title={item ? 'Editar' : 'Añadir al itinerario'} onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'item-form' }}>
      <form id="item-form" className="form" onSubmit={submit} noValidate>
        <div className="field">
          <span className="label">Tipo</span>
          <div className="chips" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
            {ITEM_TYPES.map((t) => (
              <button type="button" key={t.value} className="chip" aria-pressed={d.type === t.value} onClick={() => set('type', t.value)}>
                <Icon name={t.icon} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Título" htmlFor="i-title" error={errors.title}>
          <input id="i-title" className="input" value={d.title ?? ''} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title || undefined}
            placeholder={d.type === 'restaurante' ? 'Cena en…' : d.type === 'transporte' ? 'Vuelo MAD → LIS' : d.type === 'alojamiento' ? 'Hotel…' : 'Visita al…'} />
        </Field>
        {d.type === 'transporte' && (
          <Field label="Destino del trayecto" htmlFor="i-to">
            <input id="i-to" className="input" value={d.to ?? ''} onChange={(e) => set('to', e.target.value)} placeholder="Ciudad o estación de llegada" />
          </Field>
        )}
        <Field label="Día" error={errors.date}>
          {dateMode === 'trip' && days.length ? (
            <select className="select" value={d.date ?? ''} onChange={(e) => {
              if (e.target.value === '__custom') return setDateMode('custom');
              set('date', e.target.value || null);
            }}>
              <option value="">Sin día (ideas)</option>
              {days.map((x, i) => <option key={x} value={x}>Día {i + 1} · {fmt.weekdayShort(x)}</option>)}
              <option value="__custom">Otra fecha…</option>
            </select>
          ) : (
            <div className="input-group">
              <input type="date" className="input" value={d.date ?? ''} onChange={(e) => set('date', e.target.value || null)} aria-label="Fecha" />
              {days.length > 0 && <button type="button" className="btn secondary sm" onClick={() => setDateMode('trip')}>Días del viaje</button>}
            </div>
          )}
        </Field>
        <div className="grid-2">
          <Field label="Hora" htmlFor="i-time" error={errors.time}>
            <input id="i-time" type="time" className="input" value={d.startTime ?? ''} onChange={(e) => set('startTime', e.target.value || undefined)} />
          </Field>
          <Field label="Duración" error={errors.duration}>
            <div className="input-group">
              <input className="input" inputMode="numeric" placeholder="h" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, ''))} aria-label="Horas" />
              <input className="input" inputMode="numeric" placeholder="min" value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} aria-label="Minutos" />
            </div>
          </Field>
        </div>
        <Field label="Ubicación">
          <LocationPicker value={d.location} onChange={(l) => setD((x) => ({ ...x, location: l, placeId: l?.point && x.location?.point && l.point === x.location.point ? x.placeId : undefined }))}
            places={[...places, ...general]} near={firstStage} onPickPlace={(p: Place) => set('placeId', p.id)} />
        </Field>
        <Field label="Reserva / localizador" htmlFor="i-book">
          <input id="i-book" className="input" value={d.booking ?? ''} onChange={(e) => set('booking', e.target.value)} placeholder="Código de reserva, asiento, puerta…" autoCapitalize="characters" />
        </Field>
        <Field label="Notas" htmlFor="i-notes">
          <textarea id="i-notes" className="textarea" value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Detalles, horarios de apertura, qué pedir…" />
        </Field>
        <div className="field">
          <span className="label">Fotografías</span>
          <PhotoField ids={d.photoIds ?? []} tripId={trip.id} onChange={(ids) => set('photoIds', ids)} />
        </div>
      </form>
    </Sheet>
  );
}
