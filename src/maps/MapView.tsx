import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DEFAULT_PROVIDER } from './provider';
import { useOnline } from '../app/hooks';
import type { GeoPoint } from '../domain/types';
import { OfflinePlot } from './OfflinePlot';

export interface MapMarker {
  id: string;
  point: GeoPoint;
  label: string;
  sub?: string;
  badge?: string; // número de orden o inicial
  tone?: 'accent' | 'muted';
  onClick?: () => void;
}

/**
 * Mapa con proveedor configurable (OpenStreetMap por defecto). Con conexión muestra teselas;
 * sin conexión, o si la cartografía no carga, muestra un plano local con los puntos guardados.
 */
export function MapView({ markers, route, className, onPick, fallbackCenter }: {
  markers: MapMarker[];
  route?: GeoPoint[];
  className?: string;
  onPick?: (p: GeoPoint) => void;
  fallbackCenter?: GeoPoint;
}) {
  const online = useOnline();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!online || !el.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, tap: true } as L.MapOptions);
    m.attributionControl.setPrefix(false);
    let loaded = 0, errors = 0;
    const tiles = L.tileLayer(DEFAULT_PROVIDER.url, {
      maxZoom: DEFAULT_PROVIDER.maxZoom,
      attribution: DEFAULT_PROVIDER.attribution,
      className: DEFAULT_PROVIDER.darkFilter ? 'darkable' : '',
      crossOrigin: true,
    });
    tiles.on('tileload', () => { loaded++; setTilesFailed(false); });
    tiles.on('tileerror', () => { errors++; if (errors >= 4 && loaded === 0) setTilesFailed(true); });
    tiles.addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on('click', (e: L.LeafletMouseEvent) => onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      map.current = null;
      layer.current = null;
      m.stop();
      m.off();
      m.remove();
    };
  }, [online]);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const pts: L.LatLngExpression[] = [];
    if (route && route.length > 1) {
      L.polyline(route.map((p) => [p.lat, p.lng]), { color: getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#5b7089', weight: 3, opacity: 0.85, dashArray: '6 6' }).addTo(g);
    }
    for (const mk of markers) {
      const icon = L.divIcon({
        className: '',
        html: `<div class="marker-pin" style="${mk.tone === 'muted' ? 'background:var(--accent-2)' : ''}"><span>${escapeHtml(mk.badge ?? '')}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -28],
      });
      const marker = L.marker([mk.point.lat, mk.point.lng], { icon, title: mk.label, keyboard: true, alt: mk.label }).addTo(g);
      const popup = document.createElement('div');
      popup.innerHTML = `<strong>${escapeHtml(mk.label)}</strong>${mk.sub ? `<div style="color:var(--text-2);font-size:13px;margin-top:2px">${escapeHtml(mk.sub)}</div>` : ''}`;
      if (mk.onClick) {
        const b = document.createElement('button');
        b.className = 'btn sm secondary';
        b.style.marginTop = '8px';
        b.textContent = 'Ver detalles';
        b.onclick = () => mk.onClick!();
        popup.appendChild(b);
      }
      marker.bindPopup(popup);
      pts.push([mk.point.lat, mk.point.lng]);
    }
    // Sin animación: evita errores de Leaflet si el mapa se desmonta a mitad de un encuadre.
    if (pts.length === 1) m.setView(pts[0], 14, { animate: false });
    else if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 15, animate: false });
    else if (fallbackCenter) m.setView([fallbackCenter.lat, fallbackCenter.lng], 11, { animate: false });
    else m.setView([40.2, -3.7], 5, { animate: false });
    const id = setTimeout(() => {
      if (map.current === m) m.invalidateSize({ animate: false });
    }, 50);
    return () => clearTimeout(id);
  }, [markers, route, fallbackCenter, online]);

  if (!online || tilesFailed) {
    return (
      <div className="map-wrap map-offline stack-sm">
        <div className="notice warn small" style={{ margin: 0 }}>
          {online ? 'No se pudo cargar la cartografía.' : 'Sin conexión: el mapa base no está disponible.'} Se muestran tus lugares guardados en un plano local con sus coordenadas.
        </div>
        <OfflinePlot markers={markers} route={route} />
      </div>
    );
  }
  return (
    <div className="map-wrap">
      <div ref={el} className={`map ${className ?? ''}`} role="application" aria-label="Mapa" />
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
