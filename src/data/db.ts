import Dexie, { type Table } from 'dexie';
import type {
  EntityName, Expense, ExpenseCategory, ItineraryItem, PackingItem, PackingList, Participant, Place,
  Settlement, StoredFile, Task, TravelDoc, Trip,
} from '../domain/types';

export interface OutboxEntry {
  seq?: number;
  entity: EntityName;
  entityId: string;
  op: 'put' | 'delete';
  at: number;
  tripId?: string | null;
  attempts?: number;
}

export interface KV {
  key: string;
  value: unknown;
}

export class AtlasDB extends Dexie {
  trips!: Table<Trip, string>;
  participants!: Table<Participant, string>;
  items!: Table<ItineraryItem, string>;
  places!: Table<Place, string>;
  categories!: Table<ExpenseCategory, string>;
  expenses!: Table<Expense, string>;
  settlements!: Table<Settlement, string>;
  docs!: Table<TravelDoc, string>;
  files!: Table<StoredFile, string>;
  packingLists!: Table<PackingList, string>;
  packingItems!: Table<PackingItem, string>;
  tasks!: Table<Task, string>;
  outbox!: Table<OutboxEntry, number>;
  kv!: Table<KV, string>;

  constructor(name = 'atlas') {
    super(name);
    // Nota: IndexedDB no indexa booleanos ni null; esos filtros se hacen en memoria.
    this.version(1).stores({
      trips: 'id, updatedAt, startDate',
      participants: 'id, tripId',
      items: 'id, tripId, [tripId+date], placeId',
      places: 'id, tripId, category, updatedAt',
      categories: 'id, tripId',
      expenses: 'id, tripId, date, categoryId',
      settlements: 'id, tripId',
      docs: 'id, tripId',
      files: 'id, tripId',
      packingLists: 'id, tripId',
      packingItems: 'id, listId',
      tasks: 'id, tripId',
      outbox: '++seq, [entity+entityId]',
      kv: 'key',
    });
  }
}

export const db = new AtlasDB();

export const ENTITY_TABLES: EntityName[] = [
  'trips', 'participants', 'items', 'places', 'categories', 'expenses', 'settlements',
  'docs', 'files', 'packingLists', 'packingItems', 'tasks',
];

export function table(entity: EntityName): Table<{ id: string; updatedAt: number; tripId?: string | null }, string> {
  return db[entity] as unknown as Table<{ id: string; updatedAt: number; tripId?: string | null }, string>;
}
