import * as THREE from 'three';

/**
 * Monumentos low-poly construidos con primitivas (sin modelos externos ni IA).
 * Cada constructor devuelve un grupo con la base en y = 0 y una huella de ~3 unidades.
 * Las piezas con `userData.glow` se iluminan de noche.
 */

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: string, opts: { emissive?: string; metal?: number; rough?: number; glow?: boolean } = {}) {
  const key = `${color}|${opts.emissive ?? ''}|${opts.metal ?? 0}|${opts.rough ?? 0.85}|${opts.glow ? 1 : 0}`;
  let m = mats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color, flatShading: true, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color('#000000'), emissiveIntensity: 0,
    });
    if (opts.glow) m.userData.glow = true;
    mats.set(key, m);
  }
  return m;
}
export function allMaterials() {
  return [...mats.values()];
}

export function add(g: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}
/** Caja con la base apoyada en y. */
export const box = (g: THREE.Object3D, w: number, h: number, d: number, c: THREE.Material, x = 0, y = 0, z = 0) => add(g, new THREE.BoxGeometry(w, h, d), c, x, y + h / 2, z);
export const cyl = (g: THREE.Object3D, rt: number, rb: number, h: number, seg: number, c: THREE.Material, x = 0, y = 0, z = 0) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z);
export const cone = (g: THREE.Object3D, r: number, h: number, seg: number, c: THREE.Material, x = 0, y = 0, z = 0) => add(g, new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z);
export const ball = (g: THREE.Object3D, r: number, c: THREE.Material, x = 0, y = 0, z = 0, sy = 1, seg = 10) => {
  const m = add(g, new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), c, x, y, z);
  m.scale.y = sy;
  return m;
};
/** Pirámide de base cuadrada alineada con los ejes. */
export const pyramid = (g: THREE.Object3D, r: number, h: number, c: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = cone(g, r, h, 4, c, x, y, z);
  m.rotation.y = Math.PI / 4;
  return m;
};
/** Prisma triangular (frontón) de anchura w a lo largo de x. */
export const pediment = (g: THREE.Object3D, w: number, h: number, d: number, c: THREE.Material, x = 0, y = 0, z = 0) => {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(d / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  const m = add(g, geo, c, x, y, z);
  m.rotation.y = Math.PI / 2;
  return m;
};
/** Cúpula bulbosa (cebolla) con remate. */
export const onion = (g: THREE.Object3D, r: number, c: THREE.Material, x: number, y: number, z: number, tip?: THREE.Material) => {
  ball(g, r, c, x, y + r * 0.9, z, 1.25, 8);
  cone(g, r * 0.45, r * 1.1, 8, c, x, y + r * 1.8, z);
  if (tip) ball(g, r * 0.12, tip, x, y + r * 3.0, z, 1, 6);
};

export const GOLD = () => mat('#e8b54a', { metal: 0.5, rough: 0.4 });

// ───────────────────────────── Monumentos ─────────────────────────────

function eiffel() {
  const g = new THREE.Group();
  const iron = mat('#8a6a50');
  const dark = mat('#6e533e');
  const t = 0.24;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(g, 0.32, 1.85, 0.32, iron, sx * 0.78, -0.02, sz * 0.78);
    leg.rotation.z = sx * t;
    leg.rotation.x = -sz * t;
  }
  // arcos entre patas
  for (const [rx, rz, ry] of [[0, 0.9, 0], [0.9, 0, Math.PI / 2]] as const) {
    const arc = add(g, new THREE.TorusGeometry(0.62, 0.06, 4, 10, Math.PI), dark, rx, 0.55, rz);
    arc.rotation.y = ry;
  }
  box(g, 1.9, 0.16, 1.9, dark, 0, 1.62);
  cyl(g, 0.34, 0.66, 1.95, 4, iron, 0, 1.78).rotation.y = Math.PI / 4;
  box(g, 1.0, 0.13, 1.0, dark, 0, 3.7);
  cyl(g, 0.06, 0.3, 2.9, 4, iron, 0, 3.83).rotation.y = Math.PI / 4;
  box(g, 0.32, 0.18, 0.32, dark, 0, 6.6);
  cyl(g, 0.025, 0.04, 0.6, 5, dark, 0, 6.78);
  ball(g, 0.07, mat('#ffd36b', { emissive: '#ffcc55', glow: true }), 0, 7.42, 0, 1, 6);
  return g;
}

function bigBen() {
  const g = new THREE.Group();
  const stone = mat('#cfae74');
  const stone2 = mat('#b8975e');
  const slate = mat('#3b4a5c');
  box(g, 0.95, 3.4, 0.95, stone, 0, 0);
  for (const [x, z] of [[-0.48, -0.48], [0.48, -0.48], [-0.48, 0.48], [0.48, 0.48]]) box(g, 0.12, 3.5, 0.12, stone2, x, 0, z);
  box(g, 1.12, 0.95, 1.12, stone, 0, 3.4);
  const face = mat('#fbf6e8', { emissive: '#ffe9a8', glow: true });
  for (const [x, z, ry] of [[0, 0.57, 0], [0.57, 0, Math.PI / 2], [0, -0.57, 0], [-0.57, 0, Math.PI / 2]] as const) {
    const disc = add(g, new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16), face, x, 3.88, z);
    disc.rotation.x = Math.PI / 2;
    disc.rotation.z = ry;
    const hand = box(g, 0.03, 0.26, 0.02, slate, x * 1.04, 3.85, z * 1.04);
    hand.rotation.y = ry;
  }
  box(g, 0.9, 0.55, 0.9, stone2, 0, 4.35);
  pyramid(g, 0.78, 1.5, slate, 0, 4.9);
  cyl(g, 0.02, 0.04, 0.45, 5, GOLD(), 0, 6.35);
  // Parlamento
  box(g, 3.0, 1.05, 0.9, stone, 1.9, 0, 0.1);
  for (let i = 0; i < 6; i++) cone(g, 0.08, 0.35, 4, stone2, 0.65 + i * 0.5, 1.05, 0.5);
  box(g, 0.6, 1.6, 0.6, stone2, 3.3, 0, 0.1);
  pyramid(g, 0.45, 0.6, slate, 3.3, 1.6, 0.1);
  return g;
}

function sagrada() {
  const g = new THREE.Group();
  const s1 = mat('#d6b68b');
  const s2 = mat('#c49e70');
  box(g, 2.6, 1.3, 1.5, s2, 0, 0);
  box(g, 1.3, 0.7, 1.55, s1, 0, 1.3);
  const tips = ['#e9b949', '#d9584a', '#5aa36f', '#e9b949'];
  const spires: [number, number, number][] = [[-1.05, 3.7, 0.55], [-0.4, 4.3, 0.6], [0.4, 4.3, 0.6], [1.05, 3.7, 0.55]];
  spires.forEach(([x, h, z], i) => {
    cyl(g, 0.17, 0.27, h, 8, s1, x, 0, z);
    cone(g, 0.18, 0.9, 8, s2, x, h, z);
    ball(g, 0.12, mat(tips[i]), x, h + 0.95, z, 1, 6);
  });
  // torres traseras y torre central (Jesucristo) con estrella
  for (const [x, h] of [[-0.75, 3.2], [0.75, 3.2]] as const) {
    cyl(g, 0.16, 0.24, h, 8, s2, x, 0, -0.5);
    cone(g, 0.17, 0.7, 8, s1, x, h, -0.5);
  }
  cyl(g, 0.22, 0.38, 5.0, 8, s1, 0, 0, -0.25);
  cone(g, 0.24, 1.1, 8, s2, 0, 5.0, -0.25);
  ball(g, 0.16, mat('#ffffff', { emissive: '#ffffff', glow: true }), 0, 6.25, -0.25, 1, 6);
  // grúa de obra (sigue en construcción)
  box(g, 0.08, 4.6, 0.08, mat('#e0a33a'), 1.45, 0, -0.75);
  box(g, 1.6, 0.08, 0.08, mat('#e0a33a'), 1.0, 4.6, -0.75);
  return g;
}

function coliseo() {
  const g = new THREE.Group();
  const trav = mat('#e2c79c');
  const arch = mat('#9c7a4e');
  const sand = mat('#e8d6ae');
  const n = 22;
  const rx = 1.75, rz = 1.35;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ruined = a > Math.PI * 0.95 && a < Math.PI * 1.55;
    const h = ruined ? 0.95 - Math.sin((a - Math.PI) * 5) * 0.2 : 1.35;
    const x = Math.cos(a) * rx, z = Math.sin(a) * rz;
    const seg = box(g, 0.52, h, 0.22, trav, x, 0, z);
    seg.rotation.y = -a + Math.PI / 2;
    for (const yy of [0.18, 0.62]) {
      if (yy + 0.3 > h) continue;
      const ar = box(g, 0.24, 0.3, 0.05, arch, x * 1.07, yy, z * 1.07);
      ar.rotation.y = -a + Math.PI / 2;
    }
  }
  const floor = add(g, new THREE.CylinderGeometry(1, 1, 0.08, 20), sand, 0, 0.04, 0);
  floor.scale.set(rx * 0.85, 1, rz * 0.85);
  const inner = add(g, new THREE.CylinderGeometry(1, 1, 0.5, 20, 1, true), trav, 0, 0.25, 0);
  inner.scale.set(rx * 0.6, 1, rz * 0.6);
  (inner.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  return g;
}

function belem() {
  const g = new THREE.Group();
  const white = mat('#f1e9da');
  const shade = mat('#d7cbb4');
  const water = mat('#5fc8d8', { rough: 0.3 });
  add(g, new THREE.CylinderGeometry(1.9, 1.9, 0.06, 18), water, 0, 0.03, 0.5);
  box(g, 1.9, 0.85, 1.4, white, 0, 0, 0.55);
  for (let i = 0; i < 6; i++) box(g, 0.14, 0.18, 0.14, shade, -0.8 + i * 0.32, 0.85, 1.22);
  box(g, 1.0, 2.7, 1.0, white, 0, 0, -0.35);
  box(g, 1.1, 0.25, 1.1, shade, 0, 2.7, -0.35);
  for (let i = 0; i < 4; i++) box(g, 0.14, 0.2, 0.14, white, -0.38 + i * 0.26, 2.95, 0.17);
  box(g, 0.55, 0.45, 0.55, white, 0, 2.95, -0.35);
  for (const [x, y, z] of [[-0.95, 0.85, 1.25], [0.95, 0.85, 1.25], [-0.55, 2.95, 0.15], [0.55, 2.95, 0.15]] as const) {
    cyl(g, 0.12, 0.12, 0.35, 8, white, x, y, z);
    ball(g, 0.13, shade, x, y + 0.42, z, 1.2, 8);
  }
  // ventanales con balcón
  box(g, 0.3, 0.42, 0.04, mat('#6b8aa0'), 0, 1.5, 0.16);
  return g;
}

function partenon() {
  const g = new THREE.Group();
  const marble = mat('#efe8da');
  const m2 = mat('#ddd3c0');
  box(g, 3.0, 0.14, 1.9, m2, 0, 0);
  box(g, 2.8, 0.14, 1.7, marble, 0, 0.14);
  box(g, 2.6, 0.12, 1.5, m2, 0, 0.28);
  const cols = (x: number, z: number) => cyl(g, 0.085, 0.1, 1.05, 8, marble, x, 0.4, z);
  for (let i = 0; i < 8; i++) {
    const x = -1.15 + i * (2.3 / 7);
    cols(x, 0.62);
    if (i !== 3 && i !== 4) cols(x, -0.62);
  }
  for (const z of [-0.3, 0, 0.3]) {
    cols(-1.15, z);
    cols(1.15, z);
  }
  box(g, 2.55, 0.22, 1.45, m2, 0, 1.45);
  pediment(g, 1.45, 0.4, 2.55, marble, 0, 1.67, 0);
  // columna caída
  const fallen = cyl(g, 0.09, 0.09, 0.5, 8, m2, 1.55, 0.05, 1.1);
  fallen.rotation.z = Math.PI / 2;
  return g;
}

function brandenburgo() {
  const g = new THREE.Group();
  const sand = mat('#dcc59f');
  const sand2 = mat('#c6ac80');
  const patina = mat('#5f9a85');
  box(g, 3.0, 0.15, 1.1, sand2, 0, 0);
  for (let i = 0; i < 6; i++) {
    const x = -1.25 + i * 0.5;
    cyl(g, 0.09, 0.1, 1.55, 10, sand, x, 0.15, 0.32);
    cyl(g, 0.09, 0.1, 1.55, 10, sand, x, 0.15, -0.32);
  }
  box(g, 3.0, 0.42, 1.0, sand2, 0, 1.7);
  box(g, 1.1, 0.25, 0.6, sand, 0, 2.12);
  // cuadriga
  for (let i = 0; i < 4; i++) {
    box(g, 0.08, 0.16, 0.28, patina, -0.27 + i * 0.18, 2.37, 0.05);
    box(g, 0.06, 0.12, 0.08, patina, -0.27 + i * 0.18, 2.5, 0.2);
  }
  box(g, 0.3, 0.22, 0.2, patina, 0, 2.37, -0.18);
  cyl(g, 0.02, 0.02, 0.45, 5, patina, 0, 2.55, -0.18);
  // alas laterales
  box(g, 0.6, 1.0, 0.8, sand2, -1.85, 0);
  box(g, 0.6, 1.0, 0.8, sand2, 1.85, 0);
  return g;
}

function basilio() {
  const g = new THREE.Group();
  const brick = mat('#b9523d');
  const trim = mat('#efe5d4');
  box(g, 2.6, 0.5, 2.6, brick, 0, 0);
  cyl(g, 0.45, 0.5, 2.3, 8, brick, 0, 0.5);
  cyl(g, 0.5, 0.5, 0.08, 8, trim, 0, 1.6);
  cone(g, 0.48, 1.6, 8, mat('#d9b25a'), 0, 2.8);
  onion(g, 0.13, GOLD(), 0, 4.35, 0);
  const domes: [number, number, string, string][] = [[-0.95, 0.95, '#2f9e6e', '#f3e7c9'], [0.95, 0.95, '#d9473a', '#f3e7c9'], [0.95, -0.95, '#3a7bd5', '#f2c64b'], [-0.95, -0.95, '#f2b84b', '#2f9e6e']];
  domes.forEach(([x, z, c], i) => {
    const h = 1.4 + (i % 2) * 0.35;
    cyl(g, 0.3, 0.34, h, 8, brick, x, 0.5, z);
    cyl(g, 0.35, 0.35, 0.07, 8, trim, x, 0.5 + h - 0.15, z);
    onion(g, 0.38, mat(c), x, 0.5 + h, z, GOLD());
  });
  for (const [x, z, c] of [[0, 1.2, '#7a4fbf'], [1.2, 0, '#2f9e6e'], [0, -1.2, '#d9473a'], [-1.2, 0, '#3a7bd5']] as const) {
    cyl(g, 0.22, 0.24, 1.0, 8, brick, x, 0.5, z);
    onion(g, 0.25, mat(c), x, 1.5, z, GOLD());
  }
  return g;
}

function piramides() {
  const g = new THREE.Group();
  const s1 = mat('#e2c07a');
  const s2 = mat('#d4ad62');
  pyramid(g, 1.75, 2.5, s1, -0.4, 0, -0.3);
  pyramid(g, 0.32, 0.42, mat('#f1dfb0'), -0.4, 2.08, -0.3);
  pyramid(g, 1.3, 1.9, s2, 1.35, 0, 0.75);
  pyramid(g, 0.8, 1.15, s1, 2.25, 0, -0.9);
  // esfinge
  const sph = mat('#cfa865');
  box(g, 0.75, 0.22, 0.26, sph, -1.65, 0, 1.45);
  box(g, 0.24, 0.32, 0.26, sph, -1.35, 0.1, 1.45);
  box(g, 0.3, 0.06, 0.08, sph, -1.15, 0, 1.45);
  return g;
}

function burj() {
  const g = new THREE.Group();
  const glass = mat('#b7d3e8', { metal: 0.45, rough: 0.25, emissive: '#bfe3ff', glow: true });
  const steel = mat('#8ea8bd', { metal: 0.5, rough: 0.3 });
  box(g, 1.8, 0.18, 1.8, mat('#d9cdb6'), 0, 0);
  let y = 0.18;
  const tiers: [number, number][] = [[0.62, 1.6], [0.52, 1.5], [0.43, 1.4], [0.34, 1.3], [0.26, 1.2], [0.19, 1.0], [0.13, 0.8]];
  tiers.forEach(([r, h], i) => {
    cyl(g, r * 0.92, r, h, 6, glass, 0, y);
    cyl(g, r * 0.5, r * 0.6, h * 0.9, 6, steel, r * 0.85 * Math.cos(i * 2.1), y, r * 0.85 * Math.sin(i * 2.1));
    y += h;
  });
  cyl(g, 0.02, 0.07, 1.6, 6, steel, 0, y);
  // fuente de Dubái
  add(g, new THREE.CylinderGeometry(1.2, 1.2, 0.05, 18), mat('#5fc8d8', { rough: 0.3 }), 1.4, 0.2, 1.4).scale.set(1, 1, 0.5);
  return g;
}

function taj() {
  const g = new THREE.Group();
  const white = mat('#f5f1e8');
  const w2 = mat('#e5ddcd');
  const dark = mat('#7d6a5a');
  box(g, 3.1, 0.25, 3.1, w2, 0, 0);
  cyl(g, 0.95, 0.95, 1.15, 8, white, 0, 0.25).rotation.y = Math.PI / 8;
  box(g, 0.55, 0.85, 0.06, dark, 0, 0.35, 0.92);
  cyl(g, 0.48, 0.5, 0.35, 12, white, 0, 1.4);
  ball(g, 0.6, white, 0, 2.15, 0, 1.15, 12);
  cone(g, 0.16, 0.6, 10, white, 0, 2.75);
  cyl(g, 0.015, 0.02, 0.35, 5, GOLD(), 0, 3.3);
  for (const [x, z] of [[-0.62, 0.62], [0.62, 0.62], [-0.62, -0.62], [0.62, -0.62]] as const) {
    cyl(g, 0.16, 0.16, 0.22, 8, white, x, 1.4, z);
    ball(g, 0.17, white, x, 1.72, z, 1.1, 8);
  }
  for (const [x, z] of [[-1.4, 1.4], [1.4, 1.4], [-1.4, -1.4], [1.4, -1.4]] as const) {
    cyl(g, 0.08, 0.1, 2.1, 8, white, x, 0.25, z);
    cyl(g, 0.13, 0.13, 0.05, 8, w2, x, 1.2, z);
    ball(g, 0.11, white, x, 2.45, z, 1.1, 8);
  }
  // estanque reflectante
  box(g, 0.3, 0.03, 0.5, mat('#5fc8d8', { rough: 0.2 }), 0, 0.25, 1.3);
  return g;
}

function muralla() {
  const g = new THREE.Group();
  const wall = mat('#a8967b');
  const top = mat('#8f7d63');
  const hill = mat('#6fae6a');
  for (const [x, z, r, h] of [[-1.2, 0.2, 1.4, 1.2], [0.8, -0.4, 1.6, 1.7], [2.4, 0.5, 1.2, 1.0]] as const) {
    const m = ball(g, 1, hill, x, 0, z, 1, 8);
    m.scale.set(r, h, r);
  }
  const pts: [number, number, number][] = [[-2.6, 0.2, 0.9], [-1.6, 1.2, 0.3], [-0.6, 0.8, -0.2], [0.6, 1.75, -0.6], [1.6, 1.1, 0], [2.6, 1.05, 0.6], [3.4, 0.3, 1.1]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1, z1] = pts[i], [x2, y2, z2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, 0.32), wall);
    seg.position.set((x1 + x2) / 2, (y1 + y2) / 2 + 0.16, (z1 + z2) / 2);
    seg.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    seg.rotation.z = Math.atan2(y2 - y1, Math.hypot(x2 - x1, z2 - z1));
    seg.castShadow = seg.receiveShadow = true;
    g.add(seg);
    const n = Math.floor(len / 0.22);
    for (let k = 0; k < n; k += 2) {
      const t = (k + 0.5) / n;
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.34), top);
      c.position.set(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + 0.37, z1 + (z2 - z1) * t);
      c.rotation.y = seg.rotation.y;
      g.add(c);
    }
  }
  for (const i of [1, 3, 5]) {
    const [x, y, z] = pts[i];
    box(g, 0.55, 0.65, 0.55, wall, x, y - 0.05, z);
    pyramid(g, 0.45, 0.3, mat('#5a4a3a'), x, y + 0.6, z);
  }
  return g;
}

function torii() {
  const g = new THREE.Group();
  const red = mat('#d9483b');
  const black = mat('#2b2b2b');
  const water = mat('#4fb8d6', { rough: 0.25 });
  add(g, new THREE.CylinderGeometry(2.0, 2.0, 0.06, 20), water, 0, 0.04, 0.4);
  // monte Fuji detrás
  cone(g, 2.0, 2.6, 7, mat('#7d93bf'), 0.4, 0, -1.6);
  cone(g, 0.72, 0.95, 7, mat('#f7f8fb'), 0.4, 1.66, -1.6);
  for (const x of [-0.75, 0.75]) {
    cyl(g, 0.11, 0.13, 2.1, 10, red, x, 0, 0.6);
    cyl(g, 0.06, 0.07, 1.3, 8, red, x, 0, 1.0);
    cyl(g, 0.06, 0.07, 1.3, 8, red, x, 0, 0.2);
  }
  box(g, 2.0, 0.14, 0.14, red, 0, 1.5, 0.6);
  box(g, 2.6, 0.16, 0.26, red, 0, 1.92, 0.6);
  const k1 = box(g, 1.5, 0.12, 0.3, black, -0.62, 2.06, 0.6);
  k1.rotation.z = -0.08;
  const k2 = box(g, 1.5, 0.12, 0.3, black, 0.62, 2.06, 0.6);
  k2.rotation.z = 0.08;
  box(g, 0.14, 0.42, 0.1, red, 0, 1.55, 0.6);
  // linterna de piedra
  box(g, 0.18, 0.5, 0.18, mat('#a7a39a'), 1.6, 0, 1.6);
  box(g, 0.3, 0.06, 0.3, mat('#a7a39a'), 1.6, 0.5, 1.6);
  box(g, 0.14, 0.14, 0.14, mat('#ffd36b', { emissive: '#ffcc55', glow: true }), 1.6, 0.56, 1.6);
  return g;
}

function liberty() {
  const g = new THREE.Group();
  const granite = mat('#bdb5a6');
  const g2 = mat('#a69d8c');
  const copper = mat('#6fb59a');
  const c2 = mat('#5a9c83');
  // fuerte en estrella
  for (const r of [0, Math.PI / 4]) box(g, 2.2, 0.35, 2.2, g2, 0, 0).rotation.y = r;
  box(g, 1.05, 1.5, 1.05, granite, 0, 0.35);
  box(g, 1.2, 0.12, 1.2, g2, 0, 1.85);
  box(g, 0.75, 0.22, 0.75, granite, 0, 1.97);
  // estatua
  cyl(g, 0.24, 0.42, 1.75, 9, copper, 0, 2.19);
  cyl(g, 0.16, 0.24, 0.35, 9, c2, 0, 3.94);
  ball(g, 0.17, copper, 0, 4.45, 0, 1.05, 8);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.6 + (i / 6) * Math.PI * 1.2;
    const s = cone(g, 0.035, 0.24, 4, c2, Math.sin(a) * 0.17, 4.5, Math.cos(a) * 0.17);
    s.rotation.set(Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9);
  }
  const arm = cyl(g, 0.06, 0.08, 0.95, 6, copper, 0.24, 4.0, 0);
  arm.rotation.z = -0.25;
  cyl(g, 0.07, 0.05, 0.22, 6, GOLD(), 0.36, 4.88, 0);
  cone(g, 0.09, 0.28, 6, mat('#ffb347', { emissive: '#ff9a2e', glow: true }), 0.36, 5.08, 0);
  const tab = box(g, 0.22, 0.32, 0.07, c2, -0.3, 3.35, 0.12);
  tab.rotation.z = 0.25;
  return g;
}

function cristo() {
  const g = new THREE.Group();
  const rock = mat('#7c8f6c');
  const green = mat('#4f8f5a');
  const stone = mat('#ebe7df');
  const m = cone(g, 2.0, 3.0, 7, green, 0, 0);
  m.rotation.y = 0.3;
  cone(g, 0.9, 1.25, 6, rock, 0.15, 1.95, 0.1);
  box(g, 0.35, 0.35, 0.35, mat('#cfc9bc'), 0.15, 3.05, 0.1);
  cyl(g, 0.13, 0.22, 1.1, 8, stone, 0.15, 3.4, 0.1);
  box(g, 1.25, 0.13, 0.13, stone, 0.15, 4.25, 0.1);
  ball(g, 0.11, stone, 0.15, 4.62, 0.1, 1.1, 8);
  return g;
}

function machu() {
  const g = new THREE.Group();
  const green = mat('#79b86a');
  const dark = mat('#3e7c55');
  const stone = mat('#a39b8b');
  const thatch = mat('#b88d4f');
  cone(g, 1.25, 3.3, 6, dark, -0.9, 0, -1.2);
  cone(g, 0.9, 2.2, 6, mat('#4f8f5f'), 0.9, 0, -1.5);
  for (let i = 0; i < 4; i++) box(g, 2.9 - i * 0.5, 0.25, 2.4 - i * 0.4, green, 0.2, i * 0.25, 0.4 - i * 0.12);
  const houses: [number, number, number][] = [[-0.6, 1.0, 0.0], [0.2, 1.0, -0.1], [0.9, 0.75, 0.6], [-0.2, 0.75, 0.75], [0.7, 1.0, -0.4]];
  houses.forEach(([x, y, z], i) => {
    box(g, 0.34, 0.26, 0.3, stone, x, y, z);
    if (i % 2 === 0) pyramid(g, 0.3, 0.25, thatch, x, y + 0.26, z);
  });
  // llama
  const l = mat('#f3ede1');
  box(g, 0.22, 0.12, 0.1, l, 1.25, 0.25, 1.2);
  box(g, 0.05, 0.2, 0.06, l, 1.35, 0.32, 1.2);
  return g;
}

function chichen() {
  const g = new THREE.Group();
  const s1 = mat('#cdb88f');
  const s2 = mat('#b79f73');
  const tiers = 5;
  for (let i = 0; i < tiers; i++) {
    const w = 2.7 - i * 0.42;
    box(g, w, 0.34, w, i % 2 ? s2 : s1, 0, i * 0.34);
  }
  // escalinatas en dos caras visibles
  for (const [rx, rz, ry] of [[0, 1, 0], [1, 0, Math.PI / 2]] as const) {
    const st = box(g, 0.55, 2.1, 0.22, s2, rx * 1.0, -0.15, rz * 1.0);
    st.rotation.y = ry;
    st.rotation.x = ry === 0 ? -0.6 : 0;
    st.rotation.z = ry === 0 ? 0 : 0.6;
  }
  box(g, 0.75, 0.55, 0.75, s1, 0, 1.7);
  box(g, 0.2, 0.32, 0.04, mat('#4a3b2a'), 0, 1.72, 0.38);
  box(g, 0.85, 0.08, 0.85, s2, 0, 2.25);
  // serpiente Kukulkán (cabeza)
  box(g, 0.2, 0.16, 0.24, mat('#8a7a5a'), 0.22, 0, 1.45);
  return g;
}

function opera() {
  const g = new THREE.Group();
  const base = mat('#d8cbb6');
  const shell = mat('#f8f6f0', { rough: 0.5 });
  const shell2 = mat('#e9e4d8', { rough: 0.5 });
  add(g, new THREE.CylinderGeometry(2.2, 2.2, 0.06, 20), mat('#4fb8d6', { rough: 0.25 }), 0, 0.03, 0.4);
  box(g, 2.6, 0.3, 1.5, base, 0, 0);
  const sail = (x: number, z: number, s: number, ry: number, m: THREE.Material) => {
    const geo = new THREE.SphereGeometry(1, 10, 8, 0, Math.PI, 0, Math.PI / 2);
    const mesh = add(g, geo, m, x, 0.3, z);
    mesh.scale.set(0.45 * s, 1.45 * s, 0.75 * s);
    mesh.rotation.y = ry;
    (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    return mesh;
  };
  sail(-0.9, 0.2, 0.75, Math.PI / 2 + 0.2, shell);
  sail(-0.4, 0.2, 0.95, Math.PI / 2 + 0.2, shell2);
  sail(0.15, 0.2, 1.1, Math.PI / 2 + 0.2, shell);
  sail(0.7, -0.3, 0.7, Math.PI / 2 - 0.3, shell2);
  sail(1.1, -0.3, 0.85, Math.PI / 2 - 0.3, shell);
  sail(-1.35, 0.3, 0.5, Math.PI / 2 + 0.2, shell2);
  return g;
}

export const BUILDERS: Record<string, () => THREE.Group> = {
  eiffel, bigben: bigBen, sagrada, coliseo, belem, partenon, brandenburgo, basilio, piramides, burj, taj, muralla, torii, liberty, cristo, machu, chichen, opera,
};
