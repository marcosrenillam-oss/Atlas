/**
 * Como en una app nativa, la página no se desplaza: se desplaza el contenedor principal (.shell).
 * Así no aparece la barra de desplazamiento ni el rebote de Safari al llegar arriba o abajo.
 */
export const scroller = (): HTMLElement | null => document.querySelector<HTMLElement>('.shell');

/** Bloquea el zoom del navegador (pellizcar y doble toque). Los mapas y el Mundo 3D usan sus propios gestos. */
export function lockZoom(): void {
  const stop = (e: Event) => e.preventDefault();
  // Gestos propios de Safari (pellizco sobre la página)
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener('gestureend', stop, { passive: false });
  // Por si el navegador ignora user-scalable=no: un pellizco fuera de mapas no amplía la página
  document.addEventListener(
    'touchmove',
    (e) => {
      const t = e as TouchEvent & { scale?: number };
      if (t.scale !== undefined && t.scale !== 1 && !(e.target as HTMLElement)?.closest?.('.map, .world-canvas, .maplibregl-canvas')) e.preventDefault();
    },
    { passive: false },
  );
}
