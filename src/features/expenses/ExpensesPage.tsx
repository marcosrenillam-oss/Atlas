import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Wallet } from 'lucide-react';
import { db } from '../../data/db';
import { useTrips } from '../../data/queries';
import { useProfile } from '../../data/settings';
import { balances, sumExpenses, totalsByCategory } from '../../domain/expenses';
import { formatMoney } from '../../lib/money';
import { formatRange } from '../../lib/dates';
import { Donut } from '../../ui/Charts';
import { Empty } from '../../ui/Empty';
import type { Expense } from '../../domain/types';

export function ExpensesPage() {
  const trips = useTrips();
  const profile = useProfile();
  const data = useLiveQuery(async () => ({
    expenses: await db.expenses.toArray(),
    participants: await db.participants.toArray(),
    settlements: await db.settlements.toArray(),
    categories: await db.categories.toArray(),
  }), []);

  const rows = useMemo(() => {
    if (!trips || !data) return [];
    return trips
      .map((t) => {
        const es = data.expenses.filter((e) => e.tripId === t.id);
        const ps = data.participants.filter((p) => p.tripId === t.id);
        const me = ps.find((p) => p.isMe);
        const bal = me ? balances(ps, es, data.settlements.filter((s) => s.tripId === t.id)).find((b) => b.participantId === me.id) : undefined;
        return { trip: t, spent: sumExpenses(es), pending: sumExpenses(es, 'pending'), count: es.length, myNet: bal?.net ?? 0 };
      })
      .filter((r) => r.count > 0 || r.trip.budget !== undefined)
      .sort((a, b) => (b.trip.startDate ?? '').localeCompare(a.trip.startDate ?? ''));
  }, [trips, data]);

  const byCurrency = useMemo(() => {
    const m = new Map<string, { spent: number; pending: number; myNet: number; expenses: Expense[] }>();
    for (const r of rows) {
      const v = m.get(r.trip.currency) ?? { spent: 0, pending: 0, myNet: 0, expenses: [] };
      v.spent += r.spent;
      v.pending += r.pending;
      v.myNet += r.myNet;
      v.expenses.push(...(data?.expenses.filter((e) => e.tripId === r.trip.id) ?? []));
      m.set(r.trip.currency, v);
    }
    return [...m].sort((a, b) => (a[0] === profile.currency ? -1 : b[0] === profile.currency ? 1 : a[0].localeCompare(b[0])));
  }, [rows, data, profile.currency]);

  if (!trips || !data) return <main className="page" />;

  return (
    <main className="page stagger">
      <div className="page-head"><h1>Mis <span className="serif grad-text">gastos</span></h1></div>
      {rows.length === 0 ? (
        <div className="card">
          <Empty icon={Wallet} title="Aún no hay gastos" text="Los gastos se registran dentro de cada viaje. Aquí verás el resumen de todos." action={<Link className="btn secondary sm" to="/viajes">Ir a Viajes</Link>} />
        </div>
      ) : (
        <div className="stack-lg">
          {byCurrency.map(([cur, v]) => {
            const slices = [...totalsByCategory(v.expenses)].map(([id, value]) => ({ label: data.categories.find((c) => c.id === id)?.name ?? 'Otros', value })).sort((a, b) => b.value - a.value);
            return (
              <section key={cur} className="stack">
                {byCurrency.length > 1 && <div className="label">{cur}</div>}
                <div className="stats">
                  <div className="stat"><div className="lbl">Total gastado</div><div className="val">{formatMoney(v.spent, cur)}</div><div className="sub">{formatMoney(v.pending, cur)} pendiente</div></div>
                  <div className="stat">
                    <div className="lbl">Tu saldo</div>
                    <div className="val" style={{ color: v.myNet > 0 ? 'var(--success)' : v.myNet < 0 ? 'var(--danger)' : undefined }}>{v.myNet > 0 ? '+' : ''}{formatMoney(v.myNet, cur)}</div>
                    <div className="sub">{v.myNet > 0 ? 'te deben' : v.myNet < 0 ? 'debes' : 'en paz'}</div>
                  </div>
                </div>
                {slices.length > 0 && <div className="card"><Donut slices={slices} currency={cur} /></div>}
              </section>
            );
          })}
          <section>
            <div className="section-head"><h2>Por viaje</h2></div>
            <div className="list">
              {rows.map(({ trip, spent, pending, myNet }) => {
                const pct = trip.budget ? Math.min(100, (spent / trip.budget) * 100) : null;
                return (
                  <Link key={trip.id} to={`/viajes/${trip.id}/gastos`} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="grow stack-sm" style={{ gap: 4 }}>
                      <div className="row-between">
                        <span className="ellipsis" style={{ fontWeight: 600 }}>{trip.name}</span>
                        <span className="num" style={{ fontWeight: 600 }}>{formatMoney(spent, trip.currency)}</span>
                      </div>
                      <div className="meta">
                        {formatRange(trip.startDate, trip.endDate)}
                        {trip.budget !== undefined ? ` · presupuesto ${formatMoney(trip.budget, trip.currency)}` : ''}
                        {pending ? ` · ${formatMoney(pending, trip.currency)} pendiente` : ''}
                        {myNet ? ` · ${myNet > 0 ? 'te deben' : 'debes'} ${formatMoney(Math.abs(myNet), trip.currency)}` : ''}
                      </div>
                      {pct !== null && <div className={`progress${spent > (trip.budget ?? 0) ? ' over' : ''}`}><div style={{ width: `${pct}%` }} /></div>}
                    </div>
                    <ChevronRight className="chev" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
