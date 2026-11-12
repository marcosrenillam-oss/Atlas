import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl, { type Map as MLMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, X, MapPinPlus } from 'lucide-react';
import type { GeoPoint } from '../domain/types';
import { Icon } from '../ui/Icon';
import { appleMapsUrl } from './external';
import { styleForTheme } from './provider';
import type { MapMarker, MapViewProps } from './MapView';

/** Curva suave entre dos puntos (para dibujar el recorrido del día). */
function arc(a: GeoPoint, b: GeoPoint, steps = 24): [number, number][] {
  const mx = (a.lng + b.lng) / 2, my = (a.lat + b.lat) / 2;
  const dx = b.lng - a.lng, dy = b.lat - a.lat;
  const cx = mx - dy * 0.18, cy = my + dx * 0.18;
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([(1 - t) ** 2 * a.lng + 2 * (1 - t) * t * cx + t ** 2 * b.lng, (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * cy + t ** 2 * b.lat]);
  }
  return out;
}

/** Nombres en español cuando OpenStreetMap los tiene. */
function spanishLabels(map: MLMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const tf = map.getLayoutProperty(layer.id, 'text-field');
    if (!tf) continue;
    try {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:es'], ['get', 'name:latin'], ['get', 'name']]);
    } catch {
      /* capa con formato propio: se deja igual */
    }
  }
}

function addRoute(map: MLMap, route?: GeoPoint[]) {
  const coords = route && route.length > 1 ? route.slice(1).flatMap((p, i) => arc(route[i], p)) : [];
  const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: coords } };
  const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
  if (src) src.setData(data);
  else {
    map.addSource('route', { type: 'geojson', data });
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0e8fb0';
    map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 } });
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': color, 'line-width': 3.5, 'line-dasharray': [1.5, 1.6] } });
  }
}

export default function VectorMap({ markers, route, className, onPick, fallbackCenter, singleZoom = 13.5, onFail }: MapViewProps & { onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const live = useRef<{ marker: Marker; root: Root }[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [picked, setPicked] = useState<GeoPoint | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const routeRef = useRef(route);
  routeRef.current = route;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const firstFit = useRef(true);

  // Crear el mapa una vez.
  useEffect(() => {
    if (!el.current) return;
    let m: MLMap;
    try {
      m = new maplibregl.Map({
        container: el.current,
        style: styleForTheme(),
        center: fallbackCenter ? [fallbackCenter.lng, fallbackCenter.lat] : [-3.7, 40.2],
        zoom: fallbackCenter ? 10 : 4,
        attributionControl: { compact: true },
        cooperativeGestures: false,
        dragRotate: true,
        pitchWithRotate: false,
        fadeDuration: 150,
      });
    } catch {
      onFail(); // sin WebGL
      return;
    }
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false, visualizePitch: false }), 'top-right');
    m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), 'top-right');
    let loaded = false;
    const timeout = setTimeout(() => !loaded && onFail(), 12000);
    m.on('style.load', () => {
      loaded = true;
      clearTimeout(timeout);
      spanishLabels(m);
      addRoute(m, routeRef.current);
      setReady(true);
    });
    m.on('click', (e) => {
      if ((e.originalEvent.target as HTMLElement).closest('.ml-pin')) return;
      setSelected(null);
      if (onPickRef.current) setPicked({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    // Cambio de tema claro/oscuro → cambia el estilo del mapa.
    const mo = new MutationObserver(() => m.setStyle(styleForTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      clearTimeout(timeout);
      mo.disconnect();
      live.current.forEach(({ marker, root }) => {
        marker.remove();
        setTimeout(() => root.unmount());
      });
      live.current = [];
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    live.current.forEach(({ marker, root }) => {
      marker.remove();
      setTimeout(() => root.unmount());
    });
    live.current = [];
    for (const mk of markers) {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'ml-pin';
      node.setAttribute('aria-label', mk.label);
      const tone = mk.tone === 'muted' ? 'slate' : !mk.tone || mk.tone === 'accent' ? 'sky' : mk.tone;
      node.dataset.tone = tone;
      const root = createRoot(node);
      root.render(mk.badge ? <span className="ml-num">{mk.badge}</span> : <Icon name={mk.icon ?? 'MapPin'} size={15} />);
      node.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setPicked(null);
        setSelected(mk);
        m.easeTo({ center: [mk.point.lng, mk.point.lat], duration: 450, offset: [0, -40] });
      });
      const marker = new maplibregl.Marker({ element: node, anchor: 'center' }).setLngLat([mk.point.lng, mk.point.lat]).addTo(m);
      live.current.push({ marker, root });
    }
    if (markers.length) {
      const b = new maplibregl.LngLatBounds();
      markers.forEach((mk) => b.extend([mk.point.lng, mk.point.lat]));
      if (markers.length === 1) m.jumpTo({ center: [markers[0].point.lng, markers[0].point.lat], zoom: singleZoom });
      else m.fitBounds(b, { padding: { top: 60, bottom: 60, left: 50, right: 50 }, maxZoom: singleZoom < 8 ? 6 : 14.5, duration: firstFit.current ? 0 : 600 });
      firstFit.current = false;
    } else if (fallbackCenter) m.jumpTo({ center: [fallbackCenter.lng, fallbackCenter.lat], zoom: 10 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, fallbackCenter]);

  // Recorrido.
  useEffect(() => {
    const m = map.current;
    if (m && ready && m.isStyleLoaded()) addRoute(m, route);
  }, [route, ready]);

  // Chincheta provisional al tocar el mapa.
  useEffect(() => {
    const m = map.current;
    pickMarker.current?.remove();
    pickMarker.current = null;
    if (!m || !picked) return;
    const node = document.createElement('div');
    node.className = 'ml-pin ml-new';
    node.dataset.tone = 'coral';
    node.innerHTML = '<span class="ml-num">+</span>';
    pickMarker.current = new maplibregl.Marker({ element: node }).setLngLat([picked.lng, picked.lat]).addTo(m);
  }, [picked]);

  return (
    <div className="map-wrap">
      <div ref={el} className={`map ${className ?? ''}`} role="application" aria-label="Mapa" />
      {selected && (
        <div className="map-card" role="dialog" aria-label={selected.label}>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="ellipsis" style={{ fontWeight: 750 }}>{selected.label}</div>
            {selected.sub && <div className="small muted ellipsis">{selected.sub}</div>}
          </div>
          <a className="icon-btn filled" href={appleMapsUrl(selected.point, selected.label)} target="_blank" rel="noopener" aria-label="Cómo llegar"><Navigation /></a>
          {selected.onClick && <button className="btn sm" onClick={() => selected.onClick!()}>Detalles</button>}
          <button className="icon-btn sm muted" aria-label="Cerrar" onClick={() => setSelected(null)}><X /></button>
        </div>
      )}
      {picked && (
        <div className="map-card" role="dialog" aria-label="Nuevo lugar">
          <div className="grow small muted">¿Guardar un lugar en este punto?</div>
          <button className="btn sm" onClick={() => { onPickRef.current?.(picked); setPicked(null); }}><MapPinPlus /> Guardar</button>
          <button className="icon-btn sm muted" aria-label="Cancelar" onClick={() => setPicked(null)}><X /></button>
        </div>
      )}
    </div>
  );
}
