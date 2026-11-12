// Pruebas de extremo a extremo de ATLAS sobre la build de producción (npm run build).
// Uso: npm run e2e   (arranca vite preview y el servidor de sincronización de referencia)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'tests/e2e/out');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const PORT = 4179;
const SYNC_PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const TOKEN = 'prueba-e2e-clave-larga';

const procs = [];
function start(cmd, args, env = {}, ready) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    procs.push(p);
    const onData = (d) => { if (ready.test(String(d))) resolve(p); };
    p.stdout.on('data', onData);
    p.stderr.on('data', onData);
    p.on('exit', (c) => c && reject(new Error(`${cmd} salió con ${c}`)));
    setTimeout(() => reject(new Error(`timeout arrancando ${cmd}`)), 20000);
  });
}

const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e?.stack || e) });
    try { await globalThis.__page?.()?.screenshot({ path: join(out, `FAIL-${results.length}.png`) }); } catch {}
    console.log(`  ✗ ${name}\n    ${String(e?.message || e).split('\n').slice(0, 6).join('\n    ')}`);
  }
}

const iphone = devices['iPhone 13 Mini'];
if (!iphone) throw new Error('Perfil de iPhone no encontrado en Playwright');
const consoleErrors = [];

async function newDevice(browser, name, extra = {}) {
  const ctx = await browser.newContext({ ...iphone, locale: 'es-ES', timezoneId: 'Europe/Madrid', acceptDownloads: true, ...extra });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/tile\.openstreetmap|ERR_INTERNET_DISCONNECTED|Failed to load resource|net::ERR/.test(m.text())) consoleErrors.push(`[${name}] ${m.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`[${name}] pageerror ${e.message}`));
  return { ctx, page };
}

const tab = (page, name) => page.locator('nav.tabs').getByRole('link', { name, exact: true }).click();
const shot = async (page, name) => { await page.waitForTimeout(400); return page.screenshot({ path: join(out, `${name}.png`), fullPage: false }); };
const sheetSave = (page) => page.locator('.sheet-head').getByRole('button', { name: /^(Guardar|Crear)$/ }).click();

async function createTrip(page, { name, stages, start, end, companions = [], budget, confirmed = true, origin }) {
  await page.goto(`${BASE}/viajes`);
  await page.getByRole('button', { name: 'Crear viaje' }).first().click();
  // Escribe letra a letra (como en el iPhone) y comprueba que el teclado no se cierra.
  await page.locator('#t-name').pressSequentially(name, { delay: 15 });
  assert.equal(await page.evaluate(() => document.activeElement?.id), 't-name', 'el campo perdió el foco al escribir');
  assert.equal(await page.locator('#t-name').inputValue(), name);
  if (origin) {
    await page.locator('#t-origin').fill('');
    await page.locator('#t-origin').pressSequentially(origin, { delay: 15 });
    assert.equal(await page.evaluate(() => document.activeElement?.id), 't-origin', 'el campo origen perdió el foco');
  }
  for (let i = 0; i < stages.length; i++) {
    if (i > 0) await page.getByRole('button', { name: 'Añadir destino' }).click();
    await page.getByLabel(`Destino ${i + 1}`).fill(stages[i]);
  }
  if (start) await page.locator('#t-start').fill(start);
  if (end) await page.locator('#t-end').fill(end);
  if (confirmed) await page.getByRole('button', { name: 'Confirmado' }).click();
  for (const c of companions) {
    await page.getByLabel('Nombre del acompañante').fill(c);
    await page.getByLabel('Nombre del acompañante').press('Enter');
  }
  if (budget) await page.locator('#t-budget').fill(budget);
  await sheetSave(page);
  await page.waitForURL(/\/viajes\/[^/]+$/);
  return page.url().split('/').pop();
}

(async () => {
  console.log('Arrancando servidores…');
  await start('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {}, /localhost/);
  rmSync(join(root, 'server/data-e2e'), { recursive: true, force: true });
  await start('node', ['server/sync-server.mjs'], { ATLAS_SYNC_TOKEN: TOKEN, PORT: String(SYNC_PORT), ATLAS_DATA_DIR: join(root, 'server/data-e2e') }, /escuchando/);
  const browser = await chromium.launch();
  const A = await newDevice(browser, 'A');
  const { page, ctx } = A;
  globalThis.__page = () => A.page;
  let tripId, trip2Id;

  await step('Carga inicial, Service Worker activo y bienvenida', async () => {
    await page.goto(BASE);
    await page.getByText('Tu centro de control de viajes').waitFor();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    // Espera a que el SW controle la página (tras el primer registro).
    await page.reload();
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    assert.ok(controlled, 'el SW no controla la página');
    const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
    assert.equal(manifest.display, 'standalone');
    await shot(page, '01-bienvenida');
  });

  await step('Perfil: nombre, tema y moneda', async () => {
    await page.goto(`${BASE}/perfil`);
    await page.locator('#pf-name').fill('Marcos');
    await page.locator('#pf-name').blur();
    await page.waitForTimeout(150);
    await page.goto(BASE);
    await page.getByRole('heading', { name: /, Marcos$/ }).waitFor();
  });

  await step('Crear viaje con varios destinos, acompañantes y presupuesto', async () => {
    tripId = await createTrip(page, { name: 'Escapada a Lisboa', origin: 'Madrid', stages: ['Lisboa', 'Sintra'], start: '2026-12-04', end: '2026-12-08', companions: ['Laura'], budget: '1.500' });
    await page.getByRole('heading', { name: 'Escapada a Lisboa' }).waitFor();
    await page.getByText('Lisboa · Sintra').first().waitFor();
    await page.getByText('5 días').first().waitFor();
    await page.getByText(/2 en total · Marcos, Laura/).waitFor();
    assert.ok(await page.locator('.ticket-art text', { hasText: 'Madrid' }).count() > 0, 'el billete no muestra el origen');
    assert.ok(await page.locator('.ticket-art text', { hasText: 'Lisboa +1' }).count() > 0, 'el billete no muestra el destino');
    await shot(page, '02-viaje-resumen');
  });

  await step('Editar viaje', async () => {
    await page.getByRole('button', { name: 'Opciones del viaje' }).click();
    await page.getByRole('menuitem', { name: 'Editar' }).click();
    await page.locator('#t-desc').fill('Puente de diciembre. Probar pastéis de Belém.');
    await sheetSave(page);
    await page.getByText('Probar pastéis de Belém').waitFor();
  });

  await step('Tareas del viaje', async () => {
    await page.getByLabel('Nueva tarea').fill('Reservar parking aeropuerto');
    await page.getByLabel('Nueva tarea').press('Enter');
    await page.getByText('Reservar parking aeropuerto').waitFor();
    await page.getByText('1 de 1').waitFor();
  });

  await step('Itinerario: añadir, completar, duplicar, reordenar y mover de día', async () => {
    await tab(page, 'Itinerario');
    await page.getByRole('heading', { name: /día 1 · viernes, 4 de diciembre/i }).waitFor();
    const add = async (type, title, time, extra) => {
      await page.getByRole('button', { name: 'Añadir', exact: true }).first().click();
      await page.getByRole('button', { name: type, exact: true }).click();
      await page.locator('#i-title').pressSequentially(title, { delay: 10 });
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'i-title', 'el título perdió el foco');
      if (time) await page.locator('#i-time').fill(time);
      if (extra) await extra();
      await sheetSave(page);
      await page.getByRole('button', { name: `Editar ${title}` }).waitFor();
    };
    await add('Transporte', 'Vuelo MAD → LIS', '08:10', async () => {
      await page.locator('#i-to').fill('Lisboa');
      await page.getByLabel('Horas').fill('1');
      await page.getByLabel('Minutos').fill('15');
      await page.locator('#i-book').fill('TP1023');
    });
    await add('Visita', 'Torre de Belém', '11:30', async () => {
      await page.getByLabel('Buscar ubicación').fill('38.6916, -9.2160');
      await page.getByLabel('Buscar ubicación').press('Enter');
      await page.getByText('38,69160, -9,21600').waitFor();
    });
    await add('Restaurante', 'Comida en Time Out Market', '10:00');
    // El restaurante a las 10:00 debe quedar entre el vuelo (08:10) y Belém (11:30).
    const titles = await page.locator('.tl-title').allInnerTexts();
    assert.deepEqual(titles, ['Vuelo MAD → LIS → Lisboa', 'Comida en Time Out Market', 'Torre de Belém']);
    await page.getByRole('button', { name: 'Marcar como completada' }).first().click();
    await page.locator('.tl-card.done').first().waitFor();
    // Duplicar y bajar
    await page.getByRole('button', { name: 'Más opciones de Torre de Belém' }).click();
    await page.getByRole('menuitem', { name: 'Duplicar' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.tl-title').length === 4);
    await page.getByRole('button', { name: 'Más opciones de Comida en Time Out Market' }).click();
    await page.getByRole('menuitem', { name: 'Bajar' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.tl-title')[2]?.textContent === 'Comida en Time Out Market');
    // Mover a otro día
    await page.getByRole('button', { name: 'Más opciones de Comida en Time Out Market' }).click();
    await page.getByRole('menuitem', { name: 'Mover a otro día' }).click();
    await page.locator('.sheet').getByRole('button', { name: /día 2/i }).click();
    await page.waitForFunction(() => document.querySelectorAll('.tl-title').length === 3);
    await page.getByRole('tab', { name: /sábado.*1 elementos|1 elementos/ }).first().waitFor();
    await shot(page, '03-itinerario');
    await page.getByRole('button', { name: 'Resumen', exact: true }).click();
    await page.getByText('Días planificados').waitFor();
    await shot(page, '04-itinerario-resumen');
  });

  await step('Resumen muestra transporte y próxima actividad', async () => {
    await tab(page, 'Resumen');
    await page.getByText('Vuelo MAD → LIS → Lisboa').waitFor();
    await page.getByText('Próxima actividad').waitFor();
  });

  await step('Mapa: lugar guardado con coordenadas', async () => {
    await tab(page, 'Mapa');
    await page.getByRole('button', { name: 'Lugar', exact: true }).click();
    await page.locator('#p-name').fill('Pastéis de Belém');
    await page.getByRole('button', { name: 'Restaurante', exact: true }).click();
    await page.getByLabel('Buscar ubicación').fill('38.6975, -9.2032');
    await page.getByLabel('Buscar ubicación').press('Enter');
    await page.locator('#p-notes').fill('Ir antes de las 10 para evitar cola');
    await sheetSave(page);
    await page.locator('.list-row', { hasText: 'Pastéis de Belém' }).waitFor();
    await shot(page, '05-mapa');
  });

  await step('Gastos: registro, reparto, saldos y liquidación', async () => {
    await tab(page, 'Gastos');
    const addExp = async (title, amount, payer, extra) => {
      await page.getByRole('button', { name: 'Gasto', exact: true }).click();
      await page.locator('#e-title').fill(title);
      await page.locator('#e-amount').fill(amount);
      await page.locator('#e-paid').selectOption({ label: payer });
      if (extra) await extra();
      await sheetSave(page);
      await page.getByText(title).first().waitFor();
    };
    await addExp('Cena en Alfama', '90,01', 'Marcos (tú)');
    await addExp('Taxi', '24', 'Laura');
    await addExp('Hotel (pendiente)', '300', 'Marcos (tú)', async () => page.getByRole('button', { name: 'Pendiente de pago' }).click());
    await page.getByText('414,01 €').first().waitFor();
    await page.getByRole('button', { name: 'Saldos' }).click();
    // Marcos pagó 90,01, su parte 45,01 + 12 = 57,01 → +33,00 ; Laura -33,00
    await page.getByText('+33,00 €').waitFor();
    await page.getByText('-33,00 €').waitFor();
    await shot(page, '06-gastos-saldos');
    await page.getByRole('button', { name: 'Saldar' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Registrar' }).click();
    await page.getByText('No hay deudas pendientes.').waitFor();
    await page.getByRole('button', { name: 'Gráficos' }).click();
    await page.getByText('Por categoría').waitFor();
    await shot(page, '07-gastos-graficos');
  });

  await step('Gastos: reparto por importes exactos valida la suma', async () => {
    await page.getByRole('button', { name: 'Gastos', exact: true }).click();
    await page.getByRole('button', { name: 'Gasto', exact: true }).click();
    await page.locator('#e-title').fill('Entradas');
    await page.locator('#e-amount').fill('30');
    await page.getByRole('button', { name: 'Importes' }).click();
    await page.getByLabel('Importe de Laura').fill('20');
    await sheetSave(page);
    await page.getByText('Los importes del reparto no suman el total.').waitFor();
    await page.getByLabel('Importe de Marcos').fill('10');
    await sheetSave(page);
    await page.getByText('Entradas').first().waitFor();
  });

  await step('Documentos: importar PDF e imagen y abrirlos', async () => {
    await tab(page, 'Documentos');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
    const png = readFileSync(join(root, 'public/icons/icon-192.png'));
    await page.locator('input[type=file]').setInputFiles([{ name: 'billete-vuelo.pdf', mimeType: 'application/pdf', buffer: pdf }, { name: 'reserva-hotel.png', mimeType: 'image/png', buffer: png }]);
    await page.getByText('2 documentos guardados en el dispositivo').waitFor();
    await page.getByRole('button', { name: 'Abrir billete-vuelo' }).waitFor();
    await page.getByText('Billete').first().waitFor();
    await page.getByRole('button', { name: 'Abrir reserva-hotel' }).click();
    await page.locator('.viewer img').waitFor();
    await page.locator('.viewer').getByRole('button', { name: 'Cerrar' }).click();
    await shot(page, '08-documentos');
  });

  await step('Equipaje: lista desde plantilla Snowboard, marcar y cantidades', async () => {
    await tab(page, 'Equipaje');
    await page.getByRole('button', { name: 'Nueva lista' }).first().click();
    await page.locator('.sheet').getByRole('button', { name: 'Snowboard' }).click();
    await sheetSave(page);
    await page.getByText('0 de 15 preparados').waitFor();
    await page.getByRole('button', { name: 'Marcar Casco' }).click();
    await page.getByText('1 de 15 preparados').waitFor();
    await page.getByLabel('Nombre del elemento').fill('Crema solar');
    await page.getByLabel('Categoría').fill('Higiene');
    await page.getByRole('button', { name: 'Añadir', exact: true }).click();
    await page.getByText('1 de 16 preparados').waitFor();
    await shot(page, '09-equipaje');
  });

  await step('Segundo viaje independiente, duplicar y archivar', async () => {
    trip2Id = await createTrip(page, { name: 'Snow en Baqueira', stages: ['Baqueira'], start: '2027-01-15', end: '2027-01-18', confirmed: false });
    await tab(page, 'Gastos');
    await page.getByText('Sin gastos').waitFor();
    await page.goto(`${BASE}/viajes`);
    await page.getByRole('button', { name: /Preparación/ }).click();
    await page.getByRole('link', { name: 'Abrir Snow en Baqueira' }).waitFor();
    await page.getByRole('button', { name: 'Opciones de Snow en Baqueira' }).click();
    await page.getByRole('menuitem', { name: 'Duplicar' }).click();
    await page.getByRole('link', { name: 'Abrir Snow en Baqueira (copia)' }).waitFor();
    await page.getByRole('button', { name: 'Opciones de Snow en Baqueira (copia)' }).click();
    await page.getByRole('menuitem', { name: 'Archivar' }).click();
    await page.getByRole('button', { name: /Archivados/ }).click();
    await page.getByRole('link', { name: 'Abrir Snow en Baqueira (copia)' }).waitFor();
    await page.getByRole('button', { name: /Próximos/ }).click();
    await page.getByLabel('Buscar viajes').fill('sintra');
    await page.getByRole('link', { name: 'Abrir Escapada a Lisboa' }).waitFor();
    await page.getByLabel('Buscar viajes').fill('');
    await shot(page, '10-biblioteca');
  });

  await step('Inicio: próximo viaje, cuenta atrás, tareas y gastos', async () => {
    await page.goto(BASE);
    await page.getByRole('link', { name: 'Próximo viaje: Escapada a Lisboa' }).waitFor();
    await page.getByText('días para salir').waitFor();
    await page.getByText('Reservar parking aeropuerto').waitFor();
    await page.getByText('En preparación').first().waitFor();
    await shot(page, '11-inicio');
    await page.screenshot({ path: join(out, '11b-inicio-completo.png'), fullPage: true });
  });

  await step('Explorar: lugares guardados de todos los viajes', async () => {
    await page.goto(`${BASE}/explorar`);
    await page.locator('.list-row', { hasText: 'Pastéis de Belém' }).click();
    await page.getByText('Ir antes de las 10 para evitar cola').waitFor();
    await page.getByRole('link', { name: 'Apple Maps' }).waitFor();
    const href = await page.getByRole('link', { name: 'Apple Maps' }).getAttribute('href');
    assert.match(href, /maps\.apple\.com\/\?daddr=38\.6975,-9\.2032/);
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();
    await page.locator('.sheet select').nth(0).selectOption({ label: 'Escapada a Lisboa' });
    await page.locator('.sheet select').nth(1).selectOption({ index: 2 });
    await page.locator('.sheet').getByRole('button', { name: 'Añadir', exact: true }).click();
    await page.getByText('Añadido al itinerario de Escapada a Lisboa').waitFor();
    await page.locator('.sheet-head').getByRole('button', { name: 'Cerrar' }).click();
  });

  await step('Gastos globales', async () => {
    await page.goto(`${BASE}/gastos`);
    await page.getByText('Total gastado').waitFor();
    await page.getByText('444,01 €').first().waitFor();
    await shot(page, '12-gastos-global');
  });

  await step('Persistencia tras cerrar y reabrir', async () => {
    await page.close();
    A.page = await ctx.newPage();
    await A.page.goto(`${BASE}/viajes/${tripId}/itinerario`);
    await A.page.getByRole('button', { name: 'Editar Vuelo MAD → LIS' }).waitFor();
  });

  const p = () => A.page;

  await step('Modo avión: abrir, consultar, crear y editar sin conexión', async () => {
    await ctx.setOffline(true);
    await p().goto(BASE);
    await p().getByText('Sin conexión · tus cambios se guardan en el dispositivo').waitFor();
    await p().getByRole('link', { name: 'Próximo viaje: Escapada a Lisboa' }).click();
    await tab(p(), 'Documentos');
    await p().getByRole('button', { name: 'Abrir billete-vuelo' }).click();
    await p().locator('.viewer iframe').waitFor();
    await p().locator('.viewer').getByRole('button', { name: 'Cerrar' }).click();
    await tab(p(), 'Mapa');
    await p().getByText('Sin conexión: el mapa base no está disponible.').waitFor();
    await p().locator('svg.plot').waitFor();
    await shot(p(), '13-offline-mapa');
    await tab(p(), 'Gastos');
    await p().getByRole('button', { name: 'Gasto', exact: true }).click();
    await p().locator('#e-title').fill('Tranvía 28');
    await p().locator('#e-amount').fill('3,10');
    await sheetSave(p());
    await p().getByText('Tranvía 28').waitFor();
    await tab(p(), 'Itinerario');
    await p().getByRole('button', { name: 'Añadir', exact: true }).first().click();
    await p().locator('#i-title').fill('Mirador de Santa Luzia');
    await sheetSave(p());
    await p().getByRole('button', { name: 'Editar Mirador de Santa Luzia' }).waitFor();
    await p().getByRole('button', { name: 'Marcar como completada' }).first().click();
    const offTrip = await createTrip(p(), { name: 'Viaje creado en modo avión', stages: ['Oporto'], start: '2027-03-01', end: '2027-03-03' });
    assert.ok(offTrip);
    await tab(p(), 'Equipaje');
    await p().getByRole('button', { name: 'Nueva lista' }).first().click();
    await p().locator('.sheet').getByRole('button', { name: 'Viaje urbano' }).click();
    await sheetSave(p());
    await p().getByRole('button', { name: /^Marcar / }).first().click();
    await p().getByText(/^1 de \d+ preparados/).waitFor();
    // Reabrir sin conexión
    await p().reload();
    await p().getByRole('heading', { name: 'Viaje creado en modo avión' }).waitFor();
    await shot(p(), '14-offline-viaje');
  });

  await step('Vuelta a la conexión: estado vuelve a Conectado', async () => {
    await ctx.setOffline(false);
    await p().goto(BASE);
    await p().getByText(/Conectado · Solo en este dispositivo/).waitFor();
    assert.equal(await p().getByText('Sin conexión · tus cambios').count(), 0);
  });

  let backupPath;
  await step('Exportar copia completa', async () => {
    await p().goto(`${BASE}/perfil`);
    const [dl] = await Promise.all([p().waitForEvent('download'), p().getByRole('button', { name: /Exportar copia completa/ }).click()]);
    backupPath = join(out, dl.suggestedFilename());
    await dl.saveAs(backupPath);
    const json = JSON.parse(readFileSync(backupPath, 'utf8'));
    assert.equal(json.format, 'atlas-backup');
    assert.equal(json.data.trips.length, 4);
    assert.ok(json.data.files.length >= 2);
  });

  await step('Importar la copia en otro dispositivo (restauración)', async () => {
    const B = await newDevice(browser, 'restore');
    await B.page.goto(`${BASE}/perfil`);
    await B.page.locator('input[type=file]').setInputFiles(backupPath);
    await B.page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar' }).click(); // no reemplazar
    await B.page.getByRole('alertdialog').getByRole('button', { name: 'Combinar' }).click();
    await B.page.getByText(/Importado: \d+ nuevos/).waitFor();
    await B.page.goto(`${BASE}/viajes/${tripId}/documentos`);
    await B.page.getByRole('button', { name: 'Abrir reserva-hotel' }).click();
    await B.page.locator('.viewer img').waitFor();
    const ok = await B.page.evaluate(() => { const i = document.querySelector('.viewer img'); return i.complete && i.naturalWidth > 0; });
    assert.ok(ok, 'la imagen restaurada no se decodifica');
    await B.ctx.close();
  });

  await step('Sincronización opcional entre dos dispositivos y cola offline', async () => {
    const syncUrl = `http://localhost:${SYNC_PORT}`;
    const configure = async (page) => {
      await page.goto(`${BASE}/perfil`);
      await page.getByRole('button', { name: /Servidor de sincronización/ }).click();
      await page.locator('#s-url').fill(syncUrl);
      await page.locator('#s-space').fill('pareja-e2e');
      await page.locator('#s-token').fill(TOKEN);
      await page.getByRole('button', { name: 'Conectar y activar' }).click();
      await page.getByText('Sincronización activada').waitFor();
      await page.locator('.sheet-head').getByRole('button', { name: 'Cerrar' }).click();
    };
    await configure(p());
    await p().goto(`${BASE}/viajes/${tripId}`);
    await p().getByRole('switch', { name: 'Sincronizar este viaje' }).click();
    await p().getByText('El viaje se sincronizará con tu servidor.').waitFor();
    await p().goto(BASE);
    await p().getByText(/Sincronizado \d\d:\d\d/).first().waitFor({ timeout: 20000 });

    const C = await newDevice(browser, 'C');
    await configure(C.page);
    await C.page.goto(`${BASE}/viajes/${tripId}/gastos`);
    await C.page.getByText('Cena en Alfama').waitFor({ timeout: 20000 });
    await tab(C.page, 'Documentos');
    await C.page.getByRole('button', { name: 'Abrir billete-vuelo' }).waitFor();
    // El viaje no compartido no viaja.
    await C.page.goto(`${BASE}/viajes`);
    await C.page.getByRole('button', { name: /Preparación/ }).click();
    assert.equal(await C.page.getByRole('link', { name: 'Abrir Snow en Baqueira' }).count(), 0);

    // A edita sin conexión → cambios pendientes → al volver se envían → C los recibe.
    await ctx.setOffline(true);
    await p().goto(`${BASE}/viajes/${tripId}`);
    await p().getByLabel('Nueva tarea').fill('Comprar tarjeta Viva Viagem');
    await p().getByLabel('Nueva tarea').press('Enter');
    await p().getByText('Comprar tarjeta Viva Viagem').waitFor();
    await p().goto(BASE);
    await p().getByText(/Sin conexión · \d+ cambios pendientes/).waitFor();
    await shot(p(), '15-pendientes');
    await ctx.setOffline(false);
    await p().getByText(/Sincronizado \d\d:\d\d/).waitFor({ timeout: 20000 });
    await C.page.goto(`${BASE}/viajes/${tripId}`);
    await C.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await C.page.getByText('Comprar tarjeta Viva Viagem').waitFor({ timeout: 20000 });
    await C.ctx.close();
  });

  await step('Modo oscuro y pantalla pequeña (iPhone SE)', async () => {
    const D = await newDevice(browser, 'dark', { ...devices['iPhone SE'], colorScheme: 'dark' });
    await D.page.goto(`${BASE}/perfil`);
    await D.page.locator('input[type=file]').setInputFiles(backupPath);
    await D.page.getByRole('alertdialog').getByRole('button', { name: 'Reemplazar todo' }).click();
    await D.page.getByText(/Importado/).waitFor();
    await D.page.goto(BASE);
    await D.page.getByRole('link', { name: 'Próximo viaje: Escapada a Lisboa' }).waitFor();
    await D.page.getByRole('heading', { name: /, Marcos$/ }).waitFor(); // el perfil viaja en la copia
    const theme = await D.page.evaluate(() => document.documentElement.dataset.theme);
    assert.equal(theme, 'dark');
    await shot(D.page, '16-dark-inicio');
    await D.page.goto(`${BASE}/viajes/${tripId}/itinerario?dia=2026-12-04`);
    await D.page.locator('.tl-title').first().waitFor();
    await shot(D.page, '17-dark-itinerario');
    // Nada se sale horizontalmente en 320 px.
    for (const path of ['/', '/viajes', `/viajes/${tripId}`, `/viajes/${tripId}/gastos`, '/explorar', '/gastos', '/perfil']) {
      await D.page.goto(BASE + path);
      await D.page.waitForTimeout(250);
      const overflow = await D.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, `desbordamiento horizontal de ${overflow}px en ${path}`);
    }
    // Objetivos táctiles de la barra inferior ≥ 44 px.
    const sizes = await D.page.$$eval('.tabbar a', (as) => as.map((a) => a.getBoundingClientRect().height));
    assert.ok(sizes.every((h) => h >= 44), `tabbar: ${sizes}`);
    await D.ctx.close();
  });

  await step('Borrar todos los datos (con doble confirmación)', async () => {
    const E = await newDevice(browser, 'wipe');
    await createTrip(E.page, { name: 'Temporal', stages: ['Roma'] });
    await E.page.goto(`${BASE}/perfil`);
    await E.page.getByRole('button', { name: 'Borrar todos los datos' }).click();
    await E.page.getByRole('alertdialog').getByRole('button', { name: 'Continuar' }).click();
    await E.page.getByRole('alertdialog').getByRole('button', { name: 'Borrar todo' }).click();
    await E.page.getByText('Tu centro de control de viajes').waitFor();
    await E.ctx.close();
  });

  await step('Sin errores de consola', async () => {
    assert.deepEqual(consoleErrors, []);
  });

  await browser.close();
  procs.forEach((x) => x.kill());
  rmSync(join(root, 'server/data-e2e'), { recursive: true, force: true });
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} pruebas superadas`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  procs.forEach((x) => x.kill());
  process.exit(1);
});
