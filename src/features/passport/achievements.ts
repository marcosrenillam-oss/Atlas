/** Logros: se calculan a partir de tus datos, sin servidores. */
export interface PassportData {
  tripsDone: number;
  tripsTotal: number;
  countries: number;
  days: number;
  km: number;
  snowTrips: number;
  items: number;
  journal: number;
  expenses: number;
  places: number;
  perfectLists: number;
  bigGroup: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  text: string;
  icon: string;
  tone: 'coral' | 'violet' | 'sky' | 'mint' | 'amber' | 'pink' | 'slate';
  progress: (d: PassportData) => [number, number];
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'Primer despegue', text: 'Crea tu primer viaje', icon: 'Plane', tone: 'sky', progress: (d) => [d.tripsTotal, 1] },
  { id: 'globe3', title: 'Trotamundos', text: 'Viaja a 3 países', icon: 'Mountain', tone: 'mint', progress: (d) => [d.countries, 3] },
  { id: 'globe10', title: 'Ciudadano del mundo', text: 'Viaja a 10 países', icon: 'Landmark', tone: 'violet', progress: (d) => [d.countries, 10] },
  { id: 'days30', title: 'Maratón viajero', text: 'Suma 30 días de viaje', icon: 'CalendarCheck', tone: 'coral', progress: (d) => [d.days, 30] },
  { id: 'km5000', title: 'Millas en el bolsillo', text: 'Recorre 5.000 km', icon: 'Ship', tone: 'sky', progress: (d) => [d.km, 5000] },
  { id: 'snow', title: 'Rey de la nieve', text: 'Haz un viaje de nieve', icon: 'Snowflake', tone: 'sky', progress: (d) => [d.snowTrips, 1] },
  { id: 'planner', title: 'Planificador', text: 'Añade 20 planes al itinerario', icon: 'Sparkles', tone: 'pink', progress: (d) => [d.items, 20] },
  { id: 'writer', title: 'Cronista', text: 'Escribe 5 días de diario', icon: 'StickyNote', tone: 'amber', progress: (d) => [d.journal, 5] },
  { id: 'money', title: 'Cuentas claras', text: 'Registra 25 gastos', icon: 'ShoppingBag', tone: 'coral', progress: (d) => [d.expenses, 25] },
  { id: 'explorer', title: 'Explorador', text: 'Guarda 15 lugares', icon: 'MapPin', tone: 'mint', progress: (d) => [d.places, 15] },
  { id: 'packer', title: 'Maleta perfecta', text: 'Completa una lista de equipaje', icon: 'Gift', tone: 'violet', progress: (d) => [d.perfectLists, 1] },
  { id: 'group', title: 'En buena compañía', text: 'Un viaje de 4 o más personas', icon: 'Heart', tone: 'pink', progress: (d) => [d.bigGroup ? 1 : 0, 1] },
];

/** Emoji de bandera a partir del código ISO (PT → 🇵🇹). */
export function flag(code?: string): string {
  if (!code || code.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
