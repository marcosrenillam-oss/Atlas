import type { GeoPoint } from '../domain/types';
import type { MapMarker } from './MapView';
import { distanceKm } from './external';

/**
 * Plano local sin cartografía: proyecta los puntos guardados (equirectangular corregida por latitud)
 * para ver su disposición relativa y distancias aproximadas. No es un mapa ni calcula rutas.
 */
export function OfflinePlot({ markers, route }: { markers: MapMarker[]; route?: GeoPoint[] }) {
  if (!markers.length) return <p className="small muted center" style={{ padding: 20 }}>No hay lugares con coordenadas guardadas.</p>;
  const W = 340, H = 300, pad = 34;
  const lat0 = markers.reduce((a, m) => a + m.point.lat, 0) / markers.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = markers.map((m) => m.point.lng * k);
  const ys = markers.map((m) => m.point.lat);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY, 1e-4);
  const s = Math.min((W - pad * 2) / span, (H - pad * 2) / span);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const P = (p: GeoPoint) => ({ x: W / 2 + (p.lng * k - cx) * s, y: H / 2 - (p.lat - cy) * s });
  // Escala aproximada: distancia real de la diagonal del encuadre.
  const diagKm = distanceKm({ lat: minY, lng: minX / k }, { lat: maxY, lng: maxX / k });
  const scaleKm = niceKm(diagKm / 4 || 0.1);
  const scalePx = diagKm ? (scaleKm / diagKm) * Math.hypot((maxX - minX) * s, (maxY - minY) * s) : 0;
  return (
    <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Plano local con ${markers.length} lugares`}>
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--line)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {route && route.length > 1 && (
        <polyline points={route.map((p) => { const q = P(p); return `${q.x},${q.y}`; }).join(' ')} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeDasharray="5 5" />
      )}
      {markers.map((m) => {
        const q = P(m.point);
        return (
          <g key={m.id} transform={`translate(${q.x},${q.y})`} onClick={m.onClick} style={{ cursor: m.onClick ? 'pointer' : undefined }}>
            <circle r="11" fill={m.tone === 'muted' ? 'var(--accent-2)' : 'var(--accent)'} stroke="var(--card)" strokeWidth="2" />
            <text y="3.5" textAnchor="middle" style={{ fill: 'var(--accent-ink)', fontSize: 10, fontWeight: 700 }}>{m.badge ?? ''}</text>
            <text y="24" textAnchor="middle">{m.label.length > 20 ? m.label.slice(0, 19) + '…' : m.label}</text>
          </g>
        );
      })}
      {diagKm > 0 && scalePx > 0 && (
        <g transform={`translate(14,${H - 14})`}>
          <line x1="0" x2={scalePx} y1="0" y2="0" stroke="var(--text-2)" strokeWidth="2" />
          <text x={scalePx + 6} y="4">{scaleKm >= 1 ? `${scaleKm} km` : `${Math.round(scaleKm * 1000)} m`}</text>
        </g>
      )}
      <text x={W - 10} y="16" textAnchor="end">N ↑</text>
    </svg>
  );
}

function niceKm(x: number): number {
  const steps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  return steps.reduce((best, s) => (Math.abs(s - x) < Math.abs(best - x) ? s : best), steps[0]);
}
