import { useState } from 'react';
import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react';
import type { GeoPoint, Location, Place } from '../domain/types';
import { formatCoords, parseCoords } from './external';
import { searchPlaces, type GeoResult } from './geocode';
import { useOnline } from '../app/hooks';
import { useUI } from '../ui/UIProvider';

/** Ubicación: lugar guardado, búsqueda (con conexión), coordenadas pegadas o posición actual (GPS). */
export function LocationPicker({ value, onChange, places, near, onPickPlace }: {
  value: Location | undefined;
  onChange: (l: Location | undefined) => void;
  places?: Place[];
  near?: GeoPoint;
  onPickPlace?: (p: Place) => void;
}) {
  const online = useOnline();
  const ui = useUI();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  const loc = value ?? {};

  async function search() {
    const asCoords = parseCoords(q);
    if (asCoords) {
      onChange({ ...loc, point: asCoords, name: loc.name || formatCoords(asCoords) });
      setQ('');
      return;
    }
    setBusy('search');
    try {
      const r = await searchPlaces(q, near);
      setResults(r);
      if (!r.length) ui.toast('Sin resultados en OpenStreetMap.');
    } catch (e) {
      ui.toast((e as Error).message, { kind: 'error' });
    } finally {
      setBusy(null);
    }
  }

  function gps() {
    if (!navigator.geolocation) return ui.toast('Este dispositivo no permite obtener la ubicación.', { kind: 'error' });
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point = { lat: p.coords.latitude, lng: p.coords.longitude };
        onChange({ ...loc, point, name: loc.name || 'Mi ubicación' });
        setBusy(null);
      },
      (err) => {
        setBusy(null);
        ui.toast(err.code === 1 ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación.', { kind: 'error' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const withPoint = (places ?? []).filter((p) => p.point);

  return (
    <div className="stack-sm">
      <input className="input" value={loc.name ?? ''} onChange={(e) => onChange({ ...loc, name: e.target.value || undefined })} placeholder="Nombre del lugar o dirección" aria-label="Nombre de la ubicación" />
      {loc.point ? (
        <div className="row small" style={{ color: 'var(--text-2)' }}>
          <MapPin size={15} style={{ color: 'var(--success)' }} />
          <span className="grow num">{formatCoords(loc.point)}</span>
          <button type="button" className="btn ghost sm" onClick={() => onChange({ ...loc, point: undefined })}>Quitar punto</button>
        </div>
      ) : (
        <span className="hint tiny faint">Sin punto en el mapa. Puedes buscarlo, elegir un lugar guardado, pegar coordenadas o usar tu ubicación.</span>
      )}
      {withPoint.length > 0 && (
        <select className="select" value="" aria-label="Elegir un lugar guardado" onChange={(e) => {
          const p = withPoint.find((x) => x.id === e.target.value);
          if (p) {
            onChange({ name: p.name, address: p.address, point: p.point });
            onPickPlace?.(p);
          }
        }}>
          <option value="">Elegir un lugar guardado…</option>
          {withPoint.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <div className="input-group">
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={online ? 'Buscar en el mapa o pegar coordenadas' : 'Pegar coordenadas (sin conexión)'} aria-label="Buscar ubicación"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (q.trim()) void search(); } }} />
        <button type="button" className="icon-btn filled" aria-label="Buscar" disabled={!q.trim() || busy !== null || (!online && !parseCoords(q))} onClick={() => void search()}>
          {busy === 'search' ? <Loader2 className="spin" /> : <Search />}
        </button>
        <button type="button" className="icon-btn filled" aria-label="Usar mi ubicación" disabled={busy !== null} onClick={gps}>
          {busy === 'gps' ? <Loader2 className="spin" /> : <Crosshair />}
        </button>
      </div>
      {results && results.length > 0 && (
        <div className="list">
          {results.map((r, i) => (
            <button type="button" key={i} className="list-row" onClick={() => { onChange({ name: r.name, address: r.address, point: r.point }); setResults(null); setQ(''); }}>
              <MapPin size={18} style={{ color: 'var(--accent)', flex: 'none' }} />
              <div className="grow">
                <div className="ellipsis" style={{ fontWeight: 600 }}>{r.name}</div>
                <div className="meta ellipsis">{r.address}</div>
              </div>
            </button>
          ))}
          <button type="button" className="list-row small muted" onClick={() => setResults(null)}><X size={16} /> Cerrar resultados · Datos © OpenStreetMap</button>
        </div>
      )}
      {!online && (
        <div className="hint tiny faint">
          Sin conexión no se pueden buscar lugares nuevos: usa un lugar guardado, coordenadas o tu ubicación.
        </div>
      )}
    </div>
  );
}
