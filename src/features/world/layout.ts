/**
 * Reparto del mapamundi: proyecta latitud/longitud en un plano y separa los monumentos
 * que quedarían demasiado juntos (Europa, el Caribe…) con una relajación por empujes.
 * Es determinista: siempre da el mismo mundo.
 */
export const MIN_GAP = 5;

/** Lugares muy alejados de su continente que se acercan para que el mapa sea compacto. */
const NUDGE: Record<string, [number, number]> = { moais: [-27, -84], galapagos: [-1, -86] };

export function project(lat: number, lon: number): [number, number] {
  let x = lon;
  if (x < -150) x += 360; // Samoa y Tonga, al este de Fiyi
  if (x < -30) x += 10; // acerca un poco América (océano Atlántico más estrecho)
  return [(x - 20) * 0.62, -(lat - 18) * 0.75];
}

export function layoutWorld(items: { id: string; lat: number; lon: number }[], iterations = 320): [number, number][] {
  const orig = items.map((it) => {
    const [lat, lon] = NUDGE[it.id] ?? [it.lat, it.lon];
    return project(lat, lon);
  });
  const p = orig.map(([x, z]) => [x, z]);
  const n = p.length;
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = p[j][0] - p[i][0], dz = p[j][1] - p[i][1];
        let d = Math.hypot(dx, dz);
        if (d >= MIN_GAP) continue;
        if (d < 1e-6) [dx, dz, d] = [0.01 * (i - j), 0.01, 0.0141];
        const push = ((MIN_GAP - d) / 2) * 0.5;
        const ux = dx / d, uz = dz / d;
        p[i][0] -= ux * push; p[i][1] -= uz * push;
        p[j][0] += ux * push; p[j][1] += uz * push;
      }
    }
    // muelle suave hacia la posición geográfica (menos al final, para cerrar huecos)
    const k = it < iterations - 60 ? 0.012 : 0;
    for (let i = 0; i < n; i++) {
      p[i][0] += (orig[i][0] - p[i][0]) * k;
      p[i][1] += (orig[i][1] - p[i][1]) * k;
    }
  }
  return p.map(([x, z]) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100]);
}
