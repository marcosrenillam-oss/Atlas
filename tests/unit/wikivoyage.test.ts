import { describe, expect, it } from 'vitest';
import { cleanWiki, parseListings } from '../../src/services/wikivoyage';

const ES = `== Ver ==
* {{ver | nombre=Torre de Belém | alt= | url=https://www.torrebelem.gov.pt | dirección=Av. Brasília | lat=38.6916 | long=-9.2160 | descripción=Fortaleza del siglo XVI junto al [[río Tajo|Tajo]], ''símbolo'' de la ciudad.<ref>x</ref>}}
* {{ver|nombre=Monasterio de los Jerónimos|lat=38.6979|long=-9.2063|descripción=Obra maestra del estilo {{lang|pt|manuelino}}.}}
== Hacer ==
* {{hacer|nombre=Tranvía 28|descripción=Recorre Alfama.}}
* {{comer|nombre=Pastéis de Belém}}`;
const EN = `* {{see| name=Belém Tower | lat=38.69 | long=-9.21 | content=A fortified tower.}}
* {{listing | type=see | name=Jerónimos Monastery}}
* {{listing | type=eat | name=Some café}}`;

describe('Wikivoyage: «Qué ver»', () => {
  it('lee las fichas en español (ver primero, luego hacer; sin comer)', () => {
    const s = parseListings(ES);
    expect(s.map((x) => x.name)).toEqual(['Torre de Belém', 'Monasterio de los Jerónimos', 'Tranvía 28']);
    expect(s[0]).toMatchObject({ lat: 38.6916, lng: -9.216, kind: 'ver', address: 'Av. Brasília', url: 'https://www.torrebelem.gov.pt' });
    expect(s[0].description).toBe('Fortaleza del siglo XVI junto al Tajo, símbolo de la ciudad.');
    expect(s[2].kind).toBe('hacer');
  });
  it('lee las fichas en inglés y las de tipo listing', () => {
    expect(parseListings(EN).map((x) => x.name)).toEqual(['Belém Tower', 'Jerónimos Monastery']);
  });
  it('limpia el marcado de wiki', () => {
    expect(cleanWiki("Ver [[Alfama|el barrio]] y '''Baixa'''")).toBe('Ver el barrio y Baixa');
  });
});

import { districtsOf } from '../../src/services/wikivoyage';
describe('Wikivoyage: barrios de las ciudades grandes', () => {
  it('elige los barrios más citados', () => {
    const t = 'Ver [[Lisbon/Belém#Q1|torre]], [[Lisbon/Belém#Q2|monasterio]], [[Lisbon/Alfama]] y [[Lisbon/Baixa|Baixa]] [[Lisbon/Belém]]';
    expect(districtsOf('Lisbon', t, 2)).toEqual(['Lisbon/Belém', 'Lisbon/Alfama']);
  });
});
