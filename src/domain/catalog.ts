import type { DocKind, ItemType, PlaceCategory, TripStatus, TripType } from './types';

export const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'pareja', label: 'En pareja' },
  { value: 'amigos', label: 'Con amigos' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'nieve', label: 'Nieve / snowboard' },
  { value: 'individual', label: 'Individual' },
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'familia', label: 'Familia' },
  { value: 'otro', label: 'Otro' },
];
export const tripTypeLabel = (t: TripType) => TRIP_TYPES.find((x) => x.value === t)?.label ?? 'Otro';

export const STATUS_LABEL: Record<TripStatus, string> = {
  'en-preparacion': 'En preparación',
  proximo: 'Próximo',
  'en-curso': 'En curso',
  completado: 'Completado',
  archivado: 'Archivado',
};

export const ITEM_TYPES: { value: ItemType; label: string; icon: string }[] = [
  { value: 'actividad', label: 'Actividad', icon: 'Sparkles' },
  { value: 'visita', label: 'Visita', icon: 'Landmark' },
  { value: 'restaurante', label: 'Restaurante', icon: 'UtensilsCrossed' },
  { value: 'transporte', label: 'Transporte', icon: 'TrainFront' },
  { value: 'alojamiento', label: 'Alojamiento', icon: 'BedDouble' },
  { value: 'evento', label: 'Evento', icon: 'Ticket' },
  { value: 'reserva', label: 'Reserva', icon: 'CalendarCheck' },
  { value: 'nota', label: 'Nota', icon: 'StickyNote' },
];
export const itemTypeLabel = (t: ItemType) => ITEM_TYPES.find((x) => x.value === t)?.label ?? t;

export const PLACE_CATEGORIES: { value: PlaceCategory; label: string; icon: string }[] = [
  { value: 'restaurante', label: 'Restaurante', icon: 'UtensilsCrossed' },
  { value: 'museo', label: 'Museo', icon: 'Landmark' },
  { value: 'actividad', label: 'Actividad', icon: 'Sparkles' },
  { value: 'hotel', label: 'Hotel', icon: 'BedDouble' },
  { value: 'mirador', label: 'Mirador', icon: 'Mountain' },
  { value: 'compras', label: 'Compras', icon: 'ShoppingBag' },
  { value: 'transporte', label: 'Transporte', icon: 'TrainFront' },
  { value: 'otro', label: 'Otro', icon: 'MapPin' },
];
export const placeCategoryLabel = (c: PlaceCategory) => PLACE_CATEGORIES.find((x) => x.value === c)?.label ?? 'Otro';

export const DOC_KINDS: { value: DocKind; label: string }[] = [
  { value: 'billete', label: 'Billete' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'confirmacion', label: 'Confirmación' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'identidad', label: 'Identidad' },
  { value: 'foto', label: 'Fotografía' },
  { value: 'otro', label: 'Otro' },
];
export const docKindLabel = (k: DocKind) => DOC_KINDS.find((x) => x.value === k)?.label ?? 'Otro';

/** Categorías de gasto iniciales (ids estables para que coincidan entre dispositivos). */
export const BASE_EXPENSE_CATEGORIES = [
  { id: 'cat-transporte', name: 'Transporte', icon: 'TrainFront' },
  { id: 'cat-alojamiento', name: 'Alojamiento', icon: 'BedDouble' },
  { id: 'cat-comida', name: 'Comida', icon: 'UtensilsCrossed' },
  { id: 'cat-actividades', name: 'Actividades', icon: 'Ticket' },
  { id: 'cat-compras', name: 'Compras', icon: 'ShoppingBag' },
  { id: 'cat-otros', name: 'Otros', icon: 'Shapes' },
] as const;
