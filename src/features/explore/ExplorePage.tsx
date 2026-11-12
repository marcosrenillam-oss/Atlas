import { useMemo, useState } from 'react';
import { Compass, Globe2, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePlaces, useTrips } from '../../data/queries';
import { MapView, type MapMarker } from '../../maps/MapView';
import { PLACE_CATEGORIES, placeCategoryLabel } from '../../domain/catalog';
import type { GeoPoint, Place, PlaceCategory } from '../../domain/types';
import { formatCoords } from '../../maps/external';
import { Icon } from '../../ui/Icon';
import { PLACE_TONE } from '../../ui/tones';
import { Empty } from '../../ui/Empty';
import { PlaceForm } from '../places/PlaceForm';
import { PlaceDetail } from '../places/PlaceDetail';
import { useOnline } from '../../app/hooks';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ExplorePage() {
  const places = usePlaces('all');
  const trips = useTrips() ?? [];
  const online = useOnline();
  const [scope, setScope] = useState<string>('all'); // all | general | tripId
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<Place | null>(null);
  const [form, setForm] = useState<{ point?: GeoPoint } | null>(null);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return (places ?? [])
      .filter((p) => (scope === 'all' ? true : scope === 'general' ? p.tripId === null : p.tripId === scope))
      .filter((p) => cat === 'all' || p.category === cat)
      .filter((p) => !nq || norm(`${p.name} ${p.address ?? ''} ${p.notes ?? ''}`).includes(nq))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [places, scope, cat, q]);

  const tripName = (id: string | null) => (id ? trips.find((t) => t.id === id)?.name ?? 'Viaje' : 'General');
  const markers: MapMarker[] = useMemo(
    () => list.filter((p) => p.point).map((p) => ({ id: p.id, point: p.point!, label: p.name, sub: `${placeCategoryLabel(p.category)} · ${tripName(p.tripId)}`, icon: PLACE_CATEGORIES.find((c) => c.value === p.category)?.icon, tone: PLACE_TONE[p.category], onClick: () => setDetail(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, trips],
  );

  return (
    <main className="page stagger">
      <div className="page-head">
        <div>
          <h1><span className="serif grad-text">Explorar</span></h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Link to="/pasaporte" className="icon-btn filled" aria-label="Tu pasaporte"><Globe2 /></Link>
          <button className="btn sm" onClick={() => setForm({})}><Plus /> Lugar</button>
        </div>
      </div>
      {places && places.length === 0 ? (
        <div className="stack">
          <MapView markers={[]} onPick={(p) => setForm({ point: p })} />
          <div className="card">
            <Empty icon={Compass} title="Guarda tus lugares" text={online ? 'Busca un sitio o toca el mapa para guardarlo. Luego podrás añadirlo a cualquier itinerario.' : 'Sin conexión puedes guardar lugares con coordenadas o tu ubicación actual.'}
              action={<button className="btn" onClick={() => setForm({})}><Plus /> Añadir lugar</button>} />
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ minHeight: 38, fontSize: 14 }} value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Filtrar por viaje">
              <option value="all">Todos los lugares</option>
              <option value="general">Generales</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="chips">
            <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Todos</button>
            {PLACE_CATEGORIES.map((c) => (
              <button key={c.value} className="chip" aria-pressed={cat === c.value} onClick={() => setCat(c.value)}><Icon name={c.icon} /> {c.label}</button>
            ))}
          </div>
          <MapView markers={markers} onPick={(p) => setForm({ point: p })} />
          <div className="input-group" style={{ position: 'relative' }}>
            <Search size={17} style={{ position: 'absolute', left: 13, top: 14, color: 'var(--text-3)' }} aria-hidden="true" />
            <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus lugares" style={{ paddingLeft: 38 }} aria-label="Buscar en tus lugares" />
          </div>
          {list.length === 0 ? (
            <p className="small muted center" style={{ padding: 16 }}>Ningún lugar coincide con los filtros.</p>
          ) : (
            <div className="list">
              {list.map((p) => (
                <button key={p.id} className="list-row" onClick={() => setDetail(p)}>
                  <div className="icon-tile" data-tone={PLACE_TONE[p.category]}><Icon name={PLACE_CATEGORIES.find((c) => c.value === p.category)?.icon ?? 'MapPin'} /></div>
                  <div className="grow">
                    <div className="ellipsis" style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="meta ellipsis">{placeCategoryLabel(p.category)} · {tripName(p.tripId)}{p.point ? ` · ${formatCoords(p.point)}` : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {form && <PlaceForm tripId={scope !== 'all' && scope !== 'general' ? scope : null} initialPoint={form.point} onClose={() => setForm(null)} />}
      {detail && <PlaceDetail place={places?.find((p) => p.id === detail.id) ?? detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
