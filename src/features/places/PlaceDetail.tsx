import { useState } from 'react';
import { CalendarPlus, ExternalLink, Navigation, Pencil, Trash2 } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { PLACE_TONE } from '../../ui/tones';
import { useUI } from '../../ui/UIProvider';
import { useFileUrl } from '../../files/files';
import { PLACE_CATEGORIES, placeCategoryLabel } from '../../domain/catalog';
import type { ItineraryItem, ItemType, Place, PlaceCategory } from '../../domain/types';
import { appleMapsUrl, formatCoords, googleMapsUrl } from '../../maps/external';
import { remove, save } from '../../data/repo';
import { useTrips } from '../../data/queries';
import { eachDay, fmt } from '../../lib/dates';
import { orderForTime } from '../trip/ItemForm';
import { Field } from '../../ui/Controls';
import { useOnline } from '../../app/hooks';
import { PlaceForm } from './PlaceForm';

const itemTypeFor = (c: PlaceCategory): ItemType => (c === 'restaurante' ? 'restaurante' : c === 'museo' || c === 'mirador' ? 'visita' : c === 'hotel' ? 'alojamiento' : c === 'transporte' ? 'transporte' : 'actividad');

function Photo({ id }: { id: string }) {
  const url = useFileUrl(id);
  return url ? <img src={url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 12 }} /> : null;
}

export function PlaceDetail({ place, onClose }: { place: Place; onClose: () => void }) {
  const ui = useUI();
  const online = useOnline();
  const trips = useTrips() ?? [];
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tripId, setTripId] = useState(place.tripId ?? trips.find((t) => !t.archived)?.id ?? '');
  const [date, setDate] = useState('');
  const cat = PLACE_CATEGORIES.find((c) => c.value === place.category);
  const trip = trips.find((t) => t.id === tripId);
  const days = trip ? eachDay(trip.startDate ?? '', trip.endDate ?? trip.startDate ?? '') : [];

  async function addToItinerary() {
    if (!tripId) return ui.toast('Elige un viaje.', { kind: 'error' });
    const d = date || null;
    const order = await orderForTime(tripId, d, undefined);
    await save<ItineraryItem>('items', {
      tripId, date: d, order, type: itemTypeFor(place.category), title: place.name, placeId: place.tripId === tripId ? place.id : undefined,
      location: { name: place.name, address: place.address, point: place.point }, notes: place.notes, photoIds: [], done: false,
    });
    setAdding(false);
    ui.toast(`Añadido al itinerario de ${trip?.name}`);
  }

  async function del() {
    if (!(await ui.confirm({ title: `¿Eliminar «${place.name}»?`, message: 'Las actividades del itinerario que lo usan conservan su ubicación.', confirmLabel: 'Eliminar', danger: true }))) return;
    await remove('places', place.id);
    for (const id of place.photoIds) await remove('files', id);
    onClose();
  }

  if (editing) return <PlaceForm place={place} tripId={place.tripId} onClose={() => setEditing(false)} />;

  return (
    <Sheet open title={place.name} onClose={onClose} closeLabel="Cerrar" action={{ label: 'Editar', onClick: () => setEditing(true) }}>
      <div className="stack">
        <div className="row">
          <div className="icon-tile lg" data-tone={PLACE_TONE[place.category]}><Icon name={cat?.icon ?? 'MapPin'} /></div>
          <div className="grow">
            <div style={{ fontWeight: 650, fontSize: 18 }}>{place.name}</div>
            <div className="small muted">{placeCategoryLabel(place.category)}{place.tripId ? ` · ${trips.find((t) => t.id === place.tripId)?.name ?? ''}` : ' · General'}</div>
          </div>
        </div>
        {place.photoIds.length > 0 && <div className="stack-sm">{place.photoIds.map((id) => <Photo key={id} id={id} />)}</div>}
        {(place.address || place.point) && (
          <div className="card flat small stack-sm">
            {place.address && <div>{place.address}</div>}
            {place.point && <div className="muted num">Coordenadas: {formatCoords(place.point)}</div>}
          </div>
        )}
        {place.notes && <div className="card flat" style={{ whiteSpace: 'pre-wrap' }}>{place.notes}</div>}
        <div className="grid-2">
          <a className="btn secondary" href={appleMapsUrl(place.point, place.name)} target="_blank" rel="noopener"><Navigation /> Apple Maps</a>
          <a className="btn secondary" href={googleMapsUrl(place.point, place.name)} target="_blank" rel="noopener"><Navigation /> Google Maps</a>
        </div>
        {!online && <p className="tiny faint">La navegación externa necesita conexión en la app de mapas (salvo mapas que tengas descargados en ella).</p>}
        {place.url && <a className="btn ghost" href={place.url} target="_blank" rel="noopener"><ExternalLink /> Abrir enlace</a>}
        {adding ? (
          <div className="card stack">
            <Field label="Viaje">
              <select className="select" value={tripId} onChange={(e) => { setTripId(e.target.value); setDate(''); }}>
                <option value="" disabled>Elige un viaje</option>
                {trips.filter((t) => !t.archived).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Día">
              <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
                <option value="">Sin día (ideas)</option>
                {days.map((d, i) => <option key={d} value={d}>Día {i + 1} · {fmt.weekdayShort(d)}</option>)}
              </select>
            </Field>
            <div className="row"><button className="btn secondary grow" onClick={() => setAdding(false)}>Cancelar</button><button className="btn grow" onClick={() => void addToItinerary()} disabled={!tripId}>Añadir</button></div>
          </div>
        ) : (
          <button className="btn" onClick={() => setAdding(true)} disabled={!trips.length}><CalendarPlus /> Añadir al itinerario</button>
        )}
        <div className="row">
          <button className="btn secondary grow" onClick={() => setEditing(true)}><Pencil /> Editar</button>
          <button className="btn danger grow" onClick={() => void del()}><Trash2 /> Eliminar</button>
        </div>
      </div>
    </Sheet>
  );
}
