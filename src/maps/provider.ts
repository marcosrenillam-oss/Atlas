/**
 * Configuración de mapas independiente del proveedor. Para cambiar de proveedor basta con añadir
 * una entrada aquí (p. ej. un servidor de teselas propio o un archivo PMTiles autoalojado).
 *
 * OpenStreetMap: uso gratuito sujeto a su política (https://operations.osmfoundation.org/policies/tiles/):
 * atribución visible, sin descarga masiva ni precarga offline. Por eso ATLAS NO guarda teselas en caché
 * del Service Worker; sin conexión se muestra la vista local de lugares guardados.
 */
export interface TileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  darkFilter?: boolean;
}

export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a>',
    maxZoom: 19,
    darkFilter: true,
  },
];

export const DEFAULT_PROVIDER = TILE_PROVIDERS[0];
