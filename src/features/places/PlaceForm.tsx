import { useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Field } from '../../ui/Controls';
import { Icon } from '../../ui/Icon';
import { PhotoField } from '../../ui/Photos';
import { useUI } from '../../ui/UIProvider';
import { LocationPicker } from '../../maps/LocationPicker';
import { PLACE_CATEGORIES } from '../../domain/catalog';
import type { GeoPoint, Place, PlaceCategory } from '../../domain/types';
import { save, update } from '../../data/repo';
import { useTrips } from '../../data/queries';

export function PlaceForm({ place, tripId, initialPoint, initialName, initialCategory, near, onClose, lockTrip }: {
  place?: Place;
  tripId: string | null;
  initialPoint?: GeoPoint;
  initialName?: string;
  initialCategory?: PlaceCategory;
  near?: GeoPoint;
  onClose: () => void;
  lockTrip?: boolean;
}) {
  const ui = useUI();
  const trips = useTrips() ?? [];
  const [d, setD] = useState<Partial<Place>>(() => place ?? { tripId, name: initialName, category: initialCategory ?? 'actividad', photoIds: [], point: initialPoint });
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Place>(k: K, v: Place[K]) => setD((x) => ({ ...x, [k]: v }));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!d.name?.trim()) return setError('Escribe el nombre del lugar.');
    if (d.url && !/^https?:\/\//i.test(d.url.trim())) return setError('El enlace debe empezar por http:// o https://');
    const rec = {
      tripId: d.tripId ?? null, name: d.name.trim(), category: d.category as PlaceCategory, point: d.point, address: d.address?.trim() || undefined,
      notes: d.notes?.trim() || undefined, photoIds: d.photoIds ?? [], url: d.url?.trim() || undefined,
    };
    try {
      if (place) await update<Place>('places', place.id, rec);
      else await save<Place>('places', rec);
      ui.toast(place ? 'Lugar actualizado' : 'Lugar guardado');
      onClose();
    } catch (err) {
      ui.toast((err as Error).message, { kind: 'error' });
    }
  }

  return (
    <Sheet open full title={place ? 'Editar lugar' : 'Nuevo lugar'} onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'place-form' }}>
      <form id="place-form" className="form" onSubmit={submit} noValidate>
        <Field label="Nombre" htmlFor="p-name" error={error}>
          <input id="p-name" className="input" value={d.name ?? ''} onChange={(e) => { set('name', e.target.value); setError(null); }} placeholder="Museo, restaurante, mirador…" />
        </Field>
        <div className="field">
          <span className="label">Categoría</span>
          <div className="chips" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }}>
            {PLACE_CATEGORIES.map((c) => (
              <button type="button" key={c.value} className="chip" aria-pressed={d.category === c.value} onClick={() => set('category', c.value)}>
                <Icon name={c.icon} /> {c.label}
              </button>
            ))}
          </div>
        </div>
        {!lockTrip && (
          <Field label="Viaje" htmlFor="p-trip" hint="Los lugares generales se ven en Explorar y puedes usarlos en cualquier viaje.">
            <select id="p-trip" className="select" value={d.tripId ?? ''} onChange={(e) => set('tripId', e.target.value || null)}>
              <option value="">General (sin viaje)</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Ubicación">
          <LocationPicker near={near} value={{ name: d.address, point: d.point }} onChange={(l) => setD((x) => ({ ...x, point: l?.point, address: l?.address ?? l?.name ?? x.address, name: x.name || l?.name }))} />
        </Field>
        <Field label="Enlace (web, carta, reserva)" htmlFor="p-url">
          <input id="p-url" className="input" type="url" inputMode="url" value={d.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Notas" htmlFor="p-notes">
          <textarea id="p-notes" className="textarea" value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Horario, precio, recomendación…" />
        </Field>
        <div className="field">
          <span className="label">Fotografías</span>
          <PhotoField ids={d.photoIds ?? []} tripId={d.tripId ?? null} onChange={(ids) => set('photoIds', ids)} />
        </div>
      </form>
    </Sheet>
  );
}
