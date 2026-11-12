import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { BUILDERS, allMaterials, mat } from './monuments';
import { LANDMARKS, type Continent, type Landmark } from './landmarks';

/**
 * Mundo ATLAS: diorama 3D low-poly con islas de hexágonos, mini-ciudades, mar animado,
 * barcos, aviones y nubes. Sin modelos externos: todo se genera en el dispositivo.
 */

export interface WorldApi {
  dispose(): void;
  flyTo(id: string): void;
  zoom(factor: number): void;
  recenter(): void;
  setTheme(dark: boolean): void;
  setLabels(els: Map<string, HTMLElement>): void;
}

const HEX_R = 1;
const SQ3 = Math.sqrt(3);
const WATER_Y = 0.18;

/** Ruido determinista (hash) para variaciones sin aleatoriedad entre aperturas. */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

const HOT: Continent[] = ['af'];
const TROPIC: Continent[] = ['sa', 'oc', 'af'];

export function createWorld(container: HTMLElement, opts: { dark: boolean; onSelect: (id: string | null) => void; visited: Set<string> }): WorldApi {
  const W = () => container.clientWidth;
  const H = () => container.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W() / H(), 1, 500);
  const HOME = { target: new THREE.Vector3(-1, 0, -1), pos: new THREE.Vector3(-1, 62, 58) };
  camera.position.copy(HOME.pos);

  const controls = new MapControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.minDistance = 10;
  controls.maxDistance = 110;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.2;
  controls.zoomToCursor = true;
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.update();

  // ── Luz ──
  const hemi = new THREE.HemisphereLight('#fdf8ee', '#9cc7c9', 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dd', 2.3);
  sun.position.set(-30, 55, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 32, bottom: -32, near: 10, far: 160 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // ── Mar animado ──
  const waterUniforms = { uTime: { value: 0 } };
  const waterMat = new THREE.MeshStandardMaterial({ color: '#5cc6d6', roughness: 0.35, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.94 });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.z += sin(position.x * 0.45 + uTime * 1.1) * 0.09 + cos(position.y * 0.5 + uTime * 0.8) * 0.08;`);
  };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(170, 120, 110, 80), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  water.receiveShadow = true;
  scene.add(water);
  // fondo marino (más oscuro) para dar profundidad
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(170, 120), new THREE.MeshStandardMaterial({ color: '#2f8fa8' }));
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -1.6;
  scene.add(seabed);

  // ── Islas de hexágonos ──
  const byCont = new Map<Continent, Landmark[]>();
  for (const l of LANDMARKS) byCont.set(l.continent, [...(byCont.get(l.continent) ?? []), l]);
  const links: [Landmark, Landmark][] = [];
  for (const list of byCont.values()) {
    for (let i = 1; i < list.length; i++) {
      // conecta cada monumento con el más cercano ya incluido (árbol)
      let best = list[0], bd = Infinity;
      for (let j = 0; j < i; j++) {
        const d = Math.hypot(list[i].pos[0] - list[j].pos[0], list[i].pos[1] - list[j].pos[1]);
        if (d < bd) [bd, best] = [d, list[j]];
      }
      links.push([list[i], best]);
    }
  }
  type Tile = { x: number; z: number; q: number; r: number; top: number; kind: 'grass' | 'sand' | 'plaza' | 'desert'; cont: Continent; near: number; lm: Landmark };
  const tiles = new Map<string, Tile>();
  const key = (q: number, r: number) => `${q},${r}`;
  for (let r = -20; r <= 20; r++) {
    for (let q = -40; q <= 40; q++) {
      const x = HEX_R * SQ3 * (q + r / 2), z = HEX_R * 1.5 * r;
      if (Math.abs(x) > 44 || Math.abs(z) > 27) continue;
      let near = Infinity, lm = LANDMARKS[0];
      for (const l of LANDMARKS) {
        const d = Math.hypot(x - l.pos[0], z - l.pos[1]);
        if (d < near) [near, lm] = [d, l];
      }
      let link = Infinity;
      for (const [a, b] of links) link = Math.min(link, segDist(x, z, a.pos[0], a.pos[1], b.pos[0], b.pos[1]));
      const n = noise(x * 0.18, z * 0.18) - 0.5;
      const land = Math.min(near - 4.4, link - 2.7) + n * 2.2 < 0;
      if (!land) continue;
      tiles.set(key(q, r), { x, z, q, r, top: 0, kind: 'grass', cont: lm.continent, near, lm });
    }
  }
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  for (const t of tiles.values()) {
    const coast = NB.some(([dq, dr]) => !tiles.has(key(t.q + dq, t.r + dr)));
    if (t.near < 2.3) t.kind = 'plaza';
    else if (coast) t.kind = 'sand';
    else if (HOT.includes(t.cont)) t.kind = 'desert';
    t.top = t.kind === 'sand' ? 0.34 : t.kind === 'plaza' ? 0.56 : 0.5 + hash(t.q, t.r) * 0.16;
  }
  const tileGeo = new THREE.CylinderGeometry(HEX_R * 0.985, HEX_R, 1, 6);
  const tileMesh = new THREE.InstancedMesh(tileGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), tiles.size);
  tileMesh.castShadow = false;
  tileMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const PAL = {
    grass: ['#9fd17f', '#93c873', '#a9d88b', '#8cc26e'],
    sand: ['#efdcab', '#ead39c'],
    plaza: ['#ece5d6', '#e3dbc9'],
    desert: ['#ecd197', '#e4c584', '#f0d9a6'],
  };
  let ti = 0;
  for (const t of tiles.values()) {
    const h = t.top + 1.6;
    dummy.position.set(t.x, t.top - h / 2, t.z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    tileMesh.setMatrixAt(ti, dummy.matrix);
    const p = PAL[t.kind];
    tileMesh.setColorAt(ti, col.set(p[Math.floor(hash(t.q * 3, t.r * 7) * p.length)]));
    ti++;
  }
  scene.add(tileMesh);

  // ── Mini-ciudades (casitas) y árboles ──
  const houses: { x: number; z: number; y: number; s: number; rot: number; wall: string; roof: string }[] = [];
  const trees: { x: number; z: number; y: number; s: number; palm: boolean }[] = [];
  const WALLS = ['#f6f0e4', '#f3dcc6', '#dcebf2', '#e9f1dc', '#f6e3d6', '#ece4f2'];
  const ROOFS = ['#e0694f', '#2f8fc2', '#e4a83c', '#4f9a74', '#c95c7a', '#5b6fd6'];
  for (const t of tiles.values()) {
    if (t.kind === 'plaza') continue;
    const r1 = hash(t.q * 11, t.r * 5), r2 = hash(t.q * 7, t.r * 13);
    if (t.kind !== 'sand' && t.near < 4.2 && r1 < 0.7) {
      const n = r2 < 0.35 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const ox = n === 2 ? (k ? 0.35 : -0.35) : 0;
        houses.push({ x: t.x + ox, z: t.z + (k ? 0.25 : -0.15), y: t.top, s: 0.45 + hash(t.q + k, t.r) * 0.35, rot: Math.floor(r2 * 6) * (Math.PI / 3), wall: WALLS[Math.floor(r1 * 97) % WALLS.length], roof: ROOFS[Math.floor(r2 * 89) % ROOFS.length] });
      }
    } else if (t.kind === 'sand' ? r1 < 0.18 && TROPIC.includes(t.cont) : r1 < (t.kind === 'desert' ? 0.12 : 0.55)) {
      trees.push({ x: t.x + (r2 - 0.5) * 0.6, z: t.z + (r1 - 0.5) * 0.6, y: t.top, s: 0.7 + r2 * 0.6, palm: TROPIC.includes(t.cont) && (t.kind !== 'grass' || r2 < 0.4) });
    }
  }
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.85 }), houses.length);
  const roofMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 0.55, 4), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), houses.length);
  const winMat = new THREE.MeshStandardMaterial({ color: '#3d4f63', emissive: new THREE.Color('#ffcf6b'), emissiveIntensity: 0, flatShading: true });
  const winMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.2, 0.02), winMat, houses.length * 2);
  houses.forEach((h, i) => {
    const wh = h.s * 1.1;
    dummy.position.set(h.x, h.y + wh / 2, h.z);
    dummy.scale.set(h.s, wh, h.s);
    dummy.rotation.set(0, h.rot, 0);
    dummy.updateMatrix();
    wallMesh.setMatrixAt(i, dummy.matrix);
    wallMesh.setColorAt(i, col.set(h.wall));
    dummy.position.set(h.x, h.y + wh + 0.27 * h.s, h.z);
    dummy.scale.set(h.s, h.s, h.s);
    dummy.rotation.set(0, h.rot + Math.PI / 4, 0);
    dummy.updateMatrix();
    roofMesh.setMatrixAt(i, dummy.matrix);
    roofMesh.setColorAt(i, col.set(h.roof));
    for (let k = 0; k < 2; k++) {
      const off = new THREE.Vector3((k ? 0.2 : -0.2) * h.s, wh * 0.55, h.s / 2 + 0.012).applyAxisAngle(new THREE.Vector3(0, 1, 0), h.rot);
      dummy.position.set(h.x + off.x, h.y + off.y, h.z + off.z);
      dummy.scale.set(h.s, h.s, h.s);
      dummy.rotation.set(0, h.rot, 0);
      dummy.updateMatrix();
      winMesh.setMatrixAt(i * 2 + k, dummy.matrix);
    }
  });
  for (const m of [wallMesh, roofMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }
  scene.add(winMesh);

  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 1, 5), mat('#8a6a4a'), trees.length);
  const crownMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), trees.length);
  const GREENS = ['#4f9a5a', '#5aa865', '#3f8a54', '#68b06a'];
  trees.forEach((t, i) => {
    const th = (t.palm ? 0.9 : 0.45) * t.s;
    dummy.position.set(t.x, t.y + th / 2, t.z);
    dummy.scale.set(t.s, th, t.s);
    dummy.rotation.set(t.palm ? 0.12 : 0, 0, t.palm ? 0.1 : 0);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
    dummy.position.set(t.x, t.y + th + (t.palm ? 0.05 : 0.3) * t.s, t.z);
    dummy.scale.set(t.s * (t.palm ? 1.3 : 1), t.s * (t.palm ? 0.35 : 1.15), t.s * (t.palm ? 1.3 : 1));
    dummy.rotation.set(0, hash(i, 3) * 6, 0);
    dummy.updateMatrix();
    crownMesh.setMatrixAt(i, dummy.matrix);
    crownMesh.setColorAt(i, col.set(t.palm ? '#5cae6a' : GREENS[i % GREENS.length]));
  });
  for (const m of [trunkMesh, crownMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // ── Monumentos ──
  const hitboxes: THREE.Mesh[] = [];
  const monuments = new Map<string, THREE.Group>();
  const anchors = new Map<string, THREE.Vector3>();
  for (const l of LANDMARKS) {
    const g = BUILDERS[l.id]?.();
    if (!g) continue;
    const ground = Math.max(...[...tiles.values()].filter((t) => Math.hypot(t.x - l.pos[0], t.z - l.pos[1]) < 1.2).map((t) => t.top), 0.56);
    g.position.set(l.pos[0], ground, l.pos[1]);
    g.rotation.y = -0.35;
    g.userData.id = l.id;
    scene.add(g);
    monuments.set(l.id, g);
    const bb = new THREE.Box3().setFromObject(g);
    const size = bb.getSize(new THREE.Vector3());
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.6, size.y + 0.4, size.z + 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(bb.getCenter(new THREE.Vector3()));
    hit.userData.id = l.id;
    scene.add(hit);
    hitboxes.push(hit);
    anchors.set(l.id, new THREE.Vector3(l.pos[0], bb.max.y + 0.5, l.pos[1]));
  }

  // anillo de selección
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.07, 6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }));
  ring.rotation.x = Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  // ── Barcos ──
  const boats: { g: THREE.Group; cx: number; cz: number; rx: number; rz: number; speed: number; phase: number }[] = [];
  const BOAT_ROUTES: [number, number, number, number][] = [[-18, -8, 7, 4], [8, 13, 9, 3.5], [14, -14, 5, 3], [-8, 5, 6, 3], [20, 13, 4, 3], [-34, 3, 4, 7], [28, 6, 4, 5]];
  for (const [cx, cz, rx, rz] of BOAT_ROUTES) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.34), mat('#f6f2ea'));
    hull.position.y = 0.11;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.36), mat('#e0694f'));
    stripe.position.y = 0.05;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 3), mat('#ffffff'));
    sail.position.set(0.05, 0.6, 0);
    sail.scale.z = 0.25;
    g.add(hull, stripe, sail);
    g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    scene.add(g);
    boats.push({ g, cx, cz, rx, rz, speed: 0.05 + hash(cx, cz) * 0.05, phase: hash(cz, cx) * 6 });
  }

  // ── Aviones entre continentes ──
  const planes: { g: THREE.Group; a: THREE.Vector3; b: THREE.Vector3; t: number; speed: number; trail: THREE.Mesh }[] = [];
  const ROUTES: [string, string][] = [['eiffel', 'liberty'], ['taj', 'opera'], ['cristo', 'piramides'], ['muralla', 'basilio']];
  for (const [from, to] of ROUTES) {
    const A = LANDMARKS.find((l) => l.id === from)!, B = LANDMARKS.find((l) => l.id === to)!;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.8, 3, 6), mat('#ffffff', { rough: 0.4 }));
    body.rotation.z = Math.PI / 2;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 1.2), mat('#e8eef5'));
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 0.03), mat('#2f8fc2'));
    tail.position.set(-0.45, 0.17, 0);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.45), mat('#e8eef5'));
    stab.position.set(-0.45, 0.05, 0);
    g.add(body, wing, tail, stab);
    g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    scene.add(g);
    const trail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
    scene.add(trail);
    planes.push({ g, a: new THREE.Vector3(A.pos[0], 0, A.pos[1]), b: new THREE.Vector3(B.pos[0], 0, B.pos[1]), t: hash(A.pos[0], B.pos[1]), speed: 0.025 + hash(B.pos[0], A.pos[1]) * 0.015, trail });
  }

  // ── Nubes ──
  const clouds: THREE.Group[] = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, transparent: true, opacity: 0.78, depthWrite: false });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(hash(i, 1) * 3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + hash(i, k) * 0.5, 0), cloudMat);
      m.position.set(k * 0.7 - n * 0.35, hash(k, i) * 0.4, (hash(i * k, 2) - 0.5) * 0.8);
      m.castShadow = true;
      g.add(m);
    }
    g.position.set(-45 + hash(i, 9) * 90, 20 + hash(i, 4) * 6, -26 + hash(9, i) * 52);
    g.userData.speed = 0.35 + hash(i, 5) * 0.45;
    scene.add(g);
    clouds.push(g);
  }

  // ── Estrellas (noche) ──
  const starGeo = new THREE.BufferGeometry();
  const sp: number[] = [];
  for (let i = 0; i < 500; i++) {
    const th = hash(i, 1) * Math.PI * 2, ph = hash(i, 2) * Math.PI * 0.45;
    sp.push(Math.cos(th) * Math.sin(ph) * 220, Math.cos(ph) * 220, Math.sin(th) * Math.sin(ph) * 220);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
  scene.add(stars);

  // ── Tema ──
  function setTheme(dark: boolean) {
    const sky = new THREE.Color(dark ? '#0a1a2e' : '#cdebf0');
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, 110, 230);
    hemi.color.set(dark ? '#7f9cc9' : '#fdf8ee');
    hemi.groundColor.set(dark ? '#0b2236' : '#9cc7c9');
    hemi.intensity = dark ? 0.8 : 1.25;
    sun.color.set(dark ? '#9fb7ff' : '#fff3dd');
    sun.intensity = dark ? 0.55 : 2.3;
    waterMat.color.set(dark ? '#2a6f98' : '#5cc6d6');
    (seabed.material as THREE.MeshStandardMaterial).color.set(dark ? '#0d2f48' : '#2f8fa8');
    stars.visible = dark;
    winMat.emissiveIntensity = dark ? 1.4 : 0;
    for (const m of allMaterials()) if (m.userData.glow) m.emissiveIntensity = dark ? 1.3 : 0;
    cloudMat.color.set(dark ? '#7f8fb0' : '#ffffff');
  }
  setTheme(opts.dark);

  // ── Etiquetas HTML proyectadas ──
  let labels = new Map<string, HTMLElement>();
  const v = new THREE.Vector3();
  function updateLabels() {
    const w = W(), h = H();
    const dist = camera.position.distanceTo(controls.target);
    const scale = THREE.MathUtils.clamp(48 / dist, 0.75, 1.15);
    const compact = dist > 52;
    for (const [id, el] of labels) {
      const a = anchors.get(id);
      if (!a) continue;
      v.copy(a).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      el.style.opacity = visible ? '1' : '0';
      el.classList.toggle('compact', compact && !el.classList.contains('on'));
      el.style.pointerEvents = visible ? 'auto' : 'none';
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%) scale(${scale})`;
    }
  }

  // ── Selección por toque ──
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number; t: number } | null = null;
  const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY, t: performance.now() });
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    down = null;
    if (moved > 8 || !quick) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitboxes, false)[0];
    if (hit) flyTo(hit.object.userData.id as string);
    else {
      ring.visible = false;
      opts.onSelect(null);
    }
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ── Vuelo de cámara ──
  let tween: { from: [THREE.Vector3, THREE.Vector3]; to: [THREE.Vector3, THREE.Vector3]; t0: number; ms: number } | null = null;
  function animateTo(target: THREE.Vector3, pos: THREE.Vector3, ms = 1100) {
    tween = { from: [controls.target.clone(), camera.position.clone()], to: [target, pos], t0: performance.now(), ms };
  }
  function flyTo(id: string) {
    const l = LANDMARKS.find((x) => x.id === id);
    const g = monuments.get(id);
    if (!l || !g) return;
    const target = new THREE.Vector3(l.pos[0], 2.2, l.pos[1] + 1.2);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const pos = target.clone().add(dir.multiplyScalar(21));
    if (pos.y < 9) pos.y = 9;
    animateTo(target, pos);
    ring.position.set(l.pos[0], g.position.y + 0.06, l.pos[1]);
    ring.visible = true;
    opts.onSelect(id);
  }
  function zoom(f: number) {
    const dir = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(dir.length() * f, controls.minDistance, controls.maxDistance);
    animateTo(controls.target.clone(), controls.target.clone().add(dir.setLength(len)), 450);
  }
  function recenter() {
    ring.visible = false;
    opts.onSelect(null);
    animateTo(HOME.target.clone(), HOME.pos.clone(), 1000);
  }

  // Límites del mundo para no perderse al arrastrar.
  controls.addEventListener('change', () => {
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, -40, 40), cz = THREE.MathUtils.clamp(t.z, -24, 24);
    if (cx !== t.x || cz !== t.z) {
      camera.position.x += cx - t.x;
      camera.position.z += cz - t.z;
      t.set(cx, t.y, cz);
    }
  });

  // ── Bucle ──
  const clock = new THREE.Clock();
  let raf = 0;
  let running = true;
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    waterUniforms.uTime.value = t;
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.ms);
      const e = ease(k);
      controls.target.lerpVectors(tween.from[0], tween.to[0], e);
      camera.position.lerpVectors(tween.from[1], tween.to[1], e);
      if (k >= 1) tween = null;
    }
    controls.update();
    for (const b of boats) {
      const a = b.phase + t * b.speed;
      b.g.position.set(b.cx + Math.cos(a) * b.rx, WATER_Y + Math.sin(t * 2 + b.phase) * 0.04, b.cz + Math.sin(a) * b.rz);
      b.g.rotation.y = -Math.atan2(Math.cos(a) * b.rz, -Math.sin(a) * b.rx);
      b.g.rotation.z = Math.sin(t * 1.6 + b.phase) * 0.05;
    }
    for (const p of planes) {
      p.t = (p.t + dt * p.speed) % 2;
      const k = p.t < 1 ? p.t : 2 - p.t; // ida y vuelta
      const dirSign = p.t < 1 ? 1 : -1;
      const pos = p.a.clone().lerp(p.b, k);
      pos.y = 6 + Math.sin(k * Math.PI) * 6;
      const ahead = p.a.clone().lerp(p.b, Math.min(1, Math.max(0, k + 0.01 * dirSign)));
      ahead.y = 6 + Math.sin(Math.min(1, Math.max(0, k + 0.01 * dirSign)) * Math.PI) * 6;
      p.g.position.copy(pos);
      p.g.lookAt(ahead);
      p.g.rotateY(-Math.PI / 2);
      p.trail.position.copy(pos.clone().lerp(ahead, -60));
      p.trail.lookAt(pos);
      p.trail.rotateY(Math.PI / 2);
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 50) c.position.x = -50;
    }
    if (ring.visible) {
      const s = 1 + Math.sin(t * 3) * 0.06;
      ring.scale.set(s, s, s);
    }
    renderer.render(scene, camera);
    updateLabels();
  }
  frame();

  const onResize = () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);
  const onVis = () => {
    if (document.visibilityState === 'hidden') {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      clock.getDelta();
      frame();
    }
  };
  document.addEventListener('visibilitychange', onVis);

  return {
    flyTo,
    zoom,
    recenter,
    setTheme,
    setLabels(els) {
      labels = els;
      for (const [id, el] of els) el.classList.toggle('visited', opts.visited.has(LANDMARKS.find((l) => l.id === id)?.countryCode ?? ''));
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
