import eu from './data/eu.json';
import am from './data/am.json';
import af from './data/af.json';
import asia from './data/as.json';
import oc from './data/oc.json';
import { layoutWorld } from './layout';

/**
 * Monumentos del Mundo ATLAS: uno por cada país del mundo (193 miembros de la ONU + Vaticano y Palestina).
 * La posición se calcula a partir de la latitud y longitud reales, separando los que quedarían pegados.
 * Las fotos se descargaron una vez de Wikimedia Commons (ver public/world/credits.json).
 */
export type Continent = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'oc';

export interface Landmark {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  city: string;
  year: string;
  continent: Continent;
  /** Posición en el mundo 3D (x este, z sur). */
  pos: [number, number];
  lat: number;
  lon: number;
  /** Tipo de modelo 3D (ver archetypes.ts) o «custom» para los 18 modelados a mano. */
  arch: string;
  text: string;
  dish: string;
  fact: string;
  hello: string;
  season: string;
  /** Destino sugerido al planear un viaje. */
  destination: string;
}

type Classic = Pick<Landmark, 'id' | 'text' | 'dish' | 'fact' | 'hello' | 'season' | 'destination'> & Partial<Landmark>;

/** Textos de los 18 monumentos originales (modelados a mano). */
const CLASSIC: Classic[] = [
  {
    id: 'liberty', name: 'Estatua de la Libertad', country: 'Estados Unidos', countryCode: 'US', city: 'Nueva York', year: '1886', continent: 'na', pos: [-31, -11],
    text: 'Regalo de Francia a Estados Unidos, diseñada por Frédéric Auguste Bartholdi con estructura interior de Gustave Eiffel. Su antorcha da la bienvenida a quien llega por mar a Nueva York.',
    dish: 'Pizza neoyorquina, bagels y hamburguesas', fact: 'Su verde es la pátina del cobre: al inaugurarse tenía el color de una moneda nueva.',
    hello: 'Hello!', season: 'Abril–junio y septiembre–noviembre', destination: 'Nueva York',
  },
  {
    id: 'chichen', name: 'Chichén Itzá', country: 'México', countryCode: 'MX', city: 'Yucatán', year: 'Siglos IX–XII', continent: 'na', pos: [-27, -2],
    text: 'La pirámide de Kukulkán, templo maya con 365 escalones, uno por cada día del año. En los equinoccios, la sombra dibuja una serpiente que baja por la escalinata.',
    dish: 'Cochinita pibil, tacos y guacamole', fact: 'Si das una palmada frente a la escalinata, el eco recuerda al canto del quetzal.',
    hello: '¡Hola! ¿Qué onda?', season: 'Noviembre a abril (temporada seca)', destination: 'Mérida',
  },
  {
    id: 'machu', name: 'Machu Picchu', country: 'Perú', countryCode: 'PE', city: 'Cusco', year: 'Siglo XV', continent: 'sa', pos: [-25, 10],
    text: 'Ciudadela inca a 2.430 metros de altitud, rodeada de montañas y nubes. Fue dada a conocer al mundo en 1911 por el explorador Hiram Bingham.',
    dish: 'Ceviche, lomo saltado y ají de gallina', fact: 'Sus muros encajan sin argamasa: entre algunas piedras no cabe ni una hoja de cuchillo.',
    hello: '¡Hola! · Allillanchu (quechua)', season: 'Mayo a septiembre (temporada seca)', destination: 'Cusco',
  },
  {
    id: 'cristo', name: 'Cristo Redentor', country: 'Brasil', countryCode: 'BR', city: 'Río de Janeiro', year: '1931', continent: 'sa', pos: [-18.5, 15],
    text: 'Estatua art déco de 30 metros que abre los brazos sobre Río de Janeiro desde lo alto del cerro del Corcovado, a unos 700 metros de altura.',
    dish: 'Feijoada, pão de queijo y açaí', fact: 'Le caen varios rayos al año: se guarda piedra de reserva para reparar los dedos y la cabeza.',
    hello: 'Olá! Tudo bem?', season: 'Mayo a octubre (menos lluvia)', destination: 'Río de Janeiro',
  },
  {
    id: 'bigben', name: 'Big Ben', country: 'Reino Unido', countryCode: 'GB', city: 'Londres', year: '1859', continent: 'eu', pos: [-11, -18.5],
    text: 'Big Ben es en realidad la gran campana; la torre se llama Elizabeth Tower desde 2012. Su reloj mecánico es uno de los más precisos del mundo.',
    dish: 'Fish and chips y el té de las cinco', fact: 'Para ajustar la hora se añaden o quitan peniques antiguos sobre el péndulo.',
    hello: 'Hello! Cheers!', season: 'Mayo a septiembre', destination: 'Londres',
  },
  {
    id: 'eiffel', name: 'Torre Eiffel', country: 'Francia', countryCode: 'FR', city: 'París', year: '1889', continent: 'eu', pos: [-5, -11.5],
    text: 'Construida para la Exposición Universal de 1889 y muy criticada al principio, hoy es el símbolo de París. Mide unos 330 metros y se repinta cada siete años.',
    dish: 'Croissants, crêpes y quesos', fact: 'En verano puede crecer unos 15 cm por la dilatación del hierro con el calor.',
    hello: 'Bonjour !', season: 'Abril–junio y septiembre', destination: 'París',
  },
  {
    id: 'sagrada', name: 'Sagrada Família', country: 'España', countryCode: 'ES', city: 'Barcelona', year: '1882 – hoy', continent: 'eu', pos: [-10.5, -4.5],
    text: 'La gran obra de Antoni Gaudí, en construcción desde 1882. Cuando se termine la torre de Jesucristo (172,5 m), será el edificio más alto de Barcelona.',
    dish: 'Paella, tapas y pan con tomate', fact: 'Gaudí dedicó más de 40 años a la basílica y está enterrado en su cripta.',
    hello: '¡Hola! · Bon dia (catalán)', season: 'Mayo, junio y septiembre', destination: 'Barcelona',
  },
  {
    id: 'belem', name: 'Torre de Belém', country: 'Portugal', countryCode: 'PT', city: 'Lisboa', year: '1519', continent: 'eu', pos: [-16, -9],
    text: 'Fortaleza de estilo manuelino junto al Tajo, desde donde partían los navegantes de la era de los descubrimientos. Es Patrimonio de la Humanidad.',
    dish: 'Pastéis de nata y bacalao', fact: 'En su fachada hay un rinoceronte esculpido, inspirado en el que el rey Manuel I recibió desde la India.',
    hello: 'Olá! Obrigado/a', season: 'Abril–junio y septiembre–octubre', destination: 'Lisboa',
  },
  {
    id: 'coliseo', name: 'Coliseo', country: 'Italia', countryCode: 'IT', city: 'Roma', year: '80 d. C.', continent: 'eu', pos: [1, -5],
    text: 'El mayor anfiteatro del Imperio romano, con capacidad para unos 50.000 espectadores que acudían a ver luchas de gladiadores y espectáculos.',
    dish: 'Pizza, pasta carbonara y gelato', fact: 'Tenía un toldo gigante, el velarium, que manejaban marineros para dar sombra al público.',
    hello: 'Ciao!', season: 'Abril–mayo y septiembre–octubre', destination: 'Roma',
  },
  {
    id: 'brandenburgo', name: 'Puerta de Brandeburgo', country: 'Alemania', countryCode: 'DE', city: 'Berlín', year: '1791', continent: 'eu', pos: [1.5, -16],
    text: 'Antigua puerta de la ciudad coronada por la Cuadriga. Quedó junto al Muro durante la Guerra Fría y hoy es el símbolo de la reunificación alemana.',
    dish: 'Currywurst, pretzels y strudel', fact: 'Napoleón se llevó la Cuadriga a París en 1806; regresó a Berlín en 1814.',
    hello: 'Hallo! Guten Tag!', season: 'Mayo a septiembre', destination: 'Berlín',
  },
  {
    id: 'partenon', name: 'Partenón', country: 'Grecia', countryCode: 'GR', city: 'Atenas', year: '438 a. C.', continent: 'eu', pos: [7, -2],
    text: 'Templo dedicado a la diosa Atenea en lo alto de la Acrópolis, la cumbre de la arquitectura clásica griega.',
    dish: 'Musaka, souvlaki y ensalada griega', fact: 'Sus columnas son ligeramente curvas (éntasis) para que, a la vista, parezcan perfectamente rectas.',
    hello: 'Yassou! (Γεια σου)', season: 'Mayo, junio y septiembre', destination: 'Atenas',
  },
  {
    id: 'basilio', name: 'Catedral de San Basilio', country: 'Rusia', countryCode: 'RU', city: 'Moscú', year: '1561', continent: 'eu', pos: [9, -17.5],
    text: 'Sus cúpulas de colores en forma de cebolla presiden la Plaza Roja de Moscú. Se construyó por orden de Iván el Terrible.',
    dish: 'Borsch, blinis y pelmeni', fact: 'Las cúpulas no siempre fueron de colores: se pintaron así siglos después de su construcción.',
    hello: 'Privet! (Привет)', season: 'Mayo a septiembre', destination: 'Moscú',
  },
  {
    id: 'piramides', name: 'Pirámides de Guiza', country: 'Egipto', countryCode: 'EG', city: 'Guiza', year: 'c. 2560 a. C.', continent: 'af', pos: [3, 7],
    text: 'La Gran Pirámide de Keops es la única de las siete maravillas del mundo antiguo que sigue en pie. Durante casi 4.000 años fue la construcción más alta del planeta.',
    dish: 'Koshari, falafel (ta‘meya) y ful', fact: 'Se calcula que la Gran Pirámide tiene unos 2,3 millones de bloques de piedra.',
    hello: 'Ahlan! · Salam aleikum', season: 'Octubre a abril', destination: 'El Cairo',
  },
  {
    id: 'burj', name: 'Burj Khalifa', country: 'Emiratos Árabes Unidos', countryCode: 'AE', city: 'Dubái', year: '2010', continent: 'af', pos: [12, 8.5],
    text: 'El edificio más alto del mundo, con 828 metros. Desde sus miradores se ve el desierto fundirse con el golfo Pérsico.',
    dish: 'Hummus, shawarma y dátiles', fact: 'Desde los pisos altos se puede ver la puesta de sol unos minutos después que desde la calle.',
    hello: 'Marhaba!', season: 'Noviembre a marzo', destination: 'Dubái',
  },
  {
    id: 'taj', name: 'Taj Mahal', country: 'India', countryCode: 'IN', city: 'Agra', year: '1653', continent: 'as', pos: [19, 5],
    text: 'Mausoleo de mármol blanco que el emperador Sha Jahan mandó construir en memoria de su esposa Mumtaz Mahal.',
    dish: 'Curry, biryani y chai', fact: 'Su mármol cambia de tono con la luz: rosado al amanecer y dorado al atardecer.',
    hello: 'Namaste!', season: 'Octubre a marzo', destination: 'Agra',
  },
  {
    id: 'muralla', name: 'Gran Muralla', country: 'China', countryCode: 'CN', city: 'Pekín', year: 'Siglo VII a. C. – XVII', continent: 'as', pos: [23, -8],
    text: 'Un sistema de murallas de más de 21.000 km levantado durante siglos para proteger el norte de China.',
    dish: 'Pato laqueado y dumplings', fact: 'Contra la leyenda popular, no se ve a simple vista desde el espacio.',
    hello: 'Nǐ hǎo! (你好)', season: 'Abril–mayo y septiembre–octubre', destination: 'Pekín',
  },
  {
    id: 'torii', name: 'Torii de Itsukushima', country: 'Japón', countryCode: 'JP', city: 'Miyajima, Hiroshima', year: '1875', continent: 'as', pos: [32, -6],
    text: 'La gran puerta sagrada del santuario de Itsukushima parece flotar sobre el mar cuando sube la marea.',
    dish: 'Sushi, ramen y okonomiyaki', fact: 'La puerta no está clavada al fondo: se sostiene por su propio peso.',
    hello: 'Konnichiwa! (こんにちは)', season: 'Marzo–mayo (cerezos) y octubre–noviembre', destination: 'Hiroshima',
  },
  {
    id: 'opera', name: 'Ópera de Sídney', country: 'Australia', countryCode: 'AU', city: 'Sídney', year: '1973', continent: 'oc', pos: [27, 17],
    text: 'Sus velas blancas sobre la bahía la convierten en uno de los edificios más reconocibles del siglo XX. La diseñó el arquitecto danés Jørn Utzon.',
    dish: 'Barbacoa, meat pie y pavlova', fact: 'Su cubierta tiene más de un millón de tejas con un esmalte que ayuda a que se limpien con la lluvia.',
    hello: "G'day!", season: 'Septiembre–noviembre y marzo–mayo', destination: 'Sídney',
  },
];


type Row = [string, string, string, string, string, string, number, number, string, string, string, string, string, string, string, string];
const ROWS = [...eu, ...am, ...af, ...asia, ...oc] as Row[];

const POS = layoutWorld(ROWS.map((r) => ({ id: r[0], lat: r[6], lon: r[7] })));

export const LANDMARKS: Landmark[] = ROWS.map((r, i) => {
  const c = CLASSIC.find((x) => x.id === r[0]);
  return {
    id: r[0], name: r[1], country: r[2], countryCode: r[3], city: r[4], year: r[5], lat: r[6], lon: r[7],
    continent: r[8] as Continent, arch: r[9], pos: POS[i],
    text: c?.text ?? r[11], dish: c?.dish ?? r[12], fact: c?.fact ?? r[13], hello: c?.hello ?? r[14], season: c?.season ?? r[15],
    destination: c?.destination ?? r[4],
  };
});

export const CONTINENT_NAMES: Record<Continent, string> = {
  na: 'Norte y Centroamérica', sa: 'Sudamérica', eu: 'Europa', af: 'África', as: 'Asia', oc: 'Oceanía',
};
