import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl, { type Map as MLMap, type Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, X, MapPinPlus, Bookmark } from 'lucide-react';
import type { GeoPoint } from '../domain/types';
import { Icon } from '../ui/Icon';
import { appleMapsUrl } from './external';
import { MAP_STYLE, isDarkTheme } from './provider';
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

/** Paleta ATLAS sobre el estilo Liberty (claro) o repintado nocturno (oscuro). */
function recolor(map: MLMap, dark: boolean) {
  const set = (id: string, prop: string, value: unknown) => {
    try {
      if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
    } catch {
      /* capa sin esa propiedad */
    }
  };
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    if (layer.type === 'background') set(id, 'background-color', dark ? '#0e1f2e' : '#f6f1e7');
    else if (layer.type === 'fill') {
      if (id.startsWith('water')) set(id, 'fill-color', dark ? '#1b4e72' : '#a5dde8');
      else if (/park|grass|wood|wetland|pitch|cemetery/.test(id)) set(id, 'fill-color', dark ? '#133a2d' : id.includes('wood') ? '#bfe4b3' : '#cfeeca');
      else if (id.includes('residential')) set(id, 'fill-color', dark ? '#13283a' : '#efe9de');
      else if (id.includes('sand')) set(id, 'fill-color', dark ? '#2b2a22' : '#f3e4bd');
      else if (dark && !id.includes('ice') && !id.includes('building')) set(id, 'fill-color', '#152c40');
      if (/building/.test(id)) set(id, 'fill-color', dark ? '#1d3850' : '#ebe0cf');
      // Las tramas (zonas peatonales…) se ven a rayas en oscuro: las suavizamos.
      if ((layer.paint as Record<string, unknown> | undefined)?.['fill-pattern']) set(id, 'fill-opacity', dark ? 0.08 : 0.5);
    } else if (layer.type === 'fill-extrusion') {
      set(id, 'fill-extrusion-color', dark ? '#1f3a52' : '#ece1d0');
    } else if (layer.type === 'line') {
      if (id.startsWith('waterway')) set(id, 'line-color', dark ? '#1b4e72' : '#8fd2e0');
      else if (dark && /road|highway|bridge|tunnel|street|path|rail/.test(id)) set(id, 'line-color', id.includes('casing') ? '#0b1824' : '#2c4b65');
    } else if (layer.type === 'symbol' && dark) {
      set(id, 'text-color', '#dbe8f2');
      set(id, 'text-halo-color', '#0e1f2e');
    }
  }
}

/** Tipo de lugar (OpenStreetMap) → texto y categoría de ATLAS. */
const POI_LAYERS = ['poi_r1', 'poi_r7', 'poi_r20', 'poi_transit'];
export function poiInfo(cls: string, sub: string): { label: string; category: 'restaurante' | 'museo' | 'actividad' | 'hotel' | 'mirador' | 'compras' | 'transporte' | 'otro' } {
  const k = `${cls} ${sub}`;
  if (/bar|pub|beer|biergarten/.test(k)) return { label: 'Bar', category: 'restaurante' };
  if (/cafe|coffee/.test(k)) return { label: 'Cafetería', category: 'restaurante' };
  if (/ice_cream/.test(k)) return { label: 'Heladería', category: 'restaurante' };
  if (/fast_food/.test(k)) return { label: 'Comida rápida', category: 'restaurante' };
  if (/restaurant|food/.test(k)) return { label: 'Restaurante', category: 'restaurante' };
  if (/bakery/.test(k)) return { label: 'Panadería', category: 'compras' };
  if (/museum|art_gallery|gallery/.test(k)) return { label: 'Museo', category: 'museo' };
  if (/lodging|hotel|hostel|guest/.test(k)) return { label: 'Alojamiento', category: 'hotel' };
  if (/attraction|viewpoint/.test(k)) return { label: 'Lugar de interés', category: 'mirador' };
  if (/railway|bus|subway|tram|ferry|airport|aerialway/.test(k)) return { label: 'Transporte', category: 'transporte' };
  if (/shop|clothes|grocery|supermarket|mall|books|gift|jewel|shoes|alcohol|convenience|department/.test(k)) return { label: 'Tienda', category: 'compras' };
  if (/theatre|cinema|music|park|zoo|stadium|sports/.test(k)) return { label: 'Ocio', category: 'actividad' };
  if (/pharmacy/.test(k)) return { label: 'Farmacia', category: 'otro' };
  return { label: 'Lugar', category: 'otro' };
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

export default function VectorMap({ markers, route, className, onPick, onSavePoi, fallbackCenter, singleZoom = 13.5, onFail }: MapViewProps & { onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const live = useRef<{ marker: Marker; root: Root }[]>([]);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [picked, setPicked] = useState<GeoPoint | null>(null);
  const [poi, setPoi] = useState<{ name: string; label: string; category: ReturnType<typeof poiInfo>['category']; point: GeoPoint } | null>(null);
  const onSavePoiRef = useRef(onSavePoi);
  onSavePoiRef.current = onSavePoi;
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
        style: MAP_STYLE,
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
    (el.current as HTMLDivElement & { __map?: MLMap }).__map = m; // acceso para pruebas E2E
    m.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false, visualizePitch: false }), 'top-right');
    m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), 'top-right');
    let loaded = false;
    const timeout = setTimeout(() => !loaded && onFail(), 12000);
    m.on('style.load', () => {
      loaded = true;
      clearTimeout(timeout);
      spanishLabels(m);
      recolor(m, isDarkTheme());
      addRoute(m, routeRef.current);
      setReady(true);
    });
    m.on('click', (e) => {
      if ((e.originalEvent.target as HTMLElement).closest('.ml-pin')) return;
      setSelected(null);
      // ¿Has tocado un bar, una tienda, un museo…?
      const layers = POI_LAYERS.filter((id) => m.getLayer(id));
      const f = layers.length ? m.queryRenderedFeatures([[e.point.x - 10, e.point.y - 10], [e.point.x + 10, e.point.y + 10]], { layers })[0] : undefined;
      if (f) {
        const props = f.properties as Record<string, string>;
        const name = props['name:es'] || props['name:latin'] || props.name;
        if (name) {
          const info = poiInfo(String(props.class ?? ''), String(props.subclass ?? ''));
          const g = f.geometry as { type: string; coordinates: number[] };
          const point = g.type === 'Point' ? { lat: g.coordinates[1], lng: g.coordinates[0] } : { lat: e.lngLat.lat, lng: e.lngLat.lng };
          setPicked(null);
          setPoi({ name, ...info, point });
          return;
        }
      }
      setPoi(null);
      if (onPickRef.current) setPicked({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    // Cambio de tema claro/oscuro → cambia el estilo del mapa.
    const mo = new MutationObserver(() => m.isStyleLoaded() && recolor(m, isDarkTheme()));
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
      {poi && (
        <div className="map-card" role="dialog" aria-label={poi.name}>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="ellipsis" style={{ fontWeight: 750 }}>{poi.name}</div>
            <div className="small muted">{poi.label}</div>
          </div>
          <a className="icon-btn filled" href={appleMapsUrl(poi.point, poi.name)} target="_blank" rel="noopener" aria-label="Cómo llegar"><Navigation /></a>
          {onSavePoiRef.current && <button className="btn sm" onClick={() => { onSavePoiRef.current?.(poi); setPoi(null); }}><Bookmark /> Guardar</button>}
          <button className="icon-btn sm muted" aria-label="Cerrar" onClick={() => setPoi(null)}><X /></button>
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
