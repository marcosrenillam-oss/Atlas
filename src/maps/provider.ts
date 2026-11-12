/**
 * Proveedor de mapas (independiente del motor). OpenFreeMap: mapas vectoriales de OpenStreetMap,
 * gratuitos, sin clave ni registro, con atribución obligatoria (MapLibre la muestra sola).
 * Estilo «Liberty»: con color y con puntos de interés (bares, cafeterías, tiendas…) al acercarse.
 * En modo oscuro se repinta el mismo estilo para conservar color y comercios.
 */
export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
export const isDarkTheme = () => document.documentElement.dataset.theme === 'dark';
