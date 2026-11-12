import 'fake-indexeddb/auto';
import { describe, expect, it, beforeAll } from 'vitest';
import { db } from '../../src/data/db';
import { save, deleteTrip, duplicateTrip, storeFile, setTracking } from '../../src/data/repo';
import { ensureSeed } from '../../src/data/seed';
import { exportAll, exportTrip, importBackup, parseBackup } from '../../src/data/backup';
import { tripStatus } from '../../src/domain/status';
import type { ItineraryItem, Participant, Trip } from '../../src/domain/types';

async function makeTrip(name: string) {
  const t = await save<Trip>('trips', { name, stages: [{ id: 's', name: 'Lisboa' }], startDate: '2030-05-01', endDate: '2030-05-04', type: 'pareja', planning: 'confirmed', travelers: 2, currency: 'EUR', archived: false, shared: false });
  const p = await save<Participant>('participants', { tripId: t.id, name: 'Yo', role: 'owner', canSeeExpenses: true, isMe: true });
  await save<ItineraryItem>('items', { tripId: t.id, date: '2030-05-01', order: 0, type: 'visita', title: 'Belém', photoIds: [], done: false });
  return { t, p };
}

describe('datos locales', () => {
  beforeAll(async () => {
    await ensureSeed();
  });
  it('siembra categorías y plantillas una sola vez', async () => {
    await ensureSeed();
    expect(await db.categories.count()).toBe(6);
    expect((await db.packingLists.toArray()).filter((l) => l.isTemplate).length).toBe(6);
  });
  it('viajes independientes, duplicado y borrado en cascada', async () => {
    const a = await makeTrip('A');
    const b = await makeTrip('B');
    const c = await duplicateTrip(a.t.id);
    expect(await db.items.where('tripId').equals(c).count()).toBe(1);
    await deleteTrip(a.t.id);
    expect(await db.trips.get(a.t.id)).toBeUndefined();
    expect(await db.items.where('tripId').equals(a.t.id).count()).toBe(0);
    expect(await db.items.where('tripId').equals(b.t.id).count()).toBe(1);
  });
  it('estado del viaje', () => {
    expect(tripStatus({ archived: false, planning: 'confirmed', startDate: '2030-01-01', endDate: '2030-01-03' }, '2029-12-01')).toBe('proximo');
    expect(tripStatus({ archived: false, planning: 'planning', startDate: '2030-01-01', endDate: '2030-01-03' }, '2029-12-01')).toBe('en-preparacion');
    expect(tripStatus({ archived: false, planning: 'planning', startDate: '2030-01-01', endDate: '2030-01-03' }, '2030-01-02')).toBe('en-curso');
    expect(tripStatus({ archived: false, planning: 'confirmed', startDate: '2030-01-01', endDate: '2030-01-03' }, '2030-02-01')).toBe('completado');
    expect(tripStatus({ archived: true, planning: 'confirmed', startDate: '2030-01-01' }, '2029-01-01')).toBe('archivado');
  });
  it('copia completa ida y vuelta con archivos', async () => {
    const { t } = await makeTrip('Con archivo');
    const bytes = new Uint8Array([37, 80, 68, 70, 1, 2, 3, 255]);
    const f = await storeFile(new Blob([bytes], { type: 'application/pdf' }), 'billete.pdf', t.id);
    const backup = parseBackup(JSON.stringify(await exportAll()));
    const tripsBefore = await db.trips.count();
    const r = await importBackup(backup, 'replace');
    expect(r.trips).toBe(tripsBefore);
    const back = await db.files.get(f.id);
    expect(new Uint8Array(await back!.blob.arrayBuffer())).toEqual(bytes);
  });
  it('import de un viaje: merge por fecha de edición', async () => {
    const { t } = await makeTrip('Compartido');
    const exp = parseBackup(JSON.stringify(await exportTrip(t.id)));
    await deleteTrip(t.id);
    const r = await importBackup(exp, 'merge');
    expect(r.trips).toBe(1);
    expect((await db.trips.get(t.id))?.name).toBe('Compartido');
    const again = await importBackup(exp, 'merge');
    expect(again.added + again.updated).toBe(0);
  });
  it('rechaza archivos que no son de ATLAS', () => {
    expect(() => parseBackup('{"hola":1}')).toThrow();
    expect(() => parseBackup('no json')).toThrow();
  });
  it('la cola de sincronización solo se llena con el seguimiento activado', async () => {
    await db.outbox.clear();
    await makeTrip('Sin sync');
    expect(await db.outbox.count()).toBe(0);
    setTracking(true);
    await makeTrip('Con sync');
    expect(await db.outbox.count()).toBe(3);
    setTracking(false);
  });
});
