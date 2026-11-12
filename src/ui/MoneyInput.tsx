import { useEffect, useState } from 'react';
import { currencyDecimals, minorToInput, parseAmount, type Minor } from '../lib/money';

/** Campo de importe: guarda unidades menores exactas; acepta coma o punto decimal. */
export function MoneyInput({ value, onChange, currency, id, placeholder, invalid, ariaLabel }: {
  value: Minor | undefined;
  onChange: (v: Minor | undefined, valid: boolean) => void;
  currency: string;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : minorToInput(value, currency));
  useEffect(() => {
    const parsed = parseAmount(text, currency);
    if (parsed !== (value ?? null)) setText(value === undefined ? '' : minorToInput(value, currency));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, currency]);
  const d = currencyDecimals(currency);
  return (
    <div className="input-group">
      <input
        id={id}
        className="input money-input"
        inputMode={d ? 'decimal' : 'numeric'}
        autoComplete="off"
        placeholder={placeholder ?? (d ? '0,00' : '0')}
        value={text}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (!v.trim()) return onChange(undefined, true);
          const p = parseAmount(v, currency);
          onChange(p === null || p < 0 ? undefined : p, p !== null && p >= 0);
        }}
      />
      <span className="pill" style={{ alignSelf: 'center', height: 30 }}>{currency}</span>
    </div>
  );
}
