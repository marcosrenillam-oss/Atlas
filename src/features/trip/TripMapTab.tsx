import { useMemo, useState } from 'react';
import { MapPin, Plus, Route } from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { useItems, usePlaces } from '../../data/queries';
import { MapView, type MapMarker } from '../../maps/MapView';
import { PLACE_CATEGORIES, placeCategoryLabel } from '../../domain/catalog';
import type { GeoPoint, Place, PlaceCategory } from '../../domain/types';
import { eachDay, fmt } from '../../lib/dates';
import { formatCoords, distanceKm } from '../../maps/external';
import { Icon } from '../../ui/Icon';
import { ITEM_TONE, PLACE_TONE } from '../../ui/tones';
import { itemIcon } from './ItineraryTab';
import { Empty } from '../../ui/Empty';
import { PlaceForm } from '../places/PlaceForm';
import { PlaceDetail } from '../places/PlaceDetail';

export function TripMapTab({ trip }: { trip: TripWithStatus }) {
  const placesQ = usePlaces(trip.id);
  const itemsQ = useItems(trip.id);
  const places = useMemo(() => placesQ ?? [], [placesQ]);
  const items = useMemo(() => itemsQ ?? [], [itemsQ]);
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all');
  const [day, setDay] = useState<string>('');
  const [detail, setDetail] = useState<Place | null>(null);
  const [form, setForm] = useState<{ point?: GeoPoint; name?: string; category?: PlaceCategory } | null>(null);
  const days = eachDay(trip.startDate ?? '', trip.endDate ?? trip.startDate ?? '');
  const center = trip.stages.find((s) => s.point)?.point;

  const filteredPlaces = useMemo(() => places.filter((p) => p.point && (cat === 'all' || p.category === cat)), [places, cat]);
  const dayItems = useMemo(
    () => (day ? items.filter((i) => i.date === day && i.location?.point).sort((a, b) => a.order - b.order) : []),
    [items, day],
  );

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = filteredPlaces.map((p) => ({
      id: p.id, point: p.point!, label: p.name, sub: placeCategoryLabel(p.category), icon: PLACE_CATEGORIES.find((c) => c.value === p.category)?.icon, tone: PLACE_TONE[p.category], onClick: () => setDetail(p),
    }));
    dayItems.forEach((i, n) => out.push({ id: i.id, point: i.location!.point!, label: i.title, sub: `${i.startTime ?? ''} ${i.location?.name ?? ''}`.trim(), badge: String(n + 1), tone: ITEM_TONE[i.type] }));
    if (!day) {
      for (const i of items) if (i.location?.point && !i.placeId) out.push({ id: i.id, point: i.location.point, label: i.title, sub: i.date ? fmt.dayShort(i.date) : 'Idea', icon: itemIcon(i), tone: ITEM_TONE[i.type] });
    }
    return out;
  }, [filteredPlaces, dayItems, items, day]);

  const route = useMemo(() => dayItems.map((i) => i.location!.point!), [dayItems]);
  const routeKm = route.slice(1).reduce((a, p, i) => a + distanceKm(route[i], p), 0);
  const counts = PLACE_CATEGORIES.map((c) => ({ ...c, n: places.filter((p) => p.category === c.value).length })).filter((c) => c.n);

  return (
    <div className="stack">
      <div className="row-between">
        <select className="select" style={{ maxWidth: 230, minHeight: 38, fontSize: 14 }} value={day} onChange={(e) => setDay(e.target.value)} aria-label="Mostrar recorrido de un día">
          <option value="">Todos los lugares</option>
          {days.map((d, i) => <option key={d} value={d}>Recorrido día {i + 1} · {fmt.dayShort(d)}</option>)}
        </select>
        <button className="btn sm" onClick={() => setForm({})}><Plus /> Lugar</button>
      </div>
      {counts.length > 1 && (
        <div className="chips">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Todos <span className="count">{places.length}</span></button>
          {counts.map((c) => (
            <button key={c.value} className="chip" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}><Icon name={c.icon} /> {c.label} <span className="count">{c.n}</span></button>
          ))}
        </div>
      )}
      <MapView markers={markers} route={route} fallbackCenter={center} onPick={(p) => setForm({ point: p })} onSavePoi={(poi) => setForm({ point: poi.point, name: poi.name, category: poi.category })} />
      {day && route.length > 1 && (
        <div className="notice small"><Route /> {route.length} paradas · {routeKm.toFixed(1).replace('.', ',')} km en línea recta. El trazado une las paradas en orden; no es una ruta de navegación.</div>
      )}
      {day && route.length <= 1 && <div className="notice small"><MapPin /> Añade ubicaciones a las actividades de este día para ver su recorrido.</div>}
      <p className="tiny faint">Toca el mapa para guardar un lugar en ese punto.</p>

      <section>
        <div className="section-head"><h2>Lugares guardados</h2><span className="small faint">{places.length}</span></div>
        {places.length === 0 ? (
          <div className="card flat">
            <Empty icon={MapPin} title="Sin lugares todavía" text="Guarda restaurantes, museos, hoteles o actividades para tenerlos a mano, también sin conexión." action={<button className="btn secondary sm" onClick={() => setForm({})}><Plus /> Añadir lugar</button>} />
          </div>
        ) : (
          <div className="list">
            {places.filter((p) => cat === 'all' || p.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'es')).map((p) => (
              <button key={p.id} className="list-row" onClick={() => setDetail(p)}>
                <div className="icon-tile" data-tone={PLACE_TONE[p.category]}><Icon name={PLACE_CATEGORIES.find((c) => c.value === p.category)?.icon ?? 'MapPin'} /></div>
                <div className="grow">
                  <div className="ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="meta ellipsis">{placeCategoryLabel(p.category)}{p.point ? ` · ${formatCoords(p.point)}` : ' · sin coordenadas'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      {form && <PlaceForm tripId={trip.id} lockTrip initialPoint={form.point} initialName={form.name} initialCategory={form.category} near={center} onClose={() => setForm(null)} />}
      {detail && <PlaceDetail place={places.find((p) => p.id === detail.id) ?? detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
