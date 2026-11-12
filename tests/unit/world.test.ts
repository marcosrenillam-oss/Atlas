import { describe, expect, it } from 'vitest';
import { LANDMARKS } from '../../src/features/world/landmarks';
import { MIN_GAP } from '../../src/features/world/layout';
import { ARCHETYPES } from '../../src/features/world/archetypes';
import { BUILDERS } from '../../src/features/world/monuments';

describe('Mundo ATLAS', () => {
  it('tiene un monumento por cada uno de los 195 países (ONU + Vaticano y Palestina)', () => {
    expect(LANDMARKS).toHaveLength(195);
    expect(new Set(LANDMARKS.map((l) => l.countryCode)).size).toBe(195);
    expect(new Set(LANDMARKS.map((l) => l.id)).size).toBe(195);
    for (const c of ['VA', 'PS', 'ES', 'TV', 'SS']) expect(LANDMARKS.some((l) => l.countryCode === c)).toBe(true);
  });

  it('cada ficha tiene todos sus textos', () => {
    for (const l of LANDMARKS) {
      for (const k of ['name', 'country', 'city', 'year', 'text', 'dish', 'fact', 'hello', 'season', 'destination'] as const) {
        expect(l[k], `${l.id}.${k}`).toBeTruthy();
      }
      expect(l.lat).toBeGreaterThanOrEqual(-90);
      expect(l.lat).toBeLessThanOrEqual(90);
    }
  });

  it('cada monumento tiene modelo 3D', () => {
    for (const l of LANDMARKS) {
      const ok = l.arch === 'custom' ? !!BUILDERS[l.id] : !!ARCHETYPES[l.arch];
      expect(ok, `${l.id} (${l.arch})`).toBe(true);
      const g = l.arch === 'custom' ? BUILDERS[l.id]() : ARCHETYPES[l.arch](l.id);
      expect(g.children.length, l.id).toBeGreaterThan(1);
    }
  });

  it('el reparto no deja dos monumentos pegados y conserva la geografía', () => {
    let min = Infinity;
    for (let i = 0; i < LANDMARKS.length; i++) for (let j = i + 1; j < LANDMARKS.length; j++) {
      const a = LANDMARKS[i].pos, b = LANDMARKS[j].pos;
      min = Math.min(min, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
    expect(min).toBeGreaterThan(MIN_GAP * 0.85);
    const at = (cc: string) => LANDMARKS.find((l) => l.countryCode === cc)!.pos;
    expect(at('ES')[0]).toBeLessThan(at('IT')[0]); // España al oeste de Italia
    expect(at('NO')[1]).toBeLessThan(at('ZA')[1]); // Noruega al norte de Sudáfrica
    expect(at('US')[0]).toBeLessThan(at('JP')[0]);
  });
});
