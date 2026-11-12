import * as THREE from 'three';
import { GOLD, add, ball, box, cone, cyl, mat, onion, pediment, pyramid } from './monuments';

/**
 * Monumentos «tipo» paramétricos para los 195 países: mezquitas, castillos, volcanes, cascadas,
 * atolones… Cada uno devuelve un grupo con la base en y = 0 y una huella de unas 3 unidades.
 * Reciben el id del monumento para pequeños retoques (color, proporciones).
 */

type G = THREE.Group;
const grp = () => new THREE.Group();

// ── Materiales comunes ──
const WHITE = () => mat('#f4f0e6');
const WATER = () => mat('#4cb8cf', { rough: 0.3 });
const DEEP = () => mat('#1f6fa0', { rough: 0.3 });
const LAGOON = () => mat('#7fe0dc', { rough: 0.3 });
const SAND = () => mat('#efdcab');
const GRASS = () => mat('#8cc56f');
const LEAF = () => mat('#4f9a5a');
const LEAF2 = () => mat('#5fae62');
const TRUNK = () => mat('#8a6a4a');
const DARK = () => mat('#2c3a48');
const ROCK = () => mat('#958c84');
const SNOW = () => mat('#f7fbff');
const GLOWWIN = () => mat('#ffe7a6', { emissive: '#ffcf6b', glow: true });
const FIRE = () => mat('#ff8a3d', { emissive: '#ff6a1a', glow: true });
const MIST = () => mat('#ffffff', { rough: 1 });

/** Disco plano (agua, arena, plaza) apoyado en el suelo. */
const disc = (g: G, r: number, c: THREE.Material, x = 0, z = 0, y = 0, seg = 20) => cyl(g, r, r, 0.06, seg, c, x, y, z);
const tree = (g: G, x: number, z: number, s = 1, y = 0) => {
  cyl(g, 0.05 * s, 0.08 * s, 0.4 * s, 5, TRUNK(), x, y, z);
  ball(g, 0.32 * s, LEAF(), x, y + 0.55 * s, z, 1.1, 6);
};
const palm = (g: G, x: number, z: number, s = 1, y = 0) => {
  const t = cyl(g, 0.04 * s, 0.07 * s, 0.9 * s, 5, TRUNK(), x, y, z);
  t.rotation.z = 0.12;
  const c = cone(g, 0.45 * s, 0.22 * s, 6, LEAF2(), x + 0.06 * s, y + 0.82 * s, z);
  c.rotation.x = Math.PI;
};
/** Roca irregular (icosaedro estirado). */
const boulder = (g: G, r: number, c: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const m = add(g, new THREE.IcosahedronGeometry(r, 0), c, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};
const flagpole = (g: G, x: number, y: number, z: number, color = '#e0694f') => {
  cyl(g, 0.02, 0.02, 0.7, 4, DARK(), x, y, z);
  box(g, 0.3, 0.18, 0.02, mat(color), x + 0.15, y + 0.5, z);
};
const windows = (g: G, w: number, rows: number[], z: number, n: number) => {
  for (const y of rows) for (let i = 0; i < n; i++) box(g, 0.1, 0.14, 0.02, GLOWWIN(), -w / 2 + (w / n) * (i + 0.5), y, z);
};

// ───────────── Templos y lugares de culto ─────────────

function mosque(o: { wall: string; dome: string; minarets: number; tall?: number; square?: boolean; trim?: string }) {
  return () => {
    const g = grp();
    const W = mat(o.wall), D = mat(o.dome, { rough: 0.5 });
    box(g, 2.2, 0.9, 1.8, W);
    box(g, 2.3, 0.08, 1.9, mat(o.trim ?? '#ffffff'), 0, 0.9);
    cyl(g, 0.62, 0.66, 0.35, 14, W, 0, 0.95);
    ball(g, 0.64, D, 0, 1.3, 0, 1.05, 14);
    cyl(g, 0.02, 0.03, 0.4, 4, GOLD(), 0, 1.9);
    for (const [x, z] of [[-0.75, 0.55], [0.75, 0.55], [-0.75, -0.55], [0.75, -0.55]]) ball(g, 0.24, D, x, 0.95, z, 1, 8);
    box(g, 0.8, 1.35, 0.25, W, 0, 0, 0.95);
    box(g, 0.42, 0.8, 0.04, DARK(), 0, 0.1, 1.08);
    const spots = [[-1.25, 1.05], [1.25, -1.05], [1.25, 1.05], [-1.25, -1.05]];
    const h = o.tall ?? 2.6;
    for (let i = 0; i < o.minarets; i++) {
      const [x, z] = spots[i];
      const hh = o.minarets === 1 ? h * 1.35 : h;
      cyl(g, 0.11, 0.14, hh, o.square ? 4 : 8, W, x, 0, z);
      cyl(g, 0.2, 0.17, 0.08, 8, mat(o.trim ?? '#ffffff'), x, hh * 0.72, z);
      cone(g, 0.13, 0.45, o.square ? 4 : 8, D, x, hh, z);
    }
    return g;
  };
}

function registan() {
  const g = grp();
  const tan = mat('#d8b98a'), tile = mat('#2f86c0'), deep = mat('#1d4f7a'), turq = mat('#3cc3c9', { rough: 0.5 });
  disc(g, 1.7, mat('#e9dcc1'), 0, 0, 0, 6);
  for (const [x, z, ry] of [[0, -1.1, 0], [-1.15, 0, Math.PI / 2], [1.15, 0, -Math.PI / 2]] as const) {
    const m = grp();
    box(m, 1.5, 0.9, 0.6, tan);
    box(m, 0.85, 1.6, 0.18, tile, 0, 0, 0.32);
    box(m, 0.45, 1.0, 0.04, deep, 0, 0.1, 0.42);
    for (const sx of [-1, 1]) cyl(m, 0.08, 0.1, 1.7, 8, tile, sx * 0.72, 0, 0.28);
    ball(m, 0.32, turq, 0.5, 1.05, -0.1, 1.3, 10);
    m.position.set(x, 0, z);
    m.rotation.y = ry;
    g.add(m);
  }
  return g;
}

function hagia() {
  const g = grp();
  const pink = mat('#d99a7f'), lead = mat('#8f9aa6', { rough: 0.5 });
  box(g, 2.2, 1.0, 2.0, pink);
  cyl(g, 0.8, 0.85, 0.35, 16, pink, 0, 1.0);
  ball(g, 0.82, lead, 0, 1.35, 0, 0.62, 16);
  for (const z of [-0.8, 0.8]) ball(g, 0.55, lead, 0, 1.0, z, 0.55, 12);
  for (const [x, z] of [[-1.3, -1.2], [1.3, -1.2], [-1.3, 1.2], [1.3, 1.2]]) {
    cyl(g, 0.08, 0.1, 2.5, 8, WHITE(), x, 0, z);
    cyl(g, 0.14, 0.12, 0.06, 8, WHITE(), x, 1.8, z);
    cone(g, 0.1, 0.6, 8, lead, x, 2.5, z);
  }
  return g;
}

function adobe(id: string) {
  const g = grp();
  const mud = mat('#b98a5a'), mud2 = mat('#a97b4e'), stick = mat('#6e4d33');
  const tall = id === 'agadez';
  box(g, 2.4, 0.95, 1.6, mud, 0, 0, -0.2);
  const towers = tall ? [[0, 0.75, 3.2]] : [[-0.8, 0.65, 1.7], [0, 0.65, 2.1], [0.8, 0.65, 1.7]];
  for (const [x, z, h] of towers) {
    const t = cyl(g, 0.2, 0.42, h, 4, mud2, x, 0, z);
    t.rotation.y = Math.PI / 4;
    cone(g, 0.18, 0.3, 4, mud2, x, h, z).rotation.y = Math.PI / 4;
    for (let y = 0.4; y < h - 0.2; y += 0.38) {
      const s = box(g, 0.9 - (y / h) * 0.4, 0.04, 0.04, stick, x, y, z);
      s.rotation.y = 0.3;
      box(g, 0.04, 0.04, 0.8 - (y / h) * 0.35, stick, x, y + 0.12, z);
    }
  }
  for (let x = -1.1; x <= 1.1; x += 0.37) cone(g, 0.08, 0.25, 4, mud2, x, 0.95, -0.95);
  return g;
}

function churchStone(id: string) {
  const g = grp();
  const stone = mat(id === 'natividad' ? '#d9c7a3' : id === 'zonacolonial' ? '#d1b48a' : '#b9b2a6'), slate = mat('#59636e');
  box(g, 1.0, 1.0, 2.0, stone, 0, 0, -0.3);
  pediment(g, 2.0, 0.6, 1.1, slate, 0, 1.0, -0.3);
  box(g, 0.75, 2.2, 0.75, stone, 0, 0, 0.9);
  pyramid(g, 0.62, 1.0, slate, 0, 2.2, 0.9);
  box(g, 0.3, 0.5, 0.02, DARK(), 0, 0, 1.28);
  box(g, 0.16, 0.3, 0.02, GLOWWIN(), 0, 1.5, 1.28);
  if (id === 'khorvirap') for (const [x, z] of [[-1.3, -1.2], [1.3, -1.2], [-1.3, 1.1], [1.3, 1.1]]) cyl(g, 0.22, 0.25, 0.6, 8, stone, x, 0, z);
  if (id === 'gergeti') {
    const m = cone(g, 1.1, 2.6, 7, ROCK(), -0.9, 0, -1.4);
    m.scale.z = 0.6;
    cone(g, 0.5, 0.9, 7, SNOW(), -0.9, 1.7, -1.4).scale.z = 0.6;
  }
  return g;
}

function churchWhite() {
  const g = grp();
  const W = WHITE(), green = mat('#5aa48f', { rough: 0.5 });
  box(g, 2.2, 0.35, 2.2, mat('#e5ddcf'));
  box(g, 1.3, 1.1, 1.3, W, 0, 0.35);
  for (const [w, d] of [[2.0, 0.7], [0.7, 2.0]]) box(g, w, 0.9, d, W, 0, 0.35);
  pediment(g, 0.7, 0.35, 0.9, W, 0, 1.25, 1.0);
  cyl(g, 0.45, 0.45, 0.5, 14, W, 0, 1.45);
  ball(g, 0.48, green, 0, 1.95, 0, 0.9, 12);
  cyl(g, 0.06, 0.06, 0.35, 6, GOLD(), 0, 2.3);
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
    cyl(g, 0.15, 0.15, 0.25, 10, W, x, 1.45, z);
    ball(g, 0.16, green, x, 1.72, z, 1, 8);
  }
  for (let i = -2; i <= 2; i++) cyl(g, 0.05, 0.05, 0.85, 6, W, i * 0.13, 0.35, 1.05);
  return g;
}

function churchGothic(color: string, roof = '#4b5560') {
  return () => {
    const g = grp();
    const c = mat(color), r = mat(roof);
    box(g, 1.2, 1.3, 2.0, c, 0, 0, -0.4);
    pediment(g, 2.0, 0.8, 1.3, r, 0, 1.3, -0.4);
    for (const [x, h] of [[-0.42, 2.8], [0.42, 2.4]]) {
      box(g, 0.55, h, 0.55, c, x, 0, 0.8);
      pyramid(g, 0.45, 1.1, r, x, h, 0.8);
      cyl(g, 0.02, 0.02, 0.3, 4, GOLD(), x, h + 1.05, 0.8);
    }
    const rose = add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.03, 12), GLOWWIN(), 0, 1.25, 0.62);
    rose.rotation.x = Math.PI / 2;
    box(g, 0.32, 0.6, 0.02, DARK(), 0, 0, 1.08);
    return g;
  };
}

function churchDome(id: string) {
  const g = grp();
  const st = mat('#e9e0cf'), dome = mat(id === 'yamusukro' ? '#9fb7c9' : '#b9c6cf', { rough: 0.5 });
  box(g, 2.6, 1.1, 0.7, st, 0, 0, 0.6);
  pediment(g, 1.0, 0.35, 1.0, st, 0, 1.1, 0.95);
  for (let i = -3; i <= 3; i++) cyl(g, 0.06, 0.06, 1.0, 6, WHITE(), i * 0.3, 0, 0.98);
  box(g, 1.6, 1.0, 1.4, st, 0, 0, -0.5);
  cyl(g, 0.62, 0.66, 0.6, 16, st, 0, 1.0, -0.5);
  ball(g, 0.64, dome, 0, 1.6, -0.5, 1.15, 16);
  cyl(g, 0.12, 0.14, 0.35, 8, st, 0, 2.3, -0.5);
  cone(g, 0.1, 0.25, 8, GOLD(), 0, 2.65, -0.5);
  // columnata (dos brazos curvos)
  for (const s of [-1, 1]) {
    const arc = add(g, new THREE.TorusGeometry(1.0, 0.12, 4, 10, Math.PI / 2), st, s * 1.2, 0.25, 1.5);
    arc.rotation.set(Math.PI / 2, 0, s > 0 ? 0 : Math.PI / 2);
  }
  return g;
}

function churchWood() {
  const g = grp();
  const W = WHITE(), grey = mat('#7b8a99');
  box(g, 1.2, 1.1, 2.2, W, 0, 0, -0.2);
  pediment(g, 2.2, 0.7, 1.3, grey, 0, 1.1, -0.2);
  for (const x of [-0.42, 0.42]) {
    box(g, 0.45, 1.9, 0.45, W, x, 0, 0.95);
    pyramid(g, 0.38, 0.9, grey, x, 1.9, 0.95);
  }
  windows(g, 1.0, [0.55], 0.41, 3);
  return g;
}

function churchYellow() {
  const g = grp();
  const Y = mat('#f0c64a'), W = WHITE(), red = mat('#c9533e');
  box(g, 1.4, 1.2, 2.0, Y, 0, 0, -0.3);
  pediment(g, 2.0, 0.5, 1.5, red, 0, 1.2, -0.3);
  for (const x of [-0.55, 0.55]) {
    box(g, 0.5, 2.1, 0.5, Y, x, 0, 0.8);
    box(g, 0.56, 0.08, 0.56, W, x, 1.2, 0.8);
    ball(g, 0.22, red, x, 2.15, 0.8, 1.2, 8);
  }
  pediment(g, 0.6, 0.35, 0.7, W, 0, 1.25, 0.82);
  cyl(g, 0.3, 0.3, 0.25, 10, Y, 0, 1.55, -0.5);
  ball(g, 0.32, red, 0, 1.8, -0.5, 1, 10);
  return g;
}

function churchGreen() {
  const g = grp();
  const brick = mat('#d9b48a'), green = mat('#3f9a6f', { rough: 0.5 });
  box(g, 1.3, 1.0, 2.2, brick, 0, 0, -0.2);
  pediment(g, 2.2, 1.2, 1.4, green, 0, 1.0, -0.2);
  box(g, 0.6, 2.4, 0.6, brick, 0, 0, 1.0);
  pyramid(g, 0.5, 1.4, green, 0, 2.4, 1.0);
  for (let z = -1.0; z <= 0.6; z += 0.4) box(g, 0.02, 0.5, 0.14, DARK(), 0.66, 0.25, z);
  return g;
}

function churchBasalt() {
  const g = grp();
  const c = mat('#d9dcdc');
  box(g, 1.0, 1.1, 2.0, c, 0, 0, -0.9);
  pediment(g, 2.0, 0.6, 1.0, mat('#7d8790'), 0, 1.1, -0.9);
  for (let i = 0; i < 6; i++) {
    const h = 1.0 + i * 0.5;
    for (const s of [-1, 1]) box(g, 0.22, h, 0.5, c, s * (1.2 - i * 0.2), 0, 0.3 - i * 0.03);
  }
  box(g, 0.5, 4.3, 0.55, c, 0, 0, 0.25);
  pyramid(g, 0.38, 1.0, mat('#7d8790'), 0, 4.3, 0.25);
  box(g, 0.16, 0.5, 0.02, GLOWWIN(), 0, 3.5, 0.53);
  return g;
}

function churchOnCliff(id: string) {
  const g = grp();
  const rock = mat('#a59a86');
  box(g, 3.0, 0.08, 1.2, WATER(), 0, 0, 1.0);
  const c = cyl(g, 1.0, 1.3, 1.4, 7, rock, 0, 0, -0.2);
  c.scale.z = 0.8;
  disc(g, 0.95, GRASS(), 0, -0.2, 1.4, 7);
  const stone = mat(id === 'orheiul' ? '#efe8da' : '#c9a07a');
  box(g, 0.7, 0.6, 0.9, stone, 0, 1.45, -0.2);
  pyramid(g, 0.55, 0.4, mat('#b5523b'), 0, 2.05, -0.2);
  cyl(g, 0.18, 0.18, 0.3, 8, stone, 0, 2.05, 0.2);
  ball(g, 0.18, mat('#b5523b'), 0, 2.38, 0.2, 1, 8);
  tree(g, 0.7, -0.6, 0.8, 1.42);
  return g;
}

function cliffTemple() {
  const g = grp();
  const rock = mat('#6f7a6a');
  box(g, 1.6, 4.2, 1.6, rock, 0.2, 0, -0.6);
  cone(g, 1.0, 1.2, 6, LEAF(), 0.2, 4.2, -0.6);
  const W = WHITE(), roof = mat('#b9443a'), gold = GOLD();
  for (const [x, y, w] of [[-0.4, 2.2, 0.9], [0.5, 2.6, 0.7], [-0.1, 3.0, 0.6]] as const) {
    box(g, w, 0.55, 0.6, W, x, y, 0.45);
    box(g, w + 0.1, 0.1, 0.65, roof, x, y + 0.55, 0.45);
    pyramid(g, 0.2, 0.25, gold, x, y + 0.65, 0.45);
  }
  for (let i = 0; i < 4; i++) tree(g, -1.2 + i * 0.25, 1.2 - i * 0.15, 0.7);
  return g;
}

function lakeChurch() {
  const g = grp();
  disc(g, 1.7, WATER(), 0, 0, 0, 24);
  boulder(g, 0.7, GRASS(), 0, 0.1, 0, 1, 0.45, 1);
  box(g, 0.45, 0.45, 0.6, WHITE(), 0, 0.2, 0);
  pyramid(g, 0.38, 0.3, mat('#c9533e'), 0, 0.65, 0);
  box(g, 0.22, 1.1, 0.22, WHITE(), 0, 0.2, 0.4);
  cone(g, 0.18, 0.5, 4, mat('#c9533e'), 0, 1.3, 0.4).rotation.y = Math.PI / 4;
  tree(g, -0.4, -0.3, 0.6, 0.15);
  tree(g, 0.45, -0.2, 0.6, 0.15);
  for (const [x, z] of [[-1.6, -1.4], [1.4, -1.6]]) cone(g, 0.8, 1.6, 6, mat('#6c8a6a'), x, 0, z);
  const boat = box(g, 0.45, 0.08, 0.16, mat('#c08a4a'), 0.9, 0.06, 0.8);
  boat.rotation.y = 0.5;
  return g;
}

function orthodoxGold() {
  const g = grp();
  const W = WHITE(), gold = GOLD(), stripe = mat('#c86a4f');
  box(g, 1.7, 1.2, 1.7, W);
  for (let i = 0; i < 4; i++) box(g, 1.72, 0.06, 1.72, stripe, 0, 0.2 + i * 0.28);
  for (const [x, z, r, h] of [[0, 0, 0.36, 0.55], [-0.55, -0.55, 0.22, 0.3], [0.55, -0.55, 0.22, 0.3], [-0.55, 0.55, 0.22, 0.3], [0.55, 0.55, 0.22, 0.3]] as const) {
    cyl(g, r * 0.85, r * 0.85, h, 10, W, x, 1.2, z);
    onion(g, r, gold, x, 1.2 + h, z, gold);
  }
  return g;
}

function orthodoxWhite() {
  const g = grp();
  const W = mat('#f3efe9'), green = mat('#3f8f74', { rough: 0.5 });
  for (const [w, d] of [[2.2, 1.0], [1.0, 2.2]]) box(g, w, 1.2, d, W);
  for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) {
    box(g, 0.5, 1.5, 0.5, W, x, 0, z);
    ball(g, 0.22, green, x, 1.55, z, 1, 8);
  }
  cyl(g, 0.6, 0.6, 0.6, 16, W, 0, 1.2);
  ball(g, 0.62, green, 0, 1.8, 0, 1.0, 14);
  box(g, 0.05, 0.5, 0.05, GOLD(), 0, 2.4);
  box(g, 0.25, 0.05, 0.05, GOLD(), 0, 2.72);
  return g;
}

function templeClassic() {
  const g = grp();
  const st = mat('#d8c39b');
  box(g, 2.8, 0.3, 1.6, st);
  for (let i = 0; i < 6; i++) cyl(g, 0.12, 0.13, 2.6, 8, st, -1.1 + i * 0.44, 0.3, 0.3);
  box(g, 2.6, 0.35, 0.4, st, 0, 2.9, 0.3);
  for (const [x, z, ry] of [[-0.6, -0.4, 0.3], [0.7, -0.5, -0.6]]) {
    const c = cyl(g, 0.12, 0.13, 1.2, 8, st, x, 0.42, z);
    c.rotation.set(Math.PI / 2, ry, 0);
  }
  for (let i = 0; i < 3; i++) cyl(g, 0.13, 0.13, 0.4 + i * 0.2, 8, st, -0.9 + i * 0.6, 0.3, -0.5);
  return g;
}

function ruins(id: string) {
  const g = grp();
  const st = mat(id === 'nanmadol' ? '#56595c' : id === 'bunce' || id === 'kuntakinteh' ? '#a99a84' : '#d6bd92');
  box(g, 3.0, 0.15, 2.4, mat('#e1d2b2'));
  if (id === 'nanmadol') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const b = box(g, 1.3, 0.16, 0.18, st, Math.cos(a) * 0.9, 0.15 + (i % 3) * 0.17, Math.sin(a) * 0.9);
      b.rotation.y = -a + Math.PI / 2;
    }
    disc(g, 1.4, WATER(), 0, 0, -0.02, 20).scale.set(1.15, 1, 1);
    return g;
  }
  // arco
  for (const x of [-0.55, 0.55]) box(g, 0.3, 1.5, 0.4, st, x, 0.15, 0.4);
  box(g, 1.5, 0.35, 0.45, st, 0, 1.65, 0.4);
  // columnas y muros rotos
  for (let i = 0; i < 5; i++) cyl(g, 0.11, 0.12, 0.5 + ((i * 37) % 7) / 6, 8, st, -1.2 + i * 0.6, 0.15, -0.6);
  box(g, 1.0, 0.6, 0.18, st, 0.9, 0.15, -0.1).rotation.y = 0.5;
  box(g, 0.7, 0.4, 0.18, st, -1.0, 0.15, 0.2).rotation.y = -0.3;
  return g;
}

function ruinsRound() {
  const g = grp();
  const st = mat('#d1b07c');
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const h = i > 15 && i < 20 ? 0.9 : 1.6;
    const p = box(g, 0.28, h, 0.3, st, Math.cos(a) * 1.4, 0, Math.sin(a) * 1.05);
    p.rotation.y = -a;
  }
  const ring = add(g, new THREE.TorusGeometry(1.0, 0.1, 4, 28, Math.PI * 1.4), st, 0, 1.62, 0);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.4, 1.05, 1);
  disc(g, 0.9, SAND(), 0, 0, 0, 20).scale.set(1.3, 1, 0.95);
  return g;
}

function ziggurat() {
  const g = grp();
  const c = mat('#b48a5c'), c2 = mat('#a27b50');
  box(g, 2.8, 0.7, 2.2, c);
  box(g, 2.0, 0.6, 1.5, c2, 0, 0.7, -0.15);
  box(g, 1.2, 0.5, 0.9, c, 0, 1.3, -0.25);
  const ramp = box(g, 0.4, 0.12, 1.6, c2, 0, 0.55, 1.0);
  ramp.rotation.x = 0.55;
  return g;
}

function palaceAsian() {
  const g = grp();
  const stone = mat('#cfc7b6'), red = mat('#b8423a'), roof = mat('#56626c'), green = mat('#5c8a6a');
  box(g, 2.6, 0.3, 1.5, stone);
  box(g, 1.9, 0.7, 0.95, red, 0, 0.3);
  for (let i = -3; i <= 3; i++) box(g, 0.07, 0.7, 0.07, mat('#7a2a24'), i * 0.3, 0.3, 0.5);
  // tejado de dos aguas con aleros, en dos pisos
  for (const [w, d, y, h] of [[2.4, 1.35, 1.0, 0.35], [1.6, 0.9, 1.42, 0.3]] as const) {
    box(g, w, 0.08, d, roof, 0, y);
    pediment(g, w * 0.92, h, d * 0.9, roof, 0, y + 0.08);
    if (y < 1.2) box(g, w * 0.7, 0.3, d * 0.6, red, 0, y + 0.08);
  }
  box(g, 1.5, 0.05, 0.05, GOLD(), 0, 1.79);
  cone(g, 1.3, 1.6, 7, green, 0.5, 0, -1.6);
  cone(g, 1.0, 1.2, 7, mat('#6c9a72'), -1.0, 0, -1.5);
  return g;
}

function stupaGold() {
  const g = grp();
  const gold = GOLD();
  box(g, 2.6, 0.25, 2.6, mat('#e9dfc8'));
  box(g, 1.8, 0.25, 1.8, gold, 0, 0.25);
  ball(g, 0.75, gold, 0, 0.9, 0, 0.8, 14);
  cyl(g, 0.22, 0.4, 0.35, 12, gold, 0, 1.4);
  cone(g, 0.22, 1.6, 12, gold, 0, 1.75);
  ball(g, 0.06, mat('#ffffff', { emissive: '#ffffff', glow: true }), 0, 3.4, 0, 1, 6);
  for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
    ball(g, 0.18, gold, x, 0.42, z, 0.9, 8);
    cone(g, 0.08, 0.5, 8, gold, x, 0.5, z);
  }
  return g;
}

function prangTower(g: G, x: number, z: number, s: number) {
  const P = [mat('#ede4d3'), mat('#d9c8a8'), mat('#e9b8a8'), mat('#bcd3e2')];
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const r = (0.55 - i * 0.07) * s, h = 0.42 * s;
    cyl(g, r * 0.85, r, h, 8, P[i % 4], x, y, z);
    y += h;
  }
  cone(g, 0.12 * s, 0.9 * s, 8, P[0], x, y, z);
}
function prang() {
  const g = grp();
  box(g, 2.6, 0.25, 2.6, mat('#e9e2d4'));
  prangTower(g, 0, 0, 1.25);
  for (const [x, z] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) prangTower(g, x, z, 0.5);
  return g;
}

function khmerTower(g: G, x: number, y: number, z: number, s: number, c: THREE.Material) {
  for (let i = 0; i < 4; i++) cyl(g, (0.32 - i * 0.07) * s, (0.38 - i * 0.07) * s, 0.35 * s, 8, c, x, y + i * 0.33 * s, z);
  cone(g, 0.1 * s, 0.5 * s, 8, c, x, y + 1.3 * s, z);
}
function khmer() {
  const g = grp();
  const st = mat('#a59a86'), st2 = mat('#958a76');
  disc(g, 1.8, WATER(), 0, 0, 0, 4).rotation.y = Math.PI / 4;
  box(g, 2.3, 0.3, 2.3, st2, 0, 0.04);
  box(g, 1.7, 0.3, 1.7, st, 0, 0.34);
  box(g, 1.1, 0.3, 1.1, st2, 0, 0.64);
  box(g, 0.3, 0.06, 1.0, st, 0, 0.04, 1.6);
  khmerTower(g, 0, 0.94, 0, 1.25, st);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) khmerTower(g, x, 0.64, z, 0.8, st);
  return g;
}

function borobudur() {
  const g = grp();
  const st = mat('#8f8a80'), st2 = mat('#a19b90');
  for (let i = 0; i < 5; i++) box(g, 2.9 - i * 0.38, 0.2, 2.9 - i * 0.38, i % 2 ? st2 : st, 0, i * 0.2);
  for (let k = 0; k < 3; k++) {
    const r = 0.9 - k * 0.25, y = 1.0 + k * 0.15;
    cyl(g, r, r + 0.05, 0.15, 18, st, 0, y - 0.15);
    const n = 12 - k * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ball(g, 0.08, st2, Math.cos(a) * r * 0.85, y + 0.06, Math.sin(a) * r * 0.85, 1.1, 6);
    }
  }
  ball(g, 0.3, st2, 0, 1.55, 0, 0.9, 10);
  cone(g, 0.06, 0.45, 6, st, 0, 1.75);
  return g;
}

function maya() {
  const g = grp();
  const st = mat('#b2ab92'), st2 = mat('#a19a80');
  for (let i = 0; i < 6; i++) box(g, 2.0 - i * 0.28, 0.42, 2.0 - i * 0.28, i % 2 ? st2 : st, 0, i * 0.42);
  box(g, 0.45, 2.5, 0.4, st2, 0, 0, 0.82).rotation.x = -0.3;
  box(g, 0.5, 0.5, 0.45, st, 0, 2.52);
  box(g, 0.4, 0.45, 0.2, st2, 0, 3.02, -0.1);
  box(g, 0.14, 0.24, 0.02, DARK(), 0, 2.55, 0.23);
  for (const [x, z] of [[-1.3, 1.0], [1.3, -0.9], [-1.2, -1.2], [1.2, 1.2]]) tree(g, x, z, 1.1);
  return g;
}

function pyramidsNubian() {
  const g = grp();
  const s = mat('#d9a86a'), s2 = mat('#c99858');
  for (const [x, z, h] of [[-0.9, -0.5, 1.6], [0.1, -0.9, 1.9], [0.9, -0.2, 1.4], [-0.3, 0.6, 1.3], [0.9, 0.9, 1.1]] as const) {
    pyramid(g, h * 0.3, h, s, x, 0, z);
    box(g, 0.25, 0.3, 0.25, s2, x, 0, z + h * 0.24);
  }
  return g;
}

function moai() {
  const g = grp();
  const st = mat('#6c645e'), top = mat('#b0503c');
  disc(g, 1.7, GRASS(), 0, 0, 0, 16);
  box(g, 2.8, 0.25, 0.7, mat('#8e857d'), 0, 0.03);
  for (let i = 0; i < 5; i++) {
    const x = -1.1 + i * 0.55;
    box(g, 0.32, 0.6, 0.24, st, x, 0.28);
    box(g, 0.3, 0.7, 0.3, st, x, 0.88, 0.03);
    box(g, 0.32, 0.08, 0.1, st, x, 1.3, 0.2);
    box(g, 0.1, 0.25, 0.1, st, x, 1.0, 0.2);
    if (i === 2) cyl(g, 0.16, 0.16, 0.16, 8, top, x, 1.58, 0.03);
  }
  return g;
}

function petra(id: string) {
  const g = grp();
  const rock = mat(id === 'hegra' ? '#d9a77a' : '#d58d73'), car = mat(id === 'hegra' ? '#e3b88e' : '#e0a088');
  if (id === 'hegra') boulder(g, 1.4, rock, 0, 1.0, -0.4, 1.0, 1.0, 0.8);
  else box(g, 3.0, 3.2, 1.4, rock, 0, 0, -0.7);
  const z = id === 'hegra' ? 0.42 : 0.02;
  box(g, 1.5, 2.2, 0.2, car, 0, 0, z);
  for (let i = 0; i < 4; i++) cyl(g, 0.07, 0.07, 1.0, 6, car, -0.55 + i * 0.37, 0, z + 0.15);
  pediment(g, 0.25, 0.25, 1.4, car, 0, 1.0, z + 0.12);
  cyl(g, 0.22, 0.22, 0.6, 10, car, 0, 1.4, z + 0.15);
  cone(g, 0.26, 0.2, 10, car, 0, 2.0, z + 0.15);
  box(g, 0.3, 0.6, 0.02, DARK(), 0, 0, z + 0.25);
  return g;
}

function rockChurch() {
  const g = grp();
  disc(g, 1.7, mat('#9b6e52'), 0, 0, 0, 8);
  box(g, 2.0, 0.04, 2.0, mat('#4a3328'), 0, 0.06);
  const c = mat('#b5664a');
  box(g, 1.5, 0.55, 0.5, c, 0, 0.0);
  box(g, 0.5, 0.55, 1.5, c, 0, 0.0);
  box(g, 1.3, 0.06, 0.3, mat('#c9805e'), 0, 0.55);
  box(g, 0.3, 0.06, 1.3, mat('#c9805e'), 0, 0.55);
  for (const [x, z] of [[0.6, 0.27], [-0.6, 0.27], [0.27, 0.6]]) box(g, 0.12, 0.2, 0.02, DARK(), x, 0.2, z);
  return g;
}

function sigiriya() {
  const g = grp();
  const rock = mat('#a46f4f');
  const r = cyl(g, 1.0, 1.35, 2.6, 8, rock, 0, 0, -0.3);
  r.scale.z = 0.8;
  cyl(g, 0.95, 0.98, 0.12, 8, LEAF2(), 0, 2.6, -0.3).scale.z = 0.8;
  for (const x of [-0.35, 0.35]) box(g, 0.3, 0.3, 0.45, mat('#c9a27a'), x, 0, 0.95);
  box(g, 0.25, 0.08, 0.6, mat('#e1cfb0'), 0, 0.0, 1.05);
  for (const [x, z] of [[-1.4, 0.8], [1.4, 0.7], [1.2, -1.3]]) tree(g, x, z, 1);
  return g;
}

// ───────────── Castillos, fuertes y palacios ─────────────

function castle(wall: string, roof: string, crenel = false) {
  return () => {
    const g = grp();
    const W = mat(wall), R = mat(roof);
    box(g, 1.1, 1.8, 1.1, W);
    if (crenel) for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) box(g, 0.2, 0.2, 0.2, W, i * 0.4, 1.8, s * 0.45);
    else pyramid(g, 0.85, 0.8, R, 0, 1.8, 0);
    for (const [x, z] of [[-1.0, -1.0], [1.0, -1.0], [-1.0, 1.0], [1.0, 1.0]]) {
      cyl(g, 0.3, 0.33, 1.35, 10, W, x, 0, z);
      if (crenel) for (let i = 0; i < 5; i++) box(g, 0.12, 0.16, 0.12, W, x + Math.cos(i * 1.26) * 0.24, 1.35, z + Math.sin(i * 1.26) * 0.24);
      else cone(g, 0.38, 0.7, 10, R, x, 1.35, z);
    }
    for (const [x, z, w, d] of [[0, -1.0, 1.7, 0.16], [0, 1.0, 1.7, 0.16], [-1.0, 0, 0.16, 1.7], [1.0, 0, 0.16, 1.7]]) box(g, w, 0.8, d, W, x, 0, z);
    box(g, 0.32, 0.45, 0.02, DARK(), 0, 0, 1.09);
    for (const y of [0.9, 1.3]) box(g, 0.14, 0.2, 0.02, GLOWWIN(), 0, y, 0.56);
    return g;
  };
}

function fort(id: string) {
  const g = grp();
  const st = mat(id === 'citadelle' ? '#a5856a' : '#c9b48c'), st2 = mat('#b5a07a');
  box(g, 2.4, 0.7, 2.4, st);
  box(g, 1.8, 0.1, 1.8, mat('#d9cfb6'), 0, 0.7);
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) {
    const b = box(g, 0.75, 0.8, 0.75, st2, x, 0, z);
    b.rotation.y = Math.PI / 4;
  }
  box(g, 0.8, 0.7, 0.8, st, -0.3, 0.7, -0.3);
  box(g, 0.3, 0.4, 0.02, DARK(), 0, 0, 1.21);
  flagpole(g, -0.3, 1.4, -0.3, id === 'citadelle' ? '#2a4bd8' : '#e0694f');
  return g;
}

function walled(id: string) {
  const g = grp();
  const st = mat(id === 'granzimbabue' ? '#9c8d78' : id === 'cartagena' ? '#c9b48c' : '#d8cdb5');
  const N = 10;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
    const ax = Math.cos(a) * 1.45, az = Math.sin(a) * 1.25, bx = Math.cos(b) * 1.45, bz = Math.sin(b) * 1.25;
    const seg = box(g, Math.hypot(bx - ax, bz - az) + 0.05, 0.6, 0.18, st, (ax + bx) / 2, 0, (az + bz) / 2);
    seg.rotation.y = -Math.atan2(bz - az, bx - ax);
    if (i % 2 === 0) {
      cyl(g, 0.2, 0.22, 0.9, 8, st, ax, 0, az);
      if (id === 'tallin') cone(g, 0.26, 0.5, 8, mat('#c9533e'), ax, 0.9, az);
    }
  }
  if (id === 'granzimbabue') {
    cone(g, 0.35, 1.2, 10, st, 0.3, 0, -0.2);
    return g;
  }
  const roofs = ['#e0694f', '#d9774f', '#c95c3e', '#e88a4f'];
  const walls = id === 'cartagena' ? ['#f2c14e', '#ef8fa0', '#7fc8e0', '#f39c6b'] : ['#f4ecd8', '#efe3cc', '#f6efe2'];
  let k = 0;
  for (let x = -0.8; x <= 0.8; x += 0.45) for (let z = -0.6; z <= 0.7; z += 0.45) {
    if (Math.abs(x) < 0.2 && Math.abs(z) < 0.2) continue;
    const h = 0.35 + ((k * 7) % 5) * 0.06;
    box(g, 0.34, h, 0.34, mat(walls[k % walls.length]), x, 0, z);
    pyramid(g, 0.27, 0.2, mat(roofs[k % roofs.length]), x, h, z);
    k++;
  }
  box(g, 0.32, 1.4, 0.32, st, 0, 0, 0);
  pyramid(g, 0.26, 0.5, mat('#4b5560'), 0, 1.4, 0);
  return g;
}

function palaceYellow() {
  const g = grp();
  const Y = mat('#f0c94a'), W = WHITE(), roof = mat('#7a8f86');
  box(g, 3.0, 0.95, 0.9, Y);
  box(g, 0.9, 1.15, 1.05, Y, 0, 0, 0.05);
  pediment(g, 0.9, 0.3, 1.1, W, 0, 1.15, 0.05);
  box(g, 3.05, 0.12, 0.95, roof, 0, 0.95);
  for (let i = -6; i <= 6; i++) box(g, 0.05, 0.9, 0.02, W, i * 0.23, 0.02, 0.46);
  windows(g, 2.8, [0.35, 0.7], 0.46, 10);
  disc(g, 1.0, mat('#9fd17f'), 0, 1.3, 0, 12).scale.set(1.4, 1, 0.5);
  return g;
}

function palaceWhite() {
  const g = grp();
  const W = WHITE(), cu = mat('#6fb5a0', { rough: 0.5 });
  box(g, 2.2, 1.0, 1.0, W);
  for (const x of [-1.0, 1.0]) {
    box(g, 0.5, 1.6, 0.5, W, x, 0, 0.3);
    ball(g, 0.25, cu, x, 1.6, 0.3, 1.3, 8);
    cone(g, 0.05, 0.3, 6, GOLD(), x, 1.85, 0.3);
  }
  pediment(g, 0.8, 0.35, 1.2, W, 0, 1.0, 0.3);
  cyl(g, 0.35, 0.35, 0.3, 12, W, 0, 1.0, -0.2);
  ball(g, 0.36, cu, 0, 1.3, -0.2, 0.9, 10);
  windows(g, 1.4, [0.4, 0.75], 0.51, 5);
  return g;
}

function palaceGothic() {
  const g = grp();
  const W = mat('#f1ebdf'), red = mat('#b2513e');
  box(g, 3.2, 0.9, 1.0, W);
  pediment(g, 3.2, 0.4, 1.0, red, 0, 0.9);
  cyl(g, 0.45, 0.5, 0.7, 16, W, 0, 0.9);
  ball(g, 0.47, red, 0, 1.6, 0, 1.25, 14);
  cone(g, 0.08, 0.7, 6, W, 0, 2.15);
  for (let i = -3; i <= 3; i++) if (i) {
    cyl(g, 0.06, 0.06, 1.3, 6, W, i * 0.45, 0, 0.5);
    cone(g, 0.07, 0.35, 6, W, i * 0.45, 1.3, 0.5);
  }
  windows(g, 3.0, [0.45], 0.51, 12);
  return g;
}

function palacePink() {
  const g = grp();
  const P = mat('#e79aa6'), W = WHITE();
  box(g, 2.6, 1.1, 1.1, P);
  box(g, 2.6, 0.08, 1.15, W, 0, 0.55);
  for (let i = -5; i <= 5; i++) box(g, 0.05, 1.0, 0.02, W, i * 0.23, 0, 0.56);
  cyl(g, 0.38, 0.4, 0.4, 12, P, 0, 1.1);
  ball(g, 0.4, mat('#d77b8b'), 0, 1.5, 0, 1.15, 12);
  const st = box(g, 0.9, 0.5, 0.6, W, 0, 0, 0.8);
  st.rotation.x = -0.6;
  return g;
}

function capitol() {
  const g = grp();
  const W = mat('#efeae0'), dome = mat('#d9d4c8');
  box(g, 3.2, 0.9, 1.0, W);
  pediment(g, 1.0, 0.3, 1.2, W, 0, 0.9, 0.45);
  for (let i = -2; i <= 2; i++) cyl(g, 0.06, 0.06, 0.85, 6, W, i * 0.22, 0, 0.6);
  cyl(g, 0.5, 0.55, 0.9, 16, W, 0, 0.9);
  ball(g, 0.5, dome, 0, 1.8, 0, 1.35, 16);
  cyl(g, 0.1, 0.1, 0.4, 8, W, 0, 2.4);
  cone(g, 0.1, 0.25, 8, GOLD(), 0, 2.8);
  const car = box(g, 0.35, 0.14, 0.18, mat('#e85d75'), 1.0, 0, 1.2);
  car.rotation.y = 0.2;
  box(g, 0.35, 0.14, 0.18, mat('#4fb3e0'), -1.1, 0, 1.25);
  return g;
}

function gables() {
  const g = grp();
  const B = mat('#b34b3c'), W = WHITE(), G2 = mat('#e8e0d0');
  box(g, 1.3, 1.3, 1.0, B);
  for (let i = 0; i < 4; i++) box(g, 1.1 - i * 0.26, 0.28, 0.3, i % 2 ? W : B, 0, 1.3 + i * 0.28, 0.35);
  cone(g, 0.06, 0.35, 6, GOLD(), 0, 2.42, 0.35);
  windows(g, 1.1, [0.45, 0.9], 0.51, 4);
  box(g, 0.9, 1.2, 0.9, G2, 1.2, 0, -0.1);
  pediment(g, 0.9, 0.5, 0.9, mat('#c9533e'), 1.2, 1.2, -0.1);
  return g;
}

function towerBrick() {
  const g = grp();
  const B = mat('#a6503b');
  box(g, 2.6, 0.9, 1.4, B, -0.2, 0, -0.2);
  box(g, 0.6, 3.6, 0.6, B, 0.9, 0, 0.3);
  box(g, 0.45, 0.4, 0.45, mat('#7c8f86'), 0.9, 3.6, 0.3);
  cone(g, 0.12, 0.4, 6, mat('#7c8f86'), 0.9, 4.0, 0.3);
  for (let i = 0; i < 3; i++) ball(g, 0.07, GOLD(), 0.9 + (i - 1) * 0.1, 4.45 + (i === 1 ? 0.08 : 0), 0.3, 1, 6);
  disc(g, 1.5, WATER(), 0, 1.4, -0.03, 16).scale.set(1.2, 1, 0.5);
  return g;
}

// ───────────── Torres, estatuas y arquitectura moderna ─────────────

function towerTv() {
  const g = grp();
  const c = mat('#d8d4cc');
  const s = cyl(g, 0.1, 0.38, 4.6, 3, c);
  s.rotation.y = 0.5;
  cyl(g, 0.5, 0.42, 0.35, 16, c, 0, 3.4);
  cyl(g, 0.52, 0.52, 0.12, 16, GLOWWIN(), 0, 3.55);
  cyl(g, 0.2, 0.2, 0.2, 10, c, 0, 4.3);
  cyl(g, 0.02, 0.06, 1.8, 6, mat('#9aa3ab'), 0, 4.5);
  ball(g, 0.06, mat('#ff4d4d', { emissive: '#ff3030', glow: true }), 0, 6.35, 0, 1, 6);
  return g;
}

function towerGold() {
  const g = grp();
  const W = WHITE();
  disc(g, 1.3, mat('#e3dccd'), 0, 0, 0, 16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const l = cyl(g, 0.03, 0.05, 3.2, 4, W, Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18);
    l.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const b = cyl(g, 0.02, 0.03, 1.0, 4, W, Math.cos(a) * 0.4, 2.7, Math.sin(a) * 0.4);
    b.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
  }
  ball(g, 0.55, GOLD(), 0, 3.75, 0, 1, 16);
  return g;
}

function kuwaitTowers() {
  const g = grp();
  const W = mat('#e8ecef'), blue = mat('#2f7fc2', { rough: 0.4 }), green = mat('#3aa37a', { rough: 0.4 });
  cyl(g, 0.06, 0.2, 5.0, 8, W, 0, 0, 0);
  ball(g, 0.6, blue, 0, 2.3, 0, 1, 14);
  ball(g, 0.38, green, 0, 3.4, 0, 1, 12);
  cyl(g, 0.05, 0.16, 3.6, 8, W, 0.95, 0, 0.3);
  ball(g, 0.45, blue, 0.95, 1.9, 0.3, 1, 12);
  cyl(g, 0.03, 0.07, 2.6, 6, W, -0.75, 0, 0.5);
  disc(g, 1.4, WATER(), 0.2, 1.4, -0.03, 16).scale.set(1.3, 1, 0.5);
  return g;
}

function twinTowers() {
  const g = grp();
  const S = mat('#c9d2da', { metal: 0.5, rough: 0.35 });
  for (const x of [-0.55, 0.55]) {
    let y = 0;
    for (const [r, h] of [[0.42, 2.2], [0.36, 1.2], [0.3, 0.8], [0.22, 0.5], [0.14, 0.4]] as const) {
      cyl(g, r, r, h, 8, S, x, y, 0);
      y += h;
    }
    cone(g, 0.05, 1.0, 6, S, x, y, 0);
  }
  box(g, 0.7, 0.12, 0.18, S, 0, 2.45, 0);
  for (const x of [-0.55, 0.55]) for (const y of [0.8, 1.5, 2.6]) for (const dx of [-0.13, 0.13]) box(g, 0.1, 0.14, 0.02, GLOWWIN(), x + dx, y, 0.41);
  return g;
}

function mbs() {
  const g = grp();
  const S = mat('#e3e8ec');
  for (let i = 0; i < 3; i++) {
    const t = box(g, 0.45, 3.0, 0.7, S, -0.9 + i * 0.9, 0, 0);
    t.rotation.z = 0.04;
  }
  box(g, 3.2, 0.18, 0.75, S, 0.1, 3.0, 0);
  box(g, 1.8, 0.04, 0.4, LAGOON(), 0.2, 3.18, 0);
  const lotus = cone(g, 0.5, 0.5, 8, WHITE(), 0.4, 0, 1.3);
  lotus.rotation.x = Math.PI;
  lotus.position.y = 0.5;
  disc(g, 1.6, WATER(), 0, 1.3, -0.03, 18).scale.set(1.2, 1, 0.5);
  windows(g, 2.4, [1.0, 1.8, 2.5], 0.36, 6);
  return g;
}

function flames() {
  const g = grp();
  const glass = mat('#4f86b8', { emissive: '#ff7a2e', glow: true, rough: 0.3, metal: 0.3 });
  for (const [x, z, h] of [[0, 0, 3.4], [-0.75, 0.45, 2.8], [0.75, 0.45, 2.6]] as const) {
    const t = cyl(g, 0.05, 0.45, h, 8, glass, x, 0, z);
    t.scale.z = 0.7;
    t.rotation.z = x * 0.08;
  }
  return g;
}

function desertRose() {
  const g = grp();
  const s = mat('#e4c9a0'), s2 = mat('#d6b78a');
  for (const [x, y, z, r, rx, rz] of [[0, 0.5, 0, 1.2, 0.2, 0.1], [-0.8, 0.4, 0.3, 0.8, -0.5, 0.3], [0.7, 0.6, -0.4, 0.9, 0.6, -0.4], [0.2, 1.1, 0.4, 0.7, -0.3, -0.6], [-0.4, 0.9, -0.6, 0.6, 0.9, 0.2], [0.9, 0.3, 0.6, 0.6, 0.1, 0.9]] as const) {
    const d = add(g, new THREE.CylinderGeometry(r, r, 0.08, 14), (x + z) > 0 ? s : s2, x, y, z);
    d.rotation.set(rx, 0, rz);
  }
  return g;
}

function modernWing() {
  const g = grp();
  const W = WHITE();
  box(g, 0.7, 1.5, 0.7, W);
  box(g, 0.4, 0.4, 0.4, W, 0, 1.5);
  for (const s of [-1, 1]) {
    const w = box(g, 1.6, 0.1, 0.45, W, s * 1.0, 0.95, 0);
    w.rotation.z = s * -0.06;
  }
  box(g, 0.42, 0.14, 0.2, mat('#e85d75'), 0.9, 0, 0.7);
  return g;
}

function atomium() {
  const g = grp();
  const M = mat('#cfd6df', { metal: 0.7, rough: 0.25 });
  const pts: THREE.Vector3[] = [];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(new THREE.Vector3(x, y, z).multiplyScalar(0.8).applyQuaternion(q));
  pts.push(new THREE.Vector3());
  const lift = new THREE.Vector3(0, 2.0, 0);
  for (const p of pts) ball(g, 0.26, M, p.x + lift.x, p.y + lift.y, p.z + lift.z, 1, 10);
  const tube = (a: THREE.Vector3, b: THREE.Vector3) => {
    const len = a.distanceTo(b);
    const m = add(g, new THREE.CylinderGeometry(0.06, 0.06, len, 6), M);
    m.position.copy(a.clone().add(b).multiplyScalar(0.5).add(lift));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  };
  for (let i = 0; i < 8; i++) {
    tube(pts[i], pts[8]);
    for (let j = i + 1; j < 8; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - 1.6) < 0.01) tube(pts[i], pts[j]);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const l = cyl(g, 0.05, 0.08, 1.2, 6, M, Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    l.rotation.set(Math.sin(a) * -0.3, 0, Math.cos(a) * 0.3);
  }
  return g;
}

function obelisk() {
  const g = grp();
  const W = mat('#f2efe8');
  disc(g, 1.5, mat('#9aa4ad'), 0, 0, 0, 24);
  disc(g, 0.9, GRASS(), 0, 0, 0.01, 24);
  const o = cyl(g, 0.18, 0.32, 4.0, 4, W, 0, 0.06);
  o.rotation.y = Math.PI / 4;
  pyramid(g, 0.18, 0.35, W, 0, 4.06);
  box(g, 0.14, 0.2, 0.02, DARK(), 0, 0.1, 0.24);
  return g;
}

function statue(id: string) {
  const g = grp();
  const white = id === 'cristorei';
  const M = mat(white ? '#f1ede4' : '#7b6a52', { metal: white ? 0 : 0.3, rough: 0.6 });
  if (white) ball(g, 0.55, mat('#d8d0c0'), 0, 0.55, 0, 1, 12);
  else box(g, 1.0, 0.6, 1.0, mat('#cfc6b3'));
  const y0 = white ? 1.05 : 0.6;
  cone(g, 0.42, 2.1, 8, M, 0, y0);
  ball(g, 0.2, M, 0, y0 + 2.25, 0, 1.1, 8);
  if (white) {
    for (const s of [-1, 1]) box(g, 0.8, 0.14, 0.14, M, s * 0.45, y0 + 1.65);
  } else {
    const arm = box(g, 0.14, 1.0, 0.14, M, 0.35, y0 + 1.6);
    arm.rotation.z = -0.5;
    cone(g, 0.3, 1.5, 8, M, 0.6, y0, -0.25);
    ball(g, 0.16, M, 0.6, y0 + 1.62, -0.25, 1.1, 8);
  }
  return g;
}

function statueHorse() {
  const g = grp();
  const M = mat('#c7ccd2', { metal: 0.7, rough: 0.3 });
  cyl(g, 1.2, 1.3, 1.0, 20, mat('#e5e2dc'));
  box(g, 1.4, 0.55, 0.45, M, 0, 1.75);
  for (const [x, z] of [[-0.5, -0.15], [0.5, -0.15], [-0.5, 0.15], [0.5, 0.15]]) box(g, 0.13, 0.75, 0.13, M, x, 1.0, z);
  const neck = box(g, 0.3, 0.75, 0.3, M, 0.75, 2.0);
  neck.rotation.z = -0.5;
  box(g, 0.45, 0.22, 0.24, M, 1.0, 2.55);
  cyl(g, 0.17, 0.22, 0.75, 8, M, -0.05, 2.3);
  ball(g, 0.16, M, -0.05, 3.2, 0, 1, 8);
  return g;
}

function leaves() {
  const g = grp();
  const c = mat('#e6e0d3');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = grp();
    box(p, 0.55, 4.2, 0.12, c, 0, 0, 0);
    p.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75);
    p.rotation.y = -a + Math.PI / 2;
    p.rotateX(-0.13);
    g.add(p);
  }
  cyl(g, 0.35, 0.35, 0.18, 10, c, 0, 3.4);
  ball(g, 0.12, FIRE(), 0, 0.2, 0, 1, 6);
  disc(g, 1.4, mat('#cfd6dc'), 0, 0, 0, 3);
  return g;
}

function lighthouse() {
  const g = grp();
  cyl(g, 0.24, 0.32, 2.4, 10, WHITE());
  cyl(g, 0.33, 0.33, 0.2, 10, mat('#c9533e'), 0, 1.2);
  cyl(g, 0.2, 0.2, 0.3, 8, GLOWWIN(), 0, 2.4);
  cone(g, 0.26, 0.3, 8, mat('#c9533e'), 0, 2.7);
  const walls = ['#f4ecd8', '#f2c14e', '#7fc8e0'];
  for (let i = 0; i < 3; i++) {
    box(g, 0.45, 0.4, 0.45, mat(walls[i]), -0.9 + i * 0.6, 0, 0.9);
    pyramid(g, 0.35, 0.22, mat('#e0694f'), -0.9 + i * 0.6, 0.4, 0.9);
  }
  tree(g, 0.9, 0.8, 1);
  return g;
}

function canal() {
  const g = grp();
  box(g, 3.0, 0.3, 0.9, GRASS(), 0, 0, -1.05);
  box(g, 3.0, 0.3, 0.9, GRASS(), 0, 0, 1.05);
  box(g, 3.0, 0.06, 1.2, WATER(), 0, 0.02);
  for (const x of [-0.6, 0.8]) box(g, 0.12, 0.45, 1.2, mat('#6e7c88'), x, 0);
  const ship = grp();
  box(ship, 1.2, 0.25, 0.4, mat('#2f4f6f'));
  const cols = ['#e0694f', '#2f8fc2', '#e4a83c', '#4f9a74'];
  for (let i = 0; i < 4; i++) box(ship, 0.24, 0.2, 0.32, mat(cols[i]), -0.4 + i * 0.26, 0.25);
  box(ship, 0.18, 0.4, 0.3, WHITE(), 0.5, 0.25);
  ship.position.set(0.1, 0.05, 0);
  g.add(ship);
  return g;
}

function trilithon() {
  const g = grp();
  const st = mat('#bdb6a3');
  disc(g, 1.5, GRASS(), 0, 0, 0, 14);
  for (const x of [-0.65, 0.65]) box(g, 0.55, 1.8, 0.55, st, x, 0.05);
  box(g, 2.0, 0.38, 0.5, st, 0, 1.85);
  palm(g, 1.2, -0.7, 1.1);
  palm(g, -1.2, 0.5, 0.9);
  return g;
}

// ───────────── Puentes ─────────────

function bridgeArch() {
  const g = grp();
  const st = mat('#d8cdb5'), rock = mat('#a59a86');
  box(g, 3.0, 0.06, 1.0, mat('#3fb3a8'), 0, 0);
  for (const s of [-1, 1]) {
    box(g, 0.9, 1.4, 1.6, rock, s * 1.4, 0, 0);
    box(g, 0.55, 1.0, 0.55, st, s * 1.2, 1.4, 0);
    pyramid(g, 0.4, 0.3, mat('#5e5a52'), s * 1.2, 2.4, 0);
  }
  const arc = add(g, new THREE.TorusGeometry(1.0, 0.13, 4, 14, Math.PI), st, 0, 0.55, 0);
  arc.scale.set(1, 1.0, 3);
  return g;
}

function bridgeGothic() {
  const g = grp();
  const st = mat('#8f8578'), dark = mat('#3b3f45');
  box(g, 3.4, 0.06, 1.4, WATER(), 0, 0);
  box(g, 3.2, 0.2, 0.5, st, 0, 0.75);
  for (let i = -1; i <= 1; i++) {
    const a = add(g, new THREE.TorusGeometry(0.42, 0.1, 4, 10, Math.PI), st, i * 0.95, 0.06, 0);
    a.scale.z = 4;
    box(g, 0.2, 0.75, 0.5, st, i * 0.95 + 0.47, 0, 0);
  }
  for (const s of [-1, 1]) {
    box(g, 0.55, 1.7, 0.6, st, s * 1.6, 0, 0);
    pyramid(g, 0.42, 0.8, dark, s * 1.6, 1.7, 0);
  }
  for (let i = -3; i <= 3; i++) cyl(g, 0.05, 0.05, 0.3, 5, dark, i * 0.4, 0.95, 0.22);
  return g;
}

// ───────────── Naturaleza ─────────────

function mountain(id: string) {
  const g = grp();
  const big = id === 'everest';
  const rock = mat('#8f8a86'), snow = SNOW();
  if (id === 'kilimanjaro') {
    cyl(g, 0.7, 1.7, 2.2, 9, mat('#7c7a62'));
    cyl(g, 0.7, 0.75, 0.12, 9, snow, 0, 2.2);
    cyl(g, 1.2, 1.55, 0.5, 9, LEAF(), 0, 0);
    for (const [x, z] of [[1.5, 1.0], [-1.4, 1.1]]) { cyl(g, 0.02, 0.04, 0.4, 4, TRUNK(), x, 0, z); cyl(g, 0.3, 0.3, 0.08, 7, LEAF2(), x, 0.4, z); }
    return g;
  }
  const h = big ? 3.8 : 3.4;
  const m = cone(g, 1.4, h, 7, rock);
  m.rotation.z = id === 'cervino' ? 0.06 : 0;
  cone(g, 0.62, h * 0.45, 7, snow, 0, h * 0.55);
  if (big) for (const [x, z, s] of [[-1.2, 0.6, 0.6], [1.1, 0.5, 0.7]] as const) {
    cone(g, 1.0 * s, 2.6 * s, 7, rock, x, 0, z);
    cone(g, 0.45 * s, 1.1 * s, 7, snow, x, 1.5 * s, z);
  }
  disc(g, 1.5, GRASS(), 0, 0, 0, 7);
  return g;
}

function volcano(green: boolean) {
  return (id: string) => {
    const g = grp();
    const c = mat(green ? '#5f9a5a' : '#6b5446'), top = mat(green ? '#4c7d49' : '#4f3d33');
    if (id === 'galapagos' || id === 'tavurvur' || id === 'fogo') disc(g, 1.7, WATER(), 0, 0, 0, 18);
    cyl(g, 0.55, 1.5, 1.8, 9, c);
    cyl(g, 0.45, 0.55, 0.18, 9, top, 0, 1.8);
    if (!green || id === 'arenal') {
      disc(g, 0.35, FIRE(), 0, 0, 1.92, 9);
      for (let i = 0; i < 3; i++) ball(g, 0.25 + i * 0.08, mat('#c9c3bd', { rough: 1 }), 0.1 * i, 2.25 + i * 0.35, -0.05 * i, 0.8, 6);
    }
    if (id === 'galapagos') {
      box(g, 0.35, 0.22, 0.2, mat('#6f6a5a'), 1.2, 0.05, 1.0);
      ball(g, 0.12, mat('#6f6a5a'), 1.42, 0.25, 1.0, 1, 6);
    }
    if (green) for (const [x, z] of [[1.3, 0.9], [-1.3, 0.8], [0.4, 1.4]]) tree(g, x, z, 0.9);
    return g;
  };
}

function craterFire(id: string) {
  const g = grp();
  const ground = id === 'darvaza' ? mat('#e4c58e') : id === 'dominica' ? GRASS() : mat('#3d3330');
  disc(g, 1.7, ground, 0, 0, 0, 18);
  const ring = add(g, new THREE.TorusGeometry(1.0, 0.3, 5, 16), mat(id === 'darvaza' ? '#c9a46c' : '#4f3d33'), 0, 0.12, 0);
  ring.rotation.x = Math.PI / 2;
  if (id === 'nyiragongo') {
    cyl(g, 0.9, 1.6, 1.5, 9, mat('#4f4040'));
    disc(g, 0.85, FIRE(), 0, 0, 1.48, 12);
  } else disc(g, 0.85, id === 'dominica' ? mat('#9fd0d6') : FIRE(), 0, 0, 0.05, 14);
  for (let i = 0; i < 3; i++) ball(g, 0.25 + i * 0.07, MIST(), -0.1 + i * 0.1, (id === 'nyiragongo' ? 1.9 : 0.5) + i * 0.35, 0, 0.7, 6);
  return g;
}

function craterLake() {
  const g = grp();
  cyl(g, 1.15, 1.7, 1.4, 9, mat('#8e8577'));
  disc(g, 0.95, DEEP(), 0, 0, 1.32, 14);
  const rim = add(g, new THREE.TorusGeometry(1.05, 0.16, 4, 9), mat('#a39a8c'), 0, 1.4, 0);
  rim.rotation.x = Math.PI / 2;
  for (const a of [0.3, 2.2, 4.1]) cone(g, 0.18, 0.3, 5, SNOW(), Math.cos(a) * 1.05, 1.42, Math.sin(a) * 1.05);
  return g;
}

function waterfall(id: string) {
  const g = grp();
  const rock = mat('#8d8a76');
  const tall = id === 'kaieteur' || id === 'maletsunyane';
  const h = tall ? 2.8 : 2.0;
  box(g, 2.8, h, 1.2, rock, 0, 0, -0.7);
  box(g, 2.9, 0.12, 1.3, GRASS(), 0, h, -0.7);
  const fall = mat('#e3f6fb', { rough: 0.4 });
  box(g, 0.55, h, 0.08, fall, 0, 0, -0.06);
  disc(g, 0.9, WATER(), 0, 0.45, 0, 16).scale.set(1.5, 1, 1);
  for (let i = 0; i < 3; i++) ball(g, 0.22, MIST(), -0.2 + i * 0.2, 0.2, 0.15, 0.6, 6);
  for (const [x, z] of [[-1.0, -0.8], [0.9, -0.6], [1.2, -1.0]]) tree(g, x, z, 0.8, h);
  if (id === 'dunnsriver') for (let i = 0; i < 3; i++) box(g, 0.8, 0.12, 0.3, rock, 0, 0.2 + i * 0.45, 0.05 - i * 0.05);
  return g;
}

function waterfallWide() {
  const g = grp();
  const rock = mat('#7e7a68');
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.32;
    const seg = grp();
    box(seg, 0.72, 1.8, 0.8, rock, 0, 0, -0.5);
    box(seg, 0.74, 0.1, 0.85, GRASS(), 0, 1.8, -0.5);
    box(seg, 0.62, 1.75, 0.06, mat('#e3f6fb', { rough: 0.4 }), 0, 0, -0.06);
    seg.position.set(Math.sin(a) * 2.0, 0, -Math.cos(a) * 2.0 + 1.6);
    seg.rotation.y = -a;
    g.add(seg);
  }
  disc(g, 1.1, WATER(), 0, 0.9, 0, 16).scale.set(1.4, 1, 0.6);
  for (let i = 0; i < 6; i++) ball(g, 0.3, MIST(), -1 + i * 0.4, 0.4 + (i % 2) * 0.3, 0.6, 0.7, 6);
  return g;
}

function tepui() {
  const g = grp();
  cyl(g, 1.25, 1.45, 3.4, 8, mat('#9a6b52'));
  cyl(g, 1.25, 1.25, 0.12, 8, LEAF2(), 0, 3.4);
  box(g, 0.14, 3.3, 0.06, mat('#e3f6fb', { rough: 0.4 }), 0.2, 0.1, 1.4);
  for (let i = 0; i < 3; i++) ball(g, 0.2, MIST(), 0.2, 0.15 + i * 0.12, 1.5, 0.7, 6);
  for (const [x, z] of [[-1.4, 1.0], [1.4, 1.0], [-1.5, -0.6]]) tree(g, x, z, 0.9);
  return g;
}

function mesa(id: string) {
  const g = grp();
  const r = cyl(g, 1.2, 1.6, 1.7, 8, mat(id === 'masada' ? '#c9a77a' : '#8f8a80'));
  r.scale.z = 0.75;
  if (id === 'masada') {
    box(g, 0.9, 0.3, 0.5, mat('#d9c09a'), -0.2, 1.7, 0);
    box(g, 0.5, 0.2, 0.4, mat('#d9c09a'), 0.5, 1.7, 0.2);
    box(g, 3.2, 0.06, 0.8, mat('#7fd3d6'), 0, 0, 1.4);
  } else {
    for (let i = -2; i <= 2; i++) ball(g, 0.4, MIST(), i * 0.45, 1.85, (i % 2) * 0.2, 0.45, 6);
    for (const x of [-0.9, 0.2, 1.0]) box(g, 0.3, 0.3, 0.3, mat('#f4ecd8'), x, 0, 1.4);
  }
  return g;
}

function cliffs() {
  const g = grp();
  for (let i = 0; i < 5; i++) {
    const h = 1.4 + (i % 2) * 0.4;
    const b = box(g, 0.7, h, 1.3, mat(i % 2 ? '#7d7a6c' : '#8c8877'), -1.4 + i * 0.7, 0, -0.4 - Math.sin(i) * 0.25);
    box(g, 0.72, 0.12, 1.32, GRASS(), b.position.x, h, b.position.z);
  }
  box(g, 3.4, 0.06, 1.0, WATER(), 0, 0, 0.9);
  box(g, 0.25, 0.3, 0.25, mat('#cfc6b3'), 0.8, 1.82, -0.6);
  return g;
}

function fjord() {
  const g = grp();
  const rock = mat('#6f7778'), rock2 = mat('#7d8586');
  box(g, 3.4, 0.06, 0.9, DEEP(), 0, 0);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const h = 1.8 + ((i + (s > 0 ? 1 : 0)) % 2) * 0.7, x = -1.1 + i * 1.1;
    const m = cone(g, 0.75, h, 6, i % 2 ? rock : rock2, x, 0, s * 1.05);
    m.scale.z = 0.75;
    cone(g, 0.32, h * 0.3, 6, LEAF(), x, h * 0.05, s * 1.05).scale.set(2.0, 1, 1.4);
    if (h > 2.2) cone(g, 0.22, h * 0.25, 6, SNOW(), x, h * 0.75, s * 1.05);
  }
  box(g, 0.1, 1.4, 0.04, mat('#e3f6fb', { rough: 0.4 }), 0.55, 0.05, -0.55);
  const boat = box(g, 0.6, 0.16, 0.22, WHITE(), -0.4, 0.05, 0);
  boat.rotation.y = 0.1;
  box(g, 0.25, 0.14, 0.18, mat('#2f8fc2'), -0.45, 0.2, 0);
  return g;
}

const COAST_ROCKS = new Set(['barbados', 'afrodita', 'lemorne', 'anibare']);
function rock(id: string) {
  const g = grp();
  const color = id === 'afrodita' ? '#cfc6b8' : id === 'laasgeel' ? '#c98a5a' : id === 'lemorne' ? '#6f7a62' : '#8d8a85';
  if (COAST_ROCKS.has(id)) disc(g, 1.7, LAGOON(), 0, 0, 0, 18);
  else disc(g, 1.6, id === 'laasgeel' ? mat('#d9b07a') : GRASS(), 0, 0, 0, 14);
  boulder(g, 1.1, mat(color), 0, 0.7, 0, 1.15, 0.9, 0.9);
  if (id === 'lemorne') cone(g, 0.9, 0.5, 6, LEAF(), 0, 1.4, 0);
  if (id === 'barbados') boulder(g, 0.5, mat(color), 1.0, 0.3, 0.8, 1, 1.2, 1);
  if (id === 'sibebe' || id === 'zuma') for (const [x, z] of [[1.3, 0.8], [-1.2, 0.9]]) tree(g, x, z, 0.9);
  return g;
}

function archRock() {
  const g = grp();
  const r = mat('#c27a4f');
  disc(g, 1.7, mat('#e2b07a'), 0, 0, 0, 14);
  for (const x of [-0.95, 0.95]) boulder(g, 0.55, r, x, 0.9, 0, 0.9, 1.9, 0.9);
  const arc = add(g, new THREE.TorusGeometry(0.95, 0.32, 5, 12, Math.PI), r, 0, 1.6, 0);
  arc.scale.z = 1.2;
  boulder(g, 0.5, mat('#b06a42'), 1.4, 0.3, 0.9, 1.2, 0.7, 1);
  return g;
}

function twinPeaks() {
  const g = grp();
  disc(g, 1.7, WATER(), 0, 0, 0, 18);
  for (const [x, h] of [[-0.6, 2.8], [0.75, 2.4]] as const) cone(g, 0.75, h, 7, mat('#4f8f5a'), x, 0, 0);
  for (const [x, z] of [[-1.3, 0.8], [1.4, 0.7]]) palm(g, x, z, 0.8);
  return g;
}

function needle() {
  const g = grp();
  disc(g, 1.6, GRASS(), 0, 0, 0, 14);
  cyl(g, 0.3, 0.55, 3.2, 7, mat('#6f6a5c'));
  cone(g, 0.3, 0.6, 7, LEAF(), 0, 3.2);
  for (const [x, z] of [[1.0, 0.6], [-1.0, 0.7], [0.8, -0.9], [-0.9, -0.8], [0, 1.2]]) tree(g, x, z, 1.1);
  return g;
}

function karst() {
  const g = grp();
  disc(g, 1.8, mat('#3fb8a8', { rough: 0.3 }), 0, 0, 0, 18);
  for (const [x, z, h] of [[-0.8, -0.4, 1.9], [0.4, -0.7, 2.4], [0.9, 0.5, 1.5], [-0.3, 0.8, 1.2], [-1.3, 0.6, 0.9]] as const) {
    cyl(g, 0.3, 0.4, h, 7, mat('#8d8a80'), x, 0, z);
    ball(g, 0.36, LEAF(), x, h, z, 0.7, 7);
  }
  const boat = box(g, 0.45, 0.14, 0.18, mat('#b5523b'), 0.2, 0.05, 1.2);
  boat.rotation.y = 0.4;
  return g;
}

function coneHills() {
  const g = grp();
  disc(g, 1.7, GRASS(), 0, 0, 0, 16);
  let k = 0;
  for (let x = -1.1; x <= 1.1; x += 0.55) for (let z = -1.0; z <= 1.0; z += 0.55) {
    const c = k % 3 ? mat('#a77b4f') : mat('#7a9a52');
    ball(g, 0.3, c, x + ((k * 13) % 5) * 0.03, 0.05, z, 1.0, 8);
    k++;
  }
  return g;
}

function dunes() {
  const g = grp();
  disc(g, 1.7, mat('#e9a46a'), 0, 0, 0, 16);
  for (const [x, z, s] of [[-0.8, -0.6, 1.2], [0.8, -0.8, 1.4], [1.1, 0.7, 0.9]] as const) ball(g, 0.9 * s, mat('#e08a4a'), x, 0, z, 0.8, 8).scale.set(1.3, 0.8, 0.7);
  disc(g, 0.6, mat('#f1ead9'), -0.3, 0.6, 0.05, 12);
  for (const [x, z] of [[-0.45, 0.5], [-0.1, 0.75]]) {
    cyl(g, 0.03, 0.05, 0.5, 4, mat('#3d2d22'), x, 0.08, z);
    const b = cyl(g, 0.02, 0.02, 0.35, 4, mat('#3d2d22'), x + 0.1, 0.4, z);
    b.rotation.z = -0.8;
  }
  return g;
}

function saltFlat() {
  const g = grp();
  disc(g, 1.8, mat('#f3f6f8', { rough: 0.15, metal: 0.15 }), 0, 0, 0, 6);
  for (let i = 0; i < 5; i++) box(g, 0.03, 0.01, 1.2, mat('#d9e1e6'), -1 + i * 0.5, 0.06, 0).rotation.y = 0.5 + i * 0.2;
  const car = box(g, 0.4, 0.18, 0.22, mat('#e85d75'), 0.4, 0.06, 0.5);
  car.rotation.y = 0.4;
  box(g, 0.08, 0.3, 0.06, mat('#2f8fc2'), -0.5, 0.06, 0.2);
  box(g, 0.08, 0.28, 0.06, mat('#f2c14e'), -0.35, 0.06, 0.3);
  return g;
}

function lake(id: string) {
  const g = grp();
  disc(g, 1.4, id === 'malawi' ? LAGOON() : WATER(), 0, 0, 0.0, 20).scale.set(1.2, 1, 1);
  for (const [x, z, h] of [[-1.3, -1.3, 1.8], [0.3, -1.6, 2.4], [1.5, -0.9, 1.6]] as const) {
    cone(g, 0.8, h, 6, mat('#7a8a72'), x, 0, z);
    if (id === 'iskanderkul') cone(g, 0.35, h * 0.35, 6, SNOW(), x, h * 0.65, z);
  }
  for (const [x, z] of [[-1.5, 0.6], [1.5, 0.8]]) tree(g, x, z, 0.9);
  if (id === 'malawi') for (const [x, z] of [[-1.2, 1.2], [1.0, 1.3]]) palm(g, x, z, 0.9);
  return g;
}

function blueHole() {
  const g = grp();
  disc(g, 1.8, LAGOON(), 0, 0, 0, 24);
  const reef = add(g, new THREE.TorusGeometry(1.05, 0.14, 4, 24), mat('#c6e9d8'), 0, 0.06, 0);
  reef.rotation.x = Math.PI / 2;
  disc(g, 0.95, mat('#123f73', { rough: 0.3 }), 0, 0, 0.02, 24);
  const boat = box(g, 0.4, 0.12, 0.16, WHITE(), 1.4, 0.06, 0.6);
  boat.rotation.y = 0.8;
  return g;
}

function island(id: string) {
  const g = grp();
  disc(g, 1.8, LAGOON(), 0, 0, 0, 20);
  boulder(g, 1.0, SAND(), 0, 0, 0, 1.2, 0.35, 1.0);
  for (const [x, z] of [[-0.5, -0.2], [0.3, -0.4], [0.1, 0.3]]) palm(g, x, z, 1, 0.2);
  if (id === 'sourcedargent') for (const [x, z] of [[0.8, 0.5], [-0.9, 0.4]]) boulder(g, 0.4, mat('#d9a596'), x, 0.3, z, 1.2, 1.3, 1);
  if (id === 'bahamas') for (const [x, z] of [[0.9, 0.9], [1.2, 0.6]]) ball(g, 0.12, mat('#f2b6b0'), x, 0.08, z, 0.8, 6).scale.set(1.5, 0.8, 1);
  else {
    cyl(g, 0.02, 0.02, 0.5, 4, WHITE(), 0.7, 0.2, 0.2);
    cone(g, 0.3, 0.12, 8, mat('#e0694f'), 0.7, 0.68, 0.2);
  }
  return g;
}

function atoll() {
  const g = grp();
  disc(g, 1.8, WATER(), 0, 0, 0, 24);
  disc(g, 1.15, LAGOON(), 0, 0, 0.02, 24);
  const ring = add(g, new THREE.TorusGeometry(1.25, 0.22, 4, 24), SAND(), 0, 0.06, 0);
  ring.rotation.x = Math.PI / 2;
  ring.scale.z = 0.4;
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    palm(g, Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.8, 0.1);
  }
  return g;
}

function overwater() {
  const g = grp();
  disc(g, 1.8, LAGOON(), 0, 0, 0, 24);
  const wood = mat('#b98a5a'), thatch = mat('#d9b77a');
  box(g, 0.2, 0.06, 2.4, wood, 0, 0.25, 0);
  for (const [x, z] of [[-0.6, -0.8], [0.6, -0.4], [-0.6, 0.2], [0.6, 0.8]]) {
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cyl(g, 0.02, 0.02, 0.3, 4, wood, x + dx, 0, z + dz);
    box(g, 0.5, 0.3, 0.45, mat('#efe3cc'), x, 0.3, z);
    pyramid(g, 0.42, 0.3, thatch, x, 0.6, z);
    box(g, Math.abs(x) - 0.1, 0.05, 0.1, wood, x / 2, 0.25, z);
  }
  return g;
}

function acacia(g: G, x: number, z: number, s = 1) {
  const t = cyl(g, 0.04 * s, 0.06 * s, 0.9 * s, 5, TRUNK(), x, 0, z);
  t.rotation.z = 0.1;
  cyl(g, 0.55 * s, 0.4 * s, 0.14 * s, 8, mat('#6f9a4a'), x + 0.08, 0.9 * s, z);
}
function savanna(id: string) {
  const g = grp();
  disc(g, 1.8, mat('#d9c27a'), 0, 0, 0, 18);
  if (id === 'okavango' || id === 'loango') disc(g, 0.7, WATER(), 0.5, 0.6, 0.02, 14);
  if (id === 'loango') disc(g, 1.8, WATER(), 0, 0, -0.01, 18).scale.set(1, 1, 0.3);
  acacia(g, -0.9, -0.5, 1.3);
  acacia(g, 0.9, -0.9, 1.0);
  const el = mat('#8f9296');
  box(g, 0.5, 0.32, 0.28, el, -0.1, 0.22, 0.2);
  for (const [x, z] of [[-0.3, 0.1], [0.1, 0.1], [-0.3, 0.3], [0.1, 0.3]]) box(g, 0.08, 0.24, 0.08, el, x, 0, z);
  box(g, 0.18, 0.2, 0.18, el, 0.25, 0.36, 0.2);
  box(g, 0.06, 0.25, 0.06, el, 0.36, 0.15, 0.2);
  if (id !== 'loango') {
    const gi = mat('#e2b35a');
    box(g, 0.32, 0.2, 0.16, gi, 0.9, 0.5, 0.5);
    for (const [x, z] of [[0.8, 0.45], [1.0, 0.45], [0.8, 0.55], [1.0, 0.55]]) box(g, 0.05, 0.5, 0.05, gi, x, 0, z);
    const neck = box(g, 0.07, 0.6, 0.07, gi, 1.05, 0.65, 0.5);
    neck.rotation.z = -0.25;
    box(g, 0.15, 0.08, 0.08, gi, 1.18, 1.22, 0.5);
  }
  return g;
}

function baobabs() {
  const g = grp();
  disc(g, 1.8, mat('#d9a77a'), 0, 0, 0, 16);
  box(g, 0.5, 0.02, 3.4, mat('#c48a5a'), 0, 0.06, 0).rotation.y = 0.2;
  for (const [x, z, h] of [[-0.7, -1.0, 2.4], [-0.6, 0.0, 2.0], [-0.5, 1.0, 2.2], [0.75, -0.6, 2.3], [0.85, 0.6, 1.9]] as const) {
    cyl(g, 0.22, 0.3, h, 7, mat('#a3826a'), x, 0, z);
    for (let i = 0; i < 4; i++) {
      const b = cyl(g, 0.03, 0.05, 0.4, 4, mat('#a3826a'), x + Math.cos(i * 1.6) * 0.15, h - 0.05, z + Math.sin(i * 1.6) * 0.15);
      b.rotation.set(Math.sin(i * 1.6) * 0.7, 0, -Math.cos(i * 1.6) * 0.7);
    }
    ball(g, 0.35, LEAF2(), x, h + 0.35, z, 0.4, 6);
  }
  return g;
}

function bigTree(id: string) {
  const g = grp();
  disc(g, 1.7, id === 'arbolvida' ? mat('#e4c58e') : GRASS(), 0, 0, 0, 16);
  cyl(g, 0.22, 0.4, 1.6, 7, TRUNK());
  for (const [x, y, z, r] of [[0, 2.0, 0, 0.9], [-0.6, 1.7, 0.2, 0.6], [0.6, 1.75, -0.1, 0.65], [0.1, 1.6, 0.6, 0.55]]) ball(g, r, LEAF(), x, y, z, 0.8, 7);
  if (id === 'sapo') for (const [x, z] of [[1.3, 0.8], [-1.2, 0.9], [1.2, -1.1], [-1.3, -0.9]]) tree(g, x, z, 1.2);
  return g;
}

function hole() {
  const g = grp();
  disc(g, 1.7, GRASS(), 0, 0, 0, 18);
  disc(g, 0.85, mat('#3d3a33'), 0, 0, 0.02, 18);
  disc(g, 0.7, LAGOON(), 0, 0, 0.04, 18);
  const lad = box(g, 0.12, 1.0, 0.06, mat('#8a6a4a'), 0.6, 0, 0);
  lad.rotation.z = 0.5;
  for (const [x, z] of [[-1.3, 0.8], [1.2, -1.0], [-1.1, -1.0]]) palm(g, x, z, 1);
  return g;
}

function rings() {
  const g = grp();
  disc(g, 1.8, mat('#e4b77e'), 0, 0, 0, 24);
  for (const [r, c] of [[1.5, '#b07a4f'], [1.05, '#c9925f'], [0.6, '#a06a42']] as const) {
    const t = add(g, new THREE.TorusGeometry(r, 0.12, 4, 28), mat(c), 0, 0.08, 0);
    t.rotation.x = Math.PI / 2;
    t.scale.z = 0.6;
  }
  return g;
}

function mudHouses() {
  const g = grp();
  disc(g, 1.6, mat('#c9a77a'), 0, 0, 0, 14);
  const mud = mat('#b17b4e'), thatch = mat('#d6b06a');
  for (const [x, z, s] of [[-0.6, -0.5, 1.1], [0.5, -0.6, 1], [0.7, 0.5, 0.9], [-0.5, 0.6, 0.95], [0.05, 0.05, 1.2]] as const) {
    cyl(g, 0.3 * s, 0.34 * s, 0.9 * s, 10, mud, x, 0, z);
    cone(g, 0.4 * s, 0.45 * s, 10, thatch, x, 0.9 * s, z);
  }
  return g;
}

function stilts() {
  const g = grp();
  disc(g, 1.8, mat('#5fa7a0', { rough: 0.3 }), 0, 0, 0, 18);
  const wood = mat('#8a6a4a'), thatch = mat('#c9a36a');
  for (const [x, z] of [[-0.7, -0.6], [0.6, -0.7], [0.8, 0.5], [-0.6, 0.6]]) {
    for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) cyl(g, 0.025, 0.025, 0.45, 4, wood, x + dx, 0, z + dz);
    box(g, 0.55, 0.35, 0.5, mat('#a5825e'), x, 0.45, z);
    pediment(g, 0.6, 0.35, 0.65, thatch, x, 0.8, z);
  }
  for (const [x, z, r] of [[0, 0, 0.3], [0.1, 1.3, -0.4]]) box(g, 0.5, 0.06, 0.12, wood, x, 0.06, z).rotation.y = r;
  return g;
}

function shibam() {
  const g = grp();
  const mud = ['#c9a77a', '#bf9c6f', '#d4b386'];
  let k = 0;
  for (let x = -0.9; x <= 0.9; x += 0.6) for (let z = -0.9; z <= 0.9; z += 0.6) {
    const h = 1.6 + ((k * 7) % 5) * 0.2;
    box(g, 0.5, h, 0.5, mat(mud[k % 3]), x, 0, z);
    box(g, 0.52, 0.18, 0.52, WHITE(), x, h - 0.18, z);
    for (const y of [0.5, 1.0]) box(g, 0.08, 0.1, 0.02, GLOWWIN(), x, y, z + 0.26);
    k++;
  }
  return g;
}

function whiteBlue() {
  const g = grp();
  const hill = cyl(g, 0.9, 1.7, 1.2, 8, mat('#a3b57a'));
  hill.scale.z = 0.8;
  const W = WHITE(), roof = mat('#8a5a3e');
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const x = -0.9 + i * 0.55 + row * 0.25, y = row * 0.38, z = 0.95 - row * 0.4;
    box(g, 0.48, 0.42, 0.4, W, x, y, z);
    pediment(g, 0.48, 0.15, 0.42, roof, x, y + 0.42, z);
    for (const dx of [-0.12, 0, 0.12]) box(g, 0.06, 0.1, 0.02, DARK(), x + dx, y + 0.2, z + 0.21);
  }
  box(g, 0.9, 0.35, 0.6, mat('#cfc6b3'), 0.2, 1.2, -0.3);
  return g;
}

function windmills() {
  const g = grp();
  box(g, 3.4, 0.06, 0.5, WATER(), 0, 0, 0.6);
  disc(g, 1.7, GRASS(), 0, 0, -0.01, 18);
  for (const [x, z] of [[-1.1, -0.4], [0, -0.7], [1.1, -0.4]]) {
    cyl(g, 0.22, 0.38, 1.4, 8, mat('#6e5a48'), x, 0, z);
    cone(g, 0.28, 0.35, 8, mat('#3d3a35'), x, 1.4, z);
    for (let i = 0; i < 4; i++) {
      const s = box(g, 0.08, 0.85, 0.03, mat('#efe6d6'), x, 0, z + 0.3);
      s.position.y = 1.45;
      s.rotation.z = i * (Math.PI / 2) + 0.4;
      s.translateY(0.42);
    }
  }
  return g;
}

function harbor() {
  const g = grp();
  box(g, 3.4, 0.06, 0.7, WATER(), 0, 0, 0.75);
  const cols = ['#f2c14e', '#e0694f', '#5aa9d6', '#f39c6b', '#7fc8a0', '#ef8fa0'];
  for (let i = 0; i < 6; i++) {
    const h = 1.0 + (i % 3) * 0.2;
    box(g, 0.48, h, 0.6, mat(cols[i]), -1.25 + i * 0.5, 0, -0.2);
    pediment(g, 0.6, 0.3, 0.48, mat('#9b4a3a'), -1.25 + i * 0.5, h, -0.2);
    box(g, 0.1, 0.14, 0.02, GLOWWIN(), -1.25 + i * 0.5, h * 0.6, 0.11);
  }
  for (const [x, c] of [[-0.6, '#e0694f'], [0.8, '#2f8fc2']] as const) {
    box(g, 0.6, 0.14, 0.2, mat('#7a5636'), x, 0.04, 0.75);
    cyl(g, 0.015, 0.015, 0.6, 4, mat(c), x, 0.18, 0.75);
  }
  return g;
}

function yurtLake() {
  const g = grp();
  disc(g, 1.8, GRASS(), 0, 0, 0, 18);
  disc(g, 1.0, WATER(), -0.4, -0.5, 0.02, 18).scale.set(1.3, 1, 0.8);
  for (const [x, z] of [[0.8, 0.5], [0.2, 1.0], [1.2, -0.2]]) {
    cyl(g, 0.3, 0.3, 0.3, 12, WHITE(), x, 0, z);
    cone(g, 0.34, 0.22, 12, mat('#e3ddd0'), x, 0.3, z);
    box(g, 0.1, 0.18, 0.02, mat('#c9533e'), x, 0, z + 0.3);
  }
  for (const [x, z] of [[-1.5, -1.5], [0.6, -1.7]]) {
    cone(g, 0.8, 1.6, 6, mat('#7a8a72'), x, 0, z);
    cone(g, 0.32, 0.55, 6, SNOW(), x, 1.05, z);
  }
  return g;
}

/** Arquetipo → constructor. */
export const ARCHETYPES: Record<string, (id: string) => THREE.Group> = {
  'mosque-blue': mosque({ wall: '#3a8fc9', dome: '#4fc2d9', minarets: 2, trim: '#e9dfcb' }),
  'mosque-gold': (id) => {
    const g = mosque({ wall: '#f2efe8', dome: '#e8b54a', minarets: 1, tall: 2.4 })();
    if (id) disc(g, 1.8, WATER(), 0, 0.6, -0.03, 20).scale.set(1.1, 1, 0.5);
    return g;
  },
  'mosque-white': mosque({ wall: '#f3efe6', dome: '#cfc3a8', minarets: 1, tall: 3.0, square: true, trim: '#3f9a6f' }),
  'mosque-red': mosque({ wall: '#b4553e', dome: '#f3efe9', minarets: 4, tall: 2.2 }),
  registan: () => registan(),
  hagia: () => hagia(),
  adobe,
  'church-stone': churchStone,
  'church-white': () => churchWhite(),
  'church-gothic': churchGothic('#b4654a'),
  'church-dome': churchDome,
  'church-wood': () => churchWood(),
  'church-yellow': () => churchYellow(),
  'church-green': () => churchGreen(),
  'church-basalt': () => churchBasalt(),
  'church-cliff': churchOnCliff,
  'cliff-temple': () => cliffTemple(),
  lakechurch: () => lakeChurch(),
  'orthodox-gold': () => orthodoxGold(),
  'orthodox-white': () => orthodoxWhite(),
  'temple-classic': () => templeClassic(),
  ruins,
  'ruins-round': () => ruinsRound(),
  ziggurat: () => ziggurat(),
  'palace-asian': () => palaceAsian(),
  'stupa-gold': () => stupaGold(),
  prang: () => prang(),
  khmer: () => khmer(),
  borobudur: () => borobudur(),
  maya: () => maya(),
  'pyramids-nubian': () => pyramidsNubian(),
  moai: () => moai(),
  petra,
  rockchurch: () => rockChurch(),
  sigiriya: () => sigiriya(),
  'castle-red': castle('#c0624a', '#6f3a2c'),
  'castle-stone': castle('#b8ad9a', '#6f7782', true),
  'castle-white': castle('#f1ece2', '#c95a3e'),
  fort,
  walled,
  'palace-yellow': () => palaceYellow(),
  'palace-white': () => palaceWhite(),
  'palace-gothic': () => palaceGothic(),
  'palace-pink': () => palacePink(),
  capitol: () => capitol(),
  gables: () => gables(),
  'tower-brick': () => towerBrick(),
  'tower-tv': () => towerTv(),
  'tower-gold': () => towerGold(),
  kuwaittowers: () => kuwaitTowers(),
  twintowers: () => twinTowers(),
  mbs: () => mbs(),
  flames: () => flames(),
  desertrose: () => desertRose(),
  modernwing: () => modernWing(),
  atomium: () => atomium(),
  obelisk: () => obelisk(),
  statue,
  'statue-horse': () => statueHorse(),
  leaves: () => leaves(),
  lighthouse: () => lighthouse(),
  canal: () => canal(),
  trilithon: () => trilithon(),
  'bridge-arch': () => bridgeArch(),
  'bridge-gothic': () => bridgeGothic(),
  'mountain-snow': mountain,
  volcano: volcano(false),
  'volcano-green': volcano(true),
  'crater-fire': craterFire,
  'crater-lake': () => craterLake(),
  waterfall,
  'waterfall-wide': () => waterfallWide(),
  tepui: () => tepui(),
  mesa,
  cliffs: () => cliffs(),
  fjord: () => fjord(),
  rock,
  twinpeaks: () => twinPeaks(),
  'arch-rock': () => archRock(),
  needle: () => needle(),
  karst: () => karst(),
  conehills: () => coneHills(),
  dunes: () => dunes(),
  saltflat: () => saltFlat(),
  lake,
  bluehole: () => blueHole(),
  island,
  atoll: () => atoll(),
  overwater: () => overwater(),
  savanna,
  baobabs: () => baobabs(),
  bigtree: bigTree,
  hole: () => hole(),
  rings: () => rings(),
  mudhouses: () => mudHouses(),
  stilts: () => stilts(),
  shibam: () => shibam(),
  whiteblue: () => whiteBlue(),
  windmills: () => windmills(),
  harbor: () => harbor(),
  'yurt-lake': () => yurtLake(),
};
