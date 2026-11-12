/**
 * Proveedor de mapas (independiente del motor). OpenFreeMap: mapas vectoriales de OpenStreetMap,
 * gratuitos, sin clave ni registro, con atribución obligatoria (MapLibre la muestra sola).
 * https://openfreemap.org — Para cambiar de proveedor basta con cambiar estas URLs de estilo.
 * No se descargan zonas para uso offline: sin conexión se usa el plano local de lugares guardados.
 */
export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export const styleForTheme = () => (document.documentElement.dataset.theme === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light);
