import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import { Sheet } from '../../ui/Sheet';
import { Icon } from '../../ui/Icon';
import { useUI } from '../../ui/UIProvider';
import { celebrate } from '../../ui/Motion';
import { useCategories, useParticipants } from '../../data/queries';
import { save } from '../../data/repo';
import type { Expense, Trip } from '../../domain/types';
import { convertMinor, currencyDecimals, CURRENCIES, formatMoney, parseAmount } from '../../lib/money';
import { today } from '../../lib/dates';
import { getRate, rateToInput, type FxRate } from '../../services/fx';
import { categoryTone } from '../../ui/tones';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'] as const;

/** Apuntar un gasto en tres toques: importe, categoría, guardar. */
export function QuickExpense({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const ui = useUI();
  const participants = useParticipants(trip.id) ?? [];
  const categories = useCategories(trip.id) ?? [];
  const [text, setText] = useState('');
  const [cat, setCat] = useState('cat-comida');
  const [title, setTitle] = useState('');
  const [currency, setCurrency] = useState(trip.currency);
  const [fx, setFx] = useState<FxRate | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const me = participants.find((p) => p.isMe) ?? participants[0];
  const [payer, setPayer] = useState<string | undefined>(undefined);
  const paidBy = payer ?? me?.id;
  const decimals = currencyDecimals(currency);

  useEffect(() => {
    if (currency === trip.currency) return setFx(null);
    setFxLoading(true);
    void getRate(currency, trip.currency).then((r) => {
      setFx(r);
      setFxLoading(false);
    });
  }, [currency, trip.currency]);

  const amount = parseAmount(text || '0', currency) ?? 0;
  const inTrip = currency === trip.currency ? amount : fx ? convertMinor(amount, currency, trip.currency, rateToInput(fx.rate)) : null;

  function press(k: (typeof KEYS)[number]) {
    setText((t) => {
      if (k === 'del') return t.slice(0, -1);
      if (k === ',') return decimals === 0 || t.includes(',') ? t : (t || '0') + ',';
      const [, frac] = t.split(',');
      if (frac !== undefined && frac.length >= decimals) return t;
      if (t === '0') return k;
      return t.length >= 9 ? t : t + k;
    });
  }

  async function submit(e?: React.MouseEvent) {
    if (!amount || inTrip === null || !inTrip) return ui.toast(inTrip === null ? 'Sin tipo de cambio: conéctate una vez o usa el formulario completo.' : 'Escribe un importe.', { kind: 'error' });
    if (!paidBy) return ui.toast('Añade viajeros al viaje.', { kind: 'error' });
    const c = categories.find((x) => x.id === cat);
    await save<Expense>('expenses', {
      tripId: trip.id, title: title.trim() || c?.name || 'Gasto', amount: inTrip, categoryId: cat, date: today(), paidBy,
      status: 'paid', splitMode: 'equal', split: participants.map((p) => ({ participantId: p.id, value: 1 })),
      original: currency !== trip.currency && fx ? { amount, currency, rate: rateToInput(fx.rate) } : undefined,
    });
    if (e) celebrate(e.clientX, e.clientY, 12);
    ui.toast(`Gasto de ${formatMoney(inTrip, trip.currency)} apuntado`);
    onClose();
  }

  return (
    <Sheet open full title="Gasto rápido" onClose={onClose}>
      <div className="stack quick-exp">
        <div className="qe-amount" aria-live="polite">
          <span className="num">{text ? text : '0'}</span>
          <select className="qe-cur" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Moneda del gasto">
            {[trip.currency, ...CURRENCIES.filter((c) => c !== trip.currency)].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {currency !== trip.currency && (
          <div className="small muted center">
            {fxLoading ? 'Buscando el tipo de cambio…' : fx ? <>≈ <strong>{formatMoney(inTrip ?? 0, trip.currency)}</strong> · 1 {currency} = {rateToInput(fx.rate)} {trip.currency} ({fx.cached ? `guardado del ${fx.date}` : `referencia del ${fx.date}`})</> : 'Sin tipo de cambio disponible sin conexión.'}
          </div>
        )}
        <div className="chips" role="group" aria-label="Categoría">
          {categories.map((c) => (
            <button key={c.id} type="button" className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
              <span className="icon-tile" data-tone={categoryTone(c.id)} style={{ width: 20, height: 20, borderRadius: 6 }}><Icon name={c.icon} size={12} /></span>
              {c.name}
            </button>
          ))}
        </div>
        <div className="keypad" role="group" aria-label="Teclado numérico">
          {KEYS.map((k) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'Borrar' : k === ',' ? 'Coma decimal' : k}>
              {k === 'del' ? <Delete /> : k}
            </button>
          ))}
        </div>
        <div className="grid-2">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Concepto (opcional)" aria-label="Concepto" />
          <select className="select" value={paidBy ?? ''} onChange={(e) => setPayer(e.target.value)} aria-label="Quién pagó">
            {participants.map((p) => <option key={p.id} value={p.id}>{p.isMe ? `Pagué yo` : `Pagó ${p.name}`}</option>)}
          </select>
        </div>
        <button className="btn block" style={{ minHeight: 52, fontSize: 17 }} onClick={(e) => void submit(e)} disabled={!amount}>
          Apuntar {amount ? formatMoney(inTrip ?? amount, inTrip !== null ? trip.currency : currency) : ''}
        </button>
        <p className="tiny faint center">Se reparte a partes iguales entre {participants.length} {participants.length === 1 ? 'persona' : 'personas'}. Puedes ajustarlo después en Gastos.</p>
      </div>
    </Sheet>
  );
}
