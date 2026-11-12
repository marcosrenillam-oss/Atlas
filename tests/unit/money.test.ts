import { describe, expect, it } from 'vitest';
import { allocate, convertMinor, formatMoney, minorToInput, parseAmount } from '../../src/lib/money';

describe('parseAmount', () => {
  it.each([
    ['12,50', 1250], ['12.50', 1250], ['1.234,56', 123456], ['1,234.56', 123456], ['1.234', 123400],
    ['0,1', 10], ['0,005', 1], ['0,004', 0], ['€ 20', 2000], ['1 234,5', 123450], ['7', 700],
  ])('%s → %i', (input, expected) => expect(parseAmount(input, 'EUR')).toBe(expected));
  it('rechaza textos inválidos', () => {
    expect(parseAmount('', 'EUR')).toBeNull();
    expect(parseAmount('abc', 'EUR')).toBeNull();
    expect(parseAmount('1.2.3', 'EUR')).toBeNull();
  });
  it('respeta monedas sin decimales', () => {
    expect(parseAmount('1500', 'JPY')).toBe(1500);
    expect(parseAmount('1.500', 'JPY')).toBe(1500);
  });
  it('es exacto con 0,1 + 0,2', () => {
    expect(parseAmount('0,1')! + parseAmount('0,2')!).toBe(parseAmount('0,3'));
  });
});

describe('allocate', () => {
  it('reparte 100 € entre 3 sin perder céntimos', () => {
    const r = allocate(10000, [1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(r).toEqual([3334, 3333, 3333]);
  });
  it('respeta pesos', () => {
    const r = allocate(1001, [2, 1]);
    expect(r).toEqual([667, 334]);
  });
  it('suma siempre el total', () => {
    for (let total = 0; total < 2000; total += 37) {
      const r = allocate(total, [3, 7, 1, 1]);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
});

describe('formato y conversión', () => {
  it('formatea en es-ES', () => {
    expect(formatMoney(123456, 'EUR').replace(/\s/g, ' ')).toBe('1234,56 €'.replace('1234', '1234'));
  });
  it('texto editable', () => expect(minorToInput(1205, 'EUR')).toBe('12,05'));
  it('convierte con tipo manual', () => {
    expect(convertMinor(10000, 'USD', 'EUR', '0,92')).toBe(9200);
    expect(convertMinor(1500, 'JPY', 'EUR', '0.0062')).toBe(930);
    expect(convertMinor(100, 'EUR', 'JPY', '163,5')).toBe(164);
    expect(convertMinor(100, 'EUR', 'USD', 'x')).toBeNull();
  });
});
