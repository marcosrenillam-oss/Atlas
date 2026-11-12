/** Plantillas de equipaje iniciales. Ids estables para no duplicarlas al sincronizar. */
export interface TemplateSeed {
  id: string;
  name: string;
  items: [category: string, name: string, qty?: number][];
}

const basics: TemplateSeed['items'] = [
  ['Documentación', 'DNI / pasaporte'],
  ['Documentación', 'Tarjetas y algo de efectivo'],
  ['Documentación', 'Tarjeta sanitaria / seguro de viaje'],
  ['Electrónica', 'Móvil y cargador'],
  ['Electrónica', 'Batería externa'],
  ['Higiene', 'Neceser básico'],
  ['Higiene', 'Medicación personal'],
];

export const PACKING_TEMPLATES: TemplateSeed[] = [
  {
    id: 'tpl-urbano', name: 'Viaje urbano', items: [
      ...basics,
      ['Ropa', 'Calzado cómodo para caminar'],
      ['Ropa', 'Camisetas', 3],
      ['Ropa', 'Ropa interior', 4],
      ['Ropa', 'Chaqueta ligera'],
      ['Accesorios', 'Mochila pequeña de día'],
      ['Accesorios', 'Paraguas plegable'],
      ['Electrónica', 'Adaptador de enchufe'],
    ],
  },
  {
    id: 'tpl-vacaciones', name: 'Vacaciones', items: [
      ...basics,
      ['Ropa', 'Camisetas', 6],
      ['Ropa', 'Pantalones', 3],
      ['Ropa', 'Ropa interior', 7],
      ['Ropa', 'Calcetines', 7],
      ['Ropa', 'Pijama'],
      ['Ropa', 'Calzado cómodo'],
      ['Accesorios', 'Gafas de sol'],
      ['Higiene', 'Protector solar'],
      ['Electrónica', 'Auriculares'],
      ['Varios', 'Libro o e-reader'],
    ],
  },
  {
    id: 'tpl-nieve', name: 'Viaje de nieve', items: [
      ...basics,
      ['Ropa técnica', 'Chaqueta impermeable'],
      ['Ropa técnica', 'Pantalón de nieve'],
      ['Ropa técnica', 'Primera capa térmica', 2],
      ['Ropa técnica', 'Forro polar'],
      ['Ropa técnica', 'Calcetines térmicos', 4],
      ['Accesorios', 'Guantes'],
      ['Accesorios', 'Gorro y braga de cuello'],
      ['Accesorios', 'Gafas de sol de montaña'],
      ['Higiene', 'Protector solar alto y labial'],
      ['Ropa', 'Botas de après-ski'],
      ['Documentación', 'Forfait / reserva de forfait'],
    ],
  },
  {
    id: 'tpl-snowboard', name: 'Snowboard', items: [
      ['Material', 'Tabla de snowboard'],
      ['Material', 'Botas de snowboard'],
      ['Material', 'Fijaciones revisadas'],
      ['Material', 'Casco'],
      ['Material', 'Máscara (gafas de ventisca)'],
      ['Material', 'Funda de tabla'],
      ['Material', 'Herramienta multiusos / destornillador'],
      ['Material', 'Cera'],
      ['Protecciones', 'Protecciones de muñeca'],
      ['Protecciones', 'Culera / pantalón de impacto'],
      ['Ropa técnica', 'Chaqueta y pantalón de nieve'],
      ['Ropa técnica', 'Primera capa térmica', 2],
      ['Accesorios', 'Guantes o manoplas'],
      ['Documentación', 'Forfait'],
      ['Documentación', 'Seguro de esquí / snowboard'],
    ],
  },
  {
    id: 'tpl-playa', name: 'Playa', items: [
      ...basics,
      ['Ropa', 'Bañador', 2],
      ['Ropa', 'Camisetas', 4],
      ['Ropa', 'Pantalones cortos', 2],
      ['Ropa', 'Chanclas'],
      ['Accesorios', 'Toalla de playa'],
      ['Accesorios', 'Gafas de sol'],
      ['Accesorios', 'Gorra o sombrero'],
      ['Higiene', 'Protector solar'],
      ['Higiene', 'After sun'],
      ['Varios', 'Bolsa estanca para el móvil'],
    ],
  },
  {
    id: 'tpl-finde', name: 'Fin de semana', items: [
      ['Documentación', 'DNI'],
      ['Documentación', 'Tarjeta'],
      ['Electrónica', 'Móvil y cargador'],
      ['Ropa', 'Muda', 2],
      ['Ropa', 'Pijama'],
      ['Higiene', 'Neceser mínimo'],
      ['Accesorios', 'Mochila de cabina'],
    ],
  },
];
