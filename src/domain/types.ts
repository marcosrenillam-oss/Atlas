import type { ISODate } from '../lib/dates';
import type { Minor } from '../lib/money';

/** Campos comunes a todo registro sincronizable. */
export interface Base {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export type TripType = 'pareja' | 'amigos' | 'vacaciones' | 'nieve' | 'individual' | 'trabajo' | 'familia' | 'otro';
export type TripPlanning = 'planning' | 'confirmed';
export type TripStatus = 'en-preparacion' | 'proximo' | 'en-curso' | 'completado' | 'archivado';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Etapa / destino de un viaje. */
export interface Stage {
  id: string;
  name: string;
  country?: string;
  /** Código ISO del país (PT, ES…), para el pasaporte. */
  countryCode?: string;
  start?: ISODate;
  end?: ISODate;
  point?: GeoPoint;
}

export interface Cover {
  fileId: string;
  credit?: string; // atribución si viene de Wikipedia/Wikimedia
  creditUrl?: string;
}

export interface Trip extends Base {
  name: string;
  /** Ciudad de salida (se muestra en el billete de la portada). */
  origin?: string;
  originPoint?: GeoPoint;
  stages: Stage[];
  startDate?: ISODate;
  endDate?: ISODate;
  type: TripType;
  planning: TripPlanning;
  /** Número de viajeros declarado (puede ser mayor que los participantes con nombre). */
  travelers: number;
  budget?: Minor; // en la moneda del viaje
  currency: string;
  description?: string;
  cover?: Cover;
  archived: boolean;
  /** Si es true, el viaje se sincroniza con el servidor configurado (si lo hay). */
  shared: boolean;
}

export type Role = 'owner' | 'editor' | 'viewer';
export interface Participant extends Base {
  tripId: string;
  name: string;
  role: Role;
  canSeeExpenses: boolean;
  isMe: boolean;
  /** Identificador estable de la persona (para emparejar entre dispositivos). */
  handle?: string;
}

export type ItemType =
  | 'actividad' | 'restaurante' | 'visita' | 'transporte' | 'alojamiento' | 'evento' | 'reserva' | 'nota';

export interface Location {
  name?: string;
  address?: string;
  point?: GeoPoint;
}

export interface ItineraryItem extends Base {
  tripId: string;
  /** null = sin día asignado (ideas). */
  date: ISODate | null;
  order: number;
  type: ItemType;
  title: string;
  startTime?: string; // HH:MM
  durationMin?: number;
  location?: Location;
  placeId?: string;
  booking?: string; // localizador / referencia
  notes?: string;
  photoIds: string[];
  done: boolean;
  /** Para transportes: destino. */
  to?: string;
}

export type PlaceCategory = 'restaurante' | 'museo' | 'actividad' | 'hotel' | 'mirador' | 'compras' | 'transporte' | 'otro';
export interface Place extends Base {
  /** null = lugar guardado general (no ligado a un viaje). */
  tripId: string | null;
  name: string;
  category: PlaceCategory;
  point?: GeoPoint;
  address?: string;
  notes?: string;
  photoIds: string[];
  url?: string;
}

export interface ExpenseCategory extends Base {
  tripId: string | null; // null = categoría base
  name: string;
  icon: string;
  builtIn: boolean;
}

export type SplitMode = 'equal' | 'amounts' | 'shares';
export interface SplitPart {
  participantId: string;
  /** equal: 1/0 incluido; amounts: unidades menores; shares: peso entero */
  value: number;
}
export interface Expense extends Base {
  tripId: string;
  title: string;
  amount: Minor; // en la moneda del viaje
  categoryId: string;
  date: ISODate;
  paidBy: string | null; // participantId
  splitMode: SplitMode;
  split: SplitPart[];
  status: 'paid' | 'pending';
  notes?: string;
  original?: { amount: Minor; currency: string; rate: string };
}

/** Pago registrado entre participantes para saldar deudas. */
export interface Settlement extends Base {
  tripId: string;
  from: string;
  to: string;
  amount: Minor;
  date: ISODate;
  note?: string;
}

export type DocKind = 'billete' | 'reserva' | 'entrada' | 'confirmacion' | 'seguro' | 'identidad' | 'foto' | 'otro';
export interface TravelDoc extends Base {
  tripId: string;
  name: string;
  kind: DocKind;
  description?: string;
  fileId: string;
  mime: string;
  size: number;
  /** En la cartera: acceso a un toque durante el viaje. */
  wallet?: boolean;
}

/** Binarios (fotos, PDF…). Se guardan como Blob en IndexedDB. */
export interface StoredFile extends Base {
  tripId: string | null;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
}

export interface PackingList extends Base {
  tripId: string | null; // null = plantilla
  name: string;
  isTemplate: boolean;
  builtIn?: boolean;
}
export interface PackingItem extends Base {
  listId: string;
  name: string;
  category: string;
  qty: number;
  checked: boolean;
  order: number;
}

export interface Task extends Base {
  tripId: string;
  title: string;
  done: boolean;
  due?: ISODate;
}

/** Diario: una entrada por día del viaje. */
export interface JournalEntry extends Base {
  tripId: string;
  date: ISODate;
  text: string;
  photoIds: string[];
}

/** Entidades que se registran en la cola de sincronización. */
export type EntityName =
  | 'trips' | 'participants' | 'items' | 'places' | 'categories' | 'expenses' | 'settlements'
  | 'docs' | 'files' | 'packingLists' | 'packingItems' | 'tasks' | 'journal';
