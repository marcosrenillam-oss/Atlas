import { allocate, type Minor } from '../lib/money';
import type { Expense, Participant, Settlement, SplitMode, SplitPart } from './types';

export class SplitError extends Error {}

/**
 * Parte de cada participante en un gasto. La suma es exactamente el importe.
 * - equal: value 1 = incluido.
 * - shares: value = peso entero (p. ej. 2 = paga doble).
 * - amounts: value = importe exacto en unidades menores; debe sumar el total.
 */
export function computeShares(amount: Minor, mode: SplitMode, parts: SplitPart[]): Map<string, Minor> {
  const out = new Map<string, Minor>();
  const active = parts.filter((p) => p.value > 0);
  if (active.length === 0) throw new SplitError('Selecciona al menos una persona para el reparto.');
  if (mode === 'amounts') {
    const sum = active.reduce((a, p) => a + p.value, 0);
    if (sum !== amount) throw new SplitError('Los importes del reparto no suman el total.');
    for (const p of active) out.set(p.participantId, p.value);
    return out;
  }
  const weights = active.map((p) => (mode === 'equal' ? 1 : Math.round(p.value)));
  const alloc = allocate(amount, weights);
  active.forEach((p, i) => out.set(p.participantId, alloc[i]));
  return out;
}

export interface PersonBalance {
  participantId: string;
  paid: Minor; // lo que ha pagado en gastos
  owes: Minor; // su parte de los gastos
  sent: Minor; // pagos de liquidación enviados
  received: Minor; // pagos de liquidación recibidos
  net: Minor; // >0 le deben, <0 debe
}

/** Saldos por persona. Solo cuentan los gastos pagados con pagador definido. */
export function balances(participants: Participant[], expenses: Expense[], settlements: Settlement[]): PersonBalance[] {
  const map = new Map<string, PersonBalance>();
  for (const p of participants) map.set(p.id, { participantId: p.id, paid: 0, owes: 0, sent: 0, received: 0, net: 0 });
  const get = (id: string) => {
    let b = map.get(id);
    if (!b) {
      b = { participantId: id, paid: 0, owes: 0, sent: 0, received: 0, net: 0 };
      map.set(id, b);
    }
    return b;
  };
  for (const e of expenses) {
    if (e.status !== 'paid' || !e.paidBy) continue;
    let shares: Map<string, Minor>;
    try {
      shares = computeShares(e.amount, e.splitMode, e.split);
    } catch {
      continue; // gasto con reparto inválido: no altera saldos
    }
    get(e.paidBy).paid += e.amount;
    for (const [pid, v] of shares) get(pid).owes += v;
  }
  for (const s of settlements) {
    get(s.from).sent += s.amount;
    get(s.to).received += s.amount;
  }
  for (const b of map.values()) b.net = b.paid - b.owes + b.sent - b.received;
  return [...map.values()];
}

export interface Transfer {
  from: string;
  to: string;
  amount: Minor;
}

/** Transferencias mínimas (aprox.) para saldar: emparejamiento voraz deudor-acreedor. */
export function settleUp(bal: PersonBalance[]): Transfer[] {
  const debtors = bal.filter((b) => b.net < 0).map((b) => ({ id: b.participantId, v: -b.net }));
  const creditors = bal.filter((b) => b.net > 0).map((b) => ({ id: b.participantId, v: b.net }));
  debtors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  creditors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const out: Transfer[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].v, creditors[j].v);
    if (x > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: x });
    debtors[i].v -= x;
    creditors[j].v -= x;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

export function totalsByCategory(expenses: Expense[]): Map<string, Minor> {
  const m = new Map<string, Minor>();
  for (const e of expenses) m.set(e.categoryId, (m.get(e.categoryId) ?? 0) + e.amount);
  return m;
}

export function sumExpenses(expenses: Expense[], status?: Expense['status']): Minor {
  return expenses.reduce((a, e) => (status && e.status !== status ? a : a + e.amount), 0);
}
