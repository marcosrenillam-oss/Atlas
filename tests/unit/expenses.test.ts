import { describe, expect, it } from 'vitest';
import { balances, computeShares, settleUp } from '../../src/domain/expenses';
import type { Expense, Participant, Settlement } from '../../src/domain/types';

const P = (id: string): Participant => ({ id, tripId: 't', name: id, role: 'editor', canSeeExpenses: true, isMe: id === 'ana', createdAt: 0, updatedAt: 0 });
const E = (p: Partial<Expense>): Expense => ({
  id: Math.random().toString(), tripId: 't', title: 'x', amount: 0, categoryId: 'c', date: '2026-01-01', paidBy: 'ana',
  splitMode: 'equal', split: [], status: 'paid', createdAt: 0, updatedAt: 0, ...p,
});
const people = ['ana', 'luis', 'eva'].map(P);
const all = people.map((p) => ({ participantId: p.id, value: 1 }));

describe('computeShares', () => {
  it('importes exactos deben sumar el total', () => {
    expect(() => computeShares(1000, 'amounts', [{ participantId: 'a', value: 400 }, { participantId: 'b', value: 500 }])).toThrow();
    expect(computeShares(1000, 'amounts', [{ participantId: 'a', value: 400 }, { participantId: 'b', value: 600 }]).get('b')).toBe(600);
  });
  it('sin participantes falla', () => expect(() => computeShares(100, 'equal', [])).toThrow());
});

describe('saldos y liquidación', () => {
  it('caso clásico de 3 personas', () => {
    const ex = [
      E({ amount: 9000, paidBy: 'ana', split: all }), // cena 90 €
      E({ amount: 3000, paidBy: 'luis', split: all }), // taxi 30 €
      E({ amount: 1000, paidBy: 'eva', split: all, status: 'pending' }), // pendiente: no cuenta
    ];
    const b = balances(people, ex, []);
    const get = (id: string) => b.find((x) => x.participantId === id)!;
    expect(get('ana').net).toBe(5000);
    expect(get('luis').net).toBe(-1000);
    expect(get('eva').net).toBe(-4000);
    expect(b.reduce((a, x) => a + x.net, 0)).toBe(0);
    const t = settleUp(b);
    expect(t).toEqual([{ from: 'eva', to: 'ana', amount: 4000 }, { from: 'luis', to: 'ana', amount: 1000 }]);
  });
  it('los pagos registrados saldan deudas', () => {
    const ex = [E({ amount: 10000, paidBy: 'ana', split: all })];
    const s: Settlement[] = [
      { id: 's1', tripId: 't', from: 'luis', to: 'ana', amount: 3333, date: '2026-01-02', createdAt: 0, updatedAt: 0 },
      { id: 's2', tripId: 't', from: 'eva', to: 'ana', amount: 3333, date: '2026-01-02', createdAt: 0, updatedAt: 0 },
    ];
    const b = balances(people, ex, s);
    expect(b.every((x) => x.net === 0)).toBe(true);
    expect(settleUp(b)).toEqual([]);
  });
  it('los saldos siempre suman cero con céntimos impares', () => {
    const ex = [E({ amount: 1001, paidBy: 'luis', split: all }), E({ amount: 777, paidBy: 'eva', splitMode: 'shares', split: [{ participantId: 'ana', value: 2 }, { participantId: 'eva', value: 1 }] })];
    const b = balances(people, ex, []);
    expect(b.reduce((a, x) => a + x.net, 0)).toBe(0);
    const t = settleUp(b);
    const after = new Map(b.map((x) => [x.participantId, x.net]));
    for (const tr of t) {
      after.set(tr.from, after.get(tr.from)! + tr.amount);
      after.set(tr.to, after.get(tr.to)! - tr.amount);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
  });
});
