import { lazy, Suspense, useState } from 'react';
import { useOnline } from '../app/hooks';
import type { GeoPoint } from '../domain/types';
import type { Tone } from '../ui/tones';
import { OfflinePlot } from './OfflinePlot';

export interface MapMarker {
  id: string;
  point: GeoPoint;
  label: string;
  sub?: string;
  badge?: string; // número de orden
  icon?: string; // icono Lucide
  tone?: 'accent' | 'muted' | Tone;
  onClick?: () => void;
}

export interface MapViewProps {
  markers: MapMarker[];
  route?: GeoPoint[];
  className?: string;
  onPick?: (p: GeoPoint) => void;
  fallbackCenter?: GeoPoint;
  /** Zoom con un solo marcador (calle ≈ 14, país ≈ 4). */
  singleZoom?: number;
}

const VectorMap = lazy(() => import('./VectorMap'));

/**
 * Mapa vectorial (MapLibre + OpenFreeMap) con conexión. Sin conexión, sin WebGL o si la
 * cartografía no carga, muestra el plano local con los lugares guardados.
 */
export function MapView(props: MapViewProps) {
  const online = useOnline();
  const [failed, setFailed] = useState(false);
  if (!online || failed) {
    return (
      <div className="map-wrap map-offline stack-sm">
        <div className="notice warn small" style={{ margin: 0 }}>
          {online ? 'No se pudo cargar la cartografía.' : 'Sin conexión: el mapa base no está disponible.'} Se muestran tus lugares guardados en un plano local con sus coordenadas.
        </div>
        <OfflinePlot markers={props.markers} route={props.route} />
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="map-wrap"><div className={`map ${props.className ?? ''} map-loading`} /></div>}>
      <VectorMap {...props} onFail={() => setFailed(true)} />
    </Suspense>
  );
}
