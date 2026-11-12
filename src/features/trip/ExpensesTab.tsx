import { useMemo, useState } from 'react';
import { ArrowRight, Check, Plus, Receipt, Trash2 } from 'lucide-react';
import type { TripWithStatus } from '../../data/queries';
import { useCategories, useExpenses, useParticipants, useSettlements } from '../../data/queries';
import { balances, settleUp, sumExpenses, totalsByCategory } from '../../domain/expenses';
import type { Expense, ExpenseCategory, Settlement } from '../../domain/types';
import { formatMoney } from '../../lib/money';
import { fmt, today } from '../../lib/dates';
import { deleteCategory, deleteExpense, deleteSettlement, save, update } from '../../data/repo';
import { Segmented } from '../../ui/Controls';
import { Empty } from '../../ui/Empty';
import { Icon, ICON_CHOICES } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { useUI } from '../../ui/UIProvider';
import { Bars, Donut } from '../../ui/Charts';
import { ExpenseForm } from './ExpenseForm';
import { QuickExpense } from './QuickExpense';
import { Zap } from 'lucide-react';
import { categoryTone } from '../../ui/tones';

type View = 'lista' | 'saldos' | 'graficos';

export function ExpensesTab({ trip }: { trip: TripWithStatus }) {
  const expenses = useExpenses(trip.id);
  const participants = useParticipants(trip.id) ?? [];
  const settlements = useSettlements(trip.id) ?? [];
  const categories = useCategories(trip.id) ?? [];
  const ui = useUI();
  const [view, setView] = useState<View>('lista');
  const [filter, setFilter] = useState<'all' | 'pending' | string>('all');
  const [form, setForm] = useState<{ expense?: Expense } | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [quick, setQuick] = useState(false);

  const list = useMemo(() => expenses ?? [], [expenses]);
  const name = (id: string | null) => participants.find((p) => p.id === id)?.name ?? '—';
  const catOf = (id: string) => categories.find((c) => c.id === id);
  const spent = sumExpenses(list);
  const paid = sumExpenses(list, 'paid');
  const pending = sumExpenses(list, 'pending');
  const bal = useMemo(() => balances(participants, list, settlements), [participants, list, settlements]);
  const transfers = useMemo(() => settleUp(bal), [bal]);
  const cur = trip.currency;

  if (expenses === undefined) return null;

  const filtered = list
    .filter((e) => (filter === 'all' ? true : filter === 'pending' ? e.status === 'pending' : e.categoryId === filter))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const groups = new Map<string, Expense[]>();
  for (const e of filtered) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
  }

  function more(e: Expense) {
    ui.menu(e.title, [
      { label: 'Editar', onSelect: () => setForm({ expense: e }) },
      { label: e.status === 'pending' ? 'Marcar como pagado' : 'Marcar como pendiente', onSelect: () => void update<Expense>('expenses', e.id, { status: e.status === 'pending' ? 'paid' : 'pending' }) },
      { label: 'Duplicar', onSelect: () => void save<Expense>('expenses', { ...e, id: undefined, createdAt: undefined, date: today() } as never) },
      { label: 'Eliminar', danger: true, onSelect: async () => {
        if (await ui.confirm({ title: `¿Eliminar «${e.title}»?`, message: formatMoney(e.amount, cur), confirmLabel: 'Eliminar', danger: true })) await deleteExpense(e);
      } },
    ]);
  }

  async function recordTransfer(from: string, to: string, amount: number) {
    const ok = await ui.confirm({ title: 'Registrar pago', message: `${name(from)} paga ${formatMoney(amount, cur)} a ${name(to)}.`, confirmLabel: 'Registrar' });
    if (ok) await save<Settlement>('settlements', { tripId: trip.id, from, to, amount, date: today() });
  }

  const byCat = [...totalsByCategory(list)].map(([id, v]) => ({ label: catOf(id)?.name ?? 'Sin categoría', value: v })).sort((a, b) => b.value - a.value);
  const byPerson = bal.filter((b) => b.paid > 0).map((b) => ({ label: name(b.participantId), value: b.paid })).sort((a, b) => b.value - a.value);
  const byDay = [...list.reduce((m, e) => m.set(e.date, (m.get(e.date) ?? 0) + e.amount), new Map<string, number>())].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => ({ label: fmt.weekdayShort(d), value: v }));

  return (
    <div className="stack">
      <div className="stats">
        <div className="stat">
          <div className="lbl">Total</div>
          <div className="val">{formatMoney(spent, cur)}</div>
          <div className="sub">{pending ? `${formatMoney(pending, cur)} pendiente` : `${list.length} gastos`}</div>
        </div>
        <div className="stat">
          <div className="lbl">{trip.budget !== undefined ? 'Disponible' : 'Pagado'}</div>
          <div className="val" style={{ color: trip.budget !== undefined && spent > trip.budget ? 'var(--danger)' : undefined }}>
            {trip.budget !== undefined ? formatMoney(trip.budget - spent, cur) : formatMoney(paid, cur)}
          </div>
          <div className="sub">{trip.budget !== undefined ? `de ${formatMoney(trip.budget, cur)}` : 'sin presupuesto'}</div>
        </div>
      </div>
      {trip.budget !== undefined && trip.budget > 0 && (
        <div className={`progress${spent > trip.budget ? ' over' : ''}`} aria-label="Presupuesto consumido"><div style={{ width: `${Math.min(100, (spent / trip.budget) * 100)}%` }} /></div>
      )}

      <div className="row-between">
        <Segmented label="Vista de gastos" value={view} onChange={setView} options={[{ value: 'lista', label: 'Gastos' }, { value: 'saldos', label: 'Saldos' }, { value: 'graficos', label: 'Gráficos' }]} />
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn filled" aria-label="Gasto rápido" onClick={() => setQuick(true)}><Zap /></button>
          <button className="btn sm" onClick={() => setForm({})}><Plus /> Gasto</button>
        </div>
      </div>

      {view === 'lista' && (
        list.length === 0 ? (
          <div className="card flat">
            <Empty icon={Receipt} title="Sin gastos" text="Registra lo que pagáis y ATLAS calculará quién debe a quién." action={<button className="btn secondary sm" onClick={() => setForm({})}><Plus /> Añadir gasto</button>} />
          </div>
        ) : (
          <>
            <div className="chips">
              <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos</button>
              <button className="chip" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Pendientes <span className="count">{list.filter((e) => e.status === 'pending').length}</span></button>
              {categories.filter((c) => list.some((e) => e.categoryId === c.id)).map((c) => (
                <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}><Icon name={c.icon} /> {c.name}</button>
              ))}
              <button className="chip" onClick={() => setCatsOpen(true)}>Categorías…</button>
            </div>
            {filtered.length === 0 && <p className="small muted center">No hay gastos con este filtro.</p>}
            {[...groups].map(([date, es]) => (
              <section key={date}>
                <div className="row-between small muted" style={{ margin: '4px 4px 6px' }}>
                  <span className="cap">{fmt.weekday(date)}</span>
                  <span className="num">{formatMoney(sumExpenses(es), cur)}</span>
                </div>
                <div className="list">
                  {es.map((e) => {
                    const c = catOf(e.categoryId);
                    return (
                      <button key={e.id} className="list-row" onClick={() => more(e)}>
                        <div className="icon-tile" data-tone={categoryTone(e.categoryId)}><Icon name={c?.icon ?? 'Shapes'} /></div>
                        <div className="grow">
                          <div className="ellipsis" style={{ fontWeight: 600 }}>{e.title}</div>
                          <div className="meta ellipsis">
                            {c?.name ?? 'Sin categoría'} · {e.status === 'pending' ? (e.paidBy ? `pendiente (${name(e.paidBy)})` : 'pendiente') : `pagó ${name(e.paidBy)}`}
                            {e.original ? ` · ${formatMoney(e.original.amount, e.original.currency)}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="num" style={{ fontWeight: 600 }}>{formatMoney(e.amount, cur)}</div>
                          {e.status === 'pending' && <span className="pill warn">Pendiente</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )
      )}

      {view === 'saldos' && (
        <>
          <div className="list">
            {bal.map((b) => (
              <div key={b.participantId} className="list-row">
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{name(b.participantId)}</div>
                  <div className="meta">Ha pagado {formatMoney(b.paid, cur)} · su parte {formatMoney(b.owes, cur)}</div>
                </div>
                <div className={`num ${b.net > 0 ? '' : b.net < 0 ? '' : 'muted'}`} style={{ fontWeight: 650, color: b.net > 0 ? 'var(--success)' : b.net < 0 ? 'var(--danger)' : undefined }}>
                  {b.net > 0 ? '+' : ''}{formatMoney(b.net, cur)}
                </div>
              </div>
            ))}
          </div>
          <p className="tiny faint">Positivo: le deben. Negativo: debe. Solo cuentan los gastos pagados.</p>
          <section>
            <div className="section-head"><h2>Para quedar en paz</h2></div>
            {transfers.length === 0 ? (
              <div className="card flat row small muted"><Check size={18} style={{ color: 'var(--success)' }} /> No hay deudas pendientes.</div>
            ) : (
              <div className="list">
                {transfers.map((t, i) => (
                  <div key={i} className="list-row">
                    <div className="grow row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <strong>{name(t.from)}</strong> <ArrowRight size={15} className="faint" /> <strong>{name(t.to)}</strong>
                    </div>
                    <span className="num" style={{ fontWeight: 650 }}>{formatMoney(t.amount, cur)}</span>
                    <button className="btn sm secondary" onClick={() => void recordTransfer(t.from, t.to, t.amount)}>Saldar</button>
                  </div>
                ))}
              </div>
            )}
          </section>
          {settlements.length > 0 && (
            <section>
              <div className="section-head"><h2>Pagos registrados</h2></div>
              <div className="list">
                {[...settlements].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                  <div key={s.id} className="list-row">
                    <div className="grow">
                      <div>{name(s.from)} → {name(s.to)}</div>
                      <div className="meta">{fmt.dayYear(s.date)}</div>
                    </div>
                    <span className="num">{formatMoney(s.amount, cur)}</span>
                    <button className="icon-btn sm muted" aria-label="Eliminar pago" onClick={async () => { if (await ui.confirm({ title: '¿Eliminar este pago?', confirmLabel: 'Eliminar', danger: true })) await deleteSettlement(s); }}><Trash2 /></button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {view === 'graficos' && (
        list.length === 0 ? <div className="card flat"><Empty icon={Receipt} title="Sin datos" text="Los gráficos aparecen al registrar gastos." /></div> : (
          <>
            <div className="card"><div className="label" style={{ marginBottom: 12 }}>Por categoría</div><Donut slices={byCat} currency={cur} /></div>
            {byPerson.length > 0 && <div className="card"><div className="label" style={{ marginBottom: 12 }}>Pagado por persona</div><Bars rows={byPerson} currency={cur} /></div>}
            {byDay.length > 1 && <div className="card"><div className="label" style={{ marginBottom: 12 }}>Por día</div><Bars rows={byDay} currency={cur} /></div>}
          </>
        )
      )}

      {form && <ExpenseForm trip={trip} expense={form.expense} participants={participants} categories={categories} onClose={() => setForm(null)} onManageCategories={() => setCatsOpen(true)} />}
      {quick && <QuickExpense trip={trip} onClose={() => setQuick(false)} />}
      {catsOpen && <CategoriesSheet tripId={trip.id} categories={categories} onClose={() => setCatsOpen(false)} />}
    </div>
  );
}

function CategoriesSheet({ tripId, categories, onClose }: { tripId: string; categories: ExpenseCategory[]; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Shapes');
  const ui = useUI();
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) return ui.toast('Ya existe esa categoría.', { kind: 'error' });
    await save<ExpenseCategory>('categories', { tripId, name: n, icon, builtIn: false });
    setName('');
  }
  return (
    <Sheet open title="Categorías" onClose={onClose} closeLabel="Cerrar">
      <div className="stack">
        <div className="list">
          {categories.map((c) => (
            <div key={c.id} className="list-row">
              <div className="icon-tile" data-tone={categoryTone(c.id)}><Icon name={c.icon} /></div>
              <span className="grow">{c.name}</span>
              {c.builtIn ? <span className="tiny faint">Base</span> : (
                <button className="icon-btn sm muted" aria-label={`Eliminar ${c.name}`} onClick={async () => {
                  if (await ui.confirm({ title: `¿Eliminar «${c.name}»?`, message: 'Sus gastos pasarán a «Otros».', confirmLabel: 'Eliminar', danger: true })) await deleteCategory(c, 'cat-otros');
                }}><Trash2 /></button>
              )}
            </div>
          ))}
        </div>
        <form className="stack-sm" onSubmit={add}>
          <span className="label">Nueva categoría para este viaje</span>
          <div className="input-group">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Forfait, peajes, regalos…" aria-label="Nombre de la categoría" />
            <button className="btn" disabled={!name.trim()}>Añadir</button>
          </div>
          <div className="chips" style={{ flexWrap: 'wrap', margin: 0, padding: 0 }} role="group" aria-label="Icono">
            {ICON_CHOICES.map((k) => (
              <button type="button" key={k} className="chip" aria-pressed={icon === k} aria-label={k} onClick={() => setIcon(k)} style={{ padding: '0 10px' }}><Icon name={k} /></button>
            ))}
          </div>
        </form>
      </div>
    </Sheet>
  );
}
