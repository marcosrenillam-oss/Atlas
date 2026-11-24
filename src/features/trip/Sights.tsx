import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2, MapPin, Plus, RefreshCw } from 'lucide-react';
import { useOnline } from '../../app/hooks';
import { useItems } from '../../data/queries';
import { save } from '../../data/repo';
import type { ItineraryItem, Trip } from '../../domain/types';
import { useUI } from '../../ui/UIProvider';
import { getSights, type Sight, type SightsResult } from '../../services/wikivoyage';

/** «Qué ver en …»: lugares de interés del destino (Wikivoyage); un toque y pasan a las Ideas del itinerario. */
export function Sights({ trip }: { trip: Trip }) {
  const ui = useUI();
  const nav = useNavigate();
  const online = useOnline();
  const items = useItems(trip.id) ?? [];
  const places = [...new Set(trip.stages.map((s) => s.name.trim()).filter(Boolean))];
  const [place, setPlace] = useState(places[0] ?? '');
  const [res, setRes] = useState<SightsResult | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!place) return;
    let alive = true;
    setRes(undefined);
    setError(null);
    void getSights(place, tick > 0).then(
      (r) => alive && setRes(r),
      (e: Error) => {
        if (!alive) return;
        setError(e.message);
        setRes(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [place, tick, online]);

  if (!places.length) return null;
  const added = new Set(items.map((i) => i.title.trim().toLowerCase()));

  async function add(s: Sight) {
    const ideas = items.filter((i) => i.date === null);
    await save<ItineraryItem>('items', {
      tripId: trip.id, date: null, order: (ideas.reduce((m, i) => Math.max(m, i.order), 0) || 0) + 1, type: 'visita', title: s.name,
      location: s.lat !== undefined && s.lng !== undefined ? { name: s.name, address: s.address, point: { lat: s.lat, lng: s.lng } } : { name: s.name, address: s.address },
      notes: s.description, photoIds: [], done: false,
    });
    ui.toast(`«${s.name}» añadido a Ideas`, { action: { label: 'Ver', onClick: () => nav(`/viajes/${trip.id}/itinerario?dia=ideas`) } });
  }

  return (
    <section className="sights" aria-label={`Qué ver en ${place}`}>
      <div className="section-head">
        <h2>Qué ver en {place}</h2>
        {res && online && <button type="button" className="icon-btn sm" aria-label="Actualizar" onClick={() => setTick((t) => t + 1)}><RefreshCw size={16} /></button>}
      </div>
      {places.length > 1 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
          {places.map((p) => <button key={p} type="button" className={`chip${p === place ? ' on' : ''}`} aria-pressed={p === place} onClick={() => setPlace(p)}>{p}</button>)}
        </div>
      )}
      {res === undefined ? (
        <p className="small muted row" style={{ gap: 8 }}><Loader2 className="spin" size={16} /> Buscando lugares de interés…</p>
      ) : res && res.sights.length ? (
        <>
          <div className="hscroll sight-row">
            {res.sights.map((s, i) => {
              const isAdded = added.has(s.name.trim().toLowerCase());
              return (
                <article key={s.name} className="sight-card">
                  <div className="sc-num">{String(i + 1).padStart(2, '0')}</div>
                  <h3 className="sc-name">{s.name}</h3>
                  {s.description && <p className="sc-desc">{s.description}</p>}
                  <div className="sc-foot">
                    <span className="sc-kind">{s.lat !== undefined ? <MapPin size={13} aria-hidden="true" /> : null}{s.kind === 'ver' ? 'Para ver' : 'Para hacer'}</span>
                    <button type="button" className={`sc-add${isAdded ? ' on' : ''}`} disabled={isAdded} onClick={() => void add(s)} aria-label={isAdded ? `${s.name} ya está en tu plan` : `Añadir ${s.name} a Ideas`}>
                      {isAdded ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="tiny faint" style={{ marginTop: 8 }}>
            Fuente: <a href={`https://${res.lang}.wikivoyage.org/wiki/${encodeURIComponent(res.page.replace(/ /g, '_'))}`} target="_blank" rel="noopener">Wikivoyage</a> (CC BY-SA). Guardado en el móvil.{' '}
            <Link to={`/viajes/${trip.id}/itinerario?dia=ideas`}>Ver tus Ideas</Link>
          </p>
        </>
      ) : error ? (
        <p className="small muted">{error}</p>
      ) : !online ? (
        <p className="small muted">Con conexión verás aquí los lugares de interés de {place}; después quedan guardados para usarlos sin conexión.</p>
      ) : (
        <p className="small muted">Wikivoyage no tiene todavía lugares de interés para «{place}».</p>
      )}
    </section>
  );
}
