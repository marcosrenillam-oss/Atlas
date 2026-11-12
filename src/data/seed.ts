import { BASE_EXPENSE_CATEGORIES } from '../domain/catalog';
import { PACKING_TEMPLATES } from '../domain/packingTemplates';
import { db } from './db';

const SEED_VERSION = 1;

/** Crea categorías base y plantillas de equipaje la primera vez. Idempotente. */
export async function ensureSeed(): Promise<void> {
  const done = await db.kv.get('seedVersion');
  if (done && (done.value as number) >= SEED_VERSION) return;
  const now = Date.now();
  await db.transaction('rw', [db.categories, db.packingLists, db.packingItems, db.kv], async () => {
    for (const c of BASE_EXPENSE_CATEGORIES) {
      if (!(await db.categories.get(c.id))) {
        await db.categories.put({ ...c, tripId: null, builtIn: true, createdAt: now, updatedAt: now });
      }
    }
    for (const t of PACKING_TEMPLATES) {
      if (await db.packingLists.get(t.id)) continue;
      await db.packingLists.put({ id: t.id, name: t.name, tripId: null, isTemplate: true, builtIn: true, createdAt: now, updatedAt: now });
      let order = 0;
      for (const [category, name, qty] of t.items) {
        await db.packingItems.put({
          id: `${t.id}-${order}`, listId: t.id, name, category, qty: qty ?? 1, checked: false, order, createdAt: now, updatedAt: now,
        });
        order++;
      }
    }
    await db.kv.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}
