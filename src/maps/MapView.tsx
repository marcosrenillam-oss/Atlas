import { lazy, Suspense, useEffect, useState } from 'react';
import { useOnline } from '../app/hooks';
import type { GeoPoint, PlaceCategory } from '../domain/types';
import type { Tone } from '../ui/tones';
import { OfflinePlot } from './OfflinePlot';
import { MAP_STYLE } from './provider';

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
  /** Guardar un bar, tienda, museo… del mapa en «Mis lugares». */
  onSavePoi?: (poi: { name: string; category: PlaceCategory; point: GeoPoint }) => void;
  fallbackCenter?: GeoPoint;
  /** Zoom con un solo marcador (calle ≈ 14, país ≈ 4). */
  singleZoom?: number;
}

const VectorMap = lazy(() => import('./VectorMap'));

/** ¿Está guardado el estilo del mapa en el Service Worker? (entonces funciona sin conexión) */
function useCachedStyle(online: boolean): boolean | null {
  const [cached, setCached] = useState<boolean | null>(online ? true : null);
  useEffect(() => {
    if (online) return setCached(true);
    let alive = true;
    if (!('caches' in window)) {
      setCached(false);
      return;
    }
    void caches.match(MAP_STYLE).then((r) => alive && setCached(!!r), () => alive && setCached(false));
    return () => {
      alive = false;
    };
  }, [online]);
  return cached;
}

/**
 * Mapa vectorial (MapLibre + OpenFreeMap). Las zonas vistas con conexión quedan guardadas y se ven
 * igual sin ella. Si no hay nada guardado, no hay WebGL o la cartografía no carga, muestra el plano
 * local con los lugares guardados.
 */
export function MapView(props: MapViewProps) {
  const online = useOnline();
  const cached = useCachedStyle(online);
  const [failed, setFailed] = useState(false);
  if (cached === null) return <div className="map-wrap"><div className={`map ${props.className ?? ''} map-loading`} /></div>;
  if (failed || !cached) {
    return (
      <div className="map-wrap map-offline stack-sm">
        <div className="notice warn small" style={{ margin: 0 }}>
          {online ? 'No se pudo cargar la cartografía.' : 'Sin conexión y sin mapa guardado de esta zona.'} Se muestran tus lugares guardados en un plano local con sus coordenadas.
        </div>
        <OfflinePlot markers={props.markers} route={props.route} />
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="map-wrap"><div className={`map ${props.className ?? ''} map-loading`} /></div>}>
      {!online && <div className="map-offline-note small">Sin conexión · se ven las zonas que ya abriste</div>}
      <VectorMap {...props} onFail={() => setFailed(true)} />
    </Suspense>
  );
}
