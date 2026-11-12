import { useMemo, useState } from 'react';
import { Sheet } from '../../ui/Sheet';
import { Field, Segmented, Switch } from '../../ui/Controls';
import { MoneyInput } from '../../ui/MoneyInput';
import { Icon } from '../../ui/Icon';
import { useUI } from '../../ui/UIProvider';
import type { Expense, ExpenseCategory, Participant, SplitMode, SplitPart, Trip } from '../../domain/types';
import { computeShares, SplitError } from '../../domain/expenses';
import { convertMinor, CURRENCIES, formatMoney, type Minor } from '../../lib/money';
import { isISODate, today } from '../../lib/dates';
import { save, update } from '../../data/repo';

export function ExpenseForm({ trip, expense, participants, categories, onClose, onManageCategories }: {
  trip: Trip;
  expense?: Expense;
  participants: Participant[];
  categories: ExpenseCategory[];
  onClose: () => void;
  onManageCategories: () => void;
}) {
  const ui = useUI();
  const me = participants.find((p) => p.isMe) ?? participants[0];
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState<Minor | undefined>(expense?.amount);
  const [amountValid, setAmountValid] = useState(true);
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? categories[0]?.id ?? 'cat-otros');
  const [date, setDate] = useState(expense?.date ?? (trip.startDate && today() < trip.startDate ? trip.startDate : today()));
  const [paidBy, setPaidBy] = useState<string | null>(expense?.paidBy ?? me?.id ?? null);
  const [status, setStatus] = useState<Expense['status']>(expense?.status ?? 'paid');
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode ?? 'equal');
  const [parts, setParts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const p of participants) init[p.id] = expense ? expense.split.find((s) => s.participantId === p.id)?.value ?? 0 : 1;
    return init;
  });
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [foreign, setForeign] = useState(!!expense?.original);
  const [fAmount, setFAmount] = useState<Minor | undefined>(expense?.original?.amount);
  const [fCurrency, setFCurrency] = useState(expense?.original?.currency ?? (trip.currency === 'EUR' ? 'USD' : 'EUR'));
  const [rate, setRate] = useState(expense?.original?.rate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Con moneda extranjera, el importe en la moneda del viaje se calcula con el tipo manual.
  const converted = foreign && fAmount !== undefined && rate ? convertMinor(fAmount, fCurrency, trip.currency, rate) : null;
  const total = foreign ? converted ?? undefined : amount;

  const splitParts: SplitPart[] = participants.map((p) => ({ participantId: p.id, value: parts[p.id] ?? 0 }));
  const preview = useMemo(() => {
    if (total === undefined) return null;
    try {
      return computeShares(total, mode, splitParts);
    } catch (e) {
      return e as SplitError;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, mode, JSON.stringify(splitParts)]);
  const amountsSum = mode === 'amounts' ? splitParts.reduce((a, p) => a + p.value, 0) : 0;

  function changeMode(m: SplitMode) {
    setMode(m);
    const next: Record<string, number> = {};
    const included = participants.filter((p) => (parts[p.id] ?? 0) > 0);
    const list = included.length ? included : participants;
    if (m === 'amounts' && total !== undefined) {
      // Propuesta inicial: reparto igual exacto entre los incluidos.
      const sh = computeShares(total, 'equal', list.map((p) => ({ participantId: p.id, value: 1 })));
      for (const p of participants) next[p.id] = sh.get(p.id) ?? 0;
    } else for (const p of participants) next[p.id] = list.includes(p) ? 1 : 0;
    setParts(next);
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const er: Record<string, string> = {};
    if (!title.trim()) er.title = 'Describe el gasto.';
    if (foreign) {
      if (fAmount === undefined || fAmount <= 0) er.amount = 'Indica el importe pagado.';
      else if (converted === null) er.rate = 'Tipo de cambio no válido (p. ej. 0,92).';
    } else if (!amountValid || amount === undefined || amount <= 0) er.amount = 'Indica un importe mayor que cero.';
    if (!isISODate(date)) er.date = 'Fecha no válida.';
    if (participants.length === 0) er.split = 'Añade viajeros al viaje para repartir gastos.';
    else if (preview instanceof Error) er.split = preview.message;
    if (status === 'paid' && !paidBy) er.paidBy = 'Indica quién pagó.';
    setErrors(er);
    if (Object.keys(er).length || total === undefined) return;
    const rec = {
      tripId: trip.id, title: title.trim(), amount: total, categoryId, date, paidBy, status, splitMode: mode,
      split: splitParts.filter((p) => p.value > 0), notes: notes.trim() || undefined,
      original: foreign && fAmount !== undefined ? { amount: fAmount, currency: fCurrency, rate: rate.trim() } : undefined,
    };
    try {
      if (expense) await update<Expense>('expenses', expense.id, rec);
      else await save<Expense>('expenses', rec);
      onClose();
    } catch (err) {
      ui.toast((err as Error).message, { kind: 'error' });
    }
  }

  return (
    <Sheet open full title={expense ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose} action={{ label: 'Guardar', onClick: () => void submit(), form: 'exp-form' }}>
      <form id="exp-form" className="form" onSubmit={submit} noValidate>
        <Field label="Concepto" htmlFor="e-title" error={errors.title}>
          <input id="e-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cena, gasolina, entradas…" aria-invalid={!!errors.title || undefined} />
        </Field>

        {!foreign ? (
          <Field label={`Importe (${trip.currency})`} htmlFor="e-amount" error={errors.amount}>
            <MoneyInput id="e-amount" value={amount} currency={trip.currency} invalid={!!errors.amount} onChange={(v, ok) => { setAmount(v); setAmountValid(ok); }} />
          </Field>
        ) : (
          <div className="card flat stack-sm">
            <Field label="Importe pagado" error={errors.amount}>
              <div className="input-group">
                <MoneyInput value={fAmount} currency={fCurrency} onChange={(v) => setFAmount(v)} ariaLabel="Importe en moneda extranjera" />
                <select className="select" style={{ width: 96 }} value={fCurrency} onChange={(e) => setFCurrency(e.target.value)} aria-label="Moneda pagada">
                  {CURRENCIES.filter((c) => c !== trip.currency).map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </Field>
            <Field label={`Tipo de cambio: 1 ${fCurrency} = ? ${trip.currency}`} error={errors.rate} hint="Introdúcelo tú (el del banco o la tarjeta). ATLAS no consulta cambios en Internet.">
              <input className="input" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0,92" />
            </Field>
            <div className="small">Equivale a <strong className="num">{converted !== null && converted !== undefined ? formatMoney(converted, trip.currency) : '—'}</strong></div>
          </div>
        )}
        <div className="row-between">
          <span className="small">Pagado en otra moneda</span>
          <Switch label="Pagado en otra moneda" checked={foreign} onChange={setForeign} />
        </div>

        <div className="grid-2">
          <Field label="Categoría" htmlFor="e-cat">
            <select id="e-cat" className="select" value={categoryId} onChange={(e) => (e.target.value === '__new' ? onManageCategories() : setCategoryId(e.target.value))}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new">Gestionar categorías…</option>
            </select>
          </Field>
          <Field label="Fecha" htmlFor="e-date" error={errors.date}>
            <input id="e-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Estado">
          <Segmented label="Estado del pago" value={status} onChange={setStatus} options={[{ value: 'paid', label: 'Pagado' }, { value: 'pending', label: 'Pendiente de pago' }]} />
        </Field>

        <Field label={status === 'paid' ? 'Pagado por' : 'Lo pagará'} htmlFor="e-paid" error={errors.paidBy}>
          <select id="e-paid" className="select" value={paidBy ?? ''} onChange={(e) => setPaidBy(e.target.value || null)}>
            {status === 'pending' && <option value="">Sin decidir</option>}
            {participants.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isMe ? ' (tú)' : ''}</option>)}
          </select>
        </Field>

        <div className="field">
          <span className="label">Reparto</span>
          <Segmented label="Modo de reparto" value={mode} onChange={changeMode} options={[{ value: 'equal', label: 'A partes iguales' }, { value: 'shares', label: 'Por partes' }, { value: 'amounts', label: 'Importes' }]} />
          <div className="list" style={{ marginTop: 8 }}>
            {participants.map((p) => {
              const v = parts[p.id] ?? 0;
              const share = preview instanceof Map ? preview.get(p.id) : undefined;
              return (
                <div key={p.id} className="list-row" style={{ minHeight: 50 }}>
                  <span className="grow ellipsis">{p.name}</span>
                  {mode === 'equal' && (
                    <>
                      <span className="small muted num">{share !== undefined ? formatMoney(share, trip.currency) : ''}</span>
                      <Switch label={`Incluir a ${p.name}`} checked={v > 0} onChange={(on) => setParts((x) => ({ ...x, [p.id]: on ? 1 : 0 }))} />
                    </>
                  )}
                  {mode === 'shares' && (
                    <>
                      <span className="small muted num">{share !== undefined ? formatMoney(share, trip.currency) : ''}</span>
                      <input className="input" inputMode="numeric" style={{ width: 64, textAlign: 'center' }} value={v || ''} placeholder="0" aria-label={`Partes de ${p.name}`}
                        onChange={(e) => setParts((x) => ({ ...x, [p.id]: Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 0) }))} />
                    </>
                  )}
                  {mode === 'amounts' && (
                    <div style={{ width: 150 }}>
                      <MoneyInput value={v || undefined} currency={trip.currency} ariaLabel={`Importe de ${p.name}`} onChange={(val) => setParts((x) => ({ ...x, [p.id]: val ?? 0 }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {mode === 'amounts' && total !== undefined && (
            <span className={`small ${amountsSum === total ? 'muted' : 'error'}`}>
              Asignado {formatMoney(amountsSum, trip.currency)} de {formatMoney(total, trip.currency)}
              {amountsSum !== total ? ` · ${amountsSum < total ? 'faltan' : 'sobran'} ${formatMoney(Math.abs(total - amountsSum), trip.currency)}` : ''}
            </span>
          )}
          {errors.split && <span className="error" role="alert">{errors.split}</span>}
        </div>

        <Field label="Notas" htmlFor="e-notes">
          <textarea id="e-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <p className="tiny faint"><Icon name={categories.find((c) => c.id === categoryId)?.icon ?? 'Shapes'} size={12} /> Los importes se guardan en céntimos exactos; el reparto asigna los céntimos sobrantes sin perder ninguno.</p>
      </form>
    </Sheet>
  );
}
