import type { ItemType, PlaceCategory } from '../domain/types';

export type Tone = 'coral' | 'violet' | 'sky' | 'mint' | 'amber' | 'pink' | 'slate';

export const ITEM_TONE: Record<ItemType, Tone> = {
  actividad: 'pink', visita: 'violet', restaurante: 'coral', transporte: 'sky',
  alojamiento: 'mint', evento: 'amber', reserva: 'violet', nota: 'slate',
};
export const PLACE_TONE: Record<PlaceCategory, Tone> = {
  restaurante: 'coral', museo: 'violet', actividad: 'pink', hotel: 'mint', mirador: 'amber',
  compras: 'pink', transporte: 'sky', otro: 'slate',
};
const CAT_TONE: Record<string, Tone> = {
  'cat-transporte': 'sky', 'cat-alojamiento': 'mint', 'cat-comida': 'coral', 'cat-actividades': 'amber', 'cat-compras': 'pink', 'cat-otros': 'slate',
};
const ROTATION: Tone[] = ['violet', 'coral', 'sky', 'mint', 'amber', 'pink'];
export function categoryTone(id: string): Tone {
  if (CAT_TONE[id]) return CAT_TONE[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ROTATION[Math.abs(h) % ROTATION.length];
}
